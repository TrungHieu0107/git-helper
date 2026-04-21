# GitKit

GitKit is a high-performance, premium Git GUI built with Tauri, React, and Rust. It provides a visual, context-aware interface for complex Git workflows, including a Manhattan-routed commit graph, specialized conflict resolution, and advanced stashing management.

## Project Documentation

Explore the detailed documentation for GitKit:

- [Architecture](file:///d:/learn/git-helper/docs/architecture.md) - Tech stack, directory map, and IPC surface.
- [Technical Specification](file:///d:/learn/git-helper/docs/spec.md) - Feature implementation status and technical constraints.
- [User Flow](file:///d:/learn/git-helper/docs/user_flow.md) - Visualized state transitions and user workflows.
- [Developer Guide](file:///d:/learn/git-helper/docs/docs.md) - Setup instructions and implementation notes.
- [Bug Registry](file:///d:/learn/git-helper/docs/bug_registry.md) - Log of known issues and their resolutions.
- [Changelog](file:///d:/learn/git-helper/docs/changelog.md) - Version history and feature milestones.

## Tech Stack
**Frontend**: React 19, TypeScript 5.8, Zustand, Tailwind CSS v4, Monaco Editor.
**Backend**: Rust, Tauri v2, `git2` crate.

## Quick Start

### Development
```bash
npm install
npm run tauri dev
```

### Build
```bash
npm run tauri build
```

## Current Status
GitKit is in active development with a stable [3.1.0] core. Most essential git features are implemented, including branch management, conflict resolution, and commit history visualization.
