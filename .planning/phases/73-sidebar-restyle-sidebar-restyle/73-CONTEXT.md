# Phase 73: Sidebar Restyle — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning
**Mode:** --auto (all decisions made from recommended defaults + Pascal audit)

<domain>
## Phase Boundary

Restyle the **left sidebar rooms tree** to match Pascal's spine-and-branches geometry, and convert the **right panel to contextual** — it mounts only when something is selected, then spring-slides in from the right. No new data, no new store actions, no new tools. Chrome-only rewrite.

**In scope:**
- `src/components/RoomsTreePanel/` — spine + branch lines, hover/active styling
- `src/components/RoomsTreePanel/TreeRow.tsx` — restyle depth indentation to spine geometry
- `src/components/Sidebar.tsx` — left panel shell; replace local CollapsibleSection with PanelSection primitive
- `src/App.tsx` — make PropertiesPanel mount contextually (conditioned on selectedIds.length > 0); AnimatePresence wrapper for spring slide-in/out
- `src/components/PropertiesPanel.tsx` — no structural change; already uses PanelSection (Phase 72)

**Out of scope (Phases 74–76):**
- Toolbar rework (Phase 74)
- ProductLibrary / MaterialPicker restyle (Phase 75)
- Modal / WelcomeScreen / light-mode flip (Phase 76)
- CategoryTabs migration (Phase 75)

</domain>

<decisions>
## Implementation Decisions

### Rooms Tree — Spine Geometry

- **D-01:** Vertical spine: `absolute top-0 bottom-0 left-[21px] w-px bg-border/50` per Pascal audit verbatim
- **D-02:** Horizontal branch per row: `absolute top-1/2 left-[21px] h-px w-[11px] bg-border/50` (spans left:21px to left:32px)
- **D-03:** Depth indentation replaces current `pl-2/pl-4/pl-6` classes — content starts at `pl-8` (32px) for all depths; the spine + branch lines carry the visual hierarchy instead of padding
- **D-04:** Row hover: `hover:bg-accent/30`; active/selected row: `bg-accent/20 text-accent-foreground`; active room node: `bg-accent text-accent-foreground`
- **D-05:** Phase 46 double-click focus dispatch and Phase 47 per-node eye-icon visibility toggle preserved exactly as-is — no behavioral change

### Contextual Right Panel

- **D-06:** PropertiesPanel mounts **only when** `selectedIds.length > 0` — conditioned in `App.tsx`
- **D-07:** Click empty canvas already calls `clearSelection()` in selectTool — no new clearing logic needed; Escape key also clears selection (existing shortcut)
- **D-08:** Spring slide animation: `AnimatePresence` wrapper in `App.tsx` around the right-panel slot; PropertiesPanel wrapped in `motion.div` with `initial={{ x: 288, opacity: 0 }}` → `animate={{ x: 0, opacity: 1 }}` → `exit={{ x: 288, opacity: 0 }}` using `SPRING_SNAPPY` transition from `src/lib/motion.ts`
- **D-09:** Right panel width: `w-72` (288px) — slightly below Pascal's 320–400px range to maximize canvas space; adjustable if it feels cramped during UAT
- **D-10:** When right panel is absent, canvas `flex-1` fills the freed space naturally — no explicit width calculation needed

### Left Sidebar Shell

- **D-11:** Left sidebar stays **always-visible** — rooms tree + RoomSettings always mounted; only the right panel is contextual
- **D-12:** Left sidebar width: `w-64` (256px, ~250px per Pascal audit)
- **D-13:** `Sidebar.tsx` local `CollapsibleSection` component (lines ~24–44) replaced with `PanelSection` imported from `@/components/ui`
- **D-14:** No other structural changes to Sidebar.tsx content (RoomSettings, SidebarProductPicker, CustomElementsPanel, FramedArtLibrary, WainscotLibrary remain in left panel until Phase 75)

### Phase 48 Saved-Camera UI

- **D-15:** Saved-camera "Save" / "Clear" UI stays in the rooms tree (current location in RoomsTreePanel) — no movement to the contextual right panel. Phase 48 camera-focus on double-click unchanged.

### Driver Registration (Phase 68 Pattern)

- **D-16:** If PropertiesPanel un-mount/remount cycle is introduced by contextual mounting, any `__drive*` test drivers currently registered inside PropertiesPanel effects must be moved to `src/test-utils/*Drivers.ts` with `installXDrivers()` + imported from `main.tsx`. This is the mandatory Phase 68 lesson — drivers must survive component un-mount.

### Claude's Discretion

- Exact left sidebar internal padding / gap values (match Phase 71/72 token scale: `p-2`, `gap-2`, `p-4`)
- Whether to use `layout` prop on motion.div for the canvas resize (try without first; add if canvas jump is visible)
- TreeRow icon sizing — keep existing `h-4 w-4` for ChevronRight, Eye, Camera icons

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pascal Visual Audit (primary reference)
- `.planning/competitive/pascal-visual-audit.md` — Full token map, spine-and-branches geometry code snippets, layout architecture diagram, migration cost matrix, screenshot analysis

### Phase 46 Rooms Tree (behavior to preserve)
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` — existing tree data logic, focus dispatch wiring, Phase 46 D-01 contract
- `src/components/RoomsTreePanel/TreeRow.tsx` — current row anatomy; spine styling replaces depth-based padding
- `src/components/RoomsTreePanel/focusDispatch.ts` — preserved unchanged

### Phase 48 Saved Camera (behavior to preserve)
- `src/components/RoomsTreePanel/savedCameraSet.ts` — saved camera node ID set; stays in tree

### Phase 72 Primitives (used in this phase)
- `src/components/ui/PanelSection.tsx` — replaces Sidebar.tsx local CollapsibleSection
- `src/lib/motion.ts` — SPRING_SNAPPY preset used for right panel slide animation
- `src/components/ui/index.ts` — barrel for all primitives

### App layout (integration point)
- `src/App.tsx` — where contextual panel mounting + AnimatePresence wrapper goes

### Design tokens
- `src/index.css` — `@theme {}` block with `bg-accent`, `bg-accent/30`, `bg-border/50`, `text-accent-foreground`, `text-muted-foreground` tokens used for tree row states

### Roadmap spec
- `.planning/ROADMAP.md` §Phase 73 — Success Criteria SC-1 through SC-5 are the acceptance contract

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SPRING_SNAPPY` (`src/lib/motion.ts`) — already available; use for panel slide transition
- `PanelSection` (`src/components/ui/PanelSection.tsx`) — replaces Sidebar.tsx local CollapsibleSection
- `useUIStore` `selectedIds` — the trigger for contextual mount (no new state needed)
- `AnimatePresence` from `motion/react` — already installed (Phase 72 dep)

### Established Patterns
- `motion/react` `AnimatePresence` with `SPRING_SNAPPY` — established in Phase 72 PanelSection; same pattern for right panel
- `useReducedMotion()` guard — D-39 from Phase 33; `springTransition(reduced)` from `src/lib/motion.ts` handles snap vs spring
- StrictMode-safe driver cleanup (CLAUDE.md Pattern #7) — applies if PropertiesPanel registers any `__drive*` during mount

### Integration Points
- `src/App.tsx` lines ~258, ~278 — current `<PropertiesPanel>` mounts; wrap in `<AnimatePresence>` + condition on `selectedIds.length > 0`
- `src/components/Sidebar.tsx` lines ~24–44 — local `CollapsibleSection` to remove; import `PanelSection` instead
- `src/components/RoomsTreePanel/TreeRow.tsx` — depth indentation classes swap; spine/branch line elements added as `absolute` divs within each row

</code_context>

<specifics>
## Specific Ideas

- Pascal spine code snippet from audit: `<div className="absolute top-0 bottom-0 left-[21px] w-px bg-border/50" />` — use verbatim in TreeRow
- Pascal branch code snippet: `<div className="absolute top-1/2 left-[21px] h-px w-4 bg-border/50" />` — note `w-4` = 16px (left:21px to left:37px) but ROADMAP spec says "21px-32px" — use `w-[11px]` for exact 11px branch to stay within the spec; confirm visually during UAT
- Right panel mount condition: `{selectedIds.length > 0 && <motion.div ...><PropertiesPanel /></motion.div>}` inside `<AnimatePresence>`

</specifics>

<deferred>
## Deferred Ideas

- Sidebar tab strip (Layers / Settings tabs at top of left panel) — Pascal has this but it's not in Phase 73 scope; defer to Phase 75 or 76
- Right panel tab strip (Properties / Materials tabs) — defer to Phase 75
- Left sidebar resize handle (drag to widen) — defer to v1.19

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 73-sidebar-restyle*
*Context gathered: 2026-05-07*
