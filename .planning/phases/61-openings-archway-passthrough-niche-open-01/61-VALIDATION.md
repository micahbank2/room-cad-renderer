---
phase: 61-openings-archway-passthrough-niche-open-01
type: validation
created: 2026-05-04
status: ready
requirements: [OPEN-01]
---

# Phase 61: Openings — Archway / Passthrough / Niche — Validation Map

Per CONTEXT D-12 — 13 tests covering OPEN-01 unit + component + e2e behavior. Each test maps 1:1 to a CONTEXT decision, a research finding, and an implementation site in 61-01-PLAN.md.

## Coverage Summary

| Tier | Count | Framework | Quick Run |
|------|-------|-----------|-----------|
| Unit | 4 (U1-U4) | vitest 4.1.2 + happy-dom | `npx vitest run tests/types/opening.test.ts` |
| Component | 3 (C1-C3) | vitest + RTL | `npx vitest run tests/components/PropertiesPanel.opening.test.tsx` |
| E2E | 6 (E1-E6) | Playwright 1.59.1 | `npx playwright test e2e/openings.spec.ts` |
| **Total** | **13** | — | `npm test && npm run test:e2e` |

Pre-existing vitest failures: **4** — must remain exactly 4 after Phase 61 ships (validated in success criteria).

---

## Unit Tests (vitest)

### U1 — Opening.type accepts all 5 kinds

| Field | Value |
|-------|-------|
| **Description** | Type-narrowing assertion: `Opening.type` accepts each of `"door"`, `"window"`, `"archway"`, `"passthrough"`, `"niche"`. Constructed Opening objects with each kind compile and serialize cleanly. |
| **CONTEXT decision** | D-01 (extend type union, no new entity) |
| **Research support** | Pitfall 5 (type-union extension is superset-safe) |
| **Implementation site** | `src/types/cad.ts` — `Opening.type` union; Task 1 |
| **File** | `tests/types/opening.test.ts` |
| **Command** | `npx vitest run tests/types/opening.test.ts -t "U1"` |
| **Pass criterion** | All 5 kind values accepted; TS compile succeeds; serialize round-trips. |

### U2 — Default-value resolver returns correct defaults per kind

| Field | Value |
|-------|-------|
| **Description** | `getOpeningDefaults(kind, wallHeight?)` returns: door `{w:3,h:7,sill:0}`, window `{w:3,h:4,sill:3}`, archway `{w:3,h:7,sill:0}`, passthrough `{w:5,h:wallHeight,sill:0}`, niche `{w:2,h:3,sill:3,depthFt:0.5}`. |
| **CONTEXT decision** | D-02 (default values per kind) |
| **Research support** | Q1 narrative + Q2 archway dims |
| **Implementation site** | `src/types/cad.ts` — `getOpeningDefaults` export; Task 1 |
| **File** | `tests/types/opening.test.ts` |
| **Command** | `npx vitest run tests/types/opening.test.ts -t "U2"` |
| **Pass criterion** | Each kind returns the exact defaults table from D-02. |

### U3 — Niche depthFt clamps to wallThickness − 1"

| Field | Value |
|-------|-------|
| **Description** | `clampNicheDepth(0.5, 0.5)` returns `~0.417` (0.5 − 1/12). `clampNicheDepth(0.05, 1)` returns `0.083` (1" floor). `clampNicheDepth(2, 1)` returns `0.917` (1 − 1/12). |
| **CONTEXT decision** | D-05 (depth user-configurable, default 6", clamp validation) |
| **Research support** | Q3 fixture-second-correction; Pitfall 1 |
| **Implementation site** | `src/types/cad.ts` — `clampNicheDepth` export; Task 1 |
| **File** | `tests/types/opening.test.ts` |
| **Command** | `npx vitest run tests/types/opening.test.ts -t "U3"` |
| **Pass criterion** | All 3 fixture inputs return the expected clamped value within 1e-6. |

### U4 — v1.14 snapshot with door+window-only round-trips unchanged

| Field | Value |
|-------|-------|
| **Description** | Hand-crafted snapshot JSON with only `type:"door"` + `type:"window"` openings (no `depthFt` field) deserializes cleanly into the v1.15 Opening type. Re-serialize emits byte-equal JSON (modulo iteration order). NO snapshot version bump. |
| **CONTEXT decision** | D-01 snapshot back-compat note + D-14 (zero regressions, no version bump) |
| **Research support** | Pitfall 5 (back-compat verification); Runtime State Inventory ("Stored data: None") |
| **Implementation site** | `src/types/cad.ts` Opening shape change; serialization unchanged; Task 1 |
| **File** | `tests/types/opening.test.ts` |
| **Command** | `npx vitest run tests/types/opening.test.ts -t "U4"` |
| **Pass criterion** | Snapshot loads with no errors; round-trip JSON.stringify equals input modulo key order. |

---

## Component Tests (vitest + RTL)

### C1 — PropertiesPanel niche shows Depth input

| Field | Value |
|-------|-------|
| **Description** | Render `<OpeningsSection wall={...} />` with a wall containing a single niche opening. Assert a `Depth` input field is present with `inches` unit hint. Drive a value change → assert `updateOpeningNoHistory` called mid-keystroke; press Enter → assert `updateOpening` called with clamped value. |
| **CONTEXT decision** | D-10 (PropertiesPanel kind-specific inputs — niche depth) |
| **Research support** | Q4 (PropertiesPanel.OpeningSection.tsx is NEW) |
| **Implementation site** | `src/components/PropertiesPanel.OpeningSection.tsx` — niche-conditional Depth input; Task 7 |
| **File** | `tests/components/PropertiesPanel.opening.test.tsx` |
| **Command** | `npx vitest run tests/components/PropertiesPanel.opening.test.tsx -t "C1"` |
| **Pass criterion** | Depth input rendered; Phase 31 single-undo NoHistory/commit pattern confirmed. |

### C2 — PropertiesPanel passthrough shows wall-height placeholder

| Field | Value |
|-------|-------|
| **Description** | Render `<OpeningsSection wall={...} />` for a wall with a passthrough opening. Assert the Height input has placeholder text containing "wall height" (or equivalent). |
| **CONTEXT decision** | D-10 (passthrough placeholder hint) |
| **Research support** | Q4 |
| **Implementation site** | `src/components/PropertiesPanel.OpeningSection.tsx` — passthrough-conditional placeholder; Task 7 |
| **File** | `tests/components/PropertiesPanel.opening.test.tsx` |
| **Command** | `npx vitest run tests/components/PropertiesPanel.opening.test.tsx -t "C2"` |
| **Pass criterion** | Height input placeholder includes "wall height" text. |

### C3 — PropertiesPanel archway hides Depth input

| Field | Value |
|-------|-------|
| **Description** | Render `<OpeningsSection wall={...} />` for a wall with an archway opening. Assert NO Depth input field rendered (queryByLabelText returns null). |
| **CONTEXT decision** | D-10 (archway no-extra-inputs) |
| **Research support** | Q4 |
| **Implementation site** | `src/components/PropertiesPanel.OpeningSection.tsx` — depth conditional `{opening.type === "niche" && ...}`; Task 7 |
| **File** | `tests/components/PropertiesPanel.opening.test.tsx` |
| **Command** | `npx vitest run tests/components/PropertiesPanel.opening.test.tsx -t "C3"` |
| **Pass criterion** | `queryByLabelText(/depth/i)` returns null for archway. |

---

## End-to-End Tests (Playwright)

### E1 — Wall Cutouts dropdown → Archway → place → 3D arched top

| Field | Value |
|-------|-------|
| **Description** | Open app → click Wall Cutouts dropdown trigger → click Archway item → click on a horizontal wall → assert `__getOpeningKind` returns `"archway"`. Switch to 3D → camera positioned for top-down look at opening → bbox check at archway top sample point (midX, shaftTop + 0.4 × radius) shows pixels matching the wall background (i.e., visible through the arch). |
| **CONTEXT decision** | D-03 (toolbar dropdown), D-04 (archway round shape), D-09 (archwayTool), D-12 E1 |
| **Research support** | Q1 (icons), Q2 (absarc derivation), Q7 (dropdown pattern) |
| **Implementation site** | Tasks 3, 4, 7 |
| **File** | `e2e/openings.spec.ts` |
| **Command** | `npx playwright test e2e/openings.spec.ts -g "E1"` |
| **Pass criterion** | Opening kind="archway" persisted; 3D archway top arc visible (sample pixel matches background, not wall color). |

### E2 — Passthrough → full-height through-hole

| Field | Value |
|-------|-------|
| **Description** | Place passthrough on a wall → switch to 3D → camera positioned to look through the passthrough from one side → assert opposite-wall pixels visible at expected screen coords (i.e., through-hole spans full wall height including the very top, unlike door which has a frame above). |
| **CONTEXT decision** | D-04 (passthrough no top frame), D-09 (passthroughTool), D-12 E2 |
| **Research support** | Q1 (icons) |
| **Implementation site** | Tasks 3, 4 |
| **File** | `e2e/openings.spec.ts` |
| **Command** | `npx playwright test e2e/openings.spec.ts -g "E2"` |
| **Pass criterion** | Pixel sample at top-of-passthrough is opposite-wall (not wall-top). |

### E3 — Niche → recessed mesh, wall NOT cut through

| Field | Value |
|-------|-------|
| **Description** | Place niche on a 0.5ft-thick wall with default depth 0.5 (clamped to 0.417 per U3). Camera positioned on the EXTERIOR side of the wall, looking through. Assert wall body BLOCKS the niche back wall — i.e., niche back wall is NOT visible from the exterior. Use the research Q3 test fixture coordinates: wall (0,0)→(10,0), niche offset 4 width 2. From exterior camera at +Z = -3, looking +Z, the wall solid pixels block visibility into the niche cavity. |
| **CONTEXT decision** | D-06 (interior-only face), D-07 (separate inset mesh, not wall hole), D-12 E3 |
| **Research support** | Q3 (sign-correction; box recess goes INTO wall away from room); Pitfall 1 |
| **Implementation site** | Tasks 4 (skip-niche in WallMesh), 5 (NicheMesh) |
| **File** | `e2e/openings.spec.ts` |
| **Command** | `npx playwright test e2e/openings.spec.ts -g "E3"` |
| **Pass criterion** | Exterior pixel-through-wall sample = wall solid pixel (not niche back-wall + not transparent). Camera-through-wall test passes. |

### E4 — Niche depth input updates 3D mesh

| Field | Value |
|-------|-------|
| **Description** | Place niche → assert `__getNicheDepth` returns `clampNicheDepth(0.5, wallThickness)`. Open PropertiesPanel → drive Depth input from 0.5 to 0.3 → press Enter → assert `__getNicheDepth` returns 0.3 (within wallThickness − 1" allowance). Re-render: 3D NicheMesh box centerZ shifts accordingly. |
| **CONTEXT decision** | D-05 (depth editable), D-10 (PropertiesPanel niche), D-12 E4 |
| **Research support** | Q3 fixture math; Q4 (PropertiesPanel new file) |
| **Implementation site** | Tasks 5, 7 |
| **File** | `e2e/openings.spec.ts` |
| **Command** | `npx playwright test e2e/openings.spec.ts -g "E4"` |
| **Pass criterion** | Depth round-trips through PropertiesPanel commit; 3D mesh dimensions update. |

### E5 — Right-click on each new kind → context menu opens

| Field | Value |
|-------|-------|
| **Description** | For each of {archway, passthrough, niche}, place opening → right-click on its 2D polygon → assert context menu visible. Verify the 4 expected action labels render: Focus camera, Save camera here, Hide/Show, Delete. (Copy/Paste deferred per D-11'.) |
| **CONTEXT decision** | D-11' REVISED (Phase 53 wiring is NEW code), D-12 E5 |
| **Research support** | Q5 (CONTEXT D-11 was wrong — three independent code citations confirmed) |
| **Implementation site** | Task 6 (uiStore + FabricCanvas + CanvasContextMenu) |
| **File** | `e2e/openings.spec.ts` |
| **Command** | `npx playwright test e2e/openings.spec.ts -g "E5"` |
| **Pass criterion** | Menu opens for all 3 kinds; 4 actions visible; clicking Delete removes the opening from cadStore. |

### E6 — v1.14 snapshot with door + window only loads cleanly

| Field | Value |
|-------|-------|
| **Description** | Load a hand-crafted v1.14-shape snapshot containing only door + window openings (no `depthFt` field anywhere). Assert no console errors. Assert all walls + 2 openings render in 2D + 3D. Assert serialize → re-load round-trips identically. NO version bump. |
| **CONTEXT decision** | D-01 back-compat note, D-14 (zero regressions, snapshot back-compat), D-12 E6 |
| **Research support** | Pitfall 5; Runtime State Inventory |
| **Implementation site** | Tasks 1 (type extension is superset), 4 (kind-discriminated WallMesh handles door/window unchanged) |
| **File** | `e2e/openings.spec.ts` |
| **Command** | `npx playwright test e2e/openings.spec.ts -g "E6"` |
| **Pass criterion** | Snapshot loads, no errors in console, all openings render correctly. |

---

## Sampling Rate

- **Per task commit:** `npm run test:quick` (vitest dot reporter)
- **Per task in Tasks 1, 7, 8:** task-specific `npx vitest run` / `npx playwright test` per the verify block.
- **Per wave merge:** `npm test`
- **Phase gate (before /gsd:verify-work):** `npm test && npm run test:e2e` all green.

## Wave 0 Gaps

- [x] `tests/types/opening.test.ts` — created in Task 1 RED step (covers U1-U4)
- [ ] `tests/components/PropertiesPanel.opening.test.tsx` — NEW; create in Task 7 (covers C1-C3). NOT in Task 7's `files` list — needs to be added when Task 7 lands. **Plan owner: append `tests/components/PropertiesPanel.opening.test.tsx` to Task 7 files list during execution.**
- [x] `e2e/openings.spec.ts` — created in Task 8 (covers E1-E6)
- [x] `src/test-utils/openingDrivers.ts` — created in Task 8

## Risk / Known Limitations

1. **C1-C3 component tests not in Task 7's `files` field.** The PLAN.md task lists `PropertiesPanel.OpeningSection.tsx` but does not list the test file. Executor should add the test file alongside the component. Flagged to resolve at execute-phase time.
2. **E3 camera-through-wall pixel sample** depends on Three.js render reproducibility. If the sample point is unstable across Chromium versions, fall back to `__getNicheDepth` + math assertion that back-wall Z-position is INSIDE wall body.
3. **E1 archway pixel sample** depends on extrude tessellation density (12 divisions per arc). Should be stable but if flaky, add `THREE.Path.absarc` divisions parameter override or assert via mesh geometry inspection.
4. **Pre-existing 4 vitest failures** must remain at exactly 4. If Phase 61 inadvertently fixes one of the 4 pre-existing failures, that's a regression-of-failure-count and the executor should flag it (not silently pass).

---

*Generated 2026-05-04 by gsd-planner from 61-CONTEXT.md (D-01 through D-14, with D-11 revised to D-11' per research) + 61-RESEARCH.md (HIGH confidence on all 7 questions).*
