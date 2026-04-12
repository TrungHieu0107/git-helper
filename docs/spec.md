# Feature Specification
## Version: 2.9.2
## Last updated: 2026-04-12 – Added Git Reset workflow details.
## Project: GitKit

This document outlines the implemented features of GitKit, detailing their technical mechanics and edge case handling.

## Core Feature Areas

### 1. Repository Management
- **Status**: `[Implemented]`
- **Mechanics**:
    - **Discovery**: Uses `git2::Repository::discover` to locate the `.git` directory.
    - **Auto-Refresh**: Listens for window focus events to trigger `refreshActiveRepoStatus()`.
    - **Persistence**: Saves active workspace state (open tabs, last repo) to `app_state.json`.

### 2. Commit Graph
- **Status**: `[Implemented]`
- **Mechanics**:
    - **Layout Engine**: Rust-based engine performs topological sorting and calculates lane occupancy for Manhattan routing.
    - **Virtualization**: Uses `@tanstack/react-virtual` to render only visible nodes, supporting repositories with 10k+ commits.
    - **Active Lineage**: Highlights parent-child relationships for the current branch using `Revwalk`.

### 3. Git Reset (new in v2.9.0)
- **Status**: `[Implemented]`
- **Modes**:
    - `--soft`: Moves HEAD, preserves index (staged) and working tree.
    - `--mixed`: Moves HEAD, resets index, preserves working tree (unstaged).
    - `--hard`: Moves HEAD, resets index and working tree (destructive).
- **Guards**:
    - **Detached HEAD**: Explicitly blocked to prevent history loss.
    - **Hard Reset Warning**: UI triggers a destructive action banner if the repository is dirty.
    - **Reachability**: (Fixed in v2.9.2) Allows resetting to any valid commit, but provides distance info only if reachable from HEAD.

### 4. Branch Management
- **Status**: `[Implemented]`
- **Mechanics**:
    - **Safe Checkout**: Performs a dry-run checkout to detect conflicts before moving HEAD.
    - **Remote Tracking**: Automatically maps remote refs to local tracking branches on checkout.

### 5. File History & Operations
- **Status**: `[Implemented]`
- **Mechanics**:
    - **File Log**: Traverses commit history filtered by pathspec.
    - **Restore File**: Selective checkout of a file blob from a historical commit, handling parent directory creation and CRLF conversion.
    - **Encoding Pipeline**: Automatic charset detection using BOM and `chardetng` statistical models.

### 6. Remote Operations
- **Status**: `[Implemented]`
- **Mechanics**:
    - **Pull Strategies**: Supports `Fast-Forward Only`, `Merge`, and `Rebase`.
    - **Safe Push**: Implements `--force-with-lease` for amended commits and automatic upstream resolution.

### 7. Conflict Routing & Editor (updated in v2.10.0)
- **Status**: `[Implemented]`
- **Mechanics**:
    - **Source Detection**: Backend scans `.git` metadata to identify conflict sources (Merge, Rebase, Cherry-Pick, or Standalone).
    - **Routing**: Right Panel intercepts clicks on conflicted files (except `DD`) to open the Conflict Editor.
    - **Editor**: Mode-aware Monaco view with context-sensitive actions:
        - **Merge**: Abort/Continue (reads `.git/MERGE_MSG`).
        - **Rebase**: Abort/Continue (with `GIT_EDITOR` bypass).
        - **Cherry-Pick**: Abort/Continue/Commit.
    - **State Cleanup**: `refreshActiveRepoStatus` automatically closes the editor if the conflict is resolved externally.

### 8. Stash Management
- **Status**: `[Implemented]`
- **Mechanics**:
    - **Advanced Save**: Supports "Unstaged Only" stashing and custom messages.
    - **Lifecycle**: Pop, Apply, and Drop operations with graph integration.

## Handled Edge Cases

- **Dirty Tree during Reset**: Hard reset is guarded by a confirmation dialog.
- **Detached HEAD Safety**: Reset is blocked to prevent accidental state loss.
- **Binary Files during Restore**: Detection logic prevents trying to decode binary blobs as text.
- **Long Pathnames on Windows**: Path normalization ensures compatibility with system reveal commands.
