# GitKit Status Summary
## Version: 2.4.6
## Status: Stable - Real-time Ref Updates

The GitKit commit graph now features isolated stash lanes, active branch highlighting, and real-time ref updates for a seamless experience.

**Recent Highlights**:
- **Stash Isolation**: Stash commits are now dynamically pushed to the right of all active branch lines.
- **Active Branch Highlighting**: The commit graph visually highlights the currently active branch badge.
- **Real-time Ref Updates**: Fixed a caching bug where branch badges didn't update after Git operations by implementing explicit cache invalidation.
