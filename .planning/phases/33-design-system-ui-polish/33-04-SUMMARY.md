---
phase: 33-design-system-ui-polish
plan: 04
subsystem: design-system
tags: [collapsible, properties-panel, localstorage, reduced-motion, d-06, d-07, d-08, d-09]
requires:
  - "Plan 02 stable section IDs (#position, #dimensions, #rotation, #material) on PropertiesPanel <h4> headers"
  - "Plan 03 useReducedMotion hook at src/hooks/useReducedMotion.ts"
provides:
  - "Reusable <CollapsibleSection> primitive at src/components/ui/CollapsibleSection.tsx"
  - "Typed localStorage helpers at src/lib/uiPersistence.ts (readUIObject/writeUIObject/readUIBool/writeUIBool) — also feeds Plan 07 gesture-chip dismiss"
  - "Per-section collapse state persisted under ui:propertiesPanel:sections"
affects:
  - "src/components/PropertiesPanel.tsx (10 section wrappers)"
  - "src/lib/uiPersistence.ts (new)"
  - "src/components/ui/CollapsibleSection.tsx (new)"
tech-stack:
  added: []
  patterns:
    - "Lazy init state via useState(() => readUIObject(...)[id] ?? defaultOpen) — no post-mount flicker"
    - "useEffect sync to localStorage on every toggle"
    - "Reduced-motion-guarded CSS transitions (transition: none | '...')"
    - "Test driver gated by import.meta.env.MODE === 'test'"
key-files:
  created:
    - "src/lib/uiPersistence.ts"
    - "src/components/ui/CollapsibleSection.tsx"
  modified:
    - "src/components/PropertiesPanel.tsx"
decisions:
  - "Shared-ID-across-entity-types is intentional: same localStorage key ('position') controls wall, product, and custom-element position sections in unison. Jessica collapses 'Position' once and it stays collapsed across every selected entity type."
  - "Sidebar.tsx's legacy inline CollapsibleSection (uses +/- glyphs + useState only, no persistence) NOT migrated — per research scope boundary and plan <interfaces> note."
  - "Test driver uses aria-expanded + data-collapsible-id (no DOM traversal heuristics); mirrors Phase 31 LabelOverrideInput driver shape."
  - "Chosen max-height: 9999 (vs. 'none') because CSS can only transition between numeric values; 9999px covers the longest possible section content without auto-sizing overhead."
metrics:
  duration_minutes: 7
  completed: "2026-04-22"
  tasks_completed: 3
  files_created: 2
  files_modified: 1
---

# Phase 33 Plan 04: Collapsible Properties Sections Summary

**One-liner:** Each PropertiesPanel section (Dimensions, Position, Rotation, Material) is now collapsible via a chevron header button; open/closed state persists to `localStorage['ui:propertiesPanel:sections']` across reloads and respects `prefers-reduced-motion`.

## Sections Wrapped

Total: **10 `<CollapsibleSection>` instances** across 4 entity-type render branches in `PropertiesPanel.tsx`.

| Entity | Sections wrapped |
|--------|-----------------|
| Ceiling | `dimensions` |
| Wall | `dimensions`, `position` |
| Product | `dimensions`, `material`, `position`, `rotation` |
| Custom element | `dimensions`, `position`, `rotation` |

All instances share the same four section IDs, so collapsing "Position" while a wall is selected also collapses it for the next selected product — consistent with Jessica's expectation that chrome-level UI preferences apply globally, not per-entity.

## localStorage Contract

- **Key:** `ui:propertiesPanel:sections`
- **Value shape:** `{ [sectionId: string]: boolean }` where `true` = open, `false` = collapsed
- **Missing key / missing ID:** → `defaultOpen = true` (D-07: all sections expanded on first visit)
- **Write triggers:** every toggle click (via `useEffect` watching `open`)
- **Read triggers:** once on mount via `useState` lazy initializer (no post-mount flicker)

Example localStorage state after a user collapses Position and Dimensions:
```json
{ "position": false, "dimensions": false }
```

## Test Driver Shape

Gated by `import.meta.env.MODE === "test"`:

```typescript
window.__driveCollapsibleSection = {
  getPersisted: () => Record<string, boolean>,
  getOpen: (id: string) => boolean,        // reads aria-expanded
  toggle: (id: string) => void,            // clicks header button
};
```

Uses `data-collapsible-id="{id}"` attribute on the wrapper `<div>` for deterministic targeting.

## Reduced-Motion Behavior

`useReducedMotion()` hook (from Plan 03) is consumed. When the user's OS preference is `prefers-reduced-motion: reduce`:
- Chevron rotation transition: `transition: none`
- Container max-height transition: `transition: none`

Snap-open/snap-closed with no animation, matching the D-39 invariant across all Phase 33 Wave 2/3 animations.

## Scope Boundary (Important)

**`src/components/Sidebar.tsx:17-42` inline `CollapsibleSection` was intentionally NOT migrated.** Per the plan's `<interfaces>` note and 33-RESEARCH.md, the legacy version uses `+/-` glyphs + `useState` with no persistence and sits at a different tier of the UI (app chrome vs. per-selection property inspector). Keeping them separate avoids accidental regressions to the Sidebar collapse UX while shipping the scoped properties-panel improvement Jessica needs.

## Verification

- `npx vitest run tests/phase33/collapsibleSections.test.ts` → **PASS (4/4 tests)**
- `npm run build` → **SUCCESS** (dist built in 664ms, no TS errors)
- `grep -c "<CollapsibleSection" src/components/PropertiesPanel.tsx` → **10** ✓ (spec required ≥3)
- `grep "CollapsibleSection" src/components/PropertiesPanel.tsx` shows named import at top ✓
- Plan 03 `useReducedMotion` consumed, not modified ✓
- Plan 02 stable IDs preserved (`id="position"`, etc.) as-is on each new `<CollapsibleSection id=...>` — no ID churn ✓

Out-of-scope failures in `tests/phase33/` (floating toolbar, gesture chip, inline title, library migration, rotation presets) are for Plans 05–09 not yet executed. Logged as expected.

## Deviations from Plan

None. Plan executed as written.

One pragmatic refinement documented in `decisions` above:
1. Used `max-height: 9999` instead of `'none'` for the closed-state CSS value because max-height transitions require numeric endpoints. 9999px covers the longest plausible properties-panel section.

## Commits

- `69b1fe1` feat(33-04): add uiPersistence.ts localStorage helpers
- `46d6bfc` feat(33-04): add CollapsibleSection primitive with localStorage + reduced-motion
- `0e55c0f` feat(33-04): wrap PropertiesPanel named sections in CollapsibleSection

Closes #84.

## Self-Check: PASSED

- FOUND: src/lib/uiPersistence.ts
- FOUND: src/components/ui/CollapsibleSection.tsx
- FOUND: src/components/PropertiesPanel.tsx (modified — 10 CollapsibleSection wrappers)
- FOUND: commit 69b1fe1
- FOUND: commit 46d6bfc
- FOUND: commit 0e55c0f
- VERIFIED: tests/phase33/collapsibleSections.test.ts 4/4 GREEN
- VERIFIED: npm run build passes
- VERIFIED: Sidebar.tsx legacy CollapsibleSection untouched (scope boundary)
- VERIFIED: src/hooks/useReducedMotion.ts consumed only (Plan 03 ownership preserved)
