---
phase: 53-ctxmenu-01-right-click-context-menus
type: context
created: 2026-04-28
status: ready-for-research
requirements: [CTXMENU-01]
depends_on: [Phase 33 design tokens, Phase 46 hiddenIds + tree-focus dispatch, Phase 48 saved-camera infra, Phase 31 copy/paste in cadStore]
---

# Phase 53: Right-Click Context Menus on Canvas Objects (CTXMENU-01) — Context

## Goal

Right-click on a canvas object (wall / product / ceiling / custom element) opens a context menu with relevant actions for that kind. Right-click on empty canvas opens a smaller menu (Paste only). Source: [GH #74](https://github.com/micahbank2/room-cad-renderer/issues/74). Pascal competitor-insight item.

## Pre-existing infrastructure

- Phase 31: copy/paste actions exist in shortcuts registry (`Cmd+C`/`Cmd+V`)
- Phase 46: `hiddenIds` + tree-focus dispatch (`focusOnWall`, `focusOnPlacedProduct`, etc. in `src/components/RoomsTreePanel/focusDispatch.ts`)
- Phase 48: saved-camera Save/Clear actions in PropertiesPanel; `getCameraCapture` bridge installed by ThreeViewport
- One existing right-click pattern at `src/components/SwatchPicker.tsx:201` — small custom-color delete menu. Limited scope; not a reusable primitive.
- No existing `CanvasContextMenu` component

## Decisions

### D-01 — Single generic `CanvasContextMenu` component

One component at `src/components/CanvasContextMenu.tsx`. Takes `{ kind, nodeId, position }`. Internal `getActionsForKind()` registry returns the action list for that kind. Per-kind components were rejected: they duplicate close/positioning/keyboard/keyboard-shortcut logic.

### D-02 — Action sets (locked)

| Kind | Actions (in display order) |
|------|----------------------------|
| Wall | Focus camera, Save camera here, Hide/Show, Copy, Delete |
| Product | Focus camera, Save camera here, Hide/Show, Copy, Paste, Delete |
| Ceiling | Focus camera, Save camera here, Hide/Show |
| Custom element | Focus camera, Save camera here, Hide/Show, Copy, Delete, Rename label |
| Empty canvas | Paste *(only when clipboard non-empty — hide entry otherwise)* |

**Explicitly excluded** (have inline affordances elsewhere):
- Rotate (inline rotation handle)
- Resize (Phase 31 edge/corner handles)
- Edit dimension label (Phase 29 double-click on wall length label)
- Properties / settings (PropertiesPanel already shows them on selection)

**Action wiring:**
- **Focus camera:** dispatch `useUIStore.getState().requestCameraTarget(...)` via the same Phase 46 `focusDispatch.ts` helpers (`focusOnWall`, `focusOnPlacedProduct`, etc.)
- **Save camera here:** call the matching `setSavedCameraOn{Wall|Product|Ceiling|CustomElement}NoHistory` from cadStore (Phase 48)
- **Hide/Show:** call `useUIStore.getState().toggleHidden(id)` (Phase 46)
- **Copy:** call the same helper used by Phase 31 / Phase 52 registry's Copy entry; reuse `copySelection()` from `src/lib/shortcuts.ts`
- **Paste:** reuse `pasteSelection()` from `src/lib/shortcuts.ts` (currently file-private — extract or call via registry)
- **Delete:** call `useCADStore.getState().removeWall|removeProduct|...`
- **Rename label:** opens the existing PropertiesPanel inline label override (Phase 31). Triggered by setting `uiStore.selectedIds = [id]` then dispatching a focus event on the label input.

### D-03 — 2D + 3D event triggers

**2D (Fabric.js):**
- Listen for `mouse:down` with `e.button === 2` on the FabricCanvas
- Use Fabric's targetFinder via `fc.findTarget(e.e)` to get the clicked object
- Map Fabric object's `data.id` (set in `fabricSync.ts`) → CAD node kind/id
- Call `e.e.preventDefault()` to suppress the browser context menu
- Empty canvas right-click → open Empty Canvas menu (only Paste, only when clipboard non-empty)

**3D (R3F):**
- JSX `onContextMenu` on each mesh component (`WallMesh`, `ProductMesh`, `CeilingMesh`, custom-element meshes)
- Inside handler: `e.stopPropagation()` + `e.nativeEvent.preventDefault()`
- Empty canvas (background) right-click → handle on the R3F `<Canvas>` `onContextMenu` (no propagation = background)

**Component mounts ONCE** at App.tsx level. Reads from new `uiStore.contextMenu` slice:
```ts
contextMenu: { kind, nodeId, position: { x, y } } | null
openContextMenu: (kind, nodeId, position) => void
closeContextMenu: () => void
```

### D-04 — Positioning + auto-flip

- Anchor at clientX/Y from event
- After mount, measure menu bbox; if right edge > viewport width, flip to render leftward from anchor; if bottom edge > viewport height, flip upward
- Use a single `useLayoutEffect` measure pass; no library

### D-05 — Closing (5 paths)

1. Press Escape → close
2. Click outside menu (backdrop / any other element) → close
3. Click a menu item → execute action, then close
4. Right-click elsewhere → close current, open new at new position (the open path itself closes any prior)
5. Window resize OR scroll → close (positioning would be stale)

Inert when typing in a form input (mirrors CAM-01 active-element guard from Phase 35).

### D-06 — Visual style

- Lucide icons per action (Camera, Eye/EyeOff, Copy, Trash2, Edit3 for Rename, etc.)
- Phase 33 design tokens: `bg-obsidian-mid`, `border-outline-variant/20`, `text-text-primary`, hover `bg-obsidian-high`
- Item height matches Phase 46 tree-row anatomy (24px / `h-6`)
- Icon size matches Phase 46 (`w-3.5 h-3.5` = 14px)
- IBM Plex Mono `font-mono text-sm` for labels
- No animation (consistent with Phase 52 HelpModal — instant mount/unmount)

### D-07 — Inert-on-form-input + browser default suppression

- Right-click handler skips when `document.activeElement` is INPUT/TEXTAREA/SELECT (matches Phase 35 CAM-01 / Phase 52 inert pattern)
- `preventDefault()` only when over a canvas object — right-click on Toolbar / Sidebar / PropertiesPanel falls through to native browser menu
- Right-click on the canvas BACKGROUND (no object hit) prevents default and opens the Empty Canvas menu

### D-08 — Test coverage

- **Unit (vitest):**
  1. `getActionsForKind("wall")` returns the locked 5-action list in correct order
  2. Same for product / ceiling / custom / empty-canvas
  3. Empty-canvas action list is empty (length 0) when clipboard is empty
  4. Auto-flip math: anchor near right edge → menu renders leftward
  5. Auto-flip math: anchor near bottom edge → menu renders upward
- **E2E (Playwright):**
  1. Right-click a wall in 2D → menu appears at click position with 5 entries
  2. Right-click a product in 3D → menu appears with 6 entries
  3. Click "Hide/Show" → wall disappears in 3D (Phase 46 cascade integration)
  4. Click "Save camera here" on a product in 3D → tree row gets Camera icon (Phase 48 integration)
  5. Press Escape → menu closes
  6. Click outside → menu closes
  7. Right-click elsewhere → first menu closes, new menu opens at new position
  8. Right-click while focused in a form input → menu does NOT open (inert guard)

### D-09 — Atomic commits per task

Mirror Phase 49/50/51/52 pattern. One commit per logical change.

### D-10 — Zero regressions

- Phase 46 tree click-to-focus still works
- Phase 47 display-mode buttons still work
- Phase 48 save-camera buttons in PropertiesPanel still work
- Phase 49 wall-user-texture still renders
- Phase 50 wallpaper/wallArt still persist across toggle
- Phase 51 async loadSnapshot still works
- Phase 52 keyboard shortcuts overlay still opens with `?`
- 6 pre-existing vitest failures unchanged

## Out of scope

- Mobile / touch long-press right-click (no mobile target user; deferred until demand surfaces)
- Right-click on tree rows in RoomsTreePanel (separate concern — tree already uses single-click; double-click for Save camera)
- Submenus / nested menus (one-level menu only)
- Customizable per-user menu items (out of scope; no settings UI infrastructure)
- Keyboard navigation within menu (arrow keys to navigate, Enter to activate) — defer; mouse-only is sufficient for v1.13
- Dragging menu items (no drag interaction)

## Files we expect to touch (estimate)

- `src/components/CanvasContextMenu.tsx` — NEW component (~150-200 lines)
- `src/stores/uiStore.ts` — add `contextMenu` slice + open/close actions
- `src/canvas/FabricCanvas.tsx` — wire `mouse:down` button=2 handler
- `src/three/ThreeViewport.tsx` — wire R3F `onContextMenu` on mesh components OR at the Canvas root
- `src/three/WallMesh.tsx`, `ProductMesh.tsx`, `CeilingMesh.tsx`, custom-element meshes — add `onContextMenu` props
- `src/App.tsx` — mount `<CanvasContextMenu />` at top level
- `src/lib/shortcuts.ts` — extract `copySelection` / `pasteSelection` as exported helpers (currently file-private)
- New: `tests/lib/contextMenuActions.test.ts` — unit tests
- New: `e2e/canvas-context-menu.spec.ts` — e2e

Estimated 1 plan, 4-5 tasks, ~10 files touched. Larger than Phase 49/50/52 because of the cross-canvas wiring (2D + 3D).

## Open questions for research phase

1. **Fabric targetFinder behavior:** `fc.findTarget(e.e)` returns the topmost Fabric object — does it correctly identify walls vs products vs ceilings via the `data.id` we set in fabricSync.ts? Confirm the lookup pattern.
2. **R3F onContextMenu propagation:** Does React Three Fiber's onContextMenu propagate up the JSX tree like onClick? Need to know whether to attach handlers per-mesh or at a higher level.
3. **Empty canvas detection in 3D:** When right-click hits no mesh, R3F doesn't fire onContextMenu on any mesh. Does the canvas root receive the event? Or do we attach onPointerMissed at Canvas level?
4. **Helper extraction:** `copySelection` / `pasteSelection` in `src/lib/shortcuts.ts` are currently file-private. Should they be (a) exported, (b) extracted to a new `src/lib/clipboardActions.ts`, or (c) re-implemented inline in CanvasContextMenu? Researcher recommends.
5. **Custom element rename label:** Phase 31 has inline `LabelOverrideInput` with click-to-edit on the canvas label. The "Rename label" menu action should focus that input. How does CanvasContextMenu trigger that without coupling to canvas-internals? Researcher confirms with file:line.
