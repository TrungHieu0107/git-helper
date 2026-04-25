# Change Log
## Version: 2.1.0
## Last updated: 2026-04-22 – Final UI/UX Polishing & Build Stability
## Project: GitKit

| Date | Change | Reason |
|---|---|---|
| 2026-04-22 | Refined CommitDetailPanel density | Reduce excessive whitespace and fix file list overlap |
| 2026-04-22 | Enhanced High-Contrast Dracula Palette | Improve accessibility and visual impact |
| 2026-04-22 | Resolved Build Stability Issues | Fix broken imports, missing icons, and type mismatches |
| 2026-04-22 | Optimized Virtualized List Rendering | Remove transition-all from rows to fix positioning lag |
| 2026-04-22 | Cleaned up Unused Code & Imports | Achieve 0-warning build state |
| 2026-04-25 | Implemented Resizable Graph Column & Message Overlap | Fix horizontal layout explosion for massive graphs and improve UX with overlap blurring |
| 2026-04-25T10:07:00+07:00 | Normalized Branch Checkout to strictly require Double-click | Prevent accidental branch checkouts when users single-click to select or expand |
| 2026-04-25T10:14:00+07:00 | Optimized Commit Row Hover Highlight with CSS-only approach | Replaced React-state driven hover with Tailwind group-hover for superior virtualization performance and aesthetic responsiveness |
| 2026-04-25T10:18:00+07:00 | Fixed Header-Body Alignment & Color Consistency | Added 5px column spacers to match ResizeHandles, standardized background opacity to 95%, and aligned left borders for perfect visual continuity |
| 2026-04-25T10:22:00+07:00 | Synchronized Active Row Highlight Colors | Applied dynamic bg-primary/10 tint to Message, Hash, and Author columns when selected to ensure seamless highlight across the entire row |
| 2026-04-25T10:25:00+07:00 | Eliminated Highlight Gaps (Spacer Merge) | Merged separate 5px spacer divs into column widths and adjusted paddings to ensure a continuous, gap-free selection highlight across the row |
| 2026-04-25T10:26:00+07:00 | Removed Left Shadow from Message Column | Deleted the inner shadow on the left side of the commit message column to achieve a flatter, more seamless aesthetic integrated with the graph area |
| 2026-04-25T10:52:00+07:00 | Implemented GitKraken-Style Graph Overlay | Refactored CommitRow into a 3-layer architecture: Layer 1 uses opaque bg-background to cleanly mask overflowing graph lines. Layer 2 applies a uniform, single-div highlight over both the graph and text columns. Layer 3 holds the content on top. This ensures perfect color consistency for hover/active states across all columns and a professional IDE aesthetic. |
| 2026-04-25T10:55:00+07:00 | Implemented Manhattan Graph Routing | Replaced diagonal/single-corner curved lines with proper Manhattan Routing (S-curves). Lines now travel vertically from nodes, bend horizontally to target lanes, and travel vertically again. This perfectly mimics GitKraken's graph style. |
| 2026-04-25T11:19:00+07:00 | Added Stability & Build Rules | Created `.agents/rules/stability-and-build-rules.md` containing core guidelines for zero-crash development, strict compilation checks, and clean architecture standards to ensure build stability and runtime performance. |
| 2026-04-25T11:24:00+07:00 | Implemented Node Avatars & Refined Manhattan Routing | Integrated Gravatar support for commit nodes with fallback author initials. Optimized Manhattan Routing to use a midpoint Z-curve for all edges, significantly improving the graph's visual flow. Increased lane spacing and node size for better legibility. |
| 2026-04-25T11:28:00+07:00 | Optimized Graph Intersection & Horizontal-First Routing | Implemented "Horizontal-First" Manhattan routing where side branches depart from node equators. Integrated Anchor Points (NODE_R offset) to prevent lines from intersecting node centers. Standardized all nodes to `NODE_R=12` and enabled `preserveAspectRatio` for pixel-perfect avatars. |
