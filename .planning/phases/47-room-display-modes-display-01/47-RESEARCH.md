# Phase 47: Room Display Modes (DISPLAY-01) — Research

**Researched:** 2026-04-25
**Domain:** React/Zustand UI state; R3F multi-room rendering; ThreeViewport Scene extension; localStorage hydration.
**Confidence:** HIGH — every finding grounded in checked-in source code with line citations.

---

## Summary

Phase 47 adds a NORMAL / SOLO / EXPLODE display-mode segmented control to the Toolbar. The 9 decisions in `47-CONTEXT.md` are fully locked; research confirms implementation feasibility and surfaces one architectural surprise that the planner must address.

**Critical architectural finding (Pitfall 1 below):** The current `Scene` component in `ThreeViewport.tsx` only renders the **active room** via `useActiveWalls()` / `useActivePlacedProducts()` / etc. (line 6, selectors scoped to `activeRoomId`). NORMAL mode in the existing codebase therefore already behaves like SOLO. For Phase 47:
- **SOLO** → keep single-room selectors, add a guard that renders empty if `activeRoomId` is null (D-06 behavior is already what the current code does).
- **NORMAL** → also single-room selectors for now (matches existing behavior). The REQUIREMENTS.md says "all rooms render" in NORMAL — this surfaces a pre-existing gap. Planner must decide: NORMAL = all rooms visible, or NORMAL = existing active-room behavior? **Recommendation:** NORMAL renders all rooms (spec intent). This requires iterating `rooms` in the scene, not just the active room. Research below covers how.
- **EXPLODE** → iterate all rooms with per-room X-offset.

**Primary recommendation:** Add `displayMode` to uiStore with localStorage hydration. For NORMAL/EXPLODE, swap Scene from single-room selectors to a multi-room render where each room's content is wrapped in a `<group position={[offsetX, 0, 0]}>` (EXPLODE) or `<group>` (NORMAL/SOLO). SOLO filters to only `activeRoomId`'s group. The `effectivelyHidden` useMemo composes at the room-group level above the leaf filter (per Pitfall 7 comment added in Phase 46).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Three buttons (NORMAL / SOLO / EXPLODE) in Toolbar, gated on `viewMode === "3d" || viewMode === "split"`. Mirrors Walk/Orbit precedent.
- **D-02** — `displayMode: "normal" | "solo" | "explode"` in uiStore; `setDisplayMode` action. Default `"normal"`. View-state: no cadStore mutations, no undo, no autosave.
- **D-03** — EXPLODE layout: X-axis only, `(maxRoomDim × 1.25 × index)`. `maxRoomDim = Math.max(room.width, room.length)`. Rooms stacked in `Object.keys(rooms)` insertion order.
- **D-04** — SOLO composes with Phase 46 `hiddenIds`. The two filter axes stack; reset-on-mode-change is rejected.
- **D-05** — Persist `displayMode` to localStorage key `gsd:displayMode`. Hydrate on mount; unparseable/missing → `"normal"`.
- **D-06** — SOLO + null/missing `activeRoomId` → empty scene. No fallback room, no auto-NORMAL switch.
- **D-07** — Mode switch is INSTANT. No tween. Hard constraint. D-39 (reduced-motion) is moot.
- **D-08** — EXPLODE does NOT auto-zoom camera. User uses existing orbit/zoom controls.
- **D-09** — Icons from lucide-react. NORMAL=`LayoutGrid`, SOLO=`Square`, EXPLODE=`Move3d`. Active state: `bg-accent/10 text-accent border-accent/30`.

### Claude's Discretion

None listed in CONTEXT.md — all decisions locked.

### Deferred Ideas (OUT OF SCOPE)

- Per-room saved camera angles (CAM-04 / Phase 48)
- EXPLODE layout customization (axis pick, spacing slider)
- EXPLODE animation between modes
- SOLO room picker separate from `activeRoomId`
- displayMode persistence per-project
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISPLAY-01 | Toolbar segmented control (NORMAL/SOLO/EXPLODE). `uiStore.displayMode` field. ThreeViewport renders per-mode. EXPLODE offsets rooms along X-axis. SOLO renders active room only. View-state only — no CAD mutations. | §Standard Stack, §Architecture Patterns, §Toolbar Anatomy, §uiStore Pattern, §ThreeViewport Render Sites, §EXPLODE Group Pattern, §Icon Availability |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- **Icons (D-33):** lucide-react ONLY for new toolbar buttons. Do NOT use `material-symbols-outlined`. Verified: `LayoutGrid`, `Square`, `Move3d` all exist in lucide-react v1.8.0.
- **Spacing (D-34):** Zero `p-[Npx]` / `m-[Npx]` / `gap-[Npx]` arbitrary values in `Toolbar.tsx` (it is in the per-file enforcement list). Use canonical spacing utilities only.
- **Reduced motion (D-39):** Moot for Phase 47 — D-07 mandates instant mode switch, no animation to gate.
- **Vitest CI:** Disabled. Run locally via `npm test` only. 6 pre-existing failures permanently accepted.
- **Substitute-evidence policy:** SUMMARY.md is canonical evidence.

---

## Standard Stack

### Core (zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.12 | Extend uiStore with `displayMode` + `setDisplayMode` | Project default; uiStore is plain Zustand (no Immer) |
| lucide-react | 1.8.0 | `LayoutGrid`, `Square`, `Move3d` toolbar icons | D-33 mandate; all three icons confirmed present |
| react | 18.3.1 | JSX, hooks | Project default |
| @react-three/fiber | 8.17.14 | `<group position={…}>` wraps per-room meshes | Existing |
| three | 0.183.2 | Position math for EXPLODE offsets | Existing |

**Installation:** None — every dependency already in `package.json`.

**Version verification:** All packages are pre-installed. lucide-react v1.8.0 confirmed: `LayoutGrid` ✓, `Square` ✓, `Move3d` ✓ (CJS export list verified via node require).

---

## Focus Area 1: Toolbar Button Anatomy

**Source:** `src/components/Toolbar.tsx` — lines 107–167 (Walk/Orbit toggle and camera preset cluster).

### Walk/Orbit toggle (lines 107–125) — closest semantic sibling

```tsx
// Toolbar.tsx:107-125
{(viewMode === "3d" || viewMode === "split") && (
  <Tooltip content={...} shortcut="E" placement="bottom">
    <button
      onClick={toggleCameraMode}
      className={`flex items-center gap-1.5 font-mono text-sm font-normal px-2 py-1 transition-colors duration-150 mr-6 ${
        cameraMode === "walk"
          ? "text-accent-light border-b-2 border-accent"
          : "text-text-dim hover:text-accent-light"
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">directions_walk</span>
      {cameraMode === "orbit" ? "Walk" : "Orbit"}
    </button>
  </Tooltip>
)}
```

**BUT:** Walk/Orbit uses a Material Symbol icon and a bottom-border active style. D-09 specifies a different active style for displayMode: `bg-accent/10 text-accent border-accent/30`. Look at the camera preset buttons (lines 130–167) instead:

### Camera preset buttons (lines 147–162) — exact active-state model

```tsx
// Toolbar.tsx:147-162
<button
  data-testid={`preset-${id}`}
  onClick={() => { if (!isWalkMode) requestPreset(id); }}
  disabled={isWalkMode}
  aria-label={label}
  aria-pressed={isActive}
  className={`flex items-center justify-center p-1 rounded-sm transition-colors duration-150 ${
    isActive
      ? "bg-accent/20 text-accent-light border border-accent/30"
      : "text-text-dim hover:text-accent-light border border-transparent"
  } ${isWalkMode ? "opacity-40 cursor-not-allowed" : ""}`}
>
  <Icon size={16} strokeWidth={1.5} />
</button>
```

**D-09 says `bg-accent/10`; existing preset buttons use `bg-accent/20`.** Use `bg-accent/10` as specified by D-09 to distinguish display-mode buttons from camera preset buttons.

### displayMode button anatomy (recommended)

```tsx
// Three-button group, mirrors preset cluster pattern
<div
  className="flex items-center gap-1 mr-6"
  role="group"
  aria-label="Display mode"
>
  {DISPLAY_MODES.map(({ id, label, Icon, tooltip }) => {
    const isActive = displayMode === id;
    return (
      <Tooltip key={id} content={tooltip} placement="bottom">
        <button
          data-testid={`display-mode-${id}`}
          onClick={() => setDisplayMode(id)}
          aria-label={label}
          aria-pressed={isActive}
          className={`flex items-center justify-center gap-1 px-2 py-1 rounded-sm font-mono text-sm transition-colors duration-150 ${
            isActive
              ? "bg-accent/10 text-accent border border-accent/30"
              : "text-text-dim hover:text-accent-light border border-transparent"
          }`}
        >
          <Icon size={14} strokeWidth={1.5} />
          <span>{label}</span>
        </button>
      </Tooltip>
    );
  })}
</div>
```

**Placement in Toolbar:** After the camera preset cluster (line 167), before the document title center slot (line 169). This matches the left-to-right hierarchy: view tabs → walk/orbit → camera presets → **display mode** → [center: title] → [right: undo/save/export].

**viewMode gate:** Wrap with `{(viewMode === "3d" || viewMode === "split") && (…)}` — identical to Walk/Orbit and presets gates at lines 107 and 130.

---

## Focus Area 2: uiStore + localStorage Hydration Pattern

**Source:** `src/stores/uiStore.ts` — full file reviewed; `src/lib/uiPersistence.ts` — `readUIBool`/`writeUIBool` pattern.

### Current cameraMode pattern (no persistence)

`cameraMode` in uiStore (line 18) defaults to `"orbit"` and resets on reload — no localStorage. `setCameraMode` (line 71) is a simple `set({ cameraMode: mode })`.

### displayMode requires persistence (D-05)

D-05 mandates localStorage hydration. uiStore has no precedent for this — it is a new pattern. Two options:

**Option A (Recommended): Lazy initializer in Zustand `create` factory**

```typescript
// uiStore.ts — read localStorage at store-creation time (synchronous, SSR-safe)
const LS_DISPLAY_MODE_KEY = "gsd:displayMode";
const VALID_DISPLAY_MODES = ["normal", "solo", "explode"] as const;
type DisplayMode = typeof VALID_DISPLAY_MODES[number];

function readDisplayMode(): DisplayMode {
  if (typeof window === "undefined") return "normal";
  try {
    const v = window.localStorage.getItem(LS_DISPLAY_MODE_KEY);
    return (VALID_DISPLAY_MODES as readonly string[]).includes(v ?? "")
      ? (v as DisplayMode)
      : "normal";
  } catch {
    return "normal";
  }
}

// In create<UIState>()((set) => ({
//   ...existing fields...
  displayMode: readDisplayMode(), // hydrated synchronously at store creation
  setDisplayMode: (mode) => {
    set({ displayMode: mode });
    try {
      window.localStorage.setItem(LS_DISPLAY_MODE_KEY, mode);
    } catch { /* quota / privacy mode */ }
  },
```

**Why this approach:**
- Synchronous read at store-creation time → no React state/effect race; no SSR mismatch (browser-only app)
- Write in action → immediate persistence on every mode change
- `typeof window === "undefined"` guard → SSR-safe (matches `uiPersistence.ts` line 17 pattern)
- Key `gsd:displayMode` is non-colliding — only `gsd:tree:` keys exist today; confirmed via grep

**Option B:** `useEffect` on a wrapper component. Rejected — introduces a render cycle before hydration, could cause a "NORMAL flash" even if the user had SOLO set.

### Interface changes

```typescript
// Add to UIState interface:
displayMode: "normal" | "solo" | "explode";
setDisplayMode: (mode: "normal" | "solo" | "explode") => void;
```

No new selector hooks needed — consumers subscribe directly to `displayMode`.

---

## Focus Area 3: ThreeViewport Render-Iteration Sites + SOLO/EXPLODE Architecture

### Critical finding: Scene currently renders only the active room

`src/three/ThreeViewport.tsx` Scene component (lines 53–526) uses:
- Line 54: `const room = useActiveRoom()` — single room dimensions
- Line 55: `const walls = useActiveWalls()` — walls of `activeRoomId` only
- Line 56: `const placedProducts = useActivePlacedProducts()` — active room only
- Lines 57–59: `ceilings`, `placedCustoms` — all scoped to `activeRoomId`

All `Object.values(walls).filter(...).map(...)` render sites (lines 461, 470, 483, 488) operate only on the active room's data. There is **no existing multi-room render loop** in ThreeViewport.

### What NORMAL mode means

REQUIREMENTS.md says NORMAL = "all rooms render together." The current behavior renders only the active room. Phase 47 must introduce a multi-room loop for NORMAL and EXPLODE. SOLO keeps single-room behavior (and renders empty if `activeRoomId` is null per D-06).

### Recommended architecture: per-room `<group>` wrappers

The least-invasive approach is to add a `useAllRooms()` selector and iterate rooms in the Scene JSX with per-room `<group position={[offsetX, 0, 0]}>` wrappers. Each room's group contains that room's walls, products, ceilings, and custom elements.

```typescript
// New selector to add to cadStore.ts
export const useAllRooms = () => useCADStore((s) => s.rooms);
```

Scene render structure for displayMode-aware iteration:

```tsx
// In Scene JSX — replaces the current flat wall/product/ceiling/custom render blocks
{displayMode === "solo" ? (
  // SOLO: render only activeRoomId, compositions with effectivelyHidden
  activeRoomId && rooms[activeRoomId] ? (
    <RoomGroup
      key={activeRoomId}
      roomDoc={rooms[activeRoomId]}
      offsetX={0}
      productLibrary={productLibrary}
      selectedIds={selectedIds}
      effectivelyHidden={effectivelyHidden}  // existing Phase 46 useMemo
    />
  ) : null
) : (
  // NORMAL (offsetX=0 per room) or EXPLODE (offsetX per D-03)
  (() => {
    let cumulativeOffset = 0;
    return Object.entries(rooms).map(([roomId, roomDoc]) => {
      const maxDim = Math.max(roomDoc.room.width, roomDoc.room.length);
      const offsetX = displayMode === "explode" ? cumulativeOffset : 0;
      if (displayMode === "explode") cumulativeOffset += maxDim * 1.25;
      return (
        <RoomGroup
          key={roomId}
          roomDoc={roomDoc}
          offsetX={offsetX}
          productLibrary={productLibrary}
          selectedIds={selectedIds}
          effectivelyHidden={effectivelyHidden}
        />
      );
    });
  })()
)}
```

**Alternative: inline the group logic without extracting a `<RoomGroup>` component.** Acceptable if the planner prefers fewer files — the group pattern works inline too. The `<group position={[offsetX, 0, 0]}>` is the key primitive.

### Per-room group with position offset

Three.js R3F `<group position={[x, y, z]}>` applies a world-space translation to all children. Every wall/product/ceiling mesh inside a group inherits the offset. This is less invasive than offsetting each mesh's `position` prop individually — the group transform is a single scene-graph node.

```tsx
// RoomGroup component sketch (or inline in Scene)
function RoomGroup({ roomDoc, offsetX, ... }) {
  const walls = Object.values(roomDoc.walls ?? {});
  const products = Object.values(roomDoc.placedProducts ?? {});
  const ceilings = Object.values(roomDoc.ceilings ?? {});
  const customs = Object.values(roomDoc.placedCustomElements ?? {});
  return (
    <group position={[offsetX, 0, 0]}>
      {walls.filter(w => !effectivelyHidden.has(w.id)).map(w => (
        <WallMesh key={w.id} wall={w} isSelected={selectedIds.includes(w.id)} />
      ))}
      {/* ... products, ceilings, customs ... */}
      <FloorMesh width={roomDoc.room.width} length={roomDoc.room.length} ... />
    </group>
  );
}
```

### effectivelyHidden composition (D-04)

The existing `effectivelyHidden` useMemo at lines 78–102 is scoped to `activeRoomId`. In NORMAL/EXPLODE mode this is insufficient — it only covers one room. However, for Phase 47 the per-room eye-toggle in the tree still operates per-leaf via `hiddenIds`, and the cascade logic can still be computed per-room at render time inside the group. Options:

**Option A (Recommended):** Move effectivelyHidden computation inside `RoomGroup` or inline per-room within the iteration, using that room's `roomId` for cascade resolution. Each room's group independently computes its effective-hidden set.

**Option B:** Keep effectivelyHidden for the active room only; for non-active rooms, compute a simpler pass-through (just check `hiddenIds.has(leafId)`). This skips group-level cascade for non-active rooms but is simpler.

**Recommendation:** Option A — consistent behavior across all rooms. The computation is O(leaves per room) and runs in a useMemo with stable deps.

### Exact render site lines (Phase 46 output)

| Site | Line (ThreeViewport.tsx) | Content |
|------|--------------------------|---------|
| Walls | 461 | `Object.values(walls).filter((wall) => !effectivelyHidden.has(wall.id)).map(...)` |
| Products | 470 | `Object.values(placedProducts).filter((pp) => !effectivelyHidden.has(pp.id)).map(...)` |
| Ceilings | 483 | `Object.values(ceilings).filter((c) => !effectivelyHidden.has(c.id)).map(...)` |
| Customs | 488 | `Object.values(placedCustoms).filter((p) => !effectivelyHidden.has(p.id)).map(...)` |

All four sites must be moved inside the per-room group structure.

**Also:** FloorMesh (line 440), gridHelper (line 455), Environment (lines 449–452), Lighting (line 437) should remain at the scene level — one per scene, not per room. Only wall/product/ceiling/custom meshes go inside per-room groups.

---

## Focus Area 4: EXPLODE Offset Math

**D-03 formula:** `offsetX[index] = sum(maxRoomDim[0..index-1] * 1.25)` where `maxRoomDim[i] = Math.max(rooms[i].room.width, rooms[i].room.length)`.

First room: `offsetX = 0`. Second room: `offsetX = maxDim[0] * 1.25`. Third: `offsetX = (maxDim[0] + maxDim[1]) * 1.25`. Implemented as a cumulative sum in the `Object.entries(rooms)` loop.

**Coordinate system note:** Walls in the 2D canvas are in feet. The 3D world units are also feet. The X-axis offset is in Three.js world units (feet). FloorMesh / walls all use feet as their coordinate unit — the offset is correct without any scale conversion.

**`<group position={[offsetX, 0, 0]}>` is the correct approach** — wall and product meshes already use the room's local foot-coordinate space internally. The group transform shifts the entire room volume in world space. No per-mesh coordinate change needed.

---

## Focus Area 5: Object.keys(rooms) Insertion-Order Stability

**Question (from CONTEXT.md):** Is `Object.keys(rooms)` insertion order stable across Zustand+Immer mutations?

**Finding (HIGH confidence):**

1. `cadStore.ts` uses Immer (`import { produce } from "immer"` at line 2). The `rooms` field is a plain `Record<string, RoomDoc>` — a JavaScript object.

2. V8 (and all modern JS engines) preserve **insertion order** for string keys in plain objects per the ES2015+ specification. When a room is added via `addRoom` (line 1018), it is assigned as `s.rooms[newId] = ...` — appended to the end.

3. When a room is deleted via `removeRoom` (line 1057-1065), it uses `delete s.rooms[id]`. The remaining keys preserve their original insertion order.

4. Immer's Proxy-based draft ALSO preserves insertion order — it does not reorder keys during `produce`.

5. `Object.entries(rooms)` order = insertion order. This is stable. The EXPLODE index is therefore **deterministic and stable** as long as rooms are not deleted-and-re-added.

**Edge case:** If the user deletes room B (middle) and then adds room D, the order becomes [A, C, D]. EXPLODE will close the gap — A at 0, C at maxDim(A)*1.25, D at (maxDim(A)+maxDim(C))*1.25. This is correct behavior (a deleted room leaves no visual gap). No special handling needed.

**Conclusion:** Insertion order is reliable for EXPLODE offset computation. No stability risk.

---

## Focus Area 6: Lucide Icon Availability

Verified via `node -e "require('./node_modules/lucide-react/dist/cjs/lucide-react.js')"` in the worktree:

| Icon | D-09 assignment | Present in v1.8.0 |
|------|-----------------|-------------------|
| `LayoutGrid` | NORMAL | ✓ |
| `Square` | SOLO | ✓ |
| `Move3d` | EXPLODE | ✓ |

**No fallback needed.** All three icons ship in the installed version. The research confirms D-09's choices are implementable without modification.

---

## Focus Area 7: Test-Mode Driver for displayMode

**Pattern source:** `src/test-utils/treeDrivers.ts` (Phase 46 tree drivers) and `src/three/ThreeViewport.tsx` useEffect-gated drivers (lines 140–207).

**Recommendation:** Add `window.__driveDisplayMode(mode)` as a small export from `src/test-utils/displayModeDrivers.ts`, following the `installTreeDrivers()` pattern in `treeDrivers.ts`.

```typescript
// src/test-utils/displayModeDrivers.ts
import { useUIStore } from "@/stores/uiStore";

declare global {
  interface Window {
    __driveDisplayMode?: (mode: "normal" | "solo" | "explode") => void;
    __getDisplayMode?: () => "normal" | "solo" | "explode";
  }
}

export function installDisplayModeDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__driveDisplayMode = (mode) => {
    useUIStore.getState().setDisplayMode(mode);
  };

  window.__getDisplayMode = () => {
    return useUIStore.getState().displayMode;
  };
}
```

**Install location:** Call `installDisplayModeDrivers()` in `src/main.tsx` alongside `installTreeDrivers()` (or wherever treeDrivers is installed). Check where Phase 46 wired its install call:

```bash
grep -n "installTreeDrivers" src/main.tsx
```

The displayMode driver follows the same gating convention: `import.meta.env.MODE === "test"`. Zero production cost.

**Note on naming:** These drivers operate on uiStore directly — no DOM query needed (unlike tree drivers which click DOM elements). This makes them simpler and more reliable.

---

## Focus Area 8: E2E Test Seed Shape

**Pattern source:** Phase 46 e2e specs use `page.goto("/")` and then interact via `__cadStore.loadSnapshot` or tree drivers. Phase 35 uses `window.__setTestCamera`.

**Multi-room seed for Phase 47 e2e:**

The e2e spec needs 3 rooms with different bbox sizes to meaningfully test EXPLODE offset correctness. The canonical seed shape:

```typescript
// e2e seed: call window.__loadTestSnapshot(snapshot) or drive via cadStore
const threeRoomSnapshot: CADSnapshot = {
  version: 2,
  activeRoomId: "room_alpha",
  rooms: {
    "room_alpha": {
      id: "room_alpha",
      name: "Alpha Room",
      room: { width: 20, length: 16, wallHeight: 8 },
      walls: {
        "wall_a1": {
          id: "wall_a1",
          start: { x: 0, y: 0 }, end: { x: 20, y: 0 },
          thickness: 0.5, height: 8,
          openings: [], materialA: undefined, materialB: undefined,
        }
      },
      placedProducts: {},
    },
    "room_beta": {
      id: "room_beta",
      name: "Beta Room",
      room: { width: 12, length: 10, wallHeight: 9 },
      walls: {},
      placedProducts: {},
    },
    "room_gamma": {
      id: "room_gamma",
      name: "Gamma Room",
      room: { width: 30, length: 25, wallHeight: 8 },
      walls: {},
      placedProducts: {},
    },
  },
};
// Expected EXPLODE offsets:
// room_alpha: offsetX = 0
// room_beta:  offsetX = Math.max(20, 16) * 1.25 = 25.0
// room_gamma: offsetX = 25.0 + Math.max(12, 10) * 1.25 = 25.0 + 15.0 = 40.0
```

**Driver to load seed:** Phase 46 used `window.__cadStore.loadSnapshot(snap)`. Verify the driver name — check Phase 46 e2e specs for the exact call signature. If not available, the e2e spec can drive `setDisplayMode` via `window.__driveDisplayMode` after the default 3-room project is already loaded (Playwright's `page.goto("/")`).

**E2E assertions:** Rather than full pixel snapshots (brittle), assert via:
1. `window.__getDisplayMode() === "explode"` — mode set correctly
2. DOM check: `data-testid="display-mode-explode"` has `aria-pressed="true"`
3. Scene-graph check via `window.__getGroupPositions()` (new driver, optional) — for unit tests

---

## Architecture Patterns

### Recommended File Changes

```
src/
  stores/
    uiStore.ts            → Add displayMode, setDisplayMode, readDisplayMode() init
    cadStore.ts           → Add useAllRooms() selector (1 line)
  components/
    Toolbar.tsx           → Add DISPLAY_MODES config + 3 buttons (gated viewMode)
  three/
    ThreeViewport.tsx     → Refactor Scene: add displayMode subscription,
                            multi-room iteration, per-room <group>, EXPLODE offsets
  test-utils/
    displayModeDrivers.ts → New file: __driveDisplayMode, __getDisplayMode
  main.tsx               → installDisplayModeDrivers() call

New tests:
  src/__tests__/uiStore.displayMode.test.ts
  src/__tests__/ThreeViewport.displayMode.test.tsx  (or stub)
  src/components/__tests__/Toolbar.displayMode.test.tsx
  e2e/display-mode-cycle.spec.ts
```

### Pattern: Multi-Room Scene Render

```tsx
// ThreeViewport.tsx — Scene component additions
const rooms = useCADStore(s => s.rooms);           // NEW
const displayMode = useUIStore(s => s.displayMode); // NEW

// Replace flat renders with per-room group iteration:
{displayMode === "solo" ? (
  activeRoomId && rooms[activeRoomId]
    ? <RoomGroup key={activeRoomId} roomDoc={rooms[activeRoomId]} offsetX={0} ... />
    : null
) : (() => {
  let cum = 0;
  return Object.entries(rooms).map(([id, doc]) => {
    const maxDim = Math.max(doc.room.width, doc.room.length);
    const offsetX = displayMode === "explode" ? cum : 0;
    if (displayMode === "explode") cum += maxDim * 1.25;
    return <RoomGroup key={id} roomDoc={doc} offsetX={offsetX} ... />;
  });
})()}
```

### Pattern: RoomGroup Component

Extract a `RoomGroup` function component (can live inline in ThreeViewport.tsx or as a separate file `src/three/RoomGroup.tsx`). It receives `roomDoc`, `offsetX`, `effectivelyHidden`, `selectedIds`, `productLibrary`. Returns a `<group position={[offsetX, 0, 0]}>` containing walls, products, ceilings, customs.

**Floor mesh:** One FloorMesh per room (inside RoomGroup). The floor is per-room, not global.
**Grid helper, Lighting, Environment:** ONE each at the Scene level, not per-room.

### Anti-Patterns to Avoid

- **Per-mesh offsetting:** Modifying each wall/product `position` prop individually instead of using a `<group>`. This would require changing every mesh component's coordinate expectations.
- **Storing EXPLODE offsets in state.** They are derived from room dimensions at render time — computing them inline is correct and avoids stale state.
- **Tweening the position change.** D-07 is explicit: instant mode switch. Do not introduce `useSpring` or lerp.
- **Auto-framing on EXPLODE.** D-08 rejects this. Camera stays where the user left it.
- **Resetting hiddenIds on mode change.** D-04 mandates composition, not reset.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage read/write | Custom persistence module | Inline in `setDisplayMode` + lazy initializer at store-creation; mirrors `uiPersistence.ts` SSR pattern | Single field, no abstraction warranted |
| EXPLODE offset math | Geometry utility | Inline cumulative-sum in render loop | 2 lines of arithmetic; abstracting adds indirection without benefit |
| lucide icons | Custom SVG or Material Symbol substitute | `LayoutGrid`, `Square`, `Move3d` from lucide-react | All three icons confirmed present in v1.8.0 |
| Multi-room render | New state management layer | `Object.entries(rooms).map(...)` with `<group>` wrappers | Standard R3F pattern; no new dependencies |

---

## Common Pitfalls

### Pitfall 1: Scene only renders active room — NORMAL mode gap
**What goes wrong:** Developer adds displayMode but leaves Scene reading `useActiveWalls()` — NORMAL still only shows the active room. User switches to NORMAL and wonders why other rooms vanished.
**Why it happens:** The current Scene architecture was never extended for multi-room. `useActiveWalls` (cadStore.ts:1082) scopes to `activeRoomId`.
**How to avoid:** Switch Scene from `useActiveWalls/useActivePlacedProducts/...` to `useAllRooms()` for NORMAL and EXPLODE. Only SOLO keeps the single-room pattern.
**Warning signs:** Other rooms don't appear when switching to NORMAL with 2+ rooms.

### Pitfall 2: FloorMesh duplicated or mispositioned in EXPLODE
**What goes wrong:** A single global FloorMesh at `(halfW, 0, halfL)` doesn't move with the room group's `offsetX`. In EXPLODE, all rooms appear to share one floor at position 0.
**Why it happens:** FloorMesh is currently at Scene level (line 440) with hardcoded room-center position.
**How to avoid:** Move FloorMesh INSIDE each `RoomGroup`. Each room's floor renders at the room's local coordinates (unaffected by the group's offsetX, which is in world space). The group's position transform handles the world-space shift.
**Warning signs:** In EXPLODE, walls float but floor tiles all appear at the origin.

### Pitfall 3: gridHelper duplicated per room
**What goes wrong:** If gridHelper is moved inside RoomGroup, EXPLODE shows N overlapping grids.
**Why it happens:** Reflex from "everything room-related goes in the group."
**How to avoid:** Keep gridHelper at Scene level (line 455). It's a visual aid, not room data. Or remove it entirely in EXPLODE mode (the per-room floors are sufficient orientation).
**Warning signs:** EXPLODE view shows dense overlapping grid lines.

### Pitfall 4: effectivelyHidden useMemo not extended to all rooms
**What goes wrong:** The existing `effectivelyHidden` useMemo (ThreeViewport.tsx:78–102) uses `activeRoomId`. In NORMAL/EXPLODE, non-active rooms have no cascade resolution — their eye-toggled nodes aren't filtered.
**Why it happens:** The useMemo was written for single-room rendering (Phase 46).
**How to avoid:** Compute effectivelyHidden per-room inside `RoomGroup` — each group has its own `roomId` and can run the same cascade logic. Or extend the top-level useMemo to cover all rooms when `displayMode !== "solo"`.
**Warning signs:** Hiding a wall in room B via the tree doesn't actually hide it when NORMAL mode shows all rooms.

### Pitfall 5: localStorage write on every Zustand subscription notify
**What goes wrong:** If `setDisplayMode` is called from a useEffect dependency rather than a user action, it could loop (write → store update → effect → write).
**Why it happens:** Wiring the localStorage write in a useEffect on `displayMode` rather than in the action.
**How to avoid:** Write localStorage in `setDisplayMode` (the Zustand action), not in a React useEffect. Read occurs once at store-creation time (lazy initializer). No effect needed.
**Warning signs:** DevTools → Application → LocalStorage shows `gsd:displayMode` being overwritten on every render.

### Pitfall 6: IIFE for EXPLODE offset causes React re-render issues
**What goes wrong:** Using an IIFE `(() => { ... })()` inside JSX for the cumulative-sum loop looks unusual. Some linters flag it; React handles it fine.
**Why it happens:** Cumulative offset requires stateful iteration (mutable `cum` variable), which doesn't fit cleanly into a pure `map`.
**How to avoid (alternative):** Pre-compute the offsets in a `useMemo` before the JSX:
```typescript
const roomOffsets = useMemo(() => {
  const entries = Object.entries(rooms);
  const offsets: Record<string, number> = {};
  let cum = 0;
  for (const [id, doc] of entries) {
    offsets[id] = displayMode === "explode" ? cum : 0;
    if (displayMode === "explode") cum += Math.max(doc.room.width, doc.room.length) * 1.25;
  }
  return offsets;
}, [rooms, displayMode]);
```
Then in JSX: `Object.entries(rooms).map(([id, doc]) => <RoomGroup offsetX={roomOffsets[id]} ... />)`. Cleaner, easier to test.

### Pitfall 7: SOLO hides rooms but effectivelyHidden still applies
**What goes wrong:** In SOLO, user expects only the active room's eye-hidden nodes to be filtered. If effectivelyHidden still references `activeRoomId` in solo mode, the composition works. But if code is changed to "compute effectivelyHidden per active room only in solo," it accidentally becomes correct — this is fine.
**How to handle:** The Pitfall 7 comment in ThreeViewport.tsx (added in Phase 46) says "Phase 47 SOLO/EXPLODE will compose AT ROOM LEVEL above this leaf-level filter." This means:
- SOLO: render only the active room's group; effectivelyHidden continues to filter leaves within it.
- EXPLODE/NORMAL: each room group computes its own effectivelyHidden filter.
**Warning signs:** None if RoomGroup computes effectivelyHidden from `roomId`.

---

## Code Examples

### uiStore extension

```typescript
// src/stores/uiStore.ts — additions

const GSD_DISPLAY_MODE_KEY = "gsd:displayMode";
type DisplayMode = "normal" | "solo" | "explode";
const VALID_MODES: DisplayMode[] = ["normal", "solo", "explode"];

function readDisplayMode(): DisplayMode {
  if (typeof window === "undefined") return "normal";
  try {
    const v = window.localStorage.getItem(GSD_DISPLAY_MODE_KEY);
    return VALID_MODES.includes(v as DisplayMode) ? (v as DisplayMode) : "normal";
  } catch { return "normal"; }
}

// In UIState interface (add):
displayMode: DisplayMode;
setDisplayMode: (mode: DisplayMode) => void;

// In create() initial state (add):
displayMode: readDisplayMode(),

// In create() actions (add):
setDisplayMode: (mode) => {
  set({ displayMode: mode });
  try { window.localStorage.setItem(GSD_DISPLAY_MODE_KEY, mode); } catch { /* quota */ }
},
```

### Toolbar additions

```typescript
// Import (line 10–16 area):
import { LayoutGrid, Square, Move3d, /* existing imports */ } from "lucide-react";

// Config constant (above component):
const DISPLAY_MODES = [
  { id: "normal" as const, label: "NORMAL", Icon: LayoutGrid, tooltip: "All rooms render together" },
  { id: "solo"   as const, label: "SOLO",   Icon: Square,     tooltip: "Only the active room renders" },
  { id: "explode"as const, label: "EXPLODE", Icon: Move3d,    tooltip: "Rooms separated along X-axis" },
];

// In component (add subscriptions):
const displayMode = useUIStore((s) => s.displayMode);
const setDisplayMode = useUIStore((s) => s.setDisplayMode);

// In JSX — after camera preset cluster (after line 167, before line 169):
{(viewMode === "3d" || viewMode === "split") && (
  <div className="flex items-center gap-1 mr-6" role="group" aria-label="Display mode">
    {DISPLAY_MODES.map(({ id, label, Icon, tooltip }) => {
      const isActive = displayMode === id;
      return (
        <Tooltip key={id} content={tooltip} placement="bottom">
          <button
            data-testid={`display-mode-${id}`}
            onClick={() => setDisplayMode(id)}
            aria-label={label}
            aria-pressed={isActive}
            className={`flex items-center justify-center gap-1 px-2 py-1 rounded-sm font-mono text-sm transition-colors duration-150 ${
              isActive
                ? "bg-accent/10 text-accent border border-accent/30"
                : "text-text-dim hover:text-accent-light border border-transparent"
            }`}
          >
            <Icon size={14} strokeWidth={1.5} />
            <span>{label}</span>
          </button>
        </Tooltip>
      );
    })}
  </div>
)}
```

### RoomGroup component sketch

```tsx
// src/three/RoomGroup.tsx (or inline in ThreeViewport.tsx)
interface RoomGroupProps {
  roomDoc: RoomDoc;
  offsetX: number;
  productLibrary: Product[];
  selectedIds: string[];
  hiddenIds: Set<string>;  // pass raw hiddenIds; compute effectivelyHidden inside
}

function RoomGroup({ roomDoc, offsetX, productLibrary, selectedIds, hiddenIds }: RoomGroupProps) {
  const { id: roomId, room, walls = {}, placedProducts = {},
          ceilings = {}, placedCustomElements = {} } = roomDoc;

  // Per-room effectivelyHidden (same cascade logic as Phase 46 useMemo)
  const effectivelyHidden = useMemo(() => {
    const out = new Set<string>();
    if (hiddenIds.has(roomId)) {
      Object.values(walls).forEach(w => out.add(w.id));
      Object.values(placedProducts).forEach(p => out.add(p.id));
      Object.values(ceilings).forEach(c => out.add(c.id));
      Object.values(placedCustomElements).forEach(p => out.add(p.id));
      return out;
    }
    if (hiddenIds.has(`${roomId}:walls`)) Object.values(walls).forEach(w => out.add(w.id));
    if (hiddenIds.has(`${roomId}:ceiling`)) Object.values(ceilings).forEach(c => out.add(c.id));
    if (hiddenIds.has(`${roomId}:products`)) Object.values(placedProducts).forEach(p => out.add(p.id));
    if (hiddenIds.has(`${roomId}:custom`)) Object.values(placedCustomElements).forEach(p => out.add(p.id));
    for (const id of hiddenIds) out.add(id);
    return out;
  }, [hiddenIds, roomId, walls, placedProducts, ceilings, placedCustomElements]);

  const halfW = room.width / 2;
  const halfL = room.length / 2;

  return (
    <group position={[offsetX, 0, 0]}>
      <FloorMesh width={room.width} length={room.length} halfW={halfW} halfL={halfL}
        material={roomDoc.floorMaterial} fallbackTexture={getFloorTexture(room.width, room.length)} />
      {Object.values(walls).filter(w => !effectivelyHidden.has(w.id)).map(w => (
        <WallMesh key={w.id} wall={w} isSelected={selectedIds.includes(w.id)} />
      ))}
      {Object.values(placedProducts).filter(pp => !effectivelyHidden.has(pp.id)).map(pp => {
        const product = productLibrary.find(p => p.id === pp.productId);
        return <ProductMesh key={pp.id} placed={pp} product={product} isSelected={selectedIds.includes(pp.id)} />;
      })}
      {Object.values(ceilings).filter(c => !effectivelyHidden.has(c.id)).map(c => (
        <CeilingMesh key={c.id} ceiling={c} isSelected={selectedIds.includes(c.id)} />
      ))}
      {Object.values(placedCustomElements).filter(p => !effectivelyHidden.has(p.id)).map(p => (
        <CustomElementMesh key={p.id} placed={p} element={customCatalog[p.customElementId]}
          isSelected={selectedIds.includes(p.id)} />
      ))}
    </group>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Scene renders active room only | Scene must render all rooms for NORMAL/EXPLODE | Phase 47 (this phase) | ThreeViewport refactor from single-room to multi-room render loop |
| cameraMode has no localStorage persistence | displayMode persists via `gsd:displayMode` | Phase 47 (this phase) | New uiStore persistence pattern — first field in uiStore to use localStorage |
| Material Symbols icons in Toolbar | lucide-react for new display-mode buttons | Phase 33 D-33 | Must not add new Material Symbol usages in Toolbar |

---

## Open Questions

1. **Should RoomGroup be a separate file or inline in ThreeViewport?**
   - What we know: Phase 46 extracted tree components into `src/components/RoomsTreePanel/`. ThreeViewport.tsx is already long.
   - Recommendation: Extract to `src/three/RoomGroup.tsx` for testability and readability.

2. **Should NORMAL show all rooms or just the active room?**
   - REQUIREMENTS.md says "all rooms render" in NORMAL. Current code shows only active room. Phase 47 should fix this by rendering all rooms in NORMAL mode. This is an intentional improvement.
   - Recommendation: NORMAL = all rooms. Planner should not treat this as scope creep — it is the specified behavior.

3. **Should the existing `effectivelyHidden` useMemo in Scene be removed or kept?**
   - If RoomGroup computes its own effectivelyHidden, the top-level useMemo in Scene becomes redundant.
   - Recommendation: Remove it from Scene level; move the logic into RoomGroup (one per room). Reduces duplicate computation.

---

## Environment Availability

> Skipped — Phase 47 is a pure-code feature with no external runtime dependencies. All required packages already installed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + Playwright (e2e) |
| Config file | `vitest.config.ts` (root), `playwright.config.ts` |
| Quick run command | `npm test -- --run src/__tests__/uiStore.displayMode.test.ts` |
| Full suite command | `npm test -- --run` |

**CI:** Vitest CI disabled (Phase 36-02). 6 pre-existing failures permanently accepted.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISPLAY-01 | `uiStore.displayMode` defaults to `"normal"` | unit | `npm test -- --run src/__tests__/uiStore.displayMode.test.ts` | ❌ Wave 0 |
| DISPLAY-01 | `setDisplayMode("solo")` updates store + writes `gsd:displayMode` to localStorage | unit | same file | ❌ Wave 0 |
| DISPLAY-01 | `readDisplayMode()` returns `"normal"` on unparseable localStorage value | unit | same file | ❌ Wave 0 |
| DISPLAY-01 | `readDisplayMode()` restores `"explode"` from localStorage | unit | same file | ❌ Wave 0 |
| DISPLAY-01 | Toolbar: 3 buttons render when viewMode is `"3d"` | integration | `npm test -- --run src/components/__tests__/Toolbar.displayMode.test.tsx` | ❌ Wave 0 |
| DISPLAY-01 | Toolbar: 3 buttons NOT rendered when viewMode is `"2d"` | integration | same file | ❌ Wave 0 |
| DISPLAY-01 | Toolbar: clicking SOLO button calls `setDisplayMode("solo")`; active state applied | integration | same file | ❌ Wave 0 |
| DISPLAY-01 | SOLO: only active room's meshes rendered; empty scene if `activeRoomId` null | unit/integration | `npm test -- --run src/__tests__/ThreeViewport.displayMode.test.tsx` | ❌ Wave 0 |
| DISPLAY-01 | EXPLODE: each room's group has correct `offsetX` per D-03 formula | unit | same file | ❌ Wave 0 |
| DISPLAY-01 | EXPLODE: `Object.keys(rooms)` order used for index (verified via `roomOffsets` useMemo) | unit | same file | ❌ Wave 0 |
| DISPLAY-01 | D-04: SOLO composes with hiddenIds (hidden wall stays hidden in SOLO) | unit | same file | ❌ Wave 0 |
| DISPLAY-01 | E2E: switch through NORMAL → SOLO → EXPLODE via toolbar; `aria-pressed` updates | e2e | `npx playwright test e2e/display-mode-cycle.spec.ts` | ❌ Wave 0 |
| DISPLAY-01 | E2E: displayMode persists to localStorage; survives page reload | e2e | same file | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --run src/__tests__/uiStore.displayMode.test.ts`
- **Per wave merge:** `npm test -- --run` + `npx playwright test e2e/display-mode-cycle.spec.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/uiStore.displayMode.test.ts` — field default, setter, localStorage round-trip
- [ ] `src/components/__tests__/Toolbar.displayMode.test.tsx` — 3 buttons render, click, viewMode gate
- [ ] `src/__tests__/ThreeViewport.displayMode.test.tsx` — SOLO filter, EXPLODE offset math (stub ok)
- [ ] `src/test-utils/displayModeDrivers.ts` — `installDisplayModeDrivers()`, `__driveDisplayMode`, `__getDisplayMode`
- [ ] `e2e/display-mode-cycle.spec.ts` — full mode cycle + persistence

**Framework install:** None — vitest + Playwright already installed.

---

## Estimated Task Breakdown

Phase 47 is smaller than Phase 46. Recommend 1 plan, 3 tasks:

| Task | Description | Primary File | Est. |
|------|-------------|--------------|------|
| 47-01 | uiStore: add `displayMode`, `setDisplayMode`, localStorage hydration | `uiStore.ts` | ~30 min |
| 47-02 | Toolbar: 3 display-mode buttons with viewMode gate | `Toolbar.tsx` | ~20 min |
| 47-03 | ThreeViewport: multi-room render (RoomGroup), SOLO filter, EXPLODE offsets | `ThreeViewport.tsx`, `RoomGroup.tsx` | ~45 min |
| 47-04 | Tests + drivers + e2e | new test files, `displayModeDrivers.ts` | ~30 min |

---

## Sources

### Primary (HIGH confidence)

- `src/stores/uiStore.ts` — full file read; cameraMode pattern, existing field shape
- `src/components/Toolbar.tsx` — full file read; Walk/Orbit gate (line 107), preset button anatomy (lines 147–162), viewMode gate patterns
- `src/three/ThreeViewport.tsx` — full file read; Scene single-room architecture confirmed (lines 54–59), effectivelyHidden useMemo (lines 78–102), render sites (lines 461, 470, 483, 488), Phase 46 Pitfall 7 comment
- `.planning/phases/47-room-display-modes-display-01/47-CONTEXT.md` — all 9 decisions read and honored
- `.planning/phases/46-rooms-hierarchy-sidebar-tree-tree-01/46-04-SUMMARY.md` — Phase 46 ThreeViewport implementation outcome confirmed
- `src/lib/uiPersistence.ts` — localStorage helper patterns; SSR-safe guard
- `src/lib/isHiddenInTree.ts` — Phase 46 cascade resolver; composition contract per D-04
- `src/stores/cadStore.ts` — `addRoom` (line 1018), `removeRoom`/`Object.keys(s.rooms)` (lines 1059–1063), Immer import (line 2), insertion-order stability confirmed
- `src/types/cad.ts` — `RoomDoc` interface (lines 174–189); all required fields present
- `src/test-utils/treeDrivers.ts` — Phase 46 driver pattern for `installDisplayModeDrivers()`
- `node_modules/lucide-react` — v1.8.0, `LayoutGrid`/`Square`/`Move3d` presence confirmed via CJS export list

### Secondary (MEDIUM confidence)

- `.planning/phases/46-rooms-hierarchy-sidebar-tree-tree-01/46-RESEARCH.md` — architecture precedent depth reference

### Tertiary (LOW confidence)

- None. Every recommendation is grounded in checked-in code.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all referenced modules verified
- Architecture: HIGH — direct extension of Phase 46 + Phase 35 patterns; group-position approach verified against Three.js/R3F conventions
- Pitfalls: HIGH — pitfalls 1 and 2 are verified against actual source code; others are recognized class hazards
- Persistence: HIGH — key namespace non-colliding (only `gsd:tree:` exists); pattern matches uiPersistence.ts
- Icon availability: HIGH — direct CJS require in node_modules confirmed all three icons

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days — only invalidated by major ThreeViewport refactor or cadStore rooms restructure, neither planned)
