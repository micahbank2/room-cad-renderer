---
phase: 60-stairs-stairs-01
type: validation
requirements: [STAIRS-01]
created: 2026-05-05
---

# Phase 60: Validation Map — STAIRS-01

Maps every acceptance criterion in REQUIREMENTS.md `STAIRS-01` and every locked decision in 60-CONTEXT.md to its test path. Per CONTEXT D-15: **4 unit + 3 component + 6 e2e = 13 tests total**.

---

## Requirement: STAIRS-01

> User can place stairs as a new architectural primitive. Configurable rise per step, run per step, total width, and orientation. Renders as connected step boxes in 3D and as a stair-symbol polygon (with directional indicator) in 2D.

> **Acceptance:** New `Stair` type in `cad.ts` with `position`, `rotation`, `riseIn`, `runIn`, `widthIn`, `stepCount` fields. New `StairTool` in `src/canvas/tools/stairTool.ts` mirroring `productTool` pattern. `cadStore` actions: `addStair`, `updateStair`, `removeStair`, plus `*NoHistory` variants. 2D rendering: `fabric.Polygon` outline + parallel hatch lines + arrow → wrapped in `fabric.Group` with `data.stairId`. 3D rendering: `<StairMesh>` component renders N stacked `<boxGeometry>` meshes. Tree integration: stairs appear under their containing room with a Stairs icon. Snapshot serialization includes stairs. No regression on existing primitives.

---

## Unit Tests (4) — Vitest

### File: `tests/stores/cadStore.stairs.test.ts`

Run: `npx vitest run tests/stores/cadStore.stairs.test.ts`

| ID | Description | Setup | Assertion | Decision Coverage |
|----|-------------|-------|-----------|-------------------|
| U1 | `addStair(roomId, partial)` writes a stair to `RoomDoc.stairs` with default values applied | `useCADStore.getState().addStair('room_main', { position: { x: 1, y: 2 } })` returns a stair id | Returned id matches `^stair_`. `state.rooms.room_main.stairs[id]` exists with `riseIn === 7`, `runIn === 11`, `stepCount === 12`, `rotation === 0`, `widthFtOverride === undefined`, `position === {x:1,y:2}`. `past.length` increased by 1 (history pushed). | D-01, D-13 |
| U2 | `updateStair(roomId, stairId, patch)` patches the stair and preserves other fields | Place stair via U1; call `updateStair('room_main', id, { riseIn: 8 })` | Stair has `riseIn === 8`. ALL other fields (`runIn === 11`, `stepCount === 12`, `position` unchanged, `rotation === 0`) preserved. `past.length` increased by 1. | D-01 |
| U3 | `removeStair(roomId, stairId)` deletes the stair entry | Place stair via U1; call `removeStair('room_main', id)` | `state.rooms.room_main.stairs[id]` is undefined. `Object.keys(state.rooms.room_main.stairs).length === 0`. `past.length` increased by 1. | D-01 |
| U4 | `*NoHistory` variants don't push to undo stack | Read `past.length` before each call; call `addStairNoHistory`, `updateStairNoHistory`, `removeStairNoHistory` | `past.length` UNCHANGED across all 3 NoHistory calls. Compare with U1/U2/U3 which DO increment. | D-01 |
| (supporting) | snapshot v3 → v4 migration roundtrip | Construct synthetic v3 snapshot `{ version: 3, rooms: { r1: { …mainRoom, no stairs field } }, activeRoomId: 'r1' }`. Pass to `migrateSnapshot`. | Returned snapshot has `version === 4`. Every RoomDoc has `stairs: {}` (empty object, not undefined). Re-passing v4 returns identical reference (passthrough). | D-12, research Q3 |

### Audit checks (not tests — file-level grep at Task 1 close)

```bash
grep -n "version: 4" src/types/cad.ts src/stores/cadStore.ts src/lib/snapshotMigration.ts
# Expected: hits in cad.ts (literal type), cadStore.ts (~line 155), snapshotMigration.ts (defaultSnapshot + v3→v4 arm)

grep -n "version: 2" src/types/cad.ts
# Expected: 0 (literal type bumped)

grep -n "stairs: {}" src/lib/snapshotMigration.ts src/stores/cadStore.ts
# Expected: ≥ 2 (defaultSnapshot seed + createRoom factory)
```

---

## Component Tests (3) — Vitest + RTL

### File: `tests/components/PropertiesPanel.stair.test.tsx`

Run: `npx vitest run tests/components/PropertiesPanel.stair.test.tsx`

| ID | Description | Setup | Assertion | Decision Coverage |
|----|-------------|-------|-----------|-------------------|
| C1 | PropertiesPanel for a selected stair renders rise/run/width/stepCount/rotation/label inputs + Save Camera button | Seed cadStore with one stair; set `useUIStore.selectedIds = new Set([stair.id])`; render `<PropertiesPanel />` | Each of: `getByLabelText(/width/i)`, `getByLabelText(/rise/i)`, `getByLabelText(/run/i)`, `getByLabelText(/step.*count/i)`, `getByLabelText(/rotation/i)`, `getByLabelText(/label/i)`, `getByRole('button', { name: /save camera/i })` resolves. | D-08, research Q4 |
| C2 | Editing rise input dispatches `updateStairNoHistory` per keystroke; commits on Enter as `updateStair` (single undo) | Spy on `cadStore.getState().updateStair` and `updateStairNoHistory`. Type "8" into rise input. Press Enter. | `updateStairNoHistory` called once with `{ riseIn: 8 }`. `updateStair` called exactly once on Enter (history commit). `past.length` increased by exactly 1 across the keystroke + commit cycle. | D-08 |
| C3 | Width edge-handle drag (Phase 31 pattern) updates `widthFtOverride` with single-undo for full drag transaction | Render canvas with stair selected. Simulate drag transaction: `resizeStairWidthNoHistory(roomId, id, 4.5)` mid-drag (×3 calls); `resizeStairWidth(roomId, id, 5.0)` on release. | After drag: `stair.widthFtOverride === 5.0`. `past.length` increased by exactly 1 (single undo for the entire drag, NOT 4 entries). | D-07, Phase 31 mirror |

### Audit checks

```bash
# D-34 spacing — no arbitrary Tailwind values in stair-related additions
grep -E "p-\\[[0-9]|m-\\[[0-9]|gap-\\[[0-9]|rounded-\\[[0-9]" \
  src/components/PropertiesPanel.StairSection.tsx \
  src/components/PropertiesPanel.tsx
# Expected: 0 hits in stair-related additions
```

---

## E2E Tests (6) — Playwright

### File: `e2e/stairs.spec.ts`

Run: `npx playwright test e2e/stairs.spec.ts --reporter=list`

Driver dependencies (`src/test-utils/stairDrivers.ts`):
- `window.__drivePlaceStair(roomId, position, partial?)` — direct addStair (skips tool/preview)
- `window.__getStairCount(roomId)` — count of stairs in room
- `window.__getStairConfig(roomId, stairId)` — read full stair object
- `window.__driveResizeStairWidth(roomId, stairId, deltaFt)` — apply width delta via resizeStairWidth (history)
- `window.__driveSetStairTool()` — activate stair tool with default config

Reused drivers (existing):
- Phase 48 `__setCameraTransform(pos, target)` — drive OrbitControls
- Phase 53 `__driveOpenContextMenu(kind, id, x, y)` — open right-click menu programmatically
- Phase 54 `__driveClickAt(x, y, viewMode)` — click in 2D or 3D canvas

| ID | Description | Steps | Assertion | Decision Coverage |
|----|-------------|-------|-----------|-------------------|
| E1 | Place stair via toolbar tool with default config | 1. Open app. 2. `__driveSetStairTool()`. 3. `__driveClickAt(5, 5, '2d')`. 4. Read `__getStairCount('room_main')`. 5. Read `__getStairConfig('room_main', firstStairId)`. | Step 4: `=== 1`. Step 5: `riseIn === 7`, `runIn === 11`, `stepCount === 12`, `rotation === 0`, `widthFtOverride === undefined`, `position` ≈ `{ x: 5, y: 5 }` (within 0.5 ft snap tolerance). | D-01, D-04, D-13, research Q3 |
| E2 | Smart-snap to wall + D-04 origin-asymmetry verification (research Pitfall 1) | 1. Place wall along Z-axis at x=10 from y=0..10. 2. `__driveSetStairTool()`. 3. Move cursor to (~10, 5) (just east of wall). 4. Wait for snap guide to appear. 5. Click. 6. Read placed stair `position`. | The bottom-step EDGE midpoint sits flush against the wall — NOT the bbox center. With totalRunFt = 12 × 11/12 = 11 ft, expect `position.x` ≈ 10 (snapped to wall) and the stair extends in +y direction. Verify: `position.x` within 0.05 ft of wall x; the stair's bottom-edge x-coordinate (bottom-step center.x ± width/2) lies within 0.05 ft of wall.x. **CRITICAL: must NOT be off by totalRunFt/2 = 5.5 ft (the asymmetry pitfall).** | D-04, D-05, research Pitfall 1, Q2 |
| E3 | 3D renders 12 stacked box meshes at correct positions | 1. `__drivePlaceStair('room_main', { x: 0, y: 0 })` returns stairId. 2. Switch viewMode to '3d'. 3. Wait one R3F frame. 4. Introspect three.js scene under stair group. | Stair group has 12 child mesh nodes (`stepCount` default). Each mesh `i` at local position `[0, riseFt*(i+0.5), runFt*(i+0.5)]` where `riseFt = 7/12` and `runFt = 11/12`. Each mesh has `boxGeometry` args `[3, 7/12, 11/12]`. Material color is `#cdc7b8`. | D-06, D-09 |
| E4 | Right-click on stair (2D + 3D) opens menu with 6 actions | **2D path:** 1. Place stair. 2. Right-click on stair group in 2D canvas. 3. Read context-menu items. **3D path:** 4. Switch to 3D. 5. Right-click StairMesh. 6. Read items. | Both paths: menu items in order: "Focus camera", "Save camera here", "Hide" (or "Show" if hidden), "Copy", "Paste", "Delete". Exactly 6 actions. ContextMenuKind in store === `"stair"` while menu open. | D-10, D-11, research Q5 |
| E5 | Phase 54 click-to-select on stair in 3D updates PropertiesPanel | 1. Place stair. 2. Switch to 3D. 3. Click stair via `__driveClickAt(...)` over stair location. 4. Read `useUIStore.selectedIds`. 5. Read DOM for PropertiesPanel inputs. | Step 4: Set contains `stair.id`. Step 5: rise/run/width/stepCount/rotation inputs all visible and populated with stair values. | D-11, D-08 |
| E6 | Tree shows stair node with Stairs icon; click focuses; double-click loads saved camera | 1. Place stair. 2. Open RoomsTreePanel. 3. Locate STAIRS group under active room. 4. Inspect stair node icon. 5. Single-click → camera focuses near stair. 6. Save camera via PropertiesPanel button. 7. Move camera away. 8. Double-click stair node. | Step 3: `STAIRS` group present with 1 child node. Step 4: icon is `<span class="material-symbols-outlined">stairs</span>` (text content === `"stairs"`). Step 5: camera target ≈ `[stair.position.x, mid-height, stair.position.y]`. Step 8: camera position + target match saved values within 0.1 unit tolerance. | D-10, D-14, research Q1 (Material Symbols), Q6 |

---

## Decision Coverage Matrix

| Decision | Covered By | Notes |
|----------|------------|-------|
| D-01 Stair top-level entity | U1, U2, U3, U4 | Type + actions verified at unit level; integration tested via E1, E3 |
| D-02 Continuous degree rotation, Shift-15° snap | E2 (rotation default 0), C1 (rotation input) | Shift-snap-15° in tool — manual UAT (no driver for held-key + drag in Playwright) |
| D-03 2D symbol shape (outline + step lines + arrow) | E1 (visual), E2 (footprint correctness) | Full visual UAT in HUMAN-UAT.md |
| D-04 Position = bottom-step center | **E2 (canonical asymmetry test)**, E1 (commit position matches click) | Most-critical decision — E2 specifically verifies bottom-edge flush, not bbox-center off by totalRunFt/2 |
| D-05 Smart-snap to wall edges; Alt disables | E2 | Alt-disable manual UAT |
| D-06 3D = N stacked boxGeometry | E3 | 12 meshes at expected stacked positions |
| D-07 Width-only edge handle (no top/bottom) | C3 | Edge-handle drag → widthFtOverride; top/bottom hidden = manual UAT |
| D-08 PropertiesPanel inputs (rise/run/width/stepCount/rotation/label) | C1, C2, E5 | All 6 inputs; live-edit + commit cycle |
| D-09 Hardcoded color #cdc7b8 roughness 0.7 | E3 | Material color + roughness asserted |
| D-10 Tree groupKey "stairs" + empty state | E6 | Group present; empty-state copy verified manual UAT |
| D-11 Phase 53 right-click + Phase 54 click-select | E4, E5 | Both 2D + 3D paths covered |
| D-12 Snapshot v3 → v4 migration | U1 supporting test | Roundtrip; defensive `stairs: {}` fallback |
| D-13 Default values (7×11×36×12) | U1, E1 | Defaults applied on addStair |
| D-14 Saved-camera per stair | E6 (double-click loads saved cam) | Save Camera button manual UAT |
| D-15 Test coverage = 4+3+6 | This document | Exact split |
| D-16 Atomic commits per task | (verified at PR review — 7 commits per Task in PLAN) | Outside test scope |
| D-17 Zero regressions | Pre-existing 4 vitest failures stable; existing test suites pass | `npm test && npm run test:e2e` full pass |

---

## Wave 0 Gaps (files to create before any test passes)

- [ ] `src/test-utils/stairDrivers.ts` — created in Task 7
- [ ] `tests/stores/cadStore.stairs.test.ts` — created in Task 1 (TDD RED first)
- [ ] `tests/components/PropertiesPanel.stair.test.tsx` — created in Task 5 (TDD RED first)
- [ ] `e2e/stairs.spec.ts` — created in Task 7

The Stair type, store actions, and v3→v4 migration must exist before unit tests can pass (Task 1).
PropertiesPanel.StairSection.tsx must exist before component tests (Task 5).
Drivers + tool wiring (Tasks 1-6) must all be in place before e2e (Task 7).

---

## Sampling Rate

- **Per task commit:** `npx vitest run tests/stores/cadStore.stairs.test.ts tests/components/PropertiesPanel.stair.test.tsx`
- **Per wave merge (single wave for this phase):** `npm run test && npx playwright test e2e/stairs.spec.ts`
- **Phase gate:** Full suite green (modulo 4 pre-existing vitest failures per D-17) before `/gsd:verify-work`

---

## Out-of-Scope Validation (deferred per CONTEXT lines 218-228)

- Stair landings, multi-flight stairs, spiral, L-shape, curved/winding stairs — all v1.16+
- Handrails / banisters — visual detail; v1.16+
- Floor opening / ceiling cut for upper-floor stairs — multi-floor is v2.0+
- Per-step materials / textures — single material color in v1.15
- IBC code-compliance validator — informative only, not enforced
- Snap-to-stair-edges (other primitives snapping TO stairs) — research Q2 consume-only; defer to v1.16
- Shift-snap-15° rotation drag in e2e — manual UAT (Playwright modifier-key + drag is brittle)
- Top/bottom edge handles hidden — D-07 manual UAT (visual)
- Empty-state tree copy ("No stairs in this room") — manual UAT
- Alt-disable smart-snap — manual UAT (modifier key during drag)
