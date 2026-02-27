## Phase 5 stock-n1 mine filter Batch B (2026-02-27)

### Scope

- Endpoint: `GET /api/stock-n1` only.
- Kept unauthenticated behavior intentionally for temporary debug iteration.
- Added query params: `mine`, `owner_id`, `imei`, `search`, `page`, `limit`.

### Behavior implemented

- Validation: when `mine=true`, `owner_id` is now required (returns `400` if missing).
- Block A (devices with active assignment): applies `owner_id` + IMEI substring + assigned-to search (`assigned_to` contains `search`).
- Block B (devices without active assignment): applies `owner_id` + IMEI substring only (no assigned-to search).
- Merges both blocks, enforces deterministic sort (`created_at DESC`, then `id DESC`), and paginates after merge.
- Response contract remains stable: `success`, `data`, optional `pagination`.

### Focused test updates

- Updated `tests/integration/migration/phase5-stock-n1-hotfix.test.ts` with assertions for:
  - `mine=true` without `owner_id` validation error path.
  - owner filter wiring when `mine=true` + `owner_id` is provided.
  - `search` applied only to active-assignment block.

### Validation commands

- `bunx tsc --noEmit`
- `bun test tests/integration/migration/phase5-stock-n1-hotfix.test.ts`

### MCP Supabase sample owner IDs for Postman

Query used:

```sql
select owner_user_id, count(*)::int as device_count
from phones.device
where owner_user_id is not null
  and coalesce(is_deleted, false) = false
group by owner_user_id
order by device_count desc, owner_user_id asc
limit 10;
```

Current sample output (non-PII IDs):

- `gjklKYgeD86V5kf8lAnBdv8Tuudd9oMz` -> `5`
- `LrILHpyv8MOE5iRPPUvjkFDAg1VqEDqi` -> `4`
- `PjBtLIm2wnT77hBzZ5PsFdIEcM9F6vg0` -> `3`
- `DsKNbCr1Bh8K6kdTydneUrPYC267SBZM` -> `2`
- `TDVE8SaWAHBp51NsqbOxjiCps1ChIl0U` -> `2`
