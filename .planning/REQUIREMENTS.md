---
milestone: v1.10
milestone_name: Evidence-Driven UX Polish
status: active
created: 2026-04-25
source: Phase 39 v2.0 scope seeds (filtered to evidence-driven items only — speculative competitor-insight + feature work explicitly deferred)
---

# v1.10 Requirements — Evidence-Driven UX Polish

**Milestone goal:** Tighten the v1.9 surface by closing the 4-5 GH-tracked UX issues with real evidence behind them. Skip the speculative items (Pascal competitor copies, feature work without demand signal). Smaller, faster milestone. Validates "evidence-driven prioritization" as a follow-up to v1.9's "feedback-first sequencing."

**Source:** [GH #76](https://github.com/micahbank2/room-cad-renderer/issues/76), [#98](https://github.com/micahbank2/room-cad-renderer/issues/98), [#99](https://github.com/micahbank2/room-cad-renderer/issues/99), [#100](https://github.com/micahbank2/room-cad-renderer/issues/100), [#101](https://github.com/micahbank2/room-cad-renderer/issues/101). All 5 issues filed from real use, not borrowed from competitor audit.

**Success measure:** All 5 GH issues closed with PR references. Each fix verifiable in <30 seconds of manual smoke. No new feature surface area. No new dependencies.

**Stack:** Existing — no new runtime deps. Reuses Phase 33 design tokens, Phase 35 `useReducedMotion` hook, Phase 33 `InlineEditableText` / `CollapsibleSection` primitives where applicable.

**Cross-cutting decisions inherited:** All `MUST-*` discipline, 6 pre-existing vitest failures permanently accepted (Phase 37 D-02), CI vitest disabled (Phase 36-02), R3F v8 / drei v9 / React 18 lock.

---

## v1.10 Requirements

### UI Polish (UX)

- [ ] **UX-01** — The auto-save SAVED badge in the Toolbar is large enough to notice without searching for it.
  - **Source:** [GH #101](https://github.com/micahbank2/room-cad-renderer/issues/101) — observed during real use.
  - **Verifiable:** Save fires (any CAD edit + ~2 s wait). Toolbar shows "SAVED" indicator that's at least as large as adjacent toolbar text and visually distinct from background. Confirm legibility at default viewport zoom (100%).
  - **Acceptance:** Existing 'SAVED' badge gains larger font-size or higher-contrast background. Phase 33 `--text-base` token (13px) is the new minimum. No new chrome added; existing element resized.

- [ ] **UX-02** — Muted text labels (UPLOAD, NO RECENT COLORS, etc.) are readable against the obsidian-deepest background.
  - **Source:** [GH #98](https://github.com/micahbank2/room-cad-renderer/issues/98) — accessibility issue observed during real use.
  - **Verifiable:** Open ProductLibrary, FloorMaterialPicker, SwatchPicker. All `text-text-dim` / `text-text-ghost` labels meet WCAG AA contrast (≥4.5:1 for body text or ≥3:1 for ≥18px text) against their actual background.
  - **Acceptance:** Audit `--color-text-dim` / `--color-text-ghost` against the surfaces they appear on. Adjust the dimmest tokens upward (lighter) until WCAG AA is met. NO new tokens added — adjusting existing tokens is preferred for design-system consistency.

- [ ] **UX-03** — The right-side Properties panel has a discoverable affordance when no element is selected.
  - **Source:** [GH #99](https://github.com/micahbank2/room-cad-renderer/issues/99) — discovery problem observed during real use.
  - **Verifiable:** Open the app with nothing selected. The Properties panel either (a) shows an explicit empty-state message ("Select a wall, product, or ceiling to edit its properties") or (b) is collapsed with a clear "open Properties" affordance. Currently the panel is just blank — users don't know what to do.
  - **Acceptance:** Add empty-state copy + a hint icon or `<EmptyState>` primitive. Preserve existing CollapsibleSection persistence behavior. No new state stores.

### Default Content (DEFAULT)

- [ ] **DEFAULT-01** — Default Living Room / Bedroom / Kitchen templates include a ceiling.
  - **Source:** [GH #100](https://github.com/micahbank2/room-cad-renderer/issues/100) — observed during real use; every new project from a template lacks a ceiling.
  - **Verifiable:** New project from any of the 3 default templates → 3D view shows a ceiling at room.wallHeight. Fresh blank project still has no ceiling (intentional — only templates).
  - **Acceptance:** Edit the template seed data (likely `src/data/templates.ts` or similar) so each template's `CADSnapshot.rooms.r1.ceilings` includes a single ceiling polygon matching the room dimensions, with the template's named material. No schema changes; reuses the existing Ceiling type.

### Accessibility (A11Y)

- [ ] **A11Y-01** — `prefers-reduced-motion` is honored across snap-guide animations and camera-related tweens.
  - **Source:** [GH #76](https://github.com/micahbank2/room-cad-renderer/issues/76) — Phase 33 introduced `useReducedMotion` for new animations (D-39). Existing snap guides + wall-side camera lerp pre-date that hook.
  - **Verifiable:** Enable `prefers-reduced-motion: reduce` (DevTools → Rendering → Emulate). Drag a product near a wall — snap guides appear instantly without fade-in/out. Click "face wall side" — camera snaps to wall instead of lerping. Phase 35 preset tween already honors this; add the same guard to snap guides + wall-side lerp.
  - **Acceptance:** Wrap relevant animation paths in `useReducedMotion` checks. When reduced motion is on: snap guides render at full opacity instantly (no fade); wall-side camera target snaps directly (no lerp). Camera presets (Phase 35) and any other animation already guarded stays as-is.

---

## Future Requirements (Deferred to later milestones)

These items are intentionally **out of v1.10**. The Pascal competitor-insight set + feature work without demand signal stay parked until Jessica or Micah surfaces actual evidence of need.

- **Pascal competitor-insight set:** [#79](https://github.com/micahbank2/room-cad-renderer/issues/79) (per-node saved camera + Focus), [#80](https://github.com/micahbank2/room-cad-renderer/issues/80) (room display modes — solo/explode), [#78](https://github.com/micahbank2/room-cad-renderer/issues/78) (rooms hierarchy sidebar tree), [#77](https://github.com/micahbank2/room-cad-renderer/issues/77) (auto-generate material swatch thumbnails) — speculative; copying competitor ≠ user evidence
- **Properties panel in 3D/split** ([#97](https://github.com/micahbank2/room-cad-renderer/issues/97)) — actual feature, no demand signal
- **PBR extensions** ([#81](https://github.com/micahbank2/room-cad-renderer/issues/81)) — feature work without demand
- **Phase 999.1** — ceiling drag-resize handles (re-deferred from v1.9 cancellation; revisit when feedback surfaces actual ceiling-resize friction)
- **Phase 999.3** — full design-effect tile-size override (re-deferred from v1.9 cancellation; the per-surface isolation BUG-01 already shipped)
- **AUDIT-01** — auto-generate VERIFICATION.md from SUMMARY at phase-complete; systemic process improvement, not user-visible
- **Major-version leaps** — backend + auth + cloud sync + sharing, mobile/iPad, R3F v9 / React 19 — all explicitly out of scope. No demand signal exists. Revisit only when Jessica surfaces an actual need ("I want to use this on iPad", "I want to share with [person]", etc.)
- **Lighting controls, walk-mode improvements, layout templates, multi-room navigation, export workflow, AI-assisted layout** — feature work without demand. Revisit per real-use signal.

## Traceability

Phase → requirement mapping. Plan column filled by `/gsd:plan-phase` when each phase is planned.

| Requirement | Phase | Plan(s) |
| ----------- | ----- | ------- |
| UX-01 | Phase 43 | TBD |
| UX-02 | Phase 43 | TBD |
| UX-03 | Phase 43 | TBD |
| DEFAULT-01 | Phase 43 | TBD |
| A11Y-01 | Phase 44 | TBD |

---

*Last updated: 2026-04-25*
