# User Flow & Interaction Map
## Version: 1.1.0
## Last updated: 2026-04-11 – v2.1.0 Flow Sync
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

## 2. Pull with Strategy

```mermaid
sequenceDiagram
    participant U as User
    participant Toolbar as TopToolbar
    participant T as Tauri (remote:pull_remote)
    participant G as git2/cli (Rust)

    U->>Toolbar: Click Pull (Split Button)
    Toolbar->>U: Show Strategy Menu
    U->>Toolbar: Select Strategy (FF/Merge/Rebase)
    Toolbar->>T: Invoke pull_remote(remote, branch, strategy)
    T->>G: Fetch + Execute Strategy
    G-->>T: Success / Conflict
    T-->>Toolbar: Pull Result
```

## 3. Cherry-Pick Workflow

```mermaid
flowchart TD
    Start[Right-click Commit in Graph] --> CP[Select Cherry-Pick]
    CP --> Cmd[Tauri: cherry_pick_commit]
    Cmd -- Success --> Done([New Commit])
    Cmd -- Conflict --> ShowBanner[Show CherryPickBanner]
    ShowBanner --> Resolve[Open ConflictEditorView]
    Resolve --> Continue[Tauri: cherry_pick_continue]
    Continue -- Success --> Done
    Continue -- Conflict --> Resolve
    ShowBanner -- Abort --> AbortCmd[Tauri: cherry_pick_abort]
```

## 4. Branch Management (Safe Checkout)

```mermaid
flowchart TD
    Select[Click Branch in Sidebar] --> SafeCheck[Tauri: repo:safe_checkout]
    SafeCheck -- Clean --> FastSwitch[Tauri: repo:checkout_branch]
    SafeCheck -- DirtyNoConflict --> OfferStash[Show CheckoutAlert: Offer Stash]
    SafeCheck -- DirtyWithConflict --> ShowError[Show CheckoutAlert: Block Switch]
    OfferStash -- User Agrees --> StashSwitch[Tauri: stash:create_stash + repo:checkout_branch]
```

## 5. File History & Operations
```mermaid
sequenceDiagram
    participant U as User
    participant R as RightPanel (FileRow)
    participant M as FileContextMenu
    participant H as FileHistoryModal
    participant T as Tauri (log:get_file_log)
    participant G as git2 (Rust)

    U->>R: Right-Click File
    R->>M: Show Context Menu
    U->>M: Click "File History"
    M->>H: Render Modal (setFileHistory)
    H->>T: Invoke get_file_log(path)
    T->>G: Revwalk with pathspec
    G-->>T: Returns Commit List
    T-->>H: Updates local state
    U->>H: Select Commit
    H->>T: Invoke get_file_contents(path, commitOid)
    T-->>H: Returns Historical Diff
```

## 6. Interaction Mapping

| UI Action | Tauri Command | Store update | UI Component |
|---|---|---|---|
| Open Folder | `open_repo` | `activeRepoPath`, `repoInfo` | `WelcomeScreen` |
| Pull (FF/Merge/Rebase)| `pull_remote` | `repoStatus`, `commitLog` | `TopToolbar` |
| Cherry-pick | `cherry_pick_commit` | `cherryPickState` | `CommitContextMenu` |
| Resolve Conflict | `resolve_conflict_file`| `cherryPickState` | `ConflictEditorView` |
| Open File History | `get_file_log` | `showFileHistoryModal` | `FileContextMenu` |
| Discard File | `discard_file_changes` | `repoStatus` | `FileContextMenu` |
| Stage File | `stage_file` | `stagedFiles`, `unstagedFiles` | `RightPanel` |

## 7. View States logic

- **`activeTabId === 'home'`**: Shows `WelcomeScreen`.
- **`showFileHistoryModal === true`**: Shows `FileHistoryModal` overlay.
- **`selectedDiff !== null`**: Overlays `MainDiffView` (Monaco) over the `CommitGraph`.
- **`cherryPickState.status === 'conflicting'`**: Shows `CherryPickBanner`.
- **`isLoadingRepo === true`**: Global spinner overlay.
