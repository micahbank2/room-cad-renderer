# Phase 4: 3D Walkthrough - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-05
**Phase:** 04-3d-walkthrough
**Mode:** --auto (all decisions Claude's recommended defaults)

---

## Gray Areas Auto-Selected

| Area | Default Captured |
|------|------------------|
| Camera mode toggle UI | Toolbar button (WALK/ORBIT) + `E` keyboard shortcut + uiStore cameraMode field |
| Mouse look control | drei `<PointerLockControls>` (click to lock, Esc to exit) |
| Movement keys | WASD + arrow keys, Shift for fast walk |
| Eye-level height | 5.5 ft, locked (no vertical movement) |
| Walk speed | 4 ft/sec base, 8 ft/sec with Shift |
| Collision | Walls only (AABB), no product/opening collision |
| Room bounds | Hard clamp to 0 ≤ x ≤ room.width, 0 ≤ z ≤ room.length |
| State preservation | Orbit camera position/target saved in ref on mode switch |
| Spawn position | Room center at eye level, yaw 0 |
| Discoverability | Toast overlay on walk-mode entry, 4-second fade |
| Status surface | StatusBar shows WALK_MODE / ORBIT_MODE |

All defaults locked in CONTEXT.md.
