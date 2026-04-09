# Changelog
## Version: 1.0.0
## Last updated: 2026-04-09 – Initial historical record
## Project: GitKit

All notable changes to the GitKit project are documented in this file.

## [1.0.0] - 2026-04-09
### Added
- **Core Strategy**: Project scaffold with Tauri 2, React 19, and Tailwind CSS v4.
- **Repository Management**: 
    - Folder discovery and validation.
    - Recent repositories persistence.
    - Drag & drop folder to open.
    - Auto-refresh on window focus.
- **Commit Graph**:
    - High-performance topological graph rendering.
    - Rust-powered lane routing.
    - Separate avatar rendering from graph nodes.
    - Stash entries visualization in graph.
- **Staging & Committing**:
    - Staged vs Unstaged lists.
    - Amend support.
    - Hard reset and clean operations.
- **Diff & Comparison**:
    - Monaco-powered side-by-side diff view.
    - Historical commit content view.
    - Unified patch view for staging area.
- **Branch Management**:
    - Safe Checkout workflow with conflict detection.
    - Smart branch switching (stash offer).
    - Remote branch tracking and creation.
- **Stash Management**:
    - List, Apply, Pop, and Drop stashes.
    - Advanced stash options via CLI integration.

### Fixed
- Commit graph edge direction beziers (branch-off vs merge differentiation).
- Avatar decoupling from graph nodes.
- Per-row SVG rendering for performance.
- Bezier control points for exact alignment.

### Security
- Added fallback signature for commits if user identity is missing.
- Implemented dry-run checkout to prevent accidental data loss.
