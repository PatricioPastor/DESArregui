# Legacy Components - Reports/Phones

Esta carpeta contiene componentes del sistema anterior de reportes de teléfonos que ya no están en uso activo.

## Estado Actual

- **Fecha de movimiento:** 2025-10-01
- **Razón:** Refactorización del dashboard de teléfonos hacia arquitectura simplificada
- **Componente principal reemplazado:** `TelefonosDashboard.tsx` → `page.tsx` con KPI cards modales

## Componentes Incluidos

### 1. TelefonosDashboard.tsx
Dashboard completo anterior con filtros avanzados, charts y tablas de análisis.

**Funcionalidades:**
- Filtros por fecha, empresa, tipo de issue
- Sincronización manual de tickets
- Generación de reportes PDF
- 4 metric cards
- Charts: por empresa, time series, demand trends
- Tablas: proyecciones de demanda, análisis de stock

### 2. ChartsGrid.tsx
Grid de visualizaciones con Recharts.

### 3. DataTables.tsx
Tablas de análisis de demanda y stock.

### 4. MetricCard.tsx
Card simple de métricas (reemplazado por KpiCardWithModal).

### 5. useReportGeneration.ts
Hook para generación de reportes PDF.

### 6. reportUtils.ts + reportConfig.ts
Utilidades para generación de reportes.

### 7. table/demand-projections/ + stock-analysis/
Componentes de tabla específicos.

## Posible Reactivación

Estos componentes pueden ser útiles para:
- Referencia de implementación de reportes PDF
- Dashboard alternativo más detallado
- Reutilización de lógica de análisis

## Decisión Final

**A REVISAR:** Estos componentes serán evaluados para:
- [ ] Eliminar definitivamente
- [ ] Migrar funcionalidad específica (PDF generation)
- [ ] Mantener como referencia

---

**Nota:** No modificar estos archivos. Si necesitas funcionalidad similar, implementa en la nueva arquitectura.
