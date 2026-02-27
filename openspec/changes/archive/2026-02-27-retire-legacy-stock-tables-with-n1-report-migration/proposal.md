# Proposal: Canonicalize N1 Stock Tables and Retire Legacy Purchase Dependencies

## Intent

Standardize the stock domain on the N1 data model by making N1 tables the canonical source and renaming them to the standard table names (removing `_n1`). This removes naming ambiguity, ends dual-model operations, and gives product and engineering teams one clear data contract.

In parallel, fully decommission `purchase` (confirmed empty) and remove all linked columns so no active flow depends on it. The migration prioritizes consumer safety: compatibility and parity first, irreversible cleanup last.

## Scope

### In Scope
- Canonicalize stock/assignment table naming so current N1 tables lose `_n1` suffix and become the standard canonical tables.
- Migrate report, KPI, dashboard, and distributor consumers to canonical names with parity validation against pre-cutover baselines.
- Provide a compatibility/cutover strategy so current API and query consumers continue to function during rollout windows.
- Fully decommission `purchase` by dropping the table and removing linked columns/references across operational and reporting paths.
- Define phase gates for cutover: dependency inventory, parity thresholds, communication checkpoints, rollback windows, and final drop criteria.

### Out of Scope
- UI redesign for reports, dashboards, or distributor experiences.
- New business workflows unrelated to stock/assignment canonicalization.
- One-step removal of all legacy compatibility layers without staged validation.
- Historical data remodeling beyond what is required for safe rename/cutover and `purchase` removal.

## Approach

Use a phased canonicalization and decommission plan:

1. Build a full dependency map for all consumers using legacy names, `_n1` names, and `purchase`-linked columns.
2. Introduce compatibility paths and communication windows so consumers can move safely to canonical names.
3. Execute read-path cutover first (reports/KPIs/dashboard/distributor) with parity gates, then complete write/operational cutover.
4. Promote renamed canonical tables as the default contract and retire temporary compatibility surfaces after stability window.
5. Decommission `purchase` completely (table and linked columns) only after dependency checks pass and cutover evidence is complete.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Canonical model naming is standardized around former N1 tables; `purchase` and linked references are removed. |
| `prisma/migrations/*` | Added/Modified | Phased migration sequence for canonical renames, compatibility windows, and final `purchase` decommission. |
| `src/app/api/stock-n1/route.ts` | Modified/Retired | N1-specific naming path is transitioned into canonical stock contract and then retired as a distinct path. |
| `src/app/api/stock/route.ts` | Modified | Stock API is aligned to canonical tables while preserving transition compatibility for existing consumers. |
| `src/app/api/assignments/route.ts` | Modified | Assignment flows move to canonical table names with transition-safe behavior. |
| `src/app/api/reports/phones/summary/route.ts` | Modified | Report summary switches to canonical table names with parity checks. |
| `src/app/api/reports/kpis/route.ts` | Modified | KPI aggregates are migrated to canonical sources with monitored parity thresholds. |
| `src/app/(dashboard)/page.tsx` | Modified | Dashboard metrics continue to match agreed baselines during and after cutover. |
| `src/app/api/distributors/route.ts` | Modified | Distributor counts move to canonical paths and stay stable during compatibility window. |

## Constraints

- Business behavior and key metrics must remain stable throughout canonicalization.
- Consumer compatibility must be preserved during transition windows to avoid breaking current integrations.
- Destructive schema steps (drop/remove) occur only after verified non-usage and rollback-safe checkpoints.
- Migration execution must minimize lock risk and avoid uncontrolled downtime.

## Risk Posture

Risk level is **Medium-High** due to broad naming-contract impact across APIs, reports, and schema dependencies; mitigated through phased cutover, compatibility windows, and strict decommission gates.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Consumer breakage from `_n1` to canonical name transition | High | Time-boxed compatibility strategy, staged consumer migration, and explicit readiness sign-off before hard cutover. |
| Report/KPI/dashboard drift during source transition | Med | Dual-source parity checks with acceptance thresholds and controlled rollout gates. |
| Undiscovered dependencies on `purchase` or linked columns | High | Dependency inventory plus usage verification before any drop/remove action. |
| Rollback complexity after partial canonicalization | Med | Phase-based checkpoints with reversible steps before final destructive operations. |
| Cross-team cutover coordination misses | Med | Published cutover plan, owner matrix, and communication checkpoints per phase. |

## Rollout Sequencing

1. **Phase 0 - Discovery and Baseline**: Inventory consumers and define parity/stability baselines.
2. **Phase 1 - Compatibility Preparation**: Introduce temporary compatibility surfaces and announce migration windows.
3. **Phase 2 - Read Cutover**: Move reports/KPIs/dashboard/distributor reads to canonical table names and validate parity.
4. **Phase 3 - Write/Operational Cutover**: Align stock/assignment operational paths to canonical names and monitor stability.
5. **Phase 4 - Canonical Lock-In**: Remove temporary compatibility layers once consumer migration is confirmed.
6. **Phase 5 - `purchase` Decommission**: Drop `purchase` and remove all linked columns/references after final non-usage verification.

## Rollback Plan

If parity, stability, or consumer readiness fails in any phase, pause progression and revert affected consumers to the last validated compatibility state. Keep destructive actions (`purchase` drop and linked-column removals) gated behind final verification and rollback-safe windows. Resume only after gap remediation and renewed phase approval.

## Dependencies

- Confirmed consumer inventory across APIs, jobs, and reporting paths using legacy, `_n1`, and `purchase` references.
- Agreed parity thresholds for reports, KPIs, dashboard, and distributor metrics.
- Product and engineering owner sign-off for each phase gate and cutover communication plan.
- Scheduled low-risk execution windows for schema-impacting transitions and decommission steps.

## Success Criteria

- [ ] Former N1 tables are the only canonical stock/assignment tables and use standardized names without `_n1` suffix.
- [ ] Report, KPI, dashboard, and distributor outputs remain within agreed parity thresholds through cutover.
- [ ] Existing consumers migrate via compatibility strategy with no critical production breakage.
- [ ] `purchase` is fully decommissioned: table dropped and all linked columns/references removed.
- [ ] Final validation package documents dependency clearance, cutover evidence, and rollback readiness at each phase.
