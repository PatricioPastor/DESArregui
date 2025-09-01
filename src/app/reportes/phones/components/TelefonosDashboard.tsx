'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Components
import { Button } from '@/components/base/buttons/button';
import { DateRangePicker } from '@/components/application/date-picker/date-range-picker';

// Hooks
import { useTelefonosTicketsData } from '@/hooks/use-telefonos-tickets-data';
import type { TelefonosTicketsFilters } from '@/lib/types';
import { Activity, AlertTriangle, BarChart03, Download01, PieChart01, RefreshCw01, TrendUp01 } from '@untitledui/icons';

// Local components
import { MetricCard } from './MetricCard';
import { ChartsGrid } from './ChartsGrid';
import { DataTables } from './DataTables';
import { useReportGeneration } from './useReportGeneration';

export function TelefonosDashboard() {
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

  const [filters, setFilters] = useState<TelefonosTicketsFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnterprises, setSelectedEnterprises] = useState<string[]>([]);
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<string[]>([]);

  const { generateDemandAnalysisReport, generateStockAnalysisReport } = useReportGeneration({ analytics });

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

    const currentPeriod = filters.dateRange ? 
      `${filters.dateRange.start} a ${filters.dateRange.end}` : 
      format(new Date(), 'MMM yyyy', { locale: es });

    // Calculate previous period based on current date range or default to previous quarter
    const previousPeriod = filters.dateRange ? 
      'Período Anterior' : 
      format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'MMM yyyy', { locale: es });

    const nextPeriod = filters.dateRange ? 
      'Período Proyectado' : 
      format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'MMM yyyy', { locale: es });

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
      
    } catch (error) {
      console.error('Error processing date range:', error);
    }
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
              {lastUpdated && `Actualizado: ${format(new Date(lastUpdated), 'HH:mm dd/MM/yyyy')}`}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rango de fechas
              </label>
              <DateRangePicker
                onChange={handleDateRangeChange}
              />
            </div>

            {/* Filter Button */}
            <div className="flex items-end justify-end gap-2 flex-grow">
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
              value={analytics.totalTickets.toLocaleString()}
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