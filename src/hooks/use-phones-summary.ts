import { useState, useEffect, useCallback } from 'react';

export interface PhonesSummaryData {
  kpis: {
    total_tickets: number;
    total_demand: number;
    pending_demand: number;
    assignments: number;
    replacements: number;
    replacement_rate: number;
  };
  replacement_types: {
    ROBO: number;
    ROTURA: number;
    OBSOLETO: number;
    PERDIDA: number;
    SIN_ESPECIFICAR: number;
  };
  stock: {
    available: number;
    models: Array<{
      brand: string;
      model: string;
      color: string | null;
      storage_gb: number | null;
      count: number;
      display_name: string;
    }>;
  };
  tickets: Array<any>;
  monthly_data: Array<{
    month: string;
    month_number: number;
    tickets: number;
    demand: number;
    is_in_range: boolean;
    is_projected: boolean;
    projected_demand: number | null;
  }>;
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
}

interface UsePhonesSummaryOptions {
  startDate?: string;
  endDate?: string;
}

export function usePhonesSummary({ startDate, endDate }: UsePhonesSummaryOptions = {}) {
  const [data, setData] = useState<PhonesSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/reports/phones/summary?${params}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const summaryData = await response.json();
      setData(summaryData);

      console.log('[usePhonesSummary] Data fetched:', {
        tickets: summaryData.kpis.total_tickets,
        demand: summaryData.kpis.total_demand,
        stock: summaryData.stock.available
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('[usePhonesSummary] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}
