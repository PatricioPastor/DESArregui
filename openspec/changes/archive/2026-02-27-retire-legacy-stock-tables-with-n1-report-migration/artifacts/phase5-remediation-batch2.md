# Phase 5 Remediation Batch 2 Evidence

Date: 2026-02-26
Change: `retire-legacy-stock-tables-with-n1-report-migration`
Batch goal: clear remaining compatibility consumers in stock/model/detail surfaces while keeping runtime contracts stable.

## Scope Completed

- Migrated `src/app/api/stock/route.ts` to canonical delegates for list, summary, and create flows.
- Migrated `src/app/api/stock/[imei]/route.ts` update/delete flows to canonical delegates.
- Migrated model usage guard in `src/app/api/models/[id]/route.ts` to canonical delegate.
- Migrated `src/lib/stock-detail.ts` device detail assembly to canonical delegates and canonical assignment/shipping mappings.
- Added focused regression guard: `tests/integration/migration/phase5-remediation-batch2.test.ts`.
- Updated migration reference scan allowlist for now-canonicalized stock detail and stock-by-imei surfaces.

## Validation Evidence

- `bunx tsc --noEmit`
  - PASS
- `bun test tests/integration/migration/phase5-remediation-batch1.test.ts tests/integration/migration/phase5-remediation-batch2.test.ts tests/integration/migration/canonical-cutover-smoke.test.ts`
  - PASS (8 tests)
- `bun run migration:reference-scan`
  - PASS (`purchase-references`: 54 matches, 0 unresolved; `n1-table-identifiers`: 201 matches, 0 unresolved)
- `bun run migration:compat-audit`
  - PASS (`compatibility-references`: 101 matches, 0 unresolved)

## Compatibility Audit Delta

- Before batch: `12` unresolved
- After batch: `0` unresolved
- Delta: `-12` unresolved

## Endpoint Cleanup Outcome

- Removed now: none (no high-confidence removals required for this batch).
- Candidate list (deferred): none identified with sufficient confidence in this remediation batch.

## Remaining Risks Blocking Task 5.2

- Compatibility consumers are now resolved in code scans; destructive retirement task 5.2 remains blocked by explicit phase approval and rollout coordination requirements.
