# Requirements — v1.17 Library + Material Engine

First milestone since v1.2 to introduce a new core data system. Materials become a first-class entity — Jessica uploads marble, fabric, tile, flooring with real-world metadata (brand, SKU, cost, lead time), then applies them to any surface (walls, floors, ceilings, custom-element faces) and any product (as a finish slot). The library sidebar gets the proper Materials / Assemblies / Products top-level structure.

Continues phase numbering from 66 → starts at **67**. Multi-day milestone (not a maintenance-pass sprint). Each phase replaces an existing subsystem; migration work + snapshot version bump expected at every boundary.

## Active Requirements

### Material Engine (Foundation)

- [x] **MAT-ENGINE-01** — User can upload a Material with texture maps (color / roughness / reflection) plus real-world metadata (brand, SKU, cost, lead time, name, real-world tile size in feet) and have it persist in the local library across all projects. Source: [#25](https://github.com/micahbank2/room-cad-renderer/issues/25). **Phase 67.**
  - **Verifiable:** Open the library → click "Upload Material" → drag a JPEG/PNG color map (and optionally roughness/reflection maps) → fill metadata fields (name, brand, SKU, cost, lead time, tile size in feet+inches) → Save. Material appears in the library, persists across reload, deduplicates if the same color-map file is uploaded again, and shows the metadata in a hover/inspect view.
  - **Acceptance:** New `Material` entity in a `materialStore` (Zustand + IndexedDB), schema mirroring Phase 32 user-texture pattern: `{ id, name, brand?, sku?, cost?, leadTimeDays?, tileSizeFt, colorMapId, roughnessMapId?, reflectionMapId?, createdAt }`. Texture maps reuse the existing user-texture IDB layer (SHA-256 dedup, 2048px longest-edge downscale, 25MB cap per map). Upload form mirrors AddProductModal layout. New `useMaterials()` hook exposes the library. Snapshot serialization NOT required at this phase — materials live in their own store, not in `cadStore`.
  - **Hypothesis to test:** Phase 32's user-texture pipeline is the architectural template. Materials wrap one-or-more user-texture references with metadata. Confirm at plan-phase research whether "Material as wrapper around user-textures" is cleaner than "Material as new texture root."

### Material Application (Use)

- [x] **MAT-APPLY-01** — User can apply any Material from the library to any surface (wall side, floor, ceiling, or custom-element face) through one unified picker, replacing today's split paint / wallpaper / floor-material flows. Source: [#27](https://github.com/micahbank2/room-cad-renderer/issues/27). **Phase 68.**
  - **Verifiable:** Select a wall side → PropertiesPanel shows a unified "Material" picker → click → library opens filtered to materials applicable to walls → pick "Carrara Marble" → wall surface renders with that material's color map + roughness in 2D preview and 3D viewport. Same flow works for floor, ceiling, and custom-element faces. Existing paint colors still work (paints become a category of Material). Existing wallpaper/floor-material assignments migrate cleanly to the unified model.
  - **Acceptance:** New `surface.materialId?: string` field on Wallpaper / FloorMaterial / Ceiling / CustomElement / WallSide. Resolver function `resolveSurfaceMaterial(surface)` returns the Material entity or null. 2D fabric texture-fill consumes the resolver; 3D mesh material does the same. Existing paint/wallpaper/floor-material types either become aliases over Material OR migrate to it via snapshot version bump. Single-undo per apply (history snapshot pattern). PropertiesPanel "Material" section replaces existing per-type sections (paint picker, wallpaper picker, floor-material picker) — but legacy entries continue to render correctly.
  - **Hypothesis to test:** Existing paint/wallpaper/floor-material systems can be unified via either (a) full migration of legacy entries to Materials at snapshot-load time, or (b) keep legacy types and have the picker write to whichever field matches the surface. Plan-phase research picks. The migration approach is cleaner long-term but riskier; the alias approach is incremental.

### Product–Material Linking (Finish Slots)

- [ ] **MAT-LINK-01** — User can swap the finish material on a placed product without re-placing the object. Products carry a "finish slot" referencing a Material. Source: [#26](https://github.com/micahbank2/room-cad-renderer/issues/26). **Phase 69.**
  - **Verifiable:** Place a couch in a room → select it → PropertiesPanel shows a "Finish" picker → pick a fabric Material from the library → couch's 3D rendering changes to that fabric (color + roughness). Original couch placement, position, scale, rotation all preserved. Single Ctrl+Z undoes the finish change. Material change persists across save/load. Couches placed without an explicit finish use the catalog default (today's behavior).
  - **Acceptance:** New `PlacedProduct.finishMaterialId?: string` field (placement-instance state per Phase 31 D-02 separation pattern). 3D ProductMesh applies the finish material to the appropriate mesh slot — for textured-box placeholders, override the box texture; for GLTF products with embedded PBR, paint a slot-aware override (which slots get overridden is left for plan-phase research; default is "all surfaces" or "primary slot"). Single-undo per swap (push history at picker open, NoHistory mid-pick, commit at confirm). Snapshot serialization adds the field; snapshot version bump if needed.
  - **Hypothesis to test:** GLTF products have multiple PBR material slots (e.g., couch frame + fabric + cushions are separate materials). Finish-slot may need to map to one specific slot or all slots. Plan-phase research picks the default behavior. Textured-box products are simpler — single slot.

### Library Restructure (UI Surface)

- [ ] **LIB-REBUILD-01** — Sidebar library has a top-level Materials / Assemblies / Products toggle, each with its own category tabs (Materials: Flooring, Wall coverings, Countertops, Paint; Products: Furniture, Plumbing fixtures, Appliances, Lighting, Curtains & blinds, Decor; Assemblies: empty for v1.17, placeholder for future). Source: [#24](https://github.com/micahbank2/room-cad-renderer/issues/24). **Phase 70.**
  - **Verifiable:** Open the sidebar library → see 3-tab top toggle (Materials / Assemblies / Products) → each tab shows the correct category sub-tabs → switching tabs filters the visible items → upload + place flows still work from the new structure. Existing products migrate to the right Products category (or "Uncategorized" if metadata missing). Existing materials (from Phase 67) appear under Materials tab in the right category. Assemblies tab shows empty state with placeholder copy ("Coming soon — pre-built combos like kitchen cabinetry").
  - **Acceptance:** ProductLibrary.tsx refactored to top-level `LibraryRoot` with three child views: `MaterialsLibrary`, `AssembliesLibrary` (stub), `ProductsLibrary`. Category metadata extends Product (`category: "furniture" | "plumbing" | ... `) and Material (`category: "flooring" | "wallCovering" | ...`). UI uses existing CategoryTabs primitive (Phase 33 design system). Upload buttons context-aware: in Materials tab → "Upload Material"; in Products tab → "Add Product." Empty Assemblies tab shows clear placeholder, not broken UI.
  - **Hypothesis to test:** Existing products may not all have a `category` field (added recently or not at all). Migration sets undefined → "Uncategorized". Plan-phase research confirms current Product schema and migration scope.

## Out of Scope (this milestone)

| Item | Reason |
|------|--------|
| **PBR maps extension** ([#81](https://github.com/micahbank2/room-cad-renderer/issues/81) — AO + displacement + emissive) | v1.18 candidate. Phase 32 pipeline (albedo/normal/roughness) is sufficient for v1.17. |
| **CAM-05** ([#127](https://github.com/micahbank2/room-cad-renderer/issues/127) EXPLODE saved-camera offset) | Narrow trigger; Jessica unlikely to hit it. Re-deferred. |
| **Cloud sync** ([#30](https://github.com/micahbank2/room-cad-renderer/issues/30)) | Local-first decision still locked. Indefinite defer. |
| **Parametric object controls** ([#28](https://github.com/micahbank2/room-cad-renderer/issues/28)) | v1.18+ candidate. Materials must land first. |
| **Window presets** ([#20](https://github.com/micahbank2/room-cad-renderer/issues/20)) | Cosmetic; generic window places fine. v1.18+. |
| **Columns + levels/platforms** ([#19](https://github.com/micahbank2/room-cad-renderer/issues/19) partial) | Stairs + openings shipped in v1.15. Remaining toolbar items defer to v1.18+. |
| **R3F v9 / React 19 upgrade** ([#56](https://github.com/micahbank2/room-cad-renderer/issues/56)) | Still gated on R3F v9 stability. |
| **Plain English documentation** ([#31](https://github.com/micahbank2/room-cad-renderer/issues/31), [#32](https://github.com/micahbank2/room-cad-renderer/issues/32), [#33](https://github.com/micahbank2/room-cad-renderer/issues/33)) | Defer to a docs-only mini-milestone. |
| **Real Assemblies (kitchen cabinetry, vanities, built-ins)** | v1.17 ships only the empty Assemblies tab + placeholder. Real assembly authoring tool defers to v1.19+. |
| **Material editor / fine-tune sliders** | v1.17 imports materials as-is. Editing roughness/scale per-instance is per-surface tile-size (Phase 66 already shipped); finer controls defer. |
| **L-shape concave-room normal heuristic** | v1.15 carry-over; non-convex rooms only. |
| **Per-opening saved-camera bookmarks** | v1.15 Phase 61 carry-over. |
| **3D dimension billboards** | v1.15 Phase 62 carry-over. |
| **Tree integration for measurements + annotations** | v1.15 Phase 62 carry-over. |
| **OBJ format support** | v1.14 carry-over; demand-driven. |
| **GLTF animations** | v1.14 carry-over. |
| **LOD / progressive loading** | v1.14 carry-over. |

## Validated Requirements (Earlier Milestones)

See `.planning/milestones/v1.0-REQUIREMENTS.md` through `.planning/milestones/v1.16-REQUIREMENTS.md`. All v1.0–v1.16 requirements shipped or formally deferred.

## Traceability

| Requirement | Phase | Plans |
|-------------|-------|-------|
| MAT-ENGINE-01 | Phase 67 | TBD |
| MAT-APPLY-01 | Phase 68 | TBD |
| MAT-LINK-01 | Phase 69 | TBD |
| LIB-REBUILD-01 | Phase 70 | TBD |

---

*Last updated: 2026-05-06 — v1.17 roadmap created (4 phases, 4/4 requirements mapped)*
