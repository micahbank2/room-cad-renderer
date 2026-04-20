---
phase: 30
slug: smart-snapping
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed per-requirement assertions live in `30-RESEARCH.md §Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react (both present from Phase 28/29) |
| **Config file** | `vitest.config.ts` at repo root |
| **Quick run command** | `npx vitest run tests/snapEngine.test.ts tests/snapGuides.test.ts tests/snapIntegration.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

*Populated by planner; `Status` flipped to `green`/`approved` by Plan 04 after execution.*

| Task ID   | Plan | Wave | Requirement         | Test Type    | Automated Command                                                                  | File Exists | Status  |
|-----------|------|------|---------------------|--------------|------------------------------------------------------------------------------------|-------------|---------|
| 30-01-T1  | 01   | 0    | SNAP-01, SNAP-02, SNAP-03 | unit (red → green in Plan 02) | `npx vitest run tests/snapEngine.test.ts`                                          | Plan 01 creates | pending |
| 30-01-T2  | 01   | 0    | SNAP-03             | fabric-unit (red → green in Plan 02) | `npx vitest run tests/snapGuides.test.ts`                                          | Plan 01 creates | pending |
| 30-01-T3  | 01   | 0    | SNAP-01, SNAP-02, SNAP-03 + D-07 | integration (red → green in Plan 03) | `npx vitest run tests/snapIntegration.test.tsx`                                    | Plan 01 creates | pending |
| 30-02-T1  | 02   | 1    | SNAP-01, SNAP-02    | unit         | `npx vitest run tests/snapEngine.test.ts`                                          | Plan 02 creates | pending |
| 30-02-T2  | 02   | 1    | SNAP-03             | fabric-unit  | `npx vitest run tests/snapGuides.test.ts`                                          | Plan 02 creates | pending |
| 30-03-T1  | 03   | 2    | SNAP-01, SNAP-02, SNAP-03 + D-07 | integration  | `npx vitest run tests/snapIntegration.test.tsx tests/dragIntegration.test.ts tests/toolCleanup.test.ts` | Plan 03 edits   | pending |
| 30-03-T2  | 03   | 2    | SNAP-01, SNAP-02, SNAP-03 + D-07 | integration  | `npx vitest run tests/snapIntegration.test.tsx tests/toolCleanup.test.ts`          | Plan 03 edits   | pending |
| 30-04-T1  | 04   | 3    | all                 | suite-run + typecheck | `npx vitest run` and `npx tsc --noEmit`                                            | N/A             | pending |
| 30-04-T2  | 04   | 3    | SNAP-01, SNAP-02, SNAP-03 + D-07 | manual (human-verify) | (see Manual-Only Verifications below)                                              | N/A             | pending |
| 30-04-T3  | 04   | 3    | documentation       | grep-assert  | `grep -q "nyquist_compliant: true" .planning/phases/30-smart-snapping/30-VALIDATION.md` | Plan 04 edits | pending |
| 30-04-T4  | 04   | 3    | documentation       | grep-assert  | `grep -E "Alt.*Option.*smart snap" CLAUDE.md`                                      | Plan 04 edits | pending |

---

## Wave 0 Requirements

- [ ] `tests/snapEngine.test.ts` — NEW. Pure-function tests: exclude-self, per-axis snap, tolerance edge (just-inside, just-outside), priority tiebreak (midpoint > edge-edge > edge-wall), grid fallback when out of tolerance, Alt-disable short-circuit.
- [ ] `tests/snapGuides.test.ts` — NEW. `SnapGuide[]` → Fabric object mapping. Renders axis lines and midpoint dots. `clearSnapGuides` removes all `data.type === "snap-guide"` objects.
- [ ] `tests/snapIntegration.test.tsx` — NEW. RTL + Fabric: product tool drag near wall edge → snapped position + guide visible; midpoint snap → midpoint-dot visible; Alt disables.
- [ ] No new deps — vitest + RTL + fabric all present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Snap feels snappy (not laggy) across scene sizes | Perf | Per-frame budget at real scene scale; perceptual | 1) Load a scene with ~40 walls + ~15 products. 2) Drag a product around for 10+ seconds. 3) Confirm snap guide appears without perceptible lag (<~16ms per frame). |
| Guide line is readable over all background themes | SNAP-03 | Visual contrast check — `accent-purple 60% opacity` on dark obsidian canvas needs to be clearly visible but not distracting | 1) Drag near a wall until snap engages. 2) Confirm the vertical/horizontal guide line is clearly visible against the dark canvas + grid. 3) Confirm midpoint dot is distinct from axis ticks. |
| Alt/Option key correctly disables smart snap | D-07 | Keyboard-integration perceptual check | 1) Drag a product near a wall until snap engages. 2) While dragging, hold Alt/Option. 3) Confirm the snap releases and the object moves freely (grid snap still applies if `gridSnap > 0`). |
| SNAP-01/02 feel right across angles and placements | SNAP-01, SNAP-02 | Real-world feel across diagonal walls, rotated products, midpoint variations | 1) Test snap near horizontal, vertical, and 45° walls. 2) Test midpoint auto-center on each. 3) Confirm the behavior matches Jessica's expectation of "lines up with the wall". |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
