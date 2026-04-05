# GitManager App Memory
## Version: 0.2.0
## Last updated: 2026-04-05 - Added Repo Opening + Staging + Committing UI 
## Project: GitKit

- 2026-04-05: Scaffolded Phase 0 of the GitManager App. Setup Tauri 2 with React + TypeScript template. Installed Tailwind CSS v4, Zustand, and `@tanstack/react-virtual`. Added `git2` and `serde` dependencies for Rust. Created initial 3-column layout shell in React. Initialized document registry.
- 2026-04-05: Implemented "Open Repo" capability and Phase 1 tasks. Intervened with Tauri plugins (`tauri-plugin-dialog`) to open OS folders. Upgraded Rust back-end with modules for Repo validation, Git Status retrieval, Differential patches viewing, Staging toggles, and unified Committing mechanism. Refactored `<App />` layout mapping directly to the `Zustand` store for real-time reactivity without Prop Drilling. `FEATURE_REGISTRY` & `RUST_API` maps are up to date.
