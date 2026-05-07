---
phase: 68-material-application-system-mat-apply-01
plan: 06
subsystem: material-application
tags: [ui, picker, material, wave-4, d-05, d-06, d-07]
requires:
  - 68-04 (Wave 3a — 3D renderer reads materialId)
  - 68-05 (Wave 3b — 2D fabric renderer reads materialId)
provides:
  - "src/components/MaterialPicker.tsx: unified <MaterialPicker surface=... target=... value=... /> component (D-05). Default action wires to applySurfaceMaterial (D-06 single-undo)."
  - "src/components/PropertiesPanel.tsx: <MaterialPicker surface='ceiling'> mounted on selected ceiling; custom-element selection adds 6-button face toggle + <MaterialPicker surface='customElementFace'> driving the active face (D-07)."
  - "src/components/WallSurfacePanel.tsx: <MaterialPicker surface='wallSide'> drives active side; legacy wallpaper picker block + PaintSection mount removed."
  - "src/components/RoomSettings.tsx: <MaterialPicker surface='floor'> added below dimension inputs."
  - "src/components/Sidebar.tsx: legacy 'Floor material' section + FloorMaterialPicker mount removed."
affects:
  - "Phase 68 success criterion #1 (one unified picker for all four surface kinds) is GREEN."
  - "Plan 07 (e2e driver + verification) can wire window.__driveApplyMaterial against this UI and turn the sixth Wave 0 test (currently todo) GREEN."
  - "v1.18 cleanup phase: PaintSection.tsx, CeilingPaintSection.tsx, FloorMaterialPicker.tsx, SurfaceMaterialPicker.tsx are now orphan files (compile-clean, unmounted) — safe to delete."
tech-stack:
  added: []
  patterns:
    - "lucide-react X icon (D-33 compliance) for the 'Clear material' affordance."
    - "Canonical Tailwind spacing tokens p-1/p-2/p-4 + gap-1/gap-2 only (D-34 compliance) — zero arbitrary p-[Npx] values."
    - "role='button' wrapper around MaterialCard so screen.queryAllByRole('button') in Wave 0 picker test sees clickable cards."
    - "Empty-library state dispatches phase68:upload-material window event so the host can open the Phase 67 UploadMaterialModal without MaterialPicker importing it directly (loose coupling)."
key-files:
  created:
    - src/components/MaterialPicker.tsx
    - .planning/phases/68-material-application-system-mat-apply-01/68-06-SUMMARY.md
  modified:
    - src/components/PropertiesPanel.tsx
    - src/components/WallSurfacePanel.tsx
    - src/components/RoomSettings.tsx
    - src/components/Sidebar.tsx
    - src/components/__tests__/MaterialPicker.test.tsx
decisions:
  - "Mid-pick preview: NOT enabled in v1.17 (RESEARCH §MaterialPicker UX Architecture recommendation). Single click applies, single Ctrl+Z reverts. Mid-pick preview can be added in v1.18 if Jessica reports the UX feels lifeless. Documented in MaterialPicker.tsx file-header comment."
  - "Floor MaterialPicker location: plan listed RoomSettings.tsx in files_modified, but the legacy FloorMaterialPicker mount lived in Sidebar.tsx. Resolution: relocated the floor picker into RoomSettings.tsx to honor the plan acceptance criteria literally AND keep the floor material UI grouped with room dimensions (a more cohesive UX). Sidebar.tsx loses its 'Floor material' collapsible section."
  - "MaterialPicker target prop is optional: the Wave 0 RED test renders the picker without a target (passing only onChange). Made target?: SurfaceTarget so the picker still works in tests; production callers in PropertiesPanel/WallSurfacePanel/RoomSettings always pass target. apply() and setTileSize() guard on target presence before calling cadStore."
  - "Wave 0 picker test minor fix: getByText(/upload material|material/i) failed because two text nodes match (the 'Material' header AND 'Upload Material' button). Switched to queryAllByText().length > 0 per the plan's authorization to adjust the test for jsdom-friendliness."
metrics:
  duration: ~14 min
  completed: 2026-05-06
  tasks: 2
  files_created: 1
  files_modified: 5
---

# Phase 68 Plan 06: Wave 4 — Unified MaterialPicker UI

Wave 4 completes the user-facing surface of the Material application system. One MaterialPicker component now serves all four surface kinds (wall side / floor / ceiling / custom-element face), replacing four legacy mount points. Single click → single undo → both 2D and 3D renderers update.

## What Changed

### Task 1 — `src/components/MaterialPicker.tsx` (commit e8af0b1)

- **NEW** unified picker component. Subscribes `useMaterials()` (Phase 67), filters via `materialsForSurface(materials, surface)`, renders a `MaterialCard` grid (cols-2 on small widths, cols-4 on lg).
- Click a card → calls `onChange(materialId)` if provided, else `useCADStore.getState().applySurfaceMaterial(target, materialId)`. Single click = single undo entry (D-06).
- Tile-size override input shown when a Material is selected: placeholder = `material.tileSizeFt.toString()` (D-04 default), empty value clears the override. "use default" button next to the input clears the override explicitly.
- "Clear material" button (lucide-react X icon, D-33) when value is set.
- Empty-library state: "+ Upload Material" CTA dispatches `phase68:upload-material` window event so the host can open the Phase 67 UploadMaterialModal without this component importing it.
- `role="button"` wrapper around each `MaterialCard` so the Wave 0 test's `queryAllByRole('button')` sees clickable cards.
- File-header comment documents the v1.17 no-mid-pick-preview decision.
- Wave 0 `MaterialPicker.test.tsx`: 5/5 GREEN (was previously RED — `MaterialPicker` not exported).

### Task 2 — Mount sites (commit 93c0416)

- **PropertiesPanel.tsx**
  - Removed `import CeilingPaintSection`. Added `import { MaterialPicker }` + `import type { FaceDirection }`.
  - Added `useState<FaceDirection>("top")` for `activeFace`.
  - Ceiling section: `<CeilingPaintSection ... />` → `<MaterialPicker surface="ceiling" target={{kind:"ceiling", ceilingId}} value={ceiling.materialId} tileSizeOverride={ceiling.scaleFt} />`.
  - Custom-element section: NEW face-toggle (6 buttons: top, bottom, north, south, east, west) + `<MaterialPicker surface="customElementFace" target={{kind:"customElementFace", placedId, face: activeFace}} value={pce.faceMaterials?.[activeFace]} />`. Each button toggles `activeFace`; the picker re-renders with the new face's materialId.
- **WallSurfacePanel.tsx**
  - Removed `import PaintSection`, `import { useUserTextures }`, `import type { Wallpaper }`, `import { CategoryTabs }`, `import { MyTexturesList }`. Added `import { MaterialPicker }`.
  - Removed wallpaper picker JSX block (~80 LOC: tabs + color input + upload button + scale input). Removed `<PaintSection />` mount line.
  - Removed unused state: `wallpaperFileRef`, `wallpaperTab`, `userTextures`, `setActiveSide` (still imported but only `setActiveSide` was unused), `setWallpaper`, and the four wallpaper helper functions (`handleWallpaperColor`, `handleWallpaperImage`, `toggleTile`, `setTileSize`, `handleWallpaperUserTexture`).
  - Inserted single `<MaterialPicker surface="wallSide" target={{kind:"wallSide", wallId, side: activeSide}} value={sideMaterialId} tileSizeOverride={sideScaleFt} />` in their place.
  - **Preserved** wainscot, crown molding, and wall-art sections (D-03 — explicitly out of Phase 68 scope). `<input ref={artFileRef}>` and the `useFramedArtStore` / `useWainscotStyleStore` integrations are untouched.
- **RoomSettings.tsx**
  - Added floor MaterialPicker below the existing width/length/height inputs. `useActiveRoomDoc` + `activeRoomId` from cadStore drive the value/tileSize bindings.
- **Sidebar.tsx**
  - Removed `import FloorMaterialPicker`. Removed the `<CollapsibleSection label="Floor material">` block that mounted it. Floor material UI now lives in RoomSettings (one panel up, but visually below dimensions).

### Test fixture adjustment

- `src/components/__tests__/MaterialPicker.test.tsx`: removed the `@ts-expect-error` directive (component now exists), switched `getByText(/material/i)` → `queryAllByText(...).length > 0` to handle the legitimate two-match case (the picker renders both a "Material" header AND, in the empty state, an "Upload Material" CTA).

## Verification

- `npm run test -- --run src/components/__tests__/MaterialPicker.test.tsx` → **5/5 GREEN**.
- `npm run test -- --run src/components/__tests__/MaterialPicker.test.tsx src/lib/__tests__/materialResolver.test.ts src/lib/__tests__/snapshotMigration.v6.test.ts src/stores/__tests__/cadStore.material.test.ts src/canvas/__tests__/fabricSync.materialFill.test.ts` → **26 passed | 4 todo (5 files)**. All 5 of 6 Wave 0 vitest suites GREEN — the sixth (`tests/material-apply.spec.ts` e2e) is Plan 07's scope.
- `npm run build` exits 0 (1.52 MB main chunk; pre-existing warnings only).
- `npx tsc --noEmit --skipLibCheck --ignoreDeprecations 6.0` on the four touched files: zero NEW errors. The pre-existing `WallSurfacePanel.tsx` `Type 'undefined' cannot be used as an index type` error on the wall-art frame-color block (line 459 → 324 after my deletions, untouched by Plan 06) and the project-wide `import.meta.env` errors are out of scope per Plan rules.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] FloorMaterialPicker is mounted from Sidebar.tsx, not RoomSettings.tsx**

- **Found during:** Task 2 — `grep -rn "FloorMaterialPicker" src/components/` showed the mount was in `Sidebar.tsx:118`, not `RoomSettings.tsx`. RoomSettings.tsx pre-Phase-68 only contained width/length/height inputs.
- **Issue:** The plan's `files_modified` listed `RoomSettings.tsx` and the acceptance criteria literally required `<MaterialPicker surface="floor"` in `RoomSettings.tsx`. Mounting it in Sidebar.tsx would fail the acceptance grep.
- **Fix:** Relocated the floor MaterialPicker INTO RoomSettings.tsx (added `useActiveRoomDoc` + `activeRoomId` selectors). Removed the legacy `<CollapsibleSection label="Floor material">` block from Sidebar.tsx. Net UX improvement: floor material now lives next to the room's dimension inputs (a more cohesive grouping).
- **Files modified:** `src/components/RoomSettings.tsx`, `src/components/Sidebar.tsx`
- **Commit:** 93c0416

**2. [Test fixture] `getByText(/material/i)` matched 2 nodes in empty-library state**

- **Found during:** Task 1 — first vitest run threw `TestingLibraryElementError: Found multiple elements with the text matching ...`.
- **Issue:** MaterialPicker's empty state renders both a "Material" section header AND an "Upload Material" CTA button. `getByText` requires exactly one match; two is a fail.
- **Fix:** Switched to `queryAllByText(...)` and asserted `length > 0`. Plan explicitly authorizes this kind of test adjustment ("adapt the test to use `screen.queryAllByText(...)`"). Removed the `@ts-expect-error` directive on the import since the component now exists.
- **Files modified:** `src/components/__tests__/MaterialPicker.test.tsx`
- **Commit:** e8af0b1

## Known Stubs

None directly introduced by this plan. The plan honors all four surface kinds. Per-face tile-size for custom elements is intentionally inherited from `Material.tileSizeFt` (Plan 03 SUMMARY known-stubs note remains).

## Deferred

- **Mid-pick preview** — defer to v1.18 if Jessica reports the picker feels lifeless without it. Single-undo guarantee is locked either way.
- **Material category filtering** — `materialsForSurface(materials, surface)` returns ALL Materials for v1.17 (no per-surface filter). Phase 70+ adds Material.category metadata for "flooring Materials only on floors" filtering.
- **Empty-library upload modal wiring** — the `phase68:upload-material` event is dispatched but no host listener is installed yet. Plan 07 (or a follow-up) wires the App-level listener to open the Phase 67 UploadMaterialModal. Until then, clicking "+ Upload Material" is a no-op (graceful — the user can still use the existing top-level Material library upload flow).

## Self-Check: PASSED

- src/components/MaterialPicker.tsx: FOUND
- File contains literal `export function MaterialPicker`: FOUND
- File contains literal `applySurfaceMaterial`: FOUND
- File contains literal `materialsForSurface` AND `useMaterials`: FOUND
- File contains literal `MaterialCard`: FOUND
- File contains `import { X } from "lucide-react"`: FOUND
- File contains all four surface kinds (`wallSide`, `floor`, `ceiling`, `customElementFace`): FOUND
- File contains zero `p-[` arbitrary values: VERIFIED (`grep -E "p-\[" → 0`)
- File contains zero `material-symbols` imports: VERIFIED
- src/components/PropertiesPanel.tsx contains `<MaterialPicker` AND `surface="ceiling"` AND `surface="customElementFace"`: FOUND
- src/components/PropertiesPanel.tsx does NOT contain `<CeilingPaintSection`: VERIFIED
- src/components/WallSurfacePanel.tsx contains `<MaterialPicker` AND `surface="wallSide"`: FOUND
- src/components/WallSurfacePanel.tsx does NOT contain `<PaintSection` (no `<` prefix match — `import PaintSection` removed too): VERIFIED
- src/components/WallSurfacePanel.tsx still contains wainscot/crown/wallArt mounts: VERIFIED
- src/components/RoomSettings.tsx contains `<MaterialPicker` AND `surface="floor"`: FOUND
- src/components/RoomSettings.tsx does NOT contain `<FloorMaterialPicker`: VERIFIED
- src/components/Sidebar.tsx does NOT contain `<FloorMaterialPicker`: VERIFIED
- e8af0b1 (Task 1 commit): FOUND
- 93c0416 (Task 2 commit): FOUND
- npm run build: exits 0
- 5 Wave 0 vitest suites: 26 passed, 4 todo
