# Architecture
## Version: 0.1.0
## Last updated: 2026-04-05 - Initial project scaffold
## Project: GitKit

The GitKit application utilizes a standard Tauri 2 architecture:
- Core Desktop Shell: Tauri 2 (Rust)
- Backend Logic & Git Interop: Rust utilizing `git2` crate
- Frontend Framework: React 18 with TypeScript
- Build Tool: Vite
- Global State Management: Zustand
- Styling: Tailwind CSS v4
- Graph Visualization: D3.js and `@tanstack/react-virtual`
