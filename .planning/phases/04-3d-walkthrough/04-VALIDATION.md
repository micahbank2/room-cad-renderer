---
phase: 4
slug: 3d-walkthrough
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 4 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + jsdom |
| **Config file** | vitest.config.ts (from Phase 1) |
| **Test root** | `tests/` |
| **Quick run** | `npm test -- --run` |
| **Full suite** | `npm test -- --run && npm run build` |

R3F/WebGL limitation: walk camera motion + pointer-lock are manual-verified in browser. Pure logic (collision math, camera state machine) is unit-tested.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Command | Test File | Status |
|---------|------|------|-------------|-----------|---------|-----------|--------|
| 04-00-01 | 00 | 0 | VIZ-05 | infra | `npm test -- --run` | tests/walkCollision.test.ts | ⬜ pending |
| 04-01-01 | 01 | 1 | VIZ-05 | unit | `npm test walkCollision -- --run` | tests/walkCollision.test.ts | ⬜ pending |
| 04-01-02 | 01 | 1 | VIZ-05 | unit | `npm test uiStore -- --run` | tests/uiStore.test.ts | ⬜ pending |
| 04-02-01 | 02 | 2 | VIZ-05 | build | `npm run build` | (type-check) | ⬜ pending |
| 04-02-02 | 02 | 2 | VIZ-05 | build | `npm run build` | (type-check) | ⬜ pending |

## Wave 0 Requirements

- [ ] `tests/walkCollision.test.ts` — stubs for wall AABB collision + room bounds clamp
- [ ] `tests/uiStore.test.ts` — stubs for cameraMode state (if store tests don't yet exist)

## Manual-Only Verifications

| Behavior | Req | Why Manual | Instructions |
|----------|-----|------------|--------------|
| Click 3D viewport enters pointer-lock FPS mode | VIZ-05 | Browser pointer-lock API | Switch to walk, click canvas, confirm cursor hidden + mouse look works |
| WASD moves camera through room at eye level | VIZ-05 | WebGL + keyboard integration | Press W/A/S/D, confirm camera translates on ground plane at ~5.5ft |
| Camera stops at walls (no clipping) | VIZ-05 | Physics + WebGL | Walk into wall, confirm camera does not pass through |
| ORBIT button restores prior camera position | VIZ-05 | ref-based state | Orbit → walk around → orbit, confirm view returns to prior framing |
| E key toggles cameraMode | VIZ-05 | Keyboard shortcut | In 3D, press E, confirm mode switches |
| Walk mode overlay toast fades after ~4s | VIZ-05 | CSS animation | Enter walk, confirm toast appears + fades |
| StatusBar reads WALK_MODE / ORBIT_MODE | VIZ-05 | DOM inspect | grep DOM for `WALK_MODE` text while walking |

## Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` (flip AFTER execution)

**Approval:** pending
