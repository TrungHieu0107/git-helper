# Summary - GitKit
## Version: 1.1.1
## Last updated: 2026-04-21 – Fixing Missing invoke Import
## Project: GitKit

GitKit has been patched to fix a critical `ReferenceError` where the `invoke` function was not defined in `repo.ts`, causing failures during application startup and repository operations. The import has been restored using the modern Tauri V2 `@tauri-apps/api/core` module. This ensures that the newly implemented premium loading states and repository interactions function correctly as part of the overall architectural stability.
