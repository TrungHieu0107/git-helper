## [2.7.0] - 2026-04-11
### Added
- **Restore File (v2.7.0)**: Professional-grade file recovery from historical commits with Windows CRLF conversion and binary file safety.
- **Push Workflow**: Safe push with automatic upstream resolution and `--force-with-lease` support for amended commits.
- **Conflict Status**: Enhanced working tree status mapping to distinguish specific conflict types (AA, UU, etc.) for resolution.

## [2.6.0] - 2026-04-11
### Added
- **Auto Encoding Detection**: Robust backend pipeline using Mozilla's `chardetng` and BOM detection to correctly handle international charsets (Shift_JIS, GBK, etc.).
- **Encoding Badge**: Premium UI element in the diff view showing detected encoding, confidence levels, and allowing for manual overrides.

## [2.5.3] - 2026-04-11
### Fixed
- **Discard Changes IPC**: Resolved a parameter naming mismatch (`file_path` vs `filePath`) in the discard command.

## [2.5.2] - 2026-04-11
### Fixed
- **Explorer Integration**: Fixed path normalization for "Show in Explorer" on Windows.

## [2.5.1] - 2026-04-11
### Added
- **Split Copy Path**: The context menu now offers both "Copy Repo Path" (relative) and "Copy Full Path" (absolute) options for better developer productivity.

## [2.5.0] - 2026-04-11
### Added
- **File History Modal**: A full-screen overlay for exploring the historical versions of any file with integrated Monaco-based diff views.
- **File Context Menu**: Right-click actions on file rows in the Right Panel (Open in Editor, Show in Explorer, File History, Copy Path).
- **Safe Discard**: Intelligent per-file discard logic that differentiates between tracked and untracked files.
### Changed
- **MainDiffView Refactor**: Extracted core rendering logic to support multiple instances (main view vs modal view) with independent state.

## [2.4.5] - 2026-04-11
### Added
- Isolated Stash Lanes: Stash commits are now rendered in dedicated lanes to the right of the main branch graph, preventing overlaps and improving visual clarity.
### Fixed
- **UI Overflow**: Fixed a bug where the `Source Branch` dropdown in `CreateBranchDialog` was obscured by the dialog container.

## [2.3.0] - 2026-04-11
### Added
- **Commit Graph Virtualization**: Support for 10k+ rows with 60fps scrolling using `@tanstack/react-virtual`.
- **Force Checkout**: Workflow with safety stashing and UI alerts for destructive resets.

## [2.1.1] - 2026-04-11
### Added
- **Amend Commit**: Full workflow for amending the previous commit with author preservation and safety guards.

## [2.1.0] - 2026-04-11
### Added
- **Remote Branch Checkout**: Integrated automatic local tracking branch creation when checking out remote references from the graph.
- **Cherry-Pick Support**: Full workflow for cherry-picking commits, including an interactive conflict resolution editor using Monaco.

### Fixed
- **Branch Resolution**: Resolved issues where clicking remote tags (e.g., `origin/main`) in the commit graph failed to switch correctly when local branches existed.
- **Documentation**: Fully regenerated the developer documentation suite for modularized architecture.

## [2.0.1] - 2026-04-11
### Fixed
- **Pull UI Exception**: Fixed `Uncaught ReferenceError: className is not defined` when rendering Split-Buttons in the TopToolbar.

## [2.0.0] - 2026-04-10
### Changed
- **Modular Refactor**: Decomposed monolithic backend commands and frontend store into domain-scoped modules (Repo, Branch, Log, Stash, etc.).
- **Architecture**: Transitions to a sliced Zustand store architecture for improved performance and scalability.

## [1.1.0] - 2026-04-11 (Pull Strategies)
### Added
- **Pull Strategies**: Support for Fast-Forward Only, Merge, and Rebase pull strategies.
- **Persistence**: Persisted user preferences for pull strategies across application restarts.

## [1.0.0] - 2026-04-09
### Added
- Initial release of GitKit with high-fidelity commit graph, repository management, and staging/committing support.
