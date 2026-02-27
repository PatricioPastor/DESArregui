# Phase 5 Remediation Batch 1 Evidence

Date: 2026-02-26
Change: `retire-legacy-stock-tables-with-n1-report-migration`
Batch goal: reduce unresolved compatibility consumers in assignments and reports surfaces while keeping runtime contracts stable.

## Scope Completed

- Migrated prioritized assignments routes (`src/app/api/assignments/**`) from legacy delegates to canonical delegates.
- Migrated reports KPI route and reports phones summary route to canonical-compatible reads without changing response contracts.
- Normalized assignment manual route naming to remove user-facing `_n1` wording.
- Removed unused legacy endpoint `src/app/api/reports/phones/route.ts` (no in-repo runtime consumers found).

## Validation Evidence

- `bunx next typegen`
  - PASS
- `bunx tsc --noEmit`
  - PASS
- `bun test tests/integration/migration/phase5-remediation-batch1.test.ts tests/integration/migration/canonical-cutover-smoke.test.ts`
  - PASS (6 tests)
- `bun run migration:reference-scan`
  - PASS (`n1-table-identifiers`: 173 matches, 0 unresolved)
- `bun run migration:compat-audit`
  - FAIL as expected for pending stock/model consumers (`compatibility-references`: 113 matches, 12 unresolved)

## Compatibility Audit Delta

- Before batch: `41` unresolved
- After batch: `12` unresolved
- Delta: `-29` unresolved

## Endpoint Cleanup Outcome

- Removed now: `GET /api/reports/phones` (`src/app/api/reports/phones/route.ts`)
  - Reason: no in-repo runtime fetch consumers and behavior duplicated by richer summary/report surfaces.
- Deferred candidates (insufficient confidence in this batch): none.

## Remaining Risks Blocking Task 5.2

- Remaining unresolved compatibility consumers are concentrated in stock/model internals:
  - `src/app/api/stock/route.ts`
  - `src/app/api/stock/[imei]/route.ts`
  - `src/app/api/models/[id]/route.ts`
  - `src/lib/stock-detail.ts`
- Destructive compatibility retirement stays blocked until unresolved compatibility consumers reach zero and approvals are in place.
