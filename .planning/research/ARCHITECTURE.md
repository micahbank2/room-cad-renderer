# Architecture Patterns — v1.3 Color, Polish & Materials

**Domain:** Interior design CAD tool (v1.3 feature additions)
**Researched:** 2026-04-05
**Confidence:** HIGH — based on direct codebase analysis

---

## Scope

This document covers only the three v1.3 feature sets and how they integrate with the existing architecture:

1. **Color & Paint System** — global paint library, Farrow & Ball ~130 colors, custom colors, lime wash toggle, apply to walls + ceilings (2D + 3D)
2. **v1.2 Polish Pass** — custom element edit handles, library edit-in-place UI, copy-side buttons, per-placement frame overrides
3. **Advanced Materials** — unified ceiling/floor texture catalog

---

## Existing Architecture Snapshot (what v1.3 builds on)

```
Zustand Stores (source of truth)
  cadStore       → rooms, walls, ceilings, floorMaterial, customElements, undo/redo
  uiStore        → activeTool, selectedIds, gridSnap, panel visibility
  productStore   → global product library (persisted to idb-keyval)
  framedArtStore → framed art library items (idb-keyval: "room-cad-framed-art")
  wainscotStyleStore → wainscoting style library (idb-keyval: "room-cad-wainscot-styles")

2D Rendering (Fabric.js v6)
  FabricCanvas.tsx   → orchestrator, full redraw on every store change
  fabricSync.ts      → renderWalls, renderProducts, renderCeilings, renderCustomElements
  tools/selectTool.ts → hit-test + drag handler; handle system via hit-test modules

3D Rendering (R3F + Three.js)
  ThreeViewport.tsx  → R3F Canvas + Scene
  WallMesh.tsx       → ExtrudeGeometry + wainscoting + crown molding
  CeilingMesh.tsx    → ShapeGeometry, currently accepts hex color only
  FloorMesh.tsx      → preset lookup by presetId or custom imageUrl texture

Types
  src/types/cad.ts   → WallSegment, Ceiling (material: string), FloorMaterial, RoomDoc, CADSnapshot
  src/types/framedArt.ts → FramedArtItem, FrameStyle, FRAME_PRESETS
  src/types/wainscotStyle.ts → WainscotStyleItem
```

**Handle system pattern** (from selectTool.ts): Every draggable handle is implemented as:
1. A pure `hitTest*` function in a dedicated `canvas/*.ts` module (e.g. `rotationHandle.ts`, `wallEditHandles.ts`)
2. A `dragType` string added to `SelectState` in `selectTool.ts`
3. A branch in `onMouseDown` that calls the hitTest and sets `state.dragType`
4. A branch in `onMouseMove` that applies the drag using a `*NoHistory` store action
5. A branch in `onMouseUp` or the existing cleanup to clear the tag and push history

**Global library store pattern** (from framedArtStore.ts, wainscotStyleStore.ts):
- `create<State>()((setState) => ({ items, loaded, load, addItem, updateItem, removeItem }))`
- `load()` reads from IndexedDB on startup
- `subscribe` watcher persists to IndexedDB after load, on `items` change
- `idb-keyval` key is a string constant specific to that library

---

## Feature 1: Color & Paint System

### Decision: New `paintStore`, not merged into productStore

The existing `productStore` holds Product objects (furniture/decor with images and dimensions). Paint colors are a fundamentally different entity — no image, no dimensions, brand metadata, lime wash flag. Merging into productStore would require `PRODUCT_CATEGORIES` to grow awkwardly and would pollute the product search/filter UI.

**Use the global library store pattern exactly as framedArtStore and wainscotStyleStore do.**

### `PaintColor` Type

```typescript
// src/types/paint.ts
export interface PaintColor {
  id: string;            // "paint_..."
  name: string;          // "Elephant's Breath", "Hague Blue", custom name
  brand: string;         // "Farrow & Ball" | "Custom"
  hex: string;           // "#f0ece0" — canonical color value
  limeWash: boolean;     // when true: 3D roughness ~0.95, 2D hatched overlay
  /** Optional Farrow & Ball collection number, e.g. "No.229" */
  catalogRef?: string;
}
```

### `paintStore` Shape

```typescript
// src/stores/paintStore.ts
interface PaintState {
  items: PaintColor[];
  loaded: boolean;
  load: () => Promise<void>;           // loads from idb-keyval + seeds F&B catalog
  addItem: (item: Omit<PaintColor, "id">) => string;
  updateItem: (id: string, changes: Partial<PaintColor>) => void;
  removeItem: (id: string) => void;    // only for custom colors (brand === "Custom")
}
// idb-keyval key: "room-cad-paint-colors"
// On load(): if no stored items, seed with FARROW_AND_BALL_COLORS constant array
// Subscribe pattern: persist on items change after loaded (same as framedArtStore)
```

**Farrow & Ball seed data** lives in `src/data/farrowAndBall.ts` — a typed constant array of ~130 `PaintColor` records with `brand: "Farrow & Ball"`. This is shipped as code (no network fetch needed). On first `load()`, if IndexedDB is empty, write the seed to the store and persist. Subsequent loads read from IndexedDB (user may have added custom colors).

### How Walls Reference Paint

**Use `paintId` (foreign key into paintStore), not embedded hex.** This way renaming/editing a custom color propagates without a migration.

Walls already have `wallpaper?: { A?: Wallpaper; B?: Wallpaper }`. The existing `Wallpaper` type has `kind: "color" | "pattern"` and `color?: string`. For paint integration, extend `Wallpaper`:

```typescript
// In src/types/cad.ts — extend existing Wallpaper interface
export interface Wallpaper {
  kind: "color" | "pattern" | "paint";
  color?: string;       // legacy — kept for "color" kind
  paintId?: string;     // when kind="paint" — references paintStore item id
  limeWash?: boolean;   // per-placement lime wash override (or inherit from PaintColor)
  imageUrl?: string;    // when kind="pattern"
  scaleFt?: number;
}
```

**No new wall field needed.** Paint on a wall side is just `Wallpaper` with `kind: "paint"` and `paintId`. Existing `setWallpaper()` action in cadStore handles this transparently. No cadStore changes needed for wall paint application.

### How Ceilings Reference Paint

Ceilings currently use `material: string` — a hex color or (dead-code) preset ID. For paint, follow the same `paintId` approach:

```typescript
// In src/types/cad.ts — extend Ceiling
export interface Ceiling {
  id: string;
  points: Point[];
  height: number;
  /** Hex color (legacy), material preset id, or "paint:<paintId>" */
  material: string;
  /** When set, material is treated as paint. paintId references paintStore. */
  paintId?: string;
  limeWash?: boolean;
}
```

Resolution at render time:
- `paintId` set → look up hex from paintStore; use `limeWash` flag
- `paintId` not set, `material` starts with `#` → use hex directly (existing behavior)
- Otherwise → fall through to default `#f5f5f5` (existing behavior)

The existing `updateCeiling()` action in cadStore handles this.

### 2D Rendering of Paint

Wall paint is a `Wallpaper` record — the existing `Wallpaper` renderer in fabricSync resolves `color` for the "color" kind. Add a branch for `kind: "paint"`: look up hex from paintStore state, fill the wall surface. Lime wash adds a semi-transparent diagonal-hatch pattern overlay (fabric.Line array, low opacity).

Ceiling paint in 2D: `renderCeilings` in fabricSync currently uses `c.material.startsWith("#") ? c.material + "30"`. Add: if `c.paintId`, resolve hex from paintStore and use it instead. Lime wash effect same as walls.

### 3D Rendering of Paint

**Walls (WallMesh.tsx):** Currently applies a flat wall color derived from wallpaper. Paint resolves to the hex and passes to `meshStandardMaterial color`. Lime wash: set `roughness={0.95}` and optionally `bumpScale={0.02}` for texture feel. No new geometry needed.

**Ceilings (CeilingMesh.tsx):** Currently: `const color = ceiling.material.startsWith("#") ? ceiling.material : "#f5f5f5"`. Add: if `ceiling.paintId`, look up hex from paintStore. Lime wash: same roughness bump.

### Component: `PaintLibrary.tsx` + `PaintPicker.tsx`

- `PaintLibrary.tsx` — sidebar panel, mirrors `ProductLibrary.tsx` structure. Shows catalog grouped by brand. Filter by `limeWash`. Custom color add/edit/delete. F&B items are read-only (can be removed from the list but not edited — or just disallow remove).
- `PaintPicker.tsx` — a color swatch picker modal. Receives an `onSelect(paintId)` callback. Called from the wall side panel and ceiling panel. Searches by name/hex. Shows lime wash toggle.

---

## Feature 2: v1.2 Polish Pass

Four independent sub-features. None require store changes except per-placement frame override.

### 2a. Custom Element Edit Handles

**Problem:** `selectTool.ts` hit-tests `placedProducts` and `walls` by entity type. `PlacedCustomElement` entries are placed on canvas but the select tool never checks `doc.placedCustomElements`. Drag, rotate, and resize all fall through.

**Fix — four additions to `selectTool.ts`:**

1. Add `"custom-element"` to the `DragType` union
2. In `hitTestStore()`, after checking products and before walls, iterate `doc.placedCustomElements`:
   - AABB hit test using `el.width * p.sizeScale` and `el.depth * p.sizeScale`
   - Return `{ id: p.id, type: "custom-element" }`
3. In `onMouseDown`, when `currentSelection[0]` is a custom element:
   - Check rotate handle (same `hitTestHandle` helper, using `el.depth` as productDepthFt)
   - Check resize handle (same `hitTestResizeHandle`, using `el.width * sizeScale` and `el.depth * sizeScale`)
4. In `onMouseMove`, handle `dragType === "custom-element"` → call `moveCustomElement()` / `rotateCustomElement()` (add these NoHistory variants to cadStore)
5. In `fabricSync.ts:renderCustomElements()`, draw rotate and resize handle overlays when the element is selected (same pattern as products)

**New cadStore actions needed:**
```typescript
rotateCustomElement: (id: string, angle: number) => void;
rotateCustomElementNoHistory: (id: string, angle: number) => void;
resizeCustomElement: (id: string, scale: number) => void;
resizeCustomElementNoHistory: (id: string, scale: number) => void;
```

`PlacedCustomElement` already has `rotation: number` and `sizeScale?: number` — the store actions follow the same pattern as `rotateProduct`/`resizeProduct`.

### 2b. Library Edit-in-Place UI

**Problem:** `wainscotStyleStore.updateItem` exists but has no UI consumer. The wainscoting library shows items as a list with no edit affordance.

**Fix — component-only change in `WainscotLibrary.tsx` (or wherever the list renders):**
- Add an edit icon button per item (pencil icon)
- Clicking opens an inline edit form (same fields as creation) or a modal, pre-populated
- On submit, call `useWainscotStyleStore.getState().updateItem(id, changes)`
- Same pattern applies to `framedArtStore.updateItem` for framed art library items

No store changes needed — `updateItem` already exists in both stores.

### 2c. Copy-Side Buttons

**Problem:** Per-side wall treatments (wallpaper, wainscoting, crown molding, wall art) require manual re-entry to copy SIDE_A to SIDE_B.

**Fix — new action in cadStore:**

```typescript
copyWallSide: (wallId: string, from: WallSide, to: WallSide) => void;
```

Implementation: deep-clone the wall's `wallpaper[from]`, `wainscoting[from]`, `crownMolding[from]`, and `wallArt` items with `side === from`, then write to the `to` side. One action, one history push, O(1) UX.

UI: small "Copy A→B" / "Copy B→A" button in the per-side panel. No new components needed beyond a button.

### 2d. Per-Placement Frame Override

**Problem:** `WallArt.frameStyle` is set at placement time but cannot be changed after placement. The `FrameStyle` is stored on `WallArt` already — the store's `updateWallArt()` action handles `Partial<WallArt>` and will propagate a new `frameStyle` correctly.

**Fix — UI only:** In the wall art properties panel, expose a `<FrameStylePicker>` component that calls `updateWallArt(wallId, artId, { frameStyle: newStyle })`. The `WallArt` type and store action already support this — only the editing UI was missing.

---

## Feature 3: Advanced Materials — Unified Catalog

### Problem Statement

Currently floor and ceiling use different material systems:
- **Floor:** `FloorMaterial { kind: "preset" | "custom", presetId?, imageUrl?, scaleFt, rotationDeg }` with 8 presets in `src/data/floorMaterials.ts`. Each preset has `color`, `roughness`, `defaultScaleFt`.
- **Ceiling:** `Ceiling.material: string` — raw hex or dead preset ID. No texture support.

The goal is a unified surface texture catalog that works for both, plus custom uploads.

### Recommended Approach: Shared `SurfaceMaterial` Type + `surfaceMaterialStore`

Do NOT alter `FloorMaterial` or `Ceiling.material` to a new type in one migration. Instead:

**Step 1: Define a unified type that can be referenced by both surfaces.**

```typescript
// src/types/surfaceMaterial.ts
export type SurfaceCategory = "FLOOR" | "CEILING" | "BOTH";

export interface SurfaceMaterialItem {
  id: string;             // "smat_..."
  name: string;           // "PLASTER_WHITE", "HERRINGBONE_OAK", user label
  category: SurfaceCategory;
  kind: "preset" | "custom";
  /** For preset: hex color. For custom: not used (imageUrl is canonical). */
  color?: string;
  roughness: number;
  /** Custom upload: data URL. Absent for solid-color presets. */
  imageUrl?: string;
  defaultScaleFt: number;
}
```

**Step 2: `surfaceMaterialStore` — same global library store pattern.**

```typescript
// src/stores/surfaceMaterialStore.ts
// idb-keyval key: "room-cad-surface-materials"
// On load(): if empty, seed with SURFACE_MATERIAL_PRESETS (built from existing FLOOR_PRESETS + new ceiling presets)
// addItem, updateItem, removeItem
```

Seed data: convert the 8 `FLOOR_PRESETS` records to `SurfaceMaterialItem` shape with `category: "FLOOR"`, add ceiling presets (plaster, painted drywall, wood plank, coffered-equivalent) with `category: "CEILING"`, and a few `category: "BOTH"` tiles.

**Step 3: Migration — keep existing floor/ceiling data valid.**

`FloorMaterial` already works. The `FloorMesh.tsx` can resolve by:
- If `floorMaterial.presetId` matches a key in `FLOOR_PRESETS` → use legacy preset (unchanged path)
- If `floorMaterial.presetId` starts with `"smat_"` → look up in `surfaceMaterialStore`
- If `floorMaterial.kind === "custom"` → imageUrl path (unchanged)

For ceilings, add `surfaceMaterialId?: string` to `Ceiling`:
```typescript
export interface Ceiling {
  id: string;
  points: Point[];
  height: number;
  material: string;        // legacy: hex or old preset id — kept for backward compat
  paintId?: string;        // from Feature 1
  limeWash?: boolean;      // from Feature 1
  surfaceMaterialId?: string;  // new: references surfaceMaterialStore
}
```

Resolution priority at render: `surfaceMaterialId` > `paintId` > `material` hex > default.

**No migration of existing snapshots needed** — old ceilings have no `surfaceMaterialId`, fall through to existing `material` hex logic. Old floors have `presetId` pointing to `FLOOR_PRESETS`, which still exists.

### UI: `SurfaceMaterialPicker.tsx`

A unified picker modal. Receives `surface: "floor" | "ceiling" | "any"` prop to filter by category. Shows preset swatches (from store) + custom upload slot. On select, calls either `setFloorMaterial()` (for floors) or `updateCeiling()` (for ceilings). Replaces both the existing `FloorMaterialPicker` and the ceiling material input.

The existing `FloorMaterialPicker.tsx` can be deprecated and replaced, or simply refactored to use `SurfaceMaterialPicker` internally.

---

## Component Boundary Map

| New Component | Location | What it replaces / extends |
|---------------|----------|---------------------------|
| `PaintLibrary.tsx` | `src/components/` | New — mirrors ProductLibrary structure |
| `PaintPicker.tsx` | `src/components/` | New — replaces color `<input type="color">` in wall/ceiling panels |
| `SurfaceMaterialPicker.tsx` | `src/components/` | Replaces `FloorMaterialPicker.tsx` for both floor + ceiling |
| `SurfaceMaterialLibrary.tsx` | `src/components/` | New — manages the user's custom surface material catalog |

| Modified Component | Change |
|-------------------|--------|
| `WainscotLibrary.tsx` | Add edit-in-place UI (updateItem) |
| `FramedArtLibrary.tsx` | Add edit-in-place UI (updateItem) + frame override per placed item |
| `fabricSync.ts` | `renderCustomElements`: add rotate/resize handle overlays when selected |
| `fabricSync.ts` | `renderCeilings`: resolve paintId → hex |
| `fabricSync.ts` | Wall wallpaper renderer: handle `kind: "paint"` |
| `selectTool.ts` | Add custom element drag type + hit-test |
| `CeilingMesh.tsx` | Resolve paintId, surfaceMaterialId |
| `WallMesh.tsx` | Resolve paintId for wall paint |
| `FloorMesh.tsx` | Resolve smat_ presetId via surfaceMaterialStore |

| New Store | Location | idb-keyval key |
|-----------|----------|----------------|
| `paintStore.ts` | `src/stores/` | `"room-cad-paint-colors"` |
| `surfaceMaterialStore.ts` | `src/stores/` | `"room-cad-surface-materials"` |

| New Type Files | Location |
|---------------|----------|
| `src/types/paint.ts` | `PaintColor` interface |
| `src/types/surfaceMaterial.ts` | `SurfaceMaterial`, `SurfaceCategory` |

| Modified Store | Change |
|---------------|--------|
| `cadStore.ts` | `rotateCustomElement`, `rotateCustomElementNoHistory`, `resizeCustomElement`, `resizeCustomElementNoHistory`, `copyWallSide` actions |
| `cadStore.ts` | (types only) `Ceiling` gains `paintId?`, `limeWash?`, `surfaceMaterialId?`; `Wallpaper` gains `kind: "paint"` and `paintId?` |

---

## Data Flow Changes

### Paint applied to wall side (new path)

```
User picks paint in PaintPicker
  → returns paintId
  → setWallpaper(wallId, side, { kind: "paint", paintId })
  → cadStore updates WallSegment.wallpaper[side]
  → FabricCanvas redraw fires
  → fabricSync wall wallpaper renderer: kind==="paint" → paintStore.getState().items.find(paintId) → hex
  → WallMesh 3D: same lookup → meshStandardMaterial color + roughness
```

### Paint applied to ceiling (new path)

```
User picks paint in PaintPicker (from ceiling panel)
  → returns paintId
  → updateCeiling(id, { paintId, material: hex }) // material also written for 2D fallback
  → cadStore updates Ceiling
  → CeilingMesh: ceiling.paintId → paintStore lookup → color
  → fabricSync renderCeilings: same lookup
```

### Custom element drag (new path)

```
User clicks near placed custom element
  → selectTool onMouseDown: hitTestCustomElement() → { id, type: "custom-element" }
  → uiStore.select([id])
  → onMouseDown checks rotate/resize handles first (same pattern as products)
  → dragType = "custom-element" | "custom-element-rotate" | "custom-element-resize"
  → onMouseMove: moveCustomElement / rotateCustomElementNoHistory / resizeCustomElementNoHistory
  → onMouseUp: history already pushed at drag start (boundary pattern)
```

### Unified surface material for floor (extended path)

```
User opens SurfaceMaterialPicker, selects a smat_ item
  → setFloorMaterial({ kind: "preset", presetId: "smat_abc123", scaleFt, rotationDeg })
  → FloorMesh.tsx: presetId starts with "smat_" → surfaceMaterialStore.getState().items lookup
  → resolves color, roughness, imageUrl
```

---

## Build Order and Dependencies

Build in this order to respect inter-feature dependencies:

### Group A — Independent (can be built in parallel or any order)

1. **`src/types/paint.ts`** — no deps
2. **`src/types/surfaceMaterial.ts`** — no deps
3. **`paintStore.ts`** + **`src/data/farrowAndBall.ts`** — depends on PaintColor type
4. **`surfaceMaterialStore.ts`** — depends on SurfaceMaterial type, seeds from FLOOR_PRESETS

### Group B — Paint application (depends on Group A)

5. Extend `Wallpaper` + `Ceiling` types in `cad.ts` (add `paintId`, `limeWash`, `surfaceMaterialId`)
6. `PaintPicker.tsx` component
7. `PaintLibrary.tsx` component + wiring in Sidebar
8. `fabricSync.ts` — paint kind for wallpaper + ceiling renderCeilings
9. `WallMesh.tsx` — paint resolution
10. `CeilingMesh.tsx` — paint + surfaceMaterialId resolution

### Group C — Edit handles for custom elements (parallel to Group B)

11. `cadStore.ts` — `rotateCustomElement*`, `resizeCustomElement*` actions
12. `fabricSync.ts` — `renderCustomElements` handle overlays
13. `selectTool.ts` — custom element drag type + hit-test

### Group D — Polish (no type deps, mostly component changes)

14. `WainscotLibrary.tsx` — edit-in-place UI (`updateItem`)
15. `FramedArtLibrary.tsx` — edit-in-place + frame override per placement
16. `cadStore.ts` — `copyWallSide` action + Sidebar copy-side button

### Group E — Unified material catalog (depends on Group A)

17. `SurfaceMaterialPicker.tsx` + `SurfaceMaterialLibrary.tsx`
18. `FloorMesh.tsx` — smat_ prefix resolution
19. `CeilingMesh.tsx` — surfaceMaterialId resolution (extends step 10)
20. Sidebar integration — replace `FloorMaterialPicker` with `SurfaceMaterialPicker`

---

## Migration Strategy for Existing Data

**No snapshot migration required** (all changes are additive):

| Existing field | v1.3 behavior | Migration |
|---------------|---------------|-----------|
| `Wallpaper.kind = "color"` + `color` hex | Unchanged | None |
| `Ceiling.material` hex | Still resolves as before; `paintId` absent | None |
| `FloorMaterial.presetId` = FLOOR_PRESET_IDS value | Still resolves via FLOOR_PRESETS (legacy path) | None |
| `WainscotConfig.color` | Still renders as hex; paint integration optional in v1.4 | None |

New optional fields (`paintId`, `limeWash`, `surfaceMaterialId`) default to `undefined` in deserialized snapshots. All render paths check `if (paintId)` before attempting store lookup. No `migrateSnapshot` bump needed.

**IndexedDB libraries:** `paintStore.load()` checks for empty store → seeds F&B catalog. On repeat loads, IndexedDB wins (user additions preserved). `surfaceMaterialStore.load()` same pattern.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Embedding hex in the store for paint

**What goes wrong:** If the user edits a custom paint color's hex later, all surfaces that embedded the old hex are stale. They need to be found and updated individually.

**Instead:** Store `paintId`. Resolve to hex at render time from `paintStore`. One edit updates everywhere.

### Anti-Pattern 2: New wall field for paint (e.g., `wallPaint?: { A?: string; B?: string }`)

**What goes wrong:** Creates a third parallel per-side treatment system (alongside `wallpaper` and `wainscoting`), tripling the render logic surface. The existing `Wallpaper` type with `kind: "paint"` integrates cleanly into the existing per-side resolution.

**Instead:** Extend `Wallpaper.kind` with `"paint"`. Paint IS a wallpaper treatment conceptually.

### Anti-Pattern 3: Rewriting FloorMaterial to use SurfaceMaterial

**What goes wrong:** Requires a snapshot migration (`migrateSnapshot` v3), risks breaking existing saved projects, and duplicates work already done in Phase 12.

**Instead:** Keep `FloorMaterial` as-is. Add the `smat_` prefix convention as a routing signal. Existing `presetId` values continue to resolve via the `FLOOR_PRESETS` constant.

### Anti-Pattern 4: Storing custom element rotation in `PlacedCustomElement` as a separate field from products

**What goes wrong:** Both `PlacedProduct` and `PlacedCustomElement` have `rotation: number` and `sizeScale?: number`. If custom element handles use different field names, render code diverges and handle hit-test modules can't be reused.

**Instead:** Reuse `hitTestHandle`, `hitTestResizeHandle`, and `angleFromCenterToPointer` from the existing modules. The `PlacedCustomElement` shape already matches.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| F&B color seed data | 130 colors hardcoded in TS increases bundle size ~8KB | Accept — local-first tool, no CDN concern |
| Lime wash in 3D | Three.js has no built-in lime wash material | Emulate with `roughness: 0.95` + `bumpScale`. Full PBR texture is out of scope for v1.3. |
| paintStore not in CADSnapshot | Custom colors lost on project export (if export were ever added) | Acceptable for single-user local-first tool. Log as known gap. |
| Custom element hit-test | AABB ignores rotation — diagonal products are hard to click | Use the same AABB-ignores-rotation behavior as `PlacedProduct` hit-testing (existing precedent). Fix both in v1.4 if needed. |
| SurfaceMaterialPicker in sidebar | Sidebar is already dense | Open as a modal (same pattern as AddProductModal) not inline |
| `copyWallSide` with wallArt | wallArt items carry `id` — copying must re-generate ids or copied art will share ids with original | Deep clone with new `art_${uid()}` ids in the copy |

---

## Sources

- Direct analysis of `src/stores/cadStore.ts`, `src/types/cad.ts`, `src/types/framedArt.ts`
- Direct analysis of `src/canvas/tools/selectTool.ts` (handle system pattern)
- Direct analysis of `src/canvas/rotationHandle.ts`, `wallEditHandles.ts`, `resizeHandles.ts`
- Direct analysis of `src/stores/framedArtStore.ts`, `wainscotStyleStore.ts` (global library store pattern)
- Direct analysis of `src/three/CeilingMesh.tsx`, `src/data/floorMaterials.ts`
- `.planning/v1.2-MILESTONE-AUDIT.md` (tech debt items driving v1.2 polish pass)
- `.planning/PROJECT.md` (v1.3 feature scope and key decisions)

---

*Analysis date: 2026-04-05*
