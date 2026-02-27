# Reporting and KPIs Specification

## Purpose

Define expected Reports, Home, KPI, and distributor behavior during cutover to canonical stock naming (former `_n1` model), including parity acceptance, compatibility safety, and rollback criteria.

## Requirements

### Requirement: Reports Phones Coverage During Migration

The system MUST preserve business-equivalent outcomes for the Reports phones experience, including phones chart, stock forecast, and the four top widgets, when moving from legacy dependencies to canonical table names.

#### Scenario: Reports phones parity validation

- GIVEN baseline results from the legacy source are available
- WHEN Reports phones chart, stock forecast, and four top widgets are evaluated against canonical-source results
- THEN results MUST satisfy approved parity thresholds before default read-path cutover

#### Scenario: Reports phones parity failure

- GIVEN canonical-source report outputs are evaluated
- WHEN one or more report elements exceed approved parity thresholds
- THEN default read-path cutover MUST be blocked for the affected report scope

### Requirement: Home and KPI Continuity

The system MUST keep Home and KPI indicators behaviorally consistent during migration, and SHALL require parity acceptance before legacy dependencies are retired.

#### Scenario: Home and KPI cutover acceptance

- GIVEN Home and KPI outputs have passed parity checks
- WHEN canonical sources are activated for Home and KPI behavior
- THEN indicators MUST remain within approved parity thresholds

#### Scenario: Home/KPI regression after activation

- GIVEN canonical Home and KPI sources are active
- WHEN post-cutover monitoring detects parity threshold breach
- THEN the system MUST trigger rollback to the prior stable read path for the affected indicators

### Requirement: Distributor Aggregate Consistency

The system MUST preserve distributor-facing aggregate behavior when replacing legacy count dependencies with canonical-source counting behavior.

#### Scenario: Distributor aggregate parity

- GIVEN distributor aggregate baselines are defined
- WHEN canonical-source distributor aggregates are compared to baseline
- THEN results MUST meet approved parity thresholds before final legacy dependency retirement

#### Scenario: Missing distributor parity evidence

- GIVEN legacy dependency retirement is requested for distributor aggregates
- WHEN parity evidence is incomplete or unavailable
- THEN retirement approval MUST be denied until evidence is complete

### Requirement: Reporting Consumer Cutover Compatibility

The system MUST provide compatibility-safe read-path cutover for existing Reports, Home, KPI, and distributor consumers during migration to canonical table names, and SHALL keep fallback behavior available until cross-surface acceptance is complete.

#### Scenario: Existing reporting consumer during cutover window

- GIVEN cutover is in progress and compatibility window is open
- WHEN an existing consumer still uses pre-cutover read behavior
- THEN the consumer MUST continue to receive behaviorally compatible outputs
- AND canonical cutover progression MUST remain reversible

#### Scenario: Compatibility retirement before readiness

- GIVEN one or more reporting consumers are not validated on canonical behavior
- WHEN compatibility retirement is requested
- THEN retirement MUST be blocked until consumer readiness evidence is accepted

### Requirement: Unified Parity and Rollback Acceptance Criteria

The system MUST apply explicit acceptance criteria for parity and rollback across Reports, Home, KPIs, and distributor aggregates, and SHALL keep rollback actions executable at each migration phase.

#### Scenario: Cross-surface acceptance granted

- GIVEN Reports, Home, KPIs, and distributor aggregates each satisfy approved parity thresholds
- WHEN phase acceptance is evaluated
- THEN the phase MUST be marked eligible for progression
- AND rollback procedures for the next phase MUST be validated as executable

#### Scenario: Cross-surface acceptance denied

- GIVEN at least one covered surface fails parity or rollback readiness
- WHEN phase acceptance is evaluated
- THEN progression MUST be blocked
- AND the migration MUST remain on or return to a stable prior phase
