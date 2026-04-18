# GitKit Project Summary
## Version: 2.11.0
## Last updated: 2026-04-18 – GitKit Branding & Icon Update.
## Project: GitKit

GitKit is a high-performance, premium Git management application. The current stable version is v2.11.0, featuring full brand standardization and new blurred-background icons.

**Recent Highlights**:
- **GitKit Rebranding & Icons (v2.11.0)**: Standardized application name to "GitKit" across all configuration files and UI components. Integrated a new premium blurred-background logo as the primary application icon.
- **File History Path Fix (v2.10.7)**: Added automatic normalization of absolute file paths to relative repository paths in the File History Modal. Users can now paste full system paths into the search field.
- **Cleanup and Build Stability (v2.10.6)**: Resolved all TypeScript errors, missing imports, and unused variables across the project to ensure a 100% clean build.
- **Double Click Checkout (v2.10.5)**: Changed the interactive branch badges in the commit graph and sidebar to require a double-click to checkout a target branch. Single clicks are safely ignored to prevent accidental switches.
- **Dynamic Branch Dropdown (v2.10.4)**: Configured the commit row branch dropdown interface to enforce `labelWidth` bounds alongside graceful text truncation when multiple verbose tags exist.
- **Graph Layering Fix (v2.10.3)**: Layered Commit Graph Rendering Architecture. Hover and selected states are now drawn behind the global SVG paths while structurally retaining dynamic z-indexes for branch dropdowns, solving graphical overlaps.
- **Branch Dropdown Overlap (v2.10.2)**: Fixed Branch Dropdown overlap layering. Added dynamic z-indexes on `CommitRow` containers to prevent react-virtualized list rendering order from blocking hover events and clicks in branch dropdown menus when multiple branches sit on the same commit point.
- **Branch Dropdown Box (v2.10.1)**: Optimized Branch interaction and Graph layering. Implemented a padding-based touch-area to bridge gap issues.
- **Conflict Routing (v2.10.0)**: Automatic conflict source detection (Merge, Rebase, Cherry-Pick) with context-aware editor routing and mode-specific action buttons. Includes auto-cleanup for externally resolved conflicts.
- **Git Reset (v2.9.0)**: Added support for right-click reset with Soft, Mixed, and Hard modes. Includes safety checks and destructive warnings.

- **WIP Connection Fix (v2.8.4)**: Updated graph logic to ensure the WIP node always connects to the first actual commit, bypassing stashes.
- **Remote Cleanup (v2.8.3)**: Simplified Sidebar by removing remote headers and flattening branch lists.
- **Sidebar Typography (v2.8.2)**: Adjusted font sizes for section headers and the active branch selector.
