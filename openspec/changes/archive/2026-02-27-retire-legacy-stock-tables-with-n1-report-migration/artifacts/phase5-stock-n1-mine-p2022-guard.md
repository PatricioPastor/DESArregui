# Phase 5 stock-n1 mine P2022 guard (2026-02-27)

## Scope

- Diagnose why `GET /api/stock-n1?mine=true&owner_id=...` still raises Prisma `P2022` in drifted environments.
- Validate actual DESAHUB-PROD schema for involved tables via MCP.
- Implement a targeted route hardening that keeps debug unauth GET behavior and preserves strict mine scope semantics.

## Diagnosis

- The current GET handler always executes two `prisma.device.findMany` calls with assignment relation predicates (`assignments.some` / `assignments.none`) even when `search` is absent.
- In drifted environments, any missing column used by these predicates or by `mine` filtering can throw `P2022` before a response is produced.
- The failing request path (`mine=true`) depends on `phones.device.owner_user_id`; if that column is missing, the query fails and previous logic does not short-circuit safely.

## MCP validation evidence (DESAHUB-PROD)

- Tool: `SUPABASE-DESAHUB-PROD_list_tables` with schemas `phones`, `main_auth`.
- Tool: `SUPABASE-DESAHUB-PROD_execute_sql` on `information_schema.columns` for:
  - `phones.device`
  - `phones.assignment`
  - `phones.shipment`
  - `main_auth.user`
- Result summary:
  - `phones.device` includes `owner_user_id`, `assigned_to`, `created_at`, `updated_at`, `status`, `model_id`, `distributor_id`, `ticket_id`.
  - `phones.assignment` includes `device_id` and `status` needed for active assignment logic.
  - `phones.shipment` and `main_auth.user` expected columns are present.
- Conclusion:
  - DESAHUB-PROD currently matches expected schema, so reported `P2022` is consistent with environment drift rather than current production schema.

## Code changes

- `src/app/api/stock-n1/route.ts`
  - Added schema preflight checks using `information_schema.columns` for `phones.device` and `phones.assignment`.
  - Added strict guard: `mine=true` now returns `503` when `phones.device.owner_user_id` is missing (never broadens mine scope).
  - Avoided assignment split/join path unless `search` is present.
  - Replaced relation-based assignment filtering with two-step ID filtering for `search` path (`assignment.findMany` -> device `id in/notIn`).
  - Added dynamic device `select` based on existing columns to avoid selecting drifted fields.
  - Added missing-column response observability header: `x-stock-n1-fallback-column`.
  - Added `P2022` missing-column extraction fallback from Prisma metadata/message.

## Test coverage updates

- `tests/integration/migration/phase5-stock-n1-hotfix.test.ts`
  - Added assertions for:
    - conditional assignment split only when `search` exists,
    - explicit `mine=true` + missing `owner_user_id` guard (`503`),
    - missing-column observability header wiring.

## Validation run

- `bunx tsc --noEmit`
- `bun test tests/integration/migration/phase5-stock-n1-hotfix.test.ts`

Both commands completed successfully.
