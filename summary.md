# GitKit Status Summary
## Version: 2.7.0
## Last updated: 2026-04-11 – Implemented Restore File from Version
## Project: GitKit

GitKit has reached version 2.7.0 with the implementation of the "Restore File from This Version" feature. This addition brings professional-grade file recovery capabilities to the historical commit view, allowing users to selectively restore files with full support for Windows line endings, binary detection, and path mismatch warnings.

**Recent Highlights**:
- **Encoding & Context Menu**: Implementing auto-encoding detection and unified right-click actions in the History view.
- **Global UI**: Applied premium custom scrollbar styling project-wide for a consistent dark-theme experience.
- **Discard Fix**: Resolved `missing required key filePath` error by synchronizing frontend parameter naming with Tauri's automatic camelCase conversion.
- **File History Modal**: Integrated high-performance historical diff viewing.
- **Stash Lane Isolation**: Optimized commit graph for complex branching and stashing.
