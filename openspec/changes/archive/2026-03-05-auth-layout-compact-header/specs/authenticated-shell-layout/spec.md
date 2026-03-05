# Authenticated Shell Layout Specification (Archive Snapshot)

**Change**: `auth-layout-compact-header`
**Source artifact**: Engram `#261`

## Purpose

Define required behavior for a compact authenticated shell header and coordinated sidebar top strip/collapse model.

## Requirements (Snapshot)

### Requirement: Global Authenticated Compact Header

The system MUST render a shared authenticated header across `(dashboard)` pages with title metadata on the left and a right-side actions slot.

#### Scenario: Header renders title and actions in authenticated shell

- GIVEN an authenticated user opens any page under `(dashboard)`
- WHEN the page provides header metadata and optional actions
- THEN the shell MUST render one global header with left title region and right actions region

#### Scenario: Page provides no custom actions

- GIVEN an authenticated page does not register actions
- WHEN the shell header renders
- THEN the title region MUST remain visible
- AND the actions region MUST collapse without interactive placeholders

### Requirement: Sidebar Logo Strip With Collapse Control

The system MUST render a desktop sidebar top strip with left-aligned logo, right-aligned collapse toggle, and a bottom border.

#### Scenario: Expanded sidebar top strip contract

- GIVEN desktop sidebar is in expanded mode
- WHEN the shell is rendered
- THEN logo and collapse toggle MUST be visible within the top strip
- AND the strip MUST render a bottom border above navigation items

#### Scenario: Collapse toggle interaction state

- GIVEN the user activates the collapse toggle
- WHEN sidebar mode transitions
- THEN layout spacing MUST reflect the next mode immediately

## Notes

- Archive snapshot is reconstructed from Engram artifact `#261`.
- Full delta-spec text was not present in workspace at archive runtime.
