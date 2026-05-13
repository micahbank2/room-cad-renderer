# Phase 81: Left Panel Restructure (v1.21 IA-02 + IA-03) — Research

**Researched:** 2026-05-13
**Domain:** React + Zustand sidebar IA, localStorage persistence, Fabric.js redraw hooks
**Confidence:** HIGH

## Summary

Both IA-02 (persistent collapse state) and IA-03 (Figma layers-panel rooms tree) are **much closer to "done" than the requirements doc suggests**. The heavy lifting from Phases 46–48 already shipped:

- `PanelSection` (`src/components/ui/PanelSection.tsx`) **already persists open/closed** to `localStorage["ui:propertiesPanel:sections"]` keyed by `id`.
- `RoomsTreePanel` **already renders walls / products / ceilings / custom elements / stairs as leaf nodes** with chevrons, eye icons, click-to-focus camera, double-click-to-saved-camera, and per-room expand persistence under `gsd:tree:room:{roomId}:expanded`.
- `useUIStore.hiddenIds: Set<string>` + `toggleHidden` **already exist** (Phase 46 D-13), and **are already consumed by `FabricCanvas` (2D) and `RoomGroup` / `ThreeViewport` (3D)** — clicking the eye icon today already hides the entity on both canvases.

**Primary recommendation:** Phase 81 is a thin "wire up the last 5%" phase, not a rebuild. Scope is (1) replace the inline non-persistent `PanelSection` clone inside `RoomsTreePanel.tsx`, (2) flip `defaultOpen={false}` on the secondary sections in `Sidebar.tsx`, (3) add a `hoveredEntityId` field to `uiStore` and wire one new prop pair through `TreeRow` → `fabricSync`, (4) add inline rename via `InlineEditableText`. Three commit-shaped plans.

## User Constraints

No CONTEXT.md exists for Phase 81 yet (this research precedes the discuss step). Constraints inferred from `.planning/milestones/v1.21-REQUIREMENTS.md` IA-02 + IA-03 are treated as locked:

### Locked from REQUIREMENTS.md
- Rooms tree stays at the top of the sidebar, expanded by default.
- Secondary panels (Room Config, Materials, Custom Elements catalog, Art Library, Wainscot Library, Snap, Product Library) default to **collapsed** and remember their open/closed state across browser sessions.
- Rooms tree gets visibility toggle per node (eye), hover highlights canvas, click selects, double-click renames inline.
- Walls / products / custom elements / stairs are leaf nodes — NOT separate sidebar sections (Phase 84 moves the catalog *libraries* out, not Phase 81).

### Out of scope for Phase 81 (deferred per phasing table)
- Moving Custom Elements catalog / Art Library / Wainscot Library to tool-bound surfaces — that's **Phase 84 / IA-08**. In Phase 81 they just collapse by default.
- Inspector rebuild (right panel) — Phase 82.
- Floating toolbar redesign — Phase 83.

## Project Constraints (from CLAUDE.md)

- **D-09:** Mixed-case for chrome labels ("Room config", "Show on canvas"). UPPERCASE preserved only for dynamic CAD identifiers (wall IDs in 2D overlay, `.toUpperCase()` product names).
- **§7 StrictMode-safe cleanup:** Any `useEffect` writing to a module-level registry, global, or shared callback collection MUST return identity-check cleanup. Applies to any hover-bridge installation, test driver registration, or `__drive*` shim. Identity check pattern: `if (reg[id] === currentValue) reg[id] = null`.
- **PR-on-Push rule:** Every push to non-main MUST be followed by `gh pr create` if no PR exists.
- **GSD Issues:** Phase 81 plan creation must add `in-progress` label to GH issues mapping to IA-02 / IA-03, and PR body must list `Closes #N` for those issues.

## Current State

### `src/components/Sidebar.tsx` (post PR #169, 75 lines)
- **Header bar:** "Panels" label + collapse caret button (L24–33).
- **Scrollable content** (L36–72), rendered in this order:
  1. `<RoomsTreePanel productLibrary={…} />` — the tree (no PanelSection wrapper at this level; its own internal section is below)
  2. `<PanelSection id="sidebar-room-config" label="Room config">` → `<RoomSettings />`
  3. `<PanelSection id="sidebar-snap" label="Snap" defaultOpen={false}>` → snap select
  4. `<CustomElementsPanel />` — owns its own internal section header
  5. `<FramedArtLibrary />` — owns its own internal section header
  6. `<WainscotLibrary />` — owns its own internal section header
  7. `<PanelSection id="sidebar-product-library" label="Product library">` → `<SidebarProductPicker />`

Phase 80 already removed System Stats + Layers panels (commit `e75bcbd`).

### `src/components/RoomsTreePanel/RoomsTreePanel.tsx` (310 lines)
- **Already does** everything IA-03 needs structurally:
  - `buildRoomTree()` produces walls / products / ceilings / custom / stairs as leaf nodes under each room (via `src/lib/buildRoomTree.ts`)
  - Per-room expand state persists to `localStorage["gsd:tree:room:{roomId}:expanded"]` (L30–35)
  - `onToggleVisibility` calls `useUIStore.toggleHidden(id)` (L187–190)
  - `onClickRow` dispatches `focusOn*` per node kind → selects + moves camera (L192–238)
  - `onDoubleClickRow` does **saved-camera focus**, NOT rename (Phase 48 D-02 contract). Rename is what Phase 81 needs.
- **Gap 1:** Wraps the entire tree in a LOCAL inline `PanelSection` clone (L67–91) that uses `useState(true)` — **NOT persisted**. The shared `ui/PanelSection` exists but isn't used here. Per IA-02 the Rooms section should be persistent (open by default).
- **Gap 2:** No `onHoverEnter` / `onHoverLeave` props on `TreeRow` → no canvas hover-highlight wiring.
- **Gap 3:** No rename affordance. Double-click is currently bound to saved-camera focus (Phase 48 D-02). Conflict to resolve in Plan 81-03 — see Open Questions.

### `src/components/ui/PanelSection.tsx` (113 lines)
- Persists open/closed to `localStorage["ui:propertiesPanel:sections"]` (single JSON object, keyed by `id` prop), via `readUIObject` / `writeUIObject` in `src/lib/uiPersistence.ts`.
- Animated chevron + motion-safe height transitions via `motion/react`.
- Test driver: `window.__drivePanelSection` with `getPersisted/getOpen/toggle` (gated to `MODE === "test"`).
- **Reuse as-is. No changes needed.**

### `src/stores/uiStore.ts` (L72, L243, L330–344)
- `hiddenIds: Set<string>` initialized to empty Set.
- Actions: `toggleHidden(id)`, `setHidden(id, hidden)`, `clearHidden()`.
- **NOT persisted** (Phase 46 D-13 — transient view-state). Per IA-03 verifiable criteria there's no requirement to persist visibility across sessions; reload resets to all visible. Confirm with user in Open Questions, but matches current design.

### `src/canvas/fabricSync.ts` + `src/canvas/FabricCanvas.tsx`
- `FabricCanvas.tsx:121` reads `hiddenIds` from `useUIStore`, redraws on change (in dep array L264).
- `renderWalls`, `renderProducts`, `renderStairs` etc. all take `selectedIds: string[]` and (for stairs) `hiddenIds: Set<string>`. Visibility for walls/products is enforced inside `renderWalls`/`renderProducts` via a hiddenIds check on each iteration (confirmed via dep array — already wired).

### `src/three/RoomGroup.tsx` + `src/three/ThreeViewport.tsx`
- `ThreeViewport.tsx:62` reads `hiddenIds`, passes to `<RoomGroup hiddenIds={hiddenIds}>`.
- `RoomGroup.tsx:78–104` handles room-level + group-level cascade (`{roomId}:walls`, `{roomId}:products`, etc.) and per-entity hides. Memoized on `[hiddenIds, roomId, walls, …]`.

### `src/components/ui/InlineEditableText.tsx`
- Battle-tested rename primitive (Phase 33 GH #88). Used by TopBar project name and PropertiesPanel custom-element label.
- Live-preview on keystroke, commit on Enter/blur, Escape reverts, empty trim reverts. **Reuse verbatim** for tree-row rename.

## Implementation Plan

### 1. Persistent collapse state (IA-02)

**Use the existing primitive — don't invent a new store.** `ui/PanelSection` already persists to `localStorage["ui:propertiesPanel:sections"]`. Wins:
- One JSON key keeps all panel state co-located.
- Same backing store as right-panel sections (Phase 72) — consistent.
- Already SSR-safe + quota-error-swallowing via `uiPersistence.ts`.

**Concrete changes in `src/components/Sidebar.tsx`:**
| Section | Change |
|---------|--------|
| Rooms tree | Wrap in `<PanelSection id="sidebar-rooms-tree" label="Rooms" defaultOpen={true}>`. (Or: remove the local inline `PanelSection` inside `RoomsTreePanel.tsx` and have the parent supply one — recommended, simpler.) |
| Room config | Add `defaultOpen={false}` to existing `id="sidebar-room-config"`. |
| Snap | Already `defaultOpen={false}`. No-op. |
| Custom Elements catalog | `CustomElementsPanel.tsx` owns its own header — refactor to use `<PanelSection id="sidebar-custom-elements" label="Custom elements" defaultOpen={false}>`. |
| Framed Art Library | Same — `<PanelSection id="sidebar-framed-art" label="Framed art library" defaultOpen={false}>`. |
| Wainscoting Library | Same — `<PanelSection id="sidebar-wainscoting" label="Wainscoting library" defaultOpen={false}>`. |
| Product library | Change to `defaultOpen={false}` on `id="sidebar-product-library"`. |

**Storage keys (already in use, just adding new ids):**
- `localStorage["ui:propertiesPanel:sections"]` JSON object: `{ "sidebar-room-config": false, "sidebar-snap": false, "sidebar-custom-elements": false, "sidebar-framed-art": false, "sidebar-wainscoting": false, "sidebar-product-library": false, "sidebar-rooms-tree": true }`.

**Side effect — `RoomsTreePanel.tsx` cleanup:** Delete the local inline `PanelSection` (L67–91) and the `<PanelSection label="Rooms">` wrapper at L287. The parent `Sidebar.tsx` now owns that wrapper. This removes a duplicate primitive and keeps persistence consistent.

### 2. Rooms tree leaf nodes (IA-03 — already done)

**No changes needed.** `buildRoomTree` (in `src/lib/buildRoomTree.ts`) and `TreeRow.tsx` already render walls / products / ceilings / custom / stairs as leaves. Verify by reading `src/lib/buildRoomTree.ts` once during planning to confirm tree shape matches the spec.

Entity ID prefixes (from `src/lib/geometry.ts` `uid()` + CLAUDE.md conventions) are already globally unique: `wall_*`, `pp_*`, `cei_*` / `ceil_*`, `pce_*`, `st_*`, `op_*`. No collision risk.

### 3. Visibility toggle (IA-03 — already done)

**No changes needed.** `TreeRow.tsx:201–216` already renders the Eye / EyeOff button, calls `useUIStore.toggleHidden`. `FabricCanvas` + `RoomGroup` already consume `hiddenIds` and skip render. The IA-03 verifiable criterion "Click the eye icon → wall hides from canvas but stays in tree" passes today.

**Behavior to confirm with user (Open Question 1):** `hiddenIds` is transient — reload resets to all visible. The IA-03 spec doesn't require persistence, but Jessica may expect it. If yes: extend `uiPersistence` with `readUISet` / `writeUISet` and wire into `uiStore` setters (similar pattern to `displayMode` L355–363).

### 4. Hover-highlight (IA-03 — new wiring)

**Recommendation: uiStore field, not a ref-based side channel.** Reasons:
- Fabric.js redraws are already store-driven (`FabricCanvas.tsx:264` dep array). Adding `hoveredEntityId` to that array is one line.
- Matches the existing pattern for `selectedIds` glow.
- Keeps tree → canvas a pure data dependency; no callback registries (avoids §7 StrictMode trap).

**Concrete shape:**
```ts
// uiStore.ts additions
hoveredEntityId: string | null;
setHoveredEntityId: (id: string | null) => void;
```

**TreeRow.tsx changes (L118–132 row container):**
```tsx
onMouseEnter={() => props.onHoverEnter?.(node.id)}
onMouseLeave={() => props.onHoverLeave?.()}
```
Plus new optional props `onHoverEnter?: (id: string) => void`, `onHoverLeave?: () => void`. RoomsTreePanel wires both to `useUIStore.getState().setHoveredEntityId`. Debounce 50ms to avoid thrash on fast tree scroll (use `requestAnimationFrame` coalesce, not setTimeout — see Pitfall 3).

**fabricSync.ts changes:**
- `renderWalls` / `renderProducts` / `renderStairs` accept a `hoveredId: string | null` param.
- When `wall.id === hoveredId`, paint a 2px accent-purple outline + ~600ms fade glow. Reuse the existing selected-state styling code path; add an `isHovered` boolean alongside `isSelected`.

**FabricCanvas.tsx changes:**
- Add `const hoveredId = useUIStore((s) => s.hoveredEntityId);` and include in the redraw dep array (L264).

**3D hover (defer to Phase 82 if scoped out):** The IA-03 verifiable criterion mentions "2D canvas" only ("hover 'North wall' in tree → wall briefly glows on the 2D canvas"). 3D hover is nice-to-have; recommend defer. Confirm with user (Open Question 2).

### 5. Click-to-select (IA-03 — already done)

`focusDispatch.ts` `focusOnWall`/`focusOnPlacedProduct`/etc. each call `useUIStore.select([id])` after the camera dispatch. PropertiesPanel mounts off `selectedIds.length > 0` (audit doc L28). **No changes needed.**

### 6. Double-click-to-rename (IA-03 — new wiring, conflict to resolve)

**Conflict:** `onDoubleClickRow` is bound today to **saved-camera focus** (Phase 48 D-02, `RoomsTreePanel.tsx` L240–281). IA-03 says double-click should rename inline.

**Recommendation (Open Question 3):** Remap interactions:
- **Double-click on label text** → rename via `InlineEditableText` (new behavior).
- **Double-click on the camera-indicator badge** at row right (existing `Camera` icon shown when `hasSavedCamera`) → saved-camera focus (move existing behavior here).
- Or: rename only on a long-press / F2 / dedicated edit-pencil icon, leave dbl-click alone.

**InlineEditableText reuse pattern:**
- Add row-local `isEditing: boolean` state in `TreeRow`.
- When editing, swap the `<button data-tree-row className={labelClass}>` (L174–187) for `<InlineEditableText value={node.label} maxLength={40} onCommit={…} onLivePreview={…} data-testid={\`tree-row-edit-${node.id}\`} />`.
- onCommit: dispatch a cadStore rename action per node kind:
  - `room` → `cadStore.renameRoom(roomId, name)` (likely exists; verify in Plan 81-03)
  - `wall` → need new action `renameWall(roomId, wallId, name)` writing to a new optional `WallSegment.name?: string` field. Today walls don't have user labels (just `WALL_SEGMENT_{id}` derived). **Schema impact** — see Pitfall 4.
  - `product` → `placedProduct.labelOverride?: string` (mirror Phase 31 pattern, may already exist for products too — verify in `src/types/cad.ts`)
  - `custom` → `placedCustomElement.labelOverride?: string` (Phase 31 D-09, already exists)
  - `ceiling` → `Ceiling.labelOverride?: string` (new optional field)
  - `stair` → `Stair.label` (Phase 60 STAIRS-01 already shipped a label field; verify)

**Defer to Plan 81-03 questions:** Does `WallSegment` get a `name` field? Does `Ceiling`? If user says "v1.21 doesn't need to rename walls" we can scope rename to nodes that already have a label field today and skip schema changes.

## Pitfalls

### Pitfall 1: StrictMode double-mount on test drivers
**Trap:** Adding `window.__driveSidebarPanel` or any new test driver from a `useEffect` without identity-check cleanup. CLAUDE.md §7: any module-level registry write needs cleanup. Phase 64 (`acfb9c2`) and Phase 58 (`f5f6c46`) hit this.
**Prevention:** Test drivers must follow the pattern:
```ts
useEffect(() => {
  const reg = window as ...;
  const me = { … };
  reg.__driveX = me;
  return () => { if (reg.__driveX === me) reg.__driveX = null; };
}, []);
```

### Pitfall 2: `PanelSection` hydration on initial render
**Trap:** `readUIObject` reads localStorage synchronously inside `useState(() => …)`. This is fine — no async. BUT: if Phase 81 ever migrates panel state to IndexedDB (idb-keyval), it becomes async and the first render uses defaults. Today this is NOT a problem because the existing `PanelSection` already uses localStorage. Stick with it.
**Prevention:** Do NOT move panel state to IndexedDB. localStorage is the right tier (small JSON, synchronous, ~10KB max).

### Pitfall 3: Hover thrash on tree scroll
**Trap:** Fast mouse moves over a long tree fire `setHoveredEntityId` 60+ times/sec → Fabric redraws each time → frame drops.
**Prevention:** Coalesce via `requestAnimationFrame`:
```ts
let pending: string | null | undefined = undefined;
function setHoverThrottled(id: string | null) {
  if (pending !== undefined) { pending = id; return; }
  pending = id;
  requestAnimationFrame(() => { useUIStore.getState().setHoveredEntityId(pending!); pending = undefined; });
}
```
Or: only highlight on `onMouseEnter` after a 50ms dwell timer (debounce). RAF-coalesce is simpler.

### Pitfall 4: Wall rename breaks 2D dimension labels
**Trap:** Today 2D wall overlay reads from `WALL_SEGMENT_{id}` (UPPERCASE per D-10 dynamic-id convention). If wall gets a user-facing `name`, the tree shows mixed-case but the overlay stays UPPERCASE id — inconsistent.
**Prevention:** Either (a) display name only in the tree, keep overlay using id; (b) display `name || \`WALL_SEGMENT_${id}\`` in both places. Recommend (a) — fewer code paths to touch, preserves UPPERCASE D-10 for IDs.

### Pitfall 5: Visibility undo invalidation
**Trap:** Adding visibility toggles to undo/redo history. `hiddenIds` is intentionally view-state (Phase 46 D-13) — not in cadStore, not in CADSnapshot. If a future commit accidentally pushes it to undo history, every Ctrl+Z that intended to undo a geometry change might just toggle visibility. The existing setter `toggleHidden` already correctly stays in uiStore — keep it that way.
**Prevention:** Code review: `hiddenIds` MUST stay in uiStore, never in CADSnapshot or cadStore actions.

### Pitfall 6: Backward-compat for old `gsd:tree:room:*` keys
**Trap:** Existing users (Jessica) have per-room expand state stored under `gsd:tree:room:{roomId}:expanded`. If we move tree-section state into `ui:propertiesPanel:sections`, the per-room state under the inner tree is unaffected (different key, different concern). No migration needed — just verify both keys coexist.
**Prevention:** Test with a localStorage entry pre-populated under `gsd:tree:room:*` to confirm it still drives per-room expand after the refactor.

## Plan Decomposition (recommendation)

Three commit-shaped plans, each independently shippable.

### Plan 81-01: Persistent panel collapse state (IA-02)
**Scope:**
- Refactor `Sidebar.tsx` to wrap each section in `ui/PanelSection` with stable `id` props (`sidebar-rooms-tree`, `sidebar-room-config`, `sidebar-snap`, `sidebar-custom-elements`, `sidebar-framed-art`, `sidebar-wainscoting`, `sidebar-product-library`).
- Refactor `CustomElementsPanel.tsx`, `FramedArtLibrary.tsx`, `WainscotLibrary.tsx` to drop their internal panel headers (or accept a `noHeader` prop) so the parent `PanelSection` is the only one.
- Delete the local inline `PanelSection` clone inside `RoomsTreePanel.tsx`.
- Set `defaultOpen={false}` on all secondary sections; `defaultOpen={true}` on Rooms.
- Unit test: `__drivePanelSection.getPersisted()` returns the expected keys after toggle.
- E2E: open → all secondary collapsed; expand Materials/Custom Elements → reload → still expanded.

**Estimated:** 1 commit, ~150 LOC diff.

### Plan 81-02: Tree-to-canvas hover highlight (IA-03 hover criterion)
**Scope:**
- Add `hoveredEntityId: string | null` + `setHoveredEntityId` to `uiStore.ts`.
- Wire `onMouseEnter` / `onMouseLeave` on `TreeRow` row container (not the buttons — those have their own hover styles).
- Add `hoveredId` param to `renderWalls`/`renderProducts`/`renderStairs` in `fabricSync.ts`; paint 2px accent-purple outline when hovered (no fade — Fabric renders state, not animation; if a glow pulse is required, use a CSS-overlay approach or skip for v1).
- Include `hoveredId` in `FabricCanvas.tsx` redraw dep array.
- RAF-coalesce the setter to prevent thrash.
- Test driver: `window.__driveTreeHover.enter(id)` / `.leave()`.
- E2E: hover "North wall" tree row → 2D canvas wall briefly outlined; mouseleave → outline cleared.

**Estimated:** 1 commit, ~120 LOC diff.

### Plan 81-03: Inline rename via double-click (IA-03 rename criterion)
**Scope:**
- Resolve dbl-click conflict (per Open Question 3) — most likely move saved-camera dispatch to a different affordance (camera icon dbl-click or F8 hotkey).
- Add `isEditing` row-local state to `TreeRow`; swap label for `<InlineEditableText>` while editing.
- Add `renameNode(node, name)` dispatcher in `RoomsTreePanel.tsx` that switches by `node.kind` and calls the right cadStore action per kind.
- Schema additions (only if approved): `WallSegment.name?: string`, `Ceiling.labelOverride?: string`. Stair already has `label`, custom-element already has `labelOverride`, room already has a renameable name.
- Test driver: `window.__driveTreeRename.start(id)`, `.type(text)`, `.commit()`.
- E2E: dbl-click a custom-element row → input appears with existing label → type new name → press Enter → tree updates.

**Estimated:** 1 commit, ~200 LOC diff (more if schema changes land).

**Total milestone:** 3 PRs (`gsd/phase-81-left-panel-01`, `-02`, `-03`), all closing the same v1.21 milestone.

## Open Questions for Plan Phase

1. **Should `hiddenIds` (visibility state) persist across browser sessions, or reset on reload (current behavior)?** REQUIREMENTS.md IA-03 verifiable criteria don't require persistence. Phase 46 D-13 intentionally made it transient. **Recommendation:** keep transient (reset on reload). Jessica's intuition is probably "the eye is a per-session view filter, not a delete." Confirm with user.

2. **Does 3D hover-highlight need to land in Phase 81, or defer to Phase 82 (inspector rebuild)?** IA-03 verifiable criterion mentions 2D canvas only. **Recommendation:** defer 3D hover to Phase 82 — keeps Plan 81-02 tight.

3. **How to resolve the double-click conflict (rename vs. saved-camera focus)?** Three options:
   - **(Recommended)** Move saved-camera focus to a dedicated affordance: dbl-click the `Camera` icon badge (or single-click it if it's currently no-op). Frees dbl-click for rename uniformly.
   - Single-click + dwell tooltip for rename, dbl-click stays for saved camera. Worse — slow.
   - F2 hotkey for rename, dbl-click stays for saved camera. Discoverability problem for Jessica.

4. **Should `WallSegment` get a user-facing `name` field?** Today walls don't have user labels. Adding one means a CADSnapshot schema bump + serialization migration. **Recommendation:** YES if scope allows — Jessica will want to label "North wall" / "Window wall". But this is a schema change; flag for explicit user approval in discuss-phase.

5. **Should the Phase 80 audit Snap-belongs-in-FloatingToolbar move land in Phase 81 or wait for Phase 83?** The audit row (L20) says "Move to FloatingToolbar utility group" but `defaultOpen={false}` in Phase 81 is the cheap interim. **Recommendation:** stay in sidebar collapsed in Phase 81; full move in Phase 83 / IA-06.

## Sources

### Primary (HIGH confidence) — all code paths verified by direct file read
- `src/components/Sidebar.tsx` (current post-PR-#169 implementation)
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` (310 lines — full read)
- `src/components/RoomsTreePanel/TreeRow.tsx` (252 lines — full read; visibility + saved-camera + click already wired)
- `src/components/ui/PanelSection.tsx` (113 lines — full read; persistence already shipped Phase 72)
- `src/components/ui/InlineEditableText.tsx` (140 lines — full read; reusable rename primitive)
- `src/stores/uiStore.ts` (433 lines — confirmed `hiddenIds` Set + `toggleHidden` action exist; identified single line to add `hoveredEntityId`)
- `src/lib/uiPersistence.ts` (read; `readUIObject`/`writeUIObject` JSON object helpers)
- `src/canvas/fabricSync.ts` (grep map — `renderWalls`/`renderProducts`/`renderStairs` signatures with `selectedIds`)
- `src/canvas/FabricCanvas.tsx` (L121, L245, L264 — `hiddenIds` already consumed and in redraw dep array)
- `src/three/RoomGroup.tsx` + `ThreeViewport.tsx` (3D `hiddenIds` cascade already wired)
- `src/components/RoomsTreePanel/focusDispatch.ts` (214 lines — full read; click-handlers + saved-camera dispatch)
- `.planning/milestones/v1.21-REQUIREMENTS.md` IA-02 + IA-03 (REQ source of truth)
- `.planning/milestones/v1.21-SIDEBAR-AUDIT.md` (60-row audit; left panel L13–24)
- `./CLAUDE.md` D-09, §7 StrictMode

### Metadata
- **Confidence breakdown:**
  - Current state: HIGH — every file read in full or grep-verified.
  - Implementation plan: HIGH — leverages existing primitives, no novel architecture.
  - Pitfalls: HIGH — pattern matches documented Phase 58 / 64 traps in CLAUDE.md §7.
- **Research date:** 2026-05-13
- **Valid until:** 30 days (codebase is stable post-PR-#169; no major refactors planned in v1.21 that would invalidate this)
