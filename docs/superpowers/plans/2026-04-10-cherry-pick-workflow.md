# Cherry-Pick Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a full cherry-pick workflow allowing users to apply one or more commits from any branch onto the currently checked-out branch, supporting conflict handling, aborting, and continuing workflows.

**Architecture:** 
- **Backend (Rust):** We'll use `git2::Repository::cherrypick()` to apply changes into the index and working tree. For a clean apply, we'll dynamically create the commit. For conflicts, we'll return a `CherryPickResult::Conflict`. We'll also provide `cherry_pick_continue`, `cherry_pick_abort`, and `get_cherry_pick_state` functions, leveraging standard Git state files (`.git/CHERRY_PICK_HEAD`). In addition, we'll use `git2` to detect dirty working directory pre-flight. 
- **Frontend (TS/React):** We will create `cherryPickSlice` in Zustand to manage the state machine (`idle`, `applying`, `conflict`, `continuing`), components for dialogs/banners, and wire the operations into the `CommitContextMenu`.

**Tech Stack:** Rust (tauri apps), React, Zustand, UI/UX workflow with modern Tailwind CSS principles following existing `StashAlerts`/`CheckoutAlert` styles.

---

### Task 1: Scaffolding Backend Operations

**Files:**
- Create: `d:\linh_ta_linh_tinh\git-helper\src-tauri\src\commands\cherry_pick.rs`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src-tauri\src\commands\mod.rs`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src-tauri\src\lib.rs`

- [ ] **Step 1: Define models and register commands**
Create `src-tauri/src/commands/cherry_pick.rs` containing models `CherryPickResult` and stub commands `get_cherry_pick_state`, `cherry_pick_abort`, `cherry_pick_commit`, `cherry_pick_continue`. Register in `lib.rs`.

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum CherryPickResult {
    Success { new_oid: String },
    Conflict { conflicted_files: Vec<String> },
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CherryPickInProgress {
    pub is_in_progress: bool,
    pub conflicted_files: Vec<String>,
}
```

### Task 2: Backend Core Git Logic

**Files:**
- Modify: `d:\linh_ta_linh_tinh\git-helper\src-tauri\src\commands\cherry_pick.rs`

- [ ] **Step 1: Implement get_cherry_pick_state and cherry_pick_abort**
Read `.git/CHERRY_PICK_HEAD` to detect state. For abort, use `repo.cleanup_state()` and `repo.reset(&head, git2::ResetType::Hard, None)`.

- [ ] **Step 2: Implement cherry_pick_commit single OID**
Check `CHERRY_PICK_HEAD`, check dirty working tree. Parse OID, lookup commit. Check `parent_count > 1` logic. Call `repo.cherrypick(commit, None)`. Check conflicts. If clean, write tree and commit, call cleanup. If conflict, leave state and return `Conflict` with affected files.

- [ ] **Step 3: Implement cherry_pick_continue**
Check if index is conflict-free block. Read `CHERRY_PICK_HEAD` message. Write tree and create commit using HEAD as parent. Then `repo.cleanup_state()`.

### Task 3: Frontend State Machine & Rehydration

**Files:**
- Create: `d:\linh_ta_linh_tinh\git-helper\src\store\slices\cherryPickSlice.ts`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src\store\index.ts`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src\App.tsx`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src\lib\repo.ts`

- [ ] **Step 1: Define cherryPickSlice**
Define `cherryPickState`, `cherryPickCommits`, and `cherryPickConflictFiles`. Add actions.

- [ ] **Step 2: Rehydration on load**
In `repo.ts / loadRepo` or `refreshActiveRepoStatus`, call `get_cherry_pick_state` and update the slice if the repo is in `cherry-pick` state.

### Task 4: UI Features & Components

**Files:**
- Create: `d:\linh_ta_linh_tinh\git-helper\src\components\CherryPickDialog.tsx`
- Create: `d:\linh_ta_linh_tinh\git-helper\src\components\CherryPickBanner.tsx`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src\components\CommitContextMenu.tsx`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src\App.tsx`

- [ ] **Step 1: Add CherryPickDialog**
Dialog showing target branch, commit preview, and a warning if parent_count > 1. Actions to call `cherry_pick_commit` backend and handle state transitions.

- [ ] **Step 2: Integrate into Context Menu**
Render "Cherry-pick this commit" and open `showCherryPickDialog`.

- [ ] **Step 3: Implement CherryPickBanner**
A sticky banner fixed below TopTabBar showing "Cherry-pick in progress — resolve conflicts then continue", rendering conditionally on `cherryPickState === 'conflict'`. Integrate Abort and Continue handlers.

### Task 5: Testing & Multi-Commit Enhancement

**Files:**
- Modify: `d:\linh_ta_linh_tinh\git-helper\src-tauri\src\commands\cherry_pick.rs`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src\components\CherryPickDialog.tsx`

- [ ] **Step 1: Extend cherry_pick_commit for multi-OID**
Use `Vec<String>`. Iterate and apply each. Break and return `Conflict` if any commit conflicts. Otherwise succeed.

- [ ] **Step 2: Multi-selection frontend**
Modify UI to pass array of commits if user has multiple selected (shift-clicking support natively or mock).
