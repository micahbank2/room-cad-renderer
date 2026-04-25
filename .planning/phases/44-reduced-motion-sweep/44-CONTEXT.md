# Phase 44: Reduced-Motion Sweep — Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Honor `prefers-reduced-motion: reduce` for the older animation paths that pre-date the Phase 33 `useReducedMotion` discipline (D-39). Phase 35 preset tween already does this; bring siblings to parity. v1.10 milestone closer.

**In scope:**
- Wall-side camera lerp in `ThreeViewport.tsx` (`cameraAnimTarget` + `useFrame` lerp at speed 0.08) — snap instead of lerp
- SAVING spinner in `Toolbar.tsx` (`animate-spin` class on `progress_activity` icon) — drop the spin

**Out of scope — verified to NOT need a guard:**
- Snap guides (`src/canvas/snapGuides.ts`) — render at static `GUIDE_OPACITY = 0.6`, added/cleared instantly via `clearSnapGuides()` + add loop. GH #76's "fade" claim doesn't match the actual code; no animation to guard.
- Phase 35 preset tween — already guarded (reduced-motion → instant snap, never enters `useFrame`)
- CSS `transition-colors` micro-transitions on hover — these are color-only and not motion in the WCAG-meaningful sense; out of scope per industry convention
</domain>

<decisions>
## Implementation Decisions

### Wall-side camera lerp guard
- **D-01:** In `ThreeViewport.tsx` `useEffect([wallSideCameraTarget, walls, cameraMode])` (lines ~215-244), when `prefersReducedMotion` is true, do NOT set `cameraAnimTarget.current`. Instead, immediately set `ctrl.object.position` and `ctrl.target` to the computed `camPos` / `lookAt`, then `ctrl.update()`. Then `useUIStore.getState().clearWallSideCameraTarget()` as the existing path does.
- **Reason:** Mirrors Phase 35 preset-tween reduced-motion path (instant snap, never enters `useFrame`). Snap is honest; shortened linear tween is still motion. The `prefersReducedMotion` value is already destructured at line 67 — no new wiring needed.

### SAVING spinner guard
- **D-02:** In `Toolbar.tsx:280`, conditionally apply `animate-spin` based on `useReducedMotion()`. Wrap the className in a template literal: `animate-spin` only when reduced-motion is FALSE. Spinner icon stays visible (continues conveying "save in progress") — just doesn't rotate.
- **Reason:** Continuous rotation is a clear motion target for `prefers-reduced-motion`. Removing the rotation while keeping the icon preserves semantic meaning (icon distinguishes SAVING from SAVED via shape, not animation). `useReducedMotion` will need to be imported into Toolbar.tsx (currently not imported there).

### What we explicitly do NOT change
- **D-03:** Snap guides need no guard. Documented in SUMMARY.md so future audits don't flag the absence as a gap. GH #76's "fade in/out" claim was incorrect — guides render at static opacity and are instantly cleared/redrawn.
- **D-04:** CSS `transition-colors duration-150` micro-transitions on hover (Toolbar buttons, etc.) stay as-is. These are color-only transitions, not motion in the accessibility sense. Industry convention treats `prefers-reduced-motion` as scoped to position/scale/rotation animations; disabling hover color fades would harm rather than help UX.

### Plan structure
- **D-05:** Single plan, 2 atomic code commits + 1 SUMMARY commit (3 total). Keep tests scope to manual verification — both changes are observable visually with `prefers-reduced-motion: reduce` set in DevTools.
- **Reason:** Each code change is ~5-10 lines. Multi-plan structure would be over-engineering. Atomic commits map 1:1 to (a) `ThreeViewport.tsx` wall-side guard, (b) `Toolbar.tsx` spinner guard.

### Test strategy
- **D-06:** No new automated tests. Manual smoke per task acceptance — DevTools reduced-motion emulator + observe behavior. Existing test suite must stay green.
- **Reason:** These are presentation-only changes. Adding a vitest test for "spinner doesn't rotate when reduced-motion is on" would require mocking `window.matchMedia` and asserting className conditional — high ceremony for a 1-line guard. The change's correctness is visually self-evident.

### Claude's Discretion
- Exact placement of the `prefersReducedMotion` check inside the wall-side `useEffect` (early branch vs. ternary on `cameraAnimTarget.current` assignment — pick whichever reads cleaner)
- Whether to extract the SAVING-spinner className into a const for readability vs. inline ternary (pick whatever produces the cleaner diff)

</decisions>

<specifics>
## Specific Ideas

- **`prefersReducedMotion` already destructured in ThreeViewport** at line 67. Wall-side guard just needs to consume it in the existing useEffect — no new wiring.
- **Toolbar.tsx needs the import added.** Pattern to mirror: `src/components/MyTexturesList.tsx:27` (existing `useReducedMotion` consumer).
- **Phase 35 preset-tween reduced-motion path** is the clearest model — see `useEffect([pendingPresetRequest, cameraMode, prefersReducedMotion, room])` in ThreeViewport.tsx. Wall-side guard should mirror its "snap instantly, never enter useFrame" branch.

</specifics>

<canonical_refs>
## Canonical References

### Requirements
- `.planning/REQUIREMENTS.md` §A11Y-01
- [GH #76](https://github.com/micahbank2/room-cad-renderer/issues/76)

### Existing code
- `src/hooks/useReducedMotion.ts` — the hook to consume
- `src/three/ThreeViewport.tsx:215-244` — wall-side useEffect, target for D-01
- `src/three/ThreeViewport.tsx` Phase 35 preset-tween useEffect — model for the snap-instead-of-lerp pattern
- `src/components/Toolbar.tsx:280` — `animate-spin` site, target for D-02
- `src/components/MyTexturesList.tsx:27,44` — existing useReducedMotion consumer pattern (for Toolbar.tsx import)

### Phase 33 conventions (carry-forward)
- D-39: every new animation guards on `useReducedMotion()` — this phase brings older paths to that standard

### Out-of-scope verifications
- `src/canvas/snapGuides.ts` — verified static-opacity, no fade

</canonical_refs>

<deferred>
## Deferred Ideas

- **Hover transition-colors guards** — D-04 explicitly out of scope. Industry convention treats motion as position/scale/rotation, not color. Revisit only if accessibility audit specifically flags.
- **Automated tests for reduced-motion behavior** — D-06 explicitly out of scope. Visual self-evidence + existing manual smoke is sufficient for these 2-line changes.
- **GH #76 "snap guides fade" claim** — verified incorrect; documented in D-03. Issue body inaccuracy, not a real gap.

</deferred>

---

*Phase: 44-reduced-motion-sweep*
*Context gathered: 2026-04-25*
