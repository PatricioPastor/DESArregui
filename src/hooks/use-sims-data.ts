import { useCallback, useEffect, useState } from "react";
import type { SimRecord, SimResponse } from "@/lib/types";

export function useSimsData(
    searchQuery: string = "",
    filters?: {
        status?: string;
        provider?: string;
        distributorId?: string;
        isActive?: boolean;
    },
    options?: {
        page?: number;
        pageSize?: number;
        sort?: { column: string; direction: "ascending" | "descending" };
        enabled?: boolean;
    },
) {
    const enabled = options?.enabled !== false;

    const [data, setData] = useState<SimRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [totalRecords, setTotalRecords] = useState(0);
    const [metadata, setMetadata] = useState<SimResponse["metadata"]>();

    const fetchData = useCallback(async (query: string = "", currentFilters: any = {}, currentOptions: any = {}) => {
        try {
            setIsLoading(true);
            setError(null);

            const url = new URL("/api/sims", window.location.origin);

            if (query && query.trim()) {
                url.searchParams.set("search", query.trim());
            }

            if (currentFilters.status && currentFilters.status !== "all") {
                url.searchParams.set("status", currentFilters.status);
            }

            if (currentFilters.provider && currentFilters.provider !== "all") {
                url.searchParams.set("provider", currentFilters.provider);
            }

            if (currentFilters.distributorId && currentFilters.distributorId !== "all") {
                url.searchParams.set("distributor_id", currentFilters.distributorId);
            }

            if (typeof currentFilters.isActive === "boolean") {
                url.searchParams.set("is_active", String(currentFilters.isActive));
            }

            const pageSize = Number(currentOptions.pageSize) || 50;
            const page = Number(currentOptions.page) || 1;
            const offset = Math.max(0, (page - 1) * pageSize);

            url.searchParams.set("limit", String(pageSize));
            url.searchParams.set("offset", String(offset));

            if (currentOptions.sort?.column) {
                url.searchParams.set("sort_by", String(currentOptions.sort.column));
                url.searchParams.set("sort_direction", currentOptions.sort.direction === "descending" ? "desc" : "asc");
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: SimResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Failed to fetch SIMs");
            }

            setData(result.data || []);
            setTotalRecords(result.totalRecords || 0);
            setLastUpdated(result.lastUpdated || null);
            setMetadata(result.metadata);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(errorMessage);
            console.error("Error fetching SIMs:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(searchQuery, filters, options);
    }, [searchQuery, filters, options, fetchData]);

    const refresh = useCallback(() => {
        fetchData(searchQuery, filters, options);
    }, [fetchData, searchQuery, filters, options]);

    return {
        data,
        isLoading,
        error,
        lastUpdated,
        totalRecords,
        metadata,
        refresh,
    };
}
