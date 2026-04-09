# Changelog
## Version: 1.2.2
## Last updated: 2026-04-09 – Rounded Stash Path Corners
## Project: GitKit

All notable changes to this project will be documented in this file.

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
