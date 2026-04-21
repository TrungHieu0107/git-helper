# Summary - GitKit
## Version: 1.2.0
## Last updated: 2026-04-21
## Project: GitKit

GitKit is a stable, professional Git client built with Tauri 2 (Rust) + React/Zustand. The `.agents/` configuration has been optimized for Antigravity compatibility: model updated to `gemini-2.5-flash`, all stale `.claude/` path references corrected to `.agents/`, `CLAUDE.md` rebranded, `/commit` workflow added, and missing `memory/preferences.md` created. The application startup lifecycle is robust with global ErrorBoundary protection. Oversized skills (`git-master` at 40KB, `typescript-advanced-types` at 17.5KB) have been identified for future lazy-load splitting.
