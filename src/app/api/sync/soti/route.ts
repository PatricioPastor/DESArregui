import { NextRequest, NextResponse } from "next/server";
import { withAdminOnly } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { SotiCsvContractError, assertSotiCsvContract, normalizeSotiImportRows, parseSotiCsvRows, validateSotiImportRows } from "@/lib/soti-import";
import type { SotiSyncRequest, SotiSyncResponse } from "@/lib/types";

const SOTI_SYNC_ADVISORY_LOCK_KEY = "phones.soti_import_sync";
const SOTI_IMPORT_BATCH_SIZE = 500;

interface ParsedPayload {
    rows: ReadonlyArray<Record<string, unknown>>;
    sourceFileName: string | null;
    finalize: boolean;
    syncToken: string | null;
}

interface SotiProcessResult {
    processed: number;
    created: number;
    updated: number;
    deactivated: number;
    invalid: number;
    errors: number;
    errorDetails: Array<{ rowIndex: number; error: string }>;
}

function buildSotiDeviceIdentityKey(identityImei: string, deviceName: string): string {
    return `${identityImei}::${deviceName}`;
}

function chunkRows<T>(rows: ReadonlyArray<T>, chunkSize: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < rows.length; index += chunkSize) {
        chunks.push(rows.slice(index, index + chunkSize));
    }

    return chunks;
}

async function tryAcquireSotiImportLock(): Promise<boolean> {
    const result = await prisma.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_lock(hashtext(${SOTI_SYNC_ADVISORY_LOCK_KEY})) AS locked
    `;

    return Boolean(result[0]?.locked);
}

async function releaseSotiImportLock(): Promise<void> {
    await prisma.$queryRaw`
        SELECT pg_advisory_unlock(hashtext(${SOTI_SYNC_ADVISORY_LOCK_KEY}))
    `;
}

function buildSotiSyncError(error: string, status: number): NextResponse<SotiSyncResponse> {
    return NextResponse.json(
        {
            success: false,
            processed: 0,
            created: 0,
            updated: 0,
            deactivated: 0,
            invalid: 0,
            errors: 1,
            error,
        },
        { status },
    );
}

async function parsePayload(request: NextRequest): Promise<ParsedPayload> {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("file");
        const syncToken = toNullableTrimmedString(formData.get("syncToken"));
        const sourceFileName = file instanceof File ? file.name : toNullableTrimmedString(formData.get("sourceFileName"));
        const finalize = parseBooleanFormField(formData.get("finalize"), true);
        const csvContent = file instanceof File ? await file.text() : toTrimmedString(formData.get("csvContent"));

        if (!csvContent) {
            return {
                rows: [],
                sourceFileName,
                finalize,
                syncToken,
            };
        }

        const rows = parseSotiCsvRows(csvContent);
        assertSotiCsvContract(rows);

        return {
            rows,
            sourceFileName,
            finalize,
            syncToken,
        };
    }

    const payload = (await request.json()) as SotiSyncRequest;
    const csvContent = typeof payload.csvContent === "string" ? payload.csvContent : "";
    const hasCsvContent = csvContent.trim().length > 0;

    if (hasCsvContent) {
        const rows = parseSotiCsvRows(csvContent);
        assertSotiCsvContract(rows);

        return {
            rows,
            sourceFileName: payload.sourceFileName ?? null,
            finalize: payload.finalize ?? true,
            syncToken: payload.syncToken ?? null,
        };
    }

    const rowInputs = Array.isArray(payload.rows) ? payload.rows : [];
    const rows = rowInputs as unknown as ReadonlyArray<Record<string, unknown>>;

    return {
        rows,
        sourceFileName: payload.sourceFileName ?? null,
        finalize: payload.finalize ?? rows.length > 0,
        syncToken: payload.syncToken ?? null,
    };
}

function toTrimmedString(value: FormDataEntryValue | null): string {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}

function toNullableTrimmedString(value: FormDataEntryValue | null): string | null {
    const normalized = toTrimmedString(value);
    return normalized || null;
}

function parseBooleanFormField(value: FormDataEntryValue | null, defaultValue: boolean): boolean {
    if (typeof value !== "string") {
        return defaultValue;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
        return true;
    }

    if (normalized === "false") {
        return false;
    }

    return defaultValue;
}

export const POST = withAdminOnly(async (request: NextRequest) => {
    let lockAcquired = false;

    try {
        const payload = await parsePayload(request);
        const syncTimestamp = payload.syncToken ? new Date(payload.syncToken) : new Date();

        if (Number.isNaN(syncTimestamp.getTime())) {
            return buildSotiSyncError("Invalid request: syncToken is not a valid date", 400);
        }

        if (!payload.finalize && payload.rows.length === 0) {
            return buildSotiSyncError("No SOTI rows provided in the request", 400);
        }

        if (payload.finalize && payload.rows.length === 0 && !payload.syncToken) {
            return buildSotiSyncError("Invalid request: syncToken is required to finalize without rows", 400);
        }

        lockAcquired = await tryAcquireSotiImportLock();
        if (!lockAcquired) {
            return buildSotiSyncError("SOTI import is already running. Retry once the current sync finishes.", 409);
        }

        const normalizedRows = normalizeSotiImportRows(payload.rows);
        const validation = validateSotiImportRows(normalizedRows);
        const existingRun = await prisma.soti_import_run.findUnique({
            where: {
                sync_token: syncTimestamp,
            },
        });

        if (existingRun?.status === "completed") {
            const processResult: SotiProcessResult = {
                processed: existingRun.valid_rows,
                created: existingRun.created_rows,
                updated: existingRun.updated_rows,
                deactivated: existingRun.deactivated_rows,
                invalid: existingRun.invalid_rows,
                errors: existingRun.invalid_rows,
                errorDetails: [],
            };

            return NextResponse.json(
                {
                    success: processResult.errors === 0,
                    processed: processResult.processed,
                    created: processResult.created,
                    updated: processResult.updated,
                    deactivated: processResult.deactivated,
                    invalid: processResult.invalid,
                    errors: processResult.errors,
                },
                { status: processResult.errors === 0 ? 200 : 207 },
            );
        }

        const run =
            existingRun ??
            (await prisma.soti_import_run.create({
                data: {
                    sync_token: syncTimestamp,
                    source_filename: payload.sourceFileName,
                    status: "processing",
                },
            }));

        if (existingRun?.status === "failed") {
            await prisma.soti_import_run.update({
                where: { id: run.id },
                data: {
                    status: "processing",
                    error_message: null,
                    source_filename: payload.sourceFileName ?? run.source_filename,
                    finished_at: null,
                },
            });
        }

        let created = 0;
        let updated = 0;
        let deactivated = 0;

        try {
            const validRowBatches = chunkRows(validation.validRows, SOTI_IMPORT_BATCH_SIZE);

            for (const batch of validRowBatches) {
                const batchTimestamp = new Date();
                const existingDevices = await prisma.soti_import_device.findMany({
                    where: {
                        OR: batch.map((row) => ({
                            identity_imei: row.identityImei,
                            device_name: row.deviceName,
                        })),
                    },
                    select: {
                        identity_imei: true,
                        device_name: true,
                    },
                });

                const existingDeviceKeys = new Set(existingDevices.map((device) => buildSotiDeviceIdentityKey(device.identity_imei, device.device_name)));

                updated += existingDeviceKeys.size;
                created += batch.length - existingDeviceKeys.size;

                for (const row of batch) {
                    await prisma.soti_import_device.upsert({
                        where: {
                            identity_imei_device_name: {
                                identity_imei: row.identityImei,
                                device_name: row.deviceName,
                            },
                        },
                        update: {
                            assigned_user: row.assignedUser,
                            model: row.model,
                            route: row.route,
                            phone_number: row.phoneNumber,
                            phone_fallback: row.phoneFallback,
                            registration_time: row.registrationTime,
                            enrollment_time: row.enrollmentTime,
                            connection_date: row.connectionDate,
                            disconnection_date: row.disconnectionDate,
                            phone: row.phone,
                            jira_ticket: row.jiraTicket,
                            bssid_network: row.bssidNetwork,
                            ssid_network: row.ssidNetwork,
                            jira_ticket_id_raw: row.jiraTicketIdRaw,
                            jira_ticket_id_normalized: row.jiraTicketIdNormalized,
                            manufacturer: row.manufacturer,
                            total_storage: row.totalStorage,
                            total_memory: row.totalMemory,
                            cellular_operator: row.cellularOperator,
                            os_version: row.osVersion,
                            locality: row.locality,
                            company: row.company,
                            jira_request_raw: row.jiraRequestRaw,
                            jira_request_normalized: row.jiraRequestNormalized,
                            custom_phone: row.customPhone,
                            custom_email: row.customEmail,
                            android_enter_email: row.androidEnterEmail,
                            location: row.location,
                            import_run_id: run.id,
                            is_active: true,
                            last_seen_at: batchTimestamp,
                        },
                        create: {
                            identity_imei: row.identityImei,
                            device_name: row.deviceName,
                            assigned_user: row.assignedUser,
                            model: row.model,
                            route: row.route,
                            phone_number: row.phoneNumber,
                            phone_fallback: row.phoneFallback,
                            registration_time: row.registrationTime,
                            enrollment_time: row.enrollmentTime,
                            connection_date: row.connectionDate,
                            disconnection_date: row.disconnectionDate,
                            phone: row.phone,
                            jira_ticket: row.jiraTicket,
                            bssid_network: row.bssidNetwork,
                            ssid_network: row.ssidNetwork,
                            jira_ticket_id_raw: row.jiraTicketIdRaw,
                            jira_ticket_id_normalized: row.jiraTicketIdNormalized,
                            manufacturer: row.manufacturer,
                            total_storage: row.totalStorage,
                            total_memory: row.totalMemory,
                            cellular_operator: row.cellularOperator,
                            os_version: row.osVersion,
                            locality: row.locality,
                            company: row.company,
                            jira_request_raw: row.jiraRequestRaw,
                            jira_request_normalized: row.jiraRequestNormalized,
                            custom_phone: row.customPhone,
                            custom_email: row.customEmail,
                            android_enter_email: row.androidEnterEmail,
                            location: row.location,
                            import_run_id: run.id,
                            is_active: true,
                            first_seen_at: batchTimestamp,
                            last_seen_at: batchTimestamp,
                        },
                    });
                }
            }

            const runTimestamp = new Date();
            const runUpdate = await prisma.soti_import_run.update({
                where: {
                    id: run.id,
                },
                data: {
                    source_filename: payload.sourceFileName ?? run.source_filename,
                    total_rows: {
                        increment: validation.summary.totalRows,
                    },
                    valid_rows: {
                        increment: validation.summary.validRows,
                    },
                    invalid_rows: {
                        increment: validation.summary.invalidRows,
                    },
                    created_rows: {
                        increment: created,
                    },
                    updated_rows: {
                        increment: updated,
                    },
                    updated_at: runTimestamp,
                },
            });

            if (payload.finalize) {
                const deactivationResult = await prisma.soti_import_device.updateMany({
                    where: {
                        is_active: true,
                        import_run_id: {
                            not: run.id,
                        },
                    },
                    data: {
                        is_active: false,
                        updated_at: runTimestamp,
                    },
                });

                deactivated = deactivationResult.count;

                await prisma.soti_import_run.update({
                    where: {
                        id: run.id,
                    },
                    data: {
                        status: "completed",
                        finished_at: runTimestamp,
                        deactivated_rows: runUpdate.deactivated_rows + deactivated,
                    },
                });
            }
        } catch (error) {
            const failureTimestamp = new Date();
            const failureMessage = error instanceof Error ? error.message : "Unknown SOTI sync failure";

            await prisma.soti_import_run.update({
                where: { id: run.id },
                data: {
                    status: "failed",
                    error_message: failureMessage,
                    finished_at: failureTimestamp,
                },
            });

            throw error;
        }

        const processResult: SotiProcessResult = {
            processed: validation.summary.validRows,
            created,
            updated,
            deactivated,
            invalid: validation.summary.invalidRows,
            errors: validation.errors.length,
            errorDetails: validation.errors.slice(0, 100).map((error) => ({
                rowIndex: error.rowIndex,
                error: error.reason,
            })),
        };

        const response: SotiSyncResponse = {
            success: processResult.errors === 0,
            processed: processResult.processed,
            created: processResult.created,
            updated: processResult.updated,
            deactivated: processResult.deactivated,
            invalid: processResult.invalid,
            errors: processResult.errors,
        };

        if (processResult.errorDetails.length > 0) {
            response.errorDetails = processResult.errorDetails;
        }

        return NextResponse.json(response, { status: processResult.errors === 0 ? 200 : 207 });
    } catch (error) {
        if (error instanceof SotiCsvContractError) {
            return buildSotiSyncError(error.message, 400);
        }

        console.error("POST /api/sync/soti error:", error);

        return buildSotiSyncError("Failed to sync SOTI import", 500);
    } finally {
        if (lockAcquired) {
            await releaseSotiImportLock();
        }
    }
});
