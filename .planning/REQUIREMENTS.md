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

- [x] **POLISH-01** — Phases 35, 36, and 37 each have a formal `VERIFICATION.md` with goal-backward analysis, observable truths, must-haves verification, and pass/fail status. Backfill closes AUDIT-01 from v1.8. _(Shipped via Phase 38 / PR #110.)_
  - **Source:** v1.8 milestone audit (`.planning/milestones/v1.8-MILESTONE-AUDIT.md` AUDIT-01).
  - **Verifiable:** `ls .planning/phases/35-camera-presets/35-VERIFICATION.md .planning/phases/36-viz-10-regression/36-VERIFICATION.md .planning/phases/37-tech-debt-sweep/37-VERIFICATION.md` returns all three files. Each has the standard frontmatter (status, score, verified date) and reads coherently against the phase's actual implementation. Substitute evidence (SUMMARY frontmatter + e2e specs + ROOT-CAUSE.md) referenced where appropriate — don't fabricate verification not actually performed.
  - **Acceptance:** All three VERIFICATION.md files exist with status `passed` (Phase 35 + 37) or `passed_with_carry_over` (Phase 36, since VIZ-10 outcome is no-repro Branch B not a fix). Cross-references the existing SUMMARYs and ROOT-CAUSE.md rather than re-deriving evidence.

### Real-Use Feedback (FEEDBACK)

- [x] **FEEDBACK-01** — A scheduled ~1-hour session captures Jessica's real-use friction. Output is a ranked-priority document at `.planning/feedback/v1.9-jessica-session.md` that becomes the v2.0 scoping input. _(Shipped via Phase 39 / PR #111 + #112. Format pivoted from in-person hybrid to async 5-question questionnaire per CONTEXT D-08 due to calendar constraints. Result: zero friction reported, all 3 Phase 35 HUMAN-UAT items confirmed, Phase 40/41 cancellation decision recommended + accepted, 8 GH issues curated as v2.0 scope seeds. Acceptance thresholds for friction/wishes not met — honest absence reported, deliberate over fabrication.)_
  - **Source:** Strategic decision — v1.8 was big and fast; needs real-use signal before betting on the next major capability.
  - **Verifiable:** Document exists at the named path. Contains: (a) ≥3 specific friction points she hit during real use (with what task she was trying to do), (b) ≥3 "I wish it could…" feature requests with her own framing, (c) Phase 35 HUMAN-UAT review covering eye-level pose interpretation + easeInOutCubic feel + active-highlight contrast (each marked confirmed / adjust / reject), (d) a top-3 ranked-priority list synthesized from the session.
  - **Acceptance:** Doc reflects an actual session, not invented content. Top-3 list explicitly informs Phase 40/41 ordering for v1.9 AND seeds the v2.0 scope discussion. Items not actionable in v1.9 captured as backlog (999.x).

### Per-Surface Texture Tile-Size Bug Fix (BUG)

- [x] **BUG-01** — When the same user-uploaded texture is applied to multiple surfaces (floor + wall, two walls, etc.), each surface honors its own `tileSizeFt` independently. Currently changing the tile size on one surface affects all surfaces sharing that texture ([GH #96](https://github.com/micahbank2/room-cad-renderer/issues/96)). _(Shipped via Phase 42 / PR #114. Field named `Ceiling.scaleFt` (not `tileSizeFt`) per Phase 42 D-01 — matches existing `Wallpaper.scaleFt` + `FloorMaterial.scaleFt` schema convention; user-facing UI label stays "Tile size." 4 new tests guard the per-surface isolation invariant.)_
  - **Source:** [GH #96](https://github.com/micahbank2/room-cad-renderer/issues/96). Re-scoped from full TILE-01 design-effect override (deferred to v2.0+) per Phase 39 feedback recommendation accepted 2026-04-25 — Jessica's Q4 confirmed catalog-default tile sizing feels right, but the per-surface bug exists regardless of whether she has noticed it.
  - **Verifiable:** Apply user-texture X to floor with `tileSizeFt=8`. Apply same user-texture X to a wall with `tileSizeFt=4`. Both surfaces render at their own tile size — floor planks 8 ft, wall planks 4 ft. Snapshot stores the per-surface tile size on the surface assignment, not on the catalog entry. Page reload preserves both. Catalog tile size stays a default-only fallback.
  - **Acceptance:** Per-surface `tileSizeFt` lives on the surface assignment (`floor.tileSizeFt`, `wall.wallpaper.tileSizeFt`, `ceiling.tileSizeFt`) — NOT on the user-texture catalog entry alone. Renderer reads from surface override; falls back to catalog default if surface override missing. Snapshot serializes the per-surface value. Migration handles existing snapshots that wrote tile size to the catalog (back-fill the surface override on read). Tests assert both-surfaces-different-tile-sizes invariant.

---

## Future Requirements (Deferred to v2.0+)

These items are intentionally **out of v1.9**. The CEIL-01 / TILE-01 deferrals were promoted from v1.9 scope to v2.0+ on 2026-04-25 after Phase 39 feedback signal showed Jessica reported zero pain on either area. They remain valid candidate work — just not warranted on hypothesis-only.

- **CEIL-01** (was v1.9 Phase 40) — Ceilings drag-resizable via edge handles like products and walls. Mirrors Phase 31 pattern. **Deferred:** Jessica's Phase 39 Q5 said ceilings "went fine" — no signaled pain. Phase 999.1 backlog. Revisit if a future feedback session surfaces actual ceiling-resize friction.
- **TILE-01** (was v1.9 Phase 41 — full design-effect override) — Optional per-placement `tileSizeOverrideFt` that scales textures for design effect (preview wide-plank vs narrow-plank in same room without re-uploading). **Deferred:** Jessica's Phase 39 Q4 said catalog-default tile sizing "feels right" — design-effect override is hypothesis-only. The narrower BUG-01 (#96 fix above) lands the per-surface isolation that's actually required regardless. Phase 999.3 backlog. Revisit when a future feedback session surfaces design-effect demand.
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

### Phase 39 v2.0 scope seeds (curated GH issues)

Items surfaced from Phase 39's "GH backlog IS the wishlist" insight. v2.0 scoping starts here:

- **UX polish trio:** [#97](https://github.com/micahbank2/room-cad-renderer/issues/97) (Properties panel in 3D/split), [#98](https://github.com/micahbank2/room-cad-renderer/issues/98) (muted text contrast), [#99](https://github.com/micahbank2/room-cad-renderer/issues/99) (Properties panel onboarding)
- **Quick wins:** [#100](https://github.com/micahbank2/room-cad-renderer/issues/100) (default templates need ceilings), [#101](https://github.com/micahbank2/room-cad-renderer/issues/101) (SAVED badge too small), [#76](https://github.com/micahbank2/room-cad-renderer/issues/76) (`prefers-reduced-motion` for snap guides + camera tweens)
- **Pascal competitor-insight set:** [#79](https://github.com/micahbank2/room-cad-renderer/issues/79) (per-node saved camera + Focus), [#80](https://github.com/micahbank2/room-cad-renderer/issues/80) (room display modes — solo/explode), [#78](https://github.com/micahbank2/room-cad-renderer/issues/78) (rooms hierarchy sidebar tree), [#77](https://github.com/micahbank2/room-cad-renderer/issues/77) (auto-generate material swatch thumbnails)
- **PBR extensions:** [#81](https://github.com/micahbank2/room-cad-renderer/issues/81) (AO + displacement + emissive)

## Traceability

Phase → requirement mapping. Plan column filled by `/gsd:plan-phase` when each phase is planned.

| Requirement | Phase | Plan(s) |
| ----------- | ----- | ------- |
| POLISH-01 | Phase 38 | 38-01 ✅ |
| FEEDBACK-01 | Phase 39 | 39-01, 39-02 ✅ |
| BUG-01 | Phase 42 | 42-01 ✅ |
| ~~CEIL-01~~ | ~~Phase 40~~ → CANCELLED 2026-04-25; deferred to v2.0+ (Phase 999.1 backlog) | n/a |
| ~~TILE-01~~ | ~~Phase 41~~ → CANCELLED 2026-04-25; deferred to v2.0+ (Phase 999.3 backlog) | n/a |

---

*Last updated: 2026-04-25*
