# Documentation
## Version: 1.2.1
## Last updated: 2026-04-09 – Stash Lane Isolation Fix
## Project: GitKit

# GitKit General Documentation

## Usage Instructions

### Branching
- **Create Branch**: Access via the "Branch" button in the Top Toolbar or by right-clicking a commit in the graph.
- **Modes**:
    - **Local Only**: Create a branch on your machine.
    - **Create + Push**: Create locally and immediately push to a remote.
    - **From Remote**: Fetch and checkout a remote branch as a local tracking branch.

### Stash Visualization
- **Inline stashes**: Stashes appear as square nodes on the commit graph.
- **Lane Isolation**: Each stash entry occupies a dedicated, conflict-free lane to avoid overlapping with branch lines.
- **Details**: Hover over a stash node to see its message and index.

## Development
- Install Rust and Node.js
- Run `npm install`
- Run `npm run dev`
