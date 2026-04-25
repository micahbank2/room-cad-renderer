---
phase: 35-camera-presets
plan: 01
subsystem: camera-ui
tags: [camera, presets, ui, structure, cam-01]
dependency-graph:
  requires:
    - src/stores/uiStore.ts (existing wallSideCameraTarget bridge pattern)
    - src/components/Toolbar.tsx (existing camera-mode toggle placement)
    - src/App.tsx (existing keydown handler + activeElement guard)
    - lucide-react@^1.8.0 (already installed)
  provides:
    - PresetId type + PRESETS metadata array + getPresetPose() pure function (src/three/cameraPresets.ts)
    - uiStore.activePreset state (D-02 active-button highlight source)
    - uiStore.pendingPresetRequest bridge (Plan 35-02 Scene tween consumes)
    - uiStore.requestPreset() combined-write action (hotkey + Toolbar + future test driver)
    - Toolbar 4-button preset cluster (data-testid=preset-{id} selectors for Plan 35-02 e2e)
    - 1/2/3/4 hotkey dispatch with full guard chain (App.tsx)
  affects:
    - vitest.config.ts (include globs extended to pick up src/**/*.test.ts)
tech-stack:
  added:
    - lucide-react icons in Toolbar (PersonStanding / MapIcon / Box / CornerDownRight)
  patterns:
    - wallSideCameraTarget-mirror bridge: {id, seq} pattern + combined requestPreset writes both activePreset + pendingPresetRequest
    - single-source-of-truth PRESETS array drives Toolbar render + App.tsx hotkey match
    - Colocated unit test (src/three/cameraPresets.test.ts) — vitest include extended
key-files:
  created:
    - src/three/cameraPresets.ts
    - src/three/cameraPresets.test.ts
    - .planning/phases/35-camera-presets/35-01-structure-SUMMARY.md
  modified:
    - src/stores/uiStore.ts
    - src/components/Toolbar.tsx
    - src/App.tsx
    - vitest.config.ts
decisions:
  - PresetId co-located in src/three/cameraPresets.ts (not src/types/cad.ts) — keeps preset metadata + pose math + type together; uiStore imports via type-only import
  - Eye-level resolution: corner-stand at (0, 5.5, 0) + centered target — concrete interpretation of CAM-01's "looking toward room center"; FLAGGED FOR HUMAN-UAT
  - Icon picks: PersonStanding (not User) for eye-level, MapIcon alias to avoid shadowing JS Map, Box, CornerDownRight — researcher recommendation accepted verbatim
  - activePreset scope: set by requestPreset, NEVER cleared by view-mode unmount — D-02 indicator persists on 3D re-entry (Risk 8 resolution)
  - vitest.config.ts include extended to allow colocated src/**/*.test.ts — Rule 3 blocking fix; plan explicitly specified src/three/cameraPresets.test.ts path
metrics:
  duration: ~18 min
  completed: 2026-04-24
---

# Phase 35 Plan 01: Structure Summary

**CAM-01 scaffolding + UI surface + input dispatch — zero motion.** All wiring for preset requests lands here. Preset dispatch flows: Toolbar button click OR `1/2/3/4` bare key → `useUIStore.requestPreset(id)` → writes `activePreset` (immediate highlight) + `pendingPresetRequest` (Plan 35-02's Scene-side tween consumer, not yet built). Camera does NOT move yet — that's Plan 35-02.

## What Shipped

### 1. `src/three/cameraPresets.ts` (new, 87 lines)

Pure preset-pose module. Single source of truth for preset metadata and math.

- `type PresetId = "eye-level" | "top-down" | "three-quarter" | "corner"`
- `type CameraPose = { position: [x,y,z]; target: [x,y,z] }`
- `type PresetMeta = { id, key: "1"|"2"|"3"|"4", label, iconName }`
- `const PRESETS: readonly PresetMeta[]` — iterated by Toolbar + matched by App.tsx hotkey handler
- `function getPresetPose(presetId, room): CameraPose` — exhaustive switch over PresetId, no default branch (TS catches drift)

Pose formulas:

| Preset | Position | Target |
|---|---|---|
| eye-level | `[0, 5.5, 0]` | `[halfW, 5.5, halfL]` |
| top-down | `[halfW, 1.5 × max(w,l), halfL]` | `[halfW, 0, halfL]` |
| three-quarter | `[halfW + 15, 12, halfL + 15]` | `[halfW, halfL/2, halfL]` |
| corner | `[width, H - 0.5, length]` | `[0, H - 0.5, 0]` |

**D-05 lock:** three-quarter is the LITERAL v1.7.5 baseline — no geometric derivation. JSDoc cross-references `.planning/phases/35-camera-presets/35-CONTEXT.md §D-05`. The test at line 7 asserts `position === [25, 12, 23]` + `target === [10, 4, 8]` for a 20×16×8 room — refactor breaks this immediately.

### 2. `src/three/cameraPresets.test.ts` (new, 78 lines, 6/6 passing)

1. **D-05 regression guard** — three-quarter returns exactly `[25, 12, 23]` / `[10, 4, 8]` for 20×16×8 room
2. Eye-level Y = 5.5 for 3 varied room shapes (both position[1] and target[1])
3. Top-down position[1] = 1.5 × max(width, length) across 3 cases including non-square rooms
4. Top-down target[1] === 0 (looking straight down) across 3 rooms
5. Corner returns `[20, 7.5, 16]` / `[0, 7.5, 0]` for 20×16×8 room
6. Exhaustive ID handling — every PresetId returns 6 finite numbers; no NaN, no throw

Run via `npx vitest run src/three/cameraPresets.test.ts` → `Tests 6 passed (6)`.

### 3. `src/stores/uiStore.ts` (+31 lines)

- **Import:** `import type { PresetId } from "@/three/cameraPresets"` (type-only)
- **State:** `activePreset: PresetId | null` (D-02 indicator source), `pendingPresetRequest: { id: PresetId; seq: number } | null` (mirror of `wallSideCameraTarget` shape)
- **Actions:** `setActivePreset(preset)`, `requestPreset(id)` (combined write: sets both activePreset + pendingPresetRequest, seq increments), `clearPendingPresetRequest()`
- **Additive only** — `wallSideCameraTarget`, `focusWallSide`, `clearWallSideCameraTarget`, `toggleCameraMode`, `cameraMode` untouched

### 4. `src/components/Toolbar.tsx` (+60 lines)

- **Imports:** `PRESETS, PresetId` from `@/three/cameraPresets`; lucide icons `PersonStanding, Map as MapIcon, Box, CornerDownRight, LucideIcon`
- **PRESET_ICONS map** at module scope: `Record<PresetId, LucideIcon>`
- **New subscriptions in component:** `activePreset`, `requestPreset`
- **Render:** 4-button cluster immediately right of the camera-mode toggle (D-06 placement), gated on `viewMode === "3d" || viewMode === "split"` (D-03 at UI surface)
- **Per-button:** `data-testid={preset-${id}}` (Plan 35-02 e2e stable selectors), `aria-pressed={isActive}`, `aria-label={label}`, walk-mode disabled + dimmed (D-01)
- **Active state class triad** (matches CAM-01 acceptance verbatim): `bg-accent/20 text-accent-light border border-accent/30`
- **Inactive:** `text-text-dim hover:text-accent-light border border-transparent`
- **Walk-mode tooltip swap:** "Exit walk mode to use presets" vs preset label
- **D-34 spacing compliance:** only `gap-1`, `mr-6`, `p-1`, `rounded-sm`, `opacity-40`, `border-transparent` — zero arbitrary pixel values (verified by `! grep -qE 'p-\[[0-9]+px\]|gap-\[[0-9]+px\]|rounded-\[[0-9]+px\]|m-\[[0-9]+px\]'`)
- **D-33 honored:** no new material-symbols-outlined imports

### 5. `src/App.tsx` (+18 lines)

- **Import:** `import { PRESETS } from "@/three/cameraPresets"`
- **Hotkey block** inserted after the existing `'e' → toggleCameraMode` dispatch
- **Guard chain (in order):**
  1. `PRESETS.find((p) => p.key === e.key)` — single-source-of-truth match; no hardcoded `{"1": "eye-level"...}` map (Risk 7 guard)
  2. Modifier-key skip: `e.ctrlKey || e.metaKey || e.altKey || e.shiftKey → return` (Ctrl+1 / Cmd+1 are browser tab switches)
  3. D-03: `viewMode !== "3d" && viewMode !== "split" → return`
  4. D-01: `useUIStore.getState().cameraMode === "walk" → return`
  5. activeElement inherited from existing lines 133-137 — INPUT/TEXTAREA/SELECT skip
- **Dispatch:** `useUIStore.getState().requestPreset(presetMeta.id); e.preventDefault()`
- **Deps array:** `[setTool, viewMode]` already contains viewMode; cameraMode read imperatively via `getState()` so no dep-array change

### 6. `vitest.config.ts` (+4/-1 lines)

Extended `include` globs to pick up colocated `src/**/*.test.ts`. Plan explicitly specifies `src/three/cameraPresets.test.ts` — vitest previously only scanned `tests/**` and `src/__tests__/**`. Rule 3 auto-fix: without this, the unit test file exists but never runs.

## Verification Results

| Check | Result |
|---|---|
| `npx vitest run src/three/cameraPresets.test.ts` | 6 passed (6) |
| `npx tsc --noEmit` | Clean (only pre-existing TS6.0 `baseUrl` deprecation warning) |
| `npm test -- --run` | 536 passed, 6 failed (3 todo) |
| `npm run build` | Built in 377ms |
| Toolbar zero-arbitrary-values (D-34) | PASS (no `p-[Npx]` / `gap-[Npx]` / `rounded-[Npx]` / `m-[Npx]`) |
| No new material-symbols-outlined imports (D-33) | PASS |

**Pre-existing failures (6 total, confirmed unrelated via `git stash` rerun):**
- `tests/AddProductModal.test.tsx` — 3 failures (LIB-04 "SKIP_DIMENSIONS" markup mismatch)
- `tests/SidebarProductPicker.test.tsx` — 2 failures (LIB-05 filter + dragstart)
- `tests/productStore.test.ts` — 1 failure (LIB-03 load-race guard)

None introduced by this plan. Carried forward as pre-existing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended vitest include globs to pick up colocated tests**
- **Found during:** Task 1 (before first test run)
- **Issue:** Plan specifies `src/three/cameraPresets.test.ts` (colocated), but `vitest.config.ts` `include` only scanned `tests/**` and `src/__tests__/**`. Test file would exist but never run → acceptance criterion "`npx vitest run src/three/cameraPresets.test.ts` exits 0 with 6/6 passing" would have reported 0 test files found.
- **Fix:** Added `"src/**/*.{test,spec}.{ts,tsx}"` as a third include pattern. No existing tests moved; purely additive.
- **Files modified:** `vitest.config.ts` (1 line changed to multi-line array)
- **Commit:** bfcce21 (bundled with Task 1 since the test file needed it to be discoverable)

No other deviations. Plan executed exactly as written otherwise.

## Key Open Questions → Resolutions

- **PresetId location** — co-located in `src/three/cameraPresets.ts` next to `getPresetPose` (not `src/types/cad.ts`). Rationale: preset math + metadata + type are one concept; uiStore imports via `import type` so there's zero runtime coupling to the Three.js subtree.
- **Eye-level framing** — corner-stand at `(0, 5.5, 0)` + centered target. FLAGGED FOR HUMAN-UAT — Jessica may prefer facing the longest wall or the door. Revisit if human review requests different framing; JSDoc on `getPresetPose` case "eye-level" carries the flag.
- **Icon final picks** — PersonStanding / MapIcon / Box / CornerDownRight (researcher recommendation accepted). `Map` aliased to `MapIcon` to avoid shadowing the JS global `Map` constructor.
- **activePreset scope on view-mode change** — KEEP activePreset in uiStore across 3D↔2D unmount so the indicator is correct on re-entry. `pendingPresetRequest` is the tween bridge; clearing it is Plan 35-02 Scene-side logic. Research §9 Risk 8 resolution.
- **Damping toggle / tween cancel / reduced-motion** — NOT in scope. Plan 35-02 owns all three.

## Requirements Coverage (CAM-01)

| Bullet | Status | Where |
|---|---|---|
| 4 toolbar buttons render in Toolbar | ✅ | Toolbar.tsx — 4 buttons with lucide icons |
| Hotkeys 1/2/3/4 dispatch from App.tsx | ✅ | App.tsx — PRESETS.find match + full guard chain |
| Active-preset indicator class triad | ✅ | Toolbar.tsx — `bg-accent/20 text-accent-light border-accent/30` on isActive |
| activeElement guard (INPUT/TEXTAREA/SELECT) | ✅ | Inherited from App.tsx:133-137 (pre-existing) |
| Camera transitions to correct pose | ⏭️ | Plan 35-02 (this plan only STRUCTURE; no motion) |

## Handoff to Plan 35-02

**Contract: `uiStore.pendingPresetRequest`**

```typescript
pendingPresetRequest: { id: PresetId; seq: number } | null;
```

- Set by `requestPreset(id)` — seq increments `(s.pendingPresetRequest?.seq ?? 0) + 1` so back-to-back same-id requests re-fire the Scene useEffect.
- Read by: Plan 35-02 Scene component via `useUIStore((s) => s.pendingPresetRequest)` with a useEffect watching the ref, translating into `presetTween.current = {...}` at Scene.
- Cleared by: Plan 35-02 Scene via `useUIStore.getState().clearPendingPresetRequest()` after consuming.

**Untouched by this plan (Plan 35-02 owns):**
- `src/three/ThreeViewport.tsx` — Scene useEffect + `presetTween` ref + `useFrame` tween body + damping toggle
- `src/hooks/useReducedMotion.ts` — D-04 snap-instead-of-tween integration
- Test drivers: `window.__applyCameraPreset`, `window.__getActivePreset`, `window.__getCameraPose`
- E2E specs: `preset-toolbar-and-hotkeys`, `preset-active-element-guard`, `preset-mid-tween-cancel`, `preset-view-mode-cleanup`, `preset-no-history-no-autosave`

**Plan 35-02 can wire the Scene-side tween consumer to `pendingPresetRequest` without touching any of the 5 files this plan modified.**

## Commits

| Task | Hash | Message |
|---|---|---|
| 1 | bfcce21 | feat(35-01): add cameraPresets pure module + unit tests |
| 2 | 4c059b7 | feat(35-01): add activePreset + pendingPresetRequest bridge to uiStore |
| 3 | 4329047 | feat(35-01): add camera preset cluster to Toolbar (4 lucide buttons) |
| 4 | 5b11775 | feat(35-01): wire 1/2/3/4 preset hotkeys with full guard chain |

## Self-Check: PASSED

- [x] `src/three/cameraPresets.ts` exists
- [x] `src/three/cameraPresets.test.ts` exists (6/6 passing)
- [x] `src/stores/uiStore.ts` has activePreset + pendingPresetRequest + requestPreset
- [x] `src/components/Toolbar.tsx` renders 4-button cluster with lucide icons + data-testid
- [x] `src/App.tsx` dispatches 1/2/3/4 via PRESETS.find with full guard chain
- [x] All 4 commits present in `git log --oneline -4`
