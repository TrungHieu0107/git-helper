# User Preferences
## Version: 1.0.0
## Last updated: 2026-04-21 – Initial creation
## Project: GitKit

## Language & Communication
- **Discussion language**: Vietnamese (Tiếng Việt)
- **Code & docs language**: English
- **Commit messages**: English, Conventional Commits format
- **Response style**: Concise, action-oriented, no fluff

## UI/UX Design Preferences
- **Theme**: Dark mode, premium aesthetic
- **Design language**: Glassmorphism, IDE-grade polish
- **Animations**: Framer Motion micro-animations for transitions
- **Inspiration**: GitKraken-style layout with 3-panel design
- **Typography**: Modern, clean fonts (Inter/system defaults)
- **Colors**: Curated hue-based palettes, avoid generic flat colors

## Architecture Preferences
- **Frontend**: React + TypeScript + Zustand (domain slices) + TanStack Virtual
- **Backend**: Rust + Tauri 2 with modular `commands/` structure
- **State**: Hook-driven architecture, one slice per domain concern
- **Rendering**: Virtualized lists for 10k+ items
- **Styling**: CSS Modules / Vanilla CSS (no Tailwind unless specified)

## Code Style
- **Modularity**: One concern per file, small focused modules
- **Functions**: Prefer arrow functions for simple ops, named for complex
- **Error handling**: Explicit Result<T, E> on Rust side, try/catch on TS side
- **Imports**: Group by: built-in → external → internal
- **Comments**: Explain WHY, never WHAT

## Workflow Preferences
- **Commit frequency**: After each completed feature/fix
- **Documentation**: Update docs alongside code changes
- **Memory system**: Always update `memory.md` + `summary.md` after changes
- **Testing**: Verify via browser subagent when UI changes are made
- **Build verification**: Run `cargo build` for Rust, `npm run build` for frontend

## Tool Preferences
- **Editor**: Monaco Editor for in-app code/diff views
- **Git operations**: Prefer `git2` (libgit2) bindings, fall back to CLI for unsupported features
- **Diff rendering**: 3-pane Monaco for conflict resolution

<!-- Antigravity -->
