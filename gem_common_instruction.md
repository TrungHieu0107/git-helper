# Git Manager App — Antigravity Vibe Coding Prompts

> Stack: Tauri 2 · Rust (git2 crate) · React + TypeScript · Tailwind · D3.js
> Run each prompt at the START of a new Antigravity session for that phase.

---

## Phase 0 — Project Bootstrap

```
You are an expert Tauri 2 + Rust + React/TypeScript developer.
Your task is to scaffold a desktop Git manager app called "GitKit" (or the name in PROJECT_CONTEXT.md if it exists).

**Read first (if they exist):**
- memory/PROJECT_CONTEXT.md
- memory/FEATURE_REGISTRY.md
- memory/RUST_API.md
- memory/STORE.md

**Stack:**
- Tauri 2 (latest stable)
- Rust backend with git2 crate
- React 18 + TypeScript + Vite (frontend)
- Tailwind CSS v3 for styling
- Zustand for global state
- @tanstack/react-virtual for virtualized lists

**Tasks:**
1. Initialize a Tauri 2 project with the React/TS template via `npm create tauri-app`.
2. Add to Cargo.toml: `git2 = "0.19"`, `serde = { features = ["derive"] }`, `serde_json`.
3. Create the following folder structure inside `src-tauri/src/`:
   - `git/mod.rs` — re-exports all git modules
   - `git/repo.rs` — repo open/discover helpers
   - `git/status.rs` — stub for file status
   - `commands/mod.rs` — Tauri command registration
4. Create the following `memory/` files at the project root (plain Markdown):
   - `memory/PROJECT_CONTEXT.md` — app name, stack, architecture summary
   - `memory/FEATURE_REGISTRY.md` — table: Feature | Status | Notes
   - `memory/RUST_API.md` — table: Command | Params | Return Type | Status
   - `memory/STORE.md` — document the Zustand store shape (start with skeleton)
5. Set up the Zustand store in `src/store/index.ts` with this initial shape:
   ```ts
   interface AppStore {
     repos: RepoMeta[];          // list of opened repos
     activeRepoPath: string | null;
     activeBranch: string | null;
     activeCommitOid: string | null;
   }
   ```
   Mark this file as IMMUTABLE — do not modify the store shape without explicit instruction in future sessions.
6. Create a basic 3-column layout shell in React:
   - Left sidebar (200px): repo list + branch list
   - Center (flex-grow): main panel (placeholder)
   - Right panel (300px): detail panel (placeholder)
7. Add a `gem_common_instruction.md` at the project root with these rules for all future agents:
   - Always read memory/ files at session start
   - Always update memory/ files after completing a task
   - Never modify `src/store/index.ts` without explicit instruction
   - Use `invoke()` from `@tauri-apps/api/core` for all Rust calls
   - All Tauri commands must be documented in memory/RUST_API.md

**After completing all tasks:**
- Update memory/PROJECT_CONTEXT.md with the final stack and folder structure.
- Update memory/FEATURE_REGISTRY.md: mark "Project scaffold" as Done.
- Update memory/RUST_API.md with any commands registered.
```

---

## Phase 1 — Commit & Staging

```
You are an expert Tauri 2 + Rust + React/TypeScript developer.

**Read FIRST before writing any code:**
- memory/PROJECT_CONTEXT.md
- memory/FEATURE_REGISTRY.md
- memory/RUST_API.md
- memory/STORE.md
- gem_common_instruction.md

**Goal:** Implement commit + staging functionality (working tree diff, stage/unstage, commit).

---

### Rust side (src-tauri/src/)

Implement these Tauri commands. All commands live in `commands/` and are registered in `main.rs`:

**1. `get_status(repo_path: String) -> Result<Vec<FileStatus>, String>`**
```rust
pub struct FileStatus {
    pub path: String,
    pub status: String,   // "staged" | "unstaged" | "untracked" | "conflicted"
    pub old_path: Option<String>, // for renames
}
```
Use `git2::Repository::open()` + `repo.statuses()` with default StatusOptions.

**2. `stage_file(repo_path: String, path: String) -> Result<(), String>`**
Use `repo.index()` → `index.add_path()` → `index.write()`.

**3. `unstage_file(repo_path: String, path: String) -> Result<(), String>`**
Use `repo.index()` + `repo.head()` to reset the entry to HEAD.

**4. `stage_all(repo_path: String) -> Result<(), String>`**
Use `index.add_all(["*"], IndexAddOption::DEFAULT, None)`.

**5. `get_diff(repo_path: String, path: String, staged: bool) -> Result<String, String>`**
Return the unified diff as a plain string. Use `repo.diff_index_to_workdir()` for unstaged, `repo.diff_tree_to_index()` for staged.

**6. `create_commit(repo_path: String, message: String, amend: bool) -> Result<String, String>`**
Return the new commit OID as hex string. Handle: get signature from repo config, build tree from index, find parent(s), call `repo.commit()`.

---

### React side (src/)

**Layout:** 3-panel view
- **Left panel** (`FileListPanel`): list of changed files grouped by status (Staged / Unstaged / Untracked). Each row shows filename + status icon + click to select.
- **Center panel** (`DiffViewer`): show the diff of selected file. Use `react-syntax-highlighter` or raw `<pre>` with line-level coloring (green = added, red = removed). Render added lines in green-tinted background, removed in red-tinted.
- **Right panel** (`CommitPanel`): textarea for commit message + "Commit" button + "Amend" checkbox + "Stage All" button.

**State additions to Zustand store** (add only, do not restructure existing keys):
```ts
selectedFilePath: string | null;
diffContent: string | null;
stagedFiles: FileStatus[];
unstagedFiles: FileStatus[];
```

**UX rules:**
- After staging/unstaging a file, auto-refresh the file list.
- After a successful commit, clear the commit message textarea and refresh the file list.
- Show a toast notification on commit success ("Committed: {shortOid}") and on any error.
- Disable the Commit button if there are no staged files OR if the message is empty.

---

**After completing all tasks:**
- Update memory/RUST_API.md with all 6 commands (name, params, return type).
- Update memory/FEATURE_REGISTRY.md: mark "Commit & Staging" as Done.
- Update memory/STORE.md with the new store keys added.
```

---

## Phase 2 — Commit Graph (GitKraken Style)

```
You are an expert Tauri 2 + Rust + React/TypeScript + D3.js developer.

**Read FIRST before writing any code:**
- memory/PROJECT_CONTEXT.md
- memory/FEATURE_REGISTRY.md
- memory/RUST_API.md
- memory/STORE.md
- gem_common_instruction.md

**Goal:** Render a GitKraken-style commit graph with branch lanes using D3.js SVG.

---

### Rust side

**1. `get_log(repo_path: String, limit: usize) -> Result<Vec<CommitNode>, String>`**
```rust
pub struct CommitNode {
    pub oid: String,           // full hex
    pub short_oid: String,     // first 7 chars
    pub parents: Vec<String>,  // parent OIDs
    pub author: String,
    pub email: String,
    pub timestamp: i64,        // unix seconds
    pub message: String,       // first line only
    pub refs: Vec<String>,     // branch/tag names pointing here e.g. ["HEAD", "main", "origin/main"]
    pub lane: usize,           // computed lane index (0-based, 0 = leftmost)
    pub color_idx: usize,      // which branch color to use (0-7, cycle)
    pub edges: Vec<EdgeInfo>,  // edges FROM this commit TO each parent
}

pub struct EdgeInfo {
    pub to_oid: String,
    pub from_lane: usize,
    pub to_lane: usize,
}
```

**Lane assignment algorithm (implement in Rust, not JS):**
- Maintain a `Vec<Option<String>>` representing active lanes (each slot = OID of the commit expected there).
- Walk commits in topological order (revwalk with TOPOLOGICAL | TIME sort).
- For each commit: find its slot (or assign a new one), compute edges to parents, place parents in slots.
- Return `lane` and `edges` pre-computed so D3 only renders, never calculates layout.

**2. `get_commit_detail(repo_path: String, oid: String) -> Result<CommitDetail, String>`**
```rust
pub struct CommitDetail {
    pub oid: String,
    pub message: String,     // full message
    pub author: String,
    pub email: String,
    pub timestamp: i64,
    pub changed_files: Vec<FileStatus>,
}
```

---

### React + D3 side

**Component:** `CommitGraph`

**Virtualization:** Use `@tanstack/react-virtual` with a fixed row height of 36px. Only render rows in the visible viewport.

**SVG per row:** For each visible `CommitNode`, render a mini SVG row (full width, 36px tall):
- Draw edge lines FIRST (behind nodes): bezier curves from `(lane * LANE_WIDTH + CENTER, 0)` to `(toLane * LANE_WIDTH + CENTER, 36)` for edges that pass through. Use cubic bezier `C` paths.
- Draw the commit circle: `cx = lane * LANE_WIDTH + CENTER`, `cy = 18`, `r = 6`. Fill = `LANE_COLORS[color_idx]`.
- Draw ref badges (branch/tag labels) to the right of the circle if `refs.length > 0`.
- Draw commit message text after the badges, truncated with ellipsis.

**Constants:**
```ts
const LANE_WIDTH = 20;    // px between lanes
const CENTER = 10;        // x offset for lane 0
const ROW_HEIGHT = 36;
const LANE_COLORS = ['#7F77DD','#1D9E75','#BA7517','#D85A30','#378ADD','#D4537E','#639922','#888780'];
```

**Click behavior:** Clicking a row sets `activeCommitOid` in the store and triggers `get_commit_detail` → renders detail in the right panel (changed files list + full message).

**Performance rules:**
- Never run layout in JS — always use pre-computed `lane` and `edges` from Rust.
- Debounce scroll events by 16ms.
- Use `React.memo` on the row component.

---

**After completing all tasks:**
- Update memory/RUST_API.md: add `get_log`, `get_commit_detail`.
- Update memory/FEATURE_REGISTRY.md: mark "Commit Graph" as Done.
- Update memory/STORE.md: add `commitLog: CommitNode[]`, `activeCommitOid`.
```

---

## Phase 3 — Branch Management

```
You are an expert Tauri 2 + Rust + React/TypeScript developer.

**Read FIRST before writing any code:**
- memory/PROJECT_CONTEXT.md
- memory/FEATURE_REGISTRY.md
- memory/RUST_API.md
- memory/STORE.md
- gem_common_instruction.md

**Goal:** Full branch management — list, create, checkout, delete, rename. Show ahead/behind for remote-tracked branches.

---

### Rust side

**1. `list_branches(repo_path: String) -> Result<Vec<BranchInfo>, String>`**
```rust
pub struct BranchInfo {
    pub name: String,
    pub branch_type: String,   // "local" | "remote"
    pub is_head: bool,
    pub upstream: Option<String>,
    pub ahead: usize,
    pub behind: usize,
    pub last_commit_oid: String,
    pub last_commit_message: String,
    pub last_commit_timestamp: i64,
}
```
For ahead/behind: use `repo.graph_ahead_behind(local_oid, upstream_oid)`.

**2. `create_branch(repo_path: String, name: String, from_ref: String) -> Result<(), String>`**
Resolve `from_ref` to a commit (could be OID, branch name, or "HEAD"), then `repo.branch(&name, &commit, false)`.

**3. `checkout_branch(repo_path: String, name: String) -> Result<(), String>`**
Use `repo.find_branch()` + `repo.checkout_tree()` + `repo.set_head()`. Return error with message if working tree is dirty.

**4. `delete_branch(repo_path: String, name: String, force: bool) -> Result<(), String>`**
Find branch, check if merged (unless force=true), then `branch.delete()`.

**5. `rename_branch(repo_path: String, old_name: String, new_name: String) -> Result<(), String>`**
`repo.find_branch()` → `branch.rename()`.

**6. `set_upstream(repo_path: String, branch: String, upstream: String) -> Result<(), String>`**
Set tracking reference via `repo.branch_set_upstream()`.

---

### React side

**Left sidebar — BranchPanel:**
- Sections: LOCAL BRANCHES / REMOTE BRANCHES / TAGS (collapsible)
- Each branch row: icon + name + (if local) ahead/behind pill `↑2 ↓1`
- Current branch row has a filled dot indicator and bold text
- Search input at the top (filter by name as user types)
- Right-click context menu on any branch: Checkout / Delete / Rename / Set Upstream / Copy Name

**Create Branch Modal:**
- Trigger: "+" button in the LOCAL BRANCHES header
- Fields: Branch name input + "From" selector (defaults to HEAD, can pick any branch/commit)
- On submit: call `create_branch`, then refresh branch list and switch to the new branch

**After checkout:**
- Refresh branch list (update `is_head`)
- Refresh commit graph (the graph should reflect the new HEAD position)
- Update `activeBranch` in store

**Dirty working tree handling:**
- If `checkout_branch` returns an error containing "dirty" or "uncommitted", show a modal asking: "Stash changes and checkout?" with Stash & Checkout / Cancel buttons.

---

**After completing all tasks:**
- Update memory/RUST_API.md: add all 6 branch commands.
- Update memory/FEATURE_REGISTRY.md: mark "Branch Management" as Done.
- Update memory/STORE.md: add `branches: BranchInfo[]`, `activeBranch: string | null`.
```

---

## Phase 4 — Remote Operations (Fetch / Pull / Push)

```
You are an expert Tauri 2 + Rust + React/TypeScript developer.

**Read FIRST before writing any code:**
- memory/PROJECT_CONTEXT.md
- memory/FEATURE_REGISTRY.md
- memory/RUST_API.md
- memory/STORE.md
- gem_common_instruction.md

**Goal:** Implement fetch, pull, push with real-time progress streaming to the UI.

---

### Rust side

Use Tauri's event emitter to stream progress. All three commands emit events during execution.

**Progress event payload:**
```rust
#[derive(Serialize, Clone)]
pub struct GitProgress {
    pub operation: String,   // "fetch" | "push" | "pull"
    pub phase: String,       // "Counting objects" | "Compressing" | "Receiving" | "Resolving"
    pub current: usize,
    pub total: usize,
    pub percent: f32,
    pub message: String,
}
```
Emit via `app_handle.emit("git-progress", payload)`.

**1. `fetch(repo_path: String, remote: Option<String>) -> Result<FetchResult, String>`**
```rust
pub struct FetchResult {
    pub remote: String,
    pub updated_refs: Vec<String>,
    pub bytes_received: usize,
}
```
Use `remote.fetch()` with a `RemoteCallbacks` that emits progress events on each tick.
Default remote = "origin" if None.

**2. `pull(repo_path: String, rebase: bool) -> Result<PullResult, String>`**
```rust
pub struct PullResult {
    pub merge_type: String,   // "fast-forward" | "merge-commit" | "up-to-date" | "rebase"
    pub new_head: String,     // OID after pull
}
```
Steps: fetch upstream → check merge analysis → if fast-forward, do it; if normal merge, create merge commit; if rebase=true, use `repo.rebase()`.

**3. `push(repo_path: String, remote: Option<String>, branch: Option<String>, force: bool) -> Result<(), String>`**
Emit progress events during push. Handle "rejected" refspec errors and return a descriptive error string.

**Credential handling:**
Create a `credentials_callback` helper that:
1. Tries SSH key from `~/.ssh/id_ed25519` or `id_rsa` first.
2. Falls back to username/password — but instead of prompting inline, emit a Tauri event `"git-credentials-needed"` and await a response event `"git-credentials-response"` with `{username, password}`. This lets the React side show a modal.

---

### React side

**Toolbar:** Add a row of buttons at the top: `Fetch` · `Pull` · `Push` — each with an icon and label.

**ProgressModal component:**
- Appears when any remote operation starts
- Shows: operation name, current phase text, animated progress bar (0–100%)
- Log area below the bar: append each progress event as a line of text (scrollable, monospace font)
- Closes automatically on success; shows error state with a "Dismiss" button on failure

**Credentials Modal:**
- Triggered by the `"git-credentials-needed"` event
- Fields: Username + Password (masked)
- On submit: emit `"git-credentials-response"` back to Rust
- On cancel: emit `"git-credentials-response"` with empty strings (Rust should then return auth error)

**After successful fetch/pull:**
- Re-run `get_log` to refresh the commit graph
- Re-run `list_branches` to update ahead/behind counts

**After successful push:**
- Show toast: "Pushed to {remote}/{branch}"
- Refresh branch ahead/behind counts

---

**After completing all tasks:**
- Update memory/RUST_API.md: add `fetch`, `pull`, `push`.
- Update memory/FEATURE_REGISTRY.md: mark "Remote Operations" as Done.
- Note in PROJECT_CONTEXT.md: credentials flow uses Tauri events, not inline callbacks.
```

---

## Phase 5 — Stash Visualization

```
You are an expert Tauri 2 + Rust + React/TypeScript developer.

**Read FIRST before writing any code:**
- memory/PROJECT_CONTEXT.md
- memory/FEATURE_REGISTRY.md
- memory/RUST_API.md
- memory/STORE.md
- gem_common_instruction.md

**Goal:** List, create, apply, pop, and drop stashes. Render stash entries as special nodes in the commit graph.

---

### Rust side

**1. `list_stashes(repo_path: String) -> Result<Vec<StashEntry>, String>`**
```rust
pub struct StashEntry {
    pub index: usize,
    pub message: String,
    pub oid: String,
    pub parent_oid: String,   // commit stash was created from
    pub timestamp: i64,
}
```
Use `repo.stash_foreach()` to collect entries.

**2. `stash_push(repo_path: String, message: Option<String>, include_untracked: bool) -> Result<String, String>`**
Return the new stash OID. Use `repo.stash_save()` with `StashFlags::INCLUDE_UNTRACKED` if requested.

**3. `stash_apply(repo_path: String, index: usize) -> Result<(), String>`**
Use `repo.stash_apply()`. Return conflict info in the error string if apply causes conflicts.

**4. `stash_pop(repo_path: String, index: usize) -> Result<(), String>`**
Apply then drop. If apply fails, do NOT drop.

**5. `stash_drop(repo_path: String, index: usize) -> Result<(), String>`**
Use `repo.stash_drop()`.

**6. `get_stash_diff(repo_path: String, index: usize) -> Result<String, String>`**
Return the unified diff of the stash as a string (diff between stash and its parent).

---

### React + D3 side

**Stash nodes in the commit graph:**

After loading the commit log, also load stash entries. For each stash:
- Find the row in the graph whose `oid` matches `stash.parent_oid`.
- Insert a virtual row ABOVE that parent row representing the stash.
- Render a **diamond shape** (rotated square) instead of a circle: `<rect transform="rotate(45)" width="10" height="10"/>`.
- Color: always `#FAC775` (amber), regardless of lane color.
- Label: show "WIP: {message}" truncated.
- Draw a dashed edge line from the diamond down to the parent commit circle.

**Stash Panel (collapsible section in left sidebar):**
- List all stashes: index + message + relative timestamp ("2 hours ago")
- Hover on a stash row → highlight the corresponding diamond in the graph
- Click a stash row → show the stash diff in the DiffViewer panel
- Right-click context menu: Apply / Pop / Drop

**"Stash Changes" button in CommitPanel:**
- Appears only when there are unstaged or untracked changes
- Opens a small popover: optional message input + "Include untracked" checkbox + Stash button
- On success: refresh file status list and stash list

**Drop confirmation:**
- Show a confirmation dialog before `stash_drop`: "Drop stash '{message}'? This cannot be undone."

---

**After completing all tasks:**
- Update memory/RUST_API.md: add all 6 stash commands.
- Update memory/FEATURE_REGISTRY.md: mark "Stash Visualization" as Done.
- Update memory/STORE.md: add `stashes: StashEntry[]`.
```

---

## Cross-phase memory update prompt (run after EACH phase)

```
Read memory/FEATURE_REGISTRY.md and memory/RUST_API.md.

Verify that:
1. Every Tauri command implemented in this phase is documented in RUST_API.md with correct params and return type.
2. FEATURE_REGISTRY.md shows the completed feature as "Done".
3. STORE.md reflects any new state keys added this phase.
4. PROJECT_CONTEXT.md is still accurate (update if folder structure changed).

If anything is missing or outdated, fix it now. Do not add placeholder or TODO entries — only document what is actually implemented.
```