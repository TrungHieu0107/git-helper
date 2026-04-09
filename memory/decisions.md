# Technical Decisions
## Version: 1.0.0
## Last updated: 2026-04-09
## Project: GitKit

### 2026-04-09 — Centralized Advanced Branching System
- **Decision**: Replaced the native `prompt()` in the toolbar and the legacy inline dialog in the context menu with a shared, professional-grade `CreateBranchDialog` component.
- **Reason**: To support complex workflows like pushing to remotes and tracking remote branches from a single entry point, while providing real-time validation and smart auto-stashing.
- **Consequences**:
    - Unified UX across Different entry points.
    - Improved safety by checking working tree state proactively.
    - Better error handling and user feedback.
- **Status**: Active

### 2026-04-09 — Use Git CLI for Advanced Stash Push
- **Decision**: Implemented `stash_save_advanced` by invoking the `git` CLI directly via `std::process::Command` instead of using `libgit2` bindings.
- **Reason**: `libgit2` does not natively support the `--keep-index` workflow (which is essential for stashing only unstaged changes). Invoking the CLI is the most reliable way to achieve this standard Git behavior.
- **Consequences**:
    - Requires `git` to be available in the system's PATH.
    - Enables features like selective stashing and including untracked files with custom messages.
- **Status**: Active

<!-- Antigravity -->
