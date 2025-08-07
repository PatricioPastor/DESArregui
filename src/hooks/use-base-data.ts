import { useState, useEffect, useCallback } from 'react';
import type { IMEIRecord, BaseSheetResponse } from '@/lib/types';

interface UseBaseDataReturn {
  data: IMEIRecord[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  totalRecords: number;
  refresh: () => Promise<void>;
}

export function useBaseData(autoRefreshMs: number = 15 * 60 * 1000): UseBaseDataReturn {
  const [data, setData] = useState<IMEIRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/base', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: BaseSheetResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data || []);
      setTotalRecords(result.totalRecords || 0);
      setLastUpdated(result.lastUpdated || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching base data:', err);
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

// Hook for filtered data with search functionality
export function useFilteredBaseData(searchQuery: string = '', filterField?: keyof IMEIRecord) {
  const baseData = useBaseData();
  const [filteredData, setFilteredData] = useState<IMEIRecord[]>([]);

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
        record.nombre_soti.toLowerCase().includes(query) ||
        record.distribuidora_soti.toLowerCase().includes(query) ||
        record.modelo.toLowerCase().includes(query) ||
        record.ticket.toLowerCase().includes(query)
      );
    }

    if (filterField && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = baseData.data.filter(record =>
        record[filterField]?.toString().toLowerCase().includes(query)
      );
    }

    setFilteredData(filtered);
  }, [baseData.data, searchQuery, filterField]);

  return {
    ...baseData,
    data: filteredData,
    originalData: baseData.data,
    filteredCount: filteredData.length,
  };
}