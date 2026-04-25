---
phase_number: 43
plan_number: 01
plan_name: bundle
phase_dir: .planning/phases/43-ui-polish-bundle
objective: >
  Close 4 GH-tracked UX issues bundled by code-surface proximity. 4 atomic
  commits — one per issue. Order: DEFAULT-01 (data) → UX-02 (token bump) →
  UX-01 (SAVED badge) → UX-03 (empty-state). No new tests, no new deps,
  no schema changes.
requirements_addressed: [UX-01, UX-02, UX-03, DEFAULT-01]
depends_on: []
wave: 1
autonomous: true
files_modified:
  - src/data/roomTemplates.ts
  - src/components/TemplatePickerDialog.tsx
  - src/index.css
  - src/components/Toolbar.tsx
  - src/components/PropertiesPanel.tsx
must_haves:
  truths:
    - "DEFAULT-01: Living Room / Bedroom / Kitchen templates produce snapshots with `ceilings: { ceil_<uid>: { points: [4 corners], height: room.wallHeight, material: <default> } }`. BLANK template stays bare."
    - "UX-02: --color-text-ghost token value updated in src/index.css @theme block to a value meeting WCAG AA (≥4.5:1) against --color-obsidian-deepest (#0d0d18). All 124+ existing usages benefit; no per-site edits."
    - "UX-01: SAVED badge in Toolbar.tsx render site uses font-size --text-base (13px) — matches adjacent toolbar text. Existing color (text-text-dim) preserved. No new chrome added."
    - "UX-03: When useUIStore.selectedIds.length === 0, PropertiesPanel renders empty-state copy ('Select a wall, product, or ceiling to see its properties here.' or planner-refined variant). Static — no animations, no dismissible state."
    - "GH #101, #98, #99, #100 closed with PR-reference comments after PR merges"
    - "npm run build succeeds; npx tsc --noEmit clean (pre-existing baseUrl warning ignored)"
    - "npm test full suite: 6 pre-existing failures unchanged, no new regressions"
---

# Phase 43 Plan 01 — UI Polish Bundle

## Context

4 atomic commits, one per GH issue. All decisions locked in 43-CONTEXT.md (D-01..D-06).

**Sequencing rationale (D-05):** data → token → component edits. Lowest-risk first, broadest-blast-radius next, then surgical component changes. Each subsequent task's smoke check incidentally verifies prior commits.

---

## Task 1 — DEFAULT-01: Templates include a ceiling

**Read first:**
- `src/data/roomTemplates.ts` — full file (interface + 4 template definitions + `perimeterWalls` helper)
- `src/types/cad.ts` — `Ceiling` interface for shape reference
- `src/data/surfaceMaterials.ts` — confirm default ceiling material id (likely PLASTER)
- `src/components/TemplatePickerDialog.tsx` — `pickTemplate` snapshot-building function

**Edit:**

(a) `src/data/roomTemplates.ts`:
- Extend `RoomTemplate` interface with `makeCeiling?: () => Record<string, Ceiling>` (optional — BLANK omits)
- Add a helper `function perimeterCeiling(w: number, l: number, h: number, materialId: string): Record<string, Ceiling>` that returns one ceiling polygon at the room perimeter, height = `h`, material = preset id
- Wire `makeCeiling` into LIVING_ROOM, BEDROOM, KITCHEN entries
- BLANK stays without `makeCeiling`

(b) `src/components/TemplatePickerDialog.tsx`:
- Update `pickTemplate` snapshot construction so when `tpl.makeCeiling` is defined, the inline `RoomDoc` literal includes `ceilings: tpl.makeCeiling()`. When it's not (BLANK), omit the field.

**Acceptance:**
- TypeScript compiles
- Manual smoke: dev server, load Living Room template → switch to 3D → ceiling visible at room.wallHeight (9 ft for Living Room)
- Bedroom + Kitchen templates also produce ceilings (8 ft heights)
- BLANK template still produces no ceiling

**Commit:** `feat(43-01): templates include a ceiling at room.wallHeight (DEFAULT-01)

Closes #100. Living Room / Bedroom / Kitchen templates now produce
snapshots with a default ceiling polygon. BLANK template stays bare so
explicit 'build from scratch' users don't get unexpected geometry.`

---

## Task 2 — UX-02: --color-text-ghost contrast bump

**Read first:**
- `src/index.css` — `@theme` block, find `--color-text-ghost` definition (current: `#484554`)
- 3 reported sites for spot-verification:
  - `src/components/MyTexturesList.tsx` — UPLOAD label
  - `src/components/SwatchPicker.tsx` — NO RECENT COLORS
  - PRESETS tab when inactive (likely in a category-tabs component)

**Edit:** `src/index.css`

Update `--color-text-ghost` from `#484554` to a value meeting WCAG AA (≥4.5:1) against `--color-obsidian-deepest` (`#0d0d18`).

**Recommended starting value:** `#888494` (~5.0:1 against obsidian-deepest, comfortable margin). Implementation may use a contrast-checker tool to fine-tune toward the lightest hex that still feels "ghost" rather than "dim" (current `--color-text-dim` is `#938ea0`, so stay below that brightness).

**Verify after change:**
- WebAIM contrast checker (or similar) reports ≥4.5:1 for new `--color-text-ghost` against `#0d0d18`
- Visit each reported site (UPLOAD label, NO RECENT COLORS, inactive PRESETS tab) — text now legible without leaning in
- Existing test suite green
- Build green

**Acceptance:**
- `--color-text-ghost` value changed in `src/index.css`
- Contrast ratio against `--color-obsidian-deepest` ≥ 4.5:1
- Spot-checked sites legible

**Commit:** `feat(43-01): bump --color-text-ghost to meet WCAG AA contrast (UX-02)

Closes #98. Token value adjusted from #484554 (~2.1:1 against
obsidian-deepest, fails AA) to <new-hex> (≥4.5:1, passes AA). All 124+
existing 'text-text-ghost' usages benefit; no per-site edits required.
--color-text-dim and --color-text-muted unchanged (already pass AA).`

---

## Task 3 — UX-01: SAVED badge typography bump

**Read first:**
- `src/components/Toolbar.tsx:260-300` — `saveStatus` read + SAVED badge render

**Edit:** `src/components/Toolbar.tsx`

Update the SAVED badge's font-size class to match adjacent toolbar text. Current is likely `text-[10px]` or similar small-text utility; replace with `text-sm` (which maps to `--text-sm` = 11px) or — preferred per D-01 — directly `text-base` (which maps to `--text-base` = 13px). Verify the exact class in the file and pick the closest match to other Toolbar labels.

Keep the existing color class (`text-text-dim` per spot-check). No background, no border, no animation.

**Acceptance:**
- TypeScript compiles
- Manual smoke: dev server, edit a room (any change), wait ~2 seconds, observe SAVED badge → visibly larger than before, matches adjacent toolbar text size, still visible without leaning in
- No regression: SAVING / SAVE_FAILED states still render at the same size or appropriately

**Commit:** `feat(43-01): enlarge SAVED badge in Toolbar to --text-base (UX-01)

Closes #101. Badge font size bumped from ~10px to 13px (--text-base),
matching adjacent toolbar text. Static fix — no animation. Color and
chrome unchanged. SAVING / SAVE_FAILED states share the new size.`

---

## Task 4 — UX-03: PropertiesPanel empty-state

**Read first:**
- `src/components/PropertiesPanel.tsx:77-110` — selectedIds handling

**Edit:** `src/components/PropertiesPanel.tsx`

After the existing `const selectedIds = useUIStore((s) => s.selectedIds);` and BEFORE the multi-select / single-select branches, add an early-return rendering an empty-state when `selectedIds.length === 0`. Keep it simple — no new component, no icons:

```tsx
if (selectedIds.length === 0) {
  return (
    <div className="p-4">
      <p className="font-mono text-sm text-text-dim">
        Select a wall, product, or ceiling to see its properties here.
      </p>
    </div>
  );
}
```

(Adjust `text-sm` if the panel prefers a different size; mixed-case copy per Phase 33 typography conventions D-03/04/05; spacing per canonical tokens D-34.)

**Verify exact insertion point:** the empty-state must be rendered when the panel mounts (i.e., the panel must still render its outer container). If the panel is currently entirely absent when `selectedIds.length === 0`, this might require lifting the empty-state to the panel's parent or making the panel always mount. Check the actual current render path — if the panel only mounts when something is selected, the change goes to the parent (likely `Sidebar.tsx` or `App.tsx`).

**Acceptance:**
- TypeScript compiles
- Manual smoke: dev server, fresh project, click empty canvas to deselect everything → Properties panel area shows empty-state copy
- Click a wall → panel switches to wall properties view (existing behavior)
- Click empty canvas again → panel returns to empty-state

**Commit:** `feat(43-01): add empty-state copy to PropertiesPanel (UX-03)

Closes #99. When no element is selected, PropertiesPanel renders a
static empty-state ('Select a wall, product, or ceiling to see its
properties here.') instead of being blank. Static copy — no animations,
no dismissible affordance — discoverable on every fresh visit.`

---

## Plan-level acceptance criteria

- [ ] All 4 tasks executed and committed atomically (one commit per GH issue)
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` clean (pre-existing baseUrl deprecation warning ignored)
- [ ] `npm test` full suite: 6 pre-existing failures unchanged, no new regressions
- [ ] Manual smoke for all 4 changes per task acceptance criteria
- [ ] GH #100, #98, #101, #99 all closed with PR-reference comments after PR merges
- [ ] SUMMARY.md created at `.planning/phases/43-ui-polish-bundle/43-01-bundle-SUMMARY.md`
- [ ] STATE.md + ROADMAP.md updated (43: 0/0 → 1/1 Complete)

---

*Plan: 43-01-bundle*
*Author: orchestrator-inline (CONTEXT.md fully prescriptive — no judgment calls deferred)*
