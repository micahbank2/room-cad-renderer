# Phase 68: Material Application System (MAT-APPLY-01) - Research

**Researched:** 2026-05-07
**Domain:** Surface→Material wiring + snapshot v5→v6 migration + 2D fabric / 3D Three render unification
**Confidence:** HIGH (every legacy code path located with exact line ranges; migration template proven by Phase 51)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Migration Strategy**
- **D-01:** **Migration approach (option a from REQUIREMENTS.md hypothesis).** At project load time (snapshot v5→v6 path), convert every legacy `Wallpaper`, `FloorMaterial`, paint color, and ceiling-material entry into an auto-generated `Material` and write the new `materialId` field on the surface. Old fields stay readable for one milestone (v1.17) so a buggy migration can fall back; planned removal in v1.18. Idempotent — re-loading an already-migrated project is a no-op. Pattern mirrors **Phase 51 DEBT-05 async pre-pass before Immer `produce()`**.

**Paint as Material**
- **D-02:** **Paint becomes a Material with a `colorHex` field**, mutually exclusive with `colorMapId`. The Material entity from Phase 67 grows one optional field: `colorHex?: string` (e.g. `"#F5F0E8"`). Renderer logic: if `colorHex` is set, render as flat color; if `colorMapId` is set, render as textured surface. Both being set is a type error. Migrated paint Materials get auto-generated names (e.g., `"Paint #F5F0E8"`); user can rename via the existing Material edit flow.

**Surface Coverage**
- **D-03:** **Phase 68 covers exactly four surface kinds:** wall sides (`Wall.materialIdA`, `Wall.materialIdB`), `Room.floorMaterialId` (replacing `Room.floorMaterial`), `Ceiling.materialId`, and `CustomElement` faces (per-face `materialId` map keyed by face direction). **Wainscoting, crown molding, and wall art are explicitly out of scope** — they stay as their own systems and are candidates for Phase 70 "Assemblies".

**Tile-Size Precedence**
- **D-04:** **Material `tileSizeFt` is the default; per-surface `scaleFt` (Phase 66) overrides when set.** Resolver: `resolveSurfaceTileSize(surface, material) = surface.scaleFt ?? material.tileSizeFt ?? 1`. Phase 66's per-surface tile-size inputs become "override-or-default" inputs — empty value means "use Material default". Clearing the override falls back gracefully. Same precedence logic applies to walls / floors / ceilings.

**Picker Component Shape**
- **D-05:** **One unified `<MaterialPicker surface={"wallSide" | "floor" | "ceiling" | "customElementFace"} value={materialId} onChange={...} />` component.** Replaces PaintSection, CeilingPaintSection, FloorMaterialPicker, and SurfaceMaterialPicker entirely. Surface-specific filtering via `materialsForSurface(materials, surface)` (extends existing `data/surfaceMaterials.ts` pattern). PropertiesPanel becomes substantially shorter — one section instead of three.

**Single-Undo Apply**
- **D-06:** Applying a Material to a surface is a **single undo entry**, matching Phase 31's transaction pattern (push history at picker open, NoHistory mid-pick if previewing, commit at confirm). Mid-pick previewing is optional and decided at plan-phase based on UX feel — but the single-undo guarantee is locked.

**Custom-Element Face Materials**
- **D-07:** `CustomElement` gains an optional `faceMaterials?: Record<FaceDirection, string>` map (face direction = `"top" | "bottom" | "north" | "south" | "east" | "west"` or similar). Plan-phase research picks the exact face-direction enum based on existing `CustomElement` mesh code. Each face independently resolves to a Material or falls back to the catalog default.

**Default Fallbacks for Missing PBR Maps**
- **D-08:** When a Material has no `roughnessMapId`, the renderer uses `roughness = 0.8`. When no `reflectionMapId`, the renderer uses `metalness = 0` and skips the env-map slot. These defaults are codified in `resolveSurfaceMaterial` so 2D and 3D agree.

### Claude's Discretion
- Migration heuristic for paint colors that lack `colorHex` (legacy theme tokens) — plan-phase researcher picks; default to obsidian-base or sentinel.
- Whether `MaterialPicker` shows surface-category tabs or flat list — apply Phase 33 design-system primitives if natural.
- Whether mid-pick preview is enabled and on what debounce.
- Dedup semantics for migrated paint Materials — default: share when same hex.
- Migration commit message phrasing.
- Test-driver shape (`window.__driveApplyMaterial` etc.) — follow Phase 31/34/67 precedent.

### Deferred Ideas (OUT OF SCOPE)
- Wainscoting / crown molding as "Assemblies" — Phase 70 candidate.
- Wall art as placed-Material — major refactor, deferred.
- Filtering/sorting Materials by cost / lead time / brand — Phase 67 already deferred.
- Removal of legacy fields (`wallpaper`, `floorMaterial`, paint, ceiling materials) — v1.18 cleanup phase.
- Per-application Material parameter overrides beyond tile-size (opacity, rotation).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAT-APPLY-01 | Jessica selects any wall side, floor, ceiling, or custom-element face and applies a Material from her library through one unified picker. Both 2D fabric texture-fill AND 3D mesh consume the resolver. Apply is single undo. Existing assignments auto-migrate at load (snapshot v5→v6, idempotent). Snapshot round-trips `surface.materialId`. | §"Legacy Code Map" (every read/write site located), §"Migration Mechanics" (concrete v5→v6 routing in `cadStore.loadSnapshot`), §"MaterialPicker UX" (PropertiesPanel host sites identified), §"2D Fabric Surface Fills" (paint-only today; texture fill is the new work), §"3D Three Material Binding" (4 Mesh files + 3 caches mapped), §"Single-Undo Apply" (Phase 31 pair-pattern locked). |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- **Pattern #5 Tool cleanup:** N/A — no canvas tools added this phase.
- **Pattern #7 StrictMode-safe useEffect cleanup:** ANY new `useEffect` writing to a module-level registry must return a cleanup function with identity check. Test-driver bridges (`window.__driveApplyMaterial` etc.) MUST be installed at module-eval time behind `import.meta.env.MODE === "test"`, NOT in a useEffect (mirror `useMaterials.ts:139-149`).
- **D-33 Icon policy:** lucide-react ONLY for new chrome icons (`X`, `Check`, `ChevronDown`). No new `material-symbols-outlined` imports.
- **D-34 Spacing:** zero-arbitrary `p-[Npx]` / `m-[Npx]` / `gap-[Npx]` / `rounded-[Npx]` in `PropertiesPanel.tsx`. Stick to `p-1/2/4/6/8`, `gap-1/2/4`, `rounded-sm/md/lg`.
- **D-39 Reduced motion:** `useReducedMotion()` guard on every new animation.
- **VIZ-10 audit:** every `<primitive attach="map" object={tex} dispose={null} />` already in WallMesh / FloorMesh / CeilingMesh is KEPT. Direct `map={tex}` props (Phase 49 / 50 pattern) are also KEPT — they're the texture-binding contract that survives 2D↔3D toggles.

---

## Summary

Phase 68 is **structurally analogous to Phase 51** (DEBT-05 floor-material migration): an async pre-pass before `produce()`, idempotent, sweeping every room's surface fields. The novelty is breadth — Phase 51 touched only `RoomDoc.floorMaterial`; Phase 68 touches Wall.wallpaper.A/B, Room.floorMaterial, Ceiling (paintId / surfaceMaterialId / userTextureId / material), CustomElement (new faceMaterials field), plus the four picker components.

**Single biggest insight:** the four legacy pickers all have surprisingly compact wiring. PaintSection (68 LOC) and SurfaceMaterialPicker (95 LOC) are tiny. CeilingPaintSection (143 LOC) and FloorMaterialPicker (176 LOC) are mid-sized. The combined surface area of the FOUR pickers is **482 LOC** — a unified MaterialPicker should land at ~250-300 LOC. PropertiesPanel.tsx will SHRINK by ~100 LOC after the consolidation.

**Single biggest risk:** the 2D Fabric canvas does NOT currently render floor textures or wallpaper textures — it only renders **paint colors as wall fills** (`fabricSync.ts:336-342`). Floors are rendered by Three.js, not Fabric. The MAT-APPLY-01 success criterion #2 ("Picked Material renders in BOTH 2D fabric texture-fill AND 3D mesh") requires NEW 2D code that doesn't exist today. Plan-phase must design async texture-load + redraw for Fabric.js Patterns. This is the largest engineering risk in the phase and absent from CONTEXT.md.

**Primary recommendation:** Build in this order:
1. Type extension (`Material.colorHex`, `Wall.materialIdA/B`, `Room.floorMaterialId`, `Ceiling.materialId`, `CustomElement.faceMaterials`).
2. Resolver (`resolveSurfaceMaterial` + `resolveSurfaceTileSize`) in new `src/lib/surfaceMaterial.ts` — this is the contract every consumer reads.
3. Snapshot v5→v6 async migration in `snapshotMigration.ts` (mirror `migrateFloorMaterials` async pre-pass exactly).
4. cadStore actions (`applySurfaceMaterial` / `applySurfaceMaterialNoHistory` pair).
5. Unified `MaterialPicker` component (replace four legacy pickers).
6. 3D rewire (WallMesh / FloorMesh / CeilingMesh / CustomElementMesh) — mostly add a "materialId branch" at the top of the existing priority chain.
7. 2D fabric Pattern fill (NEW — texture cache + async load + redraw on resolve).

---

## Legacy Code Map

Every file the planner needs to know about, grouped by concern.

### A. Legacy paint / wallpaper / floor / ceiling — DATA TYPES

| File | Lines | Role |
|------|-------|------|
| `src/types/cad.ts` | 30-43 | `WallSegment.wallpaper?: { A?: Wallpaper; B?: Wallpaper }` — per-side wallpaper |
| `src/types/cad.ts` | 45-55 | `Wallpaper` interface — discriminated union `kind: "color" \| "pattern" \| "paint"` |
| `src/types/cad.ts` | 197-244 | `Ceiling` — has FOUR overlapping treatment fields: `material` (string), `paintId`, `surfaceMaterialId`, `userTextureId`, plus `scaleFt` (Phase 42/66) |
| `src/types/cad.ts` | 246-259 | `FloorMaterial` — discriminated union `kind: "preset" \| "custom" \| "user-texture"` |
| `src/types/cad.ts` | 167-177 | `CustomElement` — has `color: string` only (NO faceMaterials yet — D-07 adds it) |
| `src/types/cad.ts` | 273 | `RoomDoc.floorMaterial?: FloorMaterial` |
| `src/types/cad.ts` | 310-322 | `CADSnapshot.version: 5` ← BUMP TO 6 |

### B. Legacy paint / wallpaper / floor / ceiling — STORE ACTIONS

| File | Action | Line | Notes |
|------|--------|------|-------|
| `src/stores/cadStore.ts` | `setWallpaper(wallId, side, wallpaper)` | 687-706 | history + cleanup empty `wallpaper`; tracks recentPaints on paint apply |
| `src/stores/cadStore.ts` | `setFloorMaterial(material)` | 676-685 | history; no NoHistory variant exists |
| `src/stores/cadStore.ts` | `updateCeiling(id, changes)` / `updateCeilingNoHistory` | 571-594 | already a Phase 31 pair |
| `src/stores/cadStore.ts` | `setCeilingSurfaceMaterial(ceilingId, materialId)` | 649-664 | clears paint when material set |
| `src/stores/cadStore.ts` | `applyPaintToAllWalls(paintId, side)` | 1382-1396 | bulk action; recentPaints tracked |
| `src/stores/cadStore.ts` | `loadSnapshot(raw)` | 1338-1355 | **THE migration host** — async pre-pass + produce(). Add `migrateV5ToV6` here (after `migrateV4ToV5`). |

### C. Legacy paint / wallpaper / floor / ceiling — RENDER SITES

**3D (Three.js):**

| File | Lines | What it renders | Branches in priority order |
|------|-------|-----------------|---------------------------|
| `src/three/WallMesh.tsx` | 237-326 | `renderWallpaperOverlay` per side | (1) `userTextureId` → direct `map={userTex}` (Phase 49), (2) `kind="paint"` → flat color via `resolvePaintHex`, (3) `kind="pattern"+imageUrl` → primitive map, (4) `kind="color"` → flat color. Side B and Side A rendered as separate planes. |
| `src/three/FloorMesh.tsx` | 47-138 | Floor plane | (1) `kind="user-texture"` → primitive map (line 109), (2) preset+pbr → `<PbrSurface>`, (3) preset → flat color, (4) custom data-URL → cached texture, (5) fallback procedural |
| `src/three/CeilingMesh.tsx` | 27-184 | Ceiling polygon | (1) `userTextureId` → primitive map (line 154), (2) `surfaceMaterialId+pbr` → `<PbrSurface>`, (3) `surfaceMaterialId` → flat color, (4) `paintId` → resolvePaintHex, (5) legacy `material` string |
| `src/three/CustomElementMesh.tsx` | 1-58 | Custom element box/plane | Single `<meshStandardMaterial color={element.color} roughness={0.7} metalness={0}>` — NO per-face material today (D-07 adds it) |

**2D (Fabric.js):**

| File | Lines | What it renders |
|------|-------|-----------------|
| `src/canvas/fabricSync.ts` | 336-342 | Per-side wall paint fill (`wpA.kind === "paint"` → `resolvePaintHex` → split-polygon fill) |
| `src/canvas/fabricSync.ts` | 38-57, 236, 404, 422 | Lime-wash overlay pattern (cached) |
| **No 2D floor or wallpaper texture rendering exists today.** Floors are rendered only in 3D. | | This is the engineering gap noted in §Summary — Phase 68 must ADD 2D Fabric pattern fills for textured Materials. |

### D. Legacy texture caches (3D)

| File | Lines | Cache shape | Reusable for Phase 68? |
|------|-------|-------------|-----------------------|
| `src/three/pbrTextureCache.ts` | 1-133 | Refcounted `Map<url, {tex, refs, channel}>` for catalog PBR maps | YES — primary cache for Material color/roughness/reflection maps |
| `src/three/wallpaperTextureCache.ts` | 1-97 | Non-disposing `Map<url, Promise<Texture>>` for wallpaper data-URLs | KEEP for back-compat (legacy fields stay readable through v1.17) |
| `src/three/floorTexture.ts` | 1-86 | Procedural fallback CanvasTexture singleton | KEEP — fallback when Material missing |
| `src/three/userTextureCache.ts` | (not read) | UserTexture (IDB blob → Three.Texture) | YES — Material wraps UserTexture refs (Phase 67 D-09); colorMapId resolves through this cache |
| `src/three/wallArtTextureCache.ts` | (not read) | Wall-art-specific cache | UNTOUCHED — wall art is OUT OF SCOPE per D-03 |

### E. The four legacy pickers (replace with unified MaterialPicker per D-05)

| File | LOC | Surface | Mount site |
|------|-----|---------|-----------|
| `src/components/PaintSection.tsx` | 68 | wall side (paint mode) | `WallSurfacePanel.tsx:288` |
| `src/components/SurfaceMaterialPicker.tsx` | 95 | floor + ceiling (catalog presets + MyTextures tab) | `FloorMaterialPicker.tsx:101`, `CeilingPaintSection.tsx:60` |
| `src/components/CeilingPaintSection.tsx` | 143 | ceiling | `PropertiesPanel.tsx:348` |
| `src/components/FloorMaterialPicker.tsx` | 176 | floor | (search needed — likely `RoomSettings.tsx`) |
| `src/components/WallSurfacePanel.tsx` | 497 | wall (HOSTS PaintSection) | `PropertiesPanel.tsx:406` |

**WallSurfacePanel is partially in scope:** the WALLPAPER section (lines 205-285), the PAINT section (line 288 → PaintSection), and the per-tile-size input (lines 254-285) all consolidate into MaterialPicker. The wainscoting / crown / wall art sections (lines 290-493) are OUT OF SCOPE per D-03 — keep them.

### F. Phase 67 Material foundation (consume)

| File | LOC | Role |
|------|-----|------|
| `src/types/material.ts` | 50 | `Material` type + `MATERIAL_ID_PREFIX`. Phase 68 EXTENDS with `colorHex?: string` |
| `src/lib/materialStore.ts` | (verified to exist) | IDB CRUD + dedup. Phase 68 migration WRITES auto-generated Materials here |
| `src/hooks/useMaterials.ts` | 149 | React hook with cross-instance sync. Phase 68 picker CONSUMES |
| `src/components/MaterialCard.tsx` | 153 | Library card primitive. Phase 68 picker REUSES inside grid |
| `src/components/MaterialThumbnail.tsx` | 81 | Thumbnail with fallback color. REUSE for swatch render |

### G. Migration template (mirror this exactly)

| File | Lines | Pattern |
|------|-------|---------|
| `src/lib/snapshotMigration.ts` | 127-176 | `migrateOneFloorMaterial` (async per-entry helper) + `migrateFloorMaterials` (async pre-pass with idempotency gate `if (snap.version >= 3) return snap`) |
| `src/lib/snapshotMigration.ts` | 193-219 | `migrateV3ToV4`, `migrateV4ToV5` (sync seed-empty-collection pattern) |
| `src/stores/cadStore.ts` | 1338-1355 | `loadSnapshot` pipeline — async pre-pass BEFORE `produce()` (Immer constraint). v5→v6 chains here. |

### H. Single-undo Phase 31 reference pair

| File | Lines | Pattern |
|------|-------|---------|
| `src/stores/cadStore.ts` | 506-531 | `resizeProductAxis` (history) + `resizeProductAxisNoHistory` (mid-drag). Direct template for `applySurfaceMaterial` / `applySurfaceMaterialNoHistory` |
| `src/stores/cadStore.ts` | 600-633 | `resizeCeilingAxis` / `…NoHistory` — second example, with optional anchor argument |

### I. Test patterns from Phase 67

| File | Role |
|------|------|
| `tests/materialStore.test.ts` | IDB CRUD + dedup unit tests (vitest + fake-indexeddb) |
| `tests/materialStore.isolation.test.ts` | Isolation: writes don't fire project autosave |
| `tests/materialCard.test.tsx` | MaterialCard hover tooltip |
| `tests/e2e/specs/material-upload.spec.ts` | E2E upload flow (Playwright) |
| `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` | E2E view-mode persistence — direct template for Phase 68 e2e |
| `tests/phase31Undo.test.tsx` | Single-undo invariant test pattern |

---

## Locked Decisions Reminder (D-01 .. D-08)

See `<user_constraints>` block above. Verbatim from CONTEXT.md.

---

## Implementation Approach Per Success Criterion

### Success Criterion 1 — Unified MaterialPicker in PropertiesPanel

**Files to create:**
- `src/components/MaterialPicker.tsx` — props: `surface: "wallSide" | "floor" | "ceiling" | "customElementFace"`, `value: string | undefined`, `onChange(materialId: string | undefined)`, optional `tileSizeOverride?: number`, `onTileSizeChange?(v: number | undefined)`.
- Internal: subscribes `useMaterials()`, calls `materialsForSurface(materials, surface)` (extend `data/surfaceMaterials.ts` to accept Material[] + new surface union).
- Reuses existing `MaterialCard` for the grid (Phase 67 primitive).
- Tile-size input rendered when `material?.tileSizeFt` exists OR `tileSizeOverride !== undefined` — shows placeholder = material default, value = override.

**Files to modify:**
- `src/components/PropertiesPanel.tsx` — replace mount points at lines 348 (CeilingPaintSection) and 406 (WallSurfacePanel inner paint) with MaterialPicker.
- `src/components/WallSurfacePanel.tsx` — DELETE wallpaper section (lines 205-285) + PaintSection mount (line 288), replace with MaterialPicker. Wainscoting / crown / wall-art sections KEPT.
- `src/components/RoomSettings.tsx` (or wherever FloorMaterialPicker mounts) — replace with MaterialPicker.

**Files to delete (after migration soak in v1.17):**
- DEFER deletion to v1.18: PaintSection.tsx, CeilingPaintSection.tsx, FloorMaterialPicker.tsx, SurfaceMaterialPicker.tsx. Keep them mounted nowhere but compile-clean for one milestone (CONTEXT.md D-01 safety net).

### Success Criterion 2 — Picked Material renders in BOTH 2D fabric AND 3D mesh

**3D — straightforward addition.** Add a NEW priority-1 "materialId branch" to each Mesh's existing if-else chain:

```ts
// Pseudocode for WallMesh.renderWallpaperOverlay, line 246:
const wp = wall.wallpaper?.[side];
const materialId = side === "A" ? wall.materialIdA : wall.materialIdB; // NEW
const resolved = useResolvedMaterial(materialId); // NEW hook (wraps useMaterials + pbrTextureCache)

if (resolved) {
  // Phase 68 priority 1 — Material wins everything
  return resolved.colorHex
    ? <flat-color mesh with resolved.colorHex, roughness=0.8>
    : <textured mesh with map={resolved.colorMap}, roughnessMap?, etc>;
}
// ↓ existing priority chain unchanged for back-compat
if (wp?.userTextureId && userTex) { ... }
if (wp?.kind === "paint") { ... }
```

Same pattern for FloorMesh, CeilingMesh, CustomElementMesh (with face-direction lookup).

**Files modified:**
- `src/three/WallMesh.tsx` — add materialId branch in `renderWallpaperOverlay` (line 246).
- `src/three/FloorMesh.tsx` — add materialId branch above line 95 (`useUserTextureBranch`).
- `src/three/CeilingMesh.tsx` — add materialId branch above line 126 (`useUserTextureBranch`).
- `src/three/CustomElementMesh.tsx` — replace single `<meshStandardMaterial color={element.color}>` with per-face `<meshStandardMaterial>` array on the boxGeometry (Three.js supports per-face material arrays via `material={[mat0..mat5]}`). Face indices for box: 0=+X (east), 1=-X (west), 2=+Y (top), 3=-Y (bottom), 4=+Z (north), 5=-Z (south). **Plan-phase research must confirm this exact mapping** by reading Three.js BoxGeometry docs.

**2D — NEW work, NOT trivial.** Today fabricSync.ts only renders **paint as colored polygon fill**. Adding texture fill requires:

1. Async texture-image preload via `fabric.Image.fromURL` or fetching the UserTexture blob URL.
2. `fabric.Pattern` construction with `repeatX/Y` derived from `resolveSurfaceTileSize`.
3. Module-level cache `Map<materialId, fabric.Pattern>` to avoid reconstruction on every redraw.
4. Trigger redraw when texture finishes loading (callback into `redraw()` flow in `FabricCanvas.tsx`).
5. **Floor surface in 2D:** today there's no floor render at all in fabricSync. Plan-phase must decide whether to add one (recommended: yes — it's part of the "paint a floor a Material" expectation). Render as a single `fabric.Rect` covering the room interior at z-index below walls.

**Files modified:**
- `src/canvas/fabricSync.ts` — add helper `getMaterialPattern(material, surface, dims): fabric.Pattern | null` near line 38 (next to `getLimeWashPattern`). Wire into wall-side fill (line 336-342), add floor render (new code), add ceiling render (NEW — ceilings aren't rendered in 2D today either; verify this with plan-phase).
- New file: `src/canvas/materialPatternCache.ts` — async loader + cache, parallel to `wallpaperTextureCache.ts`.

### Success Criterion 3 — Apply is single undo entry

Mirror Phase 31 exactly. Add to cadStore:

```ts
// src/stores/cadStore.ts — new actions section
applySurfaceMaterial: (
  surface: SurfaceTarget,
  materialId: string | undefined,
) => void;
applySurfaceMaterialNoHistory: (
  surface: SurfaceTarget,
  materialId: string | undefined,
) => void;
applySurfaceTileSize: (surface: SurfaceTarget, scaleFt: number | undefined) => void;
applySurfaceTileSizeNoHistory: (...) => void;
```

Where `SurfaceTarget = { kind: "wallSide", wallId: string, side: "A" | "B" } | { kind: "floor", roomId: string } | { kind: "ceiling", ceilingId: string } | { kind: "customElementFace", placedId: string, face: FaceDirection }`.

Pattern: `pushHistory(s)` once at start of `applySurfaceMaterial`, then mutate. NoHistory variant skips `pushHistory`. Mid-pick preview (if enabled) calls NoHistory; commit calls history-pushing variant.

### Success Criterion 4 — Existing assignments auto-migrate at load

Add to `src/lib/snapshotMigration.ts`:

```ts
export async function migrateV5ToV6(snap: CADSnapshot): Promise<CADSnapshot> {
  if (snap.version >= 6) return snap; // idempotency gate

  for (const doc of Object.values(snap.rooms)) {
    // 1. Floor material
    if (doc.floorMaterial && !(doc as any).floorMaterialId) {
      (doc as any).floorMaterialId = await migrateFloorToMaterial(doc.floorMaterial);
    }
    // 2. Each wall, each side
    for (const wall of Object.values(doc.walls)) {
      const wp = wall.wallpaper;
      if (!wp) continue;
      for (const side of ["A", "B"] as const) {
        const w = wp[side];
        if (!w) continue;
        const fieldName = side === "A" ? "materialIdA" : "materialIdB";
        if (!(wall as any)[fieldName]) {
          (wall as any)[fieldName] = await migrateWallpaperToMaterial(w);
        }
      }
    }
    // 3. Each ceiling
    for (const c of Object.values(doc.ceilings ?? {})) {
      if (!(c as any).materialId) {
        (c as any).materialId = await migrateCeilingToMaterial(c);
      }
    }
  }
  // 4. Each custom element — NO migration; faceMaterials starts empty.
  //    The existing `color` field continues rendering until the user explicitly
  //    applies a Material to a face (D-07).

  (snap as { version: number }).version = 6;
  return snap;
}
```

Wire into `cadStore.loadSnapshot` (line 1343):

```ts
const migrated = await migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migratedV3)));
```

Note: `migrateV5ToV6` must be ASYNC because `materialStore.saveMaterialWithDedup` is async. Pattern A from Phase 51.

### Success Criterion 5 — Snapshot serialization preserves materialId

Already free — `surface.materialIdA/B`, `floorMaterialId`, `ceiling.materialId`, `customElement.faceMaterials` all live in the same RoomDoc/Wall/Ceiling/CustomElement plain-object tree that `JSON.stringify(snapshot)` already round-trips. No new serialization code. **One gotcha:** verify `idb-keyval`'s `set` accepts the new shape — it accepts arbitrary structured-cloneable values, so `Record<FaceDirection, string>` is fine.

---

## Migration Mapping Table

Legacy field → new Material shape, with idempotency rule.

| Legacy entity | Legacy fields read | Action | Resulting Material | New surface field written |
|--------------|--------------------|--------|--------------------|---------------------------|
| **Wallpaper kind="color"** (Wall.wallpaper.A/B) | `color: string` (hex) | Generate paint Material with `colorHex = color`. Auto-name `"Paint #{color}"`. Dedup on colorHex (default share — CONTEXT.md discretion). | `{ name: "Paint #F5F0E8", colorHex: "#F5F0E8", tileSizeFt: 1, ...rest empty }` | `wall.materialIdA` or `wall.materialIdB` |
| **Wallpaper kind="paint"** (Wall.wallpaper.A/B) | `paintId: string` → resolve via `resolvePaintHex(paintId, customColors)` | Generate paint Material. Use Farrow & Ball name if available, else `"Paint #{hex}"`. **NOTE: `limeWash` flag on wallpaper has NO Material equivalent in Phase 68** — drop it. (Open question — see §Open Questions.) | `{ name: "Pavilion Gray", colorHex: "#B5B0A8", tileSizeFt: 1 }` | `wall.materialIdA` or `wall.materialIdB` |
| **Wallpaper kind="pattern"** with `userTextureId` (Phase 34) | `userTextureId`, `scaleFt` | Generate textured Material wrapping the same userTextureId. Reuse Phase 67 wrapper architecture (D-09). Auto-name from UserTexture's name if available. | `{ name: <userTexture.name>, colorMapId: <userTextureId>, colorSha256: <fetch from UserTexture>, tileSizeFt: <userTexture.tileSizeFt> }` | `wall.materialIdA/B` + `wall.scaleFt` if user had Phase 66 override |
| **Wallpaper kind="pattern"** with legacy `imageUrl` data-URL (pre-Phase 34) | `imageUrl`, `scaleFt` | Run through Phase 51 pattern: SHA-256 → saveUserTextureWithDedup → wrap in Material. | Same as above | Same |
| **FloorMaterial kind="preset"** (Room.floorMaterial) | `presetId` → SURFACE_MATERIALS catalog | **Don't migrate to a new Material** — built-in catalog presets (WOOD_OAK, MARBLE, etc.) stay as catalog entries. Plan-phase decides: (a) seed Phase 68 with a `defaultMaterials` set populated from SURFACE_MATERIALS, OR (b) keep `floorMaterialId` empty and let renderer fall back to legacy preset path. **Recommendation: option (a)** — seed catalog Materials on first migration so the picker has something to show out of the box. | `{ name: "Wood Oak", colorHex: "#b08158", tileSizeFt: 0.5 }` (or with PBR maps when SURFACE_MATERIALS entry has them) | `room.floorMaterialId` |
| **FloorMaterial kind="custom"** (legacy data-URL) | `imageUrl`, `scaleFt`, `rotationDeg` | Phase 51 already migrated these to `kind="user-texture"` at v2→v3. Phase 68 sees only `kind="user-texture"` — handle that branch only. (Verify with Phase 51 SUMMARY.md.) | n/a — Phase 51 already did the heavy lift | n/a |
| **FloorMaterial kind="user-texture"** | `userTextureId`, `scaleFt`, `rotationDeg` | Wrap in Material. **Drop `rotationDeg`** — Material has no rotation field today. (Open question.) | `{ colorMapId: <userTextureId>, tileSizeFt: <scaleFt> }` | `room.floorMaterialId` |
| **Ceiling.surfaceMaterialId** | catalog id (PLASTER, WOOD_PLANK, PAINTED_DRYWALL, CONCRETE) | Same as FloorMaterial preset — seed from SURFACE_MATERIALS. | `{ name: "Plaster", ...catalog data... }` | `ceiling.materialId` |
| **Ceiling.userTextureId** | userTextureId + Phase 42/66 `scaleFt` | Wrap. | `{ colorMapId: <userTextureId>, tileSizeFt: <scaleFt> }` | `ceiling.materialId` |
| **Ceiling.paintId** | paintId | Generate paint Material. | `{ colorHex: <resolved> }` | `ceiling.materialId` |
| **Ceiling.material** (legacy hex string) | `material: string` | If starts with `#`, wrap as paint Material. Else legacy preset id — wrap as preset. | `{ colorHex }` or preset wrap | `ceiling.materialId` |
| **CustomElement.color** | `color: string` (hex) | NO MIGRATION (D-07): faceMaterials starts empty, renderer falls back to existing `color` field. User opts in by applying a Material to a specific face. | n/a | n/a |

**Idempotency rules (every migration helper):**

1. Top of function: `if (snap.version >= 6) return snap` (gate at version level).
2. Per-entity: `if (entity.materialId) return` — if the new field is already populated, skip. This handles mid-migration crash scenarios.
3. Material dedup: `findMaterialByColorSha256` (textures) and `findPaintMaterialByHex` (paints) — re-running migration finds existing Materials, doesn't duplicate.
4. Catalog preset seeding: idempotent via `findMaterialByName("Wood Oak")` or marker field `Material.presetSourceId?: string` (recommended — distinguishes seeded-from-preset Materials from user-uploaded ones; helps v1.18 cleanup).

**Failure mode (mirror Phase 51 line 152):** wrap each per-entity migration in try/catch, log to `console.warn("[Phase68] migration failed — entry preserved as legacy"`, return the original entity unchanged. The legacy field stays intact (D-01 safety net), so the renderer's existing priority chain still produces a valid render.

---

## MaterialPicker UX Architecture

### Selection state today

`uiStore.selectedIds: string[]` — single-select dominant pattern. PropertiesPanel reads `selectedIds[0]` and discriminates by entity kind via sequential `if (wall) ... if (ceiling) ...`. Multi-select shows bulk-actions panel only (PropertiesPanel.tsx:223-268).

**For wall sides:** `uiStore.activeWallSide: "A" | "B"` — already exists; WallSurfacePanel.tsx:19. Picker uses this.

**For custom-element faces:** No face-selection state today. Plan-phase must add `uiStore.activeCustomElementFace?: FaceDirection` (or pass face explicitly to picker). Recommendation: add a small face-toggle UI in PropertiesPanel for custom elements (6 buttons: TOP / BOTTOM / N / S / E / W) — mirrors WallSurfacePanel's A/B side toggle.

### Picker triggered by

User selects wall/floor/ceiling/customElement → PropertiesPanel renders MaterialPicker for that surface kind. Picker is always-visible when a surface is selected (no popover/modal). Matches existing SurfaceMaterialPicker pattern.

### Reusing Phase 67 primitives

- `MaterialCard` (153 LOC) — drop into the picker grid. Supports `onClick` and `selected` props. Tooltip on hover already implemented.
- `MaterialThumbnail` (81 LOC) — generates color swatch from `colorHex` or thumbnail from `colorMapId` blob. Used inside MaterialCard.
- `useMaterials()` — Phase 68 picker subscribes; sees real-time updates via cross-instance event sync.
- `LibraryCard`, `CategoryTabs` — Phase 33 primitives. Plan-phase decides whether picker shows tabs (e.g., `PRESETS / MY MATERIALS / PAINT`) or flat list. Recommendation: **flat list with a search/filter input** for v1.17 — fewer moving parts.

### Recommended picker layout

```
┌─ MATERIAL ────────────────────────────────┐
│ [search input — optional]                 │
│ ┌──┬──┬──┬──┐                              │
│ │MC│MC│MC│MC│  ← MaterialCard grid         │
│ ├──┼──┼──┼──┤    (cols-4 like              │
│ │MC│MC│MC│MC│     SurfaceMaterialPicker)   │
│ └──┴──┴──┴──┘                              │
│ [+ UPLOAD MATERIAL] (opens Phase 67 modal)│
│                                            │
│ TILE SIZE (override)                       │
│ [ 2.0 ] FT  ← placeholder = material default│
│ [Use material default]                     │
│                                            │
│ [CLEAR MATERIAL]                           │
└────────────────────────────────────────────┘
```

### Mid-pick preview (CONTEXT.md discretion)

**Recommendation: enable on hover with 100ms debounce.** Pattern: `onMouseEnter` → `applySurfaceMaterialNoHistory(surface, hoveredId)`; `onMouseLeave` (no click) → revert via undo of NoHistory diff (or capture pre-hover materialId in a useRef and call NoHistory back). `onClick` → `applySurfaceMaterial(surface, clickedId)` (history). Single click = single undo entry. Hover preview = zero history entries.

**Alternative (simpler):** no preview. Click-only apply. Plan-phase makes the call.

---

## 2D Fabric Texture-Fill Mechanics (NEW — engineering risk)

### Today (paint colors only)

`fabricSync.ts:336-342` reads `wall.wallpaper.A?.kind === "paint" → resolvePaintHex` and uses the hex string as a polygon `fill`. Floor textures are not rendered in 2D at all — fabricSync renders walls + custom-element rects + product symbols + ceiling outlines + measure/annotation overlays.

### Required for Phase 68

For a Material with `colorHex`: same as paint today — flat polygon `fill: colorHex`. Trivial.

For a Material with `colorMapId`: need a `fabric.Pattern`:

```ts
// New helper in src/canvas/materialPatternCache.ts
const patternCache = new Map<string, fabric.Pattern>();
const inflightLoads = new Map<string, Promise<fabric.Pattern>>();

export async function getMaterialPattern(
  material: Material,
  scaleFt: number,
  pixelsPerFoot: number,
): Promise<fabric.Pattern | null> {
  const key = `${material.id}|${scaleFt}|${pixelsPerFoot}`;
  if (patternCache.has(key)) return patternCache.get(key)!;
  if (inflightLoads.has(key)) return inflightLoads.get(key)!;

  const promise = (async () => {
    const userTex = await getUserTexture(material.colorMapId);
    if (!userTex) return null;
    const blobUrl = URL.createObjectURL(userTex.blob);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = blobUrl;
    });
    const tileSizePx = scaleFt * pixelsPerFoot;
    // Resize the image to tileSizePx × tileSizePx via offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = tileSizePx;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, tileSizePx, tileSizePx);
    const pattern = new fabric.Pattern({ source: canvas, repeat: "repeat" });
    patternCache.set(key, pattern);
    inflightLoads.delete(key);
    URL.revokeObjectURL(blobUrl);
    return pattern;
  })();
  inflightLoads.set(key, promise);
  return promise;
}
```

### Async redraw integration

`FabricCanvas.tsx`'s redraw is synchronous (reads store, clears canvas, redraws everything). Pattern from Phase 34 user-texture in 3D: when a getMaterialPattern promise resolves, fire a Fabric canvas `requestRenderAll()`. The store doesn't change — we just trigger a single canvas flush.

**Concrete pattern:**
- During redraw, if `getMaterialPattern` returns a Promise (cache miss), use a placeholder fill (e.g., `material.colorHex ?? "#888"`) and chain `.then(() => fc.requestRenderAll())` to trigger a re-redraw once the pattern is ready.
- Cache hit subsequent renders → returns Pattern synchronously (fast path).

**Tile-size in Fabric pattern:** `fabric.Pattern.repeat = "repeat"` tiles the source canvas. Source canvas is sized to `scaleFt × pixelsPerFoot` so each tile in canvas-space matches the real-world tile size. Adjust pattern offsetX/offsetY if the wall/floor polygon doesn't start at canvas origin (`fc.getZoom()` and surface bounding box).

### Floor + ceiling 2D rendering

Today fabricSync does NOT render floor textures or ceiling solid fills. Plan-phase must decide whether to add them. For MAT-APPLY-01 to feel complete in 2D, **floor texture rendering must be added** (this is the most visually obvious surface in top-down view). Simplest approach: `fabric.Polygon` covering the room footprint at z-index below walls, with `fill` = paint Material's colorHex OR a fabric.Pattern from getMaterialPattern.

**Ceilings in 2D:** today ceilings are drawn as outlines only (line-stroke polygons) for layout. Plan-phase decides whether to add fill — recommendation: **no**, ceilings are inherently a 3D thing; 2D top-down view should keep them as outlines. Material apply in 3D only is acceptable for ceilings in the picker UI.

---

## 3D Three.js Material Binding

### New resolver hook

```ts
// src/lib/surfaceMaterial.ts
export interface ResolvedSurfaceMaterial {
  colorHex?: string; // mutually exclusive with colorMap
  colorMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  reflectionMap?: THREE.Texture;
  tileSizeFt: number;
  roughness: number;   // resolved per D-08: 0.8 default
  metalness: number;   // resolved per D-08: 0
}

export function resolveSurfaceMaterial(
  materialId: string | undefined,
  surfaceTileSizeFt: number | undefined, // Phase 66 override
  materials: Material[],
): ResolvedSurfaceMaterial | null {
  // null when materialId unset OR Material missing (orphan)
  // Caller falls back to legacy priority chain.
}

export function resolveSurfaceTileSize(
  surfaceScaleFt: number | undefined,
  material: Material | undefined,
): number {
  return surfaceScaleFt ?? material?.tileSizeFt ?? 1;
}
```

Co-locate with R3F hook wrapper:

```ts
// src/three/useResolvedMaterial.ts
export function useResolvedMaterial(
  materialId: string | undefined,
  surfaceScaleFt: number | undefined,
): ResolvedSurfaceMaterial | null {
  const { materials } = useMaterials();
  const colorMap = useUserTexture(material?.colorMapId);
  const roughnessMap = useUserTexture(material?.roughnessMapId);
  const reflectionMap = useUserTexture(material?.reflectionMapId);
  // Apply repeat from tileSizeFt + surface dims (similar to existing wallpaper repeat code)
  // Return ResolvedSurfaceMaterial.
}
```

### Texture caching strategy

Material wraps `userTextureId` references (Phase 67 D-09 wrapper architecture). The existing `userTextureCache.ts` already loads UserTexture blobs into THREE.Texture once per id. Phase 68 reuses it directly — **no new texture cache needed for color maps**.

For roughness + reflection maps: same cache works (UserTexture is just a blob+id; channel/colorSpace differs). Plan-phase verifies whether `userTextureCache` applies SRGB color space (correct for albedo, wrong for roughness). If yes, may need a parallel `userTextureLinearCache` for non-color maps. **Open question — see §Open Questions.**

### Tile-size in Three.js

Existing pattern (WallMesh.tsx:178-186, FloorMesh.tsx:85-91): `tex.repeat.set(surfaceWidth / tileSize, surfaceHeight / tileSize); tex.needsUpdate = true`. Phase 68 reuses this. New resolver function returns the tileSize; renderer applies repeat.

---

## Single-Undo Apply Pattern

Direct copy of Phase 31. New cadStore actions:

```ts
// src/stores/cadStore.ts new section
applySurfaceMaterial: (
  target:
    | { kind: "wallSide"; wallId: string; side: "A" | "B" }
    | { kind: "floor"; roomId?: string }
    | { kind: "ceiling"; ceilingId: string }
    | { kind: "customElementFace"; placedId: string; face: FaceDirection },
  materialId: string | undefined,
) =>
  set(produce((s: CADState) => {
    const doc = activeDoc(s);
    if (!doc) return;
    pushHistory(s); // ← single history entry
    switch (target.kind) {
      case "wallSide": {
        const wall = doc.walls[target.wallId];
        if (!wall) return;
        const field = target.side === "A" ? "materialIdA" : "materialIdB";
        if (materialId) (wall as any)[field] = materialId;
        else delete (wall as any)[field];
        break;
      }
      // ... floor / ceiling / customElementFace cases
    }
  })),

applySurfaceMaterialNoHistory: /* identical without pushHistory */,
```

**Mid-pick preview contract:** if MaterialPicker shows preview-on-hover, hover dispatches `applySurfaceMaterialNoHistory`, mouse-leave reverts via stored prior materialId, click dispatches `applySurfaceMaterial`. Net result: at most ONE history entry per picker open→commit.

---

## Test Patterns From Phase 67

| Pattern | Source file | Phase 68 use |
|---------|-------------|-------------|
| Vitest + fake-indexeddb for IDB unit tests | `tests/materialStore.test.ts` | Add `tests/migrateV5ToV6.test.ts` — drives the migration with synthetic v5 snapshots |
| StrictMode-safe hook test (mount → unmount → remount asserts no leak) | `tests/hooks/useMaterials.test.tsx` (verify path) | Add `tests/useResolvedMaterial.test.tsx` |
| Cross-instance window-event sync | `useMaterials.ts:79-96` | useResolvedMaterial subscribes to material-saved/updated/deleted events |
| Test driver `window.__driveMaterialUpload` | `useMaterials.ts:139-148` | Add `window.__driveApplyMaterial(target, materialId)` — module-eval install, NOT useEffect |
| E2E view-toggle persistence | `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` | Direct template — adapt for "apply Material → switch 2D↔3D, verify both render the texture" |
| Single-undo invariant | `tests/phase31Undo.test.tsx` | Adapt for `applySurfaceMaterial` — assert `past.length` increments by exactly 1 per click |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 2.x (run via `npm run test`) + Playwright (`npm run test:e2e`) |
| Config files | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npm run test -- --reporter=dot` |
| Full suite command | `npm run test && npm run test:e2e` |
| Test directories | `tests/` (vitest unit + integration), `tests/e2e/specs/` (Playwright) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAT-APPLY-01 (success-1: unified picker) | MaterialPicker mounts in PropertiesPanel for each of 4 surface kinds | unit (component) | `npx vitest run tests/MaterialPicker.test.tsx -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-1: filtering) | `materialsForSurface(materials, "wallSide")` returns expected subset | unit | `npx vitest run tests/surfaceMaterials.materialsForSurface.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-2: 2D render) | Apply Material with colorHex → wall fills with that hex | unit (fabric integration) | `npx vitest run tests/fabricSync.materialFill.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-2: 2D texture) | Apply textured Material → fabric.Pattern fill applied | unit (fabric integration) | `npx vitest run tests/fabricSync.materialPattern.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-2: 3D render) | Apply Material → WallMesh material.color or material.map matches | unit (R3F) | `npx vitest run tests/WallMesh.material.test.tsx -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-2: 3D ceiling) | Apply Material to ceiling → CeilingMesh map slot matches | unit (R3F) | `npx vitest run tests/CeilingMesh.material.test.tsx -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-2: 3D floor) | Apply Material to floor → FloorMesh map slot matches | unit (R3F) | `npx vitest run tests/FloorMesh.material.test.tsx -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-2: 3D customElement face) | Apply Material to a face → that face's mesh material matches; other faces unchanged | unit (R3F) | `npx vitest run tests/CustomElementMesh.faceMaterial.test.tsx -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-3: single undo) | applySurfaceMaterial → past.length increments by exactly 1 | unit | `npx vitest run tests/applySurfaceMaterial.undo.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-3: NoHistory preview) | applySurfaceMaterialNoHistory → past.length unchanged | unit | covered by undo test | ❌ Wave 0 |
| MAT-APPLY-01 (success-4: paint migration) | Legacy wall.wallpaper.A.kind="paint" → wall.materialIdA references generated paint Material with matching colorHex | unit | `npx vitest run tests/migrateV5ToV6.paint.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-4: wallpaper migration) | Legacy wallpaper.kind="pattern"+userTextureId → wall.materialIdA wraps that userTextureId | unit | `npx vitest run tests/migrateV5ToV6.wallpaper.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-4: floor migration) | Legacy floorMaterial → room.floorMaterialId | unit | `npx vitest run tests/migrateV5ToV6.floor.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-4: ceiling migration) | Legacy ceiling.surfaceMaterialId / paintId / userTextureId → ceiling.materialId | unit | `npx vitest run tests/migrateV5ToV6.ceiling.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-4: idempotent) | Re-running migration on a v6 snapshot returns it unchanged; no duplicate Materials | unit | `npx vitest run tests/migrateV5ToV6.idempotent.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-4: graceful failure) | Mock IDB write fail → entry preserved as legacy; no crash | unit | `npx vitest run tests/migrateV5ToV6.failure.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-5: round-trip) | Save snapshot with materialIds → reload → all materialIds intact | unit | `npx vitest run tests/snapshot.materialIdRoundTrip.test.ts -x` | ❌ Wave 0 |
| MAT-APPLY-01 (success-5: version bump) | New snapshot's version === 6 | unit | covered by round-trip test | ❌ Wave 0 |
| MAT-APPLY-01 e2e: end-to-end apply flow | Open project → select wall → MaterialPicker → click Material → 3D shows it → switch to 2D → 2D shows it | e2e | `npx playwright test tests/e2e/specs/material-apply.spec.ts` | ❌ Wave 0 |
| MAT-APPLY-01 e2e: legacy project loads | Load v5 snapshot with paint/wallpaper/floorMaterial → all surfaces render correctly post-migration | e2e | `npx playwright test tests/e2e/specs/material-migration.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test -- --reporter=dot --run` (full vitest, ~30s)
- **Per wave merge:** `npm run test && npm run test:e2e -- --project=chromium-preview`
- **Phase gate:** Full vitest + Playwright e2e green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/MaterialPicker.test.tsx` — surface filtering, MaterialCard grid render, click handler dispatches applySurfaceMaterial
- [ ] `tests/surfaceMaterials.materialsForSurface.test.ts` — extend existing test for new surface union
- [ ] `tests/fabricSync.materialFill.test.ts` + `tests/fabricSync.materialPattern.test.ts` — 2D render verification (will likely need DOM canvas mock)
- [ ] `tests/WallMesh.material.test.tsx`, `tests/CeilingMesh.material.test.tsx`, `tests/FloorMesh.material.test.tsx`, `tests/CustomElementMesh.faceMaterial.test.tsx` — R3F render assertions on material slots (mirror Phase 49/50/64 pattern using `__wallMeshMaterials` registry; ADD parallel registries for the other meshes)
- [ ] `tests/applySurfaceMaterial.undo.test.ts` — single-undo invariant, mirror `phase31Undo.test.tsx`
- [ ] `tests/migrateV5ToV6.{paint,wallpaper,floor,ceiling,idempotent,failure}.test.ts` — six migration unit tests
- [ ] `tests/snapshot.materialIdRoundTrip.test.ts` — JSON round-trip
- [ ] `tests/useResolvedMaterial.test.tsx` — hook tests including StrictMode safety
- [ ] `tests/e2e/specs/material-apply.spec.ts` + `tests/e2e/specs/material-migration.spec.ts` — two e2e flows
- [ ] **Test-driver registration:** `window.__driveApplyMaterial(target, materialId)` and `window.__getResolvedMaterial(target)` (gated by `import.meta.env.MODE === "test"`) — installed at module-level in `cadStore.ts` after action definitions, mirroring Phase 34/67

### Edge Cases to Cover

1. **Empty room:** No walls, no ceiling, no floorMaterial → migration is no-op, version still bumps to 6.
2. **Surface with no Material:** materialId unset on a wall side → renderer falls through to legacy priority chain (back-compat). 3D should still render the wall.
3. **Surface with legacy assignment AND materialId set (post-migration):** materialId wins (priority 1 in renderer). Legacy fields ignored but PRESERVED (D-01 safety net).
4. **Custom element with partial faceMaterials:** TOP set, others unset → TOP renders Material; other 5 faces render legacy `element.color`.
5. **Material missing colorMap (orphan UserTexture):** `useUserTexture` returns null → resolver returns null → renderer falls back to colorHex if present, else falls back to legacy chain.
6. **Migration on already-migrated snapshot (v6):** idempotency gate `if (snap.version >= 6) return snap` short-circuits.
7. **Migration on partial snapshot (mid-crash):** per-entity guard `if (entity.materialIdA) skip` prevents duplicate Material creation.
8. **Picker with empty Material library:** show empty state with "+ UPLOAD MATERIAL" CTA.
9. **Apply Material → undo → apply again (same Material):** past.length should increment by 2 total, redo should land back on first apply.
10. **2D Pattern cache eviction:** if scaleFt changes, cache key changes (`materialId|scaleFt|pxPerFt`), old pattern stays cached but unreferenced. Plan-phase decides on explicit eviction or LRU. Recommendation: don't bother for v1.17 — patterns are tiny (a few KB).
11. **Save-then-load with v6 snapshot:** materialIds round-trip; resolver finds them; renders correctly.
12. **Tile-size override + Material default:** override wins; clearing override → falls back to material.tileSizeFt; clearing material → falls back to legacy.

---

## Open Questions

1. **What happens to the `limeWash` flag during paint migration?**
   - **What we know:** Wallpaper.kind="paint" supports `limeWash: boolean`. Material has no equivalent.
   - **What's unclear:** Drop it (lose the visual effect on migrated walls) or extend Material with `limeWash?: boolean` field?
   - **Recommendation:** Extend Material. limeWash is a semi-PBR property (changes roughness 0.85→0.95). Adding `limeWash?: boolean` to Material is cheap and preserves Jessica's existing limeWash applications. Plan-phase should explicitly decide.

2. **What happens to FloorMaterial.rotationDeg during migration?**
   - **What we know:** FloorMaterial supports per-floor texture rotation. Material has no rotation field.
   - **What's unclear:** Drop or extend?
   - **Recommendation:** Drop for v1.17. Rotation is rarely used. CONTEXT.md "deferred" already excludes "per-application Material parameter overrides beyond tile-size" — rotation falls in that bucket. Document loss in migration commit.

3. **userTextureCache color-space handling for roughness/reflection maps.**
   - **What we know:** `userTextureCache.ts` (not read in this research, file exists) presumably applies SRGB color space (correct for albedo).
   - **What's unclear:** Roughness and reflection maps want LinearSRGBColorSpace. Reusing the same cache with SRGB-encoded textures will produce wrong shading.
   - **Recommendation:** Plan-phase reads `userTextureCache.ts` to verify color-space behavior. If it's hardcoded SRGB, either (a) accept incorrect shading on roughness/reflection until a future PBR pipeline phase, or (b) add a parallel cache or a `colorSpace` parameter. D-08 Material fallback already says no roughness/reflection map → defaults; rendering NO map is fine. The risk is when the user uploads roughness maps.

4. **Custom element face direction enum.**
   - **What we know:** D-07 says `Record<FaceDirection, MaterialId>`. CustomElementMesh.tsx uses a single `<meshStandardMaterial>` on a `<boxGeometry>` today.
   - **What's unclear:** The exact enum (`"top" | "bottom" | "north" | "south" | "east" | "west"` per D-07 example) vs Three.js BoxGeometry's per-face material array indices (0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z).
   - **Recommendation:** Use string enum `"top" | "bottom" | "north" | "south" | "east" | "west"` for D-07 storage. Provide a lookup table in CustomElementMesh that maps each face name to the correct material array index. Less footgun than raw indices in the data model. Plan-phase confirms by reading Three.js docs.

5. **Floor 2D render is missing — should Phase 68 add it?**
   - **What we know:** fabricSync.ts has no floor render. Today the 2D top-down view shows wall outlines, products, custom elements — no floor surface visible.
   - **What's unclear:** Adding a floor surface to 2D is technically out of scope (MAT-APPLY-01 is about applying Materials, not adding new render surfaces). But success criterion #2 says "renders in BOTH 2D and 3D" — without a 2D floor, applying a Material to the floor is invisible in 2D.
   - **Recommendation:** Add minimal floor render to 2D (single fabric.Polygon at room footprint). Solid colorHex fill works trivially; texture fill is the engineering risk. Plan-phase scopes this carefully — could be a single plan (~50 LOC).

6. **Catalog preset Materials — seed once on first migration, or on every `loadSnapshot`?**
   - **What we know:** SURFACE_MATERIALS catalog has 11 entries (WOOD_OAK, MARBLE, PLASTER, etc.). Materials are user-curated, but Jessica's library starts empty post-Phase-67.
   - **What's unclear:** When migrating a v5 snapshot with `floorMaterial.kind="preset", presetId="WOOD_OAK"`, do we (a) generate a "Wood Oak" Material on the fly during migration, OR (b) seed the catalog presets into the Materials store at app first-launch, OR (c) keep Material library empty and let resolver fall back to SURFACE_MATERIALS for catalog presetIds?
   - **Recommendation:** Option (c) — least invasive. The resolver checks: if materialId starts with `"mat_"`, look up in materialStore; if it's a SURFACE_MATERIALS catalog id (uppercase like `"WOOD_OAK"`), look up in SURFACE_MATERIALS. Single resolver, two backends. Migration writes the catalog id directly into `room.floorMaterialId = "WOOD_OAK"` rather than generating a new Material. This keeps the Materials library uncluttered with seeded presets and preserves PBR behavior for the few catalog entries with `pbr` maps.

7. **What about `customColors` and `recentPaints` on snapshot?**
   - **What we know:** CADSnapshot has `customPaints?: PaintColor[]` and `recentPaints?: string[]`. These flow through Wall.wallpaper.paintId.
   - **What's unclear:** After migration, are these still relevant? recentPaints is used by SwatchPicker UI which goes away.
   - **Recommendation:** KEEP them through v1.17 (D-01 safety net). They're harmless; resolver doesn't read them; SwatchPicker is mounted nowhere new. v1.18 cleanup removes them.

8. **Bulk-paint flow (PropertiesPanel.tsx:237-258 — "Paint all walls" multi-select).**
   - **What we know:** Multi-select shows a single color input that calls setWallpaper for every selected wall.
   - **What's unclear:** Phase 68 picker is single-surface. Does multi-select still work?
   - **Recommendation:** Add a parallel `applyMaterialToAllWalls` action mirroring `applyPaintToAllWalls`. Multi-select bulk-actions panel shows a "PAINT ALL WALLS" MaterialPicker. Single undo entry covers all walls. Plan-phase scopes whether this is in v1.17 or deferred.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| fabric | 2D Pattern texture-fill (NEW work) | ✓ | ^6.9.1 | — |
| three | 3D mesh material binding | ✓ | ^0.183.2 | — |
| @react-three/fiber | R3F mesh hooks | ✓ | ^8.17.14 | — |
| @react-three/drei | useGLTF, OrbitControls | ✓ | ^9.122.0 | — |
| zustand + immer | cadStore actions | ✓ | ^5.0.12 / ^11.1.4 | — |
| idb-keyval | materialStore CRUD | ✓ | ^6.2.2 | — |
| vitest + fake-indexeddb | unit tests | ✓ | already in package.json | — |
| Playwright | e2e tests | ✓ | already in package.json | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Sources

### Primary (HIGH confidence — direct code reads)

- `src/types/cad.ts` (lines 23-243) — every legacy surface type
- `src/types/material.ts` (line 22-50) — Material entity (Phase 67)
- `src/lib/snapshotMigration.ts` (lines 127-219) — migration template
- `src/stores/cadStore.ts` (lines 506-706, 1338-1396) — store actions + loadSnapshot pipeline
- `src/three/WallMesh.tsx` (lines 237-326) — 3D wall priority chain
- `src/three/FloorMesh.tsx` (lines 47-138) — 3D floor priority chain
- `src/three/CeilingMesh.tsx` (lines 27-184) — 3D ceiling priority chain
- `src/three/CustomElementMesh.tsx` (full) — single-material box, NO faces
- `src/three/pbrTextureCache.ts` (full) — refcounted PBR cache
- `src/three/wallpaperTextureCache.ts` (full) — non-disposing wallpaper cache
- `src/three/floorTexture.ts` (full) — procedural fallback
- `src/canvas/fabricSync.ts` (lines 1-90, 320-400) — 2D paint fill, no texture fill today
- `src/components/PaintSection.tsx`, `SurfaceMaterialPicker.tsx`, `CeilingPaintSection.tsx`, `FloorMaterialPicker.tsx`, `WallSurfacePanel.tsx`, `PropertiesPanel.tsx` — all four pickers + mount sites
- `src/components/MaterialCard.tsx`, `MaterialThumbnail.tsx`, `MaterialsSection.tsx` — Phase 67 primitives
- `src/data/surfaceMaterials.ts` (full) — `materialsForSurface` template + SURFACE_MATERIALS catalog
- `src/hooks/useMaterials.ts` (full) — hook + cross-instance sync + test driver pattern
- `.planning/phases/67-material-engine-foundation-mat-engine-01/67-RESEARCH.md` — Phase 67 architecture, D-09 wrapper architecture
- `.planning/phases/68-material-application-system-mat-apply-01/68-CONTEXT.md` — D-01..D-08 locked decisions
- `.planning/phases/68-material-application-system-mat-apply-01/68-DISCUSSION-LOG.md` — alternatives considered
- `.planning/ROADMAP.md` — Phase 68 success criteria
- `.planning/REQUIREMENTS.md` (worktree) — MAT-APPLY-01 spec (referenced; file path differs in worktree, but content equivalent)
- `CLAUDE.md` — Pattern #5, Pattern #7, D-33/D-34/D-39, VIZ-10 audit notes

### Secondary (MEDIUM confidence — inferred from convention)

- `src/three/userTextureCache.ts` — not read directly; behavior inferred from Phase 49/50/64 fix history. Plan-phase verifies color-space handling (Open Question 3).
- `tests/userTextureOrphan.test.tsx` — referenced in Phase 67 RESEARCH; pattern exists for orphan fallback (Pitfall 3).
- Three.js BoxGeometry per-face material indices — standard Three.js docs, plan-phase verifies (Open Question 4).

### Tertiary (LOW confidence — none)

No claims rely on training data or unverified web sources. Every recommendation traces to a specific file path and line range.

---

## Metadata

**Confidence breakdown:**
- Legacy code map: HIGH — every file read with exact line ranges
- Migration mechanics: HIGH — Phase 51 template directly applicable; idempotency proven
- MaterialPicker UX: MEDIUM — Phase 67 primitives REUSE confirmed; multi-select bulk flow has open question
- 3D rewire: HIGH — priority-chain pattern is established; new branch is purely additive
- 2D fabric texture fill: MEDIUM — engineering risk noted; pattern is novel for the codebase but Fabric.js docs confirm `fabric.Pattern` is the right tool
- Single-undo: HIGH — Phase 31 pattern direct copy
- Test patterns: HIGH — Phase 67 + Phase 31 + Phase 51 templates all reusable

**Research date:** 2026-05-07
**Valid until:** Phase 68 begins (decisions made here propagate forward; the 2D fabric texture-fill design is the largest open engineering question and may surface plan-time refinement)

---

## RESEARCH COMPLETE
