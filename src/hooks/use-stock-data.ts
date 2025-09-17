import { useState, useEffect, useCallback } from 'react';
import type { StockRecord, StockSheetResponse } from '@/lib/types';

interface UseStockDataReturn {
  data: StockRecord[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  totalRecords: number;
  refresh: () => Promise<void>;
}

export function useStockData(autoRefreshMs: number = 15 * 60 * 1000): UseStockDataReturn {
  const [data, setData] = useState<StockRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchData = useCallback(async (searchQuery?: string) => {
    try {
      setError(null);
      const url = new URL('/api/stock', window.location.origin);
      if (searchQuery && searchQuery.trim()) {
        url.searchParams.set('search', searchQuery.trim());
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: StockSheetResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch stock data');
      }

      setData(result.data || []);
      setTotalRecords(result.totalRecords || 0);
      setLastUpdated(result.lastUpdated || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching stock data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefreshMs <= 0) return;

    const interval = setInterval(() => {
      fetchData();
    }, autoRefreshMs);

    return () => clearInterval(interval);
  }, [autoRefreshMs, fetchData]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    totalRecords,
    refresh,
  };
}

// Hook for filtered stock data with server-side search functionality
export function useFilteredStockData(searchQuery: string = '') {
  const [data, setData] = useState<StockRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchFilteredData = useCallback(async (query: string = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const url = new URL('/api/stock', window.location.origin);
      if (query && query.trim()) {
        url.searchParams.set('search', query.trim());
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: StockSheetResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch stock data');
      }

      setData(result.data || []);
      setTotalRecords(result.totalRecords || 0);
      setLastUpdated(result.lastUpdated || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching filtered stock data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchFilteredData(searchQuery);
  }, [fetchFilteredData, searchQuery]);

  // Fetch data when search query changes
  useEffect(() => {
    fetchFilteredData(searchQuery);
  }, [fetchFilteredData, searchQuery]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    totalRecords,
    refresh,
  };
}