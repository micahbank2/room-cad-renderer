---
phase: 31
slug: drag-resize-label-override
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-20
signed_off: 2026-04-20
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 + happy-dom 20.8.9 + @testing-library/react |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npm test -- --run <pattern>` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30s |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run <changed-test-file>`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green (modulo pre-existing LIB-03/04/05 — see Out-of-Scope Failures below)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01.1 | 31-01 | 0 | EDIT-22 | unit | `npx vitest run tests/resizeHandles.test.ts` | yes | ✅ green |
| 31-01.1 | 31-01 | 0 | EDIT-22 | unit | `npx vitest run tests/resolveEffectiveDims.test.ts` | yes | ✅ green |
| 31-01.1 | 31-01 | 0 | EDIT-23 | unit | `npx vitest run tests/wallEndpointSnap.test.ts` | yes | ✅ green |
| 31-01.1 | 31-01 | 0 | CUSTOM-06 | unit | `npx vitest run tests/updatePlacedCustomElement.test.ts` | yes | ✅ green |
| 31-01.2 | 31-01 | 0 | EDIT-22 | integration (RTL) | `npx vitest run tests/phase31Resize.test.tsx` | yes | ✅ green |
| 31-01.2 | 31-01 | 0 | EDIT-23 | integration (RTL) | `npx vitest run tests/phase31WallEndpoint.test.tsx` | yes | ✅ green |
| 31-01.2 | 31-01 | 0 | EDIT-24 | integration (RTL) | `npx vitest run tests/phase31Undo.test.tsx` | yes | ✅ green |
| 31-01.2 | 31-01 | 0 | CUSTOM-06 | integration (RTL) | `npx vitest run tests/phase31LabelOverride.test.tsx` | yes | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test stub files scaffolded before implementation (final paths landed under `tests/` per Plan 31-01 deviation; semantics identical to the per-RESEARCH proposal):

- [x] `tests/resizeHandles.test.ts` — corner + edge hit-test unit tests
- [x] `tests/resolveEffectiveDims.test.ts` — override resolver unit tests (EDIT-22 D-02)
- [x] `tests/wallEndpointSnap.test.ts` — snap target builder + ortho composition (EDIT-23 D-05/D-06)
- [x] `tests/phase31Resize.test.tsx` — corner + edge resize integration (EDIT-22)
- [x] `tests/phase31WallEndpoint.test.tsx` — wall-endpoint smart-snap integration (EDIT-23)
- [x] `tests/phase31Undo.test.tsx` — single-undo integration across all 4 drag types + label-override (EDIT-24)
- [x] `tests/phase31LabelOverride.test.tsx` — RTL label-override input (CUSTOM-06)
- [x] `tests/updatePlacedCustomElement.test.ts` — new placement-mutator store action unit tests (CUSTOM-06)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge handle visual matches corner style | EDIT-22 | Pixel-level appearance | Select product, confirm 4 squares at N/S/E/W bbox midpoints render same fill/stroke as corners |
| Snap guide line renders during wall-endpoint drag | EDIT-23 | Visual timing / perceptual feedback | Drag wall endpoint near another endpoint; confirm accent-purple guide line + tick appear |
| Label override live-preview latency acceptable | CUSTOM-06 | Subjective feel | Type in label field; confirm canvas label updates without perceptible lag |
| Ctrl+Z after drag-resize fully restores pre-drag state | EDIT-24 | Final UX confirmation beyond automated counter | Resize product, press Ctrl+Z once, confirm exact pre-drag size restored |

See `31-HUMAN-UAT.md` for the executable checklist.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — 2026-04-20

---

## Full Suite Result

```
npm test -- --run
Test Files  3 failed | 45 passed (48)
     Tests  6 failed | 340 passed | 3 todo (349)
```

`npx tsc --noEmit`: only pre-existing TS5101 baseUrl deprecation warning (Phase 29 carryover).

### Out-of-Scope Failures (verified pre-existing, NOT Phase 31 regressions)

The 6 remaining failures all predate Phase 31 and are tracked in `deferred-items.md`:

- `tests/AddProductModal.test.tsx` — 3 failures (LIB-04 SKIP_DIMENSIONS rendering)
- `tests/SidebarProductPicker.test.tsx` — 2 failures (LIB-05 filter, dragstart effectAllowed)
- `tests/productStore.test.ts` — 1 failure (LIB-03 pre-load set() guard)

These belong to LIB-03/04/05 product-library work and are explicitly out of scope for Phase 31 per Plan 31-02 deviation tracking. Phase 31 contributes **+27 passing assertions and zero regressions**.

### Phase 31 Test Coverage (all green)

| Test File | Result |
|-----------|--------|
| `tests/resizeHandles.test.ts` | green |
| `tests/resolveEffectiveDims.test.ts` | green |
| `tests/wallEndpointSnap.test.ts` | green |
| `tests/updatePlacedCustomElement.test.ts` | green |
| `tests/phase31Resize.test.tsx` | green (6/6) |
| `tests/phase31WallEndpoint.test.tsx` | green (6/6) |
| `tests/phase31Undo.test.tsx` | green (7/7) |
| `tests/phase31LabelOverride.test.tsx` | green (9/9) |

### Phase 25/29/30 Regression Suites (all green)

| Test File | Result |
|-----------|--------|
| `tests/snapEngine.test.ts` | green (14/14) |
| `tests/snapGuides.test.ts` | green (6/6) |
| `tests/snapIntegration.test.tsx` | green (12/12) |
| `tests/dragIntegration.test.ts` | green (2/2) |
| `tests/PropertiesPanel.length.test.tsx` | green (5/5) |
