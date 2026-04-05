---
name: react-virtual-scroll
description: >
  React virtual scrolling using @tanstack/react-virtual v3.
  Use this skill for any task involving: rendering large lists (log lines, tables,
  search results), useVirtualizer hook setup, auto-scroll to bottom for tail mode,
  dynamic row height measurement, or performance optimization for 1000+ item lists.
  WARNING: v3 API (useVirtualizer) is different from v2 (useVirtual) — enforces correct usage.
triggers:
  - virtual scroll
  - virtualizer
  - useVirtualizer
  - useVirtual
  - tanstack virtual
  - react-window
  - large list
  - log viewer
  - auto scroll
  - tail scroll
  - performance list
  - render list
---

# SKILL: React Virtual Scroll with @tanstack/react-virtual

## Overview
Virtual scrolling renders only visible rows in the DOM instead of all rows.
Required when displaying large lists (1000+ items) — log lines, tables, search results.

Use `@tanstack/react-virtual` v3. **v3 API is different from v2 — do not use v2 examples.**

---

## Installation

```bash
npm install @tanstack/react-virtual
```

---

## Basic Usage — Fixed Row Height

```tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface Props {
  items: string[];
}

export function VirtualList({ items }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,           // total number of items
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,        // estimated row height in px
    overscan: 10,                  // render N extra rows outside viewport
  });

  return (
    // Parent: must have fixed height and overflow-y: auto
    <div
      ref={parentRef}
      style={{ height: "100%", overflowY: "auto" }}
    >
      {/* Inner: total scrollable height */}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}   // enables dynamic height measurement
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {items[virtualRow.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Auto-Scroll to Bottom (Tail Mode)

```tsx
import { useEffect } from "react";

// Inside component:
useEffect(() => {
  if (isTailing && items.length > 0) {
    virtualizer.scrollToIndex(items.length - 1, { behavior: "smooth" });
  }
}, [items.length, isTailing]);
```

---

## Scroll to Specific Index

```tsx
// Scroll to top
virtualizer.scrollToIndex(0);

// Scroll to bottom
virtualizer.scrollToIndex(items.length - 1);

// Smooth scroll
virtualizer.scrollToIndex(targetIndex, { behavior: "smooth" });
```

---

## Dynamic Row Height (variable content)

```tsx
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 28,   // initial estimate, will be corrected after measure
});

// In each row: attach ref={virtualizer.measureElement}
// The virtualizer will measure real height and adjust layout
{virtualizer.getVirtualItems().map((virtualRow) => (
  <div
    key={virtualRow.key}
    data-index={virtualRow.index}
    ref={virtualizer.measureElement}  // ← REQUIRED for dynamic height
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      transform: `translateY(${virtualRow.start}px)`,
    }}
  >
    {items[virtualRow.index]}
  </div>
))}
```

---

## Full Log Viewer Example

```tsx
import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface LogLine {
  index: number;
  content: string;
}

interface Props {
  lines: LogLine[];
  isTailing: boolean;
}

function getLineColor(content: string): string {
  if (/ERROR/i.test(content)) return "#3d1a1a";
  if (/WARN/i.test(content)) return "#3d2e00";
  if (/DEBUG/i.test(content)) return "#1a1a2e";
  return "transparent";
}

export function LogViewer({ lines, isTailing }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 20,
  });

  // Auto-scroll to bottom when tailing
  useEffect(() => {
    if (isTailing && lines.length > 0) {
      virtualizer.scrollToIndex(lines.length - 1);
    }
  }, [lines.length, isTailing]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div
      ref={parentRef}
      style={{
        height: "100%",
        overflowY: "auto",
        fontFamily: "monospace",
        fontSize: "13px",
        backgroundColor: "#0d0d0d",
        color: "#d4d4d4",
      }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const line = lines[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              onClick={() => handleCopy(line.content)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                display: "flex",
                alignItems: "center",
                padding: "1px 8px",
                backgroundColor: getLineColor(line.content),
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {/* Line number */}
              <span style={{ color: "#555", minWidth: "50px", marginRight: "12px", textAlign: "right" }}>
                {line.index + 1}
              </span>
              {/* Content */}
              <span style={{ whiteSpace: "pre", overflow: "hidden", textOverflow: "ellipsis" }}>
                {line.content}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Parent container has no fixed height | Set `height: "100%"` or `height: "500px"` — must be constrained |
| Parent missing `overflowY: "auto"` | Add `overflowY: "auto"` to the scroll container |
| Using `useVirtual` (v2 API) | Tauri 2 uses v3: use `useVirtualizer` instead |
| Not passing `ref={virtualizer.measureElement}` + `data-index` | Required for dynamic height to work correctly |
| Inner wrapper missing `position: "relative"` | Rows use `position: absolute` — parent must be `relative` |
| Rows missing `transform: translateY(...)` | This is how virtualizer positions rows — do not use `top` directly |