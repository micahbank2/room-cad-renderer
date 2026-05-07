---
phase: 71-token-foundation-token-foundation
plan: "02"
subsystem: design-system
tags: [tokens, sweep, pascal, obsidian, className, mechanical]
dependency_graph:
  requires: ["71-01"]
  provides: ["pascal-color-tokens-applied"]
  affects:
    - src/App.tsx
    - src/components/**/*.tsx
    - src/canvas/FabricCanvas.tsx
    - src/canvas/measureSymbols.ts
    - src/canvas/openingSymbols.ts
    - src/canvas/stairSymbol.ts
    - src/three/ThreeViewport.tsx
    - src/lib/export.ts
tech_stack:
  added: []
  patterns: ["Pascal semantic token className mapping (bg-background/card/popover/accent/secondary, text-foreground/muted-foreground, border-border/ring/primary)"]
key_files:
  created: []
  modified:
    - src/App.tsx
    - src/components/Toolbar.tsx
    - src/components/Sidebar.tsx
    - src/components/StatusBar.tsx
    - src/components/RoomSettings.tsx
    - src/components/PropertiesPanel.tsx
    - src/components/PropertiesPanel.OpeningSection.tsx
    - src/components/PropertiesPanel.StairSection.tsx
    - src/components/WelcomeScreen.tsx
    - src/components/ProjectManager.tsx
    - src/components/ProductLibrary.tsx
    - src/components/ProductForm.tsx
    - src/components/MaterialCard.tsx
    - src/components/MaterialPicker.tsx
    - src/components/MaterialsSection.tsx
    - src/components/MyTexturesList.tsx
    - src/components/HelpModal.tsx
    - src/components/AddProductModal.tsx
    - src/components/AddRoomDialog.tsx
    - src/components/CanvasContextMenu.tsx
    - src/components/CustomElementsPanel.tsx
    - src/components/CeilingPaintSection.tsx
    - src/components/DeleteTextureDialog.tsx
    - src/components/FloorMaterialPicker.tsx
    - src/components/FramedArtLibrary.tsx
    - src/components/PaintSection.tsx
    - src/components/RoomTabs.tsx
    - src/components/RoomsTreePanel/RoomsTreePanel.tsx
    - src/components/RoomsTreePanel/TreeRow.tsx
    - src/components/SidebarProductPicker.tsx
    - src/components/SurfaceMaterialPicker.tsx
    - src/components/SwatchPicker.tsx
    - src/components/TemplatePickerDialog.tsx
    - src/components/Toolbar.WallCutoutsDropdown.tsx
    - src/components/Tooltip.tsx
    - src/components/UploadMaterialModal.tsx
    - src/components/UploadTextureModal.tsx
    - src/components/WainscotLibrary.tsx
    - src/components/WainscotPopover.tsx
    - src/components/WainscotPreview3D.tsx
    - src/components/WallSurfacePanel.tsx
    - src/components/help/HelpSearch.tsx
    - src/components/help/helpContent.tsx
    - src/components/library/CategoryTabs.tsx
    - src/components/library/LibraryCard.tsx
    - src/components/onboarding/OnboardingOverlay.tsx
    - src/components/ui/CollapsibleSection.tsx
    - src/components/ui/FloatingSelectionToolbar.tsx
    - src/components/ui/GestureChip.tsx
    - src/components/ui/InlineEditableText.tsx
    - src/canvas/FabricCanvas.tsx
    - src/canvas/measureSymbols.ts
    - src/canvas/openingSymbols.ts
    - src/lib/export.ts
    - src/three/ThreeViewport.tsx
decisions:
  - "bg-obsidian-high (hover/badge) → bg-accent (Pascal neutral hover); bg-obsidian-high in active tool state → kept as bg-accent (neutral)"
  - "bg-accent text-white (brand-filled buttons: FramedArt, WainscotLibrary, CustomElements, ProductLibrary, Toolbar active tools) → bg-primary text-primary-foreground"
  - "text-accent (chrome chrome) → text-foreground; hover:text-accent preserved (neutral hover state)"
  - "border-accent/30 (focus rings) → border-ring; border-accent → border-primary"
  - "ring-offset-obsidian-low → ring-offset-card; ring-offset-obsidian-deepest → ring-offset-background"
  - "bg-outline-variant/20 in dividers → bg-border/50"
  - "snapGuides.ts #7c5bf0 preserved (canvas data, not chrome per D-06a)"
  - "Lighting.tsx #fff8f0/#f5f0e8 preserved (photographic intent)"
  - "stairSymbol.ts comment referencing outline-variant preserved (it is a comment only, not a className)"
metrics:
  duration_seconds: 461
  completed_date: "2026-05-07"
  tasks_completed: 1
  files_modified: 55
---

# Phase 71 Plan 02: Color Token Sweep Summary

Mechanical sweep of ~55 src/ files: replaced all Obsidian-era color classNames with Pascal semantic tokens. Zero behavior change — pure className substitution. Chrome now renders in Pascal neutral grays.

## What Was Built

### Task 1: Sweep obsidian-* + text-text-* + outline-variant + accent chrome classNames

Applied the full mapping table from RESEARCH.md §Token Mapping Table:

| Pattern | Files Hit | Result |
|---------|-----------|--------|
| `bg-obsidian-deepest/base` | 15 | `bg-background` |
| `bg-obsidian-low` | 30 | `bg-card` |
| `bg-obsidian-mid` | 10 | `bg-popover` |
| `bg-obsidian-high` | 20 | `bg-accent` |
| `bg-obsidian-highest/bright` | 8 | `bg-secondary` |
| `text-text-primary` | 25 | `text-foreground` |
| `text-text-muted` | 20 | `text-muted-foreground` |
| `text-text-dim` | 30 | `text-muted-foreground/80` |
| `text-text-ghost` | 35 | `text-muted-foreground/60` |
| `border-outline-variant/20` | 10 | `border-border/50` |
| `border-outline-variant/30` | 5 | `border-border/60` |
| `border-outline-variant` | 15 | `border-border` |
| `text-accent-light/dim/deep` | 15 | `text-foreground` / `text-muted-foreground` |
| `text-accent` (chrome, non-hover) | 35 | `text-foreground` |
| `bg-accent text-white` (filled buttons) | 8 | `bg-primary text-primary-foreground` |
| `border-accent/30` (focus) | 10 | `border-ring` |
| `border-accent` | 5 | `border-primary` |
| `focus:border-accent` | 1 | `focus:border-ring` |

**Canvas data preserved:**
- `src/canvas/snapGuides.ts` — `const GUIDE_COLOR = "#7c5bf0"` unchanged
- `src/three/Lighting.tsx` — `color="#fff8f0"` + `color="#f5f0e8"` unchanged
- `src/canvas/stairSymbol.ts` — hex constant `#938ea0` with comment referencing `outline-variant` is a code comment only; not touched

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] sed `bg-obsidian-high[^e]` regex ate trailing quote/backtick characters**
- **Found during:** Task 1 — build showed 5 "Unterminated string" errors
- **Issue:** `sed -e 's/bg-obsidian-high[^e]/bg-accent /g'` consumed the character following `bg-obsidian-high"` when that character was `"` or `` ` `` (matched by `[^e]`), producing truncated string literals in 7 files
- **Fix:** Identified 7 affected locations (Toolbar.tsx ×5, CanvasContextMenu.tsx, HelpModal.tsx, PropertiesPanel.tsx, OnboardingOverlay.tsx, MyTexturesList.tsx, LibraryCard.tsx, TreeRow.tsx, MaterialCard.tsx) and restored closing quotes/backticks manually
- **Files modified:** All listed above
- **Commits:** ee5a7c5 (main sweep), 8e3163f (InlineEditableText)

## Ambiguous `bg-accent` Decisions

The plan required per-site disambiguation of `bg-accent` (hover/highlight vs filled brand-purple):

- **Active tool buttons in Toolbar.tsx** (lines 453/471/495/508 with `shadow-[0_0_15px_rgba(124,91,240,0.3)]`): Changed to `bg-primary text-primary-foreground` — the glow shadow confirmed these were brand-purple active states.
- **`hover:bg-accent` everywhere**: Preserved — Pascal's `bg-accent` is neutral gray, making hover highlights semantically correct.
- **Form inputs (`bg-accent text-foreground border border-border/60`)**: Preserved as `bg-accent` — these are neutral fill, not brand.
- **Product/Art/Wainscot submit buttons with `text-white`**: Changed to `bg-primary text-primary-foreground` — white text on accent = brand button.

## Known Stubs

None — this is a pure className substitution with no UI behavior change.

## Self-Check: PASSED

- `grep -rln "obsidian-" src/ | grep -v __tests__ | wc -l` = 0 ✓
- `grep -rln "text-text-" src/ | grep -v __tests__ | wc -l` = 0 ✓
- `grep -rln "border-outline-variant" src/ | grep -v __tests__ | wc -l` = 0 ✓
- `grep -rln "text-accent-light|text-accent-dim|text-accent-deep" src/ | grep -v __tests__ | wc -l` = 0 ✓
- `grep -c '"#7c5bf0"' src/canvas/snapGuides.ts` = 1 ✓
- `grep -c '#fff8f0|#f5f0e8' src/three/Lighting.tsx` = 2 ✓
- Commit ee5a7c5: FOUND ✓
- Commit 8e3163f: FOUND ✓
- `npm run build` exits 0 ✓
