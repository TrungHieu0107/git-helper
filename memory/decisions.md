# Technical Decisions
## Version: 1.1.0
## Last updated: 2026-04-11
## Project: GitKit

### 2026-04-09 — Centralized Advanced Branching System
- **Decision**: Replaced the native `prompt()` in the toolbar and the legacy inline dialog in the context menu with a shared, professional-grade `CreateBranchDialog` component.
- **Reason**: To support complex workflows like pushing to remotes and tracking remote branches from a single entry point, while providing real-time validation and smart auto-stashing.
- **Consequences**:
    - Unified UX across Different entry points.
    - Improved safety by checking working tree state proactively.
    - Better error handling and user feedback.
- **Status**: Active

### 2026-04-09 — Use Git CLI for Advanced Stash Push
- **Decision**: Implemented `stash_save_advanced` by invoking the `git` CLI directly via `std::process::Command` instead of using `libgit2` bindings.
- **Reason**: `libgit2` does not natively support the `--keep-index` workflow (which is essential for stashing only unstaged changes). Invoking the CLI is the most reliable way to achieve this standard Git behavior.
- **Consequences**:
    - Requires `git` to be available in the system's PATH.
    - Enables features like selective stashing and including untracked files with custom messages.
- **Status**: Active

### 2026-04-10 — Orchestrated Multi-Commit Cherry Pick with Rust bindings
- **Decision**: Developed the multi-commit sequence recursively in frontend calling pure `cherry_pick_commit` one OID at a time under Rust, instead of executing looping block natively.
- **Reason**: Maintaining `CHERRY_PICK_HEAD` manually via `git2` while orchestrating array tracking provides UI visibility over "Remaining Tasks" seamlessly and leaves pausing strictly atomic without blocking execution threads or dropping sequence state if closed.
- **Consequences**:
    - Simplifies state restoration after restart/crash.
    - Requires `cherryPickSlice` and `invokeCherryPick` recursion pattern on the frontend.
- **Status**: Active

### 2026-04-10 — Three-Pane Monaco Editor for Conflict Resolution
- **Decision**: Implemented a 3-pane side-by-side Monaco `Editor` view instead of standard `DiffEditor` for conflict resolution, explicitly pushing raw disk files to the center pane (which holds conflict markers).
- **Reason**: Standard Git conflict resolution relies heavily on developers manually cleaning or merging "Ours" and "Theirs". A 3-pane structured view gives raw visibility before saving the resolved state to the Git index directly.
- **Alternatives considered**: Using generic `DiffEditor` modes. However, 3 separate `Editor` instances in a flex layout ensure better state stability without Monaco diff race conditions.
- **Status**: Active

### 2026-04-10 — Monaco Line-Boundary Alignment for Git Conflict Markers
- **Decision**: Implemented an explicit whitespace-padding algorithm in `conflictParser.ts` for ours vs theirs content array maps rather than trimming to blocks.
- **Reason**: Maintaining exactly parallel `line.length()` to the raw git file across all panels enables `monacoDecorations.ts` mapped delta-decorations to accurately hit target rows synchronously avoiding diff coordinate bugs, and synchronized 3-way vertical scrolling remains locked 1:1.
- **Alternatives considered**: Filtering out `normal` code exclusively for the side panels and dropping empty spacing padding.
- **Status**: Active

### [2026-04-11] — ROW & SVG VIRTUALIZATION
- **Decision**: Implemented vertical row virtualization and dynamic SVG edge filtering.
- **Reason**: Standard HTML rendering became slow (>100ms lag) at 1000+ commits.
- **Alternatives considered**: Heavy backend-side SVG tiling (too complex for state sync).
- **Status**: Active

### 2026-04-11 — Overflow Visible for Dialog Overlays
- **Decision**: Changed `overflow: hidden` to `overflow: visible` for `.create-branch-dialog`.
- **Reason**: The dialog contains absolute-positioned dropdowns (Source Branch selector) that extend beyond the dialog boundaries. `overflow: hidden` was clipping these menus, making them inaccessible.
- **Alternatives considered**: Using React Portals for the dropdown. However, for a one-off UI fix, modifying the CSS to allow visibility is more efficient and maintains the current architecture.
- **Status**: Active

### 2026-04-11 — Support Historical Diff Views
- **Decision**: Refactored `MainDiffView` to prioritize explicit props (`path`, `commitOid`) over global store state.
- **Reason**: To allow the `FileHistoryModal` to render historical diffs without corrupting or competing with the main application's working tree diff state.
- **Alternatives considered**: Creating a separate `HistoryDiffView` component (rejected as it would lead to code duplication and inconsistent rendering logic).
- **Status**: Active

### 2026-04-11 — Initial Commit Diffing
- **Decision**: Implemented `log::get_file_log` to compare initial commits against a transient empty tree.
- **Reason**: `git2`'s `Diff::tree_to_tree` requires two trees. Root commits have no parent. Comparing against an empty tree ensures the initial introduction of a file is captured as a "change" (additions).
- **Status**: Active

<!-- Antigravity -->

### 2026-04-12 � Hover Bridge for Branch Dropdowns
- **Decision**: Removed the 4px margin and implemented a transparent pseudo-element "bridge" (`before:`) connecting the branch badge to the dropdown menu.
- **Reason**: To solve a common UI bug where the dropdown closes prematurely when the mouse moves through the visual gap. This ensures the user remains "hovering" over the parent container while navigating between the trigger and the list.
- **Status**: Active
