---
phase: 59-wall-cutaway-mode-cutaway-01
type: validation
requirements: [CUTAWAY-01]
created: 2026-05-05
---

# Phase 59: Validation Map — CUTAWAY-01

Maps every acceptance criterion in REQUIREMENTS.md `CUTAWAY-01` and every locked decision in 59-CONTEXT.md to its test path. Per CONTEXT D-10: 4 unit + 3 component + 5 e2e = 12 tests total.

---

## Requirement: CUTAWAY-01

> In 3D, the user can see the room interior from any camera angle. The wall closest to the camera (or any user-specified wall) becomes ghosted or invisible so it doesn't block the view. Standard CAD cutaway pattern.

> **Acceptance:** New `cutawayMode` UI store flag. Auto-mode raycasts (dot-product in our implementation per D-01) from camera each frame to find the nearest blocking wall (R3F `useFrame` hook). Manual mode: per-wall context-menu action "Hide wall in 3D" (Phase 53 menu integration). Ghosted walls render at 0.15 opacity with `transparent: true` and `depthWrite: false`. Cutaway respects Phase 46 hiddenIds (already-hidden walls stay hidden). Cutaway state is session-only.

---

## Unit Tests (4) — Vitest

### File: `tests/stores/uiStore.cutaway.test.ts`

Run: `npx vitest run tests/stores/uiStore.cutaway.test.ts`

| ID | Description | Assertion | Decision Coverage |
|----|-------------|-----------|-------------------|
| U3 | `toggleCutawayManualWall(wallId)` adds wall when absent, removes when present | `expect(useUIStore.getState().cutawayManualWallIds.has('wall_a')).toBe(true)` after first call; `false` after second | D-05, D-09 |
| U4 | `clearCutawayManualWalls()` empties the Set | `expect(useUIStore.getState().cutawayManualWallIds.size).toBe(0)` after clear | D-05, D-09 |
| (supporting) | `setCutawayMode('off')` clears `cutawayManualWallIds` as side-effect | After `toggleCutawayManualWall('wall_a')` then `setCutawayMode('off')`: `cutawayManualWallIds.size === 0` | D-05 ("Clear-all is implicit") |
| (supporting) | `setCutawayAutoDetectedWall(roomId, wallId)` writes Map entry | `expect(state.cutawayAutoDetectedWallId.get('room_1')).toBe('wall_a')` | DEVIATION from D-09 (Map vs string) |

### File: `tests/three/cutawayDetection.test.ts`

Run: `npx vitest run tests/three/cutawayDetection.test.ts`

| ID | Description | Setup | Assertion | Decision Coverage |
|----|-------------|-------|-----------|-------------------|
| U1 | Most-opposed-normal wall returned for canonical 4-wall rectangle | 10×10 axis-aligned room (4 walls); `THREE.PerspectiveCamera` at `(0, 5, 20)` with `lookAt(0, 5, 0)` | `expect(getCutawayWallId(walls, camera, {x:5,y:5}, 0).wallId).toBe(plusZWallId)` | D-01, D-02, Q1, Q2 |
| U2 | Top-down (elevation > 70°) returns `wallId: null` | Same room; camera at `(0, 100, 0.1)` looking at origin | `expect(result.wallId).toBeNull()`; `expect(result.elevationRad).toBeGreaterThan(1.222)` | D-04, Q5 |
| (supporting) | Empty walls array returns null | `getCutawayWallId([], camera, {x:0,y:0})` | `expect(result.wallId).toBeNull()` | D-01 |
| (supporting) | All walls behind camera returns null | Camera positioned outside room facing away | `expect(result.wallId).toBeNull()` (no wall has negative dot) | D-01 |

### Allocation discipline check (not a unit test — file audit at Task 2 close)

```bash
grep -c "new THREE.Vector3" src/three/cutawayDetection.ts
# Expected output: 3   (module-level _cameraForward, _wallNormal, _wallCenter only)
```

---

## Component Tests (3) — Vitest + R3F test renderer

### File: `tests/components/WallMesh.cutaway.test.tsx`

Run: `npx vitest run tests/components/WallMesh.cutaway.test.tsx`

| ID | Description | Setup | Assertion | Decision Coverage |
|----|-------------|-------|-----------|-------------------|
| C1 | Auto-ghosted: `cutawayAutoDetectedWallId.get(roomId)===wall.id` AND `cutawayMode==='auto'` → opacity 0.15, transparent true, depthWrite false on base material | Mount WallMesh with wall `{id: 'w1'}`, set `cutawayMode='auto'` and `setCutawayAutoDetectedWall('r1','w1')` | Read base material from test-mode registry: `expect(mat.opacity).toBe(0.15); expect(mat.transparent).toBe(true); expect(mat.depthWrite).toBe(false)` | D-07, Q3, Q6 |
| C2 | Manual-ghosted: `cutawayManualWallIds.has(wall.id)` → same material props regardless of cutawayMode | Mount with `cutawayMode='off'` then `toggleCutawayManualWall('w1')` | Same assertions as C1 | D-05, D-07 |
| C3 | Normal: neither auto nor manual matching → opacity 1.0, transparent true, depthWrite true | Default mount, no cutaway state | `expect(mat.opacity).toBe(1.0); expect(mat.transparent).toBe(true); expect(mat.depthWrite).toBe(true)` | D-07 (constant transparent: true even when not ghosted), Q3 |

### Spread-site audit (not a unit test — at Task 4 close)

```bash
grep -c "meshStandardMaterial" src/three/WallMesh.tsx
# Compare to count of {...ghost} occurrences:
grep -c "{\\.\\.\\.ghost}" src/three/WallMesh.tsx
# These two counts MUST be equal (every material site has the spread).

grep "needsUpdate" src/three/WallMesh.tsx src/three/wainscotStyles.tsx
# Expected: zero matches (Phase 49 BUG-02 fix preserved — no material.needsUpdate writes)
```

---

## E2E Tests (5) — Playwright

### File: `e2e/wall-cutaway.spec.ts`

Run: `npx playwright test e2e/wall-cutaway.spec.ts --reporter=list`

Driver dependencies (`src/test-utils/cutawayDrivers.ts`):
- `window.__driveSetCutawayMode(mode)` — sets cutawayMode in uiStore
- `window.__getCutawayWallId(roomId)` — reads `cutawayAutoDetectedWallId.get(roomId)`
- `window.__getMaterialOpacity(wallId)` — reads from WallMesh test-mode registry
- `window.__toggleCutawayManualWall(wallId)` — toggles Set membership
- `window.__setCameraTransform(pos, target)` — drives OrbitControls camera (reuse Phase 48 driver if present)

| ID | Description | Steps | Assertion | Decision Coverage |
|----|-------------|-------|-----------|-------------------|
| E1 | Toolbar Cutaway button cycles off → auto → off; active state has accent class | 1. Open app. 2. Locate `[aria-label="Toggle wall cutaway"]`. 3. Read aria-pressed. 4. Click. 5. Read aria-pressed + className. 6. Click. 7. Read again | Step 3: `aria-pressed='false'`. Step 5: `aria-pressed='true'` AND className contains `bg-accent/10`. Step 7: `aria-pressed='false'` | D-06 |
| E2 | In auto-mode 3D, orbit ghosts wall closest to camera | 1. Load fixture room (10×10 single rectangle). 2. Switch viewMode to 3d. 3. Click Cutaway → auto. 4. `__setCameraTransform({x:0,y:5,z:20}, {x:0,y:5,z:0})`. 5. Wait one frame (`page.waitForTimeout(50)`). 6. Read `__getCutawayWallId(activeRoomId)`. 7. `__setCameraTransform({x:-20,y:5,z:0}, {x:0,y:5,z:0})`. 8. Wait. 9. Read again | Step 6: returns +Z wall id. Step 9: returns -X wall id (different from step 6) | D-01, D-02, D-03 (NORMAL active room only) |
| E3 | Right-click wall in 3D → "Hide in 3D" → ghosted; right-click again → "Show in 3D" restores | 1. With cutawayMode='off' in 3D, right-click a wall (Phase 53 driver). 2. Verify menu has "Hide in 3D" option. 3. Click it. 4. Read `__getMaterialOpacity(wallId)`. 5. Right-click same wall. 6. Verify menu shows "Show in 3D". 7. Click. 8. Read opacity again | Step 2: menu item text === "Hide in 3D". Step 4: opacity === 0.15. Step 6: text === "Show in 3D". Step 8: opacity === 1.0 | D-05, Q4 |
| E4 | Top-down camera angle disables auto-cutaway | 1. cutawayMode='auto' in 3D. 2. `__setCameraTransform({x:0,y:50,z:0.1}, {x:0,y:0,z:0})` (elevationRad ≈ π/2). 3. Wait one frame. 4. Read `__getCutawayWallId(activeRoomId)`. 5. Read opacity for every wall in fixture room | Step 4: `null`. Step 5: every wall opacity === 1.0 | D-04, Q5 |
| E5 | Walk mode disables cutaway regardless of stored mode | 1. cutawayMode='auto', orbit camera so a wall would normally ghost. 2. Verify a wall has opacity 0.15 (sanity). 3. Toggle cameraMode to 'walk' (existing toggle or driver). 4. Read opacity for every wall | Step 4: every wall opacity === 1.0 (cutaway bailed). After toggling back to 'orbit': cutaway resumes (opacity drops back to 0.15 on the previously-ghosted wall) | D-08 |

---

## Decision Coverage Matrix

| Decision | Covered By | Notes |
|----------|------------|-------|
| D-01 most-opposed-normal | U1, E2 | Detection algorithm — synthetic 4-wall test + e2e orbit-flip |
| D-02 useFrame per-frame | E2, E4, E5 | Per-frame detection visible in e2e (camera change → wallId change without manual recompute) |
| D-03 per-room in EXPLODE | (covered by manual UAT — see HUMAN-UAT.md item TBD) | E2E for EXPLODE deferred to UAT due to fixture complexity; unit-level coverage via getCutawayWallId roomCenter+offsetX param |
| D-04 polar > 70° auto-disable | U2, E4 | Unit threshold + e2e camera drive |
| D-05 manual right-click | U3, U4, C2, E3 + side-effect supporting test | Toggle, clear, ghost-rendering, end-to-end menu flow |
| D-06 single cycling button | E1 | Toolbar aria-pressed + active class transitions |
| D-07 ghost style (0.15, transparent, depthWrite false) | C1, C2, C3 | All three material flags asserted on base material |
| D-08 walk mode disables | E5 | Camera mode toggle bails the useFrame block |
| D-09 uiStore session-only | U3, U4 + supporting + manual reload check | DEVIATION: Map<roomId,wallId> instead of `string \| null` (per user spec to support D-03) |
| D-10 test coverage 4+3+5 | This document | Exact split |
| D-11 atomic commits | (verified at PR review — 7 commits per Task in PLAN) | Outside test scope |
| D-12 zero regressions | Existing test suites + grep audits | `npm run test && npm run test:e2e` full pass; `grep needsUpdate` zero hits; spread-site count audit |

---

## Wave 0 Gaps (files to create before any test passes)

- [ ] `src/test-utils/cutawayDrivers.ts` — created in Task 7
- [ ] `tests/stores/uiStore.cutaway.test.ts` — created in Task 1 (TDD RED first)
- [ ] `tests/three/cutawayDetection.test.ts` — created in Task 2 (TDD RED first)
- [ ] `tests/components/WallMesh.cutaway.test.tsx` — created in Task 4 (TDD RED first)
- [ ] `e2e/wall-cutaway.spec.ts` — created in Task 7

WallMesh test-mode material registry must be extended (Task 4) before component tests can assert opacity readouts.

---

## Out-of-Scope Validation (deferred per CONTEXT lines 180-189)

- L-shape outward-normal correctness — v1.16 follow-up; v1.15 ships only rectangular rooms
- Per-room cutaway in EXPLODE end-to-end (E2E covered manually via HUMAN-UAT.md)
- Animated ghost transitions — D-07 locks instant on/off
- Multi-wall auto-cutaway — only ONE auto wall at a time per room (manual can hide multiple)
- Cutaway in 2D, ceiling, floor — out of scope per CONTEXT
