---
phase: 18
slug: color-paint-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (not yet installed — Wave 0) |
| **Config file** | `vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | PAINT-01, PAINT-03 | unit | `npx vitest run src/__tests__/farrowAndBall.test.ts src/__tests__/paintStore.test.ts src/__tests__/colorUtils.test.ts` | :x: W0 | :white_large_square: pending |
| 18-01-02 | 01 | 1 | PAINT-04, PAINT-06, PAINT-07 | unit | `npx vitest run src/__tests__/cadStore.paint.test.ts` | :x: W0 | :white_large_square: pending |
| 18-02-01 | 02 | 2 | PAINT-01, PAINT-02, PAINT-05 | type-check | `npx tsc --noEmit` | n/a | :white_large_square: pending |
| 18-03-01 | 03 | 3 | PAINT-01, PAINT-03, PAINT-04 | type-check | `npx tsc --noEmit` | n/a | :white_large_square: pending |
| 18-03-02 | 03 | 3 | PAINT-05 | manual | visual 2D/3D | n/a | :white_large_square: pending |
| 18-04-01 | 04 | 4 | PAINT-01 through PAINT-07 | manual | visual full verification | n/a | :white_large_square: pending |

*Status: :white_large_square: pending · :white_check_mark: green · :x: red · :warning: flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/react` — install dev dependencies
- [ ] `vitest.config.ts` — basic config with path aliases
- [ ] `src/__tests__/farrowAndBall.test.ts` — F&B catalog shape, count, hue families, no dupes
- [ ] `src/__tests__/paintStore.test.ts` — derived view reflects cadStore.customPaints
- [ ] `src/__tests__/colorUtils.test.ts` — resolvePaintHex F&B, custom, fallback
- [ ] `src/__tests__/cadStore.paint.test.ts` — snapshot/undo/redo customPaints + recentPaints, addCustomPaint, removeCustomPaint, applyPaintToAllWalls

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Paint color visible in 2D floor plan | PAINT-05 | Visual rendering on Fabric.js canvas | 1. Select wall -> apply F&B color -> verify fill color in 2D |
| Paint color visible in 3D view | PAINT-05 | Visual rendering in Three.js scene | 1. Apply paint -> switch to 3D -> verify material color |
| Lime wash chalky appearance | PAINT-04 | Visual roughness assessment | 1. Apply paint -> enable lime wash -> verify matte/chalky look in 3D |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
