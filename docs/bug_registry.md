# Bug Registry
## Version: 3.1.0
## Last updated: 2026-04-21 – Documenting Startup Black Screen fix.
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
| BUG-010 | Startup Black Screen | Critical | Fixed | v3.1.0 |
| BUG-011 | ReferenceError: invoke is not defined | High | Fixed | v3.1.0 |

---

## Detailed Entries

### BUG-010: Startup Black Screen
- **Status**: `Fixed`
- **Symptom**: Application displays a solid black screen upon launch.
- **Root Cause**: `ErrorBoundary` component incorrectly accessed `this.children` instead of `this.props.children` in its `render()` method. Since `this.children` was undefined, React rendered nothing.
- **Fix**: Changed `this.children` to `this.props.children` in [ErrorBoundary.tsx](file:///d:/learn/git-helper/src/components/ErrorBoundary.tsx).

### BUG-011: ReferenceError: invoke is not defined
- **Status**: `Fixed`
- **Symptom**: `restoreAppState` failed silently or crashed with a ReferenceError.
- **Root Cause**: The `invoke` function from Tauri was being used in [repo.ts](file:///d:/learn/git-helper/src/lib/repo.ts) but was not imported from `@tauri-apps/api/core` after a previous refactoring.
- **Fix**: Added `import { invoke } from "@tauri-apps/api/core";` to the top of the file.

### BUG-007: Reset Option Always Disabled
- **Status**: `Fixed`
- **Symptom**: The "Reset to this commit..." context menu item was greyed out for all commits.
- **Root Cause**: Typo in `CommitContextMenu.tsx`. Logic checked `cherryPickState.status !== 'idle'`.
- **Fix**: Corrected property access and converted logic to use reactive hooks.

### BUG-008: Reset Reachability Restriction
- **Status**: `Fixed`
- **Symptom**: "Reset failed: Target commit is not reachable from HEAD" error.
- **Root Cause**: Backend implementation used strict `revwalk` ancestor validation.
- **Fix**: Relaxed restriction in `ops.rs`. Reset now proceeds regardless of reachability.
