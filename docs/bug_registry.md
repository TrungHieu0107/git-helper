# Bug Registry
## Version: 2.10.1
## Last updated: 2026-04-12 – Documenting Branch Dropdown hover fix.
## Project: GitKit

| ID | Title | Severity | Status | Fixed In |
|---|---|---|---|---|
| BUG-001 | Graph Discontinuity on Stash | Low | Fixed | v2.8.4 |
| BUG-002 | Windows CRLF Mismatch on Restore | Medium | Fixed | v2.7.0 |
| BUG-003 | Detached HEAD Checkout Warning | Medium | Fixed | v2.6.5 |
| BUG-004 | Race Condition on Git Status Refresh | High | Fixed | v2.8.0 |
| BUG-005 | Monaco Editor Selection Offset | Low | Fixed | v2.5.0 |
| BUG-006 | Cherry-pick Dialog Prop Drifting | Medium | Fixed | v2.8.2 |
| BUG-007 | Reset Option Always Disabled | High | Fixed | v2.9.1 |
| BUG-008 | Reset Reachability Restriction | High | Fixed | v2.9.2 |
| BUG-009 | Branch Dropdown Hover Gap | Low | Fixed | v2.10.1 |

---

## Detailed Entries

### BUG-007: Reset Option Always Disabled
- **Status**: `Fixed`
- **Symptom**: The "Reset to this commit..." context menu item was greyed out for all commits.
- **Root Cause**: Typo in `CommitContextMenu.tsx`. Logic checked `cherryPickState.status !== 'idle'`, but `cherryPickState` in the store is a raw string, not an object. Resulted in `undefined !== 'idle'` always true.
- **Fix**: Corrected property access to `cherryPickState !== 'idle'` and converted logic to use reactive hooks.

### BUG-008: Reset Reachability Restriction
| BUG-009 | Branch Dropdown Hover Gap | Low | Fixed | v2.10.1 |
- **Status**: `Fixed`
- **Symptom**: "Reset failed: Target commit is not reachable from HEAD" error when trying to reset to a side branch or jumping forward.
- **Root Cause**: Backend implementation used `revwalk` from HEAD to validate target. If target was not an ancestor, it threw an error.
- **Fix**: Relaxed restriction in `ops.rs`. Reset now proceeds regardless of reachability; `commits_rewound` is simply set to `0` if target is not reachable from HEAD.

### BUG-001: Graph Discontinuity on Stash
- **Status**: `Fixed`
- **Symptom**: The WIP node would connect to stashes instead of the real HEAD.
- **Root Cause**: Stashes were treated as commits in the sorting algorithm.
- **Fix**: Added `node_type` field and filtered stashes during lane assignment.

### BUG-009: Branch Dropdown Hover Gap
- **Status**: `Fixed`
- **Symptom**: When hovering from a branch badge to the expanded "others" list, the menu would flicker and disappear.
- **Root Cause**: A 4px margin (`mt-1`) on the absolute dropdown created a gap where the mouse was neither over the badge nor the menu content. Move-out triggered `onMouseLeave`.
- **Fix**: Removed `mt-1`, added `pt-1.5` for internal spacing, and implemented a `before:` pseudo-element bridge extending upwards into the badge area.
