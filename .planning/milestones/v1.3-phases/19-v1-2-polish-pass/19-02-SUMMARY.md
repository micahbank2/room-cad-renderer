---
phase: 19-v1-2-polish-pass
plan: "02"
subsystem: wall-surface-ux
tags: [wainscot, inline-edit, copy-side, frame-color, polish]
dependency_graph:
  requires: []
  provides: [POLISH-02, POLISH-03, POLISH-04]
  affects:
    - src/components/WainscotLibrary.tsx
    - src/stores/cadStore.ts
    - src/types/cad.ts
    - src/components/WallSurfacePanel.tsx
    - src/three/WallMesh.tsx
tech_stack:
  added: []
  patterns:
    - inline-edit-on-double-click
    - deep-clone-copy-side
    - per-placement-override
key_files:
  created: []
  modified:
    - src/components/WainscotLibrary.tsx
    - src/stores/cadStore.ts
    - src/types/cad.ts
    - src/components/WallSurfacePanel.tsx
    - src/three/WallMesh.tsx
decisions:
  - Inline edit uses updateItem directly from wainscotStyleStore (live update on each keystroke)
  - copyWallSide uses JSON.parse(JSON.stringify(...)) for deep clone per STATE.md decision
  - frameColorOverride in WallSurfacePanel uses useCADStore.getState() for fire-and-forget call pattern
  - WallMesh computes frameColor = frameColorOverride ?? preset.color before framing group render
metrics:
  duration_minutes: 20
  completed_date: "2026-04-06"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
---

# Phase 19 Plan 02: Wall Treatment Polish (POLISH-02, 03, 04) Summary

**One-liner:** Wainscot inline edit on double-click, one-click copy-side for all wall treatments, and per-placement frame color picker with 3D override.

## What Was Built

### Task 1 — Wainscot inline edit + copyWallSide + frameColorOverride type

**WainscotLibrary.tsx (POLISH-02):**
- Added `editingId` state and `updateItem` from `useWainscotStyleStore`
- Library items now show inline edit form on double-click: name input (Enter/Escape to dismiss), height NumberKnob, color picker, DONE button
- Static display includes `title="DOUBLE_CLICK_TO_EDIT"` hint
- `updateItem` writes directly to the store on each keystroke — changes persist immediately via the store's idb-keyval subscriber

**cadStore.ts (POLISH-03):**
- Added `copyWallSide: (wallId, from, to) => void` to CADState interface
- Implementation pushes history then deep-clones wallpaper, wainscoting, crownMolding, and wallArt from `from` side to `to` side
- New wall art items on the target side get fresh IDs via `wa_${Math.random()...}` to avoid shared references
- Uses `JSON.parse(JSON.stringify(...))` per the STATE.md key decision

**cad.ts (POLISH-04):**
- Added `frameColorOverride?: string` field to `WallArt` interface with JSDoc comment

### Task 2 — COPY_TO_SIDE button + frame color override picker

**WallSurfacePanel.tsx (POLISH-03 + POLISH-04):**
- Added `copyWallSide` selector from `useCADStore`
- Added `COPY_TO_SIDE_B` / `COPY_TO_SIDE_A` button immediately below side toggle — label reflects the target side dynamically
- Extended art items list: each item with a non-none `frameStyle` now shows a `<input type="color">` picker using `a.frameColorOverride ?? FRAME_PRESETS[a.frameStyle].color` as value
- Picker onChange calls `useCADStore.getState().updateWallArt(...)` with `{ frameColorOverride: e.target.value }`
- Title attribute `"FRAME_COLOR_OVERRIDE"` per CLAUDE.md UI label conventions

**WallMesh.tsx (POLISH-04):**
- Added `const frameColor = art.frameColorOverride ?? preset?.color ?? "#ffffff"` before the framing group
- All 4 frame segment `meshStandardMaterial` now use `color={frameColor}` instead of `color={preset.color}`

## Deviations from Plan

None — plan executed exactly as written. All three features implemented across five files. Build passes clean.

## Self-Check

### Created files exist:
N/A — no new files created.

### Modified files exist:
- `src/components/WainscotLibrary.tsx` — FOUND
- `src/stores/cadStore.ts` — FOUND
- `src/types/cad.ts` — FOUND
- `src/components/WallSurfacePanel.tsx` — FOUND
- `src/three/WallMesh.tsx` — FOUND

### Commits exist:
- `6fe3d25` feat(19-02): wainscot inline edit, copyWallSide action, frameColorOverride type
- `5ff1f21` feat(19-02): COPY_TO_SIDE button + frame color override picker in wall surface panel

### Build: PASSED (✓ 666 modules transformed, no errors)

## Self-Check: PASSED
