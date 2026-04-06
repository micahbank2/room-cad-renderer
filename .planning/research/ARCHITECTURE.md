# Architecture Patterns -- v1.4 Polish & Tech Debt

**Domain:** Interior design CAD tool (v1.4 deferred polish + UI label cleanup)
**Researched:** 2026-04-06
**Confidence:** HIGH -- based on direct codebase analysis of all affected files

---

## Scope

Five features touching existing components. No new stores, no new data types, no new 3D geometry. This is purely UI-layer and store-action verification work.

---

## Existing Architecture (Relevant Subset)

### Data Flow for Wall Treatments

```
cadStore (Zustand + Immer)
  rooms[activeRoomId].walls[wallId]
    .wainscoting.{A,B} -> WainscotConfig { enabled, styleItemId, heightFt, color }
    .wallpaper.{A,B}    -> Wallpaper { kind, color, paintId, ... }
    .crownMolding.{A,B} -> CrownConfig { enabled, heightFt, color }
    .wallArt[]           -> WallArt { frameStyle, frameColorOverride, side, ... }
```

### Component Hierarchy (Selection Context)

```
App.tsx
  PropertiesPanel.tsx          -- appears when selectedIds.length >= 1
    WallSurfacePanel.tsx       -- appears when exactly 1 wall selected
      PaintSection.tsx         -- F&B paint picker for wall side
    CeilingPaintSection.tsx    -- appears when ceiling selected
  Sidebar.tsx                  -- always visible (collapsible)
    CollapsibleSection         -- file-scoped component, wraps each panel
    WainscotLibrary.tsx        -- wainscot style CRUD (in sidebar)
```

### Store Actions (Already Implemented)

| Action | Store | Status |
|--------|-------|--------|
| `toggleWainscoting(wallId, side, enabled, heightFt, color, styleItemId)` | cadStore | Exists, works |
| `copyWallSide(wallId, from, to)` | cadStore | Exists -- copies wallpaper, wainscoting, crown, wall art |
| `updateWallArt(wallId, artId, changes)` | cadStore | Exists, accepts `Partial<WallArt>` including `frameColorOverride` |

---

## Feature-by-Feature Integration Analysis

### 1. Wainscot Inline Edit (POLISH-02)

**What it does:** Double-click a wainscot style in WallSurfacePanel to change style/height in place, rather than navigating to the WainscotLibrary sidebar panel.

**Current state:** WallSurfacePanel.tsx (lines 181-234) shows a `<select>` dropdown to pick a wainscot style when wainscoting is enabled. There is NO inline editing of height or style parameters from the properties panel -- you can only toggle on/off and pick a library style. The WainscotLibrary.tsx already has double-click-to-edit on library items (line 177: `onDoubleClick={() => setEditingId(it.id)}`), but this edits the library definition, not the per-wall application.

**What needs to change:**

| Component | Change | Type |
|-----------|--------|------|
| `WallSurfacePanel.tsx` | Add inline height input + style dropdown below the wainscot checkbox when enabled | Modify |
| `cadStore.ts` | No change -- `toggleWainscoting` already accepts `heightFt` and `styleItemId` params | None |

**Integration points:**
- `toggleWainscoting(wallId, side, true, newHeight, color, styleItemId)` -- call with updated params on blur/change
- Read `wains.heightFt` and `wains.styleItemId` from `wall.wainscoting[activeSide]`
- Import `STYLE_META` from `@/types/wainscotStyle` and `useWainscotStyleStore` (already imported in WallSurfacePanel)

**Data flow:** User edits height/style in WallSurfacePanel -> calls `toggleWainscoting` with new values -> cadStore updates wall -> Fabric canvas redraws -> Three.js WallMesh re-renders wainscoting geometry.

**Complexity:** Low. The select dropdown already exists. Add a number input for height next to it.

---

### 2. Copy Wall Treatment to Opposite Side (POLISH-03)

**What it does:** One-click button to copy all treatments (wallpaper, wainscoting, crown, art) from the active side to the opposite side.

**Current state:** FULLY IMPLEMENTED. The button exists in WallSurfacePanel.tsx (lines 116-124):
```tsx
<button onClick={() => copyWallSide(wall.id, activeSide, target)}>
  COPY_TO_SIDE_{activeSide === "A" ? "B" : "A"}
</button>
```

The `copyWallSide` store action (cadStore.ts lines 777-817) deep-clones wallpaper, wainscoting, crown molding, and wall art with new IDs.

**What needs to change:**

| Component | Change | Type |
|-----------|--------|------|
| Nothing | Verify it works end-to-end | Verification only |

**Verification checklist:**
- Copy wallpaper (color, pattern, paint) from A to B and vice versa
- Copy wainscoting config including styleItemId
- Copy crown molding
- Copy wall art with new IDs and flipped side
- Undo reverts the copy

**Complexity:** None (verification only).

---

### 3. Per-Placement Frame Color Override (POLISH-04)

**What it does:** Color picker on each wall art item to override the library frame style's default color.

**Current state:** FULLY IMPLEMENTED.

- `WallArt.frameColorOverride` exists in types/cad.ts (line 67)
- WallSurfacePanel.tsx (lines 344-354) renders a color input for each art item with a frame style, reading `a.frameColorOverride ?? FRAME_PRESETS[a.frameStyle].color` and calling `updateWallArt` with `{ frameColorOverride: e.target.value }`
- WallMesh.tsx (line 206) reads `art.frameColorOverride ?? preset?.color ?? "#ffffff"` for 3D frame rendering

**What needs to change:**

| Component | Change | Type |
|-----------|--------|------|
| Nothing | Verify picker works, color persists through save/load, undo works | Verification only |

**Verification checklist:**
- Color picker appears only for art items with `frameStyle !== "none"`
- Changing color updates 3D view immediately
- Color persists in project save/load (via CADSnapshot serialization)
- Undo reverts color change
- copyWallSide clones the override (deep clone in copyWallSide handles this)

**Complexity:** None (verification only).

---

### 4. Sidebar Scroll Verification (POLISH-06)

**What it does:** Ensure all sidebar panels scroll correctly when content exceeds viewport height.

**Current state:** Sidebar.tsx uses `overflow-y-auto` on the scrollable content container (line 71):
```tsx
<div className="flex-1 overflow-y-auto p-4 space-y-4">
```

The sidebar structure is:
- Fixed header with collapse button (`shrink-0`)
- Scrollable body (`flex-1 overflow-y-auto`) containing all CollapsibleSections

PropertiesPanel.tsx uses `max-h-[calc(100vh-6rem)] overflow-y-auto` (line 85) for its floating panel.

**What needs to change:**

| Component | Change | Type |
|-----------|--------|------|
| Sidebar.tsx | Verify scroll works with all sections expanded | Verification only |
| PropertiesPanel.tsx | Verify scroll works with tall wall surface panels | Verification only |

**Potential issues to check:**
- All CollapsibleSections expanded simultaneously (Room Config + System Stats + Layers + Floor Material + Snap + Custom Elements + Framed Art + Wainscot Library + Product Library)
- WallSurfacePanel inside PropertiesPanel when many art items exist
- WainscotLibrary create form with 3D preview open
- Small viewport heights (laptop screens)

**Complexity:** None (manual testing).

---

### 5. Remove All Underscores from UI Labels

**What it does:** Replace `ROOM_CONFIG` with `ROOM CONFIG`, `WALL_SEGMENT_XXXX` with `WALL SEGMENT XXXX`, etc. across all visible UI text.

**Current state:** 38 occurrences of underscore-containing uppercase labels across 15 component files. Labels fall into categories:

**Category A -- Static string literals (direct replacement):**
- Sidebar.tsx: `ROOM_CONFIG`, `SYSTEM_STATS`, `SQ_FT`, `FLOOR_MATERIAL`, `3_INCH`, `6_INCH`, `1_FOOT`, `PRODUCT_LIBRARY`
- WallSurfacePanel.tsx: `WALL_SURFACE`, `SIDE_A`/`SIDE_B`, `COPY_TO_SIDE_B`, `UPLOAD_PATTERN`, `TILE_PATTERN`, `CROWN_MOLDING`, `WALL_ART`, `ART_LIBRARY_EMPTY`, `FRAME_COLOR_OVERRIDE`
- WainscotLibrary.tsx: `WAINSCOT_LIBRARY`, `SAVE_TO_LIBRARY`, `NO_WAINSCOT_STYLES_YET`, `LOADING_PREVIEW...`, `DOUBLE_CLICK_TO_EDIT`, `CREATE_STYLE_IN_LIBRARY_FIRST`, `PANEL_W`, `STILE_W`, `PLANK_W`, `BATTEN_W`, `PLANK_H`
- PropertiesPanel.tsx: `BULK_ACTIONS`, `ITEMS_SELECTED`, `PAINT_ALL_WALLS`, `APPLIES_TO_BOTH_SIDES`, `DELETE_ALL`, `DELETE_ELEMENT`, `SET_DIMENSIONS`, `WALL_SEGMENT_XXXX`
- StatusBar.tsx: `{tool}_TOOL`, `WALK_MODE`, `ORBIT_MODE`
- Toolbar.tsx: `OBSIDIAN_CAD`
- RoomSettings.tsx, AddRoomDialog.tsx, FramedArtLibrary.tsx, FloorMaterialPicker.tsx, SwatchPicker.tsx, etc.

**Category B -- Dynamic string construction:**
- StatusBar.tsx line 25: `{activeTool.toUpperCase()}_TOOL` -- template literal with underscore
- StatusBar.tsx line 44: `WALK_MODE` / `ORBIT_MODE` -- ternary
- PropertiesPanel.tsx line 93: `CEILING_{id}` -- template
- PropertiesPanel.tsx line 106: `WALL_SEGMENT_{id}` -- template
- PropertiesPanel.tsx line 134: `product?.name?.toUpperCase().replace(/\s/g, "_")` -- explicit underscore insertion

**Category C -- title attributes (tooltips):**
- WallSurfacePanel.tsx line 353: `title="FRAME_COLOR_OVERRIDE"`
- Sidebar.tsx line 65: `title="COLLAPSE_SIDEBAR"`
- WainscotLibrary.tsx line 179: `title="DOUBLE_CLICK_TO_EDIT"`

**What needs to change:**

| Component | Count | Type |
|-----------|-------|------|
| Sidebar.tsx | ~8 labels | Modify |
| WallSurfacePanel.tsx | ~10 labels | Modify |
| WainscotLibrary.tsx | ~8 labels | Modify |
| PropertiesPanel.tsx | ~8 labels + 1 regex | Modify |
| StatusBar.tsx | ~3 labels | Modify |
| Toolbar.tsx | 1 label (OBSIDIAN_CAD) | Modify |
| RoomSettings.tsx | ~3 labels | Modify |
| AddRoomDialog.tsx | ~5 labels | Modify |
| FramedArtLibrary.tsx | ~1 label | Modify |
| FloorMaterialPicker.tsx | ~1 label | Modify |
| SwatchPicker.tsx | ~4 labels | Modify |
| SidebarProductPicker.tsx | ~1 label | Modify |
| RoomTabs.tsx | ~1 label | Modify |
| TemplatePickerDialog.tsx | ~2 labels | Modify |
| Help/onboarding files | ~5 labels | Modify |

**Key transformation rule:** Replace `_` with ` ` (space) in all visible UI text. Preserve underscore convention in:
- Variable names, prop names, CSS class names (not visible to user)
- Data model field names
- The brand name `OBSIDIAN CAD` (remove underscore -- it reads better as two words)

**Special case:** PropertiesPanel line 134 uses `.replace(/\s/g, "_")` to format product names. Change to just `.toUpperCase()` (spaces are fine in labels).

**Complexity:** Medium. Wide surface area (15 files, ~38 occurrences) but each change is trivial. Risk is missing one or creating inconsistency.

---

## Component Boundaries

### Files That Need Modification

| File | Features Affected | Changes |
|------|-------------------|---------|
| `src/components/WallSurfacePanel.tsx` | POLISH-02, underscore cleanup | Add height/style inline edit; replace ~10 label strings |
| `src/components/Sidebar.tsx` | Underscore cleanup | Replace ~8 label strings |
| `src/components/PropertiesPanel.tsx` | Underscore cleanup | Replace ~8 labels + fix `.replace(/\s/g, "_")` |
| `src/components/WainscotLibrary.tsx` | Underscore cleanup | Replace ~8 label strings |
| `src/components/StatusBar.tsx` | Underscore cleanup | Replace ~3 labels, fix template literal |
| `src/components/Toolbar.tsx` | Underscore cleanup | Replace OBSIDIAN_CAD |
| `src/components/RoomSettings.tsx` | Underscore cleanup | Replace ~3 labels |
| `src/components/AddRoomDialog.tsx` | Underscore cleanup | Replace ~5 labels |
| `src/components/SwatchPicker.tsx` | Underscore cleanup | Replace ~4 labels |
| 6 more component files | Underscore cleanup | 1-2 labels each |

### Files That Need NO Modification

| File | Reason |
|------|--------|
| `src/stores/cadStore.ts` | All store actions already exist and work |
| `src/types/cad.ts` | Data model is complete (frameColorOverride, WainscotConfig, etc.) |
| `src/three/WallMesh.tsx` | Already reads frameColorOverride correctly |
| `src/canvas/fabricSync.ts` | 2D rendering unaffected |
| `src/stores/uiStore.ts` | No new UI state needed |

### No New Components

Zero new components are needed. All features integrate into existing component surfaces.

---

## Suggested Build Order

Based on dependency analysis and risk:

### Phase 1: Verification (POLISH-03, POLISH-04, POLISH-06)

These three features are already implemented. Verify before changing anything else.

**Order within phase:**
1. POLISH-04 (frame color override) -- smallest surface, easiest to verify
2. POLISH-03 (copy wall side) -- test all four treatment types copy correctly
3. POLISH-06 (sidebar scroll) -- manual testing, may surface overflow bugs

**Rationale:** Verify first so you know what already works before touching label strings. If verification reveals bugs, fix them before the label sweep muddles the diff.

### Phase 2: Wainscot Inline Edit (POLISH-02)

Single component change in WallSurfacePanel.tsx. Add height input and potentially style-specific knobs below the existing wainscot dropdown.

**Why after verification:** The wainscot section in WallSurfacePanel is the same area being verified in POLISH-03. Get verification done first so inline edit additions are isolated in their own commit.

### Phase 3: Underscore Label Removal

Sweep all 15 files. This is the widest-surface-area change but the lowest risk per change.

**Why last:**
- It touches every component file -- do it after all functional changes are done
- It is purely cosmetic -- no data flow, no store changes, no 3D rendering impact
- A single focused sweep produces a clean diff vs. mixing label changes into functional work

---

## Anti-Patterns to Avoid

### Anti-Pattern: Mixing Label Cleanup into Feature Commits
**Why bad:** Makes git blame useless for understanding when functional behavior changed. Impossible to revert label changes without reverting features.
**Instead:** One dedicated commit for all underscore removal, separate from functional changes.

### Anti-Pattern: Introducing a Label Formatting Utility
**Why bad:** Over-engineering for a one-time cleanup. The codebase intentionally uses raw string literals for labels -- a utility adds indirection for no ongoing benefit.
**Instead:** Direct string replacement in each file. `"ROOM_CONFIG"` becomes `"ROOM CONFIG"`.

### Anti-Pattern: Changing WainscotConfig Shape for Inline Edit
**Why bad:** The existing `toggleWainscoting` signature already accepts all needed params. Adding new fields or splitting into a separate `updateWainscoting` action adds unnecessary API surface.
**Instead:** Reuse `toggleWainscoting(wallId, side, true, newHeight, color, styleId)` for inline edits. It pushes history and updates correctly.

---

## Sources

- Direct codebase analysis of all files listed above
- Confidence: HIGH -- all integration points verified by reading actual source code
