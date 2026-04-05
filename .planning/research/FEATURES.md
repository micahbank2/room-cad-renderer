# Feature Landscape: v1.3 Color, Polish & Materials

**Domain:** Interior design visualization tool — paint system, library UX polish, material catalog expansion
**Researched:** 2026-04-05
**Milestone context:** Subsequent milestone adding to existing app. Pre-existing: multi-room CAD, walls, doors/windows, ceilings, floor materials (8 presets + custom), per-wall wallpaper, wall art, wainscoting (7 styles), crown molding, per-side (SIDE_A/SIDE_B) treatments, custom element builder, framed art library, 3D walkthrough.

---

## Feature Category 1: Color & Paint System

### Table Stakes

Features a user expects a paint system to have. Missing any of these makes the feature feel unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Apply solid paint color to wall surfaces (2D + 3D) | Core use case — every room planner has wall paint | Med | 2D: change `Wallpaper.kind="color"` + hex; 3D: `material.color.set(hex)` on `WallMesh`. Existing `Wallpaper` type already supports `kind="color"` with `color?: string` — it just needs a UX entry point |
| Apply paint color to ceiling surfaces (2D + 3D) | Ceiling color is the most common non-white design choice | Low | `Ceiling.material` already stores a hex string; `CeilingMesh` already reads it for color — just needs a paint picker wired into the ceiling UI |
| Global paint library with named colors | Users need to pick the same color for multiple walls without typing hex | Med | A new store (`paintStore`, `idb-keyval`) — `PaintEntry { id, name, hex, brand?, limewash? }[]`. Survives reload. Cross-project. |
| Farrow & Ball catalog — ~132 named colors with hex values | F&B is the reference catalog for interior design enthusiasts; Jessica thinks in F&B color names | Med | 132 colors, static data file. Confirmed count: 132 colors per Encycolorpedia + Converting Colors (HIGH confidence). Build as `FB_COLORS: PaintEntry[]` constant. No API needed. |
| Color swatch grid UI with name visible on hover | Standard swatch browsing pattern for interior tools | Med | Grid of 20×20px swatches, `title` attribute shows name. Clicking a swatch applies to selected surface. |
| Search / filter by color name | "Off Black", "Elephant's Breath" — users know F&B names | Low | Simple string filter over the flat array, updates swatch grid live |
| Filter by hue family | Browse "greens", "blues", "neutrals" — matches how Benjamin Moore / Sherwin-Williams UX works | Low | Pre-categorize the 132 F&B colors into ~8 hue families (whites/off-whites, neutrals/grays, blues, greens, pinks/reds, yellows, blacks). Filter chips above the swatch grid. |
| Custom color creation (hex input + name) | User has a specific hex from Pinterest or brand; F&B catalog alone won't cover it | Low | "ADD CUSTOM" entry below the catalog — name input + hex picker (`<input type="color">`) — pushes into paintStore as a user-owned entry |
| Per-placement color: selected wall applies to SIDE_A or SIDE_B | Per-side treatments already exist in the data model | Low | The existing `Wallpaper` per-side wrapper (`wall.wallpaper.A/B`) handles this. Just need paint-apply to write to the correct side. |

### Differentiators

Features not expected but add significant value for Jessica's use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Lime wash toggle per paint entry | Lime wash is a top 2026 interior trend; Jessica is likely exploring it. Differentiates from "just pick a hex" | Med | Visual approximation: in 3D use `roughness=1.0` (fully matte) + slight `MeshStandardMaterial.color` desaturation + optionally a tiled Perlin noise texture (GLSL or data URL) blended over the base color to simulate mottling. In 2D, render the wall fill color with ~20% opacity overlay of a small cloudy pattern. Does NOT need a shader — a canvas `globalAlpha` pattern overlay is sufficient. |
| "Recently used" palette at the top of the paint panel | Reduces friction for multi-wall same-color workflows (painting all walls) | Low | Last 8 applied colors shown as row of larger swatches above the catalog |
| Apply to all walls (broadcast) | Single action to paint every wall in the room the same color | Low | Button in paint panel: "APPLY TO ALL WALLS" — iterates over `Object.values(activeRoom.walls)` and sets `wallpaper.A.kind="color"` for all. Optionally a confirm prompt. |
| Apply to ceiling toggle alongside wall | Most repaints involve both walls + ceiling | Low | Checkbox "ALSO APPLY TO CEILING" in paint apply workflow |

### Anti-Features

Features to explicitly NOT build for this tool and user.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Delta E / perceptual color matching across paint brands | Professional feature; Jessica thinks in F&B names, not perceptual matching | Ship F&B catalog only. If Jessica wants a non-F&B color, she enters hex manually. |
| AR camera room paint preview (upload photo, paint walls) | Too complex for scope; requires image segmentation | The 3D walkthrough already provides the "feel the space" experience — that's the differentiator |
| Saved "room color scheme" presets | Nice-to-have but adds schema complexity; out of scope for v1.3 | Jessica can just note her palette in the project name |
| Paint finish simulation (eggshell vs satin vs flat) | The PBR roughness value already approximates this; a separate dropdown adds noise | Use roughness from lime wash toggle (matte) vs base (semi-gloss) only |
| Shopping cart / paint code export | Out of scope per PROJECT.md | — |
| Per-product color override | Products render from uploaded images; coloring over the image makes no visual sense | — |

---

## Feature Category 2: v1.2 Polish Pass

### Table Stakes

Items from the v1.2-MILESTONE-AUDIT.md tech debt list that represent broken or missing core interactions.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Edit handles for PlacedCustomElement (select, drag, rotate, resize) | Every other placed element in the app has handles; custom elements are the only ones without them | Med | `selectTool.ts` needs a hit-test branch for `PlacedCustomElement` matching the `PlacedProduct` pattern. On selection: bounding box from `CustomElement.width/depth/height`, corner rotate handle, edge resize handle. The audit confirms: "selectTool doesn't hit-test PlacedCustomElement (no rotate/resize/drag)" |
| Wainscot library edit-in-place | `updateItem()` exists in `wainscotStyleStore.ts` but has no UI consumer — creating a style is permanent | Low–Med | Standard inline-edit pattern: each library row shows an edit pencil icon. Clicking opens an inline form (same fields as create) pre-filled. Save calls `updateItem()`. Walls using that style re-render automatically because they reference `styleItemId`. |
| Copy SIDE_A treatment to SIDE_B (one-click) | Divider walls are common; painting both sides identically is the default case | Low | A "COPY A→B" button in the per-side panel. Reads `wall.wallpaper.A` / `wall.wainscoting.A` etc., deep-clones to `.B`. Mirror button "COPY B→A" optional but symmetric. |
| Per-placement frame color override for wall art | Frame style is set at library level; overriding per placement is the expected behavior | Low | `WallArt` type gets optional `frameColorOverride?: string`. Frame picker (7 presets or hex) shown in the wall art properties panel when art is selected. |
| Dims editor for placed art (currently stock 2'×2.5') | A painting Jessica uploads will rarely be 2'×2.5'; she can't currently adjust size after placement | Low | Two inputs (W ft, H ft) in the wall art property panel. Updates `WallArt.width` + `WallArt.height` directly on the stored segment. |
| CEIL-04 material preset path — dead code | `CeilingMesh` hard-falls through to `#f5f5f5` for any non-hex value; `mat-plaster` and similar IDs silently fail | Low | Fix: map known preset IDs to their hex or roughness values inside `CeilingMesh`, or expand ceiling material to use the same pattern as `FloorMaterial { kind, presetId, hex }` |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Style thumbnails in wainscot catalog list | The current list is text-only; thumbnails let Jessica find the right style visually | Low | Render a small `<canvas>` or Three.js offscreen thumb per style on first open. Or use static SVG icons per style type (shaker, beadboard, raised panel, etc.) — much simpler. |
| Per-wall wainscot knob overrides (currently library-level only) | Allows fine-tuning height/color for a single wall without creating a new library entry | Med | Per-placement overrides pattern: `WainscotConfig` gains optional `heightOverride?: number` and `colorOverride?: string`. The resolver checks overrides before falling back to library defaults. |
| Position editor for wall art offset/centerY | Art placed at default position can't be precisely repositioned | Low | Two number inputs in art detail panel: OFFSET_FT and CENTER_Y_FT. Drag handles on the 3D viewport are a stretch goal. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Undo-per-library-edit history | Library items are global resources; undo semantics across rooms are unclear | Confirm-before-delete on library items; no undo for library mutations |
| Drag-reorder in wainscot library | Not worth the implementation complexity for a single-user tool with < 20 items | Alphabetical + creation order is sufficient |
| Multi-select for placed custom elements | Jessica works on one thing at a time; multi-select adds complexity | Single selection + apply-to-all affordances instead |

---

## Feature Category 3: Advanced Materials — Unified Ceiling/Floor Catalog

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Ceiling texture presets (beyond solid hex) | Floor already has 8 textured presets; ceilings currently only accept hex. Inconsistency is noticeable. | Med | Add a `CeilingMaterial { kind: "color" \| "preset"; hex?: string; presetId?: string }` type. Preset IDs drawn from a shared `SURFACE_PRESETS` catalog. `CeilingMesh` resolves preset to color+roughness (same pattern as `FloorMaterial`). |
| Shared preset catalog for floor + ceiling | "Plaster" ceiling + "Concrete" floor are both plaster/concrete; they should use the same preset entry | Low–Med | Expand `FloorPresetId` type and `FLOOR_PRESETS` constant to include ceiling-appropriate presets: PLASTER_WHITE, PLASTER_WARM, BEADBOARD, CONCRETE, WOOD_PLANKS. Floor-specific presets (carpet, marble tile) stay floor-only via a `surfaces: ("floor" \| "ceiling")[]` flag. |
| Apply preset from sidebar (ceiling section) | Current ceiling UI only shows a hex input | Low | Add a preset grid or dropdown to the ceiling properties panel, same component as floor material picker |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Roughness override per preset application | "Plaster" can be matte or semi-polished; one slider covers both without needing two preset entries | Low | A roughness slider (0–1) in the ceiling/floor material panel. Defaults to preset default. Stored per-room on the material record. |
| Ceiling texture rotation (match floor) | Floor already has `rotationDeg`. Ceiling wood planks might need to run perpendicular to floor planks | Low | `CeilingMaterial` adds `rotationDeg?: number`, mirroring `FloorMaterial.rotationDeg` |
| WOOD_OAK / WOOD_WALNUT ceiling option for beamed ceiling simulation | Exposed beam ceilings are popular; wood ceiling texture gives the suggestion | Low | Just allow floor wood presets to appear in ceiling selector. No new assets needed. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Actual beam geometry (3D extruded beams across ceiling) | Significant 3D modeling work; scope creep | Let wood texture on ceiling give the visual suggestion |
| Ceiling height per-room physics collision update | Walk mode collision already uses `room.wallHeight`; ceiling geometry is cosmetic | Leave as-is; cosmetic only |
| PBR texture file upload for ceilings | Floor already has custom upload; adding it to ceilings doubles maintenance without adding much — Jessica rarely needs a custom ceiling photo | Preset catalog is sufficient |

---

## Feature Dependencies

```
Paint System requires:
  Existing Wallpaper type (kind="color") → already in cad.ts ✓
  Existing per-side wrapper (wallpaper.A/B) → already in cad.ts ✓
  Existing CeilingMesh color path → already in CeilingMesh.tsx ✓
  New paintStore (IndexedDB, new file) → new

Lime wash toggle requires:
  Paint System (above) ✓ (lime wash is a property of a PaintEntry, not a separate feature)
  Three.js roughness control on WallMesh → WallMesh must read roughness from wall material, not hardcode

Polish Pass requires:
  Edit handles (custom elements) depend on selectTool.ts PlacedCustomElement hit-test → new
  Wainscot library edit UI depends on wainscotStyleStore.updateItem → already exists, no UI
  Copy-side depends on per-side wrapper → already in cad.ts ✓
  Frame color override depends on WallArt type extension → minor schema change

Ceiling Presets require:
  Expanded SURFACE_PRESETS (superset of FLOOR_PRESETS) → refactor floorMaterials.ts
  CeilingMesh preset path fix (CEIL-04 dead code) → prerequisite before adding more presets
  Ceiling schema update (CeilingMaterial type) → replaces raw string on Ceiling.material
```

---

## MVP Recommendation

**What to prioritize for v1.3:**

Phase ordering suggestion based on dependencies and Jessica's highest-value flows:

1. **Paint system first** — applying color to walls is the single highest-impact feature for the "feel the space" goal. The data model (`Wallpaper.kind="color"`) is already in place; this is mostly a UX build. Include F&B catalog, hue filter, search, custom hex, and lime wash toggle.

2. **Ceiling color + preset unification second** — CEIL-04 is broken dead code. Fix it, then expand ceiling presets in the same pass. Unify the ceiling material model with the floor material model (`kind`, `presetId`, `hex`). Do this before anything else touches `CeilingMesh`.

3. **Polish pass third** — the edit-handle gap for custom elements is the most disruptive missing interaction. Wainscot library edit-in-place and copy-side buttons are low-complexity and high daily-use value.

**Defer:**
- Roughness slider per placement: nice but adds UI noise; preset roughness defaults cover 95% of use cases
- Per-wall wainscot knob overrides: only needed when Jessica has two walls where one needs a slightly different height; can ship later
- Style thumbnails in catalog: adds polish but not blocking

---

## Complexity Notes

| Feature | Confidence | Complexity | Key Risk |
|---------|------------|------------|----------|
| F&B catalog as static data (132 colors, hex) | HIGH (confirmed count + public hex codes) | Low | Color accuracy — the hex approximations in convertingcolors.com are community-matched, not official F&B RGB values. F&B does not publish official hex codes. Flag this: use community hex values (good enough for visualization, not for print production). |
| Paint apply to wall 3D | HIGH | Low | `material.color.set(hex)` is standard Three.js. WallMesh needs to read the `wallpaper.A.color` from the wall segment rather than using a hardcoded default. |
| Lime wash visual (3D) | MEDIUM | Med | True lime wash requires GLSL noise shader on the wall material. An acceptable approximation: roughness=1.0 + slightly lightened/desaturated base color + a small tiled "cloud" PNG baked as a texture overlay (multiply blend). No custom shader needed. Lower implementation risk. |
| Edit handles for custom elements | HIGH | Med | The selectTool already handles `PlacedProduct` with identical data shape. The pattern is directly replicable. Risk: `PlacedCustomElement` lacks `sizeScale` for separate axis scaling — the edit handle should use `sizeScale` (uniform) same as `PlacedProduct`. |
| Inline wainscot edit UI | HIGH | Low | `updateItem` already exists in the store with correct signature. This is purely a UI addition — no store work needed. |
| CeilingMesh preset path (CEIL-04 fix) | HIGH | Low | Confirmed dead code in audit. Fix: add a preset lookup map in `CeilingMesh.tsx` for the known preset IDs, or refactor `Ceiling.material` to a structured object. |
| Shared ceiling/floor preset catalog | MEDIUM | Med | Depends on how deep the refactor goes. Minimal: add ceiling-specific presets to a new `CEILING_PRESETS` constant and keep floor/ceiling separate. Unified: merge into `SURFACE_PRESETS` with a `surfaces` flag. Unified is cleaner but touches more files. |

---

## Hue Family Buckets for F&B Catalog Filter

The 132 F&B colors distribute naturally into these buckets (based on the public F&B palette):

| Bucket Label | Approx Count | Example Colors |
|---|---|---|
| WHITES + OFF-WHITES | ~25 | Wimborne White, All White, Pointing |
| NEUTRALS + GRAYS | ~30 | Elephant's Breath, Purbeck Stone, Mole's Breath |
| BLUES | ~18 | Hague Blue, Stiffkey Blue, De Nimes |
| GREENS | ~16 | Calke Green, Mizzle, Card Room Green |
| PINKS + REDS | ~12 | Cinder Rose, Setting Plaster, Incarnadine |
| YELLOWS + ORANGES | ~10 | Babouche, India Yellow, Charlotte's Locks |
| BLACKS + DARK | ~8 | Railings, Off Black, Pitch Black |
| BROWNS + EARTH | ~13 | Dead Salmon, Bone, String |

Total: 132. These buckets are judgment-based — F&B does not publish official family groupings. MEDIUM confidence on exact distribution; actual sort will happen during data file construction.

---

## Sources

- [Farrow & Ball all paint colours](https://www.farrow-ball.com/paint/all-paint-colours) — official page (count: 132 confirmed via Encycolorpedia)
- [Converting Colors — Farrow & Ball list](https://convertingcolors.com/list/farrow-ball.html) — community hex mappings for all 132 colors (MEDIUM confidence on color accuracy)
- [Encycolorpedia Farrow & Ball](https://encycolorpedia.com/paints/farrow-ball) — second source for hex values
- [Farrow & Ball Spring 2026 palette](https://www.homesandgardens.com/interior-design/farrow-and-ball-spring-colors-2026) — 9 new colors including Babouche + Acid Drop
- [Bauwerk Colour — Understanding Lime Wash Texture](https://www.bauwerkcolour.com/en-us/limewash-paint-colour-questions-understanding-texture) — lime wash visual behavior
- [Three.js MeshStandardMaterial.color docs](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial.color) — `material.color.set(hex)` pattern
- [Planner 5D — Wall Paint Simulator](https://planner5d.com/blog/wall-paint-simulator/) — click-to-paint UX reference
- [Atlassian — Inline Edit component](https://atlassian.design/components/inline-edit/) — library edit-in-place pattern
- [PatternFly — Inline Edit guidelines](https://www.patternfly.org/components/inline-edit/design-guidelines/) — inline edit UX patterns
- [Benjamin Moore Color Portfolio — browse by family](https://www.benjaminmoore.com/en-us/color-overview/color-palettes) — hue-family filter UX reference
- [Sherwin-Williams ColorSnap color families](https://www.sherwin-williams.com/en-us/color/color-tools) — hue filter reference
- [v1.2-MILESTONE-AUDIT.md](../.planning/v1.2-MILESTONE-AUDIT.md) — authoritative list of polish items carried forward (HIGH confidence — sourced from code audit)
- `src/types/cad.ts`, `src/data/floorMaterials.ts`, `src/stores/wainscotStyleStore.ts`, `src/three/CeilingMesh.tsx` — direct codebase reading (HIGH confidence)
