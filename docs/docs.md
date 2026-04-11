# Developer Documentation
## Version: 1.1.0
## Last updated: 2026-04-11 – v2.1.0 Reference Sync
## Project: GitKit

This document provides developer-focused information on how to work with the GitKit codebase and explains core implementation patterns.

## 1. Getting Started

### Prerequisites
- [Rust](https://rustup.rs/) (v1.75+)
- [Node.js](https://nodejs.org/) (v20+)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Development Commands
```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build production bundle
npm run tauri build
```

## 2. Core Patterns

### Side-by-Side Diffing
The app uses Monaco Editor to render high-fidelity diffs.
- `get_file_contents` (Rust) retrieves raw file buffers.
- `encoding_rs` is used to decode buffers into UTF-8, handling legacy encodings like Windows-1258 or Shift-JIS.
- Files are compared using Monaco's `DiffEditor` component.

### Commit Graph Lane Routing
Graph lanes are calculated in the backend (`src-tauri/src/commands/log/mod.rs`) during commit iteration.
- Each branch is assigned a unique lane index.
- Lanes are "recycled" once a branch terminates to keep the graph compact.
- Stashes are assigned lanes to the extreme right of active branch lines to avoid visual noise.

### Safe Branch Switching
Branch switching uses a two-step "Safe Checkout" pattern:
1.  **Dry-Run**: `safe_checkout` uses `git checkout --dry-run` or equivalent internal checks to simulate the switch.
2.  **Resolution**: `resolve_checkout_target` normalizes remote branches (e.g., `origin/main`) to their local tracking counterparts.
3.  **Checkout**: Only if the dry-run is clean (or after a user-initiated stash) does `checkout_branch` execute the actual switch.

### 2.4 File History & History Modal
File history is fetched using `git2`'s `revwalk` combined with `DiffOptions::pathspec` filtering.
- **Log Calculation**: Iterates through commits reachable from HEAD, filtering by the specific file path.
- **Empty Tree Comparison**: For the first commit in a repo's history, the file is compared against an empty tree (created via `treebuilder`) to show all initial content as additions.
- **History Modal**: A full-screen overlay that isolates the diff view from the main working tree state. It reuses the `MainDiffView` component with explicit `path` and `commitOid` props.

### 2.5 File Operations
- **System Editor**: Uses `std::process::Command` to open files in the default system-registered editor (`open` on macOS, `cmd /c start` on Windows, `xdg-open` on Linux).
- **Safe Discard**:
    - **Untracked files**: Deleted from disk using `fs::remove_file`.
    - **Tracked files**: Reset from HEAD (`repo.reset_default`) and then checked out to synchronize the working tree.

## 3. Persistence Layer (`app_state.json`)

The application persists user sessions in the app-specific data directory.
- **Location**: `{app_data_dir}/app_state.json` (Managed by Rust `commands/repo/meta.rs`).
- **Persisted Data**:
    - Open repository tabs (`RepoTab` array).
    - Active tab ID.
    - Stash configuration (mode, include untracked).
    - Pull strategy preference (`PullStrategy` enum).

## 4. Troubleshooting

### Build Failures
- **Windows**: Ensure C++ Build Tools and WebView2 runtime are installed. Run `build.bat` for a diagnostic build.
- **cargo check**: Use this frequently during backend refactors to catch borrow checker issues early.

### Git Errors
- If a repository fails to open, verify that the current user has read/write permissions for the `.git` folder.
- The app assumes the `git` CLI is available in the system PATH for specific porcelain operations (clean, rebase).

> [!NOTE] Implementation Decision:
> We explicitly avoid `git2`'s `rebase` API because it is currently unstable and significantly more complex than the CLI counterpart. For production reliability, we delegate rebase operations to `std::process::Command`.
