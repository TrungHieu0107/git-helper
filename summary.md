# GitKit Summary
## Version: 2.3.7
## Last updated: 2026-04-29 – New Feature: Partial Staging (Hunk Staging)
## Project: GitKit

GitKit now supports **Partial Staging (Hunk Staging)**, enabling users to stage specific code blocks (hunks) from a modified file without staging the entire file. This is implemented via a new `apply_patch` backend command that uses `git2-rs` to apply Git patches directly to the index. The UI is integrated into the Monaco `MainDiffView`, where users can click a "Plus" icon in the gutter to stage a specific hunk. This provides a professional `git add -p` workflow within a modern, graphical interface.