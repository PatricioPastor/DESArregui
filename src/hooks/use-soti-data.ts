"use client";

import { useState, useEffect, useMemo } from 'react';
import type { SOTIRecord } from '@/lib/types';

interface SOTIResponse {
  success: boolean;
  data?: SOTIRecord[];
  headers?: string[];
  totalRecords?: number;
  lastUpdated?: string;
  error?: string;
}

interface UseSOTIDataResult {
  data: SOTIRecord[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refetch: () => Promise<void>;
}

export function useSOTIData(): UseSOTIDataResult {
  const [data, setData] = useState<SOTIRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/soti');
      const result: SOTIResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch SOTI data');
      }
      
      setData(result.data || []);
      setLastUpdated(result.lastUpdated || null);
    } catch (err) {
      console.error('Error fetching SOTI data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: fetchData,
  };
}

export function useFilteredSOTIData(searchQuery: string = ''): UseSOTIDataResult & {
  filteredData: SOTIRecord[];
} {
  const baseResult = useSOTIData();
  
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return baseResult.data;
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    return baseResult.data.filter((record) => {
      return (
        record.nombre_dispositivo?.toLowerCase().includes(query) ||
        record.usuario_asignado?.toLowerCase().includes(query) ||
        record.modelo?.toLowerCase().includes(query) ||
        record.imei?.toLowerCase().includes(query) ||
        record.telefono?.toLowerCase().includes(query) ||
        record.id_ticket_jira?.toLowerCase().includes(query) ||
        record.ubicacion?.toLowerCase().includes(query)
      );
    });
  }, [baseResult.data, searchQuery]);

  return {
    ...baseResult,
    filteredData,
  };
}