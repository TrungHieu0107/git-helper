# Git Manager App (GitKit) - Project Context

## Architecture
- Frontend: React 18 + TypeScript + Tailwind CSS v4
- Backend: Rust (git2 crate)
- Shell: Tauri 2
- State: Zustand
- Virtualization: @tanstack/react-virtual

## Folder Structure
- `src-tauri/src/git/` - Git modules
- `src-tauri/src/commands/` - Tauri command registration
- `src/store/` - Zustand store