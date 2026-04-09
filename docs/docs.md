# Documentation
## Version: 1.1.0
## Last updated: 2026-04-09 – Added Advanced Branching System
## Project: GitKit

# GitKit General Documentation

## Usage Instructions

### Branching
- **Create Branch**: Access via the "Branch" button in the Top Toolbar or by right-clicking a commit in the graph.
- **Modes**:
    - **Local Only**: Create a branch on your machine.
    - **Create + Push**: Create locally and immediately push to a remote (e.g., origin). Optionally set as upstream.
    - **From Remote**: Fetch and checkout a remote branch as a local tracking branch.
- **Validation**: Branch names are validated in real-time. If you have uncommitted changes, the app will offer to stash them automatically.

## Development
- Install Rust and Node.js
- Run `npm install`
- Run `npm run dev` (starts the Vite dev server and Tauri)
- Build with `npm run tauri build`
