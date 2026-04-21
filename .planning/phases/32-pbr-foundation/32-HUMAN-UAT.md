---
status: failed
phase: 32-pbr-foundation
source: [32-03-PLAN.md Task 4 (checkpoint:human-verify — 12-step visual protocol)]
started: 2026-04-21T10:27:00-04:00
updated: 2026-04-21T11:15:00-04:00
---

## Current Test

Completed — gaps identified. Phase 32 checkpoint T4 auto-approved by `workflow.auto_advance=true`, but subsequent manual UAT by Jessica found regressions.

## Tests

### 1. HDR served from /hdr/studio_small_09_1k.hdr (step 11)
expected: Network tab shows `/hdr/studio_small_09_1k.hdr`, no drei/CDN fetch
result: passed
evidence: preview_network confirmed `GET http://localhost:5173/hdr/studio_small_09_1k.hdr → 200 OK`

### 2. CONCRETE floor renders with PBR (step 7)
expected: `/textures/concrete/{albedo,normal,roughness}.jpg` load; visible aggregate texture on floor
result: passed
evidence: preview_network confirmed all three concrete maps fetched 200 OK; PbrSurface branch reached in FloorMesh when material.presetId maps to SURFACE_MATERIALS entry with `pbr`

### 3. No console errors during PBR load
expected: clean console
result: passed
evidence: preview_console_logs level=error returned empty

### 4. Wallpaper survives 2D ↔ 3D view toggle (step 8 + implied by step 12 stability)
expected: Wallpaper renders in 3D, switching to 2D and back preserves it
result: issue
evidence: Jessica applied wallpaper in 3D (visible), switched to 2D to change floor material, switched back to 3D — wallpaper was gone
suspected_cause: Plan 32-03 D-05 cache migration routed wallpaper through `pbrTextureCache.acquireTexture` / `releaseTexture`. `useSharedTexture` in WallMesh.tsx:20-43 calls `releaseTexture` on unmount, which drops refs to 0, disposes the texture, and deletes the cache entry. On remount, `acquireTexture` triggers a fresh load but the wallpaper overlay renders nothing during the load gap (tex is null). Whether it eventually re-renders or stays gone requires deeper investigation — but at minimum there's a visible regression from v1.6 behavior.

### 5. Steps 3–6, 9–10, 12 (WOOD_PLANK / PLASTER / PAINTED_DRYWALL ceilings, broken-URL fallback, drag stability)
expected: per 32-03-PLAN.md how-to-verify
result: pending
evidence: not tested — Jessica's session ended before covering these steps

## Summary

total: 5
passed: 3
issues: 1
pending: 1
skipped: 0
blocked: 0

## Gaps

### Gap 1: Wallpaper disappears after 2D → 3D view toggle (Phase 32 regression)

- status: deferred-to-phase-33
- remediation_attempts:
  - 32-05 (debounced dispose) — FAILED verify 2026-04-21
  - 32-06 (restore non-disposing caches) — FAILED verify 2026-04-21
  - 32-07 (R3F dispose={null} escape hatch + static regression test) — FAILED verify 2026-04-21 (code retained as defense in depth)
- disposition: Phase 33 ("user-uploaded textures") will touch these code paths anyway. First task in Phase 33 is to build a runtime instrumentation harness (Playwright or similar) that captures the full texture upload → unmount → remount cycle so a fourth speculative fix isn't needed. See `32-07-SUMMARY.md` for the list of still-plausible candidate causes.
- backlog_ref: 999.2
- severity: high
- source_test: Test 4 above (how-to-verify step 8)
- reproduction:
  1. Start app, create kitchen template, switch to 3D
  2. Apply a wallpaper pattern to a wall — confirm it renders
  3. Switch to 2D view, make any change (e.g., change floor material)
  4. Switch back to 3D
  - observed: wallpaper is gone
  - expected: wallpaper still renders
- suspected_root_cause: Refcount-based dispose in `pbrTextureCache` combined with WallMesh's `useSharedTexture` cleanup releasing on unmount. Needs root-cause investigation in the gap-closure plan.
- files_to_investigate:
  - src/three/WallMesh.tsx:20-43 (useSharedTexture hook)
  - src/three/pbrTextureCache.ts:68-76 (releaseTexture)
  - src/App.tsx:343 (viewMode conditional unmount of ThreeViewport)
- related_decisions: D-05 (consolidate wallpaper/wallArt/floorTexture under shared acquireTexture)

### Gap 2: Ceilings cannot be resized once placed (pre-existing, out of Phase 32 scope)

- status: backlog
- severity: medium
- source_test: User spontaneous observation during T4 walkthrough
- notes: Not caused by Phase 32. Phase 31 shipped drag-to-resize for products and custom-elements, but ceilings (which are customElements with `kind: "ceiling"`) never received resize handles. This is a UX gap worth fixing but does not belong in the Phase 32 gap-closure plan.
- disposition: Logged as backlog item; revisit after v1.7 milestone.

## Notes on Checkpoint Auto-Approval

Task 4 of Plan 32-03 was `checkpoint:human-verify` (autonomous: false). Because `.planning/config.json` has `workflow.auto_advance=true`, the gsd-executor auto-approved the checkpoint without presenting it to the user. That's consistent with the workflow's documented auto-mode behavior, but it meant the regression above was not caught until post-hoc manual UAT. Recommend either:
- (a) Suppressing auto-approval specifically for `checkpoint:human-verify` kinds (keep auto-advance for decision checkpoints)
- (b) Leaving current behavior and treating post-hoc UAT as the authoritative gate (what happened here)

No action required in gap plan — flagging for future workflow discussion.
