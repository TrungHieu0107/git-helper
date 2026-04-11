# User Flow & Interaction Map
## Version: 2.7.0
## Last updated: 2026-04-11 – v2.7.0 Restore File & Push Sync
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
    G-->>T: Fetch + Execute Strategy
    G-->>T: Success / Conflict
    T-->>Toolbar: Pull Result
```

## 3. Push Workflow (Safe Push)

```mermaid
sequenceDiagram
    participant U as User
    participant Toolbar as TopToolbar
    participant T as Tauri (remote:push_current_branch)
    participant G as git2/cli (Rust)

    U->>Toolbar: Click Push
    Toolbar->>T: Invoke push_current_branch(forceWithLease?)
    T->>G: Resolve Upstream + Push
    G-->>T: Success / Rejected (Non-FF)
    T-->>Toolbar: Returns Result
    U->>Toolbar: (If Rejected) Open Upstream Dialog
    Toolbar->>T: Invoke push_branch_to_remote(remote, branch)
```

## 4. Cherry-Pick Workflow

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

## 6. Restore File from Version

```mermaid
sequenceDiagram
    participant U as User
    participant C as CommitDetailPanel
    participant M as FileContextMenu
    participant A as RestoreFileAlert
    participant T as Tauri (repo:restore_file_from_commit)
    participant G as git2 (Rust)

    U->>C: Right-Click File in Commit
    C->>M: Show Context Menu (with metadata)
    U->>M: Click "Restore File from This Version"
    M->>A: Open Alert (setConfirmRestoreFile)
    A->>U: Show Metadata + Safety Warnings
    U->>A: Click "Restore File"
    A->>T: Invoke restore_file_from_commit(path, commitOid)
    T->>G: Blob lookup + Write to Workdir
    G-->>T: Success
    T-->>A: Restore Result
    A->>U: Show Toast + Refresh Status
```

## 7. Auto Encoding Detection & Override

```mermaid
sequenceDiagram
    participant U as User
    participant D as MainDiffView
    participant T as Tauri (diff:get_file_contents)
    participant G as git2/encoding (Rust)

    D->>T: Invoke get_file_contents(path, forceEncoding?)
    T->>G: Detect Encoding (BOM -> chardetng)
    G-->>T: Returns DecodedDiff { content, encoding, confidence, hadBom }
    T-->>D: Updates local state
    D->>U: Render EncodingBadge (Badge color reflecting confidence)
    U->>D: Click Badge & Select Manual Override
    D->>T: Re-invoke get_file_contents(path, forceEncoding: "Shift_JIS")
    T->>G: Decode with forced encoding
    G-->>D: Returns updated content
```

## 8. Interaction Mapping

| UI Action | Tauri Command | Store update | UI Component |
|---|---|---|---|
| Open Folder | `open_repo` | `activeRepoPath`, `repoInfo` | `WelcomeScreen` |
| Pull (FF/Merge/Rebase)| `pull_remote` | `repoStatus`, `commitLog` | `TopToolbar` |
| Push | `push_current_branch` | `repoStatus`, `commitLog` | `TopToolbar` |
| Cherry-pick | `cherry_pick_commit` | `cherryPickState` | `CommitContextMenu` |
| Resolve Conflict | `resolve_conflict_file`| `cherryPickState` | `ConflictEditorView` |
| Open File History | `get_file_log` | `showFileHistoryModal` | `FileContextMenu` |
| Restore File | `restore_file_from_commit`| `repoStatus` | `RestoreFileAlert` |
| Discard File | `discard_file_changes` | `repoStatus` | `FileContextMenu` |
| Stage File | `stage_file` | `stagedFiles`, `unstagedFiles` | `RightPanel` |
| Override Encoding | `get_file_contents` | (local component state) | `EncodingBadge` |

## 9. View States logic

- **`activeTabId === 'home'`**: Shows `WelcomeScreen`.
- **`showFileHistoryModal === true`**: Shows `FileHistoryModal` overlay.
- **`selectedDiff !== null`**: Overlays `MainDiffView` (Monaco) over the `CommitGraph`.
- **`cherryPickState.status === 'conflicting'`**: Shows `CherryPickBanner`.
- **`isLoadingRepo === true`**: Global spinner overlay.
