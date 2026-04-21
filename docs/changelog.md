# Changelog
## Version: 3.1.0
## Last updated: 2026-04-21 – Startup stabilization and major UI/UX overhaul.
## Project: GitKit

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [3.1.0] - 2026-04-21
### Added
- **Startup Loading State**: Implemented an explicit `isInitializing` state with a professional loading UI.
- **Global Error Boundary**: Integrated a high-level `ErrorBoundary` wrapper in `main.tsx`.

### Fixed
- **Black Screen on Launch**: Resolved a critical bug where `ErrorBoundary` was incorrectly accessing `this.children`.
- **Tauri V2 API Alignment**: Fixed `ReferenceError` for `invoke` in `repo.ts`.
- **JSX Syntax Ambiguity**: Refactored `App.tsx` layout to eliminate nested ternaries causing transpilation errors.

## [3.0.0] - 2026-04-21
### Added
- **UI Component Library**: Created reusable primitives: `Button`, `Badge`, `Input`, and `Card`.
- **Design System Tokens**: Introduced HSL-based color variables and glassmorphic tokens.
- **Architectural Overhaul**: Decomposed monolithic components into modular structures (Sidebar, RightPanel).

### Fixed
- **Branch Dropdown (Optimal Fix)**: Resolved conflict between dropdown accessibility and graph node visibility using dynamic layering and hover bridges.

## [2.10.0] - 2026-04-12
### Added
- **Conflict Routing**: Context-aware conflict resolution workflow detecting Merge, Rebase, and Cherry-Pick sources.
- **Merge/Rebase Ops**: Integrated Abort/Continue actions into the Conflict Editor.

## [2.9.0] - 2026-04-12
### Added
- **Reset Commit**: Soft, Mixed, and Hard reset modes from the commit graph context menu.
- **Safety Guards**: Detached HEAD protection and dirty working tree warnings.

## [2.8.0] - 2026-04-12
### Added
- **Stash Management**: Save, Apply, Pop, and Drop functionality with graph integration.
- **Smart Refresh**: Window focus detection for automatic repository status updates.
