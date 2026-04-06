# Phase 20: Advanced Materials - Research

**Researched:** 2026-04-05
**Domain:** Unified surface material catalog (floor + ceiling textures), Three.js material system
**Confidence:** HIGH

## Summary

Phase 20 unifies the floor and ceiling surface material systems into a single catalog, adds ceiling texture presets (plaster, wood plank, concrete, painted drywall), and fixes the known floor texture cache bug that corrupts tile scale in split view. The existing codebase has two separate systems: `FLOOR_PRESETS` in `src/data/floorMaterials.ts` (8 color-only presets) and `Ceiling.material` (a string field that is effectively unused -- only `paintId` drives ceiling color). These must merge into one `SurfaceMaterialCatalog` that both `FloorMesh` and `CeilingMesh` consume.

The critical constraint is MAT-03: existing projects must load without errors. The `FloorMaterial` interface stored in `RoomDoc.floorMaterial` uses `presetId` values like `"WOOD_OAK"`. These IDs must remain valid in the new catalog. No migration step is acceptable -- the new catalog must be a strict superset of the old floor presets.

**Primary recommendation:** Create a unified `src/data/surfaceMaterials.ts` catalog that includes all 8 existing floor presets (same IDs) plus 4 new ceiling presets. Add a `surfaceMaterialId` field to the `Ceiling` interface. Fix the shared-texture-mutation bug before adding any new texture paths. The `FloorMaterialPicker` evolves into a `SurfaceMaterialPicker` component reused for both floor and ceiling contexts.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAT-01 | User can pick floor and ceiling materials from a single unified surface material catalog | New `surfaceMaterials.ts` catalog combines floor presets + ceiling presets. Single `SurfaceMaterialPicker` component used in both FloorMaterialPicker (sidebar) and PropertiesPanel (ceiling selected). |
| MAT-02 | User can apply ceiling texture presets (plaster, wood plank, concrete, painted drywall) | Add `surfaceMaterialId` to `Ceiling` interface. CeilingMesh reads this field to apply color + roughness from the catalog. Ceiling presets use solid colors (matching how floor presets work today). |
| MAT-03 | Existing floor presets continue working without breaking saved projects (additive migration) | All 8 existing `FloorPresetId` values become entries in the unified catalog with identical `id`, `color`, and `roughness` values. No schema migration needed -- `RoomDoc.floorMaterial.presetId` still resolves against the same IDs. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- React 18 locked (R3F v8 + drei v9 compatibility)
- Fabric.js for 2D, Three.js for 3D -- both read from Zustand, neither mutates the other
- Local-first, no backend -- IndexedDB only
- Tailwind CSS v4 via `@tailwindcss/vite`
- No shadcn/ui -- custom component set only
- Zustand v5 + Immer for state management
- Font mono (IBM Plex Mono) for all UI chrome
- Obsidian CAD theme: use design tokens for colors/surfaces
- UPPER_SNAKE_CASE for UI labels (e.g., `SURFACE_MATERIALS`, `PLASTER`, `WOOD_PLANK`)
- Store-driven rendering: canvas fully cleared and redrawn from store state
- `uid()` from `src/lib/geometry.ts` for ID generation

## Standard Stack

### Core (already installed, no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | ^0.183.2 | 3D material rendering | Already used for FloorMesh + CeilingMesh |
| @react-three/fiber | ^8.17.14 | React renderer for Three.js | Already used in ThreeViewport |
| zustand | ^5.0.12 | State management | All CAD state lives here |
| immer | ^11.1.4 | Immutable state updates | Used in cadStore actions |

**No new packages required.** This phase is entirely additive data + component work using the existing stack.

## Architecture Patterns

### Recommended File Changes

```
src/
  data/
    floorMaterials.ts            # KEEP (backward compat) -- re-export from surfaceMaterials
    surfaceMaterials.ts           # NEW: unified catalog type + all presets
  types/
    cad.ts                       # MODIFY: add surfaceMaterialId to Ceiling
  three/
    CeilingMesh.tsx              # MODIFY: resolve surfaceMaterialId for color + roughness
    FloorMesh.tsx                # NO CHANGE (reads FloorMaterial.presetId, unchanged)
    floorTexture.ts              # FIX: clone texture before mutating .repeat
  components/
    SurfaceMaterialPicker.tsx    # NEW: reusable swatch grid for floor + ceiling
    FloorMaterialPicker.tsx      # MODIFY: delegate to SurfaceMaterialPicker with surface="floor" filter
    CeilingPaintSection.tsx      # MODIFY: add surface material picker above paint section
    PropertiesPanel.tsx          # MODIFY: wire ceiling material picker
```

### Pattern 1: Unified Surface Material Catalog

**What:** A single `SURFACE_MATERIALS` record keyed by string ID, with a `surface` field indicating `"floor" | "ceiling" | "both"`.

**When to use:** Any time the UI needs to display material options for a surface.

**Example:**
```typescript
// src/data/surfaceMaterials.ts
export type SurfaceTarget = "floor" | "ceiling" | "both";

export interface SurfaceMaterial {
  id: string;
  label: string;          // UPPER_SNAKE_CASE
  color: string;          // hex
  roughness: number;      // 0-1
  surface: SurfaceTarget; // which surfaces this material applies to
  defaultScaleFt: number; // pattern repeat distance
}

export const SURFACE_MATERIALS: Record<string, SurfaceMaterial> = {
  // --- Existing floor presets (same IDs, same values) ---
  WOOD_OAK:    { id: "WOOD_OAK",    label: "WOOD_OAK",    color: "#b08158", roughness: 0.7,  surface: "floor", defaultScaleFt: 0.5 },
  WOOD_WALNUT: { id: "WOOD_WALNUT", label: "WOOD_WALNUT", color: "#5a3a28", roughness: 0.7,  surface: "floor", defaultScaleFt: 0.5 },
  TILE_WHITE:  { id: "TILE_WHITE",  label: "TILE_WHITE",  color: "#efefef", roughness: 0.3,  surface: "floor", defaultScaleFt: 1 },
  TILE_BLACK:  { id: "TILE_BLACK",  label: "TILE_BLACK",  color: "#1c1c1c", roughness: 0.3,  surface: "floor", defaultScaleFt: 1 },
  CONCRETE:    { id: "CONCRETE",    label: "CONCRETE",    color: "#8a8a8a", roughness: 0.85, surface: "both",  defaultScaleFt: 4 },
  CARPET:      { id: "CARPET",      label: "CARPET",      color: "#c4b294", roughness: 0.95, surface: "floor", defaultScaleFt: 1 },
  MARBLE:      { id: "MARBLE",      label: "MARBLE",      color: "#ece5d6", roughness: 0.2,  surface: "floor", defaultScaleFt: 2 },
  STONE:       { id: "STONE",       label: "STONE",       color: "#7a6f60", roughness: 0.8,  surface: "floor", defaultScaleFt: 1.5 },
  // --- New ceiling presets ---
  PLASTER:         { id: "PLASTER",         label: "PLASTER",         color: "#f0ebe0", roughness: 0.9,  surface: "ceiling", defaultScaleFt: 4 },
  WOOD_PLANK:      { id: "WOOD_PLANK",      label: "WOOD_PLANK",      color: "#a0794f", roughness: 0.75, surface: "ceiling", defaultScaleFt: 0.5 },
  PAINTED_DRYWALL: { id: "PAINTED_DRYWALL", label: "PAINTED_DRYWALL", color: "#f5f5f5", roughness: 0.8,  surface: "ceiling", defaultScaleFt: 4 },
  // CONCRETE already has surface: "both"
};

// Helper to filter by surface
export function materialsForSurface(target: "floor" | "ceiling"): SurfaceMaterial[] {
  return Object.values(SURFACE_MATERIALS).filter(
    (m) => m.surface === target || m.surface === "both"
  );
}
```

### Pattern 2: Backward-Compatible Floor Preset Re-export

**What:** `floorMaterials.ts` re-exports from `surfaceMaterials.ts` so all existing imports remain valid.

**Example:**
```typescript
// src/data/floorMaterials.ts (modified)
import { SURFACE_MATERIALS, type SurfaceMaterial } from "./surfaceMaterials";

// Re-export existing types unchanged
export type FloorPresetId = "WOOD_OAK" | "WOOD_WALNUT" | "TILE_WHITE" | "TILE_BLACK" | "CONCRETE" | "CARPET" | "MARBLE" | "STONE";
export type FloorPreset = SurfaceMaterial; // alias for backward compat

export const FLOOR_PRESETS: Record<FloorPresetId, FloorPreset> = Object.fromEntries(
  (["WOOD_OAK", "WOOD_WALNUT", "TILE_WHITE", "TILE_BLACK", "CONCRETE", "CARPET", "MARBLE", "STONE"] as FloorPresetId[])
    .map((id) => [id, SURFACE_MATERIALS[id]])
) as Record<FloorPresetId, FloorPreset>;

export const FLOOR_PRESET_IDS: FloorPresetId[] = Object.keys(FLOOR_PRESETS) as FloorPresetId[];
```

### Pattern 3: Ceiling Surface Material Integration

**What:** Add optional `surfaceMaterialId` to `Ceiling` interface. Resolution priority: `surfaceMaterialId` > `paintId` > `material` (legacy hex) > default.

**Example:**
```typescript
// In cad.ts Ceiling interface
export interface Ceiling {
  id: string;
  points: Point[];
  height: number;
  material: string;              // legacy hex color fallback
  paintId?: string;              // F&B or custom paint color
  limeWash?: boolean;            // lime wash toggle
  surfaceMaterialId?: string;    // NEW: FK into SURFACE_MATERIALS catalog
}
```

```typescript
// In CeilingMesh.tsx -- resolution order
const resolved = useMemo(() => {
  if (ceiling.surfaceMaterialId) {
    const mat = SURFACE_MATERIALS[ceiling.surfaceMaterialId];
    if (mat) return { color: mat.color, roughness: mat.roughness };
  }
  if (ceiling.paintId) {
    return {
      color: resolvePaintHex(ceiling.paintId, customColors),
      roughness: ceiling.limeWash ? 0.95 : 0.8,
    };
  }
  return {
    color: ceiling.material.startsWith("#") ? ceiling.material : "#f5f5f5",
    roughness: 0.8,
  };
}, [ceiling, customColors]);
```

### Anti-Patterns to Avoid

- **Separate catalogs per surface type:** Do not create `CEILING_PRESETS` as a separate record. The whole point of MAT-01 is one unified catalog.
- **Modifying FloorPresetId values:** The 8 existing IDs are serialized in IndexedDB projects. Changing them breaks MAT-03.
- **Adding `floorMaterial.surfaceMaterialId`:** The existing `FloorMaterial.presetId` already serves this purpose. Do not add a parallel field -- just ensure `SURFACE_MATERIALS` contains entries keyed by the same `FloorPresetId` strings.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Procedural ceiling textures | Canvas2D texture generation for plaster/wood | Solid color + roughness from catalog | Matches how floor presets work today; procedural textures are MAT-F03 (deferred) |
| Texture tiling math | Custom repeat calculation | `tileRepeatFor()` from floorTexture.ts | Already handles room-dimension-to-repeat mapping |
| Material preview swatches | Custom swatch component | Reuse pattern from FloorMaterialPicker dropdown | Already has color preview + selection state |

## Common Pitfalls

### Pitfall 1: Floor Texture Cache Mutates Shared `.repeat`

**What goes wrong:** `getFloorTexture()` returns a module-level singleton `THREE.CanvasTexture` and mutates its `.repeat` property in place. In split view with two rooms, the second room's dimensions overwrite the first room's repeat values, causing tile scale corruption.

**Why it happens:** `floorTexture.ts` line 73: `cached.repeat.set(x, y)` mutates the shared instance.

**How to avoid:** Clone the texture per consumer. Each `FloorMesh` instance should get its own texture with independent `.repeat` values:
```typescript
export function getFloorTexture(roomW: number, roomL: number): THREE.CanvasTexture {
  if (!cached) cached = createFloorTexture();
  const clone = cached.clone();
  clone.source = cached.source; // share the underlying image data
  const { x, y } = tileRepeatFor(roomW, roomL);
  clone.repeat.set(x, y);
  clone.needsUpdate = true;
  return clone;
}
```

**Warning signs:** Floor tiles look stretched/squished when switching between rooms in split view.

**This fix is a prerequisite for Phase 20.** STATE.md explicitly tracks this as known debt: "Floor texture cache mutates shared .repeat -- fragile under split-view."

### Pitfall 2: Ceiling surfaceMaterialId Conflicts with paintId

**What goes wrong:** If both `surfaceMaterialId` and `paintId` are set on a Ceiling, which one wins? Ambiguous state leads to visual bugs.

**Why it happens:** Phase 18 added `paintId` to Ceiling. Phase 20 adds `surfaceMaterialId`. Both affect the same visual property (surface color/roughness).

**How to avoid:** Establish clear precedence: `surfaceMaterialId` > `paintId` > `material` (legacy). When the user applies a surface material, clear `paintId` and `limeWash`. When the user applies paint, clear `surfaceMaterialId`. The UI should make it obvious which mode is active.

**Warning signs:** Ceiling color doesn't change when applying a material because paintId is still set.

### Pitfall 3: Breaking Backward Compatibility with FloorPresetId

**What goes wrong:** If `surfaceMaterials.ts` uses different IDs than the existing `FloorPresetId` values, all saved projects with floor materials break on load.

**Why it happens:** `FloorMaterial.presetId` is serialized to IndexedDB as strings like `"WOOD_OAK"`.

**How to avoid:** The `SURFACE_MATERIALS` record MUST include entries keyed by every existing `FloorPresetId` value. Use the exact same string IDs. The `floorMaterials.ts` re-export ensures TypeScript catches any divergence at compile time.

**Warning signs:** Floor appears as default wood after loading an old project.

### Pitfall 4: Ceiling Material Picker vs. Paint Picker UX Confusion

**What goes wrong:** User sees both a material picker and a paint picker for the same ceiling and doesn't understand the relationship.

**How to avoid:** In the PropertiesPanel ceiling section, show the surface material picker as the primary control. Below it, show the paint section. When a surface material is active, show a clear label like "MATERIAL: PLASTER" and dim/disable the paint picker. When paint is active, show "CUSTOM_PAINT" and dim the material picker. A "CLEAR" button on each resets that specific mode.

## Code Examples

### Floor Texture Clone Fix

```typescript
// src/three/floorTexture.ts -- fixed version
export function getFloorTexture(roomW: number, roomL: number): THREE.CanvasTexture {
  if (!cached) cached = createFloorTexture();
  const tex = cached.clone();
  tex.source = cached.source; // share canvas data, independent repeat/offset
  const { x, y } = tileRepeatFor(roomW, roomL);
  tex.repeat.set(x, y);
  tex.needsUpdate = true;
  return tex;
}
```

### Ceiling Resolution in CeilingMesh

```typescript
// src/three/CeilingMesh.tsx -- updated resolution
import { SURFACE_MATERIALS } from "@/data/surfaceMaterials";

const { color, roughness } = useMemo(() => {
  // Priority 1: surface material preset
  if (ceiling.surfaceMaterialId) {
    const mat = SURFACE_MATERIALS[ceiling.surfaceMaterialId];
    if (mat) return { color: mat.color, roughness: mat.roughness };
  }
  // Priority 2: paint color
  if (ceiling.paintId) {
    return {
      color: resolvePaintHex(ceiling.paintId, customColors),
      roughness: ceiling.limeWash ? 0.95 : 0.8,
    };
  }
  // Priority 3: legacy material string
  return {
    color: ceiling.material.startsWith("#") ? ceiling.material : "#f5f5f5",
    roughness: 0.8,
  };
}, [ceiling.surfaceMaterialId, ceiling.paintId, ceiling.limeWash, ceiling.material, customColors]);
```

### cadStore Actions for Ceiling Material

```typescript
// In cadStore.ts -- new action
setCeilingSurfaceMaterial: (ceilingId: string, materialId: string | undefined) =>
  set(produce((s: CADState) => {
    const doc = activeDoc(s);
    if (!doc?.ceilings?.[ceilingId]) return;
    pushHistory(s);
    const c = doc.ceilings[ceilingId];
    if (materialId) {
      c.surfaceMaterialId = materialId;
      // Clear paint to avoid conflict (Pitfall 2)
      delete c.paintId;
      delete c.limeWash;
    } else {
      delete c.surfaceMaterialId;
    }
  })),
```

### SurfaceMaterialPicker Component

```tsx
// src/components/SurfaceMaterialPicker.tsx
import { materialsForSurface, type SurfaceMaterial } from "@/data/surfaceMaterials";

interface Props {
  surface: "floor" | "ceiling";
  activeId: string | undefined;
  onSelect: (id: string | undefined) => void;
}

export default function SurfaceMaterialPicker({ surface, activeId, onSelect }: Props) {
  const materials = materialsForSurface(surface);
  return (
    <div className="grid grid-cols-4 gap-1">
      {materials.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(activeId === m.id ? undefined : m.id)}
          className={`p-1 rounded-sm border ${
            activeId === m.id ? "border-accent ring-1 ring-accent/30" : "border-outline-variant/20"
          }`}
        >
          <div
            className="w-full aspect-square rounded-sm"
            style={{ backgroundColor: m.color }}
          />
          <span className="font-mono text-[7px] text-text-dim block mt-0.5 truncate">
            {m.label}
          </span>
        </button>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Floor: 8 color-only presets in `floorMaterials.ts` | Same (Phase 12) | v1.2 | No procedural textures, just solid colors + roughness |
| Ceiling: `material` string field (unused) | `paintId` drives color (Phase 18) | v1.3 | `Ceiling.material` is vestigial except as hex fallback |
| Floor texture: shared singleton | Shared singleton (known bug) | v1.0 | Must fix before adding ceiling textures |

**Deprecated/outdated:**
- `Ceiling.material` as a material preset ID: Never actually implemented. The field only works as a hex color string fallback. Phase 20 replaces this intent with `surfaceMaterialId`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.x with happy-dom |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAT-01 | `materialsForSurface("floor")` returns all floor presets; `materialsForSurface("ceiling")` returns ceiling presets; shared presets appear in both | unit | `npx vitest run tests/surfaceMaterials.test.ts -x` | Wave 0 |
| MAT-01 | SurfaceMaterialPicker renders correct swatches for surface prop | unit | `npx vitest run tests/SurfaceMaterialPicker.test.tsx -x` | Wave 0 |
| MAT-02 | CeilingMesh resolves `surfaceMaterialId` to correct color + roughness | unit | `npx vitest run tests/ceilingMaterial.test.ts -x` | Wave 0 |
| MAT-02 | `setCeilingSurfaceMaterial` action clears paintId when material set | unit | `npx vitest run src/__tests__/cadStore.paint.test.ts -x` | Extend existing |
| MAT-03 | `FLOOR_PRESETS` re-export matches original 8 IDs exactly | unit | `npx vitest run tests/surfaceMaterials.test.ts -x` | Wave 0 |
| MAT-03 | Existing FloorMaterial snapshot loads and resolves correctly | unit | `npx vitest run tests/snapshotMigration.test.ts -x` | Extend existing |
| BUG-FIX | `getFloorTexture` returns distinct texture instances per call (no shared repeat) | unit | `npx vitest run tests/floorTexture.test.ts -x` | Modify existing (currently asserts `a === b`) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/surfaceMaterials.test.ts` -- covers MAT-01, MAT-03 (catalog correctness + backward compat)
- [ ] `tests/ceilingMaterial.test.ts` -- covers MAT-02 (resolution priority logic)
- [ ] Update `tests/floorTexture.test.ts` -- flip assertion from `a === b` to `a !== b` after clone fix

## Open Questions

1. **Concrete as "both" floor and ceiling?**
   - What we know: Concrete is a valid material for both surfaces. Exposed concrete ceilings are common in modern/industrial design.
   - What's unclear: Whether Jessica would find this confusing vs. having separate floor-concrete and ceiling-concrete entries.
   - Recommendation: Use `surface: "both"` for Concrete. The unified picker filters by context, so she only sees it when relevant. No duplication needed.

2. **Should applying a ceiling surface material clear paint, or coexist?**
   - What we know: Having both active creates ambiguity (Pitfall 2). The precedence rule resolves rendering, but the UI should prevent the state.
   - What's unclear: Whether users might want to toggle between "I picked plaster" and "I picked Farrow & Ball Elephant's Breath" without losing the other setting.
   - Recommendation: Mutual exclusion. Applying material clears paint; applying paint clears material. Simpler mental model. This matches how the existing FloorMaterialPicker works (choosing a preset clears custom upload and vice versa).

## Sources

### Primary (HIGH confidence)
- `src/data/floorMaterials.ts` -- current 8 floor presets, exact IDs and values
- `src/types/cad.ts` -- Ceiling, FloorMaterial, RoomDoc interfaces
- `src/three/CeilingMesh.tsx` -- current ceiling render path (paint only)
- `src/three/FloorMesh.tsx` -- current floor render path (preset color or custom texture)
- `src/three/floorTexture.ts` -- shared singleton texture bug
- `src/components/FloorMaterialPicker.tsx` -- current floor UI pattern
- `src/components/CeilingPaintSection.tsx` -- current ceiling paint UI
- `src/stores/cadStore.ts` -- setFloorMaterial, addCeiling, updateCeiling actions
- `src/lib/snapshotMigration.ts` -- migration infrastructure
- `.planning/STATE.md` -- known debt: "Floor texture cache mutates shared .repeat"

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` -- prior research on floor texture cache fix approach
- `.planning/research/SUMMARY.md` -- prior research on unified material catalog strategy

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing libraries
- Architecture: HIGH -- extends well-established patterns (floor presets, ceiling paint, cadStore actions)
- Pitfalls: HIGH -- floor texture bug is documented in STATE.md; precedence conflict is straightforward to resolve

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no external dependency changes expected)
