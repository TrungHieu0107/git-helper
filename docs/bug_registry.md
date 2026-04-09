# Bug Registry
## Version: 1.3.1
## Last updated: 2026-04-09 – Fixed Home Tab Rendering
## Project: GitKit

| ID | Title | Severity | Status | Fixed In |
|---|---|---|---|---|
| BUG-001 | White screen when clicking Home tab | High | Fixed | 1.3.1 |
| BUG-002 | ReferenceError: restoreAppState is not defined | High | Fixed | 1.4.1 |

---

### BUG-001: White screen when clicking Home tab
...
### BUG-002: ReferenceError: restoreAppState is not defined
- **Severity**: High (App-breaking)
- **Status**: Fixed
- **Symptoms**: App fails to start with a ReferenceError in the console.
- **Root Cause**: Missing `restoreAppState` import in `App.tsx`.
- **Fix**: Added the missing import from `./lib/repo`.
- **Severity**: High (App-breaking)
- **Status**: Fixed
- **Symptoms**: Clicking the "Home" tab causes the entire screen to go blank/white.
- **Root Cause**: Missing imports for `Monitor` (icon) and `RecentRepo` (type) in `WelcomeScreen.tsx` after refactoring.
- **Fix**: Added missing imports from `lucide-react` and `../store`.
