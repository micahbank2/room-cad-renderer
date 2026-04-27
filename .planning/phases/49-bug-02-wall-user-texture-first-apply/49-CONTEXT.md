---
phase: 49-bug-02-wall-user-texture-first-apply
type: context
created: 2026-04-27
status: ready-for-research
requirements: [BUG-02]
related: [BUG-03 — may share root cause; conditional scope expansion per D-01]
depends_on: [Phase 32 (PBR + user-texture pipeline), Phase 36 (VIZ-10 regression harness — for reference, not extension)]
---

# Phase 49: Wall User-Texture First-Apply Bug (BUG-02) — Context

## Goal

Wall user-textures (uploaded JPEG/PNG/WebP via "My Textures") must render in 3D on first apply, without requiring a 2D→3D toggle workaround. Source: [GH #94](https://github.com/micahbank2/room-cad-renderer/issues/94).

## Symptoms (from issue + scout)

- User uploads a wall texture, applies it to a wall side via `setWallpaper`
- 3D view shows the default drywall color, NOT the uploaded texture
- Switching to 2D and back to 3D causes WallMesh to remount and the texture appears
- Texture data is correctly stored in IDB; the issue is render-time pickup

## Scout findings

- `src/components/WallSurfacePanel.tsx:105-113` — `handleWallpaperUserTexture(id, tileSizeFt)` synchronously calls `setWallpaper(wall.id, side, { kind: "pattern", userTextureId: id, scaleFt })`. No async waits.
- `src/three/WallMesh.tsx:91-92` — `useUserTexture(wall.wallpaper?.A?.userTextureId)` and `B`. Hook returns `null` while async-loading; resolves after promise.
- `src/three/WallMesh.tsx:137` — branch `if (wp.userTextureId && userTex)` skips when `userTex` is null. Falls through to default branches → drywall color renders.
- `src/hooks/useUserTexture.ts:32-65` — sets `tex` to null on id-change, async-fetches via `getUserTextureCached`, calls `setTex(t)` on resolve. **Hook DOES re-fire on id change.**
- `src/three/userTextureCache.ts` — `getUserTextureCached(id)` reads from in-memory cache, falls through to IDB read + `THREE.TextureLoader.loadAsync(URL.createObjectURL(blob))`.

## Decisions

### D-01 — Conditional scope: BUG-02 only by default, expand to BUG-03 if root cause shared

**Default:** Phase 49 fixes BUG-02 only. Phase 50 (BUG-03 — wallpaper/wallArt 2D↔3D toggle) ships separately.

**Expansion trigger:** If research demonstrates the SAME root cause drives both bugs (e.g., both rely on `useUserTexture` propagation and the fix repairs both), expand Phase 49 scope to close BUG-03 in the same phase. Mark Phase 50 as "merged-into-49" in ROADMAP.md and reduce v1.12 from 4 phases to 3.

**Decision authority:** The phase researcher (gsd-phase-researcher) makes the call after investigating both symptoms. Document the determination in 49-RESEARCH.md as a yes/no with evidence. The planner then sizes plans accordingly.

**Rationale:** Forcing one fix-both phase risks scope creep if the bugs are unrelated. Forcing two separate phases doubles the work if they share a cause. Conditional scope respects the actual code shape.

### D-02 — New dedicated e2e spec, NOT extension of VIZ-10 harness

Create `e2e/wall-user-texture-first-apply.spec.ts`. It seeds an uploaded texture in IDB, applies it to a wall while in 3D view, and asserts the texture renders without any view-mode toggle.

**Why dedicated spec:**
- Phase 36 VIZ-10 invariant is "texture stability across N mount cycles" — orthogonal to "render on first apply"
- Mixing the two would muddy what each spec is guarding against
- New spec runs on the same Playwright infrastructure (chromium-dev + chromium-preview), no harness changes needed

**What to assert:**
- After `setWallpaper(wallId, "A", { kind: "pattern", userTextureId, scaleFt })` is called via test driver, the WallMesh's material `map` slot must be a non-null `THREE.Texture` within a reasonable timeout (e.g., 1500ms — accounts for async IDB read + texture load)
- A pixel-diff or screenshot assertion is NOT required for this spec — Phase 36 VIZ-10 covers visual fidelity. This spec covers "the right material slot got populated."

### D-03 — Real fix, with a 1-day investigation budget

The phase researcher (Wave 0) gets one full day of investigation time. If by end of that window the root cause is identified and the fix is targeted (e.g., missing useEffect dep, wrong React key, missing `material.needsUpdate = true` after primitive attach), implement the real fix with documenting comments.

**Escalation path:** If research cannot identify the root cause within the budget AND a defensive workaround is the only viable path forward, the workaround MUST include:
- A code comment block explaining WHY this is a workaround (what was tried, what didn't work, why this works)
- A new GH issue tracking the open investigation as tech debt
- Reference to that issue in 49-VERIFICATION.md as a known carry-over

**Why no defensive-by-default:** Phase 32's VIZ-10 work classified 4 existing defensive pieces as "KEEP" because they were load-bearing for real edge cases. Adding more without root-cause understanding makes it harder for future-you to know which defenses are still needed.

### D-04 — No regression on Phase 32 PBR pipeline

The fix MUST NOT break:
- LIB-06 / LIB-07 / LIB-08 user-texture upload + apply flow (Phase 32)
- 6 pre-existing vitest failures stay at 6 (no new regressions)
- Phase 36 VIZ-10 harness still passes
- Phase 46 + 47 + 48 e2e specs still pass
- Phase 35 preset-tween still works

### D-05 — One commit per logical change, atomic + revertible

If the real fix touches multiple files (likely: `WallMesh.tsx` + maybe `useUserTexture.ts` + new test file), commit each as its own atomic change. Mirror Phase 25/31 atomic-commit precedent.

### D-06 — Test-mode driver if needed

If the e2e spec requires reaching into React state to seed an uploaded texture without going through the full upload UI flow, add a test driver in `src/test-utils/userTextureDrivers.ts` that calls `putUserTexture(blob, name, sizeFt)` directly. Gated by `import.meta.env.MODE === "test"`. Mirror Phase 46/47/48 driver pattern.

## Out of scope

- Phase 999.4 EXPLODE+saved-camera offset (CAM-04 carry-over) — different bug, different milestone
- BUG-03 wallpaper/wallArt 2D↔3D toggle (Phase 50) — UNLESS root cause is shared per D-01
- DEBT-05 FloorMaterial bloat migration (Phase 51) — separate concern
- HOTKEY-01 cheat sheet (Phase 52) — separate concern
- Refactoring `useUserTexture` to a different async pattern (Suspense, etc.) — out of scope unless required by the root-cause fix
- New PBR features (#81 AO/displacement/emissive maps) — out of scope

## Files we expect to touch (estimate)

Minimum (real fix path):
- `src/three/WallMesh.tsx` — likely site of fix (texture-attach logic)
- `src/hooks/useUserTexture.ts` — may need adjustment if hook is the cause
- `e2e/wall-user-texture-first-apply.spec.ts` — new file
- `src/test-utils/userTextureDrivers.ts` — new file (if test driver needed per D-06)
- `src/main.tsx` — driver install (if D-06)

If BUG-03 root cause is shared and scope expands:
- `src/three/WallMesh.tsx` (more changes)
- Possibly `src/three/wallpaperTextureCache.ts` and/or `src/three/wallArtTextureCache.ts`

Estimated 1 plan, 2-3 tasks. Smaller than v1.11 phases.

## Open questions for research phase

1. **Root cause hypothesis:** The `<primitive attach="map" object={userTex} dispose={null} />` pattern in WallMesh.tsx:148. When `userTex` transitions from `null` to a `THREE.Texture` (via React re-render after `useUserTexture` setTex), does the `meshStandardMaterial`'s compiled shader re-link the map binding? Or does it require `material.needsUpdate = true` to trigger shader recompile?

2. **Alternative hypothesis:** Is `useUserTexture` even firing on first apply? Verify with the `tapEvent` instrumentation already in the hook (events `useUserTexture:hook-mount`, `:hook-resolve`). Reproduce locally + check console.

3. **Shared root cause check (D-01 trigger):** Does BUG-03 (2D↔3D toggle disappear) share the same code path? Likely YES if `useUserTexture` cache returns null on remount due to lost in-memory cache state, but research must confirm.

4. **Test driver shape:** Does seeding an uploaded texture require the full IDB write + cache prime + setWallpaper, or can the driver short-circuit by directly calling `getUserTextureCached(id)` with a synthetic id?
