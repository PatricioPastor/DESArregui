# Phase 2 Gate: Purchase Decommission Evidence

Date: 2026-02-26
Change: `retire-legacy-stock-tables-with-n1-report-migration`

## Scope Covered

- Prisma schema decommission for `purchase` and linked mappings (`device.purchase_id`, `device_n1.purchase_id`, distributor purchase relation).
- Guarded migration to block drop when active linkage or dependent objects still exist.
- Runtime/API/UI/store/detail removal of purchase linkage handling.
- Zero-linkage validation via migration reference scan and purchase decommission smoke suite.

## Evidence Packet

1. Schema and migration decommission:
   - `prisma/schema.prisma`
   - `prisma/migrations/20260226133000_phase2_purchase_decommission/migration.sql`
2. Runtime/API/UI/store/detail cleanup:
   - `src/app/api/stock/route.ts`
   - `src/app/api/stock/[imei]/route.ts`
   - `src/app/api/stock-n1/route.ts`
   - `src/store/create-stock.store.ts`
   - `src/features/stock/components/create/individual-tab.tsx`
   - `src/features/stock/components/edit/edit-stock-modal.tsx`
   - `src/lib/stock-detail.ts`
   - `src/app/(dashboard)/stock/[imei]/device-detail.client.tsx`
3. Purchase decommission test suite:
   - `tests/migration/purchase-decommission/purchase-decommission.test.ts`

## Validation Run

- `bun test tests/migration/purchase-decommission/purchase-decommission.test.ts`
- `bun run migration:reference-scan`

Both commands passed in the Phase 3 implementation run.

## Gate Decision

- **GO for Phase 3 completion**: purchase decommission scope is implemented and zero unresolved purchase-linkage dependencies remain in active runtime paths.
- **NO-GO for Phase 4+ actions**: canonical `_n1` rename and compatibility-retirement steps remain out of scope for this gate.

## Open Risks

- Database migration execution is guarded and will fail if hidden dependencies are introduced between code freeze and deployment window.
- Historical/legacy SQL outside tracked runtime paths can still mention `phones.purchase` in older migrations by design; these are allowed only as archival history.
