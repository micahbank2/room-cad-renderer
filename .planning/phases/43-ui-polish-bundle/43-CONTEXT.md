# Phase 43: UI Polish Bundle — Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Close 4 GH-tracked UX issues bundled by code-surface proximity. All four are real reports from Phase 34 UAT — no speculation.

**In scope:**
- UX-01 ([#101](https://github.com/micahbank2/room-cad-renderer/issues/101)) — Toolbar SAVED badge enlarged
- UX-02 ([#98](https://github.com/micahbank2/room-cad-renderer/issues/98)) — `text-text-ghost` token contrast fix
- UX-03 ([#99](https://github.com/micahbank2/room-cad-renderer/issues/99)) — PropertiesPanel empty-state copy
- DEFAULT-01 ([#100](https://github.com/micahbank2/room-cad-renderer/issues/100)) — Templates include a ceiling

**Out of scope:**
- Pulse animations / motion (skipped per D-04 — static visibility beats animated distraction; also keeps reduced-motion-correct without needing a guard)
- Adding new design tokens (D-02 adjusts existing `--color-text-ghost` value)
- New empty-state primitive component (use simple inline copy per D-03)
- Schema changes for ceiling-in-template (extend existing `ROOM_TEMPLATES` data only)
</domain>

<decisions>
## Implementation Decisions

### UX-01 SAVED badge — typography, not animation
- **D-01:** Increase the SAVED badge's font size from its current ~10px to `--text-base` (13px) — same as adjacent toolbar text. Do NOT add a pulse / fade animation.
- **Reason:** Static visibility is the durable fix. A pulse would only fire on save→saved transition; users glancing later would still see the same too-small badge. Bumping size + maintaining the existing `text-text-dim` color delivers always-visible reassurance. Skipping the animation also avoids needing a `useReducedMotion` guard (would have been extra work for no value-add).

### UX-02 contrast — adjust `--color-text-ghost`, not `--color-text-dim`
- **D-02:** Bump `--color-text-ghost` from `#484554` to a value meeting WCAG AA (≥4.5:1) against `--color-obsidian-deepest` (`#0d0d18`). Recommended target: ~`#7e7a8a` or similar (~0.18 relative luminance). Do NOT touch `--color-text-dim` (`#938ea0` already passes ~6.4:1) or `--color-text-muted` (clearly bright). Do NOT add new tokens.
- **Reason:** `--color-text-ghost` at #484554 measures ~2.1:1 against obsidian-deepest — fails AA. Reported sites (UPLOAD label, NO RECENT COLORS, inactive PRESETS tab) all use `text-text-ghost`. Adjusting one token at the source fixes 124+ usages globally without per-site edits. Implementation should pick the exact hex by measuring against actual deployed backgrounds (obsidian-deepest, obsidian-low, obsidian-mid) and pick the lightest value that still feels "ghost" rather than "dim."

### UX-03 PropertiesPanel empty-state — static copy, not animation
- **D-03:** When `selectedIds.length === 0`, render a simple empty-state block with copy: "Select a wall, product, or ceiling to see its properties here." No pulse, no arrow animation, no dismissible affordance.
- **Reason:** Static copy is discoverable on every fresh visit (not just first-time). Animation requires reduced-motion guards + state for "have we shown it yet" — over-engineering for a 2-line message. The copy itself teaches the mental model: "selection drives editing."

### DEFAULT-01 templates ceiling — extend ROOM_TEMPLATES data
- **D-04:** Extend `RoomTemplate` interface with `makeCeiling: () => Record<string, Ceiling>`. Each template (Living Room / Bedroom / Kitchen) returns a single ceiling polygon at its room's perimeter, height matched to `room.wallHeight`, default material `PLASTER` (or whichever ceiling preset is the existing default — verify in implementation). BLANK template returns `{}` (stays bare). `TemplatePickerDialog.pickTemplate` adds the ceiling to the snapshot.
- **Reason:** Schema is already there (`Ceiling` type + `RoomDoc.ceilings?: Record<string, Ceiling>`). This is pure data — adding the seed function and wiring it through. No type changes, no migration. Three named templates get ceilings; BLANK stays bare so users explicitly opting for "build from scratch" don't get unexpected geometry.

### Commit + plan structure
- **D-05:** Single plan, 4 atomic commits — one per issue. Order: D-04 (DEFAULT-01) first (data-only, lowest risk), then D-02 (UX-02 token bump, broad blast radius), then D-01 (UX-01 SAVED badge), then D-03 (UX-03 empty-state). This sequencing puts the broadest-blast-radius change (token change) early so any visual regression catches in subsequent task smoke-tests.
- **Reason:** Atomic commits map 1:1 to GH issues for clean closing references. Order minimizes risk: data → token → component edits.

### Test strategy
- **D-06:** No new e2e tests. No new unit tests. Manual smoke is sufficient — each change is visual / data-level, observable in <30 seconds. Existing test suite must stay green (no regressions).
- **Reason:** These are bug-class polish fixes, not new features with invariants worth asserting in code. Adding tests for "is the SAVED badge 13px?" would be over-investment. The acceptance criteria are visual, the implementation is mechanical.

### Claude's Discretion
- Exact hex value for the new `--color-text-ghost` (pick lightest that still reads as "muted" vs "active text")
- Exact wording of the PropertiesPanel empty-state copy (above is a starting point; planner can refine)
- Whether to use `text-text-dim` or `text-text-ghost` for the SAVED badge (current looks like dim; verify and keep consistent)
- Whether the empty-state needs an icon (probably not; simple copy is fine; if added, lucide preferred per D-33)

</decisions>

<specifics>
## Specific Ideas

- **#98 contrast — exact recipe:** measure existing #484554 against #0d0d18 → ~2.1:1 (fails AA). Need ≥4.5:1. New target ~#7e7a8a hits ~4.5:1; ~#888494 hits ~5.0:1 (safer margin). Pick the warmer/darker option that still meets AA so "ghost" still reads as muted.
- **#101 SAVED badge — observe context:** the badge sits between Undo/Redo and the document title in Toolbar.tsx. Adjacent text is `--text-base` (13px). Matching that size produces visual coherence + adequate visibility.
- **#99 empty-state — copy variants to consider:** "Select a wall, product, or ceiling to see its properties here." (literal) / "Click anything in the room to edit its properties." (looser) / "Click a wall, product, or ceiling — its properties will show here." (active). Planner picks; use sentence case per Phase 33 mixed-case typography (D-03/04/05).
- **#100 templates — ceiling material:** check existing default. If templates use a specific preset (PLASTER) or just hex color (`#f5f5f5`), match the convention. If unsure, use the same default that a ceiling drawn via the Toolbar ceiling tool would have.
- **`pickTemplate` integration:** the `pickTemplate` function in `TemplatePickerDialog.tsx` builds the snapshot inline; just add `ceilings: tpl.makeCeiling ? tpl.makeCeiling() : {}` (with `?` because BLANK doesn't have `makeCeiling`).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before implementing:**

### Requirements
- `.planning/REQUIREMENTS.md` §UX-01, UX-02, UX-03, DEFAULT-01
- [GH #101](https://github.com/micahbank2/room-cad-renderer/issues/101), [#98](https://github.com/micahbank2/room-cad-renderer/issues/98), [#99](https://github.com/micahbank2/room-cad-renderer/issues/99), [#100](https://github.com/micahbank2/room-cad-renderer/issues/100)

### Existing files to read / modify
- `src/index.css` — `@theme` block with design tokens (UX-02 target)
- `src/components/Toolbar.tsx:260-300` — SAVED badge render site (UX-01 target)
- `src/components/PropertiesPanel.tsx:77-110` — selectedIds handling, empty-state insertion point (UX-03 target)
- `src/data/roomTemplates.ts` — `RoomTemplate` interface + 4 template definitions (DEFAULT-01 target)
- `src/components/TemplatePickerDialog.tsx:pickTemplate` — snapshot-building function that needs the new `makeCeiling` wired in (DEFAULT-01 target)
- `src/types/cad.ts` — `Ceiling` type (read-only — confirm shape, no edits)

### Phase 33 conventions (carry-forward)
- Mixed-case typography for empty-state copy (D-03/04/05)
- Canonical spacing tokens for any new UI (D-34) — only relevant if planner adds margin/padding to empty-state
- Lucide icons over Material Symbols if planner decides to add an icon to empty-state (D-33)

### Sibling pattern references
- `useReducedMotion` hook (Phase 33 / Phase 35) — explicitly NOT needed here per D-01 / D-03 (no animations introduced)

</canonical_refs>

<deferred>
## Deferred Ideas

- **Pulse animation on save→saved transition** — considered for UX-01, rejected per D-01 (would only fire on transition; static visibility better)
- **Pulse / arrow animation on first selection** — considered for UX-03, rejected per D-03 (over-engineering for 2-line message)
- **`<EmptyState>` primitive component** — could be added as a Phase 33-style primitive if other surfaces grow empty states. v1.10 ships inline; revisit if 3+ empty-state sites emerge.
- **Per-site `text-text-ghost` audit** — Phase 39 backlog mentioned "audit per-site use" as an alternative to the global token bump. D-02 picks the global bump (simpler, fixes 124 hits at once). Per-site overrides only if the global change makes specific sites too prominent.
- **BLANK template ceiling** — D-04 explicitly leaves BLANK bare. If user feedback says otherwise, easy follow-up.
- **Auto-save indicator redesign** — beyond just font size. Out of scope; revisit if the size-bump alone doesn't solve the discoverability problem.

</deferred>

---

*Phase: 43-ui-polish-bundle*
*Context gathered: 2026-04-25*
