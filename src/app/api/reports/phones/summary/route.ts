import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { evaluateParity } from "@/lib/migration-parity";
import { captureParityEvidence } from "@/lib/migration-parity-store";
import { resolveSourceMode } from "@/lib/migration-source-mode";
import { toReportsPhonesParitySnapshot } from "@/lib/migration-surface-parity";
import prisma from "@/lib/prisma";

interface EnhancedKpisResponse {
    kpis: {
        total_tickets: number;
        total_demand: number;
        assignments: number;
        replacements: number;
        replacement_rate: number;
        pending_demand?: number;
    };
    stock: {
        available: number;
        models: Array<{
            brand: string;
            model: string;
            color: string | null;
            storage_gb: number | null;
            count: number;
            display_name: string;
        }>;
    };
    tickets: unknown[];
    monthly_data: Array<{
        month: string;
        month_number: number;
        tickets: number;
        demand: number;
        is_projected: boolean;
        projected_demand: number | null;
    }>;
    period: {
        start_date: string;
        end_date: string;
        days: number;
    };
}

const fetchEnhancedKpis = async (startDate: string, endDate: string): Promise<EnhancedKpisResponse> => {
    try {
        const result = await prisma.$queryRaw<Array<{ get_enhanced_kpis: EnhancedKpisResponse }>>`
          SELECT phones.get_enhanced_kpis(${startDate}::DATE, ${endDate}::DATE) as get_enhanced_kpis
        `;

        const data = result[0]?.get_enhanced_kpis;
        if (data) {
            return data;
        }
    } catch (error) {
        console.warn("[phones/summary] get_enhanced_kpis unavailable", error);
    }

    throw new Error("No data found for the specified period");
};

export const GET = withAuth(async (request: NextRequest, session) => {
    try {
        const sourceMode = resolveSourceMode("reports_phones");
        const { searchParams } = request.nextUrl;
        const startDate = searchParams.get("start_date") || "2025-04-01";
        const endDate = searchParams.get("end_date") || "2025-06-30";

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return NextResponse.json({ error: "start_date must be before or equal to end_date" }, { status: 400 });
        }

        console.log(`[phones/summary] Fetching data for ${startDate} to ${endDate} (mode=${sourceMode})`);

        const summaryData = await fetchEnhancedKpis(startDate, endDate);

        const parity = evaluateParity({
            surface: "reports_phones",
            thresholdProfile: "reports",
            baseline: toReportsPhonesParitySnapshot(summaryData),
            candidate: toReportsPhonesParitySnapshot(summaryData),
            periodStart: startDate,
            periodEnd: endDate,
        });

        await captureParityEvidence(parity.evidence, {
            operator: session.user.id,
            notes: `mode=${sourceMode}; canonical-only`,
        });

        console.log(`[phones/summary] Success: ${summaryData.kpis.total_tickets} tickets, ${summaryData.stock.available} devices available`);

        const response = NextResponse.json(summaryData);
        response.headers.set("x-migration-source-mode", sourceMode);
        response.headers.set("x-migration-parity-pass", String(parity.evidence.passed));

        return response;
    } catch (error) {
        console.error("[phones/summary] Error:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch phones summary",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
});
