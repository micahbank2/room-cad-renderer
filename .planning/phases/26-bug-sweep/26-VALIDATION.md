---
phase: 26
slug: bug-sweep
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (happy-dom env) |
| **Config file** | vite.config.ts / vitest.config.ts |
| **Quick run command** | `npm run test -- --run --reporter=dot` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run --reporter=dot`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-00-01 | 00 | 0 | FIX-01 | unit (RED) | `npm run test -- --run tests/fabricSync.image.test.ts` | ❌ W0 | ⬜ pending |
| 26-00-02 | 00 | 0 | FIX-02 | unit (RED) | `npm run test -- --run tests/ceilingMaterial.persistence.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-01 | 01 | 1 | FIX-01 | unit (GREEN) | `npm run test -- --run tests/fabricSync.image.test.ts` | ✅ after W0 | ⬜ pending |
| 26-02-01 | 02 | 2 | FIX-02 | unit (GREEN) | `npm run test -- --run tests/ceilingMaterial.persistence.test.ts` | ✅ after W0 | ⬜ pending |
| 26-03-01 | 03 | 3 | FIX-01, FIX-02 | regression | `npm run test -- --run` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/fabricSync.image.test.ts` — RED test reproducing FIX-01 (product image load → canvas re-render)
- [ ] `tests/ceilingMaterial.persistence.test.ts` — RED test reproducing FIX-02 (preset selection → snapshot round-trip → surfaceMaterialId survives)
- [ ] Reuse `MockImage` pattern from `tests/productImageCache.test.ts` (no new fixtures needed)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Thumbnail visibly appears in 2D canvas after product placement | FIX-01 | Pixel rendering isn't asserted in happy-dom | `npm run dev`; place a product with uploaded image; confirm image renders in canvas within one cycle |
| Thumbnail persists across IndexedDB save/reload | FIX-01 | IndexedDB in real browser; automated test uses in-memory snapshot | Save project; hard-refresh page; load project; confirm images render |
| Ceiling visibly changes material on preset click (e.g., WOOD_PLANK) | FIX-02 | Three.js renders not asserted; D-03 requires visibly distinct preset | `npm run dev`; open ceiling panel; click WOOD_PLANK; confirm ceiling mesh changes color/roughness |
| Ceiling preset persists across IndexedDB save/reload | FIX-02 | IndexedDB round-trip | Save project with WOOD_PLANK; hard-refresh; load; ceiling still WOOD_PLANK |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (both RED tests)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter (set after planner confirms mapping)

**Approval:** pending
