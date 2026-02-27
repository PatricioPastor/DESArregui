# Phase 5 stock-n1 hotfix evidence (2026-02-27)

## Trigger

- Local smoke regression after Prisma normalization:
  - `GET /api/stock-n1?mine=true` returned `500`.
  - Prisma raised `P2022` (missing column) during `prisma.device.findMany` execution in `src/app/api/stock-n1/route.ts`.

## Root cause diagnosis

- `stock-n1` list endpoint used a strict Prisma include path that assumes full post-normalization schema parity.
- On schema-drifted local databases, Prisma query execution can fail with missing-column errors before response mapping.
- `/stock` page behavior is expected to call `/api/stock-n1`:
  - `src/app/(dashboard)/stock/page.tsx` renders `StockN1Dashboard`.
  - `src/features/stock-n1/components/stock-n1-dashboard.tsx` uses `useFilteredStockData(..., "/api/stock-n1")` and sends `{ mine: true }` in "Asignados a mi" context.

## Implemented fix

- Added guarded fallback in `src/app/api/stock-n1/route.ts` for Prisma missing-column errors (`P2022`) on list retrieval.
- Primary query path remains unchanged when schema is aligned.
- Fallback path uses minimal-safe select contract and sanitized `where` conditions (drops `owner_user_id` predicate if schema is drifted) while preserving response contract fields.
- Added response observability header when fallback is used:
  - `x-stock-n1-fallback: missing-column`

## Regression coverage

- Added `tests/integration/migration/phase5-stock-n1-hotfix.test.ts` to verify:
  - `/stock` remains wired to `/api/stock-n1` and mine context still issues `mine=true` behavior.
  - `stock-n1` route contains missing-column fallback guard and observability marker.

## Validation log

- `bunx tsc --noEmit` -> pass
- `bun test tests/integration/migration/phase5-stock-n1-hotfix.test.ts` -> pass (`2`/`2`)
- `bun run migration:compat-audit` -> pass (`104` matches, `0` unresolved)
- `bun run migration:reference-scan` -> pass (`purchase` `58` matches `0` unresolved; `_n1` identifiers `97` matches `0` unresolved)
