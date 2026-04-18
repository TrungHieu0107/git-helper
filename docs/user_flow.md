# User Flow & Interaction Map
## Version: 2.10.1
## Last updated: 2026-04-12 – Documenting Git Reset and File Restore flows.
## Project: GitKit

This document maps user actions in the UI to their corresponding Tauri commands and state updates.

## 1. Git Reset Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant G as CommitGraph
    participant M as CommitContextMenu
    participant D as ResetCommitDialog
    participant T as Tauri (repo:reset_to_commit)
    participant S as Zustand Store

    U->>G: Right-Click Commit
    G->>M: Show Context Menu
    U->>M: Click "Reset to this commit..."
    M->>S: setResetToCommitTarget(commit)
    S->>D: Render ResetCommitDialog
    U->>D: Select Mode (Soft/Mixed/Hard)
    D->>T: Invoke reset_to_commit(oid, mode)
    T-->>D: Result (commits_rewound)
    D->>S: setResetToCommitTarget(null)
    S->>S: refreshActiveRepoStatus + refreshLog
```

## 2. File Restore Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant C as CommitDetailPanel
    participant M as FileContextMenu
    participant A as RestoreFileAlert
    participant T as Tauri (repo:restore_file_from_commit)

    U->>C: Right-Click File in Commit
    C->>M: Show Context Menu
    U->>M: Click "Restore File from This Version"
    M->>A: Open Alert (setConfirmRestoreFile)
    U->>A: Click "Restore File"
    A->>T: Invoke restore_file_from_commit(oid, path)
    T-->>A: Success
```

## 3. Pull Strategy Workflow

```mermaid
flowchart TD
    Click[Click Pull Split-Button] --> Menu[Show FF / Merge / Rebase]
    Menu --> Selected[User selects Strategy]
    Selected --> Cmd[Tauri: remote:pull_remote]
    Cmd --> Res{Result}
    Res -- Success --> Done[Reload Log & Status]
    Res -- Conflict --> Conflict[Show Conflict Editor]
```

## 4. Interaction Mapping

| UI Action | Trigger Component | Tauri Command | Store Update |
|---|---|---|---|
| Reset to Commit | `CommitContextMenu` | `reset_to_commit` | `resetToCommitTarget`, `commitLog` |
| Restore File | `FileContextMenu` | `restore_file_from_commit` | `repoStatus` |
| Stage File | `RightPanel` | `stage_file` | `stagedFiles`, `unstagedFiles` |
| Safe Checkout | `Sidebar` | `safe_checkout` | `activeBranch`, `commitLog` |
| Cherry-pick | `CommitContextMenu` | `cherry_pick_commit` | `cherryPickState` |
| Save Stash | `TopToolbar` | `stash_save_advanced` | `stashEntries` |
| Fetch All | `TopToolbar` | `fetch_all_remotes` | `repoStatus`, `commitLog` |

## 5. View States Logic

- **`activeTabId === 'home'`**: Shows `WelcomeScreen`.
- **`resetToCommitTarget !== null`**: Overlays `ResetCommitDialog`.
- **`showFileHistoryModal === true`**: Overlays `FileHistoryModal`.
- **`selectedDiff !== null`**: Overlays `MainDiffView` (Monaco).
- **`isLoadingRepo === true`**: Displays global linear progress/spinner.
