---
phase: 1
slug: 2d-canvas-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from RESEARCH.md §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (to install — none currently present) |
| **Config file** | `vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~2 seconds (quick), ~5 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual visual verification of drag-drop (EDIT-07), rotation handle (EDIT-08), product image rendering (EDIT-09)
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 00 | 0 | infra | install | `npx vitest run --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | EDIT-09 | unit | `npx vitest run tests/productImageCache.test.ts -t "cache hit/miss"` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | EDIT-09 | unit | `npx vitest run tests/productImageCache.test.ts -t "async load"` | ❌ W0 | ⬜ pending |
| TBD | 02 | 2 | EDIT-07 | unit | `npx vitest run tests/dragDrop.test.ts -t "coord translation"` | ❌ W0 | ⬜ pending |
| TBD | 02 | 2 | EDIT-07 | integration | `npx vitest run tests/dragDrop.test.ts -t "snap + place"` | ❌ W0 | ⬜ pending |
| TBD | 02 | 2 | EDIT-07 | integration | `npx vitest run tests/dragDrop.test.ts -t "auto-select"` | ❌ W0 | ⬜ pending |
| TBD | 03 | 2 | EDIT-08 | unit | `npx vitest run tests/rotationHandle.test.ts -t "snap 15"` | ❌ W0 | ⬜ pending |
| TBD | 03 | 2 | EDIT-08 | unit | `npx vitest run tests/rotationHandle.test.ts -t "shift disables snap"` | ❌ W0 | ⬜ pending |
| TBD | 03 | 2 | EDIT-08 | unit | `npx vitest run tests/rotationHandle.test.ts -t "world position"` | ❌ W0 | ⬜ pending |
| TBD | 03 | 2 | EDIT-08 | unit (store) | `npx vitest run tests/cadStore.test.ts -t "rotate"` | ❌ W0 | ⬜ pending |
| TBD | 04 | 2 | EDIT-06 | unit | `npx vitest run tests/dimensionEditor.test.ts -t "position"` | ❌ W0 | ⬜ pending |
| TBD | 04 | 2 | EDIT-06 | unit | `npx vitest run tests/geometry.test.ts -t "resize wall"` | ❌ W0 | ⬜ pending |
| TBD | 04 | 2 | EDIT-06 | unit (store) | `npx vitest run tests/cadStore.test.ts -t "wall resize corner"` | ❌ W0 | ⬜ pending |
| TBD | 04 | 2 | EDIT-06 | unit | `npx vitest run tests/dimensionEditor.test.ts -t "invalid input"` | ❌ W0 | ⬜ pending |
| TBD | 05 | 3 | SAVE-02 | unit (fake timers) | `npx vitest run tests/useAutoSave.test.ts -t "debounce"` | ❌ W0 | ⬜ pending |
| TBD | 05 | 3 | SAVE-02 | unit | `npx vitest run tests/useAutoSave.test.ts -t "auto-create"` | ❌ W0 | ⬜ pending |
| TBD | 05 | 3 | SAVE-02 | unit | `npx vitest run tests/useAutoSave.test.ts -t "status transitions"` | ❌ W0 | ⬜ pending |
| TBD | 05 | 3 | SAVE-02 | unit (component) | `npx vitest run tests/SaveIndicator.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs (e.g., 1-01-01) will be filled in by gsd-planner based on actual PLAN.md task breakdowns.*

---

## Wave 0 Requirements

- [ ] `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom happy-dom` — install test framework
- [ ] `vitest.config.ts` — extend vite.config.ts with `test.environment: "jsdom"`, `test.globals: true`
- [ ] `tests/setup.ts` — `import "@testing-library/jest-dom"` + any global fixtures
- [ ] `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`
- [ ] `tests/geometry.test.ts` — stubs for `snapTo`, `distance`, `angle`, `wallLength`, `closestPointOnWall`, `formatFeet`, `wallCorners`, plus new wall-resize helper
- [ ] `tests/cadStore.test.ts` — stubs for `placeProduct`, `moveProduct`, `rotateProduct`, `updateWall`, `undo`/`redo`, new `rotateProductNoHistory`
- [ ] `tests/dragDrop.test.ts` — stubs for coord translation + integration
- [ ] `tests/rotationHandle.test.ts` — stubs for snap math + world-position math
- [ ] `tests/dimensionEditor.test.ts` — stubs for overlay position + input validation
- [ ] `tests/productImageCache.test.ts` — stubs for cache contract
- [ ] `tests/useAutoSave.test.ts` — stubs with fake timers + mocked idb-keyval
- [ ] `tests/SaveIndicator.test.tsx` — component render stubs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dragover preventDefault allows drop to fire | EDIT-07 | Browser event sequencing can't be fully reproduced in jsdom | In browser: drag product card from library, verify cursor shows drop-allowed icon, drop and confirm product appears at drop point |
| Product image visibly renders in 2D canvas | EDIT-09 | Fabric canvas image rendering is a pixel-level concern | In browser: upload a product with image, place on canvas, confirm image shows (not just dashed border) |
| Rotation handle visual position during drag | EDIT-08 | Fabric rendering + cursor tracking is a visual concern | In browser: select placed product, drag handle in arc, confirm smooth rotation and handle follows product |
| Save indicator fade animation | SAVE-02 | CSS animation timing is a visual concern | In browser: make a change, observe "Saving..." → "Saved" → fade sequence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags in automated commands
- [ ] Feedback latency < 2s (verified after Wave 0 install)
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 complete)

**Approval:** pending
