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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-00-01 | 00 | 0 | LIB-03/04/05 | infra | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 02-01-01 | 01 | 1 | LIB-03 | unit | `npm test productStore -- --run` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | LIB-04 | unit | `npm test productHelpers -- --run` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | LIB-04 | unit | `npm test AddProductModal -- --run` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | LIB-05 | unit | `npm test SidebarProductPicker -- --run` | ❌ W0 | ⬜ pending |
| 02-05-01 | 05 | 3 | LIB-03/04 | unit | `npm test fabricSync -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/stores/__tests__/productStore.test.ts` — stubs for LIB-03 (CRUD, persistence, loaded-gate)
- [ ] `src/lib/__tests__/productHelpers.test.ts` — stubs for LIB-04 (effectiveDimensions, hasRealDimensions)
- [ ] `src/components/__tests__/AddProductModal.test.tsx` — stubs for LIB-04 (Skip dimensions toggle)
- [ ] `src/components/__tests__/SidebarProductPicker.test.tsx` — stubs for LIB-05 (name search)
- [ ] `src/canvas/__tests__/fabricSync.test.ts` — stubs for orphan/null-dim placeholder render

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
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
