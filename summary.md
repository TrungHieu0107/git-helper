# GitKit Summary
## Version: 2.1.2
## Last updated: 2026-04-25 – Added Resizable Graph Column & Normalized Checkout Flow
## Project: GitKit

GitKit now features a robust file encoding detection mechanism for displaying non-UTF-8 files correctly, and a brand new resizable Graph Column layout. The commit graph layout allows the Message column to overlap excess graph branches utilizing glassmorphism, solving horizontal explosion issues for repositories with complex histories. Additionally, branch checkouts have been normalized to strictly require a double-click (or 'Enter' keypress), preventing accidental disruptive switches when simply expanding trees or selecting branches.