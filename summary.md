# GitKit Status Summary
## Version: 2.5.2
## Last updated: 2026-04-11 – Fixed "Show in Explorer" redirection
## Project: GitKit

GitKit has been patched to ensure "Show in Explorer" reliably opens the parent folder and selects the target file on Windows by normalizing path slashes and correcting command argument formatting.

**Recent Highlights**:
- **Reliable Explorer Integration**: Fixed a bug where `explorer.exe` failed to reveal files due to redundant quotes and mixed path separators.
- **Split Copy Path**: Context menu now supports both Repository-relative and Full absolute path copying.
- **File History Modal**: Integrated searchable file history with Monaco diffing.
- **Backend Refinement**: Added path existence validation to file operations.
