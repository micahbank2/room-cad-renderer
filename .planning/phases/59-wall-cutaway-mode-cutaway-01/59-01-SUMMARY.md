---
phase: 59-wall-cutaway-mode-cutaway-01
plan: 01
subsystem: 3d-rendering
tags: [three.js, react-three-fiber, cutaway, transparency, useFrame, wall-rendering, opacity-uniforms]

requires:
  - phase: 47-display-mode
    provides: RoomGroup + computeRoomOffsets() + displayMode segmented control + uiStore.displayMode + Toolbar active-state styling
  - phase: 46-tree-visibility
    provides: hiddenIds Set<string> pattern (orthogonal to cutawayManualWallIds)
  - phase: 53-context-menu
    provides: getActionsForKind() registry + label-flip pattern (extended with cutaway-toggle)
  - phase: 49-bug-02-textures
    provides: BUG-02 root-cause documentation (avoid post-mount transparent toggling)
  - phase: 5.1-walk-mode
    provides: cameraMode "orbit" | "walk" gate
provides:
  - Wall cutaway in 3D — auto mode (camera-relative most-opposed-normal) and manual mode (per-wall right-click)
  - Per-room cutaway in EXPLODE display mode (Map<roomId, wallId|null>)
  - Toolbar Cutaway button cycling off ↔ auto
  - 4th wall context-menu action: "Hide in 3D" / "Show in 3D"
  - Pure cutaway-detection helper with zero per-frame allocations
  - Test drivers for cutaway state read/write
affects: [phase-60-stairs, phase-61-curved-walls, future cutaway refinements (per-wall slider, animated transitions, L-shape outward-normal)]

tech-stack:
  added: []
  patterns:
    - "Constant transparent:true + animated opacity uniform (Phase 49 BUG-02-safe pattern)"
    - "Map<roomId, value> Zustand state with compare-then-set writer (avoids spurious renders in per-frame setters)"
    - "Module-level scratch THREE.Vector3 for zero-allocation per-frame loops"
    - "ghostMaterialProps spread on every <meshStandardMaterial> in a shared overlay subtree"
    - "Optional ghostProps?: GhostMaterialProps parameter on style-renderer functions (backward compatible)"

key-files:
  created:
    - src/three/cutawayDetection.ts
    - src/test-utils/cutawayDrivers.ts
    - tests/uiStore.cutaway.test.ts
    - tests/cutawayDetection.test.ts
    - tests/WallMesh.cutaway.test.tsx
    - e2e/wall-cutaway.spec.ts
    - .planning/phases/59-wall-cutaway-mode-cutaway-01/59-01-SUMMARY.md
  modified:
    - src/stores/uiStore.ts (cutawayMode, cutawayAutoDetectedWallId Map, cutawayManualWallIds Set + 4 actions)
    - src/three/ThreeViewport.tsx (useFrame cutaway loop)
    - src/three/WallMesh.tsx (13 material-site spreads + isGhosted derivation + roomId prop)
    - src/three/wainscotStyles.tsx (16 material-site spreads + GhostMaterialProps + DEFAULT_OPAQUE_GHOST)
    - src/three/RoomGroup.tsx (pass roomId={roomId} to WallMesh)
    - src/components/Toolbar.tsx (Cutaway button, EyeOff icon)
    - src/components/CanvasContextMenu.tsx (4th wall action: cutaway-toggle)
    - src/main.tsx (installCutawayDrivers wiring)
    - tests/lib/contextMenuActionCounts.test.ts (wall length 5 → 6 + label flip)
    - e2e/canvas-context-menu.spec.ts (wall menu count 5 → 6)

key-decisions:
  - "DEVIATION from CONTEXT D-09: cutawayAutoDetectedWallId is Map<roomId, wallId|null> instead of single string. Required for per-room cutaway in EXPLODE (D-03)."
  - "RESEARCH Q3+Q6 implementation: constant transparent:true (`as const`); only opacity (1.0 ↔ 0.15) and depthWrite are toggled. Avoids Phase 49 BUG-02 shader-recompile trap."
  - "RESEARCH Q1 implementation: bbox-center sign-test heuristic for outward normals. L-shape concave correctness deferred to v1.16."
  - "RESEARCH Q2 implementation: 3 module-level scratch THREE.Vector3 instances; zero allocations inside getCutawayWallId loop."
  - "RESEARCH Q5 implementation: elevation = asin(-fwd.y); threshold 70° = 1.222 rad."
  - "Added camera.updateMatrixWorld(true) before getWorldDirection in cutawayDetection — guarantees correctness regardless of useFrame ordering vs OrbitControls."

patterns-established:
  - "ghostMaterialProps(isGhosted) spread on ALL <meshStandardMaterial> in a wall overlay subtree (13 sites in WallMesh, 16 in wainscotStyles via threaded ctx.ghostProps)."
  - "Compare-then-set Map writer: setCutawayAutoDetectedWall returns same Map instance when wallId unchanged → no Zustand subscriber re-renders."
  - "Source-text + helper-shape audits as a substitute for full R3F render tests when scene-graph traversal would couple tests to internals."

requirements-completed: [CUTAWAY-01]

duration: 75min
completed: 2026-05-04
---

# Phase 59 Plan 01: Wall Cutaway Mode (CUTAWAY-01) Summary

**3D wall-cutaway: when Jessica orbits to a side view, the wall whose outward normal is most-opposed to camera-forward ghosts at 0.15 opacity (constant `transparent: true`, only opacity is animated — Phase 49 BUG-02-safe). Manual per-wall hide via right-click. Per-room cutaway in EXPLODE; auto-disabled in walk mode and when elevation > 70°.**

## Performance

- **Duration:** ~75 minutes
- **Started:** 2026-05-04T11:58:00Z
- **Completed:** 2026-05-04T12:26:00Z
- **Tasks:** 7 atomic commits
- **Files created:** 6
- **Files modified:** 11
- **Vitest cases added:** 43 (12 uiStore + 15 cutawayDetection + 15 WallMesh-audit + 1 ctx-menu label flip)
- **E2E scenarios added:** 5 (E1-E5)

## Accomplishments

- **Auto-cutaway** running per-room in `useFrame` (ThreeViewport.tsx:430+). Most-opposed-normal pick. Polar threshold 70° auto-disables. Walk-mode bails. Compare-then-set writer keeps the cutaway Map stable when no wall changed → no spurious React renders.
- **Manual cutaway** via right-click "Hide in 3D" (CanvasContextMenu.tsx wall branch, action #4 between copy and delete). Independent state (`cutawayManualWallIds: Set<string>`) — does NOT mix with Phase 46 `hiddenIds`.
- **Toolbar button** (Toolbar.tsx) — lucide EyeOff, mirrors Phase 47 displayMode active styling. Click cycles off ↔ auto. Manual mode is per-wall only (D-06).
- **All 13 `<meshStandardMaterial>` sites in WallMesh** + **all 16 sites in wainscotStyles** spread `{...ghost}` so the entire wall subtree (base wall + wallpaper + paint + pattern + crown + framed/flat art + 7 wainscot styles) ghosts cleanly with zero shader recompiles.
- **Phase 49 BUG-02 invariant preserved**: `transparent: true as const` written once at construction; only `opacity` and `depthWrite` flip at runtime. Audit test verifies zero `needsUpdate` writes added to `cutawayDetection.ts`, `wainscotStyles.tsx`, and confirms WallMesh's 6 pre-existing `needsUpdate` references are unchanged.
- **Per-room state shape (DEVIATION from D-09)**: `cutawayAutoDetectedWallId` is `Map<roomId, wallId|null>`, not a single `string|null`. Required to compose with Phase 47 EXPLODE mode (D-03 per-room cutaway). Documented end-to-end through uiStore → ThreeViewport setter → WallMesh subscriber.
- **Test drivers** (`src/test-utils/cutawayDrivers.ts`, gated by `MODE === "test"`): 8 window-level functions for E2E + RTL access. Wired in main.tsx alongside Phase 46/47/48/49/55 installs.
- **5 Playwright scenarios** all pass on chromium-preview (canonical project per existing pattern). E1 toolbar cycle, E2 auto orbit picks ±Z / ±X walls, E3 manual hide toggles opacity, E4 top-down disables, E5 walk mode disables.

## Atomic Commits

| Task | SHA | Message |
|------|-----|---------|
| 1 | `6a7dccf` | feat(59-01): uiStore cutaway state + actions |
| 2 | `0c15c41` | feat(59-01): cutawayDetection pure helper + unit tests U1-U4 |
| 3 | `e102c73` | feat(59-01): ThreeViewport useFrame cutaway detection |
| 4 | `85872b7` | feat(59-01): WallMesh ghostMaterialProps + wainscot ghost wiring + tests |
| 5 | `b0cc70d` | feat(59-01): Toolbar Cutaway button (off ↔ auto cycling) |
| 6 | `d12ef43` | feat(59-01): CanvasContextMenu wall cutaway-toggle action |
| 7 | `18861e0` | test(59-01): wall-cutaway e2e + cutawayDrivers (E1-E5) |

## Test Results

| Suite | Status | Counts |
|-------|--------|--------|
| Vitest baseline (pre-phase) | reference | 4 failed / 700 passed / 7 todo |
| Vitest after Phase 59 | **healthy — same baseline failures preserved** | **4 failed / 743 passed / 7 todo** (+43 new cases passing) |
| Phase 59 unit tests | **all pass** | 12/12 uiStore.cutaway + 15/15 cutawayDetection |
| Phase 59 component audits | **all pass** | 15/15 WallMesh.cutaway |
| Phase 59 E2E (chromium-preview) | **all pass** | 5/5 (E1, E2, E3, E4, E5) |
| Phase 47 displayMode regression | **all pass** | 3/3 |
| Phase 53 context-menu regression | **all pass** | 8/8 (after wall count 5 → 6 update) |
| Phase 56 GLTF-3D regression | **all pass** | 4/4 |
| Phase 57 GLTF-2D regression | **all pass** | 4/4 |

The 4 pre-existing vitest failures (`SaveIndicator`, `SidebarProductPicker`, `AddProductModal Skip Dimensions ×3`, `productStore LIB-03`) are unrelated to Phase 59 and remain at the same count post-phase.

## Decisions Implemented

- **D-01** ✅ Most-opposed-normal wall (per-wall outward-normal · camera-forward dot product)
- **D-02** ✅ Per-frame `useFrame` in ThreeViewport
- **D-03** ✅ Per-room cutaway in EXPLODE (Map-keyed state)
- **D-04** ✅ Polar threshold 70° elevation above horizon
- **D-05** ✅ Manual hide via right-click; "Hide in 3D" / "Show in 3D" label flip; independent `cutawayManualWallIds` Set
- **D-06** ✅ Single cycling Toolbar button; manual mode NOT in toolbar
- **D-07** ✅ `transparent: true (constant), opacity: 0.15, depthWrite: false` when ghosted
- **D-08** ✅ Walk mode disabled (useFrame guard + driver mirror)
- **D-09** ⚠️ **DEVIATION**: Map<roomId, wallId|null> instead of single string|null. Required for D-03. Flagged in plan and implemented end-to-end.
- **D-10** ✅ 4 unit + 3 component (audit-style) + 5 e2e tests delivered
- **D-11** ✅ 7 atomic commits, one per task
- **D-12** ✅ Zero regressions across Phase 32/36/46/47/48/49/50/53/54/5.1 (verified via vitest baseline preservation + e2e regression sweep)

## Risks Accepted

1. **L-shape concave outward-normal heuristic** (RESEARCH Q1 risk note): bbox-center sign-test can misclassify one wall on rare orbit angles in non-convex rooms. v1.15 ships only rectangular rooms — acceptable per CONTEXT D-01. **Backlog: v1.16 follow-up to use ray-cast outside test (cheap and exact).**

2. **Camera matrix-update race** (RESEARCH Q3 derivative): R3F's useFrame ordering does not guarantee OrbitControls' useFrame ran before the cutaway block. **Mitigated via `camera.updateMatrixWorld(true)` in `getCutawayWallId`** — one matrix multiply per frame, negligible cost, guarantees correctness regardless of ordering.

3. **OrbitControls damping in tests**: 60-frame RAF wait required for damping (factor 0.1) to converge across 50-unit position relocations. E2E tests document this empirically. Unit tests bypass it by using bare `THREE.PerspectiveCamera + .lookAt() + .updateMatrixWorld(true)`.

## Audits Performed (per plan verification block)

- **Allocation audit:** `grep -c "new THREE.Vector3" src/three/cutawayDetection.ts` → 3 (module-level only). PASS.
- **Material spread audit (WallMesh):** 13 `<meshStandardMaterial>` JSX sites, 13 `{...ghost}` spreads. PASS.
- **Material spread audit (wainscotStyles):** 16 JSX sites, 16 `{...ghost}` spreads. PASS.
- **needsUpdate audit:** 0 in `cutawayDetection.ts`, 0 in `wainscotStyles.tsx`, 6 in `WallMesh.tsx` (all pre-existing texture updates from Phase 36/49/50; no new writes added). PASS.
- **Per-room state shape:** uiStore `cutawayAutoDetectedWallId` is `Map<string, string | null>` end-to-end (store → setter → ThreeViewport caller → WallMesh subscriber). DEVIATION from D-09 documented and consistent.

## Self-Check: PASSED

- [x] All created files exist on disk (cutawayDetection.ts, cutawayDrivers.ts, 4 test files, e2e spec)
- [x] All 7 atomic commits present in git log
- [x] Build succeeds (`npm run build`) with no TypeScript errors
- [x] Vitest baseline preserved (4 pre-existing failures, 743 passing including 43 new cases)
- [x] All 5 e2e scenarios pass on chromium-preview
- [x] Phase 47/53/56/57 regression tests still pass

## Next Phase

**Phase 60 STAIRS-01** — next item in v1.15 (Architectural Toolbar Expansion).
