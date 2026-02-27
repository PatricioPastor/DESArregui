# Phase 1 Gate: Read-Path Parity Hardening Evidence

Date: 2026-02-26
Change: `retire-legacy-stock-tables-with-n1-report-migration`

## Scope Covered

- Reports phones summary dual-read and canonical wrappers.
- KPI route dual-source support with home/report surface selection.
- Distributor aggregates dual-read safety with preserved `label` and `deviceCount` semantics.
- Home summary dependencies (`/api/stock?summary=true`, `/api/assignments?summary=true`, dashboard KPI fetch) switched to source-mode controls and parity capture.

## Evidence Packet

1. Read-path safety implementation:
   - `src/app/api/reports/phones/summary/route.ts`
   - `src/app/api/reports/kpis/route.ts`
   - `src/app/api/distributors/route.ts`
   - `src/app/api/stock/route.ts`
   - `src/app/api/assignments/route.ts`
   - `src/app/(dashboard)/page.tsx`
   - `src/hooks/use-kpi-data.ts`
2. Compatibility migration for reporting wrappers:
   - `prisma/migrations/20260226120000_phase1_reporting_dual_read/migration.sql`
3. Integration parity window tests:
   - `tests/integration/migration/parity-windows.test.ts`

## Validation Run

- `bun test src/lib/migration-controls.test.ts`
- `bun test tests/integration/migration/parity-windows.test.ts`
- `bun run migration:reference-scan`

All commands passed in the Phase 2 implementation run.

## Gate Decision

- **GO for Phase 2 completion**: parity hardening and evidence capture are implemented for in-scope read surfaces.
- **NO-GO for Phase 3+ actions**: purchase decommission and canonical rename steps remain out of scope for this gate.

## Open Risks

- Canonical-source parity depends on `device_n1`/`shipments_n1` runtime population quality in production windows.
- `phones.get_enhanced_kpis_canonical` currently aligns only stock sub-aggregate against canonical device tables; ticket-side parity still depends on shared ticket source.
