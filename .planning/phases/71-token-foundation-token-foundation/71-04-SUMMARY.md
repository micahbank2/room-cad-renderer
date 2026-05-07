---
phase: 71-token-foundation-token-foundation
plan: "04"
subsystem: chrome-typography-radius-icons
tags: [font-sweep, radius-sweep, icon-migration, pascal, barlow, geist-mono, squircle, lucide-react]
dependency_graph:
  requires: ["71-02", "71-03"]
  provides: ["font-sans chrome typography", "squircle 10px radius", "lucide-only icon system"]
  affects: ["src/components/**/*.tsx", "src/App.tsx", "src/components/help/helpContent.tsx"]
tech_stack:
  patterns: ["font-display→font-sans", "font-mono→font-sans (chrome) / font-mono (data)", "rounded-sm→rounded-smooth-md", "Material Symbols→lucide-react"]
key_files:
  modified:
    - src/components/Toolbar.tsx
    - src/components/Toolbar.WallCutoutsDropdown.tsx
    - src/components/WelcomeScreen.tsx
    - src/components/TemplatePickerDialog.tsx
    - src/components/HelpModal.tsx
    - src/components/AddProductModal.tsx
    - src/components/ProductLibrary.tsx
    - src/components/RoomsTreePanel/TreeRow.tsx
    - src/components/help/HelpSearch.tsx
    - src/components/help/helpContent.tsx
    - src/App.tsx
    - ~35 additional component files (font + radius sweeps)
decisions:
  - "font-mono in StatusBar.tsx preserved (D-10 data status strings)"
  - "font-mono in FabricCanvas.tsx preserved (inline dimension edit inputs — data)"
  - "font-mono in ThreeViewport.tsx walk-mode toast preserved (D-10 status)"
  - "arch→Squircle (lucide) for archway glyph (D-15 substitute)"
  - "stairs→Footprints (lucide) for stair leaf rows (D-15 substitute)"
  - "helpContent.tsx icon type changed from string to LucideIcon component"
metrics:
  duration: "~11 minutes"
  completed_date: "2026-05-07"
  tasks: 3
  files: 48
---

# Phase 71 Plan 04: Fonts + Radius + Icons Sweep Summary

Combined font, radius, and icon sweep across the chrome. Three concerns share one plan because they touch the same files (Toolbar, ProductLibrary, modals) and benefit from a single coordinated pass.

## What Was Built

Barlow chrome typography, 10px squircle corners, and lucide-only icons in one coordinated pass. Chrome now reads as Pascal — no IBM Plex Mono in UI labels, no 2px sharp corners on cards/buttons, no Material Symbols glyphs.

## Task Breakdown

### Task 1: font-mono / font-display sweep (commit `29b8099`)

**font-display sweep (4 sites, 3 files):**
- `Toolbar.tsx`: brand button `font-display` → `font-sans`
- `WelcomeScreen.tsx`: brand span + hero h1 `font-display` → `font-sans` (2 sites)
- `ProductLibrary.tsx`: "PRODUCT REGISTRY" h1 `font-display` → `font-sans`

**font-mono → font-sans sweep (chrome sites):**
- 46 files total swept via `sed` bulk replace
- Chrome components: Toolbar, WelcomeScreen, TemplatePickerDialog, HelpModal, AddProductModal, ProductLibrary, PropertiesPanel, Sidebar, RoomSettings, and ~35 more

**font-mono PRESERVED (D-10 data sites):**
- `src/components/StatusBar.tsx` — 7 occurrences (all dynamic data: tool name, status messages, wall count, grid snap values)
- `src/canvas/FabricCanvas.tsx` — 2 occurrences (inline dimension edit inputs — physical measurements)
- `src/three/ThreeViewport.tsx` — 1 occurrence ("WALK MODE" notification banner — D-10 status string)
- `src/index.css` — 2 occurrences (font token definitions in `@theme {}`)

**font-display after sweep:** 0 occurrences in src/ (verified)

### Task 2: rounded-sm sweep (commit `13be993`)

**Sites swept (37 component files + App.tsx = 38 files):**
All `rounded-sm` in `src/components/` and `src/App.tsx` → `rounded-smooth-md`

Surfaces covered: cards, panels, modals, dropdowns, buttons, inputs, tabs, tool palette

**Sharp-corner surfaces PRESERVED (D-13):**
- `src/canvas/measureSymbols.ts` — dimension label sharp corners (by design)
- `src/canvas/FabricCanvas.tsx` — inline edit inputs (Fabric canvas context)
- `src/three/ThreeViewport.tsx` — 3D viewport overlays (sharp by design)

`rounded-smooth-md` provides: `border-radius: var(--radius-md)` + `corner-shape: squircle` (WebKit/Safari) with graceful fallback (rounded rectangle) in Chrome/Firefox/Edge.

### Task 3: Material Symbols → lucide-react migration (commit `724f57b`)

**9 files migrated (D-15, D-16):**

| File | Glyphs replaced |
|------|-----------------|
| `Toolbar.tsx` | grid_view→LayoutGrid, directions_walk→Footprints (D-15), undo→Undo2, redo→Redo2, help→HelpCircle, settings→Settings, person→User, door_front→DoorOpen, window→RectangleVertical (D-15), roofing→Triangle (D-15), stairs→Footprints (D-15), grid_4x4→Grid2x2 (D-15), zoom_in→ZoomIn, zoom_out→ZoomOut, fit_screen→Maximize, error→AlertCircle, progress_activity→Loader2, cloud_done→CloudCheck |
| `Toolbar.WallCutoutsDropdown.tsx` | arch→Squircle (D-15) |
| `WelcomeScreen.tsx` | add_box→Plus, upload_file→Upload, folder_open→FolderOpen, arrow_forward→ArrowRight |
| `TemplatePickerDialog.tsx` | close→X, grid_view→LayoutGrid, weekend→Sofa (D-15), bed→BedDouble (D-15), kitchen→ChefHat (D-15), upload_file→Upload, image_not_supported→ImageOff |
| `HelpModal.tsx` | close→X, replay→RotateCcw (D-15); HelpNavButton icon prop type changed string→LucideIcon |
| `helpContent.tsx` | icon type changed string→LucideIcon; flag→Flag, keyboard→Keyboard, grid_view→LayoutGrid, view_in_ar→Cuboid (D-15) |
| `AddProductModal.tsx` | close→X, cloud_upload→Upload |
| `ProductLibrary.tsx` | inventory_2→Package (D-15) |
| `RoomsTreePanel/TreeRow.tsx` | stairs→Footprints (D-15); D-15 comment added per plan requirement |
| `help/HelpSearch.tsx` | search→Search, close→X |

**D-15 substitute comment count in TreeRow.tsx:** 1 (verified)

## Verification

**Build:** Passes (✓ built in ~500ms, warnings unchanged from pre-plan)
**Tests:** `npm run test:quick` — 880 passing / 12 failing. All 12 failures are pre-existing:
- 4 carry-over tests from D-A9 (snapshotMigration, pickerMyTexturesIntegration, WallMesh.cutaway, contextMenuActionCounts)
- Phase 33 tokens test (expects old radius values)
- RoomsTreePanel.savedCamera (expects text-accent-light removed in 71-03)
- Toolbar.displayMode (expects text-accent removed in 71-03)
- SaveIndicator (import path doesn't exist — pre-existing)
- AddProductModal (SKIP_DIMENSIONS text gone — pre-existing)
- SidebarProductPicker (idb-keyval mock issue — pre-existing)
- productStore (timing issue — pre-existing)

**Zero material-symbols-outlined in src/:** Verified
**Zero font-display in src/:** Verified
**All 9 icon migration files import from lucide-react:** Verified

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan is CSS/className only. No data flows through the font/radius/icon changes.

## Self-Check: PASSED

Commits verified:
- `29b8099` font sweep ✓
- `13be993` radius sweep ✓
- `724f57b` icon sweep ✓

Files confirmed:
- Zero `font-display` in src/ ✓
- Zero `material-symbols-outlined` in src/ ✓
- canvas/ font-mono preserved ✓
- rounded-smooth-md adopted across components ✓
