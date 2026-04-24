# Phase 35: Camera Presets — Research

**Researched:** 2026-04-24
**Domain:** Three.js / R3F camera tweening + React keyboard wiring + Zustand view-state
**Confidence:** HIGH (in-codebase research; no external library questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Hotkeys 1/2/3/4 are **inert** when `cameraMode === "walk"`. Toolbar buttons disabled/dimmed in walk mode.
- **D-02:** Active-preset toolbar highlight stays until a *different* preset is applied. Manual orbit drags do NOT clear it.
- **D-03:** Hotkeys 1/2/3/4 are **inert** when `viewMode !== "3d"` and `viewMode !== "split"`. No auto-switch to 3D.
- **D-04:** When `useReducedMotion()` returns `true`, preset switches **snap instantly** — no tween, no easing.
- **D-05:** 3-quarter preset uses the **literal v1.7.5 baseline**: `position = [halfW + 15, 12, halfL + 15]`, `target = [halfW, halfL / 2, halfL]`. No geometric derivation.
- **D-06:** Presets render as a separate 4-button cluster in the Toolbar, immediately right of the camera-mode toggle, sharing ghost-border group style.
- **D-07:** Icons are **lucide-react** per Phase 33 D-33. Initial picks: `User` (eye-level), `Map` (top-down), `Box` (3/4), `CornerDownRight` (corner) — Planner may swap based on §5 below.

### Claude's Discretion
- `easeInOutCubic` vs `easeInOutQuad` curve
- Damping toggle mechanism (`enableDamping={false}` prop vs imperative `controls.enableDamping = false`)
- Tween cancellation technique (animation-frame guard vs `AbortController` vs incrementing `tweenId`)
- Toolbar cluster spacing (must use Phase 33 canonical `gap-1` / `gap-2` per D-34)
- Preset ID type — named string union vs index
- Active-preset state location: `uiStore` field vs Toolbar-local state (must be readable by `__getActivePreset` test driver)

### Deferred Ideas (OUT OF SCOPE)
- Walk-mode presets
- User-defined / saved presets ("bookmark this camera")
- Smooth animated camera swoop on view-mode change
- Dolly / truck / pan precise controls
- Geometric 3-quarter derivation (room-size scaled)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAM-01 | 4 presets via toolbar + 1/2/3/4 hotkeys; active indicator; activeElement guard | §2 (pose math), §3 (state), §4 (hotkey guards), §5 (icons) |
| CAM-02 | ~600ms ease-in-out tween; damping disable during tween; mid-tween cancel-and-restart; view-mode-change cleanup | §1 (tween mechanism + cancellation + cleanup) |
| CAM-03 | No undo-history pollution; no autosave triggers | §3 (state placement in uiStore not cadStore), §9 (risks) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Phase 33 D-33 (Icon Policy):** new chrome icons MUST use `lucide-react`. No new `material-symbols-outlined` outside the 8-file allowlist. ✅ presets are new chrome.
- **Phase 33 D-34 (Spacing):** Toolbar.tsx is one of the 4 "zero arbitrary values" files. Use only `gap-1`/`gap-2`/`p-1`/`p-2`/`rounded-sm`. No `gap-[3px]` etc.
- **Phase 33 D-39 (Reduced Motion):** every new animation MUST guard on `useReducedMotion()`.
- **Phase 31 driver convention:** test drivers are `window.__xxx` functions installed via `useEffect` gated on `import.meta.env.MODE === "test"`.
- **Camera state lives in `uiStore`, never `cadStore`** (pattern locked by `cameraMode`, `wallSideCameraTarget`).
- **GitHub Issues policy:** CAM-01/02/03 → GH #45 (existing). PR body must `Closes #45`. Phase plan must reference issue + add `in-progress` label.

## Summary

Phase 35 is well-bounded: 4 preset poses + toolbar UI + hotkey wiring + tween machinery + reduced-motion fallback. Most architectural decisions are locked in CONTEXT.md. The remaining technical questions are:

1. **Tween mechanism** — extend the existing exponential-lerp `cameraAnimTarget` ref or build a parallel time-based tween? **Recommendation: build a new time-based tween alongside.** The existing lerp is exponential (speed 0.08, "close enough" at 0.05ft) and cannot satisfy a "~600ms ease-in-out" specification without changing its shape — which would silently regress the wall-side feature that depends on its current feel.
2. **Active-preset state placement** — **uiStore field** (`activePreset?: PresetId`) for testability and consistency with `cameraMode`.
3. **View mode threading** — **keep view mode in `App.tsx` local state** (don't refactor); thread it into the hotkey handler via the existing `[setTool, viewMode]` deps array (already there).
4. **Pure preset-pose module** at `src/three/cameraPresets.ts` for unit testability.

**Primary recommendation:** Land 2 plans. Plan 01: pose module + uiStore field + Toolbar cluster + hotkey wiring. Plan 02: tween engine in `ThreeViewport.tsx` with cancel-and-restart + damping toggle + reduced-motion fallback + view-mode unmount cleanup + test drivers + e2e specs.

---

## §1 Tween Mechanism

### Recommendation: build a new time-based tween, alongside (not replacing) the existing `cameraAnimTarget` lerp

**Rationale:**
- The existing lerp is exponential (`cam.position.lerp(pos, 0.08)` per frame) — feel is "decelerate forever, snap when within 0.05ft." It works for `wallSideCameraTarget` because users don't notice timing there.
- CAM-02 explicitly requires "~600ms ease-in-out." Time-based tween is the only way to honor that.
- Modifying the existing lerp shape risks changing the wall-side feature's feel.
- Both can coexist: each preset switch sets `presetTween.current = {...}`, the wall-side path keeps `cameraAnimTarget.current = {...}`. Each has its own `useFrame` branch with mutually-exclusive guard. Document `presetTween` as the canonical preset path; `cameraAnimTarget` remains as the legacy wall-side path.

### Easing curve

**Pick `easeInOutCubic`.** Both Cubic and Quad work, but Cubic has a more pronounced "settle" at the end which reads as more polished for camera motion. Math:

```ts
// t in [0, 1]
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
```

### Tween state shape

```ts
type PresetTween = {
  fromPos: THREE.Vector3;     // captured at tween start
  fromTarget: THREE.Vector3;  // captured at tween start
  toPos: THREE.Vector3;       // computed from getPresetPose()
  toTarget: THREE.Vector3;
  startMs: number;            // performance.now() at tween start
  durationMs: number;         // 600
  presetId: PresetId;         // for any post-settle bookkeeping
};
const presetTween = useRef<PresetTween | null>(null);
```

### `useFrame` body sketch

```ts
useFrame(() => {
  // Existing wall-side branch (unchanged)
  if (cameraAnimTarget.current) { /* existing exponential lerp */ }

  // Preset tween branch (new, mutually exclusive — only one tween should be active)
  const t = presetTween.current;
  if (!t) return;
  const ctrl = orbitControlsRef.current;
  if (!ctrl?.object) return;

  const elapsed = performance.now() - t.startMs;
  const raw = Math.min(elapsed / t.durationMs, 1);
  const eased = easeInOutCubic(raw);

  const cam = ctrl.object as THREE.Camera;
  cam.position.lerpVectors(t.fromPos, t.toPos, eased);
  ctrl.target.lerpVectors(t.fromTarget, t.toTarget, eased);
  ctrl.update();

  if (raw >= 1) {
    // Snap to exact, persist for D-09 restore, re-enable damping, clear tween
    cam.position.copy(t.toPos);
    ctrl.target.copy(t.toTarget);
    ctrl.update();
    orbitPosRef.current = [t.toPos.x, t.toPos.y, t.toPos.z];
    orbitTargetRef.current = [t.toTarget.x, t.toTarget.y, t.toTarget.z];
    ctrl.enableDamping = true; // re-enable on settle
    presetTween.current = null;
  }
});
```

### Tween start (cancel-and-restart)

When a new preset is requested:

```ts
function startPresetTween(presetId: PresetId) {
  const ctrl = orbitControlsRef.current;
  if (!ctrl?.object) return;
  const cam = ctrl.object as THREE.Camera;

  // 1) Capture current camera state as `from` — this works whether a tween was
  //    in progress or not, because the camera position is always the source of truth.
  const fromPos = cam.position.clone();
  const fromTarget = ctrl.target.clone();

  // 2) Compute target pose
  const pose = getPresetPose(presetId, room);
  const toPos = new THREE.Vector3(...pose.position);
  const toTarget = new THREE.Vector3(...pose.target);

  // 3) Disable damping (avoids fighting the tween)
  ctrl.enableDamping = false;

  // 4) Replace any in-flight tween — Cancel-and-restart from current pos, fresh 600ms
  presetTween.current = {
    fromPos, fromTarget, toPos, toTarget,
    startMs: performance.now(), durationMs: 600, presetId,
  };
}
```

**Cancel-and-restart works for free** because we always capture `fromPos`/`fromTarget` from the live camera, never from the previous tween's `to`. CAM-02 acceptance "no jumps, no stranded cameras" is guaranteed.

### Reduced-motion path (D-04)

```ts
function applyPreset(presetId: PresetId) {
  if (useReducedMotion check is true) {
    // Snap: set camera + target directly, persist refs, no tween
    const pose = getPresetPose(presetId, room);
    cam.position.set(...pose.position);
    ctrl.target.set(...pose.target);
    ctrl.update();
    orbitPosRef.current = pose.position;
    orbitTargetRef.current = pose.target;
    presetTween.current = null;
    return;
  }
  startPresetTween(presetId);
}
```

### View-mode-change cleanup (CAM-02)

The 3D viewport unmounts when `viewMode` becomes `"2d"` or `"library"`. With the tween ref local to `Scene`, unmounting the entire `<Canvas>` subtree garbage-collects everything. **No explicit cleanup needed for the unmount case** — but to be safe and explicit, add a top-level `useEffect` in `Scene`:

```ts
useEffect(() => {
  return () => {
    presetTween.current = null; // belt-and-suspenders cleanup on unmount
  };
}, []);
```

The "doesn't throw" requirement is satisfied because `useFrame` only runs while mounted, and tween mutations on `ctrl?.object` are already guarded.

### Damping toggle technique

**Use imperative `ctrl.enableDamping = true/false` on the OrbitControls ref**, not the JSX prop. R3F prop changes trigger re-renders; mutating the controls instance directly is what the existing `onChange` handler already does and is the established pattern. The JSX `enableDamping` prop sets the initial value only.

---

## §2 Preset Pose Math

Pure module at **`src/three/cameraPresets.ts`** (new file). Inputs: `room: { width, length, wallHeight }`. Output: `{ position: [x,y,z], target: [x,y,z] }` in 3D world coords (matches existing `[halfW + 15, 12, halfL + 15]` convention — Y is up; X = floorplan x; Z = floorplan y).

```ts
export type PresetId = "eye-level" | "top-down" | "three-quarter" | "corner";
export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
};

const PRESET_IDS: PresetId[] = ["eye-level", "top-down", "three-quarter", "corner"];
const PRESET_BY_HOTKEY: Record<string, PresetId> = {
  "1": "eye-level", "2": "top-down", "3": "three-quarter", "4": "corner",
};

export function getPresetPose(
  presetId: PresetId,
  room: { width: number; length: number; wallHeight: number },
): CameraPose {
  const halfW = room.width / 2;
  const halfL = room.length / 2;
  const H = room.wallHeight;

  switch (presetId) {
    case "eye-level":
      // CAM-01: 5.5 ft height, looking toward room center.
      // Place camera at one corner of the room, eye-height, looking at center at eye-height.
      return {
        position: [0, 5.5, 0],
        target: [halfW, 5.5, halfL],
      };

    case "top-down":
      // CAM-01: Y = 1.5 × max(roomWidth, roomLength), looking straight down at center.
      return {
        position: [halfW, 1.5 * Math.max(room.width, room.length), halfL],
        target: [halfW, 0, halfL],
      };

    case "three-quarter":
      // D-05 LITERAL v1.7.5 BASELINE — DO NOT derive geometrically.
      return {
        position: [halfW + 15, 12, halfL + 15],
        target: [halfW, halfL / 2, halfL],
      };

    case "corner":
      // CAM-01: opposite room corner at ceiling-0.5 ft, looking at opposite corner.
      // Place camera at corner (room.width, ceiling-0.5, room.length), look at origin (0, ceiling-0.5, 0).
      return {
        position: [room.width, H - 0.5, room.length],
        target: [0, H - 0.5, 0],
      };
  }
}
```

**Coordinate system note:** Existing `Scene` uses `position={[halfW + 15, 12, halfL + 15]}` and `gridHelper` at `position={[halfW, 0.01, halfL]}` — confirms X = floorplan x, Z = floorplan y, room origin at (0,0,0) and far corner at (width, *, length). My formulas align.

**Open Question for Planner:** "Eye-level looking toward room center" is mildly ambiguous — does Jessica stand at corner (0,0) or at room center? CAM-01 says "looking toward room center" which implies she's *not* at center (otherwise there's no direction). Above formula places her at corner (0, 5.5, 0) looking toward (halfW, 5.5, halfL). Reasonable, but flag for human-uat: Jessica may prefer eye-level *facing the longest wall* or *facing the door*. Not blocking; ship with corner approach + revisit in HUMAN-UAT.

---

## §3 Active-Preset State Placement

**Recommendation: new field in `uiStore`** — `activePreset: PresetId | null`.

**Why uiStore over Toolbar-local:**
1. `__getActivePreset()` test driver needs to read it from outside the React tree → trivial via `useUIStore.getState().activePreset`.
2. Toolbar reads it for highlight (already subscribes to uiStore for many fields — zero new pattern).
3. ThreeViewport reads it for `__applyCameraPreset` and could clear it on view-mode change.
4. Matches `cameraMode` precedent — both are view-state on the camera.
5. CAM-03 is satisfied: writing to uiStore never touches cadStore, never triggers `useAutoSave` (autosave only watches `rooms`/`activeRoomId`/`customElements`/`projectStore.activeName`).

### uiStore additions

```ts
// State
activePreset: PresetId | null;

// Actions
setActivePreset: (preset: PresetId | null) => void;

// Defaults
activePreset: null,
setActivePreset: (preset) => set({ activePreset: preset }),
```

`activePreset` is set the moment a preset is requested (before tween completes, so the highlight appears immediately). It's NOT cleared on manual orbit drag (D-02).

`PresetId` type lives in `src/three/cameraPresets.ts` and is imported into `uiStore.ts`. (Or co-locate in `src/types/cad.ts` alongside `ToolType` — **planner picks**.)

---

## §4 Hotkey Handler Wiring

### Integration point

Insert into `App.tsx` around line 158-161, just after the existing `'e' → toggleCameraMode` block. The existing `useEffect` already lists `viewMode` in deps, so no refactor needed.

### Guard chain (in order)

```ts
// 1/2/3/4 hotkeys — Phase 35 CAM-01
{
  const presetByKey: Record<string, PresetId> = {
    "1": "eye-level", "2": "top-down", "3": "three-quarter", "4": "corner",
  };
  const presetId = presetByKey[e.key];
  if (presetId) {
    // Guard 1 (CAM-01): activeElement guard already handled at top of handler
    //   (lines 133-137 reject INPUT/TEXTAREA/SELECT). Bare 1/2/3/4 inherits this.
    // Guard 2 (D-03): inert in 2D / library views
    if (viewMode !== "3d" && viewMode !== "split") return;
    // Guard 3 (D-01): inert in walk mode
    if (useUIStore.getState().cameraMode === "walk") return;
    // Guard 4: ignore modifier keys (Ctrl+1, Cmd+1 are browser tab switches)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Apply: set active preset + invoke driver
    useUIStore.getState().setActivePreset(presetId);
    const fn = (window as unknown as {
      __applyCameraPreset?: (id: PresetId) => void;
    }).__applyCameraPreset;
    fn?.(presetId);  // installed by ThreeViewport in test mode AND prod
    e.preventDefault();
    return;
  }
}
```

### Driver-vs-direct-call decision

The hotkey handler in `App.tsx` lives outside R3F. It can't directly access `orbitControlsRef`. Options:
- **Option A (recommended):** install `window.__applyCameraPreset` in production too (drop the `import.meta.env.MODE === "test"` gate for *this* driver), so the App-level handler can call it. The driver becomes a public API bridge — like `productTool.pendingProductId` per D-07 in CLAUDE.md.
- **Option B:** add a `pendingPresetRequest: { id, seq } | null` field to uiStore (mirror of `wallSideCameraTarget`), and a `useEffect` in `Scene` watches it. More state, more indirection, but no `window.*` runtime exposure.

**Recommendation: Option B.** Mirroring `wallSideCameraTarget`'s shape keeps presets in the established uiStore-driven pattern. The `__applyCameraPreset` test driver remains test-mode-only, calling the same internal function.

```ts
// uiStore additions
pendingPresetRequest: { id: PresetId; seq: number } | null;
requestPreset: (id: PresetId) => void;  // increments seq + sets activePreset
clearPendingPresetRequest: () => void;

// In ThreeViewport Scene:
const pendingPresetRequest = useUIStore((s) => s.pendingPresetRequest);
useEffect(() => {
  if (!pendingPresetRequest) return;
  applyPreset(pendingPresetRequest.id);  // the function from §1
  useUIStore.getState().clearPendingPresetRequest();
}, [pendingPresetRequest]);
```

The hotkey handler then just calls `useUIStore.getState().requestPreset(presetId)`. Toolbar buttons do the same. Test driver `__applyCameraPreset` calls `requestPreset` too (test driver becomes a thin shim).

### activeElement coverage check

Existing handler (App.tsx:133-137) rejects `HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement`. Verify these cover all relevant editable surfaces:
- `InlineEditableText` (Phase 33, document title, room name) — internally renders `<input>`. ✅
- PropertiesPanel inputs — `<input>`. ✅
- RoomSettings — `<input>`/`<select>`. ✅
- AddRoomDialog / TemplatePickerDialog — `<input>`. ✅
- AutoSave inputs (Phase 28-31) — `<input>`. ✅

**No contenteditable surfaces exist in this codebase.** Guard is sufficient.

---

## §5 Lucide Icon Picks

`lucide-react@1.8.0` is installed. Verified by listing `node_modules/lucide-react/dist/esm/icons/`:

| Preset | Suggested (D-07) | Verified in catalog | Alternatives in catalog | Recommended |
|--------|------------------|---------------------|-------------------------|-------------|
| Eye-level | `User` | ✅ `user.js` | `eye.js`, `person-standing.js`, `accessibility.js` | **`PersonStanding`** — clearer "human at standing height" semantic than `User` (which reads as "user account"). `Eye` is appealing but ambiguous (could mean visibility toggle). |
| Top-down | `Map` | ✅ `map.js` | `home.js` (less apt) | **`Map`** — perfect, plan-view semantic. |
| 3-quarter | `Box` | ✅ `box.js` | (no obvious alternative for "3D oblique cube") | **`Box`** — keep. |
| Corner | `CornerDownRight` | ✅ `corner-down-right.js` | `corner-up-left.js`, etc. | **`CornerDownRight`** — keep. |

**Open Question for Planner:** Final icon swap is purely aesthetic. Recommend Planner picks **`PersonStanding`** for eye-level (more legible as a person/human-height glyph than the `User` avatar circle). Easy to swap to `User` if it looks visually noisy in the toolbar cluster (PersonStanding has more vertical strokes).

### Import shape

```ts
import { PersonStanding, Map as MapIcon, Box, CornerDownRight } from "lucide-react";
```

Note: `Map` collides with the JS global `Map` constructor — alias to `MapIcon` to avoid shadowing in any context that uses Maps.

### Phase 33 D-33 compliance

All four are new chrome icons. None of the 8 allowlisted Material Symbols files need to change. Toolbar.tsx is one of those 8 — but D-33 only forbids *new* `material-symbols-outlined` imports, not *new components*; adding `lucide-react` icons inside Toolbar.tsx is explicitly allowed (and required).

---

## §6 Test Drivers

Clone `__setTestCamera` pattern. Both drivers go in `src/three/ThreeViewport.tsx` Scene component, in the same `useEffect` block as `__setTestCamera`.

### `__applyCameraPreset(presetId)`

```ts
useEffect(() => {
  if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
  (window as unknown as {
    __applyCameraPreset?: (presetId: PresetId) => void;
  }).__applyCameraPreset = (presetId) => {
    // Same code path as production: increment seq, set activePreset, fire useEffect → applyPreset()
    useUIStore.getState().requestPreset(presetId);
  };
  return () => {
    delete (window as unknown as { __applyCameraPreset?: unknown }).__applyCameraPreset;
  };
}, []);
```

### `__getActivePreset(): PresetId | null`

```ts
useEffect(() => {
  if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
  (window as unknown as {
    __getActivePreset?: () => PresetId | null;
  }).__getActivePreset = () => useUIStore.getState().activePreset;
  return () => {
    delete (window as unknown as { __getActivePreset?: unknown }).__getActivePreset;
  };
}, []);
```

### Playwright helper at `tests/e2e/playwright-helpers/applyCameraPreset.ts`

```ts
import type { Page } from "@playwright/test";
export type PresetId = "eye-level" | "top-down" | "three-quarter" | "corner";

export async function applyCameraPreset(page: Page, presetId: PresetId): Promise<void> {
  await page.evaluate((id: PresetId) => {
    const fn = (window as unknown as {
      __applyCameraPreset?: (id: PresetId) => void;
    }).__applyCameraPreset;
    if (!fn) throw new Error("__applyCameraPreset not installed — run with --mode test");
    fn(id);
  }, presetId);
}

export async function getActivePreset(page: Page): Promise<PresetId | null> {
  return page.evaluate(() => {
    const fn = (window as unknown as {
      __getActivePreset?: () => PresetId | null;
    }).__getActivePreset;
    if (!fn) throw new Error("__getActivePreset not installed");
    return fn();
  });
}
```

---

## §7 E2E Spec Outline

5 specs in `tests/e2e/specs/`:

### 1. `preset-toolbar-and-hotkeys.spec.ts` (CAM-01)

```
- Switch to 3D view
- For each presetId in ["eye-level","top-down","three-quarter","corner"]:
  - Click toolbar button by data-testid (`preset-${presetId}`)
  - await pageWait(700ms for tween)
  - assert getActivePreset(page) === presetId
  - assert toolbar button has class `bg-accent/20`
- Repeat with hotkeys "1"/"2"/"3"/"4" (page.keyboard.press)
- Snapshot final 3D canvas image (optional — pixel-baseline guard)
```

### 2. `preset-active-element-guard.spec.ts` (CAM-01 acceptance)

```
- Switch to 3D view
- Apply preset "1" → verify activePreset === "eye-level"
- Click into RoomSettings width input (focus the <input>)
- press("3")
- assert getActivePreset(page) === "eye-level" (NOT switched to three-quarter)
- assert input value contains "3" (the keystroke went to the input as expected)
- Click outside input
- press("3")
- assert getActivePreset(page) === "three-quarter"
```

### 3. `preset-mid-tween-cancel.spec.ts` (CAM-02)

```
- Switch to 3D view, apply "top-down", wait for settle
- Apply "eye-level" via __applyCameraPreset
- After 200ms (mid-tween), apply "corner"
- Wait 800ms (full tween + slack)
- Read camera position via __getCameraPose driver (need a tiny new getter helper)
- assert pose.position ≈ corner-preset position (within 0.1ft per-axis tolerance)
- assert getActivePreset(page) === "corner"
- assert no console errors / unhandled rejections during the test
```

(The new `__getCameraPose()` helper is trivial — read `orbitControlsRef.current.object.position` and `.target`. Phase 36's harness has similar helpers; planner should add it.)

### 4. `preset-view-mode-cleanup.spec.ts` (CAM-02)

```
- Switch to 3D view, apply "eye-level"
- After 100ms (mid-tween), click "2D plan" tab
- await 800ms
- assert no console errors and no unhandled rejections
- Click "3D view" tab
- assert canvas mounts cleanly, no error overlay
```

### 5. `preset-no-history-no-autosave.spec.ts` (CAM-03)

```
- Mount with seeded project so canvas is shown immediately
- Capture pastLen0 = useCADStore.past.length
- Wait for `saved` status
- Loop 10 times: random preset hotkey (1-4), wait 50ms
- After all 10 + 800ms settle:
  - assert useCADStore.past.length === pastLen0 (no growth)
  - assert useProjectStore.saveStatus has NOT entered "saving" since the loop began
    (use a small spy installed via window.__saveStatusEvents in test mode)
```

(The `__saveStatusEvents` ringbuffer is a tiny addition — collect status transitions during loop. If too much for this phase, planner can replace with a poll-based assertion: assert `saveStatus` never read as "saving" across 30 polls during the loop.)

---

## §8 Unit Tests for `cameraPresets.ts`

Vitest spec at `src/three/cameraPresets.test.ts`:

1. **`getPresetPose("three-quarter", {width:20, length:16, wallHeight:8})` returns literal v1.7.5 baseline** — exact match `position=[25, 12, 24]`, `target=[10, 8, 16]`. Guards D-05 against accidental refactor.
2. **`getPresetPose("eye-level", room)` Y-component is exactly 5.5** for any room dimensions.
3. **`getPresetPose("top-down", room).position[1]` equals `1.5 * max(width, length)`** — table-test with `[20,16]`, `[16,20]`, `[40,40]`.
4. **`getPresetPose("top-down", room).target[1]` is 0** (looking straight down).
5. **`getPresetPose("corner", room).position` is room far corner, Y = `wallHeight - 0.5`** — assert `[width, H-0.5, length]`. **`.target` is `[0, H-0.5, 0]`** (opposite corner at same height).
6. **All 4 preset IDs are exhaustively handled** — for each ID in `PRESET_IDS`, `getPresetPose(id, room)` does not throw and returns a pose with finite numbers.

---

## §9 Risks / Pitfalls

### Risk 1: View mode lives in App.tsx local state, not uiStore
**Status:** No refactor needed. The hotkey handler `useEffect` at line 124 already lists `viewMode` in deps (line 249). Reading `viewMode` from the closure works.
**Recommendation:** Keep view mode in App.tsx. The Toolbar already receives it as a prop for the camera-mode toggle conditional render — same prop drilling extends to preset cluster.

### Risk 2: OrbitControls damping toggle — prop vs imperative
**Recommendation:** **Imperative.** The existing code already mutates the ref imperatively (`orbitPosRef.current = ...` in `onChange`). Setting `ctrl.enableDamping = false` at tween start and `= true` on settle avoids a React re-render and matches the existing pattern.

### Risk 3: `useFrame` runs only inside `<Canvas>`. Tween state must live in `Scene`.
**Recommendation:** `presetTween` ref is a `useRef` inside `Scene`. The `requestPreset` action lives in uiStore (outside React); `Scene` watches `pendingPresetRequest` via `useEffect` and translates it into `presetTween.current = ...`. Communication is one-directional and idempotent.

### Risk 4: Tween snap when room dimensions change mid-tween
**Scenario:** User triggers preset, then immediately edits room.width (via RoomSettings) — but they can't (activeElement guard prevents hotkeys; click-driven preset start would have completed the input blur). Still: if room dims change during a tween, the `to` pose computed at start-time becomes stale.
**Recommendation:** Acceptable — the tween completes to its frozen `to` pose, and the next preset application uses fresh dimensions. No need to recompute mid-flight. **Add to HUMAN-UAT** as a known minor.

### Risk 5: Walk-mode entry mid-tween
**Scenario:** User taps `e` (walk mode) while a preset tween is in progress. ThreeViewport's `cameraMode === "orbit"` branch unmounts; `<PointerLockControls>` mounts. `presetTween.current` is still set but `useFrame` reads `orbitControlsRef.current` which is now null → guarded `if (!ctrl?.object) return` short-circuits. On re-entering orbit mode, the existing D-09 effect restores `orbitPosRef.current` (which is still the *pre-tween* position because the tween never settled to update it).
**Recommendation:** Add explicit cleanup — when `cameraMode` changes to `"walk"`, clear `presetTween.current`. Existing D-09 useEffect already runs on `cameraMode` change; piggyback there.

```ts
useEffect(() => {
  if (cameraMode !== "orbit") {
    presetTween.current = null;
    // also re-enable damping in case we left it false
    if (orbitControlsRef.current) orbitControlsRef.current.enableDamping = true;
    return;
  }
  // existing D-09 restore logic ...
}, [cameraMode]);
```

### Risk 6: View-mode unmount cleanup paranoia
**Scenario:** User switches 3D → 2D mid-tween. The whole `<Canvas>` unmounts. `presetTween.current` is GC'd with the component. **No throw possible** unless a stale closure tries to call `ctrl.update()` — but `useFrame` only runs while mounted, so no closure leaks.
**Recommendation:** Spec the test (§7 spec 4) but no proactive guard needed beyond the unmount-cleanup `useEffect` shown in §1.

### Risk 7: `PRESET_IDS` enum drift
**Scenario:** Adding a new preset later (e.g., "side-elevation") requires updating: `cameraPresets.ts`, uiStore type, hotkey-key map, Toolbar buttons, e2e specs.
**Recommendation:** Centralize all of this in `cameraPresets.ts`:
```ts
export const PRESETS: { id: PresetId; key: string; label: string; iconName: string }[] = [
  { id: "eye-level", key: "1", label: "Eye level", iconName: "PersonStanding" },
  { id: "top-down", key: "2", label: "Top down", iconName: "Map" },
  { id: "three-quarter", key: "3", label: "3/4 view", iconName: "Box" },
  { id: "corner", key: "4", label: "Corner", iconName: "CornerDownRight" },
];
```
Toolbar imports + maps over this list. Hotkey handler uses `PRESETS.find(p => p.key === e.key)`. Single source of truth.

### Risk 8: Active-preset clearing on view-mode change
**Open Question for Planner:** When viewMode flips 3D → 2D, should `activePreset` clear, or persist for re-entry? D-02 says "stays until different preset applied." View-mode change isn't another preset → it should persist. But CAM-02 also says the *tween* should clear cleanly. **Recommendation:** Clear `presetTween.current` on view-mode unmount; KEEP `activePreset` in uiStore so the indicator remains correct on re-entry.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (unit) + Playwright 1.59.1 (e2e) |
| Config file | `vite.config.ts` (Vitest piggybacks) + `playwright.config.ts` |
| Quick run command | `npm run test:quick` (vitest dot reporter) |
| Full suite command | `npm test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| CAM-01 | preset poses are correct | unit | `npx vitest run src/three/cameraPresets.test.ts` | ❌ Wave 0 |
| CAM-01 | toolbar buttons + hotkeys apply preset; active-element guard | e2e | `npx playwright test tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts tests/e2e/specs/preset-active-element-guard.spec.ts` | ❌ Wave 0 |
| CAM-02 | mid-tween cancel-and-restart | e2e | `npx playwright test tests/e2e/specs/preset-mid-tween-cancel.spec.ts` | ❌ Wave 0 |
| CAM-02 | view-mode-change cleanup | e2e | `npx playwright test tests/e2e/specs/preset-view-mode-cleanup.spec.ts` | ❌ Wave 0 |
| CAM-03 | no history pollution; no autosave | e2e | `npx playwright test tests/e2e/specs/preset-no-history-no-autosave.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:quick` (~5s, all unit tests including new cameraPresets.test.ts)
- **Per wave merge:** `npm test && npm run test:e2e` (full vitest + playwright)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/three/cameraPresets.ts` — new module (production code, but pose math is the foundation for all unit tests)
- [ ] `src/three/cameraPresets.test.ts` — covers CAM-01 pose correctness
- [ ] `tests/e2e/playwright-helpers/applyCameraPreset.ts` — driver shim
- [ ] `tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts` — CAM-01
- [ ] `tests/e2e/specs/preset-active-element-guard.spec.ts` — CAM-01
- [ ] `tests/e2e/specs/preset-mid-tween-cancel.spec.ts` — CAM-02
- [ ] `tests/e2e/specs/preset-view-mode-cleanup.spec.ts` — CAM-02
- [ ] `tests/e2e/specs/preset-no-history-no-autosave.spec.ts` — CAM-03

No framework install needed — vitest + playwright already present.

---

## Sources

### Primary (HIGH confidence, in-codebase)
- `src/three/ThreeViewport.tsx:83-170` — existing `cameraAnimTarget` lerp + OrbitControls setup + `__setTestCamera` driver pattern
- `src/stores/uiStore.ts:1-152` — `cameraMode`, `wallSideCameraTarget`, `clearWallSideCameraTarget` patterns to mirror
- `src/components/Toolbar.tsx:88-106` — camera-mode toggle (right of which the new cluster goes)
- `src/App.tsx:124-249` — keydown handler + viewMode dep array
- `src/hooks/useReducedMotion.ts` — Phase 33 D-39 hook
- `tests/e2e/playwright-helpers/setTestCamera.ts` — driver convention to clone
- `node_modules/lucide-react@1.8.0/dist/esm/icons/` — verified availability of `user.js`, `map.js`, `box.js`, `corner-down-right.js`, `person-standing.js`, `eye.js`, `accessibility.js`
- `.planning/REQUIREMENTS.md` lines 42-61 — CAM-01/02/03 acceptance criteria
- `.planning/ROADMAP.md` Phase 35 — success criteria (lines 154-166)

### Secondary (HIGH confidence, project-doc)
- `CLAUDE.md` Phase 33 D-33/D-34/D-39 — design system constraints
- `CLAUDE.md` Phase 31 — `window.__drive*` test driver convention

### Tertiary (none required)
No external library questions — all decisions backed by in-codebase precedent.

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new libraries; lucide-react already pinned and verified
- Architecture: HIGH — all patterns exist in codebase (uiStore field, useFrame ref-based animation, test driver via window.__xxx)
- Pitfalls: HIGH — risks 1-8 grounded in actual existing code, not speculation

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days; codebase may evolve but underlying R3F + lucide pins are stable)
