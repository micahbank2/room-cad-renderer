---
gsd_state_version: 1.0
milestone: v1.19
milestone_name: Material Linking & Library Rebuild
status: completed
stopped_at: "Completed 90-02-PLAN.md — #203 left-click pan on empty canvas shipped; Phase 90 COMPLETE"
last_updated: "2026-05-15T20:50:00.000Z"
last_activity: 2026-05-15
progress:
  total_phases: 20
  completed_phases: 14
  total_plans: 48
  completed_plans: 46
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 — v1.19 Material Linking & Library Rebuild complete; Phases 69+70+77 all shipped)

**Core value:** Jessica can see her future room with her actual furniture before spending money.
**Current focus:** Phase 84 complete — IA-08 shipped. v1.21 Sidebar IA & Contextual Surfaces milestone fully closed (8/8 IA requirements ✅).

## Current Position

Phase: 90-canvas-polish — COMPLETE (both plans shipped)
Plan: — (no active plan; Phase 90 closed)
Milestone: v1.20 Surface Depth & Architectural Expansion — COMPLETE. Phase 87 + Phase 88 + Phase 89 + Phase 90 ship as standalone polish phases per D-01.
Phases: 81 complete; 82 complete; 83 complete; 84 complete; 85 complete; 86 complete; 87 complete; 88 complete (88-01 + 88-02); 89 complete (89-01); 90 complete (90-01 + 90-02)
Status: Phase 90 COMPLETE — #201 + #202 + #203 all fixed. PR ready (Closes #201 #202 #203).
Last activity: 2026-05-15
Stopped at: Completed 90-02-PLAN.md — #203 left-click pan on empty canvas shipped; Phase 90 COMPLETE

## Decisions

- **D-A1 (audit-locked):** Adopt shadcn/ui v4 oklch token system as defined in pascal-visual-audit.md — 16 semantic tokens, no custom palette extensions in chrome (chart colors only for non-chrome viz). No accent purple in chrome.
- **D-A2 (audit-locked):** 10px base radius (`--radius: 0.625rem`) with sm/md/lg/xl computed; opt-in `corner-shape: squircle` as progressive enhancement (Safari/WebKit-only at writing).
- **D-A3 (audit-locked):** Font stack swap to Barlow + Geist Sans + Geist Mono. Drop IBM Plex Mono UI chrome; drop Space Grotesk display tier; UPPERCASE_SNAKE labels become mixed case throughout.
- **D-A4 (audit-locked):** Light + dark dual-mode first-class. Editor surfaces stay dark; WelcomeScreen + ProjectManager + scene-list adopt light mode (Pascal pattern).
- **D-A5 (user-confirmed):** Lucide-react icons only — drop the 10-file Material Symbols allowlist (D-33 policy stricter).
- **D-A6 (user-confirmed):** Floating two-row action menu **replaces** the top-left toolbar entirely.
- **D-A7 (user-confirmed):** Right sidebar becomes **contextual** — appears only when something is selected.
- **D-A8 (carry-over):** Phase 69 (MAT-LINK-01) + Phase 70 (LIB-REBUILD-01) deferred from v1.17 to v1.19 to ship in v1.18 Pascal chrome.
- **[Phase 71-76 decisions preserved]** — see v1.18 SUMMARY/VERIFICATION docs for v1.18 chrome decisions.
- [Phase 69]: Snapshot v6→v7 is trivial passthrough; GLTF finish deferred to v1.20; MaterialPicker customElementFace surface type reused for product finish
- [Phase 70]: Default library tab is Materials (not Products) — puts newest feature front and center
- [Phase 78]: MapBadge uses text-[10px] arbitrary value for sub-text indicator (smallest Pascal token text-sm=11px is too tall)
- [Phase 79-window-presets-win-presets-01-v1-20-active]: RED-tests-only Wave 0: 3 test files commit failing imports/drivers to lock the WIN-PRESETS contract in machine-readable form; Wave 1 catalog+bridge will turn unit/integration tests GREEN; Wave 2 UI will turn E2E + PropertiesPanel tests GREEN
- [Phase 79]: Plan 02 (Wave 1): WIN-PRESETS-01 catalog + bridge GREEN. Bridge persists across tool cleanup (Pitfall 1). 12/12 catalog tests + 3/3 bridge integration tests pass; 4 PropertiesPanel tests intentionally RED for Plan 03.
- [Phase 79]: Phase 79 Plan 03 (Wave 3): WIN-PRESETS-01 UI surface shipped. WindowPresetSwitcher + PropertiesPanel preset row + App.tsx mount. 19/19 unit tests GREEN; e2e blocked by pre-existing TooltipProvider harness issue (documented as deferred).
- [Phase 81]: Phase 81 Plan 01 (IA-02): Sidebar.tsx wraps all 7 left-panel sections in shared PanelSection with stable sidebar-* ids; only sidebar-rooms-tree defaults open; collapse state persists via localStorage[ui:propertiesPanel:sections]
- [Phase 81]: Phase 81 Plan 02 (IA-03 hover): uiStore.hoveredEntityId + RAF-coalesced setter; TreeRow onMouseEnter/Leave dispatches leaf-only; fabricSync renderers paint accent-purple outline on matched wall/product/ceiling/custom/stair; 2D-only per D-02 (3D hover deferred to Phase 82); e2e/tree-hover.spec.ts 2/2 GREEN
- [Phase 81]: Phase 81 Plan 03 (IA-03 rename, D-03 + D-04): WallSegment.name?:string + schema v7→v8 passthrough migration; cadStore.renameWall with empty-trim→delete; TreeRow dbl-click swaps to InlineEditableText; Camera passive indicator becomes interactive button (saved-camera moved from dbl-click to icon-click affordance); RoomsTreePanel onRename routes per-kind (room/wall/custom/stair); e2e/tree-rename.spec.ts 3/3 GREEN; 996 unit tests passing (0 regressions); Phase 81 COMPLETE
- [Phase 82]: Phase 82 Plan 01 (IA-04): RightInspector shell + per-entity inspectors under src/components/inspectors/; PropertiesPanel.tsx becomes ~100-line compat shim preserving empty-state Room properties block for Phase 62 test; uiStore.selectedOpeningId slice added (setter consumers land in Plan 82-03); 996/996 vitest pass, 0 regressions
- [Phase 82]: Plan 82-02 (IA-04): per-entity tab system on Wall/Product/CustomElement/Ceiling inspectors via Phase 72 Tabs primitive; D-03 reset via keyed inspector mount in RightInspector (not inner div — useState lives on the component itself); StairInspector stays flat per D-04; bulk-select stays untabbed per D-05; 1003/1003 vitest pass
- [Phase 82]: Plan 82-03 (IA-05): OpeningInspector renders Preset/Dimensions/Position tabs for windows (Type/Dimensions/Position for doors/archways/passthroughs/niches); WallInspector early-returns OpeningInspector when uiStore.selectedOpeningId matches; Phase 79 WindowPresetRow JSX lifted VERBATIM into the Preset tab (D-07 single-undo + D-08 derive-on-read invariants mechanically preserved); OpeningRow click sets selectedOpeningId (was accordion expand); D-06 data-testids verbatim; 1012/1012 vitest pass; Phase 82 COMPLETE
- [Phase 83]: Plan 83-01 (IA-06 + IA-07): FloatingToolbar restructured to 5 banded groups (Drawing/Measure/Structure/View/Utility) with mixed-case always-on labels; new icon-touch Button variant (h-11 w-11 = 44px WCAG 2.5.5 AAA); flex-wrap container with max-w-[min(calc(100vw-24px),1240px)]; all TooltipContent uses side="top" + collisionPadding={8}; WindowPresetSwitcher anchor bottom-32 -> bottom-44 to clear wrapped toolbar; all 18 pre-Phase-83 data-testids preserved verbatim; 6 additive toolbar-* testids added; 1012/1012 vitest pass; e2e spec committed. Resumed after prior executor crashed with 529 overload mid-Task-2; verified disk state then atomic-committed remaining tasks.
- [Phase 83]: Plan 83-02 (Phase 81 D-05 carry-over closure): Snap migrated from sidebar-snap PanelSection to FloatingToolbar Utility group as Radix Popover button (lucide Magnet icon, w-32 popover, 4 options Off/3in/6in/1ft, active=Check marker). Sidebar.tsx loses gridSnap/setGridSnap selectors + sidebar-snap PanelSection; Sidebar.ia02.test fixture trimmed 7→6 panels. New tests/e2e/specs/toolbar-snap.spec.ts (3 chromium-dev cases, 4.4s, all pass). Tooltip text dynamic per gridSnap value. Phase 83 COMPLETE; IA-06+IA-07 issues #175/#176 closeable on PR merge.
- [Phase 84]: Plan 84-01 (IA-08): tool-bound sidebar contextual visibility. Sidebar.tsx conditionally mounts 3 PanelSections per D-02 — sidebar-custom-elements visible when activeTool ∈ {select, product}; sidebar-framed-art + sidebar-wainscoting visible only when activeTool=select AND a wall is selected (full unmount, not CSS-hidden). PanelSection.tsx gains optional forceOpen prop (D-04): when true, renders expanded regardless of persisted state, NEVER mutates localStorage; sidebar-product-library passes forceOpen={activeTool === "product"} for auto-expand. New tests/Sidebar.ia08.test.tsx (19 cases) + tests/e2e/specs/sidebar-contextual-visibility.spec.ts. Phase 81 Sidebar.ia02.test.tsx split into default + wall-selected regimes (9 cases). 27/27 Phase 81+84 tests GREEN, 0 regressions vs HEAD (2 pre-existing transform failures in SaveIndicator + SidebarProductPicker are baseline, not Phase-84-induced). Phase 84 COMPLETE; v1.21 milestone fully shipped (8/8 IA requirements). Closes #177 on PR merge.
- [Phase 85]: [Phase 85]: Plan 85-01 (Wave 0 RED): snapshot v8->v9 + heightFtOverride on PlacedProduct + PlacedCustomElement + height store actions + StrictMode-safe __driveNumericInput test driver + 22 RED unit tests + 3 RED e2e tests. All schema/migration tests GREEN (28 total, 11 new + 17 existing); all 22 inspector RED tests fail with expected 'no element' signal. Zero regressions (1054/1054 pre-RED suite passing). 3 atomic commits: schema/store (25dc8bb), test driver (1dca148), RED tests (4c00087).
- [Phase 85]: Plan 85-02: dropped {product && ...} guard on Dimensions PanelSection so W/D/H inputs render with placeholder dims when catalog product is missing — required for e2e seed flow
- [Phase 85]: Plan 85-02: Position section now defaultOpen so X/Y inputs are mountable + match the 'type all 5 numbers at once' workflow
- [Phase 85]: Plan 85-02: fixed numericInputDrivers double-commit bug (was firing both el.blur() and synthetic focusout, doubling history); restored single-undo invariant
- [Phase 85]: Plan 85-03: combine Tasks 1+2 into one commit (same file, same import block); Position section default-open (mirrors Wave 2); X/Y use generic updatePlacedCustomElement (no dedicated CE mover action). Phase 85 COMPLETE — PARAM-01/02/03 shipped for both products + custom elements.
- [Phase 86]: Plan 86-01 (Wave 1 schema + store, COL-01/02/03 RED-first): Column type added with all D-05 fields (id, position, widthFt, depthFt, heightFt, rotation degrees, shape "box"|"cylinder", materialId?, name?, savedCamera*); RoomDoc.columns?: Record<string, Column> field; snapshot version 9 → 10; migrateV9ToV10 seed-empty per RoomDoc (NOT a passthrough — mirrors Phase 60 v3→v4 stair migration); ToolType union widened with "column"; 13 D-06 store actions + NoHistory siblings line-for-line mirror of stair pattern (clamp [0.25, 50] for size axes — narrower than stair's [0.5, 20] floor); clearSavedCameraNoHistory kind union widened to "column"; clearColumnOverrides D-03 resets heightFt to room.wallHeight. 19 new GREEN tests (6 migration + 13 store actions). 1095 unit tests passing (no regressions). 4 atomic commits.
- [Phase 86]: Phase 86-02: Column.position IS bbox center (no Stair-style UP-axis asymmetry) — simpler tool + render math; no snap-engine integration in v1.20
- [Phase 86]: Phase 86-02: Column hit-test inserted BEFORE wall in selectTool — D-01 Pitfall 4 (column wins when cursor in both); rotated AABB via cos/sin into local frame
- [Phase 86]: Phase 86-02: Column drag uses Phase 31 transaction pattern (empty updateColumn at drag-start + moveColumnNoHistory mid-stroke); no fast-path (cheap redraw)
- [Phase 86]: Phase 86-03: ColumnInspector with Dimensions/Material/Rotation tabs (D-08) mounts via RightInspector keyed on column.id; Reset-to-wall-height button (D-03) single-history-push verified by 12-case vitest suite; Columns group emitted in Rooms tree mirror of Phase 60 Stairs pattern; FloatingToolbar Cuboid Column button reads room.wallHeight at click time and bridges via setPendingColumn → setTool('column'); no C keyboard shortcut (collides with Ceiling — D-07 deferral)
- [Phase 87]: Plan 87-01 (THEME-01..05): standalone polish phase. SettingsPopover component (~70 lines, src/components/SettingsPopover.tsx) extracted as its own file (vs research's inline-in-TopBar recommendation) to anticipate future settings rows. D-03 honored — popover stays open after segment click (deliberately different from Phase 83 Snap auto-close, because theme is a "try it" choice). D-04 — three .light force-wrappers removed (WelcomeScreen:55, ProjectManager:69, HelpPage:83); .light CSS class definition preserved as reserved utility. 6 unit + 3 e2e tests; 1113/1113 vitest passing.
- [Phase 88]: Plan 88-01 (POLISH-01/02/03): Canvas theme bridge via getCanvasTheme() + setFabricSyncTheme() per-frame ref; FloatingToolbar mount hoisted; --border bumped to oklch(0.85). 1120/1120 vitest pass (1113 baseline + 7 new), 0 regressions. Refs #194, #195, #196.
- [Phase 88]: Plan 88-02 (POLISH-04 #197): mechanical typography sweep across 36 files, 187 occurrences (text-[9/10/11px] -> text-[11/12/13px]). Single safe-revert commit (c83d36c). 2 DO-NOT-BUMP exceptions preserved at FabricCanvas.tsx:820 (dimension-edit input) + :855 (annotation input). 1120/1131 vitest pass, 0 regressions; 8/8 critical e2e on chromium-dev. 2 pre-existing Wave 1 light-mode-canvas.spec.ts failures logged to deferred-items.md (chromium getComputedStyle oklch literal vs rgb regex — not 88-02 fallout). Phase 88 COMPLETE.
- [Phase 89]: Phase 89 Plan 01: Cover-fit + clipPath replaces Stretch in renderProducts; renderCustomElements refactored to Group-wrap rect+image+label so rotation propagates; productImageCache shared via UUID namespace (no key collision); imageUrl-trigger invalidation in productStore + cadStore; data-tag-based test queries to survive jsdom probe-div empty CSS var lookups
- [Phase 90]: Plan 90-01 (#201 #202): MutationObserver on <html>.class drives canvas-bg flip (useTheme local-state was insufficient — per-call useState); 208px canvas height shrink via h-[calc(100%-13rem)] reserves space for FloatingToolbar (pb-* didn't work — Fabric reads padding-inclusive getBoundingClientRect)
- [Phase 90]: Plan 90-02 (#203 D-06): left-click pan on empty canvas with Select tool — closure-scoped panStart in selectTool no-hit branch + _panActive module flag ORed into shouldSkipRedrawDuringDrag (mirrors _dragActive); FabricCanvas middle-mouse + Space+left pan paths UNTOUCHED. D-06 fit-resets-pan verified — no code change (uiStore.resetView + FloatingToolbar Fit button already correctly wired). Closure-scoped panStart was insufficient on its own: setPanOffset triggers redraw → tool re-activation → discards panStart, so _panActive gating is required. Phase 90 COMPLETE.

## Performance Metrics

(v1.19 — pending first phase execution)

## v1.19 Roadmap (Complete)

| Phase | Requirement | Goal | Status |
|-------|-------------|------|--------|
| 69 | MAT-LINK-01 | Finish slot on placed products — swap material without re-placing | ✅ Complete |
| 70 | LIB-REBUILD-01 | Library 3-tab rebuild: Materials / Products / Assemblies | ✅ Complete |
| 77 | TEST-CLEANUP-01 | Fix v1.18 carry-over test failures (TooltipProvider, Switch role) | ✅ Complete |
| Phase 78 P04 | 8 | 1 tasks | 3 files |
| Phase 79-window-presets-win-presets-01-v1-20-active P01 | 164s | 2 tasks | 3 files |
| Phase 79 P02 | 480 | 2 tasks | 2 files |
| Phase 79 P03 | 1320 | 3 tasks | 4 files |
| Phase 81 P01 | 320 | 2 tasks | 7 files |
| Phase 81 P02 | 35min | 3 tasks | 6 files |
| Phase 81 P03 | 25min | 3 tasks | 8 files |
| Phase 82 P01 | 21min | 4 tasks | 10 files |
| Phase 82 P02 | 11min | 3 tasks | 9 files |
| Phase 82 P03 | 18min | 4 tasks | 8 files |
| Phase 83 P01 | ~25min (resumed) | 4 tasks | 4 files |
| Phase 83 P02 | 13min | 3 tasks | 4 files |
| Phase 84 P01 | ~10min | 4 tasks | 5 files |
| Phase 85 P01 | ~25min | 6 tasks | 10 files |
| Phase 85 P02 | 10min | 3 tasks | 4 files |
| Phase 85 P03 | 6min | 3 tasks | 1 files |
| Phase 86 P01 | ~18min | 4 tasks | 9 files |
| Phase 86 P02 | 22 | 3 tasks | 11 files |
| Phase 87 P01 | ~8min | 4 tasks | 7 files |
| Phase 88 P01 | 35 | 4 tasks | 12 files |
| Phase 88 P02 | 8min | 2 tasks | 36 files |
| Phase 89 P01 | 16min | 4 tasks | 7 files |
| Phase 90 P01 | 20min | 3 tasks | 3 files |
| Phase 90 P02 | 35min | 2 tasks | 3 files |

## v1.20 Roadmap

| Phase | Requirement | Goal | Status |
|-------|-------------|------|--------|
| 78 | PBR-01–04 | AO + displacement map upload; 3D rendering; card indicators | Pending |
| 79 | WIN-01–02 | Window preset size picker; PropertiesPanel post-placement | Pending |
| 80 | PARAM-01–03 | Type exact width/depth/position for placed products | Pending |
| 81 | COL-01–03 | Columns & pillars — new entity, 2D + 3D, select/edit | Pending |

## Recent Milestones

- **v1.19 Material Linking & Library Rebuild** — shipped 2026-05-08 (3 phases: 69+70+77, all complete)
- **v1.18 Pascal Visual Parity** — shipped 2026-05-08 (6 phases: 71-76, audit `passed`)
- **v1.17 Library + Material Engine** — partial-shipped 2026-05-07 (2/4 phases — 67+68; 69+70 deferred to v1.19)
- **v1.16 Maintenance Pass** — shipped 2026-05-06 (4 phases, audit `passed-with-notes`)
- **v1.15 Architectural Toolbar Expansion** — shipped 2026-05-06 (4 phases, audit `passed`)

## Accumulated Context

- **Phase 69 depends on Phases 67 + 68 (both complete).** Material entity (`src/types/material.ts`), `materialStore`, `useMaterials` hook, and `MaterialPicker` component all exist and work. Phase 69 adds `PlacedProduct.finishMaterialId?: string` and wires it through 3D rendering.
- **Phase 70 depends on Phase 69 finishing the material story.** The 3-tab library reorganization uses: existing `materialStore` (Phase 67), existing `ProductLibrary` + `CategoryTabs` → Tab primitive (v1.18 Phase 72), existing upload flows (preserve end-to-end).
- **Phase 77 (test cleanup) is independent of 69+70.** Can run in parallel with Phase 69 planning. Fixes: 5 test files missing `<TooltipProvider>` wrapper (GH #163), AddProductModal test queries `role="checkbox"` → should be `role="switch"` (GH #164).
- **v1.18 primitives fully available.** Tab, Switch, Input, Dialog, Button, PanelSection — all in `src/components/ui/`. Phase 69 and 70 should use these.
- **Snapshot version is v6.** Phase 69 will bump to v7 (adds `finishMaterialId` to `PlacedProduct`). Phase 70 adds no data changes. Follow Pattern from Phase 51 (async pre-pass via `loadSnapshot` refactor).
- **StrictMode-safe useEffect cleanup pattern (CLAUDE.md #7)** required for any new module-level registry writes in Phase 69.
- **PlacedProduct.finishMaterialId:** New optional field. Resolver pattern: `finishMaterialId ?? (catalog default)`. All 3D mesh consumers must be updated (ProductMesh, GltfProduct). Single Ctrl+Z via existing `*NoHistory` action pair pattern.

## Next Step

Phase 90 (canvas polish) COMPLETE — all 3 Phase 89 UAT bugs fixed (#201 theme backdrop flip, #202 toolbar viewport reservation, #203 left-click pan on empty canvas). Ready to open PR (`Closes #201`, `Closes #202`, `Closes #203`). Phase 90 SUMMARY docs at `.planning/phases/90-canvas-polish/90-01-SUMMARY.md` + `90-02-SUMMARY.md`.

Next phase candidates (per ROADMAP):
- New UAT cycle on canvas after Phase 90 ships — Jessica may surface 3D viewport polish gaps.
- v1.22 scope per PROJECT.md if no canvas regressions surface.
