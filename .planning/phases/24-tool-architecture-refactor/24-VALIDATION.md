---
phase: 24
slug: tool-architecture-refactor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.2 + @testing-library/react |
| **Config file** | `vitest.config.ts` (repo root) |
| **DOM library** | happy-dom ^20.8.9 + jsdom ^29.0.1 |
| **Quick run command** | `npm run test:quick` (dot reporter) |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~2s quick, ~6s full |
| **Baseline** | 171 tests in 28 files — **165 passing, 6 pre-existing failures** (none in tool code) |

### Pre-Existing Failure Baseline

Phase 24 must NOT introduce any new test failures. The 6 pre-existing failures below are treated as baseline and must remain the SAME tests failing at phase verification. (Capture exact names in Wave 0 before any refactor commits.)

- [ ] **Wave 0 task:** Run `npm test 2>&1 | tail -80` and record the 6 failing test names here
- [ ] Pre-existing failures DO NOT include any test file that imports from `src/canvas/tools/` (confirmed via grep in research)

---

## Sampling Rate

- **After every task commit:** Run `npm run test:quick` + applicable grep guards from "Per-Task Verification Map"
- **After every plan wave:** Run `npm test` + `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must match baseline (165 passed, 6 failed — same 6 names)
- **Max feedback latency:** ~2 seconds (quick), ~6 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-W0a | 01 | 0 | — | baseline | `npm test 2>&1 \| grep -E "✗\|FAIL"` record to VALIDATION.md | ✅ existing | ⬜ pending |
| 24-01-W0b | 01 | 0 | TOOL-03 | fs check | `test -f src/canvas/tools/toolUtils.ts` after Wave 0 | ❌ Wave 0 | ⬜ pending |
| 24-01-W0c | 01 | 0 | — | new test | `test -f tests/toolCleanup.test.ts` (D-14 leak regression guard) | ❌ Wave 0 | ⬜ pending |
| 24-02-01 | 02 | 1 | TOOL-03 | grep guard | `! grep -E "^function pxToFeet" src/canvas/tools/{wallTool,selectTool,doorTool,windowTool,productTool,ceilingTool}.ts` | ✅ repo shell | ⬜ pending |
| 24-02-02 | 02 | 1 | TOOL-03 | grep guard | `! grep -E "^function findClosestWall" src/canvas/tools/{doorTool,windowTool}.ts` | ✅ repo shell | ⬜ pending |
| 24-02-03 | 02 | 1 | TOOL-03 | grep guard | `for f in src/canvas/tools/{wallTool,selectTool,doorTool,windowTool,productTool,ceilingTool}.ts; do grep -q 'from "./toolUtils"' "$f" \|\| exit 1; done` | ✅ repo shell | ⬜ pending |
| 24-03-01 | 03 | 2 | TOOL-01 | grep guard | `! grep -rE "\(fc as any\)" src/canvas/tools/` | ✅ repo shell | ⬜ pending |
| 24-03-02 | 03 | 2 | TOOL-01 | type-check | `npx tsc --noEmit` exits 0 | ✅ already wired | ⬜ pending |
| 24-03-03 | 03 | 2 | TOOL-02 | grep guard | `! grep -E "^const state " src/canvas/tools/*.ts` (excludes productTool.pendingProductId / selectTool._productLibrary) | ✅ repo shell | ⬜ pending |
| 24-03-04 | 03 | 2 | TOOL-01/02 | integration | `npm test -- toolCleanup.test.ts` (leak guard) | ❌ Wave 0 | ⬜ pending |
| 24-04-01 | 04 | 3 | — | full suite | `npm test` — assert baseline (165/171 pass, same 6 failing names) | ✅ existing | ⬜ pending |
| 24-04-02 | 04 | 3 | — | manual | D-13 rapid tool-switch Chrome DevTools smoke (script below) | ✅ repo shell | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Plan/Task IDs are indicative — planner finalizes exact IDs.*

---

## Wave 0 Requirements

- [ ] **Record baseline failure snapshot** — run `npm test`, copy the 6 failing test full names into the "Pre-Existing Failure Baseline" section above so later waves can distinguish new regressions from baseline
- [ ] **Create `src/canvas/tools/toolUtils.ts`** — new module exporting `pxToFeet(px, origin, scale)` and `findClosestWall(feetPos, snapThreshold?)`. Zero consumer changes in Wave 0 (prevents half-converted state).
- [ ] **Create `tests/toolCleanup.test.ts`** — per D-14, 6 test cases (one per tool) that verify rapid `activate() → cleanup()` cycles leave `fc.__eventListeners` map empty. Uses Fabric v6 runtime inspection.

*If none: N/A — Wave 0 is required for this phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rapid tool switch does not leak DOM event listeners (outside Fabric's internal map — e.g. `window.keydown` from selectTool) | Success Criterion #4 | Automated test covers fc listeners only; DOM listeners require DevTools memory panel | 1. Start dev server. 2. Open Chrome DevTools → Performance Monitor. 3. Watch "DOM Nodes" and "JS event listeners" counters. 4. Rapidly press V→W→D→N→P→C 10x in quick succession. 5. Counters must return to baseline within 1s after stopping. |
| Tool behavior (drawing walls, placing doors/windows/products/ceilings, selecting) is visually identical pre- vs. post-refactor | Success Criterion #5 | No automated UI diff harness | 1. Create new project. 2. Draw 3 walls forming L-shape. 3. Place 1 door, 1 window. 4. Place 1 product from library. 5. Place 1 ceiling. 6. Select each element. 7. Delete each element. Verify every action works identically to pre-refactor commit. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (toolUtils.ts, toolCleanup.test.ts, baseline capture)
- [ ] No watch-mode flags (`npm test` = `vitest run`, not `vitest` watch)
- [ ] Feedback latency < 10s (quick ~2s, full ~6s)
- [ ] `nyquist_compliant: true` set in frontmatter once all Wave 0 items land

**Approval:** pending
