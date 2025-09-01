import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { 
  TelefonosTicketsAnalytics, 
  DemandProjection, 
  StockAnalysis,
  TelefonosTicketsFilters 
} from '@/lib/types';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#0088FE',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0088FE',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    marginTop: 20,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
  },
  table: {
    display: 'flex',
    width: 'auto',
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    padding: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tableCell: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 10,
  },
  tableHeaderCell: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
    fontSize: 10,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bullet: {
    width: 10,
    fontSize: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
  },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 9,
    fontWeight: 'bold',
  },
  criticalBadge: {
    backgroundColor: '#fecaca',
    color: '#dc2626',
  },
  highBadge: {
    backgroundColor: '#fed7aa',
    color: '#ea580c',
  },
  mediumBadge: {
    backgroundColor: '#fde68a',
    color: '#d97706',
  },
  lowBadge: {
    backgroundColor: '#d1fae5',
    color: '#059669',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 9,
    color: '#6b7280',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 9,
    bottom: 15,
    right: 30,
    color: '#6b7280',
  },
  summaryBox: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 15,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginBottom: 15,
  },
  criticalBox: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    marginBottom: 15,
  },
});

interface DemandReportProps {
  analytics: TelefonosTicketsAnalytics;
  filters?: TelefonosTicketsFilters;
}

export function DemandAnalysisReport({ analytics, filters }: DemandReportProps) {
  const reportDate = format(new Date(), 'dd \'de\' MMMM \'de\' yyyy', { locale: es });
  const filterSummary = filters ? getFilterSummary(filters) : 'Todos los datos';
  
  const totalProjectedDemand = analytics.demandProjections.reduce((sum, proj) => sum + proj.projectedDemand, 0);
  const totalCurrentDemand = analytics.demandProjections.reduce((sum, proj) => sum + proj.currentDemand, 0);
  const growthRate = totalCurrentDemand > 0 ? ((totalProjectedDemand - totalCurrentDemand) / totalCurrentDemand * 100) : 0;

  return (
    <Document>
      {/* Page 1: Executive Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>DESA</Text>
          <Text style={{ fontSize: 10, color: '#6b7280' }}>{reportDate}</Text>
        </View>
        
        <Text style={styles.title}>Reporte de Análisis de Demanda</Text>
        <Text style={styles.subtitle}>Dispositivos Móviles - TELEFONOS_TICKETS</Text>
        
        <View style={styles.summaryBox}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Resumen Ejecutivo</Text>
          <Text style={styles.paragraph}>
            Este informe analiza la demanda de dispositivos móviles basado en {analytics.totalTickets} tickets 
            procesados durante el período {filterSummary}.
          </Text>
          <Text style={styles.paragraph}>
            La proyección indica una demanda total de {totalProjectedDemand} dispositivos para el próximo trimestre, 
            representando un {growthRate >= 0 ? 'crecimiento' : 'decrecimiento'} del {Math.abs(growthRate).toFixed(1)}% 
            respecto al período actual.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Métricas Principales</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Métrica</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Valor Actual</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Proyectado</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '40%' }]}>Total de Tickets</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>{analytics.totalTickets}</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>-</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '40%' }]}>Demanda Total</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>{totalCurrentDemand}</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>{totalProjectedDemand}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '40%' }]}>Distribuidoras Activas</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>{Object.keys(analytics.byEnterprise).length}</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>-</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Distribución por Distribuidoras</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Distribuidora</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Tickets</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>% del Total</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Tendencia</Text>
          </View>
          {Object.entries(analytics.byEnterprise).map(([enterprise, count]) => {
            const percentage = ((count / analytics.totalTickets) * 100).toFixed(1);
            const projection = analytics.demandProjections.find(p => p.enterprise === enterprise);
            return (
              <View style={styles.tableRow} key={enterprise}>
                <Text style={[styles.tableCell, { width: '30%' }]}>{enterprise}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{count}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{percentage}%</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>
                  {projection ? `${projection.growthRate >= 0 ? '+' : ''}${projection.growthRate}%` : 'N/A'}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>
          Grupo DESA - Reporte generado automáticamente • www.desa.com.ar
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} />
      </Page>

      {/* Page 2: Demand Projections Detail */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>DESA</Text>
          <Text style={{ fontSize: 10, color: '#6b7280' }}>{reportDate}</Text>
        </View>

        <Text style={styles.title}>Proyecciones Detalladas por Distribuidora</Text>
        
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Distribuidora</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Actual</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Proyectado</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Crecimiento</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Confianza</Text>
            <Text style={[styles.tableHeaderCell, { width: '28%' }]}>Principales Recomendaciones</Text>
          </View>
          {analytics.demandProjections.map((projection, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={[styles.tableCell, { width: '18%' }]}>{projection.enterprise}</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{projection.currentDemand}</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{projection.projectedDemand}</Text>
              <Text style={[styles.tableCell, { width: '12%' }]}>
                {projection.growthRate >= 0 ? '+' : ''}{projection.growthRate}%
              </Text>
              <Text style={[styles.tableCell, { width: '12%' }]}>
                {projection.confidence === 'high' ? 'Alta' : 
                 projection.confidence === 'medium' ? 'Media' : 'Baja'}
              </Text>
              <Text style={[styles.tableCell, { width: '28%' }]}>
                {projection.recommendations.slice(0, 2).join('; ')}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Análisis por Tipo de Issue</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Tipo de Issue</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Cantidad</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>% del Total</Text>
          </View>
          {Object.entries(analytics.byIssueType).map(([issueType, count]) => (
            <View style={styles.tableRow} key={issueType}>
              <Text style={[styles.tableCell, { width: '50%' }]}>{issueType}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{count}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>
                {((count / analytics.totalTickets) * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Issues Más Frecuentes</Text>
        {analytics.topIssues.slice(0, 8).map((issue, index) => (
          <View style={styles.bulletPoint} key={index}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              {issue.title} ({issue.count} tickets - {issue.percentage}%)
            </Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Grupo DESA - Reporte generado automáticamente • www.desa.com.ar
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} />
      </Page>

      {/* Page 3: Recommendations and Action Plan */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>DESA</Text>
          <Text style={{ fontSize: 10, color: '#6b7280' }}>{reportDate}</Text>
        </View>

        <Text style={styles.title}>Recomendaciones y Plan de Acción</Text>

        <Text style={styles.sectionTitle}>Recomendaciones por Distribuidora</Text>
        {analytics.demandProjections.map((projection, index) => (
          <View key={index} style={{ marginBottom: 15 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
              {projection.enterprise} (Confianza: {
                projection.confidence === 'high' ? 'Alta' : 
                projection.confidence === 'medium' ? 'Media' : 'Baja'
              })
            </Text>
            {projection.recommendations.map((rec, recIndex) => (
              <View style={styles.bulletPoint} key={recIndex}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{rec}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.sectionTitle}>Acciones Prioritarias</Text>
        {analytics.demandProjections
          .filter(p => p.growthRate > 20 || p.projectedDemand > 50)
          .length > 0 && (
          <View style={styles.criticalBox}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5, color: '#dc2626' }}>
              ATENCIÓN: Distribuidoras con alto crecimiento proyectado
            </Text>
            {analytics.demandProjections
              .filter(p => p.growthRate > 20 || p.projectedDemand > 50)
              .map((projection, index) => (
                <Text key={index} style={{ fontSize: 10, marginBottom: 3 }}>
                  • {projection.enterprise}: {projection.projectedDemand} unidades proyectadas 
                  ({projection.growthRate >= 0 ? '+' : ''}{projection.growthRate}% crecimiento)
                </Text>
              ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Cronograma Sugerido</Text>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Inmediato (1-2 semanas):</Text> Revisar proyecciones con alta confianza 
            y preparar órdenes de compra para distribuidoras críticas.
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Corto plazo (1 mes):</Text> Implementar monitoreo automático 
            de tendencias y configurar alertas tempranas.
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Mediano plazo (3 meses):</Text> Evaluar efectividad de las 
            proyecciones y ajustar modelos predictivos.
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Resumen de Inversión Estimada</Text>
          <Text>• Demanda total proyectada: {totalProjectedDemand} dispositivos</Text>
          <Text>• Costo estimado (Galaxy A16 @ USD 576): USD {(totalProjectedDemand * 576).toLocaleString()}</Text>
          <Text>• Variación respecto período actual: {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%</Text>
        </View>

        <Text style={styles.footer}>
          Grupo DESA - Reporte generado automáticamente • www.desa.com.ar
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} />
      </Page>
    </Document>
  );
}

interface StockReportProps {
  analytics: TelefonosTicketsAnalytics;
  filters?: TelefonosTicketsFilters;
}

export function StockAnalysisReport({ analytics, filters }: StockReportProps) {
  const reportDate = format(new Date(), 'dd \'de\' MMMM \'de\' yyyy', { locale: es });
  const filterSummary = filters ? getFilterSummary(filters) : 'Todos los datos';
  
  const criticalShortages = analytics.stockAnalysis.filter(s => s.priority === 'critical');
  const highPriorityShortages = analytics.stockAnalysis.filter(s => s.priority === 'high');
  const totalShortage = analytics.stockAnalysis.reduce((sum, s) => sum + s.shortage, 0);

  return (
    <Document>
      {/* Page 1: Stock Overview */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>DESA</Text>
          <Text style={{ fontSize: 10, color: '#6b7280' }}>{reportDate}</Text>
        </View>
        
        <Text style={styles.title}>Análisis de Stock de Dispositivos</Text>
        <Text style={styles.subtitle}>Reporte de Faltantes y Recomendaciones</Text>
        
        <View style={styles.summaryBox}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Estado General del Stock</Text>
          <Text style={styles.paragraph}>
            Análisis basado en {analytics.totalTickets} tickets del período {filterSummary}.
            Se identificaron faltantes totales de {totalShortage} dispositivos distribuidos 
            entre {analytics.stockAnalysis.length} distribuidoras.
          </Text>
        </View>

        {criticalShortages.length > 0 && (
          <View style={styles.criticalBox}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5, color: '#dc2626' }}>
              CRÍTICO: {criticalShortages.length} distribuidora(s) con stock crítico
            </Text>
            {criticalShortages.map((shortage, index) => (
              <Text key={index} style={{ fontSize: 10, marginBottom: 2 }}>
                • {shortage.enterprise}: Faltante de {shortage.shortage} unidades
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Análisis Detallado por Distribuidora</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Distribuidora</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Requerido</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Actual</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Faltante</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Prioridad</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Estado</Text>
          </View>
          {analytics.stockAnalysis.map((analysis, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={[styles.tableCell, { width: '20%' }]}>{analysis.enterprise}</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{analysis.requiredStock}</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{analysis.currentStock}</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>
                {analysis.shortage > 0 ? analysis.shortage : 0}
              </Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>
                {analysis.priority === 'critical' ? 'CRÍTICA' :
                 analysis.priority === 'high' ? 'ALTA' :
                 analysis.priority === 'medium' ? 'MEDIA' : 'BAJA'}
              </Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>
                {analysis.shortage > 0 ? 'DÉFICIT' : 'SUFICIENTE'}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Resumen Financiero</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Concepto</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Unidades</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Costo (USD)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '40%' }]}>Total faltantes</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>{totalShortage}</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>
              {(totalShortage * 576).toLocaleString()}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '40%' }]}>Críticos + Altos</Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>
              {criticalShortages.concat(highPriorityShortages)
                .reduce((sum, s) => sum + s.shortage, 0)}
            </Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>
              {(criticalShortages.concat(highPriorityShortages)
                .reduce((sum, s) => sum + s.shortage, 0) * 576).toLocaleString()}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Grupo DESA - Reporte generado automáticamente • www.desa.com.ar
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} />
      </Page>

      {/* Page 2: Action Plan */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>DESA</Text>
          <Text style={{ fontSize: 10, color: '#6b7280' }}>{reportDate}</Text>
        </View>

        <Text style={styles.title}>Plan de Acción para Reposición de Stock</Text>

        <Text style={styles.sectionTitle}>Acciones Inmediatas (1-7 días)</Text>
        {analytics.stockAnalysis
          .filter(s => s.priority === 'critical')
          .map((analysis, index) => (
            <View key={index} style={{ marginBottom: 15 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5, color: '#dc2626' }}>
                {analysis.enterprise} - CRÍTICO
              </Text>
              {analysis.suggestedActions.map((action, actionIndex) => (
                <View style={styles.bulletPoint} key={actionIndex}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{action}</Text>
                </View>
              ))}
            </View>
          ))}

        <Text style={styles.sectionTitle}>Acciones a Corto Plazo (1-4 semanas)</Text>
        {analytics.stockAnalysis
          .filter(s => s.priority === 'high')
          .map((analysis, index) => (
            <View key={index} style={{ marginBottom: 15 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5, color: '#ea580c' }}>
                {analysis.enterprise} - ALTA PRIORIDAD
              </Text>
              {analysis.suggestedActions.map((action, actionIndex) => (
                <View style={styles.bulletPoint} key={actionIndex}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{action}</Text>
                </View>
              ))}
            </View>
          ))}

        <Text style={styles.sectionTitle}>Recomendaciones Generales</Text>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Implementar sistema de alertas automáticas cuando el stock baje del 20% del requerimiento.
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Establecer stock de seguridad del 30% sobre demanda proyectada para distribuidoras críticas.
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Revisar acuerdos con proveedores para reducir tiempos de entrega en órdenes urgentes.
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
            Nota Importante
          </Text>
          <Text>
            Las proyecciones están basadas en patrones históricos de tickets. Se recomienda 
            ajustar según eventos especiales, lanzamientos de nuevos servicios o cambios 
            organizacionales que puedan afectar la demanda.
          </Text>
        </View>

        <Text style={styles.footer}>
          Grupo DESA - Reporte generado automáticamente • www.desa.com.ar
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} />
      </Page>
    </Document>
  );
}

// Helper function to create filter summary
function getFilterSummary(filters: TelefonosTicketsFilters): string {
  const parts = [];
  
  if (filters.dateRange) {
    parts.push(`${format(new Date(filters.dateRange.start), 'dd/MM/yyyy')} - ${format(new Date(filters.dateRange.end), 'dd/MM/yyyy')}`);
  }
  
  if (filters.enterprise && filters.enterprise.length > 0) {
    parts.push(`Distribuidoras: ${filters.enterprise.join(', ')}`);
  }
  
  if (filters.issueType && filters.issueType.length > 0) {
    parts.push(`Tipos: ${filters.issueType.join(', ')}`);
  }
  
  return parts.length > 0 ? parts.join(' | ') : 'Todos los datos';
}