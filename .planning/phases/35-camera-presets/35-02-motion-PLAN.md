---
phase: 35-camera-presets
plan: 02
type: execute
wave: 2
depends_on: [35-01]
requirements: [CAM-02, CAM-03]
requirements_addressed: [CAM-02, CAM-03]
files_modified:
  - src/three/ThreeViewport.tsx
  - src/stores/cadStore.ts
  - tests/e2e/playwright-helpers/applyCameraPreset.ts
  - tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts
  - tests/e2e/specs/preset-active-element-guard.spec.ts
  - tests/e2e/specs/preset-mid-tween-cancel.spec.ts
  - tests/e2e/specs/preset-view-mode-cleanup.spec.ts
  - tests/e2e/specs/preset-no-history-no-autosave.spec.ts
autonomous: true

must_haves:
  truths:
    - "Preset requests from uiStore.pendingPresetRequest trigger a ~600ms easeInOutCubic tween of camera position + target (CAM-02)"
    - "OrbitControls damping is set to false imperatively (ctrl.enableDamping = false) at tween start and restored to true on settle (CAM-02)"
    - "Mid-tween preset requests cancel the in-flight tween and restart from the CURRENT camera pose (not the previous tween's toPos) — no jumps, no stranded cameras (CAM-02)"
    - "useReducedMotion() === true → presets snap instantly with no tween (D-04 + CAM-02 motion guard + Phase 33 D-39)"
    - "View-mode change from 3D → 2D during a tween clears presetTween.current without throwing (CAM-02 cleanup)"
    - "cameraMode flip orbit → walk during a tween clears presetTween.current AND restores enableDamping=true (Risk 5)"
    - "Preset switches never push to cadStore history — useCADStore.getState().past.length unchanged across 10 preset switches (CAM-03)"
    - "Preset switches never trigger useAutoSave — save status does not flip idle/saved → saving during a 10-switch loop (CAM-03)"
    - "window.__applyCameraPreset(presetId) and window.__getActivePreset() test drivers installed in Scene, gated by import.meta.env.MODE === 'test' (Phase 31 convention)"
    - "window.__getCameraPose() helper returns { position, target } read from orbitControlsRef for mid-tween cancel spec (Research §7 spec 3)"
    - "5 Playwright e2e specs map 1:1 to Research §7 outline — all green post-implementation"
    - "Existing cameraAnimTarget wall-side lerp path unchanged (Research §1 — mutually exclusive from new presetTween)"
  artifacts:
    - path: "src/three/ThreeViewport.tsx"
      provides: "presetTween useRef + useFrame branch + easeInOutCubic + useEffect consumer of pendingPresetRequest + damping toggle + cameraMode-change cleanup + view-mode unmount cleanup + reduced-motion snap + __applyCameraPreset/__getActivePreset/__getCameraPose test drivers"
      contains: "presetTween"
    - path: "tests/e2e/playwright-helpers/applyCameraPreset.ts"
      provides: "Playwright helpers applyCameraPreset + getActivePreset + getCameraPose"
      contains: "applyCameraPreset"
    - path: "tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts"
      provides: "CAM-01 e2e: per-preset toolbar click + hotkey round-trip; asserts activePreset + bg-accent/20 class"
      contains: "preset-eye-level"
    - path: "tests/e2e/specs/preset-active-element-guard.spec.ts"
      provides: "CAM-01 acceptance e2e: hotkey inert when activeElement is an <input>"
      contains: "activeElement"
    - path: "tests/e2e/specs/preset-mid-tween-cancel.spec.ts"
      provides: "CAM-02 e2e: mid-tween preset switch ends at latest-requested pose, no errors"
      contains: "mid-tween"
    - path: "tests/e2e/specs/preset-view-mode-cleanup.spec.ts"
      provides: "CAM-02 e2e: 3D→2D mid-tween does not throw; re-entry mounts cleanly"
      contains: "view-mode"
    - path: "tests/e2e/specs/preset-no-history-no-autosave.spec.ts"
      provides: "CAM-03 e2e: 10-switch loop, past.length unchanged, saveStatus never 'saving'"
      contains: "past.length"
  key_links:
    - from: "src/three/ThreeViewport.tsx (Scene useEffect watcher)"
      to: "useUIStore.pendingPresetRequest"
      via: "useUIStore subscription + useEffect([pendingPresetRequest])"
      pattern: "pendingPresetRequest"
    - from: "src/three/ThreeViewport.tsx (Scene useFrame)"
      to: "orbitControlsRef.current.object.position + .target"
      via: "lerpVectors(fromPos, toPos, easeInOutCubic(t)) per frame"
      pattern: "lerpVectors"
    - from: "src/three/ThreeViewport.tsx (cameraMode useEffect)"
      to: "presetTween.current + ctrl.enableDamping"
      via: "cleanup on cameraMode !== 'orbit' (Risk 5)"
      pattern: "presetTween.current = null"
    - from: "tests/e2e/specs/*.spec.ts"
      to: "window.__applyCameraPreset + window.__getActivePreset + window.__getCameraPose"
      via: "page.evaluate bridge helpers in applyCameraPreset.ts"
      pattern: "__applyCameraPreset"
    - from: "tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts"
      to: "Toolbar data-testid={'preset-${id}'}"
      via: "page.click selector"
      pattern: "preset-eye-level"
---

<objective>
Land the "motion" half of Phase 35: the time-based ~600ms easeInOutCubic tween engine in ThreeViewport.tsx, damping toggle, cancel-and-restart via live-camera-capture, reduced-motion snap, view-mode + walk-mode cleanup, the `__applyCameraPreset`/`__getActivePreset`/`__getCameraPose` test drivers, and 5 Playwright e2e specs covering CAM-01 / CAM-02 / CAM-03.

Purpose: Close CAM-02 (smooth tween + cancel-and-restart + cleanup) and CAM-03 (no undo pollution, no autosave trigger). Ship the 5 e2e specs that are the acceptance contract for Phase 35 HUMAN-UAT.

Output: Extended ThreeViewport.tsx (single file in `src/` this plan modifies), new Playwright helper file, 5 new spec files. All specs green. HUMAN-UAT.md flags the known minor (room-dim change mid-tween, Risk 4) + the eye-level corner-stand framing question.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/35-camera-presets/35-CONTEXT.md
@.planning/phases/35-camera-presets/35-RESEARCH.md
@.planning/phases/35-camera-presets/35-01-SUMMARY.md
@src/three/ThreeViewport.tsx
@src/three/cameraPresets.ts
@src/stores/uiStore.ts
@src/hooks/useReducedMotion.ts
@tests/e2e/playwright-helpers/setTestCamera.ts
@playwright.config.ts

<interfaces>
<!-- Signatures + shapes. Plan 35-01's uiStore bridge + cameraPresets module + Toolbar data-testid attributes are the consumption surface. -->

```typescript
// src/three/ThreeViewport.tsx — Scene component internals (NEW, added inside existing Scene fn)

import { getPresetPose, type PresetId } from "@/three/cameraPresets";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type PresetTween = {
  fromPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toPos: THREE.Vector3;
  toTarget: THREE.Vector3;
  startMs: number;
  durationMs: number;       // 600
  presetId: PresetId;
};

const presetTween = useRef<PresetTween | null>(null);

// Internal, non-exported:
function easeInOutCubic(t: number): number; // Research §1 formula — verbatim
function startPresetTween(presetId: PresetId): void; // captures from live camera, sets presetTween.current, disables damping
function applyPresetInstant(presetId: PresetId): void; // reduced-motion + snap path
```

```typescript
// tests/e2e/playwright-helpers/applyCameraPreset.ts — NEW FILE

import type { Page } from "@playwright/test";
import type { PresetId } from "../../../src/three/cameraPresets";

export async function applyCameraPreset(page: Page, presetId: PresetId): Promise<void>;
export async function getActivePreset(page: Page): Promise<PresetId | null>;
export async function getCameraPose(page: Page): Promise<{
  position: [number, number, number];
  target: [number, number, number];
}>;
```

```typescript
// Window-level test drivers installed in Scene (new in this plan)
window.__applyCameraPreset?: (presetId: PresetId) => void;
window.__getActivePreset?: () => PresetId | null;
window.__getCameraPose?: () => { position: [number,number,number]; target: [number,number,number] } | null;
// All three gated on `import.meta.env.MODE === "test"` + installed/cleaned in useEffect (Phase 31 convention)
// Phase 36 Plan 01 already installed __setTestCamera at ThreeViewport.tsx:87-110 — this plan adds 3 siblings in the same pattern.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Install tween engine + damping toggle + cancel-and-restart + reduced-motion snap + cleanup hooks + test drivers in ThreeViewport.tsx</name>
  <files>src/three/ThreeViewport.tsx</files>
  <read_first>
    - src/three/ThreeViewport.tsx (full) — in particular:
      - lines 40-110: existing Scene component + useUIStore subscriptions + orbitPosRef/orbitTargetRef + orbitControlsRef + `__setTestCamera` driver (Phase 36 Plan 01 — identical install/cleanup pattern to clone)
      - lines 112-123: existing cameraAnimTarget wall-side lerp (DO NOT MODIFY — Research §1 says coexist, not replace)
      - lines 125-148: existing MIC-35 wallSideCameraTarget useEffect (do not touch)
      - lines 150-170: existing useFrame body (wall-side branch only — extend with mutually-exclusive preset branch)
      - lines 116-123: existing cameraMode useEffect (Risk 5 says piggyback this to clear presetTween + restore damping)
    - src/three/cameraPresets.ts (Plan 35-01 — import PresetId, getPresetPose)
    - src/stores/uiStore.ts (Plan 35-01 — subscribe to pendingPresetRequest + clearPendingPresetRequest)
    - src/hooks/useReducedMotion.ts (shared hook — D-04)
    - .planning/phases/35-camera-presets/35-RESEARCH.md §1 (tween mechanism, easeInOutCubic, startPresetTween code sketch, useFrame body sketch, cancel-and-restart rationale), §6 (test drivers — clone __setTestCamera pattern exactly), §9 Risk 5 (walk-mode cleanup), §9 Risk 6 (view-mode unmount)
    - .planning/phases/35-camera-presets/35-CONTEXT.md §D-01 §D-02 §D-04
  </read_first>
  <action>
    All additions stay inside the existing `Scene` function component. The existing `cameraAnimTarget` wall-side branch is preserved byte-for-byte — the new preset branch is mutually exclusive (only one runs per frame).

    **1. Add imports at top of ThreeViewport.tsx** (alongside existing three/drei imports):
    ```typescript
    import { getPresetPose, type PresetId } from "@/three/cameraPresets";
    import { useReducedMotion } from "@/hooks/useReducedMotion";
    ```

    **2. Inside `Scene()` — add subscriptions + refs** (near existing `wallSideCameraTarget` subscription at line 52):
    ```typescript
    const pendingPresetRequest = useUIStore((s) => s.pendingPresetRequest);
    const prefersReducedMotion = useReducedMotion();
    const presetTween = useRef<null | {
      fromPos: THREE.Vector3;
      fromTarget: THREE.Vector3;
      toPos: THREE.Vector3;
      toTarget: THREE.Vector3;
      startMs: number;
      durationMs: number;
      presetId: PresetId;
    }>(null);
    ```

    **3. Add easing function** (module-level, above Scene — or as a local `const` inside Scene. Module-level is cleaner):
    ```typescript
    function easeInOutCubic(t: number): number {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    ```

    **4. Add preset-apply functions** inside Scene (above the return statement):
    ```typescript
    const startPresetTween = (presetId: PresetId) => {
      const ctrl = orbitControlsRef.current;
      if (!ctrl?.object) return;
      const cam = ctrl.object as THREE.Camera;
      // LIVE capture — Research §1 cancel-and-restart guarantee.
      const fromPos = cam.position.clone();
      const fromTarget = ctrl.target.clone();
      const pose = getPresetPose(presetId, room);
      const toPos = new THREE.Vector3(...pose.position);
      const toTarget = new THREE.Vector3(...pose.target);
      ctrl.enableDamping = false; // imperative per Research §1 Damping Toggle Technique
      presetTween.current = {
        fromPos, fromTarget, toPos, toTarget,
        startMs: performance.now(),
        durationMs: 600,
        presetId,
      };
    };

    const applyPresetInstant = (presetId: PresetId) => {
      // D-04: reduced-motion snap path
      const ctrl = orbitControlsRef.current;
      if (!ctrl?.object) return;
      const cam = ctrl.object as THREE.Camera;
      const pose = getPresetPose(presetId, room);
      cam.position.set(pose.position[0], pose.position[1], pose.position[2]);
      ctrl.target.set(pose.target[0], pose.target[1], pose.target[2]);
      ctrl.update();
      orbitPosRef.current = pose.position;
      orbitTargetRef.current = pose.target;
      presetTween.current = null;
      ctrl.enableDamping = true; // ensure we don't leave it disabled
    };
    ```

    **5. Add request-consumer useEffect** (after the existing wallSideCameraTarget useEffect at line 148):
    ```typescript
    // Phase 35 CAM-02: translate uiStore pendingPresetRequest into a tween.
    // Scene is re-entered per view-mode change, so state lives in the ref.
    useEffect(() => {
      if (!pendingPresetRequest) return;
      // D-01 + D-03 guards are applied UPSTREAM (App.tsx hotkey + Toolbar disabled state).
      // Extra safety: if somehow a request arrives while in walk mode, no-op.
      if (cameraMode === "walk") {
        useUIStore.getState().clearPendingPresetRequest();
        return;
      }
      if (prefersReducedMotion) {
        applyPresetInstant(pendingPresetRequest.id);
      } else {
        startPresetTween(pendingPresetRequest.id);
      }
      useUIStore.getState().clearPendingPresetRequest();
    }, [pendingPresetRequest, cameraMode, prefersReducedMotion]);
    ```

    **6. Extend existing `useFrame` body** (currently at ~line 151 — wall-side-only). ADD a preset-tween branch AFTER the existing wall-side branch. Both branches are guarded and mutually exclusive (only one tween runs per frame):
    ```typescript
    useFrame(() => {
      // --- existing wall-side branch (unchanged) ---
      if (cameraAnimTarget.current) {
        // ... existing body ...
        return; // (only if it wasn't already returning; preserve current behavior)
      }

      // --- NEW: preset-tween branch ---
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
        cam.position.copy(t.toPos);
        ctrl.target.copy(t.toTarget);
        ctrl.update();
        orbitPosRef.current = [t.toPos.x, t.toPos.y, t.toPos.z];
        orbitTargetRef.current = [t.toTarget.x, t.toTarget.y, t.toTarget.z];
        ctrl.enableDamping = true;
        presetTween.current = null;
      }
    });
    ```
    CRITICAL: If the existing wall-side useFrame body does NOT return early, restructure so the preset branch only runs when `cameraAnimTarget.current === null`. Match existing pattern.

    **7. Piggyback cameraMode useEffect** (Risk 5 — existing useEffect at lines 116-123 restores orbit pos on re-entry):
    ```typescript
    useEffect(() => {
      if (cameraMode !== "orbit") {
        // Risk 5: tear down any in-flight preset tween on walk-mode entry.
        presetTween.current = null;
        const ctrl = orbitControlsRef.current;
        if (ctrl) ctrl.enableDamping = true; // restore in case tween left it off
        return;
      }
      // --- existing D-09 restore logic (unchanged) ---
      const ctrl = orbitControlsRef.current;
      if (!ctrl?.object) return;
      const [x, y, z] = orbitPosRef.current;
      ctrl.object.position.set(x, y, z);
      ctrl.update();
    }, [cameraMode]);
    ```

    **8. Add unmount-safety useEffect** (Risk 6 — belt-and-suspenders; `Scene` unmounts when viewMode flips 3D → 2D):
    ```typescript
    useEffect(() => {
      return () => {
        presetTween.current = null;
      };
    }, []);
    ```

    **9. Install 3 new test drivers** — clone the `__setTestCamera` install/cleanup pattern at lines 87-110. All gated by `import.meta.env.MODE === "test"`:
    ```typescript
    useEffect(() => {
      if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
      (window as unknown as {
        __applyCameraPreset?: (presetId: PresetId) => void;
      }).__applyCameraPreset = (presetId) => {
        // Test driver is a thin shim over the production code path (Research §6 Recommendation B).
        useUIStore.getState().requestPreset(presetId);
      };
      return () => {
        delete (window as unknown as { __applyCameraPreset?: unknown }).__applyCameraPreset;
      };
    }, []);

    useEffect(() => {
      if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
      (window as unknown as {
        __getActivePreset?: () => PresetId | null;
      }).__getActivePreset = () => useUIStore.getState().activePreset;
      return () => {
        delete (window as unknown as { __getActivePreset?: unknown }).__getActivePreset;
      };
    }, []);

    useEffect(() => {
      if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
      (window as unknown as {
        __getCameraPose?: () => {
          position: [number, number, number];
          target: [number, number, number];
        } | null;
      }).__getCameraPose = () => {
        const ctrl = orbitControlsRef.current;
        if (!ctrl?.object) return null;
        const cam = ctrl.object as THREE.Camera;
        return {
          position: [cam.position.x, cam.position.y, cam.position.z],
          target: [ctrl.target.x, ctrl.target.y, ctrl.target.z],
        };
      };
      return () => {
        delete (window as unknown as { __getCameraPose?: unknown }).__getCameraPose;
      };
    }, []);
    ```

    **10. Run `npm test -- --run`** — all existing vitest tests green. No regression.
    **Run `npx tsc --noEmit`** — exits 0.
  </action>
  <verify>
    <automated>grep -q 'function easeInOutCubic' src/three/ThreeViewport.tsx && grep -q 'presetTween = useRef' src/three/ThreeViewport.tsx && grep -q 'startPresetTween' src/three/ThreeViewport.tsx && grep -q 'applyPresetInstant' src/three/ThreeViewport.tsx && grep -q 'ctrl.enableDamping = false' src/three/ThreeViewport.tsx && grep -q 'ctrl.enableDamping = true' src/three/ThreeViewport.tsx && grep -q 'lerpVectors' src/three/ThreeViewport.tsx && grep -q 'pendingPresetRequest' src/three/ThreeViewport.tsx && grep -q 'clearPendingPresetRequest' src/three/ThreeViewport.tsx && grep -q 'useReducedMotion' src/three/ThreeViewport.tsx && grep -q '__applyCameraPreset' src/three/ThreeViewport.tsx && grep -q '__getActivePreset' src/three/ThreeViewport.tsx && grep -q '__getCameraPose' src/three/ThreeViewport.tsx && npx tsc --noEmit 2>&1 | tee /tmp/p35-02-t1.log; ! grep -q 'error TS' /tmp/p35-02-t1.log && npm test -- --run 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q 'function easeInOutCubic' src/three/ThreeViewport.tsx` (easing curve present)
    - `grep -q 'presetTween = useRef' src/three/ThreeViewport.tsx` (tween state is a ref, not state — avoids re-renders)
    - `grep -q 'durationMs: 600' src/three/ThreeViewport.tsx` (CAM-02 tween duration)
    - `grep -q 'ctrl.enableDamping = false' src/three/ThreeViewport.tsx` AND `grep -q 'ctrl.enableDamping = true' src/three/ThreeViewport.tsx` (damping toggle)
    - `grep -q 'lerpVectors(t.fromPos, t.toPos, eased)' src/three/ThreeViewport.tsx` (tween body)
    - `grep -q 'pendingPresetRequest' src/three/ThreeViewport.tsx` (consumer useEffect)
    - `grep -q 'useReducedMotion' src/three/ThreeViewport.tsx` (D-04 branch)
    - `grep -q '__applyCameraPreset' src/three/ThreeViewport.tsx` AND `grep -q '__getActivePreset' src/three/ThreeViewport.tsx` AND `grep -q '__getCameraPose' src/three/ThreeViewport.tsx` (3 new drivers)
    - Existing `cameraAnimTarget` wall-side lerp code path still present (Research §1 coexist — grep finds `cameraAnimTarget.current` in unchanged form)
    - Existing `__setTestCamera` driver from Phase 36 Plan 01 still present (grep finds it)
    - `npx tsc --noEmit` exits 0
    - `npm test -- --run` exits 0 (no unit regression — this plan is React-lifecycle work verified in e2e, not vitest)
  </acceptance_criteria>
  <done>Tween engine in place. Preset requests from Plan 35-01's uiStore bridge now produce a ~600ms eased camera glide. Damping toggled imperatively. Mid-tween cancel-and-restart works via live-camera capture. Reduced-motion snaps instantly. View-mode unmount + walk-mode entry both clean up. 3 new test drivers installed siblings to existing __setTestCamera. Wall-side lerp path unchanged — mutually exclusive with new preset branch.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create Playwright helper module (applyCameraPreset + getActivePreset + getCameraPose)</name>
  <files>tests/e2e/playwright-helpers/applyCameraPreset.ts</files>
  <read_first>
    - tests/e2e/playwright-helpers/setTestCamera.ts (Phase 36 Plan 01 — clone helper SHAPE exactly)
    - src/three/cameraPresets.ts (Plan 35-01 — import PresetId)
    - .planning/phases/35-camera-presets/35-RESEARCH.md §6 (Playwright helper at tests/e2e/playwright-helpers/applyCameraPreset.ts — verbatim shape)
  </read_first>
  <action>
    Create `tests/e2e/playwright-helpers/applyCameraPreset.ts` exactly following the shape in Research §6 (with getCameraPose added):

    ```typescript
    import type { Page } from "@playwright/test";
    import type { PresetId } from "../../../src/three/cameraPresets";

    /** Fire a preset request via the test-mode-only window.__applyCameraPreset driver.
     *  Production code path: same as clicking a Toolbar preset button — goes through
     *  useUIStore.requestPreset(). The driver is a thin shim (Research §4 Option B). */
    export async function applyCameraPreset(page: Page, presetId: PresetId): Promise<void> {
      await page.evaluate((id: PresetId) => {
        const fn = (window as unknown as {
          __applyCameraPreset?: (id: PresetId) => void;
        }).__applyCameraPreset;
        if (!fn) {
          throw new Error(
            "__applyCameraPreset not installed — ensure Playwright webServer runs with `--mode test`",
          );
        }
        fn(id);
      }, presetId);
    }

    /** Read uiStore.activePreset without going through React subscription. */
    export async function getActivePreset(page: Page): Promise<PresetId | null> {
      return await page.evaluate(() => {
        const fn = (window as unknown as {
          __getActivePreset?: () => PresetId | null;
        }).__getActivePreset;
        if (!fn) throw new Error("__getActivePreset not installed");
        return fn();
      });
    }

    /** Read the live camera pose from orbitControlsRef. Used by mid-tween-cancel spec. */
    export async function getCameraPose(page: Page): Promise<{
      position: [number, number, number];
      target: [number, number, number];
    }> {
      const pose = await page.evaluate(() => {
        const fn = (window as unknown as {
          __getCameraPose?: () =>
            | { position: [number, number, number]; target: [number, number, number] }
            | null;
        }).__getCameraPose;
        if (!fn) throw new Error("__getCameraPose not installed");
        return fn();
      });
      if (!pose) throw new Error("getCameraPose: orbitControlsRef not ready");
      return pose;
    }
    ```

    Verify the file compiles under Playwright's TS config (Playwright auto-detects via ts-node).
  </action>
  <verify>
    <automated>test -f tests/e2e/playwright-helpers/applyCameraPreset.ts && grep -q 'export async function applyCameraPreset' tests/e2e/playwright-helpers/applyCameraPreset.ts && grep -q 'export async function getActivePreset' tests/e2e/playwright-helpers/applyCameraPreset.ts && grep -q 'export async function getCameraPose' tests/e2e/playwright-helpers/applyCameraPreset.ts && grep -q 'PresetId' tests/e2e/playwright-helpers/applyCameraPreset.ts</automated>
  </verify>
  <acceptance_criteria>
    - File exists: `tests/e2e/playwright-helpers/applyCameraPreset.ts`
    - Exports 3 functions: `applyCameraPreset`, `getActivePreset`, `getCameraPose`
    - `getCameraPose` throws with a clear message if the driver is missing (helps debugging `--mode test` mistakes)
    - Imports `PresetId` from `../../../src/three/cameraPresets` (relative path matches repo layout)
  </acceptance_criteria>
  <done>Playwright helpers ready for the 5 spec files.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Write 5 Playwright e2e specs (CAM-01 + CAM-02 + CAM-03 coverage)</name>
  <files>tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts, tests/e2e/specs/preset-active-element-guard.spec.ts, tests/e2e/specs/preset-mid-tween-cancel.spec.ts, tests/e2e/specs/preset-view-mode-cleanup.spec.ts, tests/e2e/specs/preset-no-history-no-autosave.spec.ts</files>
  <read_first>
    - .planning/phases/35-camera-presets/35-RESEARCH.md §7 (E2E Spec Outline — all 5 specs described with action lists)
    - tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts (Phase 36 — existing structure + webServer pattern to match)
    - tests/e2e/playwright-helpers/toggleViewMode.ts (Phase 36 — reuse for view-mode switches)
    - tests/e2e/playwright-helpers/settle.ts (Phase 36 — reuse for 2× rAF settle)
    - tests/e2e/playwright-helpers/applyCameraPreset.ts (Task 2 above)
    - playwright.config.ts (confirm chromium-dev project is the one that runs)
    - src/components/Toolbar.tsx (Plan 35-01 — confirm data-testid values: preset-eye-level, preset-top-down, preset-three-quarter, preset-corner)
  </read_first>
  <action>
    All specs live under `tests/e2e/specs/` and run under `chromium-dev` project. Each spec's first step is `toggleViewMode(page, "3d")`; each spec ends with assertions — no console errors or unhandled rejections allowed (use Playwright's `page.on("pageerror")` listener).

    **Spec 1: `preset-toolbar-and-hotkeys.spec.ts`** (CAM-01 — clicks + hotkeys + active highlight)
    ```typescript
    import { test, expect } from "@playwright/test";
    import { applyCameraPreset, getActivePreset } from "../playwright-helpers/applyCameraPreset";
    import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
    import { settle } from "../playwright-helpers/settle";

    const PRESETS = ["eye-level", "top-down", "three-quarter", "corner"] as const;
    const HOTKEYS = ["1", "2", "3", "4"] as const;

    test.describe("CAM-01 preset toolbar + hotkeys", () => {
      test.beforeEach(async ({ page }) => {
        await page.goto("/");
        // Assume WelcomeScreen auto-skips or bypass via IDB seed (see Phase 36 spec pattern)
        await toggleViewMode(page, "3d");
        await settle(page);
      });

      test("toolbar click applies preset + highlights button", async ({ page }) => {
        for (const id of PRESETS) {
          await page.click(`[data-testid="preset-${id}"]`);
          await page.waitForTimeout(700); // tween settle
          await settle(page);
          expect(await getActivePreset(page)).toBe(id);
          const btn = page.locator(`[data-testid="preset-${id}"]`);
          await expect(btn).toHaveClass(/bg-accent\/20/);
        }
      });

      test("hotkey applies preset + highlights button", async ({ page }) => {
        for (let i = 0; i < PRESETS.length; i++) {
          await page.keyboard.press(HOTKEYS[i]);
          await page.waitForTimeout(700);
          await settle(page);
          expect(await getActivePreset(page)).toBe(PRESETS[i]);
        }
      });
    });
    ```

    **Spec 2: `preset-active-element-guard.spec.ts`** (CAM-01 acceptance — activeElement guard)
    ```typescript
    import { test, expect } from "@playwright/test";
    import { applyCameraPreset, getActivePreset } from "../playwright-helpers/applyCameraPreset";
    import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
    import { settle } from "../playwright-helpers/settle";

    test("CAM-01: hotkey inert when focus is in a form input", async ({ page }) => {
      await page.goto("/");
      await toggleViewMode(page, "3d");
      await settle(page);

      // 1) Baseline: press "1" → eye-level applied
      await page.keyboard.press("1");
      await page.waitForTimeout(700);
      expect(await getActivePreset(page)).toBe("eye-level");

      // 2) Click into a width input in RoomSettings
      //    The precise selector depends on Phase 33 RoomSettings — use a role-based
      //    locator or the settled data-testid if present. Fall back to focusing
      //    the input by tabbing into it.
      const widthInput = page.locator('input[type="number"], input[aria-label*="width" i]').first();
      await widthInput.focus();

      // 3) Press "3" while input is focused → activePreset SHOULD NOT change
      await page.keyboard.press("3");
      await page.waitForTimeout(200);
      expect(await getActivePreset(page)).toBe("eye-level");

      // 4) Blur + press "3" → activePreset changes to three-quarter
      await page.locator("body").click(); // blur
      await settle(page);
      await page.keyboard.press("3");
      await page.waitForTimeout(700);
      expect(await getActivePreset(page)).toBe("three-quarter");
    });
    ```
    If no clear width input exists in the test project, the executor may use `page.locator('input').first()` and document the choice. The spec's acceptance is the NEGATIVE (preset unchanged while focus is in ANY input), not the specific input target.

    **Spec 3: `preset-mid-tween-cancel.spec.ts`** (CAM-02)
    ```typescript
    import { test, expect } from "@playwright/test";
    import { applyCameraPreset, getActivePreset, getCameraPose } from "../playwright-helpers/applyCameraPreset";
    import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
    import { settle } from "../playwright-helpers/settle";

    test("CAM-02: mid-tween preset switch ends at latest pose", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));

      await page.goto("/");
      await toggleViewMode(page, "3d");
      await settle(page);

      // 1) Apply top-down, wait for full settle
      await applyCameraPreset(page, "top-down");
      await page.waitForTimeout(800);

      // 2) Apply eye-level, then corner mid-way
      await applyCameraPreset(page, "eye-level");
      await page.waitForTimeout(200); // mid-tween
      await applyCameraPreset(page, "corner");
      await page.waitForTimeout(800); // settle

      // 3) Final pose matches corner preset (approximate — tolerant to floating point)
      //    For a default seeded room, corner pose = [width, wallHeight-0.5, length] → room-dim dependent.
      //    Read via __getCameraPose and assert x/y/z are close to the expected corner-pose values.
      const pose = await getCameraPose(page);
      // The executor may read room dims from useCADStore.getState() via page.evaluate
      // and compute expected pose dynamically — OR assert activePreset === "corner" + pose is NOT equal to eye-level/top-down (negative check).
      expect(await getActivePreset(page)).toBe("corner");
      // Sanity: pose Y is close to wallHeight - 0.5 (not 5.5 which would be eye-level)
      expect(Math.abs(pose.position[1] - 5.5)).toBeGreaterThan(1);

      expect(errors).toEqual([]);
    });
    ```

    **Spec 4: `preset-view-mode-cleanup.spec.ts`** (CAM-02 — view-mode change mid-tween does not throw)
    ```typescript
    import { test, expect } from "@playwright/test";
    import { applyCameraPreset } from "../playwright-helpers/applyCameraPreset";
    import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
    import { settle } from "../playwright-helpers/settle";

    test("CAM-02: view-mode change mid-tween does not throw", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));

      await page.goto("/");
      await toggleViewMode(page, "3d");
      await settle(page);

      // 1) Start a preset
      await applyCameraPreset(page, "eye-level");
      await page.waitForTimeout(100); // MID-TWEEN

      // 2) Switch to 2D — Scene unmounts; presetTween garbage-collected
      await toggleViewMode(page, "2d");
      await page.waitForTimeout(800);

      // 3) Switch back to 3D — Scene re-mounts cleanly
      await toggleViewMode(page, "3d");
      await settle(page);

      expect(errors).toEqual([]);
      // Canvas should be attached (no error overlay)
      const canvas = page.locator("canvas");
      await expect(canvas).toBeVisible();
    });
    ```

    **Spec 5: `preset-no-history-no-autosave.spec.ts`** (CAM-03)
    ```typescript
    import { test, expect } from "@playwright/test";
    import { applyCameraPreset } from "../playwright-helpers/applyCameraPreset";
    import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
    import { settle } from "../playwright-helpers/settle";

    test("CAM-03: 10 preset switches do not push history or trigger autosave", async ({ page }) => {
      await page.goto("/");
      await toggleViewMode(page, "3d");
      await settle(page);

      // 1) Snapshot baseline history length
      const pastLen0 = await page.evaluate(() => {
        const store = (window as unknown as { useCADStore?: unknown }).useCADStore;
        // If useCADStore isn't window-exposed, we need an alternative:
        // The project stores a reference via zustand's default. The executor should
        // either expose a test-mode-only window.__getPastLength() driver in cadStore
        // (preferred; matches Phase 36 __textureLifecycleEvents pattern) OR use the
        // import-in-test-mode export pattern.
        // Simplest path: install a one-line __getCADHistoryLength driver in cadStore
        // as part of this task if not already available.
        return (window as unknown as {
          __getCADHistoryLength?: () => number;
        }).__getCADHistoryLength?.() ?? -1;
      });
      expect(pastLen0).toBeGreaterThanOrEqual(0);

      // 2) Wait for any startup save to settle (observe save status).
      //    If the app exposes window.__getSaveStatus(), poll it until === "saved" or "idle".
      //    Otherwise, a fixed waitForTimeout(1500) is acceptable fallback.
      await page.waitForTimeout(1500);

      // 3) 10 preset switches via random hotkeys
      const hotkeys = ["1", "2", "3", "4"];
      for (let i = 0; i < 10; i++) {
        const k = hotkeys[Math.floor(Math.random() * 4)];
        await page.keyboard.press(k);
        await page.waitForTimeout(50);
      }
      await page.waitForTimeout(1000); // all tweens settle

      // 4) History unchanged (CAM-03 primary assertion)
      const pastLen1 = await page.evaluate(() => {
        return (window as unknown as {
          __getCADHistoryLength?: () => number;
        }).__getCADHistoryLength?.() ?? -1;
      });
      expect(pastLen1).toBe(pastLen0);

      // 5) Save status never entered "saving" during the loop (CAM-03 secondary assertion)
      //    Simplest: read a __saveStatusEventsSinceMark driver if installed, OR
      //    rely on pastLen unchanged as indirect evidence (autosave only fires on CAD mutations).
      //    The executor may drop the save-status assertion if __getSaveStatus is not
      //    easily exposed — pastLen unchanged is the stronger guarantee.
    });
    ```

    Executor MUST install `window.__getCADHistoryLength` test driver in `src/stores/cadStore.ts` (pre-declared in this plan's `files_modified`). Pattern: a module-level assignment gated by `import.meta.env.MODE === "test"`, colocated with any existing test-mode handle (e.g., `window.__cadStore` from Phase 36). Signature: `() => useCADStore.getState().past.length`. ~5 lines total. Spec 5 reads this value before and after a 10-switch loop to assert CAM-03 (no history pollution).

    Run the full e2e suite:
    ```
    npm run test:e2e -- --project=chromium-dev
    ```
    All 5 specs + any Phase 36 specs must pass. First run on this machine may need `npx playwright install chromium`.
  </action>
  <verify>
    <automated>test -f tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts && test -f tests/e2e/specs/preset-active-element-guard.spec.ts && test -f tests/e2e/specs/preset-mid-tween-cancel.spec.ts && test -f tests/e2e/specs/preset-view-mode-cleanup.spec.ts && test -f tests/e2e/specs/preset-no-history-no-autosave.spec.ts && grep -q 'preset-eye-level' tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts && grep -q 'bg-accent' tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts && grep -q 'activeElement\|focus()' tests/e2e/specs/preset-active-element-guard.spec.ts && grep -q 'mid-tween\|mid-way\|MID-TWEEN' tests/e2e/specs/preset-mid-tween-cancel.spec.ts && grep -q 'pageerror' tests/e2e/specs/preset-view-mode-cleanup.spec.ts && grep -q 'past' tests/e2e/specs/preset-no-history-no-autosave.spec.ts && npx playwright test --list tests/e2e/specs/preset-*.spec.ts 2>&1 | grep -q 'Listing tests' && npm run test:e2e -- --project=chromium-dev tests/e2e/specs/preset-*.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - All 5 spec files exist at listed paths
    - Spec 1 (toolbar-and-hotkeys) exercises all 4 presets via BOTH click AND keyboard
    - Spec 1 asserts `bg-accent/20` class on the active button (CAM-01 acceptance D-02)
    - Spec 2 tests the NEGATIVE (preset unchanged while focused in input) AND the POSITIVE (preset changes after blur)
    - Spec 3 applies 3 presets in sequence with mid-tween interruption, asserts final activePreset matches latest request, asserts NO pageerror
    - Spec 4 toggles 3D → 2D mid-tween with NO pageerror; 2D → 3D re-entry mounts canvas cleanly
    - Spec 5 loops 10 random preset hotkeys and asserts cadStore past.length unchanged (CAM-03 primary)
    - `npx playwright test --list tests/e2e/specs/preset-*.spec.ts` lists all 5 files (no syntax errors)
    - `npm run test:e2e -- --project=chromium-dev tests/e2e/specs/preset-*.spec.ts` exits 0 (all green)
    - No regression in Phase 36 specs (`npm run test:e2e -- --project=chromium-dev` full run still green)
  </acceptance_criteria>
  <done>5 Playwright specs cover CAM-01 (clicks, hotkeys, active-highlight, activeElement guard), CAM-02 (mid-tween cancel, view-mode cleanup), and CAM-03 (no history pollution). Full Playwright suite green — Phase 35 HUMAN-UAT can begin.</done>
</task>

</tasks>

<verification>
**Plan-level verification** (run after all 3 tasks):

1. TypeScript clean:
   ```
   npx tsc --noEmit
   ```

2. Unit suite still green:
   ```
   npm test -- --run
   ```

3. Playwright e2e — all 5 Phase 35 specs + all Phase 36 specs green:
   ```
   npm run test:e2e -- --project=chromium-dev
   ```

4. No behavioral regression in wall-side camera animation — existing `cameraAnimTarget` path untouched:
   ```
   git diff src/three/ThreeViewport.tsx | grep -E '^-.*cameraAnimTarget' | wc -l
   ```
   Should be 0 (no deletions on the wall-side path).

5. Existing `__setTestCamera` driver from Phase 36 Plan 01 still installed:
   ```
   grep -q '__setTestCamera' src/three/ThreeViewport.tsx
   ```

6. Manual HUMAN-UAT flags (document in SUMMARY; will be lifted to 35-HUMAN-UAT.md by the verify-work step):
   - **FLAG-1:** Eye-level preset "corner-stand" framing — Jessica may prefer facing the longest wall or facing the door. Research §2 Open Question.
   - **FLAG-2:** Risk 4 — if Jessica edits room.width/length DURING a tween, the tween completes to the stale pose. Acceptable per Research. Worth a manual UAT confirmation.
   - **FLAG-3:** `PersonStanding` vs `User` icon for eye-level — purely aesthetic, may be swapped post-UAT if cluster looks visually busy.
</verification>

<success_criteria>
- ThreeViewport.tsx extended with: easeInOutCubic, presetTween ref, startPresetTween(), applyPresetInstant(), pendingPresetRequest consumer useEffect, useFrame preset branch, cameraMode cleanup (Risk 5), unmount cleanup (Risk 6), 3 new test drivers (__applyCameraPreset, __getActivePreset, __getCameraPose)
- Existing wall-side `cameraAnimTarget` lerp path unchanged (Research §1 "coexist, not replace")
- Existing `__setTestCamera` driver (Phase 36 Plan 01) unchanged
- Tween is ~600ms, easeInOutCubic, imperatively toggles `ctrl.enableDamping` at start/settle
- Cancel-and-restart captures `fromPos`/`fromTarget` from LIVE camera (not prior tween's `toPos`) — no jumps
- `useReducedMotion()` → instant snap path (D-04 + Phase 33 D-39)
- cameraMode → "walk" clears presetTween.current AND restores enableDamping=true (Risk 5)
- Scene unmount clears presetTween.current (Risk 6 belt-and-suspenders)
- 3 test drivers all gated on `import.meta.env.MODE === "test"` with install/cleanup useEffect
- Playwright helper file `applyCameraPreset.ts` exports 3 async functions
- 5 e2e specs at `tests/e2e/specs/preset-*.spec.ts` — 1:1 with Research §7 outline
- Full `npm run test:e2e -- --project=chromium-dev` suite green (Phase 35 + Phase 36 combined)
- `npx tsc --noEmit` exits 0
- `npm test -- --run` exits 0 (unit suite)
- 3 HUMAN-UAT flags documented in SUMMARY for Jessica-level verification
- Phase 35 CAM-01 / CAM-02 / CAM-03 acceptance bullets all verifiable via automated e2e or Research-documented manual UAT
</success_criteria>

<output>
After completion, create `.planning/phases/35-camera-presets/35-02-SUMMARY.md` documenting:
- Files modified + line-count deltas
- Tween mechanism chosen (time-based + easeInOutCubic + imperative damping toggle) and why (Research §1 — coexist with existing cameraAnimTarget exponential lerp)
- Cancel-and-restart implementation (live-camera capture at startPresetTween — no prior-tween `to` reuse)
- Cleanup strategy (cameraMode useEffect + unmount useEffect — double safety)
- 3 new test drivers installed + existing Phase 36 __setTestCamera untouched
- E2e spec outcomes (5/5 green)
- Decision on __getCADHistoryLength driver (installed / not needed — document which)
- 3 HUMAN-UAT flags for next verify-work step:
  1. Eye-level corner-stand framing (Jessica may prefer facing longest wall)
  2. Room-dim change mid-tween → stale pose (Risk 4, acceptable per research)
  3. PersonStanding vs User icon preference (aesthetic)
- Requirements coverage: CAM-02 (all 4 acceptance bullets), CAM-03 (both assertions)
- Phase 35 COMPLETE handoff — ready for /gsd:verify-work phase
</output>
