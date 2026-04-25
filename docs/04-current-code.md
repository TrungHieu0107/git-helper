# 04 - Current Code
## Version: 1.1.0
## Last updated: 2026-04-25 – Compact UI Refactor
## Project: GitKit (git-helper)

### [2026-04-25] - Fix: Git Log Compilation Error
- **File**: `src-tauri/src/commands/log/mod.rs`
- **Change**: Added `use git2::BranchType;` to resolve E0433 error where `BranchType` was undeclared.
- **Verification**: Ran `cargo check -p tauri-app` successfully.

### [2026-04-25] - UI Tweak: Reduced Avatar Size
- **File**: `src/components/CommitGraph.tsx`
- **Change**: Reduced `NODE_R` from 12 to 9 (25% reduction) as requested by user.
- **Verification**: UI refreshed, build check passed.

### [2026-04-25] - UI Refactor: Compact UI (Design System)
- **Files**: `src/index.css`, `src/components/ui/Button.tsx`, `src/components/ui/Badge.tsx`, `src/components/ui/Input.tsx`, `src/components/Sidebar/index.tsx`, `src/components/TopToolbar.tsx`, `src/components/CommitGraph.tsx`, `src/components/CommitGraph/CommitRow.tsx`
- **Change**: Implemented a "Compact UI" theme by standardizing on 5-10px spacing (px-2.5, py-1.5, gap-1.5). Reduced row height in CommitGraph to 24px and toolbar height to 32px. Reduced font sizes across components to text-xs/text-[10px] where appropriate.
- **Verification**: Verified alignment and layout density. All components remain functional.

### [2026-04-25] - UI Tweak: Adjusted Commit Row Height
- **Files**: `src/components/CommitGraph.tsx`, `src/App.tsx`
- **Change**: Increased commit row height by 5px (24px -> 29px for compact, 32px -> 37px for normal) to improve legibility while keeping avatar size constant.
- **Verification**: Verified row spacing and alignment.

### [2026-04-25] - Feature: Asymmetric Edge Routing (GitKraken Style)
- **Files**: `src/components/CommitGraph.tsx`
- **Change**: Replaced the symmetric Manhattan routing with an asymmetric algorithm. Forking (branching to the right) now exits from the right side of the child and enters the top of the parent. Merging (to the left) exits from the bottom of the child and enters the right side of the parent. This ensures lines always touch node boundaries and never intersect node centers.
- **Verification**: Verified graph visual integrity and edge anchor points.

### [2026-04-25] - Feature: Standardized Stash Edge Routing
- **Files**: `src/components/CommitGraph.tsx`
- **Change**: Standardized Stash edge routing to use the same asymmetric Manhattan algorithm as main commits. Swapped coordinate ordering in `buildStashEdges` to ensure correct child-to-parent (top-to-bottom) flow. Updated SVG styling to use `strokeDasharray="6, 4"` and `opacity={0.7}` for better visual distinction and layering.
- **Verification**: Verified Stash connections align with the Manhattan grid and render correctly below main edges.
