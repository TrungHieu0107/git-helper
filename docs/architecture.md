# Architecture Overview
## Version: 1.1.0
## Last updated: 2026-04-10 – Modularized Architecture Update
## Project: GitKit

GitKit is a high-performance Git client built with Tauri 2, Rust, and React. It follows a domain-scoped, modular architecture with a clear separation between Git logic (Rust) and the user interface (React).

## Technology Stack

### Core
- **Framework**: [Tauri 2](https://tauri.app/) (v2.x)
- **Backend**: [Rust](https://www.rust-lang.org/) (2021 edition) - Modular domain-scoped commands.
- **Frontend**: [React 19](https://react.dev/) + TypeScript + [Vite 7](https://vitejs.dev/) - Sliced state management.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)

### Key Libraries
- **Git Engine**: [git2-rs](https://docs.rs/git2/latest/git2/) (v0.19) - Rust bindings for libgit2.
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (v5.x) - Sliced store architecture for performance and modularity.
- **Virtualization**: [@tanstack/react-virtual](https://tanstack.com/virtual/latest) (v3.x) - For high-performance commit logs.
- **Code Editor**: [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) (v4.7) - For diff views.
- **Icons**: [Lucide React](https://lucide.dev/) (v1.x)
- **Encoding**: `encoding_rs` - For multi-encoding file support.

## Directory Structure

```text
├── docs/                   # Documentation files
├── src/                    # Frontend source (React)
│   ├── assets/             # Images and styles
│   ├── components/         # Modular isolated UI units
│   ├── lib/                # Shared utilities (repo logic, toasts)
│   ├── store/              # Zustand store definition
│   │   ├── slices/         # Domain-scoped state slices (repo, log, stash, ui)
│   │   └── index.ts        # Combined store entry point
│   ├── App.tsx             # Main layout and event listeners
│   └── main.tsx            # React entry point
├── src-tauri/              # Backend source (Rust)
│   ├── src/
│   │   ├── commands/       # Domain-scoped Tauri IPC command modules
│   │   │   ├── repo/       # Repository meta and ops logic
│   │   │   ├── branch/     # Branch management
│   │   │   ├── stash/      # Stash lifecycle management
│   │   │   ├── log/        # Commit history and graph logic
│   │   │   ├── diff/       # Differential patch generation
│   │   │   ├── remote/     # Remote operations (pull, push, fetch)
│   │   │   └── status.rs   # Working tree status and rename tracking
│   │   ├── git/            # Low-level Git operations (git2 wrappers)
│   │   ├── lib.rs          # Tauri initialization and modular registration
│   │   └── main.rs         # Entry point
│   ├── tauri.conf.json     # Tauri configuration
│   └── Cargo.toml          # Rust dependencies
└── package.json            # Frontend dependencies and scripts
```

## Data Flow

GitKit uses a unidirectional data flow from the Git repository (local disk) to the UI.

```mermaid
graph LR
    Disk[(Git Repo)] -- git2 --> Rust[Rust Logic]
    Rust -- Serialize --> TauriCLI[Tauri IPC]
    TauriCLI -- Invoke --> Zustand[Zustand Slices]
    Zustand -- State --> React[React Component]
    React -- Action --> TauriCLI
```

1.  **State Sync**: UI actions trigger Tauri commands.
2.  **Rust Execution**: Commands use `git2` to interact with the repository. They are organized into domain-specific modules.
3.  **Frontend Update**: Commands return serialized JSON, which the frontend uses to update the relevant **Zustand Slices**.
4.  **Re-render**: React components subscribe to specific state slices to minimize unnecessary re-renders.

## Tauri IPC Commands

Commands are organized into modules in `src-tauri/src/commands/`.

| Domain | Command | Responsibility |
|---|---|---|
| **Repo** | `open_repo`, `get_repo_status`, `check_working_tree` | Metadata, counts, and repository-level checks. |
| **Branch**| `list_branches`, `create_branch`, `checkout_branch`, `safe_checkout` | Branch lifecycle and safe switching logic. |
| **Stash** | `list_stashes`, `create_stash`, `apply_stash`, `pop_stash`, `drop_stash` | Stash management and conflict handling. |
| **Log** | `get_log` | Commit history with lane routing. |
| **Diff** | `get_diff`, `get_file_contents` | Patch generation and blob reading. |
| **Remote**| `fetch_all_remotes`, `pull_remote`, `push_remote` | Network operations. |
| **Status**| `get_status` | Working tree status with rename tracking. |

## State Management (Zustand Slices)

The store is split into domains to keep the global state manageable and avoid performance bottlenecks:

- **`RepoSlice`**: `activeRepoPath`, `repoInfo`, `repoStatus`, file lists.
- **`LogSlice`**: `commitLog`, commit details, search, pagination.
- **`StashSlice`**: Stash list, creation UI state, stashed preferences.
- **`UISlice`**: Tabs, navigation, toasts, global modals.

> [!TIP] Integration:
> All slices are recomposed into a unified `AppStore` in `src/store/index.ts`, allowing components to use a single hook `useAppStore` while maintaining internal modularity.
