# Phase 46: Rooms Hierarchy Sidebar Tree (TREE-01) — Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Adds a "Rooms" panel to the Sidebar showing all rooms in the project as a collapsible tree. Each room expands to show grouped children (Walls / Ceiling / Products / Custom Elements). Clicking a node selects it (drives `uiStore.selectedIds`) AND focuses the camera on it via existing infrastructure. Each node has an eye-icon visibility toggle.

**Out of scope (later phases):**
- Per-node bookmarked camera + double-click "Focus" action → Phase 48 (CAM-04)
- Display modes (NORMAL / SOLO / EXPLODE) → Phase 47 (DISPLAY-01)
- Drag-to-reparent nodes between rooms (not in TREE-01 acceptance)
- Right-click context menu (Phase 48 territory)

</domain>

<decisions>
## Implementation Decisions

### Sidebar Placement & Default State
- **D-01:** Rooms tree panel sits at the **top of the Sidebar, above Room config**. Tree is the spatial navigator — knowing "where am I" comes before tweaking room dimensions. Highest discoverability slot.
- **D-02:** Default state on first load: **panel open, active room expanded, other rooms collapsed**. Immediately useful — user sees what's in the room they're working on without paying clicks.
- **D-03:** Persist open/closed state across sessions via **localStorage**, mirroring Phase 33 `CollapsibleSection` behavior. Each room's expanded state is remembered separately.

### Node Labels
- **D-04:** Walls labeled by **cardinal direction** ("North wall", "East wall", "South wall", "West wall"). Computed from wall vector at render time. Diagonal walls (off-axis > ~22.5°) fall back to "Wall N" by index.
- **D-05:** Products and custom elements labeled as **catalog name + index when duplicates exist** (e.g., "Sofa", then "Sofa (2)" for the second). Custom elements use `placedCustomElement.labelOverride` if set (Phase 31 D), otherwise catalog name + index.
- **D-06:** Ceilings render as a **single "Ceiling" node per room**. Matches the data model — one ceiling object per `RoomDoc`. Per-tile/per-face nesting is deferred (no current data model support).

### Click-to-Focus Camera Framing
- **D-07:** **Wall click** → reuse existing **MIC-35 wall-side framing**. Tree-click drives the same selection path as canvas-click; the existing wall-side lerp animates camera to face the interior. Zero new camera code.
- **D-08:** **Product / custom-element click** → **bbox-fit tween via Phase 35 `pendingPresetRequest` infrastructure**. Compute bbox of the placed item, derive camera position at ~1.5× the bbox diagonal looking at center, dispatch via the same `pendingPresetRequest` shape that Phase 35 presets use. Reuses easeInOutCubic + reduced-motion snap.
- **D-09:** **Ceiling click** → **tilt camera up to face the ceiling, room-bbox framed**. Camera moves to room center at floor level looking straight up — only sensible angle for a ceiling. Dispatched via Phase 35 tween.
- **D-10:** **Room (top-level) click** → **dual action: switch active room (`switchRoom()`) AND frame the room bbox** via Phase 35 tween. Tree becomes a richer alternative to RoomTabs (which stays unchanged for at-a-glance switching).

### Visibility Scope & Cascade
- **D-11:** Eye icon hides nodes from **3D viewport only**. 2D Fabric canvas remains unchanged — still useful as the planning surface where you need to see everything. Matches CAD tool conventions: visibility is a 3D-rendering concern.
- **D-12:** Hiding a parent **cascades to children**. Hiding a room hides everything in it; hiding the "Walls" group hides every wall in that room. Children render their eye icon **dimmed** to indicate "parent-hidden" state (still individually toggleable when parent is shown again).
- **D-13:** Visibility state is **transient — always resets to all-visible on page load**. Not persisted. Visibility is an inspection tool, not a saved view; persistence risks "where did my couch go" confusion after restore. Aligns with REQUIREMENTS.md acceptance: "view-state, not CAD-state, so undo/autosave skip it."

### Carried forward from prior phases (not re-discussed)
- **Phase 33 D:** Reuse `CollapsibleSection` primitive at `src/components/ui/CollapsibleSection.tsx`.
- **Phase 33 D:** Lucide icons throughout (ChevronRight/Down for tree expand, Eye/EyeOff for visibility).
- **REQUIREMENTS.md TREE-01:** `uiStore.selectedIds` is single source of truth — tree-click and canvas-click drive the same selection path.
- **REQUIREMENTS.md TREE-01:** New field `uiStore.hiddenIds: Set<string>` — view-state, no undo/autosave triggers.
- **Phase 35 D:** `pendingPresetRequest` consumer in `ThreeViewport.tsx:257` is the integration point for camera focus dispatches.
- **Phase 33 D-39 / Phase 35 D:** `useReducedMotion()` honored — when ON, camera focus snaps instead of tweens.
- **Phase 33 D-03/D-04:** Mixed-case for static UI labels ("Rooms", "Walls", "Ceiling", "Products", "Custom Elements"); UPPERCASE preserved for dynamic identifiers if any surface (none currently).

### Claude's Discretion
- Group-level header rendering (whether "Walls / Ceiling / Products / Custom Elements" headers are themselves collapsible groups vs. plain section labels) — implementation detail; planner picks based on what reads cleanest.
- Empty-state copy for rooms with no walls/products yet ("No walls yet" or just hidden).
- Hover affordances (highlight on hover, color tokens for hidden vs. shown rows).
- Indent depth and tree-line connector styling (within Phase 33 design tokens).
- Whether the ⌥/Alt-click to "solo-show" pattern is worth a tiny bit of polish (defer if not trivial).

### Folded Todos
None — no pending todos matched Phase 46 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` § TREE-01 — Authoritative acceptance criteria for this phase
- `.planning/ROADMAP.md` § Phase 46 — Goal statement, dependencies, plan estimate

### Existing infrastructure to reuse
- `src/components/ui/CollapsibleSection.tsx` — Phase 33 primitive (used for the per-room collapsible)
- `src/components/Sidebar.tsx` — Insertion point for the new Rooms panel (top, above Room config)
- `src/components/RoomTabs.tsx` — Existing single-active-room switcher (coexists with the tree, do NOT replace)
- `src/stores/cadStore.ts` § `Room`, `RoomDoc`, `rooms`, `activeRoomId`, `switchRoom` — Data source
- `src/stores/uiStore.ts` § `selectedIds`, `select`, `pendingPresetRequest` — Selection + camera dispatch
- `src/three/ThreeViewport.tsx:214-302` — MIC-35 wall-side branch + Phase 35 preset tween consumer (camera focus path)
- `src/three/cameraPresets.ts` (referenced by Sidebar imports) — Preset pose computation (model for bbox-fit math)
- `src/hooks/useReducedMotion.ts` — D-39 motion guard

### Prior CONTEXT decisions to preserve consistency with
- `.planning/phases/45-auto-generated-material-swatch-thumbnails-thumb-01/45-CONTEXT.md` — Most recent UI phase; same design-token + lucide-icon conventions
- `.planning/phases/33-*` (multiple) — Design-system foundation (typography, spacing, CollapsibleSection)
- `.planning/phases/35-*` (CAM-02) — Preset-tween infrastructure for camera focus

### External references
- Source GitHub issue: https://github.com/micahbank2/room-cad-renderer/issues/78 — Pascal-inspired feature scope

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`CollapsibleSection`** (`src/components/ui/CollapsibleSection.tsx`) — Per-room expand/collapse. Already supports localStorage persistence per Phase 33.
- **`useCADStore.rooms`** (`src/stores/cadStore.ts:27`) — `Record<string, RoomDoc>` keyed by `room.id`. Each `RoomDoc` has `walls`, `placedProducts`, `placedCustomElements`, `ceiling` (or similar — planner to confirm exact shape).
- **`useUIStore.selectedIds`** (`src/stores/uiStore.ts:13`) — Already wired into canvas selectTool. Tree click just calls `select([id])`.
- **`useUIStore.pendingPresetRequest`** + `ThreeViewport.tsx:257` consumer — Phase 35 tween dispatcher. Tree focus dispatches into this same field with computed pose.
- **`InlineEditableText`** (`src/components/ui/InlineEditableText.tsx`) — Phase 33 primitive used by RoomTabs for room-name editing. NOT needed for the tree (tree shows derived labels), but worth knowing if room-rename interaction is ever wanted in the tree.
- **lucide-react** — Already installed (Phase 33). Use `ChevronRight`, `ChevronDown`, `Eye`, `EyeOff` icons.

### Established Patterns
- **Sidebar panels are direct children of the scrollable `<div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">`** in `Sidebar.tsx`. Insert "Rooms" `<CollapsibleSection>` as the FIRST child (before "Room config").
- **View-state lives on `uiStore`, not `cadStore`** — `hiddenIds` is view-state, so no Immer history snapshot, no autosave trigger. (`uiStore` is plain Zustand without Immer wrapping.)
- **Camera dispatch pattern (Phase 35):** Set `useUIStore.setState({ pendingPresetRequest: { id, ... } })`, ThreeViewport consumes + nulls. For tree-driven focus, may need a sibling field `pendingCameraTarget` if `id`-based presets don't generalize — planner decides.
- **Mixed-case labels** — Section headers like "Rooms", "Room config" use mixed-case (Phase 33 D-03). UPPERCASE only for dynamic IDs/values.
- **Cardinal-direction wall computation** — Compute angle of `(end - start)`, snap to nearest cardinal (N/E/S/W) within ±22.5°. Outside that range = "Wall N".

### Integration Points
- **`Sidebar.tsx` (top of `<div className="flex-1 ...">` block)** — New `<RoomsTreePanel>` mounts here above `<RoomSettings>`.
- **`uiStore.ts`** — Add `hiddenIds: Set<string>` field + `toggleHidden(id: string)` + `clearHidden()` actions. NO Immer wrapping (uiStore is plain Zustand).
- **`ThreeViewport.tsx`** — Read `useUIStore.hiddenIds` and skip rendering for any wall/product/customElement/ceiling whose id is in the set OR whose parent (room/group) is in the set. Cascade logic lives in selector or render-skip predicate.
- **`cadStore.ts`** — NO mutations needed. Tree is purely read + view-state.

</code_context>

<specifics>
## Specific Ideas

- Tree at the **top** of sidebar — modeled after Pascal Editor's left rail (per source GH issue #78).
- Cardinal direction wall labels — user explicitly chose this over indexed/length-based ("North wall" reads more meaningfully than "Wall 3").
- Eye-icon dimmed state when parent-hidden — visual signal that "this is hidden because its container is hidden, not because you toggled it".

</specifics>

<deferred>
## Deferred Ideas

- **Per-node bookmarked camera + double-click Focus action** → Phase 48 / CAM-04 (already scoped on roadmap).
- **Display modes (NORMAL / SOLO / EXPLODE) toolbar selector** → Phase 47 / DISPLAY-01 (already scoped).
- **Right-click context menu on tree nodes** ("Save current camera here", "Focus camera here") → Phase 48 / CAM-04 (context menu UI ships with savedCamera fields).
- **Drag-to-reparent nodes between rooms** — not in TREE-01 acceptance; would belong in a future "Rooms manager" phase if pursued.
- **Search / filter within tree** — speculative; revisit if tree grows past ~30 nodes per room and visibility becomes a problem.
- **Group-level "isolate" action** (Alt-click to solo-show one group) — small polish, planner can ship if trivial otherwise defer.

### Reviewed Todos (not folded)
None reviewed — no pending todos matched.

</deferred>

---

*Phase: 46-rooms-hierarchy-sidebar-tree-tree-01*
*Context gathered: 2026-04-26*
