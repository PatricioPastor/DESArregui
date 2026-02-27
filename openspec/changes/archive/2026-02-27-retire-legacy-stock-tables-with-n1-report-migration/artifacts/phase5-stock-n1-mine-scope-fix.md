## Phase 5 stock-n1 mine scope fix (2026-02-27)

### Context

- Production-like behavior report: `GET /api/stock-n1?mine=true` returned degraded data when Prisma fallback activated from `P2022`.
- Existing fallback removed `owner_user_id` predicate unconditionally, which could silently broaden scope for `mine=true` requests.

### Root cause

- In `src/app/api/stock-n1/route.ts`, fallback sanitization dropped `owner_user_id` from query filters.
- When a `P2022` occurred, this allowed fallback queries to proceed without ownership filtering.
- Result: `mine=true` could return non-owned devices and lose owner/assignment-rich fields from fallback select.

### Fix implemented

- Added fallback sanitization metadata (`removedPredicates`) and mine-scope guard.
- If fallback would remove `owner_user_id` while `mine=true`, route now returns explicit `503` error and does not execute broadened fallback query.
- Existing fallback remains available for non-`mine` requests and still emits `x-stock-n1-fallback=missing-column`.

### MCP validation evidence (Supabase DESAHUB-PROD)

- Schema inspection confirms canonical table in use: `phones.device` exists and includes `owner_user_id`, `assigned_to`, `created_by_user_id`, `is_deleted`, `status`.
- Related tables confirmed: `phones.assignment` and `phones.shipment` present with expected assignment/shipping status fields.
- Data presence checks confirm mine-relevant data exists and is meaningful:
  - `active_devices=334`
  - `active_with_owner=16`
  - `active_with_assigned_to=315`
  - `active_with_created_by=13`
  - `assignments_active=315`

### Regression coverage

- Updated `tests/integration/migration/phase5-stock-n1-hotfix.test.ts` with explicit guard assertions:
  - detects mine-scope guard symbol/path
  - verifies explicit blocked-fallback message for `mine=true`
  - verifies explicit `503` status path

### Validation commands

- `bunx tsc --noEmit`
- `bun test tests/integration/migration/phase5-stock-n1-hotfix.test.ts`
- `bun run migration:compat-audit`
- `bun run migration:reference-scan`
