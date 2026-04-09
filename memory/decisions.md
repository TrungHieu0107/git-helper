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

<!-- Antigravity -->
