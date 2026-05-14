# Phase 82 — Deferred Items

## Pre-existing e2e placement-via-canvas flow broken (out of scope per scope-boundary)

Three Phase 79 e2e specs in `tests/e2e/specs/window-presets.spec.ts` fail
both before AND after Phase 82 Plan 82-03's nav update — the failures are
upstream of the navigation steps this plan adds:

- `picking 'Wide' chip then clicking wall places a 4ft window` (line 74)
- `after placing a Wide window, PropertiesPanel shows 'Preset: Wide'` (line 119)
- `clicking 'Picture' preset chip in PropertiesPanel resizes opening to 6/4/1 in ONE undo entry` (line 159)

All three fail at the `walls.wall_1.openings[0].id` lookup — the
preceding `page.mouse.click(box.x + box.width/2, box.y + box.height/2)`
canvas placement step does not add an opening on `wall_1`. Verified
pre-existing by `git stash` + e2e re-run (same 3 failures, same upstream
error, same lines).

The two specs that DON'T depend on placement-via-canvas-click (tests #6
"manually editing" + #7 "switcher disappears") both pass on this commit
— confirming the Plan 82-03 nav update (Wall → Openings tab → opening
row → Preset tab) works end-to-end. Test #6 in particular exercises
exactly the new nav flow and renders the OpeningInspector with
`Preset: Standard` visible.

Plan 82-03 nav steps are intact and verified. The 3 placement failures
are an out-of-scope infrastructure issue tracked here for follow-up.
