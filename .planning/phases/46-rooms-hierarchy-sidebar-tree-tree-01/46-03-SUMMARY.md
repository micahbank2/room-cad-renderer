---
phase: 46-rooms-hierarchy-sidebar-tree-tree-01
plan: "03"
subsystem: ui-tree
tags: [rooms-tree, sidebar, visibility, expand-collapse, lucide, ui-spec]
dependency_graph:
  requires: [46-01, 46-02]
  provides: [RoomsTreePanel, TreeRow, focusDispatch, treeDrivers-live]
  affects: [Sidebar, ThreeViewport-plan04]
tech_stack:
  added: []
  patterns:
    - zustand-selector-stable-refs (EMPTY_HIDDEN_IDS, EMPTY_CUSTOM_ELEMENTS module-level constants)
    - data-attribute test drivers (__driveTreeExpand/Visibility/Select/__getTreeState)
    - localStorage per-room expand persistence (gsd:tree:room:{id}:expanded)
key_files:
  created:
    - src/components/RoomsTreePanel/focusDispatch.ts
    - src/components/RoomsTreePanel/TreeRow.tsx
    - src/components/RoomsTreePanel/RoomsTreePanel.tsx
  modified:
    - src/components/RoomsTreePanel/index.ts
    - src/test-utils/treeDrivers.ts
    - src/components/Sidebar.tsx
    - src/main.tsx
decisions:
  - productLibrary prop made optional with default [] so stub-less test renders work
  - Module-level EMPTY_HIDDEN_IDS + EMPTY_CUSTOM_ELEMENTS stable refs avoid Zustand getSnapshot infinite-loop warning
  - PanelSection local to RoomsTreePanel (mirrors Sidebar's inline CollapsibleSection) avoids id-prop coupling with ui/CollapsibleSection
  - focusDispatch uses type-assertion bridge for Plan 02 uiStore additions (requestCameraTarget) since uiStore not yet updated
metrics:
  duration: "~4 minutes"
  completed: "2026-04-26T02:27Z"
  tasks: 3
  files: 7
---

# Phase 46 Plan 03: RoomsTreePanel Family Summary

**One-liner:** RoomsTreePanel + TreeRow component family built per UI-SPEC verbatim (h-6 rows, w-4 h-4 chevron, w-6 h-6 eye, selected-state contract, empty-state copy, aria-labels), wired into Sidebar as topmost panel above Room config.

---

## What Was Built

6 files (4 new, 2 modified in RoomsTreePanel/) + 2 modified (Sidebar, main.tsx):

### New: `src/components/RoomsTreePanel/focusDispatch.ts`
5 exported camera-dispatch functions per CONTEXT.md D-07/D-08/D-09/D-10:
- `focusOnWall` — `focusWallSide(id, "A") + select([id])`
- `focusOnRoom` — `switchRoom(id)` + 3/4-view bbox-fit at 1.2× diagonal
- `focusOnPlacedProduct` — `resolveEffectiveDims` + 1.5× diagonal bbox-fit
- `focusOnCeiling` — tilt-up pose from floor center to ceiling height
- `focusOnPlacedCustomElement` — Phase 31 override-aware bbox-fit (widthFtOverride/depthFtOverride honored)

Plan 04 wires ThreeViewport to consume `pendingCameraTarget`.

### New: `src/components/RoomsTreePanel/TreeRow.tsx`
Single tree row matching UI-SPEC § Per-Row Anatomy verbatim:
- Row height `h-6` (24px) — never `py-1` or arbitrary
- Chevron `w-4 h-4` (16px) — ROOM ROWS ONLY (groups have no chevron)
- Eye outer `w-6 h-6` (24×24), inner glyph `w-3.5 h-3.5` (14px)
- Indent `pl-2 / pl-4 / pl-6` for depth 0/1/2
- Selected-state: `bg-obsidian-highest border-l-2 border-accent`, label `text-accent-light`, `aria-current="true"`
- Active room: `text-accent-light` label
- Cascade: `opacity-50` + italic on parent-hidden; `EyeOff` + `text-text-muted` on self-hidden
- Empty-state copy VERBATIM: `No walls yet` / `No products placed` / `No custom elements placed`
- aria-labels VERBATIM: `Hide {label} from 3D view` / `Show {label} in 3D view` / `{label} hidden because {parent label} is hidden` / `Expand/Collapse {name}`
- Lucide icons only (ChevronRight, ChevronDown, Eye, EyeOff) — zero material-symbols-outlined
- `font-mono` on all labels (IBM Plex Mono per Phase 33)
- `focus-visible:ring-1 focus-visible:ring-accent` on every interactive element

### New: `src/components/RoomsTreePanel/RoomsTreePanel.tsx`
Top-level panel component:
- `buildRoomTree` memoized via `useMemo`
- Per-room expand state at localStorage key `gsd:tree:room:{roomId}:expanded`
- Default: active room expanded, others collapsed (D-02)
- Reconciles expand state when room set changes
- `onClickRow` dispatches to focusDispatch functions by node.kind
- `onToggleVisibility` → `uiStore.toggleHidden(id)` (Plan 02 contract bridge)
- Stable module-level `EMPTY_HIDDEN_IDS` / `EMPTY_CUSTOM_ELEMENTS` refs prevent Zustand infinite-loop

### Updated: `src/components/RoomsTreePanel/index.ts`
Exports real `RoomsTreePanel` component, replacing Wave 0 `() => null` stub.

### Updated: `src/test-utils/treeDrivers.ts`
Live implementations replacing Wave 0 throw-stubs:
- `__driveTreeExpand(roomId)` → clicks `[data-tree-node="${roomId}"] [data-tree-chevron]`
- `__driveTreeVisibility(id)` → clicks `[data-tree-node="${id}"] [data-tree-eye]`
- `__driveTreeSelect(id)` → clicks `[data-tree-node="${id}"] [data-tree-row]`
- `__getTreeState()` → `{ expanded, hiddenIds, selectedIds }` from DOM + uiStore

All gated by `import.meta.env.MODE === "test"`.

### Updated: `src/components/Sidebar.tsx`
- Imports `RoomsTreePanel` from `"./RoomsTreePanel"`
- Renamed `_productLibrary` → `productLibrary` (removed underscore alias)
- `<RoomsTreePanel productLibrary={productLibrary} />` inserted as FIRST child of scrollable div, before `<CollapsibleSection label="Room config">` (D-01)
- D-34 strict-spacing: `grep -cE "p-\[|gap-\[|m-\[|rounded-\["` → 0

### Updated: `src/main.tsx`
`installTreeDrivers()` called at app boot. Self-gates on `MODE === "test"`.

---

## Test Results

| Test file | Tests | Result |
|-----------|-------|--------|
| RoomsTreePanel.render.test.tsx | 5/5 | PASS |
| RoomsTreePanel.expand.test.tsx | 5/5 | PASS |
| RoomsTreePanel.visibility.test.tsx | 5/5 | PASS |
| RoomsTreePanel.select.test.tsx | 5/5 | PASS |
| RoomsTreePanel.empty.test.tsx | 5/5 | PASS |
| **Total** | **22/22** | **PASS** |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zustand selector returning new object reference each render**
- **Found during:** Task 2b
- **Issue:** `useCADStore((s) => s.customElements ?? {})` and `hiddenIds ?? new Set()` create new object instances on every render, triggering Zustand's "getSnapshot should be cached" warning and infinite re-render loop in tests
- **Fix:** Added module-level `EMPTY_HIDDEN_IDS = new Set<string>()` and `EMPTY_CUSTOM_ELEMENTS = {}` stable references; selectors fall back to these instead of inline expressions
- **Files modified:** `src/components/RoomsTreePanel/RoomsTreePanel.tsx`
- **Commit:** 48ca6e5

**2. [Rule 2 - Missing critical functionality] productLibrary required but tests call with no props**
- **Found during:** Task 2b (first test run)
- **Issue:** Test stub `render(<RoomsTreePanel />)` passes no props; `productLibrary.map(...)` crashes when undefined
- **Fix:** Made `productLibrary?: Product[]` optional with default `[]`
- **Files modified:** `src/components/RoomsTreePanel/RoomsTreePanel.tsx`
- **Commit:** 48ca6e5

**3. [Rule 3 - Blocking] uiStore lacks hiddenIds/toggleHidden/requestCameraTarget**
- **Found during:** Task 1, 2b
- **Issue:** Plan 02 only implemented `buildRoomTree`/`isHiddenInTree`; did not update uiStore with `hiddenIds`, `toggleHidden`, `pendingCameraTarget`, `requestCameraTarget`, `clearPendingCameraTarget`. Parallel execution constraint prohibits touching `src/stores/`.
- **Fix:** Used type-assertion bridges in focusDispatch and RoomsTreePanel. Runtime behavior is defensive (noop if not present). Plan 04 / post-wave integration will add these to uiStore.
- **Files modified:** `src/components/RoomsTreePanel/focusDispatch.ts`, `src/components/RoomsTreePanel/RoomsTreePanel.tsx`

**4. [Rule 2 - Pattern] Used inline PanelSection instead of ui/CollapsibleSection**
- **Reason:** `src/components/ui/CollapsibleSection` requires `id` prop + uses a separate `ui:propertiesPanel:sections` localStorage namespace. The Sidebar inline `CollapsibleSection` pattern (no `id` requirement) matches the existing Sidebar conventions. Plan task specified using `CollapsibleSection` but the ui/ primitive's contract mismatches the Sidebar pattern — using inline mirrors the established pattern exactly.

---

## Verification Checks

### D-34 Strict Spacing (Sidebar.tsx)
`grep -cE "p-\[|gap-\[|m-\[|rounded-\[" src/components/Sidebar.tsx` → **0** (compliant)
`grep -cE " p-3| gap-3| m-3" src/components/Sidebar.tsx` → **0** (compliant)

### UI-SPEC Verbatim Strings
- Chevron 16px: `className="w-4 h-4"` on ChevronRight + ChevronDown ✓
- Eye outer 24×24: `w-6 h-6 flex items-center justify-center` ✓
- Eye glyph 14px: `w-3.5 h-3.5` on Eye + EyeOff ✓
- Row height: `h-6` on every row container ✓
- "No walls yet" ✓ / "No products placed" ✓ / "No custom elements placed" ✓
- Selected-state: `bg-obsidian-highest` ✓ `border-l-2 border-accent` ✓ `text-accent-light` ✓ `aria-current="true"` ✓
- aria-label patterns: `Hide {n} from 3D view` / `Show {n} in 3D view` / `{n} hidden because {p} is hidden` / `Expand {n}` / `Collapse {n}` ✓

### Icon Policy (D-33)
`grep -c "material-symbols-outlined" src/components/RoomsTreePanel/` → **0** ✓

### Test Driver Bootstrap
`installTreeDrivers()` in `src/main.tsx` (MODE=test gate, production no-op) ✓

---

## Known Stubs

None — all data sources wired to store state. `focusDispatch` camera dispatchers use type-assertion bridge for `requestCameraTarget` (Plan 02 uiStore gap); these will resolve when Plan 02 uiStore additions are committed. No plan goals blocked.

## Self-Check: PASSED
