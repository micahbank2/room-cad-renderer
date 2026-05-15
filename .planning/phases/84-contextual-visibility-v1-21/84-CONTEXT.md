---
phase: 84-contextual-visibility-v1-21
milestone: v1.21
date: 2026-05-14
status: locked
closes: 177
requirements: [IA-08]
---

# Phase 84 — Contextual Visibility (IA-08, v1.21 FINAL)

Final phase of the v1.21 Sidebar IA milestone. Tool-specific catalog managers in the left sidebar should only mount when the user is doing the workflow they belong to. Wainscot Library, Framed Art Library, and Custom Elements catalog currently mount unconditionally; they should hide in irrelevant tools (wall/door/window/measure/etc.) and surface in their relevant workflows.

Phase 79 set the precedent: `{activeTool === "window" && <WindowPresetSwitcher />}`. Phase 84 applies the same gate-shape to the sidebar, with a critical reinterpretation captured below.

---

## Locked Decisions

### D-01 — Reinterpret IA-08 as workflow-gated, not tool-gated

IA-08 prose says "Wainscot Library appears when Wainscot tool is active." The `ToolType` union in `src/types/cad.ts:381-396` has **no wainscot, customElement, or framedArt tools**. Twelve tools exist: `select | wall | door | window | product | ceiling | stair | archway | passthrough | niche | measure | label`. Adding three new tools is out of scope for v1.21 (would require new icons, FloatingToolbar buttons, tool-handler stubs, hotkey assignment).

**Resolution:** sidebar visibility is computed from `activeTool` + selection state. The user-facing intent ("show me the library when I'm doing the thing the library is for") is preserved without inventing new tools.

### D-02 — Per-section gate rules

| Section | Mount when | Rationale |
|---------|------------|-----------|
| `sidebar-custom-elements` | `activeTool === "select"` OR `activeTool === "product"` | Custom elements drop on card-click at room center. The user reaches for the catalog while arranging (select) or placing products. Drawing tools (wall/door/window/measure) don't need it. |
| `sidebar-wainscoting` | `activeTool === "select"` AND `selectedIds[0]` is a wall id | Wainscot is wall finish. Applied via `WallSurfacePanel` when a wall is selected. Surface the catalog manager next to that workflow. |
| `sidebar-framed-art` | `activeTool === "select"` AND `selectedIds[0]` is a wall id | Same shape as wainscot — framed art is wall finish, applied via `WallSurfacePanel.handleAddFromLibrary` to the selected wall. |

Read shape inside `Sidebar()`:
```ts
const activeTool = useUIStore((s) => s.activeTool);
const selectedIds = useUIStore((s) => s.selectedIds);
const walls = useCADStore((s) => s.rooms[s.activeRoomId ?? ""]?.walls ?? {});
const wallSelected = selectedIds.length === 1 && !!walls[selectedIds[0]];
const customElementsVisible = activeTool === "select" || activeTool === "product";
const wallSurfaceVisible = activeTool === "select" && wallSelected;
```

Render is full-unmount, not CSS-hidden: `{customElementsVisible && <PanelSection ...>}`.

### D-03 — No "empty state" hint line

When all three contextual sections are hidden (e.g., user is in `wall` tool with no selection), the left sidebar shows only Rooms tree + Room config + Product library. **No hint text** like "Select a wall to edit its surface." Chrome stays clean; Jessica learns the pattern by using the app.

### D-04 — Product Library auto-expands when product tool is active

When `activeTool === "product"`, `sidebar-product-library` PanelSection opens regardless of the user's persisted collapse state. When the user switches away from product tool, the persisted state takes over again.

Implementation: add a `forceOpen?: boolean` prop to `PanelSection`. When `forceOpen === true`, the section renders open and the click-to-collapse becomes a no-op (or the click is allowed but doesn't unmount the children — we'll prefer "force renders open, click does nothing while forced"). The persisted state in localStorage is NOT mutated by force-open, so when `forceOpen` flips back to `false/undefined`, the user's prior collapse state is restored.

### D-05 — Catalog state survives unmount

Verified in research §"How each library's catalog state survives unmount":

- `CustomElementsPanel` reads from `useCustomElements()` on cadStore — catalog persists via autosave to IndexedDB.
- `FramedArtLibrary` reads from `useFramedArtStore` with IDB subscribe.
- `WainscotLibrary` reads from `useWainscotStyleStore` with IDB subscribe.

The only in-component state lost on unmount is **in-progress create-form drafts** (local `useState` for `name`, `imageUrl`, `creating`). Acceptable: tool switches are intentional, and Jessica won't be mid-drafting a wainscot style while switching to the wall tool. None of these components write to module-level registries, so **no StrictMode cleanup work is required** (Phase 84 differs from Phases 58 / 64 here).

### D-06 — Existing tests need a sweep

Tests that mount Sidebar and assume the three target sections are always visible will fail under D-02. Concrete known site:

- `src/components/__tests__/Sidebar.ia02.test.tsx` (Phase 81) — `EXPECTED_IDS` array includes `sidebar-custom-elements`, `sidebar-framed-art`, `sidebar-wainscoting` and asserts all six panels mount with the default `activeTool === "select"` (no wall selected). Under D-02 these three should be HIDDEN in that default state.

The sweep also covers any other test that grep-matches the three target ids. Plan task 3 audits, then updates each call site to either:
- Set the right `activeTool` (and optionally select a wall) before assertion, OR
- Assert the section is correctly HIDDEN when the tool isn't active (negative assertion — preferred for IA-08 coverage).

---

## Claude's Discretion

- Wave structure within Plan 84-01 (single plan, all tasks sequential).
- Whether the test sweep is one commit or multiple (group by test file).
- Whether to expose a `__driveSidebarVisibility` test driver. Recommend: no, the existing `__uiStore.setState({ activeTool, selectedIds })` handle is sufficient.
- E2E spec name + location (recommend `e2e/sidebar-contextual-visibility.spec.ts`).

---

## Deferred Ideas (Out of Scope)

- Adding `wainscot` / `customElement` / `framedArt` ToolType entries + FloatingToolbar buttons. Would require icon allocation, hotkey assignment, tool-handler stubs. v1.22 candidate if Micah decides it adds real value.
- Refactoring how wainscot / custom-elements / framed-art are placed on canvas. Phase 84 is visibility-only.
- A general-purpose "panel registry" abstraction. The 3 gates live inline in `Sidebar.tsx`.
- Lifting create-form draft state into a uiStore slice to survive tool switches. Edge-case; not worth the API surface.

---

## Success Criteria

1. Activate Wall tool → Wainscot Library + Framed Art Library + Custom Elements catalog all hidden in left sidebar.
2. Activate Select tool with no selection → Custom Elements visible; Wainscot + Framed Art hidden.
3. Activate Select tool + click a wall → all three target sections visible.
4. Activate Product tool → Custom Elements visible; Product Library auto-expands regardless of persisted collapse state.
5. Switch from Product tool back to Select tool → Product Library returns to its user-persisted collapse state.
6. Catalog data (custom-element entries, wainscot styles, framed-art items) survives unmount/remount via tool toggle.
7. Existing test suite passes after the test sweep.
8. Closes GH #177.

---

## Sources

- `.planning/phases/84-contextual-visibility-v1-21/84-RESEARCH.md` (Phase 84 research, 2026-05-14)
- `.planning/milestones/v1.21-REQUIREMENTS.md` §IA-08
- `.planning/phases/79-window-presets-win-presets-01-v1-20-active/` (mount-when-tool-active precedent)
- `src/components/Sidebar.tsx` (post Phase 83)
- `src/components/ui/PanelSection.tsx` (needs `forceOpen` prop)
- `src/stores/uiStore.ts` (`activeTool`, `selectedIds`, `setTool` wipes selection)
- `src/types/cad.ts:381-396` (ToolType union — verified no wainscot/customElement/framedArt entries)
- `src/components/__tests__/Sidebar.ia02.test.tsx` (Phase 81 test requiring update)
- GH #177
