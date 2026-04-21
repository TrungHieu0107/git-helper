# Memory - GitKit
## Version: 1.1.1
## Last updated: 2026-04-21 – Fixing Missing invoke Import
## Project: GitKit

### [2026-04-21] — Fixing Missing invoke Import
- **Issue**: `ReferenceError: invoke is not defined` in `repo.ts` during app startup (`restoreAppState`).
- **Root Cause**: The `invoke` import was accidentally removed or omitted during the large refactoring for premium loading states.
- **Fix**: Added `import { invoke } from "@tauri-apps/api/core"` to `src/lib/repo.ts`.
- **Note**: Switched from `@tauri-apps/api/tauri` (legacy) to `@tauri-apps/api/core` (modern Tauri V2) to maintain consistency with other components like `WelcomeScreen.tsx` and `CheckoutAlert.tsx`.
- **Status**: Fixed ✓

> **Changes saved to memory.md and summary.md has been updated ✓**
