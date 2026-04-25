---
description: Fixing a Bug (Bug Fix Workflow)
---

# Genzo-Kit Workflow: Fixing a Bug (Bug Fix Workflow)

**Goal:** Fix any bug with minimal change and ZERO risk of creating new bugs in other features.

**Mandatory Step-by-Step Process (Antigravity MUST follow this order every single time):**

1. **Reproduce & Isolate**  
   - Ask for more details if needed.  
   - Confirm the bug is only in one specific folder (`src/tools/[tool-name]` or shared file).

2. **Minimal Fix**  
   - Change only the necessary lines.  
   - Add clear Vietnamese + English comment explaining the fix.  
   - Never refactor unrelated code.

3. **Strict Isolation Testing**  
   - Test the fixed tool.  
   - Run full Genzo-Kit test (especially Text Comparator).  
   - If unit tests exist, run them.

4. **Immediate Documentation Update**  
   - Append the fix to `docs/04-current-code.md`.  
   - Update `docs/02-features.md` with "Fixed: [short description]".

5. **Final Commit Message Style**  
   - `fix: [tool-name] - [short bug description]`

When the user reports a bug, automatically apply this workflow and reply: "Fixed using Workflow 06".