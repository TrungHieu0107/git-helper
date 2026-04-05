# Git Manager App (GitKit) - Project Context

## Architecture
- Frontend: React 18 + TypeScript + Tailwind CSS v4
- Backend: Rust (git2 crate)
- Shell: Tauri 2
- State: Zustand
- Virtualization: @tanstack/react-virtual
- UI Layout: GitKraken-style 3-column fixed layout (Left Sidebar 220px, Center Flex, Right Sidebar 340px) + Top Toolbar. Colors map to Dark Mode JetBrains styling.

## Folder Structure
- `src-tauri/src/git/` - Git modules
- `src-tauri/src/commands/` - Tauri command registration
- `src/components/` - Splitted isolated React UI components (TopToolbar, Sidebar, CommitGraph, RightPanel)
- `src/store/` - Zustand store

## Data Persistence & Loading
- Recent Repositories are saved to `{app_data_dir}/recent_repos.json` via standard Rust `std::fs`.
- Repositories can be opened via:
  1. Welcome Screen Folder Picker
  2. Welcome Screen / Sidebar Repo Switcher Recent List
  3. Drag and Drop folder anywhere in the app