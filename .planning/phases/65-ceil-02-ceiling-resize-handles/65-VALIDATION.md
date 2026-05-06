---
phase: 65-ceil-02-ceiling-resize-handles
type: validation
created: 2026-05-04
status: ready
requirements: [CEIL-02]
---

# Phase 65: Ceiling Resize Handles (CEIL-02) — Validation Map

Per CONTEXT D-10 — 14 tests covering CEIL-02 unit + component + e2e behavior. Each test maps 1:1 to a CONTEXT decision and an implementation site in 65-01-PLAN.md.

## Coverage Summary

| Tier | Count | Framework | Quick Run |
|------|-------|-----------|-----------|
| Unit | 6 (U1-U6) | vitest 4.1.2 + happy-dom | `npx vitest run tests/lib/resolveCeilingPoints.test.ts tests/stores/cadStore.ceiling-resize.test.ts` |
| Component | 2 (C1-C2) | vitest + RTL | `npx vitest run tests/components/PropertiesPanel.ceiling-resize.test.tsx` |
| E2E | 6 (E1-E6) | Playwright 1.59.1 | `npx playwright test e2e/ceiling-resize.spec.ts` |
| **Total** | **14** | — | `npm test && npm run test:e2e` |

Pre-existing vitest failures: **4** — must remain exactly 4 after Phase 65 ships (validated in success criteria).

---

## Override-anchor model under test

The LOCKED model (planner-brief override of researcher Q7 recommendation):
- 4 new optional fields on `Ceiling`: `widthFtOverride`, `depthFtOverride`, `anchorXFt`, `anchorYFt`.
- East/south drag → use default anchors (bbox.minX / bbox.minY); only the override scalar is written.
- West/north drag → explicitly write anchorXFt = bbox.maxX (or anchorYFt = bbox.maxY) so the resolver scales every vertex from the OPPOSITE edge.
- `resolveCeilingPoints(ceiling)`: returns referential-identity `ceiling.points` when all 4 fields undefined; otherwise computes `newP = anchor + (p - anchor) * scaleFactor` per axis.

This model is the explicit subject of U1, U2, U3, E2, E3.

---

## Unit Tests (vitest)

### U1 — resolveCeilingPoints returns referential-identity points when no overrides

| Field | Value |
|-------|-------|
| **Description** | Construct a Ceiling with no override fields. Assert `resolveCeilingPoints(ceiling) === ceiling.points` (referential identity, not just deep-equal). Validates back-compat fast-path. |
| **CONTEXT decision** | D-03 (no version bump; back-compat); D-12 zero regressions |
| **Implementation site** | `src/lib/geometry.ts` resolveCeilingPoints; Task 1 |
| **File** | `tests/lib/resolveCeilingPoints.test.ts` |
| **Command** | `npx vitest run tests/lib/resolveCeilingPoints.test.ts -t "U1"` |
| **Pass criterion** | `expect(resolved).toBe(ceiling.points)` (Object.is identity). |

### U2 — Rectangular ceiling, widthFtOverride, default anchor (east drag semantics)

| Field | Value |
|-------|-------|
| **Description** | Ceiling at points=[(0,0),(10,0),(10,5),(0,5)]. Set widthFtOverride=15 (no anchorXFt). Assert resolved points = [(0,0),(15,0),(15,5),(0,5)]. Y unchanged; x scaled from minX=0. |
| **CONTEXT decision** | D-01 (proportional scaling), D-03 (override semantics) |
| **Implementation site** | `src/lib/geometry.ts` resolveCeilingPoints; Task 1 |
| **File** | `tests/lib/resolveCeilingPoints.test.ts` |
| **Command** | `npx vitest run tests/lib/resolveCeilingPoints.test.ts -t "U2"` |
| **Pass criterion** | All 4 vertices match within 1e-9 floating-point tolerance. |

### U3 — L-shape, widthFtOverride + anchorXFt = bbox.maxX (west drag semantics)

| Field | Value |
|-------|-------|
| **Description** | L-shape ceiling 6 vertices, original bbox.minX=0, bbox.maxX=10, width=10. Set widthFtOverride=5 AND anchorXFt=10. Assert: vertex with original x=10 stays at x=10 (anchor preserved); vertex with original x=0 moves to x=5 (anchor + (0-10)*0.5 = 5). Y unchanged. |
| **CONTEXT decision** | D-03 (override + anchor model), planner-brief Q7 override |
| **Implementation site** | `src/lib/geometry.ts` resolveCeilingPoints; Task 1 |
| **File** | `tests/lib/resolveCeilingPoints.test.ts` |
| **Command** | `npx vitest run tests/lib/resolveCeilingPoints.test.ts -t "U3"` |
| **Pass criterion** | Every vertex with original x===bbox.maxX preserved; other vertices scaled from that anchor. |

### U4 — Hexagonal, both widthFtOverride + depthFtOverride, default anchors

| Field | Value |
|-------|-------|
| **Description** | Hexagon ceiling. Set both width and depth overrides, leave anchorXFt/anchorYFt undefined. Assert each vertex scales independently along x and y from bbox.minX / bbox.minY anchors. Validates two-axis composition. |
| **CONTEXT decision** | D-01 (proportional any-polygon), D-03 |
| **Implementation site** | `src/lib/geometry.ts` resolveCeilingPoints; Task 1 |
| **File** | `tests/lib/resolveCeilingPoints.test.ts` |
| **Command** | `npx vitest run tests/lib/resolveCeilingPoints.test.ts -t "U4"` |
| **Pass criterion** | Both axes scale independently; bbox.minX vertex and bbox.minY vertex preserved. |

### U5 — resizeCeilingAxis pushes exactly one history entry; NoHistory pushes zero

| Field | Value |
|-------|-------|
| **Description** | Reset cadStore. Read past.length baseline. Call resizeCeilingAxis('id','width',10). Assert past.length === baseline + 1. Reset. Call resizeCeilingAxisNoHistory('id','width',10). Assert past.length === baseline (no change). |
| **CONTEXT decision** | D-05 (single-undo drag transaction), D-09 (cadStore actions mirror Phase 31) |
| **Implementation site** | `src/stores/cadStore.ts` resizeCeilingAxis + NoHistory; Task 1 |
| **File** | `tests/stores/cadStore.ceiling-resize.test.ts` |
| **Command** | `npx vitest run tests/stores/cadStore.ceiling-resize.test.ts -t "U5"` |
| **Pass criterion** | History delta is +1 for committed action, 0 for NoHistory variant. |

### U6 — clearCeilingOverrides deletes all 4 fields and reverts to original points

| Field | Value |
|-------|-------|
| **Description** | Set ceiling with widthFtOverride=15, depthFtOverride=8, anchorXFt=10, anchorYFt=5. Call clearCeilingOverrides(id). Assert: all 4 fields are undefined; resolveCeilingPoints returns referential-identity ceiling.points; past.length incremented by 1. |
| **CONTEXT decision** | D-06 (RESET action clears overrides), D-09 |
| **Implementation site** | `src/stores/cadStore.ts` clearCeilingOverrides; Task 1 |
| **File** | `tests/stores/cadStore.ceiling-resize.test.ts` |
| **Command** | `npx vitest run tests/stores/cadStore.ceiling-resize.test.ts -t "U6"` |
| **Pass criterion** | All 4 override fields undefined post-call; resolveCeilingPoints returns Object.is(ceiling.points). |

---

## Component Tests (vitest + RTL)

### C1 — PropertiesPanel ceiling section: WIDTH input dispatches resizeCeilingAxis(NoHistory)

| Field | Value |
|-------|-------|
| **Description** | Render `<PropertiesPanel />` with a selected ceiling. Assert WIDTH and DEPTH inputs present (queryByLabelText / queryByText 'WIDTH' + 'DEPTH'). Drive width input change to '12-0"' → assert resizeCeilingAxisNoHistory called with (id, 'width', 12). Press Enter → assert resizeCeilingAxis called once with (id, 'width', 12). |
| **CONTEXT decision** | D-08 (PropertiesPanel rows + Phase 31 single-undo pattern) |
| **Implementation site** | `src/components/PropertiesPanel.tsx` ceiling section; Task 5 |
| **File** | `tests/components/PropertiesPanel.ceiling-resize.test.tsx` |
| **Command** | `npx vitest run tests/components/PropertiesPanel.ceiling-resize.test.tsx -t "C1"` |
| **Pass criterion** | Both inputs rendered; NoHistory called mid-keystroke; resizeCeilingAxis called once on commit. |

### C2 — PropertiesPanel ceiling section: RESET_SIZE button conditional + dispatches clearCeilingOverrides

| Field | Value |
|-------|-------|
| **Description** | Render `<PropertiesPanel />` for a ceiling with widthFtOverride=10. Assert RESET_SIZE button is present (queryByText). Click → assert clearCeilingOverrides called with the ceiling's id. Re-render with NO overrides set → assert RESET_SIZE button is NOT present (queryByText returns null). |
| **CONTEXT decision** | D-06 (RESET_SIZE button conditional on any of 4 fields set) |
| **Implementation site** | `src/components/PropertiesPanel.tsx` conditional RESET button; Task 5 |
| **File** | `tests/components/PropertiesPanel.ceiling-resize.test.tsx` |
| **Command** | `npx vitest run tests/components/PropertiesPanel.ceiling-resize.test.tsx -t "C2"` |
| **Pass criterion** | Button visible iff any override field set; click dispatches clearCeilingOverrides. |

---

## End-to-End Tests (Playwright)

### E1 — 4 edge handles render at bbox midpoints

| Field | Value |
|-------|-------|
| **Description** | Place rectangular ceiling. Select it (click in 2D). Query Fabric canvas for objects with `data.type === 'resize-handle-edge' && data.ceilingId === <id>`. Assert exactly 4 handles, one each with edge='n','s','e','w'. Assert positions match bbox midpoints within pixel tolerance. |
| **CONTEXT decision** | D-02 (4 edge handles at bbox midpoints) |
| **Implementation site** | `src/canvas/fabricSync.ts` edge-handle render; Task 2 |
| **File** | `e2e/ceiling-resize.spec.ts` |
| **Command** | `npx playwright test e2e/ceiling-resize.spec.ts -g "E1"` |
| **Pass criterion** | 4 handles present at correct positions; each has the expected `data` payload. |

### E2 — East-edge drag preserves west edge (default anchor)

| Field | Value |
|-------|-------|
| **Description** | Place rect ceiling with bbox (0,0)→(10,5). __getCeilingBbox baseline = {minX:0, maxX:10, width:10}. Mouse drag east handle from scene-coord (10,2.5) to (12,2.5). On mouseup: __getCeilingBbox returns {minX:0, maxX:12, width:12}. minX preserved exactly. PropertiesPanel WIDTH input shows new value live during drag (DOM check partway through). |
| **CONTEXT decision** | D-01 (proportional scale), D-08 (live WIDTH update), planner-brief override-anchor model |
| **Implementation site** | Tasks 2, 3, 4, 5 |
| **File** | `e2e/ceiling-resize.spec.ts` |
| **Command** | `npx playwright test e2e/ceiling-resize.spec.ts -g "E2"` |
| **Pass criterion** | bbox.minX unchanged; bbox.maxX moved to 12; PropertiesPanel input updated mid-drag. |

### E3 — West-edge drag preserves east edge; anchorXFt is written

| Field | Value |
|-------|-------|
| **Description** | Same rect ceiling. Drag west handle from scene-coord (0,2.5) to (-2,2.5). On mouseup: __getCeilingBbox.maxX === 10 (east edge preserved); width === 12 (grew by 2). __getCeilingOverrides.anchorXFt === 10 (was bbox.maxX at drag start; the LOCKED model writes it explicitly during west drags). |
| **CONTEXT decision** | planner-brief override-anchor LOCKED model (Q7 override) |
| **Implementation site** | Task 3 selectTool west-edge branch |
| **File** | `e2e/ceiling-resize.spec.ts` |
| **Command** | `npx playwright test e2e/ceiling-resize.spec.ts -g "E3"` |
| **Pass criterion** | bbox.maxX === 10 (preserved); width === 12; anchorXFt persisted as 10. |

### E4 — Smart-snap engages on west-edge drag near a wall; Alt disables

| Field | Value |
|-------|-------|
| **Description** | Place a parallel wall at x=-2 (slightly off grid increment). Drag west edge to ~(-2.05, 2.5) — just past the wall. On release: cursor X snaps to exactly -2 (within 1e-9). Accent-purple snap guide visible during drag (Fabric query for snap-guide objects). Repeat the drag holding Alt → cursor X stays at -2.05 (snap disabled). Grid snap remains active in both cases. |
| **CONTEXT decision** | D-04 (Phase 30 consume-only smart-snap; Alt disables; grid persists) |
| **Implementation site** | Task 3 selectTool computeSnap dispatch + snapGuides render |
| **File** | `e2e/ceiling-resize.spec.ts` |
| **Command** | `npx playwright test e2e/ceiling-resize.spec.ts -g "E4"` |
| **Pass criterion** | Without Alt: cursor snaps to -2; guide visible. With Alt: no snap; cursor at -2.05 (or grid-snapped value). |

### E5 — Single Ctrl+Z undoes complete drag

| Field | Value |
|-------|-------|
| **Description** | Read __getCeilingHistoryLength baseline. Perform a complete east-edge drag with multiple mousemove events. Read history length post-mouseup → assert delta is exactly 1 (regardless of mousemove count). Press Ctrl+Z → ceiling reverts to original bbox dimensions; __getCeilingOverrides returns all-undefined. |
| **CONTEXT decision** | D-05 (Phase 31 drag-transaction single-undo pattern) |
| **Implementation site** | Task 3 mousedown push + NoHistory mid-drag |
| **File** | `e2e/ceiling-resize.spec.ts` |
| **Command** | `npx playwright test e2e/ceiling-resize.spec.ts -g "E5"` |
| **Pass criterion** | History delta === 1 after drag; Ctrl+Z reverts in one step. |

### E6 — L-shape proportional + Reset round-trip + conditional menu visibility

| Field | Value |
|-------|-------|
| **Description** | Place L-shape ceiling 6 vertices: (0,0)→(10,0)→(10,5)→(5,5)→(5,10)→(0,10). __getCeilingResolvedPoints baseline = those 6 points. Drag east edge from x=10 to x=12. Assert: vertices originally at x=10 are now at x=12; vertices originally at x=5 are now at x=6 (scale 12/10 from anchor x=0); vertices at x=0 unchanged. L-shape silhouette preserved. Right-click ceiling → 'Reset size' menu action visible. Click 'Reset size' → __getCeilingResolvedPoints round-trips back to the original 6 vertices. Right-click again → 'Reset size' action NOT in menu (no overrides). |
| **CONTEXT decision** | D-01 (any-polygon), D-06 (right-click Reset conditional), D-12 zero-regression L-shape preservation |
| **Implementation site** | Tasks 1 (resolver), 5 (CanvasContextMenu conditional) |
| **File** | `e2e/ceiling-resize.spec.ts` |
| **Command** | `npx playwright test e2e/ceiling-resize.spec.ts -g "E6"` |
| **Pass criterion** | All vertices scale proportionally from anchor; Reset round-trips polygon; menu action conditionally visible. |

---

## Sampling Rate

- **Per task commit:** `npm run test:quick` (vitest dot reporter)
- **Per task in Tasks 1, 5, 6:** task-specific `npx vitest run` / `npx playwright test` per the verify block.
- **Per wave merge:** `npm test`
- **Phase gate (before /gsd:verify-work):** `npm test && npm run test:e2e` all green.

## Wave 0 Gaps

- [x] `tests/lib/resolveCeilingPoints.test.ts` — created in Task 1 RED step (covers U1-U4)
- [x] `tests/stores/cadStore.ceiling-resize.test.ts` — created in Task 1 RED step (covers U5-U6)
- [x] `tests/components/PropertiesPanel.ceiling-resize.test.tsx` — created in Task 5 RED step (covers C1-C2)
- [x] `e2e/ceiling-resize.spec.ts` — created in Task 6 (covers E1-E6)
- [x] `src/test-utils/ceilingDrivers.ts` — created in Task 6

## Risk / Known Limitations

1. **L-shape anchor UX caveat:** the LOCKED override-anchor model captures the dragged edge's anchor at drag start. If the user drags east, releases, then drags west, the second drag captures the NEW post-east-drag bbox.maxX (correct). But if the user manually edits widthFtOverride via PropertiesPanel and then drags an edge, the anchor capture might differ from the user's mental model of "this edge stays put." Acceptable for v1.16; flag in HUMAN-UAT if Jessica reports confusion.
2. **3D mid-drag re-extrude:** CeilingMesh's useMemo re-runs on every override change (~60×/sec). Acceptable for v1.16 (flat ShapeGeometry, small polygons). Phase 25 PERF-01 16ms-throttle fallback documented in code comment for v1.17 if profiling shows GPU thrashing. NOT validated automatically — manual smoke per Task 4 done.
3. **E1 handle position pixel tolerance:** Fabric coordinate computations may differ by sub-pixel between platforms. Use ±2px tolerance in handle-position assertions.
4. **E4 smart-snap visibility:** Phase 30 snapGuides may render via fabric or DOM overlay. Test should query whichever pattern selectTool uses. If guides are rendered via Fabric, query for objects with type === 'snap-guide'; if DOM, query for the guide element class.
5. **Pre-existing 4 vitest failures:** must remain at exactly 4. If Phase 65 inadvertently fixes one, that's a regression-of-failure-count and the executor should flag it (not silently pass).

---

*Generated 2026-05-04 by gsd-planner from 65-CONTEXT.md (D-01 through D-12) with planner-brief override-anchor LOCKED model superseding researcher Q7 recommendation.*
