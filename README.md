# GitKit (Git Helper)

GitKit is a premium, high-performance Git client built with Tauri 2, Rust, and React. It provides a visual, intuitive interface for managing Git repositories with a focus on graph density, fast workflows, and robust state management.

## Key Features
- **High-Fidelity Commit Graph**: Densely packed topological graph with Manhattan routing and curved pathways.
- **Advanced Branching**: Safe branch switching with conflict detection and automatic remote tracking.
- **Multi-Strategy Pull**: Support for Fast-Forward, Merge, and Rebase strategies with persistent preferences.
- **Cherry-Pick Workflow**: Interactive cherry-picking with a built-in conflict resolution editor.
- **Modular Architecture**: Domain-scoped Rust commands and sliced Zustand state management for maximum scalability.

## Tech Stack
**Tauri 2** + **Rust (git2-rs)** + **React 19** + **Zustand** + **Tailwind CSS v4** + **Monaco Editor**

## Documentation Suite
The project is fully documented in the `docs/` directory:
- [Architecture Overview](docs/architecture.md): Tech stack, directory map, and IPC surface.
- [Feature Specification](docs/spec.md): Technical details of every implemented feature.
- [User Flow & Interaction Map](docs/user_flow.md): Mermaid diagrams of core workflows.
- [Developer Documentation](docs/docs.md): Setup instructions and core implementation patterns.
- [Bug Registry & Known Issues](docs/bug_registry.md): Tracking bugs and logic gaps.
- [Changelog](docs/changelog.md): Reconstructed version history.

## Getting Started
1. Install dependencies: `npm install`
2. Run in dev mode: `npm run tauri dev`
3. Build production version: `npm run tauri build`

---
*Version: 2.1.0 Stable*
