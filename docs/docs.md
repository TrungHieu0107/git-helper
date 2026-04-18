# Developer Documentation
## Version: 2.10.1
## Last updated: 2026-04-12 – Documenting reset distance and encoding logic.
## Project: GitKit

This guide explains how to set up, build, and extend the GitKit project, with deep dives into non-obvious design patterns.

## 1. Development Environment

### Prerequisites
- **Node.js**: v20+ (uses Vite 7)
- **Rust**: 1.75+ (uses git2)
- **Tauri CLI**: `cargo install tauri-cli`

### Setup & Run
```bash
# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build (Windows)
```bash
npm run tauri build
```

## 2. Key Design Patterns

### 2.1 Commit Graph Layout
The graph layout is calculated in `src-tauri/src/commands/log/layout.rs`. It assigns a `lane` index to each commit.
- **Topological Sorting**: Ensures parents are always below children.
- **Lane Occupation**: A lane becomes available once its "active branch" merges back or terminates, allowing the graph to shrink horizontally.

### 2.2 Reset Distance Calculation
- **Backend**: performs a `Revwalk` starting from HEAD. It counts the number of steps until it hits the `target_oid`. If not found (target is on a parallel branch or ahead), it returns `0`.
- **Frontend**: In `ResetCommitDialog`, we perform a simple index subtraction in the `commitLog` array to give the user a visual "approximate" distance before they click confirm.

### 2.3 Charset Detection Pipeline
When opening a file, the `get_file_contents` command:
1. Checks for a UTF-8/UTF-16 BOM.
2. If no BOM, feeds the first 8KB into `chardetng`.
3. Decodes the buffer into a Rust `String` using the detected encoding.
4. Returns the content + encoding name. This prevents corrupt text when viewing Legacy/Vietnamese/Japanese source files.

## 3. Custom Abstractions

- **`useAppStore` ( sliced Zustand)**: The store is modularized to prevent monolithic growth. Components should subscribe to specific slices to avoid unnecessary re-renders.
- **`Manhattan Routing`**: SVG paths use a custom `roundedPath` utility in `CommitGraph.tsx` to convert stiff 90-degree lines into smooth, premium corners using SVG Arcs (`A`).
