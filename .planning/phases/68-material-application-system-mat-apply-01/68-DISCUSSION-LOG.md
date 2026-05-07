# Phase 68: Material Application System (MAT-APPLY-01) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 68-material-application-system-mat-apply-01
**Areas discussed:** Migration vs Alias, Paint relationship, Surface coverage scope, Tile-size precedence, Picker UX shape

---

## 1. Migration vs Alias

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Migration | At project load time, convert every old wallpaper/floor/paint entry into a Material. Snapshot v5→v6. Idempotent. Mirrors Phase 51 DEBT-05. | ✓ |
| (b) Alias | Keep legacy fields. Picker writes to whichever field matches the surface. No snapshot bump. Gradual cutover. | |
| (c) Hybrid | Migrate floors and wallpaper; keep paint as paint (since paint is just a color). | |

**User's choice:** (a) Migration
**Notes:** Lock keeps legacy fields readable for one milestone (v1.17) as a safety net; v1.18 cleanup phase removes them. Idempotency comes for free from the Phase 51 DEBT-05 pattern.

---

## 2. Paint relationship

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Paint becomes a Material with `colorHex` | Mutually exclusive with `colorMapId`. One picker, one library. Renderer checks `colorHex` first. | ✓ |
| (b) Picker has "Material / Paint" toggle at the top | Paint stays its own type. Two-mode picker. | |
| (c) Other | Free-text alternative. | |

**User's choice:** (a) Paint as Material with colorHex
**Notes:** Material's existing brand/SKU/cost/lead-time fields become especially useful for paint (paint cans have brands and SKUs). Migration auto-generates names like `"Paint #F5F0E8"`.

---

## 3. Surface coverage scope

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Just the four big surfaces — walls, floors, ceilings, custom-element faces | Wainscoting/crown/wall-art stay separate. Phase 70 may reorganize them as Assemblies. | ✓ |
| (b) Also fold in wainscoting + crown molding | Broader scope; doesn't fit Material shape cleanly (3D geometry with style choices). | |
| (c) Also fold in wall art | Major refactor — wall art is closer to a placed product than a surface material. | |
| (d) Fold in everything (a+b+c) | Maximum unification; expands Phase 68 into a milestone-sized effort. | |

**User's choice:** (a) Four big surfaces only
**Notes:** Wainscoting/crown molding/wall art are explicitly deferred — captured in CONTEXT.md `<deferred>` section for Phase 70 planning.

---

## 4. Tile-size precedence

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Material default + per-surface override | `surface.scaleFt ?? material.tileSizeFt ?? 1`. Phase 66 inputs become "override-or-default". Supports accent-wall workflow. | ✓ |
| (b) Material always wins | Simpler; Phase 66's per-surface input goes away. | |
| (c) Per-surface always wins | Preserves Phase 66 exactly; Material's tile-size becomes informational. | |

**User's choice:** (a) Material default + per-surface override
**Notes:** Locks `resolveSurfaceTileSize(surface, material)` resolver shape. Phase 66's UI inputs gain a fallback display when the override is empty.

---

## 5. Picker UX shape

| Option | Description | Selected |
|--------|-------------|----------|
| (a) One unified `<MaterialPicker>` with surface prop | `surface: "wallSide" | "floor" | "ceiling" | "customElementFace"`. Replaces Paint/CeilingPaint/FloorMaterial/SurfaceMaterial pickers. Matches existing `SurfaceMaterialPicker` pattern. | ✓ |
| (b) Per-surface variants sharing internals | `<WallMaterialPicker>`, `<FloorMaterialPicker>`, etc. via shared base. | |
| (c) Other | Free-text alternative. | |

**User's choice:** (a) One unified MaterialPicker
**Notes:** PropertiesPanel substantially shorter — three sections collapse to one. Surface-specific filtering via `materialsForSurface(materials, surface)` extends existing `data/surfaceMaterials.ts` pattern.

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` §"Claude's Discretion" — covers:
- Exact migration heuristic for paint colors lacking a `colorHex`
- Whether `MaterialPicker` shows surface-category tabs or flat list
- Mid-pick preview enable + debounce
- Dedup semantics for migrated paint Materials (default: share when same hex)
- Migration commit message phrasing
- Test-driver shape

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` — wainscoting/crown molding as Assemblies, wall art as placed-Material, filtering/sorting Materials by metadata, removal of legacy fields (v1.18 candidate), per-application overrides beyond tile-size.
