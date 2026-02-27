# Phase 4 Gate: Canonical Rename and Compatibility Window Evidence

Date: 2026-02-26
Change: `retire-legacy-stock-tables-with-n1-report-migration`

## Scope Covered

- Canonical rename cutover (`_n1` -> canonical, legacy -> `*_legacy`) with restart-safe handling.
- Compatibility-window preservation for legacy identifiers (`device_n1`, `assignments_n1`, `shipments_n1`).
- KPI compatibility wrappers kept available for rollback-safe read-path fallback.
- Canonical-cutover smoke coverage updated to enforce non-retirement guarantees.

## Evidence Packet

1. Canonical cutover migration (idempotent state handling + compatibility objects retained):
   - `prisma/migrations/20260226150000_phase3_canonical_table_rename/migration.sql`
2. Canonical cutover smoke tests:
   - `tests/integration/migration/canonical-cutover-smoke.test.ts`
3. Phase checklist progress:
   - `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/tasks.md`

## Validation Run

- `bun test tests/integration/migration/canonical-cutover-smoke.test.ts`
- `bun run migration:reference-scan`

Both commands passed during Phase 4 completion.

## Gate Decision

- **GO for Phase 4 completion**: canonical rename cutover is implemented and compatibility window remains active.
- **NO-GO for Phase 5 actions**: permanent compatibility retirement is explicitly blocked until final consumer-readiness and rollback-window approvals.

## Open Risks

- Hidden unmanaged SQL consumers can still rely on compatibility names; the phase5 dependency audit remains mandatory before cleanup.
- Any partial/manual DDL outside migration flow can create mixed rename states; migration now fails fast on inconsistent object kinds.
