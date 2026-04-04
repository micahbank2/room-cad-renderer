# Phase 1: 2D Canvas Polish - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The 2D canvas is fully interactive — product images render visibly, products can be dragged from the library onto the canvas, placed products have rotation handles, wall dimension labels are editable, and all work auto-saves without explicit Save clicks. Scope covers EDIT-06, EDIT-07, EDIT-08, EDIT-09, and SAVE-02 only.

</domain>

<decisions>
## Implementation Decisions

### Drag-drop Placement (EDIT-07)
- **D-01:** Use HTML5 drag-and-drop API. Product cards in the sidebar library become draggable; Jessica drags onto the canvas and drops to place. Ghost preview follows the cursor.
- **D-02:** Dropped products snap to the grid (currently 0.5ft / 6 inches) — consistent with the existing snap-to-grid behavior used when drawing walls and placing via the product tool.
- **D-03:** On drop, the newly-placed product is auto-selected so Jessica can immediately nudge position or rotate without an extra click.
- **D-04:** Keep the existing click-to-place flow (productTool.ts) as a secondary path. Drag-drop is primary, click-to-place remains a fallback.

### Rotation Handles (EDIT-08)
- **D-05:** Selected products show a corner-dot-plus-arc handle (Figma/Canva style) — a small circle above the product connected by a thin line. Drag the handle in an arc to rotate.
- **D-06:** Rotation snaps to 15° increments (0°, 15°, 30°, 45°, 90°, etc.) by default. Holding Shift disables snapping for free rotation.
- **D-07:** Moving a selected product uses direct drag on the product body itself. The rotation handle is the only visible affordance — move is implicit. Keeps the UI clean.

### Dimension Editing (EDIT-06)
- **D-08:** Double-clicking a wall dimension label opens an inline HTML text field overlaid at the label position on the canvas. Press Enter to commit, Escape to cancel.
- **D-09:** Wall resize moves the end point only — the start point stays fixed and the end point moves along the wall's current direction to match the new length. If another wall shares the moved endpoint (corner), that connected wall's start point moves with it to keep the corner intact.
- **D-10:** Input format is plain feet as a number (e.g., "12" = 12 feet). formatFeet() continues to handle display as feet+inches. No fractional inch parsing needed.

### Auto-save (SAVE-02)
- **D-11:** Auto-save triggers 2 seconds after the last change (debounced). Applies to all cadStore mutations (walls, products, room dimensions).
- **D-12:** A subtle status indicator in the status bar area shows "Saving..." → "Saved" and fades out after a moment.
- **D-13:** If Jessica has not yet saved a project when she starts making changes, auto-save creates a new project automatically with the name "Untitled Room". She can rename later via ProjectManager. Work is never lost.

### Claude's Discretion
- Exact debounce implementation (lodash debounce, custom timeout, or useDeferredValue) — Claude picks based on what integrates cleanly with Zustand subscriptions.
- Ghost preview styling during drag-drop (opacity, border, cursor style) — Claude picks per existing design tokens.
- Inline text input styling (font, border, width sizing) — Claude picks using obsidian-* tokens and IBM Plex Mono for consistency.
- Rotation handle visual details (color, size, line thickness) — Claude picks using accent color tokens.
- Whether to also address the async product image rendering bug (EDIT-09) via `fabric.FabricImage.fromURL()` async pattern or an onload callback — this is in scope as EDIT-09 but the exact technique is Claude's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 1 — Phase 1 goal, requirements list, and 5 success criteria
- `.planning/REQUIREMENTS.md` — EDIT-06, EDIT-07, EDIT-08, EDIT-09, SAVE-02 requirement text

### Project Context
- `.planning/PROJECT.md` — Jessica's workflow, core value, locked tech decisions (React 18, Fabric/Three split, local-first)

### Codebase Maps (existing analysis)
- `.planning/codebase/CONCERNS.md` — Known bug documentation for EDIT-09 (product image async load), auto-save missing, tool cleanup patterns, and performance issues from full-redraw model
- `.planning/codebase/ARCHITECTURE.md` — Store-driven rendering pattern, tool lifecycle, data flow
- `.planning/codebase/CONVENTIONS.md` — Obsidian CAD design tokens, naming patterns, component structure
- `.planning/codebase/STRUCTURE.md` — File layout for canvas tools, stores, components

### Key Source Files
- `src/canvas/fabricSync.ts` — Current product rendering (lines 155-168 hold the EDIT-09 bug)
- `src/canvas/tools/productTool.ts` — Existing click-to-place flow to keep as fallback
- `src/canvas/tools/selectTool.ts` — Existing select/drag logic; rotation handles extend this
- `src/canvas/dimensions.ts` — drawWallDimension() renders the labels that need to become editable
- `src/canvas/FabricCanvas.tsx` — Tool lifecycle and redraw orchestration; drop target for HTML5 drag-and-drop
- `src/stores/cadStore.ts` — moveProduct, placeProduct, rotateProduct actions; history snapshot pattern that auto-save will subscribe to
- `src/lib/serialization.ts` — saveProject / loadProject (IndexedDB) that auto-save will call
- `src/lib/geometry.ts` — snapPoint, formatFeet, wallLength helpers
- `src/components/ProjectManager.tsx` — Current manual save UI; auto-save needs the active project ID surfaced from here
- `src/App.tsx` — Top-level state, keyboard shortcuts, product library ownership

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **snapPoint() in src/lib/geometry.ts** — Already handles grid snapping. Reuse for drop placement.
- **productTool.ts setPendingProduct()** — Existing click-to-place flow. Keep intact, add drag-drop alongside it.
- **moveProduct / rotateProduct / placeProduct in cadStore** — Actions exist. Rotation handle wires into rotateProduct; drop wires into placeProduct.
- **Obsidian CAD design tokens** — Use `accent`, `accent-light`, `obsidian-low`, `text-text-dim` tokens for new UI (rotation handle, save indicator, inline input).
- **formatFeet() + wallLength()** — Already used for dimension labels. Reuse for the inline edit display/parse roundtrip.
- **saveProject() in src/lib/serialization.ts** — IndexedDB persistence. Auto-save calls this with the active project snapshot.

### Established Patterns
- **Store-driven rendering:** Zustand is source of truth; both 2D (Fabric) and 3D (Three.js) read from the same store. New features (rotation, drop-place, dimension edit) must flow through cadStore actions.
- **Tool lifecycle:** activate/deactivate pattern on Fabric canvas. Drag-drop is handled at the DOM level (not via Fabric tools) — the canvas element becomes a drop target.
- **Real-world feet coordinates:** All geometry is stored in feet. scale + origin applied only at render time. New features keep this invariant.
- **pxToFeet helper:** Duplicated across tool files (known tech debt). New code for drop-place should import or recreate this consistently.

### Integration Points
- **FabricCanvas.tsx** gains DOM-level drag-drop event listeners (dragover, drop) on the canvas element wrapper.
- **Library sidebar components** gain `draggable` attribute and dragstart handlers with dataTransfer payload (product ID).
- **selectTool.ts** extends to render and hit-test rotation handles when a single product is selected.
- **dimensions.ts** emits the label bounds needed to position the overlay input; FabricCanvas hosts the absolutely-positioned HTML input.
- **App.tsx** gains a top-level effect that subscribes to cadStore mutations, debounces, and calls saveProject(); also surfaces the active project ID to enable auto-creation of "Untitled Room".
- **ProjectManager.tsx** needs to expose the active project ID upward to App.tsx (or move active-project state to a store).

</code_context>

<specifics>
## Specific Ideas

- Rotation handle is **Figma/Canva-style**: small circle above the product connected to the product by a thin line.
- Auto-save default project name: **"Untitled Room"**.
- Auto-save status indicator shows **"Saving..." then "Saved"** and fades out.
- Shift-key modifier: **free rotation** (disables 15° snap). Mirrors the existing Shift-for-orthogonal pattern in wallTool.

</specifics>

<deferred>
## Deferred Ideas

- **Aligning products to walls / wall-snap during drag** — could be added later if Jessica finds free placement imprecise. Not in scope for Phase 1.
- **Keyboard-driven rotation** (R key to rotate selected by 90°) — nice addition but not required by EDIT-08.
- **Multi-select + group rotate/move** — out of scope for v1; single-selection only.
- **Auto-save version history / restore previous versions** — current scope is overwrite-current-project only.
- **Fixing the AABB-ignores-rotation hit-test bug** (noted in CONCERNS.md) — may naturally get touched when adding rotation handles, but not a required deliverable. Flag for the planner.
- **Extracting shared pxToFeet to toolUtils.ts** — cleanup opportunity, not required for phase deliverables.

</deferred>

---

*Phase: 01-2d-canvas-polish*
*Context gathered: 2026-04-04*
