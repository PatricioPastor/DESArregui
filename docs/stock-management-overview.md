# Stock Data Reference

## Core Tables
- **`phones.device`**
  - Fields: `id`, `imei` (unique), `status` (`device_status` enum), `assigned_to`, `ticket_id`, `model_id`, `distributor_id`, `purchase_id`, timestamps (`created_at`, `updated_at`). Indexed on `status`, `assigned_to`, `ticket_id`, `model_id`.
  - Notes: primary source for inventory status; optional links to distributor, purchase, ticket.
- **`phones.phone_model`**
  - Fields: `id`, `brand`, `model`, `storage_gb`, `color`, `sku`.
  - Notes: uniqueness constraint on (`brand`, `model`, `storage_gb`, `color`); used for device display strings.
- **`phones.distributor`**
  - Fields: `id`, `name` (unique).
  - Notes: referenced by devices, assignments, and purchases.
- **`phones.purchase`**
  - Fields: `id`, `distributor_id`, `invoice_number`, `purchased_at`, `currency`.
  - Notes: links procurement context to multiple devices.
- **`phones.assignment`**
  - Fields: `id`, `device_id`, `type` (`assignment_type` enum), `status` (`active` default), `assignee_name`, `assignee_phone`, `distributor_id`, `shipping_voucher_id`, `expects_return`, `return_device_imei`, `ticket_id`, `soti_device_id`, timestamp `at`.
  - Notes: chronological ledger of device hand-offs and returns; cascade deletes with parent device.
- **`phones.soti_device`**
  - Fields: `id`, `device_name` (unique with `imei`), `imei`, `assigned_user`, `status`, `is_active`, connectivity timestamps (`connection_date`, `disconnection_date`), `last_sync`, metadata fields (route, networks, contacts).
  - Notes: populated from SOTI sync; linked to assignments by `soti_device_id`.
- **`phones.ticket`**
  - Fields: `id`, `key` (unique), `status`, `category_status`, `issue_type`, `label`, `enterprise`, counters (`replacement_count`, `pending_count`), flags (`is_replacement`, `is_assignment`, `is_active`), sync timestamps.
  - Notes: allows mapping devices to Jira tickets.

## Relationships
- **Device ↔ Model**: `device.model_id` references `phone_model.id` (`@relation` in `prisma/schema.prisma:126`).
- **Device ↔ Distributor**: `device.distributor_id` references `distributor.id`; nullable when distributor not yet defined.
- **Device ↔ Purchase**: `device.purchase_id` optional link for procurement history.
- **Device ↔ Ticket**: `device.ticket_id` stored string; no enforced FK but indexed for lookups.
- **Assignment ↔ Device**: `assignment.device_id` references `device.id` with cascade delete (`prisma/schema.prisma:156`).
- **Assignment ↔ Distributor**: optional relation via `assignment.distributor_id` for handover logistics.
- **Assignment ↔ SOTI Device**: optional link via `assignment.soti_device_id` to correlate MDM events.
- **Purchase ↔ Distributor**: `purchase.distributor_id` references distributor supplying the batch.

## Device State & Status Flags
- **Primary status**: `device.status` (`NEW`, `ASSIGNED`, `USED`, `REPAIRED`, `NOT_REPAIRED`, `LOST`). Used throughout API responses (`src/app/api/stock/route.ts:114`).
- **Assignment presence**: `device.assigned_to` plus recent `assignment` records determine `is_assigned` flag in inventory responses (`buildInventoryRecord` logic lines 150-155).
- **Ticket linkage**: `device.ticket_id` ties issues to `phones.ticket` entries; UI filters rely on this field.
- **Assignment lifecycle**: `assignment.type` (`ASSIGN`/`UNASSIGN`) and `assignment.status` track current vs historical hand-offs.
- **SOTI signal**: `soti_device.status` and `is_active` indicate device presence in MDM; `last_sync` records ingestion timestamp.
- **Ticket activity**: `ticket.status` and `is_active` differentiate open, closed, or archived cases.

## Audit & History Considerations
- **Assignments**: serve as the historical ledger for allocations, returns, and shipping. Keep `assignment.at` ordering to reconstruct flows.
- **Purchases**: capture acquisition events with `purchased_at` and distributor references.
- **No dedicated audit tables** beyond `assignment`; deletions of devices remove related assignments due to cascade.
- **SQL utilities**: migration scripts (`prisma/migrations/create_enhanced_kpis_function.sql`, etc.) focus on KPI calculations, not stock history.

## SOTI Synchronization
- Sync flow handled via `/api/soti` (`docs/system-data-context.md`): pulls Google Sheets data into `phones.soti_device`.
- Fields considered reliable: `device_name`, `imei`, `assigned_user`, `status`, `is_active`, `connection_date`, `disconnection_date`, `last_sync`.
- Inventory endpoint batches IMEI queries to `soti_device` (`src/app/api/stock/route.ts:231-247`) and merges results as `soti_info`.
- Active vs inactive devices decided by `soti_device.is_active` and `status`; business rules may further refine in UI filtering hooks.

## Validation & Normalization Rules
- **Models**: unique constraint prevents duplicate (`brand`, `model`, `storage_gb`, `color`). Sync heuristics (`/api/stock/sync`) parse names; manual review recommended when heuristics fail.
- **Distributors**: `name` unique enforced at DB; `/api/distributors` ensures deduplicated catalog.
- **Tickets**: `key` unique; flags `is_replacement`/`is_assignment` drive filtering.
- **Device creation**: `/api/stock` POST validates IMEI, model, distributor existence; optional `purchase_id` check; auto-creates `assignment` record when `assigned_to` provided (`src/app/api/stock/route.ts:384-392`).

## Aggregations & Derived Data
- No materialized views defined in Prisma schema; inventory summaries computed on-the-fly (`buildStatusSummary` in `src/app/api/stock/route.ts:169`).
- KPIs and analytics implemented in app utilities (`src/utils/analytics-utils.ts`) and Google Sheets integrations (`src/lib/sheets.ts`, `src/lib/telefonos-tickets-sheets.ts`).

## Common Filters & Data Locations
- **Inventory UI** (`StockTable`): filters by `status`, `distributor_id`, search term covering IMEI, ticket, assignee, model, distributor (`src/app/api/stock/route.ts:185-223`).
- **Tickets dashboards**: rely on `ticket.status`, `label`, `enterprise`, `last_sync` (see `docs/system-data-context.md`).
- **SOTI view**: uses `soti_device.status`, `is_active`, connectivity timestamps (`src/app/(dashboard)/soti/page.tsx`).
- **Reports**: combine `/api/stock` with Sheets data for cross-metrics (`src/components/dashboard/reports-display.tsx`, `src/components/reports/mobile-devices-report.tsx`).

## Automated Processes & Scripts
- **`/api/stock/sync`**: orchestrates Google Sheets ingestion; auto-creates models/distributors, upserts devices based on IMEI.
- **Google Sheets automations**: `src/lib/sheets.ts` handles parsing, deduplication, and updates to ranges (`BASE`, `STOCK`, `SOTI`).
- **Utility scripts**: repository contains debugging helpers (`debug-assignments.js`, `debug-device-status.js`) for targeted data fixes; review before use.
- **No scheduled jobs** observed in repo; sync likely triggered manually via dashboard actions.

## Representative Records (How to Retrieve)
- **Available device**: query `/api/stock?status=NEW&assigned=false` to inspect unassigned entries.
- **Assigned device**: query `/api/stock?assigned=true` and inspect `assignments` array in response payload for latest `ASSIGN` event.
- **Device in repair**: filter by `status=REPAIRED` or `NOT_REPAIRED`; cross-reference linked `ticket_id` via `/api/stock?search=<ticket>`.
- **Device without distributor**: search `/api/stock?search=<imei>` and check `distribuidora_id` null (displayed empty string). Creation is blocked on missing distributor via POST validation, so these should be legacy records.

## Reference Files
- Schema: `prisma/schema.prisma`
- Stock API: `src/app/api/stock/route.ts`
- Stock detail API: `src/app/api/stock/[imei]/route.ts`
- Sync process overview: `docs/system-data-context.md`
- Device detail page: `src/app/(dashboard)/stock/[imei]/page.tsx`
- Utility scripts: `src/lib/sheets.ts`, `src/lib/telefonos-tickets-sheets.ts`, `src/utils/analytics-utils.ts`
- Debug scripts: `debug-assignments.js`, `debug-device-status.js`
