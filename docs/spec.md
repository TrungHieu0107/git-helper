# Spec
## Version: 1.2.0
## Last updated: 2026-04-09 – Added Inline Stash Visualization
## Project: GitKit

Detailed technical specifications for the GitKit Manager App.

### Core Features
- Committing & Staging (working tree diff, stage/unstage, commit)
- Commit Graph Visualization:
    - GitKraken Style using Manhattan routing.
    - **Inline Stash Visualization**:
        - Square nodes with dashed primary borders.
        - L-shaped dashed paths connecting stashes to base commits.
        - Virtual row injection for stashes above their base commits.
- Branch Management (list, checkout, advanced creation, remote tracking)
- Advanced Branch Creation (validation, auto-stash, multiple modes)
- Remote Operations (Fetch, Pull, Push)
- Stash Visualization (List, apply, drop, inline graph tracking)
