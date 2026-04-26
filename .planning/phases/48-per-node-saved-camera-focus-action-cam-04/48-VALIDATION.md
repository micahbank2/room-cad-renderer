# Phase 48 VALIDATION — CAM-04

**Phase:** 48-per-node-saved-camera-focus-action-cam-04
**Requirement:** CAM-04 (single requirement; ROADMAP Phase 48 line)
**Created:** 2026-04-26
**Revised:** 2026-04-25 (post checker feedback — BLOCKER-1, BLOCKER-2, WARNING-3, WARNING-4, WARNING-5, WARNING-6)
**Wave 0 owner:** Plan 48-01 (RED scaffolding — SELF-CONTAINED test files)
**Wave 1 owner:** Plan 48-02 (cadStore types/setters + uiStore getCameraCapture bridge + ThreeViewport __getCameraPose driver)
**Wave 2 owner:** Plan 48-03 (PropertiesPanel + Tree UI + focusDispatch + drivers + main.tsx install)

**Wave assignment correction (BLOCKER-1):** Plan 03 was previously labeled wave: 1; corrected to wave: 2 because it depends on Plan 02 outputs (`setSavedCameraOnWallNoHistory`, `getCameraCapture`, `installCameraCapture`, `__getCameraPose`).

---

## Per-Task Verification Map (canonical paths)

Plan 48-01 MUST create every file in this matrix at the EXACT path. No deviations. **Plans 48-02 and 48-03 NEVER edit any test file in this matrix** — Plan 01's tests are self-contained (WARNING-3 fix).

| File (canonical path) | Owned by | What it asserts (per CAM-04) |
|---|---|---|
| `src/stores/__tests__/cadStore.savedCamera.test.ts` | 48-02 turns GREEN | (a) `setSavedCameraOnWallNoHistory(id, pos, target)` writes `savedCameraPos` + `savedCameraTarget` on the wall; (b) same for product / ceiling / custom element; (c) NO entry pushed to `past[]` — `past.length` before === `past.length` after (D-04 no-history); (d) `clearSavedCameraNoHistory("wall", id)` sets both fields to `undefined`; (e) clear works for all 4 kinds; (f) early-returns gracefully when `id` not found / no active room (no throw). **(g) WARNING-6 fix: serialization round-trip — `JSON.parse(JSON.stringify(rooms))` preserves savedCameraPos / savedCameraTarget tuples after a write.** Test is **self-contained** — inline seed via `useCADStore.setState(...)` in beforeEach using IDs `wall_test_1` / `pp_test_1` / `ceiling_test_1` / `pce_test_1` / `room_test_1`. NO `seedTestRoom.ts` helper. |
| `src/components/__tests__/PropertiesPanel.savedCamera.test.tsx` | 48-03 turns GREEN | (a) "Save camera here" button (with lucide `Camera` icon) renders when wall/product/ceiling/custom selected AND `viewMode==="3d"`; (b) button is `disabled` when `viewMode==="2d"` (D-09); (c) clicking Save calls `setSavedCameraOn{Kind}NoHistory` with the captured pose (mock `getCameraCapture` returns a known tuple via `installCameraCapture`); (d) "Clear saved camera" button (with `CameraOff` icon) renders ONLY when the entity has `savedCameraPos`; (e) clicking Clear calls `clearSavedCameraNoHistory(kind, id)`; (f) D-11 tooltip strings appear in DOM ("Save current camera angle to this node" / "Remove saved camera angle"); (g) D-09 disabled-state tooltip "Switch to 3D view to save a camera angle" appears in 2D. **Self-contained** — inline seed via `useCADStore.setState(...)` + `useUIStore.setState({selectedIds: [wallId]})` in beforeEach. |
| `src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx` | 48-03 turns GREEN | (a) leaf row whose backing entity has `savedCameraPos` renders a `Camera` lucide icon (14px / `w-3.5 h-3.5`) with `text-accent-light` class and `title="Has saved camera angle"`; (b) leaf row WITHOUT savedCamera renders NO Camera icon; (c) group rows (`kind === "group"`) NEVER render the Camera icon, even when descendants have saved cameras (D-07); (d) room rows NEVER render the Camera icon (D-07 leaf-only); (e) double-clicking a leaf row with savedCamera dispatches `requestCameraTarget(savedPos, savedTarget)`; (f) double-clicking a leaf row WITHOUT savedCamera falls through to the same Focus dispatch as single-click (D-02 fall-through); (g) double-clicking a group row is NO-OP (matches single-click NO-OP semantics). **WARNING-4 fix: self-contained inline seed materializing exact entity IDs `wall_with_cam` (savedCameraPos set), `wall_no_cam` (no savedCameraPos), `pp_with_cam`, `pp_no_cam`. Plan 03 does NOT supply seed helpers — the test owns its setup.** |
| `e2e/saved-camera-cycle.spec.ts` | 48-02 + 48-03 | (a) load app at `/`; use `window.__getActiveProductIds()` to discover a valid product id (BLOCKER-2 fix — no hardcoded seed shape); set camera pose via `window.__setTestCamera({position, target})`; call `window.__driveSaveCamera("product", ppId, pos, target)`; assert `window.__getSavedCamera("product", ppId)` returns matching tuple; (b) move camera to a DIFFERENT pose; call `window.__driveFocusNode(ppId)`; under reduced-motion, camera snaps to saved pose — assert `window.__getCameraPose()` (BLOCKER-2 — installed by ThreeViewport in Plan 02 Task 3) matches the saved tuple within float tolerance (0.01); (c) reload page (after autosave debounce — `await page.waitForTimeout(2100)` to clear Phase 28 debounce); call `window.__driveFocusNode(ppId)` again; assert pose still matches saved tuple (snapshot persistence). |

## Source-file stubs (Plan 48-01 creates; later plans fill)

| File | Plan-01 stub contract | Filled by |
|---|---|---|
| `src/test-utils/savedCameraDrivers.ts` | Exports `installSavedCameraDrivers()`. When `import.meta.env.MODE === "test"`, sets `window.__driveSaveCamera`, `window.__driveFocusNode`, `window.__getSavedCamera`, **`window.__getActiveProductIds`** (BLOCKER-2). Stub bodies throw `"unimplemented (Plan 48-03)"`. **`window.__getCameraPose` is declared in this file's `declare global` block but its IMPLEMENTATION is installed by ThreeViewport in Plan 02 Task 3** (orbitControlsRef is module-local). | 48-03 fills bodies; Plan 02 Task 3 separately installs `__getCameraPose` |
| `src/components/RoomsTreePanel/savedCameraSet.ts` | Exports `buildSavedCameraSet(rooms): Set<string>` — pure helper that returns the set of leaf-node IDs with `savedCameraPos !== undefined`. Stub returns empty `new Set<string>()` so component tests fail with assertion mismatches (icon not present), not import errors. | 48-03 |

## Pre-existing window handles used by e2e (NO new wiring needed)

| Window field | Source | Notes |
|---|---|---|
| `window.__cadStore` | Phase 36, `src/stores/cadStore.ts:1196-1210` | Test-mode handle; e2e can read state directly without new wiring |
| `window.__setTestCamera` | Phase 36, `src/three/ThreeViewport.tsx:108-128` (existing test-driver) | Test-mode camera setter |

## Behavior contract — per requirement (CAM-04)

### Verifiable A — Storage on CAD types (D-03)
- File: `src/stores/__tests__/cadStore.savedCamera.test.ts`
- Assertions: optional `savedCameraPos: [number, number, number]` + `savedCameraTarget: [number, number, number]` exist on `WallSegment`, `PlacedProduct`, `Ceiling`, `PlacedCustomElement` (compile-time via TS); 4 `setSavedCameraOn{Kind}NoHistory` actions write the fields without pushing history; `clearSavedCameraNoHistory` removes them; **JSON round-trip preserves the fields (WARNING-6 fix).**

### Verifiable B — Save UI in PropertiesPanel (D-01, D-09, D-11)
- File: `src/components/__tests__/PropertiesPanel.savedCamera.test.tsx`
- Assertions: button presence per kind, viewMode 2D disable gate, capture wiring via `useUIStore.getCameraCapture`, Clear button conditional render, D-11 verbatim tooltip strings, D-11 lucide icons, D-09 disabled-state tooltip.

### Verifiable C — Tree double-click + indicator (D-02, D-06, D-07)
- File: `src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx`
- Assertions: Camera icon visibility (leaf-only, savedCamera-conditional); double-click dispatches `requestCameraTarget` to saved pose when set; falls through to default focus when not set; group/room rows NEVER show icon and NEVER dispatch on double-click. Uses canonical seed IDs `wall_with_cam` / `wall_no_cam` / `pp_with_cam` / `pp_no_cam`.

### Verifiable D — End-to-end Save → Focus → reload cycle
- File: `e2e/saved-camera-cycle.spec.ts`
- Assertions: full save+focus round-trip via window drivers (`__getActiveProductIds` + `__driveSaveCamera` + `__getSavedCamera` + `__driveFocusNode` + `__getCameraPose`); persistence via Phase 28 autosave + reload; reduced-motion snap path used so the assertion is deterministic (D-08).

## Sampling rate

- **Per task commit (Plan 02 / 03):** `npm run test -- --run src/stores/__tests__/cadStore.savedCamera.test.ts` (Plan 02) / `npm run test -- --run src/components/__tests__/PropertiesPanel.savedCamera.test.tsx src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx` (Plan 03).
- **Per wave merge:** `npm run test -- --run src/stores/__tests__ src/components/__tests__` + `npx playwright test e2e/saved-camera-cycle.spec.ts`.
- **Phase gate:** Full vitest run (pre-existing 6 failures unchanged) + targeted playwright spec must be GREEN before VERIFICATION.md.
- **Per-file mid-task tsc (WARNING-5):** Plan 03 Task 2 touches 4 source files — run `npx tsc --noEmit` after each file edit to surface interface drift immediately. See Plan 03 Task 2 action steps for explicit per-file checkpoints.

## Wave 0 RED checklist (Plan 48-01)

- [ ] `src/stores/__tests__/cadStore.savedCamera.test.ts` exists; tests fail with assertion errors (action does not exist on store). Includes JSON round-trip test (WARNING-6).
- [ ] `src/components/__tests__/PropertiesPanel.savedCamera.test.tsx` exists; tests fail because Save/Clear buttons not yet rendered. Self-contained inline seed.
- [ ] `src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx` exists; tests fail because Camera icon absent and double-click no-op. Self-contained inline seed using IDs `wall_with_cam` / `wall_no_cam` / `pp_with_cam` / `pp_no_cam` (WARNING-4).
- [ ] `e2e/saved-camera-cycle.spec.ts` exists; `npx playwright test e2e/saved-camera-cycle.spec.ts --list` succeeds. Uses `__getActiveProductIds` + `__getCameraPose` drivers (BLOCKER-2).
- [ ] `src/test-utils/savedCameraDrivers.ts` exists with stub bodies that throw. Includes `__getActiveProductIds` declaration + impl-stub AND `__getCameraPose` declaration-only (BLOCKER-2).
- [ ] `src/components/RoomsTreePanel/savedCameraSet.ts` exists with stub returning empty Set.
- [ ] `npx tsc --noEmit` exits 0.

## Wave 1 GREEN checklist (Plan 48-02)

- [ ] cadStore.savedCamera test passes (including WARNING-6 round-trip).
- [ ] No edits to any test file in `src/{stores,components}/__tests__` (WARNING-3).
- [ ] No `seedTestRoom.ts` helper file created (WARNING-3).
- [ ] ThreeViewport installs `window.__getCameraPose()` in test mode (BLOCKER-2).

## Wave 2 GREEN checklist (Plan 48-03)

- [ ] PropertiesPanel + RoomsTreePanel tests pass.
- [ ] No edits to any test file in `src/{stores,components}/__tests__` (WARNING-3).
- [ ] e2e spec passes.
- [ ] main.tsx installs the savedCamera drivers.
- [ ] Per-file tsc checks ran during Task 2 (WARNING-5).

## Out-of-scope (do NOT test in Phase 48)

- Right-click context menu (canvas or tree) — deferred per D-01.
- Multiple saved cameras per node — single bookmark slot (CONTEXT § Out of scope).
- Save-action animation — instant write per CONTEXT § Out of scope.
- Saved camera for room nodes — leaf-only per D-07.
- Migration / backfill — fields are optional, old projects load fine.
- 2D Fabric canvas double-click integration — 3D-only feature.
