---
phase: 84-contextual-visibility-v1-21
plan: 01
subsystem: sidebar
tags: [ia-08, contextual-visibility, sidebar, panel-section, v1.21-final]
closes: 177
requirements: [IA-08]
dependency-graph:
  requires:
    - Phase 81 IA-02 (PanelSection-wrapped Sidebar)
    - Phase 72 PanelSection primitive
    - Phase 83 IA-07 (sidebar-snap migrated out — clean 6-panel baseline)
  provides:
    - Tool-bound left-sidebar contextual visibility (IA-08)
    - PanelSection.forceOpen prop (re-usable primitive override)
  affects:
    - src/components/Sidebar.tsx
    - src/components/ui/PanelSection.tsx
    - tests/Sidebar.ia08.test.tsx (new)
    - tests/e2e/specs/sidebar-contextual-visibility.spec.ts (new)
    - src/components/__tests__/Sidebar.ia02.test.tsx (split into 2 regimes)
tech-stack:
  added: []
  patterns:
    - Conditional mount over CSS-hidden (Phase 79 precedent — full unmount + DOM-absent assertions)
    - Additive prop with safe default (`forceOpen = false`) to preserve existing call sites
    - effectiveOpen = forceOpen || open — render-only override; localStorage state untouched
key-files:
  created:
    - tests/Sidebar.ia08.test.tsx
    - tests/e2e/specs/sidebar-contextual-visibility.spec.ts
  modified:
    - src/components/ui/PanelSection.tsx
    - src/components/Sidebar.tsx
    - src/components/__tests__/Sidebar.ia02.test.tsx
decisions:
  - D-02 enforced (per-section gates): sidebar-custom-elements ∈ {select,product}; sidebar-framed-art + sidebar-wainscoting require activeTool=select AND wall selection
  - D-04 enforced: sidebar-product-library forceOpen when activeTool === "product"; persisted localStorage state preserved across force-on/off cycles
  - D-06 enforced: Phase 81 IA-02 test split into default + wall-selected regimes; no other tests required updates (audit confirmed)
  - D-01 honored: NO new ToolType entries — gates derived from existing activeTool + selectedIds
metrics:
  duration: ~10min
  completed: 2026-05-14
  tasks: 4
  files-modified: 5
  tests-added: 28  # 19 unit + 2 e2e + 7 net new Sidebar.ia02 cases
  tests-passing: 27/27 (Phase 81+84 scope); 1035 passing in full repo (no Phase-84-induced regressions)
---

# Phase 84 Plan 01: Tool-Bound Sidebar Contextual Visibility (IA-08) Summary

One-liner: tool-bound left-sidebar contextual visibility — Wainscot + Framed Art + Custom Elements catalogs gate by `activeTool` + wall selection per D-02; Product Library auto-expands while product tool is active via a new `forceOpen` prop on PanelSection per D-04.

## What Shipped

### D-02 — Sidebar.tsx conditional mounting

`src/components/Sidebar.tsx` now derives two visibility booleans from `useUIStore` + `useCADStore`:

```ts
const customElementsVisible = activeTool === "select" || activeTool === "product";
const wallSurfaceVisible = activeTool === "select" && wallSelected;
```

Where `wallSelected` is derived from `selectedIds.length === 1 && !!walls[selectedIds[0]]` with the double-fallback guard `s.rooms[s.activeRoomId ?? ""]?.walls ?? {}` (Pitfall 2 from 84-RESEARCH.md — handles freshly-loaded, no-active-room state).

Three target PanelSections are wrapped in their conditional guards:

| Section | Mounted when |
|---------|--------------|
| `sidebar-custom-elements` | `customElementsVisible` |
| `sidebar-framed-art` | `wallSurfaceVisible` |
| `sidebar-wainscoting` | `wallSurfaceVisible` |

Full unmount, not CSS-hidden — the DOM presence is the contract. Catalog data survives because the underlying stores (`useCustomElements`, `useFramedArtStore`, `useWainscotStyleStore`) live module-level and persist to IDB; only ephemeral in-component create-form drafts are lost on unmount (acceptable per D-05).

### D-04 — PanelSection.forceOpen prop

`src/components/ui/PanelSection.tsx` gains an optional `forceOpen?: boolean` prop (default `false`). When `true`:

- `effectiveOpen = forceOpen || open` drives `aria-expanded`, chevron rotation, and the `AnimatePresence` guard.
- The persisted `open` state in `localStorage["ui:propertiesPanel:sections"]` is NEVER mutated by `forceOpen`. Clicks still write `open` so the user's most recent intent is preserved across force-on/off cycles.

Sidebar passes `forceOpen={activeTool === "product"}` to `sidebar-product-library` only. The other five panels are unaffected (additive prop with safe default).

### D-06 — Test sweep

The Phase 81 IA-02 contract test (`src/components/__tests__/Sidebar.ia02.test.tsx`) was split into two regimes:

1. **Default** (activeTool=select, no selection) — 4 unconditional sections asserted: rooms-tree, room-config, custom-elements, product-library. Framed-art + wainscoting asserted ABSENT.
2. **Wall-selected** (activeTool=select, wallId in selectedIds) — all 6 sections asserted present, including framed-art + wainscoting.

Audit (`grep -rn "sidebar-custom-elements|sidebar-framed-art|sidebar-wainscoting" tests/ e2e/ src/components/__tests__/`) confirmed no other test file makes stale unconditional-mount assumptions outside the new `tests/Sidebar.ia08.test.tsx` and the updated IA-02 test.

## Files Modified

| File | Change | Commit |
|------|--------|--------|
| `tests/Sidebar.ia08.test.tsx` | NEW — 19 RED→GREEN cases for D-02 + D-04 + D-05 sanity | `0243f88` (RED) / `808736e` (GREEN) |
| `tests/e2e/specs/sidebar-contextual-visibility.spec.ts` | NEW — 2 Playwright cases | `0243f88` |
| `src/components/ui/PanelSection.tsx` | Add `forceOpen?: boolean` prop + effectiveOpen render override | `ffe7f64` |
| `src/components/Sidebar.tsx` | Add gate booleans + conditional renders + forceOpen wiring | `808736e` |
| `src/components/__tests__/Sidebar.ia02.test.tsx` | Split into default + wall-selected regimes | `d24dea5` |

## Test Count Delta

- **New unit cases:** 19 (Sidebar.ia08.test.tsx) + net +5 in Sidebar.ia02.test.tsx (split into 9 from 4) — **+24 unit cases**.
- **New e2e cases:** 2 (sidebar-contextual-visibility.spec.ts).
- **Final state:** 27/27 GREEN across Phase 81 IA-02 + Phase 84 IA-08 scope.

## Verification

- `npx vitest run tests/Sidebar.ia08.test.tsx src/components/__tests__/Sidebar.ia02.test.tsx` — 27/27 GREEN.
- Full suite: 1035 tests passing, 11 todo. 2 pre-existing transform failures in `SaveIndicator.test.tsx` + `SidebarProductPicker.test.tsx` confirmed present on HEAD before Phase 84 changes (verified via `git stash` baseline test) — out of scope, logged in this summary's Deferred Issues block.
- Typecheck: clean (1 unrelated TS6.0 baseUrl deprecation warning, pre-existing).

## Deferred Issues (Out of Scope)

- `tests/SaveIndicator.test.tsx` + `tests/SidebarProductPicker.test.tsx` — both fail with `[vitest] No "createStore" export is defined on the "idb-keyval" mock` transform errors. Pre-existing, present on HEAD, unrelated to Phase 84. Should be tracked separately (suggest GH issue with `tech-debt` label).

## Deviations from Plan

**None.** Plan executed exactly as specified across all 4 tasks. RED→GREEN sequence held; additive prop semantics for `forceOpen` preserved existing PanelSection tests (10/10 Phase 72 cases pass unchanged); the D-06 test sweep audit returned only the expected `Sidebar.ia02.test.tsx` site.

## Manual Smoke Checklist (run before PR merge)

- [ ] Active tool = Select, no selection → Custom Elements visible; Wainscot + Framed Art hidden.
- [ ] Click a wall → all three target sections visible.
- [ ] Switch to Wall tool → all three sections disappear from DOM (selection wipes via setTool too).
- [ ] Switch to Product tool → Custom Elements visible AND Product Library auto-opens.
- [ ] Switch back to Select → Product Library returns to its persisted state (default collapsed).
- [ ] Add a custom element in Select tool → switch to Wall tool → switch back → element still present in catalog.

## Self-Check: PASSED

- [x] tests/Sidebar.ia08.test.tsx exists and is GREEN (19 cases).
- [x] tests/e2e/specs/sidebar-contextual-visibility.spec.ts exists.
- [x] src/components/ui/PanelSection.tsx has forceOpen prop (commit ffe7f64).
- [x] src/components/Sidebar.tsx wraps 3 target sections + passes forceOpen (commit 808736e).
- [x] src/components/__tests__/Sidebar.ia02.test.tsx split into 2 regimes, 9 cases GREEN.
- [x] All commits exist: 0243f88, ffe7f64, 808736e, d24dea5.

## Closes

GH #177 (closure target = phase PR merge).
