---
phase: 62-measurement-annotation-tools-measure-01
type: validation
created: 2026-05-04
status: ready
requirements: [MEASURE-01]
test_count: 16
---

# Phase 62: Measurement + Annotation Tools (MEASURE-01) — Validation Map

Per CONTEXT D-15. **16 total tests:** 4 unit, 3 component, 9 e2e.

Each test maps to one or more locked decisions and one or more `must_haves.truths` from `62-01-PLAN.md`. Wave 0 indicates the test must be authored BEFORE the production code it covers (TDD discipline).

---

## Unit Tests (vitest)

### U1 — `polygonArea(walls)` shoelace correctness

| Field | Value |
|-------|-------|
| **File** | `tests/lib/geometry.polygonArea.test.ts` |
| **Wave** | 0 (TDD) |
| **Decisions** | D-04 (auto room-area calculation) |
| **Truths** | "Auto room-area: polygonArea(walls) shoelace helper... returns 0 for non-closed loops (research pitfall 5)" |
| **Cases** | 10×10 axis-aligned square → 100 sq ft; L-shape (5×10 + 5×5 inset) → 75 sq ft (concavity + winding-agnostic); 3-4-5 right triangle → 6 sq ft; 2 walls → 0; both winding orders of same square → identical result (verifies `Math.abs`); non-closed loop (4 disconnected walls, dist > 1e-3) → 0 (pitfall 5); polygonCentroid for 10×10 square → (5, 5); polygonCentroid for L-shape → point inside the L (not in notch). |
| **Command** | `npx vitest run tests/lib/geometry.polygonArea.test.ts` |
| **Pass criteria** | All 7-8 cases green. |

---

### U2 — cadStore measureLine + annotation actions

| Field | Value |
|-------|-------|
| **File** | `tests/stores/cadStore.measure.test.ts` |
| **Wave** | 0 (TDD) |
| **Decisions** | D-01 (entity types), D-10 (cadStore actions) |
| **Truths** | "12 new actions per D-10: addMeasureLine / updateMeasureLine / removeMeasureLine + *NoHistory variants; addAnnotation / updateAnnotation / removeAnnotation + *NoHistory variants" |
| **Cases** | addMeasureLine returns id + writes to activeDoc.measureLines; updateMeasureLine merges patch; removeMeasureLine deletes entry; updateMeasureLineNoHistory does NOT push history (past.length unchanged); regular variants increment past.length by exactly 1; parallel set for Annotation actions; multi-room scoping (action on room A doesn't touch room B's maps). |
| **Command** | `npx vitest run tests/stores/cadStore.measure.test.ts` |
| **Pass criteria** | All 12+ cases green. |

---

### U3 — Snapshot v4 → v5 migration

| Field | Value |
|-------|-------|
| **File** | `tests/snapshotMigration.test.ts` (extends existing file) |
| **Wave** | 0 (TDD) |
| **Decisions** | D-02 (snapshot version bump), D-17 (back-compat) |
| **Truths** | "Snapshot v4 → v5 migration (D-02)... Existing v4 snapshots (Phase 60-era with stairs) load with both maps seeded as {}. Migration chain v2→v3→v4→v5 runs in sequence." |
| **Cases** | (a) v4 input gets measureLines + annotations seeded as empty maps and version bumps to 5; (b) v5 passthrough is a no-op (idempotent); (c) preserves existing rooms data (walls, products, stairs) unchanged; (d) chained v3→v4→v5 migration on a v3 input produces correct v5 result; (e) updated existing 'empty/unknown input' test — defaultSnapshot version 4→5; RoomDoc seeds gain measureLines:{} + annotations:{}. |
| **Command** | `npx vitest run tests/snapshotMigration.test.ts` |
| **Pass criteria** | All v4→v5 cases green; pre-existing v2→v3 + v3→v4 cases still green; pre-existing 4 vitest failures remain exactly 4. |

---

### U4 — RoomDoc default seeds + ToolType union extension (covered inside U2/U3)

| Field | Value |
|-------|-------|
| **File** | Spread across `tests/stores/cadStore.measure.test.ts` + `tests/snapshotMigration.test.ts` |
| **Wave** | 0 (TDD) |
| **Decisions** | D-01, D-02, D-14 |
| **Truths** | "ToolType union extends with 'measure' | 'label'... defaultSnapshot()'s default RoomDoc seeds measureLines: {} + annotations: {}" |
| **Cases** | Type-narrowing assertion that ToolType accepts 'measure' and 'label' (compile-level via `const t: ToolType = 'measure'`); defaultSnapshot returned object has `version === 5` and each room has `measureLines: {} + annotations: {}`. |
| **Command** | Same as U2 + U3 |
| **Pass criteria** | Compile clean + runtime asserts pass. |

---

## Component Tests (vitest + RTL)

### C5 — PropertiesPanel renders AREA when room is implicit selection

| Field | Value |
|-------|-------|
| **File** | `tests/components/PropertiesPanel.area.test.tsx` |
| **Wave** | 0 (TDD) |
| **Decisions** | D-04 (PropertiesPanel side) |
| **Truths** | "PropertiesPanel renders Room properties branch when nothing selected (replaces lines 273-287 empty-state) showing WIDTH / LENGTH / HEIGHT / AREA: XX SQ FT rows" |
| **Setup** | Mount PropertiesPanel with cadStore initialized to a 10×10 room (4 closed walls); no entity in selectedIds. |
| **Assertions** | `screen.getByText(/AREA/)` exists; `screen.getByText(/100 SQ FT/)` exists; AREA row hidden when polygonArea returns 0 (e.g., non-closed loop fixture). |
| **Command** | `npx vitest run tests/components/PropertiesPanel.area.test.tsx` |
| **Pass criteria** | Both visible-state and hidden-state cases pass. |

---

### C6 — Annotation edit dispatches NoHistory mid-keystroke + commits via update on Enter

| Field | Value |
|-------|-------|
| **File** | `tests/components/PropertiesPanel.area.test.tsx` (same file, separate describe block) |
| **Wave** | 0 (TDD) |
| **Decisions** | D-07 (label edit flow), D-13 (single-undo) |
| **Truths** | "user types → Enter or click-outside commits... onLivePreview → updateAnnotationNoHistory; onCommit → updateAnnotation" |
| **Setup** | Seed cadStore with one annotation. Set uiStore.editingAnnotationId. Render the FabricCanvas overlay (or extract the InlineEditableText subtree as a focused render target). |
| **Assertions** | Simulate typing 'X' via fireEvent.change → assert `useCADStore.getState().rooms[roomId].annotations[id].text === 'X'` AND past.length unchanged after each keystroke. Press Enter → assert past.length increased by exactly 1. Empty-text + Enter → annotation removed from store. |
| **Command** | Same as C5 |
| **Pass criteria** | Live-preview writes via *NoHistory; commit writes via update; empty-on-empty triggers remove (research pitfall 3). |

---

### C7 — measureLine endpoint drag = single past entry (Phase 31 transaction pattern)

| Field | Value |
|-------|-------|
| **File** | `tests/components/PropertiesPanel.area.test.tsx` (same file, separate describe block) |
| **Wave** | 0 (TDD) |
| **Decisions** | D-13 (drag editing) |
| **Truths** | "Single-undo per drag cycle (Phase 31 transaction pattern: empty-patch updateMeasureLine at drag start, *NoHistory mid-drag — past.length increments by exactly 1)" |
| **Setup** | Seed a measureLine. Capture past.length before drag. |
| **Assertions** | Dispatch sequence: `updateMeasureLine(roomId, id, {})` (empty patch — pushes 1 history snapshot) + 5x `updateMeasureLineNoHistory(roomId, id, {start: newPoint})` + no commit at end. Assert past.length === before + 1 exactly. |
| **Command** | Same as C5 |
| **Pass criteria** | past.length delta is exactly 1 across the whole drag cycle. |

---

## E2E Tests (Playwright)

### E1 — Place measurement (full UI flow)

| Field | Value |
|-------|-------|
| **File** | `e2e/measurements.spec.ts` |
| **Wave** | 0 (TDD — driver scaffolding) |
| **Decisions** | D-05 (placement flow), D-14 (Toolbar buttons) |
| **Truths** | "Toolbar ToolPalette renders Measure button... Measure tool flow: user clicks Measure → first canvas click locks first endpoint... → second click commits via cadStore.addMeasureLine" |
| **Steps** | Click Toolbar Measure button → click 2 canvas points 10ft apart → wait for commit. |
| **Assertions** | `__getMeasureLineCount(roomId) === 1`; measurement label visible with `10'-0"` text (text locator on the rendered fabric.Text). |
| **Command** | `npx playwright test e2e/measurements.spec.ts -g "E1"` |

---

### E2 — Live preview between clicks

| Field | Value |
|-------|-------|
| **File** | `e2e/measurements.spec.ts` |
| **Wave** | 0 |
| **Decisions** | D-05 (live preview) |
| **Truths** | "first canvas click locks first endpoint and renders ghost preview line + live formatFeet length label that follows cursor" |
| **Steps** | Click Measure → click point 1 → move mouse → assert preview visible → click point 2 → assert preview replaced with committed line. |
| **Assertions** | After click 1 + move: preview line + length label rendered (locator: any fabric Line object on canvas with strokeDashArray); after click 2: preview removed, committed measureLine present. |
| **Command** | `npx playwright test e2e/measurements.spec.ts -g "E2"` |

---

### E3 — Smart-snap engages on preview cursor near wall endpoint

| Field | Value |
|-------|-------|
| **File** | `e2e/measurements.spec.ts` |
| **Wave** | 0 |
| **Decisions** | D-09 (consume-only smart-snap) |
| **Truths** | "Phase 30 smart-snap engages on the live cursor during measure preview: cursor near a wall endpoint or midpoint snaps to it and renders the accent-purple snap guide" |
| **Steps** | Project initialized with at least one wall. Click Measure → click point 1 → move cursor near a wall endpoint (within snap radius of e.g. 0.5ft). |
| **Assertions** | Accent-purple snap guide visible (selector: data-snap-guide attribute or pixel sampling); snapped point used on commit (compare committed end coords to wall endpoint within ε = 0.001ft). |
| **Command** | `npx playwright test e2e/measurements.spec.ts -g "E3"` |

---

### E4 — Place + edit annotation

| Field | Value |
|-------|-------|
| **File** | `e2e/measurements.spec.ts` |
| **Wave** | 0 |
| **Decisions** | D-07 (label tool), D-08 (visual style) |
| **Truths** | "Label tool flow (D-07): click on canvas → cadStore.addAnnotation... → uiStore.setEditingAnnotationId(id) → InlineEditableText DOM overlay appears at zIndex 30" |
| **Steps** | Click Toolbar Label → click on canvas → InlineEditableText overlay visible (selector: `[data-testid^="annotation-edit-"]`) → type 'Closet' + press Enter. |
| **Assertions** | `__getAnnotationText(roomId, id) === 'Closet'`; committed annotation visible in 2D canvas; overlay no longer in DOM (edit mode exited). |
| **Command** | `npx playwright test e2e/measurements.spec.ts -g "E4"` |

---

### E5 — Auto room-area in PropertiesPanel updates live

| Field | Value |
|-------|-------|
| **File** | `e2e/measurements.spec.ts` |
| **Wave** | 0 |
| **Decisions** | D-04 (PropertiesPanel side), D-17 (Phase 47 multi-room awareness) |
| **Truths** | "PropertiesPanel renders Room properties branch when nothing selected... live-recalculates as walls move via Zustand subscription" |
| **Steps** | Init project with 10×10 room (4 walls). Deselect everything. Read PropertiesPanel AREA. Drive a wall move via existing driver to extend room to 10×20. Re-read AREA. |
| **Assertions** | First read: `AREA: 100 SQ FT`; after wall move: `AREA: 200 SQ FT`. |
| **Command** | `npx playwright test e2e/measurements.spec.ts -g "E5"` |

---

### E6 — Canvas room-area overlay rendered at centroid

| Field | Value |
|-------|-------|
| **File** | `e2e/measurements.spec.ts` |
| **Wave** | 0 |
| **Decisions** | D-04 (canvas overlay side) |
| **Truths** | "Canvas room-area overlay: subtle text label rendered at polygonCentroid(walls) in IBM Plex Mono 11px text-text-dim color" |
| **Steps** | Init 10×10 room. Take screenshot. |
| **Assertions** | Text `100 SQ FT` rendered near room centroid (centroid = (5, 5) in feet → screen px). Use text locator on the rendered fabric.Text or pixel sampling at expected screen coords. |
| **Command** | `npx playwright test e2e/measurements.spec.ts -g "E6"` |

---

### E7 — Right-click both kinds (sparse menu rendering)

| Field | Value |
|-------|-------|
| **File** | `e2e/measurements.spec.ts` |
| **Wave** | 0 |
| **Decisions** | D-11 (Phase 53/54 wiring), D-13 |
| **Truths** | "CanvasContextMenu.getActionsForKind returns 1 action for measureLine (Delete) and 2 actions for annotation (Edit text → setEditingAnnotationId, Delete)" |
| **Steps** | Place 1 measureLine + 1 annotation. Right-click on measureLine → assert menu shows 1 'Delete' action → click Delete → assert __getMeasureLineCount === 0. Right-click on annotation → assert menu shows 'Edit text' + 'Delete' (2 actions) → click Edit text → assert overlay re-mounted (selector: `[data-testid^="annotation-edit-"]`). |
| **Assertions** | Action label counts match; Delete handler executes; Edit text re-enters edit mode. |
| **Command** | `npx playwright test e2e/measurements.spec.ts -g "E7"` |

---

### E8 — Save → reload → measurements + annotations persist (v4→v5 round-trip)

| Field | Value |
|-------|-------|
| **File** | `e2e/measurements.spec.ts` |
| **Wave** | 0 |
| **Decisions** | D-02 (migration), D-17 (back-compat) |
| **Truths** | "Snapshot v4 → v5 migration... Existing v4 snapshots (Phase 60-era with stairs) load with both maps seeded as {}" |
| **Steps** | Place 2 measureLines + 1 annotation. Trigger save (auto-save or manual). Reload page (same project ID). |
| **Assertions** | After reload: __getMeasureLineCount === 2; annotation present with original text; snapshot version in IndexedDB === 5. |
| **Command** | `npx playwright test e2e/measurements.spec.ts -g "E8"` |

---

### E9 — Old v4 snapshot back-compat

| Field | Value |
|-------|-------|
| **File** | `e2e/measurements.spec.ts` |
| **Wave** | 0 |
| **Decisions** | D-02, D-17 |
| **Truths** | "v4 snapshots back-compat verified by E9; 4 pre-existing vitest failures remain exactly 4" |
| **Setup** | Hand-craft a v4-shape snapshot fixture (rooms with walls + stairs but NO measureLines/annotations fields, version: 4). |
| **Steps** | Load fixture via existing __loadSnapshotFixture driver (or write the JSON to IndexedDB and reload). |
| **Assertions** | No console errors; __getMeasureLineCount === 0 (empty map seeded); active room renders cleanly with walls + stairs visible; migration bumped store version to 5. |
| **Command** | `npx playwright test e2e/measurements.spec.ts -g "E9"` |

---

## Coverage Summary

| Decision | Test IDs |
|----------|----------|
| D-01 (entity types) | U2, U4 |
| D-02 (snapshot migration) | U3, U4, E8, E9 |
| D-03 (2D-only) | (verified by absence — src/three/* not in files_modified; manual smoke) |
| D-04 (auto area: panel + overlay) | U1, C5, E5, E6 |
| D-05 (measure tool flow) | E1, E2 |
| D-06 (dimension line style) | E1 (label text), E2 (preview style) |
| D-07 (label tool flow) | C6, E4 |
| D-08 (annotation visual) | E4 |
| D-09 (consume-only smart-snap) | E3 |
| D-10 (cadStore actions) | U2 |
| D-11 (Phase 53/54 wiring) | E7 |
| D-12 (no tree integration) | (verified by absence — RoomsTreePanel not in files_modified) |
| D-13 (drag editing + single-undo) | C7, E7 |
| D-14 (Toolbar buttons) | E1, E4 |
| D-15 (test coverage) | All 16 |
| D-16 (atomic commits) | (verified at commit time, not runtime) |
| D-17 (zero regressions) | E8, E9 + verification step's grep audit + pre-existing-failure-count guard |

## Sampling Cadence

- **Per task commit:** `npx vitest run --no-coverage` on touched test files (~10s).
- **Per task verify hook:** the `<verify><automated>` command in 62-01-PLAN.md.
- **Phase gate (final):** `npm test && npx playwright test e2e/measurements.spec.ts`. Total vitest failures must equal 4 (the pre-existing baseline). All 9 e2e scenarios must pass.

## Wave 0 Gaps (must be authored before production code)

- [ ] `tests/lib/geometry.polygonArea.test.ts` (Task 1 — TDD red phase)
- [ ] `tests/stores/cadStore.measure.test.ts` (Task 1 — TDD red phase)
- [ ] `tests/snapshotMigration.test.ts` extension (Task 1 — TDD red phase)
- [ ] `tests/components/PropertiesPanel.area.test.tsx` (Task 7)
- [ ] `e2e/measurements.spec.ts` + `src/test-utils/measureDrivers.ts` (Task 8)
