# Phase 5 Closure Evidence

Date: 2026-02-26
Change: `retire-legacy-stock-tables-with-n1-report-migration`

## Scope

- Re-ran final Phase 5 validations after remediation batches 1 and 2.
- Re-checked compatibility-retirement readiness (`unresolved=0`).
- Executed approved Phase 5 destructive DB cleanup on `NEW_DATABASE_URL` using `psql` with SQL files.
- Captured preflight/postflight schema and compatibility-function evidence.

## Validation Evidence

1. `bunx tsc --noEmit`
   - PASS
2. `bun test tests/integration/migration/phase5-remediation-batch1.test.ts tests/integration/migration/phase5-remediation-batch2.test.ts tests/integration/migration/canonical-cutover-smoke.test.ts tests/integration/migration/compatibility-retirement-gate.test.ts`
   - PASS (`10` tests, `0` failed)
3. `bun run migration:reference-scan`
   - PASS (`purchase-references`: `56` matches, `0` unresolved; `n1-table-identifiers`: `210` matches, `0` unresolved)
4. `bun run migration:compat-audit`
   - PASS (`compatibility-references`: `122` matches, `0` unresolved)

## Phase 5 DB Execution Status

- Execution mode:
  - `psql "$NEW_DATABASE_URL" -v ON_ERROR_STOP=1 -f <sql-file>` for each step.
- Environment check (no secret output):
  - `hasDatabaseUrl=true`, `hasNewDatabaseUrl=true`, `different=false`.
  - `NEW_DATABASE_URL` and `DATABASE_URL` resolve to the same value in this environment; execution proceeded on explicit approval.
- Preflight (`phase5-preflight.sql`):
  - `phones.device_n1`, `phones.assignments_n1`, `phones.shipments_n1`, `phones.device_legacy`, `phones.assignment_legacy`, `phones.device`, `phones.assignment`, `phones.shipment` present.
  - `phones.purchase` absent.
- Gate update (`phase5-gate-update.sql`):
  - `UPDATE 8`.
- Migration execution (`prisma/migrations/20260226190000_phase5_compat_retirement/migration.sql`):
  - `DO`, `DROP FUNCTION` x3, `DROP VIEW` x3, `DROP TABLE` x2.
- Postflight (`phase5-postflight.sql`):
  - Compatibility relations absent: `device_n1`, `assignments_n1`, `shipments_n1`, `device_legacy`, `assignment_legacy`, `purchase`.
  - Canonical relations present: `phones.device`, `phones.assignment`, `phones.shipment`.
  - Compatibility KPI wrappers absent: `get_enhanced_kpis_source`, `get_enhanced_kpis_legacy`, `get_enhanced_kpis_canonical` (`0` rows).
- Outcome:
  - **Executed successfully**. Phase 5 destructive cleanup completed against `NEW_DATABASE_URL`.

## Endpoint Cleanup Outcome

- Already removed in remediation batch 1:
  - `GET /api/reports/phones` (`src/app/api/reports/phones/route.ts`)
- Additional high-confidence removal in this closure pass:
  - none identified

## Execution Artifacts

- `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/artifacts/phase5-preflight.sql`
- `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/artifacts/phase5-gate-update.sql`
- `prisma/migrations/20260226190000_phase5_compat_retirement/migration.sql`
- `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/artifacts/phase5-postflight.sql`
