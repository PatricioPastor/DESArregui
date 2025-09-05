# Plan de Implementación - Módulo Reportes de Llamados

## Estado Actual ✅

### Completado
- [x] **Análisis de estructura existente** - Revisado codebase y patrones de Google Sheets
- [x] **Diseño de estructura de datos** - Interfaces TypeScript creadas en `src/lib/types.ts`
- [x] **Documentación técnica** - Creado `docs/LLAMADOS_MODULE.md` con especificaciones

### Interfaces Creadas
- `CallReportRecord` - Registro individual de llamada (9 columnas del sheets)
- `OperatorMonthlySummary` - Resumen mensual por operador
- `CallReportsAnalytics` - KPIs y métricas consolidadas
- `MonthlySheetInfo` - Metadatos de hojas mensuales
- `CallReportsResponse` - Respuesta estándar de APIs
- `CallReportsFilters` - Opciones de filtrado

## Próximos Pasos 📋

### 1. Configuración de Google Sheets 🔧
**Estado**: Pendiente
- [ ] Compartir Google Sheets de reportes con service account (`GOOGLE_CLIENT_EMAIL`)
- [ ] Obtener `GOOGLE_SHEET_ID` de la nueva planilla
- [ ] Verificar estructura de hojas mensuales (ej: "Septiembre_2024", "Octubre_2024")
- [ ] Confirmar que las columnas son: Tipo, Origen, Destino, Persona, Inicio, Duración, Categoría, Resultado, Operador

### 2. Backend - Google Sheets Integration 🔌
**Estado**: Pendiente
- [ ] **Crear funciones en `src/lib/sheets.ts`**:
  - `getCallReportsSheetData(sheetName: string)` - Obtener datos de hoja específica
  - `getAllMonthlySheets()` - Listar hojas mensuales disponibles
  - `convertRowToCallReportRecord()` - Convertir fila a `CallReportRecord`
  - `getCallReportRecords(month?: string)` - Obtener registros procesados
  - `calculateCallReportsAnalytics()` - Calcular KPIs y métricas

### 3. Backend - API Endpoints 🚀
**Estado**: Pendiente
- [ ] **`src/app/api/llamados/route.ts`**
  - GET: Obtener datos de todos los meses con analytics
  - Parámetros: ?month, ?operador, ?categoria, etc.
- [ ] **`src/app/api/llamados/months/route.ts`**
  - GET: Listar hojas mensuales disponibles
- [ ] **`src/app/api/llamados/[month]/route.ts`** (opcional)
  - GET: Datos específicos de un mes

### 4. Frontend - Página Principal 🎨
**Estado**: Pendiente
- [ ] **`src/app/(dashboard)/llamados/page.tsx`**
  - Layout principal del dashboard
  - Integración con hooks de datos
  - Filtros y controles de período
  - Loading states y error handling

### 5. Frontend - Componentes de Dashboard 📊
**Estado**: Pendiente
- [ ] **KPI Cards**:
  - Total llamadas del período
  - Duración promedio
  - Top operadores
  - Distribución por categoría
- [ ] **Tabla de Operadores**:
  - Ranking por métricas
  - Drill-down a detalle individual
  - Ordenamiento y filtros
- [ ] **Gráficos de Visualización**:
  - Tendencia temporal (líneas)
  - Distribución por categoría (pie/donut)
  - Comparativo operadores (barras)
  - Heatmap de actividad

### 6. Frontend - Componentes de UI ⚙️
**Estado**: Pendiente
- [ ] **Filtros Avanzados**:
  - Selector de rango de fechas
  - Multi-select de operadores
  - Filtros por categoría/resultado
  - Búsqueda por palabra clave
- [ ] **Exportación**:
  - Botón de exportar a Excel
  - Generar PDF de reportes
  - Compartir dashboard

### 7. Navegación y Routing 🧭
**Estado**: Pendiente
- [ ] Agregar ruta `/llamados` al dashboard
- [ ] Integrar en menú lateral de navegación
- [ ] Breadcrumbs para sub-páginas
- [ ] Configurar redirects si es necesario

### 8. Testing y Validación ✅
**Estado**: Pendiente
- [ ] Probar conexión con nuevo Google Sheets
- [ ] Validar estructura de datos
- [ ] Testing de APIs con datos reales
- [ ] Verificar performance con datos históricos (sept 2024 - presente)

## Consideraciones Técnicas 🔍

### Google Sheets Configuration
- **Cuenta diferente**: Requiere compartir sheets con service account actual
- **Permisos necesarios**: Solo "Viewer/Lector" es suficiente
- **Estructura esperada**: Hojas mensuales con nombres como "Septiembre_2024"
- **Columnas fijas**: 9 columnas específicas identificadas

### Patrones Existentes a Seguir
- **Autenticación**: Usar `getGoogleSheetsAuth()` existente
- **Estructura API**: Seguir patrón de `BaseSheetResponse`
- **Componentes**: Usar base components de Untitled UI
- **Styling**: Mantener consistencia con Tailwind CSS

### Performance Considerations
- **Caché**: Considerar caché para datos históricos
- **Paginación**: Para grandes volúmenes de datos
- **Lazy loading**: Para gráficos complejos
- **Optimización**: Calcular analytics en backend

## Archivos Creados/Modificados 📁

### Completados
- ✅ `src/lib/types.ts` - Interfaces TypeScript agregadas
- ✅ `docs/LLAMADOS_MODULE.md` - Documentación técnica
- ✅ `docs/IMPLEMENTATION_PLAN_LLAMADOS.md` - Este archivo

### Por Crear
- [ ] `src/lib/sheets.ts` - Funciones de llamados (agregar a existente)
- [ ] `src/app/api/llamados/route.ts`
- [ ] `src/app/api/llamados/months/route.ts`
- [ ] `src/app/(dashboard)/llamados/page.tsx`
- [ ] `src/components/dashboard/call-reports/` - Componentes específicos
- [ ] `src/hooks/use-call-reports.ts` - Custom hook para datos

## Notas de Continuación 📝

### Para mañana:
1. **Primero**: Configurar Google Sheets (compartir y obtener ID)
2. **Segundo**: Implementar funciones básicas en `sheets.ts`
3. **Tercero**: Crear API endpoint principal para testear conexión
4. **Cuarto**: Crear página básica para verificar datos

### Preguntas Pendientes:
- ¿Cuál es el formato exacto de nombres de hojas mensuales?
- ¿Hay alguna hoja de "template" o todas tienen la misma estructura?
- ¿Se necesita alguna validación específica de datos?
- ¿Hay preferencias específicas para los KPIs a mostrar?

---

**Última actualización**: 2025-01-05
**Estado**: Listo para continuar implementación backend