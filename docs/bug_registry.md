# Bug Registry & Known Issues
## Version: 1.0.0
## Last updated: 2026-04-09 – Initial bug registry
## Project: GitKit

This document tracks identified bugs, "Simplified for now" logic, and explicitly documented TODOs in the codebase.

## High Severity

| ID | Title | Status | Description |
|---|---|---|---|
| BUG-001 | Possible Stash Drop Failure | Open | In `stubs.rs`, `pop_stash` manually applies then drops. If `stash_apply` succeeds but `stash_drop` fails for some system reason, the stash is duplicated in the list. |

## Medium Severity

| ID | Title | Status | Description |
|---|---|---|---|
| TODO-001 | Conflict Mapping | Partial | `status.rs` returns `conflicted` but doesn't distinguish between types of conflicts (AA, UU, etc.). UI resolution is not implemented. |
| TODO-002 | FF Pull Only | Open | `remote.rs` logic for `pull_remote` only supports fast-forward. It returns an error for mergeable or non-FF pulls. |
| TODO-003 | Detached HEAD | Partial | `repo.rs` handles detached HEAD checkouts but doesn't provide a sophisticated "Reattach" or "New Branch from HEAD" workflow. |

## Feature Gaps & TODOs

| ID | Title | Status | Description |
|---|---|---|---|
| GAP-001 | Submodule Tracking | Open | `get_status` does not recurse into submodules or show their dirty states. |
| GAP-002 | Binary Diffs | Open | `diff.rs` can detect binary files but doesn't provide a visual comparison (e.g., image diff, hex view). |
| GAP-003 | Search/Filter Graph | Partial | `AppStore` has `commitSearchInput` but logic to filter the `revwalk` based on this input is pending. |

## Logic Gaps identified in analysis

- **`status.rs`**: `FileStatus` includes `old_path` but it is currently hardcoded to `None`. This makes tracking renames in the staging area accurate only via the filename change, not a unified rename-delta.
- **`stubs.rs`**: `apply_stash` uses a manual conflict check after the operation because libgit2 doesn't always return an error on conflict during stash apply.
- **`log.rs`**: Lane routing is done in a single pass. Complex large-parent-count merges might lead to lane crossovers that could be improved with a second-pass optimization.

> [!CAUTION] UI Limitation:
> The app currently assumes a single open repository. While `AppStateData` tracks `tabs`, switching repos currently overwrites the single operational store, which may cause jumpy UI if multi-repo support is used.
