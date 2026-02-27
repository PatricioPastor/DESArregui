# Phase 5 Gate: Compatibility Retirement and Final Acceptance

Date: 2026-02-26
Change: `retire-legacy-stock-tables-with-n1-report-migration`

Last remediation batch: `phase5-remediation-batch2` (2026-02-26)

## Scope Covered

- Compatibility-retirement dependency audit for views/wrappers and legacy table consumers.
- Guarded destructive migration for compatibility wrapper and legacy table retirement.
- Post-retirement safety validation suite for migration gate behavior.
- Final gate packet documenting GO/NO-GO disposition.

## Evidence Packet

1. Compatibility consumer audit script:
   - `scripts/migration/compatibility-retirement-audit.ts`
2. Guarded retirement migration:
   - `prisma/migrations/20260226190000_phase5_compat_retirement/migration.sql`
3. Retirement migration smoke test:
   - `tests/integration/migration/compatibility-retirement-gate.test.ts`
4. Phase checklist progress:
   - `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/tasks.md`
5. Batch 1 remediation evidence:
    - `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/artifacts/phase5-remediation-batch1.md`
6. Batch 2 remediation evidence:
   - `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/artifacts/phase5-remediation-batch2.md`
7. Phase 5 closure evidence:
   - `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/artifacts/phase5-closure.md`

## Validation Run

- `bunx tsc --noEmit`
- `bun test tests/integration/migration/phase5-remediation-batch1.test.ts tests/integration/migration/phase5-remediation-batch2.test.ts tests/integration/migration/canonical-cutover-smoke.test.ts tests/integration/migration/compatibility-retirement-gate.test.ts`
- `bun test tests/integration/migration/compatibility-retirement-gate.test.ts`
- `psql "$NEW_DATABASE_URL" -v ON_ERROR_STOP=1 -f openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/artifacts/phase5-preflight.sql`
- `psql "$NEW_DATABASE_URL" -v ON_ERROR_STOP=1 -f openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/artifacts/phase5-gate-update.sql`
- `psql "$NEW_DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260226190000_phase5_compat_retirement/migration.sql`
- `psql "$NEW_DATABASE_URL" -v ON_ERROR_STOP=1 -f openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/artifacts/phase5-postflight.sql`
- `bun run migration:reference-scan`
- `bun run migration:compat-audit`

Result:

- Type check passed.
- Focused migration/cutover integration suite passed (`10` tests, `0` failed).
- Migration gate test passed.
- Phase 5 preflight confirmed compatibility relations existed before cleanup; `phones.purchase` was already absent.
- Phase 5 gate update applied to `8` rows (`canonical/open/phase5`).
- Retirement migration executed successfully (`DROP FUNCTION` x3, `DROP VIEW` x3, `DROP TABLE` x2).
- Postflight confirmed compatibility relations and KPI wrappers were removed while canonical tables remain present.
- Reference scan passed (`purchase-references`: `56` matches, `0` unresolved; `n1-table-identifiers`: `210` matches, `0` unresolved).
- Compatibility audit passed (`compatibility-references`: `122` matches, `0` unresolved).

## Gate Decision

- **GO for Phase 5 destructive DB cleanup completion (task 5.2)**: migration executed successfully on `NEW_DATABASE_URL` with preflight/postflight evidence captured.
- **GO for archive readiness**: compatibility consumer remediation remains `0` unresolved and post-retirement validations are green.

## Open Risks

- `DATABASE_URL` and `NEW_DATABASE_URL` are still equal in this environment (`different=false`), so execution affected the shared configured target; this was run on explicit approval.
- The retirement migration intentionally blocks unless all `phones.migration_phase_gate_control` rows are canonical/open and marked `rollout_phase='phase5'`.

## Archive Readiness

- Archive preconditions are now satisfied: task 5.2 executed successfully and DB sanity checks are recorded.
