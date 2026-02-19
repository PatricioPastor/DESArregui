import { useCallback, useEffect, useRef, useState } from "react";
import type { InventoryModelOption, InventoryRecord, InventoryResponse, InventoryStatusSummary } from "@/lib/types";

const FILTERED_STOCK_CACHE_TTL_MS = 2 * 60 * 1000;

type FilteredStockCacheValue = {
    data: InventoryRecord[];
    totalRecords: number;
    statusSummary: InventoryStatusSummary[];
    lastUpdated: string | null;
    modelOptions: InventoryModelOption[];
};

const filteredStockCache = new Map<string, { timestamp: number; value: FilteredStockCacheValue }>();
const filteredStockInFlight = new Map<string, Promise<FilteredStockCacheValue>>();

export const clearFilteredStockCache = (apiPath?: string) => {
    if (!apiPath) {
        filteredStockCache.clear();
        filteredStockInFlight.clear();
        return;
    }

    const prefix = `${apiPath}|`;

    Array.from(filteredStockCache.keys()).forEach((key) => {
        if (key.startsWith(prefix)) {
            filteredStockCache.delete(key);
        }
    });

    Array.from(filteredStockInFlight.keys()).forEach((key) => {
        if (key.startsWith(prefix)) {
            filteredStockInFlight.delete(key);
        }
    });
};

const buildFilterCacheKey = (apiPath: string, query: string, filters: StockFilters = {}) => {
    const normalizedFilters = Object.fromEntries(
        Object.entries(filters)
            .filter(([, value]) => value !== undefined && value !== null && value !== "")
            .sort(([a], [b]) => a.localeCompare(b)),
    );

    return `${apiPath}|${query.trim()}|${JSON.stringify(normalizedFilters)}`;
};

interface UseStockDataReturn {
    data: InventoryRecord[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: string | null;
    totalRecords: number;
    statusSummary: InventoryStatusSummary[];
    refresh: () => Promise<void>;
}

export function useStockData(
    autoRefreshMs: number = 15 * 60 * 1000,
    options?: {
        summary?: boolean;
        enabled?: boolean;
    },
): UseStockDataReturn {
    const summary = options?.summary === true;
    const enabled = options?.enabled !== false;

    const [data, setData] = useState<InventoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [totalRecords, setTotalRecords] = useState(0);
    const [statusSummary, setStatusSummary] = useState<InventoryStatusSummary[]>([]);

    const fetchData = useCallback(
        async (searchQuery?: string) => {
            try {
                setError(null);
                const url = new URL("/api/stock", window.location.origin);
                if (searchQuery && searchQuery.trim()) {
                    url.searchParams.set("search", searchQuery.trim());
                }

                if (summary) {
                    url.searchParams.set("summary", "true");
                }

                const response = await fetch(url.toString(), {
                    headers: {
                        "Cache-Control": "no-cache",
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result: InventoryResponse = await response.json();

                if (!result.success) {
                    throw new Error(result.error || "Failed to fetch stock data");
                }

                setData(result.data || []);
                setTotalRecords(result.totalRecords || 0);
                setStatusSummary(result.statusSummary || []);
                setLastUpdated(result.lastUpdated || null);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
                setError(errorMessage);
                console.error("Error fetching stock data:", err);
            } finally {
                setIsLoading(false);
            }
        },
        [summary],
    );

    const refresh = useCallback(async () => {
        setIsLoading(true);
        await fetchData();
    }, [fetchData]);

    // Initial data fetch
    useEffect(() => {
        if (!enabled) {
            setIsLoading(false);
            setError(null);
            setData([]);
            setTotalRecords(0);
            setStatusSummary([]);
            setLastUpdated(null);
            return;
        }

        fetchData();
    }, [enabled, fetchData]);

    // Auto-refresh timer
    useEffect(() => {
        if (!enabled) return;
        if (autoRefreshMs <= 0) return;

        const interval = setInterval(() => {
            fetchData();
        }, autoRefreshMs);

        return () => clearInterval(interval);
    }, [autoRefreshMs, enabled, fetchData]);

    return {
        data,
        isLoading,
        error,
        lastUpdated,
        totalRecords,
        statusSummary,
        refresh,
    };
}

// Hook for filtered stock data with server-side search functionality
interface StockFilters {
    modelId?: string | null;
    status?: string | null;
    distributorId?: string | null;
    assigned?: boolean | null;
    includeDeleted?: boolean;
    backup?: string | null; // "true" | "false" | null
    backup_distributor?: string | null;
    mine?: boolean;
}

export function useFilteredStockData(searchQuery: string = "", filters?: StockFilters, apiPath: string = "/api/stock") {
    const [data, setData] = useState<InventoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [totalRecords, setTotalRecords] = useState(0);
    const [statusSummary, setStatusSummary] = useState<InventoryStatusSummary[]>([]);
    const [modelOptions, setModelOptions] = useState<InventoryModelOption[]>([]);
    const latestRequestKeyRef = useRef<string>("");

    const applyPayload = useCallback((payload: FilteredStockCacheValue) => {
        setData(payload.data);
        setTotalRecords(payload.totalRecords);
        setStatusSummary(payload.statusSummary);
        setLastUpdated(payload.lastUpdated);
        setModelOptions(payload.modelOptions);
    }, []);

    const fetchFilteredData = useCallback(
        async (query: string = "", currentFilters: StockFilters = {}, apiPath: string = "/api/stock", forceRefresh: boolean = false) => {
            const cacheKey = buildFilterCacheKey(apiPath, query, currentFilters);
            latestRequestKeyRef.current = cacheKey;

            try {
                setIsLoading(true);
                setError(null);

                if (!forceRefresh) {
                    const cached = filteredStockCache.get(cacheKey);
                    if (cached && Date.now() - cached.timestamp <= FILTERED_STOCK_CACHE_TTL_MS) {
                        if (latestRequestKeyRef.current === cacheKey) {
                            applyPayload(cached.value);
                            setIsLoading(false);
                        }
                        return;
                    }

                    const existingRequest = filteredStockInFlight.get(cacheKey);
                    if (existingRequest) {
                        const payload = await existingRequest;
                        if (latestRequestKeyRef.current === cacheKey) {
                            applyPayload(payload);
                            setIsLoading(false);
                        }
                        return;
                    }
                }

                const url = new URL(apiPath, window.location.origin);
                if (query && query.trim()) {
                    url.searchParams.set("search", query.trim());
                }
                if (currentFilters.modelId) {
                    url.searchParams.set("model", currentFilters.modelId);
                }
                if (currentFilters.status) {
                    url.searchParams.set("status", currentFilters.status);
                }
                if (currentFilters.distributorId) {
                    url.searchParams.set("distributor", currentFilters.distributorId);
                }
                if (currentFilters.assigned === true) {
                    url.searchParams.set("assigned", "true");
                } else if (currentFilters.assigned === false) {
                    url.searchParams.set("assigned", "false");
                }
                if (typeof currentFilters.includeDeleted === "boolean") {
                    url.searchParams.set("include_deleted", String(currentFilters.includeDeleted));
                }
                if (currentFilters.backup) {
                    url.searchParams.set("backup", currentFilters.backup);
                }
                if (currentFilters.backup_distributor) {
                    url.searchParams.set("backup_distributor", currentFilters.backup_distributor);
                }
                if (currentFilters.mine === true) {
                    url.searchParams.set("mine", "true");
                }

                const requestPromise = (async (): Promise<FilteredStockCacheValue> => {
                    const response = await fetch(url.toString());

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result: InventoryResponse = await response.json();

                    if (!result.success) {
                        throw new Error(result.error || "Failed to fetch stock data");
                    }

                    return {
                        data: result.data || [],
                        totalRecords: result.totalRecords || 0,
                        statusSummary: result.statusSummary || [],
                        lastUpdated: result.lastUpdated || null,
                        modelOptions: result.modelOptions || [],
                    };
                })();

                if (!forceRefresh) {
                    filteredStockInFlight.set(cacheKey, requestPromise);
                }

                const payload = await requestPromise;

                filteredStockCache.set(cacheKey, {
                    timestamp: Date.now(),
                    value: payload,
                });

                if (latestRequestKeyRef.current === cacheKey) {
                    applyPayload(payload);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
                if (latestRequestKeyRef.current === cacheKey) {
                    setError(errorMessage);
                }
                console.error("Error fetching filtered stock data:", err);
            } finally {
                filteredStockInFlight.delete(cacheKey);
                if (latestRequestKeyRef.current === cacheKey) {
                    setIsLoading(false);
                }
            }
        },
        [applyPayload],
    );

    const refresh = useCallback(async () => {
        await fetchFilteredData(searchQuery, filters ?? {}, apiPath, true);
    }, [apiPath, fetchFilteredData, searchQuery, filters]);

    // Fetch data when search query changes
    useEffect(() => {
        fetchFilteredData(searchQuery, filters ?? {}, apiPath);
    }, [apiPath, fetchFilteredData, searchQuery, filters]);

    return {
        data,
        isLoading,
        error,
        lastUpdated,
        totalRecords,
        statusSummary,
        modelOptions,
        refresh,
    };
}
