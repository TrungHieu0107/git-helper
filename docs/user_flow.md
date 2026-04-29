# User Flows: Technical Deep Dive
## Version: 5.1.0
## Last updated: 2026-04-29 – Added Partial Staging (Hunk Staging) Flow.
## Project: GitKit

This document provides a low-level mapping of user actions to system behaviors, including IPC contracts, Rust backend logic, and frontend state management.

---

## 1. Repository Lifecycle & State Restoration

### High-Detail sequence: Opening a Repository
```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Welcome as WelcomeScreen
    participant Store as Zustand Store
    participant Repo as repoService.ts
    participant Backend as Rust Backend
    participant FS as Local Filesystem

    User->>Welcome: Launch GitKit
    Welcome->>Backend: invoke('get_app_state')
    Backend->>FS: Read $APP_DATA/state.json
    FS-->>Backend: { recentRepos: [...] }
    Backend-->>Welcome: AppState object
    Welcome->>Store: setAppState(state)
    
    alt User clicks "Open Local Repository"
        User->>Welcome: Click Button
        Welcome->>Backend: tauri-plugin-dialog: open({ directory: true })
        Backend-->>Welcome: returns selected_path
    end

    Welcome->>Repo: loadRepo(selected_path)
    Repo->>Store: setIsInitializing(true)
    
    Repo->>Backend: invoke('open_repo', { path: selected_path })
    Backend->>Backend: Repository::discover(path)
    Backend->>Backend: resolve_head_branch(repo)
    Note right of Backend: Checks .git/rebase-merge/head-name if REBASE-i
    Backend->>FS: Update recentRepos in state.json
    Backend-->>Repo: returns RepoInfo { head_branch, head_oid, state, ... }
    
    Repo->>Store: setRepoPath(selected_path)
    Repo->>Store: setRepoInfo(info)
    Repo->>Store: setActiveBranch(info.head_branch)
    
    Repo->>Repo: refreshActiveRepoStatus()
    Repo->>Backend: invoke('get_repo_status')
    Backend-->>Repo: { staged_count, unstaged_count, ahead, behind, branch_name }
    Repo->>Store: setRepoStatus(status)
    Repo->>Store: setIsInitializing(false)
```

---

## 2. Commit & Rollback Lifecycle

### Technical Flow: Create Commit
```mermaid
flowchart TD
    subgraph Frontend [UI: CommitArea.tsx]
        A[User Input] --> B{Message Empty?}
        B -- "Yes" --> C[toast.error('Please enter message')]
        B -- "No" --> D{Staged Files > 0?}
        D -- "No" --> E[toast.error('No changes staged')]
        D -- "Yes" --> F[invoke 'create_commit' {message}]
    end

    subgraph Backend [Rust: diff.rs]
        F --> G[repo.index()]
        G --> H[index.write_tree()]
        H --> I[Get HEAD OID as Parent]
        I --> J[repo.signature()]
        J --> K[repo.commit(HEAD, author, committer, msg, tree, [parents])]
        K --> L{Result?}
        L -- "Ok" --> M[Return Success]
        L -- "Err" --> N[Return Error Message]
    end

    subgraph Refresh [Lifecycle]
        M --> O[Clear Message Input]
        O --> P[loadRepo() - Full Refresh]
        N --> Q[toast.error(err)]
    end
```

### Technical Flow: Undo Last Commit (Soft/Hard Reset)
```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Dialog as UndoCommitDialog
    participant Repo as repo.ts
    participant Backend as ops.rs

    User->>Dialog: Select "Soft" or "Hard"
    User->>Dialog: Click "Confirm Undo"
    Dialog->>Repo: undoLastCommit(mode)
    Repo->>Backend: invoke('undo_last_commit', { repoPath, mode })
    
    Backend->>Backend: repo.head() -> resolve to commit
    Backend->>Backend: Get parent (HEAD~1)
    
    alt mode == "Soft"
        Backend->>Backend: repo.reset(parent, SOFT, None)
        Note right of Backend: Keeps Index & WT intact
    else mode == "Hard"
        Backend->>Backend: repo.reset(parent, HARD, Some(CheckoutBuilder))
        Note right of Backend: Overwrites Index & WT
    end
    
    Backend-->>Repo: returns Result<()>
    Repo->>Repo: loadRepo()
```

---

## 3. Advanced Branching: "Safe Checkout"

GitKit implements a multi-stage checkout to prevent data loss.

### Data Contract: `SafeCheckoutResult`
| Value | Interpretation | UI Action |
|---|---|---|
| `AlreadyOnBranch` | HEAD already points here | Info Toast |
| `Clean` | No uncommitted changes | Immediate Checkout |
| `DirtyNoConflict` | WT changes exist but don't overlap | Checkout with Merge |
| `DirtyWithConflict` | WT changes overlap with target branch | Show Conflict Alert (Force/Stash) |
| `DirtyState` | Repo is in Merge/Rebase/Bisect | Show Error Dialog |

### Execution Flow
```mermaid
flowchart TD
    User["User: Checkout Branch"] --> Guard["safeSwitchBranch(target)"]
    Guard --> SafeCall["invoke 'safe_checkout'"]
    
    subgraph Rust_Validation [safe_checkout]
        SafeCall --> Discover["Resolve target OID"]
        Discover --> StateCheck{"Repo State == Idle?"}
        StateCheck -- "No" --> ReturnDirtyState["Return DirtyState(state)"]
        
        StateCheck -- "Yes" --> DryRun["CheckoutBuilder: dry_run()"]
        DryRun -- "Conflict" --> ReturnConflict["Return DirtyWithConflict(files)"]
        DryRun -- "Clean" --> WTCheck{"Working Tree Dirty?"}
        
        WTCheck -- "No" --> ReturnClean["Return Clean"]
        WTCheck -- "Yes" --> ReturnDirtyNo["Return DirtyNoConflict"]
    end

    ReturnClean --> DoCheckout["invoke 'checkout_branch' {merge: true}"]
    ReturnDirtyNo --> DoCheckout
    ReturnConflict --> Alert["Prompt: Force or Stash?"]
    
    Alert -- "Stash & Checkout" --> StashFlow["invoke 'force_checkout_confirm_with_stash'"]
    Alert -- "Force" --> ForceFlow["invoke 'checkout_branch' {force: true}"]
```

---

## 4. Conflict Resolution & Merge Editor

### Interactive Merge sequence
```mermaid
sequenceDiagram
    participant User
    participant Editor as MonacoMergeEditor
    participant Backend as Rust Backend

    User->>Editor: Click conflicted file
    Editor->>Backend: invoke('get_conflict_diff', { path })
    Backend->>Backend: Read INDEX (Stage 1, 2, 3)
    Note right of Backend: Stage 1: Base, 2: Ours, 3: Theirs
    Backend-->>Editor: { base, ours, theirs }
    
    Editor->>Editor: Load Monaco with 3-way view
    User->>Editor: Resolve hunks manually
    User->>Editor: Click "Save Resolution"
    
    Editor->>Backend: invoke('resolve_conflict_file', { path, content })
    Backend->>Backend: Write content to WT
    Backend->>Backend: repo.index() -> add(path)
    Backend->>Backend: Check if all conflicts resolved
    Backend-->>Editor: returns { remainingConflicts: N }
    
    alt N == 0
        Editor->>User: Show "Commit Merge" Button
    end
```

---

## 5. Rebase Branch Name Resolution (Deep State)

How GitKit maintains identity during `Detached HEAD` states.

```mermaid
graph TD
    Trigger["Repo Refresh"] --> Resolve["resolve_head_branch(repo)"]
    Resolve --> State{"repo.state()"}
    
    State -- "RebaseInteractive" --> PathMerge[".git/rebase-merge/head-name"]
    State -- "Rebase" --> PathApply[".git/rebase-apply/head-name"]
    State -- "Merge" --> PathMergeMsg[".git/MERGE_MSG"]
    State -- "Idle" --> Standard["repo.head().shorthand()"]
    
    PathMerge --> Read["fs::read_to_string()"]
    PathApply --> Read
    
    Read --> Clean["Strip 'refs/heads/' prefix"]
    Clean --> Result["Branch: 'feature/login'"]
    Standard --> Result
    
    Result --> Store["useAppStore.setActiveBranch(name)"]

---

## 6. Partial Staging (Hunk Staging)

Technical flow for staging specific code blocks (hunks) from the Diff View.

### Technical Sequence
```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Diff as MainDiffView.tsx
    participant Utils as patch-generator.ts
    participant Backend as status.rs
    participant Git as git2-rs

    User->>Diff: Click "Plus" icon in Gutter (Line N)
    Diff->>Diff: Identify Hunk containing Line N
    Diff->>Utils: generateHunkPatch(options, hunkInfo)
    
    Note over Utils: Constructs Git Patch string:
    Note over Utils: --- a/file.ts \n +++ b/file.ts \n @@ -L,C +L,C @@
    
    Utils-->>Diff: returns patchString
    Diff->>Backend: invoke('apply_patch', { repoPath, patchString })
    
    Backend->>Git: Diff::from_buffer(patchString)
    Backend->>Git: repo.apply(diff, ApplyLocation::Index, None)
    
    Note right of Git: Updates Index without touching Working Tree
    
    Git-->>Backend: Result<()>
    Backend-->>Diff: Success
    Diff->>Diff: toast.success()
    Diff->>Diff: refreshStatus()
```
```
