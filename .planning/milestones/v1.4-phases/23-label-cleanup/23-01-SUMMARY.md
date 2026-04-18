---
phase: 23-label-cleanup
plan: 01
subsystem: ui-strings
tags: [labels, display-text, underscore-cleanup, obsidian-cad-theme]

requires:
  - phase: 21-deferred-feature-verification
    provides: "Stable v1.4 UI layer — no outstanding structural fixes during cleanup"
provides:
  - "All user-facing labels display spaces (ALL CAPS preserved)"
  - "Dynamic label transforms use space-preserving format, not underscore insertion"
  - "Clean separation between display text (spaces) and code identifiers (underscores preserved)"
affects: []

tech-stack:
  added: []
  patterns:
    - "Display-vs-identifier separation: .toUpperCase() for display, underscores only in code keys"

key-files:
  created: []
  modified:
    - src/App.tsx
    - src/canvas/fabricSync.ts
    - src/components/AddProductModal.tsx
    - src/components/AddRoomDialog.tsx
    - src/components/CeilingPaintSection.tsx
    - src/components/CustomElementsPanel.tsx
    - src/components/FloorMaterialPicker.tsx
    - src/components/FramedArtLibrary.tsx
    - src/components/HelpModal.tsx
    - src/components/PaintSection.tsx
    - src/components/ProductForm.tsx
    - src/components/ProductLibrary.tsx
    - src/components/PropertiesPanel.tsx
    - src/components/RoomSettings.tsx
    - src/components/RoomTabs.tsx
    - src/components/Sidebar.tsx
    - src/components/SidebarProductPicker.tsx
    - src/components/StatusBar.tsx
    - src/components/SwatchPicker.tsx
    - src/components/TemplatePickerDialog.tsx
    - src/components/Toolbar.tsx
    - src/components/WainscotLibrary.tsx
    - src/components/WainscotPopover.tsx
    - src/components/WallSurfacePanel.tsx
    - src/components/WelcomeScreen.tsx
    - src/components/help/HelpSearch.tsx
    - src/components/help/helpContent.tsx
    - src/components/help/helpIndex.ts
    - src/components/onboarding/OnboardingOverlay.tsx
    - src/components/onboarding/onboardingSteps.ts
    - src/data/roomTemplates.ts
    - src/data/surfaceMaterials.ts
    - src/three/ThreeViewport.tsx

key-decisions:
  - "Split work into three atomic commits: (1) remove dynamic transforms, (2) replace static labels, (3) fix surface material display labels. Each commit is independently revertable."
  - "Only label/display fields changed — IDs, CSS classes, data-testid, icon names, and store keys left intact"
  - "Template literal fixes applied: WALL_SEGMENT_{id} → WALL SEGMENT {id}, CEILING_{id} → CEILING {id}, {tool}_TOOL → {tool} TOOL"

patterns-established:
  - "Obsidian CAD theme label convention: ALL CAPS with spaces for display; underscore_case reserved for code identifiers only"

requirements-completed: [LABEL-01, LABEL-02]

duration: ~18min (3 atomic commits, 11:57 → 12:03 on 2026-04-06)
completed: 2026-04-06
---

# Phase 23 Plan 01: Label Cleanup Summary

**Removed underscore characters from ~125 user-facing labels across 30+ files while preserving ALL CAPS convention and leaving every code identifier, CSS class, test ID, icon name, and store key untouched.**

## Performance

- **Started:** 2026-04-06T11:45:10-04:00 (research)
- **Feature commits:** 11:57:34 → 12:03:42 (~6min active implementation)
- **Completed:** 2026-04-06T12:03:42-04:00 (commit b330315)
- **Files modified:** 33
- **Lines changed:** ~150 (mostly 1–2 char edits per location)

## Accomplishments

- Removed all 4 dynamic `.replace(/\s/g, "_")` transforms from RoomTabs, SidebarProductPicker, ProductLibrary, and PropertiesPanel
- Replaced ~125 static underscore labels with space-separated versions across 30 files
- Fixed template literals for dynamic labels: `WALL_SEGMENT_{id}` → `WALL SEGMENT {id}`, `CEILING_{id}` → `CEILING {id}`, `{tool}_TOOL` → `{tool} TOOL`
- Fixed help content, search index, and onboarding step references to match new labels
- Fixed surface material display labels in `surfaceMaterials.ts` (`WOOD_OAK` → `WOOD OAK`, `TILE_WHITE` → `TILE WHITE`, etc.) while keeping IDs unchanged
- Preserved all CSS classes, data-testid attributes, icon names, and store keys — verified by integration checker (2026-04-17): no stray underscores remain in display paths; `RoomTemplateId` type alias and object keys correctly kept as `"LIVING_ROOM"` (code identifiers)

## Task Commits

1. **Research** — `7957b43 docs(23): research label cleanup phase -- full underscore inventory`
2. **Plan** — `304affd docs(23): create phase plan for label cleanup`
3. **Dynamic transforms** — `ab01e49 feat(23-01): remove dynamic underscore transforms from display labels`
4. **Static labels** — `d1fab2a feat(23-01): replace all static underscore labels with spaces across 30 files`
5. **Surface materials** — `b330315 fix(23): replace underscores in surface material display labels`

## Files Created/Modified

33 files modified (see frontmatter). No files created.

## Decisions Made

- Three-commit split for revertability: dynamic transforms → static labels → surface materials. Each commit is independently testable and revertable.
- Strict separation between display (spaces) and code (underscores). `RoomTemplateId` type alias and lookup keys kept as `"LIVING_ROOM"` because they're code identifiers, not display strings.
- Template literals updated in-place rather than wrapped in helper — simpler diff, no new abstraction.

## Deviations from Plan

None. Plan files_modified list matched what was actually touched (with the addition of `surfaceMaterials.ts` caught in the follow-up fix commit).

## Issues Encountered

- Initial pass missed `surfaceMaterials.ts` label field — caught via manual review and fixed in `b330315` (6min after primary commit). Not a plan failure; the research inventory didn't include `src/data/*.ts` display label fields.

## Known Stubs

None.

## User Setup Required

None.

## Next Phase Readiness

- LABEL-01 and LABEL-02 both satisfied
- Last planned phase in v1.4 milestone
- Milestone ready for audit and close-out

## Self-Check: PASSED (retrofit 2026-04-17)

> Note: This SUMMARY.md was retrofit on 2026-04-17 during v1.4 milestone audit. Original phase shipped 2026-04-06 via commits ab01e49, d1fab2a, b330315 without generating the summary artifact. Content reconstructed from git history, plan file, and integration checker verification.

---
*Phase: 23-label-cleanup*
*Completed: 2026-04-06 (retrofit: 2026-04-17)*
