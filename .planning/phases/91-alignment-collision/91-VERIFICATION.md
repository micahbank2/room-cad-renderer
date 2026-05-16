---
phase: 91-alignment-collision
verified: 2026-05-15T22:20:00Z
status: human_needed
score: 11/11 must-haves verified (automated); e2e suite needs runtime confirmation
human_verification:
  - test: "Run Playwright e2e suite for phase 91"
    expected: "All 6 specs in tests/e2e/specs/91-alignment-collision.spec.ts pass on chromium-dev"
    why_human: "Playwright e2e specs cannot be executed reliably from this verification environment (requires browser bring-up + dev server). The 6 specs exist in source and the underlying logic is unit-test-covered, but live drag flow + collision refuse should be confirmed by running: npx playwright test tests/e2e/specs/91-alignment-collision.spec.ts --project=chromium-dev"
  - test: "Visual: drag chair B's center toward chair A's center"
    expected: "Accent-purple vertical/horizontal guide line appears when centers align; chair B snaps so center-X = chair A center-X"
    why_human: "Visual snap-guide rendering can only be confirmed by eye"
  - test: "Visual: drag chair A onto chair B"
    expected: "Chair A stops at the last non-overlapping position. No toast, no red highlight, no haptic. Feels like the object 'won't go there'."
    why_human: "Silent-refuse 'feel' is a UX judgment call — does it feel like a wall or feel buggy?"
  - test: "Visual: chairs butt flush"
    expected: "Two 4ft chairs can sit at center-X 2 and 6 (edges touching at x=4) — drag NOT refused"
    why_human: "Strict-greater AABB math is unit-tested but the touch-vs-overlap feel needs eye check"
---

# Phase 91: Alignment + Collision Verification Report

**Phase Goal:** When dragging a placed object, snap to other objects' centers + edges with purple guides; refuse to drop on top of another object (silent collision refuse).

**Verified:** 2026-05-15
**Status:** human_needed (all automated checks pass; e2e + UX confirmation pending)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dragging A near B's center-X snaps centers + emits accent-purple guide on matched axis | VERIFIED | snapEngine.ts:445-459 emits `object-center` axis targets; scanAxis priority 3; tests/snapEngine.objectCenters.test.ts covers X+Y |
| 2 | Columns are both snap source AND snap target | VERIFIED | snapEngine.ts:251-262 collects columns into scene; selectTool.ts:1480-1494 adds "column" to isSmartSnapTarget + bboxKind; old D-08a skip removed (no grep hit for "Snap-engine path skipped") |
| 3 | Stairs are snap TARGETS only (not draggable in this phase) | VERIFIED | snapEngine.ts:269-282 contributes stair bbox+center using UP-axis offset; no stair drag handler added |
| 4 | 4-tier priority: midpoint(4) > object-center(3) > object-edge(2) > wall-face(1) — center beats edge at equal distance (D-05) | VERIFIED | snapEngine.ts:341-348 priority ternary; AxisWinner.priority typed `1\|2\|3\|4`; unit test Test 3 asserts center wins at equal distance |
| 5 | wouldCollide(entity, position, others) refuses overlap; silent — no toast/highlight | VERIFIED | objectCollision.ts:26-36 strict-greater AABB; selectTool.ts:1513-1532 early-return + clearSnapGuides on refuse (no UI feedback) |
| 6 | Snap fires first, then collision; Alt disables snap but NOT collision | VERIFIED | selectTool.ts:1484-1505 snap path; 1507-1532 collision check runs INDEPENDENTLY of altHeld |
| 7 | Walls are NOT collision targets (chair vs wall still placeable) | VERIFIED | wouldCollide only consumes cachedScene.objectBBoxes (walls stay in wallEdges segments — not bbox list) |
| 8 | Single-undo invariant preserved across refused-drag cycle | VERIFIED | selectTool.ts:1530 early-return skips fabric.set + store write on refuse; lastDragFeetPos preserved; SUMMARY 91-02 confirms driver-side mirror keeps history at exactly 1 |
| 9 | 1153+ vitest tests pass with 0 regressions | VERIFIED | `npm run test --run` → 1153 passed, 11 todo, 0 failures. 33 "errors" are pre-existing WebGL/jsdom canvas warnings in unrelated swatchThumbnailGenerator tests |
| 10 | Phase 91 unit tests pass (16 tests across 2 files) | VERIFIED | snapEngine.objectCenters.test.ts (10) + objectCollision.test.ts (6) = 16/16 pass |
| 11 | 6 e2e specs exist in 91-alignment-collision.spec.ts | VERIFIED (existence) / human_needed (runtime) | 3 describe blocks, 6 nested `test(...)` blocks. Runtime confirmation requires browser bring-up |

**Score:** 11/11 truths verified by automated checks. Truth #11 runtime needs human confirmation.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/canvas/snapEngine.ts` | `SceneGeometry.objectCenters: Point[]` + center collection + 4-tier priority | VERIFIED | Field at line 87; populated at lines 200-206 (pushBBoxAndCenter); priority renumbered at 341-348; TargetKind extended at 292 |
| `src/canvas/objectCollision.ts` | Pure `wouldCollide(BBox, BBox[]): boolean` AABB scan | VERIFIED | 36 LOC, no Fabric/store/DOM imports, strict-greater AABB |
| `src/canvas/tools/selectTool.ts` | Column branch in isSmartSnapTarget + computeDraggedBBox + drag handler; wouldCollide call between snap and apply | VERIFIED | Lines 1480-1494 (snap path); 1513-1532 (collision); 1556-1567 (column branch); D-08a skip removed |
| `tests/snapEngine.objectCenters.test.ts` | RED→GREEN unit tests for center snap + priority ladder + stair offset + column scene | VERIFIED | 10 test cases, all GREEN |
| `tests/objectCollision.test.ts` | AABB edge cases: touching, contained, disjoint, exclude-self | VERIFIED | 6 test cases, all GREEN |
| `tests/e2e/specs/91-alignment-collision.spec.ts` | 6 specs covering center snap + column-as-source + 4 collision cases | VERIFIED (existence) | 3 describes × 6 nested tests = 6 specs. Runtime: human_needed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| buildSceneGeometry | SceneGeometry.objectCenters | pushBBoxAndCenter helper called for products, custom elements, ceilings, columns, stairs | WIRED | snapEngine.ts:200-206 + 5 call sites |
| computeSnap | object-center axis targets | scanAxis with priority 3 | WIRED | snapEngine.ts:456-459 push to targetXs+targetYs |
| selectTool onMouseDown | cached scene built at drag start (includes column gating) | hit.type "product"\|"ceiling"\|"column" | WIRED | selectTool.ts:976 (verified via grep) |
| selectTool onMouseMove | smart-snap + collision check | isSmartSnapTarget gate then wouldCollide | WIRED | Lines 1480-1532 |
| collision detected | skip frame apply | early-return after clearSnapGuides | WIRED | Line 1530 `return;` bypasses all dragType branches |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| selectTool drag handler | cachedScene.objectBBoxes | buildSceneGeometry at mouseDown reads useCADStore.getState() (real Zustand store with rooms/walls/products/columns/stairs) | Yes | FLOWING |
| selectTool drag handler | snapped Point | computeSnap consumes draggedBBox + cachedScene; produces real coordinates that feed fabric.set + moveColumnNoHistory | Yes | FLOWING |
| wouldCollide | scene BBoxes | cachedScene populated from live store state (not hardcoded) | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full vitest suite | `npm run test --run` | 1153 passed, 11 todo, 0 failures | PASS |
| Phase 91 unit tests | `npm run test --run -- snapEngine.objectCenters objectCollision` | 16 passed in 2 files | PASS |
| D-08a skip removed | `grep "Snap-engine path skipped" src/canvas/tools/selectTool.ts` | No matches | PASS |
| Column in smart-snap | `grep 'dragType === "column"' src/canvas/tools/selectTool.ts` | Multiple matches including isSmartSnapTarget | PASS |
| wouldCollide imported + called | `grep "wouldCollide" src/canvas/tools/selectTool.ts` | Import + call site found | PASS |
| Playwright e2e | `npx playwright test ...` | NOT RUN | SKIP (human verification) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ALIGN-91-01 | 91-01 | Center-to-center snap on X and Y axes | SATISFIED | snapEngine.ts:456-459; tests Test 1+2 |
| ALIGN-91-02 | 91-01 | Per-axis snap (X and Y independently) | SATISFIED | scanAxis runs per-axis (existing Phase 30 invariant); Test 2 confirms Y axis |
| ALIGN-91-03 | 91-01 | Columns as snap source + target | SATISFIED | snapEngine.ts:251-262 (target) + selectTool.ts smart-snap inclusion (source) |
| COL-91-01 | 91-02 | Silent-refuse object collision | SATISFIED | objectCollision.ts + selectTool.ts:1507-1532 |

REQUIREMENTS.md was not found in repo root; requirement IDs sourced from PLAN frontmatter `requirements` field per phase convention.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | No TODO/FIXME/placeholder/stub patterns in phase 91 files |

### Human Verification Required

See frontmatter `human_verification` section. Four items:
1. Run playwright e2e suite — 6 specs need runtime confirmation
2. Visual: accent-purple guide on center alignment
3. Visual + feel: silent refuse on collision
4. Visual: touching-edges-OK case (chairs butt flush)

### Gaps Summary

No gaps. All must-haves verified by automated checks. The phase is functionally complete:
- Snap engine extended with `objectCenters` field; 4-tier priority ladder (midpoint > object-center > object-edge > wall-face) per D-05
- Columns participate as snap sources AND targets; D-08a skip removed
- Stairs participate as snap targets only (D-04)
- Pure `wouldCollide` AABB module; strict-greater so touching is OK
- Drag handler integrates snap → collision → apply in correct order; Alt disables snap but not collision
- Walls are NOT collision targets (still in `wallEdges`, not `objectBBoxes`)
- Single-undo invariant preserved via early-return refuse pattern
- 1153 vitest tests pass with 0 regressions; 16 new tests added for phase 91

Status set to `human_needed` (rather than `passed`) only because the 6 Playwright e2e specs need runtime confirmation in a browser environment — the specs exist in source, the underlying logic is unit-test-covered, and the SUMMARY documents successful execution, but live browser confirmation is the appropriate gate.

---

_Verified: 2026-05-15_
_Verifier: Claude (gsd-verifier)_
