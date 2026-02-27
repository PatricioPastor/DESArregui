interface ReportsPhonesMonthlyPoint {
    tickets: number;
    demand: number;
    is_projected: boolean;
    projected_demand: number | null;
}

interface ReportsPhonesSummaryShape {
    kpis: {
        total_tickets: number;
        total_demand: number;
        pending_demand?: number;
        assignments: number;
        replacements: number;
        replacement_rate: number;
    };
    stock: {
        available: number;
    };
    monthly_data: ReportsPhonesMonthlyPoint[];
}

interface KpiPayloadShape {
    requests: number;
    requests_pending: number;
    replacements: number;
    assignments: number;
    stock_current: number;
    total_devices: number;
    devices_lost: number;
    utilization_rate: number;
    replacement_rate: number;
}

interface DistributorAggregateRow {
    name: string;
    deviceCount: number;
}

const normalizeDistributorMetricKey = (name: string): string => {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
};

export const toReportsPhonesParitySnapshot = (summary: ReportsPhonesSummaryShape): Record<string, number> => {
    const monthlyTotals = summary.monthly_data.reduce(
        (acc, point) => {
            acc.chart_tickets += point.tickets;
            acc.chart_demand += point.demand;

            if (point.is_projected) {
                acc.forecast_projected_months += 1;
            }

            if (point.projected_demand !== null) {
                acc.forecast_projected_demand += point.projected_demand;
            }

            return acc;
        },
        {
            chart_tickets: 0,
            chart_demand: 0,
            forecast_projected_months: 0,
            forecast_projected_demand: 0,
        },
    );

    return {
        top_total_tickets: summary.kpis.total_tickets,
        top_total_demand: summary.kpis.total_demand,
        top_pending_demand: summary.kpis.pending_demand ?? 0,
        top_assignments: summary.kpis.assignments,
        top_replacements: summary.kpis.replacements,
        top_replacement_rate: summary.kpis.replacement_rate,
        stock_available: summary.stock.available,
        chart_tickets: monthlyTotals.chart_tickets,
        chart_demand: monthlyTotals.chart_demand,
        forecast_projected_months: monthlyTotals.forecast_projected_months,
        forecast_projected_demand: monthlyTotals.forecast_projected_demand,
    };
};

export const toKpiParitySnapshot = (payload: KpiPayloadShape): Record<string, number> => {
    return {
        requests: payload.requests,
        requests_pending: payload.requests_pending,
        replacements: payload.replacements,
        assignments: payload.assignments,
        stock_current: payload.stock_current,
        total_devices: payload.total_devices,
        devices_lost: payload.devices_lost,
        utilization_rate: payload.utilization_rate,
        replacement_rate: payload.replacement_rate,
    };
};

export const toHomeStockParitySnapshot = (totalRecords: number): Record<string, number> => {
    return {
        total_records: totalRecords,
    };
};

export const toHomeShippingParitySnapshot = (shippingInProgress: number): Record<string, number> => {
    return {
        shipping_in_progress: shippingInProgress,
    };
};

export const toDistributorParitySnapshot = (rows: DistributorAggregateRow[]): Record<string, number> => {
    const parityRecord: Record<string, number> = {
        total_distributors: rows.length,
        total_devices: rows.reduce((acc, row) => acc + row.deviceCount, 0),
    };

    rows.forEach((row) => {
        const key = normalizeDistributorMetricKey(row.name);
        parityRecord[`distributor_${key}`] = row.deviceCount;
    });

    return parityRecord;
};
