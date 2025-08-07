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

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/stock', {
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

// Hook for filtered stock data with search functionality
export function useFilteredStockData(searchQuery: string = '') {
  const baseData = useStockData();
  const [filteredData, setFilteredData] = useState<StockRecord[]>([]);

  useEffect(() => {
    if (!baseData.data.length) {
      setFilteredData([]);
      return;
    }

    let filtered = baseData.data;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = baseData.data.filter(record => 
        record.imei.toLowerCase().includes(query) ||
        record.modelo.toLowerCase().includes(query) ||
        record.distribuidora.toLowerCase().includes(query) ||
        record.asignado_a.toLowerCase().includes(query) ||
        record.ticket.toLowerCase().includes(query)
      );
    }

    setFilteredData(filtered);
  }, [baseData.data, searchQuery]);

  return {
    ...baseData,
    data: filteredData,
    originalData: baseData.data,
    filteredCount: filteredData.length,
  };
}