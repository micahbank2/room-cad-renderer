# Phase 5: Multi-Room - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-05
**Phase:** 05-multi-room
**Mode:** --auto (all decisions Claude's recommended defaults)

---

## Gray Areas Auto-Selected

| Area | Default Captured |
|------|------------------|
| Data model restructure | `rooms: Record<id, RoomDoc>` + `activeRoomId`, global undo/redo |
| Store action semantics | Existing actions operate on active room; transparent to consumers |
| Selectors | New hooks `useActiveRoom`/`useActiveWalls`/`useActivePlacedProducts` |
| Migration | Legacy single-room → wrap in "Main Room" with id `room_main` |
| CADSnapshot version | Bump to v2, backward-compatible load |
| Room management actions | `addRoom`, `renameRoom`, `removeRoom`, `switchRoom` |
| Default first-room name | "Main Room" |
| Room-switching UI | Horizontal ROOM_TABS bar above canvas, + button for new |
| Keyboard | Ctrl/Cmd+Tab to cycle (no single-key conflicts) |
| Templates | LIVING_ROOM 16×20, BEDROOM 12×14, KITCHEN 10×12, BLANK |
| Template content | Perimeter walls only, no furniture/openings |
| Template picker | Inside Add Room dialog (name + 2×2 grid) |
| Product isolation | placedProducts live inside RoomDoc, hard isolation |
| Delete room | Confirm dialog, cannot delete last room |

All defaults locked in CONTEXT.md.
