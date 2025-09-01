import { useState, useEffect, useCallback } from 'react';
import type { 
  TelefonosTicketRecord, 
  TelefonosTicketsResponse, 
  TelefonosTicketsAnalytics,
  TelefonosTicketsFilters 
} from '@/lib/types';

interface UseTelefonosTicketsDataReturn {
  data: TelefonosTicketRecord[];
  analytics: TelefonosTicketsAnalytics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  totalRecords: number;
  filteredCount: number;
  refresh: () => Promise<void>;
  applyFilters: (filters: TelefonosTicketsFilters) => Promise<void>;
  filterOptions: {
    enterprises: string[];
    issueTypes: string[];
    labels: string[];
  };
}

export function useTelefonosTicketsData(): UseTelefonosTicketsDataReturn {
  const [data, setData] = useState<TelefonosTicketRecord[]>([]);
  const [analytics, setAnalytics] = useState<TelefonosTicketsAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [filterOptions, setFilterOptions] = useState({
    enterprises: [] as string[],
    issueTypes: [] as string[],
    labels: [] as string[]
  });

  const fetchData = useCallback(async (filters?: TelefonosTicketsFilters) => {
    try {
      setError(null);
      setIsLoading(true);

      let url = '/api/telefonos-tickets';
      const params = new URLSearchParams();

      // Add filter parameters to URL
      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange.start);
        params.append('endDate', filters.dateRange.end);
      }
      if (filters?.enterprise?.length) {
        params.append('enterprises', filters.enterprise.join(','));
      }
      if (filters?.issueType?.length) {
        params.append('issueTypes', filters.issueType.join(','));
      }
      if (filters?.label?.length) {
        params.append('labels', filters.label.join(','));
      }
      if (filters?.searchKeyword) {
        params.append('search', filters.searchKeyword);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TelefonosTicketsResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch TELEFONOS_TICKETS data');
      }

      setData(result.data || []);
      setAnalytics(result.analytics || null);
      setTotalRecords(result.totalRecords || 0);
      setLastUpdated(result.lastUpdated || null);
      
      // Set filtered count (analytics.totalTickets represents filtered results)
      setFilteredCount(result.analytics?.totalTickets || result.totalRecords || 0);

      // Update filter options if available
      // if (result.enterprises && result.issueTypes && result.labels) {
      //   setFilterOptions({
      //     enterprises: result.enterprises,
      //     issueTypes: result.issueTypes,
      //     labels: result.labels
      //   });
      // }

      console.log('TELEFONOS_TICKETS data fetched:', {
        totalRecords: result.totalRecords,
        filteredRecords: result.analytics?.totalTickets,
        analyticsIncluded: !!result.analytics
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching TELEFONOS_TICKETS data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  const applyFilters = useCallback(async (filters: TelefonosTicketsFilters) => {
    await fetchData(filters);
  }, [fetchData]);

  // Initial data fetch (no auto-refresh as per requirements - manual sync only)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    analytics,
    isLoading,
    error,
    lastUpdated,
    totalRecords,
    filteredCount,
    refresh,
    applyFilters,
    filterOptions,
  };
}

// Hook for search functionality within loaded data
export function useFilteredTelefonosTickets(
  data: TelefonosTicketRecord[], 
  searchQuery: string = ''
) {
  const [filteredData, setFilteredData] = useState<TelefonosTicketRecord[]>([]);

  useEffect(() => {
    if (!data.length) {
      setFilteredData([]);
      return;
    }

    let filtered = data;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = data.filter(record => 
        record.title.toLowerCase().includes(query) ||
        record.key.toLowerCase().includes(query) ||
        record.enterprise.toLowerCase().includes(query) ||
        record.issue_type.toLowerCase().includes(query) ||
        record.label.toLowerCase().includes(query)
      );
    }

    setFilteredData(filtered);
  }, [data, searchQuery]);

  return {
    data: filteredData,
    originalData: data,
    filteredCount: filteredData.length,
  };
}

// Hook for date-based filtering
export function useTelefonosTicketsDateFilter(
  data: TelefonosTicketRecord[]
) {
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [filteredData, setFilteredData] = useState<TelefonosTicketRecord[]>([]);

  useEffect(() => {
    if (!data.length) {
      setFilteredData([]);
      return;
    }

    let filtered = data;

    if (dateRange) {
      filtered = data.filter(record => {
        try {
          const recordDate = new Date(record.created);
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end);
          
          return recordDate >= startDate && recordDate <= endDate;
        } catch (error) {
          console.warn('Error parsing date for record:', record.key, error);
          return false;
        }
      });
    }

    setFilteredData(filtered);
  }, [data, dateRange]);

  const applyDateFilter = useCallback((start: string, end: string) => {
    setDateRange({ start, end });
  }, []);

  const clearDateFilter = useCallback(() => {
    setDateRange(null);
  }, []);

  return {
    data: filteredData,
    originalData: data,
    filteredCount: filteredData.length,
    dateRange,
    applyDateFilter,
    clearDateFilter,
  };
}