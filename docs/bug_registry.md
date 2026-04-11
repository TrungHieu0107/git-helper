# Bug Registry & Known Issues
## Version: 2.7.0
## Last updated: 2026-04-11 – v2.7.0 Error & Fix Sync
## Project: GitKit

This document tracks identified bugs, logic gaps, and planned improvements in the codebase.

## High Severity

| ID | Title | Status | Fixed In | Description |
|---|---|---|---|---|
| BUG-001 | Possible Stash Drop Failure | Open | - | In `commands/stash/mod.rs`, if `stash_apply` succeeds but `stash_drop` fails, the stash is duplicated. |
| BUG-002 | Remote Checkout Fix | **Resolved** | v2.1.0 | Clicking remote branch tags in the commit graph now correctly resolves tracking branches and handles diverged commits safely. |
| BUG-003 | CreateBranchDialog Clipping | **Resolved** | v2.3.2 | "Source Branch" dropdown was obscured by the dialog's `overflow: hidden` property. Fixed by changing to `overflow: visible`. |
| BUG-004 | Reveal in Explorer fail | **Resolved** | v2.5.2 | `explorer /select` failed on Windows due to redundant inner quotes and mixed slashes. Fixed in `reveal_file`. |
| BUG-005 | Discard Changes IPC Error| **Resolved** | v2.5.3 | Missing `filePath` error in `discard_file_changes` due to snake_case vs camelCase mismatch in Tauri IPC. |


## Medium Severity

| ID | Title | Status | Fixed In | Description |
|---|---|---|---|---|
| TODO-001| Conflict Mapping | **Resolved** | v2.7.0 | `status.rs` now correctly identifies and surfaces conflict states (`AA`, `UU`, etc.) in the status list for the ConflictEditorView. |
| TODO-002| Pull Strategies | **Resolved** | v2.1.0 | Full support for Fast-Forward Only, Merge, and Rebase pull strategies with UI selection and persistence. |
| TODO-003| Detached HEAD | Partial | - | Basic support for detached HEAD checkouts implemented, but "Reattach" or "Create Branch from HEAD" workflow is missing. |

## Feature Gaps & TODOs

| ID | Title | Status | Description |
|---|---|---|---|
| GAP-001 | Submodule Tracking | Open | `get_status` does not recurse into submodules or show their dirty states. |
| GAP-002 | Binary Diffs | Open | `diff.rs` detects binary files but doesn't provide a visual comparison (e.g., image hex view). |
| GAP-003 | Commit Search logic | Partial| UI has a search input, but backend `revwalk` filtering for large logs is pending. |
| GAP-004 | Restore Collision | Low | `restore_file_from_commit` overwrites local changes without a "Diff-before-restore" view. Mitigation: Added a "Staged Changes" warning in the UI. |
| GAP-005 | Encoding Drift | Low | If a file's encoding changes between commits, the automatic detection may use the current workdir encoding for historical blobs if not explicitly re-evaluated. |

## Logic Gaps identified in analysis

- **`status.rs`**: `FileStatus` includes `old_path` but rename tracking is currently limited to the filename change in the entry, not a unified rename-delta.
- **`stash/mod.rs`**: `apply_stash` uses a manual conflict check after the operation because `libgit2` does not always return an error on conflict during stash apply.
- **`cherry_pick.rs`**: The conflict editor assumes standard Git markers (`<<<<<<<`). Non-standard markers or binary conflicts may cause resolution errors.

> [!CAUTION] UI Limitation:
> The app maintains a single operational store for the active repository. Rapidly switching between repository tabs may cause transient UI inconsistencies if background refreshes overlap.
