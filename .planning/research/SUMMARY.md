# Project Research Summary

**Project:** Room CAD Renderer — v1.3 Color, Polish & Materials
**Domain:** Interior design visualization tool — paint systems, material catalogs, canvas tool extensions
**Researched:** 2026-04-05
**Confidence:** HIGH

## Executive Summary

v1.3 is an additive milestone on a mature, well-structured codebase. The core architecture (Zustand stores as source of truth, Fabric.js 2D canvas, R3F/Three.js 3D viewport) is already established and proven. The three feature sets — a color and paint system, v1.2 polish pass items, and a unified ceiling/floor material catalog — all follow patterns that already exist in the codebase. This is not a greenfield build; it is careful extension of working systems. The research verdict is that v1.3 can be executed with high confidence by following existing patterns (global library store, per-side wall treatment, selectTool hit-test branches) without introducing architectural risk.

The recommended approach groups work into three phases that respect dependency order: paint system first (highest user value, existing type support), polish pass second (tech debt items that block usability), and unified materials third (infrastructure expansion). One new npm dependency — `react-colorful` — covers the entire milestone. Everything else uses the existing stack, static data files, and the established Zustand/idb-keyval library store pattern. The Farrow & Ball catalog ships as a static TypeScript data file (~8 KB), not a runtime fetch or external package.

The two highest-risk areas are both known and preventable. First, custom paint colors must live inside `CADSnapshot` (not a standalone IndexedDB key) to avoid the CUSTOM-05 class of bug where data references survive undo/redo but the referenced catalog entry does not. Second, the floor texture cache in `floorTexture.ts` mutates a shared `.repeat` reference on a singleton — this must be fixed before any new texture catalog is built on top of it, or split-view rooms will corrupt each other's tile scales.

## Key Findings

### Recommended Stack

The milestone requires exactly one new npm package: `react-colorful ^2.7.3` (2.8 KB gzipped, zero runtime dependencies, ~3M weekly downloads, direct `HexColorPicker` component that outputs `#rrggbb` strings). Everything else — Three.js material parameters, Fabric.js canvas fills, Zustand stores, idb-keyval persistence — is already installed and used in the codebase. The Farrow & Ball 132-color catalog ships as a static TypeScript module (`src/data/farrowAndBall.ts`), not a CDN fetch or npm package. Lime wash is achievable with `roughness: 0.95` on `meshStandardMaterial` without a custom shader for v1.3 scope.

**Core technologies:**
- `react-colorful`: hex color picker UI — only new dep; tiny, zero deps, industry standard
- `THREE.meshStandardMaterial` (existing): lime wash via `roughness: 0.95` + `blendWithWhite` utility — no shader library needed
- `idb-keyval` (existing): persist `paintStore` custom colors and `surfaceMaterialStore` — same pattern as `framedArtStore` and `wainscotStyleStore`
- Static TypeScript data file: Farrow & Ball 132-color catalog — offline-capable, no fetch, no license risk
- Fabric.js v6 (existing): custom element handles via imperative hit-testing — same pattern as `PlacedProduct`, no new Fabric controls API

**Rejected alternatives:**
- `react-color`: unmaintained since 2020, 70 KB+
- Custom GLSL shader for lime wash: overkill at room scale; material params sufficient for v1.3
- `colornerd` npm package: full 30K-color library; only 132 colors needed
- OKLCH pickers: Jessica thinks in paint names, not color math

### Expected Features

**Must have (table stakes):**
- Apply solid paint color to wall surfaces (2D + 3D) — core use case; type support already exists via `Wallpaper.kind="color"`
- Apply paint color to ceilings — `CeilingMesh` already reads `Ceiling.material` hex; just needs paint picker wired in
- Global paint library with named colors (Farrow & Ball 132 + custom) — users need to pick the same color across multiple walls
- Swatch grid UI with name/filter by hue family — standard pattern for interior tools
- Edit handles for `PlacedCustomElement` (drag, rotate, resize) — every other placed entity has handles; this is the only one without
- Wainscot library edit-in-place — `updateItem()` already exists in store; only the UI is missing
- Copy SIDE_A treatment to SIDE_B — divider walls always need both sides; current workflow requires manual re-entry
- Ceiling texture presets (fix CEIL-04 dead code and expand) — floor has 8 presets; ceiling inconsistency is noticeable
- Per-placement frame color override for wall art — `FRAME_PRESETS` defines the style but override per placement is expected behavior

**Should have (differentiators):**
- Lime wash toggle per paint entry — top 2026 interior trend; differentiates from "just pick a hex"
- "Recently used" palette row — reduces friction for multi-wall same-color workflows
- Apply-to-all-walls broadcast — single action for painting every wall one color
- Unified ceiling/floor material catalog (`surfaceMaterialStore`) with shared `SurfaceMaterialPicker` — eliminates inconsistency between the two surface systems
- Per-wall wainscot knob overrides (`heightOverride`, `colorOverride`) — fine-tune a single wall without creating a new library entry
- Dims editor for placed wall art — stock 2'×2.5' default rarely matches Jessica's actual pieces

**Defer:**
- Roughness slider per placement — preset defaults cover 95% of use cases; avoids UI noise
- AR camera room paint preview — requires image segmentation; 3D walkthrough already covers the "feel the space" use case
- Saved room color scheme presets — adds schema complexity without enough v1.3 value
- Beam geometry for ceilings — wood texture on ceiling gives the visual suggestion at much lower cost
- PBR texture upload for ceilings — floor already has custom upload; ceiling custom photo rarely needed

### Architecture Approach

v1.3 extends the existing global library store pattern (`framedArtStore`, `wainscotStyleStore`) with two new stores — `paintStore` and `surfaceMaterialStore` — both using `idb-keyval` for persistence with seed-on-first-load behavior. Wall paint is modeled as `Wallpaper.kind="paint"` with a `paintId` foreign key (not embedded hex) so that editing a custom color propagates everywhere. Ceilings gain optional `paintId?` and `surfaceMaterialId?` fields resolved at render time with a priority chain: `surfaceMaterialId` > `paintId` > `material` hex > default. All changes are additive — no `migrateSnapshot` version bump is required for any v1.3 change, because every new field is optional and existing render paths check `if (fieldExists)` before using it.

**Major components:**
1. `paintStore.ts` — global paint library; seeds F&B catalog on first load; custom colors persisted to idb-keyval; `PaintColor { id, name, brand, hex, limeWash, catalogRef? }`
2. `surfaceMaterialStore.ts` — unified floor/ceiling texture catalog; seeds from existing `FLOOR_PRESETS` + new ceiling presets; `SurfaceMaterialItem { id, name, category, kind, color, roughness, imageUrl?, defaultScaleFt }`
3. `PaintLibrary.tsx` + `PaintPicker.tsx` — sidebar panel and apply-modal; mirror `ProductLibrary` structure; swatch grid, hue filter, name search, custom-color CRUD
4. `SurfaceMaterialPicker.tsx` — unified modal replacing `FloorMaterialPicker`; takes `surface: "floor" | "ceiling"` prop to filter catalog
5. `selectTool.ts` extensions — third hit-test branch for `placedCustomElements`; reuses existing `hitTestHandle`, `hitTestResizeHandle`, `angleFromCenterToPointer` helpers
6. `cadStore.ts` additions — `rotateCustomElement*`, `resizeCustomElement*` (NoHistory variants), `copyWallSide` actions

**New type files:**
- `src/types/paint.ts` — `PaintColor` interface
- `src/types/surfaceMaterial.ts` — `SurfaceMaterialItem`, `SurfaceCategory`

**Modified types (additive only):**
- `Wallpaper` in `cad.ts`: add `kind: "paint"`, `paintId?: string`, `limeWash?: boolean`
- `Ceiling` in `cad.ts`: add `paintId?: string`, `limeWash?: boolean`, `surfaceMaterialId?: string`
- `WallArt` in `cad.ts`: add `frameColorOverride?: string`

### Critical Pitfalls

1. **Custom paint colors in a standalone IndexedDB key will silently lose data on undo** — Wall's `paintId` is in undo history but the referenced custom color is not. On undo, wall references a non-existent `paintId` and falls back to default color. Prevention: store custom user colors inside `CADSnapshot` alongside `customElements`, not in a separate idb-keyval key. The F&B static catalog never needs persistence — it's code.

2. **Floor texture cache mutation breaks multi-room split view** — `getFloorTexture()` mutates `.repeat` on a shared singleton `THREE.Texture` instance. Any new texture catalog (ceiling, surface materials) that copies this pattern multiplies the corruption. Prevention: fix `floorTexture.ts` to use `.clone()` before Phase C adds ceiling textures. This is a prerequisite, not a nice-to-have.

3. **Two overlapping color systems on walls will silently override each other** — `Wallpaper.kind="color"` with `color: string` (existing) and new `kind="paint"` with `paintId` both set wall color. Without a clear schema hierarchy, renderers in `WallMesh.tsx` and `fabricSync.ts` produce different results. Prevention: define `kind="paint"` as the explicit new path; deprecate `kind="color"` inline; add a `snapshotMigration` that lifts old `kind="color"` records to the paint path.

4. **`selectTool.ts` hit-test gap blocks all custom element edit handle work** — `hitTestStore()` currently never checks `doc.placedCustomElements`. All planned rotate/resize handles for custom elements are unreachable until a third hit-test branch is added. This is not a "future fix" — it must be the first action in Phase B.

5. **Copy-side shallow clone will create shared object references** — `Object.assign` or spread on `WainscotConfig` / `Wallpaper` / `CrownConfig` leaves both sides pointing to the same object. Immer's `produce()` mutates Side A and Side B silently changes. Prevention: always `JSON.parse(JSON.stringify(...))` when implementing `copyWallSide`.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase A: Color & Paint System

**Rationale:** Highest impact for Jessica's core use case ("feel the space with her actual furniture"). The data model (`Wallpaper.kind="color"`) is already in place — this is mostly a UX build plus a new store. Must come first because Phase C's ceiling material work extends the ceiling rendering path that Phase A establishes for paint.

**Delivers:** Apply Farrow & Ball or custom paint to any wall side (2D + 3D); lime wash toggle; swatch grid with hue filter and name search; paint applied to ceilings; recently-used palette; apply-to-all-walls broadcast.

**Addresses:** All Feature Category 1 table stakes and differentiators from FEATURES.md.

**Avoids:**
- Pitfall 3 (overlapping color systems): define `kind="paint"` + `snapshotMigration` before shipping
- Pitfall 1 (custom color persistence): put custom colors in `CADSnapshot`, not standalone idb-keyval
- Pitfall 6 (F&B catalog in history): F&B data stays as static module, never enters Zustand store

**Research flag:** Standard patterns — `paintStore` follows `framedArtStore` exactly. No phase-level research needed.

---

### Phase B: v1.2 Polish Pass

**Rationale:** Four independent sub-features that each fix a broken or incomplete user interaction. Custom element edit handles are the most disruptive gap (placed elements can't be moved after placement). The other three (wainscot edit-in-place, copy-side, frame override) are low-complexity and high daily-use value. All four can be done in parallel by sub-feature.

**Delivers:** Drag/rotate/resize for all placed custom elements; edit-in-place for wainscot and framed art library items; one-click copy SIDE_A to SIDE_B for all wall treatments; per-placement frame color override; dims editor for placed art.

**Addresses:** All Feature Category 2 table stakes from FEATURES.md; clears the v1.2 audit tech debt list.

**Avoids:**
- Pitfall 4 (selectTool hit-test gap): first action in this phase is extending `hitTestStore()` for `placedCustomElements`
- Pitfall 5 (copy-side shallow clone): `copyWallSide` must use `JSON.parse(JSON.stringify(...))` + re-generate `art_${uid()}` ids
- Pitfall 9 (wainscot re-render on edit): narrow Zustand selector to `find(i => i.id === styleItemId)` per wall

**Research flag:** Standard patterns — all sub-features follow existing codebase patterns. No phase-level research needed.

---

### Phase C: Advanced Materials — Unified Ceiling/Floor Catalog

**Rationale:** Infrastructure expansion that unifies two inconsistent surface systems. Depends on Phase A establishing the `CeilingMesh` paint resolution path (Phase C extends it with `surfaceMaterialId`). The floor texture cache bug **must be fixed at the start of this phase** before any new texture catalog is added.

**Delivers:** `surfaceMaterialStore` with ceiling + floor presets sharing a single catalog; `SurfaceMaterialPicker` replacing `FloorMaterialPicker`; CEIL-04 dead code fixed; ceiling texture presets (plaster, wood plank, concrete, painted drywall); roughness override per placement; ceiling texture rotation option.

**Addresses:** All Feature Category 3 table stakes and differentiators from FEATURES.md.

**Avoids:**
- Pitfall 2 (floor texture cache): fix `floorTexture.ts` `.clone()` pattern before building ceiling texture cache
- Pitfall 10 (material catalog migration): additive `snapshotMigration` using `"smat_"` prefix convention for new catalog IDs; old `FLOOR_PRESETS` keys remain valid via legacy path
- Pitfall 7 (CEIL-04 dead code): `surfaceMaterialId` resolution replaces the dead preset-ID path naturally

**Research flag:** The `floorTexture.ts` cache fix and `snapshotMigration` strategy are well-understood patterns. No phase-level research needed. Validate the texture `.clone()` approach with a split-view smoke test before proceeding.

---

### Phase Ordering Rationale

- **Paint before materials:** Phase A establishes `paintId` on `Ceiling` and `Wallpaper`. Phase C adds `surfaceMaterialId` to `Ceiling` as a further extension — both phases touch the same file with the same additive-optional pattern. Building in this order avoids doing the ceiling type extension twice.
- **Polish pass is independent:** Phase B shares no type dependencies with Phases A or C. It can overlap with either in practice. Placed after Phase A in the roadmap because it's lower user impact than wall paint, not because of dependency.
- **Materials last:** Phase C is infrastructure. It requires Phase A's ceiling render path to be established. It also has the highest migration risk (floor presets + ceiling hex string → unified catalog), which is easier to handle when the codebase is stable after Phases A and B.
- **Texture cache fix is a gate:** The floor texture `.repeat` mutation bug gates Phase C. It should be the first commit of Phase C, confirmed with a split-view smoke test, before any texture catalog work begins.

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase A:** `paintStore` follows `framedArtStore` exactly; `react-colorful` is well-documented; Three.js paint color path is established
- **Phase B:** All four sub-features follow existing codebase patterns; `selectTool` hit-test extension is the same branch pattern used for products; `copyWallSide` is a Zustand action following existing `cadStore` action signatures
- **Phase C:** `surfaceMaterialStore` follows existing library store pattern; migration strategy (additive fields, `smat_` prefix) is established; `SurfaceMaterialPicker` mirrors `FloorMaterialPicker` structure

No phase requires `/gsd:research-phase` before execution — all patterns are documented in the existing codebase and confirmed by research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | One new dep (`react-colorful`) with verified specs; all other tech is already in the codebase |
| Features | HIGH | Feature set derived from existing audit (`v1.2-MILESTONE-AUDIT.md`) + direct codebase analysis; F&B catalog hex accuracy is MEDIUM (community-matched, not official F&B RGB) |
| Architecture | HIGH | Based on direct codebase inspection of `selectTool.ts`, `cadStore.ts`, `framedArtStore.ts`, `CeilingMesh.tsx` — not inference |
| Pitfalls | HIGH | Critical pitfalls 1–4 are all verified against live code; Pitfall 2 (texture cache) confirmed in `floorTexture.ts` lines 67-76 |

**Overall confidence:** HIGH

### Gaps to Address

- **F&B color hex accuracy:** The 132 hex values are community-matched approximations, not official Farrow & Ball RGB codes (F&B does not publish official hex). Good enough for visualization; not suitable for print production. Note this in the feature UI: "Colors are approximate visualizations."
- **Lime wash visual fidelity:** `roughness: 0.95` approximation is validated by Three.js material model understanding but not by a live render test. Validate during Phase A implementation. If the effect reads as "flat matte" rather than "chalky/irregular," consider the `CanvasTexture` noise overlay approach (documented in PITFALLS.md Pitfall 5).
- **`paintStore` not in CADSnapshot:** If per-project custom colors are in `CADSnapshot`, they are not portable across projects. If they are in a shared idb-keyval key, they are portable but create the CUSTOM-05 undo hazard. Decide the scope (per-project vs global) before implementing `paintStore`. Research recommends per-project (in `CADSnapshot`) for safety.
- **Ceiling schema string vs structured type:** ARCHITECTURE.md recommends keeping `Ceiling.material` as a `string` with the `paintId?` field alongside it for v1.3 (Option A). This avoids a `migrateSnapshot` bump. The cleaner Option B (structured `CeilingMaterial` union type) is deferred. If Phase C's ceiling texture work makes the string approach feel cramped, revisit before Phase C ships.

## Sources

### Primary (HIGH confidence)
- `src/stores/cadStore.ts` — snapshot function, undo/redo history pattern, existing store actions
- `src/canvas/tools/selectTool.ts` — hit-test pattern, DragType union, drag handler branches
- `src/canvas/rotationHandle.ts`, `resizeHandles.ts` — reusable handle hit-test modules
- `src/stores/framedArtStore.ts`, `wainscotStyleStore.ts` — global library store pattern
- `src/three/CeilingMesh.tsx` — confirmed CEIL-04 dead code; existing hex color path
- `src/three/floorTexture.ts` lines 67-76 — confirmed `.repeat` mutation on singleton
- `src/data/floorMaterials.ts` — existing preset structure to extend
- `.planning/v1.2-MILESTONE-AUDIT.md` — authoritative tech debt list for polish pass
- [react-colorful npm](https://www.npmjs.com/package/react-colorful) — version, bundle size, deps
- [Three.js MeshStandardMaterial docs](https://threejs.org/docs/pages/MeshStandardMaterial.html) — roughness, color, onBeforeCompile

### Secondary (MEDIUM confidence)
- [colornerd GitHub (jpederson)](https://github.com/jpederson/colornerd) — Farrow & Ball JSON source; hex accuracy is community-matched
- [Converting Colors — Farrow & Ball](https://convertingcolors.com/list/farrow-ball.html) — 132 color hex verification
- [Three.js forum r152 color management](https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791) — sRGB/linear conversion behavior
- [THREE-CustomShaderMaterial](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) — fallback for lime wash if shader needed

### Tertiary (LOW confidence)
- Lime wash visual at `roughness: 0.95` — inferred from Three.js material model; needs live render validation during Phase A

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
