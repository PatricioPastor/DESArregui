"use client";

import React, { useState, useEffect, useMemo } from 'react';
// Custom Card components since they don't exist in the library
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-surface-1 dark:bg-surface-1 border border-surface rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-surface ${className}`}>
    {children}
  </div>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-foreground ${className}`}>
    {children}
  </h3>
);

// Custom Table components
// Custom Separator component
const Separator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-full h-px border-t border-surface ${className}`} />
);

import { Badge } from '../base/badges/badges';
import { Button } from '../base/buttons/button';
import { DownloadCloud01, File01 } from '@untitledui/icons';
import { generateMobileDevicesReport, generateSampleReport } from '@/utils/pdf-generator';

import { Table } from '../application/table/table';

interface DistributorData {
  distributor: string;
  pending: number;
  assignments: number;
  replacements: number;
  total: number;
}

interface StockData {
  model: string;
  quantity: number;
  usage: string;
}

interface ReportData {
  reportDate: string;
  period: string;
  distributorsData: DistributorData[];
  obsoleteDevices: number;
  analyzedDemand: number;
  projectedDemand: number;
  stockData: StockData[];
  totalStock: number;
  pendingByDistributor: Record<string, number>;
  budgetEstimate: number;
}

interface MobileDevicesReportProps {
  analytics?: any;
  filters?: any;
  hasInheritedFilters?: boolean;
  serverProps?: {
    reportDate: string;
    initialPeriod: string;
    defaultEnterprises: string;
  };
}

// Stable date formatter that works consistently on server and client
function getStableReportDate(): string {
  // Use a stable format that doesn't depend on locale/timezone
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Stable number formatter
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Stable date range formatter
function formatDateRange(dateRange: { start: string; end: string } | undefined): string {
  if (!dateRange) return 'mayo - julio 2025';

  try {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    // Simple format that works consistently
    const startMonth = start.toISOString().slice(0, 7).replace('-', '/');
    const endMonth = end.toISOString().slice(0, 7).replace('-', '/');

    return startMonth === endMonth ? startMonth : `${startMonth} a ${endMonth}`;
  } catch {
    return 'mayo - julio 2025';
  }
}

interface StockRecord {
  modelo: string;
  imei: string;
  distribuidora: string;
  asignado_a: string;
  ticket: string;
  raw?: any;
}

interface StockAnalytics {
  totalStock: number;
  stockByModel: Record<string, number>;
  stockByDistributor: Record<string, number>;
  availableStock: number;
  assignedStock: number;
}

const MobileDevicesReport: React.FC<MobileDevicesReportProps> = ({ analytics, filters, hasInheritedFilters = false, serverProps }) => {
  const [stockData, setStockData] = useState<StockRecord[]>([]);
  const [stockAnalytics, setStockAnalytics] = useState<StockAnalytics | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Track mount status to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch stock data only after mount
  useEffect(() => {
    if (!isMounted) return;

    const fetchStockData = async () => {
      try {
        setIsLoadingStock(true);
        const response = await fetch('/api/stock');
        const result = await response.json();

        if (result.success && result.data) {
          setStockData(result.data);

          // Calculate stock analytics
          const stockByModel: Record<string, number> = {};
          const stockByDistributor: Record<string, number> = {};
          let availableStock = 0;
          let assignedStock = 0;

          result.data.forEach((item: StockRecord) => {
            // Count by model
            stockByModel[item.modelo] = (stockByModel[item.modelo] || 0) + 1;

            // Count by distributor (only assigned items)
            if (item.distribuidora && item.distribuidora !== '' && item.distribuidora !== 'SIN DESTINO') {
              stockByDistributor[item.distribuidora] = (stockByDistributor[item.distribuidora] || 0) + 1;
            }

            // Count available vs assigned
            if (item.asignado_a && item.asignado_a !== '') {
              assignedStock++;
            } else {
              availableStock++;
            }
          });

          setStockAnalytics({
            totalStock: result.data.length,
            stockByModel,
            stockByDistributor,
            availableStock,
            assignedStock
          });
        }
      } catch (error) {
        console.error('Error fetching stock data:', error);
      } finally {
        setIsLoadingStock(false);
      }
    };

    fetchStockData();
  }, [isMounted]);

  // Generate dynamic period text based on filters - memoized for stability
  const periodText = useMemo(() => formatDateRange(filters?.dateRange), [filters?.dateRange]);

  // Generate dynamic enterprise text based on filters - memoized for stability
  const enterpriseText = useMemo(() => {
    if (filters?.enterprise && filters.enterprise.length > 0) {
      if (filters.enterprise.length === 1) {
        return `la distribuidora ${filters.enterprise[0]}`;
      }
      return `las distribuidoras ${filters.enterprise.join(', ')}`;
    }
    return "las distribuidoras (EDEN, EDEA, EDELAP, EDES y EDESA)";
  }, [filters?.enterprise]);

  // Calculate net demand (demand - available stock)
  const calculateNetDemand = (demand: number, model: string = 'Galaxy A16') => {
    const availableStockForModel = stockAnalytics?.stockByModel[model] || 0;
    return Math.max(0, demand - availableStockForModel);
  };

  // Calculate filtered demand based on current analytics (already filtered by dashboard)
  const calculateFilteredDemand = () => {
    console.log(analytics)
    return analytics?.totalTickets || 47; // Default to 47 if no analytics
  };

  // Calculate projected demand based on filtered data
  const calculateProjectedDemand = () => {
  const currentDemand = calculateFilteredDemand();
  const totalFromAnalytics = analytics?.demandProjections?.reduce(
    (sum: number, proj: any) => sum + proj.currentDemand,
    0
  ) || currentDemand;

  // Factor de escala: de 289 → 47
  const scale = totalFromAnalytics > 0 ? currentDemand / totalFromAnalytics : 1;

  if (analytics?.demandProjections?.length > 0) {
    return analytics.demandProjections.reduce(
      (sum: number, proj: any) => sum + Math.round(proj.projectedDemand * scale),
      0
    );
  }

  // fallback si no hay proyecciones
  return Math.round(currentDemand * 0.9);
};

  // Memoize report data to prevent recalculation and ensure stability
  // Use server props for stable initial data if available
 const reportData: ReportData = useMemo(() => {
  const filteredDemand = calculateFilteredDemand();

  // total sin filtrar (suma de analytics)
  const totalFromAnalytics = analytics?.demandProjections?.reduce(
    (sum: number, proj: any) => sum + proj.currentDemand,
    0
  ) || filteredDemand;

  // factor de escala: lleva 289 → 47 (en tu ejemplo)
  const scale = totalFromAnalytics > 0 ? filteredDemand / totalFromAnalytics : 1;

  // proyección escalada
  const projectedDemand = analytics?.demandProjections?.length
    ? analytics.demandProjections.reduce(
        (sum: number, proj: any) => sum + Math.round(proj.projectedDemand * scale),
        0
      )
    : Math.round(filteredDemand * 0.9);

  return {
    reportDate: serverProps?.reportDate || getStableReportDate(),
    period: periodText,
    distributorsData: analytics?.demandProjections?.map((proj: any) => {
      const scaledDemand = Math.round(proj.currentDemand * scale);
      return {
        distributor: proj.enterprise,
        pending: 0,
        assignments: Math.floor(scaledDemand * 0.2),
        replacements: Math.floor(scaledDemand * 0.8),
        total: scaledDemand,
      };
    }) || [
      { distributor: "DESA", pending: 0, assignments: 2, replacements: 3, total: 5 },
      { distributor: "EDES", pending: 0, assignments: 0, replacements: 5, total: 5 },
      { distributor: "EDELAP", pending: 0, assignments: 3, replacements: 7, total: 10 },
      { distributor: "EDEN", pending: 0, assignments: 2, replacements: 19, total: 21 },
      { distributor: "EDEA", pending: 0, assignments: 0, replacements: 14, total: 14 },
      { distributor: "EDESA", pending: 0, assignments: 5, replacements: 4, total: 9 }
    ],
    obsoleteDevices: analytics?.stockAnalysis?.reduce(
      (sum: number, stock: any) => sum + (stock.shortage > 0 ? stock.shortage : 0),
      0
    ) || 26,
    analyzedDemand: filteredDemand,          // ahora sí es el filtrado (47)
    projectedDemand: projectedDemand,        // proyección escalada
    stockData: stockAnalytics
      ? Object.entries(stockAnalytics.stockByModel).map(([model, quantity]) => ({
          model,
          quantity,
          usage: model.includes('A16')
            ? 'Recambios convencionales'
            : model.includes('A36')
            ? 'Supervisión y coordinación'
            : model.includes('A56')
            ? 'Jefaturas de área'
            : model.includes('S25 Plus')
            ? 'Gerencia/Dirección'
            : model.includes('S25 Ultra')
            ? 'Alta dirección'
            : 'Uso general',
        }))
      : [
          { model: "Samsung Galaxy A16", quantity: 117, usage: "Recambios convencionales" },
          { model: "Samsung Galaxy A36", quantity: 8, usage: "Supervisión y coordinación" },
          { model: "Samsung Galaxy A56", quantity: 4, usage: "Jefaturas de área" },
          { model: "Galaxy S25 Plus", quantity: 1, usage: "Gerencia/Dirección" },
          { model: "Galaxy S25 Ultra", quantity: 1, usage: "Alta dirección" },
        ],
    totalStock: stockAnalytics?.totalStock || 131,
    pendingByDistributor:
      analytics?.stockAnalysis?.reduce((acc: Record<string, number>, stock: any) => {
        acc[stock.enterprise] = stock.shortage > 0 ? stock.shortage : 0;
        return acc;
      }, {}) || {
        EDEA: 1,
        EDELAP: 1,
        EDESA: 1,
        EDEN: 2,
        EDES: 1,
        DESA: 0,
      },
    budgetEstimate:
      (projectedDemand +
        (analytics?.stockAnalysis?.reduce(
          (sum: number, stock: any) => sum + (stock.shortage > 0 ? stock.shortage : 0),
          0
        ) || 26)) *
      576,
  };
}, [analytics, stockAnalytics, periodText, serverProps?.reportDate]);


  const handleGeneratePDF = () => {
    generateMobileDevicesReport(reportData);
  };

  const handleGenerateSamplePDF = () => {
    generateSampleReport();
  };

  const totalPending = Object.values(reportData.pendingByDistributor).reduce((sum, val) => sum + val, 0);
  const totalProjected = reportData.projectedDemand + reportData.obsoleteDevices;
  const netDemand = calculateNetDemand(totalProjected);
  const availableA16Stock = stockAnalytics?.stockByModel['Galaxy A16'] || 117;

  // Debug logging to help track the values
  console.log('🔍 Report Debug - Full Analytics:', {
    '📊 Calculated Values': {
      filteredDemand: reportData.analyzedDemand,
      projectedDemand: reportData.projectedDemand,
      netDemand: netDemand,
      totalProjected: totalProjected
    },
    '🎯 Analytics Data': {
      totalTicketsFromAnalytics: analytics?.totalTickets,
      demandProjectionsCount: analytics?.demandProjections?.length || 0,
      demandProjectionsTotal: analytics?.demandProjections?.reduce((sum: number, proj: any) => sum + proj.currentDemand, 0) || 0
    },
    '🔧 Filters Applied': {
      hasDateFilter: !!filters?.dateRange,
      hasEnterpriseFilter: !!filters?.enterprise?.length,
      period: periodText,
      enterprises: filters?.enterprise
    },
    '📈 Distributors Data': reportData.distributorsData,
    '📦 Stock Info': {
      totalStock: stockAnalytics?.totalStock,
      availableA16: availableA16Stock
    }
  });

  return (
    <div className="min-h-screen rounded-lg border border-surface bg-app dark:bg-app">
      {/* Header */}
      <div className="border-b rounded-t-lg bg-surface-1 dark:bg-surface-1 border-surface">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">D</span>
                </div>
                <span className="font-bold text-2xl text-foreground">DESA</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge color='brand' type="pill-color">{reportData.reportDate}</Badge>
                {hasInheritedFilters && (
                  <Badge color='orange' type="pill-color">Filtros aplicados</Badge>
                )}
                {isLoadingStock && (
                  <Badge color='gray' type="pill-color">Cargando stock...</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button iconLeading={DownloadCloud01} onClick={handleGeneratePDF} size="sm">
                Exportar PDF
              </Button>
              <Button iconLeading={File01} onClick={handleGenerateSamplePDF} color="secondary" size="sm">
                PDF Ejemplo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground tracking-tight">
            INFORME DE DISPOSITIVOS MÓVILES
          </h1>
          <p className="text-muted-foreground text-xl md:text-2xl mb-3 font-medium">
            Proyección de Stock y Demanda
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Fecha de Reporte: {reportData.reportDate}</span>
            {filters?.dateRange && (
              <>
                <span className="hidden sm:inline">•</span>
                <span>Período: {reportData.period}</span>
              </>
            )}
          </div>
        </div>

        {/* Introduction */}
        <Card className="mb-8 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardTitle className="text-xl font-semibold text-foreground">Introducción</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-base leading-relaxed mb-4">
                Este informe tiene como objetivo estimar la cantidad de equipos celulares necesarios para cubrir
                las necesidades operativas durante el período <span className="font-semibold text-primary">{reportData.period}</span>.
              </p>
              <p className="text-base leading-relaxed">
                El análisis se basa en los datos recopilados por Mesa de Ayuda sobre los equipos entregados a {enterpriseText},
                incluyendo asignaciones a nuevos usuarios, recambios por robo, rotura, extravío u obsolescencia.
                Esta información permite establecer una proyección para el próximo trimestre, basada en el comportamiento
                real del período analizado {hasInheritedFilters ? 'con filtros específicos aplicados' : ''}.
              </p>

              {isMounted && stockAnalytics && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Stock Disponible Actual</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">Total en inventario:</span>
                      <span className="ml-2 font-semibold">{stockAnalytics.totalStock} dispositivos</span>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">Disponibles:</span>
                      <span className="ml-2 font-semibold">{stockAnalytics.availableStock} dispositivos</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distributors Section */}
        <Card className="mb-8 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardTitle className="text-xl font-semibold text-foreground">Distribuidoras</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
              <p className="text-base leading-relaxed mb-4">
                A continuación, se presenta un resumen del comportamiento de consumo de equipos móviles
                {filters?.enterprise ?
                  ` para ${filters.enterprise.length === 1 ? 'la distribuidora seleccionada' : 'las distribuidoras seleccionadas'}` :
                  ' por parte de cada distribuidora'
                } durante el período analizado.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="text-orange-700 dark:text-orange-300 text-sm font-medium">Solicitudes pendientes</div>
                  <div className="text-orange-600 dark:text-orange-400 text-xs">Resueltas o no según contexto</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-blue-700 dark:text-blue-300 text-sm font-medium">Nuevas asignaciones</div>
                  <div className="text-blue-600 dark:text-blue-400 text-xs">Personal nuevo o cambios</div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-red-700 dark:text-red-300 text-sm font-medium">Recambios</div>
                  <div className="text-red-600 dark:text-red-400 text-xs">Obsolescencia, rotura, robo o extravío</div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <Table.Header>
                  <Table.Row className="bg-gray-50 dark:bg-gray-900">
                    <Table.Head isRowHeader className="font-semibold">Distribuidora</Table.Head>
                    <Table.Head className="text-center font-semibold">Pendientes</Table.Head>
                    <Table.Head className="text-center font-semibold">Asignaciones</Table.Head>
                    <Table.Head className="text-center font-semibold">Recambios</Table.Head>
                    <Table.Head className="text-center font-semibold">Demanda Total</Table.Head>
                    {isMounted && stockAnalytics && <Table.Head className="text-center font-semibold">Stock Actual</Table.Head>}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {reportData.distributorsData.map((row) => {
                    const currentStock = stockAnalytics?.stockByDistributor[row.distributor] || 0;
                    const netDemandForDistributor = Math.max(0, row.total - currentStock);

                    return (
                      <Table.Row key={row.distributor} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <Table.Cell className="font-medium">{row.distributor}</Table.Cell>
                        <Table.Cell className="text-center">
                          <span className={row.pending > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
                            {row.pending}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          <span className={row.assignments > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>
                            {row.assignments}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          <span className={row.replacements > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                            {row.replacements}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-center font-semibold">{row.total}</Table.Cell>
                        {isMounted && stockAnalytics && (
                          <Table.Cell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-medium">{currentStock}</span>
                              {netDemandForDistributor > 0 && (
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  Neto: {netDemandForDistributor}
                                </span>
                              )}
                            </div>
                          </Table.Cell>
                        )}
                      </Table.Row>
                    );
                  })}
                  <Table.Row className="bg-primary/10 dark:bg-primary/20 border-t-2 border-primary/20">
                    <Table.Cell className="font-bold text-primary">TOTAL</Table.Cell>
                    <Table.Cell className="text-center font-bold text-primary">
                      {reportData.distributorsData.reduce((sum, row) => sum + row.pending, 0)}
                    </Table.Cell>
                    <Table.Cell className="text-center font-bold text-primary">
                      {reportData.distributorsData.reduce((sum, row) => sum + row.assignments, 0)}
                    </Table.Cell>
                    <Table.Cell className="text-center font-bold text-primary">
                      {reportData.distributorsData.reduce((sum, row) => sum + row.replacements, 0)}
                    </Table.Cell>
                    <Table.Cell className="text-center font-bold text-primary">
                      {reportData.distributorsData.reduce((sum, row) => sum + row.total, 0)}
                    </Table.Cell>
                    {isMounted && stockAnalytics && (
                      <Table.Cell className="text-center font-bold text-primary">
                        {Object.values(stockAnalytics.stockByDistributor).reduce((sum, val) => sum + val, 0)}
                      </Table.Cell>
                    )}
                  </Table.Row>
                </Table.Body>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Section */}
        <Card className="mb-8 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardTitle className="text-xl font-semibold text-foreground">Análisis</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <h3 className="font-semibold mb-3 text-orange-800 dark:text-orange-200 flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Dispositivos Pendientes de Recambio
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed">
                    Actualmente, no se registran tickets pendientes activos. No obstante, en la base de datos de
                    SOTI MobiControl se identifican <span className="font-bold bg-orange-200 dark:bg-orange-900 px-2 py-1 rounded">
                    {reportData.obsoleteDevices}</span> dispositivos que se encuentran por debajo del estándar vigente.
                  </p>
                  {isMounted && stockAnalytics && (
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded border border-orange-300 dark:border-orange-700">
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        <strong>Stock disponible:</strong> {availableA16Stock} Galaxy A16 para recambios inmediatos
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-200 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Dispositivos Entregados
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    Durante el período <span className="font-semibold">{reportData.period}</span>, se entregaron
                    <span className="font-bold bg-blue-200 dark:bg-blue-900 px-2 py-1 rounded ml-1">
                    {reportData.analyzedDemand}</span> dispositivos entre asignaciones nuevas y recambios
                    {filters?.enterprise ? ` para ${enterpriseText}` : ''}.
                  </p>
                  {isMounted && stockAnalytics && netDemand > 0 && (
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded border border-red-300 dark:border-red-700">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        <strong>Demanda neta estimada:</strong> {netDemand} dispositivos (después de descontar stock disponible)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isMounted && stockAnalytics && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold mb-4 text-green-800 dark:text-green-200">Resumen de Stock Actual</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stockAnalytics.totalStock}</div>
                    <div className="text-sm text-muted-foreground">Total en inventario</div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stockAnalytics.availableStock}</div>
                    <div className="text-sm text-muted-foreground">Disponibles</div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stockAnalytics.assignedStock}</div>
                    <div className="text-sm text-muted-foreground">Asignados</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conclusion Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Conclusión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base leading-relaxed mb-4">
              En el período <span className="font-semibold text-primary">{reportData.period}</span>, se entregaron
              <span className="font-bold text-lg text-primary">{reportData.analyzedDemand}</span> equipos celulares
              (nuevos y recambios por robo, extravío, rotura u obsolescencia){filters?.enterprise ? ` para ${enterpriseText}` : ''}.
              {isMounted && netDemand > 0 ?
                ` Considerando el stock actual, la demanda neta es de ${netDemand} dispositivos.` :
                isMounted ? ' El stock actual es suficiente para cubrir la demanda proyectada.' : ''
              }
            </p>

            <div>
              <h4 className="font-semibold text-sm mb-2">Distribución de entregas:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Nuevos ingresos: 20 unidades</li>
                <li>• Rotura: 15 unidades</li>
                <li>• Robo/extravío: 10 unidades</li>
                <li>• Obsolescencia: 19 unidades</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Proyección Próximo Trimestre:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Demanda estimada: <span className="font-semibold">{reportData.projectedDemand}</span> equipos (basado en tendencia)</li>
                <li>• Equipos obsoletos (SOTI): <span className="font-semibold">{reportData.obsoleteDevices}</span> unidades</li>
                <li>• Total bruto estimado: {reportData.projectedDemand} + {reportData.obsoleteDevices} = <span className="font-semibold">{totalProjected}</span> equipos</li>
                {isMounted && stockAnalytics && (
                  <li>• Stock disponible A16: <span className="font-semibold text-green-600">{availableA16Stock}</span> unidades</li>
                )}
                {isMounted && netDemand > 0 && (
                  <li>• <strong className="text-red-600 dark:text-red-400">Demanda neta: {netDemand} equipos</strong> (después de descontar stock)</li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Presupuesto:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Modelo: Samsung Galaxy A16 (U$S 576/unidad)</li>
                <li>• Costo bruto: {totalProjected} × U$S 576 = U$S <span className="font-semibold">{formatNumber(reportData.budgetEstimate)}</span></li>
                {isMounted && netDemand > 0 && (
                  <li>• <strong className="text-green-600 dark:text-green-400">Costo neto: {netDemand} × U$S 576 = U$S {formatNumber(netDemand * 576)}</strong></li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Current Stock Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estado Actual de Stock de Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="mb-4">
              <Table.Header>
                <Table.Row>
                  <Table.Head isRowHeader >Modelo</Table.Head>
                  <Table.Head className="text-center">Cantidad Disponible</Table.Head>
                  <Table.Head>Uso Habitual</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {reportData.stockData.map((row, index) => (
                  <Table.Row key={index}>
                    <Table.Cell className="font-medium">{row.model}</Table.Cell>
                    <Table.Cell className="text-center">{row.quantity}</Table.Cell>
                    <Table.Cell className="text-sm">{row.usage}</Table.Cell>
                  </Table.Row>
                ))}
                <Table.Row className="bg-surface-2 dark:bg-surface-2">
                  <Table.Cell className="font-bold">TOTAL</Table.Cell>
                  <Table.Cell className="text-center font-bold">{reportData.totalStock}</Table.Cell>
                  <Table.Cell></Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>

            <p className="text-sm">
              El stock actual disponible se compone de {reportData.totalStock} dispositivos, de los cuales {availableA16Stock} unidades
              del modelo Galaxy A16 están destinadas a cubrir la demanda operativa general. El resto corresponde a modelos
              de gama media y alta, utilizados en situaciones específicas para jefaturas, coordinaciones o gerencias.
              Este nivel de stock permite responder tanto a la demanda proyectada como a los equipos obsoletos detectados.
              En caso de un pico de demanda inesperado, se recomienda reforzar la reserva operativa con una compra
              preventiva de al menos 30 unidades.
            </p>
          </CardContent>
        </Card>

        {/* Minimum and Urgent Scenario */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Escenario Mínimo y Urgente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              En caso de que se priorice solo cubrir lo ya solicitado a través de tickets aprobados,
              la demanda mínima a cubrir es de <span className="font-semibold">{totalPending}</span> dispositivos.
            </p>

            <div>
              <p className="text-sm mb-2">Este escenario contempla únicamente los reemplazos ya solicitados:</p>
              <ul className="text-sm space-y-1 ml-4">
                {Object.entries(reportData.pendingByDistributor).map(([dist, count]) => (
                  <li key={dist}>• {dist}: {count}</li>
                ))}
              </ul>
            </div>

            <p className="text-sm">
              Presupuesto estimado: U$S <span className="font-semibold">{formatNumber(totalPending * 576)}</span>
            </p>

            <Separator />

            <div>
              <h4 className="font-semibold text-sm mb-2">Adquisición de Accesorios</h4>
              <p className="text-sm mb-2">Para acompañar los dispositivos mencionados anteriormente:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• 50 vidrios templados para Galaxy A25</li>
                <li>• 50 fundas para Galaxy A25</li>
                <li>• 30 cabezales de cargador tipo C</li>
              </ul>
              <p className="text-sm mt-2">Presupuesto estimado para accesorios: U$S <span className="font-semibold">1,500</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Medium/High Range Projection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Proyección de Gama Media / Alta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              En paralelo al recambio convencional, se prevé la necesidad de reemplazar o asignar nuevos equipos
              para personal de supervisión, gerencia o dirección.
            </p>

            <div>
              <p className="text-sm mb-2">Se estima el siguiente requerimiento:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Galaxy A35: 5 unidades</li>
                <li>• Galaxy A55: 3 unidades</li>
                <li>• Galaxy S25+: 2 unidades</li>
              </ul>
            </div>

            <p className="text-sm">
              Presupuesto estimado: U$S <span className="font-semibold">5,760</span> (Incluye equipos y accesorios correspondientes)
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-surface">
          <p className="text-sm text-muted-foreground mb-2">www.desa.com.ar</p>
          <div className="flex justify-center space-x-4">
            <span className="text-xs text-muted-foreground">f</span>
            <span className="text-xs text-muted-foreground">@</span>
            <span className="text-xs text-muted-foreground">x</span>
            <span className="text-xs text-muted-foreground">in</span>
            <span className="text-xs text-muted-foreground">WhatsApp</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDevicesReport;