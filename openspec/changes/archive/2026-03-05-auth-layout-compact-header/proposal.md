# Proposal (Archive Snapshot)

**Change**: `auth-layout-compact-header`
**Source artifact**: Engram `#257`

## Intent

Reduce duplicated page-level header blocks in authenticated pages by introducing a shared compact shell header and aligned sidebar top strip behavior.

## Scope (Snapshot)

- Add compact global authenticated header in `(dashboard)` shell with left metadata and right actions slot.
- Move page title/action ownership from local pages to a shared shell contract.
- Add desktop sidebar top strip border + collapse control and icon-only collapsed navigation mode.
- Preserve module business logic and keep mobile changes limited to compatibility.

## Notes

- This file is reconstructed from Engram artifact `#257` for archive continuity.
- Refer to Engram for the full proposal text.
