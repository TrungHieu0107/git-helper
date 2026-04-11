# GitKit Documentation Suite
## Version: 2.7.0
## Last updated: 2026-04-11 – v2.7.0 Documentation Hub
## Project: GitKit

This directory contains the comprehensive technical documentation for GitKit.

### Core Documentation
- **[Architecture](architecture.md)**: Explore the system design, tech stack, and state management.
- **[Feature Specification](spec.md)**: Details on implemented features and technical implementation details.
- **[User Flow & Interaction Map](user_flow.md)**: Sequential maps of user actions across UI, store, and backend.

### Developer & Operational Docs
- **[Developer Reference](docs.md)**: Setup instructions, design patterns, and troubleshooting.
- **[Bug Registry](bug_registry.md)**: Tracking of known bugs, severity levels, and resolution status.
- **[Changelog](changelog.md)**: Reconstructed version history and detailed release notes.

---

### Project Overview
GitKit is a high-performance desktop Git client built with Tauri 2, Rust, and React. It leverages the speed of `libgit2` and the modern feel of Tailwind CSS v4 and Monaco Editor to provide a premium version control experience.

**Current Core Implementation Status**: Version 2.7.0 (Stable) ✓
- **Commit Graph**: Virtualized (10k+ rows) with topological sorting and lane routing.
- **File Management**: Integrated Monaco-based diffing with automatic encoding detection.
- **Operations**: Advanced stashing, safe checkout logic, cherry-picking, and restore file capabilities.
