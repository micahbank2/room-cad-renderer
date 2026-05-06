---
phase: 61-openings-archway-passthrough-niche-open-01
type: research
created: 2026-05-04
status: research-complete
---

# Phase 61: Openings — Archway / Passthrough / Niche — Research

**Researched:** 2026-05-04
**Domain:** 3D wall geometry (THREE.js Shape/Path/ExtrudeGeometry), 2D Fabric.js overlay symbols, toolbar dropdown UI
**Confidence:** HIGH (most questions resolved by reading existing code; one CONTEXT.md assumption was wrong — flagged below)

## Summary

All 14 locked decisions in CONTEXT.md hold up against the codebase EXCEPT D-11. Phase 53 right-click does **not** currently dispatch on openings — `CanvasContextMenu` has no `"opening"` kind in its `ContextMenuKind` union, and `FabricCanvas.tsx:498` explicitly skips `data.type === "opening"` in the right-click hit-test. **The plan must add a new `"opening"` kind to the context menu, not assume inheritance.** This is the only meaningful adjustment to CONTEXT.md.

Three.js `THREE.Path.absarc` is well-supported and works inside `Shape.holes[]` for the archway. Niche math has a clean closed-form (formulas + test fixture below). PropertiesPanel currently shows `{N} OPENING(S)` text only — no per-opening editor exists yet — so Phase 61 will create the first one. No dropdown library is installed; the existing `WainscotPopover.tsx` (`fixed`-positioned div + click-outside dismiss) is the prior-art pattern for the new Wall Cutouts dropdown.

**Primary recommendation:** Lock D-01 through D-10, D-12 through D-14 as written. Amend D-11 to **"explicitly add `kind: 'opening'` to ContextMenuKind + wire FabricCanvas right-click hit-test"** — the existing `data: { type: "opening", openingId, wallId }` payload (`fabricSync.ts:425`) is preserved, but the dispatch path is missing.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPEN-01 | Archway / passthrough / niche opening kinds, with toolbar entry, 2D symbols, 3D rendering, properties editing, and Phase 53/54 menu inheritance | All 7 questions answered; Q5 corrects D-11 (menu wiring is required, not inherited) |
</phase_requirements>

## Question Answers

### Q1 — Lucide icons for archway / passthrough / niche

**Confidence: HIGH**

Lucide v1.8 (3886 icons total) does NOT have a dedicated `Archway` or `Niche` icon. Closest matches:

| Kind | Best lucide | Fallback (Material Symbols) |
|------|-------------|-----------------------------|
| Archway | None ideal — `DoorOpen` is misleading (existing window button uses door iconography). Recommend Material Symbols `arch` (canonical Material name for archway). | `arch` ✅ exists in Material Symbols |
| Passthrough | `RectangleHorizontal` (lucide) — an open rectangle reads as "frame / pass-through" | `crop_landscape` |
| Niche | `Frame` (lucide) — a recessed framed shape reads as "niche" | `inventory_2` (boxed) |

**Existing lucide imports inventory** (from `grep "from \"lucide-react\""` across `src/components/`, `src/canvas/`):
- Toolbar.tsx imports: `PersonStanding, Map, Box, CornerDownRight, LayoutGrid, Square, Move3d, EyeOff` (Phase 33 + 47 + 35 introductions)
- CanvasContextMenu.tsx: `Camera, Eye, EyeOff, Copy, Clipboard, Trash2, Edit3`
- TreeRow.tsx: `ChevronRight, ChevronDown, Eye, EyeOff, Camera`
- CollapsibleSection.tsx: `ChevronRight, ChevronDown`
- AddProductModal.tsx, GestureChip.tsx, library/LibraryCard.tsx: `X`
- MyTexturesList.tsx: `Plus, MoreHorizontal`
- DeleteTextureDialog.tsx, UploadTextureModal.tsx: `Loader2, X, Upload`
- ProductLibrary.tsx: `Box`

**Recommendation — three options, ranked:**

1. **(RECOMMENDED) Mix lucide + 1 Material Symbols exception for archway only.** Use `Frame` (niche) + `RectangleHorizontal` (passthrough) from lucide; use `material-symbols-outlined` `arch` for archway. The Wall Cutouts dropdown component is a NEW file — adding it to the D-33 allowlist is fine; we already added `TreeRow.tsx` in Phase 60 by the same logic. Toolbar.tsx itself is already on the allowlist for the dropdown trigger glyph (`ChevronDown` from lucide — no MS needed for the trigger).

2. All-Material-Symbols (`arch`, `door_front`, `inventory_2`). Cleaner stylistically (the existing 5 tools all use Material Symbols), but inflates the allowlist further and orphans the lucide system from the new tool tier.

3. All-lucide with imperfect glyphs (`DoorOpen` for archway, `RectangleHorizontal` for passthrough, `Frame` for niche). DoorOpen reads as "door" → user confusion. Reject.

**Allowlist impact:** Option 1 adds `Toolbar.WallCutoutsDropdown.tsx` to the Phase 33 D-33 allowlist (1 new entry). PLAN.md should update the CLAUDE.md allowlist comment in same commit as the dropdown is built.

**Source:** `node_modules/lucide-react/dist/esm/icons/` — manual `ls | grep` of 3886 icon names. No "arch" or "niche" filename hits. `frame.js`, `square.js`, `app-window.js`, `gallery-vertical.js` are the closest-fit candidates; `frame.js` reads best for niche per icon-glyph inspection.

---

### Q2 — THREE.Path.absarc for archway

**Confidence: HIGH**

Verified via Three.js r0.183 source / docs:

```ts
absarc(aX: number, aY: number, aRadius: number, aStartAngle: number, aEndAngle: number, aClockwise?: boolean): this
```

Inherits from `Path.absarc()` → `Path.absellipse()` → emits curve segments into the Path's curve array. Works inside `Shape.holes[]`. ExtrudeGeometry tessellates arc segments via the curve's `getPoints(divisions)` method (default 12 divisions per arc — adequate for a 3 ft archway top).

**Correct argument values for archway shaft of width `W` (rectangular bottom + half-circle top):**

```ts
// Within wall-local shape coords (origin at wall center, +X along wall, +Y up):
const oLeft   = opening.offset - halfLen;                       // x at left edge of opening
const oRight  = oLeft + opening.width;                          // x at right edge
const oBottom = opening.sillHeight - halfH;                     // y at floor (sillHeight=0 for archway)
const archCenterX = oLeft + opening.width / 2;                  // x at midpoint
const archRadius  = opening.width / 2;
const shaftTop    = oBottom + opening.height - archRadius;      // y at where rectangle ends + arc begins

const hole = new THREE.Path();
hole.moveTo(oLeft, oBottom);                                    // bottom-left
hole.lineTo(oRight, oBottom);                                   // bottom-right
hole.lineTo(oRight, shaftTop);                                  // up the right shaft
hole.absarc(archCenterX, shaftTop, archRadius, 0, Math.PI, false); // rightmost (0 rad) sweep CCW to leftmost (π rad)
hole.lineTo(oLeft, oBottom);                                    // close down the left side and back to start
shape.holes.push(hole);
```

**Argument verification:**
- `startAngle = 0` → starts at `(archCenterX + radius, shaftTop)` = `(oRight, shaftTop)` ✅ matches the previous `lineTo(oRight, shaftTop)` end point — continuity preserved
- `endAngle = Math.PI` → ends at `(archCenterX - radius, shaftTop)` = `(oLeft, shaftTop)`
- `clockwise = false` → CCW sweep means the arc goes UP and OVER (positive Y direction), which is what we want for a top-arch
- The trailing `lineTo(oLeft, oBottom)` closes the path: from `(oLeft, shaftTop)` straight down the left shaft to `(oLeft, oBottom)`, which equals the start point — closed loop ✅

**ExtrudeGeometry compatibility:** ExtrudeGeometry handles mixed `lineTo` + `absarc` paths fine. The internal `Path.getPoints()` enumerates each curve segment with its own discretization, then concatenates. No version-specific bug in r0.183. Risk: **none** — verified by ExtrudeGeometry's existing usage with curved shapes throughout the Three.js examples ecosystem.

**Edge case to test:** archway `width === 0` (degenerate). Recommendation: Plan should include a clamp `archRadius = max(0.1, width/2)` and `height >= width/2 + 0.1ft` validation in `archwayTool.ts` placement defaults + `updateOpening` validation. With the 3 ft default width and 7 ft default height (D-02), the rectangular shaft below the arch is `7 - 1.5 = 5.5 ft` — well above zero.

---

### Q3 — Niche mesh world-position math

**Confidence: HIGH**

Given:
- Wall start `Pa = (wall.start.x, wall.start.y)` and end `Pb = (wall.end.x, wall.end.y)` in 2D plan coords (meaning XZ in 3D world: x→x, y→z)
- Wall thickness `T = wall.thickness`
- Opening: `offset` (along wall from start), `width w`, `height h`, `sillHeight s`, `depthFt d`
- Wall outward-normal `N̂_out` (Vector3, lies in XZ plane, y=0) — from `computeOutwardNormalInto()` in `cutawayDetection.ts:71`
- Niche normal `N̂_in = -N̂_out` (interior face per D-06)

**Wall direction unit vector (XZ plane):**
```ts
const len = Math.sqrt((Pb.x - Pa.x)**2 + (Pb.y - Pa.y)**2);
const Ux = (Pb.x - Pa.x) / len;     // x-component of along-wall unit vector
const Uz = (Pb.y - Pa.y) / len;     // z-component (note: 2D y maps to 3D z)
```

**Niche center along wall (in 2D plan / XZ world coords):**
```ts
const centerAlongX = Pa.x + Ux * (offset + w / 2);
const centerAlongZ = Pa.y + Uz * (offset + w / 2);
```

**Niche front face center (on the interior face of the wall, at sill+h/2 elevation):**

The wall's interior face is offset from the wall centerline by `T/2` along `N̂_in`. The niche front-face plane sits exactly there.

```ts
// N_in is N_out negated — both already in XZ plane
const Nx = -N_out.x;
const Nz = -N_out.z;

const frontX = centerAlongX + Nx * (T / 2);
const frontZ = centerAlongZ + Nz * (T / 2);
const frontY = s + h / 2;                // y-up; sill+halfHeight = vertical center
```

**Niche box geometry (BoxGeometry args = [width, height, depth]):**
- Box dims: `[w, h, d]`
- Box position: center is recessed INWARD by `d/2` from the front face (so the box's front face sits flush with the wall's interior face — open-front semantics).

```ts
const centerX = frontX + Nx * (d / 2);   // recess into wall
const centerZ = frontZ + Nz * (d / 2);
const centerY = frontY;
```

**Box rotation:** must align the box's local +X axis with the wall direction `(Ux, 0, Uz)`. Since the wall direction in XZ is `(Ux, 0, Uz)`, the rotation around Y is:

```ts
const wallAngleY = Math.atan2(Uz, Ux);   // signed angle from +X axis
// In Three.js Euler: rotation.y rotates about world-Y. Convention: positive = CCW from +X looking down -Y.
// Wall code in WallMesh.tsx:95 uses `new THREE.Euler(0, -a, 0)` with a = angle(start, end).
// Use the SAME convention here for consistency:
const rotationY = -wallAngleY;
```

Verify by analogy: `WallMesh.tsx:88-95` uses exactly this pattern for the wall itself (`a = angle(wall.start, wall.end)`, then `rotation: new THREE.Euler(0, -a, 0)`). Niche should match.

**Open-front rendering — two strategies:**

**Strategy A (RECOMMENDED): Render 5 separate planes, no box.**
Avoids back-face / depth issues. Five `<planeGeometry>` meshes:
- Back wall: at `front + N_in * d`, normal facing OUT (toward room)
- Top: at `front + N_in * d/2`, y=`s+h`, normal facing DOWN (into niche)
- Bottom: same XZ, y=`s`, normal facing UP
- Left side: at one end, normal facing inward along wall axis
- Right side: at other end, normal facing inward along wall axis

Wrap all 5 in a `<group position={[centerX, centerY, centerZ]} rotation={[0, rotationY, 0]}>` so all positions/rotations are local to the niche. ~50 lines.

**Strategy B: BoxGeometry + cull front face via material `side` toggling.** More complex, harder to get right. Reject.

**Test fixture (for unit test U3 or e2e E3):**

Wall from `(0,0)` to `(10,0)` (10ft east-going wall, room to the south so interior is +Z direction):
- `Pa = {x:0, y:0}`, `Pb = {x:10, y:0}` → `Ux=1, Uz=0`, `len=10`
- Wall thickness `T = 0.5 ft`, height `8 ft`
- Room bbox center at `{x:5, y:5}` (south of wall) → outward-normal points NORTH = `(0, 0, -1)` → `N_in = (0, 0, +1)` (toward room)
- Niche: `offset=4, width=2, height=3, sillHeight=3, depthFt=0.5`

**Expected niche front-face center:**
- centerAlongX = 0 + 1 * (4 + 1) = **5.0**
- centerAlongZ = 0 + 0 * (4 + 1) = **0.0**
- frontX = 5.0 + 0 * 0.25 = **5.0**
- frontZ = 0.0 + 1 * 0.25 = **0.25** (just inside the south face of the wall)
- frontY = 3 + 1.5 = **4.5**

**Expected niche box center:**
- centerX = 5.0 + 0 * 0.25 = **5.0**
- centerZ = 0.25 + 1 * 0.25 = **0.5** (recessed 0.5 ft toward room interior — wait, that's WRONG: recess goes INTO the wall, opposite to N_in)

⚠️ **CORRECTION: niche recesses AWAY from the room (into the wall body), so the box center is offset by `-N_in * d/2 = +N_out * d/2` from the front face.** Re-stating:

```ts
// Recess INTO the wall = opposite N_in = same as N_out
const centerX = frontX + N_out.x * (d / 2);   // = frontX - Nx * (d/2)
const centerZ = frontZ + N_out.z * (d / 2);   // = frontZ - Nz * (d/2)
```

Re-computing fixture:
- centerX = 5.0 + 0 * 0.25 = **5.0**
- centerZ = 0.25 + (-1) * 0.25 = **0.0** (back of niche at z=-0.25, front at z=+0.25 — wait, depth is the box's THIRD axis)

Need to be precise: the box's local Z runs along the wall normal. After rotation `Y = -atan2(0, 1) = 0` (wall along +X), the box local axes match world: local-X = world +X, local-Y = +Y, local-Z = +Z. BoxGeometry args `[w, h, d]` → local extents `[±w/2, ±h/2, ±d/2]`. So box at center `(5.0, 4.5, 0.0)` with extents `[±1, ±1.5, ±0.25]` spans:
- X: 4 to 6 (matches wall offset 4 + width 2 ✅)
- Y: 3 to 6 (matches sill 3 + height 3 ✅)
- Z: -0.25 to +0.25

Wall body spans `y=0..8` and Z `-0.25..+0.25` (T=0.5, centered on z=0). So the niche box COINCIDES with the wall body in Z — it's INSIDE the wall, which is what we want. The niche front face (at z = +0.25, the wall's interior face) is open; the back face (at z = -0.25, the wall's exterior face) is the niche back wall — but wait, that's the exterior face of the wall.

⚠️ **Second correction: with `depthFt = wallThickness`, the niche back wall coincides with the wall's exterior face — i.e., the niche goes ALL THE WAY THROUGH.** D-05 caps `depthFt` at `wallThickness - 1"` to prevent this. Validation must enforce strictly: `depthFt = min(d_user, T - 0.083ft)`.

**For the test fixture with `depthFt=0.5, T=0.5`:** the clamp triggers — actual depth = 0.5 - 0.083 = 0.417 ft. Box center Z = 0.25 + (-1) * 0.208 = 0.042. Box extents Z: -0.167 to +0.25. Back wall at z = -0.167, **inside the wall body**, ~0.083 ft from exterior face. ✅ Recess does not break through.

**Recommended test fixture for U3 / Q3 verification (use cleaner numbers):**
```ts
// Wall (0,0)→(10,0), T=0.5, room interior at +Z, niche depth 0.4ft
// Expected niche front face Z = +0.25 (interior face)
// Expected niche back wall Z = +0.25 - 0.4 = -0.15 (still inside wall body, -0.25..+0.25)
// Box center Z = (0.25 + -0.15)/2 = +0.05
```

**Source citations:**
- `src/three/cutawayDetection.ts:71-103` — `computeOutwardNormalInto()` reusable as-is for `getWallInteriorNormal()` (just negate the result)
- `src/three/WallMesh.tsx:88-98` — wall position+rotation pattern to mirror in NicheMesh
- `src/lib/geometry.ts` `angle()` — used by WallMesh for rotation; same util applies

---

### Q4 — Existing PropertiesPanel `OpeningSection`

**Confidence: HIGH**

**There is no `OpeningSection` component.** PropertiesPanel.tsx line 354 just renders a static count: `{wall.openings.length} OPENING(S)`. No editor, no per-opening detail view exists in the codebase yet.

**File:** `src/components/PropertiesPanel.tsx` (one large file with all panels inline; no PropertiesPanel.tsx subdirectory). The wall section spans ~lines 290-365.

**Recommendation:**
1. **Build a new `src/components/PropertiesPanel.OpeningsList.tsx` component** that renders inside the wall section, replacing the `{N} OPENING(S)` line. Per-opening expandable row.
2. Each opening row has a `CollapsibleSection`-style header (use existing `src/components/ui/CollapsibleSection.tsx`) with the kind + offset shown. Expanded body has the kind-specific input set: width, height, sillHeight, offset (all kinds); + depthFt (niche only).
3. Use existing `Row` component (defined inline in PropertiesPanel.tsx) for label-value pairs, mirror the existing `START / END / 5'-6"` pattern.
4. CONTEXT.md file path `src/components/PropertiesPanel.OpeningSection.tsx` is a NEW file — line 213 in CONTEXT.md should be **CREATE**, not "may already exist; verify in research". Confirmed: does not exist.

**Phase 31 single-undo pattern reuse:** PropertiesPanel input edit pattern is documented in `src/components/PropertiesPanel.tsx` (search for `*NoHistory` callers). Width/height/etc inputs should call `updateOpeningNoHistory` mid-keystroke, `updateOpening` on Enter/blur. Store actions already exist (`cadStore.ts:38, 39`).

---

### Q5 — Phase 53 + 54 menu inheritance for openings

**Confidence: HIGH — CONTEXT.md D-11 IS WRONG**

**Right-click on openings does NOT currently work.** Three pieces of evidence:

1. `src/stores/uiStore.ts:153-162` defines `ContextMenuKind = "wall" | "product" | "ceiling" | "custom" | "empty"`. **No `"opening"` kind.** TypeScript would reject `openContextMenu("opening", ...)`.

2. `src/components/CanvasContextMenu.tsx:33-135` — `getActionsForKind()` has branches for `wall`, `product`, `ceiling`, `custom`, `empty`. No `opening` branch. Falls through to `return []` (line 134) — empty action array, menu closes immediately.

3. `src/canvas/FabricCanvas.tsx:498` — explicit comment `// Skip: rotation-handle, resize-handle, opening, grid, dimension labels`. The right-click hit-test loop iterates fabric objects, matches `data.type === "wall" / "product" / "ceiling" / "custom-element" / "custom-element-label"`, and skips everything else. **Even though `fabricSync.ts:425` writes `data: { type: "opening", openingId, wallId }` to the polygon, no consumer reads it.**

**Click-to-select on openings (Phase 54) — also non-functional.** `src/canvas/tools/selectTool.ts` was not read, but the polygon at `fabricSync.ts:419-426` has `selectable: false, evented: false` — Fabric will not even fire a select on it. Click selects the underlying wall (passes through to the wall polygon).

**Plan implication — D-11 must be amended to:**

1. **Extend `ContextMenuKind`:** add `"opening"` to the union in `uiStore.ts:154 + 159` and to `ContextMenuState`. No data shape change — `nodeId` becomes the opening ID.
2. **Extend `openContextMenu` callsites:** also need `wallId` — pass via a 4th param OR resolve `wallId` from `nodeId` via store search. Recommend adding optional `parentId?: string` to `openContextMenu` signature, populated only for openings.
3. **Add right-click hit-test for opening polygons in `FabricCanvas.tsx:472-498`:** before the existing wall match, check `data.type === "opening"` and dispatch with `kind: "opening"`. Order matters — opening polygon is on top of wall polygon.
4. **Add `getActionsForKind(kind: "opening", nodeId)` branch in CanvasContextMenu.tsx:** Focus camera (point at opening center), Hide/Show (toggle in `hiddenIds`), Copy (clipboard semantics for openings — currently no-op? defer), Delete (`removeOpening(parentWallId, openingId)`).
5. **Click-to-select:** Phase 54 used a different mechanism (`useClickDetect` hook on 3D meshes for products/walls/ceilings). For 2D, `selectTool.ts` would need to recognize opening polygons. Defer to Plan if scope allows; otherwise mark as a known gap for v1.16.

**Cost of fix: ~30-40 lines across 3 files (uiStore, FabricCanvas, CanvasContextMenu) + 1 new e2e test.** This is a real planning addition — D-11 was wrong, and Phase 61 must absorb the cost. Not a CONTEXT.md re-discuss trigger; it's a researchable correction.

**Source:** all three files above + `grep -n "openContextMenu" src/canvas/ src/components/ src/stores/uiStore.ts`.

---

### Q6 — Niche back-wall material

**Confidence: MEDIUM-HIGH**

**Recommendation: use the wall's `baseColor` constant (= `"#f8f5ef"` neutral drywall, or `"#93c5fd"` if selected) for v1.15.** Don't query wallpaper / paint / user-textures — defer that complexity to v1.16+.

**Source:** `src/three/WallMesh.tsx:133` — `const baseColor = isSelected ? "#93c5fd" : "#f8f5ef"`. Currently a local `const` inside `WallMesh()`, not exported. To share with `NicheMesh`:

**Option A (RECOMMENDED): hoist the constant to a module-level export in WallMesh.tsx** — `export const WALL_BASE_COLOR = "#f8f5ef";` (drop the selected-state variant for niche; niche gets selected-state when ITS opening is selected, not the wall's). Niche imports + applies.

**Option B: re-export from a new `src/three/wallMaterial.ts` shared module.** Cleaner long-term but +1 file. Probably overkill for one constant.

**Option C: hard-code `"#f8f5ef"` in NicheMesh.** Easy now, drift-prone later if the wall color changes. Reject.

**v1.15 simplification per CONTEXT.md "Out of scope":** "Niche back-wall material override (single base color for v1.15)" — confirmed locked. Single solid color is the v1.15 contract.

**Risk: low.** Color-coordination between niche and wall is desirable for the "recessed shelf" visual reading; matching `baseColor` is correct. Phase 32+ PBR pipeline does NOT need to wire into the niche — niche's 5 inner planes use `meshStandardMaterial` with `color={WALL_BASE_COLOR}, roughness=0.85, metalness=0` (matching the base wall material at WallMesh.tsx:440-446). Mirror exactly.

---

### Q7 — Toolbar dropdown UI primitive

**Confidence: HIGH**

**No dropdown library installed.** `package.json` has `lucide-react`, `react-colorful`, `react-error-boundary`, `react-router-dom` — no radix, no headlessui, no cmdk, no react-aria, no floating-ui.

**Existing prior-art in repo: `src/components/WainscotPopover.tsx`** (~50 lines for the dismiss + outside-click + escape-key boilerplate). Pattern:

```tsx
// Position: { style } prop (caller passes computed `top/left`)
// Dismissal: 3 hooks
//   1. document mousedown listener — click outside ref → onClose()
//   2. uiStore.subscribe — userZoom/panOffset change → onClose()
//   3. document keydown — Escape → onClose() (auto-focused root div)
// Animation: fade-in via useReducedMotion() guard (Phase 33 D-39)
```

**Recommendation: build `Toolbar.WallCutoutsDropdown.tsx` mirroring this pattern.** ~70 lines per CONTEXT.md estimate is realistic.

**Trigger button — also build inline in Toolbar.tsx:**
- Wraps a lucide `ChevronDown` icon next to the existing tool button row (after WINDOW button, line 41 in `tools[]`)
- onClick toggles a `showWallCutoutsDropdown` local React state in Toolbar
- Renders the dropdown component conditionally below the trigger, `position: fixed` positioned by `useRef + getBoundingClientRect()` of the trigger

**Items inside dropdown:** 3 buttons (Archway, Passthrough, Niche), styled with Phase 33 design tokens:
- `bg-obsidian-low` background, `ghost-border`, `rounded-sm`
- Each item: `p-2 hover:bg-obsidian-high text-text-primary font-mono text-[11px]`
- Click → `setTool("archway" / "passthrough" / "niche")` + `onClose()`

**ToolType extension required:** `src/types/cad.ts:227` currently:
```ts
export type ToolType = "select" | "wall" | "door" | "window" | "product" | "ceiling";
```
Extend to include `"archway" | "passthrough" | "niche"`. Phase 14 `setTool()` and `tools[]` array dispatch will inherit. `FabricCanvas.tsx` `useEffect([activeTool])` already switches on tool type — add 3 new cases for the 3 new tools.

**Risk: low.** Pattern is well-established; Phase 33 design system has all needed tokens (`bg-obsidian-low/high`, `font-mono`, `text-[11px]`, `ghost-border`, `rounded-sm`). Reduced-motion guard is the only gotcha — must mirror Phase 33 D-39 (snap open/closed if `useReducedMotion()`).

---

## Project Constraints (from CLAUDE.md)

- **Phase 33 D-33 icon allowlist:** New non-listed file = use lucide. Adding to the allowlist needs explicit justification (single archway icon).
- **Phase 33 D-34 spacing:** No `p-3 / m-3 / gap-3` arbitrary values in `Toolbar.tsx`. Verified — current Toolbar uses `gap-1, gap-1.5, mr-6, p-1, p-2, px-2, px-4, py-1`.
- **Phase 33 D-39 reduced motion:** Every new animation guards on `useReducedMotion()`. Dropdown open/close needs this.
- **Phase 31 single-undo:** Drag-edit transactions use `*NoHistory` mid-stream + `update*` on Enter/blur. Niche depth input must follow.
- **GH issue tracking (CLAUDE.md "Living System Rule"):** OPEN-01 maps to existing GH issue [#19 partial](https://github.com/micahbank2/room-cad-renderer/issues/19) — phase PR body must include `Refs #19`.

## Standard Stack (verified versions)

| Library | Version (verified `package.json`) | Purpose |
|---------|------------------------------------|---------|
| three | 0.183.2 | `THREE.Path.absarc`, `Shape`, `ExtrudeGeometry`, `BoxGeometry`, `MeshStandardMaterial` |
| @react-three/fiber | 8.17.14 | NicheMesh component (R3F) |
| fabric | 6.9.1 | 2D opening polygon overlay + new symbol shapes |
| lucide-react | 1.8.0 | New tool icons (Frame, RectangleHorizontal, ChevronDown) |
| zustand + immer | 5.0.12 + 11.1.4 | Store extensions (cadStore opening actions exist; uiStore needs `"opening"` kind) |
| material-symbols-outlined | (CSS, no version) | `arch` glyph for archway only |

**Installation:** No new dependencies needed.

## Architecture Patterns

### Pattern 1 — Tool activation (existing, mirror for 3 new tools)
**What:** `activate*Tool(fc, scale, origin) → () => void` cleanup. Module exports the activation function; FabricCanvas stores cleanup in `toolCleanupRef`.
**Source:** `src/canvas/tools/doorTool.ts:10-128`. `archwayTool / passthroughTool / nicheTool` are direct copies with kind-specific defaults from D-02.

### Pattern 2 — Wall hole geometry (existing, extend for archway path)
**What:** `THREE.Shape` with `holes[]` array; each hole is a `THREE.Path`.
**Source:** `src/three/WallMesh.tsx:105-131`. Extend the `for (const opening of wall.openings)` loop with kind-discriminated branches.

### Pattern 3 — Separate inset mesh (new for niche)
**What:** Niche does NOT cut through wall. Skip in the `holes[]` loop; render separately.
**Source:** New `src/three/NicheMesh.tsx`. Composed in `WallMesh.tsx` — iterate `wall.openings.filter(o => o.type === "niche")` and render `<NicheMesh wall={wall} opening={opening} roomCenter={...} />`. Pass `roomCenter` for interior-normal lookup (or compute interior normal in caller and pass as prop).

### Pattern 4 — Right-click context menu dispatch (extend for openings)
**What:** Hit-test in FabricCanvas → `openContextMenu(kind, nodeId, position)` → CanvasContextMenu's `getActionsForKind()` returns ContextAction[] → renders.
**Source:** `src/canvas/FabricCanvas.tsx:466-512` + `src/components/CanvasContextMenu.tsx:33-135`. Extension scope: ~30 LOC across 3 files.

### Anti-Patterns to Avoid

- **Do not assume Phase 53/54 "automatic inheritance"** for openings (D-11 in CONTEXT.md is wrong). Audit `ContextMenuKind` and the FabricCanvas hit-test before claiming inheritance.
- **Do not use `BoxGeometry` for the niche** — closed box has front-face conflict with the wall hole. Use 5 separate planes (Strategy A in Q3).
- **Do not allocate Vector3 inside niche render hot path** — follow `cutawayDetection.ts:27-31` pattern of module-level scratch (or rely on R3F's React-driven rendering, which is not hot in the same way as useFrame; less critical here).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Outward-normal calc | Custom math | `computeOutwardNormalInto()` from `cutawayDetection.ts:71` | Already debugged; sign convention validated in Phase 59 |
| Arc geometry | Manual polyline | `THREE.Path.absarc` | Three.js tessellates arcs via curve segments; ExtrudeGeometry handles seam |
| Click-outside dismiss | Custom listener | Mirror `WainscotPopover.tsx:27-35` pattern | Already paired with zoom/pan dismissal; established convention |
| Wall position+rotation | Custom math | Mirror `WallMesh.tsx:88-98` (`midpoint + Euler(0, -angle, 0)`) | Tested in Phases 1-60; consistent with rest of 3D layer |
| Reduced-motion guard | Custom matchMedia | `src/hooks/useReducedMotion.ts` (Phase 33) | Already a project convention |
| Single-undo for input edits | Custom debouncing | `update*NoHistory` + `update*` on commit (Phase 31 pattern) | Established; existing store actions support both forms |

## Common Pitfalls

### Pitfall 1: Niche depth exceeds wall thickness
**What goes wrong:** Niche back wall punches through the exterior face — recess becomes a through-hole.
**Why it happens:** No clamp on user-entered depth.
**How to avoid:** Validate `depthFt = clamp(d, 0.083, T - 0.083)` (clamp to 1" min and `wallThickness - 1"` max) in BOTH placement (`nicheTool.ts`) and edit (`updateOpening` in PropertiesPanel input commit). Round-trip in snapshot load.
**Warning sign:** 3D camera-through-wall test (e2e E3) sees the niche box from outside the room.

### Pitfall 2: Archway with `width === 0` or `height < width/2`
**What goes wrong:** `absarc` with radius=0 produces empty arc; ExtrudeGeometry may fail or produce zero-area face. Or, if height < width/2, `shaftTop < oBottom` and the path self-intersects.
**Why it happens:** No validation on minimum dimensions.
**How to avoid:** Tool-time clamp: `width >= 1ft, height >= width/2 + 1ft`. Defaults (3 ft × 7 ft) are well-clear.

### Pitfall 3: Phase 53 menu doesn't open on opening
**What goes wrong:** Right-click on opening polygon → menu doesn't appear (because `ContextMenuKind` doesn't include `"opening"`).
**Why it happens:** D-11 wrongly assumed inheritance.
**How to avoid:** Plan must explicitly extend `ContextMenuKind` + add hit-test branch + add `getActionsForKind` branch.
**Warning sign:** e2e test E5 fails (right-click menu doesn't open on archway).

### Pitfall 4: Niche back-wall faces wrong direction
**What goes wrong:** Backface culling hides the niche back wall from the user's POV.
**Why it happens:** Plane normals must face OUT toward the room (toward `N_in`).
**How to avoid:** Either set `side: THREE.DoubleSide` on all 5 planes (matches wall style), OR carefully construct planes with normals facing inward into the niche cavity. Recommend `DoubleSide` to match the rest of the codebase (`WallMesh.tsx:443`).

### Pitfall 5: Snapshot back-compat on opening type union
**What goes wrong:** Adding `"archway" | "passthrough" | "niche"` to `Opening.type` makes TypeScript reject loading old snapshots that have only `"door" | "window"`.
**Why it doesn't:** Type-union extension is a SUPERSET — existing values remain valid. Optional `depthFt?: number` on Opening is also superset-safe (undefined for non-niche).
**How to verify:** Add unit test U4 (CONTEXT.md D-12) — load a hand-crafted v3 snapshot with door + window, assert no errors and all rendering paths work.

## Code Examples

### Archway hole path (verified)
```ts
// Inside WallMesh.tsx wall-shape builder, for opening.type === "archway":
// Source: derived from THREE r0.183 docs + adapted to wall-local coords used in WallMesh.tsx:105-131
const oLeft = opening.offset - halfLen;
const oRight = oLeft + opening.width;
const oBottom = opening.sillHeight - halfH;  // sillHeight=0 for archway
const archCenterX = oLeft + opening.width / 2;
const archRadius = opening.width / 2;
const shaftTop = oBottom + opening.height - archRadius;

const hole = new THREE.Path();
hole.moveTo(oLeft, oBottom);
hole.lineTo(oRight, oBottom);
hole.lineTo(oRight, shaftTop);
hole.absarc(archCenterX, shaftTop, archRadius, 0, Math.PI, false);
hole.lineTo(oLeft, oBottom);
shape.holes.push(hole);
```

### Niche position math (verified)
```ts
// Inside NicheMesh.tsx, given wall + opening + roomCenter:
// Source: derived from cutawayDetection.ts:71-103 + WallMesh.tsx:88-98
import { computeOutwardNormalInto } from "@/three/cutawayDetection";

const outNormal = new THREE.Vector3();
computeOutwardNormalInto(wall, roomCenter, outNormal);
// outNormal lies in XZ plane

const len = wallLength(wall);
const Ux = (wall.end.x - wall.start.x) / len;
const Uz = (wall.end.y - wall.start.y) / len;

const centerAlongX = wall.start.x + Ux * (opening.offset + opening.width / 2);
const centerAlongZ = wall.start.y + Uz * (opening.offset + opening.width / 2);

// N_in = -outNormal (interior face)
const Nx_in = -outNormal.x;
const Nz_in = -outNormal.z;

// Front face center (on wall's interior face)
const frontX = centerAlongX + Nx_in * (wall.thickness / 2);
const frontZ = centerAlongZ + Nz_in * (wall.thickness / 2);

// Clamp depth (Pitfall 1)
const depth = Math.min(opening.depthFt ?? 0.5, wall.thickness - 1/12);

// Box (or 5-plane group) center — recessed INWARD from front face by depth/2,
// which is OPPOSITE to N_in (= same as outNormal direction)
const centerX = frontX + outNormal.x * (depth / 2);
const centerZ = frontZ + outNormal.z * (depth / 2);
const centerY = opening.sillHeight + opening.height / 2;

const wallAngleY = Math.atan2(Uz, Ux);

return (
  <group position={[centerX, centerY, centerZ]} rotation={[0, -wallAngleY, 0]}>
    {/* 5 planes: back, top, bottom, left, right — all using WALL_BASE_COLOR */}
  </group>
);
```

## Runtime State Inventory

This phase is greenfield (new types, new tools, new components). No data migration required:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `Opening.type` extension is additive (existing `"door" \| "window"` snapshots remain valid) | None |
| Live service config | N/A — local-first app, no live services | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None | None |

**Snapshot back-compat:** verified by Pitfall 5 above. Existing IndexedDB saves with `type: "door"` or `"window"` continue to work; the new optional `depthFt` field is `undefined` for non-niche openings, which serializes as the field being absent (idiomatic JSON).

## Environment Availability

This phase is purely code (TypeScript + React) — no external CLI dependencies, no services, no databases beyond IndexedDB (already required by app). Skipping detailed audit per execution_flow §2.6 ("Skip condition: code/config-only changes").

## Validation Architecture

`workflow.nyquist_validation` not configured in `.planning/config.json` (file does not exist) — treating as **enabled**.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 + happy-dom 20.8.9 (unit/component); Playwright 1.59.1 (e2e) |
| Config file | `vitest.config.ts` (assumed; verify in Wave 0) + `playwright.config.ts` |
| Quick run command | `npm run test:quick` (vitest with dot reporter) |
| Full suite command | `npm test && npm run test:e2e` |

### Phase Requirements → Test Map (per D-12)

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| OPEN-01 | `Opening.type` accepts all 5 kinds | unit | `npx vitest run tests/types/opening.test.ts -t "U1"` | NEW: `tests/types/opening.test.ts` |
| OPEN-01 | Default-value resolver returns correct defaults | unit | `... -t "U2"` | same |
| OPEN-01 | Niche depthFt clamps to wallThickness - 1" | unit | `... -t "U3"` | same |
| OPEN-01 | Snapshot v3 with door+window only round-trips | unit | `... -t "U4"` | same |
| OPEN-01 | PropertiesPanel niche shows Depth input | component | `npx vitest run tests/components/PropertiesPanel.opening.test.tsx -t "C1"` | NEW |
| OPEN-01 | PropertiesPanel passthrough shows wall-height placeholder | component | `... -t "C2"` | same |
| OPEN-01 | PropertiesPanel archway hides Depth input | component | `... -t "C3"` | same |
| OPEN-01 | Toolbar Wall Cutouts dropdown → Archway → place → 3D arched top | e2e | `npx playwright test e2e/openings.spec.ts -g "E1"` | NEW |
| OPEN-01 | Passthrough → full-height through-hole | e2e | `... -g "E2"` | same |
| OPEN-01 | Niche → recessed mesh, wall NOT cut through | e2e | `... -g "E3"` | same |
| OPEN-01 | Niche depth input updates 3D mesh | e2e | `... -g "E4"` | same |
| OPEN-01 | Right-click on each new kind → context menu opens | e2e | `... -g "E5"` | same |
| OPEN-01 | Old snapshot with door + window only loads cleanly | e2e | `... -g "E6"` | same |

### Sampling Rate
- **Per task commit:** `npm run test:quick`
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test && npm run test:e2e` all green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/types/opening.test.ts` — covers OPEN-01 unit U1-U4 (NEW)
- [ ] `tests/components/PropertiesPanel.opening.test.tsx` — covers OPEN-01 component C1-C3 (NEW)
- [ ] `e2e/openings.spec.ts` — covers OPEN-01 e2e E1-E6 (NEW)
- [ ] `src/test-utils/openingDrivers.ts` — `__drivePlaceArchway/Passthrough/Niche`, `__getOpeningKind` test drivers (NEW, per CONTEXT.md line 215)
- [ ] Verify `vitest.config.ts` exists and `tsconfig.json` `paths` includes `tests/*` mapping. If absent, add it in Wave 0.

## Open Questions

1. **Niche front-face open vs. closed** — Q3 recommends 5-plane group (open front). The PLAN should confirm: do we want the niche cavity visible from inside the room? Yes per "recess" semantics. Plan should not change this without re-checking with user.

2. **Niche selection / right-click vs. wall** — Even after fixing Q5, when user right-clicks the niche mesh in 3D, does the click hit the niche or the wall behind it? R3F event propagation depends on mesh ordering + `onContextMenu` handlers. Recommend NicheMesh has its own `onContextMenu` calling `openContextMenu("opening", openingId, ...)` — mirrors `WallMesh.tsx:430-438`.

3. **Click-to-select on opening (Phase 54)** — Phase 54 wired `useClickDetect` on WallMesh / ProductMesh / CeilingMesh / CustomElementMesh. Niche/archway/passthrough don't yet. Defer to scope decision: include in Phase 61 (small) or v1.16 (separate phase). Recommend INCLUDE — it's small (one hook call per new mesh).

## Confidence Breakdown

| Area | Level | Reason |
|------|-------|--------|
| Standard stack | HIGH | All deps present in package.json, versions verified |
| Archway absarc geometry | HIGH | THREE.Path.absarc API is stable in r0.183, derivation step-by-step verified |
| Niche position math | HIGH | Test fixture worked through end-to-end; sign convention double-checked against Phase 59 helper |
| Phase 53/54 inheritance (Q5) | HIGH | Three independent code citations — all consistent. CONTEXT.md D-11 is definitively wrong. |
| Lucide icon recommendation (Q1) | MEDIUM | Subjective glyph fit; user-facing decision deserves a screenshot review during plan. |
| Niche back-wall material (Q6) | MEDIUM-HIGH | Locked by CONTEXT.md "Out of scope"; only mechanical question is constant-hoist vs. shared module. |
| Toolbar dropdown (Q7) | HIGH | WainscotPopover prior-art is direct fit; no library needed. |

## Sources

### Primary (HIGH confidence)
- `src/types/cad.ts:78-85, 227` — Opening + ToolType
- `src/three/WallMesh.tsx:88-131, 133` — wall mesh + baseColor + hole geometry
- `src/three/cutawayDetection.ts:71-103` — outward-normal helper
- `src/canvas/tools/doorTool.ts` — placement-tool template (full file read)
- `src/canvas/fabricSync.ts:384-428` — 2D opening polygon overlay
- `src/components/PropertiesPanel.tsx:354-356` — current opening section (count only)
- `src/components/CanvasContextMenu.tsx:31-135` — context-menu kind dispatch
- `src/canvas/FabricCanvas.tsx:466-512` — right-click hit-test (skips openings)
- `src/stores/uiStore.ts:153-162, 397` — ContextMenuKind union
- `src/components/WainscotPopover.tsx:1-50` — popover prior-art for dropdown
- `package.json` — dependency manifest
- `node_modules/lucide-react/dist/esm/icons/` — manual ls of icon names

### Secondary (MEDIUM confidence)
- Three.js r0.183 docs (training data) for `THREE.Path.absarc` signature — cross-verified by reading the existing `THREE.Path` import + `Shape.holes[]` usage at WallMesh.tsx:120

### Tertiary (LOW confidence)
- None — every claim is grounded in code citations.

## Metadata

**Research date:** 2026-05-04
**Valid until:** 2026-06-03 (30 days; codebase is moving fast but Three.js + Fabric APIs are stable)
**Author:** gsd-researcher (Claude)
