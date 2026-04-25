# 07 - Core Development Rules
## Version: 1.0.0
## Last updated: 2026-04-25 – Initial documentation setup
## Project: GitKit (git-helper)

# Genzo-Kit Core Development Rules (MUST BE FOLLOWED 100% BY ANTIGRAVITY)

These rules are permanent and non-negotiable. Every response involving Genzo-Kit must strictly obey all of them.

## 1. Project Structure & Modularity (Never Break)
- Project root folder must always be exactly `genzo-kit`.
- All tools MUST be placed in `src/tools/[kebab-case-tool-name]` (e.g. `text-comparator`, `json-formatter`).
- Never modify any existing tool folder when adding a new feature.
- Use dynamic imports only for adding new tools to the sidebar/navigation.
- The app must remain fully functional even if one tool is removed.

## 2. Documentation Rule (Mandatory After Every Change)
- After ANY change (new feature, bug fix, UI tweak), you MUST immediately update ALL 7 docs files:
  - 01-project-overview.md
  - 02-features.md
  - 03-editing-principles.md
  - 04-current-code.md
  - 05-workflow-new-feature.md
  - 06-workflow-fix-bug.md
  - 07-core-development-rules.md
- In 04-current-code.md, only append the changed/new section. Never overwrite the entire file.

## 3. Workflow Enforcement
- Adding any new feature → MUST follow `05-workflow-new-feature.md` exactly.
- Fixing any bug → MUST follow `06-workflow-fix-bug.md` exactly.
- Always reply with: "Done using Workflow XX" at the end of your response.

## 4. Technology & Performance Rules
- Must use Tauri v2 (Rust backend + React + TypeScript + TailwindCSS + shadcn/ui).
- No Electron, no Python, no heavy frameworks.
- Final executable must be named exactly `genzo-kit.exe`.
- Keep RAM usage under 60 MB and startup time under 0.6 seconds.
- Use native WebView2 on Windows.
- Minimize Rust dependencies; only add when absolutely necessary.

## 5. UI/UX Rules (Must Match Screenshot)
- Text Comparator must look EXACTLY like the provided screenshot (line numbers, yellow/red/green highlights, side-by-side panels, synchronized scrolling).
- Dark theme only.
- All text inputs support any format (Java, JSON, logs, etc.).
- All new tools must maintain the same professional IDE-like look.

## 6. Code Quality Rules
- Use TypeScript strictly (no any types).
- Add clear English + Vietnamese comments for every complex logic.
- Error handling must be user-friendly (no console.log in production).
- All code must be clean, readable, and follow React best practices.
- Never use deprecated Tauri APIs.

## 7. Testing & Safety Rules
- After every change, verify that Text Comparator (and all existing tools) still work 100%.
- Never introduce breaking changes.
- If a new dependency is added, it must be justified and tested.

## 8. Response & Communication Rules
- Always provide the full updated code for changed files.
- Always provide the complete content of all 7 docs files after changes.
- Give exact build command: `cargo tauri build --target x86_64-pc-windows-msvc`
- Never ask unnecessary questions if the request is clear.
- When user says "add a new feature" or "fix bug", automatically apply the correct workflow.

## 9. Naming & Versioning
- Tool names: Genzo [Tool Name] (e.g. Genzo Text Comparator)
- Version starts at 1.0 and increases only when major features are added.
- Commit messages must follow the exact style in workflows 05 and 06.
