# Contexto de datos y riesgos

## Fuentes de datos
- **PostgreSQL (Prisma)**: almacenamiento de dispositivos, modelos, distribuidoras y asignaciones. Prisma se inicializa en `src/lib/prisma.ts:3` y los modelos estan definidos en `prisma/schema.prisma:17`.
- **Google Sheets (Service Account)**: lecturas y escrituras sobre rangos `BASE`, `STOCK`, `SOTI`, `TELEFONOS_TICKETS` y `REPORTE_FINAL_ROCIO`. La autenticacion se realiza en `src/lib/sheets.ts:7` y en `src/lib/telefonos-tickets-sheets.ts:32`, ambos usando credenciales de entorno.
- **Better Auth**: flujo de autenticacion/email-password y Google OAuth definido en `src/lib/auth.ts:11`, expuesto a Next.js mediante `src/app/api/auth/[...all]/route.ts:3`.

## Endpoints y consumo
| Endpoint | Metodos / Backend | Procesamiento clave | Clientes principales |
| --- | --- | --- | --- |
| `/api/base` (`src/app/api/base/route.ts:8`) | GET \| Google Sheets | Valida env vars y entrega registros IMEI procesados (`getIMEIRecords`) con cabeceras originales | `src/hooks/use-base-data.ts:23`, `src/components/dashboard/reports-display.tsx:113` |
| `/api/stock` (`src/app/api/stock/route.ts:8`) | GET, POST \| Prisma | Busquedas por IMEI/asignado/ticket, incluye `model` y `distributor`. POST crea `device` con validaciones minimas | GET: `src/hooks/use-stock-data.ts:23`, `src/components/dashboard/stock-table.tsx:33`, `src/components/reports/mobile-devices-report.tsx:151`; POST: `src/store/create-stock.store.ts:144` |
| `/api/stock/sync` (`src/app/api/stock/sync/route.ts:9`) | POST \| Google Sheets + Prisma | Descarga registros de Sheets, crea modelos/distribuidoras y sincroniza `device` por IMEI (`modelParts` heuristica) | Boton "Sincronizar DB" en `src/components/dashboard/stock-table.tsx:146` |
| `/api/models` (`src/app/api/models/route.ts:8`) | GET, POST \| Prisma | Lista modelos para selects y permite crear nuevos evitando duplicados | `src/store/create-stock.store.ts:244` (GET) y `src/store/create-stock.store.ts:277` (bulk fetch) |
| `/api/distributors` (`src/app/api/distributors/route.ts:8`) | GET, POST \| Prisma | Lista distribuidoras con conteo de dispositivos y crea nuevas entradas unicas | `src/store/create-stock.store.ts:260` (GET) y `src/store/create-stock.store.ts:278` |
| `/api/telefonos-tickets` (`src/app/api/telefonos-tickets/route.ts:8`) | GET, POST \| Google Sheets | Carga registros de TELEFONOS_TICKETS, calcula analiticas y opciones de filtros | `src/hooks/use-telefonos-tickets-data.ts:70`, `src/utils/use-phone-tickets.ts:42`, dashboards en `src/app/(dashboard)/reports/phones/reports-client-page.tsx:107` |
| `/api/update-record` (`src/app/api/update-record/route.ts:12`) | POST, PATCH \| Google Sheets | Actualiza una celda o multiples campos en hoja BASE ubicando filas por IMEI | `src/hooks/use-record-actions.ts:31` (POST) y `src/hooks/use-record-actions.ts:70` (PATCH) |
| `/api/soti` (`src/app/api/soti/route.ts:8`) | GET \| Google Sheets | Devuelve registros SOTI con cabeceras | `src/hooks/use-soti-data.ts:34`, pagina SOTI `src/app/(dashboard)/soti/page.tsx:56` |
| `/api/report` (`src/app/api/report/route.ts:7`) | GET \| Google Sheets + XLSX | Procesa `REPORTE_FINAL_ROCIO`, deduplica por telefono y genera XLSX descargable | Usado para descargas administrativas (no referenciado en UI actual) |
| `/api/auth/[...all]` (`src/app/api/auth/[...all]/route.ts:3`) | GET, POST \| Better Auth | Proxies de autenticacion (sign-in/out, OAuth) | Formulario de login `src/app/(auth)/login/page.tsx:39` via `signIn.social` |
| `/api/test` (`src/app/api/test/route.ts:3`) | GET \| none | Endpoint diagnostico que expone estado de variables de entorno | Consumido manualmente para troubleshooting |

## Hooks, paginas y componentes
- **Stock**: `StockTable` utiliza `useFilteredStockData` (`src/components/dashboard/stock-table.tsx:33`, `src/hooks/use-stock-data.ts:99`) y dispara sincronizacion `/api/stock/sync` (`src/components/dashboard/stock-table.tsx:146`). El modal de creacion reusa el store `useCreateStockStore` (`src/features/stock/components/create/individual-tab.tsx:23` y `src/store/create-stock.store.ts:144`).
- **Reportes IMEI/Stock**: `ReportsDisplay` combina `useFilteredBaseData` (`src/components/dashboard/reports-display.tsx:113`) y `useFilteredStockData` (`src/components/dashboard/reports-display.tsx:114`) para metricas cruzadas.
- **Telefonos & Tickets (dashboard moderno)**: `ReportsClientPage` monta `useTelefonosTicketsData` (`src/app/(dashboard)/reports/phones/reports-client-page.tsx:107`) y comparte filtros con `MobileDevicesReport`, que adicionalmente vuelve a pedir `/api/stock` (`src/components/reports/mobile-devices-report.tsx:151`).
- **Telefonos & Tickets (vista legacy)**: `ReportsPage` usa `useTelefonosTickets` (`src/app/(dashboard)/reports/page.tsx:9`), aunque ese hook procesa mal la respuesta.
- **SOTI**: pagina `src/app/(dashboard)/soti/page.tsx:56` filtra datos de `useFilteredSOTIData` y genera acciones sobre tickets.
- **Actualizacion puntual de BASE**: cualquier componente puede usar `useRecordActions` (`src/hooks/use-record-actions.ts:22`) para persistir ediciones en Google Sheets.

## Utilidades de procesamiento
- `src/lib/sheets.ts`: conversion de filas a entidades IMEI/Stock/SOTI (`convertRowToIMEIRecord` en linea 26, `convertRowToStockRecord` en linea 312), deduplicacion (`processRows` en linea 408, `deduplicateByPhoneNumber` en linea 470) y generacion de workbooks (`createPhoneDeduplicationWorkbook` en linea 496). Las funciones registran datos crudos via `console.log` (p.ej. lineas 337, 363, 388).
- `src/lib/telefonos-tickets-sheets.ts`: normaliza fechas (`normalizeDateString` en linea 14), extrae registros (`convertRowToTelefonosTicketRecord` en linea 66) y arma analiticas (p.ej. `calculateDemandByEnterprise` en linea 190) que reutiliza `/api/telefonos-tickets`.
- `src/utils/analytics-utils.ts`: calculo de regresiones, proyecciones y recomendaciones (`calculateTelefonosTicketsAnalytics` en linea 107) con logging de fechas (`console.log` en linea 44).
- `src/utils/pdf-generator.ts`: genera informes PDF a partir de datasets de stock y tickets (util para `MobileDevicesReport`).

## Puntos debiles identificados
1. **Critico - Endpoints sin autenticacion ni autorizacion**: Ninguna ruta en `src/app/api/**/route.ts` verifica sesiones (ej. `src/app/api/stock/route.ts:8`, `src/app/api/telefonos-tickets/route.ts:8`). Cualquier visitante anonimo puede leer/escribir datos sensibles.
2. **Critico - Escrituras arbitrarias sobre Google Sheets**: `/api/update-record` acepta cualquier `field` y `value`, construye rango dinamico (`src/app/api/update-record/route.ts:71`) y permite sobrescribir multiples columnas (`src/app/api/update-record/route.ts:169`) sin validacion ni auditoria. Un abuso puede corromper la base operativa.
3. **Alto - Endpoint `/api/test` filtra informacion del entorno**: expone dominios de cuentas de servicio y estado de claves (`src/app/api/test/route.ts:10`), util para recopilar credenciales.
4. **Alto - Registro de datos sensibles en logs**: `lib/sheets` y analiticas escriben registros completos en consola (`src/lib/sheets.ts:337`, `src/lib/sheets.ts:363`, `src/utils/analytics-utils.ts:44`), lo que puede volcar IMEIs, nombres y tickets en infraestructura compartida.
5. **Alto - Sin controles de cuota ni paginacion en queries Prisma**: `/api/stock` devuelve `findMany` sin limites (`src/app/api/stock/route.ts:44`) y acepta busquedas arbitrarias; un actor podria causar cargas pesadas o enumerar todo el inventario.
6. **Medio - Sin validaciones de esquema en cargas de stock**: la heuristica `modelParts` en sincronizacion (`src/app/api/stock/sync/route.ts:37`) puede generar marcas/modelos incorrectos o duplicados; ademas se crean distribuidoras automaticamente (`src/app/api/stock/sync/route.ts:77`) sin normalizar formatos.
7. **Medio - Hook `useTelefonosTickets` procesa mal la respuesta**: itera sobre `sheetData.headers` en vez de filas (`src/utils/use-phone-tickets.ts:42`), generando datasets vacios o corruptos para `src/app/(dashboard)/reports/page.tsx:9`.
8. **Medio - Formularios de autenticacion incompletos**: el login no envia credenciales (`src/app/(auth)/login/page.tsx:39`) y el campo contrasena esta tipeado como `email`, impidiendo un flujo correcto y fomentando workarounds inseguros.
9. **Bajo - Repeticion de fetch pesado en cliente**: `MobileDevicesReport` vuelve a pedir `/api/stock` sin cache (`src/components/reports/mobile-devices-report.tsx:151`), duplicando carga sobre el backend y ralentizando la vista.
10. **Bajo - Store de creacion no valida contenido**: `useCreateStockStore` solo revisa campos obligatorios en cliente (`src/store/create-stock.store.ts:170`) y confia en respuestas de API para detectar IMEIs duplicados, exponiendo superficies a requests manuales.

## Recomendaciones inmediatas
- Proteger los endpoints con middleware de sesion Better Auth o validaciones JWT antes de exponerlos.
- Implementar listas blancas de campos y control de cambios en `/api/update-record`; registrar auditorias.
- Deshabilitar `/api/test` en produccion y eliminar logs de datos sensibles.
- Anadir limites/paginacion y validaciones server-side (zod/yup) en `/api/stock`, `/api/models`, `/api/distributors`.
- Revisar la sincronizacion de stock para normalizar marcas/distribuidoras y manejar transacciones.
- Corregir `useTelefonosTickets` para leer `rows` y anadir manejo de errores.
