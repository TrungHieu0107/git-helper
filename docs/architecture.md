# System Architecture
## Version: 2.10.1
## Last updated: 2026-04-12 – Documenting modular IPC surface and reset workflow.
## Project: GitKit

GitKit is a high-performance Git management application built with Tauri 2, combining a robust Rust backend with a reactive React frontend.

## 1. Tech Stack

- **Core**: [Tauri 2](https://v2.tauri.app/) (Rust backend, WebView frontend)
- **Backend (Rust)**:
    - [git2-rs](https://docs.rs/git2/latest/git2/) (libgit2 bindings for most operations)
    - [rayon](https://docs.rs/rayon/latest/rayon/) (parallel computation for graph layout)
    - [chardetng](https://docs.rs/chardetng/latest/chardetng/) / [encoding_rs](https://docs.rs/encoding_rs/latest/encoding_rs/) (automatic charset detection and decoding)
    - [serde](https://serde.rs/) (serialization for IPC)
- **Frontend (TS/React)**:
    - [React 19](https://react.dev/)
    - [Zustand](https://zustand-demo.pmnd.rs/) (sliced state management)
    - [Tailwind CSS v4](https://tailwindcss.com/) (styling)
    - [Monaco Editor](https://microsoft.github.io/monaco-editor/) (diff and conflict resolution)
    - [@tanstack/react-virtual](https://tanstack.com/virtual/v3) (virtual scrolling for large commit logs)
    - [Lucide React](https://lucide.dev/) (icons)

## 2. Directory Structure

```text
/
├── .agents/                # AI Assistant workflows and skills
├── docs/                   # Full documentation suite
├── src/                    # Frontend source code
│   ├── components/         # UI components (Atomic design)
│   ├── lib/                # Utility logic, API wrappers, Git interactors
│   ├── store/              # Zustand store with domain slices
│   │   └── slices/         # domain logic (repo, log, ui, cherry-pick)
│   ├── App.tsx             # Application shell and modal host
│   └── index.css           # Global styles and Tailwind v4 input
├── src-tauri/              # Backend source code
│   ├── src/                # Rust source
│   │   ├── commands/       # Tauri IPC command modules (domain-scoped)
│   │   │   ├── repo/       # Repository operations (open, reset, checkout)
│   │   │   ├── log/        # Commit log and graph layout
│   │   │   ├── stash/      # Stash management
│   │   │   ├── diff/       # Code diffing and commit detail retrieval
│   │   │   ├── branch/     # Branch listing and validation
│   │   │   ├── remote/     # Fetch, Pull, Push, and remote tracking
│   │   │   └── cherry_pick/# Cherry-pick and conflict resolution
│   │   └── lib.rs          # Tauri command registration
│   └── tauri.conf.json     # Tauri configuration
└── memory/                 # Persistent AI context and API references
```

## 3. IPC / API Surface

Summarized command list from `src-tauri/src/lib.rs`.

| Category | Command | Params | Purpose |
|---|---|---|---|
| **Repo** | `open_repo` | `path: String` | Validates and opens a Git repository |
| | `reset_to_commit` | `path, oid, mode` | Resets current HEAD to target commit |
| | `safe_checkout` | `path, branch` | Dry-run checkout with conflict detection |
| | `restore_file_from_commit` | `repo, oid, file` | Check out a single file from history |
| **Log** | `get_log` | `path, limit, offset` | Fetches commit history with graph layout |
| | `get_file_log` | `path, file` | Fetches commit history for a specific file |
| **Staging**| `get_status` | `path` | Fetches working tree and index status |
| | `create_commit` | `path, msg, amend` | Creates a new commit or amends HEAD |
| **Diff** | `get_diff` | `path, file, staged` | Fetches diff for a file in working tree |
| | `get_file_contents`| `path, file, oid` | Fetched historical file contents |
| **Remote** | `pull_remote` | `path, remote, strategy` | Pulls branch with FF/Merge/Rebase |
| | `push_remote` | `path, rem, head, lease` | Pushes branch to remote |
| **Cherry-Pick** | `cherry_pick_commit` | `path, oid` | Initiates cherry-pick workflow |

## 4. State Management (Zustand)

The store is divided into modular slices:

- **`repoSlice`**: Active repository path, branch name, `RepoInfo` (HEAD hash, name), and `RepoStatus` (ahead/behind counts).
- **`logSlice`**: The `commitLog` array containing `CommitNode` objects with pre-calculated graph lanes and edges.
- **`uiSlice`**: Orchestrates UI visibility (modals, dialogs, active tab, loading states). Hosts `resetToCommitTarget`.
- **`cherryPickSlice`**: Tracks state of active cherry-pick operations, including conflict files and progress.
- **`stashSlice`**: Manages stash listing and visibility.

## 5. Key Architectural Decisions

1. **Topological Graph Layout in Rust**: Path calculation and lane assignment for the commit graph are performed in Rust during `get_log`. The UI receives exactly where to draw lines and circles, ensuring performance for 10k+ nodes.
2. **Manhattan Routing**: The graph uses strict vertical and horizontal segments with rounded corners (SVG arcs), providing a premium GitKraken-like look.
3. **Encoding Pipeline**: All file reads go through a charset detection layer (`chardetng`) to handle international encodings correctly in the Monaco editor.
4. **Modal Hosting in App.tsx**: All global dialogs (Reset, CheckoutAlert, RestreFileAlert) are hosted at the root to avoid nesting issues and simplify z-index management.
