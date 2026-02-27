# Phase 5 stock-n1 MCP validation + hardening (2026-02-27)

## Scope

- Validate with MCP (Supabase DESAHUB-PROD) all schema columns used by `GET /api/stock-n1` primary list query and include graph.
- Identify likely `P2022` missing-column trigger(s) in environments where fallback path still activates.
- Harden fallback so non-`mine` responses preserve owner/assignment fields whenever schema supports them.

## MCP schema validation evidence

- Verified tables involved by primary path and includes:
  - `phones.device`
  - `phones.phone_model`
  - `phones.distributor`
  - `phones.assignment`
  - `phones.shipment`
  - `phones.soti_device`
  - `main_auth.user`
- Confirmed critical columns used in filters/select/includes are present in DESAHUB-PROD:
  - Device predicates/ordering fields (`owner_user_id`, `is_deleted`, `status`, `created_at`, `assigned_to`, `ticket_id`, `backup_distributor_id`, `created_by_user_id`)
  - User include fields (`id`, `name`, `image`)
  - Assignment/shipment include fields (`device_id`, `assignee_name`, `status`, `assigned_at`, `expects_return`, `expected_return_imei`, `leg`, `voucher_id`)
- Data-shape sanity from DESAHUB-PROD to ensure enrichment is materially relevant:
  - `active_devices=334`
  - `active_with_owner=16`
  - `active_with_assigned_to=315`
  - `active_with_created_by=13`
  - `assignments_active=315`

## Likely `P2022` trigger(s)

- DESAHUB-PROD currently matches the Prisma selection set, so no active missing-column mismatch was reproduced in this project.
- For environments where fallback still triggers, most likely drift points are:
  - `main_auth.user.image` (selected by `owner_user` include)
  - `phones.device.owner_user_id` (used by `mine=true` filter and owner relation)
- Hardening now captures Prisma `P2022` `meta.column` when present and surfaces it in safe observability outputs.

## Hardening changes applied

- Route fallback now enriches degraded records with:
  - assignment-derived fields (`asignado_a`, `ticket`, `assignments_count`, `last_assignment_at`, `raw.assignments`)
  - owner/creator-derived fields (`owner_user_id`, `owner_name`, `owner_image`, `created_by_user_id`, `created_by_name`)
- Enrichment is best-effort and only active when schema supports each relation/column.
- `mine=true` remains strict:
  - if fallback would remove `owner_user_id`, route still blocks with `503` (no broadened scope).

## Observability improvements

- Added missing-column extraction from Prisma `P2022` metadata.
- Added response header for fallback diagnostics:
  - `x-stock-n1-fallback-column: <column|unknown>`
- Added structured warning/error logs with sanitized missing-column names only (no row payloads, no PII).

## Coverage updates

- Updated `tests/integration/migration/phase5-stock-n1-hotfix.test.ts` to assert:
  - missing-column extraction and fallback-column observability header
  - presence of fallback relation enrichment path for owner/assignment preservation

## Validation commands

- `bunx tsc --noEmit`
- `bun test tests/integration/migration/phase5-stock-n1-hotfix.test.ts`
- `bun run migration:compat-audit`
- `bun run migration:reference-scan`
