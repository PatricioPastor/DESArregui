# Módulo de Reportes de Llamados Telefónicos

## Descripción General

Este módulo permite integrar y analizar los reportes de llamados telefónicos atendidos por la mesa de ayuda. Los datos provienen de hojas de Google Sheets organizadas por mes (desde septiembre 2024) y contienen información detallada sobre cada llamada realizada.

## Estructura de Datos

### Columnas del Google Sheets
Los datos originales contienen las siguientes columnas:
- **Tipo**: Tipo de llamada
- **Origen**: Origen de la llamada
- **Destino**: Destino de la llamada  
- **Persona**: Persona involucrada en la llamada
- **Inicio**: Fecha y hora de inicio
- **Duración**: Duración de la llamada
- **Categoría**: Categoría de la llamada
- **Resultado**: Resultado u outcome de la llamada
- **Operador**: Operador que atendió la llamada

## Interfaces TypeScript

### 1. `CallReportRecord`
**Propósito**: Representa un registro individual de llamada tal como viene del Google Sheets.

```typescript
interface CallReportRecord {
  tipo: string;        // Tipo de llamada
  origen: string;      // Origen de la llamada
  destino: string;     // Destino de la llamada
  persona: string;     // Persona involucrada
  inicio: string;      // Fecha/hora de inicio
  duracion: number;    // Duración en minutos
  categoria: string;   // Categoría de la llamada
  resultado: string;   // Resultado de la llamada
  operador: string;    // Operador que la atendió
}
```

**Uso**: 
- Almacenamiento y transferencia de datos brutos
- Base para cálculos y análisis posteriores
- Visualización en tablas detalladas

### 2. `OperatorMonthlySummary`
**Propósito**: Resumen mensual de rendimiento por operador con métricas calculadas.

```typescript
interface OperatorMonthlySummary {
  operador: string;                    // Nombre del operador
  mes: string;                         // Mes en formato YYYY-MM
  total_llamadas: number;              // Total de llamadas atendidas
  duracion_total: number;              // Duración total en minutos
  duracion_promedio: number;           // Duración promedio por llamada
  llamadas_por_categoria: { [key: string]: number };  // Distribución por categoría
  llamadas_por_resultado: { [key: string]: number };  // Distribución por resultado
  llamadas_por_tipo: { [key: string]: number };       // Distribución por tipo
}
```

**Uso**:
- KPIs individuales de operadores
- Comparación de rendimiento entre operadores
- Análisis de especialización por categoría/tipo
- Reportes mensuales de productividad

### 3. `CallReportsAnalytics`
**Propósito**: Análisis consolidado y KPIs globales para dashboards ejecutivos.

```typescript
interface CallReportsAnalytics {
  periodo: { inicio: string; fin: string };           // Período analizado
  metricas_globales: {                                // KPIs generales
    total_llamadas: number;
    duracion_total: number;
    duracion_promedio: number;
    promedio_llamadas_diarias: number;
  };
  por_operador: OperatorMonthlySummary[];             // Resúmenes por operador
  por_categoria: { [key: string]: number };          // Distribución por categoría
  por_resultado: { [key: string]: number };          // Distribución por resultado
  por_tipo: { [key: string]: number };               // Distribución por tipo
  tendencias_temporales: Array<{                     // Evolución temporal
    fecha: string;
    llamadas: number;
    duracion_total: number;
    duracion_promedio: number;
  }>;
  ranking_operadores: Array<{                        // Ranking de performance
    operador: string;
    puntuacion: number;
    metricas: {
      volumen_llamadas: number;
      eficiencia_tiempo: number;
      variedad_categorias: number;
    };
  }>;
}
```

**Uso**:
- Dashboards ejecutivos con KPIs principales
- Gráficos de tendencias temporales
- Rankings y comparaciones entre operadores
- Análisis de distribución por categorías/resultados
- Identificación de patrones y anomalías

### 4. `MonthlySheetInfo`
**Propósito**: Metadatos sobre las hojas mensuales disponibles en Google Sheets.

```typescript
interface MonthlySheetInfo {
  nombre_hoja: string;        // Nombre de la hoja (ej: "Septiembre_2024")
  mes: number;                // Número del mes (1-12)
  año: number;                // Año
  total_registros: number;    // Cantidad de registros en la hoja
  ultima_actualizacion: string; // Timestamp de última actualización
}
```

**Uso**:
- Selector de períodos en el frontend
- Validación de disponibilidad de datos
- Información de freshness de los datos
- Navegación entre períodos históricos

### 5. `CallReportsResponse`
**Propósito**: Estructura de respuesta estándar de las APIs del módulo.

```typescript
interface CallReportsResponse {
  success: boolean;                    // Indica si la operación fue exitosa
  data?: CallReportRecord[];           // Datos de llamadas (opcional)
  analytics?: CallReportsAnalytics;    // Analytics calculados (opcional)
  hojas_disponibles?: MonthlySheetInfo[]; // Hojas disponibles (opcional)
  headers?: string[];                  // Headers del sheet (opcional)
  totalRecords?: number;               // Total de registros
  lastUpdated?: string;                // Timestamp de actualización
  error?: string;                      // Mensaje de error (opcional)
}
```

**Uso**:
- Respuesta unificada de todos los endpoints
- Manejo consistente de errores en el frontend
- Información de metadatos junto con los datos
- Flexibilidad para diferentes tipos de consultas

### 6. `CallReportsFilters`
**Propósito**: Opciones de filtrado para consultas específicas.

```typescript
interface CallReportsFilters {
  periodo?: { inicio: string; fin: string }; // Rango de fechas
  operadores?: string[];                     // Filtro por operadores específicos
  tipos?: string[];                          // Filtro por tipos de llamada
  categorias?: string[];                     // Filtro por categorías
  resultados?: string[];                     // Filtro por resultados
  duracion_min?: number;                     // Duración mínima
  duracion_max?: number;                     // Duración máxima
  searchKeyword?: string;                    // Búsqueda por palabra clave
}
```

**Uso**:
- Componentes de filtrado en el frontend
- APIs parametrizadas para consultas específicas
- Análisis segmentados (por período, operador, etc.)
- Búsquedas y drill-downs en los datos

## Casos de Uso

### Dashboard Principal
- Mostrar KPIs globales del período actual
- Gráficos de tendencias temporales
- Top operadores por diferentes métricas
- Distribución por categorías y resultados

### Análisis por Operador
- Performance individual detallada
- Comparación con promedios del equipo
- Evolución histórica del operador
- Especialización por tipos de llamada

### Reportes Ejecutivos
- Métricas consolidadas por período
- Comparaciones mes a mes
- Identificación de tendencias
- Análisis de eficiencia del equipo

### Filtros y Búsquedas
- Consultas específicas por criterios múltiples
- Análisis segmentados por período/operador
- Drill-down en categorías específicas
- Exportación de datos filtrados