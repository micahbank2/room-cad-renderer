# Phase 47 VALIDATION — DISPLAY-01

**Phase:** 47-room-display-modes-display-01
**Requirement:** DISPLAY-01 (single requirement; ROADMAP Phase 47 line)
**Created:** 2026-04-26
**Wave 0 owner:** Plan 47-01 (RED scaffolding)
**Wave 1 owners:** Plan 47-02 (uiStore + ThreeViewport multi-room), Plan 47-03 (Toolbar UI)

---

## Per-Task Verification Map (canonical paths)

Plan 47-01 MUST create every file in this matrix at the EXACT path. No deviations. Plans 47-02 and 47-03 turn slices GREEN.

| File (canonical path) | Owned by | What it asserts (per DISPLAY-01) |
|---|---|---|
| `src/__tests__/uiStore.displayMode.test.ts` | 47-02 | (a) `displayMode` defaults to `"normal"` when no localStorage; (b) `setDisplayMode("solo")` updates store; (c) `setDisplayMode("solo")` writes `"solo"` to `localStorage["gsd:displayMode"]`; (d) on store creation with `localStorage["gsd:displayMode"] = "explode"`, `displayMode === "explode"`; (e) on garbage value (`"BLAHBLAH"`), `displayMode === "normal"`; (f) `setDisplayMode` does NOT push undo history (no cadStore mutation visible). |
| `src/three/__tests__/ThreeViewport.displayMode.test.tsx` | 47-02 | (a) helper `computeRoomOffsets(rooms, "normal")` returns `{ [id]: 0 }` for every room; (b) `computeRoomOffsets(rooms, "explode")` matches D-03 formula `cumulative sum of max(width,length) * 1.25`; (c) `Object.keys(rooms)` insertion order is the index source; (d) D-04 SOLO + hiddenIds compose — given hiddenIds={wall_x} the wall is omitted from active-room render; (e) D-06 SOLO + null activeRoomId yields zero room groups. |
| `src/components/__tests__/Toolbar.displayMode.test.tsx` | 47-03 | (a) 3 buttons (`data-testid="display-mode-normal"`, `…-solo`, `…-explode`) render when viewMode==="3d"; (b) all 3 absent when viewMode==="2d"; (c) all 3 present when viewMode==="split"; (d) clicking `display-mode-solo` calls `setDisplayMode("solo")`; (e) active button has `aria-pressed="true"` AND className contains `bg-accent/10`, `text-accent`, `border-accent/30` (D-09 verbatim); (f) inactive buttons have `aria-pressed="false"` AND no `bg-accent/10` token; (g) tooltip text matches D-09 verbatim ("All rooms render together" / "Only the active room renders" / "Rooms separated along X-axis"); (h) icons are lucide `LayoutGrid` / `Square` / `Move3d` (component identity check, not className). |
| `e2e/display-mode-cycle.spec.ts` | 47-02 + 47-03 | (a) load app at `/`; click `display-mode-explode`; assert `window.__getDisplayMode() === "explode"`; assert button `aria-pressed="true"`; (b) click `display-mode-solo`; assert `__getDisplayMode() === "solo"`; (c) reload page; assert `__getDisplayMode()` still === "solo" (D-05 persistence); (d) click `display-mode-normal`; assert `__getDisplayMode() === "normal"`; (e) reload; assert default is `"normal"` only after explicit normal write — i.e. `localStorage["gsd:displayMode"] === "normal"`. |

## Source-file stubs (Plan 47-01 creates; later plans fill)

| File | Plan-01 stub contract | Filled by |
|---|---|---|
| `src/test-utils/displayModeDrivers.ts` | Exports `installDisplayModeDrivers()`. When `import.meta.env.MODE === "test"`, sets `window.__driveDisplayMode(mode)` and `window.__getDisplayMode()`. Stub bodies throw `"unimplemented (Plan 47-02)"`. | 47-02 |
| `src/three/RoomGroup.tsx` | Exports `RoomGroup` component returning `null` and `computeRoomOffsets(rooms, displayMode)` returning `{}` (so unit tests RED on assertion mismatch, not import error). | 47-02 |

## Behavior contract — per requirement (DISPLAY-01)

### Verifiable A — uiStore.displayMode field exists
- File: `src/__tests__/uiStore.displayMode.test.ts`
- Assertions: default value, setter behavior, localStorage round-trip, garbage-value fallback.

### Verifiable B — Toolbar segmented control (D-01, D-09)
- File: `src/components/__tests__/Toolbar.displayMode.test.tsx`
- Assertions: 3 buttons present iff viewMode is "3d" or "split"; D-09 active-state classes verbatim; D-09 lucide icon identities; D-09 verbatim tooltips.

### Verifiable C — 3D rendering responds to displayMode (D-03, D-04, D-06)
- File: `src/three/__tests__/ThreeViewport.displayMode.test.tsx`
- Assertions: `computeRoomOffsets` math; SOLO empty when activeRoomId null; SOLO composes with hiddenIds.

### Verifiable D — End-to-end cycle + persistence (D-05, D-07)
- File: `e2e/display-mode-cycle.spec.ts`
- Assertions: cycle through all 3 modes via toolbar clicks; localStorage round-trip survives reload; instant switch (no animation gating needed since D-07 is structural).

## Sampling rate

- **Per task commit (Plan 02 / 03):** `npm run test -- --run src/__tests__/uiStore.displayMode.test.ts` (Plan 02 Task 1) / `npm run test -- --run src/components/__tests__/Toolbar.displayMode.test.tsx` (Plan 03 Task 1).
- **Per wave merge:** `npm run test -- --run src/__tests__ src/three/__tests__ src/components/__tests__` + `npx playwright test e2e/display-mode-cycle.spec.ts`.
- **Phase gate:** Full vitest run + targeted playwright spec must be GREEN before VERIFICATION.md.

## Wave 0 RED checklist (Plan 47-01)

- [ ] `src/__tests__/uiStore.displayMode.test.ts` exists; tests fail with assertion errors (not import errors).
- [ ] `src/components/__tests__/Toolbar.displayMode.test.tsx` exists; tests fail because 3 buttons not yet rendered.
- [ ] `src/three/__tests__/ThreeViewport.displayMode.test.tsx` exists; tests fail because `computeRoomOffsets` returns `{}`.
- [ ] `e2e/display-mode-cycle.spec.ts` exists; `npx playwright test --list` succeeds.
- [ ] `src/test-utils/displayModeDrivers.ts` exists with stub bodies that throw.
- [ ] `src/three/RoomGroup.tsx` exists with stub `RoomGroup` + `computeRoomOffsets`.
- [ ] `npx tsc --noEmit` exits 0.

## Out-of-scope (do NOT test in Phase 47)

- Per-room saved camera angles (CAM-04 / Phase 48).
- EXPLODE animation/tween (D-07 hard-locks instant).
- EXPLODE auto-frame camera (D-08 rejected).
- SOLO room picker separate from `activeRoomId` (D-06).
- Per-project displayMode persistence (global UI preference only — D-05).
