import { useEffect, useState } from "react";

interface KpiData {
    requests: number;
    requests_pending?: number;
    replacements: number;
    assignments: number;
    stock_current: number;
    total_devices: number;
    devices_lost: number;
    utilization_rate: number;
    replacement_rate: number;
    period: {
        start_date: string;
        end_date: string;
        days_in_period: number;
    };
}

interface UseKpiDataOptions {
    startDate?: string;
    endDate?: string;
    enabled?: boolean;
}

export function useKpiData({ startDate, endDate, enabled = true }: UseKpiDataOptions = {}) {
    const [data, setData] = useState<KpiData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchKpiData = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (startDate) params.append("start_date", startDate);
            if (endDate) params.append("end_date", endDate);

            const response = await fetch(`/api/reports/kpis?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const kpiData = await response.json();
            setData(kpiData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred");
            console.error("Error fetching KPI data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            setError(null);
            setData(null);
            return;
        }

        fetchKpiData();
    }, [enabled, startDate, endDate]);

    const refetch = async () => {
        await fetchKpiData();
    };

    return { data, loading, error, refetch };
}
