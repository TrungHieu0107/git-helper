# Bug Registry
## Version: 2.9.2
## Last updated: 2026-04-12 – Documenting Reset Commit reachability fix.
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

---

## Detailed Entries

### BUG-007: Reset Option Always Disabled
- **Status**: `Fixed`
- **Symptom**: The "Reset to this commit..." context menu item was greyed out for all commits.
- **Root Cause**: Typo in `CommitContextMenu.tsx`. Logic checked `cherryPickState.status !== 'idle'`, but `cherryPickState` in the store is a raw string, not an object. Resulted in `undefined !== 'idle'` always true.
- **Fix**: Corrected property access to `cherryPickState !== 'idle'` and converted logic to use reactive hooks.

### BUG-008: Reset Reachability Restriction
- **Status**: `Fixed`
- **Symptom**: "Reset failed: Target commit is not reachable from HEAD" error when trying to reset to a side branch or jumping forward.
- **Root Cause**: Backend implementation used `revwalk` from HEAD to validate target. If target was not an ancestor, it threw an error.
- **Fix**: Relaxed restriction in `ops.rs`. Reset now proceeds regardless of reachability; `commits_rewound` is simply set to `0` if target is not reachable from HEAD.

### BUG-001: Graph Discontinuity on Stash
- **Status**: `Fixed`
- **Symptom**: The WIP node would connect to stashes instead of the real HEAD.
- **Root Cause**: Stashes were treated as commits in the sorting algorithm.
- **Fix**: Added `node_type` field and filtered stashes during lane assignment.
