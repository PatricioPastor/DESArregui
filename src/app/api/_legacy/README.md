# Legacy API Endpoints

**Fecha de movimiento:** 2025-12-30
**Razón:** Endpoints obsoletos que ya no forman parte de la arquitectura principal

## ⚠️ Advertencia de Seguridad

Estos endpoints **NO están protegidos** con autenticación y deberían ser **ELIMINADOS** lo antes posible. Fueron movidos aquí temporalmente para mantener la organización del código antes de su eliminación definitiva.

## Endpoints Movidos

### 1. `/api/_legacy/base`
**Archivo:** `route.ts` (45 líneas)
**Función:** Lee IMEI records directamente de Google Sheets
**Estado:** ❌ Obsoleto - Google Sheets ya no es fuente de verdad
**Reemplazado por:** `/api/stock` + sistema Prisma + `/api/sync/stock`

**Dependencias:**
- `getIMEIRecords()` desde `@/lib/sheets`
- `getBaseSheetData()` desde `@/lib/sheets`

---

### 2. `/api/_legacy/report`
**Archivo:** `route.ts` (55 líneas)
**Función:** Genera reporte Excel deduplicado desde Google Sheets
**Estado:** ❌ Obsoleto - No se usa
**Reemplazado por:** Reportes internos en `/api/reports/*`

**Dependencias:**
- `getRocioReportSheetData()` desde `@/lib/sheets`
- `processRows()`, `deduplicateByPhoneNumber()` desde `@/lib/sheets`
- `createPhoneDeduplicationWorkbook()` desde `@/lib/sheets`
- Librería `xlsx` para exportación

---

### 3. `/api/_legacy/update-record`
**Archivo:** `route.ts` (214 líneas)
**Función:** Actualiza records directamente en Google Sheets (POST/PATCH)
**Estado:** ❌ Obsoleto - Sistema migrado a Prisma
**Reemplazado por:** Endpoints CRUD en `/api/stock`, `/api/assignments`, etc.

**Dependencias:**
- `getGoogleSheetsAuth()` desde `@/lib/sheets`
- Google Sheets API directa

**Métodos:**
- `POST` - Actualizar campo individual
- `PATCH` - Actualizar múltiples campos (batch)

---

## ⚠️ Riesgos de Seguridad

| Endpoint | Riesgo | Severidad |
|----------|--------|-----------|
| `/api/_legacy/base` | Acceso público a datos IMEI | 🔴 Alto |
| `/api/_legacy/report` | Generación de reportes sin auth | 🟡 Medio |
| `/api/_legacy/update-record` | Modificación de datos sin auth | 🔴 Crítico |

**Todos estos endpoints siguen siendo accesibles públicamente** hasta que sean eliminados del proyecto.

## Alternativas Modernas

En lugar de estos endpoints, utilizar:

| Legacy | Moderno | Descripción |
|--------|---------|-------------|
| `GET /api/_legacy/base` | `GET /api/stock` | Inventario de dispositivos con Prisma |
| `POST /api/_legacy/update-record` | `PATCH /api/stock/[imei]` | Actualización de dispositivos |
| `GET /api/_legacy/report` | `GET /api/reports/phones` | Reportes de teléfonos |
| - | `POST /api/sync/stock` | Sincronización desde Google Sheets |

## Uso Actual de Google Sheets

Google Sheets ahora se usa **únicamente** para:
- ✅ Sincronización de tickets (origen de datos)
- ✅ Endpoints `/api/sync/*` (importación controlada)

**Ya NO se usa para:**
- ❌ Lectura directa de datos de producción
- ❌ Actualización de records
- ❌ Generación de reportes

## Próximos Pasos

1. 🔴 **URGENTE**: Verificar que ningún sistema externo llama a estos endpoints
2. 🔴 **URGENTE**: Rotar credenciales de Google Sheets expuestas en git
3. 🟡 Eliminar completamente esta carpeta `_legacy/` después de 1 semana sin uso
4. 🟡 Considerar eliminar funciones no usadas en `/src/lib/sheets.ts`

## Fecha de Eliminación Planeada

**2026-01-15** (2 semanas desde el movimiento)

Si para esta fecha no hay objeciones ni uso detectado, estos archivos serán eliminados permanentemente.

---

**Nota:** Este README será eliminado junto con los archivos legacy.
