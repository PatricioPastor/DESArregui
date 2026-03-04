import { NextRequest, NextResponse } from "next/server";
import { withRoles } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import type { SotiStockResponse } from "@/lib/types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const SOTI_ACTIVE_FILTER = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    ALL: "all",
} as const;

type SotiActiveFilter = (typeof SOTI_ACTIVE_FILTER)[keyof typeof SOTI_ACTIVE_FILTER];

const parsePositiveInt = (rawValue: string | null, fallback: number, max: number): number => {
    const parsed = Number.parseInt(rawValue ?? String(fallback), 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.min(parsed, max);
};

const parseActiveFilter = (rawValue: string | null): SotiActiveFilter => {
    const normalized = rawValue?.trim().toLowerCase();

    if (normalized === SOTI_ACTIVE_FILTER.INACTIVE) {
        return SOTI_ACTIVE_FILTER.INACTIVE;
    }

    if (normalized === SOTI_ACTIVE_FILTER.ALL) {
        return SOTI_ACTIVE_FILTER.ALL;
    }

    return SOTI_ACTIVE_FILTER.ACTIVE;
};

export const GET = withRoles(["stock-viewer"], async (request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url);

        const search = searchParams.get("search")?.trim();
        const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE, Number.MAX_SAFE_INTEGER);
        const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
        const activeFilter = parseActiveFilter(searchParams.get("active"));

        const whereClause = {
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
                          { jira_ticket_id_normalized: { contains: search, mode: "insensitive" as const } },
                      ],
                  }
                : {}),
        };

        const skip = (page - 1) * limit;

        const [rows, totalRecords, activeRecords, inactiveRecords] = await Promise.all([
            prisma.soti_import_device.findMany({
                where: whereClause,
                orderBy: [{ updated_at: "desc" }, { id: "desc" }],
                skip,
                take: limit,
            }),
            prisma.soti_import_device.count({ where: whereClause }),
            prisma.soti_import_device.count({ where: { is_active: true } }),
            prisma.soti_import_device.count({ where: { is_active: false } }),
        ]);

        const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

        const response: SotiStockResponse = {
            success: true,
            data: rows.map((row) => ({
                id: row.id.toString(),
                identity_imei: row.identity_imei,
                device_name: row.device_name,
                assigned_user: row.assigned_user,
                model: row.model,
                route: row.route,
                phone: row.phone,
                jira_ticket_id_normalized: row.jira_ticket_id_normalized,
                is_active: row.is_active,
                last_seen_at: row.last_seen_at.toISOString(),
                updated_at: row.updated_at.toISOString(),
            })),
            totalRecords,
            lastUpdated: rows[0]?.updated_at.toISOString(),
            pagination: {
                page,
                limit,
                total: totalRecords,
                totalPages,
            },
            summary: {
                activeRecords,
                inactiveRecords,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("GET /api/stock-soti error:", error);

        return NextResponse.json<SotiStockResponse>(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch SOTI stock",
            },
            { status: 500 },
        );
    }
});
