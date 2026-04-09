---
name: generate-project-docs
description: >
  Generates a comprehensive, AI-readable documentation suite for a software project by deep-scanning
  the entire codebase. Use this skill whenever a user wants to: document their project for an AI
  assistant to understand, create persistent context docs, generate architecture or spec files from
  source code, or says things like "document my project", "generate docs so you understand my code",
  "create project context", "make docs for the AI", or "generate a knowledge base from my codebase".
  Also triggers when a user wants to refresh or regenerate existing project docs (architecture.md,
  spec.md, docs.md, etc.) from their current source code. Always use this skill — do not attempt
  to generate project documentation without it.
---

# Generate Project Docs Skill

This skill analyzes an entire codebase and produces a structured documentation suite designed
to serve as persistent, reusable context for an AI coding assistant.

## Goal

Produce 6 documentation files + a README that collectively capture:
- What the project is and does
- How it is architected (tech stack, data flow, IPC/API surface)
- What features are implemented, partial, or planned
- How users interact with the app
- How developers work with the codebase
- Known bugs and edge cases
- A reconstructed changelog

These docs must be precise and technical — exact function names, file paths, type names, command
names from the actual source code. No vague summaries.

---

## Step 1: Scan the Codebase

Before writing anything, build a complete mental map of the project:

1. List the full directory tree
2. Read every source file: backend, frontend, config, build files
3. Identify: tech stack, entry points, data flow, IPC/API surface, state management, UI components
4. Note any TODOs, FIXMEs, or undocumented logic in comments

> [!IMPORTANT]
> Do NOT start writing documents until you have read ALL relevant source files.
> Missing files lead to incomplete docs that mislead the AI assistant later.

---

## Step 2: Generate the 6 Documents

Produce each document below. Every document must open with this header block:

```
# [Title]
## Version: x.x.x
## Last updated: YYYY-MM-DD – [one-line summary of content]
## Project: [Project Name]
```

Use the current date for `Last updated`. Infer version from package.json, Cargo.toml, or existing docs.

---

### Document 1: `architecture.md`

Cover:
- **Tech stack**: every library/framework with its version
- **Directory map**: full tree, one-line description per file describing its responsibility
- **Data flow**: how data moves end-to-end (e.g., git2 → Tauri command → Zustand store → React component)
- **IPC / API surface**: for every backend command/endpoint: name, input params + types, return type, purpose
- **State management**: every store slice — shape, actions, which components consume it
- **Key architectural decisions**: non-obvious patterns, custom abstractions, why they exist

Flag anything undocumented with:
```
> [!NOTE] Undocumented: [description of gap]
```

---

### Document 2: `spec.md`

Cover:
- Every feature grouped by area, with status: `[Implemented]`, `[Partial]`, or `[Planned]`
- For each feature: what it does, how it works technically, which files are involved (exact paths)
- TODOs, placeholder logic, or incomplete implementations found in the code
- Edge cases explicitly handled in the code

---

### Document 3: `user_flow.md`

Cover:
- Step-by-step user flows for every major feature as **Mermaid flowcharts**
- Map each UI action to: the store action it triggers → the backend command it calls → the state update it produces
- Include error/edge case branches in the flows where they exist in code

---

### Document 4: `docs.md`

Cover:
- Setup and run instructions (install, dev, build commands)
- Non-obvious implementation decisions discovered in the code — explain the *why*
- Custom patterns or abstractions (e.g., how graph lane assignment works, how editor models are managed)
- Integration points between subsystems
- Any environment variables, config files, or runtime requirements

---

### Document 5: `bug_registry.md`

Format as a table + detailed entries:

```markdown
| ID | Title | Severity | Status | Fixed In |
|---|---|---|---|---|
| BUG-001 | ... | High | Fixed | 1.x.x |
```

Include:
- Bugs/TODOs explicitly mentioned in code comments
- Logic gaps you identify during analysis (flag these as `[Inferred]`)
- For each: symptoms, root cause, fix (if implemented), affected files

---

### Document 6: `changelog.md`

Reconstruct a changelog from what is currently implemented, organized by feature area.
Use semantic versioning inferred from existing docs or package files.
Format:

```markdown
## [x.x.x] - YYYY-MM-DD
### Added / Fixed / Changed
- **Feature Name**: description
```

---

## Step 3: Generate `README.md`

The README must:
- Link to all 6 documents
- Give a one-paragraph summary: what the project is, what it does, current implementation status
- List the tech stack in a single line
- Include dev setup commands

---

## Output Rules

- Be precise: use exact names from the code, not paraphrased descriptions
- Prefer tables and Mermaid diagrams over prose lists where structure exists
- Cross-link documents: if a Tauri command appears in `architecture.md`, reference the same command in `spec.md` and `user_flow.md`
- Flag ambiguity: `> [!NOTE] Undocumented:` for anything that can't be inferred from the code
- Do not ask clarifying questions — infer everything from the source code
- Output all 7 files (6 docs + README)

---

## Reapplication (Updating Existing Docs)

When the user wants to refresh existing docs after code changes:

1. Read all existing doc files first to understand current version numbers and structure
2. Re-scan changed/new source files
3. Produce updated versions of only the documents that need changes
4. Bump the version number and update the `Last updated` date in each modified document
5. Keep the same file structure and cross-links intact