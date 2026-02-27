# Design: Canonicalize N1 Stock Tables and Decommission Purchase

## Technical Approach

This design treats current N1 tables as the canonical source of truth and standardizes names so `_n1` tables become the canonical contract names. The change is executed as a phased transition: parity and compatibility first, canonical renames second, destructive cleanup last.

The implementation keeps existing public API routes stable during cutover (`/api/stock`, `/api/stock-n1`, `/api/assignments`, `/api/reports/phones/summary`, `/api/reports/kpis`, `/api/distributors`) while progressively unifying internals onto the canonical model.

Related specs:
- `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/specs/inventory-migration/spec.md`
- `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/specs/reporting-and-kpis/spec.md`

## Architecture Decisions

### Decision: N1 model is authoritative and becomes canonical naming

**Choice**: Promote N1 entities to canonical names by renaming tables so `device_n1`, `assignments_n1`, and `shipments_n1` become the standard names (`device`, `assignment`, `shipment`) after cutover.
**Alternatives considered**: Keep `_n1` suffix permanently; keep dual table families indefinitely.
**Rationale**: User decision is explicit that N1 is the source of truth and naming must be standardized.

### Decision: Compatibility is delivered through endpoint continuity plus schema compatibility objects

**Choice**: Keep existing endpoints and payloads stable; during canonicalization create temporary compatibility objects (views/wrappers) for legacy table/function references.
**Alternatives considered**: Big-bang endpoint replacement; immediate consumer rewrite.
**Rationale**: Current consumers are spread across hooks, dashboard pages, and report components and cannot be migrated atomically without high break risk.

### Decision: Transition is phase-gated with explicit parity evidence

**Choice**: Progression gates require persisted parity evidence across Reports/Home/KPIs/distributors plus rollback readiness proof.
**Alternatives considered**: Manual checks and informal approvals.
**Rationale**: Specs require blocking progression when parity evidence is incomplete or rollback is not executable.

### Decision: `purchase` is fully decommissioned in this change

**Choice**: Drop `phones.purchase` and remove all linked columns/references (`purchase_id`, relation fields, UI/API usage) across operational and reporting paths.
**Alternatives considered**: Functional deprecation only; defer physical drop.
**Rationale**: User decision is explicit: `purchase` must be dropped and linked references removed.

### Decision: Function contract stability during read cutover

**Choice**: Keep `phones.get_enhanced_kpis` external contract stable while its internals become canonical-source aware.
**Alternatives considered**: Replace function with new route-only aggregation in one step.
**Rationale**: `src/app/api/reports/phones/summary/route.ts` and `src/hooks/use-phones-summary.ts` depend on this contract; stability reduces cutover blast radius.

## Data Flow

### Reporting and home surfaces during compatibility window

```text
Reports/Home UI
  -> existing hooks/components
  -> existing API routes (same URLs)
      -> source resolver (legacy | dual | canonical)
      -> run selected path(s)
      -> if dual: compare outputs and persist parity evidence
  -> unchanged response schema to consumer
```

### Canonical table-name transition

```text
Before rename:
  legacy tables: device / assignment
  canonical data: device_n1 / assignments_n1 / shipments_n1

Canonicalization window:
  rename legacy tables -> *_legacy
  rename *_n1 tables -> canonical names
  create temporary compatibility views/wrappers for old references

After lock-in:
  canonical only for read/write paths
  remove temporary compatibility objects
```

### Purchase decommission flow

```text
Current state: stock create/edit/detail paths still accept or display purchase linkage
  -> remove API and UI dependency on purchase_id
  -> remove schema-level relations and columns
  -> drop phones.purchase table
  -> validate no runtime/reference regressions
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `openspec/changes/retire-legacy-stock-tables-with-n1-report-migration/design.md` | Modify | Align design with canonical N1 naming objective and full `purchase` decommission. |
| `prisma/schema.prisma` | Modify | Canonical model naming after `_n1` promotion; remove `purchase` model and linked relation fields/columns. |
| `prisma/migrations/<ts>_phase0_parity_controls/migration.sql` | Create | Add migration control and parity evidence storage used by phase gates. |
| `prisma/migrations/<ts>_phase1_reporting_dual_read/migration.sql` | Create | Add canonical-aware compatibility wrappers for reporting function contracts. |
| `prisma/migrations/<ts>_phase2_purchase_decommission/migration.sql` | Create | Remove `purchase` dependencies and drop `phones.purchase` with guarded sequencing. |
| `prisma/migrations/<ts>_phase3_canonical_table_rename/migration.sql` | Create | Rename `_n1` tables to canonical names, move legacy tables to `*_legacy`, create temporary compatibility objects. |
| `prisma/migrations/<ts>_phase4_compat_cleanup/migration.sql` | Create | Remove temporary compatibility views/wrappers and legacy tables after acceptance gates. |
| `src/app/api/reports/phones/summary/route.ts` | Modify | Keep route contract stable while enabling dual-read/canonical sourcing and parity instrumentation. |
| `src/app/api/reports/kpis/route.ts` | Modify | Add dual-read parity instrumentation and canonical sourcing without payload changes. |
| `src/app/api/distributors/route.ts` | Modify | Keep response shape and migrate aggregate source with parity evidence support. |
| `src/app/api/stock/route.ts` | Modify | Compatibility path to canonical source; remove `purchase_id` validation/usage. |
| `src/app/api/stock/[imei]/route.ts` | Modify | Keep detail/update contract; remove purchase linkage handling and align to canonical tables. |
| `src/app/api/stock-n1/route.ts` | Modify | Transitional alias behavior to canonical stock internals; remove `purchase_id` dependency. |
| `src/app/api/assignments/route.ts` | Modify | Keep `summary=true` contract while supporting source transition and parity instrumentation. |
| `src/lib/stock-detail.ts` | Modify | Remove purchase detail dependency from device detail assembly during decommission. |
| `src/store/create-stock.store.ts` | Modify | Remove `purchase_id` from creation flow payloads. |
| `src/features/stock/components/create/individual-tab.tsx` | Modify | Remove purchase input from create UI paths. |
| `src/features/stock/components/edit/edit-stock-modal.tsx` | Modify | Remove purchase edit field and payload usage. |
| `src/app/(dashboard)/stock/[imei]/device-detail.client.tsx` | Modify | Remove purchase detail rendering block. |

## Interfaces / Contracts

### Source-resolution contract

```ts
export type MigrationSurface =
  | "reports_phones"
  | "reports_kpis"
  | "home_kpis"
  | "home_stock"
  | "home_shipping"
  | "distributors"
  | "stock"
  | "assignments";

export type SourceMode = "legacy" | "dual" | "canonical";
```

### Parity evidence contract (phase-gate artifact)

```ts
export interface ParityEvidence {
  surface: MigrationSurface;
  periodStart?: string;
  periodEnd?: string;
  baseline: Record<string, number>;
  candidate: Record<string, number>;
  delta: Record<string, number>;
  deltaPct: Record<string, number>;
  thresholdProfile: "reports" | "home" | "kpis" | "distributors";
  passed: boolean;
  createdAt: string;
}
```

### Compatibility commitments during cutover

- `GET /api/reports/phones/summary` keeps JSON structure consumed by `src/hooks/use-phones-summary.ts` and `src/app/(dashboard)/reports/phones/page.tsx`.
- `GET /api/reports/kpis` keeps current KPI field names used by `src/hooks/use-kpi-data.ts` and `src/app/(dashboard)/page.tsx`.
- `GET /api/distributors` keeps `label` and `deviceCount` semantics used by create/edit stock flows.
- `GET /api/stock` and `GET /api/assignments?summary=true` keep compatibility for home/dashboard consumers while internals transition.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | Source resolver and parity evaluator | Deterministic tests for `legacy`/`dual`/`canonical` behavior and threshold edge cases. |
| Integration | Reports phones parity | Compare canonical vs baseline for chart, forecast, and four top widgets in fixed periods. |
| Integration | Home + KPI parity | Compare home KPI and stock/assignment summary outputs against approved baseline windows. |
| Integration | Distributor parity | Validate aggregate counts and response shape compatibility through cutover. |
| Migration | Canonical rename safety | Validate compatibility objects, foreign-key continuity, and no missing relation paths after rename. |
| Migration | Purchase decommission | Verify zero residual `purchase` references before and after table drop. |
| E2E | Dashboard/report continuity | Validate key pages continue working with existing URLs and payload contracts. |

## Migration / Rollout

### Phase 0 - Discovery and baseline

- Inventory all consumers of legacy names, `_n1` names, and `purchase` dependencies.
- Define threshold profiles and gate owners for Reports/Home/KPIs/distributors.
- Enable parity evidence persistence and source-mode control.

**Go/No-Go gate**
- GO: dependency inventory complete, threshold profiles approved, rollback drill validated.
- NO-GO: unknown dependency or rollback drill failure.

### Phase 1 - Read-path parity and compatibility hardening

- Run dual-read where required (`/api/reports/phones/summary`, `/api/reports/kpis`, `/api/distributors`, home summary dependencies).
- Persist parity evidence per surface and period.
- Keep consumer contracts unchanged.

**Go/No-Go gate**
- GO: all required surfaces pass parity for agreed windows and rollback remains executable.
- NO-GO: threshold breach or missing evidence.

### Phase 2 - Purchase decommission (full)

- Remove `purchase_id` input/validation/display from API and UI flows.
- Remove schema relations/columns linked to `purchase` in active and compatibility paths.
- Drop `phones.purchase` once zero-reference checks pass.

**Go/No-Go gate**
- GO: zero runtime/reference dependency on `purchase`, smoke checks pass.
- NO-GO: any active linkage remains.

### Phase 3 - Canonical table-name standardization

- Rename legacy tables to `*_legacy`.
- Rename `_n1` tables to canonical standard names.
- Add temporary compatibility views/wrappers for old identifiers (`*_n1` and legacy references still in migration window).

**Go/No-Go gate**
- GO: API/function contracts pass smoke + parity checks on canonical names.
- NO-GO: unresolved dependency or incompatibility.

### Phase 4 - Canonical lock-in and compatibility retirement

- Retire temporary compatibility objects after consumer migration evidence is complete.
- Remove legacy table family after rollback window closes and approvals are recorded.

**Go/No-Go gate**
- GO: zero critical consumers on compatibility paths and rollback window completion acknowledged.
- NO-GO: active dependency or incomplete acceptance package.

## Rollback Strategy

- **Before Phase 3 completion**: switch affected surfaces back to `legacy` mode using source controls; keep endpoint contracts unchanged.
- **After Phase 3 (rename) but before Phase 4 cleanup**: rely on compatibility views/wrappers and preserved `*_legacy` tables for fallback.
- **Destructive-step policy**: no irreversible cleanup without completed parity evidence, rollback validation, and explicit gate approval.
- **Operational requirement**: each phase includes rollback drill evidence as a required artifact.

## Schema / Function / API Transition Sequencing

1. Add parity-control artifacts and source-resolution controls.
2. Make reporting and KPI/distributor read paths dual-source capable while preserving contracts.
3. Remove `purchase` usage in API/UI/schema and drop `phones.purchase`.
4. Execute table-name canonicalization (`_n1` -> canonical names, legacy -> `*_legacy`).
5. Keep temporary compatibility objects until all consumers are confirmed migrated.
6. Retire compatibility objects and legacy tables after final gate approval.

## Parity Evidence Model

- Coverage surfaces: Reports phones, Home KPI cards, Home stock summary, Home shipping summary, KPI endpoint, distributor aggregates.
- Evidence dimensions: baseline value, candidate value, absolute delta, percent delta, threshold profile, pass/fail, timestamp, operator.
- Acceptance artifact: phase packet containing parity records, sign-off, rollback drill result, and unresolved-risk log.
- Progression rule: no phase progression without complete evidence for all in-scope surfaces.

## Purchase Decommission Design Details

- Remove schema artifacts: `purchase` table, `distributor.purchases`, `device.purchase_id`, `device_n1.purchase_id`, and corresponding relation fields.
- Remove runtime API dependencies: stock create/update endpoints no longer accept or validate purchase linkage.
- Remove UI dependencies: stock create/edit/detail components stop collecting or showing purchase data.
- Remove downstream helper coupling: stock detail aggregation no longer selects purchase joins.
- Destructive sequencing: drop is executed only after automated reference scans and compatibility tests are green.

## Open Questions

- [ ] Final numeric parity thresholds per metric/surface must be ratified before Phase 1 completion.
- [ ] Exact rollback hold-window duration between Phase 3 and Phase 4 requires owner sign-off.
- [ ] Gate approver matrix (engineering/product/operations) needs final assignment.
