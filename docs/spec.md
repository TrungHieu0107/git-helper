# Technical Specification
## Version: 3.1.0
## Last updated: 2026-04-21 – Feature specifications and implementation status.
## Project: GitKit

GitKit provides a robust set of Git features focused on developer productivity and visual clarity.

## Feature Implementation Status

### Core Repository Management
- **Repository Initialization**: `[Implemented]` - Detecting and opening existing git repositories via [repo.ts](file:///d:/learn/git-helper/src/lib/repo.ts).
- **Recent Repositories**: `[Implemented]` - Persistent list of previously opened repositories with "Last Opened" timestamps.
- **State Restoration**: `[Implemented]` - Automatically restores active tabs, stash settings, and UI preferences on startup.

### Visual Commit Graph
- **Manhattan Routing**: `[Implemented]` - Curvy SVG-based edge routing to visualize complex branch topologies in [CommitGraph.tsx](file:///d:/learn/git-helper/src/components/CommitGraph.tsx).
- **Virtualized Rendering**: `[Implemented]` - High-performance list capable of handling thousands of commits using `@tanstack/react-virtual`.
- **Branch/Tag Badges**: `[Implemented]` - Interactive badges with context menus for checkout and management.
- **WIP Node**: `[Implemented]` - Virtual node representing the current working tree state, dynamically connected to HEAD.

### Working Tree & Staging
- **Staging Management**: `[Implemented]` - Individual file staging/unstaging and "Stage All" / "Unstage All" functionality.
- **Diff Comparison**: `[Implemented]` - Real-time diffs using Monaco Editor with side-by-side and inline modes in [MainDiffView.tsx](file:///d:/learn/git-helper/src/components/MainDiffView.tsx).
- **Discard Changes**: `[Implemented]` - Safe discarding of file changes with interactive confirmation dialogs.

### Advanced Git Operations
- **Safe Checkout**: `[Implemented]` - Pre-checkout validation that detects local conflicts and prompts for stashing or discarding in [ForceCheckoutAlert.tsx](file:///d:/learn/git-helper/src/components/ForceCheckoutAlert.tsx).
- **Cherry-Picking**: `[Implemented]` - Support for cherry-picking single or multiple commits with a dedicated progress banner and conflict resolution workflow.
- **Stash Lifecycle**: `[Implemented]` - Stash Save (with untracked options), Apply, Pop, and Drop directly from the sidebar.
- **Conflict Resolution**: `[Implemented]` - Specialized [ConflictEditorView.tsx](file:///d:/learn/git-helper/src/components/ConflictEditorView.tsx) that automatically routes conflicts from Merge, Rebase, or Cherry-pick operations.

## Technical Constraints & Edge Cases

### IPC Performance
- Large diffs are truncated or streamed to prevent IPC payload limits.
- Commit logs are fetched in chunks of 100 to maintain frontend responsiveness.

### Conflict Detection
- The app detects `MERGE_HEAD`, `REBASE_HEAD`, and `CHERRY_PICK_HEAD` to determine the current repository state and adjust the UI accordingly.

### Encoding
- Non-UTF8 files are detected using `chardetng` in the Rust backend and handled via `encoding_rs` to ensure correct rendering in the Monaco editor.

## Planned Features
- **Partial Staging**: `[Planned]` - Staging individual hunks or lines from a file.
- **Interactive Rebase UI**: `[Planned]` - Drag-and-drop commit reordering and squashing.
- **Git Hooks Integration**: `[Planned]` - Visual feedback and management of pre-commit and post-commit hooks.
