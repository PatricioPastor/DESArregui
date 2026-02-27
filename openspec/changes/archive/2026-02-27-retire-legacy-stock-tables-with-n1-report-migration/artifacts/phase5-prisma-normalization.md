# Phase 5 Prisma normalization evidence (2026-02-27)

## Scope

- Normalize Prisma schema naming to match post-phase5 DB reality (canonical tables only).
- Remove legacy Prisma models mapped to dropped legacy tables.
- Migrate runtime Prisma delegate usage from `_n1` names to canonical names.

## Implemented changes

- `prisma/schema.prisma`
  - Removed legacy Prisma models mapped to `phones.device_legacy` and `phones.assignment_legacy`.
  - Renamed canonical Prisma models/delegates to `device`, `assignment`, and `shipment` (mapped to canonical tables).
  - Normalized dependent relation fields (`assignments`, `shipments`, `devices`, `backup_devices`, `ownedDevices`, `createdDevices`).
- Runtime/API modules
  - Updated stock, assignment, report, distributor, model, and stock detail codepaths to canonical Prisma delegates/types.
  - Preserved API route contracts and migration source-mode headers.
- Migration checks/tests
  - Updated focused migration tests to assert removal of `_n1` delegate usage in runtime paths while preserving migration SQL assertions.
  - Updated compatibility audit pattern so canonical `prisma.device`/`prisma.assignment` usage is treated as expected post-retirement behavior.

## Validation results

- `bunx tsc --noEmit` -> pass.
- `bun test tests/integration/migration/canonical-cutover-smoke.test.ts tests/integration/migration/compatibility-retirement-gate.test.ts tests/integration/migration/phase5-remediation-batch1.test.ts tests/integration/migration/phase5-remediation-batch2.test.ts` -> pass (`10`/`10`).
- `bun run migration:compat-audit` -> pass (`101` matches, `0` unresolved).
- `bun run migration:reference-scan` -> pass (`purchase` `59` matches `0` unresolved; `_n1` identifiers `98` matches `0` unresolved).

## Outcome

Prisma naming is now normalized and canonical with the post-phase5 database state, and compatibility scans continue to pass with zero unresolved critical dependencies.
