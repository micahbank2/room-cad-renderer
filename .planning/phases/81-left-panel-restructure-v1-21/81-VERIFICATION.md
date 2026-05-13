---
phase: 81-left-panel-restructure-v1-21
verified: 2026-05-13T00:00:00Z
status: human_needed
score: 18/18 must-haves verified (automated); 4 items need human UAT
human_verification:
  - test: "Fresh-load IA-02 contract"
    expected: "Delete localStorage key `ui:propertiesPanel:sections`, hard reload. Rooms tree is the ONLY expanded section. Room config, Snap, Custom elements, Framed art library, Wainscoting library, Product library all collapsed."
    why_human: "Visual confirmation of default-collapsed state; localStorage manipulation + page reload requires browser."
  - test: "IA-02 persistence across reload"
    expected: "Expand Custom Elements panel → hard reload → Custom Elements still expanded; localStorage shows `{ \"sidebar-custom-elements\": true, ... }`."
    why_human: "Reload-persistence is a runtime behavior — requires actual page reload to confirm."
  - test: "IA-03 hover glow on 2D canvas"
    expected: "Hover 'North wall' (or any wall row) in Rooms tree → wall briefly outlined in accent purple (#7c5bf0) on 2D canvas. Move cursor off → outline clears within one animation frame. Try fast scroll across tree — no frame drops."
    why_human: "Visual hover-highlight behavior; RAF-coalescing performance is a feel test."
  - test: "IA-03 dbl-click rename + saved-camera migration"
    expected: "Double-click wall row → label swaps to editable input. Type 'Window wall', press Enter → tree shows 'Window wall'. Reload → name persists. Press Escape mid-edit → reverts. Empty commit → reverts to default cardinal label. Click camera icon next to row with saved camera → 3D camera focuses (Phase 48 behavior, MOVED from dbl-click)."
    why_human: "Multi-step interactive flow; saved-camera focus changes 3D viewport which requires visual confirmation."
---

# Phase 81: Left Panel Restructure v1.21 — Verification Report

**Phase Goal:** Restructure the left panel — secondary panels collapse-by-default with persistent state, Rooms tree gets Figma layers-panel treatment (visibility, hover-highlight on 2D canvas, click-to-select, double-click-to-rename with custom wall names).
**Verified:** 2026-05-13
**Status:** human_needed (all 18 automated must-haves verified; 4 interactive flows require Jessica UAT)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Fresh-load: Rooms tree expanded, all 6 secondary panels collapsed | VERIFIED | `Sidebar.tsx:41,45,54,67,71,75,79` — only `sidebar-rooms-tree` has `defaultOpen={true}` |
| 2 | Expand Custom Elements + reload preserves state | VERIFIED | `PanelSection.tsx:9` `STORAGE_KEY = "ui:propertiesPanel:sections"`; persistence via `readUIObject`/`writeUIObject` |
| 3 | Rooms tree header rendered by shared PanelSection (not local clone) | VERIFIED | `RoomsTreePanel.tsx:67-68` — local clone removed with traceability comment |
| 4 | All 7 sections have stable `sidebar-*` ids | VERIFIED | All 7 ids present in Sidebar.tsx (rooms-tree, room-config, snap, custom-elements, framed-art, wainscoting, product-library) |
| 5 | Hover wall row → 2D canvas highlight | VERIFIED | `TreeRow.tsx:164-170` → `RoomsTreePanel.tsx:186-194` → `uiStore.ts:373-390` → `fabricSync.ts:84,219,349,1009,1238` → `FabricCanvas.tsx:123,269` |
| 6 | Hover off → cleared immediately (RAF-coalesced) | VERIFIED | `uiStore.ts:373-390` RAF coalesce with single pending object pattern |
| 7 | Hover state transient (no persistence) | VERIFIED | `uiStore.ts:268` initial value `null`; no persist middleware |
| 8 | 3D rendering unchanged | VERIFIED | `git diff --name-only HEAD~12 HEAD -- src/three/` returns empty |
| 9 | WallSegment.name field exists | VERIFIED | `src/types/cad.ts:29` `name?: string;` |
| 10 | CADSnapshot version === 8 | VERIFIED | `src/types/cad.ts:363` `version: 8;` |
| 11 | migrateV7ToV8 passthrough exists | VERIFIED | `snapshotMigration.ts:78,560` passthrough function and v7→v8 wire |
| 12 | cadStore.renameWall action exists | VERIFIED | `cadStore.ts:203,1710` — typed signature + implementation |
| 13 | Empty rename clears wall.name | VERIFIED | `renameWall` impl trims+slices to 40, deletes field when empty (per plan) |
| 14 | buildRoomTree uses wall.name fallback | VERIFIED | `buildRoomTree.ts:42` `wall.name?.trim() \|\| wallCardinalLabel(...)` |
| 15 | TreeRow dbl-click → InlineEditableText (not saved-camera) | VERIFIED | `TreeRow.tsx:156` `setIsEditing(true)`; `TreeRow.tsx:8,238` imports + renders `InlineEditableText` |
| 16 | Camera icon affordance is a button (saved-camera migration) | VERIFIED | `TreeRow.tsx:64,272,274,280` — gated by `hasSavedCamera = isLeaf && savedCameraNodeIds.has(node.id)`; renders button with `onSavedCameraFocus` |
| 17 | Rename dispatcher handles all kinds (room/wall/custom/stair) | VERIFIED | `RoomsTreePanel.tsx:288-318` switches by `node.kind` |
| 18 | Test driver follows StrictMode-safe cleanup pattern | VERIFIED | `RoomsTreePanel.tsx:186-194` identity-check cleanup per CLAUDE.md §7 |

**Score:** 18/18 truths verified by static checks. 4 truths require human UAT for runtime behavior (reload persistence, hover feel, dbl-click rename flow, saved-camera focus).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/Sidebar.tsx` | 7 PanelSections with stable ids | VERIFIED | All 7 ids, defaultOpen flags correct |
| `src/components/RoomsTreePanel/RoomsTreePanel.tsx` | No local PanelSection; rename dispatcher present | VERIFIED | Inline clone removed; `onRename` + `onSavedCameraFocus` callbacks installed |
| `src/components/RoomsTreePanel/TreeRow.tsx` | Hover events + InlineEditableText + camera button | VERIFIED | onMouseEnter/Leave (leaf-only guard), isEditing state, InlineEditableText swap, saved-camera button |
| `src/stores/uiStore.ts` | hoveredEntityId + RAF-coalesced setter | VERIFIED | Lines 82-83, 268, 373-390 |
| `src/canvas/fabricSync.ts` | 5 renderers accept hoveredId, paint accent-purple | VERIFIED | Lines 72, 210, 322, 997, 1230 (param); accent #7c5bf0 outline applied conditionally |
| `src/canvas/FabricCanvas.tsx` | Subscribes hoveredEntityId, passes to renderers, includes in dep array | VERIFIED | Line 123 selector; lines 223,239,243,246,250 wiring; line 269 dep array |
| `src/types/cad.ts` | WallSegment.name + CADSnapshot.version: 8 | VERIFIED | Lines 29, 363 |
| `src/lib/snapshotMigration.ts` | migrateV7ToV8 passthrough | VERIFIED | Lines 78, 560 |
| `src/stores/cadStore.ts` | renameWall action with history + trim + empty-clear | VERIFIED | Lines 203, 1710 |
| `src/lib/buildRoomTree.ts` | wall.name fallback to cardinal label | VERIFIED | Line 42 |
| `e2e/tree-hover.spec.ts` | Hover spec exists | VERIFIED | Found at `e2e/tree-hover.spec.ts` (plan said `tests/e2e/` — actual location is `e2e/`) |
| `e2e/tree-rename.spec.ts` | Rename spec exists | VERIFIED | Found at `e2e/tree-rename.spec.ts` |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| Sidebar.tsx | PanelSection.tsx | import + 7 wrappers | WIRED |
| PanelSection.tsx | localStorage[ui:propertiesPanel:sections] | readUIObject/writeUIObject | WIRED |
| TreeRow.tsx | RoomsTreePanel.tsx | onHoverEnter/onHoverLeave props through recursion | WIRED (lines 44-45, 164-170, 324-325) |
| RoomsTreePanel.tsx | uiStore.setHoveredEntityId | useUIStore.getState() in callbacks | WIRED (line 186-194) |
| FabricCanvas.tsx | uiStore.hoveredEntityId | useUIStore selector + dep array | WIRED (line 123, 269) |
| FabricCanvas.tsx | fabricSync renderers | hoveredEntityId passed as last arg to 5 renderers | WIRED |
| TreeRow.tsx | InlineEditableText | import + conditional render in edit mode | WIRED (line 8, 238) |
| RoomsTreePanel.tsx | cadStore rename actions | renameNode dispatcher switches by kind | WIRED (line 293-318) |
| buildRoomTree.ts | WallSegment.name | wall.name?.trim() \|\| wallCardinalLabel | WIRED (line 42) |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Status |
|----------|------|--------|--------|
| Sidebar PanelSections | open/closed state | localStorage `ui:propertiesPanel:sections` via readUIObject | FLOWING (existing Phase 72 plumbing reused) |
| 2D canvas hover outline | hoveredEntityId | uiStore → FabricCanvas → renderers → Fabric.Rect/Polygon stroke | FLOWING |
| Tree wall labels | wall.name | cadStore room.walls[id].name → buildRoomTree.label | FLOWING (with cardinal fallback) |
| Rename commits | wall.name write | InlineEditableText.onCommit → onRename → cadStore.renameWall | FLOWING (history-tracked) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| IA-02 | 81-01 | Persistent collapse state for secondary left-panel sections | SATISFIED (automated portion); NEEDS HUMAN for reload UAT | 7 PanelSections with correct defaults; reuses Phase 72 localStorage persistence |
| IA-03 (hover) | 81-02 | Rooms tree hover-highlight on 2D canvas | SATISFIED (automated portion); NEEDS HUMAN for visual UAT | uiStore + TreeRow + fabricSync end-to-end wired; e2e spec present |
| IA-03 (rename) | 81-03 | Dbl-click inline rename + saved-camera icon migration | SATISFIED (automated portion); NEEDS HUMAN for interactive UAT | TreeRow rename UI + cadStore.renameWall + buildRoomTree fallback + camera-icon button |

No orphaned requirements detected (REQUIREMENTS.md maps only IA-02 and IA-03 to Phase 81, both covered).

### Locked Decisions Held

| Decision | Status |
|----------|--------|
| D-01 Hidden state transient (no persistence) | HELD — hoveredEntityId not persisted |
| D-02 Hover 2D-only (3D deferred to Phase 82) | HELD — `git diff src/three/` empty across phase commits |
| D-03 Dbl-click = rename; saved-camera → camera-icon | HELD — TreeRow.tsx:156 setIsEditing + saved-camera button at 272-280 |
| D-04 WallSegment.name + snapshot v7→v8 migration | HELD — cad.ts:29,363 + snapshotMigration.ts:78,560 |
| D-05 Snap dropdown stays in sidebar | HELD — `sidebar-snap` PanelSection at Sidebar.tsx:54 |

### Anti-Patterns Scanned

None found. Test driver follows StrictMode-safe identity-check cleanup pattern (RoomsTreePanel.tsx:186-194). RAF coalesce prevents hover thrash (uiStore.ts:373-390). No `toHaveScreenshot` golden assertions in e2e specs.

### Human Verification Required

Four interactive flows that automated greps cannot confirm:

1. **Fresh-load IA-02 contract** — Open DevTools → Application → Local Storage → delete `ui:propertiesPanel:sections` → hard reload. Confirm: Rooms tree expanded, all 6 others collapsed.
2. **IA-02 reload persistence** — Expand Custom Elements panel → hard reload → confirm Custom Elements stays expanded; check localStorage shows `{"sidebar-custom-elements": true, ...}`.
3. **IA-03 hover feel** — Hover wall row in tree → confirm accent-purple outline appears on matching wall in 2D canvas; move cursor off → outline clears. Test fast scroll across tree — no frame drops.
4. **IA-03 dbl-click rename + saved-camera migration** — Double-click wall row, type "Window wall", press Enter, reload — name persists. Press Escape mid-edit — reverts. Empty commit — reverts to cardinal default. Click camera icon next to a saved-camera row — 3D viewport focuses.

### Gaps Summary

Zero structural gaps. All 18 automated must-haves verified. Phase is structurally complete and ready for Jessica's UAT. Status is `human_needed` solely because four runtime behaviors (reload persistence, hover feel, rename flow, saved-camera click) cannot be fully verified by static codebase inspection.

---

_Verified: 2026-05-13_
_Verifier: Claude (gsd-verifier)_
