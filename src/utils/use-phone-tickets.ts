"use client";
import { useState, useEffect, useCallback } from 'react';

import {
  calculateTelefonosTicketsAnalytics,
  generateMonthlyDemandRegression,
} from './analytics-utils';
import { convertRowToTelefonosTicketRecord, filterTelefonosTickets } from './ticket-utils';
import type {
  TelefonosTicketRecord,
  TelefonosTicketsAnalytics,
  TelefonosTicketsFilters,
  LinearRegressionData,
} from './types';

interface UseTelefonosTicketsResult {
  records: TelefonosTicketRecord[];
  analytics: TelefonosTicketsAnalytics | null;
  regressionData: LinearRegressionData | null;
  isLoading: boolean;
  error: string | null;
  applyFilters: (filters: TelefonosTicketsFilters) => void;
  filterOptions: {
    enterprises: string[];
    issueTypes: string[];
    labels: string[];
  };
}

export function useTelefonosTickets(): UseTelefonosTicketsResult {
  const [records, setRecords] = useState<TelefonosTicketRecord[]>([]);
  const [analytics, setAnalytics] = useState<TelefonosTicketsAnalytics | null>(null);
  const [regressionData, setRegressionData] = useState<LinearRegressionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TelefonosTicketsFilters>({});

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/telefonos-tickets');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const sheetData = await response.json();
        const ticketRecords = sheetData.headers.map((row: string[]) =>
          convertRowToTelefonosTicketRecord(row, sheetData.headers)
        );
        setRecords(ticketRecords);
        setAnalytics(calculateTelefonosTicketsAnalytics(ticketRecords));
        setRegressionData(generateMonthlyDemandRegression(ticketRecords));
      } catch (err) {
        setError('Failed to fetch ticket data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const applyFilters = useCallback((newFilters: TelefonosTicketsFilters) => {
    setFilters(newFilters);
    setAnalytics(calculateTelefonosTicketsAnalytics(records, newFilters));
    setRegressionData(generateMonthlyDemandRegression(filterTelefonosTickets(records, newFilters)));
  }, [records]);

  const filterOptions = {
    enterprises: [...new Set(records.map((r) => r.enterprise))].filter(Boolean).sort(),
    issueTypes: [...new Set(records.map((r) => r.issue_type))].filter(Boolean).sort(),
    labels: [...new Set(records.map((r) => r.label))].filter(Boolean).sort(),
  };

  return { records, analytics, regressionData, isLoading, error, applyFilters, filterOptions };
}