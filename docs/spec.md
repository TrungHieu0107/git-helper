# Spec
## Version: 1.1.0
## Last updated: 2026-04-09 – Added Advanced Branching System
## Project: GitKit

Detailed technical specifications for the GitKit Manager App.

### Core Features
- Committing & Staging (working tree diff, stage/unstage, commit)
- Commit Graph Visualization (GitKraken Style using Canvas/SVG, Manhattan routing)
- Branch Management (list, checkout, advanced creation, remote tracking)
- Advanced Branch Creation:
    - Debounced server-side validation.
    - Automated working tree check and stashing integration.
    - Flexible creation modes: Local, Push-to-Remote, Remote-Tracking.
- Remote Operations (Fetch, Pull, Push)
- Stash Visualization (List, apply, drop, automatic stashing for branch switching)
