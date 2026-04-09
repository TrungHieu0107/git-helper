# Developer Reference
## Version: 1.0.0
## Last updated: 2026-04-09 – Initial developer reference
## Project: GitKit

This document provides technical guidance for developers working on GitKit.

## Getting Started

### Prerequisites
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Commands
| Task | Command |
|---|---|
| Development | `npm run dev` |
| Build (Windows) | `.\build.bat` or `npm run tauri build` |
| Preview | `npm run preview` |

## Implementation Deep-Dives

### 1. Commit Graph Lane Assignment
The lane assignment is calculated in `src-tauri/src/commands/log.rs`.
- We use a greedy algorithm during the `revwalk`.
- For each commit, we look for its OID in the `active_lanes` vector.
- If found, it "claims" that lane and clears it for future reuse by its parents.
- If not found (e.g., a new branch head), it searches for the first `None` (empty) slot or pushes a new lane.
- **Merge commits** are classified by `parent_count > 1` and draw vertical-first beziers to their secondary parents.

### 2. Monaco Editor & Diff Models
Monaco is used for both viewing file contents and side-by-side diffs.
- In `src/components/MainDiffView.tsx`, we switch between `DiffEditor` and raw `Editor` based on the context.
- We manage models explicitly to avoid memory leaks or "stale" content when switching files.
- **Encoding Support**: Content is decoded on the Rust side using `encoding_rs` and passed as a string to the frontend to ensure proper rendering of non-UTF8 files.

### 3. State Persistence
GitKit persists two main things:
1.  **Recent Repos**: Stored in `recent_repos.json`.
2.  **App State**: Stored in `app_state.json`. This includes:
    - Open tabs (currently limited to 1, but designed for multi-tab support).
    - Last used stash mode (`all` vs `unstaged`).
    - Untracked files toggle preference.

## Patterns & Abstractions

### Tauri focus-changed Listener
Since Git is an external state, the app can get out of sync if files are modified outside the app.
- We listen for `tauri::WindowEvent::Focused` in `lib.rs`.
- This emits a frontend event `focus-changed`.
- The `App.tsx` component listens for this and triggers a `refreshActiveRepoStatus()` with a 300ms debounce to avoid rapid re-fetches.

### Error Handling
Backend errors are returned as `Result<T, String>`. Tauri maps the `Err` variant to a rejection in the frontend.
- Frontend logic uses `try-catch` blocks and the `addToast` utility in `src/lib/toast.ts` to present errors to the user.
- **Safe Checkout** uses a tagged union (`SafeCheckoutResult`) instead of an error to allow different UI paths (stash offer vs block).

> [!TIP] Optimisation:
> The commit log uses `@tanstack/react-virtual` with a fixed row height. Each row contains its own SVG segment, which is more performant than one giant SVG covering the whole list.
