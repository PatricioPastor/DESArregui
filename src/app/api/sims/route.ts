import { NextRequest, NextResponse } from "next/server";
import { withRoles } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import type { SimRecord, SimResponse } from "@/lib/types";

const ACTIVE_SIM_STATUSES = ["Activado", "Active"] as const;

type ActiveSimStatus = (typeof ACTIVE_SIM_STATUSES)[number];

export const GET = withRoles(["sims-viewer"], async (request: NextRequest, session) => {
    try {
        const { searchParams } = new URL(request.url);

        // Query parameters (using English field names)
        const search = searchParams.get("search")?.trim() || "";
        const status = searchParams.get("status")?.trim();
        const provider = searchParams.get("provider")?.trim();
        const distributorId = searchParams.get("distributor_id")?.trim();
        const isActive = searchParams.get("is_active");
        const limitRaw = parseInt(searchParams.get("limit") || "50", 10);
        const offsetRaw = parseInt(searchParams.get("offset") || "0", 10);
        const sortBy = searchParams.get("sort_by")?.trim();
        const sortDirection = searchParams.get("sort_direction") === "desc" ? "desc" : "asc";

        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;
        const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

        // Build where conditions
        const whereConditions: any = {};

        // Filter by status
        if (status) {
            whereConditions.status = status;
        }

        // Filter by provider
        if (provider && (provider === "CLARO" || provider === "MOVISTAR")) {
            whereConditions.provider = provider;
        }

        // Filter by distributor_id
        if (distributorId) {
            whereConditions.distributor_id = distributorId;
        }

        // Filter by "active" category.
        // NOTE: In our dataset, `is_active` is always true, but `status` contains values like "Inactive".
        // For UI purposes, treat `is_active` query param as a status-category filter.
        if (!status && isActive !== null && isActive !== undefined) {
            const activeStatuses: ActiveSimStatus[] = [...ACTIVE_SIM_STATUSES];

            if (isActive === "true") {
                whereConditions.status = { in: activeStatuses };
            } else if (isActive === "false") {
                whereConditions.status = { notIn: activeStatuses };
            }
        }

        // Search across ICC, IP
        if (search) {
            whereConditions.OR = [{ icc: { contains: search, mode: "insensitive" } }, { ip: { contains: search, mode: "insensitive" } }];
        }

        const orderBy: any[] = (() => {
            switch (sortBy) {
                case "icc":
                    return [{ icc: sortDirection }, { provider: "asc" }, { status: "asc" }];
                case "ip":
                    return [{ ip: sortDirection }, { icc: "asc" }];
                case "provider":
                    return [{ provider: sortDirection }, { status: "asc" }, { icc: "asc" }];
                case "status":
                    return [{ status: sortDirection }, { provider: "asc" }, { icc: "asc" }];
                case "distributor":
                    return [{ distributor: { name: sortDirection } }, { icc: "asc" }];
                default:
                    return [{ provider: "asc" }, { status: "asc" }, { icc: "asc" }];
            }
        })();

        // Fetch SIMs with pagination and include distributor
        const [sims, totalCount, lastSyncAggregate] = await Promise.all([
            prisma.sim.findMany({
                where: whereConditions,
                include: {
                    distributor: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy,
                take: limit,
                skip: offset,
            }),
            prisma.sim.count({
                where: whereConditions,
            }),
            prisma.sim.aggregate({
                where: whereConditions,
                _max: {
                    last_sync: true,
                },
            }),
        ]);

        // Transform to SimRecord format
        const simRecords: SimRecord[] = sims.map((sim) => ({
            icc: sim.icc,
            ip: sim.ip || undefined,
            status: sim.status,
            provider: sim.provider,
            distributor_id: sim.distributor_id || undefined,
            distributor: sim.distributor
                ? {
                      id: sim.distributor.id,
                      name: sim.distributor.name,
                  }
                : undefined,
        }));

        // Get distinct values for filters
        const [distinctStatuses, distinctProviders, distributors, totalActive, totalInactive] = await Promise.all([
            prisma.sim.findMany({
                select: { status: true },
                distinct: ["status"],
                orderBy: { status: "asc" },
            }),
            prisma.sim.findMany({
                select: { provider: true },
                distinct: ["provider"],
                orderBy: { provider: "asc" },
            }),
            prisma.distributor.findMany({
                select: {
                    id: true,
                    name: true,
                },
                orderBy: { name: "asc" },
            }),
            prisma.sim.count({
                where: {
                    status: {
                        in: [...ACTIVE_SIM_STATUSES],
                    },
                },
            }),
            prisma.sim.count({
                where: {
                    status: {
                        notIn: [...ACTIVE_SIM_STATUSES],
                    },
                },
            }),
        ]);

        const response: SimResponse = {
            success: true,
            data: simRecords,
            totalRecords: totalCount,
            lastUpdated: lastSyncAggregate._max.last_sync ? lastSyncAggregate._max.last_sync.toISOString() : undefined,

            metadata: {
                statuses: distinctStatuses.map((s) => s.status),
                providers: distinctProviders.map((p) => p.provider) as ("CLARO" | "MOVISTAR")[],
                distributors: distributors.map((d) => ({ id: d.id, name: d.name })),
                totalActive,
                totalInactive,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error fetching SIMs:", error);

        const errorMessage = error instanceof Error ? error.message : "Internal server error";

        return NextResponse.json<SimResponse>(
            {
                success: false,
                error: `Failed to fetch SIMs: ${errorMessage}`,
            },
            { status: 500 },
        );
    }
});
