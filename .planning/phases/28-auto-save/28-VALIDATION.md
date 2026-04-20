---
phase: 28
slug: auto-save
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed per-requirement assertions live in `28-RESEARCH.md §Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.2 (confirmed in package.json) |
| **Config file** | `vitest.config.ts` at repo root (Plan 01 Task 1 creates if absent; otherwise `vite.config.ts` inline `test:` block takes precedence) |
| **Quick run command** | `npx vitest run tests/useAutoSave.test.ts tests/App.restore.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command above
- **After every plan wave:** Run the full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

*Populated by planner 2026-04-20. Every task maps to an automated command or a Wave 0 test stub. Manual-only items go to the table below.*

| Task ID  | Plan | Wave | Requirement     | Test Type           | Automated Command                                                              | File Exists         | Status   |
|----------|------|------|-----------------|---------------------|--------------------------------------------------------------------------------|---------------------|----------|
| 28-01-T1 | 01   | 0    | SAVE-05,SAVE-06 | infra               | `npx vitest run tests/useAutoSave.test.ts --reporter=dot`                      | creates Wave 0      | planned  |
| 28-01-T2 | 01   | 0    | SAVE-05,SAVE-06 | unit (stubs)        | `npx vitest run tests/useAutoSave.test.ts --reporter=dot`                      | extends existing    | planned  |
| 28-01-T3 | 01   | 0    | SAVE-05         | integration (stubs) | `npx vitest run tests/App.restore.test.tsx --reporter=dot`                     | creates Wave 0      | planned  |
| 28-02-T1 | 02   | 1    | SAVE-06         | unit + typecheck    | `npx vitest run tests/useAutoSave.test.ts && npx tsc --noEmit`                 | yes (from Plan 01)  | planned  |
| 28-02-T2 | 02   | 1    | SAVE-05,SAVE-06 | unit                | `npx vitest run tests/useAutoSave.test.ts --reporter=dot`                      | yes (from Plan 01)  | planned  |
| 28-03-T1 | 03   | 2    | SAVE-05         | typecheck           | `npx tsc --noEmit`                                                             | n/a (source only)   | planned  |
| 28-03-T2 | 03   | 2    | SAVE-05         | unit                | `npx vitest run tests/useAutoSave.test.ts --reporter=dot`                      | yes (from Plan 01)  | planned  |
| 28-03-T3 | 03   | 2    | SAVE-05         | integration         | `npx vitest run tests/App.restore.test.tsx --reporter=dot`                     | yes (from Plan 01)  | planned  |
| 28-04-T1 | 04   | 3    | SAVE-05,SAVE-06 | doc                 | `grep -c "28-01-T\|28-02-T\|28-03-T" .planning/phases/28-auto-save/28-VALIDATION.md` | yes (this file)     | planned  |
| 28-04-T2 | 04   | 3    | SAVE-05,SAVE-06 | full suite          | `npx vitest run --reporter=dot`                                                | n/a                 | planned  |
| 28-04-T3 | 04   | 3    | SAVE-05,SAVE-06 | manual (checkpoint) | see `## Manual-Only Verifications` below                                       | n/a                 | planned  |
| 28-04-T4 | 04   | 3    | SAVE-05,SAVE-06 | doc                 | `grep "nyquist_compliant: true" .planning/phases/28-auto-save/28-VALIDATION.md`| yes (this file)     | planned  |

---

## Wave 0 Requirements

- [ ] `tests/useAutoSave.test.ts` — extend with debounce, rename-trigger, ui-store no-trigger, save-failure, failed-no-fade, subsequent-success-clears-failed, drag-single-save (Plan 01 Task 2)
- [ ] `tests/App.restore.test.tsx` — new file with silent-restore happy path, no-pointer fallthrough, stale-pointer fallthrough, loadProject-throws fallthrough (Plan 01 Task 3)
- [ ] Confirm `vitest` + `@testing-library/react` deps present (package.json — both confirmed in 28-RESEARCH.md §Environment Availability)
- [ ] Fake-timer helpers already available via `vi.useFakeTimers()` / `vi.advanceTimersByTimeAsync` — no new helpers needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Reload restores the exact scene Jessica left | SAVE-05 #3 | End-to-end hydration path spans IndexedDB + React mount; manual flush-and-refresh is the highest-fidelity check | 1) Draw a wall, add a product. 2) Wait for SAVED. 3) Hard-refresh the tab. 4) Confirm canvas shows the identical wall + product with no WelcomeScreen flash. |
| SAVING→SAVED toolbar animation fidelity | SAVE-06 | Visual polish in the SAVE-04 surface; automated text-match is not a perceptual check | 1) Draw a wall. 2) Observe the ToolbarSaveStatus transitions SAVING… → SAVED → fade. 3) Confirm uses `text-success` color and obsidian-theme typography. |
| SAVE_FAILED persistence until next success | D-04a | Requires simulating IndexedDB failure (quota exhaustion or private mode) | 1) Open DevTools → Application → IndexedDB → block writes or fill quota. 2) Draw a wall. 3) Confirm SAVE_FAILED appears and does NOT auto-fade. 4) Clear the block. 5) Draw another wall. 6) Confirm next success clears the failed state. |
| Single save per drag (no spam) | SAVE-05 | IndexedDB write count observability is easier via DevTools event log than a unit test that perfectly simulates Fabric mouse events | 1) Watch `keyval-store` writes in DevTools. 2) Drag a product continuously for 3+ seconds. 3) Confirm exactly ONE write fires at drag-end (not per frame). |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
