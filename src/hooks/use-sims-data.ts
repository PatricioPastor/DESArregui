import { useState, useEffect, useCallback } from 'react';
import type { SimRecord, SimResponse } from '@/lib/types';

export function useSimsData(
  searchQuery: string = '',
  filters?: {
    status?: string;
    provider?: string;
    distributorId?: string;
    isActive?: boolean;
  }
) {
  const [data, setData] = useState<SimRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [metadata, setMetadata] = useState<SimResponse['metadata']>();

  const fetchData = useCallback(async (query: string = '', currentFilters: any = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = new URL('/api/sims', window.location.origin);
      
      if (query && query.trim()) {
        url.searchParams.set('search', query.trim());
      }
      
      if (currentFilters.status && currentFilters.status !== 'all') {
        url.searchParams.set('status', currentFilters.status);
      }
      
      if (currentFilters.provider && currentFilters.provider !== 'all') {
        url.searchParams.set('provider', currentFilters.provider);
      }
      
      if (currentFilters.distributorId && currentFilters.distributorId !== 'all') {
        url.searchParams.set('distributor_id', currentFilters.distributorId);
      }
      
      if (typeof currentFilters.isActive === 'boolean') {
        url.searchParams.set('is_active', String(currentFilters.isActive));
      }
      
      // Set reasonable limits for pagination
      url.searchParams.set('limit', '1000');
      url.searchParams.set('offset', '0');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SimResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch SIMs');
      }

      setData(result.data || []);
      setTotalRecords(result.totalRecords || 0);
      setLastUpdated(result.lastUpdated || null);
      setMetadata(result.metadata);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching SIMs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(searchQuery, filters);
  }, [searchQuery, filters, fetchData]);

  const refresh = useCallback(() => {
    fetchData(searchQuery, filters);
  }, [fetchData, searchQuery, filters]);

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

