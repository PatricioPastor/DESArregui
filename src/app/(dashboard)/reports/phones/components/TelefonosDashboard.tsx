'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Components
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { DateRangePicker } from '@/components/application/date-picker/date-range-picker';
import { Select } from '@/components/base/select/select';
import { SelectItem } from '@/components/base/select/select-item';

// Hooks
import { useTelefonosTicketsData } from '@/hooks/use-telefonos-tickets-data';
import type { TelefonosTicketsFilters } from '@/lib/types';
import { Activity, AlertTriangle, BarChart03, Download01, FilterFunnel01, PieChart01, RefreshCw01, SearchSm, TrendUp01 } from '@untitledui/icons';

// Local components
import { MetricCard } from './MetricCard';
import { ChartsGrid } from './ChartsGrid';
import { DataTables } from './DataTables';
import { useReportGeneration } from './useReportGeneration';

export function TelefonosDashboard({
  onFiltersChange,
  currentFilters
}: {
  onFiltersChange?: (filters: TelefonosTicketsFilters) => void;
  currentFilters?: TelefonosTicketsFilters;
}) {
  const {
    data,
    analytics,
    isLoading,
    error,
    lastUpdated,
    totalRecords,
    filteredCount,
    refresh,
    applyFilters,
    filterOptions
  } = useTelefonosTicketsData();

  // Generate filter options from analytics data if not provided by hook
  const availableEnterprises = filterOptions.enterprises.length > 0 
    ? filterOptions.enterprises 
    : analytics ? Object.keys(analytics.byEnterprise) : [];
    
  const availableIssueTypes = filterOptions.issueTypes.length > 0 
    ? filterOptions.issueTypes 
    : analytics ? Object.keys(analytics.byIssueType) : [];

  const [filters, setFilters] = useState<TelefonosTicketsFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnterprises, setSelectedEnterprises] = useState<string[]>([]);
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { generateDemandAnalysisReport, generateStockAnalysisReport } = useReportGeneration({ analytics });

  // Track mount status for stable rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Chart data transformations
  const enterpriseChartData = useMemo(() => {
    if (!analytics?.byEnterprise) return [];
    return Object.entries(analytics.byEnterprise).map(([name, value]) => ({
      name,
      value,
      tickets: value
    }));
  }, [analytics?.byEnterprise]);

  const timeSeriesChartData = useMemo(() => {
    return analytics?.timeSeriesData || [];
  }, [analytics?.timeSeriesData]);

  // Demand trends data for the evolution chart
  const demandTrendsData = useMemo(() => {
    if (!analytics) return [];

    // Use stable date formatting to prevent hydration mismatches
    const currentPeriod = filters.dateRange ?
      `${filters.dateRange.start} a ${filters.dateRange.end}` :
      'May 2025';

    // Calculate previous period based on current date range or default to previous quarter
    const previousPeriod = filters.dateRange ?
      'Período Anterior' :
      'Feb 2025';

    const nextPeriod = filters.dateRange ?
      'Período Proyectado' :
      'Ago 2025';

    // Get historical data or use sample data
    const previousDemand = 73; // Sample data from context - Feb-Apr 2025
    const currentDemand = analytics.totalTickets || 64;
    const projectedDemand = analytics.demandProjections?.reduce((sum, proj) => sum + proj.projectedDemand, 0) || 56;

    return [
      {
        period: previousPeriod,
        demanda: previousDemand,
        type: 'pasada'
      },
      {
        period: currentPeriod,
        demanda: currentDemand,
        type: 'actual'
      },
      {
        period: nextPeriod,
        demanda: projectedDemand,
        type: 'proyectada'
      }
    ];
  }, [analytics, filters.dateRange]);

  const handleDateRangeChange = async (dates: any) => {
    setSelectedDateRange(dates);
    
    if (!dates || !dates.start || !dates.end) {
      console.log('No valid date range provided');
      return;
    }

    try {
      // Convert the calendar date objects to ISO strings
      const startDate = `${dates.start.year}-${dates.start.month.toString().padStart(2, '0')}-${dates.start.day.toString().padStart(2, '0')}`;
      const endDate = `${dates.end.year}-${dates.end.month.toString().padStart(2, '0')}-${dates.end.day.toString().padStart(2, '0')}`;
      
      const newFilters = {
        ...filters,
        dateRange: { start: startDate, end: endDate }
      };

      setFilters(newFilters);
      await applyFilters(newFilters);

      // Notify parent component about date filter changes
      onFiltersChange?.(newFilters);

    } catch (error) {
      console.error('Error processing date range:', error);
    }
  };

  const handleFilterChange = async () => {
    const newFilters: TelefonosTicketsFilters = {
      ...filters,
      searchKeyword: searchQuery || undefined,
      enterprise: selectedEnterprises.length > 0 ? selectedEnterprises : undefined,
      issueType: selectedIssueTypes.length > 0 ? selectedIssueTypes : undefined,
    };

    setFilters(newFilters);
    await applyFilters(newFilters);

    // Notify parent component about filter changes
    onFiltersChange?.(newFilters);
  };

  const handleResetFilters = async () => {
    setSearchQuery('');
    setSelectedEnterprises([]);
    setSelectedIssueTypes([]);
    setSelectedDateRange(null);

    const resetFilters = {};
    setFilters(resetFilters);
    await applyFilters(resetFilters);

    // Notify parent component about filter reset
    onFiltersChange?.(resetFilters);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 max-w-md w-full">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Error al cargar datos
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <Button onClick={refresh} className="w-full">
              <RefreshCw01 className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto py-4">
        {/* Filters Section */}
        <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filtros</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isMounted && lastUpdated && `Actualizado: ${format(new Date(lastUpdated), 'HH:mm dd/MM/yyyy')}`}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rango de fechas
              </label>
              <DateRangePicker
                value={selectedDateRange}
                onChange={handleDateRangeChange}
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Búsqueda
              </label>
              <div className="relative">
                <Input
                  icon={SearchSm}
                  placeholder="Buscar tickets..."
                  value={searchQuery}
                  onChange={(value: any) => setSearchQuery(value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Enterprises Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Distribuidoras
              </label>
              <Select 
                placeholder="Seleccionar distribuidoras"
                selectedKey={selectedEnterprises[0] || null}
                items={availableEnterprises.map(enterprise => ({
                  id: enterprise,
                  label: enterprise
                }))}
                onSelectionChange={(key) => {
                  setSelectedEnterprises(key ? [key as string] : []);
                }}
              >
                {(item) => (
                  <SelectItem id={item.id} label={item.label}>
                    {item.label}
                  </SelectItem>
                )}
              </Select>
            </div>

            {/* Issue Types Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipos de Issues
              </label>
              <Select 
                placeholder="Seleccionar tipos"
                selectedKey={selectedIssueTypes[0] || null}
                items={availableIssueTypes.map(issueType => ({
                  id: issueType,
                  label: issueType
                }))}
                onSelectionChange={(key) => {
                  setSelectedIssueTypes(key ? [key as string] : []);
                }}
              >
                {(item) => (
                  <SelectItem id={item.id} label={item.label}>
                    {item.label}
                  </SelectItem>
                )}
              </Select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleFilterChange} 
                iconLeading={FilterFunnel01}
                disabled={isLoading}
              >
                Aplicar Filtros
              </Button>
              <Button 
                onClick={handleResetFilters}
                color="secondary"
                disabled={isLoading}
              >
                Limpiar
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                color="secondary"
                onClick={refresh}
                disabled={isLoading}
                className="inline-flex items-center"
              >
                Sincronizar
              </Button>
              <Button iconLeading={Download01} onClick={generateDemandAnalysisReport} className="inline-flex items-center">
                Reporte Demanda
              </Button>
              <Button iconLeading={Download01} onClick={generateStockAnalysisReport} color="secondary" className="inline-flex items-center">
                Reporte Stock
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando datos...</span>
          </div>
        )}

        {/* Metrics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Tickets"
              value={analytics.totalTickets.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              subtitle={`${filteredCount} filtrados de ${totalRecords} totales`}
              icon={Activity}
              color="blue"
            />
            
            <MetricCard
              title="Distribuidoras"
              value={Object.keys(analytics.byEnterprise).length}
              subtitle="Empresas activas"
              icon={BarChart03}
              color="green"
            />
            
            <MetricCard
              title="Tipos de Issues"
              value={Object.keys(analytics.byIssueType).length}
              subtitle="Categorías identificadas"
              icon={PieChart01}
              color="orange"
            />
            
            <MetricCard
              title="Demanda Proyectada"
              value={analytics.demandProjections.reduce((sum, proj) => sum + proj.projectedDemand, 0)}
              subtitle="Próximo trimestre"
              trend={15}
              icon={TrendUp01}
              color="red"
            />
          </div>
        )}

        {/* Charts Section */}
        {analytics && (
          <ChartsGrid
            analytics={analytics}
            enterpriseChartData={enterpriseChartData}
            demandTrendsData={demandTrendsData}
            timeSeriesChartData={timeSeriesChartData}
          />
        )}

        {/* Data Tables */}
        {analytics && <DataTables analytics={analytics} />}
      </div>
    </div>
  );
}