# Phase 84: Contextual Visibility (IA-08, v1.21) — Research

**Researched:** 2026-05-14
**Domain:** Sidebar contextual visibility — sidebar PanelSections mount only when their tool is active
**Confidence:** HIGH (codebase is the authoritative source; no external libs involved)
**Closes:** GH #177

## Summary

IA-08 says: three sidebar libraries (Custom Elements, Framed Art, Wainscot) should mount only when their relevant tool is active, following the Phase 79 WindowPresetSwitcher precedent (`{activeTool === "window" && <…/>}`).

**Critical finding that reshapes the plan:** The `ToolType` union in `src/types/cad.ts:381-396` has **no wainscot, customElement, or framedArt tool**. The 12 tools are: `select | wall | door | window | product | ceiling | stair | archway | passthrough | niche | measure | label`. None of these gate the 3 sidebar libraries.

That means literal "mount when tool active" cannot be implemented without first adding tools to the `ToolType` union — which contradicts the milestone's "no new tools" constraint (v1.21 REQUIREMENTS §"Out of scope"). The phase MUST reinterpret IA-08 as **mount when the relevant workflow is active**, where the workflow trigger is either (a) a `selectedIds` shape, (b) a uiStore flag, or (c) an existing tool that the user is already in when they reach for the library.

**Primary recommendation:** Gate by `activeTool` for surfaces that map cleanly to an existing tool (CustomElements → `product` tool, with caveat below), and gate by **selection shape** for the other two (FramedArt → wall selected with `activeSide` toggle; Wainscot → wall selected). For all three, **remove the sidebar PanelSection entirely** when the gate is false (true unmount, no empty space).

---

## User Constraints (from CONTEXT.md)

No `84-CONTEXT.md` exists. The orchestrator prompt + IA-08 issue body serve as locked constraints:

### Locked Decisions
- Follow the Phase 79 precedent (`{activeTool === X && <Section/>}`) WHERE A MATCHING TOOL EXISTS.
- Selecting an object on canvas MUST NOT auto-switch tools (already shipped; do not regress).
- The right-panel inspector still surfaces the relevant editor for the selected object regardless of tool (already shipped Phase 82; do not regress).
- No new product capabilities. v1.21 is layout + IA only.

### Claude's Discretion
- Whether to add new `ToolType` entries for wainscot / customElement / framedArt, OR gate by selection shape / uiStore flag.
- Plan decomposition (1 vs 2 plans).
- Whether to add a "no tool active" hint where the 3 sections used to sit.

### Deferred Ideas (OUT OF SCOPE)
- Adding new product features.
- Refactoring how wainscot / custom-elements / framed-art are actually *placed* on canvas. This phase is visibility-only.
- A general-purpose "panel registry" abstraction. Keep it inline in `Sidebar.tsx`.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IA-08 | Tool-specific surfaces only mount when relevant tool active. Wainscot, Custom Elements, Framed Art are the three targets. | §Tool-to-Section Mapping + §Implementation Plan below. |

---

## Current State

### Sidebar.tsx post-Phase 83 — 6 PanelSections

`src/components/Sidebar.tsx` (69 lines). All sections wrap `PanelSection` with stable `sidebar-*` ids and persist their expanded state to `localStorage["ui:propertiesPanel:sections"]`.

| Order | Id | Label | `defaultOpen` | Component | Currently gated? |
|-------|----|-------|--------------|-----------|------------------|
| 1 | `sidebar-rooms-tree` | "Rooms" | `true` | `RoomsTreePanel` | Always mount — keep. |
| 2 | `sidebar-room-config` | "Room config" | `false` | `RoomSettings` | Always mount — keep. |
| 3 | `sidebar-custom-elements` | "Custom elements" | `false` | `CustomElementsPanel` | **TARGET — always mounts today.** |
| 4 | `sidebar-framed-art` | "Framed art library" | `false` | `FramedArtLibrary` | **TARGET — always mounts today.** |
| 5 | `sidebar-wainscoting` | "Wainscoting library" | `false` | `WainscotLibrary` | **TARGET — always mounts today.** |
| 6 | `sidebar-product-library` | "Product library" | `false` | `SidebarProductPicker` | Always mount — keep per audit ("collapse by default, auto-expand on product tool"). |

Phase 83 already removed System Stats, Layers, and moved Snap to FloatingToolbar.

### ToolType enum — full enumeration

`src/types/cad.ts:381-396`:

```ts
export type ToolType =
  | "select" | "wall" | "door" | "window" | "product" | "ceiling"
  | "stair" | "archway" | "passthrough" | "niche"  // Phase 60 / 61
  | "measure" | "label";                            // Phase 62
```

**No `wainscot`, no `customElement`, no `framedArt` / `wallArt` / `art`.** Verified via `grep`.

`setTool()` (`uiStore.ts:296`) wipes `selectedIds` AND `selectedOpeningId` on tool change. This is important: switching tools clears the right-panel inspector context — the IA-08 verifiable ("selecting a panel on canvas in Wall tool surfaces wainscot inspector in right panel") is consistent because the user is in Wall tool and selects a wall (wall inspector shows; WallSurfacePanel hosts the wainscot picker as a wall-selection editor, see `WallSurfacePanel.tsx:25`).

### How the Phase 79 WindowPresetSwitcher gating works (precedent)

`src/App.tsx:270`:
```tsx
{activeTool === "window" && <WindowPresetSwitcher />}
```

`activeTool` is read once at the top of App.tsx (`src/App.tsx:64`). The switcher is a sibling of the FabricCanvas, not inside Sidebar. **Identical gate-form** can be applied inside `Sidebar.tsx` body — render `{activeTool === X && <PanelSection …>}` per section.

WindowPresetSwitcher writes to a module-level bridge ref (`windowTool.setPendingPreset()`) on mount — CLAUDE.md §7 StrictMode-safe-cleanup pattern applies, and Phase 79 already implemented it. **The three Phase 84 panel components do NOT write to any module-level registry** (verified: `CustomElementsPanel.tsx`, `FramedArtLibrary.tsx`, `WainscotLibrary.tsx` only read from stores + local React state). So **no StrictMode cleanup work is required for Phase 84.**

### How each library's catalog state survives unmount

Each library reads catalog data from a Zustand store, so unmounting the component does NOT lose user data. Verified:

| Component | Store | Persistence |
|-----------|-------|-------------|
| `CustomElementsPanel` | `useCustomElements()` selector on `cadStore` (`cadStore.ts:1774`) — catalog lives in CADSnapshot, persisted by autosave to IndexedDB | Survives unmount, survives reload |
| `FramedArtLibrary` | `useFramedArtStore` (`stores/framedArtStore.ts:21`) — has a `subscribe(...)` that writes to IndexedDB on every change (`framedArtStore.ts:68`) | Survives unmount, survives reload |
| `WainscotLibrary` | `useWainscotStyleStore` (`stores/wainscotStyleStore.ts:21`) — has a `subscribe(...)` writing to IndexedDB (`wainscotStyleStore.ts:61`) | Survives unmount, survives reload |

The only local React state inside each component is **create-form draft state** (`useState` for `name`, `imageUrl`, `creating`, etc.). Unmounting WILL wipe an in-progress create form. This is acceptable because:
1. Tool switches are intentional user actions.
2. The user can't be editing the wainscot draft and also be in the Wall tool simultaneously.
3. The user already loses the same draft state today when collapsing the PanelSection (no — PanelSection collapse just hides via CSS, doesn't unmount). **Mitigation:** if planner is worried, the create-form draft state could be lifted to a uiStore slice. Recommend **NOT** doing this — overkill for a tool-switch edge case Jessica is unlikely to trip.

### How each library is actually used (placement entry points)

This determines which tool / selection state legitimately gates each library.

**CustomElementsPanel:** clicks `LibraryCard` → `placeCustomElement(el.id, { x: room.width/2, y: room.length/2 })` (`CustomElementsPanel.tsx:38-40`). Drops the element at the room's geometric center, NOT at the cursor. **No tool involved.** This means today there is no "custom element tool" concept — the library card click IS the placement gesture.

**FramedArtLibrary:** has a `+ NEW` upload form to add items to the catalog. **Placement on a wall happens elsewhere** — `WallSurfacePanel.tsx:89-101` (`handleAddFromLibrary`) calls `addWallArt(wall.id, …)` when a user has a wall selected and picks an art item from the inline picker inside WallSurfacePanel. The sidebar `FramedArtLibrary` is **catalog management only**.

**WainscotLibrary:** has a `+ NEW` form + edit-existing list. **Applying wainscot to a wall** happens via `WallSurfacePanel` (a wainscot picker dropdown that writes `wall.wainscoting[side].styleItemId`). The sidebar `WainscotLibrary` is **catalog management only**.

This re-frames the problem. None of the three sidebar libraries are "place-from-this-panel" tools (except CustomElements, which auto-drops at room center). They are **catalog managers**. The IA-08 ask, restated honestly: *"Hide these catalog managers when the user isn't doing the workflow they belong to."*

---

## Tool-to-Section Mapping (Opinionated)

The literal "tool === X" gate works for ZERO of the three sections. Here is the recommended mapping for each. Each cell shows the gate expression and the rationale.

| Section | Recommended Gate | File | Rationale |
|---------|------------------|------|-----------|
| **CustomElementsPanel** | `activeTool === "select" || activeTool === "product"` | `sidebar-custom-elements` | Custom elements drop on click. The user reaches for this catalog while in select (to drop-then-arrange) or product (during product placement workflow). Hide it in drawing tools (wall / door / window / measure / etc.) where it's irrelevant. **Alternative considered:** add a new `"customElement"` ToolType. Rejected — would require changing the click-card-to-place flow, which is out of scope. |
| **WainscotLibrary** | `activeTool === "select" && selectedIds.length === 1 && walls[selectedIds[0]]` (i.e. a wall is selected) | `sidebar-wainscoting` | Wainscot is wall-finish chrome. The right-panel `WallSurfacePanel` is where wainscot is actually *applied* to the selected wall. The sidebar `WainscotLibrary` is the catalog manager — surface it next to the wall-surface workflow. **Alternative considered:** gate by a hypothetical `activeTool === "wainscot"`. Rejected — no such tool exists, and the audit's "wainscot tool" language is aspirational. |
| **FramedArtLibrary** | `activeTool === "select" && selectedIds.length === 1 && walls[selectedIds[0]]` (same wall-selected gate) | `sidebar-framed-art` | Same shape as wainscot: art is placed via `WallSurfacePanel.handleAddFromLibrary` when a wall is selected. The sidebar library is the catalog manager for the wall-finish workflow. |

**Why this passes IA-08's verifiable spec:**

- *"Activate Wall tool → Wainscot Library section is hidden in the left panel"* — ✅ `activeTool === "wall"` ≠ `"select"`, gate is false.
- *"Activate Wainscot tool → Wainscot Library appears"* — There IS no wainscot tool. Reinterpret: activate the wainscot **workflow** (select a wall via select tool) → Wainscot Library appears. This is honest to the user intent: "show me the library when I'm doing the thing the library is for."
- *"Selecting a wainscot panel on canvas while in Wall tool does NOT switch tools, but DOES surface the wainscot inspector in the right panel"* — ✅ Already shipped Phase 82. Phase 84 does not touch the right panel.

**If the user (Micah) rejects this gating strategy** — Open Question §1 below lists alternatives. The plan phase should checkpoint with Micah before implementation.

---

## Implementation Plan

### Sidebar.tsx changes (small)

Wrap each of the 3 PanelSections in a conditional. **Fully unmount** (PanelSection itself disappears, no empty space) per IA-08 spec language ("hidden" vs "collapsed" — IA-08 means hidden).

Reads at the top of `Sidebar()`:
```ts
const activeTool = useUIStore((s) => s.activeTool);
const selectedIds = useUIStore((s) => s.selectedIds);
const walls = useCADStore((s) => s.rooms[s.activeRoomId ?? ""]?.walls ?? {});
const wallSelected = selectedIds.length === 1 && !!walls[selectedIds[0]];
const customElementsVisible = activeTool === "select" || activeTool === "product";
const wallSurfaceVisible = activeTool === "select" && wallSelected;
```

Body:
```tsx
{customElementsVisible && (
  <PanelSection id="sidebar-custom-elements" label="Custom elements" defaultOpen={false}>
    <CustomElementsPanel />
  </PanelSection>
)}
{wallSurfaceVisible && (
  <PanelSection id="sidebar-framed-art" label="Framed art library" defaultOpen={false}>
    <FramedArtLibrary />
  </PanelSection>
)}
{wallSurfaceVisible && (
  <PanelSection id="sidebar-wainscoting" label="Wainscoting library" defaultOpen={false}>
    <WainscotLibrary />
  </PanelSection>
)}
```

PanelSection persisted-expand-state remains keyed by `sidebar-*` id — reload-survives.

### State preservation

Already confirmed: catalog state lives in dedicated stores (cadStore / framedArtStore / wainscotStyleStore) with IndexedDB persistence. Unmount → state survives. Only in-progress create-form drafts (local `useState`) get wiped — acceptable.

### Backward-compat / test surface

The phase has minor test breakage risk. Existing tests that assume these sections are always visible will break:

```bash
grep -rn "sidebar-custom-elements\|sidebar-framed-art\|sidebar-wainscoting\|CustomElementsPanel\|FramedArtLibrary\|WainscotLibrary" tests/ e2e/ 2>/dev/null
```

Plan should audit and update. The fix is mechanical: e2e tests must first put the app in the right state (`__driveTool("select")` + select a wall) before asserting the section is visible.

---

## Pitfalls

### Pitfall 1: `setTool()` wipes selection
`uiStore.ts:296` — `setTool` calls `set({ activeTool: tool, selectedIds: [], selectedOpeningId: null })`. This means: select a wall → switch from select to wall tool → selection wipes → wainscot/framed-art sections also un-mount. This is desired (drawing-tool workflow has no wall selected) but the test plan must account for it.

### Pitfall 2: walls dict lookup with no active room
On a freshly-loaded app with no active room (WelcomeScreen state), `rooms[s.activeRoomId ?? ""]` is undefined — guard with `?? {}` as shown above. Already conventionally handled (`cadStore` consumers in the audit use this pattern).

### Pitfall 3: Tool-switch debouncing
Switching tool A → B → A in quick succession mounts → unmounts → mounts the section. None of the three components run expensive work on mount (no idb-keyval reads — the stores already hold the data; no `Suspense` boundaries; only `WainscotLibrary` lazy-loads `WainscotPreview3D` but only when `creating === true`). **No perf concern.**

### Pitfall 4: StrictMode-safe cleanup
**Not required for this phase.** None of the three components write to module-level registries. Confirmed by reading each file end-to-end.

### Pitfall 5: PanelSection expanded-state collision
PanelSection's `defaultOpen={false}` + persisted state per id means: if a user expanded "Wainscoting library" while a wall was selected, then deselected, then re-selected a wall, the section re-mounts and reads its persisted-expanded state (still `true`). This is correct behavior. Verify with an e2e round-trip.

---

## Plan Decomposition

**Recommended: 1 plan, 3 tasks.** This is a tightly-scoped layout change.

### Plan 84-01: Tool-gated sidebar libraries (IA-08)

| Wave | Task | Files |
|------|------|-------|
| 0 (RED) | Write failing unit + e2e tests: section visibility round-trip per gate condition. | `tests/Sidebar.contextual-visibility.test.tsx` (new), `e2e/sidebar-contextual-visibility.spec.ts` (new) |
| 1 (GREEN) | Add gates to `Sidebar.tsx` — wrap 3 PanelSections in `activeTool` + selection conditions. | `src/components/Sidebar.tsx` |
| 2 (REFACTOR + AUDIT) | Audit existing tests for hard-coded section visibility assumptions; update test setup helpers to put the app in the right state before assertions. | `tests/`, `e2e/` (sweep) |

If during plan-phase Micah expresses strong preference for adding new `ToolType` entries (e.g., a real `"wainscot"` tool that creates a "wainscot brush" UX), the work expands to 2 plans:
- 84-01: ToolType additions + FloatingToolbar buttons + tool-handler stubs.
- 84-02: Sidebar gating using the new tool names.

That route doubles scope and is **not recommended** unless Micah wants the tool affordances.

---

## Open Questions for Plan Phase

1. **Gating strategy** — The three sections do not map to existing tools cleanly. Recommended strategy: gate by `activeTool === "select"` + (for wainscot/framedArt) `wallSelected`. **Checkpoint with Micah:** does this match the intent of "hide the libraries unless I'm actively doing the workflow they belong to"? If he expected literal "click a Wainscot tool button to see the library," that's a different (larger) phase.

2. **Empty-sidebar hint** — When all three contextual sections are hidden (e.g., user is in `wall` tool with no selection), the sidebar shows only Rooms / Room config / Product library. Should the gap be left empty, or should there be a one-line hint like "Select a wall to edit its surface" where the wainscot/framed-art sections would otherwise be? Plain-English checkpoint with Micah. **Recommendation:** leave empty for v1.21 — a hint adds chrome noise and Jessica will learn the pattern quickly.

3. **CustomElements gate** — Recommend `activeTool === "select" || activeTool === "product"`. Alternative: only show in `select`. **Checkpoint:** does Jessica reach for the Custom Elements catalog *during* product placement, or only when arranging in select? If only `select`, simplify the gate.

4. **Tool affordances for wainscot / framed-art** — If Micah wants the IA-08 prose ("activate wainscot tool") to be literally true, Phase 84 needs to add a `"wainscot"` ToolType + FloatingToolbar button + tool handler. This is the bigger 2-plan path noted above. **Recommend asking explicitly.**

5. **Product library section** — Audit recommended "collapse by default, auto-expand when product tool activates" for `sidebar-product-library`. That's a related-but-separate enhancement. Should Phase 84 also auto-expand `sidebar-product-library` when `activeTool === "product"`? Recommend including it as Task 1.5 because the code shape is identical.

---

## Sources

### Primary (HIGH confidence — codebase)
- `src/components/Sidebar.tsx` (69 lines, post-Phase-83) — current sidebar structure
- `src/components/CustomElementsPanel.tsx`, `src/components/FramedArtLibrary.tsx`, `src/components/WainscotLibrary.tsx` — target components
- `src/components/WallSurfacePanel.tsx:25,67,89-101` — actual wall-finish application pathway
- `src/types/cad.ts:381-396` — ToolType union (no wainscot/customElement/framedArt)
- `src/stores/uiStore.ts:33,110,296` — `activeTool`, `setTool` behavior
- `src/stores/framedArtStore.ts:21,68`, `src/stores/wainscotStyleStore.ts:21,61`, `src/stores/cadStore.ts:1774` — catalog persistence
- `src/App.tsx:270` — Phase 79 WindowPresetSwitcher precedent
- `.planning/phases/79-…/79-CONTEXT.md` — Phase 79 precedent gating
- `.planning/milestones/v1.21-REQUIREMENTS.md:53-55` — IA-08 spec
- `.planning/milestones/v1.21-SIDEBAR-AUDIT.md` — Phase 80 audit framing
- GH #177 — issue spec

### Project Constraints (from CLAUDE.md)
- **§7 StrictMode-safe useEffect cleanup** — applies if a component writes to module-level state on mount. **None of the 3 Phase 84 components do; no cleanup required.**
- **No emojis in code; lucide-react only for icons; mixed-case UI labels** — already followed by existing components, no new chrome added here.
- **GSD workflow enforcement** — this phase enters via `/gsd:plan-phase`.

---

## Metadata

**Confidence breakdown:**
- Sidebar.tsx structure: HIGH — read in full
- ToolType enum completeness: HIGH — read in full, grep-verified absence of wainscot/customElement/framedArt tools
- Library stores + persistence: HIGH — read in full
- Recommended gating strategy: MEDIUM — opinionated reinterpretation of IA-08 because the literal "tool === X" gate has no matching tool. Plan phase MUST checkpoint with Micah (Open Question 1).
- Plan decomposition: HIGH — small, well-scoped layout change

**Research date:** 2026-05-14
**Valid until:** 2026-06-13 (codebase is the source; only stale if Sidebar.tsx or ToolType change before plan ships)
