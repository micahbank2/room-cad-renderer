---
phase: 81-left-panel-restructure-v1-21
plan: 03
subsystem: ui
tags: [react, zustand, tree, rename, schema-migration, saved-camera, ia-03, d-03, d-04]

requires:
  - phase: 81-left-panel-restructure-v1-21
    plan: 02
    provides: TreeRow.tsx hover-ready props pipe; RoomsTreePanel onClickRow dispatcher; savedCameraNodeIds derivation.
provides:
  - WallSegment.name?: string field + CADSnapshot version bump 7 → 8
  - migrateV7ToV8 passthrough (no data transformation — name is optional)
  - cadStore.renameWall(roomId, wallId, name) with empty→delete behavior
  - buildRoomTree wall-leaf label uses `wall.name ?? wallCardinalLabel(...)`
  - TreeRow inline-rename mode via InlineEditableText (dbl-click swap)
  - TreeRow Camera affordance migrated from passive indicator to interactive button
  - RoomsTreePanel onRename dispatcher (room / wall / custom / stair)
  - RoomsTreePanel onSavedCameraFocus dispatcher (entry-point only changed; lookup logic preserved)
  - e2e/tree-rename.spec.ts — 3 tests (commit / cancel / group-header NO-OP)
affects:
  - 82-inspector-rebuild (inspector reads `wall.name`; rename UX precedent set)
  - All future tree leaf kinds (product/ceiling labelOverride deferred per CONTEXT.md)

tech-stack:
  added: []
  patterns:
    - "Schema bump pattern reused: Phase 62 v4→v5, Phase 69 v6→v7, Phase 81 v7→v8 — all trivial passthroughs that only flip the version field. Migration runs in cadStore.loadSnapshot pipeline as the last sync step."
    - "Inline-rename row pattern: row-local `isEditing` state + InlineEditableText swap. Wrapper span owns onKeyDown(Escape) + onBlur to flip edit-mode false (InlineEditableText cancel path does NOT call onCommit)."
    - "Affordance migration without UX regression: Camera button replaces passive indicator; click handler runs the SAME lookup logic the old dbl-click did (focusOnSavedCamera with fall-through). DOM marker renamed `data-saved-camera-indicator` → `data-saved-camera-button` so tests target the new contract explicitly."
    - "Per-kind dispatch in onRename: switch on node.kind to route to renameRoom / renameWall / updatePlacedCustomElement / updateStair — no central rename action because each entity stores its label in a different shape (RoomDoc.name / WallSegment.name / labelOverride)."

key-files:
  created:
    - e2e/tree-rename.spec.ts
    - .planning/phases/81-left-panel-restructure-v1-21/81-03-SUMMARY.md
  modified:
    - src/types/cad.ts
    - src/lib/snapshotMigration.ts
    - src/stores/cadStore.ts
    - src/lib/buildRoomTree.ts
    - src/components/RoomsTreePanel/TreeRow.tsx
    - src/components/RoomsTreePanel/RoomsTreePanel.tsx
    - src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx
    - tests/snapshotMigration.test.ts

key-decisions:
  - "Snapshot v7→v8 migration is a pure version bump — name is optional, absence renders the default cardinal label so legacy v7 walls are valid without transformation."
  - "renameWall takes (roomId, wallId, name) matching the existing per-room store actions (updateStair pattern), NOT the activeDoc-implicit pattern used by updateWall — the tree dispatcher already carries node.roomId so this is the right surface."
  - "Empty/whitespace input on renameWall does `delete wall.name` (not `wall.name = ''`) — keeps snapshot clean and matches the 'absence = default cardinal label' contract."
  - "Saved-camera affordance migrated cleanly (D-03): the old onDoubleClickRow body became onSavedCameraFocus verbatim; only the entry-point (camera-icon button click vs row dbl-click) changed. Existing focusOnSavedCamera helper preserved."
  - "Wrapper span around InlineEditableText: necessary because InlineEditableText's Escape cancel path sets skipNextBlur and returns from commit() WITHOUT calling onCommit. Without the wrapper, isEditing would never flip false on Escape. setTimeout(0) defers exit-edit-mode one tick so InlineEditableText's internal blur runs first."
  - "Product + ceiling rename are explicit no-ops in onRename — CONTEXT.md 'Out of Scope' calls these out as deferred. Users rename products via PropertiesPanel labelOverride (Phase 31 precedent for custom elements)."
  - "savedCamera unit tests rewritten to assert the new D-03 contract: Camera-button CLICK fires saved-camera (was: row dbl-click); row dbl-click now opens rename input. The DOM marker rename (`data-saved-camera-indicator` → `data-saved-camera-button`) is intentional — old indicator-only role is now button-with-click."

patterns-established:
  - "Schema version bump template (now applied 3×: v4→v5, v6→v7, v7→v8): 1) interface field with `Phase XX D-NN` doc comment, 2) `version: N+1` literal type, 3) migrateVNToVNplus1() pure passthrough, 4) defaultSnapshot() bump, 5) snapshot() writer bump, 6) loadSnapshot pipeline append, 7) test for `expect(d.version).toBe(N+1)`."
  - "Tree row affordance migration without breaking the per-kind contract: when reassigning a row interaction (dbl-click → button-click), keep the dispatcher body intact and rename the wrapping callback — preserves the focus/lookup logic exactly while moving the user-visible trigger."

requirements-completed: [IA-03 rename]

metrics:
  duration: 25min
  tasks-completed: 3
  files-modified: 7
  files-created: 1
  commits: 3
  completed: 2026-05-13

deferred-issues:
  - "PlacedProduct.labelOverride — products keep catalog name; rename via tree is no-op. Out of scope per CONTEXT.md."
  - "Ceiling.labelOverride — same status. Out of scope per CONTEXT.md."

deviations:
  - "[Rule 1 - Bug] Wrapper span around InlineEditableText added during Task 3 verification. The plan-as-written said 'setIsEditing(false) fires on onCommit (which the cancel path also reaches via the component's internal commit() short-circuit)' — but InlineEditableText's cancel() sets skipNextBlur and commit() short-circuits WITHOUT calling onCommit. e2e Escape test caught this. Fix: wrapper span owns onKeyDown(Escape) + onBlur, both set isEditing=false on next tick. Files: src/components/RoomsTreePanel/TreeRow.tsx. All 3 e2e tests pass post-fix."
  - "[Rule 2 - Missing critical functionality] Updated existing savedCamera unit test (src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx) to match the new D-03 contract. The plan called for replacing the dbl-click saved-camera dispatch — the existing test asserted the old behavior verbatim, so it would have broken on commit. Rewrote 4 assertions to use the new `data-saved-camera-button` DOM marker + click event instead of `[title='Has saved camera angle']` + dbl-click. Added a new test verifying dbl-click on a leaf row opens rename WITHOUT firing saved-camera (negative test for the D-03 contract). 7/7 pass."

auth-gates: []
---

# Phase 81 Plan 03: Inline rename + WallSegment.name schema bump + saved-camera migration Summary

Walls gain an optional `name` field; tree rows are renameable via dbl-click; saved-camera affordance migrates from dbl-click to camera-icon click. Closes the rename half of GH #172 (IA-03).

## What Was Built

### Task 1 — Schema bump (commit `64bcf2a`)
- `WallSegment.name?: string` (max 40 chars, client-enforced)
- `CADSnapshot.version: 7 → 8`
- `migrateV7ToV8` passthrough — no data transformation
- `cadStore.snapshot()` writer + `defaultSnapshot()` + `loadSnapshot()` pipeline all emit/accept v8
- `tests/snapshotMigration.test.ts` updated assertion: `expect(d.version).toBe(8)`

### Task 2 — Store action + tree label resolver (commit `bdbf82f`)
- `cadStore.renameWall(roomId, wallId, name)` with pushHistory, trim+clamp 40, empty→delete
- `buildRoomTree`: wall-leaf label becomes `wall.name?.trim() || wallCardinalLabel(wall, center, idx)`

### Task 3 — TreeRow inline-rename + Camera button affordance + e2e (commit `420cac1`)
- `TreeRow.tsx`:
  - Row-local `isEditing` state (React.useState)
  - dbl-click handler flips `isEditing=true` (replaces Phase 48 saved-camera dispatch)
  - When editing, label swaps to `<InlineEditableText>` wrapped in a span that owns Escape + blur exit
  - Camera passive indicator (`data-saved-camera-indicator`) becomes interactive button (`data-saved-camera-button`); click fires `onSavedCameraFocus`
  - aria-labels mixed-case per D-09
  - Recursion passes `onRename` + `onSavedCameraFocus` instead of `onDoubleClickRow`
- `RoomsTreePanel.tsx`:
  - `onSavedCameraFocus` callback (lifted from the old `onDoubleClickRow` body verbatim — only the entry-point changed)
  - `onRename` dispatcher: switches on `node.kind` → `renameRoom` / `renameWall` / `updatePlacedCustomElement` (labelOverride) / `updateStair` (labelOverride); explicit no-op for product + ceiling per CONTEXT.md
- `src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx`: rewritten 4 assertions for the new D-03 contract; added 1 new test verifying dbl-click opens rename without firing camera; 7/7 pass
- `e2e/tree-rename.spec.ts`: 3 Playwright tests on chromium-dev (commit / Escape cancel / group-header NO-OP) — all pass

## How It Works

1. User double-clicks a wall row in the Rooms tree
2. `TreeRow`'s `onDoubleClick` flips `isEditing=true`; the label button is replaced by `<InlineEditableText>` wrapped in a span
3. User types a new name + Enter → `InlineEditableText.onCommit` fires → `props.onRename(node, value)` → `RoomsTreePanel.onRename` dispatches to `cadStore.renameWall(roomId, wallId, name)`
4. `renameWall` pushes a history entry, trims+clamps to 40, and writes `wall.name`
5. `buildRoomTree` re-runs (useMemo dep on `rooms`); the leaf label becomes the new `wall.name`
6. `TreeRow` re-renders; the input swaps back to the label button showing the new text
7. On reload, `cadStore.loadSnapshot` runs the v8 passthrough → `wall.name` persists across sessions

Escape path: `InlineEditableText.cancel()` sets `skipNextBlur=true`, the wrapper span's onKeyDown(Escape) schedules `setIsEditing(false)` on next tick, blur runs, commit short-circuits, isEditing flips false. Label reverts to original.

Saved-camera path: User clicks the Camera button next to a wall row → `e.stopPropagation()` + `props.onSavedCameraFocus(node)` → `RoomsTreePanel.onSavedCameraFocus` looks up `savedCameraPos/Target` from the entity in cadStore → `focusOnSavedCamera(pos, target, fallback)` dispatches via `requestCameraTarget` (Phase 46 bridge) or falls through to default focus.

## Decisions Made

See frontmatter `key-decisions`. Headlines:
- **v7→v8 is a pure passthrough.** Name is optional; legacy v7 walls render the default cardinal label. No transformation needed.
- **renameWall takes roomId explicitly.** Matches the per-room store-action pattern (updateStair), uses the same node.roomId that the tree already plumbs.
- **Empty → delete.** Keeps snapshot clean; matches the "absence = default" contract.
- **Wrapper span for Escape exit.** InlineEditableText's cancel path doesn't reach onCommit; without the wrapper, isEditing stays stuck after Escape.
- **Per-kind dispatcher switch.** No central rename action — each entity stores its label in a different shape (RoomDoc.name vs WallSegment.name vs labelOverride).
- **Product + ceiling are no-ops.** Out of scope per CONTEXT.md; users rename products via PropertiesPanel labelOverride (Phase 31 precedent).

## Files Changed

### Created
- `e2e/tree-rename.spec.ts` (180 lines) — 3 Playwright tests
- `.planning/phases/81-left-panel-restructure-v1-21/81-03-SUMMARY.md` (this file)

### Modified
- `src/types/cad.ts` (+5 lines) — WallSegment.name field + version 7→8 + doc comment
- `src/lib/snapshotMigration.ts` (+18 lines) — v8 passthrough branch + migrateV7ToV8 + defaultSnapshot version
- `src/stores/cadStore.ts` (+25 / -3 lines) — renameWall action + interface entry + migration import + pipeline + snapshot() writer
- `src/lib/buildRoomTree.ts` (+1 line) — `wall.name ?? wallCardinalLabel(...)` fallback
- `src/components/RoomsTreePanel/TreeRow.tsx` (+50 / -15 lines) — isEditing state + InlineEditableText swap + Camera button + recursion props
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` (+50 / -20 lines) — onRename dispatcher + onSavedCameraFocus (lifted body)
- `src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx` (+30 / -25 lines) — D-03 contract assertions
- `tests/snapshotMigration.test.ts` (+1 / -1 lines) — version 7→8 assertion update

## Verification

### Automated
- `npx tsc --noEmit` — passes (only pre-existing `TS5101` baseUrl deprecation warning)
- `npm run build` — passes (419ms)
- `npx playwright test e2e/tree-rename.spec.ts --project=chromium-dev` — 3 passed (5.7s)
- `npx vitest run src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx` — 7 passed
- `npm run test:quick` — 996 passed, 11 todo, 2 pre-existing failures (`SaveIndicator.test.tsx`, `SidebarProductPicker.test.tsx`); 0 regressions vs Plan 02 baseline

### Manual smoke (post-execute, recommended)
- `npm run dev` → seed a wall → dbl-click "North wall" row in tree → input swaps in → type "Window wall" + Enter → label updates → reload → name persists
- Save a camera angle on a wall (Phase 48 flow) → close → click the Camera button next to that wall row → 3D camera moves to the saved position
- Escape during rename reverts the label; group row dbl-click is NO-OP

### Boundaries held
- `src/three/**` — zero diff (D-02 boundary: 3D wiring deferred to Phase 82)
- `src/canvas/dimensions.ts` — zero diff (D-04: 2D dimension overlay unchanged; wall labels live in the tree)
- No new uiStore fields (rename writes to cadStore only)
- No undo-history pollution beyond expected (renameWall pushes exactly 1 entry per commit)

## Self-Check: PASSED

- `src/types/cad.ts` FOUND with `name?: string` on WallSegment and `version: 8`
- `src/lib/snapshotMigration.ts` FOUND with `migrateV7ToV8` and v8 passthrough branch
- `src/stores/cadStore.ts` FOUND with `renameWall` action + interface entry + pipeline call
- `src/lib/buildRoomTree.ts` FOUND with `wall.name?.trim() || wallCardinalLabel(...)`
- `src/components/RoomsTreePanel/TreeRow.tsx` FOUND with `InlineEditableText`, `data-saved-camera-button`, `setIsEditing`, `onRename`, `onSavedCameraFocus`
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` FOUND with `onRename` and `onSavedCameraFocus` callbacks
- `e2e/tree-rename.spec.ts` FOUND (new file, 180 lines, 3 tests)
- Commit `64bcf2a` FOUND (Task 1)
- Commit `bdbf82f` FOUND (Task 2)
- Commit `420cac1` FOUND (Task 3)
