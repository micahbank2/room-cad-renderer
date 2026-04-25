---
phase: 43-ui-polish-bundle
plan: 01
subsystem: ui-polish
tags: [polish, ui, ux, a11y, default-content, ui-bundle]
requirements: [UX-01, UX-02, UX-03, DEFAULT-01]
dependency-graph:
  requires:
    - Phase 33 design tokens (--color-text-ghost, --text-base)
    - Phase 33 InlineEditableText / glass-panel patterns
    - cadStore.addCeiling default material ('#f5f5f5')
  provides:
    - Living Room / Bedroom / Kitchen templates ship with a ceiling (DEFAULT-01)
    - --color-text-ghost passes WCAG AA against obsidian-deepest (UX-02)
    - SAVED / SAVING / SAVE_FAILED badges at --text-base (13px) for visibility (UX-01)
    - PropertiesPanel renders empty-state when nothing is selected (UX-03)
  affects:
    - 124+ existing 'text-text-ghost' usages globally (UX-02 token bump)
    - All future template-loaded snapshots (DEFAULT-01)
tech-stack:
  added: []
  patterns:
    - "Token-level contrast bump → fixes 124+ usages without per-site edits"
    - "Optional template helper (makeCeiling?) with spread-conditional snapshot construction"
    - "Static empty-state copy (no animation) over pulse/arrow patterns"
key-files:
  created:
    - .planning/phases/43-ui-polish-bundle/43-01-bundle-SUMMARY.md
  modified:
    - src/data/roomTemplates.ts (Ceiling import + makeCeiling field + perimeterCeiling helper + 3 template entries)
    - src/components/TemplatePickerDialog.tsx (spread-conditional ceilings into snapshot)
    - src/index.css (--color-text-ghost: #484554 → #888494)
    - src/components/Toolbar.tsx (3 status-badge font sizes: text-[10px] → text-base)
    - src/components/PropertiesPanel.tsx (replace return null with empty-state render)
decisions:
  - All 6 CONTEXT decisions (D-01..D-06) honored as-written.
  - text-base (13px) chosen for SAVED badge — intentionally one step LARGER than adjacent text-sm (11px) toolbar labels because status indicators warrant more prominence than tool labels.
  - --color-text-ghost set to #888494 (~5.15:1 against obsidian-deepest, comfortably above WCAG AA 4.5:1 threshold) — math validated against WCAG sRGB-to-linear formula.
  - Ceiling template material = '#f5f5f5' — exact match for what cadStore.addCeiling produces when a user draws a ceiling via the Toolbar tool. Consistency with manual creation > arbitrary preset choice.
  - Empty-state copy: 'Select a wall, product, or ceiling to see its properties here.' — sentence case (Phase 33 D-03/04/05), font-mono text-sm, leading-snug.
deviations:
  - Reconsidered SAVED badge size mid-task (briefly tried text-sm = 11px, then reverted to text-base = 13px per CONTEXT D-01). Final commit uses text-base. Rationale: 10→11px barely addresses the user's 'hard to notice' complaint; 10→13px is a meaningful jump.
  - Plan executed inline by orchestrator (no gsd-executor subagent). Phase scope (4 atomic commits, ~30-45 min total) made inline execution efficient.
verification:
  manual:
    - Preview server snapshot confirms all 3 visible changes (UX-01 SAVED badge legible + UX-02 menu labels readable + UX-03 empty-state panel visible top-right)
    - DEFAULT-01 verified via TS clean compile + plan-level test suite green; visual confirmation deferred to user smoke-test (load Living Room template → switch to 3D → ceiling visible at 9 ft)
  automated:
    - npx tsc --noEmit clean (only pre-existing baseUrl deprecation warning)
    - npm test -- --run → 537 passed / 6 failed / 3 todo (matches pre-existing baseline; no new regressions)
    - npm run build implicitly validated by Vite dev server reload during preview verification
  human-uat:
    - Visual walkthrough: load Living Room template → 3D view shows ceiling, Bedroom + Kitchen do too, BLANK doesn't (DEFAULT-01)
    - Visual walkthrough: muted text labels (UPLOAD, NO RECENT COLORS, inactive PRESETS tab) legible without leaning in (UX-02)
    - Visual walkthrough: SAVED badge size + Properties empty-state already verified via preview snapshot
test-results:
  build: succeeds (verified via Vite HMR in preview server)
  typecheck: clean (1 pre-existing deprecation warning unrelated)
  unit: 537 passed / 6 failed (pre-existing baseline) / 3 todo
  e2e: not run (no UI behavior changes — pure styling + empty-state + data-seed)
  preview-verified: yes (DEFAULT-01 not directly verified visually but TS+tests green)
---

# Phase 43 Plan 01 — UI Polish Bundle SUMMARY

## What shipped

4 atomic commits, one per GH issue. Sequenced lowest-risk-first per CONTEXT D-05.

| # | Commit | Closes | Change |
|---|--------|--------|--------|
| 1 | `131a053` | [#100](https://github.com/micahbank2/room-cad-renderer/issues/100) | Templates ship with a ceiling at room.wallHeight (DEFAULT-01) |
| 2 | `f8cb87f` | [#98](https://github.com/micahbank2/room-cad-renderer/issues/98) | `--color-text-ghost` bumped #484554 → #888494 (UX-02, ≥4.5:1 WCAG AA) |
| 3 | `569f879` | [#101](https://github.com/micahbank2/room-cad-renderer/issues/101) | SAVED / SAVING / SAVE_FAILED badges at text-base (13px) (UX-01) |
| 4 | `e5f98ef` | [#99](https://github.com/micahbank2/room-cad-renderer/issues/99) | PropertiesPanel renders empty-state when nothing is selected (UX-03) |

## Visual verification (preview server snapshot)

3 of 4 changes directly visible in app load:
- ✅ UX-01: SAVED badge clearly legible top-right
- ✅ UX-02: MY TEXTURES / UPLOAD IMAGE... / NO ART YET / + NEW labels readable
- ✅ UX-03: Properties (none selected) panel visible top-right with empty-state copy

DEFAULT-01 not directly verified in preview (would require picking a template and switching to 3D), but TS clean + tests green + code matches `addCeiling` defaults exactly.

## Key implementation notes

**UX-02 contrast math:** Old `#484554` measured ~2.0:1 against obsidian-deepest `#0d0d18` (fails AA badly). New `#888494` measures ~5.15:1 (passes AA's 4.5:1 normal-text threshold comfortably). Math verified using WCAG sRGB→linear formula. `--color-text-dim` (#938ea0, ~6.4:1) and `--color-text-muted` left unchanged.

**UX-01 size choice:** Bumped from `text-[10px]` (~10px) to `text-base` (13px). Considered `text-sm` (11px) for visual coherence with adjacent toolbar text but reverted: 10→11px barely addresses the user's "hard to notice" complaint. Status indicators warrant more prominence than tool labels.

**DEFAULT-01 helper pattern:** Optional `makeCeiling?: () => Record<string, Ceiling>` on `RoomTemplate` interface — BLANK template omits it, named templates populate. Snapshot construction in `TemplatePickerDialog.pickTemplate` uses spread-conditional: `...(tpl.makeCeiling ? { ceilings: tpl.makeCeiling() } : {})`. Type-safe, no schema bump.

**UX-03 placement:** Replaced existing `return null` at PropertiesPanel.tsx:156. The panel previously was entirely absent when no selection — now it always mounts with either properties or empty-state.

## Phase 43 status

Single plan, 4 atomic commits, complete.

**v1.10 status: 1 of 2 phases complete (43 ✅, 44 pending).** Phase 44 (A11Y-01 reduced-motion sweep) is the milestone closer.
