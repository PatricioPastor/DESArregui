# Phase 0 Dependency Inventory

Date: 2026-02-26
Change: `retire-legacy-stock-tables-with-n1-report-migration`

## Scan Method

- API scan: `src/app/api/**/*.ts` for `purchase`, `purchase_id`, `prisma.device_n1`, `prisma.assignment_n1`, `prisma.shipment_n1`, `phones.get_enhanced_kpis`.
- UI scan: `src/**/*.tsx` for purchase fields/rendering and direct `_n1` usage in dashboard/server components.
- Schema scan: `prisma/schema.prisma` and `prisma/migrations/**/*.sql` for `purchase` tables/columns and legacy/_n1 identifiers.
- Function scan: SQL function files under `prisma/migrations/*.sql` plus API call sites for `phones.get_enhanced_kpis`.

## API Dependencies

### Purchase-linked references (critical)

- `src/app/api/stock/route.ts` - create path validates and writes `purchase_id`.
- `src/app/api/stock/[imei]/route.ts` - update path validates and writes `purchase_id`.
- `src/app/api/stock-n1/route.ts` - create path validates and writes `purchase_id`; includes `prisma.purchase` lookup.

### `_n1` model references (critical for cutover readiness)

- `src/app/api/stock-n1/route.ts`
- `src/app/api/stock-n1/[id]/route.ts`
- `src/app/api/stock-n1/[id]/owner/route.ts`
- `src/app/api/assignments-n1/[id]/close/route.ts`
- `src/app/api/assignments/manual/route.ts`
- `src/app/api/models/route.ts`
- `src/app/api/models/[id]/route.ts`

### Reporting function contract references (must stay stable)

- `src/app/api/reports/phones/summary/route.ts` calls `phones.get_enhanced_kpis`.

## UI Dependencies

### Purchase-linked UI references (critical)

- `src/features/stock/components/create/individual-tab.tsx` - `purchase_id` input.
- `src/features/stock/components/edit/edit-stock-modal.tsx` - `purchase_id` state/input/payload.
- `src/app/(dashboard)/stock/[imei]/device-detail.client.tsx` - purchase block rendering.

### `_n1` data-path references (critical)

- `src/app/(dashboard)/stock/assign/page.tsx` uses `prisma.device_n1` and `assignments_n1`.
- `src/app/(dashboard)/stock/[imei]/page.tsx` uses `device_n1`, `assignments_n1`, `shipments_n1`.

## Schema and Migration Dependencies

### Purchase-linked schema references (critical)

- `prisma/schema.prisma`:
  - `model purchase`
  - `distributor.purchases`
  - `device.purchase_id` + relation
  - `device_n1.purchase_id` + relation
- `prisma/migrations/20250923000000_init/migration.sql` creates `phones.purchase` and foreign keys.

### `_n1` canonical-source references (expected in transition)

- `prisma/schema.prisma` models: `device_n1`, `assignment_n1`, `shipment_n1`.
- `prisma/migrations/20260218170000_create_device_n1/migration.sql`.
- `prisma/migrations/20260218193000_create_assignments_n1_shipments_n1/migration.sql`.
- `prisma/migrations/20260219170000_add_device_owner_fields_n1/migration.sql`.

### Legacy table references in function SQL (monitor for phase-2/3 updates)

- `prisma/migrations/create_enhanced_kpis_function.sql`
- `prisma/migrations/add_replacement_types_to_enhanced_kpis.sql`
- `prisma/migrations/fix_current_month_projection.sql`
- `prisma/migrations/update_enhanced_kpis_annual_chart.sql`
- `prisma/migrations/update_enhanced_kpis_annual_view.sql`

## Additional Documentation References (non-blocking)

- `docs/API_ARCHITECTURE.md`
- `docs/stock-management-overview.md`
- `plan.md`

## Critical Dependency Summary

- Purchase runtime references: present in stock create/update surfaces (API + UI + stock detail helper).
- `_n1` runtime references: present in stock-n1 and assignment-n1 operational/reporting paths.
- Function compatibility dependency: `phones.get_enhanced_kpis` is still consumed directly and remains compatibility-critical.
- Gate result for this phase: **NO-GO for destructive actions** (expected until phase 2+ tasks are complete).
