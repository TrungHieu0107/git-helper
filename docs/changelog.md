# Changelog
All notable changes to GitKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
