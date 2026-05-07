# Phase 68: Material Application System (MAT-APPLY-01) - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Jessica selects any wall side, floor, ceiling, or custom-element face and applies a Material from her library through one unified picker. The fragmented paint / wallpaper / floor-material / ceiling-paint flows are replaced by a single surface-material model. Existing project data migrates cleanly via snapshot version bump (v5→v6). Both 2D fabric texture-fill and 3D mesh material consume the same Material via a shared resolver.

**In scope:**
- Add `materialId?: string` to surfaces (wall side A/B, Room.floorMaterial, Ceiling, CustomElement face).
- New `<MaterialPicker surface={...}>` component replacing PaintSection / CeilingPaintSection / FloorMaterialPicker / SurfaceMaterialPicker.
- `resolveSurfaceMaterial(surface)` resolver — single entry point for 2D and 3D renderers.
- Snapshot v5→v6 migration: convert legacy `wallpaper.A/B`, `floorMaterial`, paint colors, and ceiling materials into auto-generated `Material` entries with appropriate `colorMapId` (textures) or `colorHex` (paints). Idempotent (DEBT-05 pattern).
- Material type extended with `colorHex?: string` (mutually exclusive with `colorMapId`).
- Single-undo per apply (Phase 31 history-snapshot pattern).

**Out of scope (this phase):**
- Wainscoting, crown molding, wall art — keep their own systems; Phase 70 may reorganize as "Assemblies".
- Product finish slot (`PlacedProduct.finishMaterialId`) → Phase 69.
- Sidebar Materials/Assemblies/Products top-level toggle and category sub-tabs → Phase 70.
- Removing legacy fields (`wallpaper`, `floorMaterial`, etc.) from cadStore types — keep readable for one milestone (v1.17), delete in v1.18 once migration is proven.
- Filtering/sorting Materials by metadata (cost, lead time) → not in v1.17.

</domain>

<decisions>
## Implementation Decisions

### Migration Strategy
- **D-01:** **Migration approach (option a from REQUIREMENTS.md hypothesis).** At project load time (snapshot v5→v6 path), convert every legacy `Wallpaper`, `FloorMaterial`, paint color, and ceiling-material entry into an auto-generated `Material` and write the new `materialId` field on the surface. Old fields stay readable for one milestone (v1.17) so a buggy migration can fall back; planned removal in v1.18. Idempotent — re-loading an already-migrated project is a no-op. Pattern mirrors **Phase 51 DEBT-05 async pre-pass before Immer `produce()`**.

### Paint as Material
- **D-02:** **Paint becomes a Material with a `colorHex` field**, mutually exclusive with `colorMapId`. The Material entity from Phase 67 grows one optional field: `colorHex?: string` (e.g. `"#F5F0E8"`). Renderer logic: if `colorHex` is set, render as flat color; if `colorMapId` is set, render as textured surface. Both being set is a type error. Migrated paint Materials get auto-generated names (e.g., `"Paint #F5F0E8"`); user can rename via the existing Material edit flow.

### Surface Coverage
- **D-03:** **Phase 68 covers exactly four surface kinds:** wall sides (`Wall.materialIdA`, `Wall.materialIdB`), `Room.floorMaterialId` (replacing `Room.floorMaterial`), `Ceiling.materialId`, and `CustomElement` faces (per-face `materialId` map keyed by face direction). **Wainscoting, crown molding, and wall art are explicitly out of scope** — they stay as their own systems and are candidates for Phase 70 "Assemblies".

### Tile-Size Precedence
- **D-04:** **Material `tileSizeFt` is the default; per-surface `scaleFt` (Phase 66) overrides when set.** Resolver: `resolveSurfaceTileSize(surface, material) = surface.scaleFt ?? material.tileSizeFt ?? 1`. Phase 66's per-surface tile-size inputs become "override-or-default" inputs — empty value means "use Material default". Clearing the override falls back gracefully. Same precedence logic applies to walls / floors / ceilings.

### Picker Component Shape
- **D-05:** **One unified `<MaterialPicker surface={"wallSide" | "floor" | "ceiling" | "customElementFace"} value={materialId} onChange={...} />` component.** Replaces PaintSection, CeilingPaintSection, FloorMaterialPicker, and SurfaceMaterialPicker entirely. Surface-specific filtering via `materialsForSurface(materials, surface)` (extends existing `data/surfaceMaterials.ts` pattern). PropertiesPanel becomes substantially shorter — one section instead of three.

### Single-Undo Apply
- **D-06:** Applying a Material to a surface is a **single undo entry**, matching Phase 31's transaction pattern (push history at picker open, NoHistory mid-pick if previewing, commit at confirm). Mid-pick previewing is optional and decided at plan-phase based on UX feel — but the single-undo guarantee is locked.

### Custom-Element Face Materials
- **D-07:** `CustomElement` gains an optional `faceMaterials?: Record<FaceDirection, string>` map (face direction = `"top" | "bottom" | "north" | "south" | "east" | "west"` or similar). Plan-phase research picks the exact face-direction enum based on existing `CustomElement` mesh code. Each face independently resolves to a Material or falls back to the catalog default.

### Default Fallbacks for Missing PBR Maps
- **D-08:** When a Material has no `roughnessMapId`, the renderer uses `roughness = 0.8` (matte default — matches Phase 49 wall-material default). When no `reflectionMapId`, the renderer uses `metalness = 0` and skips the env-map slot. These defaults are codified in `resolveSurfaceMaterial` so 2D and 3D agree.

### Claude's Discretion
- Exact migration heuristic for paint colors that lack a `colorHex` (legacy theme tokens) — plan-phase researcher picks; default to obsidian-base or a sentinel.
- Whether the `MaterialPicker` shows tabs by surface category (e.g., flooring tab when applied to a floor) — apply Phase 33 design-system primitives if natural, otherwise flat list.
- Whether mid-pick preview is enabled and on what debounce — UX feel call at plan-phase.
- Dedup semantics for migrated paint Materials — if two old surfaces had the same hex, do they share one Material or get two? Default: share (dedup on `colorHex` value).
- Migration commit message phrasing in CHANGELOG/SUMMARY.
- Test-driver shape (`window.__driveApplyMaterial` etc.) — follow Phase 31/34/67 precedent.

### Folded Todos
None — `gsd-tools todo match-phase` returned no matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Material Engine (Phase 67 — wraps these)
- `.planning/phases/67-material-engine-foundation-mat-engine-01/67-CONTEXT.md` — Phase 67 decisions D-01 through D-09 (esp. D-09 wrapper architecture: Material wraps `userTextureId` references, NOT raw blobs).
- `.planning/phases/67-material-engine-foundation-mat-engine-01/67-RESEARCH.md` — research notes feeding D-09 resolution.
- `src/types/material.ts` — `Material` type (Phase 67). Phase 68 extends this with `colorHex?: string`.
- `src/lib/materialStore.ts` — IDB store for Materials. Phase 68 read paths consume; Phase 68 migration path writes auto-generated Materials.
- `src/hooks/useMaterials.ts` — React hook. Phase 68 picker consumes.

### Existing Surface Systems (replace these)
- `src/types/cad.ts` §`Wallpaper` (line 45), §`Ceiling` (line 197), §`FloorMaterial` (line 246), `Wall.wallpaper.A/B` (line 31). These are the legacy types being migrated.
- `src/components/PaintSection.tsx` — replaced by `<MaterialPicker surface="wallSide">`.
- `src/components/CeilingPaintSection.tsx` — replaced by `<MaterialPicker surface="ceiling">`.
- `src/components/FloorMaterialPicker.tsx` — replaced by `<MaterialPicker surface="floor">`.
- `src/components/SurfaceMaterialPicker.tsx` — current floor/ceiling unified picker; the `surface: "floor" | "ceiling"` prop pattern is the architectural template for D-05's expansion.
- `src/data/surfaceMaterials.ts` — `materialsForSurface(materials, surface)` source pattern; extend for the new surface union.

### Existing Renderer Sites (rewire to resolveSurfaceMaterial)
- `src/three/WallMesh.tsx` — wall material rendering (Phase 49 fixed `<meshStandardMaterial map={userTex}>` direct prop pattern; preserve this).
- `src/three/FloorMesh.tsx` — floor material rendering.
- `src/three/CeilingMesh.tsx` — ceiling material rendering.
- `src/three/CustomElementMesh.tsx` (or equivalent) — custom-element face rendering. Plan-phase researcher confirms exact filename and face-direction enum.
- `src/canvas/fabricSync.ts` — 2D fabric texture-fill paths for wall/floor/ceiling. Each must consume `resolveSurfaceMaterial`.
- `src/three/floorTexture.ts`, `src/three/wallpaperTextureCache.ts` — existing texture caches; researcher decides whether to merge into one PBR cache or keep parallel during transition.

### Migration Reference (mirror this pattern)
- `.planning/phases/51-debt-05-floormaterial-migration/51-01-SUMMARY.md` — Phase 51 DEBT-05 async pre-pass before Immer `produce()`. Snapshot v2→v3 migration of legacy FloorMaterial data-URL entries to userTextureId references. **Architectural template for D-01 migration.**
- `src/lib/serialization.ts` — snapshot load path and version routing; Phase 51 `loadSnapshot` async refactor lives here.

### Apply-Pattern Reference (mirror this)
- Phase 31 single-undo transaction pattern: push history at drag/edit start via empty `update*(id, {})`, use `*NoHistory` mid-action, commit at end. Locked in `cadStore.ts` `resizeProductAxis` / `resizeCustomElementAxis` pairs. Mirror for `applySurfaceMaterial` / `applySurfaceMaterialNoHistory`.
- `src/stores/cadStore.ts` §Phase 31 pairs — concrete code pattern.

### Tile-Size Reference (Phase 66)
- `.planning/phases/66-per-surface-tile-size-tile-02/66-01-SUMMARY.md` — Phase 66 per-surface `scaleFt` UI. Phase 68 D-04 builds on this; the Phase 66 inputs become "override-or-default" inputs.
- Wall.scaleFt, Floor.scaleFt, Ceiling.scaleFt field locations in `src/types/cad.ts`.

### Design System Constraints
- `CLAUDE.md` §"Design System (Phase 33 — v1.7.5)" — D-33 (lucide-react chrome icons only, no new Material Symbols), D-34 (canonical spacing tokens, no arbitrary `p-[Npx]`), D-39 (`useReducedMotion()` guard on every new animation).
- `src/index.css` — design tokens.

### Patterns
- `CLAUDE.md` §"StrictMode-safe useEffect cleanup for module-level registries" (Pattern #7) — applies to test driver registration and any new texture cache cleanup.
- `CLAUDE.md` §"Tool cleanup pattern" (#5) — N/A this phase, no canvas tools added.

### Roadmap / Requirements
- `.planning/REQUIREMENTS.md` §MAT-APPLY-01 (line 18) — verifiable + acceptance criteria + hypothesis to test (now resolved by D-01).
- `.planning/ROADMAP.md` §"Phase 68: Material Application System" — 5 success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (high leverage)
- **`SurfaceMaterialPicker.tsx`** — already accepts `surface: "floor" | "ceiling"` and supports both catalog material IDs and `userTextureId`. The architectural template for D-05; Phase 68 expands the surface union and replaces internal logic with Material-aware lookup via `useMaterials`.
- **`materialsForSurface` from `data/surfaceMaterials.ts`** — surface-specific filter pattern is reusable; extend for `wallSide` and `customElementFace`.
- **`CategoryTabs` + `LibraryCard`** (Phase 33) — design-system primitives the picker reuses.
- **Phase 51 `loadSnapshot` async pre-pass** — direct migration template. Add v5→v6 case that scans rooms/walls/ceilings/customElements, generates Materials, and writes `materialId` fields.
- **Phase 31 single-undo transaction pairs** — direct apply-pattern template.
- **Phase 66 per-surface `scaleFt` inputs** — already wired into PropertiesPanel; Phase 68 reuses input components and adds the override-or-default fallback display.

### Established Patterns
- **Snapshot version bumps are routine** — v2→v3 (Phase 51), v3→v4 (Phase 60 stairs), v4→v5 (Phase 62 measure/annotation). v5→v6 follows the same routing.
- **Resolver functions live close to their consumers** — `resolveCeilingPoints`, `resolveEffectiveDims` are existing precedents in their domain types. `resolveSurfaceMaterial` and `resolveSurfaceTileSize` belong in `src/types/material.ts` or a new `src/lib/surfaceMaterial.ts`.
- **Async serialization migration is proven safe** — Phase 51 refactored 23 caller sites without regression. v5→v6 is a smaller blast radius.
- **Test driver bridges live in module-eval, not useEffect** — Pattern #7. `window.__driveApplyMaterial` follows the same pattern as Phase 67 `__driveMaterialUpload`.

### Integration Points
- **PropertiesPanel** is the host for `<MaterialPicker>`. Three sites today (paint section, wallpaper picker bits, floor material picker) collapse to one.
- **2D fabric texture-fill** in `fabricSync.ts` reads `resolveSurfaceMaterial(surface)` and dispatches to color-fill (paint Material) or texture-fill (textured Material).
- **3D mesh material** in WallMesh / FloorMesh / CeilingMesh / CustomElementMesh reads the same resolver and constructs `<meshStandardMaterial>` with the appropriate map / color / roughness / reflection slots.
- **`pbrTextureCache` (Phase 67's downstream consumer)** finally has its real first user — Material wraps `userTextureId`, and the cache resolves the underlying THREE.Texture exactly once per (textureId, mode) pair. Free win from D-09 wrapper.

</code_context>

<specifics>
## Specific Ideas

- **Migration safety pattern from DEBT-05:** keep the legacy field readable for one full milestone (v1.17). Removal of `wallpaper`, `floorMaterial`, ceiling material fields is deferred to v1.18 cleanup phase. This buys a real-world soak period.
- **Auto-generated Material names from migration:** `"Paint #F5F0E8"` for paints; for migrated wallpaper/floor textures, prefer the existing UserTexture name if present, otherwise `"Migrated wallpaper · {timestamp}"`.
- **Mid-pick preview** is a UX decision deferred to plan-phase — the single-undo guarantee is locked, but whether the picker live-previews on hover is for plan-phase to research.

</specifics>

<deferred>
## Deferred Ideas

- **Wainscoting / crown molding as "Assemblies"** — D-03 keeps these out of Phase 68. Phase 70 may reorganize them under the new sidebar's Assemblies tab. Not lost — captured here for Phase 70 planning.
- **Wall art as placed-Material** — D-03 keeps wall art as a placed-product-style entity. Conversion would be a major refactor; not on v1.17's runway.
- **Filtering/sorting Materials by cost / lead time / brand** — Phase 67 D-04 already explicitly deferred this from v1.17.
- **Removal of legacy fields** (`wallpaper`, `floorMaterial`, paint, ceiling materials) — D-01 keeps them readable through v1.17 as a safety net. v1.18 cleanup phase candidate.
- **Per-application Material parameter overrides beyond tile-size** — e.g., applying marble at 50% opacity, or rotating the texture. Not in MAT-APPLY-01 scope; capture for a later phase if Jessica asks.
- **Reviewed Todos:** none — `gsd-tools todo match-phase` returned no matches.

</deferred>

---

*Phase: 68-material-application-system-mat-apply-01*
*Context gathered: 2026-05-07*
