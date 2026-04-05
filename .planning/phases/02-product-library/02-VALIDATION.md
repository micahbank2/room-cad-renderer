---
phase: 2
slug: product-library
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 2 — Validation Strategy

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

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|-----------|-------------------|-----------|--------|
| 02-00-01 | 00 | 0 | LIB-03/04/05 | infra (stubs) | `npm test -- --run` | tests/productStore.test.ts, tests/productHelpers.test.ts, tests/productSearch.test.ts | ⬜ pending |
| 02-00-02 | 00 | 0 | LIB-04/05 | infra (stubs) | `npm test -- --run` | tests/AddProductModal.test.tsx, tests/SidebarProductPicker.test.tsx | ⬜ pending |
| 02-01-01 | 01 | 1 | LIB-04/05 | unit | `npm test productHelpers -- --run && npm test productSearch -- --run` | tests/productHelpers.test.ts, tests/productSearch.test.ts | ⬜ pending |
| 02-01-02 | 01 | 1 | LIB-03 | unit | `npm test productStore -- --run` | tests/productStore.test.ts | ⬜ pending |
| 02-02-01 | 02 | 2 | LIB-04 | component | `npm test AddProductModal -- --run` | tests/AddProductModal.test.tsx | ⬜ pending |
| 02-02-02 | 02 | 2 | LIB-04 | build | `npm run build` | (type-check only) | ⬜ pending |
| 02-03-01 | 03 | 2 | LIB-03 | build | `npm run build` | (type-check only) | ⬜ pending |
| 02-03-02 | 03 | 2 | LIB-05 | component | `npm test SidebarProductPicker -- --run` | tests/SidebarProductPicker.test.tsx | ⬜ pending |
| 02-04-01 | 04 | 3 | LIB-03/04 | unit | `npm test fabricSync -- --run && npm run build` | tests/fabricSync.test.ts | ⬜ pending |
| 02-04-02 | 04 | 3 | LIB-03/04 | build+suite | `npm run build && npm test -- --run` | (type-check + full suite) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All test files live at `tests/` root (Phase 1 convention — flat layout, no `__tests__` subdirectories):

- [ ] `tests/productStore.test.ts` — stubs for LIB-03 (CRUD, persistence, loaded-gate)
- [ ] `tests/productHelpers.test.ts` — stubs for LIB-04 (effectiveDimensions, hasDimensions)
- [ ] `tests/productSearch.test.ts` — stubs for LIB-05 (name search)
- [ ] `tests/AddProductModal.test.tsx` — stubs for LIB-04 (Skip dimensions toggle)
- [ ] `tests/SidebarProductPicker.test.tsx` — stubs for LIB-05 (search + DRAG_MIME)

*Vitest config already exists from Phase 1. No new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Product Jessica uploads in Project A appears in Project B | LIB-03 | Cross-project IndexedDB flow + browser UI | Add product in Project A → create Project B → confirm product appears in library sidebar and library view |
| 3D placeholder renders with 80% opacity and 2×2×2 fallback | LIB-04 | Three.js visual rendering | Place null-dim product → switch to 3D view → visually confirm transparent box at 2×2×2 ft |
| Dashed accent border on 2D canvas for null-dim / orphan products | LIB-04 / LIB-03 | Fabric.js visual rendering | Place null-dim product → confirm dashed border; delete library product → confirm orphan placed products show dashed border with name label |
| Drag-drop from Sidebar product picker onto canvas | LIB-05 | Browser HTML5 DnD events | Type name in sidebar search → drag thumbnail → drop on canvas → product placed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter (flip AFTER execution, not now)

**Approval:** pending
