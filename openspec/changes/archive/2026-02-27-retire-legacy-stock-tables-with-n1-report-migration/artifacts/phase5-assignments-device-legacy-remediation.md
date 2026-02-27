# Phase 5 assignments device_legacy remediation (2026-02-27)

## Scope

- Remove the post-retirement runtime dependency on `phones.device_legacy` in `GET/POST /api/assignments` canonical device resolution.
- Preserve assignment route contract behavior after compatibility table retirement.
- Add regression guard coverage so quoted and unquoted `device_legacy` references are not reintroduced.

## Implemented changes

- `src/app/api/assignments/route.ts`
  - Replaced legacy fallback SQL (`phones."device_legacy"`) in `resolveCanonicalDeviceId`.
  - Kept canonical-first lookup by `device.id`.
  - Added canonical-safe fallback by `phones.device.imei` using the provided identifier.
- `tests/integration/migration/phase5-remediation-batch1.test.ts`
  - Added focused assertion that `src/app/api/assignments/route.ts` does not reference retired `device_legacy` runtime sources.

## Validation results

- `bunx tsc --noEmit` -> pass.
- `bun test tests/integration/migration/phase5-remediation-batch1.test.ts` -> pass (`3`/`3`).
- `bun run migration:compat-audit` -> pass (`107` matches, `0` unresolved).
- `bun run migration:reference-scan` -> pass (`purchase` `58` matches `0` unresolved; `_n1` identifiers `97` matches `0` unresolved).

## Outcome

Assignments route resolution no longer depends on retired `phones.device_legacy`, and focused migration regression coverage now blocks reintroduction of that dependency.
