---
phase: 29
slug: editable-dim-labels
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed per-requirement assertions live in `29-RESEARCH.md §Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react (both confirmed — see Phase 28 baseline) |
| **Config file** | `vitest.config.ts` at repo root (already in place from Phase 28) |
| **Quick run command** | `npx vitest run tests/dimensionEditor.test.ts tests/dimensionOverlay.test.tsx tests/PropertiesPanel.length.test.tsx tests/cadStore.resizeWallByLabel.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command above
- **After every plan wave:** Run the full suite
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

- [ ] `tests/dimensionEditor.test.ts` — extend with every accepted feet+inches form (D-02) and every explicit reject (D-02a). Drive the parser to green.
- [ ] `tests/dimensionOverlay.test.tsx` — NEW. RTL test: dblclick hit → overlay renders with `formatFeet()` pre-fill → user types new value → Enter commits → `resizeWallByLabel` called with correct decimal feet. Assert 96px width, select-all on focus.
- [ ] `tests/PropertiesPanel.length.test.tsx` — NEW. Typing `12'6"` into the LENGTH row commits 12.5 feet via the new optional `parser` prop. Existing THICKNESS/HEIGHT rows unaffected (still parse as plain numbers).
- [ ] `tests/cadStore.resizeWallByLabel.test.ts` — NEW. Assert EXACTLY one `past` entry is pushed per `resizeWallByLabel` call (EDIT-21 single-undo lock-in).
- [ ] No new deps — vitest + @testing-library/react already present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Overlay sits visually over the wall dim label at any angle / zoom | EDIT-20 | Positional correctness at arbitrary wall angles is hard to assert without rendering | 1) Draw walls at 0°, 45°, 90°, 135°. 2) Dblclick each wall's dim label. 3) Confirm the input overlay appears centered over each label (visually overlapping, not offset). |
| Commit on blur feels natural | EDIT-20 (UX) | Perceptual timing — does click-away feel like "accept" or "lose my edit"? | 1) Dblclick a dim label. 2) Type a new valid value. 3) Click elsewhere on canvas. 4) Confirm wall resized. 5) Dblclick again, type an invalid value, click away. 6) Confirm wall unchanged (silent cancel). |
| Single-undo round-trip via Ctrl+Z | EDIT-21 | Keyboard-integration check across input + store | 1) Note wall length. 2) Dblclick → type new length → Enter. 3) Confirm resize. 4) Press Ctrl+Z once. 5) Confirm wall returns to original length in one keystroke. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
