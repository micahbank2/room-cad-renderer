# Requirements — v1.19 Material Linking & Library Rebuild

> Generated: 2026-05-08
> Milestone goal: Complete the material engine story. Jessica can swap the finish on a placed product without re-placing it, and the sidebar library reorganizes into a Materials / Products / Assemblies three-tab structure.
>
> Continues phase numbering from 76. Phase 69 + 70 (deferred from v1.17) + Phase 77 (new test cleanup).

---

## Active Requirements

### Material Linking (MAT-LINK)

- [ ] **MAT-LINK-01**: User selects a placed product → PropertiesPanel shows a "Finish" picker → user picks a Material from the library → product's 3D rendering updates to use that material's color and roughness
- [ ] **MAT-LINK-02**: Finish change is undoable with a single Ctrl+Z
- [ ] **MAT-LINK-03**: Finish selection persists across save and load (`PlacedProduct.finishMaterialId` round-trips through the snapshot)
- [ ] **MAT-LINK-04**: Products placed without an explicit finish continue to render with their catalog default (today's behavior unchanged)

### Library Rebuild (LIB-REBUILD)

- [ ] **LIB-REBUILD-01**: Sidebar library shows a 3-way toggle at the top — Materials / Products / Assemblies — switching tabs swaps the visible content cleanly
- [ ] **LIB-REBUILD-02**: Materials tab shows category sub-tabs (Flooring / Wall coverings / Countertops / Paint) and filters the Phase 67 material library by category
- [ ] **LIB-REBUILD-03**: Products tab shows category sub-tabs (Furniture / Plumbing fixtures / Appliances / Lighting / Curtains & blinds / Decor); existing products land in the right category or "Uncategorized"
- [ ] **LIB-REBUILD-04**: Assemblies tab shows a clear empty-state placeholder — not broken UI
- [ ] **LIB-REBUILD-05**: Upload buttons are context-aware: Materials tab → "Upload Material"; Products tab → "Add Product"; existing upload + place flows continue to work end-to-end

### Test Suite Cleanup (TEST-CLEANUP)

- [ ] **TEST-CLEANUP-01**: All Phase-31-era test files that render PropertiesPanel or FloatingToolbar are wrapped in `<TooltipProvider>` (fixes GH #163 — 5 files)
- [ ] **TEST-CLEANUP-02**: AddProductModal tests query `role="switch"` instead of `role="checkbox"` after v1.18 Switch primitive migration (fixes GH #164)

---

## Future Requirements (Deferred)

These were considered for v1.19 and explicitly deferred:

- **PBR maps extension** (AO + displacement + emissive, GH #81) — defer to v1.20. Requires new upload UX and 3D pipeline changes beyond the material linking story.
- **Parametric object controls** (GH #28) — defer to v1.20. Different feature arc; doesn't depend on v1.19.
- **Window presets** (GH #20) + **columns/levels/platforms** (GH #19) — defer to v1.20. Architectural element work, separate from material story.
- **R3F v9 / React 19 upgrade** (GH #56) — tracked separately; no dep on v1.19.

---

## Out of Scope (v1.19)

- **Assemblies tab content** — placeholder only; building pre-made combos (kitchen cabinetry etc.) is a future milestone
- **Material categories as user-editable** — categories are fixed enum for now; custom category creation deferred
- **GLTF PBR material slot override** — Phase 69 swaps finish at the mesh level; per-slot GLTF sub-mesh override deferred pending PBR maps extension
- **Snapshot migration testing beyond snapshot v7** — Phase 69 bumps to v7; no further version bumps in v1.19

---

## Traceability

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| MAT-LINK-01 | 69 | TBD | Not started |
| MAT-LINK-02 | 69 | TBD | Not started |
| MAT-LINK-03 | 69 | TBD | Not started |
| MAT-LINK-04 | 69 | TBD | Not started |
| LIB-REBUILD-01 | 70 | TBD | Not started |
| LIB-REBUILD-02 | 70 | TBD | Not started |
| LIB-REBUILD-03 | 70 | TBD | Not started |
| LIB-REBUILD-04 | 70 | TBD | Not started |
| LIB-REBUILD-05 | 70 | TBD | Not started |
| TEST-CLEANUP-01 | 77 | TBD | Not started |
| TEST-CLEANUP-02 | 77 | TBD | Not started |
