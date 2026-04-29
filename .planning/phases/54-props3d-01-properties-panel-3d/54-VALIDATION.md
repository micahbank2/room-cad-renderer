# Phase 54 — PROPS3D-01 Validation Reference

**Requirement:** PROPS3D-01 — PropertiesPanel renders selected object's properties in 3D and split view modes.

---

## Test Paths + Assertions

### Unit Tests — `src/hooks/__tests__/useClickDetect.test.ts`

| # | Test | Input | Expected | Command |
|---|------|-------|----------|---------|
| U1 | CLICK_THRESHOLD_PX exported constant | import | value === 5 | `npx vitest run src/hooks/__tests__/useClickDetect.test.ts` |
| U2 | distance < 5px → click | isClick(0,0,4,0) | true | same |
| U3 | distance === 5px → NOT click (exclusive) | isClick(0,0,5,0) | false | same |
| U4 | diagonal distance < 5px → click | isClick(0,0,3,3) | true (sqrt(18)≈4.24) | same |
| U5 | large movement → not click | isClick(0,0,100,50) | false | same |

**Run:** `npx vitest run src/hooks/__tests__/useClickDetect.test.ts`
**Expected:** 5 passed, 0 failed

---

### E2E Tests — `e2e/properties-panel-3d.spec.ts`

| # | Scenario | Method | Assertion | Regression Guard |
|---|----------|--------|-----------|-----------------|
| E1 | Wall id selection → PropertiesPanel visible in 3D | `__driveMeshSelect("wall_1")` | `[data-testid="properties-panel"]` visible | D-04 |
| E2 | Product id selection → PropertiesPanel visible in 3D | `__driveMeshSelect("pp_test")` | panel visible | D-04 |
| E3 | Click empty 3D space → selection clears | `page.mouse.click` at canvas corner | no crash; selectedIds is array | D-02 |
| E4 | Left-click wall face → onPointerUp dispatches select | `__setTestCamera` top-down + `page.mouse.click` at ~25% y | canvas still visible (no crash) | D-01 |
| E5 | Orbit drag ≥ 5px → selection unchanged | `page.mouse.down` + 50px move + `page.mouse.up` | selectedIds is array (no crash) | D-01 |
| E6 | Split mode: `__driveMeshSelect` → 2D pane PropertiesPanel updates | `__driveMeshSelect("wall_1")` in split | panel visible | D-03 |
| E7 | Split mode: 2D canvas click still works (regression) | `firstCanvas.click` | canvas visible (no crash) | Phase 31 |
| E8 | Phase 53 regression: right-click 3D → context menu | `page.mouse.click(..., { button: "right" })` | no crash; canvas visible | Phase 53 D-08 |
| E9 | Phase 47 regression: displayMode cycle unaffected | click display-mode button | canvas visible (no crash) | Phase 47 D-08 |

**Run:** `npx playwright test e2e/properties-panel-3d.spec.ts --project=chromium-dev`
**Expected:** 9 passed (or graceful skip where mesh coordinates are approximate)

---

## Regression Suite

| Phase | Spec | Command | What it guards |
|-------|------|---------|----------------|
| 53 | canvas-context-menu.spec.ts | `npx playwright test e2e/canvas-context-menu.spec.ts --project=chromium-dev` | Right-click context menus (D-08) |
| 47 | display-mode-cycle.spec.ts | `npx playwright test e2e/display-mode-cycle.spec.ts --project=chromium-dev` | NORMAL/SOLO/EXPLODE displayMode (D-08) |
| All | Full e2e suite | `npx playwright test e2e/ --project=chromium-dev` | No cross-phase regressions |
| All | vitest | `npx vitest run` | 6 pre-existing failures unchanged; 5 new pass |

---

## Phase Gate

All of the following must pass before `/gsd:verify-work`:

```bash
npx tsc --noEmit
npx vitest run src/hooks/__tests__/useClickDetect.test.ts
npx vitest run tests/lib/contextMenuActions.test.ts
npx vitest run
npx playwright test e2e/properties-panel-3d.spec.ts --project=chromium-dev
npx playwright test e2e/canvas-context-menu.spec.ts --project=chromium-dev
```

---

## Key Wiring Assertions (Manual Spot-Checks for HUMAN-UAT)

1. **3D-only mode, click wall face:** Select tool → click wall in 3D view → PropertiesPanel sidebar populates with wall properties (length, thickness, height). Previously showed nothing.
2. **Split mode, click in 3D pane:** In split view, click a product mesh in the 3D pane → the PropertiesPanel in the 2D pane (left side) updates to show product properties. No second panel needed.
3. **Orbit then check:** Orbit camera (click-drag) → no selection change. Click wall → selection fires. Confirms drag-threshold works.
4. **Right-click still works:** After Phase 54 wiring, right-click a wall in 3D → context menu still appears (not broken by new pointer handlers).
5. **Wall hit area note:** Wall face (large front/back surface) is reliable. Wall edges (0.5ft thick) require precision. Document in UAT.
