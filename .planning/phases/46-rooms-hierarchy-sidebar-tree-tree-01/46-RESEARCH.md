# Phase 46: Rooms Hierarchy Sidebar Tree (TREE-01) — Research

**Researched:** 2026-04-26
**Domain:** React + Zustand UI architecture; recursive tree rendering; R3F render-skip predicates; camera dispatch via existing Phase 35 bridge.
**Confidence:** HIGH (every recommendation grounded in checked-in source — UI-SPEC, CONTEXT.md, REQUIREMENTS.md, and current `src/` code)

## Summary

Phase 46 adds a Rooms tree to `Sidebar.tsx` that lists every room in `cadStore.rooms`, with each room expanding to four grouped children (Walls / Ceiling / Products / Custom elements) and leaves under each group. Click selects + focuses; eye toggles visibility for the 3D viewport only.

The 13 locked decisions in `46-CONTEXT.md` plus the 250-line `46-UI-SPEC.md` constitute a near-complete contract — research's job is to lock the structural choices the planner now needs (component shape, tree-derivation function signature, store-shape diff for `uiStore`, camera dispatch shape for non-preset targets, persistence key namespace, test driver surface) and to specify the validation architecture.

**Primary recommendation:** Build `RoomsTreePanel` as a thin container that calls a pure `buildRoomTree(state)` selector returning a typed tree shape, then renders three small components (`RoomNode`, `GroupNode`, `LeafNode`) that share a `<TreeRow>` primitive matching the per-row anatomy in UI-SPEC. Add `hiddenIds: Set<string>` + `pendingCameraTarget` to `uiStore`. Reuse `pendingPresetRequest` for room-bbox framing, add a sibling `pendingCameraTarget` for arbitrary-pose dispatches (wall side reuses existing `focusWallSide`; product/ceiling/room compute pose then dispatch through `pendingCameraTarget`). Keep cascade visibility computed at-render-time from `hiddenIds` + parent ids — no derived state, no syncing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sidebar Placement & Default State**
- **D-01:** Rooms tree panel sits at the **top of the Sidebar, above Room config**. Highest discoverability slot.
- **D-02:** Default state on first load: **panel open, active room expanded, other rooms collapsed**.
- **D-03:** Persist open/closed state across sessions via **localStorage**, mirroring Phase 33 `CollapsibleSection` behavior. Each room's expanded state is remembered separately.

**Node Labels**
- **D-04:** Walls labeled by **cardinal direction** ("North wall", "East wall", "South wall", "West wall"). Computed from wall vector at render time. Diagonal walls (off-axis > ~22.5°) fall back to "Wall N" by index.
- **D-05:** Products and custom elements labeled as **catalog name + index when duplicates exist** (e.g., "Sofa", then "Sofa (2)"). Custom elements use `placedCustomElement.labelOverride` if set (Phase 31 D), otherwise catalog name + index.
- **D-06:** Ceilings render as a **single "Ceiling" node per room**.

**Click-to-Focus Camera Framing**
- **D-07:** **Wall click** → reuse existing **MIC-35 wall-side framing** via `useUIStore.focusWallSide(wallId, side)`.
- **D-08:** **Product / custom-element click** → **bbox-fit tween via Phase 35 infrastructure** at ~1.5× bbox diagonal, dispatched through the same easeInOutCubic pipeline.
- **D-09:** **Ceiling click** → tilt camera up to face the ceiling, room-bbox framed (room center at floor level looking straight up).
- **D-10:** **Room (top-level) click** → dual action: `cadStore.switchRoom()` AND frame the room bbox via Phase 35 tween.

**Visibility Scope & Cascade**
- **D-11:** Eye icon hides nodes from **3D viewport only**. 2D Fabric canvas remains unchanged.
- **D-12:** Hiding a parent **cascades to children**. Children render eye icon **dimmed** when parent-hidden (still individually toggleable when parent is shown again).
- **D-13:** Visibility state is **transient — always resets to all-visible on page load**. Not persisted, not in autosave snapshot, not in undo history.

### Claude's Discretion
- Group-level header rendering (collapsible vs plain — UI-SPEC recommends "always expanded, no persistence" for groups).
- Empty-state copy beyond the three UI-SPEC defaults (`No walls yet`, `No products placed`, `No custom elements placed`).
- Hover affordances and parent-hidden eye-icon dim styling (UI-SPEC pins specific tokens).
- Indent depth and connector-line styling (within Phase 33 design tokens — UI-SPEC sets pl-2 / pl-4 / pl-6).
- Whether ⌥/Alt-click "solo-show" polish ships (defer if not trivial).

### Deferred Ideas (OUT OF SCOPE)
- Per-node bookmarked camera + double-click "Focus" action → Phase 48 (CAM-04).
- Display modes (NORMAL / SOLO / EXPLODE) → Phase 47 (DISPLAY-01).
- Right-click context menu on tree nodes → Phase 48.
- Drag-to-reparent nodes between rooms.
- Search / filter within tree.
- Group-level "isolate" Alt-click action.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TREE-01 | Sidebar gains Rooms hierarchy tree: collapsible per room, child nodes grouped (Walls/Ceilings/Products/Custom Elements). Click-to-focus camera. Per-node eye toggle. `selectedIds` SOT. New `uiStore.hiddenIds: Set<string>` view-state. Reuses `CollapsibleSection`. lucide icons. | §Tree Derivation, §Store Shape Changes (uiStore), §Camera Dispatch, §Visibility Cascade Algorithm, §Component Architecture, §Test Driver Surface — every acceptance criterion has a named function/file path below |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Icon library (Phase 33 D-33):** lucide-react ONLY for new tree chrome. Do NOT add `material-symbols-outlined` for tree icons.
- **Spacing scale (D-34):** Multiples of 4 only. Zero `p-[Npx]` / `m-[Npx]` / `gap-[Npx]` / `rounded-[Npx]` arbitrary values in `Sidebar.tsx` or new tree files (per-file rule applies to Sidebar).
- **Typography (D-03):** Mixed-case static labels; UPPERCASE NOT used in tree (UI-SPEC §Typography casing rules).
- **Reduced motion (D-39):** Every new animation guards on `useReducedMotion()`. Snap when `matches === true`.
- **vitest CI:** disabled (Phase 36-02). Unit tests run locally via `npm test` only; do NOT add CI gates.
- **6 pre-existing vitest failures:** permanently accepted (Phase 37 D-02). New tree tests must NOT add to that count.
- **Substitute-evidence policy:** SUMMARY.md is canonical evidence; VERIFICATION.md optional.

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 18.3.1 | Component model | Project default |
| zustand | 5.0.12 | UI store extension (`hiddenIds`, `pendingCameraTarget`) | Project default; uiStore is plain Zustand (no Immer) so `Set<string>` mutations are direct |
| lucide-react | (installed Phase 33) | `ChevronRight`, `ChevronDown`, `Eye`, `EyeOff` | D-33 mandate |
| three | 0.183.2 | `Box3` / `Vector3` for product bbox + ceiling/room framing math | Already in use for Phase 35 preset poses |
| @react-three/fiber | 8.17.14 | Camera dispatch consumer in `ThreeViewport.tsx` | Existing |

### Supporting (no new packages)

Reuses 100% existing primitives:
- `src/components/Sidebar.tsx:16-42` `CollapsibleSection` (inline, NOT a separate file — UI-SPEC clarified this in §Existing primitives to reuse)
- `src/hooks/useReducedMotion.ts`
- `src/stores/cadStore.ts` selectors (`useActiveRoom`, etc.) — extend with `useAllRooms()` if needed for the tree
- `src/three/cameraPresets.ts` `getPresetPose()` pattern (model for new `getRoomBboxPose`, `getProductBboxPose`, `getCeilingPose`)

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recursive `<TreeNode>` | Flat list with `depth` field | Recursive is clearer for 3 fixed depths and Jessica's content profile (≤6 rooms × ≤4 groups × ≤30 leaves ≈ 720 rows worst case, comfortably within React's render budget without windowing) |
| Add tree-state to `cadStore` | uiStore (chosen) | cadStore mutations push history. Tree expand/collapse + visibility must NOT enter undo. uiStore is the correct home (D-13 + REQUIREMENTS.md acceptance) |
| New `pendingCameraTarget` field | Repurpose `pendingPresetRequest` with synthetic preset ids | `pendingPresetRequest.id: PresetId` is a typed union of 4 strings — extending it to accept arbitrary ids would either bloat the union or require a runtime escape hatch. Cleaner: sibling field `pendingCameraTarget: { pose: CameraPose; seq: number } \| null` |
| `react-arborist` / `react-complex-tree` | Hand-rolled tree | Adds a dependency for ≤720 rows with bespoke per-row anatomy locked by UI-SPEC. Hand-rolled is simpler and matches the UI-SPEC visual contract exactly. |

**Installation:** None — every dependency already in `package.json`.

**Version verification:** Not applicable — zero new packages.

## Architecture Patterns

### Recommended File Structure

```
src/
├── components/
│   └── RoomsTreePanel/
│       ├── RoomsTreePanel.tsx          # Top-level container, mounts in Sidebar
│       ├── RoomNode.tsx                # Depth-0 row: room name + expand/collapse + eye
│       ├── GroupNode.tsx               # Depth-1 row: "Walls" / "Ceiling" / "Products" / "Custom elements"
│       ├── LeafNode.tsx                # Depth-2 row: individual wall/ceiling/product/custom-element
│       ├── TreeRow.tsx                 # Shared row primitive — per-row anatomy from UI-SPEC
│       ├── buildRoomTree.ts            # Pure selector: state → typed tree structure
│       └── treeLabels.ts               # Pure label helpers (cardinal direction, dup index)
├── lib/
│   └── treeFraming.ts                  # Pure pose math: getProductBboxPose, getCeilingPose, getRoomBboxPose
└── stores/
    └── uiStore.ts                      # Add: hiddenIds, pendingCameraTarget, related actions
```

**Rationale:** New folder isolates the feature; pure helpers (`buildRoomTree`, `treeLabels`, `treeFraming`) are unit-testable without React; `TreeRow` enforces the per-row anatomy contract in one place.

### Pattern 1: Pure Tree Derivation

**What:** A selector function transforms `cadStore` data into a typed tree shape ready for render.

**When to use:** Inside `RoomsTreePanel` `useMemo`, recomputing only when the relevant store slices change.

**Example:**
```typescript
// src/components/RoomsTreePanel/buildRoomTree.ts
import type { RoomDoc, WallSegment, PlacedProduct, Ceiling, PlacedCustomElement, CustomElement } from "@/types/cad";
import { wallCardinalLabel, dedupeProductLabels, customElementLabel } from "./treeLabels";

export type TreeWallNode  = { kind: "wall";  id: string; label: string; parentRoomId: string; parentGroupId: string; data: WallSegment };
export type TreeCeilingNode = { kind: "ceiling"; id: string; label: "Ceiling"; parentRoomId: string; parentGroupId: string; data: Ceiling };
export type TreeProductNode = { kind: "product"; id: string; label: string; parentRoomId: string; parentGroupId: string; data: PlacedProduct };
export type TreeCustomNode  = { kind: "custom";  id: string; label: string; parentRoomId: string; parentGroupId: string; data: PlacedCustomElement };
export type TreeLeafNode = TreeWallNode | TreeCeilingNode | TreeProductNode | TreeCustomNode;

export type TreeGroupKind = "walls" | "ceiling" | "products" | "customs";
export type TreeGroupNode = {
  kind: "group";
  id: string;            // synthetic: `${roomId}:${groupKind}` — used for cascade-hide and React keys
  groupKind: TreeGroupKind;
  label: "Walls" | "Ceiling" | "Products" | "Custom elements";
  parentRoomId: string;
  children: TreeLeafNode[];
};

export type TreeRoomNode = {
  kind: "room";
  id: string;            // real room id from cadStore
  label: string;         // room.name verbatim
  isActive: boolean;     // matches activeRoomId
  groups: TreeGroupNode[];
};

export type TreeRoot = { rooms: TreeRoomNode[] };

export function buildRoomTree(args: {
  rooms: Record<string, RoomDoc>;
  activeRoomId: string | null;
  customElementCatalog: Record<string, CustomElement>;
  productLibrary: { id: string; name: string }[];
}): TreeRoot {
  // Iterate rooms in insertion order. For each room, build 4 group nodes
  // (Walls / Ceiling / Products / Customs). Inside each group, derive labels
  // and stable synthetic ids. Returns deeply frozen structure.
}
```

**Key invariants:**
- Synthetic group id format: `${roomId}:walls` / `${roomId}:ceiling` / `${roomId}:products` / `${roomId}:customs` — used for cascade-hide membership AND for `localStorage` namespace (groups don't persist, but the format is reusable).
- `room.id` (real) is the persistence key — `gsd:tree:room:${roomId}:expanded`.
- All leaf `id` fields are the existing real ids (`wall_xyz`, `pp_abc`, `pcust_def`, `ceiling_ghi`) — they flow directly into `selectedIds`.

### Pattern 2: Render-Skip Predicate (3D Visibility)

**What:** A pure function that takes `hiddenIds` + a leaf id + its parents and returns whether the 3D viewport should render the node.

**When to use:** In every `Object.values(walls).map(...)` / `placedProducts.map(...)` / `ceilings.map(...)` / `placedCustoms.map(...)` site inside `ThreeViewport.tsx` (lines 380-414 today).

**Example:**
```typescript
// src/three/visibility.ts
export function isHiddenInTree(args: {
  leafId: string;
  parentGroupId: string;  // synthetic, e.g. `room_main:walls`
  parentRoomId: string;
  hiddenIds: ReadonlySet<string>;
}): boolean {
  return (
    args.hiddenIds.has(args.leafId) ||
    args.hiddenIds.has(args.parentGroupId) ||
    args.hiddenIds.has(args.parentRoomId)
  );
}
```

Render sites become:
```typescript
{Object.values(walls).map((wall) => {
  if (isHiddenInTree({ leafId: wall.id, parentGroupId: `${activeRoomId}:walls`, parentRoomId: activeRoomId!, hiddenIds })) return null;
  return <WallMesh key={wall.id} wall={wall} isSelected={selectedIds.includes(wall.id)} />;
})}
```

**Visibility cascade math is pure read-only** — no derived `effectivelyHidden` set is stored anywhere. This guarantees D-12's "child-toggle preserved when parent restored" property automatically: the child's own `hiddenIds` membership is independent of the parent's.

### Pattern 3: Camera Dispatch Bridge

**What:** Three dispatch surfaces, each minimal:

| Click target | Existing API to use | Add to uiStore? |
|---|---|---|
| Wall leaf | `useUIStore.focusWallSide(wallId, "A")` | No — already exists |
| Room (depth 0) | `useCADStore.switchRoom(roomId)` + new `pendingCameraTarget` set to room-bbox pose | Yes — new field |
| Product / custom-element leaf | New `pendingCameraTarget` set to bbox-fit pose | Yes — new field |
| Ceiling leaf | New `pendingCameraTarget` set to tilt-up-from-floor pose | Yes — new field |

`ThreeViewport.tsx` adds ONE new `useEffect` that consumes `pendingCameraTarget` (mirrors the existing `pendingPresetRequest` consumer at lines 256-302):

```typescript
useEffect(() => {
  if (!pendingCameraTarget) return;
  if (cameraMode === "walk") { useUIStore.getState().clearPendingCameraTarget(); return; }
  const ctrl = orbitControlsRef.current;
  if (!ctrl?.object) { useUIStore.getState().clearPendingCameraTarget(); return; }
  const { pose } = pendingCameraTarget;
  if (prefersReducedMotion) {
    // snap (same shape as preset path)
  } else {
    presetTween.current = { ... };  // reuse the existing easeInOutCubic tween branch
  }
  useUIStore.getState().clearPendingCameraTarget();
}, [pendingCameraTarget, cameraMode, prefersReducedMotion]);
```

**Pose computation lives in `src/lib/treeFraming.ts`:**

```typescript
export function getRoomBboxPose(room: { width: number; length: number; wallHeight: number }): CameraPose {
  // Phase 35 "three-quarter" preset already does this — DELEGATE to getPresetPose("three-quarter", room).
  return getPresetPose("three-quarter", room);
}

export function getProductBboxPose(args: {
  product: { dimensions: { widthFt: number; depthFt: number; heightFt: number } };
  placed: PlacedProduct;
}): CameraPose {
  // 1.5× diagonal back from center, ~30° azimuth, 25° elevation.
  // Use resolveEffectiveDims() (Phase 31) for axis overrides.
}

export function getCeilingPose(room: { width: number; length: number; wallHeight: number }): CameraPose {
  // Camera at room center, floor level (y = 1ft), looking straight up.
  return {
    position: [room.width / 2, 1, room.length / 2],
    target: [room.width / 2, room.wallHeight, room.length / 2],
  };
}
```

### Anti-Patterns to Avoid

- **Storing `effectivelyHidden` derived state.** Cascade is pure read-time math; deriving it into store state creates sync bugs and gives false hits to D-12's "preserved when parent restored" requirement.
- **Putting `hiddenIds` in cadStore.** Triggers undo entries + autosave — explicit REQUIREMENTS.md and D-13 violation.
- **Using `JSON.stringify` to persist expand state.** Per-room boolean → simple key per room (`gsd:tree:room:room_main:expanded` = `"true"`). Mirrors existing CollapsibleSection pattern, lighter to read/write than a JSON blob.
- **Adding `Set<string>` to a Zustand store wrapped in Immer.** Immer wraps Sets but freezes them — fine for reads, tricky for `produce(s => s.hiddenIds.add(id))`. uiStore is plain Zustand (no Immer wrapper, see `cadStore.ts` vs `uiStore.ts`), so `set(s => ({ hiddenIds: new Set(s.hiddenIds).add(id) }))` is the correct shape.
- **Tree icons.** UI-SPEC §Visual Contract: omit type icons in v1. Do not import `Square`/`Hash`/`Package`/`Component` lucide glyphs.
- **Custom keyboard nav (arrow keys).** Out of scope per UI-SPEC §Keyboard. `Tab` + `Space`/`Enter` only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-room expand persistence | New localStorage abstraction | Same key-per-room pattern as the existing inline `CollapsibleSection` (no abstraction, just `localStorage.setItem` / `getItem`) | The existing component already proved this pattern works; matching it keeps mental load minimal |
| Camera tween for room/product/ceiling click | New tween loop in tree code | Add `pendingCameraTarget` consumer in `ThreeViewport.tsx` that reuses the existing `presetTween` ref + easeInOutCubic + reduced-motion snap branch (lines 282-301, 330-352) | Exact pattern Phase 35 already runs in production. Zero new motion code. |
| Wall side framing | New "look at wall" math | `useUIStore.focusWallSide(wallId, "A")` (already exists, MIC-35) | Identical to canvas click-to-focus; tree must drive the same path |
| Cardinal direction calc | A geometry utility module | Inline in `treeLabels.ts`: `Math.atan2(dy, dx)` → snap to N/E/S/W within ±22.5° | Used in exactly one place; abstraction adds friction |
| Tree row primitive | shadcn or third-party tree component | Hand-rolled 30-line `TreeRow` matching UI-SPEC anatomy | UI-SPEC pins the exact slot widths (16/4/16/4/flex/24); third-party trees fight back against that contract |
| Recursive flattening for keyboard nav | Build a flat-index map | Skip — no custom keyboard nav in v1 (UI-SPEC §Keyboard) | Out of scope |

**Key insight:** Every reusable abstraction TREE-01 needs already exists. The phase is 95% composition, 5% new code (mostly the tree-derivation selector and the three pose helpers).

## Common Pitfalls

### Pitfall 1: Eye-icon click triggers row select
**What goes wrong:** Clicking the eye toggles visibility AND selects the row + dispatches camera focus.
**Why it happens:** Default React event bubbling — eye is inside the clickable row.
**How to avoid:** UI-SPEC §Interaction Contract is explicit: eye `onClick` calls `e.stopPropagation()`. Verified pattern from `FloatingSelectionToolbar.tsx`.
**Warning signs:** Clicking the eye also moves the camera or changes selection in manual testing.

### Pitfall 2: Cascade visibility "lies" after restore
**What goes wrong:** User hides "Walls" group → all walls dimmed. User shows "Walls" group → walls don't restore because cascade overwrote individual `hiddenIds` membership.
**Why it happens:** Storing derived `effectivelyHidden` in state, OR removing children from `hiddenIds` when parent is hidden.
**How to avoid:** Cascade is pure read-time math via `isHiddenInTree()`. Never mutate child `hiddenIds` in response to parent toggles.
**Warning signs:** Toggling a group hide-then-show doesn't restore the same per-leaf hidden state the user had set previously.

### Pitfall 3: `hiddenIds` leaks into autosave
**What goes wrong:** `hiddenIds` ends up in CADSnapshot → undo restores stale visibility → "where did my couch go" confusion.
**Why it happens:** Adding `hiddenIds` to cadStore by accident, or persisting uiStore via the same path.
**How to avoid:** uiStore is the correct home (no Immer, no `pushHistory`, not in `snapshot()` at `cadStore.ts:122`). Verify `serialization.ts` does NOT serialize uiStore — confirmed by reading the existing autosave (only cadStore is serialized).
**Warning signs:** Reload restores hidden nodes; undo changes visibility.

### Pitfall 4: Diagonal walls display incorrect cardinal
**What goes wrong:** A 30° wall labeled "North wall" because of off-by-one in atan2 quadrant arithmetic.
**Why it happens:** `atan2(dy, dx)` returns radians in `(-π, π]`. Mapping to N/E/S/W requires careful angle bucketing; sign of `dy` flips because canvas y is downward.
**How to avoid:** Unit-test `wallCardinalLabel({start, end})` with 8 fixture cases (4 cardinals × 2 directions each — wall (0,0)→(0,5) and (0,5)→(0,0) should both label as the SAME cardinal because walls are bidirectional).
**Warning signs:** Manual: draw a vertical wall, see the wrong label.

### Pitfall 5: localStorage write storm during page hydration
**What goes wrong:** Per-room expand state hydrates → each `useState(initial)` runs → React re-renders → effects write back to localStorage → 6 writes per mount.
**Why it happens:** Naïve `useEffect(() => { localStorage.setItem(...) }, [open])` fires on initial render too.
**How to avoid:** Read once in `useState` initial, write only on user-driven toggle (in the `setOpen` handler, not in an effect).
**Warning signs:** DevTools → Storage tab shows excessive writes on mount.

### Pitfall 6: Tree dispatches camera while in walk mode
**What goes wrong:** User in walk mode clicks a tree leaf → camera tween fires → walk mode broken.
**Why it happens:** No mode guard.
**How to avoid:** Mirror Phase 35's existing guard in `ThreeViewport.tsx:260` (`if (cameraMode === "walk") { clear(); return; }`). The new `pendingCameraTarget` consumer must do the same. Also: tree could check `cameraMode === "walk"` upstream and skip the dispatch entirely (cleaner UX — selection still fires).

### Pitfall 7: Re-rendering the entire tree on every selection change
**What goes wrong:** Selecting a wall in canvas re-renders all 720 tree rows.
**Why it happens:** Tree component subscribes to `selectedIds` at the top and passes through.
**How to avoid:** Each `LeafNode` subscribes selectively: `const isSelected = useUIStore(s => s.selectedIds.includes(id))` — Zustand re-renders only the leaf whose selection changed. Same for `hiddenIds`. This is the standard Zustand pattern (used in `WallMesh.tsx` etc).
**Warning signs:** DevTools Profiler shows the tree's root re-rendering on every canvas click.

## Runtime State Inventory

> Skip — TREE-01 is a pure additive UI feature. No rename, no refactor, no migration. Existing data shapes are READ ONLY.

**Stored data:** None — `hiddenIds` is transient (D-13).
**Live service config:** None.
**OS-registered state:** None.
**Secrets / env vars:** None.
**Build artifacts:** None.

Verified by inspecting `src/stores/cadStore.ts:122` `snapshot()` (no `hiddenIds` reference exists), `src/lib/serialization.ts` (CADSnapshot only), and the autosave hook (cadStore-driven only).

## Code Examples

Verified patterns from existing project source.

### Existing CollapsibleSection (model for per-room expand state)

```typescript
// Source: src/components/Sidebar.tsx:16-42
function CollapsibleSection({ label, defaultOpen = true, children }: ...) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between mb-2 py-1">
        <h3 className="font-mono text-base font-medium text-text-muted">{label}</h3>
        <span className="font-mono text-sm text-text-ghost">{open ? "−" : "+"}</span>
      </button>
      {open && children}
    </div>
  );
}
```

**Note:** This is INLINE in `Sidebar.tsx`, NOT a `src/components/ui/CollapsibleSection.tsx` file (the path mentioned in CONTEXT.md is misleading — UI-SPEC corrects it). The new `RoomsTreePanel` should mount as a `<CollapsibleSection label="Rooms" defaultOpen>` using this inline component.

### Existing Phase 35 camera dispatch consumer (model for `pendingCameraTarget`)

```typescript
// Source: src/three/ThreeViewport.tsx:256-302 (abridged)
useEffect(() => {
  if (!pendingPresetRequest) return;
  if (cameraMode === "walk") { useUIStore.getState().clearPendingPresetRequest(); return; }
  const ctrl = orbitControlsRef.current;
  if (!ctrl?.object) { useUIStore.getState().clearPendingPresetRequest(); return; }
  const cam = ctrl.object as THREE.Camera;
  const pose = getPresetPose(pendingPresetRequest.id, room);
  if (prefersReducedMotion) {
    cam.position.set(pose.position[0], pose.position[1], pose.position[2]);
    ctrl.target.set(pose.target[0], pose.target[1], pose.target[2]);
    ctrl.update();
    presetTween.current = null;
  } else {
    presetTween.current = {
      fromPos: cam.position.clone(),
      fromTarget: ctrl.target.clone(),
      toPos: new THREE.Vector3(...pose.position),
      toTarget: new THREE.Vector3(...pose.target),
      startMs: performance.now(),
      durationMs: 600,
      presetId: pendingPresetRequest.id,
    };
  }
  useUIStore.getState().clearPendingPresetRequest();
}, [pendingPresetRequest, cameraMode, prefersReducedMotion, room]);
```

The new `pendingCameraTarget` consumer is a near-clone with `pose` arriving directly in the payload (no `getPresetPose` lookup). The `presetTween` ref shape needs `presetId?: PresetId` made optional, OR introduce a sibling `cameraTween` ref — planner's call. **Recommendation:** make `presetId` optional and reuse the same ref + the same `useFrame` branch (line 330-352). Saves 20 lines of duplicate tween logic.

### Existing test driver pattern (Phase 35, Phase 31)

```typescript
// Source: src/canvas/tools/selectTool.ts (pattern exemplar)
if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
  (window as any).__driveResize = (id: string, axis: "width" | "depth", valueFt: number) => { ... };
}
```

TREE-01 mirrors this exactly. New drivers (recommended in `RoomsTreePanel.tsx` or a sibling `treeTestDrivers.ts`):

| Driver | Purpose | Signature |
|---|---|---|
| `__driveTreeExpand` | Toggle a room's expand state | `(roomId: string) => void` |
| `__driveTreeVisibility` | Toggle a node's visibility | `(id: string) => void` (id may be leaf, group, or room) |
| `__driveTreeSelect` | Click-select a node (drives select + camera) | `(id: string, kind: "room" \| "wall" \| "product" \| "custom" \| "ceiling") => void` |
| `__getTreeState` | Inspect tree state for assertions | `() => { expanded: Record<string, boolean>; hiddenIds: string[] }` |

All gated on `import.meta.env.MODE === "test"` — production tree-shakes.

## Store Shape Changes

### `uiStore.ts` — add fields

```typescript
interface UIState {
  // ... existing ...
  hiddenIds: ReadonlySet<string>;
  pendingCameraTarget: { pose: CameraPose; seq: number } | null;

  toggleHidden: (id: string) => void;
  clearHidden: () => void;
  setCameraTarget: (pose: CameraPose) => void;
  clearPendingCameraTarget: () => void;
}
```

```typescript
// Initial state
hiddenIds: new Set<string>(),  // D-13: always empty on load — no rehydration
pendingCameraTarget: null,

// Actions
toggleHidden: (id) => set((s) => {
  const next = new Set(s.hiddenIds);
  if (next.has(id)) next.delete(id); else next.add(id);
  return { hiddenIds: next };
}),
clearHidden: () => set({ hiddenIds: new Set() }),
setCameraTarget: (pose) => set((s) => ({
  pendingCameraTarget: { pose, seq: (s.pendingCameraTarget?.seq ?? 0) + 1 },
})),
clearPendingCameraTarget: () => set({ pendingCameraTarget: null }),
```

**`CameraPose` type** is exported from `src/three/cameraPresets.ts`. Re-export from there or duplicate the type — planner's call. **Recommendation:** keep types in `cameraPresets.ts` (single source).

### `cadStore.ts` — NO mutations needed

Tree only reads. Add ONE new selector hook for convenience:

```typescript
// Append to src/stores/cadStore.ts after existing selectors
export const useAllRooms = () =>
  useCADStore((s) => s.rooms);  // Whole rooms record — RoomsTreePanel computes the tree shape downstream
```

## Persistence Contract

### localStorage keys (per UI-SPEC §Expand / collapse)

| Key | Value | When written | When read |
|---|---|---|---|
| `gsd:tree:room:${roomId}:expanded` | `"true"` / `"false"` | On user toggle of room chevron | On RoomNode mount; default = `roomId === activeRoomId` |
| `gsd:tree:panel:expanded` | `"true"` / `"false"` | On user toggle of "Rooms" panel itself | On RoomsTreePanel mount; default = `"true"` (D-02) |

**No JSON encoding** — plain string boolean to match existing CollapsibleSection convention. Keys are namespaced under `gsd:tree:` to avoid collision with other localStorage usage in the project (no other `gsd:tree:` keys exist today, verified by `grep -r "gsd:tree" src/`).

### Group-level state (Walls / Ceiling / Products / Customs)

**Always expanded, NOT persisted** (UI-SPEC §Expand / collapse). No localStorage entries.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `material-symbols-outlined` icons | lucide-react for new chrome | Phase 33 | Tree MUST use lucide |
| Arbitrary spacing values (`p-[12px]`) | Canonical 4-multiple scale | Phase 33 D-34 | Sidebar.tsx is in the per-file enforcement list |
| Single-room data model | Multi-room (`rooms: Record<string, RoomDoc>`) | (pre-Phase 31) | Tree iterates over `rooms`, not a single room |
| `pendingPresetRequest` only | Sibling `pendingCameraTarget` | Phase 46 (this phase) | Adds support for arbitrary poses without bloating the `PresetId` union |

**Deprecated/outdated:**
- N/A — this phase introduces no deprecations.

## Open Questions

1. **Reuse `presetTween` ref or new `cameraTween` ref?**
   - What we know: Phase 35's `presetTween` shape is `{ fromPos, fromTarget, toPos, toTarget, startMs, durationMs, presetId }`. The `presetId` field is only used to suppress restart of the same preset.
   - What's unclear: Whether tree-driven targets should also dedupe (e.g., clicking the same product twice mid-tween — should second click restart?).
   - Recommendation: Make `presetId` optional, add `targetKey?: string` for tree dispatches (synthetic key like `tree:wall:wall_xyz`), and use either field for the dedupe check. Single ref, single useFrame branch.

2. **Should canvas-click into a tree-hidden node un-hide it?**
   - What we know: 2D canvas always renders everything (D-11). 3D viewport skips hidden. If user clicks a hidden product in 3D … they can't, because it's not rendered. If they click in 2D, selection fires for an item that's invisible in 3D.
   - What's unclear: Is "select but stay invisible" acceptable, or should canvas-select implicitly un-hide?
   - Recommendation: Stay invisible. Visibility is independent of selection — UI-SPEC §Visibility-state foreground tokens already specifies a `Hidden + Selected` row state with both `text-text-ghost` (hidden) AND `text-accent-light` (selected) styling. Document this explicitly in the planner's task list.

3. **Empty room (zero walls AND zero products AND zero customs) in the tree?**
   - What we know: UI-SPEC handles per-group empty (`No walls yet`). Doesn't address all-empty room.
   - What's unclear: Do we render an entirely empty room with three "No X" placeholders + a Ceiling node? Looks weird but is technically correct.
   - Recommendation: Yes — render the standard tree even for empty rooms. Consistency wins over cleverness here. Planner's discretion to ship a fold-up "Empty room" pseudo-state if it reads better.

## Environment Availability

> Skip — TREE-01 is a pure-code feature with no external runtime dependencies. All required npm packages already installed (verified by reading `package.json` references in CLAUDE.md and unique imports in source).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit) — `src/__tests__/` exists with 60+ test files; Playwright (e2e) — `tests/e2e/specs/` |
| Config file | `vitest.config.ts` (root) — exists; Playwright config at `playwright.config.ts` |
| Quick run command | `npm test -- --run src/__tests__/RoomsTreePanel.tree.test.tsx` |
| Full suite command | `npm test -- --run` (vitest); `npx playwright test` (e2e) |

**CI status:** Vitest CI is DISABLED (Phase 36-02). Tests run locally only. 6 pre-existing failures permanently accepted (Phase 37 D-02). New tests must NOT add to that count.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| TREE-01 | `buildRoomTree(state)` returns correct structure (rooms × 4 groups × leaves) | unit | `npm test -- --run src/__tests__/RoomsTreePanel.buildRoomTree.test.ts` | ❌ Wave 0 |
| TREE-01 | Cardinal direction labels (8 fixture walls — 4 cardinals × 2 directions) | unit | `npm test -- --run src/__tests__/RoomsTreePanel.treeLabels.test.ts` | ❌ Wave 0 |
| TREE-01 | Duplicate product label deduping (`Sofa`, `Sofa (2)`, `Sofa (3)`) | unit | same file as above | ❌ Wave 0 |
| TREE-01 | `customElement.labelOverride` wins over catalog name | unit | same file as above | ❌ Wave 0 |
| TREE-01 | `uiStore.toggleHidden` adds/removes from `hiddenIds` Set | unit | `npm test -- --run src/__tests__/uiStore.tree.test.ts` | ❌ Wave 0 |
| TREE-01 | `isHiddenInTree` cascade: child hidden iff own/group/room id in `hiddenIds` | unit | `npm test -- --run src/__tests__/RoomsTreePanel.visibility.test.ts` | ❌ Wave 0 |
| TREE-01 | Cascade restore: hide group → show group → child's prior hidden state preserved | unit | same file as above | ❌ Wave 0 |
| TREE-01 | `hiddenIds` not in CADSnapshot — undo doesn't change visibility | unit | `npm test -- --run src/__tests__/cadStore.snapshot.test.ts` (extend existing) | ⚠️ Existing |
| TREE-01 | Tree click-select drives `uiStore.selectedIds` (parity with canvas click) | integration | `npm test -- --run src/__tests__/RoomsTreePanel.select.test.tsx` | ❌ Wave 0 |
| TREE-01 | Eye-icon click stops propagation (does NOT trigger select/focus) | integration | same file as above | ❌ Wave 0 |
| TREE-01 | Per-room expand persists to localStorage and rehydrates on remount | integration | `npm test -- --run src/__tests__/RoomsTreePanel.persistence.test.tsx` | ❌ Wave 0 |
| TREE-01 | localStorage NOT written for group-level expand (groups always-expanded, not persisted) | integration | same file as above | ❌ Wave 0 |
| TREE-01 | `pendingCameraTarget` dispatched with correct pose for room/product/ceiling | integration | `npm test -- --run src/__tests__/treeFraming.test.ts` | ❌ Wave 0 |
| TREE-01 | Wall click calls `useUIStore.focusWallSide(wallId, "A")` (existing path) | integration | `npm test -- --run src/__tests__/RoomsTreePanel.cameraDispatch.test.tsx` | ❌ Wave 0 |
| TREE-01 | Walk mode guards: tree click in walk mode does NOT dispatch camera | integration | same file as above | ❌ Wave 0 |
| TREE-01 | Reduced-motion: `pendingCameraTarget` consumer snaps instead of tweening | integration | same file as above | ❌ Wave 0 |
| TREE-01 | E2E — drive `__driveTreeSelect("wall_xyz", "wall")` → 3D camera moves to wall side | e2e | `npx playwright test tests/e2e/specs/tree-select-wall.spec.ts` | ❌ Wave 0 |
| TREE-01 | E2E — drive `__driveTreeVisibility("room_main:walls")` → no walls render in 3D | e2e | `npx playwright test tests/e2e/specs/tree-visibility-cascade.spec.ts` | ❌ Wave 0 |
| TREE-01 | E2E — expand state survives page reload | e2e | `npx playwright test tests/e2e/specs/tree-expand-persistence.spec.ts` | ❌ Wave 0 |
| TREE-01 | E2E — `hiddenIds` resets to empty on page reload (D-13) | e2e | same file as above | ❌ Wave 0 |
| TREE-01 | E2E — empty room renders empty-state copy in each group | e2e | `npx playwright test tests/e2e/specs/tree-empty-states.spec.ts` | ❌ Wave 0 |
| TREE-01 | Manual UAT — large room (60 walls + 200 products) renders in <100ms initial paint | manual-only | n/a — DevTools profiler check | ⚠️ Manual |
| TREE-01 | Manual UAT — Tab traversal hits chevron → label → eye → next row | manual-only | n/a — keyboard inspection | ⚠️ Manual |

**Manual-only justification:** Performance profiling and keyboard traversal are inherently observational; automating them adds maintenance cost without reliability gain. Both go in HUMAN-UAT.md.

### Sampling Rate

- **Per task commit:** `npm test -- --run src/__tests__/RoomsTreePanel.{buildRoomTree,treeLabels,visibility}.test.ts` (3 fastest unit files, < 5s)
- **Per wave merge:** `npm test -- --run` (full vitest, ~30s) + `npx playwright test tests/e2e/specs/tree-*.spec.ts` (4 new specs, ~60s)
- **Phase gate:** Full suite green (excluding the 6 pre-existing permanent failures) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/RoomsTreePanel.buildRoomTree.test.ts` — covers tree shape derivation
- [ ] `src/__tests__/RoomsTreePanel.treeLabels.test.ts` — cardinal labels + dedupe + labelOverride
- [ ] `src/__tests__/uiStore.tree.test.ts` — `hiddenIds` actions, `pendingCameraTarget` actions
- [ ] `src/__tests__/RoomsTreePanel.visibility.test.ts` — `isHiddenInTree` cascade math
- [ ] `src/__tests__/RoomsTreePanel.select.test.tsx` — click-select integration with React Testing Library
- [ ] `src/__tests__/RoomsTreePanel.persistence.test.tsx` — localStorage hydration / write
- [ ] `src/__tests__/RoomsTreePanel.cameraDispatch.test.tsx` — camera dispatch + walk-mode guard + reduced-motion
- [ ] `src/__tests__/treeFraming.test.ts` — pure pose math
- [ ] `tests/e2e/specs/tree-select-wall.spec.ts`
- [ ] `tests/e2e/specs/tree-visibility-cascade.spec.ts`
- [ ] `tests/e2e/specs/tree-expand-persistence.spec.ts`
- [ ] `tests/e2e/specs/tree-empty-states.spec.ts`
- [ ] Test drivers in `RoomsTreePanel.tsx` (or `src/components/RoomsTreePanel/treeTestDrivers.ts`): `__driveTreeExpand`, `__driveTreeVisibility`, `__driveTreeSelect`, `__getTreeState`

**Framework install:** None — vitest + Playwright already installed.

## Sources

### Primary (HIGH confidence)
- `46-CONTEXT.md` (locked decisions D-01..D-13) — read in full
- `46-UI-SPEC.md` (250-line design contract, status: approved) — read in full
- `46-DISCUSSION-LOG.md` (audit trail of alternatives considered)
- `.planning/REQUIREMENTS.md` § TREE-01 (acceptance criteria)
- `.planning/STATE.md` (current phase position + carry-over tech debt)
- `src/components/Sidebar.tsx` (mount point + inline `CollapsibleSection`)
- `src/stores/uiStore.ts` (extension target — plain Zustand, no Immer)
- `src/stores/cadStore.ts` (read-only data source; verified `snapshot()` excludes uiStore)
- `src/three/ThreeViewport.tsx` lines 256-302, 380-414 (camera dispatch + render sites)
- `src/three/cameraPresets.ts` (`CameraPose` type, `getPresetPose` model)
- `src/hooks/useReducedMotion.ts` (D-39 guard)
- `src/canvas/tools/selectTool.ts` (test driver pattern exemplar)
- `.planning/config.json` (`nyquist_validation: true` — Validation Architecture required)

### Secondary (MEDIUM confidence)
- CLAUDE.md (project) — design system tokens, icon policy, spacing scale
- Existing Phase 31 / Phase 35 / Phase 33 conventions (drag-transaction pattern, preset tween, lucide-react migration)

### Tertiary (LOW confidence)
- None. Every recommendation is grounded in checked-in code or locked spec.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all referenced modules verified to exist with expected exports
- Architecture: HIGH — direct extension of Phase 35 dispatch pattern; pure-selector tree shape is a standard React idiom
- Pitfalls: HIGH — pitfalls 1, 3, 6, 7 verified against existing source patterns; pitfalls 2, 4, 5 are recognized class hazards with concrete avoidance strategies
- Persistence: HIGH — localStorage key namespace verified non-colliding via grep
- Validation: HIGH — sampling rate matches existing project test discipline (Phase 31, 35 patterns)

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days — feature is fully internal; only invalidator would be a major change to `ThreeViewport.tsx` camera dispatch architecture, which is currently stable post-Phase 35)
