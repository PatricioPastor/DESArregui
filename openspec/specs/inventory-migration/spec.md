# Inventory Migration Specification

## Purpose

Define the required behavior for standardizing stock and assignment tables so former `_n1` tables become the canonical table names, while preserving consumer compatibility during cutover and fully decommissioning `purchase`.

## Requirements

### Requirement: Canonical Table Name Standardization

The system MUST treat former `_n1` stock and assignment tables as the authoritative data model and SHALL standardize names by removing the `_n1` suffix so canonical table names map to that model.

#### Scenario: Canonical rename is approved

- GIVEN dependency inventory and pre-cutover checks are complete
- WHEN canonical table naming is applied
- THEN former `_n1` tables MUST become the canonical table names
- AND canonical stock and assignment behavior MUST resolve to those standardized names

#### Scenario: Rename would break unresolved dependencies

- GIVEN unresolved dependencies still require pre-standardization table names
- WHEN canonical rename approval is evaluated
- THEN canonical rename progression MUST be blocked until dependency remediation is complete

### Requirement: Compatibility and Cutover Safety for Existing Consumers

The system MUST preserve compatibility for existing API/query consumers during cutover to canonical names and SHALL provide a rollback-safe transition window before compatibility surfaces are retired.

#### Scenario: Existing consumer accesses during transition

- GIVEN the cutover window is active
- WHEN a consumer still uses legacy naming contracts
- THEN the consumer MUST continue to receive behaviorally compatible outcomes
- AND migration progression MUST remain eligible for rollback to the last stable state

#### Scenario: Compatibility layer retirement request is premature

- GIVEN at least one critical consumer has not completed migration to canonical names
- WHEN compatibility layer retirement is proposed
- THEN retirement MUST be blocked until consumer readiness and rollback checkpoints are accepted

### Requirement: Phased Retirement of Legacy Stock Surfaces

The system MUST execute migration in explicit phases and SHALL NOT permit irreversible retirement actions for legacy stock surfaces before phase acceptance gates pass.

#### Scenario: Planned phase progression

- GIVEN migration phases and acceptance criteria are defined
- WHEN a migration phase is executed
- THEN the phase MUST complete only after phase-specific readiness checks pass
- AND the next phase MUST remain blocked until the current phase is accepted

#### Scenario: Premature irreversible action is requested

- GIVEN the migration is before final retirement acceptance
- WHEN an irreversible retirement action is attempted
- THEN the system MUST reject the action as out of phase

### Requirement: Full `purchase` Decommission and Linked-Column Removal

The system MUST fully decommission `purchase` by dropping the table and SHALL remove linked columns/references that depend on `purchase` across operational and reporting paths.

#### Scenario: Final decommission execution

- GIVEN dependency checks confirm no active `purchase` usage
- WHEN final decommission is executed
- THEN the `purchase` table MUST be dropped
- AND all linked columns/references to `purchase` MUST be removed

#### Scenario: Residual `purchase` linkage is detected

- GIVEN pre-drop validation is performed
- WHEN any active linked column/reference to `purchase` is detected
- THEN `purchase` decommission MUST be blocked until linkage removal is completed

### Requirement: Rollback-Safe Retirement Gates

The system MUST define and enforce rollback-safe gates for each phase, including explicit fallback eligibility before canonical lock-in and `purchase` destructive cleanup.

#### Scenario: Gate failure before cutover completion

- GIVEN a migration phase has not met its acceptance criteria
- WHEN gate evaluation runs
- THEN the phase MUST remain reversible
- AND fallback to the prior stable source MUST remain available

#### Scenario: Rollback window expired

- GIVEN the rollback-safe window is not yet confirmed as complete
- WHEN irreversible retirement is proposed
- THEN the system MUST block irreversible retirement actions
