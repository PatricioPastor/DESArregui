import { NextRequest, NextResponse } from "next/server";
import { device_status } from "@/generated/prisma";
import { withAuth } from "@/lib/api-auth";
import { evaluateParity } from "@/lib/migration-parity";
import { captureParityEvidence } from "@/lib/migration-parity-store";
import { resolveSourceMode } from "@/lib/migration-source-mode";
import { toKpiParitySnapshot } from "@/lib/migration-surface-parity";
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

interface TicketAggregates {
    requests: number;
    requestsPending: number;
    replacements: number;
    assignments: number;
}

interface DeviceAggregates {
    stockCurrent: number;
    totalDevices: number;
    lostDevices: number;
}

const fetchTicketAggregates = async (startDate: Date, endDateExclusive: Date): Promise<TicketAggregates> => {
    const [requests, requestsPending, replacements, assignments] = await Promise.all([
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
    ]);

    return {
        requests,
        requestsPending,
        replacements,
        assignments,
    };
};

const fetchDeviceAggregates = async (): Promise<DeviceAggregates> => {
    const [devicesByStatus, totalDevices, lostDevices] = await Promise.all([
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

    return {
        stockCurrent,
        totalDevices,
        lostDevices,
    };
};

export const GET = withAuth(async (request: NextRequest, session) => {
    try {
        const { searchParams } = new URL(request.url);
        const requestedSurface = searchParams.get("surface");
        const paritySurface = requestedSurface === "home_kpis" ? "home_kpis" : "reports_kpis";
        const sourceMode =
            paritySurface === "home_kpis" ? resolveSourceMode("home_kpis", { fallback: resolveSourceMode("reports_kpis") }) : resolveSourceMode("reports_kpis");

        const startDateValue = searchParams.get("start_date") || "2025-04-01";
        const endDateValue = searchParams.get("end_date") || "2025-06-30";

        const startDate = parseDateParam(startDateValue, "2025-04-01");
        const endDate = parseDateParam(endDateValue, "2025-06-30");
        const endDateExclusive = addDays(endDate, 1);

        const tickets = await fetchTicketAggregates(startDate, endDateExclusive);

        const canonicalDeviceAggregates = await fetchDeviceAggregates();
        const selectedDeviceAggregates = canonicalDeviceAggregates;

        const utilizationRate = selectedDeviceAggregates.totalDevices > 0 ? (selectedDeviceAggregates.stockCurrent / selectedDeviceAggregates.totalDevices) * 100 : 0;
        const replacementRate = tickets.requests > 0 ? (tickets.replacements / tickets.requests) * 100 : 0;

        const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        const payload = {
            requests: tickets.requests,
            requests_pending: tickets.requestsPending,
            replacements: tickets.replacements,
            assignments: tickets.assignments,
            stock_current: selectedDeviceAggregates.stockCurrent,
            total_devices: selectedDeviceAggregates.totalDevices,
            devices_lost: selectedDeviceAggregates.lostDevices,
            utilization_rate: utilizationRate,
            replacement_rate: replacementRate,
            period: {
                start_date: startDateValue,
                end_date: endDateValue,
                days_in_period: daysInPeriod,
            },
        };

        const canonicalPayload = {
            requests: tickets.requests,
            requests_pending: tickets.requestsPending,
            replacements: tickets.replacements,
            assignments: tickets.assignments,
            stock_current: canonicalDeviceAggregates.stockCurrent,
            total_devices: canonicalDeviceAggregates.totalDevices,
            devices_lost: canonicalDeviceAggregates.lostDevices,
            utilization_rate:
                canonicalDeviceAggregates.totalDevices > 0
                    ? (canonicalDeviceAggregates.stockCurrent / canonicalDeviceAggregates.totalDevices) * 100
                    : 0,
            replacement_rate: replacementRate,
        };

        const parity = evaluateParity({
            surface: paritySurface,
            thresholdProfile: paritySurface === "home_kpis" ? "home" : "kpis",
            baseline: toKpiParitySnapshot(canonicalPayload),
            candidate: toKpiParitySnapshot(canonicalPayload),
            periodStart: startDateValue,
            periodEnd: endDateValue,
        });

        await captureParityEvidence(parity.evidence, {
            operator: session.user.id,
            notes: `mode=${sourceMode}; surface=${paritySurface}; canonical-only`,
        });

        const response = NextResponse.json(payload);
        response.headers.set("x-migration-source-mode", sourceMode);
        response.headers.set("x-migration-parity-pass", String(parity.evidence.passed));

        return response;
    } catch (error) {
        console.error("Error fetching KPIs:", error);
        return NextResponse.json({ error: "Failed to fetch KPI data" }, { status: 500 });
    }
});
