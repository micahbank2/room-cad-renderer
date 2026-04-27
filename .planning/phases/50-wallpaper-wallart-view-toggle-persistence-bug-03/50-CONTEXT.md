---
phase: 50-wallpaper-wallart-view-toggle-persistence-bug-03
type: context
created: 2026-04-27
status: ready-for-research
requirements: [BUG-03]
depends_on: [Phase 32 (PBR + user-texture pipeline), Phase 36 (VIZ-10 regression harness — extension target), Phase 49 (BUG-02 fix — direct-prop pattern precedent)]
related: [BUG-02 / Phase 49 — fix for user-uploaded wall textures may have incidentally fixed user-uploaded wallpaper too]
---

# Phase 50: Wallpaper + WallArt View-Toggle Persistence (BUG-03) — Context

## Goal

Uploaded wallpaper + wallArt textures must persist across 2D↔3D view toggles. Currently they disappear on toggle. Source: [GH #71](https://github.com/micahbank2/room-cad-renderer/issues/71). Originally backlog 999.2, deferred from Phase 32.

## Phase 49 context

Phase 49 just shipped fixing BUG-02 (wall user-texture first-apply). Root cause: `<primitive attach="map">` not setting `material.needsUpdate` on null→Texture transition. Fix: direct `map={userTex}` prop on `<meshStandardMaterial>`.

Phase 49 research determined BUG-02 and BUG-03 had different mechanisms (WebGL re-upload + HTMLImageElement context binding for BUG-03 per Phase 32 ROOT-CAUSE.md). However, the `useUserTexture` hook is shared across user-wallpaper and user-wall-texture paths — so part of BUG-03 may have been incidentally fixed.

## Decisions

### D-01 — Research first to map what's still broken (scope discovery)

The phase researcher (Wave 0) MUST verify each potentially-affected path BEFORE deciding fix scope:

1. **User-uploaded wall textures** (Phase 49 site) — likely fixed; confirm via existing Phase 49 e2e
2. **User-uploaded wallpaper** (`wp.kind === "pattern"` + `userTextureId`) — uses same `useUserTexture` path as walls; likely incidentally fixed by Phase 49
3. **User-uploaded wallArt** — uses separate `wallArtTextureCache`; likely still broken
4. **Preset wallpapers** (catalog patterns via `wallpaperTextureCache`, not user uploads) — unknown status

For each path, document: render code site (file:line), texture cache module, render branch in WallMesh, current state (broken / fixed / unknown).

Output as a "BUG-03 scope map" table in 50-RESEARCH.md.

**Decision authority:** The researcher determines the actual scope from code analysis. The planner sizes plans based on the scope map.

### D-02 — Fix pattern: apply Phase 49's direct-prop pattern by default

If a path uses `<primitive attach="map">` and exhibits the BUG-02-style failure mode, apply Phase 49's direct-prop fix (`map={tex}` on `<meshStandardMaterial>`).

If a path has a different bug shape (e.g., texture cache loses entries on remount, WebGL context loss, HTMLImageElement reattachment), fix the actual cause. Document the diagnosis in the SUMMARY.

**Why default to direct-prop:** It's the proven Phase 49 pattern, R3F-idiomatic, eliminates the `needsUpdate` requirement at root.

### D-03 — Test coverage: extend Phase 36 VIZ-10 harness

The Phase 36 VIZ-10 harness specs at `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` and `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` already exist. They test PRESET wallpapers/wallArt across 5 mount cycles.

Extend coverage to include USER-UPLOADED variants:
- New e2e spec OR augmentation of the existing spec — researcher decides which is cleaner
- Same 5-mount-cycle invariant as VIZ-10
- Reuses Phase 49's test driver (`__seedUserTexture`) for setup

**Why extend VIZ-10:** The mount-cycle invariant is exactly what BUG-03 violates. Phase 36's harness was designed for this class of bug. Don't reinvent.

### D-04 — Phase scope: budget conservatively, skip the phase if research finds it's all fixed

If research determines:
- All paths already work after Phase 49 → phase becomes verification-only (write the regression specs to lock in the fix, no code change). Mark in roadmap as "verified clean — ship a regression-guard-only phase."
- Only wallArt is broken → 1 plan, 2 tasks (mirror Phase 49 shape: driver-or-extension + fix + spec)
- Multiple paths broken → 1 plan, 3-4 tasks (one fix-task per broken path)

**Hard ceiling:** ≤1 plan, ≤4 tasks, ≤6 files modified.

### D-05 — Atomic commits per D-05 of Phase 49

One commit per logical change. Mirror Phase 49 pattern.

### D-06 — Test driver reuse

If new e2e spec needs an uploaded wallpaper or wallArt seed, REUSE Phase 49's `__seedUserTexture` driver from `src/test-utils/userTextureDrivers.ts`. May need to extend it with a `__seedWallArtPlacement(wallId, side, userTextureId)` or similar — only if needed.

### D-07 — Zero regressions on Phase 49 fix

The Phase 49 e2e (`e2e/wall-user-texture-first-apply.spec.ts`) MUST stay green. Phase 50's fix cannot revert the direct-prop pattern.

## Out of scope

- BUG-02 (Phase 49) re-fix or rollback
- Phase 999.4 EXPLODE+saved-camera offset
- DEBT-05 FloorMaterial migration (Phase 51)
- HOTKEY-01 cheat sheet (Phase 52)
- Refactoring `wallpaperTextureCache` or `wallArtTextureCache` to a different async pattern
- New PBR features (#81)

## Files we expect to touch (estimate, contingent on research)

Most likely:
- `src/three/WallMesh.tsx` — wallArt render branch (apply direct-prop pattern if applicable)
- `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` — extend coverage with user-uploaded wallArt
- `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` — extend coverage with user-uploaded wallpaper (if not already incidentally green)

Possibly:
- `src/three/wallArtTextureCache.ts` — if cache layer is the actual cause
- `src/test-utils/userTextureDrivers.ts` — extend driver if needed

If research finds it's all fixed:
- Just the e2e specs (regression-guard-only phase)

## Open questions for research phase

1. **Which paths are still broken?** Run code analysis + reasoning on each path. Document in scope map.
2. **WallArt render-site mechanism:** Does WallMesh's wallArt rendering also use `<primitive attach="map">`? If yes, direct-prop fix is the answer. If no, what's the actual cause?
3. **Preset wallpaper status:** Are catalog wallpapers actually broken? The original issue ([#71](https://github.com/micahbank2/room-cad-renderer/issues/71)) says "uploaded" — but worth confirming preset paths aren't also broken.
4. **Phase 32 ROOT-CAUSE.md candidates:** Phase 32's investigation left Candidates 1 (WebGL context re-upload) and 2 (HTMLImageElement binding) INCONCLUSIVE. Do those still apply? Or did Phase 49's fix supersede them?
