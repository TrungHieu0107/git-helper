# 03 - Editing Principles
## Version: 1.0.0
## Last updated: 2026-04-25 – Initial documentation setup
## Project: GitKit (git-helper)

- **Clarity over Cleverness**: Write readable, well-commented code.
- **Strict TypeScript**: Never use `any`. Use interfaces for IPC payloads.
- **Backend Source of Truth**: Move complex logic (graph routing, lane allocation) to Rust for performance.
- **Manhattan Standards**: Graph lines must use anchor points (NODE_R offset) and horizontal-first routing.
- **Zero-Crash Build**: Every PR must be verified with `cargo check` and `npm run build`.
- **Modularity**: Keep components focused. Tools should be placed in `src/tools/` (following genzo-kit rules).
