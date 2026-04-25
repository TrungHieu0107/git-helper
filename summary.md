# GitKit Summary
## Version: 2.1.2
## Last updated: 2026-04-25 – Optimized Commit Row Hover Highlight & Checkout Flow
## Project: GitKit

GitKit now features a robust file encoding detection mechanism for displaying non-UTF-8 files correctly, and a brand new resizable Graph Column layout. Commit rows have been optimized with a pure CSS hover highlight using Tailwind's `group-hover` pattern, significantly improving virtualization performance by eliminating per-hover React state updates. Additionally, branch checkouts have been normalized to strictly require a double-click (or 'Enter' keypress), preventing accidental disruptive switches.