# GitKit Project Summary
## Version: 2.10.1
## Last updated: 2026-04-12 – Fixed Branch Dropdown hover interaction.
## Project: GitKit

GitKit is a high-performance, premium Git management application. The current stable version is v2.10.1, which improves micro-interactions in the commit graph.

**Recent Highlights**:
- **Branch Dropdown (v2.10.1)**: Optimized Branch interaction and Graph layering. Implemented a dynamic z-level strategy that preserves commit avatar visibility while ensuring dropdown accessibility via targeted elevation of the interaction area.
- **Conflict Routing (v2.10.0)**: Automatic conflict source detection (Merge, Rebase, Cherry-Pick) with context-aware editor routing and mode-specific action buttons. Includes auto-cleanup for externally resolved conflicts.
- **Git Reset (v2.9.0)**: Added support for right-click reset with Soft, Mixed, and Hard modes. Includes safety checks and destructive warnings.

- **WIP Connection Fix (v2.8.4)**: Updated graph logic to ensure the WIP node always connects to the first actual commit, bypassing stashes.
- **Remote Cleanup (v2.8.3)**: Simplified Sidebar by removing remote headers and flattening branch lists.
- **Sidebar Typography (v2.8.2)**: Adjusted font sizes for section headers and the active branch selector.
