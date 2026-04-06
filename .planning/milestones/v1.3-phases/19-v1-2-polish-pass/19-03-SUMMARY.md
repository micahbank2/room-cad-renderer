---
phase: 19-v1-2-polish-pass
plan: "03"
subsystem: sidebar-ux
tags: [sidebar, collapse, scroll, ui-polish, POLISH-06]
dependency_graph:
  requires: []
  provides: [sidebar-collapsible-sections, sidebar-full-collapse, sidebar-scroll]
  affects: [src/components/Sidebar.tsx, src/stores/uiStore.ts, src/App.tsx]
tech_stack:
  added: []
  patterns: [CollapsibleSection component, showSidebar visibility flag]
key_files:
  created: []
  modified:
    - src/components/Sidebar.tsx
    - src/stores/uiStore.ts
    - src/App.tsx
decisions:
  - "CollapsibleSection is a local file-scoped component (not exported) — no need for a shared component since only Sidebar uses it"
  - "SYSTEM_STATS, LAYERS, SNAP default to collapsed (defaultOpen=false) to reduce initial sidebar height"
  - "Sub-components with own headers (CustomElementsPanel, FramedArtLibrary, WainscotLibrary) are left unwrapped — they have internal expand/collapse UX"
  - "Hamburger button uses absolute positioning at top-left of canvas area when sidebar is hidden"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-06"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 19 Plan 03: Sidebar Scroll, Collapsible Sections & Full Collapse Summary

Sidebar is now fully scrollable with individually collapsible sections and a whole-sidebar toggle — collapsing unused panels frees vertical space on smaller screens.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add showSidebar to uiStore + CollapsibleSection component in Sidebar | 08e3e38 | src/stores/uiStore.ts, src/components/Sidebar.tsx |
| 2 | Wire sidebar collapse toggle into App.tsx layout | 44f1c7d | src/App.tsx |

## What Was Built

- **CollapsibleSection** — local helper component in Sidebar.tsx. Takes `label`, `defaultOpen` prop, and `children`. Renders a clickable header with `+`/`−` indicator that toggles child visibility.

- **Section collapse** — Six sections wrapped: `ROOM_CONFIG`, `SYSTEM_STATS`, `LAYERS`, `FLOOR_MATERIAL`, `SNAP`, `PRODUCT_LIBRARY`. `SYSTEM_STATS`, `LAYERS`, and `SNAP` start collapsed to reduce height.

- **Sidebar scroll** — Inner `<div className="flex-1 overflow-y-auto">` handles scroll. The `<aside>` is now `overflow-hidden` to prevent double scrollbars.

- **Sidebar header** — Thin `PANELS` header row with a left-arrow `◀` button to collapse the entire sidebar.

- **showSidebar state** — Added to `uiStore`: `showSidebar: boolean` + `toggleSidebar: () => void`. Defaults to `true`.

- **App.tsx integration** — `{isCanvas && showSidebar && <Sidebar />}` conditional. When hidden, a hamburger `☰` button appears at top-left of the canvas area to restore the sidebar.

## Verification

- `grep "CollapsibleSection" src/components/Sidebar.tsx` → 13 matches (well above 6 threshold)
- `grep "showSidebar" src/stores/uiStore.ts` → 3 matches
- `grep "toggleSidebar" src/stores/uiStore.ts` → 2 matches
- `grep "overflow-y-auto" src/components/Sidebar.tsx` → 1 match
- `grep "showSidebar" src/App.tsx` → 3 matches
- `grep "toggleSidebar" src/App.tsx` → 2 matches
- `npm run build` → passed (666 modules, 0 errors)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All sidebar sections render live data from store.

## Self-Check: PASSED

- src/components/Sidebar.tsx — exists, has CollapsibleSection, overflow-y-auto
- src/stores/uiStore.ts — exists, has showSidebar + toggleSidebar
- src/App.tsx — exists, conditionally renders Sidebar and hamburger button
- Commits 08e3e38 and 44f1c7d — verified in git log
