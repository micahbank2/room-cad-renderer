---
phase: 35-camera-presets
plan: 01
type: execute
wave: 1
depends_on: []
requirements: [CAM-01]
requirements_addressed: [CAM-01]
files_modified:
  - src/three/cameraPresets.ts
  - src/three/cameraPresets.test.ts
  - src/stores/uiStore.ts
  - src/components/Toolbar.tsx
  - src/App.tsx
autonomous: true

must_haves:
  truths:
    - "getPresetPose returns the literal v1.7.5 baseline for three-quarter (D-05)"
    - "eye-level pose has Y = 5.5 for any room dimensions"
    - "top-down pose has Y = 1.5 × max(width, length) and target Y = 0"
    - "corner pose sits at (width, wallHeight-0.5, length) looking at (0, wallHeight-0.5, 0)"
    - "Toolbar renders a 4-button preset cluster immediately right of the camera-mode toggle using Phase 33 D-33 lucide icons (D-06/D-07)"
    - "The active preset button is highlighted with bg-accent/20 text-accent-light border-accent/30 class triad"
    - "Preset buttons are disabled (or rendered inert) when cameraMode === 'walk' (D-01)"
    - "Preset buttons only render when viewMode === '3d' || viewMode === 'split' (mirrors existing camera-mode toggle placement; enforces D-03 at the UI surface)"
    - "Bare 1/2/3/4 hotkeys call useUIStore.getState().requestPreset() when all guards pass"
    - "Hotkey handler skips preset dispatch when activeElement is an <input>/<textarea>/<select> (pre-existing guard at App.tsx:133-137 covers this — no rewrite)"
    - "Hotkey handler skips preset dispatch when viewMode is not '3d' or 'split' (D-03)"
    - "Hotkey handler skips preset dispatch when cameraMode === 'walk' (D-01)"
    - "Hotkey handler skips preset dispatch when any modifier key is held (Ctrl+1/Cmd+1 are browser tab switches)"
    - "uiStore exposes activePreset, pendingPresetRequest, requestPreset(), clearPendingPresetRequest(), setActivePreset() — all write uiStore only, never cadStore (CAM-03 prerequisite)"
  artifacts:
    - path: "src/three/cameraPresets.ts"
      provides: "PresetId type, PRESETS metadata array, getPresetPose() pure function"
      contains: "getPresetPose"
    - path: "src/three/cameraPresets.test.ts"
      provides: "Vitest unit tests covering all 4 preset poses + D-05 literal baseline guard"
      contains: "three-quarter"
    - path: "src/stores/uiStore.ts"
      provides: "activePreset state + pendingPresetRequest bridge + requestPreset action"
      contains: "activePreset"
    - path: "src/components/Toolbar.tsx"
      provides: "4-button preset cluster with lucide icons + active highlight + walk-mode disable"
      contains: "preset-eye-level"
    - path: "src/App.tsx"
      provides: "1/2/3/4 hotkey dispatch with D-01/D-03/activeElement/modifier guards"
      contains: "requestPreset"
  key_links:
    - from: "src/App.tsx (keydown handler ~line 158)"
      to: "useUIStore.requestPreset"
      via: "useUIStore.getState().requestPreset(presetId) after guard chain"
      pattern: "requestPreset"
    - from: "src/components/Toolbar.tsx (preset cluster)"
      to: "useUIStore.requestPreset"
      via: "onClick handler per button"
      pattern: "requestPreset"
    - from: "src/components/Toolbar.tsx (active highlight)"
      to: "useUIStore.activePreset"
      via: "useUIStore subscription + conditional className"
      pattern: "bg-accent/20"
    - from: "src/stores/uiStore.ts requestPreset"
      to: "src/three/cameraPresets.ts PresetId"
      via: "import type { PresetId } from '@/three/cameraPresets'"
      pattern: "PresetId"
---

<objective>
Land the "structure" half of Phase 35: the pure preset-pose module (+ its unit tests), the uiStore bridge fields (activePreset + pendingPresetRequest + requestPreset), the 4-button Toolbar cluster with lucide icons + active highlight + walk-mode disable, and the 1/2/3/4 hotkey handler with the full guard chain (D-01 walk-mode inert, D-03 viewMode gate, activeElement skip, modifier-key skip).

Purpose: All scaffolding + UI surface + input dispatch for CAM-01 ships here, but NO motion. Preset requests flow through uiStore and LAND in pendingPresetRequest but nothing yet consumes them — Scene doesn't read the request, doesn't tween, doesn't move the camera. Plan 35-02 plugs in the tween engine + damping toggle + test drivers + e2e specs.

Output: `cameraPresets.ts` + its test file + uiStore extensions + Toolbar cluster + hotkey wiring in App.tsx. All 6 unit tests green. No behavioral change to existing camera path — existing `cameraAnimTarget` wall-side lerp untouched.
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
@src/three/ThreeViewport.tsx
@src/stores/uiStore.ts
@src/components/Toolbar.tsx
@src/App.tsx
@src/hooks/useReducedMotion.ts

<interfaces>
<!-- Signatures to implement exactly. Plan 35-02's tween engine consumes these. -->

```typescript
// src/three/cameraPresets.ts — NEW FILE (single source of truth per Risk 7)
export type PresetId = "eye-level" | "top-down" | "three-quarter" | "corner";

export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
};

export type PresetMeta = {
  id: PresetId;
  key: "1" | "2" | "3" | "4";
  label: string;       // Mixed-case per Phase 33 D-03 (button aria-label + tooltip)
  iconName: "PersonStanding" | "Map" | "Box" | "CornerDownRight";
};

export const PRESETS: readonly PresetMeta[] = [
  { id: "eye-level",     key: "1", label: "Eye level",  iconName: "PersonStanding" },
  { id: "top-down",      key: "2", label: "Top down",   iconName: "Map" },
  { id: "three-quarter", key: "3", label: "3/4 view",   iconName: "Box" },
  { id: "corner",        key: "4", label: "Corner",     iconName: "CornerDownRight" },
];

export function getPresetPose(
  presetId: PresetId,
  room: { width: number; length: number; wallHeight: number },
): CameraPose;
```

```typescript
// src/stores/uiStore.ts — ADDITIONS (activePreset + pendingPresetRequest bridge)
import type { PresetId } from "@/three/cameraPresets";

// State additions
activePreset: PresetId | null;
pendingPresetRequest: { id: PresetId; seq: number } | null;

// Action additions
setActivePreset: (preset: PresetId | null) => void;
requestPreset: (id: PresetId) => void;          // increments seq, sets activePreset, sets pendingPresetRequest
clearPendingPresetRequest: () => void;
```

```typescript
// src/App.tsx keydown handler — new block (insert after existing 'e' → toggleCameraMode at ~line 158)
// Reads: viewMode (closure), useUIStore.getState().cameraMode, useUIStore.getState().requestPreset
// Guards in order: activeElement (inherited from lines 133-137), D-03 viewMode, D-01 walk-mode, modifier keys
// Dispatches: useUIStore.getState().requestPreset(presetId) on match; preventDefault + return
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create cameraPresets.ts module + unit tests (pure math, D-05 literal baseline guard)</name>
  <files>src/three/cameraPresets.ts, src/three/cameraPresets.test.ts</files>
  <read_first>
    - .planning/phases/35-camera-presets/35-RESEARCH.md §2 (Preset Pose Math), §8 (Unit Tests)
    - .planning/phases/35-camera-presets/35-CONTEXT.md §D-05 (literal v1.7.5 baseline)
    - src/three/ThreeViewport.tsx lines 83-84 (existing orbitPosRef default = [halfW+15, 12, halfL+15] — confirms D-05 values)
    - tests/ directory convention (vitest files named *.test.ts)
  </read_first>
  <behavior>
    Pure function `getPresetPose(presetId, room)` returns `{ position: [x,y,z], target: [x,y,z] }` in R3F world coords (X = floorplan x, Y = up, Z = floorplan y).

    The 4 preset formulas (implemented EXACTLY):

    **eye-level** (per CAM-01 + Research §2 Open Question resolution):
    Jessica stands at room corner (0, 5.5, 0) looking toward room center at eye-height.
    ```
    position = [0, 5.5, 0]
    target   = [halfW, 5.5, halfL]
    ```
    (Corner-stand + center-look is the planner's concrete resolution of "eye-level looking toward room center." Flagged for HUMAN-UAT — Jessica may prefer facing the longest wall or the door.)

    **top-down** (per CAM-01):
    ```
    position = [halfW, 1.5 * Math.max(width, length), halfL]
    target   = [halfW, 0, halfL]
    ```

    **three-quarter** — D-05 LITERAL v1.7.5 baseline (do NOT derive geometrically):
    ```
    position = [halfW + 15, 12, halfL + 15]
    target   = [halfW, halfL / 2, halfL]
    ```

    **corner** (per CAM-01):
    ```
    position = [room.width, wallHeight - 0.5, room.length]
    target   = [0, wallHeight - 0.5, 0]
    ```

    Unit test file `src/three/cameraPresets.test.ts` covers (one test each per Research §8):

    1. `getPresetPose("three-quarter", { width: 20, length: 16, wallHeight: 8 })` returns EXACTLY `{ position: [25, 12, 24], target: [10, 8, 16] }`. D-05 regression guard.
    2. `getPresetPose("eye-level", room)` — for 3 different room shapes, `position[1] === 5.5` AND `target[1] === 5.5`.
    3. `getPresetPose("top-down", room).position[1]` — table test `[width=20, length=16] → 30`, `[16, 20] → 30`, `[40, 40] → 60`.
    4. `getPresetPose("top-down", room).target[1]` — equals 0 for any room.
    5. `getPresetPose("corner", { width: 20, length: 16, wallHeight: 8 })` returns `position: [20, 7.5, 16]`, `target: [0, 7.5, 0]`.
    6. Exhaustive ID handling — `for (const id of PRESETS.map(p => p.id)) { getPresetPose(id, room) }` returns 6 finite numbers across position+target for every id (no NaN, no throw).
  </behavior>
  <action>
    1. Create `src/three/cameraPresets.ts` with the EXACT module shape from the `<interfaces>` block above. Use a `switch (presetId)` with all 4 cases. NO default branch (TS exhaustiveness catches drift). Export `PresetId`, `CameraPose`, `PresetMeta`, `PRESETS`, `getPresetPose`.

    2. Add detailed JSDoc on `getPresetPose` noting:
       - Coordinate system (Y is up; X = floorplan x; Z = floorplan y) matches R3F convention.
       - three-quarter is LOCKED TO D-05 literal baseline — cross-reference `.planning/phases/35-camera-presets/35-CONTEXT.md §D-05`.
       - eye-level's corner-stand placement is a HUMAN-UAT flag (Jessica may prefer different framing).

    3. Create `src/three/cameraPresets.test.ts` with the 6 Vitest tests above. Use `describe("getPresetPose")` wrapper. Use `expect(...).toEqual(...)` for exact array comparisons; use `expect(...).toBeCloseTo(..., 6)` for any floating-point math (there shouldn't be any — all formulas use integer multiplications, but guard against future edits).

    4. Run `npx vitest run src/three/cameraPresets.test.ts` — must be GREEN (6/6).

    5. Run `npx tsc --noEmit` — must exit 0 (no type regressions).
  </action>
  <verify>
    <automated>npx vitest run src/three/cameraPresets.test.ts 2>&1 | tee /tmp/p35-01-t1.log; grep -q "failed" /tmp/p35-01-t1.log && exit 1 || grep -qE "6 passed|Tests\s+6 passed" /tmp/p35-01-t1.log</automated>
  </verify>
  <acceptance_criteria>
    - File exists: `src/three/cameraPresets.ts`
    - File exists: `src/three/cameraPresets.test.ts`
    - `grep -q 'export type PresetId' src/three/cameraPresets.ts`
    - `grep -q 'export const PRESETS' src/three/cameraPresets.ts`
    - `grep -q 'export function getPresetPose' src/three/cameraPresets.ts`
    - `grep -q 'halfW + 15' src/three/cameraPresets.ts` (D-05 literal baseline guard)
    - `grep -q '1.5 \* Math.max' src/three/cameraPresets.ts` (top-down formula)
    - `grep -q 'wallHeight - 0.5' src/three/cameraPresets.ts` (corner formula)
    - `npx vitest run src/three/cameraPresets.test.ts` exits 0 with 6/6 passing
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Pure preset-pose module exists with unit tests covering all 4 presets + D-05 regression guard. No side effects, no React. Plan 35-02 will import `PresetId`, `PRESETS`, `getPresetPose` from this file.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Extend uiStore with activePreset + pendingPresetRequest bridge + requestPreset action</name>
  <files>src/stores/uiStore.ts</files>
  <read_first>
    - src/stores/uiStore.ts (existing `wallSideCameraTarget: { wallId, side, seq } | null` + `focusWallSide` + `clearWallSideCameraTarget` — MIRROR this pattern for pendingPresetRequest)
    - src/three/cameraPresets.ts (after Task 1 — confirm `PresetId` export path)
    - .planning/phases/35-camera-presets/35-RESEARCH.md §3 (Active-Preset State Placement), §4 (Driver-vs-direct-call Recommendation B)
    - .planning/phases/35-camera-presets/35-CONTEXT.md §D-02 (indicator persists), §D-07 implementation-note re state location discretion
  </read_first>
  <action>
    1. Add import at top of uiStore.ts:
       ```typescript
       import type { PresetId } from "@/three/cameraPresets";
       ```

    2. In the `interface UIState` block (extend existing — do NOT reorder unrelated fields):
       - After `wallSideCameraTarget: { wallId: string; side: WallSide; seq: number } | null;` add:
         ```typescript
         /** Phase 35 CAM-01 (D-02): the last preset Jessica applied. Stays set
          *  across manual OrbitControls drags — only cleared by applying a different
          *  preset. Toolbar reads this for the active-button highlight. */
         activePreset: PresetId | null;
         /** Phase 35 CAM-02 bridge (Research §4 Option B): selectTool-style request
          *  bridge from App.tsx/Toolbar → Scene. Scene useEffect watches this ref
          *  and translates into a preset tween (Plan 35-02). seq increments each
          *  request so back-to-back requests for the same preset still fire. */
         pendingPresetRequest: { id: PresetId; seq: number } | null;
         ```
       - In the actions section (after `clearWallSideCameraTarget`):
         ```typescript
         setActivePreset: (preset: PresetId | null) => void;
         /** Phase 35: combined write — sets activePreset AND pendingPresetRequest
          *  in a single set() call. Hotkey handler + Toolbar buttons + test driver
          *  all call this; no code path sets one without the other. */
         requestPreset: (id: PresetId) => void;
         clearPendingPresetRequest: () => void;
         ```

    3. In the `useUIStore = create<UIState>()(...)` body, add the default state values and action implementations:
       - Defaults near existing state defaults:
         ```typescript
         activePreset: null,
         pendingPresetRequest: null,
         ```
       - Actions near existing `clearWallSideCameraTarget`:
         ```typescript
         setActivePreset: (preset) => set({ activePreset: preset }),
         requestPreset: (id) =>
           set((s) => ({
             activePreset: id,
             pendingPresetRequest: { id, seq: (s.pendingPresetRequest?.seq ?? 0) + 1 },
           })),
         clearPendingPresetRequest: () => set({ pendingPresetRequest: null }),
         ```

    4. Run `npx tsc --noEmit` — must exit 0.

    5. Run `npm test -- --run` — full vitest suite should remain green. No uiStore regression.

    CRITICAL: Do NOT touch `wallSideCameraTarget`, `focusWallSide`, `clearWallSideCameraTarget`, or any other existing field. This is additive only.
  </action>
  <verify>
    <automated>grep -q 'activePreset: PresetId | null' src/stores/uiStore.ts && grep -q 'pendingPresetRequest:' src/stores/uiStore.ts && grep -q 'requestPreset: (id) =>' src/stores/uiStore.ts && grep -q 'clearPendingPresetRequest:' src/stores/uiStore.ts && grep -q 'from "@/three/cameraPresets"' src/stores/uiStore.ts && npx tsc --noEmit 2>&1 | tee /tmp/p35-01-t2.log; ! grep -q "error TS" /tmp/p35-01-t2.log</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "activePreset" src/stores/uiStore.ts` returns ≥3 (interface field + default + setActivePreset action body)
    - `grep -c "pendingPresetRequest" src/stores/uiStore.ts` returns ≥4 (interface field + default + requestPreset body + clearPendingPresetRequest body)
    - `grep -q "requestPreset: (id)" src/stores/uiStore.ts` succeeds
    - `grep -q 'seq: (s.pendingPresetRequest?.seq ?? 0) + 1' src/stores/uiStore.ts` succeeds (seq increments — Research §4)
    - Existing `wallSideCameraTarget` AND `focusWallSide` AND `clearWallSideCameraTarget` AND `toggleCameraMode` still exist unchanged (anti-pattern guard — `grep` finds them)
    - `npx tsc --noEmit` exits 0
    - `npm test -- --run` exits 0 (no uiStore regression)
  </acceptance_criteria>
  <done>uiStore extended with 2 new state fields + 3 new actions. Hotkey handler and Toolbar can now call `requestPreset`. Nothing consumes `pendingPresetRequest` yet — Plan 35-02 Task 2 adds the Scene-side useEffect that translates requests into tweens.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Add 4-button preset cluster to Toolbar with lucide icons + active highlight + walk-mode disable</name>
  <files>src/components/Toolbar.tsx</files>
  <read_first>
    - src/components/Toolbar.tsx lines 88-106 (existing camera-mode toggle — preset cluster inserts IMMEDIATELY AFTER this, per D-06)
    - src/three/cameraPresets.ts (after Task 1 — import PRESETS)
    - src/stores/uiStore.ts (after Task 2 — subscribe to activePreset, call requestPreset)
    - .planning/phases/35-camera-presets/35-CONTEXT.md §D-01 (walk-mode), §D-02 (highlight persists), §D-06 (placement), §D-07 (lucide icons)
    - .planning/phases/35-camera-presets/35-RESEARCH.md §5 (Lucide Icon Picks — PersonStanding recommended over User)
    - CLAUDE.md (worktree) §"Canonical Spacing + Radius (D-34)" — Toolbar.tsx is zero-arbitrary-values; use only gap-1 / gap-2 / p-1 / p-2 / rounded-sm
    - Phase 33 D-33 reference — lucide icons are allowed in Toolbar.tsx (only NEW material-symbols-outlined imports are forbidden)
  </read_first>
  <action>
    1. Add lucide imports at top of Toolbar.tsx (co-locate with any existing lucide imports; alias Map to MapIcon to avoid shadowing the JS global — per Research §5):
       ```typescript
       import { PersonStanding, Map as MapIcon, Box, CornerDownRight } from "lucide-react";
       ```

    2. Import from uiStore + cameraPresets:
       ```typescript
       import { PRESETS, type PresetId } from "@/three/cameraPresets";
       ```
       (`useUIStore` is already imported.)

    3. Subscribe to `activePreset` + `cameraMode` inside the component (both are probably already read via `useUIStore(...)` — co-locate the new subscription):
       ```typescript
       const activePreset = useUIStore((s) => s.activePreset);
       const requestPreset = useUIStore((s) => s.requestPreset);
       // cameraMode already subscribed
       ```

    4. Build an icon map:
       ```typescript
       const PRESET_ICONS: Record<PresetId, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
         "eye-level": PersonStanding,
         "top-down": MapIcon,
         "three-quarter": Box,
         "corner": CornerDownRight,
       };
       ```
       (Place inside the component or as a module-level const — either is fine.)

    5. Render the 4-button cluster IMMEDIATELY AFTER the existing camera-mode toggle `<Tooltip>...</Tooltip>` block (~line 106) and under the same `(viewMode === "3d" || viewMode === "split")` gate — this enforces D-03 at the UI surface. D-06 says "separate cluster immediately right of camera-mode toggle":
       ```tsx
       {(viewMode === "3d" || viewMode === "split") && (
         <div className="flex items-center gap-1 mr-6" role="group" aria-label="Camera presets">
           {PRESETS.map(({ id, key, label, iconName }) => {
             const Icon = PRESET_ICONS[id];
             const isActive = activePreset === id;
             const isWalkMode = cameraMode === "walk";
             return (
               <Tooltip
                 key={id}
                 content={isWalkMode ? "Exit walk mode to use presets" : label}
                 shortcut={key}
                 placement="bottom"
               >
                 <button
                   data-testid={`preset-${id}`}
                   onClick={() => !isWalkMode && requestPreset(id)}
                   disabled={isWalkMode}
                   aria-label={label}
                   aria-pressed={isActive}
                   className={`flex items-center justify-center p-1 rounded-sm transition-colors duration-150 ${
                     isActive
                       ? "bg-accent/20 text-accent-light border border-accent/30"
                       : "text-text-dim hover:text-accent-light border border-transparent"
                   } ${isWalkMode ? "opacity-40 cursor-not-allowed" : ""}`}
                 >
                   <Icon size={16} strokeWidth={1.5} />
                 </button>
               </Tooltip>
             );
           })}
         </div>
       )}
       ```

       CRITICAL — Phase 33 D-34 canonical spacing compliance:
       - Allowed utilities only: `gap-1`, `gap-2`, `p-1`, `p-2`, `rounded-sm`, `mr-6` (existing in this file for camera-mode toggle), `border`, `border-transparent`, `opacity-40`, `cursor-not-allowed`, `transition-colors`, `duration-150`.
       - NO arbitrary values (no `p-[Npx]`, no `rounded-[Npx]`, no `gap-[3px]`).
       - If an arbitrary value feels necessary, STOP and revisit the canonical scale — 4/8/16/24/32px only.

    6. Verify visually by running `npm run dev -- --mode test` in a separate shell (launched by executor, not by this plan's automated verification) — preset cluster renders right of the "Walk/Orbit" toggle, icons visible, active-state highlight swaps when `requestPreset` is called. This visual check is informational; formal UAT is in Plan 35-02's HUMAN-UAT.

    7. Run `npm test -- --run` — existing unit tests still pass. Toolbar tests (if any) either still pass, or are updated to reflect the new cluster.
  </action>
  <verify>
    <automated>grep -q 'PersonStanding' src/components/Toolbar.tsx && grep -q 'Map as MapIcon' src/components/Toolbar.tsx && grep -q 'CornerDownRight' src/components/Toolbar.tsx && grep -q 'data-testid={`preset-' src/components/Toolbar.tsx && grep -q 'bg-accent/20' src/components/Toolbar.tsx && grep -q 'from "@/three/cameraPresets"' src/components/Toolbar.tsx && grep -q 'requestPreset' src/components/Toolbar.tsx && ! grep -qE 'p-\[[0-9]+px\]|gap-\[[0-9]+px\]|rounded-\[[0-9]+px\]|m-\[[0-9]+px\]' src/components/Toolbar.tsx && npm test -- --run 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q 'PersonStanding' src/components/Toolbar.tsx` (eye-level icon)
    - `grep -q 'Map as MapIcon' src/components/Toolbar.tsx` (top-down icon, aliased to avoid shadowing JS `Map`)
    - `grep -q '\\bBox\\b' src/components/Toolbar.tsx` (three-quarter icon)
    - `grep -q 'CornerDownRight' src/components/Toolbar.tsx` (corner icon)
    - `grep -q 'data-testid={`preset-' src/components/Toolbar.tsx` (stable test selectors; Plan 35-02 e2e specs depend on these)
    - `grep -q 'bg-accent/20 text-accent-light border-accent/30' src/components/Toolbar.tsx` (D-02 active-state class triad — matches CAM-01 acceptance verbatim)
    - `grep -q 'cameraMode === "walk"' src/components/Toolbar.tsx` OR equivalent guard that disables buttons in walk mode (D-01)
    - `grep -q 'requestPreset' src/components/Toolbar.tsx` (calls uiStore action, not a local handler)
    - `! grep -qE 'p-\\[[0-9]+px\\]|gap-\\[[0-9]+px\\]|rounded-\\[[0-9]+px\\]|m-\\[[0-9]+px\\]' src/components/Toolbar.tsx` (Phase 33 D-34 zero-arbitrary-values guard)
    - NO new `material-symbols-outlined` imports/classes introduced (Phase 33 D-33) — grep count of `material-symbols-outlined` in file is unchanged from before this task
    - `npm test -- --run` exits 0 (no unit-test regression)
  </acceptance_criteria>
  <done>Toolbar renders 4-button preset cluster right of the camera-mode toggle when viewMode ∈ {3d, split}. Icons are lucide (PersonStanding/MapIcon/Box/CornerDownRight). Active button highlighted per D-02 class triad. Walk-mode disables buttons per D-01. data-testid attributes give Plan 35-02's e2e specs stable selectors. Phase 33 D-34 spacing compliance preserved.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Wire 1/2/3/4 bare hotkeys in App.tsx with full guard chain (D-01/D-03/activeElement/modifier)</name>
  <files>src/App.tsx</files>
  <read_first>
    - src/App.tsx lines 123-249 (existing keydown handler + viewMode dep array at line 249)
    - src/App.tsx lines 133-137 (existing activeElement guard — REUSE, do not duplicate)
    - src/App.tsx line 159 (existing 'e' → toggleCameraMode hook — insertion point for 1/2/3/4 block is AFTER this)
    - src/three/cameraPresets.ts (after Task 1 — import PresetId, PRESETS)
    - src/stores/uiStore.ts (after Task 2 — requestPreset available)
    - .planning/phases/35-camera-presets/35-CONTEXT.md §D-01 §D-03
    - .planning/phases/35-camera-presets/35-RESEARCH.md §4 (Hotkey Handler Wiring — full guard chain)
  </read_first>
  <action>
    1. Add import at top of App.tsx:
       ```typescript
       import { PRESETS, type PresetId } from "@/three/cameraPresets";
       ```

    2. Inside the existing `onKeyDown` handler (around line 158, AFTER the 'e' → toggleCameraMode block), insert the preset dispatch block. Build a hotkey→PresetId map from `PRESETS` to preserve single-source-of-truth (Risk 7):
       ```typescript
       // Phase 35 CAM-01: bare 1/2/3/4 → preset dispatch.
       // Full guard chain (Research §4):
       //   - activeElement skip: handled by lines 133-137 above (this branch is only reached when target is NOT INPUT/TEXTAREA/SELECT).
       //   - Modifier keys: Ctrl+1 / Cmd+1 are browser tab switches — do NOT swallow.
       //   - D-03: inert outside 3d/split viewMode.
       //   - D-01: inert in walk mode.
       {
         const presetMeta = PRESETS.find((p) => p.key === e.key);
         if (presetMeta) {
           if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
           if (viewMode !== "3d" && viewMode !== "split") return;
           if (useUIStore.getState().cameraMode === "walk") return;
           useUIStore.getState().requestPreset(presetMeta.id);
           e.preventDefault();
           return;
         }
       }
       ```

    3. CRITICAL: Do NOT modify the activeElement guard at lines 133-137. Do NOT touch the existing 'e' handler. Do NOT touch the clipboard (Ctrl+C / Ctrl+V) logic. This is additive only.

    4. The existing `useEffect` deps array at line 249 is `[setTool, viewMode]` — already includes `viewMode`. No dep-array change needed. (The preset dispatch reads `useUIStore.getState().cameraMode` + `useUIStore.getState().requestPreset` imperatively, so cameraMode does NOT need to be in the deps.)

    5. Run `npx tsc --noEmit` — must exit 0.

    6. Run `npm test -- --run` — all existing tests still pass. App.tsx has no dedicated unit tests today; a keyboard-focused e2e spec lands in Plan 35-02.
  </action>
  <verify>
    <automated>grep -q 'from "@/three/cameraPresets"' src/App.tsx && grep -q 'PRESETS.find' src/App.tsx && grep -q 'requestPreset(presetMeta.id)' src/App.tsx && grep -q 'viewMode !== "3d" && viewMode !== "split"' src/App.tsx && grep -q 'cameraMode === "walk"' src/App.tsx && grep -q 'e.ctrlKey || e.metaKey || e.altKey' src/App.tsx && npx tsc --noEmit 2>&1 | tee /tmp/p35-01-t4.log; ! grep -q "error TS" /tmp/p35-01-t4.log && npm test -- --run 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q 'from "@/three/cameraPresets"' src/App.tsx` (import present)
    - `grep -q 'PRESETS.find' src/App.tsx` (single-source-of-truth via PRESETS array — Risk 7 guard)
    - `grep -q 'requestPreset(presetMeta.id)' src/App.tsx` (dispatches to uiStore, not a direct camera call)
    - `grep -q 'viewMode !== "3d" && viewMode !== "split"' src/App.tsx` (D-03 guard)
    - `grep -q 'cameraMode === "walk"' src/App.tsx` (D-01 guard)
    - `grep -q 'e.ctrlKey || e.metaKey || e.altKey' src/App.tsx` (modifier-key skip — Ctrl+1/Cmd+1 browser passthrough)
    - Existing activeElement guard at lines 133-137 (`e.target instanceof HTMLInputElement`) UNCHANGED (grep finds it; anti-pattern guard)
    - Existing `'e' → toggleCameraMode` block at line 159 UNCHANGED (grep finds `toggleCameraMode` in App.tsx)
    - `npx tsc --noEmit` exits 0
    - `npm test -- --run` exits 0 (no regression)
  </acceptance_criteria>
  <done>Bare 1/2/3/4 hotkeys dispatch through the full guard chain to uiStore.requestPreset. activeElement/viewMode/walk-mode/modifier-key guards all in place per D-01 + D-03 + Research §4. PRESETS array is single source of truth — no hardcoded {"1": "eye-level", ...} map duplicating cameraPresets.ts (Risk 7). Ready for Plan 35-02 to install the Scene-side tween consumer.</done>
</task>

</tasks>

<verification>
**Plan-level verification** (run after all 4 tasks):

1. Pure module + unit tests green:
   ```
   npx vitest run src/three/cameraPresets.test.ts
   ```
   Must report 6/6 passing.

2. TypeScript clean:
   ```
   npx tsc --noEmit
   ```

3. Full unit suite still green (no regression):
   ```
   npm test -- --run
   ```

4. All 5 files modified exactly as planned:
   ```
   git diff --stat src/three/cameraPresets.ts src/three/cameraPresets.test.ts src/stores/uiStore.ts src/components/Toolbar.tsx src/App.tsx
   ```
   Only these 5 paths should show in the diff.

5. Phase 33 D-34 canonical-spacing compliance (Toolbar):
   ```
   ! grep -qE 'p-\[[0-9]+px\]|gap-\[[0-9]+px\]|rounded-\[[0-9]+px\]|m-\[[0-9]+px\]' src/components/Toolbar.tsx
   ```

6. No behavioral change yet — preset requests land in `pendingPresetRequest` but nothing consumes them. Clicking a preset button in 3D view will highlight the button (D-02) but the camera does NOT move. Plan 35-02 fixes that.

7. Manual visual check (non-blocking, informational):
   - `npm run dev -- --mode test`
   - Load any project, switch to 3D view
   - Observe 4-icon preset cluster right of the Walk/Orbit toggle
   - Click a preset button → highlight swaps, camera unchanged (expected — no tween yet)
   - Press `1` with focus outside inputs → same behavior
   - Click into RoomSettings width input, type `3` → no preset change (activeElement guard)
</verification>

<success_criteria>
- `src/three/cameraPresets.ts` exports `PresetId`, `CameraPose`, `PresetMeta`, `PRESETS`, `getPresetPose` with the 4 formulas from CAM-01 + D-05
- `src/three/cameraPresets.test.ts` has 6 passing Vitest tests including the D-05 literal baseline regression guard
- `uiStore` extended with `activePreset`, `pendingPresetRequest`, `setActivePreset`, `requestPreset`, `clearPendingPresetRequest` — existing `wallSideCameraTarget` path untouched
- `Toolbar.tsx` renders 4-button preset cluster with lucide icons (PersonStanding/MapIcon/Box/CornerDownRight), active-state highlight (`bg-accent/20 text-accent-light border-accent/30`), walk-mode disabled (D-01), only mounted when `viewMode ∈ {3d, split}` (D-03 at UI surface)
- `App.tsx` hotkey handler dispatches bare 1/2/3/4 through the full guard chain: activeElement (inherited), modifier-key skip, D-03 viewMode, D-01 walk-mode
- `data-testid={'preset-${id}'}` attributes on all 4 buttons for Plan 35-02 e2e selectors
- Phase 33 D-33 icon policy honored (only lucide for new icons; no new material-symbols-outlined)
- Phase 33 D-34 canonical-spacing compliance — zero arbitrary pixel values in Toolbar.tsx
- `npm test -- --run` exits 0 (no unit-test regression)
- `npx tsc --noEmit` exits 0
- D-05 locked: three-quarter preset returns literal `[halfW+15, 12, halfL+15]` / `[halfW, halfL/2, halfL]` — no geometric derivation
- Plan 35-02 can now wire the Scene-side tween consumer to `pendingPresetRequest` without touching any of the 5 files this plan modified (except ThreeViewport.tsx which this plan does NOT touch — Plan 35-02 owns it)
</success_criteria>

<output>
After completion, create `.planning/phases/35-camera-presets/35-01-SUMMARY.md` documenting:
- 5 files created/modified with line-count deltas
- Unit test outcomes (6/6 passing on cameraPresets.test.ts)
- PresetId type location decision (cameraPresets.ts — co-located with pose function per planner open-question resolution)
- Icon final pick (PersonStanding / MapIcon / Box / CornerDownRight — researcher recommendation accepted)
- Eye-level "looking toward room center" resolution (corner-stand at (0, 5.5, 0), centered-target; flagged for HUMAN-UAT)
- activePreset scope: cleared only by requestPreset (D-02 persist-across-drag); view-mode unmount does NOT clear (Risk 8 resolution per researcher)
- Confirmation that ThreeViewport.tsx and useReducedMotion.ts are untouched in this plan (Plan 35-02 owns them)
- Requirements coverage: CAM-01 bullets 1-3 of 3 (toolbar buttons, hotkeys, active indicator, activeElement guard) — structure in place; the `camera transitions to the correct pose` verification defers to Plan 35-02 e2e specs
- Handoff to Plan 35-02: uiStore.pendingPresetRequest contract (shape: `{ id: PresetId; seq: number } | null`; seq increments on every request)
</output>
