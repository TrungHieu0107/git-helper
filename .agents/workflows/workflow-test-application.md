---
description: Testing the Application
---

# Genzo-Kit Workflow: Testing & Auto Bug-Fix (Workflow 08 - Test + Fix Workflow)

**Goal:** Always read ALL documentation files first to understand the current state of Genzo-Kit, then perform complete testing AND automatically fix every bug found before declaring any change complete. Never report a bug without also fixing it in the same session.

**Trigger keywords:** "test", "verify", "check the app", "test the application", or after any code change.

**When triggered, immediately reply:** "Starting full test + auto bug-fix using Workflow 08..."

---

## Mandatory Step-by-Step Process (MUST follow this exact order every time)

---

### Phase 1: Full Documentation Reading (ALWAYS FIRST — NEVER SKIP)

Read and fully internalize ALL 8 files in the `docs/` folder in this exact order:

1. `01-project-overview.md`
2. `02-features.md`
3. `03-editing-principles.md`
4. `04-current-code.md`
5. `05-workflow-new-feature.md`
6. `06-workflow-fix-bug.md`
7. `07-core-development-rules.md`
8. `08-workflow-test-application.md`

After reading, confirm:
- The latest version and all tools (especially Genzo Text Comparator)
- Any known bugs or incomplete features already documented in `04-current-code.md`
- All rules from `07-core-development-rules.md` that constrain how fixes must be written

---

### Phase 2: Build & Startup Test

1. Build the project:
   ```
   cargo tauri build --target x86_64-pc-windows-msvc
   ```
2. If build **fails**:
   - Read the full compiler error output carefully
   - Identify root cause (type error, missing import, lifetime issue, etc.)
   - Apply fix directly to source code
   - Rebuild immediately — do NOT move to Phase 3 until build succeeds
   - Log the fix in the Bug Registry (see Phase 4)

3. If build **succeeds**:
   - Run the generated `genzo-kit.exe`
   - Verify startup time < 0.6 seconds
   - Verify RAM usage < 60 MB at idle
   - If either threshold is exceeded: profile the startup path, identify the bottleneck, apply optimization, rebuild, re-measure

---

### Phase 3: Comprehensive Testing + Immediate Bug-Fix Loop

**Rule: Every bug found must be fixed immediately before continuing to the next test. Do NOT accumulate a list of bugs to fix later.**

For each test below, follow this inner loop:
> **Test → Bug Found? → Diagnose → Fix code → Rebuild → Retest → Confirm fix → Continue**

---

#### 3-A. Genzo Text Comparator — Core Function Tests

| Test Case | Expected Result | Fix If Failing |
|---|---|---|
| Paste large Java code (1000+ lines) in both panels | No freeze, renders correctly | Check diff algorithm timeout, optimize chunking |
| Paste large JSON in both panels | No freeze, renders correctly | Same as above |
| Paste large log output in both panels | No freeze, renders correctly | Same as above |
| Paste empty text in one or both panels | Graceful handling, no crash | Add null/empty guard in diff logic |
| Load file from disk (.java, .json, .txt, .log, .xml) | File loads fully into panel | Check file reader error handling and encoding (UTF-8, Shift-JIS) |
| Compare two texts with differences | Line numbers shown, yellow/red/green highlights correct, scrolling synchronized | Debug highlight mapping, verify scroll sync handler |
| Compare two identical texts | Shows "no differences" state cleanly | Verify equality branch in diff renderer |
| Export diff as HTML report | Valid HTML file generated, opens in browser correctly | Check HTML template builder and file write path |
| Export diff as TXT report | Valid TXT file generated, human-readable | Check TXT formatter output |
| Clipboard paste button | Pastes clipboard content into correct panel | Check Tauri clipboard API permission and handler |
| "Clear" button on each panel | Clears panel content and resets diff state | Verify state reset includes highlights, scroll position, line numbers |
| Very large file (> 10,000 lines) | No crash, performance acceptable (< 3s render) | Add virtualized rendering or chunked diffing if needed |
| Malformed input (binary data, special characters) | Does not crash, shows readable error or renders safely | Add input sanitization and error boundary |
| Same text on both sides | "No differences" state, no false positives | Confirm diff algo handles equality correctly |

---

#### 3-B. All Other Tools (as listed in `02-features.md`)

For **each tool** listed in `02-features.md`:

1. Open the tool from the sidebar/navigation
2. Test every feature and input type listed for that tool
3. Test edge cases: empty input, very long input, special characters, rapid repeated actions
4. Verify UI renders correctly, no layout breakage, no overlapping elements
5. Verify no performance regression compared to baseline in `04-current-code.md`

Apply the same inner fix loop: **Test → Bug Found → Fix immediately → Rebuild → Retest → Confirm**

---

#### 3-C. Global UI & Integration Tests

- [ ] Navigation between all tools works without reload artifacts or state leaks
- [ ] Window resize: all panels reflow correctly at small (800×600) and large (1920×1080) sizes
- [ ] Dark/light mode (if applicable): no invisible text or broken contrast
- [ ] Keyboard shortcuts (if any): verify all shortcuts documented in `02-features.md` work
- [ ] No console errors in the Tauri WebView during any of the above tests

---

### Phase 4: Bug Registry & Root Cause Log

For every bug found and fixed during Phase 3, append an entry to this registry inside `04-current-code.md`:

```
## Bug Fix Log — [DATE]

### BUG-[N]: [Short title]
- **Discovered in:** Phase 3-A / 3-B / 3-C
- **Test case:** [Which test triggered it]
- **Symptom:** [What the user would observe]
- **Root cause:** [Exact technical explanation — file, function, line]
- **Fix applied:** [What was changed and why]
- **Files modified:** [List of files changed]
- **Verified:** [Retest result — pass/fail + how verified]
```

---

### Phase 5: Documentation Update

After all bugs are fixed and all tests pass:

1. **`04-current-code.md`** — Append the full Bug Fix Log from Phase 4
2. **`02-features.md`** — Update each tool with "Tested and verified on [DATE]"
3. **`06-workflow-fix-bug.md`** — Add any new fix patterns discovered that should inform future debugging
4. **`07-core-development-rules.md`** — If any fix revealed a missing or incorrect rule, update it

---

### Phase 6: Final Verification Build

After all fixes and documentation updates:

1. Run one final clean build:
   ```
   cargo tauri build --target x86_64-pc-windows-msvc
   ```
2. Do a fast smoke test: launch the app, open Genzo Text Comparator, paste sample text, confirm diff renders — this confirms nothing was broken by the documentation or minor edits.

---

## Final Output Requirement

End every response with one of these two outcomes — never skip this:

**If all tests pass with no bugs:**
> **Tested + Fixed using Workflow 08** — All tests passed ✅  
> No bugs found. Build clean. Documentation updated.

**If bugs were found and fixed:**
> **Tested + Fixed using Workflow 08** — All tests passed after fixes ✅  
> **Bugs fixed this session:** [N]  
> [Short summary list of each bug and its fix]  
> Build clean. Documentation updated.

**Never mark the task complete if:**
- Any test still fails after fix attempts
- The build is broken
- A bug was found but not yet fixed