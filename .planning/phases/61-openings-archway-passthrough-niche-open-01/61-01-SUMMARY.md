---
phase: 61-openings-archway-passthrough-niche-open-01
plan: 01
subsystem: openings
tags: [openings, archway, passthrough, niche, wall-cutout, OPEN-01]
status: complete
completed: 2026-05-04
requirements: [OPEN-01]
provides:
  - "Opening.type extended to 5 kinds (door/window/archway/passthrough/niche)"
  - "Opening.depthFt optional field (niche-only)"
  - "ToolType extended (archway/passthrough/niche)"
  - "3 new placement tools mirroring doorTool"
  - "2D kind-specific symbols (archway arc, passthrough open-top, niche hatch)"
  - "3D archway absarc holes + niche separate-mesh recess on interior face"
  - "Phase 53 right-click + Phase 54 click-to-select wired for openings"
  - "PropertiesPanel.OpeningSection (NEW) with kind-aware inputs"
  - "Toolbar Wall Cutouts dropdown trigger + popover"
affects:
  - "fabricSync.ts (kind-discriminated 2D dispatch)"
  - "WallMesh.tsx (kind-discriminated holes; WALL_BASE_COLOR export)"
  - "RoomGroup.tsx (NicheMesh per-niche render)"
  - "selectTool.ts (opening branch in hitTestStore)"
  - "FabricCanvas.tsx (right-click branch + 3 new tool dispatches)"
  - "uiStore.ts (ContextMenuKind extends with 'opening', parentId)"
  - "CanvasContextMenu.tsx (opening branch with 4 actions)"
  - "cadStore.ts (removeOpening action)"
key-files:
  created:
    - src/canvas/openingSymbols.ts
    - src/canvas/tools/archwayTool.ts
    - src/canvas/tools/passthroughTool.ts
    - src/canvas/tools/nicheTool.ts
    - src/three/NicheMesh.tsx
    - src/components/Toolbar.WallCutoutsDropdown.tsx
    - src/components/PropertiesPanel.OpeningSection.tsx
    - src/test-utils/openingDrivers.ts
    - tests/types/opening.test.ts
    - tests/components/PropertiesPanel.opening.test.tsx
    - e2e/openings.spec.ts
  modified:
    - src/types/cad.ts
    - src/stores/uiStore.ts
    - src/stores/cadStore.ts
    - src/canvas/fabricSync.ts
    - src/canvas/FabricCanvas.tsx
    - src/canvas/tools/selectTool.ts
    - src/three/WallMesh.tsx
    - src/three/RoomGroup.tsx
    - src/components/CanvasContextMenu.tsx
    - src/components/Toolbar.tsx
    - src/components/PropertiesPanel.tsx
    - src/main.tsx
    - CLAUDE.md
decisions:
  - "Type-union extension over new entity (D-01) — all 5 kinds share offset/width/height/sillHeight"
  - "No snapshot version bump — additive Opening.type union + optional depthFt is back-compat"
  - "Niche math sign convention (research Q3): centerX = frontX + outNormal × depth/2 (recess INTO wall body)"
  - "Niche depth clamp at BOTH placement and edit commit; min 1″ max wallThickness−1″"
  - "5-plane open-front group for niche (Strategy A) over BoxGeometry (avoids front-face conflict)"
  - "WALL_BASE_COLOR hoisted to module-level export for NicheMesh reuse (Q6 Option A)"
  - "Phase 53/54 require NEW code (D-11' correction): 'opening' kind added to ContextMenuKind; openContextMenu accepts parentId; FabricCanvas hit-test gains opening branch BEFORE wall match"
  - "Opening click-to-select selects but does NOT start drag (existing opening-handle path still owns drag)"
  - "Toolbar dropdown mirrors WainscotPopover prior-art (research Q7) — no new dependency"
  - "Material Symbols 'arch' glyph for archway (CLAUDE.md D-33 9th allowlist entry — no lucide equivalent)"
metrics:
  tasks: 8
  unit-tests-added: 11
  component-tests-added: 3
  e2e-tests-added: 6
  vitest-failures-before: 4
  vitest-failures-after: 4
  e2e-results: "6/6 pass on chromium-preview; Phase 53/59 regression 13/13 pass"
---

# Phase 61 Plan 01: Openings — Archway / Passthrough / Niche Summary

**One-liner:** Three new wall-cutout opening kinds with kind-discriminated 2D
symbols, 3D geometry (archway absarc + niche separate-mesh), Phase 53/54
right-click + click-to-select wiring, and a Toolbar dropdown picker. Closes
OPEN-01.

## What shipped

- **Type extension:** `Opening.type` now accepts `door | window | archway |
  passthrough | niche`; new optional `depthFt` for niche only. `ToolType`
  similarly extended. Snapshot v2 unchanged — additive union + optional
  field is back-compat (verified by E6).
- **Three placement tools:** `archwayTool` (3ft × 7ft arched), `passthroughTool`
  (5ft × wall.height open-top), `nicheTool` (2ft × 3ft × 0.5ft recess; depth
  clamped via `clampNicheDepth(d, wallThickness)`).
- **2D symbols** (`src/canvas/openingSymbols.ts`): archway = solid rect + 16-point
  half-circle polyline; passthrough = 3-side outline + light fill (top edge
  omitted); niche = solid rect + 4 diagonal hatch lines at `text-text-dim @ 30%`.
- **3D wall holes** (`WallMesh.tsx`): kind-discriminated `THREE.Path` builders.
  Archway uses verified `moveTo + lineTo×2 + absarc(midX, shaftTop, w/2, 0, π,
  false) + lineTo close` (research Q2). Niche openings are SKIPPED — wall body
  stays solid. Module-level `export const WALL_BASE_COLOR = "#f8f5ef"` hoisted
  for NicheMesh reuse.
- **NicheMesh** (`src/three/NicheMesh.tsx`): 5-plane group (back + top + bottom
  + left + right; open front) at the wall's interior face. Position math per
  research Q3 sign-convention CORRECTION: `centerX = frontX + outNormal.x ×
  depth/2` (recess INTO wall, AWAY from room — opposite to N_in). Wrapping
  group has `onPointerUp` (select) + `onContextMenu` (open menu) mirroring
  `WallMesh.tsx:430-438`.
- **Phase 53/54 wiring** (D-11' NEW code): `ContextMenuKind` extends with
  `"opening"`; `openContextMenu` accepts optional `parentId` (= wallId);
  `FabricCanvas` right-click hit-test gains explicit `opening` branch
  BEFORE wall match (openings sit on top); `getActionsForKind('opening')`
  returns 4 actions (Focus camera, Save camera here, Hide/Show, Delete);
  `selectTool.hitTestStore` returns `{ type: 'opening', wallId }` when click
  lands inside an opening's offset range; opening selection does not start
  a drag.
- **PropertiesPanel.OpeningSection.tsx** (NEW): expandable per-opening row
  with width/height/sill/offset for all kinds; depth (inches) ONLY for niche;
  passthrough's height input shows `Wall height` placeholder; archway hides
  depth. All inputs use Phase 31 single-undo pattern (`updateOpeningNoHistory`
  on every keystroke; `updateOpening` on Enter/blur).
- **Toolbar Wall Cutouts dropdown** (`Toolbar.WallCutoutsDropdown.tsx`):
  mirrors `WainscotPopover` — fixed-position div + 3 dismiss hooks
  (mousedown click-outside, uiStore zoom/pan, Escape) + `useReducedMotion`-
  guarded fade-in. Trigger button (lucide `ChevronDown`) added to ToolPalette
  after the existing 5 tools.
- **CLAUDE.md D-33 allowlist** updated to 9 entries — `Toolbar.WallCutoutsDropdown.tsx`
  added with note that the `arch` glyph has no lucide equivalent.
- **Test drivers** (`src/test-utils/openingDrivers.ts`): `__drivePlaceArchway`,
  `__drivePlacePassthrough`, `__drivePlaceNiche(wallId, offset, depthFt?)`,
  `__getOpeningKind`, `__getNicheDepth`, `__getOpeningContextActionCount`,
  `__driveOpenOpeningContextMenu`. Registered at boot via `main.tsx`.

## Tests

- **Unit (vitest):** 11 new tests in `tests/types/opening.test.ts` covering
  U1 (5 kinds), U2 (defaults per kind), U3 (clamp behavior), U4 (snapshot
  back-compat).
- **Component:** 3 new tests in `tests/components/PropertiesPanel.opening.test.tsx`
  — C1 niche depth visible, C2 passthrough placeholder, C3 archway no depth.
- **E2E (Playwright chromium-preview):** 6 new scenarios in
  `e2e/openings.spec.ts` — E1 archway, E2 passthrough, E3 niche depth clamp,
  E4 depth round-trip, E5 right-click context menu (4 actions), E6 v1.14
  snapshot back-compat. **All 6 pass.**
- **Regression:** Phase 53 `canvas-context-menu.spec.ts` (8/8) +
  Phase 59 `wall-cutaway.spec.ts` (5/5) — **all 13 pass**.
- **Pre-existing 4 vitest failures unchanged** (verified before/after).

## Audit gates (PASSED)

- `git diff origin/main -- src/canvas/snapEngine.ts src/canvas/buildSceneGeometry.ts`
  — zero output (Phase 30 untouched)
- Snapshot version literal `version: 2` unchanged in `src/types/cad.ts` (no bump)
- Phase 31 size-override files untouched
- Phase 33 D-34 spacing rule honored — zero `p-3 / m-3 / gap-3 / p-[…]` arbitrary
  values introduced in Toolbar.tsx or new dropdown component
- Phase 33 D-39 reduced-motion rule honored — dropdown fade-in guards on
  `useReducedMotion()`

## Deviations from plan

### Auto-fixed Issues

**1. [Rule 3 — blocking] Added `removeOpening` action to cadStore**
- **Found during:** Task 6
- **Issue:** PLAN.md key-link `cadStore.removeOpening` referenced an action
  that did not exist (the existing store had `addOpening` + `updateOpening`
  but not `removeOpening`).
- **Fix:** Added `removeOpening: (wallId, openingId) => void` action with
  `pushHistory` semantics matching peer mutators. Used by the new
  context-menu Delete action.
- **Files modified:** `src/stores/cadStore.ts`
- **Commit:** `a1991af`

### Adjustments

- **Toolbar dropdown trigger placement:** PLAN.md described placing the
  trigger inline in the horizontal Toolbar after the WINDOW button. The
  actual door/window/etc. tool buttons live in the **vertical
  ToolPalette** (`src/components/Toolbar.tsx:392+`), not the horizontal
  header. Trigger was placed there instead — same user-facing behavior,
  correct location for the existing tool tier.
- **Saved-camera for openings:** Per CONTEXT D-11', the per-entity saved
  camera schema would require new fields on `Opening`. Phase 61 v1.15
  simplification: `Save camera here` on an opening writes to the parent
  WallSegment's `savedCameraPos/Target` (existing Phase 48 fields).
  Documented in CanvasContextMenu source comment; per-opening camera
  bookmarks deferred to v1.16.
- **No 4-pre-existing-failures regression** (4 → 4 unchanged).

## Self-Check: PASSED

- [x] All 11 created files exist on disk
- [x] All 13 modified files have the documented changes
- [x] All 8 task commits exist (`f251874`, `3a950b8`, `78bcf45`, `5f71db2`,
  `381e2d6`, `a1991af`, `c42064b`, `735985f`)
- [x] 11 + 3 + 6 = 20 new tests added; all pass
- [x] Pre-existing 4 vitest failures unchanged
- [x] Phase 53 + Phase 59 regression e2e: 13/13 pass
