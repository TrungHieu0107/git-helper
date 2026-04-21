# Project Memory: GitKit Performance Optimization
## Version: 1.1.1
## Last updated: 2026-04-20 – Completed performance audit fixes and final code refactoring.
## Project: GitKit

### Performance Audit Fixes (2026-04-20)

#### [PERF-001] Redundant Repository::open in parallel loop
- **Reason**: Extreme I/O overhead from opening repo handles for every commit in batch.
- **Fix**: Implemented `THREAD_REPO` using `thread_local!` and `RefCell` in `get_log` (Rust). Repo is now opened once per thread.
- **Status**: Completed ✓

#### [PERF-002] Unbounded revwalk in get_file_log
- **Reason**: Synchronous O(N) scan of entire history causing UI freezes.
- **Fix**: Added pagination (page, page_size) to `get_file_log` in Rust. Updated `getFileLog` in TypeScript and `FileHistoryModal` to handle paginated response.
- **Status**: Completed ✓

#### [PERF-003] Missing list virtualization in CommitDetailPanel
- **Reason**: DOM bloat when viewing commits with thousands of files.
- **Fix**: Implemented virtualization for the Path List view using `@tanstack/react-virtual`.
- **Status**: Completed ✓

#### [PERF-004] No file size guard before diff decode
- **Reason**: High memory usage/crashes when loading huge files for diffing.
- **Fix**: Added `MAX_FILE_SIZE` (5MB) check in `get_file_contents` and `get_blob_bytes` (Rust). Added user-friendly error message in `MainDiffView`.
- **Status**: Completed ✓

#### [PERF-005] Redundant stash_foreach on every get_log invocation
- **Reason**: Unnecessary overhead from re-scanning stashes when they haven't changed.
- **Fix**: Implemented `STASH_CACHE` using `once_cell::sync::Lazy` and `Mutex` in Rust. Only refreshes if `refs/stash` OID changes.
- **Status**: Completed ✓

#### [PERF-006] Expensive in-memory commit search on large logs
- **Reason**: Performance degradation when filtering large commit logs on the frontend.
- **Fix**: Optimized `useMemo` in `CommitGraph.tsx` and added a sticky warning badge for searches > 5,000 commits.
- **Status**: Completed ✓

#### [REFACTOR] Code Cleanup (2026-04-20)
- **Reason**: Polish codebase after performance audit fixes.
- **Fix**: Consolidated imports in `mod.rs`, removed unused `Plus` icon in `Sidebar.tsx`, and verified clean build.
- **Status**: Completed ✓

### Refactoring & UI/UX Improvement (2026-04-21)
- **Request**: Refactor and clean up code, improve UI for better user experience.
- **Reason**: Enhance maintainability and elevate the application's aesthetic and usability.
- **Status**: Completed. Modularized `RightPanel` and `Sidebar`, introduced UI primitives, and refined design tokens.
- **2026-04-21 12:45**: Finalized all planned modularization tasks and verified UI consistency.
