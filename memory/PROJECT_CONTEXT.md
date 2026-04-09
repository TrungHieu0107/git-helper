# Project Context: GitKit
## Version: 1.9.0
## Last Updated: 2026-04-10

## Context & Purpose
GitKit (Git Helper) is a professional, high-fidelity Git client aimed at providing a superior developer experience through rich visualizations (vibrant commit graphs, Manhattan routing) and robust multi-repo navigation.

## Modular Architecture

### Backend (Rust / Tauri)
The backend is organized into domain-scoped modules in `src-tauri/src/commands/`:
- **`repo/`**: Core metadata and operations.
- **`branch/`**: Complete branch lifecycle management.
- **`stash/`**: Sophisticated stash handling (safe drops, advanced push).
- **`log/`**: High-performance graph layout engine.
- **`diff/`**: Multi-encoding diff generation.
- **`remote/`**: Networking and synchronization.
- **`status.rs`**: Fast status tracking with native rename detection.

### Frontend (React / Zustand)
State is managed using domain-specific slices in `src/store/slices/`:
- **`repoSlice`**: Repository metadata and file state.
- **`logSlice`**: Commit history and detail caching.
- **`stashSlice`**: Stash list and UI preferences.
- **`uiSlice`**: Navigation tabs and global notifications.

## Key Design Patterns
- **Lanes & Routing**: Topological commit graph with Manhattan routing and corner smoothing.
- **Persistence**: Hybrid persistence (Tauri `get_app_state`/`save_app_state` + Zustand hydration).
- **Virtualization**: TanStack Virtual for 10k+ commit rendering performance.
- **Safety**: Safe checked-out branch detection and atomic stash pop/apply with conflict guards.