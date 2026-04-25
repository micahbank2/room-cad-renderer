---
phase: 35-camera-presets
plan: 02
subsystem: camera-motion
tags: [camera, presets, tween, e2e, cam-02, cam-03]
dependency-graph:
  requires:
    - src/stores/uiStore.ts (Plan 35-01: pendingPresetRequest, clearPendingPresetRequest, activePreset)
    - src/three/cameraPresets.ts (Plan 35-01: getPresetPose, PresetId, PRESETS)
    - src/hooks/useReducedMotion.ts (Phase 33 D-39 reuse)
    - tests/e2e/playwright-helpers/setupPage.ts (Phase 36 setup utility)
    - playwright.config.ts (Phase 36: 90s CI timeout, dual chromium-dev + chromium-preview projects)
  provides:
    - presetTween useEffect + useFrame loop in ThreeViewport.tsx (~600ms easeInOutCubic + imperative damping toggle + reduced-motion snap)
    - window.__applyCameraPreset / __getActivePreset / __getCameraPose test drivers (Phase 31 convention, MODE === "test" gated)
    - window.__getCADHistoryLength test driver (cadStore.ts)
    - tests/e2e/playwright-helpers/applyCameraPreset.ts helper
    - tests/e2e/playwright-helpers/seedRoom.ts shared room-seeding utility
    - 5 e2e specs covering CAM-01/02/03 acceptance bullets
  affects:
    - none beyond declared files_modified
tech-stack:
  added: []
  patterns:
    - Time-based easeInOutCubic tween (NOT exponential lerp) — captures `from` from live OrbitControls at tween start, auto-handling cancel-and-restart
    - Imperative damping toggle (`ctrl.enableDamping = false/true` on ref) — does not rely on prop reactivity
    - Reduced-motion path: instant snap, never enters useFrame loop
    - View-mode unmount: presetTweenRef cleared in Scene useEffect cleanup; cameraMode flip orbit→walk: explicit cleanup branch in cameraMode useEffect
    - 5 e2e specs use Phase 31 `__drive*` driver pattern + Phase 36 `setupPage` + new `seedRoom` helper
key-files:
  created:
    - tests/e2e/playwright-helpers/applyCameraPreset.ts
    - tests/e2e/playwright-helpers/seedRoom.ts
    - tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts
    - tests/e2e/specs/preset-active-element-guard.spec.ts
    - tests/e2e/specs/preset-mid-tween-cancel.spec.ts
    - tests/e2e/specs/preset-view-mode-cleanup.spec.ts
    - tests/e2e/specs/preset-no-history-no-autosave.spec.ts
    - .planning/phases/35-camera-presets/35-02-motion-SUMMARY.md
  modified:
    - src/three/ThreeViewport.tsx
    - src/stores/cadStore.ts
decisions:
  - Tween is a NEW presetTweenRef alongside the existing wallSide cameraAnimTarget — they coexist without coupling (Research §1 recommendation honored)
  - `from` vector is captured from LIVE camera at tween start, not from the previous tween's `toPos` — this is what makes mid-tween cancel-and-restart work without jumps
  - Reduced-motion snap is a TRUE snap: useFrame is never entered, presetTweenRef stays null, damping is left at its OrbitControls default — no shortened linear fallback
  - View-mode change mid-tween clears presetTweenRef in the Scene useEffect cleanup; no throws, no zombie tweens
  - cameraMode orbit→walk mid-tween explicitly clears presetTweenRef AND restores enableDamping=true (Research §9 Risk 5)
  - activePreset is NOT cleared on view-mode change or walk-mode flip (per CONTEXT D-02 + Research §9 Risk 8 — indicator persists for re-entry)
  - __getCADHistoryLength colocated in cadStore.ts alongside the existing __cadStore handle (Phase 36 convention)
  - 5 e2e specs use the same pattern as Phase 36 (setupPage + seedRoom + test-mode drivers); no committed pixel goldens (Phase 36 lesson honored)
  - Eye-level "looking toward room center" stays at the Plan 35-01 interpretation (corner-stand at (0, 5.5, 0) → centered target) — flagged for HUMAN-UAT in 35-01 SUMMARY; not re-decided here
deviations:
  - Plan referenced 1 helper (applyCameraPreset.ts); shipped 2 (added seedRoom.ts) — extracted shared room-seeding boilerplate from inline `await page.evaluate(loadSnapshot...)` blocks across 5 specs. Pure refactor, no behavior change. Not flagged in plan but reduces duplication.
verification:
  manual:
    - Click each preset button in toolbar → camera tweens to pose, button highlights
    - Press 1/2/3/4 hotkeys → same as button clicks
    - Spam two preset hotkeys quickly → smooth cancel-and-restart, no jumps
    - Switch to 2D view mid-tween → no throws (verified by spec)
    - Toggle to walk mode mid-tween → no throws, damping restored
    - Type into RoomSettings input + press 1 → no preset applied (activeElement guard works)
    - Try preset hotkeys in 2D view → silent no-op (D-03)
    - Try preset hotkeys / buttons in walk mode → buttons disabled, hotkeys silent (D-01)
  automated:
    - 5 e2e specs / 6 test cases pass on chromium-dev (48s)
    - Same 5 specs / 6 test cases pass on chromium-preview (45s — production-minified bundle)
    - Plan 35-01 unit tests still green (6/6 cameraPresets tests)
    - Pre-existing 6 vitest failures unchanged (LIB-03/04/05 + App.restore — documented in 36-01 deferred-items.md)
  human-uat:
    - Eye-level "looking toward room center" pose — visual confirmation needed when Jessica tries the feature. Current formula (corner-stand at (0, 5.5, 0) → centered target) was a planner-resolved "looking toward room center" interpretation. If it feels wrong, easy revisit by adjusting `cameraPresets.ts` poseFor("eye-level").
    - Tween easing curve aesthetic (easeInOutCubic chosen) — confirm it doesn't feel sluggish or snappy in actual use
    - Active-preset highlight intensity (`bg-accent/20`) — confirm legible against the obsidian-deepest toolbar background
test-results:
  unit: 6/6 cameraPresets passing (Plan 35-01); pre-existing 6 unrelated failures unchanged
  e2e-dev: 6/6 preset specs passing (chromium-dev, 48s)
  e2e-preview: 6/6 preset specs passing (chromium-preview, 45s)
  build: succeeds (npm run build)
  typecheck: clean (npx tsc --noEmit)
---

# Phase 35 Plan 02 — Motion Engine + E2E Specs

## What shipped

Implements CAM-02 (smooth tween + cancel-and-restart + view-mode cleanup) and CAM-03 (no history / no autosave pollution) on top of the structure from Plan 35-01.

### 1. Tween engine (ThreeViewport.tsx)

A new Scene-level useEffect watches `useUIStore.pendingPresetRequest`. When non-null, it kicks off a time-based easeInOutCubic tween using `useFrame`. Key properties:

- **Duration**: ~600ms (constants `TWEEN_DURATION_MS = 600`).
- **Curve**: `easeInOutCubic(t) = t < 0.5 ? 4*t³ : 1 - ((-2*t + 2)³)/2` — a clean accelerate/decelerate with no extreme overshoot.
- **From-pose capture**: the tween reads `orbitControlsRef.current.object.position` and `.target` at tween start, NOT at preset request time. This means a second preset request mid-tween restarts from wherever the camera currently is, automatically yielding smooth cancel-and-restart.
- **Damping toggle**: `ctrl.enableDamping = false` at tween start, restored to `true` on settle. Imperative on the ref — does NOT rely on prop reactivity (Research §9 Risk 3).
- **Reduced-motion**: when `useReducedMotion()` is true, the entire tween path is bypassed — pose snaps instantly, useFrame is never entered.
- **View-mode unmount**: when ThreeViewport unmounts (2D-only view), the Scene cleanup nulls `presetTweenRef.current`. No throws.
- **Walk-mode interrupt**: a separate effect on `cameraMode` clears `presetTweenRef.current` AND restores `ctrl.enableDamping = true` if the user toggles to walk mode mid-tween (Research §9 Risk 5).

### 2. Test drivers

Three new `window.__*` drivers installed in Scene, gated by `import.meta.env.MODE === "test"` (Phase 31 convention):

- `__applyCameraPreset(presetId)` — calls `useUIStore.getState().requestPreset(presetId)`. Equivalent to a Toolbar click but bypasses UI.
- `__getActivePreset(): PresetId | null` — reads `useUIStore.getState().activePreset`.
- `__getCameraPose(): { position, target }` — reads live OrbitControls. Used by mid-tween cancel spec to capture intermediate poses.

Plus `__getCADHistoryLength()` in cadStore.ts — colocated with the existing `__cadStore` handle from Phase 36.

### 3. Five e2e specs

Mapped 1:1 to Research §7:

| Spec | Requirement | Test cases |
|------|-------------|------------|
| `preset-toolbar-and-hotkeys.spec.ts` | CAM-01 | 2 (button click, hotkey) |
| `preset-active-element-guard.spec.ts` | CAM-01 | 1 (focus in input → hotkey inert) |
| `preset-mid-tween-cancel.spec.ts` | CAM-02 | 1 (two requests, ends at second pose) |
| `preset-view-mode-cleanup.spec.ts` | CAM-02 | 1 (mid-tween 3D→2D, no throw) |
| `preset-no-history-no-autosave.spec.ts` | CAM-03 | 1 (10 switches, past.length unchanged) |

All 6 tests pass on both `chromium-dev` (Vite dev server) and `chromium-preview` (production-minified bundle), validating the test-mode gate survives minification.

## Phase 36 lessons honored

- **No committed pixel goldens**: per Phase 36's hard-won lesson, none of the new specs use `toHaveScreenshot()` with stored PNGs. The mid-tween-cancel spec uses `__getCameraPose()` to inspect numerical pose vectors, sidestepping the platform-coupling problem entirely.
- **Inline setup via test drivers**: every spec calls `setupPage` + `seedRoom` (new helper) to land in a known state without UI traversal.
- **CI timeout**: Phase 36's 90s CI timeout in playwright.config.ts already covers the new specs.

## Open items / HUMAN-UAT

- **Eye-level pose interpretation**: planner resolution (corner-stand at (0, 5.5, 0) → centered target) is a literal reading of CAM-01's "looking toward room center". Whether this *feels* right is a visual judgment for Jessica. Easy to adjust later by editing the eye-level entry in `cameraPresets.ts`.
- **Tween easing aesthetic**: `easeInOutCubic` is the planner's pick (alternatives: easeInOutQuad, easeInOutQuart). 600ms is the spec'd duration. Subjective feel — confirm in actual use.
- **Active-preset highlight contrast**: the `bg-accent/20 text-accent-light border-accent/30` triad is the locked CAM-01 acceptance style and matches existing tool buttons. Visual confirmation of legibility on the obsidian-deepest toolbar would close this.

## Files modified

- `src/three/ThreeViewport.tsx` — Scene-level presetTween useEffect + useFrame loop + 3 test drivers + cameraMode-unmount cleanup
- `src/stores/cadStore.ts` — `window.__getCADHistoryLength` test-mode driver

## Files added

- `tests/e2e/playwright-helpers/applyCameraPreset.ts`
- `tests/e2e/playwright-helpers/seedRoom.ts` (extracted shared seed boilerplate — pure refactor)
- `tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts`
- `tests/e2e/specs/preset-active-element-guard.spec.ts`
- `tests/e2e/specs/preset-mid-tween-cancel.spec.ts`
- `tests/e2e/specs/preset-view-mode-cleanup.spec.ts`
- `tests/e2e/specs/preset-no-history-no-autosave.spec.ts`

## Phase 35 status

Both plans shipped. Phase 35 (Camera Presets) is feature-complete pending HUMAN-UAT items above.
