# Changelog
## Version: 1.1.0
## Last updated: 2026-04-09 – Added Advanced Branching System
## Project: GitKit

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-04-09
### Added
- **Advanced Branching System**:
    - Centralized `CreateBranchDialog` with three modes: Local, Push, and Remote Tracking.
    - Debounced real-time branch name validation with suggestions.
    - Automated working tree check and smart auto-stashing.
    - Searchable source selector (branches, tags, SHAs).
    - Success cards with and terminal shortcut.
- Backend commands for remote branch listing and specific branch pushing.
- Right-click context menu on commit graph rows.
- Polished Glassmorphism design system for modals and controls.

### Changed
- Replaced legacy `prompt()` based branch creation with the new dialog.
- Updated `create_branch` backend to return structured results.
- Standardized modal animations and overlay blur effects.

## [0.1.0] - 2026-04-05
### Added
- Initial Rust and Tauri Setup
- React template with Vite, TypeScript
- Tailwind CSS v4 Integration
- Basic Document Registry layout
