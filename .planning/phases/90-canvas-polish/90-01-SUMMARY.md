---
phase: 90-canvas-polish
plan: 01
subsystem: ui
tags: [fabric, react, theme, mutationobserver, e2e, css, viewport]

# Dependency graph
requires:
  - phase: 87-theme-toggle
    provides: useTheme hook + SettingsPopover that writes <html class="dark">
  - phase: 88-light-mode-polish
    provides: getCanvasTheme() probe-div bridge + __driveGetCanvasBg test driver
  - phase: 83-floating-toolbar
    provides: FloatingToolbar (~178px tall, bottom-6 anchored) at data-testid="floating-toolbar"
provides:
  - MutationObserver-based <html class> subscription for canvas-bg flip (replaces useTheme local-state path)
  - 208px height reservation on 2D canvas wrapper so FloatingToolbar never overlaps the floor plan
  - parseLightness() spec helper that handles oklch() OR rgb() (chromium-dev forward-compat)
affects: [90-02-canvas-polish, future toolbar redesigns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MutationObserver on document.documentElement[class] for cross-component theme sync"
    - "h-[calc(100%-N)] for canvas-area height shrink (not pb-* — getBoundingClientRect includes padding)"
    - "Spec helper parseLightness() abstracts away chromium-dev oklch-vs-rgb getComputedStyle drift"

key-files:
  created:
    - tests/e2e/specs/90-canvas-polish.spec.ts
    - .planning/phases/90-canvas-polish/deferred-items.md
  modified:
    - src/canvas/FabricCanvas.tsx

key-decisions:
  - "MutationObserver, NOT rAF-only deferral, is the correct mechanism for cross-component theme sync — useTheme()'s useState is per-call, so FabricCanvas's local resolved never reflected SettingsPopover's theme change."
  - "Reservation must shrink wrapper height (h-[calc(100%-13rem)]), not add bottom padding (pb-28) — Fabric reads getBoundingClientRect which includes padding."
  - "208px reservation, not 112px — Phase 90 research undercounted FloatingToolbar height (~80px claim); actual post-Phase-83 banded toolbar is ~178px."

patterns-established:
  - "Theme-DOM subscription pattern: use MutationObserver on documentElement.class for any module that needs to react to theme flips but doesn't own the useTheme write."
  - "Canvas-area sizing pattern: never use padding on the wrapper Fabric reads — always shrink height directly."

requirements-completed: ["#201", "#202"]

# Metrics
duration: 20min
completed: 2026-05-16
---

# Phase 90 Plan 01: Theme Backdrop Flip + Toolbar Viewport Reservation Summary

**MutationObserver-driven canvas-bg flip + 208px height reservation so the 2D floor plan stays visible above the FloatingToolbar at all viewport sizes.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-16T00:09:49Z
- **Completed:** 2026-05-16T00:29:48Z
- **Tasks:** 3 (RED + 2 GREEN)
- **Files modified:** 1 source (FabricCanvas.tsx), 1 spec created, 1 deferred-items doc

## Accomplishments

- **#201 closed.** Theme toggle in Settings now flips the 2D canvas backdrop instantly without requiring a reload, redraw, or pan. Direct `fc.backgroundColor` mutation inside an rAF callback (NOT `redraw()`) preserves selectTool drag transactions.
- **#202 closed.** Floor plan and dimension labels are never hidden under the FloatingToolbar. Tested at viewport heights 800px, 1200px, 1600px; canvas bottom edge sits at least 4px above the toolbar top edge in every case.
- **Root-cause correction.** Phase 90 research suspected DOM-flush ordering (single rAF would fix). Actual root cause: `useTheme()` has per-call `useState`, so FabricCanvas's hook instance never observed SettingsPopover's theme write. MutationObserver on `<html>.class` is the single source of truth that works regardless of which component drove the write.

## Task Commits

1. **Task 1: RED — failing e2e specs** — `4f1ed5c` (test)
2. **Task 2: GREEN #201 — MutationObserver theme bridge** — `f67832d` (fix)
3. **Task 3: GREEN #202 — 208px canvas height reservation** — `0ad1b20` (fix)

## Files Created/Modified

- `tests/e2e/specs/90-canvas-polish.spec.ts` — 4 specs (1 theme-flip + 3 toolbar-clearance at viewport heights 800/1200/1600). Includes `parseLightness()` helper that accepts both `rgb()` and `oklch()` return formats.
- `src/canvas/FabricCanvas.tsx` — new useEffect that observes `<html>.class` mutations and rAF-defers a direct `fc.backgroundColor` + `fc.renderAll()` write; wrapper className changed from `h-full` to `h-[calc(100%-13rem)]`.
- `.planning/phases/90-canvas-polish/deferred-items.md` — documents pre-existing chromium-dev failures in `toolbar-redesign.spec.ts` (3) and `light-mode-canvas.spec.ts` (2) that reproduce on `main` and are out of scope per CLAUDE.md SCOPE BOUNDARY.

## Decisions Made

- **D-03 mechanism revised.** Plan called for rAF deferral alone; execution revealed `useTheme()` does not propagate cross-component (per-call useState), so I switched to MutationObserver on `<html>.class` and kept the rAF tick INSIDE the observer callback. The rAF tick still earns its keep — it ensures the CSS-token probe in `getCanvasTheme()` reads post-flush values.
- **D-04 mechanism revised.** Plan called for `pb-28` padding (~112px). Two execution discoveries forced changes: (a) Fabric reads `wrapper.getBoundingClientRect()` which INCLUDES padding, so `pb-*` did NOT shrink the canvas surface — switched to `h-[calc(100%-N)]` height reduction; (b) FloatingToolbar is ~178px tall (research undercounted at ~80px), so 112px was insufficient. Final: `h-[calc(100%-13rem)]` = 208px reservation, verified at 800/1200/1600px viewports.
- **3D split-view left untouched.** ThreeViewport has its own wrapper (App.tsx:291) that does NOT have the height reservation. The 3D viewport's orbit-controls camera fit is not bound by toolbar overlap in the same way 2D's `getBaseFitOrigin` is — verified `preset-toolbar-and-hotkeys.spec.ts` still passes. If Jessica UAT reports 3D toolbar overlap in a future Phase, the fix is the same one-liner on App.tsx:291.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cross-component theme sync did not work via useTheme local state**
- **Found during:** Task 2 (verifying #201 GREEN)
- **Issue:** The plan's prescribed rAF-on-[resolved] effect did nothing because `useTheme()` instantiates its own `useState` per call. SettingsPopover's `setTheme("dark")` write updates only its local state and writes `<html class="dark">` via its own effect — FabricCanvas's `useTheme` returns a different `resolved` value that never re-renders on theme change.
- **Fix:** Replaced the `[resolved]`-keyed effect with a `[]`-keyed effect that installs a MutationObserver on `document.documentElement` for `class` attribute mutations. Observer callback rAF-defers a direct `fc.backgroundColor` + `fc.renderAll()` write.
- **Files modified:** `src/canvas/FabricCanvas.tsx`
- **Verification:** Spec `#201 — theme toggle flips canvas backdrop without reload` passes (Light → Dark → Light cycle, no reload). 1120/1120 unit tests still pass; Phase 87 + Phase 88 theme specs pass.
- **Committed in:** `f67832d`

**2. [Rule 1 - Bug] CSS padding does not shrink the Fabric canvas (getBoundingClientRect includes padding)**
- **Found during:** Task 3 (verifying #202 GREEN with `pb-28`)
- **Issue:** Plan prescribed `pb-28` on the wrapper. Canvas height did not shrink — Fabric's redraw reads `wrapper.getBoundingClientRect()` which returns the border-box (including padding), so `setDimensions` continued to size the canvas to the full available area.
- **Fix:** Switched to `h-[calc(100%-7rem)]` (then `13rem` after measuring the actual toolbar). Wrapper element itself is shorter, so `getBoundingClientRect().height` returns the shorter value, and Fabric paints into a smaller surface.
- **Files modified:** `src/canvas/FabricCanvas.tsx`
- **Verification:** Spec `#202 — canvas viewport reserves space below toolbar` passes at 800/1200/1600px.
- **Committed in:** `0ad1b20`

**3. [Rule 1 - Bug] Toolbar height undercounted in research (~80px → actual ~178px)**
- **Found during:** Task 3 (running #202 spec with `7rem` shrink)
- **Issue:** Research §202 estimated FloatingToolbar at ~80px tall, yielding `pb-28` (112px) as the reservation. Measured live: toolbar bottom-edge at 1576 (h=1600 viewport, bottom-6=24px margin), top-edge at 1397.5 → actual height ~178px. The 5 banded groups + always-on `Drawing`/`Measure`/`Structure`/`View`/`Utility` labels (Phase 83) plus a likely flex-wrap at narrower widths bloated the toolbar.
- **Fix:** Bumped reservation from `7rem` (112px) to `13rem` (208px = 24px margin + ~180px toolbar + ~4px breathing).
- **Files modified:** `src/canvas/FabricCanvas.tsx`
- **Verification:** All 3 viewport-height variants of #202 spec pass.
- **Committed in:** `0ad1b20`

---

**Total deviations:** 3 auto-fixed (all Rule 1 — research-vs-runtime corrections, no scope creep)
**Impact on plan:** Plan objective unchanged (close #201 + #202). Mechanism choices revised based on runtime discovery; final implementation is more robust than the proposed rAF-only path and more accurately sized than the proposed 112px reservation.

## Issues Encountered

- **rAF flakiness concern from research:** the MutationObserver path makes the rAF tick guaranteed-after-class-flush (MutationObserver fires on the same microtask as the class write, then rAF schedules to the next paint). Spec uses `expect.poll` with intervals up to 200ms across 1000ms — no flake observed across 2 full runs.
- **Pre-existing test failures NOT caused by Phase 90** documented in `deferred-items.md`: 3 in toolbar-redesign.spec.ts (missing `setupPage()` call), 2 in light-mode-canvas.spec.ts (chromium-dev oklch baseline noted in Phase 88 deferred-items). Verified each reproduces on `main` immediately before Plan 90-01 began.

## Test Bridge Changes

- `FloatingToolbar.tsx` ALREADY had `data-testid="floating-toolbar"` on the root div (Phase 83 IA-06). No additional bridges added.
- `__driveGetCanvasBg` test driver (Phase 88, L200-201 of FabricCanvas.tsx) reused unchanged.

## Stub Tracking

No stubs or placeholders introduced — both fixes wire real behavior.

## Next Phase Readiness

- Plan 90-02 (#203 left-click pan on empty 2D canvas with Select tool) is ready to start. It depends on `useUIStore.setPanOffset` (already exists, used by FabricCanvas pan handler at L480-548) and modifies `src/canvas/tools/selectTool.ts` — no shared files with Plan 90-01.
- Phase 90 phase-complete after Plan 90-02 ships. PR body must include `Closes #201`, `Closes #202`, `Closes #203` (Plan 90-02 closes the third).

## Self-Check: PASSED

- `src/canvas/FabricCanvas.tsx` contains `useEffect` with `MutationObserver` on `document.documentElement` and `requestAnimationFrame` inside callback — VERIFIED via Read.
- `src/canvas/FabricCanvas.tsx` wrapper className contains `h-[calc(100%-13rem)]` — VERIFIED via Read.
- `tests/e2e/specs/90-canvas-polish.spec.ts` exists with 1 theme-flip + 3 viewport-height specs — VERIFIED via Read.
- All 3 task commits exist in `git log` (`4f1ed5c`, `f67832d`, `0ad1b20`) — VERIFIED.
- 4/4 specs in `tests/e2e/specs/90-canvas-polish.spec.ts` pass on chromium-dev — VERIFIED.
- 1120/1120 vitest unit tests pass — VERIFIED.

---
*Phase: 90-canvas-polish*
*Completed: 2026-05-16*
