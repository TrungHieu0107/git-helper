# Changelog
## Version: 1.5.0
## Last updated: 2026-04-09 – Fetch All Feature
## Project: GitKit

All notable changes to this project will be documented in this file.

## [1.5.0] - 2026-04-09
### Added
- **Fetch All Remotes**: Added a "Fetch" button to the toolbar. It fetches updates from all configured remotes and automatically refreshes the UI state including the commit graph and branches.

## [1.4.1] - 2026-04-09
### Fixed
- **Startup Reference Error**: Fixed a critical regression where the app failed to start due to a missing `restoreAppState` import in `App.tsx`.

## [1.4.0] - 2026-04-09
### Added
- **Persistent Tabs**: The application now remembers your open repository tabs and the active tab across reloads and restarts. This is powered by a new Rust-based state persistence layer (`app_state.json`).

## [1.3.1] - 2026-04-09
### Fixed
- **Home Tab Rendering**: Fixed a crash (white screen) when switching to the Home tab caused by missing component imports.

## [1.3.0] - 2026-04-09
### Added
- **Top Tab Bar**: Implemented a multi-repository tabbed interface at the top of the app.
- **Home Dashboard**: Enhanced the Welcome Screen to serve as a Home tab, showing all currently open repositories as interactive cards.
- **Multi-Repo State**: Added support for tracking multiple open repositories in the session.

## [1.2.2] - 2026-04-09
### Added
- **Rounded Stash Path Corners**: Connection lines for stash commits now use smooth, rounded corners instead of sharp 90-degree angles, bringing consistency to the graph aesthetic.

## [1.2.1] - 2026-04-09
### Fixed
- **Stash Lane Isolation**: Resolved visual overlaps where stash nodes and connection lines were rendered on top of active branch lines. The backend now performs dynamic occupancy checks and allocates dedicated columns for stashes.

## [1.2.0] - 2026-04-09
### Added
- **Inline Stash Visualization on Graph**:
    - Stashes appear as distinct **square nodes** with dashed borders.
    - **L-shaped dashed lines** connect stashes horizontally and vertically to their base commits.
    - Dynamic lane assignment ensures stashes don't overlap while staying attached to their origin.
    - Tooltips on hover show stash message and index.
- **Backend Graph Injection**: Re-engineered `get_log` to interleaved stashes and commits.
