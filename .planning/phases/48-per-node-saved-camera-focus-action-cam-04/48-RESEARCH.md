# Phase 48: Per-Node Saved Camera + Focus Action (CAM-04) — Research

**Researched:** 2026-04-25
**Domain:** Three.js / R3F camera state capture, cadStore mutation patterns, React tree event handling
**Confidence:** HIGH

---

## Summary

Phase 48 adds a single bookmarked camera angle per CAD node (wall / product / ceiling / custom element). All 11 decisions in CONTEXT.md are well-grounded in codebase precedent. The implementation requires: (1) four optional `[number, number, number]` field pairs added to cad.ts types, (2) five `NoHistory` store actions mirroring Phase 25/31 patterns verbatim, (3) Save / Clear buttons in PropertiesPanel reading live camera state from `orbitControlsRef`, (4) a `Camera` icon indicator on leaf TreeRows, (5) a new `onDoubleClick` prop on TreeRow wired via `RoomsTreePanel.tsx`, and (6) a new `focusOnSavedCamera()` helper in `focusDispatch.ts` that calls the existing `requestCameraTarget` bridge unchanged. No new tween code, no new store bridge fields.

**Primary recommendation:** Implement in 2 plans — Plan A (types + store + focusDispatch) and Plan B (PropertiesPanel + TreeRow + TreePanel + drivers) — matching the 2-plan estimate in CONTEXT.md.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Save UI is PropertiesPanel button only (not right-click context menu or canvas click).
- D-02: Double-click tree row triggers Focus; single-click behavior (Phase 46 bbox focus) is unchanged. Fall-through when no saved camera (same result as single-click).
- D-03: Storage is cadStore optional fields serialized in CADSnapshot (project survive reload + project switch).
- D-04: `NoHistory` setter pattern — 4 per-kind setters + 1 clear action. Does NOT call `pushHistory(s)`.
- D-05: Autosave-debounce-only (Phase 28). No new wiring needed.
- D-06: Tween bridge reuses Phase 46 `requestCameraTarget(pos, target)` unchanged.
- D-07: Visual indicator is a 14px `Camera` lucide icon next to eye-toggle on leaf rows only. Group rows: never show it.
- D-08: Reduced-motion inherited from Phase 46 pendingCameraTarget consumer in ThreeViewport. No new code.
- D-09: Save button disabled when viewMode is "2d" (no 3D camera). Enabled only in "3d" | "split".
- D-10: Test-mode driver `window.__driveSaveCamera` + `window.__driveFocusNode` in new `src/test-utils/savedCameraDrivers.ts`.
- D-11: Icons — `Camera` for Save + tree indicator; `CameraOff` for Clear.

### Claude's Discretion
None listed in CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)
- Right-click context menus (canvas or tree)
- Multiple saved cameras per node
- Animated transitions for the Save action itself
- Camera preview / thumbnail of the saved angle
- Saved camera for room-level nodes
- Migration / backfill of old snapshots
</user_constraints>

---

## Focus Area Findings (cite file:line for each)

### 1. OrbitControls target access

**Pattern confirmed.** `ThreeViewport.tsx` holds `orbitControlsRef = useRef<any>(null)` at line 103. The ref is attached to `<OrbitControls ref={orbitControlsRef} />`. Access from inside R3F component:

```typescript
// ThreeViewport.tsx:103 — existing ref
const orbitControlsRef = useRef<any>(null);

// Reading live pose (ThreeViewport.tsx:164-169 — __getCameraPose driver shows the pattern):
const ctrl = orbitControlsRef.current;
if (!ctrl?.object) return null;
const cam = ctrl.object as THREE.Camera;
const pos: [number,number,number] = [cam.position.x, cam.position.y, cam.position.z];
const tgt: [number,number,number] = [ctrl.target.x, ctrl.target.y, ctrl.target.z];
```

**Problem for Phase 48:** The Save button lives in `PropertiesPanel.tsx`, which is outside the R3F `<Canvas>` component. `useThree()` is only valid inside the Canvas. The `orbitControlsRef` is a module-local ref inside `ThreeViewport.tsx`'s `Scene` function.

**Solution (HIGH confidence):** Expose the ref via a test-driver-style window object already exists as `window.__getCameraPose()` (ThreeViewport.tsx:157-174). Phase 48 should NOT use the window bridge for production code. Instead, there are two clean paths:

- **Path A (recommended):** Add a new `useUIStore` getter `getCameraCapture: (() => {pos, target} | null) | null` that ThreeViewport installs on mount (same pattern as the existing `requestCameraTarget` action). PropertiesPanel calls `useUIStore.getState().getCameraCapture?.()`.
- **Path B:** The `window.__getCameraPose()` function installed by ThreeViewport in test mode (lines 156-175) reads from `orbitControlsRef`. In production, expose a stable ref via a React context. However, this is heavier.

**Recommendation: Path A** — mirror Phase 46's `requestCameraTarget` pattern in reverse. Install a `getCameraCapture` getter in uiStore (no initial value, ThreeViewport writes it on mount). PropertiesPanel reads it. This is the simplest zero-new-context solution. Matches Phase 46's unidirectional bridge convention.

**Confidence:** HIGH — the orbitControlsRef pattern is confirmed at ThreeViewport.tsx:103, 116, 164, 200, 321, 326.

---

### 2. PropertiesPanel button injection — selection kind detection

**File:** `src/components/PropertiesPanel.tsx`

Selection kind is determined by checking which entity matches the first `selectedIds[0]` against four dictionaries (lines 96-101):

```typescript
// PropertiesPanel.tsx:96-101
const id = selectedIds[0];
const wall = id ? walls[id] : undefined;
const pp = id ? placedProducts[id] : undefined;
const ceiling = id ? ceilings[id] : undefined;
const pce = id ? placedCustoms[id] : undefined;
```

Each kind renders in its own conditional block:
- `{ceiling && (...)}` — lines 181-194
- `{wall && (...)}` — lines 196-245
- `{pp && (...)}` — lines 247-327 (IIFE pattern)
- `{pce && ce && (...)}` — lines 329-376

**Save / Clear buttons slot in** at the bottom of each kind-block, before the existing `Delete element` button (line 389-394). The Clear button appears only when the kind's `savedCameraPos !== undefined`.

**D-09 gate:** PropertiesPanel does not currently receive `viewMode`. Two options:
1. Pass `viewMode` as a prop from `App.tsx` (currently props are only `productLibrary`).
2. Read `viewMode` from a local useState in App context — but PropertiesPanel is not in a context.

**Recommended:** Add `viewMode: "2d" | "3d" | "split" | "library"` as a prop to PropertiesPanel. App.tsx already has `viewMode` as local state (App.tsx:45) and renders PropertiesPanel at lines 355 and 375. Pass `viewMode={viewMode}` at both sites. This is minimal and type-safe.

**Confidence:** HIGH — code confirmed at PropertiesPanel.tsx:96-101, 181, 196, 247, 329, 389.

---

### 3. `_NoHistory` setter precedent

**Canonical pattern** (confirmed from multiple sites):

```typescript
// cadStore.ts:237-245 — updateWallNoHistory (simplest example)
updateWallNoHistory: (id, changes) =>
  set(
    produce((s: CADState) => {
      const doc = activeDoc(s);
      if (!doc) return;
      if (!doc.walls[id]) return;
      Object.assign(doc.walls[id], changes);  // NO pushHistory(s) call
    })
  ),
```

```typescript
// cadStore.ts:779-786 — updatePlacedCustomElementNoHistory (closest analog for Phase 48)
updatePlacedCustomElementNoHistory: (id, changes) =>
  set(
    produce((s: CADState) => {
      const doc = activeDoc(s);
      if (!doc?.placedCustomElements?.[id]) return;
      Object.assign(doc.placedCustomElements[id], changes);
    })
  ),
```

**Phase 48 action signatures** (D-04):
```typescript
setSavedCameraOnWallNoHistory: (wallId: string, pos: [number,number,number], target: [number,number,number]) => void
setSavedCameraOnProductNoHistory: (productId: string, pos: [number,number,number], target: [number,number,number]) => void
setSavedCameraOnCeilingNoHistory: (roomId: string, pos: [number,number,number], target: [number,number,number]) => void
setSavedCameraOnCustomElementNoHistory: (placedId: string, pos: [number,number,number], target: [number,number,number]) => void
clearSavedCameraNoHistory: (kind: "wall" | "product" | "ceiling" | "custom", id: string) => void
```

**Each action bodies the same three rules:**
1. `activeDoc(s)` guard — early return if no active room
2. Entity lookup guard — early return if id not found
3. Direct field write via immer draft — NO `pushHistory(s)` call

**Autosave compatibility:** Phase 28 autosave fires on any cadStore `set()` call via Zustand subscription. `NoHistory` variants still call `set(produce(...))`, so autosave triggers. Confirmed pattern at cadStore.ts:779-786 — `updatePlacedCustomElementNoHistory` already used in Phase 31 with no autosave breakage reported.

**Confidence:** HIGH — pattern confirmed at cadStore.ts:237-245, 261-273, 357-364, 401-412, 426-436, 493-502, 626-636, 738-754, 757-776, 779-786, 800-808, 1046-1053.

---

### 4. Tree double-click handler

**Current state:** `TreeRow.tsx` has a single `onClick` on the row div (line 120-125) and a separate `onClick` on the label button (lines 156-163) that explicitly does NOT stop propagation for leaf rows (bubbles to row div). The `onClickRow` prop (line 21) is the only click callback.

**React onDoubleClick behavior:** React fires `onClick` twice before `onDoubleClick` fires. This is correct for Phase 48 — single-click selects (Phase 46 behavior unchanged), then the double-click fires Focus-with-saved-camera as an additional action.

**Adding double-click:**

1. Add `onDoubleClickRow?: (node: TreeNode) => void` to `TreeRowProps` interface (TreeRow.tsx:9-23).
2. Add `onDoubleClick` to the row container div (line 117):

```typescript
onDoubleClick={() => {
  if (isGroup) return;
  props.onDoubleClickRow?.(node);
}}
```

3. Also add to the recursive `<TreeRow>` calls in the children block (lines 186-203).
4. Wire a new `onDoubleClickRow` handler in `RoomsTreePanel.tsx` (after `onClickRow` at line 183). The handler reads saved camera fields from the node's backing entity. If found, calls `requestCameraTarget(pos, target)`. If not, calls the same focus dispatch as single-click (fall-through per D-02).

**Timing note:** `onClick` fires twice before `onDoubleClick`. This means single-click side effects (select + bbox focus) fire twice before the saved-camera focus fires. The duplicate `requestCameraTarget` calls from two single-clicks are harmless — each increments `seq`, but only one tween starts (the double-click's).

**Confidence:** HIGH — TreeRow event structure confirmed at TreeRow.tsx:114-183.

---

### 5. Camera icon rendering on TreeRow — leaf-only condition

**Current eye-icon site:** TreeRow.tsx:167-182. The eye button renders for every row (room, group, and leaf nodes). However, the Camera indicator should render for **leaf nodes only** (D-07).

Leaf nodes are depth-2 rows where `node.kind` is "wall" | "product" | "ceiling" | "custom". Group rows are `node.kind === "group"` (depth 1). Room rows are `node.kind === "room"` (depth 0).

**Condition:**
```typescript
const isLeaf = !isRoom && !isGroup; // kind is "wall" | "product" | "ceiling" | "custom"
const hasSavedCamera = /* resolved from node data */ !!savedCameraPos;
```

**Position:** Render the Camera icon between the label button and the eye button (insert before line 167). 14px (`w-3.5 h-3.5`), `text-accent-light`, no click handler (informational only), `title="Has saved camera angle"`.

**Problem:** `TreeRow` does not currently receive the CAD entity data — only `node: TreeNode` which has `id`, `kind`, `label`, `roomId`. The `savedCameraPos` field is on the backing entity in cadStore.

**Solution options:**
- **Option A (recommended):** Pass `hasSavedCamera?: boolean` as a prop to TreeRow, computed by `RoomsTreePanel.tsx` from the current store state. RoomsTreePanel already reads `rooms` from cadStore (line 94) and has access to all entity maps.
- **Option B:** Have TreeRow subscribe to cadStore directly. Not recommended — breaks the data-flow pattern (TreeRow currently has no store dependencies).

**Recommended:** Option A. `RoomsTreePanel.tsx` computes a `savedCameraSet: Set<string>` containing all node IDs with `savedCameraPos !== undefined` across all rooms. Pass it down alongside `hiddenIds`. TreeRow receives `savedCameraNodeIds: Set<string>` and checks `savedCameraNodeIds.has(node.id) && isLeaf`.

**Confidence:** HIGH — TreeRow.tsx structure confirmed lines 1-215.

---

### 6. lucide `Camera` / `CameraOff` existence

**Confirmed:** lucide-react v1.8.0 (installed, `package.json` in repo). Both `Camera` and `CameraOff` are exported.

```bash
node -e "const {Camera, CameraOff} = require('./node_modules/lucide-react/dist/cjs/lucide-react.js'); console.log(typeof Camera, typeof CameraOff)"
# object object
```

**Confidence:** HIGH — runtime verified.

---

### 7. `focusDispatch` reuse — new `focusOnSavedCamera` helper

**Current `requestCameraTarget` call site pattern** (focusDispatch.ts:16-32):

```typescript
function requestCameraTarget(
  position: [number, number, number],
  target: [number, number, number],
): void {
  const state = store.getState() as ... & { requestCameraTarget?: fn };
  if (typeof state.requestCameraTarget === "function") {
    state.requestCameraTarget(position, target);
  }
}
```

**Phase 48 addition** — new exported function in `focusDispatch.ts`:

```typescript
/**
 * Phase 48 D-06: Focus camera on a node's saved camera angle.
 * Falls through to the provided fallback when savedCameraPos is absent.
 */
export function focusOnSavedCamera(
  savedPos: [number,number,number] | undefined,
  savedTarget: [number,number,number] | undefined,
  fallback: () => void,
): void {
  if (savedPos && savedTarget) {
    requestCameraTarget(savedPos, savedTarget);
  } else {
    fallback();
  }
}
```

The `fallback` is the same dispatch call that `onClickRow` already uses (wall → `focusOnWall`, product → `focusOnPlacedProduct`, etc.). The double-click handler in RoomsTreePanel computes `fallback` by inlining the same switch logic as `onClickRow`.

**No changes to ThreeViewport or uiStore.** The existing `requestCameraTarget` action (uiStore.ts:253-259) and its `pendingCameraTarget` consumer useEffect (ThreeViewport.tsx:315-353) already handle arbitrary `[number,number,number]` positions — confirmed by reading the implementation: `position` and `target` are plain tuples with no preset-ID dependency.

**Confidence:** HIGH — focusDispatch.ts:16-32 and uiStore.ts:253-259 confirmed.

---

### 8. Snapshot version migration — loading missing fields

**`loadSnapshot`** (cadStore.ts:876-888) calls `migrateSnapshot(raw)` then assigns fields directly from the migrated snapshot into the store. There is no field-by-field validation — it does a structural clone of `snap.rooms`.

**Forward-compatibility:** Adding `savedCameraPos?: [number,number,number]` and `savedCameraTarget?: [number,number,number]` as optional fields to `WallSegment`, `PlacedProduct`, `Ceiling`, and `PlacedCustomElement` requires no migration code. When an old project loads, the fields are simply `undefined`, which TypeScript optional fields handle cleanly. When a new project saves, the fields are serialized only when set.

**Undo/redo:** The `snapshot()` function (cadStore.ts:122-148) uses `structuredClone(toPlain(state.rooms))` — this clones all fields including `savedCameraPos` transparently. No changes needed.

**Confirmed precedent:** Phase 42 added `scaleFt?: number` to `Ceiling` (cad.ts:151-157) with the comment "Optional: existing snapshots that pre-date the BUG-01 fix have no value here and fall through to the catalog default". Phase 48 follows the identical pattern.

**Confidence:** HIGH — cadStore.ts:876-888, cad.ts:151-157 confirmed.

---

### 9. Test-mode driver pattern

**Canonical `installXDrivers()` shape** from Phase 46 (treeDrivers.ts:20-64) and Phase 47 (displayModeDrivers.ts:16-27):

```typescript
// src/test-utils/savedCameraDrivers.ts
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";

declare global {
  interface Window {
    __driveSaveCamera?: (
      kind: "wall" | "product" | "ceiling" | "custom",
      id: string,
      pos: [number,number,number],
      target: [number,number,number],
    ) => void;
    __driveFocusNode?: (id: string) => void;
    __getSavedCamera?: (
      kind: "wall" | "product" | "ceiling" | "custom",
      id: string,
    ) => { pos: [number,number,number]; target: [number,number,number] } | null;
  }
}

export function installSavedCameraDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__driveSaveCamera = (kind, id, pos, target) => {
    const store = useCADStore.getState();
    switch (kind) {
      case "wall": store.setSavedCameraOnWallNoHistory(id, pos, target); break;
      case "product": store.setSavedCameraOnProductNoHistory(id, pos, target); break;
      case "ceiling": store.setSavedCameraOnCeilingNoHistory(id, pos, target); break;
      case "custom": store.setSavedCameraOnCustomElementNoHistory(id, pos, target); break;
    }
  };

  window.__driveFocusNode = (id) => {
    const el = document.querySelector(
      `[data-tree-node="${id}"] [data-tree-row]`,
    ) as HTMLElement | null;
    // Simulate double-click: one dblclick event is enough (React's onDoubleClick)
    el?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  };

  window.__getSavedCamera = (kind, id) => {
    const state = useCADStore.getState();
    const doc = state.activeRoomId ? state.rooms[state.activeRoomId] : undefined;
    if (!doc) return null;
    let entity: { savedCameraPos?: [number,number,number]; savedCameraTarget?: [number,number,number] } | undefined;
    if (kind === "wall") entity = doc.walls[id];
    else if (kind === "product") entity = doc.placedProducts[id];
    else if (kind === "ceiling") entity = (doc.ceilings ?? {})[id];
    else if (kind === "custom") entity = (doc.placedCustomElements ?? {})[id];
    if (!entity?.savedCameraPos || !entity?.savedCameraTarget) return null;
    return { pos: entity.savedCameraPos, target: entity.savedCameraTarget };
  };
}

export {};
```

**Install site:** `src/main.tsx` — add two lines mirroring the Phase 46/47 pattern (lines 6-12):
```typescript
import { installSavedCameraDrivers } from "./test-utils/savedCameraDrivers";
installSavedCameraDrivers();
```

**Confidence:** HIGH — pattern confirmed at main.tsx:6-12, treeDrivers.ts:20-64, displayModeDrivers.ts:16-27.

---

### 10. e2e seed shape for Save → reload → Focus round-trip

**Minimum state needed:**
1. One room with one placed product (simplest leaf node with a stable ID).
2. A known camera pose set programmatically via `window.__setTestCamera({ position, target })` (already installed by ThreeViewport at test mode lines 108-124).
3. Call `window.__driveSaveCamera("product", ppId, pos, target)` to write the bookmark.
4. Call `window.__getCameraPose()` to read back current pose for comparison.
5. Reload the page — the project auto-restores via Phase 28 auto-save (2000ms debounce; tests should either wait or call save directly via serialization).
6. After reload, call `window.__driveFocusNode(ppId)` (double-click dispatch).
7. Wait for tween (600ms) or reduced-motion snap.
8. Assert `window.__getCameraPose()` matches the saved tuple (within float tolerance).

**Seed approach:** Mirror Phase 46 e2e pattern — use `window.__driveSaveCamera` to bypass UI (no need to render PropertiesPanel in e2e). The Save → reload path tests serialization. The double-click path tests the dispatch.

**Key e2e file:** `e2e/saved-camera-cycle.spec.ts` (new). No existing e2e file to mirror directly, but Phase 46's `e2e/tree-visibility.spec.ts` (if it exists) gives the template.

**Confidence:** MEDIUM — e2e infrastructure exists (Playwright config confirmed in Phase 46/47 CONTEXT references) but e2e folder not directly verified in this research pass.

---

## Standard Stack

### Core (no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | 1.8.0 | Camera + CameraOff icons | Installed; both icons confirmed |
| zustand + immer | 5.0.12 + 11.1.4 | cadStore NoHistory actions | Existing pattern; no change |
| @react-three/fiber | 8.17.14 | R3F Canvas / useFrame | Existing 3D renderer |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
  types/
    cad.ts                   → add 4 optional field pairs (8 lines)
  stores/
    cadStore.ts              → 5 new NoHistory actions + interface entries
  components/
    PropertiesPanel.tsx      → Save/Clear button cluster per kind; viewMode prop
    RoomsTreePanel/
      TreeRow.tsx            → Camera icon (conditional on leaf + hasSavedCamera prop)
      RoomsTreePanel.tsx     → savedCameraSet computation; onDoubleClickRow wiring
      focusDispatch.ts       → new focusOnSavedCamera() export
  test-utils/
    savedCameraDrivers.ts    → new file (installSavedCameraDrivers)
  main.tsx                   → installSavedCameraDrivers() call
```

### Pattern 1: NoHistory action (exact cadStore template)

```typescript
// cadStore.ts — add to interface CADState:
setSavedCameraOnWallNoHistory: (wallId: string, pos: [number,number,number], target: [number,number,number]) => void;

// cadStore.ts — implementation:
setSavedCameraOnWallNoHistory: (wallId, pos, target) =>
  set(
    produce((s: CADState) => {
      const doc = activeDoc(s);
      if (!doc) return;
      if (!doc.walls[wallId]) return;
      // NOTE: No pushHistory(s) — intentional bypass per D-04.
      doc.walls[wallId].savedCameraPos = pos;
      doc.walls[wallId].savedCameraTarget = target;
    })
  ),
```

Pattern repeats for product (→ `doc.placedProducts[id]`), ceiling (→ `(doc.ceilings ?? {})[id]`), custom (→ `(doc.placedCustomElements ?? {})[id]`).

`clearSavedCameraNoHistory` uses a `switch(kind)` to dispatch to the right entity and sets both fields to `undefined`.

### Pattern 2: PropertiesPanel getCameraCapture bridge

The `getCameraCapture` getter installed by ThreeViewport on uiStore avoids cross-component ref passing:

```typescript
// uiStore.ts — add to UIState interface:
getCameraCapture: (() => { pos: [number,number,number]; target: [number,number,number] } | null) | null;
installCameraCapture: (fn: (() => { pos: [number,number,number]; target: [number,number,number] } | null)) => void;
clearCameraCapture: () => void;

// uiStore initial state:
getCameraCapture: null,

// ThreeViewport.tsx — in Scene() useEffect on mount:
useEffect(() => {
  useUIStore.getState().installCameraCapture(() => {
    const ctrl = orbitControlsRef.current;
    if (!ctrl?.object) return null;
    const cam = ctrl.object as THREE.Camera;
    return {
      pos: [cam.position.x, cam.position.y, cam.position.z],
      target: [ctrl.target.x, ctrl.target.y, ctrl.target.z],
    };
  });
  return () => useUIStore.getState().clearCameraCapture();
}, []);

// PropertiesPanel.tsx — Save button onClick:
const capture = useUIStore.getState().getCameraCapture?.();
if (capture) {
  useCADStore.getState().setSavedCameraOnWallNoHistory(wall.id, capture.pos, capture.target);
}
```

### Pattern 3: TreeRow double-click (additive prop)

```typescript
// TreeRow.tsx — add to TreeRowProps:
onDoubleClickRow?: (node: TreeNode) => void;
savedCameraNodeIds: Set<string>;

// TreeRow.tsx — row div:
onDoubleClick={() => {
  if (isGroup) return;
  props.onDoubleClickRow?.(node);
}}

// TreeRow.tsx — Camera icon (between label and eye-toggle):
{isLeaf && savedCameraNodeIds.has(node.id) && (
  <span
    title="Has saved camera angle"
    aria-hidden="true"
    className="text-accent-light"
  >
    <Camera className="w-3.5 h-3.5" />
  </span>
)}
```

### Anti-Patterns to Avoid

- **Using `useThree()` in PropertiesPanel:** `useThree()` only works inside R3F Canvas. PropertiesPanel is outside the Canvas subtree. Use the uiStore `getCameraCapture` bridge instead.
- **Calling `pushHistory()` in saved-camera setters:** D-04 explicitly prohibits it. Check every new action has no `pushHistory(s)` call.
- **Showing Camera icon on group or room rows:** D-07 is leaf-only. Check `!isRoom && !isGroup` before rendering.
- **Reading `window.__getCameraPose` in production code:** That driver is test-mode gated. Use the `getCameraCapture` bridge for production.
- **Forgetting to pass `savedCameraNodeIds` down recursive TreeRow children:** The recursive `<TreeRow>` calls at lines 186-203 must also receive the new prop — easy to miss.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera tween animation | New tween system | Phase 46 `requestCameraTarget` bridge | Already wired with easeInOutCubic + reduced-motion in ThreeViewport.tsx:315-353 |
| Cross-component camera state | React context or prop drilling | uiStore `getCameraCapture` getter bridge | Matches Phase 46 `requestCameraTarget` unidirectional pattern |
| Double-click focus fallback | Duplicate focusDispatch logic | `focusOnSavedCamera(pos, target, fallback)` in focusDispatch.ts | Centralizes fallback dispatch, avoids copy-paste in RoomsTreePanel |

---

## Common Pitfalls

### Pitfall 1: onClick fires twice before onDoubleClick
**What goes wrong:** The double-click Focus-with-saved-camera fires after two single-click bbox-focus calls. The camera may visually jump to bbox and then jump again to the saved angle — creating a stutter.
**Why it happens:** React fires click × 2 then dblclick per HTML spec.
**How to avoid:** The bbox-focus single-click is fast and the tween is 600ms. The second requestCameraTarget (from double-click) cancels and restarts the tween (ThreeViewport.tsx:342 — `presetTween.current = {...}` is assigned, replacing any in-progress tween). Net effect: a brief start toward bbox then redirect to saved angle. This is acceptable per D-02 ("single + double click both focus"). If the stutter is unacceptable, debounce single-click by 200ms — but this contradicts CONTEXT.md D-02 which says single-click is untouched.
**Warning signs:** User reports camera "jumping" on double-click. Address with a `dblclick` guard flag if needed post-ship.

### Pitfall 2: `getCameraCapture` returns null in 2D mode
**What goes wrong:** If ThreeViewport is not mounted (viewMode === "2d"), the capture fn returns null. Save button silently does nothing.
**Why it happens:** ThreeViewport unmounts on viewMode="2d" (App.tsx:358-378). The `clearCameraCapture` cleanup runs.
**How to avoid:** D-09 disables the Save button when `viewMode === "2d"`. The null-capture code path is a defense-in-depth guard, not the primary UX mechanism.

### Pitfall 3: `savedCameraSet` stale after entity deletion
**What goes wrong:** A wall with a saved camera is deleted. Its ID lingers in `savedCameraSet` if computed from stale state.
**Why it happens:** `savedCameraNodeIds` is derived from store state. Deletion removes the entity, so its ID is no longer in any entity map. The `Set` re-derives on each render from live store slices — no staleness if computed with `useMemo`.
**How to avoid:** Compute `savedCameraNodeIds` inside `useMemo([rooms, ...])` in `RoomsTreePanel.tsx`. The set derives from fresh store data on every rooms change.

### Pitfall 4: `clearSavedCameraNoHistory` — must handle ceiling's nullable map
**What goes wrong:** `doc.ceilings` is optional (cad.ts:183 — `ceilings?: Record<string, Ceiling>`). Accessing `doc.ceilings[id]` without the `??` guard throws.
**How to avoid:** Mirror the pattern in focusDispatch.ts:114 — `(doc.ceilings ?? {})[id]`.

### Pitfall 5: `onDoubleClickRow` not threaded through recursive children
**What goes wrong:** Double-click works on top-level leaf rows but not on deeply-nested ones.
**Why it happens:** The recursive `<TreeRow>` calls at TreeRow.tsx:186-203 must also pass `onDoubleClickRow={props.onDoubleClickRow}` and `savedCameraNodeIds={props.savedCameraNodeIds}`.
**Warning signs:** Double-click on Room 1 → Wall 1 works; double-click on Room 2 → Wall 1 does nothing.

---

## Runtime State Inventory

Phase 48 is a greenfield addition of optional fields — no renames, no migrations.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — savedCameraPos/Target fields are new optional fields on existing records | None — forward-compatible |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None | None |

---

## Environment Availability

Phase 48 is code/config-only. No external dependencies beyond the existing project stack.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (confirmed from Phase 46/47 research precedent) |
| Quick run | `npx vitest run src/stores/__tests__/cadStore.savedCamera.test.ts` |
| Full suite | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| CAM-04 save | setSavedCameraOnWallNoHistory writes fields + no past[] increment | unit | `vitest run src/stores/__tests__/cadStore.savedCamera.test.ts` |
| CAM-04 save | setSavedCameraOnProductNoHistory / Ceiling / Custom analogous | unit | same file |
| CAM-04 clear | clearSavedCameraNoHistory sets both fields to undefined | unit | same file |
| CAM-04 ui save | PropertiesPanel Save button renders; calls store action | component | `vitest run src/components/__tests__/PropertiesPanel.savedCamera.test.tsx` |
| CAM-04 ui clear | Clear button hidden when no savedCamera; visible when set | component | same file |
| CAM-04 tree icon | Camera icon appears on leaf with savedCamera; absent on group | component | `vitest run src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx` |
| CAM-04 dblclick | Double-click dispatches requestCameraTarget to saved pos | component | same file |
| CAM-04 cycle | Save → serialize → loadSnapshot → Focus uses saved pos | e2e | `e2e/saved-camera-cycle.spec.ts` |

### Wave 0 Gaps
- [ ] `src/stores/__tests__/cadStore.savedCamera.test.ts` — covers all 5 actions
- [ ] `src/components/__tests__/PropertiesPanel.savedCamera.test.tsx` — button visibility + action call
- [ ] `src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx` — icon visibility + dblclick
- [ ] `e2e/saved-camera-cycle.spec.ts` — round-trip cycle

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Preset-only camera dispatch (pendingPresetRequest) | Free-position pendingCameraTarget bridge (Phase 46) | Phase 46 | Phase 48 reuses Phase 46 bridge with zero new tween code |
| Module-level mutable tool state (pre-Phase 31) | Closure-local state per tool activation | Phase 31 | Not relevant to Phase 48 |

---

## Open Questions

1. **`getCameraCapture` bridge — uiStore or context?**
   - What we know: `useThree()` is Canvas-scoped; orbitControlsRef is a module-local Scene ref
   - What's unclear: Whether uiStore is the right home for a mutable getter function (it's a React store, not an event bus)
   - Recommendation: Use uiStore — it already holds `requestCameraTarget` which has the same "ThreeViewport installs, PropertiesPanel reads" asymmetry. Precedent is strong.

2. **e2e autosave timing in Save → reload test**
   - What we know: Phase 28 autosave is debounced 2000ms
   - What's unclear: Whether Playwright e2e tests can reliably wait 2s for autosave before reload
   - Recommendation: In e2e, call the serialization API directly (`window.__saveProject?.()` if such a driver exists) or add a `__forceSave` driver in Phase 48. Alternatively, use `window.__driveSaveCamera` + verify via `window.__getSavedCamera` without reload, then test reload separately.

---

## Sources

### Primary (HIGH confidence)
- `src/types/cad.ts` (lines 1-211) — WallSegment, PlacedProduct, Ceiling, PlacedCustomElement type shapes; optional field precedent at line 151-157
- `src/stores/cadStore.ts` (lines 34-112, 237-245, 261-273, 779-808, 876-888) — NoHistory pattern; loadSnapshot; interface structure
- `src/components/PropertiesPanel.tsx` (lines 76-396) — selection-kind detection at 96-101; per-kind blocks at 181, 196, 247, 329; button style at 389
- `src/components/RoomsTreePanel/TreeRow.tsx` (lines 1-215) — row anatomy; eye-icon site at 167-182; recursive children at 186-203
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` (lines 1-250) — onClickRow at 183-224; hiddenIds pattern at 99-106
- `src/components/RoomsTreePanel/focusDispatch.ts` (lines 1-153) — requestCameraTarget helper at 16-32; all five focus dispatchers
- `src/stores/uiStore.ts` (lines 78-83, 120-124, 253-259) — pendingCameraTarget shape; requestCameraTarget action
- `src/three/ThreeViewport.tsx` (lines 100-175, 311-353) — orbitControlsRef; pendingCameraTarget consumer useEffect; __getCameraPose driver
- `src/test-utils/treeDrivers.ts` (lines 20-64) — installTreeDrivers() canonical shape
- `src/test-utils/displayModeDrivers.ts` (lines 16-27) — installDisplayModeDrivers() canonical shape
- `src/main.tsx` (lines 6-12) — driver installation pattern
- lucide-react v1.8.0 — Camera + CameraOff confirmed via runtime node require

### Secondary (MEDIUM confidence)
- Phase 46 CONTEXT.md — pendingCameraTarget + focusDispatch contract documented
- Phase 47 CONTEXT.md — displayMode store pattern; driver installation

---

## Metadata

**Confidence breakdown:**
- Types + store actions: HIGH — exact pattern confirmed at 10+ sites in cadStore.ts
- PropertiesPanel buttons: HIGH — per-kind block structure confirmed; viewMode prop addition is minimal
- TreeRow double-click: HIGH — event model confirmed; prop threading pitfall documented
- getCameraCapture bridge: HIGH — mirrors requestCameraTarget pattern exactly
- focusDispatch reuse: HIGH — requestCameraTarget signature matches Phase 48 needs with no changes
- Snapshot migration: HIGH — optional field precedent confirmed at cad.ts:151-157
- Test drivers: HIGH — installXDrivers pattern confirmed at treeDrivers.ts + displayModeDrivers.ts
- e2e cycle: MEDIUM — autosave timing in e2e context not verified

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (stable library stack, no fast-moving dependencies)

---

## Estimated Plan / Task Breakdown

Context CONTEXT.md estimates 2 plans, 6-8 tasks. Research confirms this:

**Plan A — Types + Store + focusDispatch (Wave 0/1):**
- Task A1: Add 8 optional fields to cad.ts (4 types × 2 fields)
- Task A2: Add 4 `setSavedCameraOnXNoHistory` actions + `clearSavedCameraNoHistory` to cadStore
- Task A3: Add `getCameraCapture` getter bridge to uiStore + ThreeViewport install/cleanup
- Task A4: Add `focusOnSavedCamera()` to focusDispatch.ts

**Plan B — UI + Drivers + Tests (Wave 1/2):**
- Task B1: PropertiesPanel — Save/Clear buttons per kind; viewMode prop
- Task B2: TreeRow — Camera icon (hasSavedCamera prop); onDoubleClickRow prop
- Task B3: RoomsTreePanel — savedCameraNodeIds derivation; onDoubleClickRow handler
- Task B4: savedCameraDrivers.ts + main.tsx install
- Task B5 (Wave 0): Write test stubs (cadStore.savedCamera, PropertiesPanel.savedCamera, RoomsTreePanel.savedCamera, e2e cycle)
