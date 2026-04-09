# GitKit - High-Performance Git Client

GitKit is a modern, premium Git desktop client designed for speed and visual clarity. Built with **Tauri 2**, **Rust**, and **React 19**, it provides a GitKraken-inspired workflow with the performance of a native Rust backend.

## Project Status

GitKit is currently in **Active Development**. Most core Git operations (Staging, Committing, Branching, Stashing, Graphing) are implemented.

## 📁 Project Documentation

For detailed technical and project context, please refer to the documentation suite in the `/docs` directory:

- 🏗️ **[Architecture](file:///d:/learn/git-helper/docs/architecture.md)** — Tech stack, directory tree, data flow, and IPC reference.
- 📋 **[Specifications](file:///d:/learn/git-helper/docs/spec.md)** — Detailed feature list and implementation status.
- 🗺️ **[User Flows](file:///d:/learn/git-helper/docs/user_flow.md)** — Interaction maps and behavioral diagrams.
- 📖 **[Developer Reference](file:///d:/learn/git-helper/docs/docs.md)** — Build instructions and implementation deep-dives.
- 🪲 **[Bug Registry](file:///d:/learn/git-helper/docs/bug_registry.md)** — Known issues, TODOs, and technical debt log.
- 📜 **[Changelog](file:///d:/learn/git-helper/docs/changelog.md)** — Full feature and fix history.

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Build (Windows)
```bash
.\build.bat
```

## Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
