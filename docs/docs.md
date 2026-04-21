# Developer Documentation
## Version: 3.0.0
## Last updated: 2026-04-21 – Documenting modular architecture and UI library.
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

## 4. UI Architecture & Design System

### 4.1 UI Component Library (`src/components/ui/`)
GitKit utilizes a set of shared UI primitives to ensure visual consistency and ease of maintenance. These components are built with standard CSS and React:
- **Button**: Supports variants (primary, secondary, ghost, danger) and loading states.
- **Badge**: Used for status labels, counts, and tags.
- **Input**: Standardized input fields with label and error support.
- **Card**: Container component with glassmorphic styling options.

### 4.2 Modular Component Structure
Large panels like the `RightPanel` and `Sidebar` are decomposed into specialized sub-components within their respective directories. This pattern:
- Improves readability and testability.
- Enables granular re-renders by isolating state to specific sub-modules.
- Facilitates collaborative development on complex UI areas.

### 4.3 Design Tokens
Global styles in `src/index.css` define a set of HSL color tokens and spacing variables. Components should always use these variables (e.g., `var(--bg-glass)`, `var(--radius-md)`) rather than hardcoded values to support future themeability and maintain a unified aesthetic.
