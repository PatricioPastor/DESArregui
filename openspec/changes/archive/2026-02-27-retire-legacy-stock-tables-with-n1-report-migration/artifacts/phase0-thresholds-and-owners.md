# Phase 0 Threshold Profiles and Gate Owners

Date: 2026-02-26
Change: `retire-legacy-stock-tables-with-n1-report-migration`

## Threshold Profiles

| Profile | Scope | Default Max Delta % | Notes |
|---|---|---:|---|
| `reports` | Reports phones chart, stock forecast, top widgets | 2.0% | Trend-level surfaces tolerate small drift during dual-read. |
| `kpis` | `/api/reports/kpis` aggregate payload | 1.0% | KPI cards require tighter tolerance. |
| `home` | Home KPI, stock summary, shipping summary | 1.0% | Dashboard cards and summary counters are operator-facing. |
| `distributors` | Distributor aggregate counts and labels | 0.5% | Count mismatches are highly visible in stock workflows. |

Rule: any metric exceeding threshold blocks phase progression for the affected surface.

## Surface-to-Owner Matrix

| Surface | Threshold Profile | Gate Owner | Backup Owner |
|---|---|---|---|
| `reports_phones` | `reports` | Reports Engineering Lead | Product Analytics Lead |
| `reports_kpis` | `kpis` | Reports Engineering Lead | Dashboard Engineering Lead |
| `home_kpis` | `home` | Dashboard Engineering Lead | Product Operations Lead |
| `home_stock` | `home` | Dashboard Engineering Lead | Stock Engineering Lead |
| `home_shipping` | `home` | Dashboard Engineering Lead | Stock Operations Lead |
| `distributors` | `distributors` | Stock Engineering Lead | Stock Operations Lead |
| `stock` | `home` | Stock Engineering Lead | Platform Engineering Lead |
| `assignments` | `home` | Stock Engineering Lead | Platform Engineering Lead |

## Gate Ownership Expectations

- Gate owners approve parity windows for their surface before source-mode default changes.
- Backup owners approve rollback execution evidence when primary owner is unavailable.
- Any unresolved critical dependency in reference scans forces NO-GO regardless of parity pass state.

## Data Contract

- Control records persist in `phones.migration_phase_gate_control`.
- Parity records persist in `phones.migration_parity_evidence`.
- Runtime source mode resolver uses `legacy | dual | canonical` and defaults to `legacy`.
