---
name: log-reader
description: >
  Master skill for the Log Reader desktop app built with Tauri 2, Rust backend,
  and React/TypeScript frontend. Use this skill for ANY task involving: Tauri 2
  commands, Rust file I/O with BufReader, file watcher with notify crate, React
  virtual scroll with @tanstack/react-virtual, Windows build with build.bat,
  memory system management, or any log-reader project implementation task.
triggers:
  - tauri
  - tauri 2
  - log reader
  - log viewer
  - rust backend
  - bufread
  - file watcher
  - notify crate
  - virtual scroll
  - useVirtualizer
  - build.bat
  - windows build
  - memory bank
  - project context
---

# SKILL.md — Log Reader Desktop App

## How to use this file
Read this entire file before starting any task on this project.
It contains all rules, patterns, and constraints needed to implement correctly.

---

## TABLE OF CONTENTS
1. [Memory System](#1-memory-system)
2. [Tauri 2 — Setup & Patterns](#2-tauri-2--setup--patterns)
3. [Rust — File I/O, Threading, State](#3-rust--file-io-threading-state)
4. [React — Virtual Scroll](#4-react--virtual-scroll)
5. [Windows Build](#5-windows-build)

---

## 1. Memory System

### Folder: `memory/`
Read these files at the **start of every session**:

| File | Contains |
|---|---|
| `memory/project-context.md` | Stack, architecture, file structure |
| `memory/decisions.md` | Technical decisions + rationale |
| `memory/preferences.md` | Coding style, tool preferences |

**Rule**: Never ask the user to re-explain anything already in memory.

### End of Session — Update Memory

Scan what happened, then update relevant files:

- `project-context.md` → edit in-place when stack/structure changes
- `decisions.md` → append new entry using format below
- `preferences.md` → edit in-place when new preference is expressed

**Decision entry format:**
```markdown
### [YYYY-MM-DD] — DECISION TITLE
- **Decision**: What was decided
- **Reason**: Why
- **Alternatives considered**: What else was considered
- **Status**: Active
```

**End-of-session output:**
```
── MEMORY UPDATE ──────────────────────────────
✅ project-context.md — [what changed]
✅ decisions.md       — added: [date] [title]
⏭ preferences.md     — no changes
───────────────────────────────────────────────
```

---

## 2. Tauri 2 — Setup & Patterns

### ⚠️ This is Tauri 2 — NOT Tauri 1. APIs are different.

### Cargo.toml
```toml
[package]
name = "log-reader"
version = "1.0.0"
edition = "2021"

[lib]
name = "log_reader_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
regex = "1"
notify = "6"
```

### Entry Points

**`src-tauri/src/main.rs`** — minimal, no logic here:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    log_reader_lib::run();
}
```

**`src-tauri/src/lib.rs`** — all setup here:
```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(WatcherState { handle: std::sync::Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![
            cmd_read_page,
            cmd_filter_log,
            cmd_start_tail,
            cmd_stop_tail,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Tauri Commands — Rules
```rust
// ✅ Return type MUST be Result<T, String>
#[tauri::command]
fn cmd_read_page(path: String, page: usize, page_size: usize) -> Result<LogChunk, String> {
    log_reader::read_page(&path, page, page_size)
}

// ❌ WRONG — bare return type will not work
#[tauri::command]
fn cmd_read_page(path: String) -> LogChunk { ... }
```

### Emitting Events from Rust
```rust
// MUST import Emitter trait explicitly
use tauri::Emitter;

window.emit("log:new-lines", &new_lines).map_err(|e| e.to_string())?;
```

### Accessing State in Commands
```rust
use tauri::State;
use std::sync::Mutex;

pub struct WatcherState {
    pub handle: Mutex<Option<notify::RecommendedWatcher>>,
}

#[tauri::command]
fn cmd_stop_tail(state: State<WatcherState>) -> Result<(), String> {
    let mut guard = state.handle.lock().map_err(|e| e.to_string())?;
    *guard = None; // dropping watcher stops it
    Ok(())
}
```

### tauri.conf.json
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "LogReader",
  "version": "1.0.0",
  "identifier": "com.logreader.dev",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{ "title": "Log Reader", "width": 1280, "height": 800 }],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.ico"]
  }
}
```

### Frontend — Invoke (Tauri 2)
```typescript
// ✅ CORRECT — Tauri 2
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// ❌ WRONG — Tauri 1, do not use
import { invoke } from "@tauri-apps/api/tauri";
```

```typescript
// Argument naming: camelCase in TS → auto-converted to snake_case in Rust
const chunk = await invoke<LogChunk>("cmd_read_page", {
  path: "/var/log/app.log",
  page: 0,
  pageSize: 500,
});

// Listen to events
const unlisten = await listen<LogLine[]>("log:new-lines", (event) => {
  setLines(prev => [...prev, ...event.payload]);
});

// Cleanup on unmount
unlisten();
```

### Plugin: Dialog
```bash
npm install @tauri-apps/plugin-dialog
cargo add tauri-plugin-dialog
```
```typescript
import { open } from "@tauri-apps/plugin-dialog";

const selected = await open({
  multiple: false,
  filters: [{ name: "Log files", extensions: ["log", "txt", "*"] }],
});
```

---

## 3. Rust — File I/O, Threading, State

### Error Handling — Non-negotiable
```rust
// ✅ Always use ? with map_err
pub fn read_file(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

// ❌ Never use unwrap/expect in production paths
std::fs::read_to_string(path).unwrap()
```

### File I/O — Large Files
```rust
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};

// Always BufReader — never read_to_string for log files
let file = File::open(path).map_err(|e| e.to_string())?;
let reader = BufReader::with_capacity(256 * 1024, file); // 256KB buffer

// Seek to byte offset
file.seek(SeekFrom::Start(offset)).map_err(|e| e.to_string())?;

// Get file size (for tail — start at end)
let file_size = file.metadata().map_err(|e| e.to_string())?.len();
```

### Pagination Pattern
```rust
pub fn read_page(path: &str, page: usize, page_size: usize) -> Result<LogChunk, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let reader = BufReader::with_capacity(256 * 1024, file);
    let start = page * page_size;
    let mut lines = Vec::with_capacity(page_size);
    let mut total = 0;
    let mut offset = 0u64;

    for (i, line) in reader.lines().enumerate() {
        let content = line.map_err(|e| e.to_string())?;
        let len = content.len() as u64 + 1; // +1 for newline
        if i >= start && i < start + page_size {
            lines.push(LogLine { index: i, content, offset });
        }
        offset += len;
        total += 1;
    }

    Ok(LogChunk { lines, total_lines: total, has_more: start + page_size < total })
}
```

### Regex — Compile Once
```rust
use regex::Regex;

// ✅ Compile before loop
let re = Regex::new(pattern).map_err(|e| e.to_string())?;
for line in reader.lines() { re.is_match(&line?); }

// ❌ Never compile inside loop
for line in lines { Regex::new(pattern).unwrap().is_match(&line); }
```

### File Watcher — notify v6
```rust
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::mpsc;

let (tx, rx) = mpsc::channel::<notify::Result<Event>>();
let mut watcher = RecommendedWatcher::new(tx, Default::default())
    .map_err(|e| e.to_string())?;
watcher.watch(&path_buf, RecursiveMode::NonRecursive)
    .map_err(|e| e.to_string())?;

std::thread::spawn(move || {
    for res in rx {
        if let Ok(event) = res {
            if matches!(event.kind, EventKind::Modify(_)) {
                // handle modify
            }
        }
    }
});

// IMPORTANT: watcher must be kept alive — store in Tauri state
// Dropping watcher = watching stops
```

### Tail Implementation Pattern
```rust
pub fn tail_log(path: String, window: tauri::Window, state: State<WatcherState>) -> Result<(), String> {
    use tauri::Emitter;

    // Start from END of file — not beginning
    let mut read_offset = File::open(&path)
        .map_err(|e| e.to_string())?
        .metadata()
        .map_err(|e| e.to_string())?
        .len();

    let path_buf = std::path::PathBuf::from(&path);
    let path_clone = path_buf.clone();
    let (tx, rx) = std::sync::mpsc::channel::<notify::Result<notify::Event>>();

    let mut watcher = RecommendedWatcher::new(tx, Default::default())
        .map_err(|e| e.to_string())?;
    watcher.watch(&path_buf, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Store watcher in state BEFORE spawning thread
    *state.handle.lock().map_err(|e| e.to_string())? = Some(watcher);

    std::thread::spawn(move || {
        let mut line_index = 0usize;
        for res in rx {
            if let Ok(event) = res {
                if matches!(event.kind, notify::EventKind::Modify(_)) {
                    if let Ok(mut file) = File::open(&path_clone) {
                        file.seek(SeekFrom::Start(read_offset)).ok();
                        let reader = BufReader::new(file);
                        let mut new_lines = Vec::new();
                        for line in reader.lines().flatten() {
                            let len = line.len() as u64 + 1;
                            new_lines.push(LogLine { index: line_index, content: line, offset: read_offset });
                            read_offset += len;
                            line_index += 1;
                        }
                        if !new_lines.is_empty() {
                            window.emit("log:new-lines", &new_lines).ok();
                        }
                    }
                }
            }
        }
    });

    Ok(())
}
```

### Shared Structs
```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct LogLine {
    pub index: usize,
    pub content: String,
    pub offset: u64,
}

#[derive(Serialize, Deserialize)]
pub struct LogChunk {
    pub lines: Vec<LogLine>,
    pub total_lines: usize,
    pub has_more: bool,
}
```

### Zero Unsafe Policy
```rust
// ❌ Never write unsafe blocks
unsafe { ... }
```

---

## 4. React — Virtual Scroll

### Package
```bash
npm install @tanstack/react-virtual
# Use v3 API — useVirtualizer (NOT useVirtual from v2)
```

### Required Structure
```tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export function LogViewer({ lines, isTailing }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 20,
  });

  // Parent: MUST have fixed height + overflow-y: auto
  return (
    <div ref={parentRef} style={{ height: "100%", overflowY: "auto" }}>
      {/* Inner: total scrollable height, position: relative */}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}         // required
            ref={virtualizer.measureElement}      // required for dynamic height
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`, // NOT top
            }}
          >
            {lines[virtualRow.index].content}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Auto-Scroll for Tail Mode
```tsx
useEffect(() => {
  if (isTailing && lines.length > 0) {
    virtualizer.scrollToIndex(lines.length - 1);
  }
}, [lines.length, isTailing]);
```

### Log Level Color Coding
```tsx
function getLineBackground(content: string): string {
  if (/ERROR/i.test(content)) return "#3d1a1a";
  if (/WARN/i.test(content))  return "#3d2e00";
  if (/DEBUG/i.test(content)) return "#1a1a2e";
  return "transparent";
}
```

### Common Mistakes
| Mistake | Fix |
|---|---|
| Parent has no fixed height | Set `height: "100%"` or explicit px |
| Parent missing `overflowY: "auto"` | Required for scroll to work |
| Using `useVirtual` | Use `useVirtualizer` (v3 API) |
| Missing `data-index` on row | Required — virtualizer uses it for measurement |
| Using `top` instead of `transform` | Use `transform: translateY(${virtualRow.start}px)` |

---

## 5. Windows Build

### Prerequisites (must be installed)
| Tool | Check | Install |
|---|---|---|
| Rust | `rustc --version` | https://rustup.rs |
| Node.js >= 18 | `node --version` | https://nodejs.org |
| MSVC Build Tools | `where cl` | VS Build Tools → "Desktop development with C++" |
| WebView2 Runtime | (pre-installed Win10/11) | https://developer.microsoft.com/en-us/microsoft-edge/webview2/ |

```bat
# After installing Rust, run:
rustup target add x86_64-pc-windows-msvc
rustup default stable-x86_64-pc-windows-msvc
```

### build.bat
```bat
@echo off
echo ========================================
echo  Log Reader - One Click Build
echo ========================================

echo [CHECK] Rust...
rustc --version >nul 2>&1
if %errorlevel% neq 0 ( echo ERROR: Install Rust from https://rustup.rs & pause & exit /b 1 )

echo [CHECK] Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 ( echo ERROR: Install Node.js from https://nodejs.org & pause & exit /b 1 )

echo [1/2] npm install...
call npm install
if %errorlevel% neq 0 ( echo ERROR: npm install failed & pause & exit /b 1 )

echo [2/2] tauri build...
call npm run tauri build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed. Common causes:
    echo   - MSVC Build Tools missing: install "Desktop development with C++"
    echo   - WebView2 missing: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
    echo   - Wrong Rust target: rustup target add x86_64-pc-windows-msvc
    pause & exit /b 1
)

echo.
echo BUILD COMPLETE
echo Output: src-tauri\target\release\bundle\nsis\
start "" "src-tauri\target\release\bundle\nsis\"
pause
```

### Output Locations
```
src-tauri/target/release/
├── log-reader.exe                              ← portable standalone
└── bundle/
    ├── nsis/log-reader_1.0.0_x64-setup.exe    ← installer (distribute this)
    └── msi/log-reader_1.0.0_x64_en-US.msi
```

### Common Build Errors
| Error | Fix |
|---|---|
| `linker 'link.exe' not found` | Install MSVC Build Tools with C++ workload |
| `WebView2 is not installed` | Install WebView2 runtime |
| `Cannot find module '@tauri-apps/cli'` | Run `npm install` first |
| `dylib not found` | Run `rustup target add x86_64-pc-windows-msvc` |

---

## Quick Reference — Checklist Before Implementing

- [ ] Read `memory/` files first
- [ ] All Rust commands return `Result<T, String>`
- [ ] No `unwrap()` / `expect()` in production paths
- [ ] No `unsafe` blocks
- [ ] File I/O uses `BufReader`, not `read_to_string`
- [ ] Tail starts at end-of-file (not beginning)
- [ ] Watcher stored in Tauri managed state (`Mutex<Option<>>`)
- [ ] `use tauri::Emitter` imported before calling `.emit()`
- [ ] Frontend imports from `@tauri-apps/api/core` (not `/tauri`)
- [ ] LogViewer uses `useVirtualizer` (v3), not `useVirtual` (v2)
- [ ] Virtual scroll parent has fixed height + `overflowY: auto`
- [ ] `build.bat` checks prerequisites before building
- [ ] Update `memory/` files at end of session