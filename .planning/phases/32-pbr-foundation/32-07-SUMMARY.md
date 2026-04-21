---
phase: 32-pbr-foundation
plan: 07
status: partial-deferred
deferred_to: phase-33
updated: 2026-04-21
---

# Plan 32-07 — Partial, gap deferred to Phase 33

## Outcome

Tasks 1–3 landed and are retained (code + static regression test). Task 4 (human visual re-verify) FAILED: uploaded wallpaper and wallArt still do not persist across 2D ↔ 3D toggles despite the combined fix stack of 32-05 (reverted), 32-06 (non-disposing caches), and 32-07 (R3F `dispose={null}` escape hatch at every cached-texture render site).

After three stacked remediation attempts, continuing to speculate without a robust runtime diagnostic loop has diminishing returns. Gap 1 is deferred to Phase 33, which was already scheduled to touch user-uploaded texture flows and will have the room to build proper diagnostics first.

## Tasks landed (retain)

- `fcdfe18` — feat(32-07): WallMesh wallpaper + wallArt use `<primitive attach="map" object={tex} dispose={null} />`
- `4c5f75f` — feat(32-07): FloorMesh custom-upload branch uses the same pattern
- `63b4dc9` — test(32-07): static regression contract locks the pattern (4/4 passing)

These are correct defensive changes against one known R3F footgun and should stay even if the root cause turns out to be elsewhere.

## Task 4 failure

Jessica per-step report:
- Step 3 (wallpaper survives first 2D→3D toggle): FAILED
- Step 4 (survives multiple toggles): FAILED
- Steps 6 (wallArt survives toggles): FAILED
- PBR steps 9–12: PASS
- Color/paint steps 13–14: PASS

So the remaining bug is specific to *cached data-URL textures rendering through `<meshStandardMaterial>` across `ThreeViewport` remount*. Not PBR. Not color/paint. Not the shared cache architecture (already reverted in 32-06). Not R3F auto-dispose (fixed in 32-07).

## What's left that could cause it

Candidate causes not yet ruled out:
1. `HTMLImageElement` backing a data URL is tied to the old `WebGLRenderer`'s context and silently fails re-upload to the new one (would require a manual `texture.source.needsUpdate = true` on every mount).
2. `meshStandardMaterial` in R3F receives `<primitive attach="map">` child but doesn't re-link the uniform on the fresh material instance created at remount (would require forcing `material.needsUpdate = true` when the primitive attaches).
3. Image decode happens once off the event loop and the decoded pixel data is only bound to the first WebGL texture upload; second context's upload sees pre-decoded ImageBitmap in an unusable state.
4. Something unrelated to textures entirely — the 300x150 canvas size I observed during diagnostics hints that the R3F `<Canvas>` may not be mounting into a sized container on the second entry, so nothing renders regardless of texture state.

Phase 33's first task will be to set up a repeatable runtime harness (Playwright + instrumented build) that captures the full sequence of: first-mount texture upload → unmount → second-mount attempt → pixel-level diff. Then fix.

## Commits

- `fcdfe18` feat(32-07): WallMesh dispose={null} swap
- `4c5f75f` feat(32-07): FloorMesh dispose={null} swap
- `63b4dc9` test(32-07): static regression contract
- `700dbf5` revert: remove 32-07 debug instrumentation
- (this file) docs(32-07): mark partial + deferred to Phase 33
