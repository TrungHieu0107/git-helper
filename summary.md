# GitKit Status Summary
## Version: 2.8.1
## Last updated: 2026-04-12 – Fixed commit graph infinite scroll pagination.
## Project: GitKit

GitKit has reached version 2.8.1 with a critical pagination bugfix. The commit graph now correctly loads older commits when scrolling to the bottom by properly consuming the backend's `LogResponse` type (instead of treating it as a flat array) and tracking real commit counts (excluding stashes) for accurate revwalk offset pagination.

**Recent Highlights**:
- **Pagination Fix (v2.8.1)**: Resolved type mismatch between backend `LogResponse` and frontend `CommitNode[]` casting, added `commitOffset` for stash-safe pagination.
- **Stash Context Menu (v2.8.0)**: Integrated Pop, Apply, and Delete actions into the graph context menu with index-based backend mapping.
- **Premium Graph UI**: Added active branch lineage glow effects, curated color palettes, and modernized node rendering.
- **Stability**: Full documentation sync performed to maintain alignment between spec and implementation.
