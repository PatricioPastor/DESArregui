import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { withAdminOnly } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

interface SimSyncRecord {
    ICC: string;
    IP?: string | null;
    Estado: string;
    Empresa: string;
}

interface SyncRequest {
    sims?: SimSyncRecord[];
    syncToken?: string;
    finalize?: boolean;
    chunkIndex?: number;
    totalChunks?: number;
}

interface SyncResponse {
    success: boolean;
    processed: number;
    created: number;
    updated: number;
    deactivated: number;
    distributorsCreated: number;
    errors: number;
    error?: string;
    errorDetails?: Array<{ icc: string; error: string }>;
}

// Map status from Excel to database values
function mapStatus(status: string): string {
    const normalized = status.trim();
    if (normalized.toLowerCase() === "active") return "Activado";
    if (normalized.toLowerCase() === "inactive") return "Desactivado";
    return normalized; // Keep as-is (e.g., "Inventario")
}

// Parse "PROVIDER (DISTRIBUTOR)" format
function parseEmpresa(empresa: string): { provider: "CLARO" | "MOVISTAR"; distributorName: string } | null {
    const match = empresa.match(/^(CLARO|MOVISTAR)\s*\((.+)\)$/i);
    if (!match) return null;

    const provider = match[1].toUpperCase() as "CLARO" | "MOVISTAR";
    const distributorName = match[2].trim();

    return { provider, distributorName };
}

// Batch size for upsert operations
const BATCH_SIZE = 5000;

export const POST = withAdminOnly(async (request: NextRequest) => {
    try {
        const payload = (await request.json()) as SyncRequest;

        const sims = Array.isArray(payload.sims) ? payload.sims : [];
        const hasSims = sims.length > 0;
        const shouldFinalize = payload.finalize ?? hasSims;
        const syncTimestamp = payload.syncToken ? new Date(payload.syncToken) : new Date();

        if (Number.isNaN(syncTimestamp.getTime())) {
            return NextResponse.json<SyncResponse>(
                {
                    success: false,
                    processed: 0,
                    created: 0,
                    updated: 0,
                    deactivated: 0,
                    distributorsCreated: 0,
                    errors: 1,
                    error: "Invalid request: syncToken is not a valid date",
                },
                { status: 400 },
            );
        }

        if (!shouldFinalize && sims.length === 0) {
            return NextResponse.json<SyncResponse>(
                {
                    success: false,
                    processed: 0,
                    created: 0,
                    updated: 0,
                    deactivated: 0,
                    distributorsCreated: 0,
                    errors: 1,
                    error: "No SIMs provided in the request",
                },
                { status: 400 },
            );
        }

        if (sims.length === 0 && shouldFinalize && !payload.syncToken) {
            return NextResponse.json<SyncResponse>(
                {
                    success: false,
                    processed: 0,
                    created: 0,
                    updated: 0,
                    deactivated: 0,
                    distributorsCreated: 0,
                    errors: 1,
                    error: "Invalid request: syncToken is required to finalize without sims",
                },
                { status: 400 },
            );
        }

        const results = {
            processed: 0,
            created: 0,
            updated: 0,
            deactivated: 0,
            distributorsCreated: 0,
            errors: 0,
            errorDetails: [] as Array<{ icc: string; error: string }>,
        };

        if (sims.length > 0) {
            // Step 1: Collect all unique distributor names and ensure they exist
            const distributorNames = new Set<string>();
            for (const sim of sims) {
                const parsed = parseEmpresa(sim.Empresa);
                if (parsed) {
                    distributorNames.add(parsed.distributorName);
                }
            }

            // Get or create distributors
            const distributorMap = new Map<string, string>(); // name -> id

            for (const name of distributorNames) {
                let distributor = await prisma.distributor.findUnique({
                    where: { name },
                    select: { id: true },
                });

                if (!distributor) {
                    distributor = await prisma.distributor.create({
                        data: { name },
                        select: { id: true },
                    });
                    results.distributorsCreated++;
                }

                distributorMap.set(name, distributor.id);
            }

            // Step 2: Get existing SIM ICCs to determine creates vs updates
            const existingIccs = new Set(
                (
                    await prisma.sim.findMany({
                        select: { icc: true },
                    })
                ).map((s) => s.icc),
            );

            // Step 3: Process SIMs in batches using raw SQL for efficiency
            const validSims: Array<{
                icc: string;
                ip: string | null;
                status: string;
                provider: "CLARO" | "MOVISTAR";
                distributorId: string | null;
            }> = [];

            for (const sim of sims) {
                if (!sim.ICC || !sim.Empresa) {
                    results.errors++;
                    results.errorDetails.push({
                        icc: sim.ICC || "unknown",
                        error: "Missing ICC or Empresa",
                    });
                    continue;
                }

                const parsed = parseEmpresa(sim.Empresa);
                if (!parsed) {
                    results.errors++;
                    results.errorDetails.push({
                        icc: sim.ICC,
                        error: `Invalid Empresa format: ${sim.Empresa}. Expected: PROVIDER (DISTRIBUTOR)`,
                    });
                    continue;
                }

                const distributorId = distributorMap.get(parsed.distributorName) || null;

                validSims.push({
                    icc: String(sim.ICC).trim(),
                    ip: sim.IP ? String(sim.IP).trim() : null,
                    status: mapStatus(sim.Estado || "Inventario"),
                    provider: parsed.provider,
                    distributorId,
                });
            }

            // Step 4: Batch upsert using raw SQL
            for (let i = 0; i < validSims.length; i += BATCH_SIZE) {
                const batch = validSims.slice(i, i + BATCH_SIZE);

                // Build VALUES clause for batch insert
                const values = batch.map((sim) => {
                    const isNew = !existingIccs.has(sim.icc);
                    if (isNew) {
                        results.created++;
                    } else {
                        results.updated++;
                    }
                    results.processed++;

                    return Prisma.sql`(
                        gen_random_uuid()::text,
                        ${sim.icc},
                        ${sim.ip},
                        ${sim.status},
                        ${sim.provider}::"phones"."sim_provider",
                        ${sim.distributorId},
                        NOW(),
                        NOW(),
                        ${syncTimestamp},
                        true
                    )`;
                });

                // Execute batch upsert
                await prisma.$executeRaw`
                    INSERT INTO "phones"."sim" (
                        id, icc, ip, status, provider, distributor_id, 
                        created_at, updated_at, last_sync, is_active
                    )
                    VALUES ${Prisma.join(values)}
                    ON CONFLICT (icc) DO UPDATE SET
                        ip = EXCLUDED.ip,
                        status = EXCLUDED.status,
                        provider = EXCLUDED.provider,
                        distributor_id = EXCLUDED.distributor_id,
                        updated_at = NOW(),
                        last_sync = ${syncTimestamp},
                        is_active = true
                `;
            }
        }

        // Step 5: Deactivate SIMs not included in this sync
        if (shouldFinalize) {
            const deactivateResult = await prisma.sim.updateMany({
                where: {
                    is_active: true,
                    last_sync: { lt: syncTimestamp },
                },
                data: {
                    is_active: false,
                    updated_at: new Date(),
                },
            });
            results.deactivated = deactivateResult.count;
        }

        const response: SyncResponse = {
            success: results.errors === 0,
            processed: results.processed,
            created: results.created,
            updated: results.updated,
            deactivated: results.deactivated,
            distributorsCreated: results.distributorsCreated,
            errors: results.errors,
        };

        if (results.errors > 0 && results.errorDetails.length > 0) {
            // Limit error details to first 50
            response.errorDetails = results.errorDetails.slice(0, 50);
        }

        const statusCode = results.errors === 0 ? 200 : 207;

        return NextResponse.json<SyncResponse>(response, { status: statusCode });
    } catch (error) {
        console.error("SIMs sync error:", error);

        const errorMessage = error instanceof Error ? error.message : "Internal server error";

        return NextResponse.json<SyncResponse>(
            {
                success: false,
                processed: 0,
                created: 0,
                updated: 0,
                deactivated: 0,
                distributorsCreated: 0,
                errors: 1,
                error: `Failed to sync SIMs: ${errorMessage}`,
            },
            { status: 500 },
        );
    }
});
