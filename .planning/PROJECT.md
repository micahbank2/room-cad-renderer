# Room CAD Renderer — Project Context

## What This Is

A personal interior design tool built for Jessica (Micah's wife) to plan and visualize their future home. She uploads products she actually loves — from Pinterest, specific stores, real items she's considering — places them in dimensionally accurate multi-room layouts, and walks through the space in 3D at eye level before buying anything.

This is a single-user personal tool. Not a SaaS, not a professional CAD app, not a collaboration platform.

## Core Value

**Jessica can see her future room with her actual furniture before spending money.** The magic moment: she uploads a photo of a couch she found, places it in a room with real dimensions, switches to walk mode, and feels whether it works.

## Current Milestone Goals — v1.18 Pascal Visual Parity

After v1.17 shipped the unified Material engine (Phases 67-68), v1.18 turns to the visual layer. Goal: make Room CAD Renderer **look extremely similar to Pascal Editor** while keeping every existing behavior, store, snapshot version, hotkey, and test driver functioning unchanged. The Obsidian CAD theme — dark blue cyberpunk, monospace UI chrome, sharp 2px corners, saturated purple accent — gets retired in favor of Pascal's neutral grays, soft 10px squircle radius, Barlow + Geist Sans, and floating action menu.

**Approach:** chrome-only rewrite. Every Zustand store, snapshot v6, Three.js mesh, Fabric.js renderer, and `__drive*` test driver continues to work. The 800+ existing test suite catches regressions. This is `src/index.css` token swap + per-component className/markup migration.

**Six phases in v1.18 (Phases 71-76):**

1. **TOKEN-FOUNDATION (Phase 71)** — Replace Obsidian palette with Pascal's oklch token system (16 semantic tokens — background/foreground/card/primary/secondary/muted/accent/destructive/border/input/ring/sidebar*/chart*); 10px base radius scale with optional `corner-shape: squircle`; Barlow + Geist Sans + Geist Mono fonts (drop IBM Plex Mono UI chrome); **light + dark dual-mode** support throughout.
2. **PRIMITIVES-SHELF (Phase 72)** — Build component primitives via `cva`: Button, Tab, PanelSection (collapsible accordion with spring animation), SegmentedControl, Switch, Slider, Tooltip, Dialog. Adopt `motion/react` (framer-motion v12) for layout/spring transitions.
3. **SIDEBAR-RESTYLE (Phase 73)** — Restyle Phase 46 rooms tree with Pascal's spine-and-branches geometry (1px gray line at left:21px, horizontal branches at 21px-32px); convert right sidebar to **contextual** (appears only when something is selected, not always-mounted).
4. **TOOLBAR-REWORK (Phase 74)** — **Floating two-row action menu replaces top-left toolbar entirely.** Top row: chunky tool icons (lucide-react at 1.5x size as fallback; commission isometric PNG icon set later if the look doesn't land). Bottom row: flat tool icons. Floating glass pill at canvas-bottom-center with `rounded-2xl border border-border bg-background/90 shadow-2xl backdrop-blur-md`.
5. **PROPERTIES-LIBRARY-RESTYLE (Phase 75)** — MaterialPicker (just shipped Phase 68), ProductLibrary, RoomSettings, PropertiesPanel adopt new tokens, primitives, and contextual mount pattern.
6. **MODALS-WELCOME-FINAL (Phase 76)** — Modal/Dialog primitives, WelcomeScreen and ProjectManager adopt **light mode** (Pascal's marketing/empty pages are light; editor is dark). Final QA pass, audit checklist, milestone close.

**Open decisions resolved during planning:**
- Lucide-icon fallback for the action menu's top row (no commissioned icons yet — defers cost; revisit if look is flat)
- Light mode in scope for v1.18 (Pascal's chrome is theme-aware; doing dark-only first then adding light is double work)
- Floating action menu **replaces** the top-left toolbar (half-measures look incoherent)
- Right sidebar **contextual** (more canvas room when nothing selected)

**Audit reference:** [.planning/competitive/pascal-visual-audit.md](competitive/pascal-visual-audit.md) — full token map, component patterns, and screenshots from `localhost:3002` Pascal boot.

**Deferred to v1.19 (carried over from v1.17):**
- **MAT-LINK-01** (Phase 69 → renumbered) — Product-to-material linking, finish slots. Issue [#26](https://github.com/micahbank2/room-cad-renderer/issues/26). Reason: redesigning the product library + material picker chrome in v1.18 means Phase 69's UI surfaces would have to be designed twice. Better to ship the new visual language first, then add finish-slot UI in the new style.
- **LIB-REBUILD-01** (Phase 70 → renumbered) — Library rebuild with top-level Materials / Assemblies / Products toggle. Issue [#24](https://github.com/micahbank2/room-cad-renderer/issues/24). Same reason — wait for v1.18 chrome.

**Deferred to v1.19+:** PBR maps extension (#81); CAM-05 (#127 EXPLODE saved-camera offset); parametric object controls (#28); window presets (#20); columns + levels/platforms (#19); R3F v9 / React 19 upgrade (#56).

---

## Current State

**v1.17 Library + Material Engine partial-ship 2026-05-07** (1-day milestone, ~7 hours wall-clock for the two phases that landed). 2 of 4 planned phases shipped; remaining 2 deferred to v1.19. PRs [#151](https://github.com/micahbank2/room-cad-renderer/pull/151) (Phase 67 — MAT-ENGINE-01) and [#152](https://github.com/micahbank2/room-cad-renderer/pull/152) (Phase 68 — MAT-APPLY-01). Phase 67: Material as first-class entity wrapping existing UserTexture references (D-09 wrapper architecture) — `src/types/material.ts` with `colorMapId`/`roughnessMapId`/`reflectionMapId` slots, real-world `tileSizeFt`, brand/SKU/cost/lead-time metadata, IndexedDB store mirroring Phase 32 user-texture pattern with SHA-256 dedup, 5-card library section (Modal + Card + Section + useMaterials hook + materialStore). Phase 68: unified surface-material model — snapshot v5→v6 migration auto-converts paint/wallpaper/floor/ceiling assignments to Material entries (idempotent async pre-pass), priority-1 `materialId` branches in WallMesh/FloorMesh/CeilingMesh/CustomElementMesh (per-face) + 2D Fabric.js `materialPatternCache`, unified `MaterialPicker` component mounted in PropertiesPanel/WallSurfacePanel/RoomSettings replacing per-surface paint/wallpaper/floor pickers, `applySurfaceMaterial` + `*NoHistory` action pair for single-undo apply, full Wave 0 → Wave 5 RED-to-GREEN flow with Playwright e2e GREEN on chromium-dev + chromium-preview. **Closed early:** Phase 69 (MAT-LINK-01) + Phase 70 (LIB-REBUILD-01) deferred to v1.19 to ship in v1.18 Pascal Visual Parity chrome instead of being designed twice. **Carry-over:** 4 legacy tests need contract updates (snapshot v5→v6 assertion, removed wallpaper "MY TEXTURES" tab, WallMesh cutaway ghost-spread audit on new material sites, contextMenuActionCounts test pollution) — fold into v1.18 Phase 71 cleanup. Audit `passed-with-carry-over` (5/5 must-haves verified). Pattern #7 (StrictMode-safe useEffect cleanup) applied in driver registration. ~10K LOC, 25 commits, 7/7 plans across 5 waves. **Lessons learned:** Wave 0 RED tests pinned the contract before any implementation — saved at least one round of re-do; module-eval driver install survives only when something always imports the module — moving driver registrations to dedicated `src/test-utils/*Drivers.ts` files (and importing from main.tsx) decouples them from UI mount paths; passing 7 plans through 4 parallel + 3 sequential agents in ~3.5 hours total wall clock validates the wave-based execute pattern at scale. Forward commitment: **v1.18 Pascal Visual Parity** — chrome rewrite to emulate pascalorg/editor, then v1.19 picks up Phase 69+70 in the new style.

**v1.16 Maintenance Pass shipped 2026-05-06** (single-day milestone, ~55 minutes wall-clock — fastest milestone in project history). 4 phases (63-66), 4 plans, 4 PRs ([#147](https://github.com/micahbank2/room-cad-renderer/pull/147), [#148](https://github.com/micahbank2/room-cad-renderer/pull/148), [#149](https://github.com/micahbank2/room-cad-renderer/pull/149), [#150](https://github.com/micahbank2/room-cad-renderer/pull/150)), 4/4 requirements (DEBT-06, BUG-04, CEIL-02, TILE-02). Mirrored the v1.12 maintenance-pass pattern after two big feature milestones back-to-back. **Two long-parked Phase 999.x backlog items dating back to v1.9 finally cleared:** 999.1 ceiling resize handles (re-deferred twice) and 999.3 per-surface tile-size override (re-deferred once). Phase 63 (DEBT-06): investigated [#146](https://github.com/micahbank2/room-cad-renderer/issues/146) cascade — could not reproduce in 3 deterministic local runs; the verifier's "10 failed" was likely transient flake or stderr-noise confusion. Hygiene cleanup shipped anyway: top-level `global.URL.createObjectURL` mutation in `pickerMyTexturesIntegration.test.tsx` and `myTexturesList.test.tsx` → `vi.spyOn` + `restoreAllMocks` per `userTextureCache.test.tsx:42-56` precedent. Phase 64 (BUG-04): real bug found and fixed — `WallMesh.tsx:218-223` registered material refs in test-mode `__wallMeshMaterials` registry but had no cleanup function (same React StrictMode double-mount class as Phase 58 thumbnail-callback bug). Fix: cleanup function with identity check `if (reg[wall.id] === matRefA.current) reg[wall.id] = null`. Plus 3000ms→8000ms timeout bump for chromium-dev (StrictMode 4 toggles × 2 = 8 effective render cycles). `--repeat-each=5` 10/10 green. Phase 65 (CEIL-02): ceiling resize handles via **override-anchor model** — 4 new optional fields on `Ceiling` (widthFtOverride, depthFtOverride, anchorXFt, anchorYFt). East/south drags use default anchors at bbox.min; west/north drags explicitly set the opposite-edge anchor (`anchorXFt = bbox.maxX` or `anchorYFt = bbox.maxY`) so the dragged edge moves with the cursor (not the opposite edge). `resolveCeilingPoints(ceiling)` resolver scales every polygon vertex from the anchor; original `Ceiling.points` array preserved as source of truth. L-shape ceilings supported via proportional bbox scaling. Phase 31 single-undo transaction; Phase 30 smart-snap consume-only with `excludeId: ceilingId`. Formal VERIFICATION 13/13 PASS. Phase 66 (TILE-02): investigation revealed Phase 42 (v1.9 closer) had already shipped data fields + actions + 2D/3D renderers + serialization. Phase 66 was just the missing UI tier — two `<input>` fields. Wallpaper TILE PATTERN was a checkbox toggle (stretch ↔ 2ft); v1.16 added a numeric input visible when tiling is on. Ceiling had no tile-size UI; v1.16 added one visible when a user-uploaded texture is applied. NO new types, NO new actions, NO snapshot bump. **Cross-phase wires:** Phase 30 snap engine + Phase 31 product types + snapshot version literal all `0 lines diff` vs pre-v1.16; `Ceiling.scaleFt` (Phase 42) and `Ceiling.widthFtOverride/depthFtOverride/anchorXFt/anchorYFt` (Phase 65) coexist with no field collision. **Audit `passed-with-notes`** — DEBT-06 cascade observed once during audit re-run (10 failed transient); pre-existing 4 baseline failures stable. **CLAUDE.md Pattern #7 (StrictMode-safe useEffect cleanup)** added between Phase 64 and 65, applied 3 times total in this milestone. 32 files modified, +3,713 LOC. **Lessons learned:** investigate before fixing (Phase 63 + Phase 66 both saved hours); capture recurring patterns (Pattern #7 caught third instance preemptively); backlog re-deferral is a signal — when a 999.x item gets parked twice, the next milestone needs explicit "stop adding features" framing. **Forward commitment: v1.17 TBD.**

<details>
<summary>Earlier milestones</summary>

**v1.15 Architectural Toolbar Expansion shipped 2026-05-06** (2-day milestone span). 4 phases (59-62), 4 plans, 4 PRs ([#142](https://github.com/micahbank2/room-cad-renderer/pull/142), [#143](https://github.com/micahbank2/room-cad-renderer/pull/143), [#144](https://github.com/micahbank2/room-cad-renderer/pull/144), [#145](https://github.com/micahbank2/room-cad-renderer/pull/145)), 4/4 requirements (CUTAWAY-01, STAIRS-01, OPEN-01, MEASURE-01). After v1.14 made the *furniture* real, v1.15 made the *room itself* richer. Phase 59 (CUTAWAY-01): wall cutaway via most-opposed-normal raycast (auto/off/manual modes); module-level scratch `THREE.Vector3` instances → zero per-frame allocation; constant `transparent: true` at material construction + animate `opacity` only (avoids Phase 49 BUG-02 shader-recompile pattern); per-room `Map<roomId, wallId>` state in EXPLODE; right-click "Hide in 3D" / "Show in 3D" via Phase 53 menu; toolbar single-button cycle off ↔ auto. Phase 60 (STAIRS-01): `Stair` as new top-level entity (NOT customElement.kind extension) — first new entity since Phase 33; default 7"×11"×36"×12 (residential IBC R311); **D-04 origin asymmetry** trap — `Stair.position` is bottom-step center but `axisAlignedBBoxOfRotated` expects bbox-center, tool translates by `totalRunFt/2` along UP axis before snap; **first Material Symbols D-33 allowlist expansion since Phase 33** (lucide-react has no Stairs icon; `TreeRow.tsx` joined the allowlist); snapshot v3→v4 with empty-maps migration. Phase 61 (OPEN-01): `Opening.type` enum extended to 5 kinds + optional `depthFt` field (no version bump — type extension is back-compat); archway via `Path.absarc(centerX, shaftTopY, radius, 0, Math.PI, false)`; niche as separate inset mesh on interior wall face — **critical sign convention** `+N_out × d/2` (recess INTO wall, not toward room); **D-11' lesson**: Phase 53/54 don't auto-inherit for openings, NEW wiring required (`ContextMenuKind` extended with `"opening"`, hit-test branch + `getActionsForKind('opening')` 4-action menu); Wall Cutouts toolbar dropdown mirrors WainscotPopover pattern. Phase 62 (MEASURE-01): `MeasureLine` + `Annotation` entities at room level; `polygonArea(walls)` shoelace winding-agnostic + connectivity check; `polygonCentroid` area-weighted formula for canvas overlay; `measureTool.ts` mirrors `wallTool.ts:34-232` closure-state with Phase 30 `computeSnap()` consume-only; `labelTool.ts` single-click + DOM-overlay edit (zIndex 30) with empty-text-removes; PropertiesPanel empty-state replaced with Room-properties branch + `AREA: XX SQ FT`; **2D-only by design** (3D billboards deferred to v1.16); snapshot v4→v5 chains cleanly. **Cross-phase wires:** Phase 30 snap engine **0 lines diff** (consume-only honored); `ContextMenuKind` union grew additively 5→9 (stair + opening + measureLine + annotation); snapshot version chain v3→v4→v5; Phase 47 RoomGroup composes with all new primitives. **Audit `passed`** — full chromium-preview e2e suite **85/85 green**. ~70 new vitest + 26 new e2e = ~96 new tests. 90 files modified, +15.7K LOC. **Lessons learned:** verify PR merge state before branching next phase (Phase 60 PR conflicts when Phase 61 branched ahead); stream timeouts on large phases recoverable if commits are atomic (Phase 60 + 62 both hit Anthropic API 529 mid-run, recovered cleanly); research catches assumption errors (Phase 61 D-11' caught the auto-inherit fallacy — saved a half-broken ship). **CI evolution:** workflow timeout bumped 20m→35m, then sharded by Playwright project to halve wall-clock. Forward commitment: **v1.16 TBD** — natural candidates from v1.14/v1.15 deferreds (OBJ format, GLTF animations, custom material overrides, LOD, R3F v9 + React 19 upgrade, columns + levels/platforms, window presets, parallel-vitest pollution fix, L-shape concave-room normal heuristic) or new direction.

<details>
<summary>Earlier milestones</summary>

**v1.14 Real 3D Models shipped 2026-05-05** (6-day milestone span). 4 phases (55-58), 4 plans, 4 PRs ([#137](https://github.com/micahbank2/room-cad-renderer/pull/137), [#138](https://github.com/micahbank2/room-cad-renderer/pull/138), [#139](https://github.com/micahbank2/room-cad-renderer/pull/139), [#140](https://github.com/micahbank2/room-cad-renderer/pull/140)), 4/4 requirements (GLTF-UPLOAD-01, GLTF-RENDER-3D-01, GLTF-RENDER-2D-01, GLTF-INTEGRATION-01). **The biggest user-visible win in project history.** Jessica can now upload an actual GLTF/GLB chair (Khronos sample, Wayfair download, IKEA scan) and see *that exact chair* rendered in 3D with embedded PBR materials, projected as its top-down silhouette in 2D, surfaced in the library with a Box badge and an auto-rendered thumbnail. Phase 55 (GLTF-UPLOAD-01): `src/lib/gltfStore.ts` IDB layer mirrors Phase 32 user-texture pattern with SHA-256 dedup + 25MB cap; new optional `gltfId?: string` on `Product`. Phase 56 (GLTF-RENDER-3D-01): `useGltfBlobUrl` hook with ref-counted ObjectURL cache (`useGLTF.clear(url)` BEFORE `revokeObjectURL`) + `GltfProduct` via drei `useGLTF` + `Box3.setFromObject` auto-scale (uniform smallest factor) + Y-floor offset + `<box3Helper>` selection outline (preserves PBR materials); ProductMesh refactored to branch on `gltfId` with Suspense + ErrorBoundary fallback. Phase 57 (GLTF-RENDER-2D-01): `src/lib/gltfSilhouette.ts` standalone GLTF load via `THREE.GLTFLoader.parseAsync(buf, "")` + per-vertex world-matrix projection + Andrew's monotone-chain convex hull (~30 lines inline); FIX-01-style async cache; `fabricSync.ts` branches on `product.gltfId` to render `fabric.Polygon` (rgba(202,195,215,0.15) fill + #7c5bf0 stroke); rename `onImageReady` → `onAssetReady`. Phase 58 (GLTF-INTEGRATION-01): `src/three/gltfThumbnailGenerator.ts` mirrors Phase 45 swatch generator — shared lazy-init WebGLRenderer, FOV-based camera framing `distance = (maxDim/2)/tan(fov/2) × 1.4` at 3/4 perspective, studio lighting, full disposal traverse for all 10 PBR maps + materials; `LibraryCard.badge?: ReactNode` slot at top-LEFT (X stays top-right); `ProductLibrary.resolveThumbnail` priority `imageUrl > gltfId > undefined`. Post-merge fix (`f5f6c46`): React StrictMode double-mount discarded the first onReady closure → fixed via `Set<() => void>` per gltfId firing all callbacks on resolve. Audit `passed` (cleanest milestone in project history relative to scope). 31 GLTF vitest + 14 GLTF e2e + 1 Phase 48 × GLTF e2e = 46 new tests, all green. Zero regressions on Phase 31/48/53/54/55/56/57. ~11K LOC across 59 files. Forward commitment: **v1.15 TBD** — natural candidates from v1.14 deferreds (OBJ format, GLTF animations, custom material overrides, LOD, R3F v9 / React 19 upgrade) or new direction.

<details>
<summary>Earlier milestones</summary>

**v1.13 UX Polish Bundle shipped 2026-04-28** (single-day milestone). 2 phases (53-54), 2 plans, 2 PRs ([#134](https://github.com/micahbank2/room-cad-renderer/pull/134), [#135](https://github.com/micahbank2/room-cad-renderer/pull/135)), 2/2 requirements (CTXMENU-01, PROPS3D-01). Editor-flow maturity milestone before v1.14's real-3D-models work. Phase 53 (CTXMENU-01): right-click context menus on canvas objects via single `CanvasContextMenu` component with `getActionsForKind()` registry; 2D Fabric `mousedown` button=2 + `getObjects()` scan (avoids Phase 25 PERF-01 evented:false pitfall); 3D R3F per-mesh `onContextMenu` + Canvas-level empty-canvas handler; auto-flip + 5 close paths (Escape / backdrop / item-click / right-click-elsewhere / resize-or-scroll); reuses Phase 46 hiddenIds, Phase 48 saved-camera, Phase 31 copy/paste (extracted to `src/lib/clipboardActions.ts` shared module). Phase 54 (PROPS3D-01): scope reality bigger than issue title — no 3D click-to-select existed at all; new `src/hooks/useClickDetect.ts` shared hook with 5px drag-threshold + button=0 check applied to all 4 mesh kinds; Canvas-level `onPointerMissed` clears selection with same drag guard; Phase 53 right-click coexists (different DOM events). Audit caught one cross-phase gap (CustomElementMesh missing `onContextMenu` after Phase 53 wired Wall/Product/Ceiling but not CustomElement) — 10-line fix committed inline before milestone tag.

<details>
<summary>Earlier milestones</summary>

**v1.12 Maintenance Pass shipped 2026-04-27** (single-day milestone). 4 phases (49-52), 7 plans, 4 PRs ([#129](https://github.com/micahbank2/room-cad-renderer/pull/129), [#130](https://github.com/micahbank2/room-cad-renderer/pull/130), [#131](https://github.com/micahbank2/room-cad-renderer/pull/131), [#132](https://github.com/micahbank2/room-cad-renderer/pull/132)), 4/4 requirements (BUG-02, BUG-03, DEBT-05, HOTKEY-01). Bug sweep + tech debt + 1 UX polish item — maintenance milestone after the v1.11 sprint. Phase 49 (BUG-02): wall user-textures render on first apply via direct `map={userTex}` prop on `<meshStandardMaterial>` — `<primitive attach="map">` was failing to set `material.needsUpdate=true` on null→Texture transition. Phase 50 (BUG-03): same direct-prop pattern applied to wallArt sites; research found Phase 49's fix incidentally fixed user-uploaded wallpaper (shared `useUserTexture` path). Phase 51 (DEBT-05): legacy FloorMaterial data-URL entries auto-migrate to userTextureId references on snapshot load — `loadSnapshot` refactored to async (Pattern A: async pre-pass before Immer `produce()`); 23 caller sites updated (7 production + 3 vitest + 12 e2e + 1 shared helper); snapshot version 2→3; idempotent + graceful-on-malformed; SHA-256 dedup via existing `saveUserTextureWithDedup`. Phase 52 (HOTKEY-01): keyboard shortcuts cheat sheet overlay via new single-source-of-truth registry at `src/lib/shortcuts.ts` consumed by both App.tsx keyboard handler AND helpContent.tsx display — 26 entries (was 19; added 7 missing: Ceiling C, Reset 0, Camera Presets 1-4, Copy/Paste); coverage-gate test prevents drift; one-char `openHelp("shortcuts")` bug fix. Audit `passed` — zero gaps, zero carry-over (cleanest milestone closeout in project history). ~5,700 LOC. The "bug sweep + 1 polish" thesis validated — every requirement shipped without scope creep, and Phase 51's heavy async refactor introduced zero regressions on Phase 32/35/36/46-48.

<details>
<summary>Earlier milestones</summary>

**v1.11 Pascal Feature Set shipped 2026-04-26** (2-day milestone span). 4 phases (45–48), 13 plans across 9 waves, 60+ commits, 4/4 requirements (THUMB-01, TREE-01, DISPLAY-01, CAM-04). Adopted the 4 strongest features from the Pascal Editor competitive audit. Phase 45 (THUMB-01): material picker swatches now auto-render from the live PBR pipeline via offscreen `swatchThumbnailGenerator` + `<MaterialThumbnail>` host. Phase 46 (TREE-01): sidebar Rooms hierarchy tree at the top of the panel with collapsible per-room nodes, click-to-focus camera via new `pendingCameraTarget` bridge, per-node eye-icon visibility cascade through `isHiddenInTree`. Phase 47 (DISPLAY-01): NORMAL/SOLO/EXPLODE Toolbar segmented control with architectural shift — ThreeViewport's Scene refactored from active-room-only to multi-room iteration via new `RoomGroup` wrapper. Phase 48 (CAM-04): each wall/product/ceiling/custom-element gains optional `savedCameraPos`/`savedCameraTarget` tuples (5 new `*NoHistory` setters mirror Phase 25/31 precedent), PropertiesPanel Save/Clear buttons capture live R3F camera via `getCameraCapture` bridge installed by ThreeViewport, tree double-click dispatches `focusOnSavedCamera` through Phase 46's bridge. Audit `passed_with_carry_over`: 1 medium-severity cross-phase gap deferred to Phase 999.4 ([GH #127](https://github.com/micahbank2/room-cad-renderer/issues/127)) — saved cameras don't account for EXPLODE room offsets in cross-mode use. 3 low-severity tech-debt items tracked. Each phase shipped through the same loop: discuss → plan → verify-plan → execute → preview-test → merge.

<details>
<summary>Earlier milestones</summary>

**v1.10 Evidence-Driven UX Polish shipped 2026-04-25** (single-day milestone). 2 phases (43, 44), 2 plans, 19 commits, +1,180/-42 LOC. Smallest milestone in project history. Phase 43 UI polish bundle closed 4 GH issues atomically — templates ship with default ceiling, `--color-text-ghost` token bumped to meet WCAG AA (fixes 124+ usages), SAVED badge enlarged, PropertiesPanel gains empty-state copy. Phase 44 reduced-motion sweep closed [GH #76](https://github.com/micahbank2/room-cad-renderer/issues/76) with two honest guards (wall-side camera tween + SAVING spinner) plus the verified-and-documented finding that snap guides needed no guard (no animation existed despite issue claim). **AUDIT-01 systemic resolution:** three milestones of recurring "phases ship with SUMMARY-only" pattern resolved by editing the global GSD workflow (`~/.claude/get-shit-done/workflows/audit-milestone.md`) to formalize SUMMARY.md as canonical evidence — future audits across all GSD projects benefit. Audit `passed_with_carry_over`. The "evidence-driven prioritization" pattern validated: 5 evidence-driven items shipped, 6 speculative items deferred (Pascal competitor-set committed for v1.11; rest parked).

<details>
<summary>Earlier milestones</summary>

**v1.9 Polish & Feedback shipped 2026-04-25** (single-day milestone). 3 phases (38, 39, 42), 4 plans, 22 commits, +2,840/-40 LOC. Closed v1.8 audit AUDIT-01 carry-over via Phase 38 (3 retroactive VERIFICATION.md backfills for Phases 35/36/37). Gathered real-use feedback from Jessica via async 5-question questionnaire (Phase 39) after the in-person hybrid format proved infeasible — result: zero friction reported, all 3 Phase 35 HUMAN-UAT items confirmed, 8 GH issues curated as v2.0 scope seeds. **Mid-milestone re-scope:** Phases 40 (CEIL-01 ceiling resize) and 41 (TILE-01 design-effect tile override) CANCELLED after Phase 39 contradicted both hypotheses ("ceilings went fine", "texture sizing feels right") — re-deferred to Phase 999.1 + 999.3 backlogs. Phase 42 added as v1.9 closer: Ceiling.scaleFt per-surface override added (mirrors Wallpaper.scaleFt + FloorMaterial.scaleFt), CeilingMesh resolver `ceiling.scaleFt ?? entry?.tileSizeFt ?? 2`, apply-time write in CeilingPaintSection, 4 new tests. Closes GH #96. Audit `passed_with_carry_over` (AUDIT-01 recurring: v1.9 phases also lack VERIFICATION.md). The mid-milestone re-scope is itself the biggest deliverable — validated the "feedback-first" sequencing pattern by acting on its own hedge.

<details>
<summary>Earlier milestones</summary>

**v1.8 3D Realism Completion shipped 2026-04-25.** 4 phases, 9 plans, 11/11 requirements complete (LIB-06/07/08, CAM-01/02/03, VIZ-10, DEBT-01..04). User-uploaded textures (drop JPEG/PNG/WebP → name + real-world tile size in feet+inches → apply to walls/floors/ceilings; 2048px longest-edge downscale + SHA-256 dedup to single IDB entry; snapshots reference by `userTextureId` only — zero `data:` strings >10KB and zero Blobs in JSON; orphan-deletion fallback to base hex color). Camera presets (eye-level / top-down / 3-quarter / corner via 4 lucide Toolbar buttons + bare `1`/`2`/`3`/`4` hotkeys; ~600ms easeInOutCubic tween with imperative damping toggle, live-capture cancel-and-restart, view-mode + walk-mode cleanup, reduced-motion instant-snap; full activeElement / viewMode / cameraMode / modifier guard chain; zero `cadStore.past` pollution + zero `useAutoSave` triggers). VIZ-10 permanent regression guard (Playwright harness across 4 surfaces × 2 projects + within-run pixel-diff via pixelmatch + GitHub Actions CI workflow; ROOT-CAUSE.md documents no-repro Branch B per R-04 — same texture UUID across 5 mount cycles, 14 goldens byte-identical, all 4 Phase 32 defensive-code pieces classified KEEP). Tech-debt sweep verifies 4 carry-over GH issues closed cleanly, deletes orphan `SaveIndicator.tsx`, finishes `effectiveDimensions` → `resolveEffectiveDims` migration with `@deprecated` JSDoc + 3 unused-import cleanups, backfills Phase 29 frontmatter, formally accepts 6 pre-existing vitest failures as permanent in deferred-items.md. 80 commits, +16,588/-242 LOC. Audit `passed_with_carry_over` (AUDIT-01: 3 phases lack VERIFICATION.md → tech debt for v1.9+). Issue #94 (VIZ-10) stays OPEN by design — no-repro ≠ fix.

<details>
<summary>Earlier milestones</summary>

**v1.7.5 Design System & UI Polish — Phase 33 shipped 2026-04-22.** 10 plans across 3 waves. Foundation tokens (`--text-*` / `--spacing-*` / `--radius-*` on Tailwind v4 @theme, `--radius-lg` 6→8px) + `lucide-react` installed. Typography ramp (mixed-case section/panel/button labels; UPPERCASE preserved for dynamic IDs, status strings, unit value labels per D-03/D-04/D-05). Zero arbitrary `p-[Npx]` / `m-[Npx]` / `rounded-[Npx]` / `gap-[Npx]` across Toolbar/Sidebar/PropertiesPanel/RoomSettings. Shared `useReducedMotion` hook, `CollapsibleSection` primitive with localStorage persistence (10 PropertiesPanel sections wrapped), `LibraryCard` + `CategoryTabs` primitives (ProductLibrary + CustomElementsPanel migrated; WainscotLibrary / Paint/Material / FramedArt deferred per D-31), `FloatingSelectionToolbar` (Duplicate + Delete above bbox), `GestureChip` (dismissible, 2D + 3D variants), rotation preset chips `[-90,-45,0,45,90]` with single-undo contract, `InlineEditableText` primitive (doc title + room tabs click-to-edit via Phase 31 LabelOverrideInput pattern). Closes GH #83-#90. Test baseline grew 340 → 424 passing (+45 Phase 33 tests + 39 other net); same pre-existing LIB-03/04/05 + App.restore failures unrelated (now 6, was 8 on main — improved by 2).

**v1.6 Editing UX shipped 2026-04-21.** 4 phases, 17 plans, 11/11 requirements complete (audit `passed`). Auto-save with debounce + SAVING/SAVED/SAVE_FAILED toolbar status + pointer-based silent restore on reload (Phase 28: SAVE-05, SAVE-06). Editable dimension labels via double-click overlay with feet+inches parser, single-undo guard preserved (Phase 29: EDIT-20, EDIT-21). Smart snapping with pure 427-LOC `snapEngine.ts` + Fabric `snapGuides.ts` renderer, edge/midpoint snap, accent-purple axis guides, Alt/Option disables (Phase 30: SNAP-01, SNAP-02, SNAP-03). Drag-to-resize with corner uniform + edge per-axis handles on products and custom elements; wall-endpoint drag with smart-snap closing Phase 30 D-08b deferral; per-placement label override on custom elements via `PropertiesPanel` input + live 2D render via `resolveEffectiveDims` resolver (Phase 31: EDIT-22, EDIT-23, EDIT-24, CUSTOM-06). Phase 25 drag fast-path preserved across all new editing branches (single undo entry per drag op). Test baseline grew 191 → 340 passing; same 6 pre-existing LIB-03/04/05 failures unrelated. 21 perceptual items auto-approved across 4 HUMAN-UAT.md files. Tech debt: orphan `SaveIndicator.tsx`, legacy `effectiveDimensions` coexists with `resolveEffectiveDims` (incremental migration).

**v1.5 Performance & Tech Debt shipped 2026-04-20.** 4 phases, 15 plans. Tool architecture refactored (18 `(fc as any).__xToolCleanup` casts eliminated, closure state across all 6 tools, shared `toolUtils.ts`). Drag fast-path landed (`renderOnAddRemove: false`, mid-drag Fabric-only mutation, single commit on mouse:up — DevTools ~99.9% clean frames over 47.7s). `cadStore.snapshot()` migrated to `structuredClone(toPlain(...))` — D-07 contract met; ≥2× speedup target missed at tested scales (~1.25× slower due to Immer-draft unwrap) but absolute latency <0.3ms, non-user-visible (accepted as tech debt). Both bugs fixed: product thumbnail async render (#42 closed) and ceiling preset material closed as perception-only Outcome A with regression guards (#43 closed). R3F v9 / React 19 upgrade documented in `.planning/codebase/CONCERNS.md` and tracked on GH #56 (execution deferred until R3F v9 stabilizes). Test baseline grew 168 → 191 passing; same 6 pre-existing failures unrelated.

**v1.4 shipped 2026-04-08.** All 6 deferred v1.3 verification gaps closed: wainscot inline edit via `WainscotPopover` + FabricCanvas dblclick, frame color override with single-undo pattern, sidebar scroll fix via `min-h-0`, copy-side action verified with unit tests. Label cleanup removed ~125 underscores from user-facing display text across 30+ files while preserving code identifiers (Obsidian CAD display/identifier separation convention established). Plus 10 Jess Feedback bugs fixed in parallel via PR #39 (welcome screen, wall/ceiling drag, product persistence, wall side alignment).

**v1.3 shipped 2026-04-06.** Full paint system (132 Farrow & Ball + custom hex), lime wash finish, bulk painting via multi-select, custom element edit handles, collapsible sidebars, unified surface material catalog. 12/16 requirements shipped; 4 polish items deferred to and completed in v1.4.

**v1.2 shipped 2026-04-05.** 29 requirements across 7 phases. Ceilings, floor materials, wallpaper, wall art, wainscoting, crown molding, custom element builder, framed art library, 7 wainscoting styles, per-side wall treatments.

**v1.1 shipped 2026-04-05.** 21 UX fixes across 6 phases. Zoom/pan, click accuracy, tool auto-revert, live dimensions, wall rotation, product resize, corner-perfect walls, edit handles, save status, welcome screen.

**v1.0 shipped 2026-04-05.** 14 requirements. Product library → 2D plans → 3D rendering → walkthrough → export → auto-save.

See `.planning/ROADMAP.md` for links to each milestone archive.

</details>

</details>


## Current Milestone: v1.18 Pascal Visual Parity

**Goal:** Make Room CAD Renderer look extremely similar to Pascal Editor. Adopt Pascal's design tokens, font stack, radius scale, layout patterns, and floating action menu. Every existing behavior, store, snapshot, hotkey, and test driver continues unchanged — this is a chrome-only rewrite.

**Target features (6 phases, Phases 71-76):**
- **Phase 71 / TOKEN-FOUNDATION** — Pascal oklch token system (16 semantic tokens), 10px squircle radius scale, Barlow + Geist Sans + Geist Mono fonts, light + dark dual-mode
- **Phase 72 / PRIMITIVES-SHELF** — Component primitives via `cva`: Button, Tab, PanelSection (collapsible spring accordion), SegmentedControl, Switch, Slider, Tooltip, Dialog. Adopt `motion/react` for layout/spring transitions
- **Phase 73 / SIDEBAR-RESTYLE** — Restyle Phase 46 rooms tree with Pascal's spine-and-branches geometry; convert right sidebar to **contextual** (only mounts when something selected)
- **Phase 74 / TOOLBAR-REWORK** — **Floating two-row action menu replaces top-left toolbar entirely.** Lucide-icon fallback at 1.5x size for the chunky top row (commission isometric PNGs later if look is flat); flat tools on bottom row
- **Phase 75 / PROPERTIES-LIBRARY-RESTYLE** — MaterialPicker, ProductLibrary, RoomSettings, PropertiesPanel adopt new tokens, primitives, and contextual mount pattern
- **Phase 76 / MODALS-WELCOME-FINAL** — Modal/Dialog primitives, WelcomeScreen + ProjectManager adopt **light mode** (Pascal pattern: editor dark, marketing/empty light), final QA pass + carry-over test cleanup from v1.17

**Sequencing intent:** Tokens before primitives before sidebar before toolbar before properties before final. Each phase visibly progresses the look without breaking the previous. Phase 71 alone makes the app monochrome-soft; Phase 72 alone replaces every button click feel; Phase 73 alone reshapes the sidebar; Phase 74 alone is the biggest "Pascal-feeling" leap; Phase 75 alone polishes the properties surface; Phase 76 alone closes the loop with light-mode marketing surfaces.

**Out of v1.18:**
- Functional changes — none. This is chrome-only.
- Commissioned isometric PNG icon set → revisit at end of v1.18 if lucide fallback is flat
- v1.17 carry-over phases (MAT-LINK-01, LIB-REBUILD-01) → **v1.19** in new chrome
- PBR maps extension (#81 — AO + displacement + emissive) → v1.19+
- Parametric object controls (#28) → v1.19+
- Window presets (#20) + columns/levels (#19) → v1.19+
- R3F v9 / React 19 upgrade (#56) → tracked separately, no dep on v1.18

**Format / scope locks:**
- Tailwind v4 stays (already aligned with Pascal)
- 16 oklch semantic tokens (no custom palette extensions in chrome — chart colors only for non-chrome viz)
- Lucide-only icon library (drop the 10-file Material Symbols allowlist; D-33 policy gets stricter)
- `cva` + `class-variance-authority` for variant management
- `motion/react` (framer-motion v12) for layout + spring + AnimatePresence
- `@radix-ui/react-slot` for `asChild` Button pattern
- Snapshot version stays v6 (no data changes)

**Tech debt acknowledged + accepted:**
- 4 legacy tests carry over from v1.17 needing contract updates — fold into Phase 71 cleanup pass
- 6 pre-existing vitest failures permanently accepted (Phase 37 D-02); CI vitest stays disabled
- AUDIT-01 substitute-evidence policy formalized in v1.10 audit. SUMMARY.md is canonical evidence.
- Squircle browser support varies — `corner-shape: squircle` is Safari/WebKit-only at writing; Chrome falls back to plain `border-radius`. Accepted as progressive enhancement.

## Target User

One person. Non-technical. Interior design enthusiast, not a professional. Comfortable with basic computer use. Thinks visually. Saves products from Pinterest, Instagram, and store websites.

## Context

- Building a home — this is for planning real purchases
- Existing tools fail because they lock you into preset catalogs or are too complex
- Jessica wants HER products in HER rooms at the right scale
- "Feel the space" matters as much as "does it fit"
- Desktop-first (laptop/monitor). iPad is future wishlist, not v1.
- Codebase grew ~17.1K insertions across v1.6 (auto-save hardening, dim-label parser, snapEngine + snapGuides, resizeHandles + wallEndpointSnap + resolver) on top of v1.5's ~14,355 LOC baseline

## Requirements

### Validated

**v1.0 Milestone (2026-04-05):**

- ✓ Product images render in 2D canvas (async FabricImage cache) — v1.0 (EDIT-09, Phase 1)
- ✓ Drag-and-drop from product library to canvas — v1.0 (EDIT-07, Phase 1)
- ✓ Product rotation in 2D via handles — v1.0 (EDIT-08, Phase 1)
- ✓ Editable wall dimension labels — v1.0 (EDIT-06, Phase 1)
- ✓ Auto-save with debounce + startup hydration — v1.0 (SAVE-02, Phase 1 + 5.1)
- ✓ Global product library persists across all projects — v1.0 (LIB-03, Phase 2)
- ✓ Product dimensions are optional — v1.0 (LIB-04, Phase 2)
- ✓ Product name search — v1.0 (LIB-05, Phase 2)
- ✓ 3D product rendering with uploaded textures — v1.0 (VIZ-04, Phase 3)
- ✓ Smooth 3D experience (PBR, soft shadows, procedural floor, Environment) — v1.0 (VIZ-06, Phase 3)
- ✓ Export 3D view as PNG — v1.0 (SAVE-03, Phase 3)
- ✓ Eye-level camera walkthrough with collision — v1.0 (VIZ-05, Phase 4 + 5.1)
- ✓ Multiple rooms per project with Ctrl/Cmd+Tab switching — v1.0 (ROOM-01, Phase 5)
- ✓ Room templates (living room, bedroom, kitchen, blank) — v1.0 (ROOM-02, Phase 5)

**Pre-v1 foundation (existing):**

- ✓ 2D room drawing + walls + doors/windows + undo/redo — existing
- ✓ Split view (2D + 3D) + orbit camera + wall extrusion — existing
- ✓ Project save/load via IndexedDB — existing
- ✓ Obsidian CAD design system + Welcome screen — existing

**v1.1 Milestone (2026-04-05) — 21 shipped requirements:**

- ✓ 2D canvas zoom + pan + fit-to-view — v1.1 (NAV-01/02/03, Phase 6)
- ✓ Door/window live placement preview — v1.1 (EDIT-10, Phase 7)
- ✓ Tool auto-revert to Select — v1.1 (EDIT-11, Phase 7)
- ✓ Wall rotation handle — v1.1 (EDIT-12, Phase 7.1)
- ✓ Live wall-length label while drawing — v1.1 (EDIT-13, Phase 7)
- ✓ Product resize with live W × D tag — v1.1 (EDIT-14, Phase 7.1)
- ✓ Prominent toolbar save status — v1.1 (SAVE-04, Phase 8)
- ✓ 2-CTA welcome screen — v1.1 (HOME-01, Phase 8)
- ✓ FLOOR_PLAN top-level tab — v1.1 (HOME-02, Phase 8)
- ✓ Template picker + upload floor plan — v1.1 (HOME-03, Phase 8)
- ✓ Broken welcome tabs removed — v1.1 (UI-01, Phase 8)
- ✓ X-junction wall caps — v1.1 (WALL-01, Phase 9)
- ✓ Dead-end wall caps — v1.1 (WALL-02, Phase 9)
- ✓ Mid-segment crossing caps — v1.1 (WALL-03, Phase 9)
- ✓ Wall endpoint drag handles — v1.1 (EDIT-15, Phase 10)
- ✓ Wall thickness handle — v1.1 (EDIT-16, Phase 10)
- ✓ Opening width resize handles — v1.1 (EDIT-17, Phase 10)
- ✓ Opening slide along host wall — v1.1 (EDIT-18, Phase 10)
- ✓ Live dim tag during all drags — v1.1 (EDIT-19, Phase 10)

**v1.2 Milestone (2026-04-05) — 29 shipped requirements:**

- ✓ Ceilings with editable height + material (CEIL-01/02/03/04, Phase 11)
- ✓ Floor materials — 8 presets + custom upload + scale/rotation (FLOOR-01/02/03, Phase 12)
- ✓ Per-wall wallpaper + wall art + wainscoting + crown molding (SURFACE/TRIM, Phase 13)
- ✓ Custom element builder with per-project catalog (CUSTOM-01..05, Phase 14)
- ✓ Framed art library with 3D frame geometry (ART-01..06, Phase 15)
- ✓ Per-side wall treatments (SIDE-01/02/03, Phase 17)
- ✓ Wainscoting style library — 7 real 3D styles + live preview (WAIN-01..04, Phase 16)

**v1.3 Milestone (2026-04-06) — 12 shipped requirements:**

- ✓ Full paint system — F&B catalog, custom hex, lime wash, recently-used, paint-all-walls (PAINT-01..07, Phase 18)
- ✓ Custom element edit handles — drag, rotate, resize (POLISH-01, Phase 19)
- ✓ Cmd+click multi-select + bulk paint (POLISH-05, Phase 19)
- ✓ Unified surface material catalog — floor + ceiling swatch picker (MAT-01/02/03, Phase 20)

*Deferred to v1.4 and completed there: POLISH-02, POLISH-03, POLISH-04, POLISH-06*

**v1.4 Milestone (2026-04-08) — 6 shipped requirements:**

- ✓ Wainscot inline edit via WainscotPopover on 2D canvas (POLISH-02, Phase 22)
- ✓ Copy wall treatments SIDE_A → SIDE_B with one click (POLISH-03, Phase 21)
- ✓ Frame color override per wall art placement with single-undo pattern (POLISH-04, Phase 21)
- ✓ Sidebar scrolls all sections when expanded (POLISH-06, Phase 21)
- ✓ All user-facing labels display spaces instead of underscores (LABEL-01, Phase 23)
- ✓ Dynamic label transforms use space-preserving format (LABEL-02, Phase 23)

**v1.5 Milestone (shipped 2026-04-20) — 7 complete, 1 partial:**

- ✓ Tool cleanup uses type-safe pattern (no `(fc as any).__xToolCleanup` — activate returns cleanup fn, held in useRef) (TOOL-01, Phase 24)
- ✓ Tool state held in closures, not module-level singletons (3 wrapper interfaces dissolved) (TOOL-02, Phase 24)
- ✓ `pxToFeet` + `findClosestWall` extracted to shared `src/canvas/tools/toolUtils.ts` (6 duplicates consolidated) (TOOL-03, Phase 24)
- ✓ Drag fast-path: mouse:move mutates Fabric object only, single store commit on mouse:up (`renderOnAddRemove: false`) — DevTools trace shows ~99.9% clean frames during drag (PERF-01, Phase 25)
- ⚠ `cadStore.snapshot()` uses `structuredClone(toPlain(...))` per D-07 contract — 0 `JSON.parse(JSON.stringify)` remain (PERF-02, Phase 25) **Partial:** ≥2× speedup target not met at tested scales (~1.25× slower due to Immer draft unwrap cost), absolute latency <0.3ms — never user-visible. See `milestones/v1.5-MILESTONE-AUDIT.md` and `.planning/phases/25-canvas-store-performance/25-VERIFICATION.md`.
- ✓ Product thumbnails render in 2D canvas on async image load via `productImageTick` + Group rebuild (FIX-01 / #42, Phase 26)
- ✓ Ceiling preset material bug closed as Outcome A — perception-only (PLASTER vs PAINTED_DRYWALL below JND); 4 regression guards locked the round-trip (FIX-02 / #43, Phase 26)
- ✓ R3F v9 / React 19 upgrade path documented in `.planning/codebase/CONCERNS.md § R3F v9 / React 19 Upgrade` and tracked on GH #56 (TRACK-01, Phase 27) — execution deferred until R3F v9 stabilizes

**v1.6 Milestone (shipped 2026-04-21) — 11 complete:**

- ✓ CAD scene auto-saves within ~2s of last edit; debounced so continuous drag does not cause save spam (SAVE-05, Phase 28)
- ✓ Toolbar shows `SAVING...` / `SAVED` / `SAVE_FAILED` via the v1.1 SAVE-04 surface (SAVE-06, Phase 28)
- ✓ Double-clicking a wall dimension label opens a feet+inches overlay input; Enter commits, Escape cancels; wall resizes from start point along existing angle (EDIT-20, Phase 29)
- ✓ Each dimension-label edit produces exactly one undo entry (EDIT-21, Phase 29)
- ✓ Selected product shows corner (uniform) + edge (per-axis) resize handles; drag updates `widthFt` / `lengthFt` with override schema, snapped to active grid (EDIT-22, Phase 31)
- ✓ Selected wall shows endpoint handles with smart-snap; Shift constrains orthogonal; Alt disables snap (EDIT-23, Phase 31)
- ✓ Drag-resize commits single undo entry at mouse-up; Phase 25 `shouldSkipRedrawDuringDrag` + `renderOnAddRemove:false` fast-path preserved (EDIT-24, Phase 31)
- ✓ Object edges snap to nearby wall + object edges within pixel tolerance, during both placement and repositioning (SNAP-01, Phase 30)
- ✓ Midpoint auto-centering on walls during drag (SNAP-02, Phase 30)
- ✓ Visible purple accent axis guide + midpoint dot appears on snap engagement, disappears on drag-end (SNAP-03, Phase 30)
- ✓ Placed custom elements accept a per-placement label override via `PropertiesPanel` input; 2D canvas renders override; empty reverts to catalog name; persists through save/load + undo (CUSTOM-06, Phase 31)

### Active

**v1.17 Library + Material Engine — 4 requirements scoped:**

- ✅ **MAT-ENGINE-01** (Phase 67) — User can upload a material with texture maps (color / roughness / reflection) + real-world tile size + brand/SKU/cost/lead-time metadata; persisted to IndexedDB via wrapper architecture (D-09: Material wraps existing UserTexture references). Closes [#25](https://github.com/micahbank2/room-cad-renderer/issues/25). _Validated in Phase 67._
- ⏳ **MAT-APPLY-01** (Phase 68) — User can apply any material from the library to any surface (walls, floors, ceilings, custom-element faces) through one unified picker, replacing today's split paint/wallpaper/floor-material flows. Closes [#27](https://github.com/micahbank2/room-cad-renderer/issues/27).
- ⏳ **MAT-LINK-01** (Phase 69) — User can swap a placed product's finish material without re-placing the object (product carries a finish slot referencing a material). Closes [#26](https://github.com/micahbank2/room-cad-renderer/issues/26).
- ⏳ **LIB-REBUILD-01** (Phase 70) — Sidebar library has top-level Materials / Assemblies / Products toggle with proper category tabs (Flooring, Wall coverings, Furniture, Lighting, etc.). Closes [#24](https://github.com/micahbank2/room-cad-renderer/issues/24).

### Out of Scope

- Multi-user / collaboration — single user only
- Export to contractors / CAD file formats — not needed
- Pricing integration / shopping lists — not for this product
- Mobile / iPad support — desktop only for now, iPad on v2 wishlist
- Professional drafting features (layers, annotations, blueprints)
- Backend / server / auth — stays local-first (IndexedDB)
- ~~GLTF/OBJ 3D model upload~~ — superseded: GLTF shipped in v1.14 (GLTF-UPLOAD-01..GLTF-INTEGRATION-01)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-first, no backend | Single user, personal tool. IndexedDB sufficient. | ✓ Good — no sync headaches, instant saves |
| Global product library | Jessica uploads once, uses across all projects. | ✓ Good — shipped as productStore separate from cadStore |
| Image-only products (no required 3D models) | Jessica saves screenshots from Pinterest/stores. | ✓ Good — textured boxes read as realistic enough |
| Optional dimensions | Some products she wants to see in the space — vibes over precision. | ✓ Good — placeholder dash works in 2D and 3D |
| Desktop-only | Laptop workflow. iPad can come later. | ✓ Good — no responsive compromises |
| React 18 (not 19) | R3F 8 + drei 9 had hook errors with React 19. | Locked — do not upgrade |
| Obsidian CAD design system (DS8) | Dark theme, purple accents, monospace labels. | Locked |
| Fabric.js for 2D, Three.js for 3D | Both read from same Zustand store. | Locked — clean one-way data flow |
| CADSnapshot v2 with migration | Multi-room needed wrapping shape; v1 → v2 migrateSnapshot. | ✓ Good — backwards-compatible |
| active-room selector pattern | Single null-guard call-site per action. | ✓ Good — 15 consumers wired cleanly |
| History-boundary drag pattern | One snapshot at mousedown, no-history per frame. | ✓ Good — smooth drags without history bloat |
| Module-level async caches (image/texture/floor) | Dedup concurrent loads, naturally dedup via Promise-valued cache. | ✓ Good — no double-fetch bugs |
| react-colorful for paint picker | Lightweight hex picker, no heavy deps. | ✓ Good — clean integration |
| Unified surface material catalog | One data file serves both floor and ceiling pickers. | ✓ Good — reduced duplication |
| Floor texture clone pattern | Clone cached texture, share source — independent repeat per consumer. | ✓ Good — split-view safe |
| Paint mutual exclusion (paintId clears surfaceMaterialId) | Single material state per ceiling, no ambiguous combos. | ✓ Good — clean UX |
| CollapsibleSection as file-scoped component | Only Sidebar uses it, no need for shared component. | ✓ Good — minimal surface area |
| onFocus history push + onChange NoHistory for color pickers | React onChange fires like native event — onBlur misses initial state; onFocus captures one snapshot per interaction. | ✓ Good — pattern reusable for any continuous input |
| Extend existing dblclick useEffect for wainscot popover (shared with dim-label editor) | Avoids handler collision; dim-label hit test returns early, wainscot check only runs when no label hit. | ✓ Good — canvas inline editor pattern established |
| Display-vs-identifier separation in Obsidian CAD theme | Display text gets spaces (ALL CAPS preserved); underscores reserved for code keys, CSS classes, test IDs, data attrs. | ✓ Locked convention |
| Integration checker substitutes for VERIFICATION.md when retrofit | Audit trail completeness not worth rebuilding if code is wired correctly and the agent-level check passes. | — Pending — use sparingly; prefer formal verification at execute-time |
| Closure-scoped tool state (v1.5, Phase 24) | Module-level singletons risked cross-canvas bleed; closures make per-activation state the default. Public-API bridges (pendingProductId, _productLibrary) intentionally kept module-scoped per D-07. | ✓ Good — 3 wrapper interfaces dissolved; leak-regression tests lock behavior |
| Drag fast-path bypasses store mid-drag (v1.5, Phase 25, D-01..D-06) | Per-frame store commits blew 60fps at realistic scene sizes; Fabric-only mutation + single mouseup commit keeps undo/redo behavior and paints clean frames. | ✓ Good — ~99.9% clean frames over 47.7s drag, single undo entry per op |
| `structuredClone(toPlain(...))` snapshots (v1.5, Phase 25, D-07) | Cleaner than JSON roundtrip semantically (handles Dates, Maps in principle) and standards-aligned. Immer drafts require `current()`-normalization before clone. | ⚠ Partial — contract met, ≥2× speedup target missed (~1.25× slower at 50W/30P). Absolute latency <0.3ms — not user-visible. Accepted tech debt. |
| FIX-02 closed as perception-only Outcome A (v1.5, Phase 26) | End-to-end code path verified correct; PLASTER #f0ebe0 vs PAINTED_DRYWALL #f5f5f5 differ ~3 L* — below JND. Regression guards added to lock the store setter → snapshot → JSON round-trip contract. | ✓ Good — GH #43 closed, 4 new tests |
| R3F v9 / React 19 upgrade: document now, execute later (v1.5, Phase 27, D-02) | Target majors locked (^9 R3F, ^10 drei, ^19 React); upgrade is documentation-only until R3F v9 stabilizes out of beta. | ✓ Good — CONCERNS.md single source of truth, GH #56 as persistent tracker |
| Pointer-based silent restore on app mount (v1.6, Phase 28, D-02/D-02a/D-02b) | Replaces broken listProjects hydration; single-write site in `useAutoSave` stores `room-cad-last-project` pointer; mount-time read in `App.tsx` loads last project or falls through to WelcomeScreen. | ✓ Good — reload restores scene exactly; WelcomeScreen only flashes on no-pointer or stale-pointer |
| SAVE_FAILED persists until next success, no auto-fade (v1.6, Phase 28, D-04a) | Jessica must see a failed save before closing the tab — auto-fade would hide data loss. | ✓ Good — `ToolbarSaveStatus` failed branch renders until next successful save clears it |
| Three-branch ordered regex for feet+inches parser (v1.6, Phase 29) | "First match wins" cleanly rejects ambiguous forms like `12 6` while accepting `12'6"`, `12'-6"`, `12ft 6in`, `6"`, decimals. | ✓ Good — 37/37 Phase 29 tests green |
| `window.__openDimensionEditor` / `__driveSnap` / `__drive*` test drivers (v1.6, Phase 29/30/31) | jsdom+fabric hit-test fragility makes pixel-accurate DOM events unreliable; driver bridges gated by `import.meta.env.MODE === "test"` let RTL specs exercise the underlying logic deterministically. | ✓ Good — locked into CLAUDE.md; zero production impact |
| Restricted wall-endpoint smart-snap scene (v1.6, Phase 30 D-08b → Phase 31 D-05) | Phase 30 deliberately left wall-endpoint drag untouched; Phase 31 built `wallEndpointSnap.ts` to exclude the wall being dragged from snap candidates, preventing self-snap degeneracy. | ✓ Good — 6/6 phase31WallEndpoint assertions green |
| Per-placement override schema — `widthFtOverride` / `depthFtOverride` / `labelOverride` (v1.6, Phase 31, D-02) | Placement-instance state separated from catalog state (Pitfall 4); `resolveEffectiveDims(placedProduct, product) = override ?? libraryDim × sizeScale`. | ✓ Good — resolver migration through 3D meshes, snap scene, fabricSync, selectTool |
| Edge-resize commits history at mousedown, not mouseup (v1.6, Phase 31, D-16) | Consistent with existing rotate/resize; mousedown snapshot is the pre-drag state; `*NoHistory` actions handle mid-drag. | ⚠ Minor — fires a history entry even if user starts drag but never moves. Consistent with existing patterns, accepted. |
| Legacy `effectiveDimensions` coexists with `resolveEffectiveDims` (v1.6, Phase 31) | Incremental migration — placement in productTool still uses legacy because fresh placements have no overrides; all consumers that handle PlacedProduct/PlacedCustomElement go through resolver. | — Pending — remaining legacy call-sites can be swept in v1.7 polish |

## Tech Stack (Current)

- React 18 + TypeScript + Vite 8
- Fabric.js v6 (2D CAD canvas)
- Three.js via @react-three/fiber v8 + drei v9 (3D viewport, walk mode via PointerLockControls)
- Zustand v5 + Immer (cadStore + uiStore + productStore + projectStore, undo/redo, auto-save)
- Tailwind CSS v4 (styling, Obsidian CAD theme inline in index.css)
- idb-keyval (IndexedDB persistence — projects + product library)
- Vitest + jsdom + @testing-library (340 passing tests + 3 todo; 6 pre-existing LIB-03/04/05 failures documented in deferred-items.md)
- IBM Plex Mono + Space Grotesk + Inter (typography)
- Material Symbols Outlined (icons)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-07 — Phase 67 (MAT-ENGINE-01) complete; v1.17 progress 1/4*
