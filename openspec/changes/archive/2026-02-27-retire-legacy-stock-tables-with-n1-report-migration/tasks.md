# Tasks: retire-legacy-stock-tables-with-n1-report-migration

## Phase 1 - Discovery and Baseline

- [x] 1.1 Inventory runtime and schema dependencies for `purchase`, legacy tables, and `_n1` tables.
- [x] 1.2 Define threshold profiles and gate owner matrix for all migration surfaces.
- [x] 1.3 Implement source-mode resolver (`legacy | dual | canonical`) for migration surfaces.
- [x] 1.4 Implement parity evaluator utilities and evidence payload contract.
- [x] 1.5 Add parity evidence persistence (`phones.migration_parity_evidence`) and gate controls (`phones.migration_phase_gate_control`).
- [x] 1.6 Produce Phase 0 gate artifact with rollback drill evidence and dependency scan results.

## Phase 2 - Read Path Parity and Compatibility

- [x] 2.1 Add dual/canonical source support to reports phones summary route without response-shape changes.
- [x] 2.2 Add dual/canonical source support to KPI route for reports and home surfaces.
- [x] 2.3 Add dual/canonical source support to distributor aggregates preserving `label` and `deviceCount` semantics.
- [x] 2.4 Add source-mode parity instrumentation to home stock and shipping summary surfaces.
- [x] 2.5 Add reporting compatibility migration wrappers for KPI function contracts.
- [x] 2.6 Add integration parity-window tests for reports, KPIs, home, and distributor surfaces.
- [x] 2.7 Produce Phase 1 gate artifact with parity evidence and rollback readiness.

## Phase 3 - Purchase Decommission

- [x] 3.1 Remove `purchase` model and linked relation/column mappings from Prisma schema.
- [x] 3.2 Add guarded decommission migration to block drop when `purchase` linkage remains.
- [x] 3.3 Remove `purchase_id` usage from stock API create/update flows.
- [x] 3.4 Remove purchase linkage usage from stock create/edit/detail UI and store flows.
- [x] 3.5 Add purchase decommission migration test coverage and reference scan enforcement.
- [x] 3.6 Produce Phase 2 gate artifact with zero-linkage evidence.

## Phase 4 - Canonical Rename and Compatibility Window

- [x] 4.1 Implement canonical rename migration (`_n1` -> canonical names, legacy -> `*_legacy`) with restart-safe/idempotent state handling.
- [x] 4.2 Preserve compatibility objects (`device_n1`, `assignments_n1`, `shipments_n1`, KPI source wrappers) for rollback window support.
- [x] 4.3 Align Prisma mappings to canonical physical table names while retaining compatibility model access for transition routes.
- [x] 4.4 Keep API route contracts stable and source-mode observable during canonical cutover.
- [x] 4.5 Add canonical-cutover smoke tests covering rename intent, compatibility objects, and non-retirement guarantees.
- [x] 4.6 Produce Phase 4 gate artifact with cutover validation, rollback-window status, and NO-GO on permanent compatibility retirement.

## Phase 5 - Compatibility Retirement

- [x] 5.1 Verify zero critical consumers still depend on compatibility views/wrappers.
- [x] 5.2 Remove temporary compatibility objects and legacy table family after approvals.
- [x] 5.3 Run post-retirement regression suite and parity sanity checks.
- [x] 5.4 Produce final acceptance package and archive migration change.

Phase 5 status note (2026-02-26): consumer audit is implemented and executed; unresolved runtime compatibility consumers remain, so destructive cleanup (5.2) stays blocked until approvals and consumer remediation are complete.

Phase 5 remediation batch 1 (2026-02-26): assignments and report routes migrated off legacy Prisma delegates in prioritized surfaces (`src/app/api/assignments/**`, KPI route, phones summary route); compatibility unresolved consumer count reduced but not yet zero, so task 5.2 remains blocked.

Phase 5 remediation batch 2 (2026-02-26): stock/model/detail compatibility consumers migrated to canonical Prisma delegates in prioritized surfaces (`src/app/api/stock/route.ts`, `src/app/api/stock/[imei]/route.ts`, `src/app/api/models/[id]/route.ts`, `src/lib/stock-detail.ts`) with focused integration guard coverage; unresolved compatibility consumers are now expected to be zero pending validation runs, while task 5.2 remains blocked until explicit destructive-retirement approvals.

Phase 5 closure run (2026-02-26): final validations re-ran clean (`bunx tsc --noEmit`, focused migration/cutover integration tests, `bun run migration:reference-scan`, `bun run migration:compat-audit`) and compatibility unresolved remained `0` before DB execution.

Phase 5 DB execution retry (2026-02-26): executed with `psql` against `NEW_DATABASE_URL` using SQL files (`phase5-preflight.sql`, `phase5-gate-update.sql`, retirement migration, `phase5-postflight.sql`). Preflight confirmed compatibility objects existed; gate update applied to `8` rows; migration completed (functions/views/legacy tables dropped); postflight confirmed compatibility objects/functions absent and canonical tables (`phones.device`, `phones.assignment`, `phones.shipment`) remain. Post-execution validations passed (`migration:compat-audit` unresolved `0`, `122` matches; `migration:reference-scan` unresolved `0`, purchase `56` matches, n1 identifiers `210` matches). Environment check remained `different=false` for `DATABASE_URL` vs `NEW_DATABASE_URL`; execution proceeded with explicit approval.

Phase 5 normalization batch (2026-02-27): Prisma schema/delegate naming normalized to canonical post-retirement reality (`device`, `assignment`, `shipment`), legacy Prisma models for dropped tables removed (`device_legacy`, `assignment_legacy`), and runtime references migrated from `_n1` delegates/relations in stock/assignment/report surfaces while preserving route contracts. Validation reruns passed (`bunx tsc --noEmit`, focused migration integration tests, `migration:compat-audit` unresolved `0`, `101` matches; `migration:reference-scan` unresolved `0`, purchase `59` matches, n1 identifiers `98` matches).

Phase 5 hotfix batch (2026-02-27): `/api/stock-n1` list path includes guarded fallback for Prisma missing-column errors (`P2022`) with observability header `x-stock-n1-fallback=missing-column`, and now blocks `mine=true` fallback when it would remove `owner_user_id` filtering (returns explicit `503` instead of broadening scope). Added focused regression coverage in `tests/integration/migration/phase5-stock-n1-hotfix.test.ts`, plus MCP schema evidence in `artifacts/phase5-stock-n1-mine-scope-fix.md`.

Phase 5 MCP validation hardening pass (2026-02-27): validated Supabase DESAHUB-PROD schema coverage for `/api/stock-n1` primary include graph, hardened fallback to keep owner/assignment fields for non-`mine` requests when columns exist, and added explicit missing-column observability via `x-stock-n1-fallback-column` plus structured logs keyed by Prisma `P2022` meta.

Phase 5 stock-n1 fallback-subquery hotfix (2026-02-27): closed remaining `/api/stock-n1` `500` escape hatch by hardening fallback sub-query degradation for Prisma `P2022` in non-`mine` requests, preserving strict `mine=true` blocked behavior when `owner_user_id` cannot be honored, and extending missing-column extraction to metadata/message variants for `x-stock-n1-fallback-column` observability.

Phase 5 stock-n1 mine filter Batch B (2026-02-27): `GET /api/stock-n1` remains unauthenticated for debug mode and now supports `mine`, `owner_id`, `imei`, `search`, `page`, and `limit` with two-block filtering (`active assignment` block applies owner+imei+assigned_to search, `no active assignment` block applies owner+imei only), deterministic merge sort, and post-merge pagination. Added focused coverage for `mine=true` owner validation, owner filter wiring, and search scoping in `tests/integration/migration/phase5-stock-n1-hotfix.test.ts`; validation reruns passed (`bunx tsc --noEmit`, focused test file).

Phase 5 stock-n1 mine filter Batch C (2026-02-27): addressed remaining `P2022` risk for `/api/stock-n1?mine=true&owner_id=...` by adding schema preflight guards for `phones.device` / `phones.assignment`, enforcing explicit `503` when `owner_user_id` is unavailable (no mine-scope broadening), and avoiding assignment split/join logic when `search` is absent. Added missing-column observability header `x-stock-n1-fallback-column`, focused guard coverage in `tests/integration/migration/phase5-stock-n1-hotfix.test.ts`, and MCP schema evidence artifact `artifacts/phase5-stock-n1-mine-p2022-guard.md`.

Phase 5 stock-n1 Batch C production-ready pass (2026-02-27): re-enabled `GET /api/stock-n1` authz with `stock-viewer` role guard, aligned payload to stock dashboard inventory contract, moved list pagination to DB-level `count + skip/take` with bounded defaults (no full fetch by default), and tightened `mine=true` semantics to authenticated session scope with explicit `403` on owner mismatch. Added focused contract/auth/pagination assertions in `tests/integration/migration/phase5-stock-n1-hotfix.test.ts`; validations passed (`bunx tsc --noEmit`, focused test file, `migration:compat-audit`, `migration:reference-scan`) and evidence captured at `artifacts/phase5-stock-n1-batch-c-production-ready.md`.

Phase 5 stock-n1 summary scope fix (2026-02-27): resolved post-pagination metric drift where UI badges were derived from current page rows (`data`) instead of full filtered scope. `GET /api/stock-n1` now returns explicit `summary` counters (`assignedDevices`, `activeAssignments`, etc.) alongside paginated rows, stock-n1 dashboard badges consume those full-scope counters, and copy now distinguishes `dispositivos asignados` vs `asignaciones activas`. Added focused contract/UI assertions in `tests/integration/migration/phase5-stock-n1-hotfix.test.ts`; evidence captured at `artifacts/phase5-stock-n1-summary-scope-fix.md`.

Phase 5 stock-n1 category/IMEI consistency fix batch (2026-02-27): tightened `GET /api/stock-n1` filter contract with explicit `category` support (`NEW|USED|ASSIGNED`) and shared `effectiveWhere` for paginated list + total count, removed `shippingDevices` from endpoint summary, and fixed IMEI/search scope by removing assignment-split leakage path and adding exact `imei` matching. Stock N1 dashboard quick filters now expose only `Nuevos`, `Usados`, `Asignados`, forward category to API, and reset paging on category/search changes to avoid stale page artifacts. Focused contract assertions were expanded in `tests/integration/migration/phase5-stock-n1-hotfix.test.ts`; evidence captured at `artifacts/phase5-stock-n1-category-imei-pagination-fix.md`.

Post-verify remediation (2026-02-27): removed residual `phones."device_legacy"` runtime fallback from `src/app/api/assignments/route.ts` by switching canonical device fallback resolution to `phones.device` only (`id` then `imei`), added focused regression guard in `tests/integration/migration/phase5-remediation-batch1.test.ts`, and captured evidence at `artifacts/phase5-assignments-device-legacy-remediation.md`.
