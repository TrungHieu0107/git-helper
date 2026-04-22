# User Flows
## Version: 3.4.0
## Last updated: 2026-04-22 – High-Fidelity UI Modernization & Stability Hardening.
## Project: GitKit

This document maps user interactions to state changes and backend operations.

## Opening a Repository

```mermaid
sequenceDiagram
    participant User
    participant Welcome as WelcomeScreen
    participant Store as Zustand Store
    participant Repo as repo.ts
    participant Backend as Rust Backend

    User->>Welcome: Click "Open Local Repository"
    Welcome->>Repo: open_repo_dialog()
    Repo->>Backend: tauri-plugin-dialog: open()
    Backend-->>Repo: returns path
    Repo->>Backend: invoke('open_repo', { path })
    Backend-->>Repo: returns RepoInfo
    Repo->>Store: setRepoPath(path)
    Store->>Store: setActiveTabId(path)
    Repo->>Repo: refreshActiveRepoStatus()
    Repo->>Store: setRepoInfo(info)
```

## Committing Changes

```mermaid
flowchart TD
    A[User types commit message] --> B[User clicks 'Commit']
    B --> C{Any staged files?}
    C -- No --> D[Show Toast: No staged files]
    C -- Yes --> E[Call commit_changes message]
    E --> F[invoke 'create_commit']
    F --> G[Rust: git2 commit]
    G --> H[Update Log & Status]
    H --> I[Clear commit message area]
```

## Switching Branches

```mermaid
flowchart TD
    Start[User double-clicks branch] --> Check[safe_checkout validation]
    Check --> Result{Action Result}
    Result -- Clean --> Checkout[invoke 'checkout_branch']
    Result -- DirtyNoConflict --> Checkout
    Result -- DirtyWithConflict --> Alert[Show ForceCheckoutAlert]
    Alert -- Stash & Switch --> Stash[invoke 'force_checkout_confirm_with_stash']
    Alert -- Force Switch --> Force[invoke 'force_checkout_from_origin']
    Result -- AlreadyOn --> Toast[Show Toast: Already on branch]
```

## Conflict Resolution Workflow

```mermaid
sequenceDiagram
    participant User
    participant Tree as FileTree
    participant Store as Zustand Store
    participant Editor as ConflictEditorView
    participant Backend as Rust Backend

    User->>Tree: Click conflicted file (!)
    Tree->>Store: openConflictEditor(path, mode)
    Store->>Editor: Render Monaco Merge Editor
    Editor->>Backend: invoke('get_conflict_diff', { path })
    Backend-->>Editor: returns Ours, Base, Theirs
    User->>Editor: Resolve hunks
    User->>Editor: Click 'Accept Solution'
    Editor->>Backend: invoke('resolve_conflict_file', { path, content })
    Backend-->>Store: triggerRefresh()
```
