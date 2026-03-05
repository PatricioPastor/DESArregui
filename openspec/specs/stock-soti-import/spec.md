# Stock SOTI Import Specification

## Purpose

Define the required behavior for introducing a `SOTI` stock tab and a CSV-driven SOTI import flow that writes to dedicated SOTI-owned tables, reconciles active status from the latest successful export, and preserves historical records without hard deletes.

## Requirements

### Requirement: SOTI Tab Availability in Stock

The system MUST expose a `SOTI` tab within the stock area and SHALL make SOTI inventory data accessible through this tab without depending on legacy SOTI tables as runtime source of truth.

#### Scenario: SOTI tab renders in stock navigation

- GIVEN a user can access the stock area
- WHEN the stock tabs are loaded
- THEN a `SOTI` tab MUST be present
- AND opening the `SOTI` tab MUST resolve data from the new SOTI import-backed model

#### Scenario: Legacy SOTI source is stale

- GIVEN legacy SOTI tables contain data that differs from new SOTI tables
- WHEN a user views the `SOTI` tab
- THEN the displayed SOTI inventory MUST reflect only the new SOTI tables
- AND legacy SOTI tables MUST NOT override the displayed source-of-truth data

### Requirement: Dedicated SOTI Persistence Model

The system MUST persist imported SOTI records in dedicated SOTI-owned tables and SHALL preserve import lineage needed for historical traceability.

#### Scenario: Import stores rows in SOTI-owned model

- GIVEN a valid SOTI CSV export is submitted
- WHEN import processing completes successfully
- THEN imported rows MUST be persisted in dedicated SOTI-owned tables
- AND import lineage for that run MUST remain attributable to the processed export

### Requirement: CSV Contract Validation and Field Normalization

The system MUST validate incoming CSV files against the import contract and SHALL reject files that do not satisfy required fields or structure.

#### Scenario: Contract-compliant CSV is normalized

- GIVEN a CSV file that matches required headers and structure
- WHEN the file is processed
- THEN field normalization MUST be applied, including phone fallback and Jira normalization rules

#### Scenario: Contract-invalid CSV is rejected

- GIVEN a CSV file with missing or invalid contract fields
- WHEN validation is executed
- THEN the import MUST fail with a contract error response
- AND no partial finalize state MUST be applied

### Requirement: Composite-Key Identity and Deterministic Upsert

The system MUST enforce row identity using the composite business key (`IMEI / MEID / ESN`, `Nombre de Dispositivo`) and SHALL perform deterministic upsert semantics for repeated records.

#### Scenario: Existing composite key is re-imported

- GIVEN an incoming row whose composite key already exists
- WHEN import upsert is executed
- THEN the existing record MUST be updated as the current state for that key
- AND duplicate active records for the same key MUST NOT be created

### Requirement: Finalize Active-Set Reconciliation

The system MUST treat each successful finalized import as the authoritative active set and SHALL soft-deactivate records absent from that latest successful import.

#### Scenario: Finalize deactivates absent records

- GIVEN previously active records exist in SOTI-owned tables
- WHEN a new import is finalized successfully
- THEN records not present in the finalized dataset MUST be marked inactive
- AND historical records MUST remain retained

### Requirement: Concurrency and Idempotency Safety

The system MUST protect SOTI import execution against concurrent finalize conflicts and SHALL provide idempotent replay protection for repeated sync tokens.

#### Scenario: Concurrent finalize attempt occurs

- GIVEN one finalize operation is already in progress
- WHEN another finalize request is received
- THEN the second request MUST be blocked or rejected by concurrency guardrails

#### Scenario: Replay request reuses sync token

- GIVEN a request reuses a previously processed sync token
- WHEN idempotency checks run
- THEN the system MUST short-circuit replay without duplicating finalize effects

### Requirement: Export Contract for Jira Asset Workflow

The system MUST provide a SOTI stock export aligned to the approved Jira asset workflow contract and SHALL apply normalized values required by that workflow.

#### Scenario: Export requested from SOTI stock workflow

- GIVEN SOTI and stock-derived data are available for export
- WHEN the Jira asset export is generated
- THEN the output MUST preserve the approved column contract
- AND value normalization (including distributor mapping and storage conversion) MUST be consistently applied

### Requirement: Historical Traceability Without Hard Deletes

The system MUST preserve historical SOTI records and import lineage without hard deletes so operational and audit traceability remain available over time.

#### Scenario: Record becomes inactive after reconciliation

- GIVEN a record is no longer present in the latest finalized import
- WHEN active-set reconciliation runs
- THEN the record MUST be soft-deactivated
- AND prior lineage/history MUST remain queryable
