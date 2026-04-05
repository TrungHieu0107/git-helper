# Git Manager App - Feature Registry

| Feature | Status | Notes |
|---|---|---|
| Phase 0: Project scaffold | Done | Initial setup with Tauri 2, React, Tailwind v4 |
| Open Repository / Load Repo Info | Done | Folder picker, welcome screen, recent repos list, Rust validation |
| Phase 1: Commit & Staging | Done | `get_status`, `stage_file`, `unstage_file`, `get_diff`, `create_commit` implemented. UI panels working. |
| UI Refactor (GitKraken-style) | Done | Visually implemented missing components using placeholders where Rust integration is pending. |
| Phase 2: Commit Graph | Done | Topological graph mapping traversing revwalk. Computed visual lane routing via `active_lanes` with Rust. Dynamic continuous SVG curves and React component mappings. |
| Commit Graph Visual Fix | Done | Separated avatar from graph node, per-row SVG rendering, proper z-order layers, bezier curves for merges, GitKraken-style small circles with inner dots. |
| Sidebar Dynamic Data | Done | Derives branch lists from commitLog refs. Removed Pull Requests/Issues dummies. Added filter, empty states, remote grouping. |
| Commit Graph Edge Direction Fix | Done | Branch-off uses horizontal-first bezier, merge uses vertical-first bezier. Avatar fully decoupled as HTML with hue-based fallback. Edge classification via parent count. |
| Commit Graph Bezier Fix | Done | Exact bezier control points (branch-off: C x1 27 x2 27; merge: C x1 9 x2 9). Continuous vertical lane lines through nodes. Active lanes tracked per row. Consistent SVG width. Debug log added. |
| Phase 3: Branch Management | Pending | |
| Phase 4: Remote Operations | Pending | |
| Phase 5: Stash Visualization | Pending | |
