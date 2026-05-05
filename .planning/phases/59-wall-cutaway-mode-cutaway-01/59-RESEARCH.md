# Phase 59: Wall Cutaway Mode (CUTAWAY-01) — Research

**Researched:** 2026-05-04
**Domain:** Three.js / R3F per-frame state, material transparency, geometry sign conventions
**Confidence:** HIGH (5 of 6 questions answered with codebase precedent; Q5 answered against three.js OrbitControls source convention)

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** Detection: most-opposed-normal wall (per-wall `outwardNormal · cameraForward`, pick most-negative dot)
- **D-02** Detection frequency: per-frame via `useFrame` inside ThreeViewport
- **D-03** EXPLODE: per-room independent cutaway; SOLO: single visible room; NORMAL: active room only
- **D-04** Top-down auto-disable: polar angle from horizon > 70° (i.e., camera looking nearly straight down)
- **D-05** Manual hide: per-wall right-click toggle ("Hide in 3D" / "Show in 3D"). Stored in separate `cutawayManualWallIds: Set<string>` (NOT `hiddenIds`)
- **D-06** Toolbar UI: single cycling button (off ↔ auto). Manual is right-click only.
- **D-07** Ghost style: `transparent: true, opacity: 0.15, depthWrite: false`. Applied to ALL meshes inside WallMesh group.
- **D-08** Walk mode: cutaway disabled
- **D-09** State location: uiStore session-only (NO localStorage, NO snapshot persistence)
- **D-10** Tests: 4 unit + 3 component + 5 e2e
- **D-11** Atomic commits per task
- **D-12** Zero regressions (Phase 32/36/46/47/48/49/50/53/54/5.1)

### Claude's Discretion (research recommends)

The 6 open questions below.

### Deferred Ideas (OUT OF SCOPE)

- Cutaway in 2D, per-wall opacity slider, animated transitions, ceiling/floor cutaway, multi-wall auto-cutaway, distance-fade, camera-position memory.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CUTAWAY-01 | Auto-ghost wall closest to camera in 3D side views | Q1 (normal sign), Q2 (`useFrame` perf), Q3+Q4 (transparency without BUG-02), Q5 (polar threshold), Q6 (group-wide ghost application) |

## Summary

All six open questions have actionable answers grounded in the existing codebase. The two highest-risk areas are **(Q3/Q4) material transparency toggling** — Phase 49 BUG-02 burned us once, and the safe pattern is **constant `transparent: true` on a dedicated material ref + animated `opacity` only** — and **(Q1) outward normal sign** for non-convex (L-shaped) rooms — recommend the **walk-direction-perpendicular convention** (CCW polygon traversal) over centroid, because L-shape centroids can fall outside the room.

**Primary recommendation:** implement `getCutawayWallId(walls, camera, target)` in `src/three/cutawayDetection.ts` as a pure function returning `{ wallId, polarAngleRad }`. Pre-allocate three module-level scratch `THREE.Vector3` instances. In WallMesh, derive `isGhosted` via a single `useUIStore` selector and pass it down to a new `applyGhostMaterial()` helper that traverses the wall's group and writes `opacity` (only) on each `MeshStandardMaterial`. Walls already keep `transparent: true` at construction → no shader recompile, no BUG-02 risk.

## Question 1 — Outward Normal Sign Convention

**Recommendation: Use the room-centroid reference for v1.15, with a `wallCorners`-aware fallback for L-shaped rooms.**

**Confidence:** MEDIUM (centroid works for all currently-shipped rooms; L-shape edge case needs a fallback)

### Findings

- `WallSegment` has `start` + `end` only — **no stored normal** (verified `src/types/cad.ts:23-43`).
- `wallCorners()` (`src/lib/geometry.ts:45-58`) computes perpendicular as `angle + π/2` (CCW rotation). Returns `[startLeft, startRight, endRight, endLeft]` — "left" is `+perp`. This implies a sign convention exists in 2D rendering but isn't tied to "inside/outside the room."
- Rooms in this app are stored as a `Record<wallId, WallSegment>` (`RoomDoc.walls`) with no enforced traversal order. Walls are added via `addWall(start, end)` — **the traversal order is the order Jessica drew them**, not a guaranteed CCW polygon.
- For a rectangular room (4 walls), centroid = `(width/2, length/2)` and normal = `unit(midpoint - centroid)` works perfectly.
- For an L-shaped room, the polygon centroid can fall **outside** the polygon — meaning the "away from centroid" vector points the wrong way for one or two walls.

### Recommended approach

```ts
// src/three/cutawayDetection.ts
export function computeOutwardNormal(
  wall: WallSegment,
  roomCenter: { x: number; y: number },
): THREE.Vector3 {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6) return new THREE.Vector3(0, 0, 1);

  // Two candidate normals (perpendicular to wall direction, in XZ plane)
  // Three.js: 2D y → 3D z. Wall lies in XZ plane.
  const nx = -dy / len;
  const nz = dx / len;

  // Wall midpoint
  const mx = (wall.start.x + wall.end.x) / 2;
  const mz = (wall.start.y + wall.end.y) / 2;

  // Outward = the normal pointing AWAY from room center
  const toCenterX = roomCenter.x - mx;
  const toCenterZ = roomCenter.y - mz;
  const dot = nx * toCenterX + nz * toCenterZ;
  // If candidate points toward center (dot > 0), flip it
  return dot > 0
    ? new THREE.Vector3(-nx, 0, -nz)
    : new THREE.Vector3(nx, 0, nz);
}
```

**Room center** = bounding-box center of all wall endpoints (NOT polygon centroid):
```ts
const xs = walls.flatMap(w => [w.start.x, w.end.x]);
const zs = walls.flatMap(w => [w.start.y, w.end.y]);
const center = { x: (Math.min(...xs) + Math.max(...xs)) / 2,
                 y: (Math.min(...zs) + Math.max(...zs)) / 2 };
```

Bbox center is **always inside the bounding box** even for L-shapes. For an L-shape, bbox center may still sit just outside the polygon's notch, but for cutaway purposes the heuristic is robust enough — the misclassified wall would only affect the cutaway pick on rare orbit angles, and v1.15 has no L-shape rooms shipped. **Acceptable risk** per CONTEXT D-01: "if Jessica orbits to a corner where two walls face the camera nearly equally, the algorithm picks one. Acceptable."

### Risk / future-proofing

If/when L-shaped rooms ship, replace bbox center with **per-wall outside-test via ray-casting from the wall midpoint** (cast a ray along candidate normal; count polygon edge intersections; even = outside, odd = inside). Cheap and exact. Document this as a v1.16 follow-up.

### Sources

- `src/lib/geometry.ts:45-58` (wallCorners perpendicular convention)
- `src/types/cad.ts:23-43` (WallSegment shape)
- `src/three/RoomGroup.tsx:34-50` (room iteration order)

## Question 2 — `useFrame` Allocation Discipline

**Recommendation: Use module-level scratch Vector3 instances. Zero per-frame allocations.**

**Confidence:** HIGH

### Findings

- `ThreeViewport.tsx:378-423` uses `useFrame` for two camera tweens (wall-side + preset). **Allocations:** `wall-side branch reuses `cameraAnimTarget.current` (a ref) — no per-frame `new`. **Preset branch:** uses `lerpVectors` against pre-allocated `t.fromPos / t.toPos / t.fromTarget / t.toTarget` (created once at tween start, line 357-370). All Vector3 mutations use `.lerp()`, `.copy()`, `.lerpVectors()` — in-place.
- The pattern is "create scratch vectors at tween start, mutate in-place each frame, null out tween when done."

### Recommended approach for cutaway

```ts
// src/three/cutawayDetection.ts — module-level scratch
const _camForward = new THREE.Vector3();
const _wallNormal = new THREE.Vector3();
const _scratch = new THREE.Vector3();

export function getCutawayWallId(
  walls: WallSegment[],
  camera: THREE.Camera,
  roomCenter: { x: number; y: number },
  targetY: number,
): { wallId: string | null; polarAngleRad: number } {
  camera.getWorldDirection(_camForward);

  // Polar angle from world up: 0 = looking straight down, π/2 = horizon
  const polarAngleRad = Math.acos(
    THREE.MathUtils.clamp(
      -_camForward.y, // negate: getWorldDirection points where camera is LOOKING; up vs forward
      -1, 1,
    ),
  );
  // D-04: disable above 70° from horizon = polar < (90° - 70°) = 20° from straight-down.
  // Convention check below in Q5.
  if (polarAngleRad < (20 * Math.PI / 180)) {
    return { wallId: null, polarAngleRad };
  }

  let bestId: string | null = null;
  let bestDot = 0; // we want most-negative

  for (const wall of walls) {
    // mutate _wallNormal in-place via computeOutwardNormalInto(wall, roomCenter, _wallNormal)
    computeOutwardNormalInto(wall, roomCenter, _wallNormal);
    const dot = _wallNormal.dot(_camForward);
    if (dot < bestDot) {
      bestDot = dot;
      bestId = wall.id;
    }
  }
  return { wallId: bestId, polarAngleRad };
}
```

`computeOutwardNormalInto(wall, center, out)` writes into the `out` Vector3 — same pattern as `camera.getWorldDirection(_camForward)`. Zero allocations in the hot loop.

### Performance budget

- 6 rooms × 8 walls = 48 dot products per frame. Each is ~6 multiplies + 2 adds. Total: ~300 FLOPs per frame. Negligible at 60fps (18kFLOPs/s — many orders of magnitude under budget).

### Sources

- `src/three/ThreeViewport.tsx:378-423` (useFrame pattern, lerpVectors, in-place mutation)
- Three.js `Vector3` API: `.copy()`, `.lerp()`, `.lerpVectors()`, `.set()` all return `this` for chaining and mutate in-place.

## Question 3 — Material Transparent Toggle vs. Prop-Driven

**Recommendation: Constant `transparent: true` on a dedicated ghost-aware material; animate `opacity` only (1.0 → 0.15). NO `needsUpdate` write.**

**Confidence:** HIGH (Phase 49 BUG-02 root cause is documented; this approach sidesteps it entirely)

### Findings

- Phase 49 BUG-02 root cause (`src/three/WallMesh.tsx:175-203` + comment block lines 11-22): toggling `material.map = userTex` **after mount** without setting `material.needsUpdate = true` left the shader uniforms unbound — texture didn't render until forced refresh. Fix: gate the mesh on `tex !== null` so the material is constructed WITH the map slot already filled. Three.js compiles the shader on first render with the map slot known, so no recompile needed.
- The same shader-recompile trap applies to `transparent`: changing `transparent: false → true` post-mount triggers a shader recompile because the depth-write/blend mode pipeline differs. **Toggling `transparent` per frame is exactly the kind of post-mount mutation that caused BUG-02.**
- However, **changing `material.opacity` is just a uniform update** — no recompile, safe to mutate per frame, no `needsUpdate` required.

### Recommended pattern

In WallMesh, set `transparent: true, depthWrite: false` **at material construction** for all meshes that need to participate in cutaway:

```tsx
<meshStandardMaterial
  color={baseColor}
  roughness={0.85}
  metalness={0}
  side={THREE.DoubleSide}
  transparent={true}        // CONSTANT — never toggled
  opacity={isGhosted ? 0.15 : 1.0}  // R3F reconciles opacity via uniform; no recompile
  depthWrite={!isGhosted}   // see below
/>
```

**Caveat on `depthWrite`:** `depthWrite: false` does cause a different render pass. R3F handles this by re-sorting transparent meshes, but flipping `depthWrite` is a state change, not a shader recompile. Safe but slightly more expensive than `opacity`-only. Verified by three.js source: `depthWrite` is part of `WebGLRenderer` state, set per draw call, not baked into the shader program.

**Trade-off accepted:** all wall meshes always render in the transparent pass (slightly more sort cost, no visual change at `opacity: 1.0`). Cost is irrelevant at 48 walls.

### Alternative considered: refs + manual needsUpdate

Reject. We'd need `matRefBase`, `matRefWallpaperA`, `matRefWallpaperB`, `matRefWainscot`, `matRefCrown`, `matRefArt[]`, etc. — every overlay needs its own ref. Plus an effect that walks all refs on every cutaway change. Far more code, more BUG-02 risk surface area than necessary.

### Sources

- `src/three/WallMesh.tsx:11-22` (Phase 49 BUG-02 comment block)
- `src/three/WallMesh.tsx:175-203` (Phase 49 fix pattern: gate mesh on tex non-null)
- Three.js docs: `Material.opacity` is a `<float>` uniform; `Material.transparent` flag controls render pass + program selection.

## Question 4 — Phase 53 Menu Action Injection

**Recommendation: Add a 4th action to the wall branch of `getActionsForKind` directly in `src/components/CanvasContextMenu.tsx`. Reads `cutawayManualWallIds` from `useUIStore.getState()` for the label flip.**

**Confidence:** HIGH

### Findings

- `src/components/CanvasContextMenu.tsx:33-125` — `getActionsForKind(kind, nodeId)` is a single exported function with branches per kind. The wall branch (lines 85-91) currently returns `[...baseActions, copy, delete]`.
- The label-flip pattern is already in use: `isHidden = ui.hiddenIds.has(nodeId)` (line 76); label switches between `"Hide"` and `"Show"` (line 82). Same pattern works for cutaway-manual.
- Action shape:
  ```ts
  { id: string, label: string, icon: ReactNode, handler: () => void, destructive?: boolean }
  ```

### Recommended integration

```tsx
// inside getActionsForKind, kind === "wall" branch:
const isCutawayManual = nodeId ? ui.cutawayManualWallIds.has(nodeId) : false;

return [
  ...baseActions,
  { id: "copy",   label: "Copy",   icon: <Copy size={14} />,   handler: () => { copySelection(); } },
  {
    id: "cutaway-toggle",
    label: isCutawayManual ? "Show in 3D" : "Hide in 3D",
    icon: isCutawayManual ? <Eye size={14} /> : <EyeOff size={14} />,
    handler: () => { if (nodeId) ui.toggleCutawayManualWall(nodeId); },
  },
  { id: "delete", label: "Delete", icon: <Trash2 size={14} />, handler: () => { if (nodeId) store.removeWall(nodeId); }, destructive: true },
];
```

**Note on the "Hide" label collision** with the existing `baseActions[2]` ("Hide" / "Show" via `hiddenIds`): the existing action says **"Hide"** (everywhere — 2D + 3D + tree); the new action says **"Hide in 3D"** (only when cutaway mode is active). The "in 3D" suffix makes the distinction clear in plain English. Confirm this with Jessica during UAT.

### NEW file `src/lib/cutawayActions.ts`

CONTEXT.md §Files we expect to touch lists this as ~30 lines. Recommend it hold:
- The `isCutawayMode(): boolean` helper (`useUIStore.getState().cutawayMode === "auto"`)
- The `clearCutawayManualWalls()` side-effect when cutawayMode flips to off (called from uiStore action — but the helper lives in a lib file for testability)

This is **optional for v1.15** — if the logic is small enough, inlining into uiStore actions is cleaner. **Recommend NOT creating cutawayActions.ts unless the implementer finds shared logic emerging.**

### Sources

- `src/components/CanvasContextMenu.tsx:33-125` (getActionsForKind shape)
- `src/components/CanvasContextMenu.tsx:76-82` (label-flip pattern with hiddenIds)

### Note on path discrepancy with CONTEXT.md

CONTEXT.md §Files lists `src/canvas/CanvasContextMenu.tsx` (line 198). **The actual file is at `src/components/CanvasContextMenu.tsx`.** Planner should update the file list to `src/components/CanvasContextMenu.tsx`.

## Question 5 — Polar Angle Convention

**Recommendation: D-04 "70° from horizon" → cutaway-disable when `polarAngle < 0.349 rad` (i.e., `< 20°` from straight-down). Compute via `Math.acos(-cameraForward.y)` since `getWorldDirection()` returns the LOOKING direction.**

**Confidence:** HIGH (mapped to three.js OrbitControls convention)

### Findings

**three.js OrbitControls polar angle convention:**
- `polarAngle = 0` → camera at top, looking straight down (north pole)
- `polarAngle = π/2` → camera at horizon (equator)
- `polarAngle = π` → camera below scene, looking up (south pole)
- Source: three.js `OrbitControls.js` `getPolarAngle()` returns `spherical.phi`, which is the angle from positive Y-axis to the camera's offset from target.

**Mapping to D-04 "70° elevation from horizon":**
- "Elevation from horizon" = how high above the horizon the camera is.
- Camera at horizon = 0° elevation = polar π/2.
- Camera looking straight down (top-down) = 90° elevation = polar 0.
- "Above 70° elevation" = polar angle `< (π/2 - 70° in rad) = (π/2 - 1.222) = 0.349 rad` (≈ 20°).

**Threshold:** `polarAngle < (20 * Math.PI / 180) ≈ 0.349 rad` → cutaway off.

### Recommendation: compute from camera forward, not OrbitControls

ThreeViewport already calls `camera.getWorldDirection(...)` (precedent in ThreeViewport.tsx and Phase 35 reduced-motion path). `getWorldDirection` returns a unit vector pointing where the camera is LOOKING (negated z-axis in camera space).

```ts
// _camForward = direction camera is LOOKING (e.g. straight-down camera → forward.y = -1)
camera.getWorldDirection(_camForward);
// Elevation above horizon:
//   forward.y = 0   → looking horizontal → elevation 0
//   forward.y = -1  → looking straight down → elevation π/2
const elevationRad = Math.asin(-_camForward.y);
// Disable cutaway when elevation > 70° (looking nearly straight down)
const SEVENTY_DEG = 70 * Math.PI / 180; // 1.222 rad
if (elevationRad > SEVENTY_DEG) return { wallId: null, polarAngleRad: Math.PI/2 - elevationRad };
```

**Why elevation, not polar:** the math is more readable for the planner and matches the user-facing "looking down vs. looking forward" intuition. Equivalent threshold; just inverted reference axis.

**Alternative:** read directly from OrbitControls via a ref: `orbitControlsRef.current.getPolarAngle()`. Equivalent result, but couples cutaway to OrbitControls (won't work in walk mode — already disabled per D-08, so this is fine). Recommend `getWorldDirection` for consistency with ThreeViewport precedents and to avoid threading the OrbitControls ref into a pure helper.

### Sources

- three.js source: `examples/jsm/controls/OrbitControls.js` `getPolarAngle()` returns `spherical.phi`.
- three.js docs: `Spherical.phi` is "polar angle in radians from the y (up) axis".
- `src/three/ThreeViewport.tsx:380-388` (precedent for camera.getWorldDirection-style usage in useFrame).

## Question 6 — WallMesh Ghost Application: Root-Group vs. Per-Mesh

**Recommendation: Pass `isGhosted: boolean` as a prop, then thread it to every `<meshStandardMaterial>` opacity uniform via `opacity={isGhosted ? 0.15 : 1.0}`. NO group-level traversal, NO toggling `transparent`.**

**Confidence:** HIGH

### Findings

- WallMesh renders 1 base mesh + 2 wallpaper overlays (A/B) + variable wainscot/crown/wallart meshes per side. All use `<meshStandardMaterial>`. None use refs except `matRefA`/`matRefB` (Phase 49 test-mode registry).
- Option C (root-group traversal) was rejected by Phase 49 lessons — post-mount material mutation = BUG-02 risk.
- Option B (binary `group.visible`) doesn't satisfy D-07 (must be GHOSTED at 0.15 opacity, not hidden — REQUIREMENTS lock).
- Option A (prop-thread) is the only safe option.

### Recommended pattern

```tsx
// WallMesh.tsx
const isAutoGhosted = useUIStore((s) => s.cutawayAutoDetectedWallId === wall.id);
const isManualGhosted = useUIStore((s) => s.cutawayManualWallIds.has(wall.id));
const cutawayMode = useUIStore((s) => s.cutawayMode);
const isGhosted = isManualGhosted || (cutawayMode === "auto" && isAutoGhosted);

const opacity = isGhosted ? 0.15 : 1.0;
const depthWrite = !isGhosted;
const transparent = true; // ALWAYS true — see Q3
```

Then pass `opacity` + `transparent` + `depthWrite` to every `<meshStandardMaterial>` in the WallMesh subtree:
- Base wall (line 401-406)
- `renderWallpaperOverlay` user-tex branch (line 193-200)
- `renderWallpaperOverlay` paint branch (line 212-217)
- `renderWallpaperOverlay` pattern/color branch (line 239-244)
- `renderSideDecor` wainscot (via `renderWainscotStyle`)
- `renderSideDecor` crown (line 296-300)
- `renderSideDecor` art branches (lines 330, 335, 351, 356, 361, 365, 369, 373)

**Implementation note:** rather than thread `opacity/transparent/depthWrite` through every existing call site, add a single `<group>` wrapper trick — **but this DOESN'T WORK for materials** because group-level transformations only affect transforms, not material uniforms.

**Recommended:** create a small helper

```ts
// src/three/wallMaterialDefaults.ts
export interface GhostMaterialProps {
  transparent: true;
  opacity: number;
  depthWrite: boolean;
}
export function ghostMaterialProps(isGhosted: boolean): GhostMaterialProps {
  return {
    transparent: true,
    opacity: isGhosted ? 0.15 : 1.0,
    depthWrite: !isGhosted,
  };
}
```

And spread it on every `<meshStandardMaterial>` in WallMesh:
```tsx
<meshStandardMaterial color={...} {...ghostMaterialProps(isGhosted)} />
```

This adds ~9 spread sites to WallMesh.tsx but keeps the cutaway logic localized and testable (the helper is a 4-line pure function with trivial unit tests).

### Risk: wainscot styles render via `renderWainscotStyle()`

`src/three/wainscotStyles.tsx` builds wainscot meshes externally. `ghostMaterialProps` must be passed through. Two options:
- **A:** add `ghostProps?: GhostMaterialProps` parameter to `renderWainscotStyle` signature
- **B:** wrap the wainscot return in a transparency-aware wrapper

Recommend **A** — explicit, type-safe, testable. Planner should add this as a sub-task.

### Sources

- `src/three/WallMesh.tsx:401-406` (base wall material)
- `src/three/WallMesh.tsx:193-244` (wallpaper material sites)
- `src/three/WallMesh.tsx:296-373` (decor material sites)

## Recommended Implementation Approach

```
Task 1 — uiStore extensions
  Add: cutawayMode, cutawayAutoDetectedWallId, cutawayManualWallIds
  Add actions: setCutawayMode, setCutawayAutoDetectedWall, toggleCutawayManualWall, clearCutawayManualWalls
  setCutawayMode("off") side-effect: clearCutawayManualWalls()
  Tests: unit/uiStore.cutaway.test.ts

Task 2 — Pure detection helper
  src/three/cutawayDetection.ts
    - computeOutwardNormalInto(wall, roomCenter, outVec3)
    - computeRoomCenter(walls): {x,y}  (bbox center)
    - getCutawayWallId(walls, camera, roomCenter): {wallId, elevationRad}
  Module-level scratch Vector3s
  Tests: unit/cutawayDetection.test.ts (4 tests per D-10)

Task 3 — ThreeViewport useFrame integration
  Add cutawayMode + cameraMode + viewMode gates inside the existing useFrame
  Per-room loop in EXPLODE; single active room in NORMAL/SOLO
  Write to uiStore.cutawayAutoDetectedWallId only when value CHANGED (avoid spurious renders)

Task 4 — WallMesh ghost rendering
  Add isGhosted derivation
  Add ghostMaterialProps helper
  Spread on all 9 material sites
  Update renderWainscotStyle signature

Task 5 — Toolbar button
  Mirror Phase 47 displayMode active-state styling
  lucide EyeOff icon
  Click cycles off ↔ auto

Task 6 — Context menu integration
  Add wall-branch action in src/components/CanvasContextMenu.tsx
  Label-flip on cutawayManualWallIds.has(wallId)

Task 7 — Test drivers + e2e
  src/test-utils/cutawayDrivers.ts
  e2e/wall-cutaway.spec.ts (5 scenarios)
```

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | Vitest 1.x (existing) + Playwright 1.x (existing) |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npm run test:unit -- cutaway` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Command | Wave 0? |
|-----|----------|-----------|---------|---------|
| CUTAWAY-01 | most-opposed normal pick | unit | `vitest run cutawayDetection` | new file ❌ |
| CUTAWAY-01 | polar > 70° → null | unit | `vitest run cutawayDetection` | new file ❌ |
| CUTAWAY-01 | manual set toggle | unit | `vitest run uiStore.cutaway` | new file ❌ |
| CUTAWAY-01 | clear empties set | unit | `vitest run uiStore.cutaway` | new file ❌ |
| CUTAWAY-01 | WallMesh ghosted on auto match | component | `vitest run WallMesh.cutaway` | new file ❌ |
| CUTAWAY-01 | WallMesh ghosted on manual match | component | `vitest run WallMesh.cutaway` | new file ❌ |
| CUTAWAY-01 | WallMesh normal otherwise | component | `vitest run WallMesh.cutaway` | new file ❌ |
| CUTAWAY-01 | toolbar cycles off ↔ auto | e2e | `playwright test wall-cutaway` | new file ❌ |
| CUTAWAY-01 | orbit ghosts nearest wall | e2e | `playwright test wall-cutaway` | new file ❌ |
| CUTAWAY-01 | right-click hides | e2e | `playwright test wall-cutaway` | new file ❌ |
| CUTAWAY-01 | top-down disables | e2e | `playwright test wall-cutaway` | new file ❌ |
| CUTAWAY-01 | walk mode disables | e2e | `playwright test wall-cutaway` | new file ❌ |

### Wave 0 Gaps

- [ ] `src/test-utils/cutawayDrivers.ts` — `__getCutawayWallId`, `__driveSetCutawayMode`, `__getMaterialOpacity(wallId)` for component + e2e
- [ ] `tests/three/cutawayDetection.test.ts`
- [ ] `tests/components/WallMesh.cutaway.test.tsx`
- [ ] `tests/stores/uiStore.cutaway.test.ts`
- [ ] `e2e/wall-cutaway.spec.ts`

## Risks / Assumptions

1. **L-shaped rooms not yet shipped** — bbox-center heuristic for outward normals works for current rectangular rooms. Document as v1.16 follow-up if/when L-shaped rooms ship.
2. **`renderWainscotStyle` signature change** — adding `ghostProps?` parameter is a non-breaking optional addition. Verify no other callers exist.
3. **Material spread sites** — 9 spread sites in WallMesh.tsx. Easy to miss one during implementation; recommend a quick audit (`grep -c meshStandardMaterial src/three/WallMesh.tsx`) at task close.
4. **VIZ-10 dispose contract** — `transparent: true` doesn't change texture lifecycle. The Phase 36 dispose={null} guards on wallpaper textures are unaffected.
5. **EXPLODE per-room camera ref** — in EXPLODE mode, the same world camera is shared across all rooms. The cutaway helper must be called per-room with the SAME camera but the ROOM-LOCAL center adjusted by the room's offsetX. Planner: pass `roomCenter` already-offset (centerX += offsetX) so dot products work correctly.
6. **Active-room semantics in NORMAL** — D-03 says "active room only" in NORMAL. ThreeViewport's `activeRoomId` is the canonical source. In NORMAL mode iterate ONLY the active room.

## Sources

### Primary (HIGH)

- `src/three/WallMesh.tsx:1-422` (Phase 49 BUG-02 lessons, material site inventory)
- `src/three/RoomGroup.tsx:1-151` (Phase 47 displayMode + offsetX pattern)
- `src/three/ThreeViewport.tsx:1-100, 350-423` (useFrame allocation discipline)
- `src/components/CanvasContextMenu.tsx:1-220` (Phase 53 action registry)
- `src/components/Toolbar.tsx:60-212` (Phase 47 displayMode button styling)
- `src/stores/uiStore.ts:1-323` (state field conventions, hiddenIds Set patterns)
- `src/lib/geometry.ts:1-237` (wall geometry helpers, sign conventions)
- `src/types/cad.ts:1-100` (WallSegment shape — no stored normal field)

### Secondary (MEDIUM)

- three.js OrbitControls source: `getPolarAngle()` → `spherical.phi` (polar from positive Y axis). Cross-verified with three.js Spherical class docs.

## Metadata

**Confidence breakdown:**
- Q1 outward normal: MEDIUM — bbox-center heuristic acceptable for current rooms, L-shape needs followup
- Q2 useFrame allocation: HIGH — codebase precedent in Phase 35 reduced-motion path
- Q3 transparent toggle: HIGH — Phase 49 BUG-02 root cause documented; opacity-only pattern is shader-recompile-free
- Q4 menu integration: HIGH — Phase 53 action registry is straightforward; label-flip precedent in `hiddenIds` action
- Q5 polar angle: HIGH — three.js convention well-documented
- Q6 ghost application: HIGH — prop-thread is the only BUG-02-safe option

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable codebase area; only invalidated by major three.js or R3F upgrade)
