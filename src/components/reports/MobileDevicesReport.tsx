"use client";

import React, { useState } from 'react';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
}

const MobileDevicesReport: React.FC<MobileDevicesReportProps> = ({ analytics, filters }) => {
  const reportData: ReportData = {
    reportDate: new Date().toLocaleString('es-AR', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires'
    }),
    period: filters?.dateRange ? 
      `${filters.dateRange.start} a ${filters.dateRange.end}` : 
      "junio-agosto 2025",
    distributorsData: analytics?.demandProjections?.map((proj: any) => ({
      distributor: proj.enterprise,
      pending: 0,
      assignments: Math.floor(proj.currentDemand * 0.2),
      replacements: Math.floor(proj.currentDemand * 0.8),
      total: proj.currentDemand
    })) || [
      { distributor: "DESA", pending: 0, assignments: 2, replacements: 3, total: 5 },
      { distributor: "EDES", pending: 0, assignments: 0, replacements: 5, total: 5 },
      { distributor: "EDELAP", pending: 0, assignments: 3, replacements: 7, total: 10 },
      { distributor: "EDEN", pending: 0, assignments: 2, replacements: 19, total: 21 },
      { distributor: "EDEA", pending: 0, assignments: 0, replacements: 14, total: 14 },
      { distributor: "EDESA", pending: 0, assignments: 5, replacements: 4, total: 9 }
    ],
    obsoleteDevices: analytics?.stockAnalysis?.reduce((sum: number, stock: any) => sum + (stock.shortage > 0 ? stock.shortage : 0), 0) || 26,
    analyzedDemand: analytics?.totalTickets || 64,
    projectedDemand: analytics?.demandProjections?.reduce((sum: number, proj: any) => sum + proj.projectedDemand, 0) || 56,
    stockData: [
      { model: "Samsung Galaxy A16", quantity: 117, usage: "Recambios convencionales" },
      { model: "Samsung Galaxy A36", quantity: 8, usage: "Supervisión y coordinación" },
      { model: "Samsung Galaxy A56", quantity: 4, usage: "Jefaturas de área" },
      { model: "Galaxy S25 Plus", quantity: 1, usage: "Gerencia/Dirección" },
      { model: "Galaxy S25 Ultra", quantity: 1, usage: "Alta dirección" }
    ],
    totalStock: 131,
    pendingByDistributor: analytics?.stockAnalysis?.reduce((acc: Record<string, number>, stock: any) => {
      acc[stock.enterprise] = stock.shortage > 0 ? stock.shortage : 0;
      return acc;
    }, {}) || {
      "EDEA": 1,
      "EDELAP": 1,
      "EDESA": 1,
      "EDEN": 2,
      "EDES": 1,
      "DESA": 0
    },
    budgetEstimate: ((analytics?.demandProjections?.reduce((sum: number, proj: any) => sum + proj.projectedDemand, 0) || 56) + 26) * 576
  };

  const handleGeneratePDF = () => {
    generateMobileDevicesReport(reportData);
  };

  const handleGenerateSamplePDF = () => {
    generateSampleReport();
  };

  const totalPending = Object.values(reportData.pendingByDistributor).reduce((sum, val) => sum + val, 0);
  const totalProjected = reportData.projectedDemand + reportData.obsoleteDevices;

  return (
    <div className="min-h-screen rounded-lg border border-surface bg-app dark:bg-app">
      {/* Header */}
      <div className="border-b rounded-t-lg bg-surface-1 dark:bg-surface-1 border-surface">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {/* <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">D</span>
                </div> */}
                <span className="font-bold text-xl">DESA</span>
              </div>
              <Badge color='brand' type="pill-color">{reportData.reportDate}</Badge>
            </div>
            <div className="flex space-x-2">
              <Button iconLeading={DownloadCloud01} onClick={handleGeneratePDF}>
                Exportar PDF
              </Button>
              <Button iconLeading={File01} onClick={handleGenerateSamplePDF} color="secondary">
                PDF Ejemplo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">INFORME DE DISPOSITIVOS MÓVILES</h1>
          <p className="text-muted-foreground text-lg mb-2">Proyección de Stock y Demanda</p>
          <p className="text-sm text-muted-foreground">Fecha de Reporte: {reportData.reportDate}</p>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Introducción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              Este informe tiene como objetivo estimar la cantidad de equipos celulares necesarios para cubrir 
              las necesidades operativas durante el período <span className="font-semibold">{reportData.period}</span>. 
              El análisis se basa en los datos recopilados por Mesa de Ayuda sobre los equipos entregados a las 
              distribuidoras (EDEN, EDEA, EDELAP, EDES y EDESA), incluyendo: asignaciones a nuevos usuarios, 
              recambios por robo, rotura, extravío u obsolescencia. Esta información permite establecer una 
              proyección para el próximo trimestre, basada en el comportamiento real del período analizado.
            </p>
          </CardContent>
        </Card>

        {/* Distributors Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Distribuidoras</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              A continuación, se presenta un resumen del comportamiento de consumo de equipos móviles por parte 
              de cada distribuidora durante el trimestre analizado. Se incluyen datos de:
            </p>
            <ul className="text-sm mb-6 space-y-1 ml-4">
              <li>• Solicitudes pendientes (resueltas o no según contexto)</li>
              <li>• Nuevas asignaciones</li>
              <li>• Recambios por obsolescencia, rotura, robo o extravío</li>
            </ul>

            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Distribuidora</Table.Head>
                  <Table.Head className="text-center">Pendientes</Table.Head>
                  <Table.Head className="text-center">Asignaciones</Table.Head>
                  <Table.Head className="text-center">Recambios</Table.Head>
                  <Table.Head className="text-center">Demanda Total</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {reportData.distributorsData.map((row) => (
                  <Table.Row key={row.distributor}>
                    <Table.Cell className="font-medium">{row.distributor}</Table.Cell>
                    <Table.Cell className="text-center">{row.pending}</Table.Cell>
                    <Table.Cell className="text-center">{row.assignments}</Table.Cell>
                    <Table.Cell className="text-center">{row.replacements}</Table.Cell>
                    <Table.Cell className="text-center font-medium">{row.total}</Table.Cell>
                  </Table.Row>
                ))}
                <Table.Row className="bg-surface-2 dark:bg-surface-2">
                  <Table.Cell className="font-bold">TOTAL</Table.Cell>
                  <Table.Cell className="text-center font-bold">
                    {reportData.distributorsData.reduce((sum, row) => sum + row.pending, 0)}
                  </Table.Cell>
                  <Table.Cell className="text-center font-bold">
                    {reportData.distributorsData.reduce((sum, row) => sum + row.assignments, 0)}
                  </Table.Cell>
                  <Table.Cell className="text-center font-bold">
                    {reportData.distributorsData.reduce((sum, row) => sum + row.replacements, 0)}
                  </Table.Cell>
                  <Table.Cell className="text-center font-bold">
                    {reportData.distributorsData.reduce((sum, row) => sum + row.total, 0)}
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>
          </CardContent>
        </Card>

        {/* Analysis Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Análisis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Teléfonos pendientes de recambio (solicitud y obsolescencia)</h3>
              <p className="text-sm">
                Actualmente, no se registran tickets pendientes activos. No obstante, en la base de datos de 
                SOTI MobiControl se identifican <span className="font-semibold">{reportData.obsoleteDevices}</span> dispositivos 
                que se encuentran por debajo del estándar vigente (Samsung Galaxy A16/A2X).
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Teléfonos reemplazados</h3>
              <p className="text-sm">
                Durante el trimestre {reportData.period}, se entregaron <span className="font-semibold">{reportData.analyzedDemand}</span> dispositivos 
                entre asignaciones nuevas y recambios.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conclusion Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Conclusión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              En el último trimestre ({reportData.period}), se entregaron {reportData.analyzedDemand} equipos celulares 
              (nuevos y recambios por robo, extravío, rotura u obsolescencia). La demanda se mantuvo estable.
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
                <li>• Demanda estimada: {reportData.projectedDemand} equipos (basado en tendencia)</li>
                <li>• Equipos obsoletos (SOTI): {reportData.obsoleteDevices} unidades</li>
                <li>• Total estimado: {reportData.projectedDemand} + {reportData.obsoleteDevices} = <span className="font-semibold">{totalProjected}</span> equipos</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Presupuesto:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Modelo: Samsung Galaxy A16 (U$S 576/unidad)</li>
                <li>• Costo total: {totalProjected} × U$S 576 = U$S <span className="font-semibold">{reportData.budgetEstimate.toLocaleString()}</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Current Stock Status */}
        {/* <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estado Actual de Stock de Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="mb-4">
              <Table.Header>
                <Table.Row>
                  <Table.Head>Modelo</Table.Head>
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
              El stock actual disponible se compone de {reportData.totalStock} dispositivos, de los cuales 117 unidades 
              del modelo Galaxy A16 están destinadas a cubrir la demanda operativa general. El resto corresponde a modelos 
              de gama media y alta, utilizados en situaciones específicas para jefaturas, coordinaciones o gerencias.
              Este nivel de stock permite responder tanto a la demanda proyectada como a los equipos obsoletos detectados. 
              En caso de un pico de demanda inesperado, se recomienda reforzar la reserva operativa con una compra 
              preventiva de al menos 30 unidades.
            </p>
          </CardContent>
        </Card> */}

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
              Presupuesto estimado: U$S <span className="font-semibold">{(totalPending * 576).toLocaleString()}</span>
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