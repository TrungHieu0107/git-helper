# Feature Specification
## Version: 1.0.0
## Last updated: 2026-04-09 – Initial specification document
## Project: GitKit

This document outlines the implemented and planned features of GitKit, along with their technical implementation details.

## Core Feature Areas

### 1. Repository Management
- **Status**: Implemented
- **Details**:
    - **Open Repository**: Validates folder as a Git repo using `Repository::discover`.
    - **Recent Repositories**: Persists a list of the 10 most recently opened repositories to `{app_data_dir}/recent_repos.json`.
    - **Auto-Refresh**: Automatically re-fetches status and repo info when the application window gains focus.
- **Key Files**: `src-tauri/src/commands/repo.rs`, `src/lib/repo.ts`.

### 2. Commit Graph
- **Status**: Implemented
- **Details**:
    - **Topological Sorting**: Uses `revwalk` with `TOPOLOGICAL` and `TIME` sorting.
    - **Lane Assignment**: Dynamic lane routing logic in Rust (`get_log`). Lanes are tracked per row; parents are assigned to the first free lane if not already occupied.
    - **Stash Integration**: Stash entries are injected as "stash" nodes, branching off their base commit and occupying dedicated lanes to the right of branch lines.
    - **SVG Rendering**: Per-row SVG segments with continuous bezier curves.
- **Key Files**: `src-tauri/src/commands/log.rs`, `src/components/CommitGraph.tsx`.

### 3. Staging & Committing
- **Status**: Implemented
- **Details**:
    - **File Status**: Mapped from `git2::Status` to `staged`, `unstaged`, `untracked`, or `conflicted`.
    - **Staging/Unstaging**: Uses `index.add_path` and `reset_default`.
    - **Committing**: Supports standard commits and HEAD amendment. Signatures are derived from Git config or a default fallback.
    - **Discard Changes**: Uses `git reset --hard` and `git clean -fd` for robustness.
- **Key Files**: `src-tauri/src/commands/status.rs`, `src-tauri/src/commands/diff.rs`.

### 4. Diff & File View
- **Status**: Implemented
- **Details**:
    - **Patch View**: Returns unified diff string for UI highlights.
    - **Monaco Diff**: `get_file_contents` retrieves both versions of a file (HEAD vs Index or Index vs Workdir) for full side-by-side comparison in Monaco.
    - **Historical Diff**: Viewing a commit in the graph loads the parent-tree-to-commit-tree diff.
- **Key Files**: `src-tauri/src/commands/diff.rs`, `src/components/MainDiffView.tsx`.

### 5. Branch Management
- **Status**: Implemented
- **Details**:
    - **Safe Checkout**: Dry-runs a checkout to detect conflicts. If clean, proceeds; if dirty but no conflicts, offers to stash; if conflicting, identifies problematic files.
    - **Validation**: Strict branch name validation following Git rules.
    - **Remote Tracking**: Auto-sets tracking references when checking out remote branches.
- **Key Files**: `src-tauri/src/commands/repo.rs`, `src/components/Sidebar.tsx`.

### 6. Stash Management
- **Status**: Implemented
- **Details**:
    - **List/Apply/Pop/Drop**: Full lifecycle management via Rust.
    - **Advanced Stash**: UI support for "Stash All" (including untracked) vs "Stash Unstaged".
- **Key Files**: `src-tauri/src/commands/stubs.rs`.

## Known Limitations & TODOs

- **Merge Conflicts**: Manual resolution UI is not yet implemented. Users must resolve in terminal.
- **Push/Pull**: Only basic fast-forward pull is supported; rebase/merge pulls require terminal.
- **Submodules**: Not currently handled in status or log.
- **LFS**: Not explicitly supported; may show LFS pointers as text.

> [!IMPORTANT] Implementation Detail:
> The `discard_all` command is one of the few places where we spawn a `git` CLI process instead of using `git2`, as `git clean` behavior is significantly more complex to implement reliably in pure Rust.
