# User Flows
## Version: 3.5.0
## Last updated: 2026-04-29 – Added Undo Commit and Rebase Branch Resolution flows.
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

## Switching Branches (Checkout)

### Flow Description
This flow describes the process of switching from the current branch to a target branch (local or remote). The application implements a "safe" checkout strategy: it first validates the repository state and potential conflicts via a dry-run (`safe_checkout`) before committing to the actual operation (`checkout_branch`). This prevents the working directory from entering a partially-updated or corrupted state due to unforeseen conflicts.

### IPC Contract

#### 1. `safe_checkout` (Validation)
- **Method**: `invoke('safe_checkout', { repoPath, branchName })`
- **Request Payload**:
  ```typescript
  {
    repoPath: string;
    branchName: string;
  }
  ```
- **Success Response**: `SafeCheckoutResult`
  ```typescript
  type SafeCheckoutResult = 
    | { action: 'AlreadyOnBranch' }
    | { action: 'Clean' }
    | { action: 'DirtyNoConflict' }
    | { action: 'DirtyWithConflict', files: string[] }
    | { action: 'DirtyState', state: string }
    | { action: 'NotFound', branch: string };
  ```

#### 2. `checkout_branch` (Execution)
- **Method**: `invoke('checkout_branch', { repoPath, branchName, options })`
- **Request Payload**:
  ```typescript
  {
    repoPath: string;
    branchName: string;
    options: {
      force: boolean;
      merge: boolean;
      create: boolean;
    };
  }
  ```
- **Error Types**: `CheckoutError`
  ```typescript
  type CheckoutError = 
    | { type: 'Conflict', data: { files: string[] } }
    | { type: 'DirtyState', data: { state: string } }
    | { type: 'NotFound', data: { branch: string } }
    | { type: 'DetachedHead', data: { oid: string } }
    | { type: 'Generic', data: { message: string } };
  ```

### Mermaid Diagram

```mermaid
graph TD
    %% Frontend Entry
    User_Action["User Double-Clicks Branch"] --> UI_Trigger["safeSwitchBranch(branchName)"]
    UI_Trigger --> Invoke_Safe["invoke('safe_checkout')"]

    %% Backend Validation (safe_checkout)
    Invoke_Safe --> Rust_Safe["Rust: safe_checkout"]
    Rust_Safe --> Check_State{"Repo State Clean?"}
    
    Check_State -- "No" --> Result_DirtyState["Return DirtyState"]
    Check_State -- "Yes" --> Check_Current{"Already on Branch?"}
    
    Check_Current -- "Yes" --> Result_AlreadyOn["Return AlreadyOnBranch"]
    Check_Current -- "No" --> Resolve_Target["Resolve Target OID"]
    
    Resolve_Target --> DryRun_Checkout["Dry-run checkout_tree"]
    DryRun_Checkout -- "Conflicts Found" --> Result_Conflict["Return DirtyWithConflict"]
    DryRun_Checkout -- "No Conflicts" --> Check_WT{"WT Changes?"}
    
    Check_WT -- "No" --> Result_Clean["Return Clean"]
    Check_WT -- "Yes" --> Result_DirtyNoConflict["Return DirtyNoConflict"]

    %% Frontend Decision Logic
    Result_AlreadyOn --> Toast_Info["Show Info Toast"]
    Result_DirtyState --> UI_Error["Show CheckoutError Dialog"]
    Result_Conflict --> UI_Confirm["Show Force Checkout Alert"]
    
    Result_Clean --> Invoke_Checkout["invoke('checkout_branch')"]
    Result_DirtyNoConflict --> Invoke_Checkout

    %% Backend Execution (checkout_branch)
    Invoke_Checkout --> Rust_Exec["Rust: checkout_branch"]
    Rust_Exec --> Exec_Target{"Target Type?"}
    
    Exec_Target -- "Local" --> Local_Flow["Find Local Branch"]
    Exec_Target -- "Remote" --> Remote_Flow["Create/Locate Local Tracking Branch"]
    
    Local_Flow --> Final_Checkout["repo.checkout_tree"]
    Remote_Flow --> Final_Checkout
    
    Final_Checkout -- "Ok" --> Set_Head["repo.set_head(...)"]
    Final_Checkout -- "Err (Conflict)" --> Error_Conflict["Return Conflict Error"]
    Final_Checkout -- "Err (Other)" --> Error_Generic["Return Generic Error"]
    
    Set_Head --> UI_Success["toast.success & loadRepo()"]
    Error_Conflict --> UI_Error_Display["Display Conflict Files in UI"]
    Error_Generic --> UI_Toast_Err["toast.error(...)"]
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

## Undo Last Commit

```mermaid
sequenceDiagram
    participant User
    participant CommitArea
    participant Dialog as UndoCommitDialog
    participant Repo as repo.ts
    participant Backend as Rust Backend

    User->>CommitArea: Click "Undo" icon
    CommitArea->>Dialog: setShowUndoCommitDialog(true)
    Dialog->>User: Select Mode (Soft/Hard)
    User->>Dialog: Click "Confirm Undo"
    Dialog->>Repo: undoLastCommit(mode)
    Repo->>Backend: invoke('undo_last_commit', { mode })
    Backend->>Backend: Determine HEAD~1
    Backend->>Backend: git2 reset (Soft/Hard)
    Backend-->>Repo: returns success
    Repo->>Repo: loadRepo()
```

## Branch Resolution (Rebase State)

This flow ensures the UI displays the original branch name even when Git is in a detached HEAD state during a rebase.

```mermaid
flowchart TD
    A[Refresh Trigger: loadRepo / refresh] --> B[Invoke open_repo / get_repo_status]
    B --> C[Rust: resolve_head_branch]
    C --> D{Check repo.state()}
    D -- "Rebase/Merge" --> E[Read .git/rebase-merge/head-name]
    D -- "Standard Rebase" --> F[Read .git/rebase-apply/head-name]
    D -- "Clean" --> G[repo.head().shorthand()]
    
    E --> H[Strip 'refs/heads/']
    F --> H
    G --> I[Return Branch Name]
    H --> I
    I --> J[Frontend: Update activeBranch & repoInfo]
```
