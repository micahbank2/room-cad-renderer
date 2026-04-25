---
milestone: v1.9
milestone_name: Polish & Feedback
status: active
created: 2026-04-25
source: v1.8 carry-over tech debt + parked backlog (999.1 + 999.3) + real-use feedback gathering
---

# v1.9 Requirements — Polish & Feedback

**Milestone goal:** Close v1.8 carry-over tech debt, ship two parked backlog features Jessica has already asked for (ceiling resize handles, per-surface texture tile-size override), and gather real-use feedback to inform v2.0 scoping.

**Source:** [v1.8-MILESTONE-AUDIT.md](milestones/v1.8-MILESTONE-AUDIT.md) (AUDIT-01), Phase 999.1 backlog (ceiling resize), [GH #105](https://github.com/micahbank2/room-cad-renderer/issues/105) / Phase 999.3 backlog (texture tile-size override), Phase 35 HUMAN-UAT items.

**Success measure:** Phases 35/36/37 each have a formal `VERIFICATION.md`. Jessica's feedback from a scheduled real-use session is captured as a ranked-priority document that becomes the v2.0 scope input. Ceilings can be drag-resized via edge handles like products and walls. Jessica can preview the same wood floor at 6"/12"/18" plank widths without re-uploading.

**Stack:** No new runtime dependencies. R3F v8 / drei v9 / React 18 lock holds. Reuses Phase 31 drag-resize pattern (widthFtOverride / depthFtOverride / single-undo drag transaction) and Phase 34 user-texture pipeline (RepeatWrapping + texture.repeat math).

**Cross-cutting decisions inherited from v1.8:** All `MUST-*` discipline (color-space, RepeatWrapping, anisotropy, Suspense, refcount dispose). 6 pre-existing vitest failures stay permanently accepted per Phase 37 D-02. CI vitest stays disabled.

---

## v1.9 Requirements

### Verification Backfill (POLISH)

- [ ] **POLISH-01** — Phases 35, 36, and 37 each have a formal `VERIFICATION.md` with goal-backward analysis, observable truths, must-haves verification, and pass/fail status. Backfill closes AUDIT-01 from v1.8.
  - **Source:** v1.8 milestone audit (`.planning/milestones/v1.8-MILESTONE-AUDIT.md` AUDIT-01).
  - **Verifiable:** `ls .planning/phases/35-camera-presets/35-VERIFICATION.md .planning/phases/36-viz-10-regression/36-VERIFICATION.md .planning/phases/37-tech-debt-sweep/37-VERIFICATION.md` returns all three files. Each has the standard frontmatter (status, score, verified date) and reads coherently against the phase's actual implementation. Substitute evidence (SUMMARY frontmatter + e2e specs + ROOT-CAUSE.md) referenced where appropriate — don't fabricate verification not actually performed.
  - **Acceptance:** All three VERIFICATION.md files exist with status `passed` (Phase 35 + 37) or `passed_with_carry_over` (Phase 36, since VIZ-10 outcome is no-repro Branch B not a fix). Cross-references the existing SUMMARYs and ROOT-CAUSE.md rather than re-deriving evidence.

### Real-Use Feedback (FEEDBACK)

- [ ] **FEEDBACK-01** — A scheduled ~1-hour session captures Jessica's real-use friction. Output is a ranked-priority document at `.planning/feedback/v1.9-jessica-session.md` that becomes the v2.0 scoping input.
  - **Source:** Strategic decision — v1.8 was big and fast; needs real-use signal before betting on the next major capability.
  - **Verifiable:** Document exists at the named path. Contains: (a) ≥3 specific friction points she hit during real use (with what task she was trying to do), (b) ≥3 "I wish it could…" feature requests with her own framing, (c) Phase 35 HUMAN-UAT review covering eye-level pose interpretation + easeInOutCubic feel + active-highlight contrast (each marked confirmed / adjust / reject), (d) a top-3 ranked-priority list synthesized from the session.
  - **Acceptance:** Doc reflects an actual session, not invented content. Top-3 list explicitly informs Phase 40/41 ordering for v1.9 AND seeds the v2.0 scope discussion. Items not actionable in v1.9 captured as backlog (999.x).

### Ceiling Resize Handles (CEIL)

- [ ] **CEIL-01** — Ceilings (custom-elements with `kind: "ceiling"`) can be drag-resized via edge handles like products and walls. Mirrors the Phase 31 pattern.
  - **Source:** Phase 999.1 backlog. Originally captured 2026-04-21 during Phase 32 T4 human UAT (Jessica) — pre-existing gap, not Phase 32 scope.
  - **Verifiable:** Select a ceiling in 2D → 4 edge handles render (N/S/E/W). Drag a handle → ceiling resizes along that axis only, with `widthFtOverride` / `depthFtOverride` written to `PlacedCustomElement` (mirrors Phase 31 product/custom-element resize). Single-undo: `past.length` increments by exactly 1 per drag cycle. Alt/Option disables smart-snap during the drag (grid-snap still applies). 3D ceiling mesh re-renders at the new dimensions. Reset action clears the override.
  - **Acceptance:** Reuses `resolveEffectiveCustomDims` resolver. Reuses Phase 31 single-undo drag-transaction pattern (mousedown push history, NoHistory mid-drag, no extra entries). Reuses Phase 25 fast-path (`renderOnAddRemove: false` + `_dragActive` flag). Smart-snap scene includes wall edges + other ceiling edges (per Phase 30 D-08b extension).

### Per-Surface Texture Tile-Size Override (TILE)

- [ ] **TILE-01** — Each surface (floor, wall.wallpaper side, ceiling) can have an optional per-placement texture tile-size override that scales the texture for design effect without changing the catalog tile size.
  - **Source:** [GH #105](https://github.com/micahbank2/room-cad-renderer/issues/105) / Phase 999.3 backlog. Discovered 2026-04-25 during Phase 35 HUMAN-UAT — Jessica asked why wood oak doesn't scale up with the floor; confirmed real-world tiling is correct, this is the natural follow-up enhancement.
  - **Verifiable:** Apply `wood-oak` texture to a floor → texture tiles at catalog size (e.g., 0.5 ft plank width × N planks across the floor). In the floor material picker (or a new "Tile size" affordance), enter a custom tile size in feet+inches (reusing Phase 29 parser) → texture re-tiles at the new size; one IDB entry, one catalog reference, one per-placement override. Reset clears the override → texture returns to catalog size. Override survives page reload. Override is per-surface — same texture on a different floor renders independently.
  - **Acceptance:** New optional fields: `floor.tileSizeOverrideFt?: number`, `wall.wallpaper.tileSizeOverrideFt?: number`, `ceiling.tileSizeOverrideFt?: number`. Default `undefined` (uses catalog tile size). Renderer math: `texture.repeat = surface_dim / (override ?? catalog.tileSizeFt)`. UI: small `+`/`-` stepper or feet+inches input in the material picker showing effective tile size + reset button. Snapshot persists override per-surface. Orphan-safe (deleting the texture clears the override along with the assignment).

---

## Future Requirements (Deferred to v2.0+)

These items are intentionally **out of v1.9** and will be revisited based on FEEDBACK-01 results:

- **Lighting controls** — directional light angle, ambient intensity, time-of-day presets
- **Walk-mode improvements** — head bob, transition smoothness, collision
- **Layout templates** — pre-built room layouts for common scenarios
- **Multi-room navigation** — UI for moving between rooms in the same project
- **Export workflow** — PDF / shopping-list / spec-sheet output
- **AI-assisted layout** — Claude-suggested furniture placement
- **Mobile / iPad support** — currently desktop-only
- **Backend + auth + cloud sync + sharing** — currently local-first
- **R3F v9 / React 19 upgrade** — still gated on R3F v9 stability (#56)
- **Per-surface rotation / offset / seam-smoothing** — beyond TILE-01 scope; revisit in v2.0+ texture polish

## Traceability

Phase → requirement mapping. Plan column filled by `/gsd:plan-phase` when each phase is planned.

| Requirement | Phase | Plan(s) |
| ----------- | ----- | ------- |
| POLISH-01 | Phase 38 | TBD |
| FEEDBACK-01 | Phase 39 | TBD |
| CEIL-01 | Phase 40 | TBD |
| TILE-01 | Phase 41 | TBD |

---

*Last updated: 2026-04-25*
