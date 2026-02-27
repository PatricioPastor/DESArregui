# Phase 0 Gate: Rollback Drill Evidence

Date: 2026-02-26
Change: `retire-legacy-stock-tables-with-n1-report-migration`

## Drill Objective

Validate that pre-cutover reporting and stock surfaces can stay rollback-safe by forcing resolver fallback to `legacy` mode without payload contract changes.

## Drill Steps Executed

1. Ran migration controls unit tests covering resolver fallback and parity utility behavior:
   - `bun test src/lib/migration-controls.test.ts`
2. Ran unresolved dependency gate scan:
   - `bun run migration:reference-scan`
3. Verified touched API surfaces now read source mode via resolver and keep response contracts:
   - `/api/reports/phones/summary`
   - `/api/reports/kpis`
   - `/api/stock`
   - `/api/assignments`

## Evidence

- Resolver fallback test confirms default mode remains `legacy` when no override is present.
- Resolver override test confirms per-surface override can force rollback path deterministically.
- Parity evaluator test confirms threshold pass/fail behavior is deterministic for gate decisions.
- Reference scan passed with no unresolved critical dependencies outside approved transition inventory.

## Gate Decision

- **GO for Phase 1 completion** (dependency inventory + compatibility foundation complete).
- **NO-GO for destructive actions** (table drops, canonical renames, compatibility retirement remain blocked until later phases).

## Open Risks

- Purchase-linked runtime references are still active by design until Phase 3 decommission tasks.
- `_n1` runtime dependencies remain active and tracked; canonical renames are explicitly deferred.
