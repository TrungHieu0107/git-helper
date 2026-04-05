---
name: tauri2
description: >
  Tauri 2 setup, patterns, and API reference for desktop app development.
  Use this skill for any task involving: Tauri 2 project setup, Cargo.toml
  config, tauri commands, state management, event emitting from Rust to frontend,
  tauri.conf.json, plugin-dialog, or frontend invoke/listen API.
  WARNING: Tauri 2 API is different from Tauri 1 — this skill enforces correct usage.
triggers:
  - tauri
  - tauri 2
  - tauri command
  - invoke
  - tauri state
  - tauri event
  - tauri emit
  - tauri.conf.json
  - plugin-dialog
  - desktop app
  - @tauri-apps/api
---

# SKILL: Tauri 2

## Overview
Tauri 2 is a framework for building desktop apps with Rust backend and web frontend (React/Vue/Svelte).
This skill covers Tauri 2 **only** — Tauri 1 syntax is different and must NOT be used.

---

## Project Initialization

```bash
npm create tauri-app@latest
# Choose: React + TypeScript + Vite
```

Manually if needed:
```bash
cargo install tauri-cli --version "^2"
npm install @tauri-apps/api@^2
npm install --save-dev @tauri-apps/cli@^2
```

---

## Cargo.toml — Required

```toml
[package]
name = "app-name"
version = "1.0.0"
edition = "2021"

[lib]
name = "app_name_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

---

## Entry Points

### `src-tauri/src/main.rs`
```rust
// MUST be exactly this — no logic here
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_name_lib::run();
}
```

### `src-tauri/src/lib.rs`
```rust
use tauri::Manager;

#[tauri::command]
fn my_command(arg: String) -> Result<String, String> {
    Ok(format!("got: {}", arg))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // setup code here if needed
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![my_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Tauri Commands — Rules

### Return type MUST be `Result<T, String>`
```rust
// ✅ CORRECT
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

// ❌ WRONG — will not compile as Tauri command
#[tauri::command]
fn read_file(path: String) -> String { ... }
```

### Accessing App State in commands
```rust
use tauri::State;
use std::sync::Mutex;

struct AppState {
    counter: Mutex<i32>,
}

#[tauri::command]
fn increment(state: State<AppState>) -> Result<i32, String> {
    let mut val = state.counter.lock().map_err(|e| e.to_string())?;
    *val += 1;
    Ok(*val)
}

// Register state in lib.rs:
tauri::Builder::default()
    .manage(AppState { counter: Mutex::new(0) })
    .invoke_handler(...)
```

### Emitting events FROM Rust TO frontend
```rust
// Tauri 2: use tauri::Emitter trait — MUST import it
use tauri::Emitter;

#[tauri::command]
fn start_work(window: tauri::Window) -> Result<(), String> {
    std::thread::spawn(move || {
        window.emit("progress", "50%").ok();
    });
    Ok(())
}
```

### Accessing AppHandle (for emitting from anywhere)
```rust
#[tauri::command]
fn do_something(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Emitter;
    app.emit("event-name", "payload").map_err(|e| e.to_string())
}
```

---

## Frontend — Invoke Commands

### Import path (Tauri 2 ONLY)
```typescript
// ✅ CORRECT — Tauri 2
import { invoke } from "@tauri-apps/api/core";

// ❌ WRONG — Tauri 1 syntax, do not use
import { invoke } from "@tauri-apps/api/tauri";
```

### Basic invoke
```typescript
const result = await invoke<string>("my_command", { arg: "hello" });
```

### Argument naming: camelCase in TS → snake_case in Rust
```typescript
// TypeScript
invoke("read_page", { filePath: "/log.txt", pageSize: 100 });

// Rust receives
fn read_page(file_path: String, page_size: usize) -> Result<...>
```

### Listening to events
```typescript
import { listen } from "@tauri-apps/api/event";

const unlisten = await listen<string>("progress", (event) => {
  console.log(event.payload);
});

// Cleanup
unlisten(); // call this to remove listener
```

---

## Plugin: Dialog (File Open/Save)

### Install
```bash
npm install @tauri-apps/plugin-dialog
cargo add tauri-plugin-dialog
```

### Register in `lib.rs`
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())  // ← ADD THIS
    .invoke_handler(...)
```

### Use in frontend
```typescript
import { open } from "@tauri-apps/plugin-dialog";

const selected = await open({
  multiple: false,
  filters: [{ name: "Log files", extensions: ["log", "txt", "*"] }],
});

if (typeof selected === "string") {
  // selected is the file path
}
```

---

## tauri.conf.json — Minimal Working Config (Tauri 2)

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "MyApp",
  "version": "1.0.0",
  "identifier": "com.myapp.dev",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "MyApp",
        "width": 1200,
        "height": 800,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.ico"]
  }
}
```

---

## Build for Windows

```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/nsis/*.exe
#         src-tauri/target/release/bundle/msi/*.msi
```

Prerequisites (must be installed on machine):
- Rust toolchain: https://rustup.rs
- Node.js >= 18
- WebView2 Runtime (usually pre-installed on Windows 10/11)
- MSVC Build Tools (via Visual Studio Installer → "Desktop development with C++")

---

## Common Mistakes to Avoid

| Mistake | Fix |
|---|---|
| Using `@tauri-apps/api/tauri` for invoke | Use `@tauri-apps/api/core` |
| Returning non-Result from command | Always return `Result<T, String>` |
| Forgetting `use tauri::Emitter` | Import trait before calling `.emit()` |
| Using `unwrap()` in commands | Use `?` with `map_err(|e| e.to_string())` |
| Tauri 1 `tauri::command` patterns | Always verify against Tauri 2 docs |
| Putting logic in `main.rs` | Keep `main.rs` minimal, put logic in `lib.rs` |