import { useCallback, useEffect, useState } from "react";
import type { SotiStockPagination, SotiStockRecord, SotiStockResponse, SotiStockSummary } from "@/lib/types";

const SOTI_ACTIVE_FILTER = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    ALL: "all",
} as const;

export type SotiActiveFilter = (typeof SOTI_ACTIVE_FILTER)[keyof typeof SOTI_ACTIVE_FILTER];

interface UseSotiStockDataOptions {
    search?: string;
    page?: number;
    limit?: number;
    active?: SotiActiveFilter;
}

interface UseSotiStockDataResult {
    data: SotiStockRecord[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: string | null;
    totalRecords: number;
    pagination: SotiStockPagination | null;
    summary: SotiStockSummary | null;
    refresh: () => Promise<void>;
}

export function useSotiStockData(options: UseSotiStockDataOptions = {}): UseSotiStockDataResult {
    const [data, setData] = useState<SotiStockRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [totalRecords, setTotalRecords] = useState(0);
    const [pagination, setPagination] = useState<SotiStockPagination | null>(null);
    const [summary, setSummary] = useState<SotiStockSummary | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const url = new URL("/api/stock-soti", window.location.origin);
            if (options.search?.trim()) {
                url.searchParams.set("search", options.search.trim());
            }

            if (options.page && options.page > 0) {
                url.searchParams.set("page", String(options.page));
            }

            if (options.limit && options.limit > 0) {
                url.searchParams.set("limit", String(options.limit));
            }

            if (options.active) {
                url.searchParams.set("active", options.active);
            }

            const response = await fetch(url.toString(), {
                headers: {
                    "Cache-Control": "no-cache",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = (await response.json()) as SotiStockResponse;
            if (!result.success) {
                throw new Error(result.error || "No se pudo obtener el stock SOTI");
            }

            setData(result.data || []);
            setTotalRecords(result.totalRecords || 0);
            setPagination(result.pagination || null);
            setSummary(result.summary || null);
            setLastUpdated(result.lastUpdated || null);
        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Error inesperado al cargar stock SOTI";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [options.active, options.limit, options.page, options.search]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const refresh = useCallback(async () => {
        await fetchData();
    }, [fetchData]);

    return {
        data,
        isLoading,
        error,
        lastUpdated,
        totalRecords,
        pagination,
        summary,
        refresh,
    };
}
