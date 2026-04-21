# Memory System Update
## 2026-04-21 - Imperative Dialog Refactor
- Refactored simple confirmation dialogs (Discard, Restore, Stash Drop) into an imperative ConfirmDialog primitive.
- Removed confirmDiscardAll, confirmRestoreFile, confirmStashDrop from store.
- Deleted DiscardAlert.tsx and RestoreFileAlert.tsx.
## 2026-04-21 - Bug Fix: Missing Export
- Fixed SyntaxError: discardAllChanges was not exported from repo.ts. Renamed discardAll to discardAllChanges to match imports.
## 2026-04-21 - Robust Conflict Resolver Implementation
- Replaced line-number based conflict resolution with a content-aware approach using `fullMarkerText` and `indexOf`.
- Implemented EOL normalization (LF/CRLF) in `resolveHunk` to prevent content corruption on Windows.
- Updated `conflictParser.ts` to populate `fullMarkerText` and provide `mergedBase` for initial editor state.
- Fixed a bug where `resultContent` was missing conflict blocks in the parser.
- Added automatic status refresh in `repo.ts` after Merge, Cherry-pick, and state detection.
- Improved widget interaction in `ConflictEditorView.tsx` with forced pointer events and elevated z-index.
## 2026-04-21 - Cancellation Error Handling (TDD)
- Identified source of "Unhandled Promise Rejection" as Monaco Editor's loader cancellation.
- Implemented TDD workflow using `vitest` to verify error suppression.
- Updated `handleError` in `src/lib/error.ts` to silently ignore objects with `type: 'cancelation'`.
## 2026-04-21 - Result Pane UI Refinement & Lifecycle Fixes
- Implemented `editor.setHiddenAreas` in `ConflictEditorView.tsx` to hide `<<<<<<< HEAD` markers in the Result pane for a cleaner look.
- Updated `resolveHunk` to call `refreshHiddenAreas` after each resolution to keep markers hidden for remaining hunks.
- Adjusted widget positions to appear on the first visible line of conflict content (since markers are hidden).
- Fixed unhandled promise rejections in `App.tsx` by adding `.catch()` handlers to Tauri event unlisten calls.
