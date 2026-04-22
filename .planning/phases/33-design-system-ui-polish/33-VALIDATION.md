---
phase: 33
slug: design-system-ui-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `33-RESEARCH.md` Validation Architecture section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.2 (already installed) |
| **Config file** | `vite.config.ts` (test block) |
| **Quick run command** | `npm test -- --run <pattern>` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30 seconds (current ~50 test files) |

Existing test harness covers Phase 31 label override + drag-transaction patterns via `phase31Label*.test.ts` and `phase31Resize*.test.ts`. Phase 33 tests follow the same structure: test drivers gated by `import.meta.env.MODE === "test"`, exposed on `window.__drive*`.

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run phase33`
- **After every plan wave:** Run full suite `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

Populated by planner as each PLAN.md is written. Expected test files (one per GH issue):

| Plan | Wave | Requirement | Test File | Test Type | File Exists |
|------|------|-------------|-----------|-----------|-------------|
| 01 (lucide+tokens) | 1 | setup | `tests/phase33/tokens.test.ts` | unit (CSS token presence) | ❌ W0 |
| 02 (#83 typography) | 1 | GH #83 | `tests/phase33/typography.test.ts` | unit (grep-based) | ❌ W0 |
| 03 (#90 spacing audit) | 1 | GH #90 | `tests/phase33/spacingAudit.test.ts` | unit (grep-based) | ❌ W0 |
| 04 (#84 collapsible) | 2 | GH #84 | `tests/phase33/collapsibleSections.test.ts` | component + driver | ❌ W0 |
| 05 (#89 unified library) | 2 | GH #89 | `tests/phase33/libraryCard.test.ts` | component | ❌ W0 |
| 06 (#85 floating toolbar) | 3 | GH #85 | `tests/phase33/floatingToolbar.test.ts` | driver (`__driveFloatingToolbar`) | ❌ W0 |
| 07 (#86 gesture chip) | 3 | GH #86 | `tests/phase33/gestureChip.test.ts` | component | ❌ W0 |
| 08 (#87 rotation presets) | 3 | GH #87 | `tests/phase33/rotationPresets.test.ts` | driver (undo stack depth) | ❌ W0 |
| 09 (#88 inline title/tabs) | 3 | GH #88 | `tests/phase33/inlineTitleEdit.test.ts` | driver (reuse `__driveLabelOverride` shape) | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase33/` directory — create test directory
- [ ] `tests/phase33/tokens.test.ts` — assert `--font-size-display`, `--font-size-base`, `--font-size-sm` defined in compiled CSS; assert `--radius-lg` value (post-canonicalization)
- [ ] `tests/phase33/spacingAudit.test.ts` — grep-based: no `[0-9]+px` arbitrary Tailwind values in `Toolbar.tsx`, `Sidebar.tsx`, `PropertiesPanel.tsx`, `RoomSettings.tsx` (or whichever 4 files the audit locks in)
- [ ] `tests/phase33/typography.test.ts` — grep-based: no blanket `.toUpperCase()` in header/button/label render paths; monospace only applied to known value/identifier classes
- [ ] Test drivers (gated by `import.meta.env.MODE === "test"`):
  - [ ] `window.__driveCollapsibleSection` — toggle section open state, read persisted state
  - [ ] `window.__driveFloatingToolbar` — get toolbar position relative to selection bbox
  - [ ] `window.__driveRotationPreset` — click -45/+45 preset, return past.length delta
  - [ ] `window.__driveInlineTitleEdit` — mirror `__driveLabelOverride` shape for document title + room tab
  - [ ] `window.__driveGestureChip` — read chip visibility state

*No framework install needed — Vitest ^4.1.2 already present.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Floating toolbar visual position (no occlusion of resize handles) | GH #85 | Visual judgment — automated geometry check can pass while toolbar still looks wrong | Select product → verify toolbar appears above bbox without overlapping N/E/S/W handles |
| Gesture chip non-intrusiveness | GH #86 | Subjective — "non-intrusive corner" is visual | Confirm chip in corner doesn't compete with canvas content |
| Typography hierarchy "3 visually distinct levels" | GH #83 | Visual contrast between display/base/sm must read as 3 levels, not 2-with-nuance | Inspect toolbar + sidebar + modal — verify headings feel separable |
| Icon size/stroke consistency post-#90 | GH #90 | Lucide stroke-width and size must feel coherent next to retained Material Symbols | Side-by-side visual check in Toolbar (lucide) + Canvas controls (Material Symbols) |
| Inline-edit Escape rewinds live preview | GH #88 | Subjective UX smoothness (mirror Phase 31 feel) | Edit title, type change, press Escape — verify snap back feels instant |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING test file references
- [ ] No watch-mode flags in commands
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter after planner fills per-task map

**Approval:** pending
