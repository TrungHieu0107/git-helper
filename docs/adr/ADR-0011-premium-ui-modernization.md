# ADR-0011: Premium UI Modernization & Design Language
## Version: 1.0.0
## Last updated: 2026-04-22 – Initial decision for glassmorphism and OKLCH.
## Project: GitKit

## Status
Active

## Context
The previous UI was functional but lacked a cohesive, "professional-grade" aesthetic required for a premium developer tool. There were also intermittent runtime crashes related to nullable data rendering in the commit graph.

## Decision
Adopt a "Premium Pro" design language across the entire application:
1.  **Color Space**: Standardize on **OKLCH** color semantics for all status indicators, lanes, and avatars to ensure vibrant, perceptually uniform colors.
2.  **Surfaces**: Implement **Glassmorphism** using `backdrop-blur-xl` and translucent backgrounds (e.g., `bg-background/80`) to create depth and visual hierarchy.
3.  **Animations**: Use **Framer Motion** for all state transitions, entrance animations, and interactive elements (like branch dropdowns).
4.  **Stability**: Enforce **defensive rendering patterns** (optional chaining, null coalescing) in all high-frequency UI components (CommitGraph, CommitRow) to prevent runtime exceptions.
5.  **Window State**: Integrate `tauri-plugin-window-state` to ensure the application feels like a first-class desktop app by persisting window geometry.

## Consequences
- **Positive**: Significantly improved user perception, better visual clarity in the commit graph, and increased application robustness.
- **Negative**: Slightly higher GPU usage due to backdrop filters (mitigated by optimized CSS).
- **Maintenance**: Requires adherence to atomic design patterns when adding new components.
