---
phase: 3
slug: 3d-product-rendering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + jsdom + @testing-library/react |
| **Config file** | vitest.config.ts (from Phase 1) |
| **Test root** | `tests/` (Phase 1 convention — flat, not colocated `__tests__`) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run && npm run build` |
| **Estimated runtime** | ~15 seconds |

**R3F/WebGL limitation:** R3F rendering cannot run meaningfully in jsdom (no WebGL context). Logic extracted to pure TS modules (productTextureCache, floorTexture, exportFilename) is unit-tested. Mesh rendering + shadow quality + texture mapping are manual-verified in the browser preview.

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green + browser preview manual check
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|-----------|-------------------|-----------|--------|
| 03-00-01 | 00 | 0 | VIZ-04/06/SAVE-03 | infra (stubs) | `npm test -- --run` | tests/productTextureCache.test.ts, tests/floorTexture.test.ts, tests/exportFilename.test.ts | ⬜ pending |
| 03-01-01 | 01 | 1 | VIZ-04 | unit | `npm test productTextureCache -- --run` | tests/productTextureCache.test.ts | ⬜ pending |
| 03-01-02 | 01 | 1 | VIZ-04 | build | `npm run build` | (type-check) | ⬜ pending |
| 03-02-01 | 02 | 2 | VIZ-06 | unit | `npm test floorTexture -- --run` | tests/floorTexture.test.ts | ⬜ pending |
| 03-02-02 | 02 | 2 | VIZ-06 | build | `npm run build` | (type-check) | ⬜ pending |
| 03-03-01 | 03 | 2 | SAVE-03 | unit | `npm test exportFilename -- --run` | tests/exportFilename.test.ts | ⬜ pending |
| 03-03-02 | 03 | 2 | SAVE-03 | build | `npm run build` | (type-check) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All test files live at `tests/` root (Phase 1 convention):

- [ ] `tests/productTextureCache.test.ts` — stubs for VIZ-04 (cache hit/miss, error fallback)
- [ ] `tests/floorTexture.test.ts` — stubs for VIZ-06 (texture dims, tile-scale helper)
- [ ] `tests/exportFilename.test.ts` — stubs for SAVE-03 (filename formatter)

*Vitest config already exists from Phase 1. No new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Couch product with imageUrl shows image mapped onto 3D box | VIZ-04 | Requires WebGL rendering context | Add product with image, place in room, switch to 3D view, confirm texture visible on box |
| Floor has visible wood-plank texture with tile repeat | VIZ-06 | Visual rendering | Switch to 3D view, confirm warm wood floor (not flat color), inspect tile pattern |
| Soft PCF shadows cast from walls + products | VIZ-06 | WebGL shadow pipeline | Confirm shadows have soft edges (not hard pixel lines) and adjust with camera orbit |
| `<Environment>` provides ambient PBR bounce | VIZ-06 | HDR loading | Confirm walls/products show subtle indirect light, not pitch-black when directional light is blocked |
| EXPORT button downloads non-blank PNG from 3D view | SAVE-03 | Canvas toDataURL timing | Click EXPORT in 3D view, confirm PNG downloads with scene content (not blank) |
| EXPORT in 2D view shows "switch to 3D" toast/alert | SAVE-03 | DOM state check | Switch to 2D view, click EXPORT, confirm user-facing message instead of broken export |
| preserveDrawingBuffer enabled on Canvas gl prop | SAVE-03 | Grep check | `grep "preserveDrawingBuffer" src/three/ThreeViewport.tsx` returns true |
| Selector fix: `.bg-obsidian-deepest canvas` in export.ts | SAVE-03 | Grep check | `grep "bg-obsidian-deepest" src/lib/export.ts` matches |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter (flip AFTER execution, not now)

**Approval:** pending
