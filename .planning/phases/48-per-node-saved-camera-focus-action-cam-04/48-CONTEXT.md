---
phase: 48-per-node-saved-camera-focus-action-cam-04
type: context
created: 2026-04-26
status: ready-for-research
requirements: [CAM-04]
depends_on: [Phase 35 (presetTween easeInOutCubic + reduced-motion snap), Phase 46 (pendingCameraTarget bridge + focusDispatch)]
---

# Phase 48: Per-Node Saved Camera + Focus Action (CAM-04) — Context

## Goal

Each placed product / wall / ceiling / custom element can have a bookmarked camera angle saved on it. Double-click in the rooms tree jumps the camera there via the existing easeInOutCubic tween. Save is via a button in PropertiesPanel.

## Requirement Source

[REQUIREMENTS.md CAM-04](../../REQUIREMENTS.md). Source issue: [#79](https://github.com/micahbank2/room-cad-renderer/issues/79).

## Decisions

### D-01 — Save UI: PropertiesPanel button

A "Save camera here" button in PropertiesPanel for the currently-selected node (wall / product / ceiling / custom element). Click captures the live `THREE.Camera` `position` + `controls.target` and writes them to the node.

**Why PropertiesPanel:**
- The panel already shows per-selection actions and is contextual to the active selection
- Right-click context menu on the tree row would be a new UX pattern (no existing right-click menus in the app today)
- Right-click on a 3D mesh conflicts with browser default behavior and adds significant Three.js raycasting plumbing
- Centralizing the affordance in one well-known place reduces "where do I find this" friction for Jessica

**Rejected alternatives:**
- Right-click context menu on tree rows — new pattern, more complex hit-testing
- Right-click on canvas mesh — browser default conflict, raycasting work
- All-of-the-above — premature; ship PropertiesPanel only, add others later if desired

### D-02 — Focus trigger: tree double-click

Double-click on a tree row in `RoomsTreePanel` triggers Focus on that node. Single-click behavior (Phase 46 default focus computed from bbox) is unchanged. The two are layered:
- **Single-click** = select + default focus from bbox (Phase 46 behavior, untouched)
- **Double-click** = if node has `savedCameraPos` + `savedCameraTarget` → animate to that exact angle. If no saved camera → fall through to default focus (same as single-click).

**Why fall-through, not no-op:**
- A dead double-click would surprise users
- Single + double click both "focus" — double is just "the saved one if you bookmarked it"
- Discoverable: try double-clicking, get a focus; some nodes give a remembered angle, others give the default — natural reinforcement

### D-03 — Storage: cadStore (serialized in snapshots)

New optional fields on these CAD types in `src/types/cad.ts`:

```ts
interface WallSegment {
  // ...existing fields...
  savedCameraPos?: [number, number, number];
  savedCameraTarget?: [number, number, number];
}

interface PlacedProduct {
  // ...existing fields...
  savedCameraPos?: [number, number, number];
  savedCameraTarget?: [number, number, number];
}

interface Ceiling {
  // ...existing fields...
  savedCameraPos?: [number, number, number];
  savedCameraTarget?: [number, number, number];
}

interface PlacedCustomElement {
  // ...existing fields...
  savedCameraPos?: [number, number, number];
  savedCameraTarget?: [number, number, number];
}
```

Persists with the project — saves survive reload, project switch, save-as.

### D-04 — No-history setter pattern (mirrors Phase 25/31 precedent)

cadStore writes normally push snapshots to `past[]` for undo. Saved-camera writes must NOT pollute undo history (per acceptance). New noHistory action variants for each type:

```ts
setSavedCameraOnWallNoHistory: (wallId, pos, target) => void
setSavedCameraOnProductNoHistory: (productId, pos, target) => void
setSavedCameraOnCeilingNoHistory: (roomId, pos, target) => void
setSavedCameraOnCustomElementNoHistory: (placedId, pos, target) => void
```

A single `clearSavedCameraNoHistory(kind, id)` action removes a bookmark.

**Why per-kind setters (not a generic):**
- Matches Phase 25/31 `_NoHistory` pattern (where each type got its own setter)
- Type safety per shape — caller must pass the right id-kind pair
- No discriminated-union runtime branching at the action site

### D-05 — Autosave-debounce-only persistence

Saved-camera writes trigger autosave (Phase 28's debounced 2000ms save) but skip undo. This is the same contract as Phase 25/31 noHistory variants — the project file changes, but Ctrl+Z doesn't see this micro-mutation as an undoable step.

Phase 28's autosave triggers on cadStore mutations regardless of history. No new wiring needed.

### D-06 — Tween bridge: reuse Phase 46 `pendingCameraTarget`

Focus action drives `useUIStore.getState().requestCameraTarget(pos, target)` — the same Phase 46 bridge that powers tree click-to-focus. ThreeViewport's existing useEffect (Phase 46 plan 04) consumes it.

**Why pendingCameraTarget over pendingPresetRequest:**
- Phase 46 already wired pendingCameraTarget to easeInOutCubic + reduced-motion snap
- pendingPresetRequest is preset-id-shaped (eye-level / top-down / etc.) — not a free position+target
- Reuse means zero new tween code in Phase 48

### D-07 — Visual indicator: small lucide Camera icon on tree row

When a tree row's node has `savedCameraPos` set, render a small lucide `Camera` icon next to the eye-toggle, accent-tinted (`text-accent-light`). 14px (`w-3.5 h-3.5`) to match the eye glyph. No-op tooltip on hover ("Has saved camera angle"); the icon is informational, not interactive.

Group rows (walls / ceiling / products / custom) never show the icon — only leaf rows do.

**Why visual indicator:**
- Without it, saved cameras are invisible until a user discovers them via double-click
- Helps the user form a mental model of which nodes they've bookmarked
- Cheap — one conditional render per leaf row

### D-08 — Reduced-motion behavior inherited from Phase 46

Phase 46's `pendingCameraTarget` consumer in ThreeViewport already implements D-39 reduced-motion: when `prefers-reduced-motion: reduce` is active, camera snaps instead of animating. Phase 48 adds nothing — Focus action just calls `requestCameraTarget` and the existing useEffect handles the rest.

### D-09 — No-op safety: Save with no active 3D camera

If the user clicks "Save camera here" while in 2D-only viewMode (no 3D camera available), the button is disabled. Tooltip: "Switch to 3D view to save a camera angle."

The button is enabled only when:
- A wall / product / ceiling / custom element is selected (via `uiStore.selectedIds`)
- `viewMode === "3d" || viewMode === "split"`

### D-10 — Test-mode driver

Add `window.__driveSaveCamera(kind, id, pos, target)` and `window.__driveFocusNode(id)` to a new `src/test-utils/savedCameraDrivers.ts`. Gated by `import.meta.env.MODE === "test"`. Mirrors Phase 46/47 driver pattern.

### D-11 — UI labels and icons (lucide)

| Surface | Affordance | Icon (lucide) | Tooltip |
|---------|------------|---------------|---------|
| PropertiesPanel | Save camera | `Camera` | "Save current camera angle to this node" |
| PropertiesPanel | Clear saved camera (only when set) | `CameraOff` | "Remove saved camera angle" |
| Tree row | Indicator | `Camera` (14px, text-accent-light) | "Has saved camera angle" |

Active button styling matches the existing PropertiesPanel button pattern.

## Out of scope (do NOT do in Phase 48)

- Right-click context menus (canvas or tree) — single PropertiesPanel button only
- Multiple saved cameras per node — single bookmark slot
- Animated transitions for the SAVE action itself — instant write
- Camera preview / thumbnail of the saved angle — discoverable via Focus only
- Saved camera for room nodes — only leaves (wall / product / ceiling / custom)
- Migration / backfill — `savedCameraPos?` is optional; old projects load fine

## Files we expect to touch (estimate)

- `src/types/cad.ts` — add 4 optional field pairs
- `src/stores/cadStore.ts` — add 4 noHistory setter actions + 1 clear action
- `src/components/PropertiesPanel.tsx` — Save / Clear button per selection kind
- `src/components/RoomsTreePanel/TreeRow.tsx` — Camera icon when leaf node has saved camera
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` — wire onDoubleClick handler that dispatches Focus
- `src/test-utils/savedCameraDrivers.ts` — new file
- `src/main.tsx` — install drivers
- New tests:
  - `src/stores/__tests__/cadStore.savedCamera.test.ts` — 4 setters + clear, no-history contract
  - `src/components/__tests__/PropertiesPanel.savedCamera.test.tsx` — button renders, captures camera, calls action
  - `src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx` — Camera icon visibility, double-click dispatches Focus
  - `e2e/saved-camera-cycle.spec.ts` — Save → reload → Focus round-trip

Estimated 2 plans, 6-8 tasks. About the same size as Phase 47.

## Open questions for research phase

1. Confirm `OrbitControls` exposes the `target` Vector3 in a way React Three Fiber components can read (vs `useThree().camera`).
2. Confirm Phase 46's `requestCameraTarget(pos, target)` signature matches what we need for arbitrary saved positions (not just bbox-derived ones).
3. Confirm `lucide-react` exports `Camera` and `CameraOff` icons in the installed version.
