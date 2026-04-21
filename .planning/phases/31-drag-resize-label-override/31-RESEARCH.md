# Phase 31: Drag-to-Resize + Label Override — Research

**Researched:** 2026-04-20
**Domain:** Fabric.js interaction tools, Zustand drag-transaction pattern, per-axis geometry math, Phase 30 snap integration, PropertiesPanel inline-edit UX
**Confidence:** HIGH — all decisions locked in CONTEXT.md; research is tactical wiring of already-proven patterns.

## Summary

This is a hardening/enhancement phase. Every architectural question is already answered in `31-CONTEXT.md` (D-01..D-17). The planner needs concrete signatures, file-level edit targets, and a test-harness strategy — not architectural exploration.

The three deliverables:
1. **Per-axis product resize.** Extend `resizeHandles.ts` with N/S/E/W edge-midpoint hit-tests; add store actions that write new optional `widthFtOverride` / `depthFtOverride` fields; route every dimension consumer through a new `resolveEffectiveDims(product, placed)` helper.
2. **Wall-endpoint smart-snap.** Wire `computeSnap()` + `renderSnapGuides()` into the existing `"wall-endpoint"` branch of `selectTool.ts` (~L875), using the Phase 30 snap engine with a restricted scene (wall endpoints + wall midpoints only; no product bboxes).
3. **Custom-element label override.** Add `PlacedCustomElement.labelOverride?: string`; add `updatePlacedCustomElement` store action (current `updateCustomElement` mutates the catalog, NOT the placement — new action required); add inline-edit input to `PropertiesPanel` mirroring the Phase 29 `EditableRow` commit-on-Enter/blur pattern; look up override in `fabricSync.ts:85` label render.

**Primary recommendation:** Follow the Phase 30 playbook exactly — pure-module math, store drag transactions via `pushHistory` at drag-start + `NoHistory` mid-drag, test bridges under `import.meta.env.MODE === "test"`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Product Resize Semantics (EDIT-22):**
- **D-01:** Lazy per-axis override. Keep uniform `sizeScale` as default (preserves aspect ratio). Add optional `widthFtOverride?: number` and `depthFtOverride?: number` on `PlacedProduct` and `PlacedCustomElement`. Set ONLY when an edge handle is dragged.
- **D-02:** When any override is present, resolver returns `override ?? (libraryDim × sizeScale)`. Clearing override reverts to `sizeScale`-driven uniform behavior.
- **D-03:** Corner handles → uniform (`sizeScale`). Edge handles (4 new N/S/E/W midpoint hit-tests) → one-axis override. Grid-snap via `uiStore.gridSnap`.
- **D-04:** No migration — new fields optional.

**Wall Endpoint Smart-Snap (EDIT-23, closes D-08b):**
- **D-05:** Invoke `snapEngine.computeSnap()` with snap targets = other wall endpoints + wall midpoints only. Product bboxes excluded.
- **D-06:** Shift-orthogonal takes precedence over smart-snap. Compute ortho-constrained candidate FIRST, then apply snap restricted to locked axis targets.
- **D-07:** Alt/Option disables smart-snap, keeps grid-snap.
- **D-08:** Reuse `snapGuides.ts` accent-purple guides as-is.

**Label Override UX (CUSTOM-06):**
- **D-09:** Input in `PropertiesPanel` when `PlacedCustomElement` selected. Live preview on keystroke (no debounce).
- **D-10:** Commit history entry on Enter OR blur — one entry per edit session, mirror Phase 29 dimension-label editor.
- **D-11:** Placeholder = catalog name (ghost text). Empty string reverts to catalog name.
- **D-12:** `maxLength={40}` client-side.
- **D-13:** Field `PlacedCustomElement.labelOverride?: string`. Round-trips through save/load + undo/redo.
- **D-14:** Render `labelOverride?.toUpperCase() ?? customElement.name.toUpperCase()` at `fabricSync.ts:85`.

**Label Override Scope:**
- **D-15:** CUSTOM-06 strictly `PlacedCustomElement`. Catalog `PlacedProduct` override deferred.

**Single-Undo Hardening (EDIT-24):**
- **D-16:** Keep D-03 drag-transaction pattern (`pushHistory` via empty `update*(id, {})` at drag start, `*NoHistory` mid-drag). No new store API for the pattern itself.
- **D-17:** Red regression tests assert `past.length` +1 for: (a) corner resize, (b) edge resize, (c) wall endpoint drag. Use `window.__drive*` driver hooks (Phase 29/30 style).

### Claude's Discretion

- Exact pixel size/color of new edge handles (match corner-handle style)
- Exact location of label-override input within `PropertiesPanel` section hierarchy
- Test driver naming (`window.__driveResize`, `window.__driveWallEndpoint`, `window.__driveLabelOverride`)
- Whether to add a "RESET" affordance next to label input or rely on empty-reverts semantics

### Deferred Ideas (OUT OF SCOPE)

- Label override on catalog `PlacedProduct` (future phase, natural extension)
- Non-aspect-locked custom-element shape editing (taper/skew)
- Multi-select drag-resize
- Rotated-product orientation-aware edge handles (v1 uses object-local axes regardless of screen orientation)
- Wall-endpoint snap to product bbox edges (excluded by D-05)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDIT-22 | Corner + edge resize handles on selected product; drag updates `widthFt`/`lengthFt`, snapped to `uiStore.gridSnap`. | §Product Edge-Handle Hit-Test, §Per-Axis Resize Store API, §Effective-Dimension Resolver |
| EDIT-23 | Wall endpoint handles; drag updates start/end point; Shift constrains orthogonal. | §Wall-Endpoint Smart-Snap Integration |
| EDIT-24 | Drag-resize commits a single undo entry at mouseup; preserves Phase 25 fast-path (`shouldSkipRedrawDuringDrag`, `renderOnAddRemove: false`). | §Single-Undo Regression Test Strategy, §Drag-Transaction Pattern |
| CUSTOM-06 | PropertiesPanel label-override input on `PlacedCustomElement`; canvas renders override; empty reverts; persists with project. | §Label Override Data Flow |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tool cleanup pattern:** Every canvas tool's `activate*(fc, scale, origin)` returns a `() => void` cleanup. Phase 31 doesn't activate a new tool (selectTool already owns these drag branches), so cleanup additions go inside selectTool's existing `() => { ... }` cleanup closure — specifically, ensure `clearSnapGuides(fc)` runs on tool deactivate and on drag end.
- **`*NoHistory` action variants:** Mid-drag mutations MUST use NoHistory variants. Any new per-axis resize action MUST come in both `resizeProductAxis` + `resizeProductAxisNoHistory` pairs.
- **Alt/Option convention:** Holding Alt disables smart-snap, keeps grid-snap. Already established in Phase 30; re-apply on wall-endpoint branch.
- **UI label convention:** `font-mono` IBM Plex Mono, uppercase — e.g. `LABEL`, `LABEL_OVERRIDE`. Label-override input placeholder should be uppercase catalog name to match the canvas render.
- **Test mode gating:** Driver bridges exposed under `import.meta.env.MODE === "test"` only.
- **GSD workflow:** All edits through a GSD command. This phase is `/gsd:execute-phase`-driven.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fabric.js | ^6.9.1 | 2D canvas event handling, line/group objects for handles | Already powers all 2D interactions; extending existing `selectTool` handlers |
| Zustand + Immer | ^5.0.12 / ^11.1.4 | Store drag transactions via `set(produce(...))` + `pushHistory` | Existing `*NoHistory` variants battle-tested since Phase 25 |
| Vitest | ^4.1.2 | Unit + integration tests | Project already on vitest; `happy-dom` + `jsdom` both available |
| @testing-library/react | ^16 | PropertiesPanel label-override input tests | Used by existing `__tests__/` suite |
| happy-dom | ^20.8.9 | Test DOM for Fabric canvas integration tests | Phase 29/30 pattern uses happy-dom for canvas tests |

### Supporting (internal — reused, not installed)

| Module | Purpose | When to Use |
|--------|---------|-------------|
| `snapEngine.computeSnap()` | Pure snap calculation | Wall-endpoint drag on mousemove |
| `snapEngine.buildSceneGeometry()` | Materialize scene once per drag start | At wall-endpoint mousedown — BUT with a wall-endpoints-only variant (see Pattern 4) |
| `snapGuides.renderSnapGuides()` | Accent-purple guide lines + midpoint dots | Every mousemove during wall-endpoint drag |
| `snapGuides.clearSnapGuides()` | Idempotent cleanup | On mouseup, on tool switch, on cleanup |
| `resizeHandles.getResizeHandles()` | Existing corner-handle world positions | Extend to also return edge midpoints |
| `types/product.ts::effectiveDimensions()` | Current scale-based resolver | **REPLACE all call sites** with new `resolveEffectiveDims(product, placed)` that also reads overrides |

**Version verification:** All versions pulled from `package.json` as of 2026-04-20. No new package installs required.

**Installation:** None — pure in-repo work.

## Architecture Patterns

### Recommended File Layout

```
src/
├── canvas/
│   ├── resizeHandles.ts         # EXTEND: add edge-midpoint hit-tests + getters
│   ├── wallEndpointSnap.ts      # NEW: wall-endpoint-only SceneGeometry builder + snap driver
│   ├── snapEngine.ts            # unchanged
│   ├── snapGuides.ts            # unchanged (reuse)
│   ├── fabricSync.ts            # EDIT: label lookup at L85 reads labelOverride
│   └── tools/
│       └── selectTool.ts        # EDIT: new "product-resize-edge" dragType, wire snap on "wall-endpoint"
├── stores/
│   └── cadStore.ts              # EDIT: new actions + updatePlacedCustomElement
├── types/
│   ├── cad.ts                   # EDIT: add labelOverride + override fields to interfaces
│   └── product.ts               # EDIT: add resolveEffectiveDims (or wrap effectiveDimensions)
├── components/
│   └── PropertiesPanel.tsx      # EDIT: add LabelOverrideInput block for custom elements
└── canvas/tools/__tests__/      # CREATE: new test file for phase 31 regression
```

### Pattern 1: Edge-Handle Hit-Test (Extend `resizeHandles.ts`)

**What:** Add rotation-aware edge-midpoint handles to the existing corner-handle infrastructure.

**When to use:** `onMouseDown` in `selectTool.ts` when a single product or custom element is selected. Edge hit-test runs **after** corner hit-test (corners win ties — see Pitfall 1).

**Example signature:**
```typescript
// src/canvas/resizeHandles.ts (extended)

export type CornerHandle = "ne" | "nw" | "sw" | "se";
export type EdgeHandle = "n" | "s" | "e" | "w";
export type ResizeHandle = CornerHandle | EdgeHandle;

/** Return all 8 handle positions (4 corners + 4 edge midpoints) in world feet,
 *  rotation-aware (mirrors existing getResizeHandles). */
export function getAllResizeHandles(
  pp: PlacedProduct | PlacedCustomElement,
  widthFt: number,
  depthFt: number,
): Record<ResizeHandle, Point>;

/** Hit-test priority: corners first (they sit at the bbox corners and may
 *  visually overlap edge handles at small sizes), then edges. */
export function hitTestAllResizeHandles(
  pointerFt: Point,
  pp: PlacedProduct | PlacedCustomElement,
  widthFt: number,
  depthFt: number,
): ResizeHandle | null;
```

**Local (pre-rotation) coords:**
- Corners: `ne=(+hw,-hd)`, `nw=(-hw,-hd)`, `sw=(-hw,+hd)`, `se=(+hw,+hd)` — already in file
- Edges: `n=(0,-hd)`, `s=(0,+hd)`, `e=(+hw,0)`, `w=(-hw,0)` — new

Apply the same `rad = (pp.rotation * Math.PI) / 180` rotation + `pp.position` translation.

### Pattern 2: Per-Axis Resize Store Actions

**Signatures (pair of history + NoHistory, mirroring `resizeProduct/NoHistory`):**

```typescript
// Apply a per-axis absolute value (feet). Called once at drag start
// (via empty `updatePlacedProduct(id, {})` pattern OR dedicated `resizeProductAxis(id, axis, value)`
// — RECOMMENDATION: pass value at start to push a clean pre-state, then use NoHistory mid-drag).

resizeProductAxis: (id: string, axis: "width" | "depth", valueFt: number) => void;
resizeProductAxisNoHistory: (id: string, axis: "width" | "depth", valueFt: number) => void;

resizeCustomElementAxis: (id: string, axis: "width" | "depth", valueFt: number) => void;
resizeCustomElementAxisNoHistory: (id: string, axis: "width" | "depth", valueFt: number) => void;
```

**Implementation rule:** Writing an axis override does NOT touch `sizeScale`. Clearing both overrides (via a separate "reset to aspect-lock" action or explicit `undefined` pass) restores `sizeScale` behavior. Recommended reset API:

```typescript
clearProductOverrides: (id: string) => void; // sets widthFtOverride/depthFtOverride undefined
clearCustomElementOverrides: (id: string) => void;
```

Both clamp to sensible bounds: `Math.max(0.25, Math.min(50, valueFt))` — matching the `PLACEHOLDER_DIM_FT=2` + 10× ceiling used elsewhere.

**Drag-transaction flow (mirrors D-03):**
1. Mousedown on edge handle → `resizeProductAxis(id, axis, initialValue)` — pushes one history entry.
2. Mousemove → `resizeProductAxisNoHistory(id, axis, liveValue)` — no history push.
3. Mouseup → no additional store write (canvas already consistent).
4. Assert: `past.length` delta = exactly 1.

### Pattern 3: Effective-Dimension Resolver (Central Helper)

**What:** Single function every consumer calls to get runtime product dimensions. Replaces direct `effectiveDimensions(product, sizeScale)` calls.

**Where it lives:** `src/types/product.ts` (or a new `src/lib/placedDims.ts` if we want to avoid circularity — `types/cad` imports from `types/product` currently works, so staying in `product.ts` is fine).

**Signature:**
```typescript
import type { PlacedProduct, PlacedCustomElement, CustomElement } from "@/types/cad";

/** Resolve effective render dimensions accounting for per-axis overrides (D-02).
 *  Priority: override ?? (libraryDim × sizeScale). Uniform sizeScale when neither override present. */
export function resolveEffectiveDims(
  product: Product | undefined | null,
  placed: Pick<PlacedProduct, "sizeScale" | "widthFtOverride" | "depthFtOverride">,
): { width: number; depth: number; height: number; isPlaceholder: boolean };

/** Same for custom elements — catalog shape is CustomElement, not Product. */
export function resolveEffectiveCustomDims(
  el: CustomElement | undefined,
  placed: Pick<PlacedCustomElement, "sizeScale" | "widthFtOverride" | "depthFtOverride">,
): { width: number; depth: number; height: number };
```

**Consumers to migrate (enumerated from grep):**

| File | Line(s) | Current call | Action |
|------|---------|--------------|--------|
| `src/three/ProductMesh.tsx` | 13 | `effectiveDimensions(product, placed.sizeScale)` | Replace with `resolveEffectiveDims(product, placed)` |
| `src/canvas/fabricSync.ts` | 811 | `effectiveDimensions(product, pp.sizeScale)` | Same |
| `src/canvas/snapEngine.ts` | 186 | `effectiveDimensions(prod, pp.sizeScale ?? 1)` | Same — snap scene must respect overrides |
| `src/canvas/tools/selectTool.ts` | 82, 291, 588, 855 | Multiple — hit-test + resize + size tag | Same |
| `src/canvas/tools/productTool.ts` | 90 (placement preview) | — comment reference only, may not need migration | Verify during planning |
| Any custom-element rendering sites in `fabricSync.ts` around L60-100 | — | currently reads `el.width * sc` / `el.depth * sc` inline | **Replace with `resolveEffectiveCustomDims(el, pce)`** |

**Why central:** If overrides are ignored in ANY consumer, the 2D bbox drifts from the 3D mesh, hit-test drifts from visual, snap engine drifts from reality. One helper, one source of truth.

### Pattern 4: Wall-Endpoint Smart-Snap Integration

**What:** Extend the existing `"wall-endpoint"` drag branch in `selectTool.ts` (~L875) to invoke `computeSnap()` with a restricted scene, then render guides.

**Restricted scene construction (NEW helper):**

```typescript
// src/canvas/wallEndpointSnap.ts (NEW)

import type { SceneGeometry } from "@/canvas/snapEngine";
import type { WallSegment } from "@/types/cad";

/** Build a scene containing ONLY other wall endpoints + wall midpoints (D-05).
 *  Product / ceiling / custom-element bboxes intentionally excluded. */
export function buildWallEndpointSnapScene(
  walls: Record<string, WallSegment>,
  draggedWallId: string,
): SceneGeometry {
  // Each other-wall contributes:
  //   - endpoints as BBoxes with minX=maxX=endpoint.x, minY=maxY=endpoint.y (object-edge priority)
  //   - midpoint with axis classification (classifyAxis)
  // NO wallEdges (we're not snapping the endpoint to a wall face — we're snapping to endpoints).
  // Return { wallEdges: [], wallMidpoints: [...], objectBBoxes: [endpointBoxes] }
}
```

**Rationale for mapping endpoints → objectBBoxes:** The existing `computeSnap()` loop scans `objectBBoxes` for min/max X/Y targets. A zero-size bbox at an endpoint contributes that endpoint's X and Y as `object-edge` targets (priority 2, beats generic wall-face). This reuses the engine without modification.

**Drag-time flow (pseudocode for L875–L905 in selectTool.ts):**

```typescript
if (dragType === "wall-endpoint") {
  if (!wallEndpointWhich || dragPre?.kind !== "wall-endpoint") return;
  const gridSnap = useUIStore.getState().gridSnap;
  const shiftHeld = (opt.e as MouseEvent).shiftKey === true;
  const altHeld = (opt.e as MouseEvent).altKey === true;

  // 1. Candidate raw point.
  let candidate = { ...feet };

  // 2. Shift-orthogonal (D-06) — takes precedence, lock to major axis of opposite endpoint.
  if (shiftHeld) {
    const anchor = wallEndpointWhich === "start" ? dragPre.origWall.end : dragPre.origWall.start;
    const dx = Math.abs(feet.x - anchor.x);
    const dy = Math.abs(feet.y - anchor.y);
    if (dx > dy) candidate.y = anchor.y; // horizontal lock
    else          candidate.x = anchor.x; // vertical lock
  }

  // 3. Smart-snap (unless Alt held — D-07).
  let snapped = candidate;
  let guides: SnapGuide[] = [];
  if (!altHeld) {
    const scene = cachedEndpointScene; // built at mousedown
    const degenerateBBox = {
      id: "wall-endpoint-candidate",
      minX: candidate.x, maxX: candidate.x,
      minY: candidate.y, maxY: candidate.y,
    };
    const result = computeSnap({
      candidate: { pos: candidate, bbox: degenerateBBox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale,
      gridSnap,
    });
    snapped = result.snapped;
    guides = result.guides;

    // D-06: if shift-locked, discard snap on the locked axis so ortho wins.
    if (shiftHeld) {
      const anchor = wallEndpointWhich === "start" ? dragPre.origWall.end : dragPre.origWall.start;
      const dx = Math.abs(feet.x - anchor.x);
      const dy = Math.abs(feet.y - anchor.y);
      if (dx > dy) snapped.y = anchor.y;
      else          snapped.x = anchor.x;
    }
  } else if (gridSnap > 0) {
    snapped = snapPoint(candidate, gridSnap);
  }

  // 4. Render guides (or clear if alt/none).
  renderSnapGuides(fc, guides, scale, origin);

  // 5. Apply to fabric (existing D-03 fast path).
  const newStart = wallEndpointWhich === "start" ? snapped : dragPre.origWall.start;
  const newEnd   = wallEndpointWhich === "end"   ? snapped : dragPre.origWall.end;
  applyWallShapeToFabric(dragPre.fabricObjs, newStart, newEnd, dragPre.origWall.thickness);
  fc.requestRenderAll();
  lastDragWallStart = newStart;
  lastDragWallEnd = newEnd;

  // Live length tag (unchanged).
  // ...
  return;
}
```

**Scene cache timing:** Build `cachedEndpointScene` ONCE at the `wall-endpoint` mousedown branch (L646-658 area). Treat it like `cachedScene` for products (see selectTool L735-745).

**Mouseup additions:** After existing final commit, call `clearSnapGuides(fc)` and null the cached scene.

### Pattern 5: Label Override Data Flow

**Schema change (`src/types/cad.ts`):**

```typescript
export interface PlacedCustomElement {
  id: string;
  customElementId: string;
  position: Point;
  rotation: number;
  sizeScale?: number;
  /** D-13: per-placement display name override. 40-char soft limit (client-enforced). */
  labelOverride?: string;
  /** D-01/D-02: per-axis override fields (applies to custom elements per CONTEXT). */
  widthFtOverride?: number;
  depthFtOverride?: number;
}

export interface PlacedProduct {
  id: string;
  productId: string;
  position: Point;
  rotation: number;
  sizeScale?: number;
  /** D-01/D-02: per-axis override fields. D-15 excludes labelOverride here. */
  widthFtOverride?: number;
  depthFtOverride?: number;
}
```

**Store action — KEY FINDING:** `updateCustomElement` (cadStore L605) mutates the **catalog** entry, NOT the placement. The current store has no `updatePlacedCustomElement`. New action required:

```typescript
updatePlacedCustomElement: (id: string, changes: Partial<PlacedCustomElement>) => void;
updatePlacedCustomElementNoHistory: (id: string, changes: Partial<PlacedCustomElement>) => void;
```

Implementation mirrors `updateWall` / `updateWallNoHistory` (L210-234). Label-override commit calls the non-NoHistory variant exactly once per edit session.

**PropertiesPanel wiring (new block inside the existing `pp &&` / custom-element branch):**

The current `PropertiesPanel.tsx` doesn't explicitly render a branch for `PlacedCustomElement` — inspect how it's currently handled:

- `useActivePlacedProducts()` returns `placedProducts` only.
- `pp = id ? placedProducts[id] : undefined` — does NOT match custom elements.
- Custom elements likely fall through the `if (!wall && !pp && !ceiling) return null;` guard.

**Action item for planner:** Verify whether `PropertiesPanel` currently handles custom-element selection at all. If not, add a new `useActivePlacedCustomElements()` selector + a third branch. This may be a larger edit than assumed; confirm in Wave 0.

**Label input component (follows Phase 29 EditableRow pattern):**

```tsx
function LabelOverrideInput({
  pce,
  catalogName,
}: {
  pce: PlacedCustomElement;
  catalogName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const updatePlacedCustomElement = useCADStore((s) => s.updatePlacedCustomElement);
  const updatePlacedCustomElementNoHistory = useCADStore((s) => s.updatePlacedCustomElementNoHistory);

  // Live preview on keystroke — NoHistory so we don't pollute undo stack.
  const handleChange = (v: string) => {
    setDraft(v);
    updatePlacedCustomElementNoHistory(pce.id, { labelOverride: v });
  };

  // Commit on blur/Enter — ONE history entry per session (D-10).
  const commit = () => {
    setEditing(false);
    // Empty string reverts to catalog name (D-11) → store as undefined.
    const next = draft.trim() === "" ? undefined : draft.slice(0, 40);
    updatePlacedCustomElement(pce.id, { labelOverride: next });
  };

  // Cancel on Escape — revert the live-preview mutation via NoHistory to the
  // pre-edit value captured when editing started.
  // ...
}
```

**Open implementation question (for planner to resolve):** Live-preview via `NoHistory` means the canvas updates on every keystroke but `past` doesn't grow. The final `updatePlacedCustomElement(...)` on commit pushes ONE history entry that captures the net change. On Escape, we must manually rewind the live-preview by calling `updatePlacedCustomElementNoHistory(id, { labelOverride: originalValue })`.

**2D render update (`fabricSync.ts:85`):**

```tsx
// Current:
const label = new fabric.FabricText(el.name.toUpperCase(), { ... });

// New:
const displayLabel = (p.labelOverride ?? el.name).toUpperCase();
const label = new fabric.FabricText(displayLabel, { ... });
```

Note `p` here is the `PlacedCustomElement`, `el` is the catalog `CustomElement`. Both already in scope at L60-100.

### Pattern 6: Drag-Transaction Pattern (Reused from Phase 25, D-03)

Already canonical. Restated for the planner:

1. **Mousedown** (drag start): `useCADStore.getState().resizeProductAxis(id, axis, initialValue)` — this calls `pushHistory(s)` internally, adding exactly one entry to `past[]`.
2. **Mousemove** (every frame): `useCADStore.getState().resizeProductAxisNoHistory(id, axis, liveValue)` — no `pushHistory` call.
3. **Mouseup**: No additional store write. Canvas is already consistent with store.
4. **Invariant:** `past.length` after a single complete drag = initial `past.length` + 1.

**Fast-path contract (PERF-01):** Mid-drag writes must not trigger `fc.clear()` or full `redraw()`. The existing `_dragActive` flag in selectTool (L724) gates this; new branches must set it to `true` before the first NoHistory call.

### Anti-Patterns to Avoid

- **Do not modify `effectiveDimensions` in `types/product.ts`.** Add a new `resolveEffectiveDims` wrapper. The old helper is used in contexts that don't have a `PlacedProduct` (e.g., placement preview in productTool.ts), and changing its signature will cascade.
- **Do not push history mid-drag.** The `sizeScale` bug that drove Phase 25 PERF-01 came from exactly this mistake. All mid-drag mutations use `*NoHistory`.
- **Do not snap walls to products.** D-05 explicitly forbids it. Construction of the restricted scene (§Pattern 4) must exclude `objectBBoxes` except for the zero-size endpoint targets.
- **Do not use `setInterval` / `setTimeout` for debouncing label input.** D-09 locks "no debounce — live preview on keystroke." Any latency is a bug.
- **Do not forget the Shift/Alt modifier priority.** Shift-ortho wins over snap (D-06); Alt disables snap (D-07). Test both combinations.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snap math for wall endpoints | Custom endpoint-distance loop | `snapEngine.computeSnap()` with restricted scene | Priority tiebreak + tolFt cap + grid fallback are load-bearing and already tested |
| Guide rendering | Manual fabric.Line creation | `snapGuides.renderSnapGuides()` | Idempotent cleanup via `data.type === "snap-guide"` tag |
| Inline-edit commit-on-Enter/blur | New hook from scratch | `PropertiesPanel.tsx::EditableRow` pattern (L232-308) | Battle-tested float-drift guard, Escape cancel, silent no-op |
| Rotation-aware handle math | Re-derive `cos/sin` inline | Extend `getResizeHandles` in `resizeHandles.ts` | Already rotation-correct; edge handles use same transform |
| Drag-transaction history | Ad-hoc `pushHistory` | D-03 pattern (`update*` at start, `*NoHistory` mid, no-op end) | One undo entry guaranteed |

**Key insight:** Every subsystem Phase 31 needs already exists. The phase is **wiring**, not invention.

## Runtime State Inventory

**Not a rename/refactor/migration phase — omitted per template guidance.**

(Only note: new optional schema fields `widthFtOverride`, `depthFtOverride`, `labelOverride` are fully backward-compatible. Existing saved projects read back as `undefined` and fall through to `sizeScale`/catalog-name paths. No migration code needed — explicitly stated in D-04.)

## Common Pitfalls

### Pitfall 1: Corner vs. Edge Handle Overlap at Small Sizes
**What goes wrong:** At low zoom or on small products, the corner and edge handles visually overlap. If edge hit-test runs first, a click meant for a corner activates an edge drag (wrong axis behavior).
**Why it happens:** Both use `RESIZE_HANDLE_HIT_RADIUS_FT = 0.5`. A point near `(hw, -hd)` is within 0.5ft of both `ne` corner and (depending on product size) the `n` or `e` edge midpoint.
**How to avoid:** **Hit-test corners first, return immediately on match.** Only fall through to edges if no corner matched. Codify in `hitTestAllResizeHandles`.
**Warning signs:** User drags what looks like a corner and the product squashes on one axis.

### Pitfall 2: Rotated-Product Edge-Drag Axis Confusion
**What goes wrong:** Product rotated 90°; user drags the "east" edge handle (which is now visually at the bottom). Per D-01 v1 semantics, this updates `widthFtOverride` regardless of screen orientation.
**Why it happens:** Edge handles use object-local axes. `e` always means `+width`, even when rotated.
**How to avoid:** Explicitly document in tests and UAT: "Edge drag affects the product's intrinsic width/depth, not the screen-horizontal/vertical axis." CONTEXT D-07 lists this as deferred polish — do not fix in Phase 31.
**Warning signs:** Jessica asks "why did my couch get taller when I pulled on its side?"

### Pitfall 3: Shift-Ortho + Snap Double-Apply
**What goes wrong:** Shift locks X to anchor.x, but then `computeSnap` produces an X winner from a nearby wall endpoint — snapped X no longer equals anchor.x, and the wall goes diagonal.
**Why it happens:** `computeSnap` is per-axis independent; it doesn't know Shift is held.
**How to avoid:** Post-snap, re-apply the Shift constraint. See §Pattern 4 step 3 — the `if (shiftHeld)` re-override after `computeSnap` returns. Or, more elegantly, pre-filter snap targets to exclude the locked axis entirely (discussed in D-06 "snap applies ONLY along locked axis" — either approach works; re-override is simpler to implement and test).
**Warning signs:** Shift-drag produces near-ortho but not-quite-ortho walls.

### Pitfall 4: `updateCustomElement` ≠ `updatePlacedCustomElement`
**What goes wrong:** Planner assumes `updateCustomElement` works for label overrides, calls it — actually mutates the CATALOG (breaking other placements of the same custom element).
**Why it happens:** Naming confusion. `CustomElement` = catalog. `PlacedCustomElement` = placement instance.
**How to avoid:** New `updatePlacedCustomElement` action MUST be added. Call this out loudly in the plan. Grep'd ground truth: `updateCustomElement` at cadStore L605 touches `root.customElements[id]`, not `doc.placedCustomElements[id]`.
**Warning signs:** Renaming one couch renames all couches of the same catalog type.

### Pitfall 5: Scene Cache Stale After Mid-Drag Mutations
**What goes wrong:** User drags wall endpoint; scene cached at mousedown. Mid-drag, some async listener (unlikely but possible) mutates another wall. Cache is now stale.
**Why it happens:** `buildSceneGeometry` materializes a snapshot; walls aren't reactive to the cache.
**How to avoid:** Phase 30 already accepts this tradeoff (D-09b) — stale-during-drag is acceptable because nothing else mutates mid-drag. Same contract applies here. **Do not add reactive cache invalidation** — it's over-engineering.
**Warning signs:** Not a real-world concern; only flagged so planner doesn't waste time on it.

### Pitfall 6: Live-Preview Label Update Triggers Full Canvas Redraw
**What goes wrong:** Each keystroke → `updatePlacedCustomElementNoHistory` → zustand subscription → full `fc.clear()` + redraw → input loses focus.
**Why it happens:** `FabricCanvas.tsx` subscribes to store slices and triggers `redraw()`. NoHistory still writes to state.
**How to avoid:** Verify the existing `_dragActive` flag or similar guard covers this case. If not, either:
  (a) Use an in-place Fabric text mutation on the specific label object (like how `applyWallShapeToFabric` works for wall-endpoint drag), OR
  (b) Accept the full redraw and rely on the input's `autoFocus` + React controlled-input to not lose focus.
Phase 29 (EDIT-20/21 dimension-label editor) already solved this — audit that implementation in planning.
**Warning signs:** Input loses focus after each keystroke.

## Code Examples

### Example: Extended Resize-Handle Hit-Test (Pattern 1)

```typescript
// src/canvas/resizeHandles.ts — ADDITIONS

export const EDGE_HANDLE_HIT_RADIUS_FT = 0.5;

export function getEdgeHandles(
  pp: PlacedProduct,
  widthFt: number,
  depthFt: number,
): { n: Point; s: Point; e: Point; w: Point } {
  const hw = widthFt / 2;
  const hd = depthFt / 2;
  const local = {
    n: { x: 0, y: -hd },
    s: { x: 0, y: hd },
    e: { x: hw, y: 0 },
    w: { x: -hw, y: 0 },
  };
  const rad = (pp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const toWorld = (p: Point): Point => ({
    x: pp.position.x + p.x * cos - p.y * sin,
    y: pp.position.y + p.x * sin + p.y * cos,
  });
  return { n: toWorld(local.n), s: toWorld(local.s), e: toWorld(local.e), w: toWorld(local.w) };
}

export function hitTestEdgeHandle(
  pointerFt: Point,
  pp: PlacedProduct,
  widthFt: number,
  depthFt: number,
): "n" | "s" | "e" | "w" | null {
  const handles = getEdgeHandles(pp, widthFt, depthFt);
  for (const key of ["n", "s", "e", "w"] as const) {
    const h = handles[key];
    const dx = pointerFt.x - h.x;
    const dy = pointerFt.y - h.y;
    if (Math.sqrt(dx * dx + dy * dy) <= EDGE_HANDLE_HIT_RADIUS_FT) return key;
  }
  return null;
}

/** Combined hit-test with corner priority (Pitfall 1). */
export function hitTestAnyResizeHandle(
  pointerFt: Point,
  pp: PlacedProduct,
  widthFt: number,
  depthFt: number,
): { kind: "corner"; which: "ne" | "nw" | "sw" | "se" }
 | { kind: "edge"; which: "n" | "s" | "e" | "w" }
 | null {
  const corner = hitTestResizeHandle(pointerFt, pp, widthFt, depthFt);
  if (corner) return { kind: "corner", which: corner };
  const edge = hitTestEdgeHandle(pointerFt, pp, widthFt, depthFt);
  if (edge) return { kind: "edge", which: edge };
  return null;
}

/** Edge-drag value: project pointer onto the handle's local axis and return
 *  the absolute new width/depth in feet. */
export function edgeDragToAxisValue(
  edge: "n" | "s" | "e" | "w",
  pointerFt: Point,
  pp: PlacedProduct,
): { axis: "width" | "depth"; valueFt: number } {
  // Convert pointer to object-local coords.
  const rad = (-pp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = pointerFt.x - pp.position.x;
  const dy = pointerFt.y - pp.position.y;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  if (edge === "e" || edge === "w") {
    // New width = 2 × |lx|, clamped.
    return { axis: "width", valueFt: Math.max(0.25, Math.min(50, 2 * Math.abs(lx))) };
  }
  // n / s → depth
  return { axis: "depth", valueFt: Math.max(0.25, Math.min(50, 2 * Math.abs(ly))) };
}
```

### Example: Restricted Snap Scene for Wall Endpoints (Pattern 4)

```typescript
// src/canvas/wallEndpointSnap.ts (NEW)

import type { SceneGeometry, BBox } from "@/canvas/snapEngine";
import type { WallSegment, Point } from "@/types/cad";

function classifyAxis(w: WallSegment): "x" | "y" | "diag" {
  const dx = Math.abs(w.end.x - w.start.x);
  const dy = Math.abs(w.end.y - w.start.y);
  if (dx < 1e-6) return "y";
  if (dy < 1e-6) return "x";
  return "diag";
}

/** D-05: snap targets = other wall endpoints + other wall midpoints only.
 *  Product/ceiling/custom-element bboxes excluded. Endpoints modeled as
 *  zero-size BBoxes so computeSnap's existing objectBBoxes scan picks them up. */
export function buildWallEndpointSnapScene(
  walls: Record<string, WallSegment>,
  draggedWallId: string,
): SceneGeometry {
  const objectBBoxes: BBox[] = [];
  const wallMidpoints: SceneGeometry["wallMidpoints"] = [];

  for (const w of Object.values(walls)) {
    if (w.id === draggedWallId) continue;
    // Two zero-size bboxes per wall — one at each endpoint.
    objectBBoxes.push({
      id: `${w.id}-start`,
      minX: w.start.x, maxX: w.start.x,
      minY: w.start.y, maxY: w.start.y,
    });
    objectBBoxes.push({
      id: `${w.id}-end`,
      minX: w.end.x, maxX: w.end.x,
      minY: w.end.y, maxY: w.end.y,
    });
    wallMidpoints.push({
      point: { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 },
      wallId: w.id,
      axis: classifyAxis(w),
    });
  }

  // wallEdges intentionally empty — we're snapping the endpoint, not aligning faces.
  return { wallEdges: [], wallMidpoints, objectBBoxes };
}
```

### Example: Label Override Render Site (`fabricSync.ts:85`)

```typescript
// BEFORE (line 85):
const label = new fabric.FabricText(el.name.toUpperCase(), { ... });

// AFTER:
const displayName = (p.labelOverride && p.labelOverride.trim() !== "")
  ? p.labelOverride
  : el.name;
const label = new fabric.FabricText(displayName.toUpperCase(), { ... });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-product full-redraw on drag | D-03 drag-transaction + Fabric in-place mutation | Phase 25 | Mid-drag mutations use `*NoHistory`; Phase 31 inherits |
| Hand-rolled snap in each tool | Pure `snapEngine.computeSnap()` module | Phase 30 | Wall-endpoint path reuses as-is |
| Hand-drawn guide lines | Tagged `data.type === "snap-guide"` + `renderSnapGuides()` | Phase 30 | Idempotent cleanup, zero drift |
| `effectiveDimensions(product, sizeScale)` | `resolveEffectiveDims(product, placed)` reading overrides | Phase 31 | All consumers migrated in this phase |

**Deprecated / outdated:**
- None. Everything Phase 31 touches is current Phase 30/28/25 code.

## Open Questions

1. **Does `PropertiesPanel` currently render anything for `PlacedCustomElement` selection?**
   - What we know: Grep of PropertiesPanel.tsx shows only `walls`, `placedProducts`, `ceilings` selectors. No `placedCustomElements` hook.
   - What's unclear: Whether custom-element selection silently returns `null` (no panel) or whether there's a different entry point.
   - Recommendation: **Wave 0 verification task** — open the running app, select a custom element, observe PropertiesPanel. If no panel renders, Phase 31 must add the entire custom-element branch (larger scope than implied).

2. **Escape-cancel semantics for label-override live preview.**
   - What we know: D-10 says commit on Enter OR blur. D-11 says empty reverts to catalog name.
   - What's unclear: What should Escape do? Revert to pre-edit value (like Phase 29 dimension editor) or behave like blur (commit)?
   - Recommendation: Mirror Phase 29 exactly — Escape cancels without committing. The live-preview mutations need to be rolled back via `updatePlacedCustomElementNoHistory(id, { labelOverride: originalValue })`.

3. **Reset button for per-axis overrides.**
   - What we know: D-02 says clearing overrides reverts to uniform `sizeScale`. Claude's discretion per CONTEXT.
   - What's unclear: UX affordance — a "RESET" button? Empty-input-reverts for label (D-11), but no analog for numeric axis overrides.
   - Recommendation: Add a small "RESET SIZE" button in PropertiesPanel when any override is set. Calls `clearProductOverrides(id)` / `clearCustomElementOverrides(id)`. Simpler than exposing numeric fields.

## Environment Availability

No external dependencies introduced. All tooling (vitest, happy-dom, testing-library) already installed. **SKIPPED — internal code change only.**

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 with happy-dom 20.8.9 |
| Config file | `vite.config.ts` (vitest inherits) |
| Quick run command | `npm run test:quick` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| EDIT-22 | Corner handle hit-test detects NE/NW/SE/SW correctly (rotation-aware) | unit | `vitest run src/canvas/__tests__/resizeHandles.test.ts -t "corner hit-test"` | ❌ Wave 0 |
| EDIT-22 | Edge handle hit-test detects N/S/E/W correctly (rotation-aware) | unit | `vitest run src/canvas/__tests__/resizeHandles.test.ts -t "edge hit-test"` | ❌ Wave 0 |
| EDIT-22 | Corner wins over edge at overlap (Pitfall 1) | unit | `vitest run src/canvas/__tests__/resizeHandles.test.ts -t "corner priority"` | ❌ Wave 0 |
| EDIT-22 | `resolveEffectiveDims` returns override when set; `libraryDim × sizeScale` otherwise | unit | `vitest run src/types/__tests__/resolveEffectiveDims.test.ts` | ❌ Wave 0 |
| EDIT-22 | Edge drag writes `widthFtOverride` with grid-snap | integration | `vitest run src/canvas/tools/__tests__/phase31Resize.test.tsx -t "edge drag writes axis override"` | ❌ Wave 0 |
| EDIT-22 | Corner drag writes `sizeScale` (unchanged behavior) | integration | `vitest run src/canvas/tools/__tests__/phase31Resize.test.tsx -t "corner drag writes sizeScale"` | ❌ Wave 0 |
| EDIT-23 | Wall endpoint drag snaps to other wall endpoint within tolerance | integration | `vitest run src/canvas/tools/__tests__/phase31WallEndpoint.test.tsx -t "snap to endpoint"` | ❌ Wave 0 |
| EDIT-23 | Wall endpoint drag snaps to other wall midpoint | integration | `vitest run src/canvas/tools/__tests__/phase31WallEndpoint.test.tsx -t "snap to midpoint"` | ❌ Wave 0 |
| EDIT-23 | Shift-held locks endpoint to ortho axis; snap applies within lock | integration | `vitest run src/canvas/tools/__tests__/phase31WallEndpoint.test.tsx -t "shift ortho plus snap"` | ❌ Wave 0 |
| EDIT-23 | Alt-held disables snap; grid-snap still applies | integration | `vitest run src/canvas/tools/__tests__/phase31WallEndpoint.test.tsx -t "alt disables snap"` | ❌ Wave 0 |
| EDIT-23 | Walls do NOT snap to product bboxes (D-05 negative) | integration | `vitest run src/canvas/tools/__tests__/phase31WallEndpoint.test.tsx -t "no product snap"` | ❌ Wave 0 |
| EDIT-24 | Corner drag → past.length +1 | integration | `vitest run src/canvas/tools/__tests__/phase31Undo.test.tsx -t "corner resize single undo"` | ❌ Wave 0 |
| EDIT-24 | Edge drag → past.length +1 | integration | `vitest run src/canvas/tools/__tests__/phase31Undo.test.tsx -t "edge resize single undo"` | ❌ Wave 0 |
| EDIT-24 | Wall endpoint drag → past.length +1 | integration | `vitest run src/canvas/tools/__tests__/phase31Undo.test.tsx -t "wall endpoint single undo"` | ❌ Wave 0 |
| EDIT-24 | Label-override edit session → past.length +1 (Enter OR blur) | integration | `vitest run src/canvas/tools/__tests__/phase31Undo.test.tsx -t "label override single undo"` | ❌ Wave 0 |
| CUSTOM-06 | PropertiesPanel renders input for selected PlacedCustomElement | integration (RTL) | `vitest run src/components/__tests__/PropertiesPanel.customElement.test.tsx` | ❌ Wave 0 |
| CUSTOM-06 | Typing updates canvas label in real time (no debounce) | integration | `vitest run src/components/__tests__/PropertiesPanel.customElement.test.tsx -t "live preview"` | ❌ Wave 0 |
| CUSTOM-06 | Empty string reverts to catalog name | integration | `vitest run src/components/__tests__/PropertiesPanel.customElement.test.tsx -t "empty reverts"` | ❌ Wave 0 |
| CUSTOM-06 | Override persists across save/load round-trip | unit | `vitest run src/__tests__/snapshotRoundTrip.test.ts -t "labelOverride survives"` | ❌ Wave 0 |
| CUSTOM-06 | Escape cancels live-preview (mirror Phase 29) | integration | `vitest run src/components/__tests__/PropertiesPanel.customElement.test.tsx -t "escape cancels"` | ❌ Wave 0 |

### Test Driver Bridges (Required, per D-17)

Expose under `import.meta.env.MODE === "test"` guard, matching Phase 30 precedent (`window.__driveSnap`).

```typescript
// In selectTool.ts activate(), after all state declarations:
if (import.meta.env.MODE === "test") {
  (window as any).__driveResize = {
    start: (placedId: string, handle: "corner-ne"|"corner-nw"|"corner-sw"|"corner-se"|"edge-n"|"edge-s"|"edge-e"|"edge-w") => { /* simulate mousedown */ },
    to: (feetX: number, feetY: number, opts?: { shift?: boolean; alt?: boolean }) => { /* mousemove */ },
    end: () => { /* mouseup */ },
  };
  (window as any).__driveWallEndpoint = {
    start: (wallId: string, which: "start"|"end") => {},
    to: (feetX: number, feetY: number, opts?: { shift?: boolean; alt?: boolean }) => {},
    end: () => {},
    getGuides: () => /* from cached computeSnap result */,
  };
  (window as any).__driveLabelOverride = {
    // Direct-action alternative to RTL for the single-undo assertion.
    typeAndCommit: (placedCustomElementId: string, text: string, mode: "enter"|"blur") => {},
  };
}
```

### Sampling Rate

- **Per task commit:** `npm run test:quick` — all tests, dot reporter.
- **Per wave merge:** `npm test` — full suite.
- **Phase gate:** Full suite green before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `src/canvas/__tests__/resizeHandles.test.ts` — unit tests for corner + edge hit-tests, rotation-aware.
- [ ] `src/types/__tests__/resolveEffectiveDims.test.ts` — unit tests for override resolver.
- [ ] `src/canvas/tools/__tests__/phase31Resize.test.tsx` — integration tests for corner/edge drag transactions.
- [ ] `src/canvas/tools/__tests__/phase31WallEndpoint.test.tsx` — integration tests for wall-endpoint snap + shift + alt.
- [ ] `src/canvas/tools/__tests__/phase31Undo.test.tsx` — EDIT-24 single-undo regression suite.
- [ ] `src/components/__tests__/PropertiesPanel.customElement.test.tsx` — RTL tests for label-override input (requires router/IndexedDB stubs + canvas polyfills — see Phase 29/30 harness at `src/canvas/tools/__tests__/snapIntegration.test.tsx` for the working pattern; file may not exist yet — verify in Wave 0).
- [ ] `src/__tests__/snapshotRoundTrip.test.ts` — save/load round-trip test for `labelOverride`, `widthFtOverride`, `depthFtOverride` (may extend existing snapshot tests if they exist; grep shows none found).
- [ ] `src/canvas/__tests__/wallEndpointSnap.test.ts` — unit tests for restricted scene builder (no product bboxes, endpoint zero-size bboxes).

**Harness requirements (from Phase 29/30 experience):**
- Router stub for PropertiesPanel if it transitively imports route context.
- IndexedDB stub (`fake-indexeddb` or happy-dom builtin) for auto-save during tests.
- Canvas method polyfills (`HTMLCanvasElement.prototype.getContext` mock) for Fabric-under-happy-dom.
- Mount the full `App` or a minimal `FabricCanvas` + `PropertiesPanel` pair; driver bridges operate at the tool layer regardless.

## Sources

### Primary (HIGH confidence)

- `.planning/phases/31-drag-resize-label-override/31-CONTEXT.md` — locked decisions D-01..D-17.
- `.planning/REQUIREMENTS.md` §EDIT-22..EDIT-24, §CUSTOM-06.
- `src/canvas/resizeHandles.ts` — corner-handle implementation (to extend).
- `src/canvas/wallEditHandles.ts` — wall-endpoint hit-test (unchanged).
- `src/canvas/snapEngine.ts` — `computeSnap` contract and D-05a priority tiebreak.
- `src/canvas/snapGuides.ts` — guide renderer, tagged cleanup.
- `src/canvas/tools/selectTool.ts` L558-905 — drag dispatch (extended) and wall-endpoint branch (extended).
- `src/stores/cadStore.ts` L36-75, L210-234, L374-393, L605-707 — action signatures; `updateCustomElement` mutates CATALOG not placement.
- `src/components/PropertiesPanel.tsx` L232-308 — `EditableRow` pattern (to mirror for label input).
- `src/types/cad.ts` L79-114, L161-171 — schema additions land on `PlacedProduct`, `PlacedCustomElement`.
- `src/types/product.ts` L38-62 — current `effectiveDimensions` (to wrap, not replace).
- `src/canvas/fabricSync.ts` L75-96 — custom-element label render site (L85).
- `package.json` — test framework versions verified.
- `.planning/config.json` — `nyquist_validation: true` → Validation Architecture section required.

### Secondary (MEDIUM confidence)

- Phase 30 test harness pattern (`snapIntegration.test.tsx`) — referenced in CONTEXT.md; exact file location verified via phase directory listing but full contents not loaded in this research. Planner should open it as canonical reference during implementation.

### Tertiary (LOW confidence)

- None. All findings verified against source files in this repo.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps already installed, all patterns established in Phase 25/28/29/30.
- Architecture: HIGH — every decision locked in CONTEXT.md, every integration point identified in source.
- Pitfalls: HIGH — Pitfall 4 (updateCustomElement vs updatePlacedCustomElement) directly observed in grep; others match Phase 25/30 battle scars.
- Validation architecture: MEDIUM — test files enumerated but existence of harness (router/IndexedDB stubs) confirmed only by CONTEXT.md reference; must verify in Wave 0 by opening `snapIntegration.test.tsx`.

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — stable in-repo research, no external-source volatility)
