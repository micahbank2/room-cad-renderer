---
phase: 67
slug: material-engine-foundation-mat-engine-01
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 67 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test -- --run <test-file>` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted test for the affected file (`npm run test -- --run <test-file>`)
- **After every plan wave:** Run full suite (`npm run test -- --run`)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

*Populated by planner during Step 8.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD by planner | | | MAT-ENGINE-01 | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Per RESEARCH.md, Wave 0 must install these test files before any implementation:

- [ ] `tests/materialStore.test.ts` — stubs for materialStore CRUD + dedup behavior
- [ ] `tests/useMaterials.test.tsx` — hook hydration, StrictMode-safety
- [ ] `tests/uploadMaterialModal.test.tsx` — form validation, dedup-hit branch, error states
- [ ] `tests/materialsList.test.tsx` — list rendering + hover tooltip
- [ ] `tests/materialPersistence.test.ts` — IDB hydration across reload
- [ ] `tests/materialDriver.test.ts` — `window.__driveMaterialUpload` test bridge contract

*Existing infrastructure (`tests/userTextureStore.test.ts`, etc.) provides direct templates for parallel implementations.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hover tooltip visual placement (no clipping at viewport edges) | MAT-ENGINE-01 §4 | Visual layout, hover state — automated tests can verify text content but not perceived placement | Hover Material card near right and bottom edges of library panel; verify tooltip stays in viewport |
| Drag-and-drop UX feel (cursor change, drop zone affordance) | MAT-ENGINE-01 §1 | Drag UX is hard to assert in JSDOM | Open Upload Material modal; drag a JPEG over color-map drop zone; verify drop zone visually highlights |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
