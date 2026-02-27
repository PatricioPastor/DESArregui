# Phase 5 stock-n1 fallback sub-query hotfix (2026-02-27)

## Trigger

- Runtime report still showed `500` on `GET /api/stock-n1` under schema drift despite previous fallback hardening.
- Error class remained Prisma `P2022` in `prisma.device.findMany()` around list path fallback flow.

## Root cause

- Fallback recovery previously caught `P2022` only on the primary include query.
- A second `P2022` could still escape from fallback sub-queries (notably fallback `findMany` with residual relation predicates), causing hard `500`.
- Missing-column extraction relied mostly on `meta.column`, which can be absent depending on engine/message variant.

## Fix implemented

- Hardened fallback sanitization to remove owner relation search clauses (`owner_user`) from degraded `OR` filters.
- Wrapped fallback list sub-query in `P2022` guard; non-`mine` requests now degrade to controlled empty-result branch instead of hard `500`.
- Wrapped SOTI enrichment query in `P2022` guard to avoid secondary hard-fail during enrichment.
- Kept strict `mine=true` semantics unchanged: if `owner_user_id` predicate would be removed, route returns explicit blocked `503`.
- Expanded missing-column detection to include:
  - Prisma metadata variants (`meta.column`, `meta.target`, `meta.field_name`)
  - common message patterns when metadata is incomplete
  - safe fallback to `unknown` header value

## Regression coverage

- Updated `tests/integration/migration/phase5-stock-n1-hotfix.test.ts` to assert:
  - enhanced missing-column parsing helpers
  - fallback sub-query degradation guard path
  - relation-search sanitization markers
  - strict `mine=true` blocked fallback behavior remains present

## Validation log

- `bunx tsc --noEmit` -> pass
- `bun test tests/integration/migration/phase5-stock-n1-hotfix.test.ts` -> pass (`5`/`5`)
- `bun run migration:compat-audit` -> pass (`104` matches, `0` unresolved)
- `bun run migration:reference-scan` -> pass (`purchase` `58` matches `0` unresolved; `_n1` identifiers `97` matches `0` unresolved)
