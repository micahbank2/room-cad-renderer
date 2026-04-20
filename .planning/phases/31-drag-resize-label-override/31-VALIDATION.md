---
phase: 31
slug: drag-resize-label-override
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
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
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Populated by planner. Each task must either reference an `<automated>` command or declare a Wave 0 test-stub dependency.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test stub files to scaffold before implementation (enumerate per RESEARCH.md §Validation Architecture):

- [ ] `src/canvas/__tests__/resizeHandles.test.ts` — corner + edge hit-test unit tests
- [ ] `src/lib/__tests__/effectiveDimensions.test.ts` — override resolver unit tests
- [ ] `src/canvas/__tests__/wallEndpointSnap.test.ts` — snap target builder + ortho composition
- [ ] `src/canvas/tools/__tests__/dragResizeIntegration.test.tsx` — single-undo integration (corner + edge + wall-endpoint)
- [ ] `src/components/__tests__/PropertiesPanel.labelOverride.test.tsx` — RTL label-override input
- [ ] `src/stores/__tests__/updatePlacedCustomElement.test.ts` — new store action unit tests
- [ ] `src/canvas/tools/__tests__/labelOverrideRender.test.tsx` — 2D label render lookup

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge handle visual matches corner style | EDIT-22 | Pixel-level appearance | Select product, confirm 4 squares at N/S/E/W bbox midpoints render same fill/stroke as corners |
| Snap guide line renders during wall-endpoint drag | EDIT-23 | Visual timing / perceptual feedback | Drag wall endpoint near another endpoint; confirm accent-purple guide line + tick appear |
| Label override live-preview latency acceptable | CUSTOM-06 | Subjective feel | Type in label field; confirm canvas label updates without perceptible lag |
| Ctrl+Z after drag-resize fully restores pre-drag state | EDIT-24 | Final UX confirmation beyond automated counter | Resize product, press Ctrl+Z once, confirm exact pre-drag size restored |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
