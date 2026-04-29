# GitKit Technical Specification
## Version: 2.5.0
## Last updated: 2026-04-29 – Streaming Git Blame & Rebase Guards
## Project: GitKit

## Feature Implementation Status

### Core Repository Management
- **Repository Initialization**: `[Implemented]` - Detecting and opening existing git repositories.
- **Recent Repositories**: `[Implemented]` - Persistent list of previously opened repositories.
- **State Restoration**: `[Implemented]` - Restores tabs, stash settings, and UI preferences.
- **Auto-Fetch**: `[Implemented]` - Background synchronization with remotes.
- **Incremental Rebase (with State Protection)**: `[Implemented]` - Backend/Frontend guards to prevent concurrent rebase operations.
- **Reactive Streaming Git Blame**: `[Implemented]` - Non-blocking, chunked streaming for massive files.

### Visual Commit Graph
- **Manhattan Routing**: `[Implemented]` - Curvy SVG-based edge routing.
- **Virtualized Rendering**: `[Implemented]` - High-performance list using `@tanstack/react-virtual`.
- **WIP Node**: `[Implemented]` - Virtual node for working tree state.

### Working Tree & Staging
- **Partial Staging (Hunk Staging)**: `[Implemented]` - Stage specific blocks via Monaco Diff gutter.
- **Conflict Editor**: `[Implemented]` - Side-by-side resolution view with line-number integrity.

## Technical Architecture

### Backend (Rust/Tauri)
- **Git Engine**: `git2-rs` for data-heavy operations (log, status, commit, rebase).
- **Stream Processing**: `tokio::process` for long-running CLI tasks (blame, fetch).
- **Concurrency**: Async commands to ensure UI responsiveness.

### Frontend (React/TypeScript)
- **State Management**: `Zustand` for global repo and UI state.
- **Rendering**: Virtualized lists and Monaco Editor for large datasets.
- **Reactive Hooks**: Custom hooks for event-driven data streaming.

### State Protection: Rebase
- **Backend Guard:** `start_rebase` command checks `repo.state() == git2::RepositoryState::Clean`.
- **Frontend Guard:** Context menu items disabled if `repoInfo.state !== 'clean'`.

### Reactive Blame Spec
- **Process:** `git blame --incremental`.
- **Batching:** 500 lines per IPC chunk.
- **Events:** Emits `Chunk`, `Complete`, or `Error`.
