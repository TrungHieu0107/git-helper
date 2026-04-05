---
name: rust-tauri
description: >
  Rust patterns, rules, and safe coding conventions for Tauri 2 backend development.
  Use this skill for any Rust task involving: error handling with Result<T,String>,
  BufReader file I/O for large files, byte offset seeking, background threading,
  Mutex state management, file watching with notify v6 crate, regex filtering,
  or serde serialization. Enforces zero-unsafe and no-unwrap policies.
triggers:
  - rust
  - rust backend
  - cargo
  - bufread
  - bufreader
  - file io
  - seek
  - thread
  - mutex
  - notify
  - file watcher
  - regex
  - serde
  - result error
  - unwrap
  - unsafe
---

# SKILL: Rust for Tauri Apps

## Overview
Patterns and rules for writing safe, correct Rust code inside a Tauri 2 application.
Covers: error handling, threading, state management, file I/O, and background tasks.

---

## Error Handling — Golden Rule

All public functions and Tauri commands must return `Result<T, String>`.
Never use `unwrap()` or `expect()` in production code paths.

```rust
// ✅ CORRECT pattern
pub fn read_file(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

// ✅ Chaining with ?
pub fn process(path: &str) -> Result<Vec<String>, String> {
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let lines: Vec<String> = content.lines().map(String::from).collect();
    Ok(lines)
}

// ❌ NEVER do this in Tauri commands
pub fn bad(path: &str) -> String {
    std::fs::read_to_string(path).unwrap() // will panic and crash the app
}
```

---

## File I/O — Large Files

Always use `BufReader` — never load entire file into memory.

```rust
use std::fs::File;
use std::io::{BufRead, BufReader};

pub fn stream_lines(path: &str) -> Result<Vec<String>, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let reader = BufReader::with_capacity(256 * 1024, file); // 256KB buffer

    let mut results = Vec::new();
    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        results.push(line);
    }
    Ok(results)
}
```

### Seek to specific byte offset
```rust
use std::io::{Seek, SeekFrom};

let mut file = File::open(path).map_err(|e| e.to_string())?;
file.seek(SeekFrom::Start(offset)).map_err(|e| e.to_string())?;
// Now read from offset
```

### Get file size (for tail — start at end)
```rust
let metadata = file.metadata().map_err(|e| e.to_string())?;
let file_size: u64 = metadata.len(); // start tail from here
```

---

## Threading — Background Tasks

Use `std::thread::spawn` for background work. 
The spawned closure must be `'static` — clone any data needed before moving in.

```rust
use std::thread;

#[tauri::command]
fn start_background(window: tauri::Window) -> Result<(), String> {
    // Clone anything needed inside the thread BEFORE spawn
    let window_clone = window.clone();

    thread::spawn(move || {
        // background work here
        use tauri::Emitter;
        window_clone.emit("done", "finished").ok();
    });

    Ok(()) // return immediately, don't block the command
}
```

---

## Shared State with Mutex

Use `Mutex<Option<T>>` for stoppable background resources (watchers, handles).

```rust
use std::sync::Mutex;
use tauri::State;

// Define state struct
pub struct WatcherState {
    pub handle: Mutex<Option<notify::RecommendedWatcher>>,
}

// Register in lib.rs
tauri::Builder::default()
    .manage(WatcherState { handle: Mutex::new(None) })
    .invoke_handler(...)

// Start: store watcher
#[tauri::command]
fn start(state: State<WatcherState>, /* ... */) -> Result<(), String> {
    let watcher = create_watcher()?; // returns RecommendedWatcher
    let mut guard = state.handle.lock().map_err(|e| e.to_string())?;
    *guard = Some(watcher);
    Ok(())
}

// Stop: drop watcher by setting to None
#[tauri::command]
fn stop(state: State<WatcherState>) -> Result<(), String> {
    let mut guard = state.handle.lock().map_err(|e| e.to_string())?;
    *guard = None; // dropping the watcher stops it
    Ok(())
}
```

---

## File Watching with `notify` v6

```toml
# Cargo.toml
notify = "6"
```

```rust
use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher, EventKind};
use std::sync::mpsc;
use std::path::PathBuf;

pub fn watch_file(
    path: String,
    on_modify: impl Fn() + Send + 'static,
) -> Result<RecommendedWatcher, String> {
    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();

    let mut watcher = RecommendedWatcher::new(tx, Default::default())
        .map_err(|e| e.to_string())?;

    let path_buf = PathBuf::from(&path);
    watcher.watch(&path_buf, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    std::thread::spawn(move || {
        for res in rx {
            if let Ok(event) = res {
                // Check if it's a modify event
                if matches!(event.kind, EventKind::Modify(_)) {
                    on_modify();
                }
            }
        }
    });

    Ok(watcher) // IMPORTANT: caller must keep this alive
}
```

**Critical**: The `RecommendedWatcher` MUST be kept alive by the caller.
If it is dropped, watching stops immediately.

---

## Regex

```toml
# Cargo.toml
regex = "1"
```

```rust
use regex::Regex;

// Compile ONCE, reuse for many matches — never compile inside a loop
pub fn filter_lines(lines: &[String], pattern: &str) -> Result<Vec<String>, String> {
    let re = Regex::new(pattern).map_err(|e| e.to_string())?;

    let matched: Vec<String> = lines
        .iter()
        .filter(|line| re.is_match(line))
        .cloned()
        .collect();

    Ok(matched)
}
```

---

## Serde — JSON Serialization

All structs passed to/from Tauri frontend must derive `Serialize` and `Deserialize`.

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LogLine {
    pub index: usize,
    pub content: String,
    pub offset: u64,
}
```

---

## Zero Unsafe Policy

Never write `unsafe` blocks in Tauri app code.
If a crate requires unsafe, it handles it internally — you don't need to expose it.

```rust
// ❌ NEVER
unsafe {
    // anything
}

// ✅ Use safe abstractions from std or crates
```

---

## Common Compiler Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `cannot move out of ... which is behind a shared reference` | Tried to move value from behind `&` | Clone the value first |
| `closure may outlive ... borrowed value` | Closure in thread borrows non-static data | Move/clone data before `thread::spawn` |
| `the trait Emitter is not implemented` | Missing `use tauri::Emitter` | Add the import |
| `type ... cannot be shared between threads safely` | Type not `Send + Sync` | Wrap in `Mutex<>` or `Arc<Mutex<>>` |
| `unused Result ... must be used` | Ignoring a Result | Use `.ok()` to explicitly discard, or `?` to propagate |