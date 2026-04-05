# Phase 18: Color & Paint System - Research

**Researched:** 2026-04-05
**Domain:** React/TypeScript, Zustand, Fabric.js v6, Three.js/R3F — paint store, F&B catalog, 2D/3D color rendering, lime wash
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Paint picker lives as a new "PAINT" section in the existing `WallSurfacePanel` sidebar, below wallpaper
- **D-02:** F&B swatches displayed as dense grid of 20×20px color squares; hovering shows F&B name in tooltip; clicking applies immediately
- **D-03:** Hue family filtering via a row of small colored chips (Whites, Neutrals, Blues, Greens, Pinks, Yellows, Blacks)
- **D-04:** Recently-used palette (last 8 applied colors) pinned as a row at the top of the paint section
- **D-05:** Select wall first, then pick color — no "paint mode" tool
- **D-06:** Which side gets painted follows existing SIDE_A/SIDE_B toggle already in the wall panel
- **D-07:** "APPLY_TO_ALL_WALLS" button at the bottom of the paint section — one click, no confirmation
- **D-08:** Ceiling painting is a separate action/section — NOT coupled to wall painting via checkbox
- **D-09:** Install `react-colorful` (~3KB) for the custom color picker
- **D-10:** Custom colors appear in "MY_COLORS" section BELOW the F&B catalog grid
- **D-11:** "+ ADD_COLOR" button expands an inline row: name input + react-colorful picker + save button
- **D-12:** Right-click (or long-press) a custom swatch to show "DELETE" option — no edit mode toggle
- **D-13:** In 2D, lime wash shows as a subtle cloudy/stippled pattern overlay at ~20% opacity over wall color
- **D-14:** Lime wash toggle is per-placement (per wall/ceiling), NOT per-catalog-entry
- **D-15:** Lime wash available on both walls AND ceilings
- **R-01:** Custom paint colors stored in `CADSnapshot` (not standalone idb-keyval) to avoid CUSTOM-05 undo hazard
- **R-02:** `paintStore` follows `framedArtStore` pattern for the global F&B + custom library
- **R-03:** F&B 132-color catalog ships as static TypeScript data file (`src/data/farrowAndBall.ts`), never enters Zustand history
- **R-04:** Lime wash = `roughness: 0.95` on `meshStandardMaterial` (no custom shader)
- **R-05:** `Wallpaper.kind="paint"` with `paintId` foreign key (not embedded hex); old `kind="color"` deprecated with migration
- **R-06:** Install `react-colorful ^2.7.3` as new dependency

### Claude's Discretion
- Exact swatch grid dimensions (px per swatch, grid gap) — resolved in UI-SPEC: 20×20px, `gap-1`
- Exact lime wash 2D pattern generation approach — resolved in UI-SPEC: `fabric.Pattern` with small canvas tile showing random white dots at 20% opacity
- Recently-used palette data persistence approach — store in `CADSnapshot` (undo/redo aware)
- "APPLY_TO_ALL_WALLS" scope — paints every wall's currently-active side (per SIDE_A/SIDE_B toggle)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAINT-01 | User can apply a paint color to any wall side (2D shows solid fill, 3D shows colored material) | `Wallpaper.kind="paint"` with `paintId`; `fabricSync.ts` reads hex from `paintStore`; `WallMesh.tsx` resolves `paintId` → color prop on `meshStandardMaterial` |
| PAINT-02 | User can apply a paint color to any ceiling (2D + 3D) | `Ceiling` extended with `paintId?: string` + `limeWash?: boolean`; `CeilingMesh.tsx` resolves same way; `fabricSync.renderCeilings` reads `paintId` |
| PAINT-03 | User can browse Farrow & Ball 132-color catalog with swatch grid, name search, and hue family filter | `src/data/farrowAndBall.ts` static data file; swatch grid + filter chips + search input in `WallSurfacePanel` PAINT section |
| PAINT-04 | User can create, name, save, and delete custom paint colors via hex picker | `react-colorful ^2.7.3` `HexColorPicker`; custom colors in `CADSnapshot.customPaints`; `paintStore` manages CRUD; right-click DELETE |
| PAINT-05 | User can toggle lime wash finish on any paint color (renders as matte chalky surface in 3D) | Per-placement `limeWash` field on `Wallpaper` and `Ceiling`; `roughness: 0.95` in `meshStandardMaterial`; stippled Fabric overlay in 2D |
| PAINT-06 | User sees a recently-used palette row showing last-used paint colors | `recentPaints: string[]` (last 8 `paintId` values) in `CADSnapshot`; row at top of PAINT section, always visible |
| PAINT-07 | User can apply one paint color to all walls in a room with a single action | New `applyPaintToAllWalls(paintId, side)` action in `cadStore`; APPLY_TO_ALL_WALLS button in PAINT section; recently-used row updates |
</phase_requirements>

---

## Summary

Phase 18 builds a complete paint system on top of the existing v1.2 wall treatment infrastructure. The data model is largely already in place — `Wallpaper` per-side wrappers, `setWallpaper()` action, `updateCeiling()` action — the work is extending the type system with `kind="paint"` + `paintId`, adding `react-colorful` for custom color picking, building the F&B static catalog, and wiring the new UI section into `WallSurfacePanel.tsx`.

The critical design contract (from locked decisions) is: walls and ceilings reference paint by `paintId` (foreign key), never embedded hex. This means custom color edits propagate everywhere automatically. The F&B catalog stays out of Zustand entirely — it is a pure TypeScript module that both the UI and renderers import directly. Custom colors live in `CADSnapshot.customPaints` so undo/redo covers them (Pitfall 3 prevention).

Three.js color space is NOT a problem if the existing `renderWallpaperOverlay` pattern is followed — R3F's default `ColorManagement.enabled` handles sRGB hex strings correctly when passed to `meshStandardMaterial color={}`. The existing `baseColor = "#f8f5ef"` pattern is the verified safe path.

**Primary recommendation:** Build in four waves: (0) type definitions + static data + store foundation, (1) 3D rendering, (2) 2D rendering + UI section, (3) recently-used + apply-all + ceiling paint section.

---

## Standard Stack

### Core (existing — no version changes)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| zustand | ^5.0.12 | `paintStore` follows `framedArtStore` pattern exactly | Already installed |
| immer | ^11.1.4 | `produce()` in all store mutations | Already installed |
| idb-keyval | ^6.2.2 | `paintStore` persists custom colors to IndexedDB | Already installed |
| three | ^0.183.2 | `meshStandardMaterial` color + roughness for paint/limewash | Already installed |
| @react-three/fiber | ^8.17.14 | Declarative mesh rendering in `WallMesh`, `CeilingMesh` | Already installed |
| fabric | ^6.9.1 | Wall polygon fill + pattern overlay for 2D paint | Already installed |

### New Dependency
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| react-colorful | ^2.7.3 | `HexColorPicker` for custom color creation | 2.8KB gzipped, zero deps, outputs `#rrggbb` directly — locked decision R-06 |

**Version verified:** react-colorful is NOT currently in package.json — needs install.

**Installation:**
```bash
npm install react-colorful
```

### Alternatives Considered (all rejected by locked decisions)
| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| react-colorful | `<input type="color">` | Browser chrome varies, no hex text input |
| react-colorful | react-color | Unmaintained (2020), 70KB+ |
| Static F&B data file | npm colornerd package | 30K+ colors; we need 132; no reason for dep |
| paintId FK | Embedded hex in Wallpaper | Editing custom colors would leave stale hex everywhere |

---

## Architecture Patterns

### Recommended Project Structure (new files)
```
src/
  data/
    farrowAndBall.ts         → static 132-color F&B catalog (PaintColor[])
  types/
    paint.ts                 → PaintColor interface
  stores/
    paintStore.ts            → Zustand store: customPaints CRUD + idb-keyval
  components/
    PaintSection.tsx         → PAINT section (extracted from WallSurfacePanel for size)
    CeilingPaintSection.tsx  → ceiling paint section (or inline in PropertiesPanel)
  lib/
    colorUtils.ts            → blendWithWhite(), limeWashColor() helpers
```

### Pattern 1: `PaintColor` Type
**What:** Shared interface for both F&B catalog entries and custom user colors.
**When to use:** Any time a paint color is referenced, stored, or resolved.
```typescript
// src/types/paint.ts
export interface PaintColor {
  id: string;           // "fb_001" for F&B, "custom_abc" for user colors
  name: string;         // "Elephant's Breath", user-assigned name
  hex: string;          // "#f0ece0" — canonical sRGB value
  source: "farrow-ball" | "custom";
  hueFamily?: string;   // "NEUTRALS", "BLUES" etc — for filter chips (F&B only)
}
```
**Source:** ARCHITECTURE.md + CONTEXT.md locked decision R-05.

### Pattern 2: Wallpaper Extension (`kind="paint"`)
**What:** Extend the existing `Wallpaper` interface with a `"paint"` kind and `paintId` + `limeWash` fields.
**When to use:** When user applies a paint color to a wall side.
```typescript
// src/types/cad.ts — extend existing Wallpaper
export interface Wallpaper {
  kind: "color" | "pattern" | "paint";   // "paint" is new
  color?: string;       // legacy: kind="color" only
  paintId?: string;     // new: kind="paint" — FK into paintStore + F&B catalog
  limeWash?: boolean;   // new: per-placement lime wash toggle
  imageUrl?: string;    // kind="pattern"
  scaleFt?: number;
}
```
**Source:** CONTEXT.md R-05, ARCHITECTURE.md.

### Pattern 3: Ceiling Extension
**What:** Add `paintId` and `limeWash` to `Ceiling` type. Keep `material` string for backward compat.
**When to use:** When user applies paint to a ceiling.
```typescript
// src/types/cad.ts — extend Ceiling
export interface Ceiling {
  id: string;
  points: Point[];
  height: number;
  material: string;       // legacy hex or preset id — keep for compat
  paintId?: string;       // new: FK into paint catalog
  limeWash?: boolean;     // new: per-placement lime wash toggle
}
```
**Source:** ARCHITECTURE.md, CONTEXT.md D-08.

### Pattern 4: Custom Paints in CADSnapshot (Pitfall 3 prevention)
**What:** Custom user colors live in `CADSnapshot` alongside `customElements`.
**When to use:** Any time a user creates/deletes a custom paint color.
```typescript
// src/types/cad.ts — extend CADSnapshot
export interface CADSnapshot {
  version: 2;
  rooms: Record<string, RoomDoc>;
  activeRoomId: string | null;
  customElements?: Record<string, CustomElement>;
  customPaints?: PaintColor[];       // NEW — user-created colors, undo/redo safe
  recentPaints?: string[];           // NEW — last 8 paintIds, undo/redo aware
}
```
**Source:** CONTEXT.md R-01, PITFALLS.md Pitfall 3.

### Pattern 5: `paintStore` — framedArtStore Pattern
**What:** Global Zustand store for custom paint library management, idb-keyval persistence.
**When to use:** Custom paint CRUD (add/remove). F&B catalog resolves from static import only.

```typescript
// src/stores/paintStore.ts
import { create } from "zustand";
import { produce } from "immer";
import { get, set } from "idb-keyval";
import type { PaintColor } from "@/types/paint";

const PAINT_KEY = "room-cad-paint-custom";

interface PaintState {
  customColors: PaintColor[];
  loaded: boolean;
  load: () => Promise<void>;
  addCustomColor: (item: Omit<PaintColor, "id" | "source">) => string;
  removeCustomColor: (id: string) => void;
}

// Subscribe pattern: persist after load on items change (framedArtStore)
useFramedArtStore.subscribe((state, prev) => {
  if (state.loaded && state.customColors !== prev.customColors) {
    set(PAINT_KEY, state.customColors).catch(() => {});
  }
});
```
**Source:** ARCHITECTURE.md, `src/stores/framedArtStore.ts` (direct inspection, HIGH confidence).

### Pattern 6: Paint Resolution at Render Time
**What:** Both 2D (fabricSync) and 3D (WallMesh/CeilingMesh) resolve `paintId` → hex at render time using a shared helper.
**When to use:** In `renderWallpaperOverlay` and `WallMesh` render, when `wp.kind === "paint"`.

```typescript
// src/lib/colorUtils.ts
import { FB_COLORS } from "@/data/farrowAndBall";
import { usePaintStore } from "@/stores/paintStore";

/** Resolve a paintId to its hex string. Falls back to default if not found. */
export function resolvePaintHex(
  paintId: string,
  customColors: PaintColor[],
  fallback = "#f8f5ef"
): string {
  // Check F&B catalog first (static data, no store lookup)
  const fb = FB_COLORS.find((c) => c.id === paintId);
  if (fb) return fb.hex;
  // Check custom colors
  const custom = customColors.find((c) => c.id === paintId);
  if (custom) return custom.hex;
  return fallback;
}
```

**Important:** In `WallMesh.tsx` (a React component), use `usePaintStore((s) => s.customColors)` hook. In `fabricSync.ts` (imperative), use `usePaintStore.getState().customColors`. Do NOT call hooks outside React components.

**Source:** ARCHITECTURE.md, PITFALLS.md Pitfall 12.

### Pattern 7: `renderWallpaperOverlay` Extension for Paint
**What:** Current `renderWallpaperOverlay` in `WallMesh.tsx` handles `kind="color"` and `kind="pattern"`. Add a `kind="paint"` branch.
```typescript
// In WallMesh.tsx renderWallpaperOverlay:
if (wp.kind === "paint" && wp.paintId) {
  const hex = resolvePaintHex(wp.paintId, customColors);
  const roughness = wp.limeWash ? 0.95 : 0.85;
  return (
    <mesh key={key} position={[0, 0, thickness / 2 + bandOffset / 2]}>
      <planeGeometry args={[length, height]} />
      <meshStandardMaterial
        color={hex}
        roughness={roughness}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
```
**Source:** `src/three/WallMesh.tsx` line 92–121 (direct inspection), ARCHITECTURE.md.

### Pattern 8: `snapshot()` Must Include `customPaints` and `recentPaints`
**What:** The `snapshot()` function in `cadStore.ts` (lines 81–91) explicitly enumerates what it captures. Every new top-level field must be added here.
**Critical:** Failing to include `customPaints` here is the CUSTOM-05 failure mode.

```typescript
// cadStore.ts — extend snapshot()
function snapshot(state: CADState): CADSnapshot {
  const root = state as any;
  return {
    version: 2,
    rooms: JSON.parse(JSON.stringify(state.rooms)),
    activeRoomId: state.activeRoomId,
    ...(root.customElements
      ? { customElements: JSON.parse(JSON.stringify(root.customElements)) }
      : {}),
    // NEW: include customPaints and recentPaints
    ...(root.customPaints
      ? { customPaints: JSON.parse(JSON.stringify(root.customPaints)) }
      : {}),
    ...(root.recentPaints
      ? { recentPaints: [...root.recentPaints] }
      : {}),
  };
}
```
**Source:** `src/stores/cadStore.ts` lines 81–91 (direct inspection), PITFALLS.md Pitfall 3.

### Pattern 9: Lime Wash 2D — Fabric Pattern Overlay
**What:** A `fabric.Pattern` with a small canvas tile showing random white dots at 20% opacity, applied as overlay polygon over the wall's paint fill. Resolved in UI-SPEC.
**Implementation:**
```typescript
// In fabricSync.ts — for wall polygon fill:
// 1. Draw wall polygon with paint hex fill
// 2. If limeWash, draw a second Fabric.Rect with white fill at opacity 0.20
//    using a Pattern generated from a small canvas with random dot scatter
function makeLimeWashPattern(size = 32): fabric.Pattern {
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = size;
  patternCanvas.height = size;
  const ctx = patternCanvas.getContext("2d")!;
  // random white dots at low opacity
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.10})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return new fabric.Pattern({ source: patternCanvas, repeat: "repeat" });
}
```
**Source:** CONTEXT.md D-13, UI-SPEC implementation note 5.

### Pattern 10: `applyPaintToAllWalls` cadStore Action
**What:** New action in `cadStore` that iterates all walls in active room and calls `setWallpaper` for each.
**Scope (Claude's Discretion):** Paints the currently-active SIDE_A or SIDE_B — uses the `side` parameter.
```typescript
// cadStore.ts — new action
applyPaintToAllWalls: (paintId: string, side: WallSide) =>
  set(produce((s: CADState) => {
    const doc = activeDoc(s);
    if (!doc) return;
    pushHistory(s);
    for (const wall of Object.values(doc.walls)) {
      if (!wall.wallpaper) wall.wallpaper = {};
      wall.wallpaper[side] = { kind: "paint", paintId };
    }
    // Update recentPaints
    const root = s as any;
    const recent: string[] = root.recentPaints ?? [];
    root.recentPaints = [paintId, ...recent.filter((id: string) => id !== paintId)].slice(0, 8);
  })),
```
**Source:** CONTEXT.md D-07, architecture analysis.

### Anti-Patterns to Avoid
- **Embedding hex in Wallpaper for paint:** Store `paintId` FK, not hex. Editing a custom color would leave stale hex on all walls.
- **Putting F&B catalog in Zustand store:** 132 static colors in history × 50 entries = ~800KB heap waste. Import directly as a TypeScript module.
- **Putting F&B catalog in `CADSnapshot`:** Same problem. It's code, not data.
- **Calling `usePaintStore()` hook in `fabricSync.ts`:** `fabricSync` is not a React component. Use `usePaintStore.getState()` for imperative access.
- **Forgetting `customPaints` in `snapshot()`:** This is the CUSTOM-05 pattern. Always explicitly enumerate new top-level state fields in `snapshot()`.
- **Skipping the `kind="paint"` migration in `snapshotMigration.ts`:** The existing `kind="color"` approach works but R-05 locks in the `kind="paint"` + `paintId` model. Add migration for any `kind="color"` entries to keep old projects working cleanly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Custom hex color picker | `<input type="color">` extended | `react-colorful HexColorPicker` | Browser native picker has no hex text input, inconsistent chrome |
| IndexedDB persistence | Custom read/write logic | `idb-keyval get/set` (already installed) | Already used by framedArtStore, wainscotStyleStore |
| Global library store pattern | Custom store structure | Exact `framedArtStore.ts` pattern | Auto-persistence via subscribe, loaded gate, CRUD already proven |
| Immutable state mutations | Spread + reassign | `produce()` from immer | Already project pattern; Zustand + Immer is the standard |
| Swatch grid filter | Custom filtering library | Array `.filter()` + React state | 132 items, simple string search — zero library needed |

---

## Common Pitfalls

### Pitfall 1: Custom Paints Lost on Undo (CUSTOM-05 class)
**What goes wrong:** Custom paint colors added outside `CADSnapshot` are not included in `past[]`. After undo, walls reference `paintId` values that no longer exist in the paint library.
**Why it happens:** Developer puts custom colors in a separate IndexedDB key or Zustand store outside `cadStore`. The `snapshot()` function does not capture them.
**How to avoid:** Store custom paints at `CADSnapshot` level (`customPaints: PaintColor[]`). Extend the `snapshot()` function in `cadStore.ts` to include them. Extend `undo()` and `redo()` to restore them — same pattern as `customElements` at line 613.
**Warning signs:** Apply custom color to wall → undo → wall shows default color but custom color still in library. Reload → custom color gone.

### Pitfall 2: F&B Catalog Accidentally in Zustand History
**What goes wrong:** 132 F&B colors end up in `cadStore.past[]`. 50 history entries × ~8KB per entry = 400KB+ heap waste.
**Why it happens:** Developer adds F&B colors to `paintStore.items` and `paintStore` state gets included in `snapshot()`.
**How to avoid:** F&B catalog is a static import (`import { FB_COLORS } from "@/data/farrowAndBall"`), never in any Zustand store. Only `customPaints` (user-created, typically < 20 items) goes into `CADSnapshot`.
**Warning signs:** `JSON.stringify(useCADStore.getState().past[0]).length` > 50,000 characters.

### Pitfall 3: Two Competing Color Sources on Walls
**What goes wrong:** `Wallpaper.kind="color"` (old) and `Wallpaper.kind="paint"` (new) both set the wall color. `WallMesh.tsx` render logic hits the wrong branch.
**Why it happens:** The existing `renderWallpaperOverlay` handles `kind="color"` with `wp.color`. Paint adds `kind="paint"` with `paintId`. If the branch order is wrong, a `kind="paint"` entry falls through to the `kind="color"` handler and shows `undefined` (no color).
**How to avoid:** In `renderWallpaperOverlay`, check `kind === "paint"` FIRST (before `kind === "color"`), since that's the new path. Add migration in `snapshotMigration.ts`: if `wallpaper.A.kind === "color"`, it stays as-is (backward compat). Do not auto-upgrade old `kind="color"` entries — they still work fine.
**Warning signs:** Painted walls show as white/default in 3D after save + reload.

### Pitfall 4: `resolvePaintHex` Called in fabricSync as Hook
**What goes wrong:** `fabricSync.ts` is not a React component. Calling `usePaintStore()` inside it causes a React hook violation error.
**Why it happens:** `usePaintStore` is a Zustand hook. Using it outside a component tree throws.
**How to avoid:** In `fabricSync.ts`, use `usePaintStore.getState().customColors` (imperative store access). In React components (`WallMesh.tsx`, `PaintSection.tsx`), use the hook normally.
**Warning signs:** "Invalid hook call" error in console when painting a wall.

### Pitfall 5: Lime Wash Pattern Not Seeded (Random Dots Re-render)
**What goes wrong:** `makeLimeWashPattern()` uses `Math.random()` and is called on every `fabricSync` redraw. Each redraw generates a different dot pattern, causing the lime wash overlay to flicker.
**Why it happens:** `fabricSync` does a full clear-and-redraw on every store change. A new random pattern is generated each time.
**How to avoid:** Cache the `fabric.Pattern` instance keyed by hex (or just globally for a single static pattern). Generate once, reuse. A deterministic seeded approach also works.
**Warning signs:** Lime wash walls visibly shimmer or flicker when any other store change triggers a redraw.

### Pitfall 6: `recentPaints` Not Included in `snapshot()`
**What goes wrong:** The recently-used row shows the right colors before undo, but after undo it reverts — or after save/load it resets to empty.
**Why it happens:** `recentPaints: string[]` was added to `cadStore` state but not included in the `snapshot()` function.
**How to avoid:** Whenever a new field is added to `cadStore` top-level state, explicitly add it to `snapshot()`. Same pattern as `customElements`.

---

## Code Examples

### Verified Pattern: framedArtStore (template for paintStore)
```typescript
// Source: src/stores/framedArtStore.ts (direct inspection)
export const useFramedArtStore = create<FramedArtState>()((setState) => ({
  items: [],
  loaded: false,
  load: async () => {
    const stored = await get<FramedArtItem[]>(FRAMED_ART_KEY);
    if (stored && Array.isArray(stored)) {
      setState({ items: stored, loaded: true });
    } else {
      setState({ loaded: true });
    }
  },
  addItem: (item) => {
    const id = uid();
    setState(produce((s: FramedArtState) => { s.items.push({ id, ...item }); }));
    return id;
  },
  removeItem: (id) => setState(produce((s: FramedArtState) => {
    s.items = s.items.filter((x) => x.id !== id);
  })),
}));
// Subscribe for auto-persistence
useFramedArtStore.subscribe((state, prev) => {
  if (state.loaded && state.items !== prev.items) {
    set(FRAMED_ART_KEY, state.items).catch(() => {});
  }
});
```

### Verified Pattern: CeilingMesh color resolution (current code to extend)
```typescript
// Source: src/three/CeilingMesh.tsx line 26 (direct inspection)
const color = ceiling.material.startsWith("#") ? ceiling.material : "#f5f5f5";
// EXTEND TO:
const color = ceiling.paintId
  ? resolvePaintHex(ceiling.paintId, customColors)
  : ceiling.material.startsWith("#") ? ceiling.material : "#f5f5f5";
const roughness = ceiling.limeWash ? 0.95 : 0.8;
```

### Verified Pattern: `snapshot()` extension pattern (current code)
```typescript
// Source: src/stores/cadStore.ts lines 81-91 (direct inspection)
function snapshot(state: CADState): CADSnapshot {
  const root = state as any;
  return {
    version: 2,
    rooms: JSON.parse(JSON.stringify(state.rooms)),
    activeRoomId: state.activeRoomId,
    ...(root.customElements
      ? { customElements: JSON.parse(JSON.stringify(root.customElements)) }
      : {}),
  };
}
// EXTEND with same pattern for customPaints and recentPaints
```

### Verified Pattern: undo/redo restore (current code to mirror)
```typescript
// Source: src/stores/cadStore.ts line 613 (direct inspection)
undo: () => set(produce((s: CADState) => {
  if (s.past.length === 0) return;
  s.future.push(snapshot(s));
  const prev = s.past.pop()!;
  s.rooms = prev.rooms;
  s.activeRoomId = prev.activeRoomId;
  (s as any).customElements = (prev as any).customElements ?? {};
  // ADD: (s as any).customPaints = (prev as any).customPaints ?? [];
  // ADD: (s as any).recentPaints = (prev as any).recentPaints ?? [];
})),
```

### Verified Pattern: `setWallpaper` action (exists — use directly)
```typescript
// Source: src/stores/cadStore.ts line 410 (direct inspection)
setWallpaper: (wallId, side, wallpaper) =>
  set(produce((s: CADState) => {
    // ... existing logic handles any Wallpaper shape including kind="paint"
  }))
// No store change needed for wall paint application — just call with:
// setWallpaper(wallId, activeSide, { kind: "paint", paintId, limeWash })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<input type="color">` for wall color | `react-colorful HexColorPicker` (new) | Phase 18 | Better UX, no browser chrome variation, hex text input |
| `Wallpaper.kind="color"` with hex string | `Wallpaper.kind="paint"` with `paintId` FK | Phase 18 | Custom color edits propagate; named color tracking |
| No paint catalog | 132 F&B named colors + custom palette | Phase 18 | Jessica browses by color name, not hex |
| Ceiling hex string only | `Ceiling.paintId` + `limeWash` | Phase 18 | Ceiling paint matches wall paint system |

---

## Open Questions

1. **CeilingPaintSection location**
   - What we know: D-08 says ceiling painting is separate from wall painting; UI-SPEC names it `CeilingPaintSection`
   - What's unclear: Where exactly does it render? `PropertiesPanel` when a ceiling is selected? A new sidebar section?
   - Recommendation: Mount in `PropertiesPanel.tsx` conditionally when a ceiling is selected — same pattern as `WallSurfacePanel` mounts when a wall is selected. No new layout work needed.

2. **`applyPaintToAllWalls` scope when no side is explicitly active**
   - What we know: Claude's Discretion says use "currently-active side per the toggle"
   - What's unclear: The active side is `uiStore.activeWallSide` — is it per-wall or global?
   - Recommendation: `applyPaintToAllWalls` takes an explicit `side: WallSide` parameter passed from the UI (the currently active side toggle in `WallSurfacePanel`). This is unambiguous.

3. **Migration for existing `kind="color"` wallpaper entries**
   - What we know: R-05 locks in `kind="paint"` with `paintId` as the new approach; old `kind="color"` stays valid
   - What's unclear: Should `migrateSnapshot` lift old `kind="color"` entries to the paint system?
   - Recommendation: No automatic migration. Old `kind="color"` entries render fine via existing path in `WallMesh.tsx`. Only NEW paint applications use `kind="paint"`. This is the zero-migration additive approach. Add a clear comment in the rendering code.

---

## Environment Availability

Step 2.6: SKIPPED for existing dependencies. Only external check needed is `react-colorful`.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| react-colorful | PAINT-04 custom color picker | NOT installed | — | None — locked decision R-06 requires it |
| Node / npm | Package installation | Available | v24.14.0 | — |
| vitest | Test suite | Available | ^4.1.2 (via npx) | — |

**Missing dependencies with no fallback:**
- `react-colorful ^2.7.3` — not in `package.json`. Must be installed at start of Wave 0.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (via npx) |
| Config file | `vite.config.ts` (vitest inline config) |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run` |

**Current status:** 115 tests passing, 3 todo, 22 test files — all green as of research date.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAINT-01 | `setWallpaper` with `kind="paint"` + `paintId` stores correctly | unit | `npx vitest run tests/cadStore.test.ts` | ✅ (extend) |
| PAINT-01 | `resolvePaintHex` returns correct hex for F&B and custom IDs | unit | `npx vitest run tests/colorUtils.test.ts` | ❌ Wave 0 |
| PAINT-02 | `updateCeiling` with `paintId` stores correctly | unit | `npx vitest run tests/cadStore.test.ts` | ✅ (extend) |
| PAINT-03 | F&B catalog has 132 entries, each has id/name/hex/hueFamily | unit | `npx vitest run tests/farrowAndBall.test.ts` | ❌ Wave 0 |
| PAINT-03 | Hue filter reduces catalog to correct subset | unit | `npx vitest run tests/farrowAndBall.test.ts` | ❌ Wave 0 |
| PAINT-04 | `paintStore.addCustomColor` adds to `customColors`, persists | unit | `npx vitest run tests/paintStore.test.ts` | ❌ Wave 0 |
| PAINT-04 | `paintStore.removeCustomColor` removes correctly | unit | `npx vitest run tests/paintStore.test.ts` | ❌ Wave 0 |
| PAINT-05 | `Wallpaper.limeWash=true` survives snapshot round-trip | unit | `npx vitest run tests/snapshotMigration.test.ts` | ✅ (extend) |
| PAINT-06 | `recentPaints` updates when paint applied, max 8 entries | unit | `npx vitest run tests/cadStore.paint.test.ts` | ❌ Wave 0 |
| PAINT-06 | `recentPaints` survives undo/redo | unit | `npx vitest run tests/cadStore.paint.test.ts` | ❌ Wave 0 |
| PAINT-07 | `applyPaintToAllWalls` sets all walls' active side to given paintId | unit | `npx vitest run tests/cadStore.paint.test.ts` | ❌ Wave 0 |
| PAINT-07 | `applyPaintToAllWalls` pushes one history entry | unit | `npx vitest run tests/cadStore.paint.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=dot`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/colorUtils.test.ts` — covers `resolvePaintHex` for F&B and custom ids, fallback behavior
- [ ] `tests/farrowAndBall.test.ts` — covers catalog count (132), hue family distribution, no duplicate ids
- [ ] `tests/paintStore.test.ts` — covers `addCustomColor`, `removeCustomColor`, persistence gating
- [ ] `tests/cadStore.paint.test.ts` — covers `applyPaintToAllWalls`, `recentPaints` update, undo/redo safety for `customPaints`

---

## Project Constraints (from CLAUDE.md)

These directives are extracted from `./CLAUDE.md` and are binding on all implementation work.

| Directive | Category | Applies To |
|-----------|----------|------------|
| Use `font-mono text-[9px] tracking-widest uppercase` for all panel labels | Styling | PaintSection.tsx, CeilingPaintSection.tsx |
| All UI labels in SCREAMING_SNAKE_CASE | Copy | All new UI text |
| No shadcn/ui — custom component set only | Architecture | PaintSection is hand-built |
| Zustand + Immer (`produce()`) for all store mutations | Architecture | paintStore.ts, cadStore extensions |
| `idb-keyval` for IndexedDB persistence | Architecture | paintStore.ts |
| Tailwind utility classes, avoid arbitrary values where possible | Styling | Use `max-h-40` not `max-h-[160px]` |
| Custom CSS classes `.glass-panel`, `.ghost-border` etc. — do not remove | Styling | Safe to leave existing classes alone |
| Obsidian CAD theme tokens only — `obsidian-*`, `text-text-*`, `accent`, `accent-light` | Styling | All new components |
| `font-mono` (IBM Plex Mono) for all UI chrome | Typography | All labels, values, identifiers |
| Naming: `handle*` prefix for event handlers, `toggle*` for boolean toggles | Naming | `handleApplyPaint`, `handleAddColor` |
| Store naming: camelCase with suffix — e.g. `paintStore.ts` | Naming | `paintStore.ts` |
| GSD workflow enforcement — no direct edits outside GSD | Process | In effect |

---

## Sources

### Primary (HIGH confidence)
- `src/types/cad.ts` — Direct inspection: `Wallpaper`, `Ceiling`, `CADSnapshot` current shapes
- `src/stores/cadStore.ts` — Direct inspection: `snapshot()`, `undo()`/`redo()`, `setWallpaper()`, `updateCeiling()` patterns
- `src/stores/framedArtStore.ts` — Direct inspection: template store pattern (zustand + immer + idb-keyval + subscribe)
- `src/three/WallMesh.tsx` — Direct inspection: `renderWallpaperOverlay()` pattern, `baseColor`, `meshStandardMaterial` props
- `src/three/CeilingMesh.tsx` — Direct inspection: `color` resolution logic, current `material.startsWith("#")` guard
- `src/canvas/fabricSync.ts` — Direct inspection: `renderCeilings()`, `renderCustomElements()`, wall polygon fill
- `src/components/WallSurfacePanel.tsx` — Direct inspection: SIDE_A/SIDE_B toggle, `setWallpaper` call pattern, section structure
- `src/lib/snapshotMigration.ts` — Direct inspection: `migrateWallsPerSide` additive pattern, no destructive migration needed
- `.planning/phases/18-color-paint-system/18-CONTEXT.md` — All locked decisions (D-01 through D-15, R-01 through R-06)
- `.planning/phases/18-color-paint-system/18-UI-SPEC.md` — Visual contract, dimensions, interaction patterns
- `.planning/research/PITFALLS.md` — Pitfalls 1–7 directly affecting Phase 18
- `.planning/research/ARCHITECTURE.md` — Build order (Groups A–E), data flow diagrams, component boundaries
- `.planning/research/STACK.md` — Stack decisions, react-colorful justification, alternatives rejected
- `tests/` directory — 22 test files confirmed, vitest passes (115 tests)

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — F&B hue family buckets, 132-color count, feature table stakes
- `.planning/REQUIREMENTS.md` — PAINT-01 through PAINT-07 requirement text

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed except react-colorful; versions verified
- Architecture: HIGH — based on direct inspection of all files to be modified
- Pitfalls: HIGH — sourced from prior codebase audit + direct code inspection
- F&B catalog content: MEDIUM — hex accuracy relies on community sources (not official F&B); sufficient for visualization

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable stack; 30-day validity)
