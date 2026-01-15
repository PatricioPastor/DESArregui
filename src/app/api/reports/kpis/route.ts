import { NextRequest, NextResponse } from "next/server";
import { device_status } from "@/generated/prisma";
import { withAuth } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

const parseDateParam = (value: string | null, fallback: string): Date => {
    const raw = (value || fallback).trim();

    // Expect YYYY-MM-DD, parse as UTC midnight to avoid TZ drift.
    const parsed = new Date(`${raw}T00:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
        return new Date(`${fallback}T00:00:00.000Z`);
    }

    return parsed;
};

const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
};

export const GET = withAuth(async (request: NextRequest, session) => {
    try {
        const { searchParams } = new URL(request.url);

        const startDateValue = searchParams.get("start_date") || "2025-04-01";
        const endDateValue = searchParams.get("end_date") || "2025-06-30";

        const startDate = parseDateParam(startDateValue, "2025-04-01");
        const endDate = parseDateParam(endDateValue, "2025-06-30");
        const endDateExclusive = addDays(endDate, 1);

        const [requests, requestsPending, replacements, assignments, devicesByStatus, totalDevices, lostDevices] = await Promise.all([
            prisma.ticket.count({
                where: {
                    created: {
                        gte: startDate,
                        lt: endDateExclusive,
                    },
                },
            }),
            prisma.ticket.count({
                where: {
                    is_active: true,
                    created: {
                        gte: startDate,
                        lt: endDateExclusive,
                    },
                    OR: [{ category_status: "To Do" }, { status: "En Espera" }],
                },
            }),
            prisma.ticket.count({
                where: {
                    created: {
                        gte: startDate,
                        lt: endDateExclusive,
                    },
                    is_replacement: true,
                },
            }),
            prisma.ticket.count({
                where: {
                    created: {
                        gte: startDate,
                        lt: endDateExclusive,
                    },
                    is_assignment: true,
                },
            }),
            prisma.device.groupBy({
                by: ["status"],
                where: {
                    is_deleted: false,
                },
                _count: {
                    _all: true,
                },
            }),
            prisma.device.count({
                where: {
                    is_deleted: false,
                },
            }),
            prisma.device.count({
                where: {
                    is_deleted: false,
                    status: device_status.LOST,
                },
            }),
        ]);

        const countByStatus = new Map<device_status, number>();
        devicesByStatus.forEach((row) => {
            countByStatus.set(row.status, row._count._all);
        });

        const stockCurrent =
            (countByStatus.get(device_status.NEW) ?? 0) + (countByStatus.get(device_status.USED) ?? 0) + (countByStatus.get(device_status.REPAIRED) ?? 0);

        const assignedDevices = countByStatus.get(device_status.ASSIGNED) ?? 0;

        const utilizationRate = totalDevices > 0 ? (assignedDevices / totalDevices) * 100 : 0;
        const replacementRate = requests > 0 ? (replacements / requests) * 100 : 0;

        const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        return NextResponse.json({
            requests,
            requests_pending: requestsPending,
            replacements,
            assignments,
            stock_current: stockCurrent,
            total_devices: totalDevices,
            devices_lost: lostDevices,
            utilization_rate: utilizationRate,
            replacement_rate: replacementRate,
            period: {
                start_date: startDateValue,
                end_date: endDateValue,
                days_in_period: daysInPeriod,
            },
        });
    } catch (error) {
        console.error("Error fetching KPIs:", error);
        return NextResponse.json({ error: "Failed to fetch KPI data" }, { status: 500 });
    }
});
