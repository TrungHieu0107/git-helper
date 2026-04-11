# GitManager App Memory
## Version: 2.4.6
## Last updated: 2026-04-11 – Completed GitKit visual overhaul Phase 1 (Sidebar, CommitGraph, RightPanel, Toolbar)

## Project: GitKit

- 2026-04-05: Scaffolded Phase 0 of the GitManager App. Setup Tauri 2 with React + TypeScript template. Installed Tailwind CSS v4, Zustand, and `@tanstack/react-virtual`. Added `git2` and `serde` dependencies for Rust. Created initial 3-column layout shell in React. Initialized document registry.
- 2026-04-05: Implemented "Open Repo" capability and Phase 1 tasks. Intervened with Tauri plugins (`tauri-plugin-dialog`) to open OS folders. Upgraded Rust back-end with modules for Repo validation, Git Status retrieval, Differential patches viewing, Staging toggles, and unified Committing mechanism. Refactored `<App />` layout mapping directly to the `Zustand` store for real-time reactivity without Prop Drilling.
- 2026-04-05: Completely refactored the interface utilizing the raw GitKraken specs providing a Top Toolbar, unified Left Panel navigation (Repositories, Stashes, Remotes), graphical Commit Row structure maps, and Right Panel advanced Context staging. Complied fully with user request to visually mock components (D3 lanes, remote branches) without artificially skewing `store.ts`. `FEATURE_REGISTRY` & `PROJECT_CONTEXT` up to date.
- 2026-04-05: Implemented Phase 2: Commit Graph dynamic topological tracking. Moved pseudo stub graph arrays out and wrote complete Git branch iteration via `get_log` using topological and time sorting via `git2::Revwalk`. Computed a real-time `active_lanes` mapping logic directly from Rust that feeds continuous nodes and directional edges safely out to the UI. Fully refactored `CommitGraph.tsx` React logic into dynamically routing SVG Lane vectors to render curved overlapping graph pathways properly isolating branch paths without disrupting the `useAppStore`.
- 2026-04-05: Commit Graph Visual Fix — rewrote CommitGraph.tsx to match GitKraken style. Separated avatar from graph node (avatar as HTML, graph as per-row SVG). Fixed z-order: pass-through lines → bezier edges → circle → inner dot. 36px row height, no clipping, proper S-curve beziers. Small r=5 circles with r=2 inner dark dots.
- 2026-04-05: Sidebar Dynamic Data — removed static mock arrays and Pull Requests/Issues dummy sections. Sidebar now derives local/remote branch lists from commitLog refs. Added filter input, empty states, and remote branch grouping by remote name.
- 2026-04-05: Commit Graph Edge Direction Fix — branch-off edges use horizontal-first bezier (M xA 18 C xA 18, xB 18, xB 36), merge edges use vertical-first bezier (M xFrom 36 C xFrom 18, xFrom 18, xTo 18). Avatar fully HTML with hue-based AvatarFallback. classifyEdge() determines type from parent count.
- 2026-04-05: Commit Graph Bezier Fix — exact control points (branch-off: C x1 27 x2 27; merge: C x1 9 x2 9). Continuous vertical lane lines through nodes. Active lanes tracked per row with consistent SVG width. Debug log added. Custom scrollbar CSS component created in index.css and applied to all scrollable containers.
- 2026-04-05: Single SVG Graph Rewrite — complete rewrite using one continuous SVG for the graph area. Bezier formula: M x1 y1 C x1 yMid, x2 yMid, x2 y2. Avatar initials inside circle nodes (r=12). LANE_WIDTH=20. ResizableColumns hook + ResizeHandle for Label/Hash/Author columns. Custom scrollbar applied globally.
- 2026-04-05: Manhattan-Routed Commit Graph — replaced bezier curves with strict horizontal+vertical (L-shaped) routing matching GitKraken reference. Continuous vertical lane lines as background. Large nodes (r=14) with initials for regular commits, small dots (r=5) for merge points. LANE_W=30, ROW_H=50. Branch labels colored by lane.
- 2026-04-05: Commit Graph Corner Smoothing & Routing Fix — added border radius to Manhattan paths using calculated SVG arcs (A commands) substituting the hard 90-degree corners. Fixed branch-off edge routing direction: from parent to child, branch-off now goes horizontal then vertical up (or vertical down then horizontal from child to parent), whereas merges go vertical up then horizontal from parent to child.
- 2026-04-05: Detailed Branch Labels in Graph — removed "origin/" text from branch labels. Grouped local and remote references that point to the same commit into a single label, decorated with `Monitor` (local) and `Cloud` (remote) icons.
- 2026-04-05: Denser Commit Graph Layout — shrunk row spacing (50→36), lane width (30→20), node sizes (radius 14→10), and stroke constraints (3px→2px), achieving a more compact, GitKraken-like scale.
- 2026-04-05: Graph Lane Shifting (Left Packing) & Ghost Line Fix — completely rewrote `active_lanes` clearing in Rust `log.rs` memory to sweep and shrink lanes safely. Edges effectively shift to lower lane indexes once a parent completes its lifespan. Also removed SVG `laneSpans` from the React rendering that was drawing excess ghost vertical segments that were dead ends.
- 2026-04-05: Infinite Scroll Commit Graph — added `hasMoreCommits` and `isLoadingMore` state to store. Wired `CommitGraph` `onScroll` event to check distance from bottom, triggering progressive graph expansion (limit +200) by querying Tauri sequentially and re-evaluating layout.
- 2026-04-05: Highlight Active Branch Lineage — mapped lineage tracing in React `activeOids` (starts from HEAD's commit and traverses up `parents[0]`). Muted the opacity (0.25 on SVG, 0.4 on rows) of non-active branch nodes and paths to strictly emphasize the checked-out branch.
- 2026-04-05: Stash Display in Sidebar — actually implemented the Rust `list_stashes` stub via `git2::stash_foreach` to fetch actual stash logs and bind `timestamp`. Formatted stash messages in Sidebar as `[message] - time`.
- 2026-04-05: Sidebar Sectional Scrolling — replaced global scroll for the Sidebar list with isolated internal scrollbars for each open section (LOCAL, REMOTE, STASHES) using `flex-shrink` and `min-h-0`. This forces overflow into individual section boundaries allowing multiple large lists to coexist cleanly without breaking the layout.
- 2026-04-05: Resizable Sidebar Section Heights — added horizontal resize handles and `flex` based resizing logic to the `LOCAL`, `REMOTE`, and `STASHES` blocks. Users can now drag to adjust the vertical distribution of each section independently.
- 2026-04-05: Hierarchical Branch Tree (Worktree Style) — transformed the flat Sidebar branch list into a recursive tree structure. Branches containing slashes (e.g. `feat/login`) are now rendered as collapsible folders (`feat`) containing branch items (`login`), improving organization and readability.
- 2026-04-05: Sidebar Visual Separation — added `border-t` and `pt-2` to the main sections (LOCAL, REMOTE, STASHES) in the sidebar to better separate the containers.
- 2026-04-05: Sidebar UI Simplification — removed the fixed "Branches" label and expanded the filter input to full-width in the top-block to provide more space for search queries and a cleaner look.
- 2026-04-05: Un-stubbed Core Git Features — replaced backend mocks with real `git2-rs` implementation for `list_branches`, `pull`, `push`, `stash`, and `pop`.
- 2026-04-05: Enhanced Commit Log Paging — updated `get_log` backend to support `offset` and refactored `loadMoreCommits` for efficient paging.
- 2026-04-05: Integrated TopToolbar Actions — connected Pull, Push, Branch, Stash, and Pop buttons to their respective Git operations.
- 2026-04-06: Integrated Monaco Editor inside MainDiffView completely replacing CommitGraph conditionally when visualizing code patches. Re-engineered `git2-rs` blob reading to extract whole context via `encoding_rs` to smoothly decode Vietnamese (`windows-1258`) and Japanese (`shift_jis`) sources for developers without triggering unicode errors.
- 2026-04-06: Fixed Rust borrow checker errors in `checkout_branch` (`repo.rs`). Root cause: `conflict_files` Vec was mutably borrowed by `checkout_builder.notify()` closure while being read/moved later. Fix: wrapped `conflict_files` in `Arc<Mutex<>>`, extracted `build_checkout()` helper function, and scoped `checkout_builder` into blocks so it drops before accessing conflict data. Also removed unused `mut` on `local_branch` and fixed `as_object()` call on detached HEAD path.
- 2026-04-06: Implemented branch label grouping in the commit graph. Now only shows one primary branch badge per commit with a `+N` indicator if more branches/tags exist. Added an interactive hover dropdown that lists all additional branches, allowing users to trigger checkouts directly from the dropdown. 
- 2026-04-06: Added Repository Selector to TopToolbar. Replaced static "Git Helper" logo area with a dynamic dropdown listing recent repositories. Integrated with backend `get_recent_repos` and added "Open local repository..." capability using `@tauri-apps/plugin-dialog`. This allows users to switch between multiple Git projects or add new ones without leaving the main interface.
- 2026-04-06: Synchronized commit graph selection with the global store. Moved `selectedRowIndex` to `AppStore` to allow components like `CommitDetailPanel` to update the graph highlight. Enabled the **View Changes** button in the commit detail header to switch the UI back to the **WIP** (Working Tree) state by setting index to 0 and clearing commit details.
- 2026-04-09: Stash Lane Isolation — fixed a visual bug where stash nodes and lines overlapped with branch lines. Enhanced the backend layout engine to perform occupancy checks against `active_lanes` when placing stashes, ensuring each stash occupies a dedicated, conflict-free column.
- 2026-04-09: Rounded Stash Corners — updated `CommitGraph.tsx` to use `roundedPath` for stash connection lines. This applies a border radius to the horizontal-to-vertical corner, making the stash visualization consistent with the rest of the commit graph.
- 2026-04-09: Top Tab Bar & Multi-Repo Navigation — implemented a premium tabbed interface at the top of the application. Added a "Home" tab (default) and dynamic tabs for each opened repository. Updated `AppStore` and `loadRepo` to track multiple open repositories. Enhanced the "Home" view (WelcomeScreen) to display all currently open repositories as interactive cards alongside recent history.
- 2026-04-09: Home Tab Rendering Fix — resolved a critical bug where clicking the "Home" tab resulted in a blank screen (crash). Root cause was missing imports (`Monitor` icon and `RecentRepo` type) in `WelcomeScreen.tsx`.
- 2026-04-09: Persistent Sessions — added a Rust-based persistence layer to save and restore open repository tabs and the active tab ID across application reloads (Ctrl+R) and restarts. Created `app_state.json` in the app data directory to store the session state.
- 2026-04-09: App Startup Fix — resolved `ReferenceError: restoreAppState is not defined` by adding the missing import to `App.tsx`.
- 2026-04-09: Fetch All Remotes — implemented a "Fetch" button that executes `git fetch --all`. Added a new Rust command `fetch_all_remotes` and integrated it into the toolbar. The app automatically refreshes the commit graph after fetching.
- 2026-04-09: Auto-Refresh on Focus — added a light-weight status refresh mechanism that triggers whenever the application window gains focus. This keeps the staged/unstaged file lists up-to-date with external changes automatically.
- 2026-04-09: Sync Counts & Logic Fixes — implemented ahead/behind commit counts on the Pull/Push buttons. Fixed a missing import for `refreshActiveRepoStatus` and resolved a Monaco disposal error by adding a unique key to the Diff Editor.
- 2026-04-09: Advanced Stash Management — replaced the stash ellipsis icon with a right-click context menu. Implemented a selective stash feature ("Unstaged Only") using `git stash push --keep-index` via the backend `stash_save_advanced` command. Created a high-fidelity `CreateStashDialog` with real-time file previews, custom messages, and untracked file support. Fixed `ReferenceError: MoreHorizontal is not defined` in the Sidebar.
- 2026-04-09: Stash Preference Persistence — integrated stash settings (mode and include untracked) into the app-wide persistence layer. The app now remembers your last used stash configuration across restarts.
- 2026-04-09: Deep Auto-Refresh on Focus — implemented a high-performance refresh system that re-synced staged/unstaged file status and diff content on window focus. Used Tauri-native window events, 300ms debouncing, and Monaco `setValue()` safe updates to ensure a flicker-free, robust experience.
- 2026-04-10: **Backend & Frontend Architectural Refactor** – Successfully transitioned the monolithic codebase into a domain-scoped modular architecture to improve maintainability and performance.
    - **Backend**: Decomposed the monolithic `commands.rs` (and associated repo logic) into `commands/repo/` (`meta.rs`, `ops.rs`), `commands/branch/`, and `commands/stash/`. Updated `lib.rs` to register commands from new modules.
    - **Status Logic**: Re-implemented status reporting in `status.rs` with native `git2` rename tracking and improved staging detection.
    - **Frontend State**: Sliced the monolithic `AppStore` into domain-specific slices (`repoSlice`, `logSlice`, `stashSlice`, `uiSlice`) using Zustand's `StateCreator` pattern.
    - **Types & Integration**: Re-exported all core types from `store/index.ts` to maintain functional parity; verified type safety with `tsc` and backend integrity with `cargo check`.
    - **Logic Consistency**: Synchronized `AppStateData` and `RepoState` schemas between Rust and TypeScript to ensure persistent state stability.

- 2026-04-10: Comprehensive Documentation Suite — performed a full codebase analysis and generated a set of professional technical documents in the `/docs` directory. This includes `architecture.md` (tech stack, data flow), `spec.md` (feature status), `user_flow.md` (Mermaid interaction maps), `docs.md` (developer reference), `bug_registry.md` (technical debt), and `changelog.md` (reconstructed history). Updated root `README.md` to serve as a high-fidelity documentation hub.

- 2026-04-11: Pull Strategy Support — Implemented a comprehensive pull system supporting `Fast-Forward Only`, `Merge`, and `Rebase` strategies. 
    - **Backend**: Updated `pull_remote` command with internal fetching, a robust pre-flight check for unstaged changes (blocking modified tracking files while allowing staged/untracked), and multi-strategy execution logic. Rebase is handled via CLI delegation for production stability.
    - **Persistence**: Updated `AppStateData` to include `pull_strategy` preference with default fallback, ensuring settings survive application restarts.
    - **Frontend**: Sliced and updated `uiSlice` with new states. Refactored `pullRepo` logic to coordinate loading states and result toast notifications.
    - **UI/UX**: Implemented a modern Split-Button in the `TopToolbar` for Pull, featuring a strategy selection dropdown with behavioral polish (Escape/outside click close) and animated loading indicators. Resolved TODO-002.
- 2026-04-11: Fixed `Uncaught ReferenceError: className is not defined` in `TopToolbar.tsx` by correctly destructuring the `className` prop in `ToolbarButton`.
- 2026-04-11: Implement Remote Branch Checkout — Added seamless support for checking out remote branches from the commit graph and sidebar.
    - **Backend**: Implemented `resolve_checkout_target` to automatically handle remote-to-local ref resolution. Updated `checkout_branch` to switch to existing local tracking branches or create new ones with `set_upstream`. Refactored `safe_checkout` to dry-run against the effective local tip, ensuring accurate conflict detection even when clicking remote tags.
    - **Frontend**: Updated `Sidebar.tsx` tree view to propagate remote prefixes, ensuring full ref names are passed to the backend. Verified `CommitGraph.tsx` badge click logic.
- 2026-04-11: Fix `ops.rs` Compilation Error — Resolved an "unexpected closing delimiter" syntax error in `src-tauri/src/commands/repo/ops.rs`. Restored missing `build_checkout` and `extract_conflicts` helper functions that were accidentally deleted, ensuring branch checkout and conflict detection logic is fully functional. Verified fix with `cargo check`.
- 2026-04-11: Implemented **Amend Previous Commit** workflow (v2.1.1).
    - **Backend**: Update `create_commit` to preserve author info using `commit.amend`. Added `get_head_commit_info` for pre-population and safety checking. Implemented guards for detached HEAD and empty repositories.
    - **Frontend**: Integrated amend metadata display, pushed-to-remote warnings, and automatic state resets on navigation. Allowed message-only amends.
    - **Quality**: Resolved compilation errors related to `Signature` lifetimes and Tauri IPC serialization for `CommitResult`.
- 2026-04-11: Fixed "Amend previous commit" checkbox responsiveness and backend connection.
    - **Logic**: Implemented optimistic updates in `handleAmendToggle` for instant visual feedback.
    - **Bug Fix**: Resolved a casing mismatch in the `get_head_commit_info` invoke call (`repo_path` -> `repoPath`) that caused silent failures.
    - **Feedback**: Added toast error reporting to `RightPanel.tsx` for better debugging visibility.
- 2026-04-11: Implemented robust Push Workflow (v2.2.0).
    - **Backend**: Added `push_current_branch` and `list_remotes`. Implemented `PushMode` and `PushResult` enums. Added CLI delegation for `--force-with-lease` safety.
    - **Frontend**: Transformed Push button into a Split-Button in `TopToolbar.tsx`. Added `SetUpstreamDialog.tsx` for untracked branches.
    - **Alerting**: Implemented amber warning indicator and "Amend Push" state triggered by local amendments.

- 2026-04-11 (v2.3.0): 
  - Implemented **Commit Graph Virtualization** using `@tanstack/react-virtual` v3.
  - Refactored `CommitGraph.tsx` to handle 10k+ rows with 60fps scrolling.
  - Optimized SVG rendering by filtering non-visible edges and nodes.
  - Completed **Force Checkout** workflow with safety stashing and UI alerts.
  - Added "Force Reset to Origin" to Sidebar and Branch Selector context menus.
- 2026-04-11 (v2.3.1): 
  - Fixed JSX syntax error in `ForceCheckoutAlert.tsx`.
  - Resolved TypeScript errors regarding `setBranchContextMenu` scoping.
  - Cleaned up unused variables and imports in `Sidebar`, `TopToolbar`, `CommitGraph`, and `ConflictEditorView`.
  - Verified clean production build with `npm run build`.
- 2026-04-11 (v2.3.2): 
  - Fixed UI bug in `CreateBranchDialog` where the "Source Branch" dropdown was obscured by the dialog container.
  - Removed `overflow: hidden` from `.create-branch-dialog` class in `index.css` to allow absolute-positioned overlays to render outside the dialog boundaries.
- 2026-04-11 (v2.3.3): 
  - Initiated comprehensive UI/UX redesign. Created implementation plan for 5-stage overhaul affecting Design System, Sidebar, Commit Graph, Right Panel, and Top Toolbar.
- 2026-04-11 (v2.3.4):
  - **Request**: Complete redesign of GitKit UI for premium look and feel.
  - **Reason**: Standardize visual hierarchy, improve readability, and achieve "GitHub-dark" level depth.
  - **Changes**:
    - `index.css`: Defined design tokens (--bg-main, --bg-panel, etc.) and global typography classes.
    - `Sidebar.tsx`: Redesigned SectionHeaders, BranchTreeItems (28px height, active pill state), Search bar, and Stash cards.
    - `CommitGraph.tsx`: Redesigned Ref badges (premium pills), sticky headers, author avatars, and hash copy functionality. 36px row height.
    - `RightPanel.tsx`: Redesigned FileRows (26px height), StatusIcon pills, and Commit area with Amend toggle.
    - `TopToolbar.tsx`: Grouped actions with vertical separators and refined icon buttons. Added Active Branch indicator to RepoSelector.
  - **Status**: Completed Phase 1 UI/UX redesign.

- 2026-04-11 (v2.3.5): 
  - **Feature**: Modularized Sidebar stashes into src/components/Sidebar/Stashes.tsx.
  - **Fix**: Resolved JSX syntax error in Sidebar.tsx and cleaned up legacy code.
  - **Refinement**: Applied premium redesign styling to modular components.

- 2026-04-11 (v2.3.6): 
  - **Fix**: Resolved ReferenceError in TopToolbar.tsx by properly destructuring activeBranch in the RepoSelector component.
  - **Rules of Hooks Violation**: Resolved a critical runtime error in `CommitGraph.tsx` where `useState` was being called inside a `map` loop.
  - **CommitGraph Modularization**: Extracted row rendering logic into dedicated `CommitRow` and `WipRow` components in `src/components/CommitGraph/`.
  - **Logic Isolation**: Isolated the "Copy Hash" state for each commit row, ensuring stable and independent state handling.

- 2026-04-11 (v2.4.4):
  - **Refinement**: Further reduced sidebar and section headers to **7px** to create an extremely sharp, high-density visual contrast between headers and content.

- 2026-04-11 (v2.4.5):
  - **Feature**: Implemented Stash Lane Isolation (v2).
  - **Reason**: Stash nodes were overlapping with branch lines.
  - **Changes**: 
    - Moved stash commits to dedicated lanes starting from `active_lanes.len() + 1`, effectively pushing them "outside" the branch graph area.
    - Implemented active branch highlighting in the commit graph, ensuring the badge for the current checkout is visually distinct.

# Project Status: Stable (v2.4.5)
The GitKit application is stable.
- **Stash Isolation**: Stash commits are now dynamically pushed to the right of all active branch lines, providing a clear "outside" representation as requested.
- **Active Branch Highlighting**: The commit graph now visually highlights the name of the currently active branch in its ref badges, making navigation and focus much easier.

---

### 2026-04-11 – File Context Menu & History Modal
**Reason**: Enhance file-level productivity and transparency by allowing users to manage files directly and explore their deep history without leaving the app.

**Changes**:
- **Backend Commands**:
    - `open_file`: Launches the default system editor for a given path.
    - `reveal_file`: Opens the file explorer and selects the target file.
    - `discard_file_changes`: Intelligent deletion (untracked) or checkout (tracked) to revert file state.
    - `get_file_log`: Uses `revwalk` and `pathspec` to retrieve specific file history, optimized for large repos.
- **Frontend Components**:
    - `FileContextMenu`: A Portal-based floating menu for the Right Panel.
    - `FileHistoryModal`: A large-scale modal for commit-by-commit history exploration.
- **Refactors**:
    - `MainDiffView`: Parameterized to support both `staged/unstaged` and `commitOid` overrides, enabling historical diffs.
- **State Management**:
    - `uiSlice`: Added modal controls and path persistence.

**Old vs New**:
- *Old*: Viewing file history was not possible; discarding required "Discard All"; opening files required manual navigation.
- *New*: Right-click any file for deep operations; full-screen history modal with integrated diffing.

**Status**: Version 2.5.0 ✓