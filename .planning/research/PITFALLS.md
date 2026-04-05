# Domain Pitfalls

**Domain:** Interior design CAD — Paint system, material catalog unification, edit handle additions
**Milestone:** v1.3 Color, Polish & Materials
**Researched:** 2026-04-05
**Confidence:** HIGH (codebase directly inspected, Three.js/Fabric.js issues verified against official sources)

---

## Critical Pitfalls

Mistakes that cause visual regressions, broken saves, or rewrites.

---

### Pitfall 1: Three.js Color Space — Farrow & Ball Hex Values Will Render Darker Than Swatch

**What goes wrong:** You define the F&B palette as `#f8f0e3` hex strings and pass them to `meshStandardMaterial color={hex}`. In Three.js r152+ (this project uses Three.js 0.183), `THREE.ColorManagement` is enabled by default and R3F enables it automatically. Hex strings passed as color props are treated as sRGB inputs and converted to linear working space before the shader runs. The conversion makes the color darker than the designer-intended swatch value. A paint called "Off-Black" (#0e0d0d) survives fine, but mid-range warm whites and sage greens — exactly the F&B palette — shift noticeably. Jessica will compare the 3D wall to the F&B website swatches and they won't match.

**Why it happens:** Three.js internal shader pipeline applies `colorspace_fragment` at the end, converting linear output back to sRGB for display. The round-trip is correct when the input hex is already sRGB — the problem arises when developers accidentally pass hex values that they want to be literal, or when the catalog's stored hex values were eyedropped from the browser (which are already in sRGB) and the pipeline double-converts.

Verified against Three.js forum r152 discussion: "Colors washed out or too dark" — this is the documented breaking change for hex material inputs post-r152.

**Consequences:** Every painted wall surface will be slightly wrong in 3D. The ceiling `CeilingMesh` uses the same pattern (`color={hex}`) at line 26 in `CeilingMesh.tsx` — that code is already shipping and already has this behavior. Adding paint to walls amplifies the discrepancy because now walls and ceilings may visibly mismatch even when set to the same paint color.

**Prevention:**
- Store F&B catalog colors as hex sRGB strings (the F&B website values are already sRGB — that's correct).
- When creating `THREE.Color` instances imperatively, confirm `ColorManagement.enabled === true` (R3F default) and rely on the automatic conversion. Do NOT set `colorSpace = LinearSRGBColorSpace` on material colors.
- For the 2D Fabric canvas, hex is used directly as fill/stroke and is sRGB-correct by default — no conversion needed there.
- Write one smoke test: render a `#f5f0e8` color in isolation, read it back, confirm it matches the expected swatch visually. If it looks correct, the pipeline is working.
- In `WallMesh.tsx`, the current `baseColor = "#f8f5ef"` passes directly to `meshStandardMaterial color={}` — this is the existing pattern and R3F's default auto-conversion handles it correctly. Mirror that pattern exactly for paint colors.

**Detection:** The mismatch is most visible on warm neutrals and muted greens — F&B's most popular colors. Compare `color="#d4c5a9"` (String Warm White) on a 3D wall against the same hex shown in the UI color picker. If the 3D surface is noticeably darker, color space conversion is wrong.

**Phase affected:** Color & Paint System (Phase A).

---

### Pitfall 2: Floor Texture Cache Mutates Shared `.repeat` — Breaks Multi-Room and Split View

**What goes wrong:** `getFloorTexture()` in `floorTexture.ts` (lines 70-76) returns a module-level singleton `cached` and calls `cached.repeat.set(x, y)` and `cached.needsUpdate = true` on every invocation. When v1.3 adds a ceiling texture catalog that mirrors this pattern, there will be two module-level caches both mutating `.repeat` on shared `THREE.Texture` instances. In split-view (2D + 3D both mounted), or when switching between rooms with different dimensions, the last render to call `getFloorTexture` or a hypothetical `getCeilingTexture` will corrupt the repeat for all other consumers of that shared reference.

The audit file explicitly calls this out as carried-forward tech debt: "Floor texture cache mutates shared .repeat — fragile under split-view."

**Why it happens:** The cache was designed to avoid re-loading textures but incorrectly treats per-instance state (`.repeat`) as a property it can mutate on the shared object. `THREE.Texture.repeat` is a `THREE.Vector2` that belongs to the texture instance — all materials sharing that texture instance will see the mutated value simultaneously.

**Consequences:**
- Room A (12ft wide) and Room B (20ft wide) opened in split view: the floor tiles in Room A may suddenly scale to Room B's proportions (or vice versa) mid-session without any user action.
- A ceiling texture catalog added in v1.3 that copies this pattern will multiply the problem across ceilings + floors.
- The bug is intermittent and hard to repro in isolation, which makes it a debugging trap.

**Prevention:**
- Fix the floor texture cache before adding any new texture catalog. The fix is one of two approaches:
  1. **Clone on fetch:** `return cached.clone()` — each call gets a new texture handle sharing the GPU-uploaded image data (no re-upload) but with independent `repeat`, `rotation`, `offset` vectors. Three.js documentation confirms `.clone()` shares the source data reference.
  2. **Keyed cache:** Key the cache on `${roomW}x${roomL}` — return a cached instance per dimension set, with repeat pre-set. Never mutate repeat on a returned instance.
- Apply the same pattern to any new texture cache added for ceiling materials, wall paint procedural textures, or unified material catalog entries.

**Detection:** Open two rooms with different widths in split view. If the floor tile scale in Room A changes after you switch to Room B, the shared reference mutation is live.

**Phase affected:** Fix before Advanced Materials (Phase C). The floor cache fix should be Phase B or earlier, since Phase C adds ceiling texture catalog with the same risk.

---

### Pitfall 3: Paint Undo/Redo Breaks Because `paintLibrary` Lives Outside Zustand CAD History

**What goes wrong:** The v1.3 paint system needs a global paint library (F&B catalog + custom colors). If that library is stored in a separate Zustand store or an IndexedDB key outside `cadStore`, then `setWallColor` actions that reference a `paintId` will undo/redo correctly (the wall's `paintId` field is in history), but if the user simultaneously edits the paint library (rename, delete a custom color), those library mutations are NOT in `cadStore.past[]`. Undo restores the wall to reference `paintId: "custom-sage-001"` but the paint library no longer contains that ID. The 3D wall falls through to a default color silently — exactly the CUSTOM-05 pattern from v1.2.

The v1.2 audit documented this class of bug explicitly: `customElements` lived at the snapshot level but save call-sites constructed their own payload object and skipped it. The same structural risk applies here.

**Why it happens:** Catalog CRUD (add/rename/delete paint swatches) and CAD mutations (apply paint to wall) are two different concerns that developers naturally put in two different stores or IndexedDB keys. They're coupled at runtime but decoupled in history.

**Consequences:**
- Undo a wall color → wall references a paint that no longer exists → fallback color appears → Jessica thinks the undo didn't work.
- Delete a custom paint swatch → undo does not restore it → all walls that used it go to fallback → silent data loss.
- Save + reload exposes both failure modes simultaneously.

**Prevention:**
- If paint colors are per-project (custom colors only, F&B catalog is static code), store custom colors inside `CADSnapshot` alongside `customElements`. They participate in undo/redo and save automatically.
- If paint colors are global (shared across projects), they cannot be in `CADSnapshot`. In that case, make wall paint references always degrade gracefully: if `paintId` not found, show fallback but preserve the id in the data so it rehydrates correctly if the library is restored.
- The F&B static catalog (130 colors, hardcoded in source) never needs IndexedDB or undo — it is always present. Custom user colors are the only catalog data that needs persistence planning.
- Extend `useAutoSave.ts` subscription to include `customPaints` changes if they live in cadStore, mirroring the CUSTOM-05 fix pattern.
- When implementing `saveProject` calls in `useAutoSave.ts` and `ProjectManager.tsx`, explicitly include the `customPaints` key in the payload — do not rely on the call-site "forgetting" nothing again.

**Detection:** Create a custom paint color → apply it to wall → reload → check if wall shows correct color vs fallback.

**Phase affected:** Color & Paint System (Phase A). Must be decided before implementation begins, not discovered after.

---

### Pitfall 4: `selectTool.ts` Hit-Test Does Not Cover `PlacedCustomElement` — Edit Handles Will Be Ignored

**What goes wrong:** `hitTestStore()` in `selectTool.ts` (lines 91-134) checks `doc.placedProducts` and `doc.walls` only. `PlacedCustomElement` records in `doc.placedCustomElements` are never hit-tested. This means clicking a placed custom element in the 2D canvas does not select it, so none of the planned edit handles (rotate, resize, drag) will fire. This is v1.2 tech debt confirmed in the audit: "Edit-handle wiring: selectTool doesn't hit-test PlacedCustomElement."

**Why it happens:** The custom element feature was added (Phase 14) as a parallel system to products. The select tool was not extended to cover the new placement type.

**Consequences:**
- The v1.3 Polish Pass feature "custom element edit handles" is blocked until `hitTestStore` is extended.
- Any attempt to add rotate/resize handles for custom elements will be unreachable without this fix.
- `renderCustomElements` in `fabricSync.ts` already renders them on the canvas. The visual is there; the interactivity isn't.

**Prevention:**
- Phase B (Polish Pass) must add a third hit-test branch to `hitTestStore`: iterate `doc.placedCustomElements`, look up the element in `(useCADStore.getState() as any).customElements`, compute AABB using `el.width * sc` and `el.depth * sc`, return `{ id: p.id, type: "custom-element" }`.
- Extend `DragType` union in `selectTool.ts` to include `"custom-element"` | `"custom-element-rotate"` | `"custom-element-resize"`.
- The existing rotate handle (`rotationHandle.ts`) and resize handle (`resizeHandles.ts`) can be reused — they are tool-agnostic hit tests given a position + dims.
- Add `moveCustomElement` / `rotateCustomElementNoHistory` / `resizeCustomElementNoHistory` actions to cadStore mirroring the product equivalents.

**Detection:** Place any custom element → try clicking it → `useUIStore.getState().selectedIds` should contain its id. Currently it will be empty.

**Phase affected:** v1.2 Polish Pass (Phase B).

---

## Moderate Pitfalls

---

### Pitfall 5: Lime Wash Toggle as a ShaderMaterial Will Require Color-Space-Correct Output

**What goes wrong:** A lime wash visual effect (chalky, irregular pigment over a base coat) typically requires a custom `ShaderMaterial` or `CustomShaderMaterial` rather than `MeshStandardMaterial` with a color prop. Custom shader materials do NOT automatically receive `colorspace_fragment` injection from Three.js — the developer must manually convert output color from linear to sRGB at the end of the fragment shader, or use `THREE-CustomShaderMaterial` which extends built-in materials and retains the pipeline.

If the fragment shader outputs colors in linear space without the colorspace conversion, the lime wash effect will appear washed out relative to the base coat painted with `MeshStandardMaterial`. The mismatch will be most visible at the boundary between a lime-washed wall and a standard-painted ceiling.

**Prevention:**
- Prefer `THREE-CustomShaderMaterial` (CSM) over raw `ShaderMaterial` — CSM patches into `MeshStandardMaterial`'s pipeline, getting tone mapping and color space conversion for free. The GitHub repo (`FarazzShaikh/THREE-CustomShaderMaterial`) is actively maintained and compatible with R3F.
- If raw `ShaderMaterial` is used, add `#include <colorspace_fragment>` at the end of the fragment shader to ensure Three.js injects the correct color space output.
- Alternatively, implement lime wash as a `MeshStandardMaterial` with a procedural `CanvasTexture` (paint the chalky noise pattern using 2D canvas) — no custom shader needed, full pipeline compatibility guaranteed.
- Given that this is a personal tool with one user and desktop-only target, the `CanvasTexture` approach is the safest path: generate a 512×512 canvas texture with noise overlay once per color, cache by hex key, apply as `map` on top of `MeshStandardMaterial`.

**Detection:** Lime wash wall adjacent to a plain-painted ceiling. If the lime-washed surface appears obviously brighter or more washed-out than expected, the fragment shader is missing the colorspace conversion.

**Phase affected:** Color & Paint System (Phase A) — only if lime wash is implemented as a custom shader.

---

### Pitfall 6: Farrow & Ball Catalog Bundle Size Is Manageable But Must Stay Out of cadStore History

**What goes wrong:** 130 F&B colors as static TypeScript constants add approximately 15-25KB to the JS bundle (each entry has name, hex, collection, description). That's negligible. The pitfall is if the catalog array is accidentally included in `CADSnapshot` via `JSON.parse(JSON.stringify(state))` in the `snapshot()` function in `cadStore.ts` (lines 81-91). Each undo/redo history entry (max 50) would carry 50× the catalog payload — ~1-1.25MB of heap for history alone, just from static data.

**Why it happens:** Developers add catalog data to a store for easy access, then the snapshot function deep-clones all store state including the catalog.

**Prevention:**
- Keep the F&B static catalog as a plain TypeScript module (`src/data/paintCatalog.ts`) imported directly — never put it in Zustand.
- Custom user colors (if per-project) live in `cadStore` but as a small `Record<string, {name, hex}>` keyed by id — not the full F&B array.
- The `snapshot()` function in `cadStore.ts` should explicitly enumerate what it captures. Review line 83-90 after any new store field is added.

**Detection:** `JSON.stringify(useCADStore.getState().past[0])` in the console — if it contains F&B catalog data, it's in history.

**Phase affected:** Color & Paint System (Phase A).

---

### Pitfall 7: `WallSurfacePanel` Will Have Two Competing Color Inputs — Wallpaper "color" Kind vs Paint Color

**What goes wrong:** `WallSegment.wallpaper` currently uses `kind: "color" | "pattern"` with a `color?: string` field for solid wall color. The new paint system adds paint application to walls. If paint is stored as `paintId` alongside the existing wallpaper structure, the rendering path in `WallMesh.tsx` (lines 92-121) must reconcile two overlapping color sources: `wallpaper.A.kind === "color"` with `wallpaper.A.color` vs a new `paint.A.paintId` field. Without a clear hierarchy, the two systems will silently override each other and users will not understand which control wins.

**Prevention:**
- Define a clear schema before coding: the paint system adds `paintColor?: { hex: string; paintId?: string }` per-side at `WallSegment` level, separate from `wallpaper`. Paint is the base coat; wallpaper overlays on top. The rendering layer renders paint first, then wallpaper plane on top of it. This matches the real-world hierarchy.
- Deprecate or remove `wallpaper.kind === "color"` — replace it with a paint-layer concept. Existing saves with `wallpaper: { A: { kind: "color", color: "#fff" } }` need a migration in `snapshotMigration.ts` that lifts the color to the new paint field.
- Keep the migration additive and idempotent: if `wallpaper.A.kind === "color"` detected, move `color` to `paintColor.hex`, set `wallpaper.A` to undefined.

**Detection:** Apply paint to wall → then apply wallpaper → check that wallpaper appears over the paint, not replacing it. Apply paint → undo → check that no ghost wallpaper remains.

**Phase affected:** Color & Paint System (Phase A).

---

### Pitfall 8: Copy-Side Button Will Produce a Deep-Clone Reference Trap on Sub-Collections

**What goes wrong:** The "copy SIDE_A → SIDE_B" feature for wall treatments copies a `WainscotConfig`, `CrownConfig`, or `Wallpaper` from one side to the other. If the copy is a shallow `Object.assign` or spread, both sides will share the same object reference in memory. Zustand's Immer `produce()` call will mutate Side A's object and the mutation will propagate to Side B silently because they point to the same reference. This is the same hazard as the `update()` full-replace pattern documented in the v1.1 CLAUDE.md patterns.

**Prevention:**
- Always deep-copy when copying side data: `JSON.parse(JSON.stringify(sideAConfig))`.
- Alternatively, define a `cloneWainscotConfig(config: WainscotConfig): WainscotConfig` helper that constructs a new object — ensures type safety and prevents accidentally sharing nested objects.
- Add a test: copy SIDE_A config to SIDE_B → mutate SIDE_A color → confirm SIDE_B color did not change.

**Phase affected:** v1.2 Polish Pass (Phase B).

---

### Pitfall 9: Wainscot Library Edit-in-Place UI Will Trigger Full Re-Render of All Walls Using That Style

**What goes wrong:** When a user edits a wainscoting library item (name, height, color), `wainscotStyleStore.updateItem(id, changes)` updates the store. Every `WallMesh` component that reads `useWainscotStyleStore((s) => s.items)` will re-render because the selector returns the entire items array and its reference changes on every update. With 10+ walls in a room, this means 10+ `WallMesh` re-renders plus geometry recalculations (the `useMemo` in `WallMesh.tsx` line 43 depends on `wall` props, not the wainscot items directly, so geometry won't recalculate — but the component still re-renders unnecessarily).

**Prevention:**
- Use a more granular selector: `useWainscotStyleStore((s) => s.items.find((i) => i.id === styleItemId))` inside `WallMesh`. This selector only triggers re-render for walls using that specific style item.
- This is a performance polish, not a correctness bug. The UX impact in a personal tool with typical room sizes (<20 walls) is probably imperceptible. Defer optimization until it's felt.

**Detection:** Add 15+ walls, all using the same wainscot style. Open library editor, type in the style name field. If the frame rate drops noticeably, the selector is too broad.

**Phase affected:** v1.2 Polish Pass (Phase B).

---

### Pitfall 10: Unified Material Catalog Migration Must Handle Existing `FloorMaterial` Records Without Breaking Saves

**What goes wrong:** `RoomDoc.floorMaterial` currently uses `{ kind: "preset" | "custom", presetId?, imageUrl?, scaleFt, rotationDeg }`. If v1.3 unifies ceiling and floor materials into a single catalog schema, existing saved projects still have the old `floorMaterial` shape. A migration in `snapshotMigration.ts` that runs `migrateSnapshot()` on load must handle all three cases:

1. Old preset: `{ kind: "preset", presetId: "WOOD_OAK", scaleFt: 4, rotationDeg: 0 }` → new unified catalog reference
2. Old custom: `{ kind: "custom", imageUrl: "data:...", scaleFt: 2, rotationDeg: 45 }` → new unified shape preserving the data URL
3. Missing `floorMaterial` field → no migration needed, field stays absent

The ceiling `material` field is currently just a hex string (`ceiling.material: string`). Migrating it to a unified `CeilingMaterial` type that supports texture presets requires every `Ceiling` record to be touched.

**Prevention:**
- Design the unified `MaterialRef` type to be a superset of both existing schemas — add new fields rather than replacing. Keep `kind: "preset" | "custom" | "catalog"` where `"catalog"` is the new unified catalog reference, and `"preset"` and `"custom"` remain valid (migrate lazily or eagerly on load).
- Write migration in `snapshotMigration.ts` using the same additive-and-idempotent pattern already established for `migrateWallsPerSide`. Test with a real saved project snapshot from v1.2 before shipping.
- The `CEIL-04` tech debt (preset id path unimplemented — CeilingMesh only handles hex colors) must be resolved as part of this migration. If `ceiling.material` becomes a structured type, the dead code path disappears naturally.

**Detection:** Save a project in v1.2 format. Load it in v1.3. Confirm floor and ceiling materials display correctly without manual re-selection.

**Phase affected:** Advanced Materials (Phase C).

---

## Minor Pitfalls

---

### Pitfall 11: Per-Placement Frame Override UI Will Duplicate Frame Preset Keys in Multiple Places

**What goes wrong:** `FRAME_PRESETS` in `framedArt.ts` is the global frame definition. `WallArt.frameStyle` is a key into that record. Adding per-placement frame color override means adding a `frameColorOverride?: string` to `WallArt`. If the override is not clearly documented in the type, future developers (or the same developer in three months) will try to set `frameStyle` to achieve color override and wonder why it doesn't work.

**Prevention:**
- Add `frameColorOverride?: string` explicitly to the `WallArt` interface in `cad.ts` with a JSDoc comment: "Overrides the FRAME_PRESETS default color for this placement only. Leave undefined to use preset default."
- In `WallMesh.tsx` rendering (line 181), use `art.frameColorOverride ?? preset.color` for the frame material color.

**Phase affected:** v1.2 Polish Pass (Phase B).

---

### Pitfall 12: 2D Canvas Paint Color Must Match 3D — Fabric `fill` and Three.js `color` Must Be Kept in Sync

**What goes wrong:** When a wall is painted in the 2D canvas (Fabric), the fill color used in `fabricSync.ts` for wall polygons must match what Three.js shows in 3D. Currently `baseColor` in `WallMesh.tsx` is hardcoded to `"#f8f5ef"` (line 88). The 2D canvas wall rendering in `fabricSync.ts` also uses hardcoded fill colors. If paint colors are stored on wall data and only applied in one renderer, the 2D and 3D views will disagree — 2D shows paint, 3D shows drywall, or vice versa.

**Prevention:**
- Store paint color on `WallSegment` per-side. Both `fabricSync.ts` (reads wall data to draw Fabric polygons) and `WallMesh.tsx` (reads wall data to render Three.js meshes) must read from the same field.
- In 2D, the wall polygon `fill` should use the paint color (with some transparency for the drywall-like look). In 3D, `baseColor` in `WallMesh.tsx` should use the paint color with the paint system's roughness/metalness values.
- Add a single helper function `getWallBaseColor(wall: WallSegment, side: WallSide): string` that both renderers call — single source of truth.

**Phase affected:** Color & Paint System (Phase A).

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| Phase A: Color & Paint System | Three.js hex color rendering | Colors render darker than picker swatches (sRGB/linear conversion) | R3F auto-converts sRGB hex correctly — trust the default, do not set LinearSRGBColorSpace manually on material colors |
| Phase A: Color & Paint System | Paint schema vs wallpaper schema | Two overlapping color sources on wall surfaces silently override each other | Define `paintColor` as separate field from `wallpaper`, migrate `wallpaper.kind==="color"` records in `snapshotMigration.ts` |
| Phase A: Color & Paint System | Custom paint persistence | Custom colors lost on reload (CUSTOM-05 class of bug) | Put custom user colors in `cadStore`/`CADSnapshot`, not a separate IndexedDB key |
| Phase A: Color & Paint System | Lime wash as ShaderMaterial | Fragment shader outputs in wrong color space, visible mismatch with standard walls | Use `THREE-CustomShaderMaterial` or implement as `CanvasTexture` over `MeshStandardMaterial` |
| Phase B: Polish Pass | Custom element hit testing | Edit handles unreachable — click on placed custom element does nothing | Extend `hitTestStore()` in `selectTool.ts` with a third branch for `placedCustomElements` |
| Phase B: Polish Pass | Copy-side implementation | Shallow copy creates shared reference, mutations bleed across sides | Always deep-copy with `JSON.parse(JSON.stringify(...))` when copying side configs |
| Phase B: Polish Pass | Library edit-in-place UI | All walls re-render on every keystroke in library editor | Narrow Zustand selector to `find(i => i.id === styleItemId)` per wall |
| Phase C: Advanced Materials | Unified catalog migration | Old `floorMaterial` and ceiling hex string records incompatible with new catalog type | Additive migration in `snapshotMigration.ts`; resolve `CEIL-04` dead code path simultaneously |
| Phase C: Advanced Materials | Floor texture cache | `getFloorTexture()` mutates shared `.repeat` — multi-room and split-view corrupt each other | Fix before adding ceiling texture cache: use `.clone()` or key cache by dimensions |
| Phase A+C: All texture work | Shared texture repeat mutation | Any new texture cache that mutates `.repeat` on a singleton will break split-view | Every texture cache entry must be immutable after creation; set `repeat` before adding to cache |

---

## Sources

- Three.js forum — r152 color management changes: [Updates to Color Management in three.js r152](https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791)
- Three.js forum — colors washed out or too dark: [r152 Colors washed out or too dark](https://discourse.threejs.org/t/three-js-r152-colors-washed-out-or-too-dark-tips-or-advice/56591)
- Three.js GitHub — color management documentation: [ColorManagement: Document which colors are in linear vs sRGB space](https://github.com/mrdoob/three.js/issues/26721)
- Three.js forum — hex color inputs and color space: [Why don't hexadecimal color inputs use the renderer's color space?](https://discourse.threejs.org/t/why-dont-hexadecimal-color-inputs-use-the-renderers-color-space/86420)
- R3F GitHub — sRGB handling discussion: [Proper sRGB handling in react-three-fiber](https://github.com/pmndrs/react-three-fiber/issues/344)
- Three.js GitHub — texture ambiguity with repeat on clones: [Ambiguity with texture transformation and texture cloning](https://github.com/mrdoob/three.js/issues/12788)
- THREE-CustomShaderMaterial: [FarazzShaikh/THREE-CustomShaderMaterial](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial)
- Zustand — out of memory with large IndexedDB state: [Out of Memory and large (IndexedDB) state](https://github.com/pmndrs/zustand/discussions/1773)
- Codebase — floor texture cache singleton (inspected): `src/three/floorTexture.ts` lines 67-76
- Codebase — selectTool hit-test gap (inspected): `src/canvas/tools/selectTool.ts` lines 91-134
- Codebase — cadStore snapshot function (inspected): `src/stores/cadStore.ts` lines 81-91
- v1.2 Milestone Audit: `.planning/v1.2-MILESTONE-AUDIT.md` — tech_debt, CUSTOM-05 pattern, CEIL-04 dead code
