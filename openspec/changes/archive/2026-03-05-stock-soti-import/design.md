# Design: Stock SOTI Import

## Technical Approach

Implement an additive, isolated vertical slice:

1. SOTI-owned persistence tables in `phones` schema.
2. Admin-only CSV import endpoint with validation, normalization, upsert, and finalize reconciliation.
3. Dedicated stock read endpoint consumed by a new `SOTI` tab in Stock dashboard.

## Key Decisions

- Keep SOTI source-of-truth decoupled from legacy `phones.soti_device`.
- Enforce composite-key identity (`IMEI / MEID / ESN` + `Nombre de Dispositivo`).
- Use soft deactivation for absent rows on finalize instead of hard delete.
- Add concurrency and idempotency guardrails for import finalization.

## Source

Reconstructed from Engram artifact `#208`.
