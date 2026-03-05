# Proposal: Stock SOTI Import

## Intent

Add a dedicated `SOTI` tab in Stock and a new SOTI ingestion pipeline that imports CSV exports into SOTI-owned tables, without relying on legacy SOTI tables as runtime source of truth.

## Goals

- Add `SOTI` tab in stock dashboard experience.
- Persist SOTI import records in dedicated tables.
- Enforce deterministic upsert identity on composite key.
- Reconcile active set on finalize while preserving history.
- Apply CSV normalization rules (phone fallback, Jira normalization).

## Non-Goals

- Refactoring legacy SOTI consumers outside this change.
- Replacing stock architecture beyond this new SOTI slice.
- Hard deletion of historical SOTI rows.

## Source

Reconstructed from Engram artifact `#203` (proposal, artifact-store mode).
