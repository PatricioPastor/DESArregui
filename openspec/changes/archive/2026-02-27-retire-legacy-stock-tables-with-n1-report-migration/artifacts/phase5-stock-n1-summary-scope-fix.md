# Phase 5 stock-n1 summary scope fix (2026-02-27)

## Context

- Runtime report after DB-level pagination rollout for `GET /api/stock-n1`:
  - DB has ~315 active assignments.
  - UI badge showed `36 asignados`.
- Expected behavior:
  - Row list stays paginated.
  - Summary counters reflect the full filtered result scope, not just the returned page.

## Root Cause

- `src/app/api/stock-n1/route.ts` started returning paginated rows (`skip/take`) but did not return full-scope assignment/device counters.
- `src/features/stock-n1/components/stock-n1-dashboard.tsx` computed counters from `data` returned by `useFilteredStockData`.
- After pagination, `data` represented only one page, so badge counts became page-local.

## Implemented Fix

- API (`src/app/api/stock-n1/route.ts`): added full-scope `summary` in response, computed with the same `where` filter used for the paginated query:
  - `totalDevices`
  - `assignedDevices`
  - `activeAssignments`
  - `availableDevices`
  - `usedDevices`
  - `shippingDevices`
- Hook contract (`src/lib/types.ts`, `src/hooks/use-stock-data.ts`): added typed support for `summary` and `pagination`, plus `ownerId/page/limit` filter forwarding.
- UI (`src/features/stock-n1/components/stock-n1-dashboard.tsx`): switched badge/counter source to API `summary` with fallback to local page data, and added explicit copy:
  - `X asignaciones activas en Y dispositivos`
  - Sidebar label updated to `Dispositivos asignados` to separate device vs assignment semantics.

## Focused Tests

- Updated `tests/integration/migration/phase5-stock-n1-hotfix.test.ts` with assertions that:
  - `GET /api/stock-n1` returns `summary` + `pagination` contract fields.
  - API includes both `assignedDevices` and `activeAssignments` counters.
  - Stock N1 dashboard reads `summary` counters instead of deriving only from current page rows.

## Validation

- `bunx tsc --noEmit`
- `bun test tests/integration/migration/phase5-stock-n1-hotfix.test.ts`
