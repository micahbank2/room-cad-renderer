---
phase: 5
slug: multi-room
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 5 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + jsdom |
| **Test root** | `tests/` |
| **Quick run** | `npm test -- --run` |
| **Full suite** | `npm test -- --run && npm run build` |

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Command | Status |
|---------|------|------|-------------|-----------|---------|--------|
| 05-00-01 | 00 | 0 | ROOM-01/02 | infra | `npm test -- --run` | ⬜ |
| 05-01-01 | 01 | 1 | ROOM-01 | unit | `npm test cadStore -- --run` | ⬜ |
| 05-01-02 | 01 | 1 | ROOM-01 | unit | `npm test snapshotMigration -- --run` | ⬜ |
| 05-01-03 | 01 | 1 | ROOM-02 | unit | `npm test roomTemplates -- --run` | ⬜ |
| 05-02-01 | 02 | 2 | ROOM-01 | build | `npm run build` | ⬜ |
| 05-03-01 | 03 | 3 | ROOM-01/02 | build+suite | `npm test -- --run && npm run build` | ⬜ |

## Wave 0 Requirements

- [ ] `tests/cadStore.multiRoom.test.ts` — addRoom/switchRoom/removeRoom/renameRoom tests (stubs)
- [ ] `tests/snapshotMigration.test.ts` — v1 → v2 migration (stubs)
- [ ] `tests/roomTemplates.test.ts` — template wall counts + dimensions (stubs)
- [ ] Update `tests/cadStore.test.ts` — switch to new RoomDoc shape
- [ ] Update `tests/useAutoSave.test.ts` — switch to new RoomDoc shape

## Manual-Only Verifications

| Behavior | Req | Instructions |
|----------|-----|--------------|
| ROOM_TABS appear above canvas | ROOM-01 | Open app, confirm tab bar above 2D/3D canvas |
| Add Room dialog with 4 templates | ROOM-02 | Click +, confirm LIVING_ROOM/BEDROOM/KITCHEN/BLANK |
| Templates create perimeter walls | ROOM-02 | Create LIVING_ROOM, confirm 4 walls forming 16×20 rectangle |
| Switching rooms swaps canvas | ROOM-01 | Create room A with walls, room B blank, confirm switching shows different canvas state |
| Products stay in their room | ROOM-01 | Place product in A, switch to B, confirm not shown |
| Ctrl/Cmd+Tab cycles rooms | ROOM-01 | Press shortcut, confirm active tab advances |
| Delete room requires confirm | ROOM-01 | Click × on tab, confirm dialog |
| Cannot delete last room | ROOM-01 | Try delete when one room, confirm × hidden or disabled |
| Legacy project migrates | ROOM-01 | Load existing v1 project, confirm wrapped as "Main Room" |

## Sign-Off

- [ ] All tasks have automated verify or Wave 0 deps
- [ ] `nyquist_compliant: true` (flip AFTER execution)

**Approval:** pending
