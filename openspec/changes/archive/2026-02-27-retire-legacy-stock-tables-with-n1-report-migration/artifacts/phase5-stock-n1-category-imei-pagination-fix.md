# Phase 5 stock-n1 category/IMEI/pagination consistency fix (2026-02-27)

## Context

- Production-like behavior showed mixed filter semantics in `GET /api/stock-n1` + Stock N1 dashboard:
  - Quick filters still included `En envio` when current UX expectation is `Nuevos`, `Usados`, `Asignados`.
  - Pagination could feel tied to another scope because UI category filtering happened after server pagination.
  - IMEI-focused searches could return unrelated records on page 1 and matching record on later pages.
  - Badge updates were not consistently aligned with active list filters.

## Root Causes

- API list `where` and category behavior were implicit; selected category was not part of server query contract.
- UI filtered categories client-side from already paginated rows (`data`), creating page/category mismatch artifacts.
- API `search` logic used assignment-split OR blocks that allowed non-matching records through when active assignment constraints were not met.
- Endpoint summary still included `shippingDevices`, which is now out of scope for this surface.

## Implemented Fix

- API (`src/app/api/stock-n1/route.ts`):
  - Added explicit `category` filter parsing (`NEW | USED | ASSIGNED`) via `normalizeCategoryValue`.
  - Introduced shared `effectiveWhere` and used it for both paginated `findMany` and `count` (pagination totals stay in same scope as list rows).
  - Kept strict auth/mine semantics (`stock-viewer`, session-bound owner guard).
  - Replaced IMEI filter with exact match (`equals`, case-insensitive) when `imei` query param is present.
  - Reworked `search` to standard multi-field OR semantics and removed assignment-split leakage path.
  - Removed `shippingDevices` from `summary` and added `newDevices` for quick-filter badge support.

- UI (`src/features/stock-n1/components/stock-n1-dashboard.tsx`):
  - Quick filters now only render `Nuevos`, `Usados`, `Asignados`.
  - Forward selected category to API (`category` filter) so DB pagination remains category-scoped.
  - Removed local post-pagination category slicing; uses API list scope directly.
  - Maintains page reset on filter changes (`debouncedSearch`, `sidebarCategory`, context/owner) to avoid stale pagination.

- Hook/types (`src/hooks/use-stock-data.ts`, `src/lib/types.ts`):
  - Added forwarding support for `category` and `imei` in `StockFilters`.
  - Updated summary typing to remove shipping dependency and include `newDevices`.

## Focused Tests

- Updated `tests/integration/migration/phase5-stock-n1-hotfix.test.ts` to lock:
  - category-aware shared `effectiveWhere` for count + list,
  - exact IMEI filter usage,
  - summary metric removal of `shippingDevices`,
  - quick-filter set excludes `En envio`,
  - page reset on category/search changes.

## Validation

- `bunx tsc --noEmit`
- `bun test tests/integration/migration/phase5-stock-n1-hotfix.test.ts`
- `bun run migration:compat-audit`
- `bun run migration:reference-scan`
