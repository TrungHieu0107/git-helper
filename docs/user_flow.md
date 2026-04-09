# User Flow & Interaction Map
## Version: 1.0.0
## Last updated: 2026-04-09 – Initial flow document
## Project: GitKit

This document maps user actions in the UI to their corresponding Tauri commands and state updates.

## 1. Repository Lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant R as React (WelcomeScreen)
    participant T as Tauri (repo:open_repo)
    participant S as Zustand Store
    participant G as git2 (Rust)

    U->>R: Drag & Drop Folder
    R->>T: Invoke open_repo(path)
    T->>G: Discover & Open Repo
    G-->>T: RepoFound
    T-->>R: Returns RepoInfo
    R->>S: Update activeRepoPath, repoInfo
    S->>T: Invoke get_status, get_repo_status
    T-->>S: Returns Status Results
```

## 2. Staging & Committing

```mermaid
flowchart TD
    Start([Unstaged File List]) --> Stage[Click '+' Stage Button]
    Stage --> Cmd[Tauri: status:stage_file]
    Cmd --> Refresh[Refresh Status]
    Refresh --> Staged([Staged File List])
    Staged --> Input[Input Commit Message]
    Input --> Commit[Click 'Commit' Button]
    Commit --> CommitCmd[Tauri: diff:create_commit]
    CommitCmd --> LogRefresh[Refresh Commit Log]
    LogRefresh --> Done([New Commit in Graph])
```

## 3. Branch Management (Safe Checkout)

```mermaid
flowchart TD
    Select[Click Branch in Sidebar] --> SafeCheck[Tauri: repo:safe_checkout]
    SafeCheck -- Clean --> FastSwitch[Tauri: repo:checkout_branch]
    SafeCheck -- DirtyNoConflict --> OfferStash[Show CheckoutAlert: Offer Stash]
    SafeCheck -- DirtyWithConflict --> ShowError[Show CheckoutAlert: Block Switch]
    OfferStash -- User Agrees --> StashSwitch[Tauri: stubs:create_stash + repo:checkout_branch]
```

## 4. Interaction Mapping

| UI Action | Tauri Command | Store update | UI Component |
|---|---|---|---|
| Open Folder | `open_repo` | `activeRepoPath`, `repoInfo` | `WelcomeScreen` |
| Hover Commit | `get_commit_detail` | `selectedCommitDetail` | `CommitGraph` |
| Stage File | `stage_file` | `stagedFiles`, `unstagedFiles` | `RightPanel` |
| Change Branch | `checkout_branch` | `activeBranch`, `commitLog` | `Sidebar` |
| Fetch Remote | `fetch_remote` | `repoStatus` (ahead/behind) | `TopToolbar` |
| Create Stash | `stash_save_advanced`| `stashes`, `commitLog` | `CreateStashDialog`|

## 5. View States logic

- **`activeTabId === 'home'`**: Shows `WelcomeScreen`.
- **`selectedDiff !== null`**: Overlays `MainDiffView` (Monaco) over the `CommitGraph`.
- **`isLoadingRepo === true`**: Global spinner overlay.
