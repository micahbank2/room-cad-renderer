# Feature Landscape: v1.4 Polish & Tech Debt

**Domain:** Interior design CAD tool -- deferred polish items from v1.3 plus UI label cleanup
**Researched:** 2026-04-06
**Milestone context:** All v1.4 features are verification/polish of code that already landed in v1.3 but was deferred from formal validation, plus a global UI string cleanup. No new architecture needed.

## Table Stakes

Features that must work correctly because the underlying code already shipped. Users (Jessica) will encounter these during normal use.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Frame color override picker | Wall art with frames already renders `frameColorOverride` in 3D (`WallMesh.tsx:206`). The `<input type="color">` already exists in `WallSurfacePanel.tsx:346-354`. | **Low** | `updateWallArt` store action (exists), `FRAME_PRESETS` lookup (exists) | Verify: picker appears only when `frameStyle` is set and not "none". Verify: changed color persists across undo/redo and project save/load. Verify: 3D mesh uses override color. All plumbing appears complete from code inspection. |
| Copy wall treatment to opposite side | Button already wired in `WallSurfacePanel.tsx:116-124`. Store action `copyWallSide` (cadStore.ts) deep-clones wallpaper, wainscoting, crown molding, and wall art with new IDs and flipped side. | **Low** | `copyWallSide` action (exists), side toggle UI (exists) | Verify: all four treatment types copy correctly. Verify: copied wall art gets new IDs (no shared-reference bugs). Verify: undo reverts the copy. Edge case: copying empty side should clear target side. |
| Sidebar scroll -- all panels reachable | Sidebar uses `flex-1 overflow-y-auto` on the scrollable container (`Sidebar.tsx:71`). Seven collapsible sections plus three non-collapsible panels. | **Low** | Sidebar layout (exists), CollapsibleSection component (exists) | Verify: with all sections expanded, bottom sections (ProductLibrary, WainscotLibrary) are scrollable and reachable. Verify: no overflow clipping from parent `overflow-hidden` on the aside wrapper. |

## Differentiators

Features that improve the feel of the tool beyond basic functionality.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Wainscot inline edit (double-click) | Currently wainscoting style/height can only be changed via the sidebar panel. Inline edit means double-clicking a wall with wainscoting to pop up a quick-edit -- faster iteration on room design. | **Medium** | `toggleWainscoting` action (exists), `wainscotStyleStore` (exists), select tool hit-testing (exists but needs extension for double-click) | Standard inline-edit pattern: double-click on wall -> floating popover near click -> style dropdown + height input -> blur/Enter commits, Escape cancels. Needs: (1) double-click detection in selectTool, (2) small FloatingWainscotEditor component, (3) canvas-to-screen coordinate mapping. |
| Remove all underscores from UI labels | The Obsidian CAD theme convention uses `UPPER_SNAKE_CASE` for labels. Removing underscores makes labels more readable for a non-technical user (Jessica). | **Medium** (breadth, not depth) | Every component file with hardcoded labels + the `.toUpperCase().replace(/\s/g, "_")` pattern in 4 files | Two patterns to fix: (1) Static strings like `"WALL_SURFACE"` -> `"WALL SURFACE"`, (2) Dynamic `.replace(/\s/g, "_")` in 4 files -> remove the replace call. Must NOT touch code identifiers, CSS classes, imports, constants, or test attributes. |

## Anti-Features

Features to explicitly NOT build during this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full inline-edit system for all wall treatments | Scope creep. Inline edit for wallpaper, crown molding, paint would triple the work. | Only implement inline edit for wainscoting (POLISH-02). Other treatments edit fine from the sidebar panel. |
| Localization / i18n string extraction | Removing underscores might tempt extracting all strings. Single-user tool for one English speaker. | Simple find-and-replace of literal strings. No abstraction layer. |
| Wainscot 2D visual preview | Wainscoting shows in 3D but not in the 2D canvas. Adding 2D rendering is a larger feature. | Keep wainscot visualization 3D-only. Sidebar dropdown is sufficient for selection. |
| Design system overhaul | Changing label formatting might tempt a broader theme update. | Only change underscores to spaces. Do not change fonts, colors, or layout. |

## Feature Dependencies

```
Frame color override  -> (independent, all code exists, verification only)
Copy wall treatment   -> (independent, all code exists, verification only)
Sidebar scroll        -> (independent, layout verification only)

Wainscot inline edit  -> select tool double-click detection
                      -> new FloatingWainscotEditor component
                      -> canvas click coordinate -> screen position mapping

Remove underscores    -> (independent, global string cleanup)
                      -> must run AFTER all other features land (labels may be added/changed)
```

## MVP Recommendation

Prioritize in this order:

1. **Frame color override verification** -- smallest scope, pure verification
2. **Copy wall treatment verification** -- small scope, validates deep-clone logic
3. **Sidebar scroll verification** -- quick manual check, may need minor CSS fix
4. **Wainscot inline edit** -- medium complexity, only new UI component
5. **Remove underscores** -- do LAST because it touches every file; earlier risks merge conflicts

**Defer nothing** -- all five items are scoped for this milestone.

## Sources

- Direct codebase inspection (all findings HIGH confidence)
- CAD/design tool inline-edit patterns based on Figma, SketchUp conventions (MEDIUM confidence)
