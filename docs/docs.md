# Documentation
## Version: 3.4.0
## Last updated: 2026-04-22 – High-Fidelity UI Modernization & Stability Hardening.
## Project: GitKit

## Development Setup

### Prerequisites
- **Node.js**: 20.19+ or 22.12+ (Vite 7 requirement)
- **Rust**: 1.75+ (latest stable recommended)
- **Tauri CLI**: `npm install -g @tauri-apps/cli`

### Installation
```bash
git clone https://github.com/TrungHieu0107/git-helper.git
cd git-helper
npm install
```

### Running in Development
```bash
npm run tauri dev
```

### Building for Production
```bash
npm run tauri build
```

## Technical Design Decisions

### Manhattan-Routed Commit Graph
The graph uses a custom routing algorithm to ensure that edges never overlap nodes and always turn at 90-degree angles (Manhattan routing). This is implemented in [CommitGraph.tsx](file:///d:/learn/git-helper/src/components/CommitGraph.tsx) using SVG paths with cubic bezier arcs for the "corners".

### Glassmorphic Design System
The UI follows a consistent "Glassmorphism" theme defined in [index.css](file:///d:/learn/git-helper/src/index.css). We use HSL color tokens for semantic colors and `rgba` with `backdrop-filter: blur()` for elevated surfaces.

### High-Performance Log Virtualization
To handle repositories with 100k+ commits, we use `@tanstack/react-virtual`. The log is fetched asynchronously in 100-commit batches, and the graph edges are calculated only for the visible viewport plus a small buffer.

### Robust Startup Initialization
The app uses a strict initialization sequence to avoid rendering components before the store and backend state are fully ready. This is managed via the `isInitializing` state in `App.tsx` and protected by a global `ErrorBoundary`.

## Integration Points

### Rust -> Frontend Communication
- **Tauri Commands**: Synchronous request-response.
- **Events**: The backend emits a `focus-changed` event whenever the window regains focus, which triggers a repository status refresh.

### Monaco Editor
We use the Monaco editor for both the [MainDiffView](file:///d:/learn/git-helper/src/components/MainDiffView.tsx) and the [ConflictEditorView](file:///d:/learn/git-helper/src/components/ConflictEditorView.tsx). Custom decorations are applied for hunk highlights and conflict markers.
