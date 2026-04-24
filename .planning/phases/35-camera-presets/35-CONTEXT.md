# Phase 35: Camera Presets — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Four view-state camera presets (eye-level / top-down / 3-quarter / corner) accessible from the Toolbar and via bare `1` / `2` / `3` / `4` hotkeys. Preset switches tween smoothly (~600ms ease-in-out), handle mid-tween interruption cleanly, and never pollute `cadStore` history or `useAutoSave`. Camera state remains view-state, not CAD-state.

**In scope:** orbit-mode presets, toolbar UI, hotkey wiring, tween machinery, active-preset indicator, reduced-motion fallback, `activeElement` guard for hotkeys, test drivers.

**Out of scope:** walk-mode presets (explicitly deferred — see D-01), per-project preset customization, user-defined presets, dolly/truck/pan controls, camera bookmarks.
</domain>

<decisions>
## Implementation Decisions

### Walk-mode handoff
- **D-01:** Hotkeys `1`/`2`/`3`/`4` are **inert** when `cameraMode === "walk"` — no preset applied, no auto-switch to orbit. Toolbar preset buttons are disabled (or render dimmed with a tooltip "Exit walk mode to use presets") while in walk mode.
- **Reason:** Walk mode is a modal "I'm in the room" experience. Silently yanking the user back to orbit — even with a toast — feels hostile and conflicts with the `activeElement` hotkey-guard philosophy of keeping shortcuts scoped. Consistent with D-39 (respect the user's current modal state).

### Active-preset indicator behavior
- **D-02:** Once a preset is applied, its toolbar button stays highlighted (`bg-accent/20 text-accent-light border-accent/30`) until a different preset is applied. Manual `OrbitControls` drags do NOT clear the indicator.
- **Reason:** The indicator communicates **intent**, not pixel-exact camera equality. `OrbitControls` `onChange` fires continuously during damping frames, so a "clear on any change" rule would flicker the indicator on every tween settle. After a preset lands, subsequent mouse interaction is normal orbit — no need to punish it.

### Hotkeys from 2D view
- **D-03:** Hotkeys `1`/`2`/`3`/`4` are **inert** when `viewMode !== "3d"` and `viewMode !== "split"`. No preset applied, no auto-switch to 3D.
- **Reason:** One-key shortcuts that also change view modes produce magic-at-a-distance. If Jessica is measuring in 2D plan view and accidentally taps `3`, yanking her into 3D is a worse failure mode than a no-op. Explicit 3D entry (existing view tabs) keeps the mental model simple. This is consistent with D-01's "scope shortcuts narrowly" philosophy.

### Reduced-motion fallback
- **D-04:** When `useReducedMotion()` returns `true`, preset switches snap **instantly** — no tween, no easing, no shortened-linear alternative. Cancel-and-restart logic still applies (for the case where two hotkeys land within the same frame), but each application is a snap.
- **Reason:** `prefers-reduced-motion: reduce` is the user asking for motion to stop. A "shortened linear" tween is still motion. Snap is the honest answer. Matches Phase 33 D-39 pattern (snap open/closed when reduced motion is on).

### 3-quarter preset definition
- **D-05:** The 3-quarter preset uses the **literal v1.7.5 baseline** camera pose: `position = [halfW + 15, 12, halfL + 15]`, `target = [halfW, halfL / 2, halfL]`. No geometric derivation.
- **Reason:** Users have mental model of "how 3D looks by default." Rebasing to a geometric formula (45° azimuth, room-size-scaled distance, etc.) changes the look without the user asking. Ship the literal baseline; geometric derivation is cheap to add later if a specific room geometry breaks it. CAM-01 acceptance explicitly names this preset as "current default (matches v1.7.5 baseline)" which locks the choice.

### Toolbar placement & icons
- **D-06:** Presets render as a **separate button cluster** in the Toolbar, positioned immediately right of the existing camera-mode toggle (orbit↔walk). The cluster is 4 adjacent icon buttons sharing the Toolbar's ghost-border group style.
- **D-07:** Icons are **lucide-react** per Phase 33 D-33 (lucide for new chrome icons). Initial icon picks — subject to review against lucide's catalog during planning:
  - Eye-level → `User` (person silhouette implies eye-level viewing)
  - Top-down → `Map` (reads as plan-view)
  - 3-quarter → `Box` (3D-ish cube)
  - Corner → `CornerDownRight` (directional corner glyph)
- **Reason:** 4 buttons is too many to inline with the mode toggle comfortably; a dropdown (Views menu) hides functionality behind a click and loses at-a-glance active-preset state. A separate cluster keeps all camera controls grouped but visually distinguishes "mode" from "quick angle." Camera-preset glyphs are not CAD-domain (unlike `door_front` or `roofing`), so lucide is correct per D-33's "new chrome icons only" rule.
- **Planner note:** `User` for eye-level is somewhat speculative. Planner should verify lucide's catalog and swap if a clearer icon exists (candidates: `Eye`, `PersonStanding`, `Accessibility`).

### Claude's Discretion
- Exact `easeInOutCubic` vs `easeInOutQuad` curve (both are "ease-in-out ~600ms" — pick whichever lands more naturally)
- Damping toggle mechanism: `enableDamping={false}` during tween vs passing `dampingFactor={0}` (both work; planner picks the cleaner one)
- Tween cancellation technique: `useRef` animation-frame guard vs `AbortController` vs a monotonically-incrementing `tweenId` (planner picks)
- Exact toolbar button spacing inside the cluster (must use Phase 33 canonical `gap-1` / `gap-2` per D-34)
- Whether presets are stored as a named enum `"eye-level" | "top-down" | "3-quarter" | "corner"` or as a preset index — purely implementation
- Active-preset state location: new field in `uiStore` (`activePreset?: PresetId`) vs local state in Toolbar — planner picks (but must be readable by `__getActivePreset` test driver)

</decisions>

<specifics>
## Specific Ideas

- **Existing tween pattern to extend or replace:** ThreeViewport already has a simple `cameraAnimTarget.current` + `useFrame` lerp pattern for the `wallSideCameraTarget` feature (speed 0.08, epsilon 0.05). The existing lerp is a naive exponential approach, not a time-based ease curve. Planner decides whether to extend the existing mechanism to support ease curves or build a new time-based tween alongside it. If two code paths coexist, document which is the canonical "preset tween" vs the legacy wall-side lerp.
- **Reuse `__setTestCamera`:** The Phase 36 test-mode helper at `src/three/ThreeViewport.tsx` is the established convention. Add a sibling `__applyCameraPreset(presetId)` test driver using the same `import.meta.env.MODE === "test"` gate and the same install/cleanup `useEffect` pattern.
- **Reuse `useReducedMotion`:** Shared hook at `src/hooks/useReducedMotion.ts` from Phase 33. Do not reinvent.
- **Reuse active-preset highlight class:** `bg-accent/20 text-accent-light border-accent/30` is already the locked style for active toolbar state per CAM-01 acceptance criteria.
- **Toolbar precedent for keyboard shortcuts:** Existing `keydown` listener at `App.tsx:247-248` is the installation point. The existing handler already does modifier-key filtering; Phase 35's `activeElement` guard (inert when `tagName` is `INPUT` or `TEXTAREA`) is a new rule that must be additive, not a rewrite.
- **View-mode awareness:** D-03 requires the hotkey handler to read `useUIStore.getState().viewMode` (actually lives in `App.tsx` local state `viewMode` — planner needs to thread it or move it to `uiStore`). Prefer reading from wherever it already lives rather than refactoring.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §v1.8 Requirements → Camera Presets (CAM) — CAM-01 (buttons + hotkeys + active indicator + activeElement guard), CAM-02 (tween + damping toggle + cancel-and-restart + view-mode-change clear), CAM-03 (no history / no autosave pollution)
- `.planning/ROADMAP.md` §Phase 35 — scope statement

### Existing code to read
- `src/three/ThreeViewport.tsx` — OrbitControls setup, existing `cameraAnimTarget` lerp pattern, `__setTestCamera` test driver pattern, `cameraMode` handling
- `src/stores/uiStore.ts` — `cameraMode` state, `setCameraMode` / `toggleCameraMode`, pattern for adding new view-state fields
- `src/components/Toolbar.tsx` — existing toolbar structure, camera-mode toggle placement, ghost-border/spacing conventions
- `src/App.tsx:240-250` — existing `keydown` global handler (insertion point for preset hotkeys)
- `src/hooks/useReducedMotion.ts` — shared hook for D-04
- `src/types/cad.ts` — for any new preset-id type (place alongside `ToolType`)
- `tests/e2e/playwright-helpers/setTestCamera.ts` — established test-driver convention for new `__applyCameraPreset` helper

### Locked conventions
- Phase 33 D-33 (icon policy — lucide for new chrome icons)
- Phase 33 D-34 (canonical spacing — `gap-1` / `gap-2` / `p-1` / `p-2` only in Toolbar)
- Phase 33 D-39 (reduced-motion guard — `useReducedMotion()` snap fallback)
- Phase 31 `window.__drive*` test-driver convention (gated by `import.meta.env.MODE === "test"`)
- Display-vs-identifier separation (preset labels in UI may be display-cased; internal preset IDs use code-key style)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`cameraAnimTarget` lerp** in `ThreeViewport.tsx` — can be extended to support ease curves, or run alongside a new time-based tween; planner decides.
- **`useReducedMotion`** hook — direct reuse for D-04.
- **`__setTestCamera`** helper pattern — clone for `__applyCameraPreset`.
- **`bg-accent/20 text-accent-light border-accent/30`** active-state class triad — reuse from CAM-01 acceptance (matches existing Toolbar tool-button active style at `Toolbar.tsx` `tools.map(...)` block).
- **Existing `keydown` global handler** at `App.tsx:247` — extend, don't replace.

### Established Patterns
- **Camera state lives in `uiStore`** (not `cadStore`). This pattern is already locked — presets follow it. Adding an `activePreset` field (if planner chooses uiStore over Toolbar-local state) is a natural extension of `cameraMode`.
- **Test drivers are `window.__xxx` functions gated by `import.meta.env.MODE === "test"`** installed via `useEffect` at component mount (Phase 31 convention).
- **`useFrame` + `lerp` + epsilon-stop** is the existing camera animation shape. New tween can follow this or use a time-based approach — both are acceptable.
- **OrbitControls damping is on by default (`enableDamping`, `dampingFactor={0.1}`)**. CAM-02 requires damping toggle; disabling via `enableDamping={false}` during the tween is straightforward.

### Integration Points
- **Toolbar.tsx** — new button cluster right of camera-mode toggle.
- **App.tsx keydown handler** — new 1/2/3/4 cases with `activeElement` + `viewMode` + `cameraMode` guards.
- **uiStore.ts** — possible new `activePreset` field + setter.
- **ThreeViewport.tsx** — new preset-tween `useFrame` logic (or extension of existing `cameraAnimTarget`), damping toggle effect, test-mode `__applyCameraPreset` driver.
- **playwright-helpers/** — new `applyCameraPreset.ts` helper mirroring `setTestCamera.ts`.
- **Possible `src/three/cameraPresets.ts`** — pure module exporting `getPresetPose(presetId, room): { position, target }` for each of the 4 presets. Keeps math testable in isolation and decoupled from React lifecycle.

</code_context>

<deferred>
## Deferred Ideas

- **Walk-mode presets** — explicit out-of-scope per REQUIREMENTS and D-01. If a future milestone wants "apply preset from walk mode," revisit as its own phase.
- **User-defined / saved presets** — "bookmark this camera" style feature. Not in scope; revisit post-v1.8.
- **Smooth camera transitions on view-mode change** (2D→3D entering with an animated camera swoop) — tempting adjacent feature, not in phase. Current behavior (instant restore of last orbit pos) stays.
- **Dolly / truck / pan precise controls** — power-user camera inputs. Not in scope.
- **Geometric 3-quarter derivation** — considered and rejected for v1.8 per D-05. If a user reports the v1.7.5 baseline looks wrong for an unusual room dimension, revisit in a polish phase.

</deferred>

---

*Phase: 35-camera-presets*
*Context gathered: 2026-04-24*
