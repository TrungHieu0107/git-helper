# Changelog
## Version: 2.10.0
## Last updated: 2026-04-12 – Conflict File Routing implementation.
## Project: GitKit

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.10.0] - 2026-04-12
### Added
- **Conflict Routing**: Unified conflict resolution workflow. Clicking any conflicted file in the working tree now automatically detects the source (Merge, Rebase, Cherry-Pick) and opens a context-aware editor.
- **Merge/Rebase Ops**: Integrated Abort and Continue actions for Merge and Rebase directly into the Conflict Editor.
- **Stale State Cleanup**: Editor now automatically closes if conflicts are resolved externally (e.g., via terminal).
### Improved
- **Process Stability**: `continue_rebase` now correctly handles interactive editor prompts by bypassing them.
- **Merge Logic**: `continue_merge` automatically retrieves messages from `.git/MERGE_MSG`.

## [2.9.2] - 2026-04-12
### Fixed
- **Reset Commit**: Allowed resetting to any valid commit object in the repository. Removed the strict ancestor reachability check that previously caused "Target commit is not reachable from HEAD" errors.

## [2.9.1] - 2026-04-12
### Fixed
- **Reset Commit**: Resolved a logic bug where the "Reset" option was incorrectly disabled for all commits due to an incorrect property check on the cherry-pick state object.
- **Safety Polish**: Specifically disabled Reset for stash nodes to maintain logical consistency.

## [2.9.0] - 2026-04-12
### Added
- **Reset Commit**: Right-click any commit in the graph to reset HEAD to that point. Supports Soft, Mixed, and Hard modes.
- **Safety Guards**: Added detached HEAD protection and reaching validation.
- **Destructive UI**: Implemented interactive warnings for Hard resets on dirty working trees.

## [2.8.4] - 2026-04-12
### Fixed
- **Graph Layout**: Resolved a visual discontinuity where the WIP node incorrectly connected to stash nodes instead of HEAD.

## [2.8.0] - 2026-04-12
### Added
- **Stash Management**: Full lifecycle management (Save, Apply, Pop, Delete) with graph integration.
- **Refresh Optimization**: Implemented smart window focus detection for auto-refreshing repository status.

## [2.7.0] - 2026-04-11
### Added
- **Restore File**: Selective recovery of files from commit history.
- **Encoding Detection**: Automatic charset detection for non-UTF8 source files in the Monaco editor.
- **Branch Management**: Enhanced safe checkout with conflict pre-detection.

## [2.5.0] - 2026-04-11
### Added
- **Commit Graph**: Virtualized Manhattan routing with curvy SVG edges.
- **Diff View**: Monaco-based side-by-side and inline diffing.
