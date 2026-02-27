## Phase 5 stock-n1 Batch C production-ready pass (2026-02-27)

### Scope

- Endpoint: `GET /api/stock-n1` only.
- Re-enabled authenticated and authorized access using project route guard conventions.
- Preserved existing `POST /api/stock-n1` and other stock-n1 routes unchanged.

### Behavior implemented

- `GET /api/stock-n1` now uses role-protected access (`stock-viewer`).
- Response contract is aligned to the stock UI inventory shape (including model, owner, assignment, and raw assignment summary fields used by dashboard components).
- `mine=true` now resolves strictly to `session.user.id`; if `owner_id` is provided and does not match the authenticated user, route returns `403`.
- `imei`, `status`, and assignment-aware `search` filters are retained with guardrails.
- Pagination now runs at DB level (`count` + `skip`/`take`) with bounded defaults (`page=1`, `limit=50`, max `100`) so requests without pagination params do not fetch all rows.
- Prisma `P2022` handling remains explicit via `503` and `x-stock-n1-fallback-column`, avoiding silent broad fallback data.

### Focused tests updated

- Updated `tests/integration/migration/phase5-stock-n1-hotfix.test.ts` to cover:
  - auth/role guard presence on GET,
  - bounded default DB pagination,
  - strict `mine` behavior bound to session user,
  - UI response contract fields required by stock dashboard usage.

### Validation commands

- `bunx tsc --noEmit`
- `bun test tests/integration/migration/phase5-stock-n1-hotfix.test.ts`
- `bun run migration:compat-audit`
- `bun run migration:reference-scan`

### Validation result

- Type-check passed.
- Focused stock-n1 test suite passed (`8` tests).
- Migration compatibility audit passed (`0` unresolved).
- Migration reference scan passed (`0` unresolved).
