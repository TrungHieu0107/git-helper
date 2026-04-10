# Fix Windows Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve TypeScript compilation errors that are preventing the Tauri application from building successfully on Windows via `build.bat`.

**Architecture:** We will systematically eliminate 5 TypeScript compilation errors (undeclared namespaces, unused variables, missing types) across 4 component files to allow Vite to build the project.

**Tech Stack:** React, TypeScript, Vite.

---

### Task 1: Fix TypeScript Errors

**Files:**
- Modify: `d:\linh_ta_linh_tinh\git-helper\src\App.tsx`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src\components\Sidebar.tsx`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src\components\StashAlerts.tsx`
- Modify: `d:\linh_ta_linh_tinh\git-helper\src\components\TopToolbar.tsx`

- [ ] **Step 1: Verify failing build**

Run: `npm run build`
Expected: FAIL with TypeScript errors for `TS2503`, `TS6133`, `TS2304`.

- [ ] **Step 2: Fix NodeJS.Timeout in App.tsx**

```tsx
// In d:\linh_ta_linh_tinh\git-helper\src\App.tsx
// Find Line 21 and replace it
// Replace:
// const focusDebounceRef = useRef<NodeJS.Timeout | null>(null);
// With:
const focusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 3: Fix unused 'i' and 'toast', 'Check' imports**

```tsx
// In d:\linh_ta_linh_tinh\git-helper\src\components\Sidebar.tsx
// Find Line 318 and remove the unused index parameter 'i'
// Replace:
// filteredStashes.map((s: StashEntry, i: number) => {
// With:
filteredStashes.map((s: StashEntry) => {

// In d:\linh_ta_linh_tinh\git-helper\src\components\StashAlerts.tsx
// Find Line 3 and 5 and remove unused 'Check' and 'toast'
// Remove `Check, ` from line 3:
// import { AlertCircle, AlertTriangle, Trash2, X } from "lucide-react";
// Remove line 5 entirely:
// import { toast } from "../lib/toast";
```

- [ ] **Step 4: Fix missing RecentRepo type in TopToolbar.tsx**

```tsx
// In d:\linh_ta_linh_tinh\git-helper\src\components\TopToolbar.tsx
// Find Line 5 and add RecentRepo to the imports from store
// Replace:
// import { useAppStore } from "../store";
// With:
import { useAppStore, RecentRepo } from "../store";
```

- [ ] **Step 5: Run npm run build to verify code passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Build with Tauri via build.bat**

Run: `.\build.bat`
Expected: PASS and standalone EXE output generated.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/Sidebar.tsx src/components/StashAlerts.tsx src/components/TopToolbar.tsx
git commit -m "fix: resolve typescript compilation errors for windows build"
```
