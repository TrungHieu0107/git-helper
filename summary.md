# GitKit Status Summary
## Version: 2.4.5
## Status: Stable - Stash Lane Isolation

The GitKit commit graph now features isolated stash lanes to improve visual clarity and prevent overlap with active branch lines.

**Recent Highlights**:
- **Stash Isolation**: Stash commits are now dynamically pushed to the right of all active branch lines, providing a clear "outside" representation as requested.
- **Improved Layout Logic**: Updated the backend layout engine to calculate occupancy based on the entire branch area rather than just the base commit's immediate neighbors.
