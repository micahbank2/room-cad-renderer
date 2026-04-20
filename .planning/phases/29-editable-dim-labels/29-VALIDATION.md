---
phase: 29
slug: editable-dim-labels
status: complete
nyquist_compliant: true
wave_0_complete: true
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

*Finalized by Plan 04 sign-off.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01.1 | 29-01 | 0 | EDIT-20 | unit | `npx vitest run tests/dimensionEditor.test.ts` | yes | green |
| 01.2 | 29-01 | 0 | EDIT-20 | RTL | `npx vitest run tests/dimensionOverlay.test.tsx` | yes | green |
| 01.3 | 29-01 | 0 | EDIT-20 | RTL | `npx vitest run tests/PropertiesPanel.length.test.tsx` | yes | green |
| 01.4 | 29-01 | 0 | EDIT-21 | unit | `npx vitest run tests/cadStore.resizeWallByLabel.test.ts` | yes | green |
| 02.1 | 29-02 | 1 | EDIT-20 | unit | `npx vitest run tests/dimensionEditor.test.ts` | yes | green |
| 02.2 | 29-02 | 1 | EDIT-20 | RTL | `npx vitest run tests/dimensionOverlay.test.tsx` | yes | green |
| 03.1 | 29-03 | 1 | EDIT-20 | RTL | `npx vitest run tests/PropertiesPanel.length.test.tsx` | yes | green |
| 04.1 | 29-04 | 2 | EDIT-20,EDIT-21 | suite | `npx vitest run && npx tsc --noEmit` | yes | green |
| 04.2 | 29-04 | 2 | EDIT-20,EDIT-21 | manual | (checkpoint:human-verify) | n/a | approved |

**Plan 04 Task 1 execution results (2026-04-20):**
- `npx vitest run` — 238 passed / 6 failed / 3 todo (37 files). The 6 failures are all pre-existing and unrelated to Phase 29 (`AddProductModal.test.tsx` ×3, `SidebarProductPicker.test.tsx` ×2, `productStore.test.ts` ×1 — noted in PROJECT.md as "6 pre-existing unrelated failures" carried forward from v1.5).
- All four Phase 29 test files GREEN: `dimensionEditor.test.ts` (25), `dimensionOverlay.test.tsx` (5), `PropertiesPanel.length.test.tsx` (4), `cadStore.resizeWallByLabel.test.ts` (3) — **37/37 pass**.
- `npx tsc --noEmit` — exits 2 due to pre-existing `tsconfig.json` `baseUrl` deprecation warning (declared acceptable in Plan 04 success criteria). No type errors in Phase 29 code.

**Plan 04 Task 2 checkpoint (2026-04-20):**
- Auto-approved per orchestrator auto-mode (`workflow.auto_advance: true`).
- 3 perceptual items (overlay position at 0°/45°/90°/135°, commit-on-blur feel, single-keystroke Ctrl+Z undo) deferred to phase-level HUMAN-UAT file — the phase verifier will create `29-HUMAN-UAT.md` per v1.6 convention established in Phase 28.

---

## Wave 0 Requirements

- [x] `tests/dimensionEditor.test.ts` — extended with every accepted feet+inches form (D-02) and every explicit reject (D-02a). Drove the parser to green in Plan 02.
- [x] `tests/dimensionOverlay.test.tsx` — NEW. RTL test: dblclick hit → overlay renders with `formatFeet()` pre-fill → user types new value → Enter commits → `resizeWallByLabel` called with correct decimal feet. Asserts 96px width, select-all on focus.
- [x] `tests/PropertiesPanel.length.test.tsx` — NEW. Typing `12'6"` into the LENGTH row commits 12.5 feet via the new optional `parser` prop. Existing THICKNESS/HEIGHT rows unaffected (still parse as plain numbers).
- [x] `tests/cadStore.resizeWallByLabel.test.ts` — NEW. Asserts EXACTLY one `past` entry is pushed per `resizeWallByLabel` call (EDIT-21 single-undo lock-in).
- [x] No new deps — vitest + @testing-library/react already present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Overlay sits visually over the wall dim label at any angle / zoom | EDIT-20 | Positional correctness at arbitrary wall angles is hard to assert without rendering | 1) Draw walls at 0°, 45°, 90°, 135°. 2) Dblclick each wall's dim label. 3) Confirm the input overlay appears centered over each label (visually overlapping, not offset). |
| Commit on blur feels natural | EDIT-20 (UX) | Perceptual timing — does click-away feel like "accept" or "lose my edit"? | 1) Dblclick a dim label. 2) Type a new valid value. 3) Click elsewhere on canvas. 4) Confirm wall resized. 5) Dblclick again, type an invalid value, click away. 6) Confirm wall unchanged (silent cancel). |
| Single-undo round-trip via Ctrl+Z | EDIT-21 | Keyboard-integration check across input + store | 1) Note wall length. 2) Dblclick → type new length → Enter. 3) Confirm resize. 4) Press Ctrl+Z once. 5) Confirm wall returns to original length in one keystroke. |

**Disposition (Plan 04):** Auto-approved in orchestrator auto-mode; perceptual items deferred to `29-HUMAN-UAT.md` for browser smoke.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** signed off 2026-04-20
