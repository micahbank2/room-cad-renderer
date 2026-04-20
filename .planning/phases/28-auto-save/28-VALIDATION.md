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
| **Framework** | vitest (confirm via research: existing `tests/useAutoSave.test.ts` pattern) |
| **Config file** | `vitest.config.ts` (if absent, Wave 0 adds) |
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

*Populated by planner — every task MUST map to an automated command or a Wave 0 test stub. Manual-only items go to the table below.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| *(planner fills)* | | | | | | | |

---

## Wave 0 Requirements

- [ ] `tests/useAutoSave.test.ts` — extend / create with debounce, rename-trigger, and save-failure stubs
- [ ] `tests/App.restore.test.tsx` — silent-restore on mount + WelcomeScreen fallback stubs
- [ ] Confirm vitest + `@testing-library/react` deps present; add if missing
- [ ] Fake-timer helper utilities for debounce assertions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Reload restores the exact scene Jessica left | SAVE-05 #3 | End-to-end hydration path spans IndexedDB + React mount; manual flush-and-refresh is the highest-fidelity check | 1) Draw a wall, add a product. 2) Wait for SAVED. 3) Hard-refresh the tab. 4) Confirm canvas shows the identical wall + product with no WelcomeScreen flash. |
| SAVING→SAVED toolbar animation fidelity | SAVE-06 | Visual polish in the SAVE-04 surface; automated text-match is not a perceptual check | 1) Draw a wall. 2) Observe the ToolbarSaveStatus transitions SAVING… → SAVED → fade. 3) Confirm uses `text-success` color and obsidian-theme typography. |
| SAVE_FAILED persistence until next success | D-04a | Requires simulating IndexedDB failure (quota exhaustion or private mode) | 1) Open DevTools → Application → IndexedDB → block writes or fill quota. 2) Draw a wall. 3) Confirm SAVE_FAILED appears and does NOT auto-fade. 4) Clear the block. 5) Draw another wall. 6) Confirm next success clears the failed state. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
