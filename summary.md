# GitKit Summary
## Version: 2.4.0
## Last updated: 2026-04-29 – New Feature: Rebase Current Branch
## Project: GitKit

GitKit now supports **Rebase Current Branch**, allowing users to move the base of their current branch onto any selected commit via the `CommitGraph` context menu. The feature includes a full backend implementation using `git2-rs`, robust pre-checks (dirty working tree detection), and a premium confirmation dialog. Additionally, the application now automatically routes users to the **Conflict Editor** if a rebase operation encounters conflicts. The project build pipeline was also stabilized by resolving numerous TypeScript type errors and unused variables.