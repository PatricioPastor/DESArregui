'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import MobileDevicesReport from '@/components/reports/MobileDevicesReport';

// Recharts imports
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Legend,
  Pie
} from 'recharts';

// Components (assuming Untitled UI structure)
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';

import { Badge } from '@/components/base/badges/badges';
import { Select } from "@/components/base/select/select";

import { DateRangePicker } from '@/components/application/date-picker/date-range-picker';
import { Table } from '@/components/application/table/table';

// Hooks
import { useTelefonosTicketsData } from '@/hooks/use-telefonos-tickets-data';
import type { TelefonosTicketsFilters } from '@/lib/types';
import { Activity, AlertTriangle, BarChart03, Download01, FilterFunnel01, PieChart01, RefreshCw01, SearchSm, TrendDown01, TrendUp01 } from '@untitledui/icons';
import { SelectItem } from '@/components/base/select/select-item';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'orange' | 'red';
}

function MetricCard({ title, value, subtitle, trend, icon: Icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400',
    green: 'bg-success-50 text-success-600 dark:bg-success-950 dark:text-success-400',
    orange: 'bg-warning-50 text-warning-600 dark:bg-warning-950 dark:text-warning-400',
    red: 'bg-error-50 text-error-600 dark:bg-error-950 dark:text-error-400'
  };

  return (
    <div className="bg-surface-1 border border-surface rounded-lg shadow-sm p-6 hover:bg-surface-2 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {typeof trend === 'number' && (
            <div className="flex items-center mt-2">
              {trend >= 0 ? (
                <TrendUp01 className="h-4 w-4 text-success-600 mr-1" />
              ) : (
                <TrendDown01 className="h-4 w-4 text-error-600 mr-1" />
              )}
              <span className={`text-sm font-medium ${trend >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]} transition-colors`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function TelefonosTicketsDashboard() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'report'>('dashboard');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-app">
      {/* Mode Toggle Header */}
      <div className="bg-white dark:bg-app border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto ">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Teléfonos y Tickets
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                color={viewMode === 'dashboard' ? 'primary' : 'secondary'}
                iconLeading={BarChart03}
                onClick={() => setViewMode('dashboard')}
              >
                Gráficos
              </Button>
              <Button
                color={viewMode === 'report' ? 'primary' : 'secondary'}
                iconLeading={Download01}
                onClick={() => setViewMode('report')}
              >
                Reporte
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'dashboard' ? (
        <TelefonosTicketsDashboardOld />
      ) : (
        <div className=" py-4">
          <MobileDevicesReportWrapper />
        </div>
      )}
    </div>
  );
}

function TelefonosTicketsDashboardOld() {
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

  // Chart data transformations
  const enterpriseChartData = useMemo(() => {
    if (!analytics?.byEnterprise) return [];
    return Object.entries(analytics.byEnterprise).map(([name, value]) => ({
      name,
      value,
      tickets: value
    }));
  }, [analytics?.byEnterprise]);

  const issueTypeChartData = useMemo(() => {
    if (!analytics?.byIssueType) return [];
    return Object.entries(analytics.byIssueType).map(([name, value]) => ({
      name,
      value
    }));
  }, [analytics?.byIssueType]);

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

  const handleFilterChange = async () => {
    const newFilters: TelefonosTicketsFilters = {
      ...filters,
      searchKeyword: searchQuery || undefined,
      enterprise: selectedEnterprises.length > 0 ? selectedEnterprises : undefined,
      issueType: selectedIssueTypes.length > 0 ? selectedIssueTypes : undefined,
    };
    
    await applyFilters(newFilters);
  };

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

  const generateDemandAnalysisReport = async () => {
    try {
      // Import the PDF generator function dynamically
      const { generateMobileDevicesReport } = await import('@/utils/pdf-generator');
      
      // Create report data based on current analytics
      const reportData = {
        reportDate: format(new Date(), 'dd \'de\' MMMM \'de\' yyyy, HH:mm \'PM\' xxx', { locale: es }),
        period: "mayo-julio 2025",
        distributorsData: analytics?.demandProjections?.map(proj => ({
          distributor: proj.enterprise,
          pending: 0,
          assignments: Math.floor(proj.currentDemand * 0.2), // 20% assignments
          replacements: Math.floor(proj.currentDemand * 0.8), // 80% replacements
          total: proj.currentDemand
        })) || [
          { distributor: "DESA", pending: 0, assignments: 1, replacements: 4, total: 5 },
          { distributor: "EDES", pending: 0, assignments: 1, replacements: 4, total: 5 },
          { distributor: "EDELAP", pending: 0, assignments: 2, replacements: 8, total: 10 },
          { distributor: "EDEN", pending: 0, assignments: 4, replacements: 17, total: 21 },
          { distributor: "EDEA", pending: 0, assignments: 3, replacements: 11, total: 14 },
          { distributor: "EDESA", pending: 0, assignments: 2, replacements: 7, total: 9 }
        ],
        obsoleteDevices: analytics?.stockAnalysis?.reduce((sum, stock) => sum + (stock.shortage > 0 ? stock.shortage : 0), 0) || 26,
        analyzedDemand: analytics?.totalTickets || 64,
        projectedDemand: analytics?.demandProjections?.reduce((sum, proj) => sum + proj.projectedDemand, 0) || 56,
        stockData: [
          { model: "Samsung Galaxy A16", quantity: 117, usage: "Recambios convencionales" },
          { model: "Samsung Galaxy A36", quantity: 8, usage: "Supervisión y coordinación" },
          { model: "Samsung Galaxy A56", quantity: 4, usage: "Jefaturas de área" },
          { model: "Galaxy S25 Plus", quantity: 1, usage: "Gerencia/Dirección" },
          { model: "Galaxy S25 Ultra", quantity: 1, usage: "Alta dirección" }
        ],
        totalStock: 131,
        pendingByDistributor: analytics?.stockAnalysis?.reduce((acc, stock) => {
          acc[stock.enterprise] = stock.shortage > 0 ? stock.shortage : 0;
          return acc;
        }, {} as Record<string, number>) || {
          "EDEA": 1, "EDELAP": 1, "EDESA": 1, "EDEN": 2, "EDES": 1, "DESA": 0
        },
        budgetEstimate: ((analytics?.demandProjections?.reduce((sum, proj) => sum + proj.projectedDemand, 0) || 56) + 26) * 576
      };
      
      // Generate the PDF
      generateMobileDevicesReport(reportData);
    } catch (error) {
      console.error('Error generating demand report:', error);
    }
  };

  const generateStockAnalysisReport = async () => {
    try {
      // Import the PDF generator function dynamically
      const { generateMobileDevicesReport } = await import('@/utils/pdf-generator');
      
      // Create sample data based on current analytics
      const reportData = {
        reportDate: format(new Date(), 'dd \'de\' MMMM \'de\' yyyy, HH:mm \'PM\' xxx', { locale: es }),
        period: "junio-agosto 2025",
        distributorsData: analytics?.demandProjections?.map(proj => ({
          distributor: proj.enterprise,
          pending: 0,
          assignments: Math.floor(proj.currentDemand * 0.3), // 30% assignments
          replacements: Math.floor(proj.currentDemand * 0.7), // 70% replacements
          total: proj.currentDemand
        })) || [
          { distributor: "DESA", pending: 0, assignments: 2, replacements: 3, total: 5 },
          { distributor: "EDES", pending: 0, assignments: 0, replacements: 5, total: 5 },
          { distributor: "EDELAP", pending: 0, assignments: 3, replacements: 7, total: 10 },
          { distributor: "EDEN", pending: 0, assignments: 2, replacements: 19, total: 21 },
          { distributor: "EDEA", pending: 0, assignments: 0, replacements: 14, total: 14 },
          { distributor: "EDESA", pending: 0, assignments: 5, replacements: 4, total: 9 }
        ],
        obsoleteDevices: 26,
        analyzedDemand: analytics?.totalTickets || 64,
        projectedDemand: analytics?.demandProjections?.reduce((sum, proj) => sum + proj.projectedDemand, 0) || 56,
        stockData: [
          { model: "Samsung Galaxy A16", quantity: 117, usage: "Recambios convencionales" },
          { model: "Samsung Galaxy A36", quantity: 8, usage: "Uso específico" },
          { model: "Samsung Galaxy A56", quantity: 4, usage: "Uso específico" },
          { model: "Galaxy S25 Plus", quantity: 1, usage: "Gerencia/Dirección" },
          { model: "Galaxy S25 Ultra", quantity: 1, usage: "Gerencia/Dirección" }
        ],
        totalStock: 131,
        pendingByDistributor: analytics?.stockAnalysis?.reduce((acc, stock) => {
          acc[stock.enterprise] = stock.shortage > 0 ? stock.shortage : 0;
          return acc;
        }, {} as Record<string, number>) || {
          "EDEA": 1, "EDELAP": 1, "EDESA": 1, "EDEN": 2, "EDES": 1, "DESA": 0
        },
        budgetEstimate: 47232
      };
      
      // Generate the PDF
      generateMobileDevicesReport(reportData);
    } catch (error) {
      console.error('Error generating stock report:', error);
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
      {/* Header */}

      <div className="max-w-7xl mx-auto py-4">
        {/* Filters Section */}
        <div className="bg-white  dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-8">
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

            {/* Search */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Busqueda
              </label>
              <div className="relative">
                <SearchSm className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar tickets..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  className="pl-10"
                />
              </div>
            </div> */}

            {/* Enterprises */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Distribuidoras
              </label>
              <Select label='Seleccionar distribuidoras' items={selectedEnterprises.join(',')} onValueChange={(value) => setSelectedEnterprises(value.split(',').filter(Boolean))}>
                
                
                  {filterOptions.enterprises.map((enterprise) => (
                    <Select.Item key={enterprise} value={enterprise}>
                      {enterprise}
                    </Select.Item>
                  ))}
                
              </Select>
            </div> */}

            {/* Filter Button */}
            <div className="flex  items-end justify-end gap-2 flex-grow">
              {/* <Button onClick={handleFilterChange} className="w-full">
                <FilterFunnel01 className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button> */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Enterprise Distribution Chart */}
            <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-surface shadow-sm p-4">
              <h3 className="text-lg font-semibold text-brand-muted dark:text-gray-100 mb-4">
                Distribución por Distribuidoras
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={enterpriseChartData}>
                  <CartesianGrid strokeDasharray="4 6" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="#1e444d" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Demand Trends Chart */}
            <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-surface shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Evolución de Demanda
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={demandTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="4 6" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--surface-1)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <Bar dataKey="demanda" name="Demanda Total">
                    {demandTrendsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.type === 'pasada' ? '#83989d' : 
                        entry.type === 'actual' ? '#1e444d' : 
                        '#aab8bb'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-center mt-4 space-x-6 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-300">Período Anterior</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#1e444d' }}></div>
                  <span className="text-gray-600 dark:text-gray-300">Período Actual</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#aab8bb' }}></div>
                  <span className="text-gray-600 dark:text-gray-300">Proyección</span>
                </div>
              </div>
            </div>

            {/* Time Series Chart */}
            <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-surface shadow-sm p-4 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Tendencia Temporal
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#83989d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Demand Projections Table */}
        {analytics?.demandProjections && (
          <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-surface shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Proyecciones de Demanda
            </h3>
            <div className="overflow-x-auto rounded-md border border-surface">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-surface-1">
                <thead className="bg-gray-50 border-surface dark:bg-surface-2 rounded-t-lg">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Distribuidora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Demanda Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Proyectada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Crecimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Confianza
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Recomendaciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-surface dark:divide-gray-700">
                  {analytics.demandProjections.map((projection, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {projection.enterprise}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {projection.currentDemand}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {projection.projectedDemand}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          projection.growthRate >= 0 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {projection.growthRate >= 0 ? '+' : ''}{projection.growthRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge color={
                          projection.confidence === 'high' ? 'success' :
                          projection.confidence === 'medium' ? 'blue-light' : 'brand'
                        }>
                          {projection.confidence}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        <ul className="text-xs space-y-1">
                          {projection.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i} className="truncate max-w-xs">{rec}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stock Analysis Table */}
        {analytics?.stockAnalysis && (
          <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Análisis de Stock
            </h3>
            <div className="overflow-x-auto rounded-md border border-surface">
              <table className="min-w-full rounded divide-y divide-gray-200 dark:divide-surface">
                <thead className="bg-gray-50 border-b border-surface dark:bg-surface-2">
                  <tr className=''>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b-0">
                      Distribuidora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Stock Requerido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Stock Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Faltante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Prioridad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones Sugeridas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {analytics.stockAnalysis.map((analysis, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {analysis.enterprise}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {analysis.requiredStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {analysis.currentStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {analysis.shortage > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            -{analysis.shortage}
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">
                             Suficiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge color={
                          analysis.priority === 'critical' ? 'error' :
                          analysis.priority === 'high' ? 'warning' :
                          analysis.priority === 'medium' ? 'brand' : 'success'
                        }>
                          {analysis.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        <ul className="text-xs space-y-1">
                          {analysis.suggestedActions.slice(0, 2).map((action, i) => (
                            <li key={i} className="truncate max-w-xs">{action}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Issues
        {analytics?.topIssues && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Issues M�s Frecuentes
            </h3>
            <div className="space-y-3">
              {analytics.topIssues.slice(0, 10).map((issue, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {issue.title}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {issue.count} tickets
                    </span>
                    <Badge color="blue-light">
                      {issue.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}

// Wrapper component to provide analytics data to MobileDevicesReport
function MobileDevicesReportWrapper() {
  const {
    analytics,
    isLoading,
    error,
    refresh,
    applyFilters
  } = useTelefonosTicketsData();

  const [filters, setFilters] = useState<TelefonosTicketsFilters>({});
  
  // Apply the same date range handling as the dashboard
  const handleDateRangeChange = async (dates: any) => {
    if (!dates || !dates.start || !dates.end) {
      return;
    }

    try {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando datos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
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

  return <MobileDevicesReport analytics={analytics} filters={filters} />;
}