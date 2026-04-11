# GitKit Status Summary
## Version: 2.5.3
## Last updated: 2026-04-11 – Fixed "Discard Changes" IPC mismatch
## Project: GitKit

GitKit has been patched to resolve an IPC parameter mismatch during file discard operations, ensuring that the "Discard Changes" context menu action works reliably.

**Recent Highlights**:
- **Discard Fix**: Resolved `missing required key filePath` error by synchronizing frontend parameter naming with Tauri's automatic camelCase conversion.
- **Reliable Explorer Integration**: Fixed directory redirection and selection issues on Windows.
- **Split Copy Path**: Advanced path copying support (Repo vs Full).
- **File History Modal**: Integrated high-performance historical diff viewing.
