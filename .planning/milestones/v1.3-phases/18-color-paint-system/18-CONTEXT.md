# Phase 18: Color & Paint System - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can paint any wall side or ceiling with named colors from a Farrow & Ball catalog or custom palette. Includes: F&B 132-color catalog browsing, custom color creation, lime wash finish toggle, per-side wall painting, ceiling painting, recently-used palette, and paint-all-walls action. Does NOT include: material catalog unification (Phase 20), edit handles for custom elements (Phase 19), or advanced PBR textures.

</domain>

<decisions>
## Implementation Decisions

### Paint Picker UX
- **D-01:** Paint picker lives as a new "PAINT" section in the existing WallSurfacePanel sidebar, below wallpaper — consistent with how wallpaper/wainscot/crown already work
- **D-02:** F&B swatches displayed as a dense grid of small color squares; hovering shows the F&B name in a tooltip; clicking applies immediately
- **D-03:** Hue family filtering via a row of small colored chips above the grid (Whites, Neutrals, Blues, Greens, Pinks, Yellows, Blacks) — click to filter, click again to show all
- **D-04:** Recently-used palette (last 8 applied colors) pinned as a row at the top of the paint section, always visible

### Apply-Paint Workflow
- **D-05:** Select wall first, then pick color — matches existing wallpaper/wainscot flow (no "paint mode" tool)
- **D-06:** Which side gets painted follows the existing SIDE_A/SIDE_B toggle already in the wall panel
- **D-07:** "APPLY_TO_ALL_WALLS" button at the bottom of the paint section — one click, no confirmation dialog, paints every wall's active side in the current room
- **D-08:** Ceiling painting is a separate action/section — NOT coupled to wall painting via checkbox

### Custom Color Creation
- **D-09:** Install `react-colorful` (~3KB) for HSL wheel + hex input — better for visual picking than native color input
- **D-10:** Custom colors appear in a "MY_COLORS" section BELOW the F&B catalog grid
- **D-11:** "+ ADD_COLOR" button expands an inline row: name input + react-colorful picker + save button — stays in sidebar flow
- **D-12:** Right-click (or long-press) a custom swatch to show "DELETE" option — no edit mode toggle

### Lime Wash
- **D-13:** In 2D, lime wash shows as a subtle cloudy/stippled pattern overlay at ~20% opacity over the wall color — visually distinguishes from flat paint
- **D-14:** Lime wash toggle is per-placement (per wall/ceiling), NOT per-catalog-entry — same color can be lime wash on one wall, flat on another
- **D-15:** Lime wash available on both walls AND ceilings

### Claude's Discretion
- Exact swatch grid dimensions (px per swatch, grid gap) — Claude picks what fits the sidebar width
- Exact lime wash 2D pattern generation approach (canvas pattern vs SVG vs CSS)
- Recently-used palette data persistence approach (likely cadStore snapshot level)
- "APPLY_TO_ALL_WALLS" scope: whether it paints SIDE_A only, the active side per the toggle, or both sides — Claude picks what's most intuitive

### Prior Research Decisions (locked from v1.3 research)
- **R-01:** Custom paint colors stored in `CADSnapshot` (not standalone idb-keyval) to avoid CUSTOM-05 undo hazard
- **R-02:** `paintStore` follows `framedArtStore` pattern for the global F&B + custom library
- **R-03:** F&B 132-color catalog ships as static TypeScript data file (`src/data/farrowAndBall.ts`), never enters Zustand history
- **R-04:** Lime wash = `roughness: 0.95` on `meshStandardMaterial` (no custom shader)
- **R-05:** `Wallpaper.kind="paint"` with `paintId` foreign key (not embedded hex); old `kind="color"` deprecated with migration
- **R-06:** Install `react-colorful ^2.7.3` as new dependency

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Paint System Research
- `.planning/research/FEATURES.md` — Feature landscape with table stakes, differentiators, and anti-features for the paint system
- `.planning/research/PITFALLS.md` — Critical pitfalls: Three.js color space (Pitfall 1), floor texture cache mutation (Pitfall 2), paint undo/redo store split (Pitfall 3)
- `.planning/research/ARCHITECTURE.md` — Architectural patterns for paint store, data model, and migration strategy
- `.planning/research/STACK.md` — Stack decisions including react-colorful, F&B data sourcing

### Project Context
- `.planning/REQUIREMENTS.md` — Requirements PAINT-01 through PAINT-07
- `.planning/PROJECT.md` — Project context, core value, target user
- `.planning/STATE.md` — Current state, accumulated decisions, known prerequisites

### Codebase References
- `src/types/cad.ts` — `Wallpaper`, `Ceiling`, `WallSegment`, `Room`, `CADSnapshot` types
- `src/components/WallSurfacePanel.tsx` — Existing wall surface UI (wallpaper color input, per-side toggle)
- `src/three/WallMesh.tsx` — 3D wall rendering with wallpaper overlay pattern
- `src/three/CeilingMesh.tsx` — 3D ceiling rendering with material/color
- `src/stores/cadStore.ts` — Main CAD state with wall/ceiling update actions
- `src/stores/wainscotStyleStore.ts` — Store pattern reference (zustand + immer + idb-keyval)
- `src/stores/framedArtStore.ts` — Another store pattern reference for library items

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WallSurfacePanel.tsx`: Existing wall properties sidebar with per-side toggle, wallpaper color input, wainscot/crown sections — paint section inserts here
- `wainscotStyleStore.ts`: Best template for `paintStore` pattern (zustand + immer + idb-keyval, CRUD, auto-persistence via subscribe)
- `framedArtStore.ts`: Another library store pattern reference
- `Wallpaper` type already supports `kind: "color" | "pattern"` per-side — extending with `kind: "paint"` is additive
- `WallMesh.tsx` `renderWallpaperOverlay()`: Creates plane mesh with material overlay per-side — same pattern applies for paint color overlay
- `CeilingMesh.tsx`: Already reads `ceiling.material` as hex string and renders colored mesh

### Established Patterns
- Wall treatments use per-side data: `wall.wallpaper.A / wall.wallpaper.B` — paint follows this
- Store pattern: zustand + immer `produce()` + idb-keyval persistence + auto-generated IDs with `uid()` helper
- UI convention: SCREAMING_SNAKE_CASE labels, `font-mono`, Obsidian CAD theme tokens
- 3D material pattern: `meshStandardMaterial` with color prop, R3F auto-handles sRGB conversion
- Native `<input type="color">` currently used — being replaced by react-colorful for this feature

### Integration Points
- `WallSurfacePanel.tsx` — New "PAINT" section added here
- `cadStore.ts` — New actions: `setWallPaint(wallId, side, paintId, limewash?)`, `setCeilingPaint(ceilingId, paintId, limewash?)`
- `CADSnapshot` type — Extended with `customPaints: PaintEntry[]` for undo/redo safety
- `WallMesh.tsx` — Extended to render `kind="paint"` wallpaper entries by resolving paintId → hex from catalog/custom
- `CeilingMesh.tsx` — Extended to render paint colors from paintId reference
- New file: `src/data/farrowAndBall.ts` — Static 132-color catalog

</code_context>

<specifics>
## Specific Ideas

- F&B is the reference catalog because Jessica thinks in F&B color names — this is the primary browsing experience
- Custom colors are secondary (below F&B) but important for Pinterest hex codes
- The paint picker should feel like browsing paint chips at a store — dense, colorful, scannable
- Lime wash is a per-placement decision, not a global style — Jessica might want lime wash in the living room but flat in the bedroom

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-color-paint-system*
*Context gathered: 2026-04-05*
