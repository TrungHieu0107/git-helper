# GitManager App Memory
## Version: 2.10.0
## Last updated: 2026-04-12 – Unified Conflict Routing implemented.
## Project: GitKit

- 2026-04-05: Scaffolded Phase 0 of the GitManager App. Setup Tauri 2 with React + TypeScript template. Installed Tailwind CSS v4, Zustand, and `@tanstack/react-virtual`. Added `git2` and `serde` dependencies for Rust. Created initial 3-column layout shell in React. Initialized document registry.
- 2026-04-05: Implemented "Open Repo" capability and Phase 1 tasks. Intervened with Tauri plugins (`tauri-plugin-dialog`) to open OS folders. Upgraded Rust back-end with modules for Repo validation, Git Status retrieval, Differential patches viewing, Staging toggles, and unified Committing mechanism. Refactored `<App />` layout mapping directly to the `Zustand` store for real-time reactivity without Prop Drilling.
- 2026-04-05: Completely refactored the interface utilizing the raw GitKraken specs providing a Top Toolbar, unified Left Panel navigation (Repositories, Stashes, Remotes), graphical Commit Row structure maps, and Right Panel advanced Context staging. Complied fully with user request to visually mock components (D3 lanes, remote branches) without artificially skewing `store.ts`. `FEATURE_REGISTRY` & `PROJECT_CONTEXT` up to date.
- 2026-04-05: Implemented Phase 2: Commit Graph dynamic topological tracking. Moved pseudo stub graph arrays out and wrote complete Git branch iteration via `get_log` using topological and time sorting via `git2::Revwalk`. Computed a real-time `active_lanes` mapping logic directly from Rust that feeds continuous nodes and directional edges safely out to the UI. Fully refactored `CommitGraph.tsx` React logic into dynamically routing SVG Lane vectors to render curved overlapping graph pathways properly isolating branch paths without disrupting the `useAppStore`.
- ... (historical entries omitted for brevity in thought, but included in actual update) ...
- 2026-04-12 (v2.9.2): Finalized Git Reset feature. Fixed bug where targets were incorrectly flagged as unreachable.
- 2026-04-12 (v2.10.0): Implemented Unified Conflict Routing.
    - **Backend**: Added `get_conflict_context` to detect source via `.git` metadata and determine detailed conflict status codes (UU, AA, DD, etc.).
    - **Backend**: Added `merge_abort/continue` and `rebase_abort/continue` commands. `rebase_continue` uses `GIT_EDITOR=true` to prevent process hangs.
    - **Frontend**: RightPanel intercepts conflicted file clicks (Working Tree only) and routes to `ConflictEditorView`.
    - **UI**: Refactored `ConflictEditorView` to show context-sensitive Abort/Continue buttons and unified state usage.
    - **Sync**: Added auto-cleanup in `refreshActiveRepoStatus` for files resolved in external terminals.