---
name: rust-tauri-context-gen
description: >
  Generates a comprehensive PROJECT_CONTEXT.md for any Rust + Tauri project so an AI assistant
  can deeply understand the codebase and propose meaningful improvements. Use this skill whenever
  the user wants to: document a Tauri project for AI analysis, understand an existing Rust/Tauri
  codebase, get improvement suggestions for a Tauri app, onboard an AI into a desktop app project,
  or generate context files for a Rust backend + JS/TS frontend setup. Trigger even if the user
  says things like "help me understand this Tauri project", "what can be improved in my Tauri app",
  "analyze my Rust desktop app", or "generate docs for my Tauri project". Always use this skill
  before attempting to analyze or suggest improvements for any Tauri project — do not attempt to
  analyze without it.
---

# Rust + Tauri Project Context Generator

Generate một file `PROJECT_CONTEXT.md` toàn diện để AI hiểu sâu project Rust + Tauri và đề xuất cải thiện.

## Workflow tổng quan

1. **Xác định Tauri version** (v1 vs v2 — config schema khác nhau)
2. **Thu thập thông tin** theo 10 tasks bên dưới
3. **Output** một file markdown duy nhất, đầy đủ, không tóm tắt code

> **Quan trọng**: Dump nguyên văn code, types, signatures — không paraphrase. AI cần exact values.

---

## Cách xác định Tauri version

```bash
grep -i "tauri" src-tauri/Cargo.toml | head -5
# Tauri v1: tauri = { version = "1.x" }
# Tauri v2: tauri = { version = "2.x" }
```

- **Tauri v1**: dùng `allowlist` trong `tauri.conf.json`
- **Tauri v2**: dùng thư mục `capabilities/` và `permissions`

---

## 10 Tasks để generate PROJECT_CONTEXT.md

### TASK 1 — Project Overview

```markdown
## Project Overview
- Tên project, mục đích ứng dụng
- Tauri version (v1/v2), Rust edition
- Frontend framework + bundler (React/Vue/Svelte + Vite/Webpack...)
- Target platforms: Windows / macOS / Linux
- Trạng thái: prototype / active development / production / maintenance
```

---

### TASK 2 — Directory Structure

Chạy lệnh và annotate output:

```bash
find . -not -path '*/node_modules/*' \
       -not -path '*/.git/*' \
       -not -path '*/target/*' \
       -not -path '*/dist/*' \
       | sort | head -120
```

Thêm inline comment `# <mô tả>` cho các thư mục quan trọng.

---

### TASK 3 — Cargo Dependencies

Dump toàn bộ nội dung:
- `Cargo.toml` (root)
- `src-tauri/Cargo.toml`

Với mỗi dependency không phải std: thêm 1 dòng ghi chú mục đích.
Ghi rõ `[features]` và `[profile.release]` nếu có.

---

### TASK 4 — Tauri Configuration

Dump toàn bộ `tauri.conf.json` (hoặc `tauri.conf.toml`).

Highlight riêng các mục:

| Mục | Tauri v1 | Tauri v2 |
|-----|----------|----------|
| Permissions | `allowlist` | `capabilities/*.json` |
| Bundle | `tauri.bundle` | `tauri.bundle` |
| Window | `tauri.windows[]` | `app.windows[]` |
| Updater | `tauri.updater` | plugin-updater |

Nếu Tauri v2: dump thêm tất cả files trong `capabilities/`.

---

### TASK 5 — Rust Backend Architecture *(phần quan trọng nhất)*

#### 5a. Module Map
List tất cả `.rs` files trong `src-tauri/src/` với mô tả 1 dòng.

#### 5b. Tauri Commands — document MỌI `#[tauri::command]`

```
### `command_name`
- **Signature**: fn command_name(arg: Type, state: State<X>) -> Result<Y, Z>
- **Purpose**: làm gì
- **State accessed**: các fields được đọc/ghi
- **Async**: yes / no
- **Error handling**: unwrap / proper Result / custom error
- **Side effects**: file I/O, network, DB, system calls
```

Lệnh tìm commands:
```bash
grep -rn "#\[tauri::command\]" src-tauri/src/ --include="*.rs" -A 3
```

#### 5c. Application State

Dump toàn bộ structs được dùng với `.manage()`:
- Fields + types
- Sync primitives (Mutex/RwLock/Arc)
- Initialization logic trong `main()`

```bash
grep -rn "\.manage(" src-tauri/src/ --include="*.rs"
```

#### 5d. Event System

List tất cả `emit()` và `listen()` calls:

| Event name | Payload type | Direction | File |
|------------|-------------|-----------|------|
| ... | ... | backend→frontend | ... |

```bash
grep -rn "\.emit\|\.listen\|\.once" src-tauri/src/ --include="*.rs"
```

#### 5e. Main Setup

Dump toàn bộ `main.rs` (Tauri builder chain, plugin registrations).

---

### TASK 6 — Frontend Architecture

#### 6a. Invoke Map — tìm TẤT CẢ `invoke(` calls

```bash
grep -rn "invoke(" src/ --include="*.ts" --include="*.tsx" \
  --include="*.vue" --include="*.svelte" --include="*.js"
```

Format thành bảng:

| Command | Arguments | Return type | File |
|---------|-----------|-------------|------|

#### 6b. State Management
- Solution (Zustand/Pinia/Redux/Signals/Context/Jotai...)
- Những gì sync với Rust backend
- Optimistic update patterns nếu có

#### 6c. Key Components/Pages
List top-level components với mô tả ngắn.

---

### TASK 7 — Error Handling Audit

```bash
# Tìm unwraps tiềm ẩn panic
grep -rn "\.unwrap()\|\.expect(" src-tauri/src/ \
  --include="*.rs" | grep -v "//.*unwrap"
```

Document:
- Mỗi unwrap: `file:line → context`
- Custom error types (dump định nghĩa đầy đủ)
- Frontend xử lý invoke errors thế nào?
- Có global error boundary không?

---

### TASK 8 — Async & Performance

- Tokio runtime config (nếu custom)
- `spawn_blocking` usage (blocking calls trong async context)
- Commands nào heavy computation?
- File I/O và database patterns
- Caching layer nếu có

```bash
grep -rn "spawn_blocking\|block_in_place\|tokio::task" \
  src-tauri/src/ --include="*.rs"
```

---

### TASK 9 — Known Issues & TODOs

```bash
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP\|WORKAROUND" \
  src-tauri/src/ src/ \
  --include="*.rs" --include="*.ts" --include="*.tsx" \
  --include="*.vue" --include="*.svelte"
```

Dump toàn bộ, nhóm theo file.

---

### TASK 10 — Build & Dev Workflow

- `package.json` scripts liên quan Tauri
- CI/CD pipeline (`.github/workflows/*.yml` nếu có — dump nguyên văn)
- Environment variables cần thiết
- Dev vs Production config differences
- Code signing setup nếu có

---

## Output Format

Gộp tất cả vào **một file duy nhất**: `PROJECT_CONTEXT.md`

```markdown
# PROJECT_CONTEXT.md — <Project Name>
Generated: <date>

## Table of Contents
[auto-generate]

## Project Overview
...

## Directory Structure
...

[Tasks 3–10 theo thứ tự]

## Summary for AI
[200-300 từ tóm tắt cho AI: kiến trúc tổng thể, tech stack,
điểm mạnh, điểm yếu tiềm ẩn, areas cần cải thiện nhất]
```

---

## Checklist trước khi hoàn thành

- [ ] Đã xác định đúng Tauri v1 vs v2
- [ ] Mọi `#[tauri::command]` đều được document
- [ ] Không có phần nào bị tóm tắt thay vì dump nguyên văn
- [ ] Bảng invoke map đủ tất cả frontend → backend calls
- [ ] Unwrap audit đã chạy
- [ ] File cuối có section "Summary for AI"

---

## Tips cho từng tình huống

**Nếu project dùng workspace Cargo**: kiểm tra thêm `Cargo.toml` ở root workspace, list tất cả members.

**Nếu có database** (SQLite via sqlx/rusqlite): document schema đầy đủ.
```bash
grep -rn "CREATE TABLE\|migrate" src-tauri/ --include="*.rs" --include="*.sql"
```

**Nếu có plugin Tauri**: list tất cả plugins và config của chúng.
```bash
grep -rn "tauri-plugin\|plugin::" src-tauri/Cargo.toml src-tauri/src/
```

**Token budget bị giới hạn**: ưu tiên theo thứ tự Task 5b > 5c > 6a > 7 > còn lại.