# Git Manager App - Feature Registry

| Feature | Status | Notes |
|---|---|---|
| Phase 0: Project scaffold | Done | Initial setup with Tauri 2, React, Tailwind v4 |
| Open Repository / Load Repo Info | Done | Folder picker, welcome screen, recent repos list, Rust validation |
| Phase 1: Commit & Staging | Done | `get_status`, `stage_file`, `unstage_file`, `get_diff`, `create_commit` implemented. UI panels working. |
| UI Refactor (GitKraken-style) | Done | Visually implemented missing components using placeholders where Rust integration is pending. |
| Phase 2: Commit Graph | Done | Topological graph mapping traversing revwalk. Computed visual lane routing via `active_lanes` with Rust. Dynamic continuous SVG curves and React component mappings. |
| Phase 3: Branch Management | Pending | |
| Phase 4: Remote Operations | Pending | |
| Phase 5: Stash Visualization | Pending | |
