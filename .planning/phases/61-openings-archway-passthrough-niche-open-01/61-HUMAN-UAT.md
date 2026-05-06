---
status: partial
phase: 61-openings-archway-passthrough-niche-open-01
source: [61-VERIFICATION.md]
started: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## How to test

Open the PR's Netlify preview link.

> 🏛️ **Wall openings beyond doors and windows.** Phase 61 adds three new opening kinds: archway (rounded top), passthrough (full-height open doorway), niche (recessed wall display). All three are placed by clicking on a wall, just like doors and windows.

## Tests

### 1. Wall Cutouts dropdown appears in the tool palette
Look at the tool palette (vertical toolbar with Door, Window, etc.). You should see a new dropdown trigger button (small "more" or "..." style icon). Click it. A popover should appear with three items: Archway, Passthrough, Niche.
result: [pending]

### 2. Click Archway → place an archway
Click the Archway item in the dropdown. Hover over a wall in 2D — you should see a placement preview. Click on the wall. An archway opening appears with default 36" wide × 84" tall, full-height with a rounded arch on top. In 2D, you should see a rectangle outline with an arc above (semicircle).
result: [pending]

### 3. Switch to 3D — see the rounded arch top
With the archway placed, switch to 3D view. The opening should be cut through the wall with a clean semicircular top — light passes through both sides. The arch top is round, not pointed.
result: [pending]

### 4. Place a passthrough → full-height open doorway
Click the Passthrough item. Click on a wall. A passthrough opening appears, default 60" wide and FULL wall height (no top frame). 2D shows a tall open-top rectangle. 3D shows a full-height through-hole — you can walk through it conceptually.
result: [pending]

### 5. Place a niche → recessed wall display
Click the Niche item. Click on a wall. A niche appears at default config: 24" wide × 36" tall × 6" deep, sitting at 36" off the floor (typical shelf-height display niche). 2D shows a rectangle with diagonal hatch lines (visual cue: "this doesn't go through"). 3D shows a recessed box on the INTERIOR face of the wall — NOT a through-hole. Look at the wall from the outside (other side) — you should NOT see the niche. The wall is solid behind it.
result: [pending]

### 6. Niche depth control via PropertiesPanel
Click the niche to select it. The Properties panel should show a kind-aware OpeningSection with: kind label, offset, width, height, sillHeight, AND a Depth (inches) input. Try setting depth to a value LARGER than the wall thickness (e.g. 24" on a 6" wall). The depth should clamp automatically — it cannot go past the wall thickness minus 1" of safety margin.
result: [pending]

### 7. Right-click on any opening (Phase 53 — NEW for openings)
Right-click on a placed archway, passthrough, or niche (in 2D OR in 3D). A context menu should appear with 4 actions: Focus camera, Save camera here, Hide, Delete. (Note: Copy/Paste are deferred since openings are sub-entities of walls.)
result: [pending]

### 8. Click-to-select on any opening (Phase 54 — NEW for openings)
Click on a placed opening (archway / passthrough / niche / door / window). The Properties panel should update to show that opening's settings. Click empty space to deselect.
result: [pending]

### 9. Existing doors and windows still work (regression)
Place a regular Door and a regular Window. They should look and behave exactly as before. Same default sizes, same 2D symbols, same 3D rendering. No regressions.
result: [pending]

### 10. Save and reload — openings persist
Place one of each new opening kind. Save the project. Reload the page. All three should still be there with the same dimensions and positions. (Tests that the additive type extension serialized cleanly without needing a snapshot version bump.)
result: [pending]

### 11. Older project files still load
Open a project saved before this update (with only doors/windows). It should load normally, no errors. The new opening types just won't be present, but everything else works.
result: [pending]

### 12. Phase 59 cutaway still ghosts walls correctly (regression)
Switch cutaway to AUTO. Place an opening (archway works well). Orbit to a side view. The wall blocking your view should ghost — and the opening should be visible THROUGH the ghosted wall. Phase 59 + Phase 61 compose correctly.
result: [pending]

### 13. Phase 60 stairs still work (regression)
Place a stair element. It should render correctly in both 2D and 3D, separate from any openings on nearby walls.
result: [pending]

## Note on remaining v1.15 work

After Phase 61, only one phase remains:
- Phase 62 — Measurement + annotation tools (dimension lines, labels, auto room-area)

## Summary

total: 13
passed: 0
issues: 0
pending: 13
skipped: 0
blocked: 0

## Gaps
