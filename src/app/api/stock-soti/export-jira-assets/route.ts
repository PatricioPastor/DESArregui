import { NextRequest } from "next/server";
import type { Prisma, device_status } from "@/generated/prisma/index";
import { withRoles } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { buildJiraAssetsCsv, buildJiraAssetsExportRows } from "@/lib/soti-stock/export-jira-assets";

const SOTI_ACTIVE_FILTER = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    ALL: "all",
} as const;

type SotiActiveFilter = (typeof SOTI_ACTIVE_FILTER)[keyof typeof SOTI_ACTIVE_FILTER];

const parseActiveFilter = (rawValue: string | null): SotiActiveFilter => {
    const normalized = rawValue?.trim().toLowerCase();

    if (normalized === SOTI_ACTIVE_FILTER.INACTIVE) {
        return SOTI_ACTIVE_FILTER.INACTIVE;
    }

    if (normalized === SOTI_ACTIVE_FILTER.ALL) {
        return SOTI_ACTIVE_FILTER.ALL;
    }

    return SOTI_ACTIVE_FILTER.ALL;
};

const buildExportFileName = (): string => {
    const stamp = new Date().toISOString().replace(/[.:]/g, "-");
    return `jira-assets-stock-nuevo-${stamp}.csv`;
};

export const GET = withRoles(["stock-viewer"], async (request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search")?.trim();
        const activeFilter = parseActiveFilter(searchParams.get("active"));

        const sotiWhere: Prisma.soti_import_deviceWhereInput = {
            ...(activeFilter === SOTI_ACTIVE_FILTER.ALL
                ? {}
                : {
                      is_active: activeFilter === SOTI_ACTIVE_FILTER.ACTIVE,
                  }),
            ...(search
                ? {
                      OR: [
                          { identity_imei: { contains: search, mode: "insensitive" as const } },
                          { device_name: { contains: search, mode: "insensitive" as const } },
                          { assigned_user: { contains: search, mode: "insensitive" as const } },
                          { model: { contains: search, mode: "insensitive" as const } },
                          { phone: { contains: search, mode: "insensitive" as const } },
                          { jira_request_normalized: { contains: search, mode: "insensitive" as const } },
                          { jira_ticket_id_normalized: { contains: search, mode: "insensitive" as const } },
                      ],
                  }
                : {}),
        };

        const stockStatuses: device_status[] = ["NEW", "USED"];

        const stockWhere: Prisma.deviceWhereInput = {
            is_deleted: false,
            status: {
                in: stockStatuses,
            },
            assignments: {
                none: {
                    status: "active" as const,
                },
            },
            ...(search
                ? {
                      OR: [
                          { imei: { contains: search, mode: "insensitive" as const } },
                          { ticket_id: { contains: search, mode: "insensitive" as const } },
                          { model: { brand: { contains: search, mode: "insensitive" as const } } },
                          { model: { model: { contains: search, mode: "insensitive" as const } } },
                          { distributor: { name: { contains: search, mode: "insensitive" as const } } },
                      ],
                  }
                : {}),
        };

        const [sotiRows, stockRows] = await Promise.all([
            prisma.soti_import_device.findMany({
                where: sotiWhere,
                orderBy: [{ updated_at: "desc" }, { id: "desc" }],
                select: {
                    device_name: true,
                    assigned_user: true,
                    model: true,
                    identity_imei: true,
                    route: true,
                    company: true,
                    phone_number: true,
                    phone_fallback: true,
                    phone: true,
                    jira_request_normalized: true,
                    jira_ticket_id_normalized: true,
                    manufacturer: true,
                    total_storage: true,
                    total_memory: true,
                    locality: true,
                    cellular_operator: true,
                    os_version: true,
                    is_active: true,
                },
            }),
            prisma.device.findMany({
                where: stockWhere,
                orderBy: [{ updated_at: "desc" }, { id: "desc" }],
                include: {
                    model: {
                        select: {
                            brand: true,
                            model: true,
                            storage_gb: true,
                        },
                    },
                    distributor: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),
        ]);

        const exportRows = buildJiraAssetsExportRows({
            sotiRecords: sotiRows.map((row) => ({
                idSoti: row.device_name,
                user: row.assigned_user,
                model: row.model,
                imei: row.identity_imei,
                route: row.route,
                company: row.company,
                phoneNumber: row.phone_number,
                phoneFallback: row.phone_fallback,
                phoneLegacy: row.phone,
                ticketJira: row.jira_request_normalized ?? row.jira_ticket_id_normalized,
                manufacturer: row.manufacturer,
                storage: row.total_storage,
                ram: row.total_memory,
                locality: row.locality,
                cellularOperator: row.cellular_operator,
                osVersion: row.os_version,
                sotiActive: row.is_active,
            })),
            stockNuevoRecords: stockRows.map((row) => ({
                imei: row.imei,
                distributor: row.distributor?.name ?? null,
                model: [row.model.brand, row.model.model].filter(Boolean).join(" "),
                manufacturer: row.model.brand,
                storageGb: row.model.storage_gb,
                ticketJira: row.ticket_id,
            })),
        });

        const csv = buildJiraAssetsCsv(exportRows);

        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${buildExportFileName()}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("GET /api/stock-soti/export-jira-assets error:", error);

        return Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to export Jira Assets",
            },
            { status: 500 },
        );
    }
});
