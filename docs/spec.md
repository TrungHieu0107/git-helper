# Feature Specification
## Version: 1.1.0
## Last updated: 2026-04-11 – v2.1.0 Feature Sync
## Project: GitKit

This document outlines the implemented and planned features of GitKit, along with their technical implementation details.

## Core Feature Areas

### 1. Repository Management
- **Status**: Implemented
- **Details**:
    - **Open Repository**: Validates folder as a Git repo using `Repository::discover`.
    - **Recent Repositories**: Persists a list of the 10 most recently opened repositories.
    - **Session Persistence**: Saves and restores open tabs and active repository orientation across restarts using `app_state.json`.
    - **Auto-Refresh**: Automatically re-fetches status and repo info when the application window gains focus.
- **Key Files**: `src-tauri/src/commands/repo/`, `src/lib/repo.ts`.

### 2. Commit Graph
- **Status**: Implemented
- **Details**:
    - **Topological Sorting**: Uses `revwalk` with `TOPOLOGICAL` and `TIME` sorting.
    - **Lane Assignment**: Dynamic lane routing logic with parent-child linkage.
    - **Stash Integration**: Stashes are injected into the graph with dedicated lanes positioned outside the main branch graph to prevent visual overlap.
    - **SVG Rendering**: High-fidelity SVG segments supporting curved pathways and Manhattan routing.
- **Key Files**: `src-tauri/src/commands/log/`, `src/components/CommitGraph.tsx`.

### 3. Staging & Committing
- **Status**: Implemented
- **Details**:
    - **File Status**: Real-time status with rename tracking.
    - **Committing**: Supports standard commits and amendment.
    - **Discard Changes**: Robust discard via CLI delegation for `git clean`.
- **Key Files**: `src-tauri/src/commands/status.rs`, `src-tauri/src/commands/diff/`.

### 4. Branch Management
- **Status**: Implemented
- **Details**:
    - **Safe Checkout**: Dry-run checks with conflict detection.
    - **Remote Tracking**: Automatically creates local tracking branches from remote refs with upstream configuration.
    - **Local Ref Resolution**: Seamlessly converts remote branch names to effective local names for checkouts.
- **Key Files**: `src-tauri/src/commands/repo/ops.rs`, `src/components/Sidebar.tsx`.

### 5. Remote Operations (Pull/Push)
- **Status**: Implemented
- **Details**:
    - **Pull Strategies**: Supports `Fast-Forward Only`, `Merge`, and `Rebase` strategies.
    - **Persistent Preference**: Remembers the user's preferred pull strategy across sessions.
    - **Atomic Fetching**: Pull operations perform a fetch internally to ensure consistency.
- **Key Files**: `src-tauri/src/commands/remote/`, `src/components/TopToolbar.tsx`.

### 6. Cherry-Pick
- **Status**: Implemented
- **Details**:
    - **Workflow**: Step-by-step cherry-pick with Abort, Continue, and Commit actions.
    - **Conflict Resolution**: Integrated conflict editor using Monaco to resolve marker-based conflicts (`AA`, `UU`).
- **Key Files**: `src-tauri/src/commands/cherry_pick.rs`, `src/components/ConflictEditorView.tsx`.

## Known Limitations & TODOs

- **Submodules**: Not currently handled in status or log.
- **LFS**: Not explicitly supported.
- **Interactive Rebase**: Planned for future versions.
- **Visual Merge Tool**: Basic conflict editor implemented; more advanced 3-way merge is planned.

> [!IMPORTANT] Implementation Detail:
> The app uses a hybrid approach for Git operations: `git2-rs` for data retrieval and internal logic, while delegating to the Git CLI for high-complexity porcelain commands like `git clean` and `git rebase` to ensure production-grade reliability.
