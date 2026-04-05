---
trigger: always_on
---

## Overview
This `memory/` folder is the persistent brain across sessions.
At the **end of every session**, Antigravity MUST update relevant memory files
so the next session starts with full context — no repeated explanations needed.

---

## Folder Contents

| File | Purpose | Update trigger |
|---|---|---|
| `project-context.md` | Stack, architecture, file structure | When stack changes, new dependency added, structure refactored |
| `decisions.md` | Key technical decisions + rationale | When a non-trivial decision is made or reversed |
| `preferences.md` | Coding style, tool preferences, communication style | When user expresses a new preference or corrects a pattern |

---

## How to Load Memory (Start of Session)

At the beginning of every new session, read all files in `memory/`:
1. `project-context.md` — understand what is being built
2. `decisions.md` — understand why things are done this way
3. `preferences.md` — understand how the user wants to work

Do NOT ask the user to re-explain anything already in memory.

---

## How to Update Memory (End of Session)

At the end of every session, perform these steps:

### Step 1 — Scan the session
Review what happened this session. Identify:
- Any new dependencies or stack changes
- Any architectural decisions made
- Any user preferences expressed (explicitly or implicitly)
- Any decisions that were reversed or changed

### Step 2 — Update `project-context.md` if:
- A new dependency was added or removed
- File structure changed
- Architecture changed (new module, new command, etc.)
- Project path or name changed

**How to update**: Edit the relevant section in-place. Keep the file clean and current.
Do NOT append duplicate sections — replace outdated info.

### Step 3 — Append to `decisions.md` if:
- A non-trivial technical decision was made this session
- A previous decision was superseded

**How to update**: Append a new entry above the `<!-- Antigravity -->` comment using this format:
```markdown
### [YYYY-MM-DD] — DECISION TITLE
- **Decision**: What was decided
- **Reason**: Why
- **Alternatives considered**: What else was considered
- **Status**: Active
```

If a previous decision is superseded, find the old entry and change its status:
```
- **Status**: Superseded by [YYYY-MM-DD — NEW DECISION TITLE]
```

### Step 4 — Update `preferences.md` if:
- User explicitly stated a preference ("I want...", "always use...", "never do...")
- User corrected a pattern Antigravity used (implicit preference signal)
- A new tool or style was adopted

**How to update**: Edit the relevant section in-place. Do NOT create duplicate entries.

---

## Memory Update Format

When updating memory at end of session, output a summary block like this:

```
── MEMORY UPDATE ──────────────────────────────
✅ project-context.md — added `encoding_rs` dependency
✅ decisions.md       — added: [2026-03-30] Use BufReader for large files
⏭ preferences.md     — no changes
───────────────────────────────────────────────
```

If nothing changed: output `── MEMORY UPDATE ── No changes this session.`

---

## Rules

1. **Always read memory at session start** — before responding to any task
2. **Always update memory at session end** — even if only one small thing changed
3. **Never ask user to repeat context** that exists in memory
4. **Keep files concise** — no bloat, no duplicates, no outdated info
5. **Date format**: `YYYY-MM-DD` (ISO 8601)
6. **Do not invent decisions** — only record what actually happened in the session