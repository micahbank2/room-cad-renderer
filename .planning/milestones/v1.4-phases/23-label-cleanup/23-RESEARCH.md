# Phase 23: Label Cleanup - Research

**Researched:** 2026-04-06
**Domain:** UI label formatting (static strings + dynamic transforms)
**Confidence:** HIGH

## Summary

Every user-facing label in the codebase that contains underscores has been inventoried. There are two categories: (1) static string literals in JSX that display with underscores, and (2) dynamic transforms using `.toUpperCase().replace(/\s/g, "_")` that actively insert underscores into display text. Additionally, one data file (`roomTemplates.ts`) contains underscore labels surfaced through component rendering.

The scope is well-bounded: 26 files need changes, with approximately 120 individual label edits (110 static, 4 dynamic transforms, and 4 data-layer labels). No code identifiers, CSS classes, store keys, or internal constants are affected.

**Primary recommendation:** Fix the 4 dynamic transforms first (they affect every product/room name displayed), then sweep the 22 files with static labels alphabetically.

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LABEL-01 | All user-facing labels display spaces instead of underscores | Complete inventory of 110+ static labels across 22 files; 4 data-layer labels in roomTemplates.ts |
| LABEL-02 | Dynamic label transforms use space-preserving format | 4 `.toUpperCase().replace(/\s/g, "_")` patterns identified in 4 files |

</phase_requirements>

## Architecture Patterns

### Change Categories

**Category A: Dynamic transforms (4 locations)** -- These actively insert underscores into any user-typed name. Fixing these has the highest impact since they affect ALL product names and room names.

**Category B: Static labels (110+ locations across 22 .tsx files)** -- Hardcoded strings in JSX text content, title attributes, and option values.

**Category C: Data-layer labels (4 locations in 1 .ts file)** -- Labels defined in `roomTemplates.ts` that are rendered by components.

**Category D: Help content labels (10+ locations across 2 files)** -- Labels inside help text and the help search index that reference UI elements.

### What NOT to Change

- CSS class names (`glass-panel`, `cad-grid-bg`, `ghost-border`, etc.)
- `data-testid` attributes (e.g., `data-testid="ADD_ROOM"`, `data-testid="ROOM_TABS"`)
- `data-onboarding` attributes
- Store keys and variable names
- Import paths
- Template literal IDs (e.g., `room_${uid()}`, `prod_${uid()}`, `pp_${uid()}`)
- Constants used only as internal code keys (e.g., `DRAG_MIME`, `WALL_FILL`)
- `PRODUCT_CATEGORIES` array values (these are PascalCase without underscores -- "Seating", "Tables", etc.)
- Google Material Symbols icon names (e.g., `grid_view`, `upload_file`, `add_box`) -- these are icon identifiers, not display text
- `className` string values

## Complete File Inventory

### DYNAMIC TRANSFORMS (Category A) -- Fix First

#### 1. `src/components/RoomTabs.tsx` (line 32)
```
BEFORE: const label = room.name.toUpperCase().replace(/\s/g, "_");
AFTER:  const label = room.name.toUpperCase();
```

#### 2. `src/components/SidebarProductPicker.tsx` (line 50)
```
BEFORE: {p.name.toUpperCase().replace(/\s/g, "_")}
AFTER:  {p.name.toUpperCase()}
```

#### 3. `src/components/ProductLibrary.tsx` (line 159)
```
BEFORE: {p.name.toUpperCase().replace(/\s/g, "_")}
AFTER:  {p.name.toUpperCase()}
```

#### 4. `src/components/PropertiesPanel.tsx` (line 134)
```
BEFORE: {product?.name?.toUpperCase().replace(/\s/g, "_") ?? "PRODUCT"}
AFTER:  {product?.name?.toUpperCase() ?? "PRODUCT"}
```

---

### DATA-LAYER LABELS (Category C)

#### 5. `src/data/roomTemplates.ts` (lines 38, 44, 50, 56)
```
BEFORE: label: "LIVING_ROOM . 16 x 20 ft"
AFTER:  label: "LIVING ROOM . 16 x 20 ft"

BEFORE: label: "BEDROOM . 12 x 14 ft"
AFTER:  (no change -- no underscore)

BEFORE: label: "KITCHEN . 10 x 12 ft"
AFTER:  (no change -- no underscore)

BEFORE: label: "BLANK . 16 x 20 ft"
AFTER:  (no change -- no underscore)
```
Only `LIVING_ROOM` has an underscore here. The others are single words.

---

### STATIC LABELS (Category B) -- By File

#### 6. `src/App.tsx`
| Line | Before | After |
|------|--------|-------|
| 171 | `title="SHOW_SIDEBAR"` | `title="SHOW SIDEBAR"` |
| 197 | `"NATURAL_OAK"` | `"NATURAL OAK"` |
| 197 | `"BRUSHED_STEEL"` | `"BRUSHED STEEL"` |
| 206 | `RECENT_IMPORTS` | `RECENT IMPORTS` |
| 242 | `BUILDING_SCENE...` | `BUILDING SCENE...` |

Note: The material names on line 197 are used as both map keys and display text in the same loop. They need to be changed since they render as visible `<span>` text.

#### 7. `src/components/TemplatePickerDialog.tsx`
| Line | Before | After |
|------|--------|-------|
| 79 | `title: "BLANK_ROOM"` | `title: "BLANK ROOM"` |
| 80 | `title: "LIVING_ROOM"` | `title: "LIVING ROOM"` |
| 98 | `Choose_A_Template` | `Choose A Template` |
| 136 | `UPLOAD_IMAGE` | `UPLOAD IMAGE` |
| 150 | `REMOVE_IMAGE` | `REMOVE IMAGE` |
| 172 | `ESC_TO_CLOSE` | `ESC TO CLOSE` |

Note: `upload_file` (line 133) and `image_not_supported` (line 147) are Material Symbols icon names -- do NOT change.

#### 8. `src/components/WelcomeScreen.tsx`
| Line | Before | After |
|------|--------|-------|
| 40 | `OBSIDIAN_CAD` | `OBSIDIAN CAD` |
| 48 | `DESIGN_YOUR_SPACE` | `DESIGN YOUR SPACE` |
| 66 | `CREATE_FLOOR_PLAN` | `CREATE FLOOR PLAN` |
| 82 | `UPLOAD_FLOOR_PLAN` | `UPLOAD FLOOR PLAN` |
| 108 | `SYSTEM_STATUS: READY` | `SYSTEM STATUS: READY` |

Note: `add_box` (line 63) and `upload_file` (line 79) are icon names -- do NOT change.

#### 9. `src/components/AddRoomDialog.tsx`
| Line | Before | After |
|------|--------|-------|
| 37 | `ADD_ROOM` | `ADD ROOM` |
| 38 | `ROOM_NAME` | `ROOM NAME` |
| 54 | `placeholder="ROOM_NAME"` | `placeholder="ROOM NAME"` |

Note: `data-testid="ADD_ROOM"` (line 31) must NOT change.

#### 10. `src/components/Sidebar.tsx`
| Line | Before | After |
|------|--------|-------|
| 64 | `title="COLLAPSE_SIDEBAR"` | `title="COLLAPSE SIDEBAR"` |
| 72 | `label="ROOM_CONFIG"` | `label="ROOM CONFIG"` |
| 76 | `label="SYSTEM_STATS"` | `label="SYSTEM STATS"` |
| 81 | `SQ_FT` | `SQ FT` |
| 109 | `label="FLOOR_MATERIAL"` | `label="FLOOR MATERIAL"` |
| 120 | `3_INCH` | `3 INCH` |
| 121 | `6_INCH` | `6 INCH` |
| 122 | `1_FOOT` | `1 FOOT` |
| 135 | `label="PRODUCT_LIBRARY"` | `label="PRODUCT LIBRARY"` |

#### 11. `src/components/Toolbar.tsx`
| Line | Before | After |
|------|--------|-------|
| 42 | `OBSIDIAN_CAD` | `OBSIDIAN CAD` |
| 54 | `FLOOR_PLAN` | `FLOOR PLAN` |
| 59 | `"2D_PLAN"` | `"2D PLAN"` |
| 59 | `"3D_VIEW"` | `"3D VIEW"` |

Note: Tool labels SELECT, WALL, DOOR (lines 9-11) have no underscores -- no change needed.

#### 12. `src/components/StatusBar.tsx`
| Line | Before | After |
|------|--------|-------|
| 25 | `{activeTool.toUpperCase()}_TOOL` | `{activeTool.toUpperCase()} TOOL` |
| 44 | `WALK_MODE` | `WALK MODE` |
| 44 | `ORBIT_MODE` | `ORBIT MODE` |

Note: Line 25 is a hybrid -- the `_TOOL` suffix is a static underscore in a template literal.

#### 13. `src/components/ProductForm.tsx`
| Line | Before | After |
|------|--------|-------|
| 82 | `SKIP_DIMENSIONS` | `SKIP DIMENSIONS` |

#### 14. `src/components/AddProductModal.tsx`
| Line | Before | After |
|------|--------|-------|
| 68 | `ADD_PRODUCT` | `ADD PRODUCT` |
| 134 | `PRODUCT_NAME` | `PRODUCT NAME` |
| 140 | `placeholder="E.G. 'EAMES_CHAIR_L.01'"` | `placeholder="E.G. 'EAMES CHAIR L.01'"` |
| 176 | `SKIP_DIMENSIONS` | `SKIP DIMENSIONS` |
| 225 | `MATERIAL_FINISH` | `MATERIAL FINISH` |
| 231 | `placeholder="E.G. BRUSHED_STEEL"` | `placeholder="E.G. BRUSHED STEEL"` |
| 252 | `ADD_TO_REGISTRY` | `ADD TO REGISTRY` |

Note: `cloud_upload` (line 102) is an icon name -- do NOT change.

#### 15. `src/components/ProductLibrary.tsx`
| Line | Before | After |
|------|--------|-------|
| 48 | `YOUR_LIBRARY` | `YOUR LIBRARY` |
| 51 | `PRODUCT_REGISTRY` | `PRODUCT REGISTRY` |
| 58 | `+ ADD_PRODUCT` | `+ ADD PRODUCT` |
| 70 | `placeholder="SEARCH_ASSETS..."` | `placeholder="SEARCH ASSETS..."` |
| 100 | `NO_ITEMS_FOUND` | `NO ITEMS FOUND` |
| 106 | `+ ADD_PRODUCT` | `+ ADD PRODUCT` |

Note: Line 159 is a dynamic transform (covered in Category A above).

#### 16. `src/components/SidebarProductPicker.tsx`
| Line | Before | After |
|------|--------|-------|
| 14 | `PRODUCT_LIBRARY` | `PRODUCT LIBRARY` |
| 26 | `"NO_PRODUCTS_YET"` | `"NO PRODUCTS YET"` |
| 26 | `"NO_MATCHES"` | `"NO MATCHES"` |

Note: Line 50 is a dynamic transform (covered in Category A above).

#### 17. `src/components/PropertiesPanel.tsx`
| Line | Before | After |
|------|--------|-------|
| 42 | `BULK_ACTIONS` | `BULK ACTIONS` |
| 45 | `ITEMS_SELECTED` | `ITEMS SELECTED` |
| 51 | `PAINT_ALL_WALLS` | `PAINT ALL WALLS` |
| 66 | `APPLIES_TO_BOTH_SIDES` | `APPLIES TO BOTH SIDES` |
| 76 | `DELETE_ALL` | `DELETE ALL` |
| 93 | `CEILING_{ceiling.id...}` | `CEILING {ceiling.id...}` |
| 106 | `WALL_SEGMENT_{wall.id...}` | `WALL SEGMENT {wall.id...}` |
| 163 | `SET_DIMENSIONS (FT)` | `SET DIMENSIONS (FT)` |
| 192 | `DELETE_ELEMENT` | `DELETE ELEMENT` |

Note: Line 134 is a dynamic transform (covered in Category A above).

#### 18. `src/components/RoomSettings.tsx`
| Line | Before | After |
|------|--------|-------|
| 11 | `WIDTH_FT` | `WIDTH FT` |
| 23 | `LENGTH_FT` | `LENGTH FT` |
| 36 | `HEIGHT_FT` | `HEIGHT FT` |

#### 19. `src/components/FramedArtLibrary.tsx`
| Line | Before | After |
|------|--------|-------|
| 34 | `ART_LIBRARY` | `ART LIBRARY` |
| 67 | `"CHANGE_IMAGE"` | `"CHANGE IMAGE"` |
| 67 | `"+ UPLOAD_IMAGE"` | `"+ UPLOAD IMAGE"` |
| 90 | `SAVE_TO_LIBRARY` | `SAVE TO LIBRARY` |
| 97 | `NO_ART_YET` | `NO ART YET` |

#### 20. `src/components/WallSurfacePanel.tsx`
| Line | Before | After |
|------|--------|-------|
| 97 | `WALL_SURFACE` | `WALL SURFACE` |
| 112 | `SIDE_{s}` | `SIDE {s}` |
| 123 | `COPY_TO_SIDE_{...}` | `COPY TO SIDE {...}` |
| 140 | `UPLOAD_PATTERN` | `UPLOAD PATTERN` |
| 172 | `TILE_PATTERN` | `TILE PATTERN` |
| 205 | `CREATE_STYLE_IN_LIBRARY_FIRST` | `CREATE STYLE IN LIBRARY FIRST` |
| 224 | `(LEGACY_DEFAULT)` | `(LEGACY DEFAULT)` |
| 247 | `CROWN_MOLDING` | `CROWN MOLDING` |
| 279 | `WALL_ART` | `WALL ART` |
| 300 | `ART_LIBRARY_EMPTY` | `ART LIBRARY EMPTY` |
| 358 | `title="FRAME_COLOR_OVERRIDE"` | `title="FRAME COLOR OVERRIDE"` |

#### 21. `src/components/CeilingPaintSection.tsx`
| Line | Before | After |
|------|--------|-------|
| 36 | `SURFACE_MATERIAL` | `SURFACE MATERIAL` |
| 54 | `CLEAR_MATERIAL` | `CLEAR MATERIAL` |
| 69 | `CEILING_PAINT` | `CEILING PAINT` |
| 76 | `OVERRIDDEN_BY_MATERIAL` | `OVERRIDDEN BY MATERIAL` |
| 93 | `LIME_WASH_FINISH` | `LIME WASH FINISH` |

#### 22. `src/components/PaintSection.tsx`
| Line | Before | After |
|------|--------|-------|
| 50 | `LIME_WASH_FINISH` | `LIME WASH FINISH` |
| 64 | `APPLY_TO_ALL_WALLS` | `APPLY TO ALL WALLS` |

#### 23. `src/components/FloorMaterialPicker.tsx`
| Line | Before | After |
|------|--------|-------|
| 63 | `FLOOR_MATERIAL` | `FLOOR MATERIAL` |
| 78 | `"CUSTOM_IMAGE"` | `"CUSTOM IMAGE"` |
| 78 | `"UPLOAD_IMAGE..."` | `"UPLOAD IMAGE..."` |
| 134 | `RESET_TO_DEFAULT` | `RESET TO DEFAULT` |

#### 24. `src/components/CustomElementsPanel.tsx`
| Line | Before | After |
|------|--------|-------|
| 43 | `CUSTOM_ELEMENTS` | `CUSTOM ELEMENTS` |
| 110 | `NO_CUSTOM_ELEMENTS_YET` | `NO CUSTOM ELEMENTS YET` |

#### 25. `src/components/WainscotPopover.tsx`
| Line | Before | After |
|------|--------|-------|
| 72 | `WAINSCOT_EDIT` | `WAINSCOT EDIT` |
| 96 | `(LEGACY_DEFAULT)` | `(LEGACY DEFAULT)` |
| 108 | `HEIGHT_FT` | `HEIGHT FT` |

#### 26. `src/components/WainscotLibrary.tsx`
| Line | Before | After |
|------|--------|-------|
| 62 | `WAINSCOT_LIBRARY` | `WAINSCOT LIBRARY` |
| 116 | `label="PANEL_W"` | `label="PANEL W"` |
| 120 | `label="STILE_W"` | `label="STILE W"` |
| 124 | `label="PLANK_W"` | `label="PLANK W"` |
| 128 | `label="BATTEN_W"` | `label="BATTEN W"` |
| 132 | `label="PLANK_H"` | `label="PLANK H"` |
| 150 | `LOADING_PREVIEW...` | `LOADING PREVIEW...` |
| 162 | `SAVE_TO_LIBRARY` | `SAVE TO LIBRARY` |
| 169 | `NO_WAINSCOT_STYLES_YET` | `NO WAINSCOT STYLES YET` |
| 178 | `title="DOUBLE_CLICK_TO_EDIT"` | `title="DOUBLE CLICK TO EDIT"` |

#### 27. `src/components/SwatchPicker.tsx`
| Line | Before | After |
|------|--------|-------|
| 88 | `RECENTLY_USED` | `RECENTLY USED` |
| 92 | `NO_RECENT_COLORS` | `NO RECENT COLORS` |
| 117 | `HUE_FILTER` | `HUE FILTER` |
| 139 | `placeholder="SEARCH_BY_NAME"` | `placeholder="SEARCH BY NAME"` |
| 148 | `F&amp;B_CATALOG` | `F&amp;B CATALOG` |
| 153 | `NO_COLORS_FOUND` | `NO COLORS FOUND` |
| 179 | `MY_COLORS` | `MY COLORS` |
| 185 | `+ ADD_COLOR` | `+ ADD COLOR` |
| 190 | `NO_CUSTOM_COLORS` | `NO CUSTOM COLORS` |
| 220 | `placeholder="COLOR_NAME"` | `placeholder="COLOR NAME"` |
| 234 | `SAVE_COLOR` | `SAVE COLOR` |

#### 28. `src/components/HelpModal.tsx`
| Line | Before | After |
|------|--------|-------|
| 69 | `Help_&amp;_Documentation` | `Help &amp; Documentation` |
| 131 | `REPLAY_TOUR` | `REPLAY TOUR` |
| 134 | `ESC_TO_CLOSE` | `ESC TO CLOSE` |

#### 29. `src/components/onboarding/OnboardingOverlay.tsx`
| Line | Before | After |
|------|--------|-------|
| 220 | `{stepIndex + 1}_OF_{totalSteps}` | `{stepIndex + 1} OF {totalSteps}` |
| 238 | `SKIP_TOUR` | `SKIP TOUR` |
| 253 | `GOT_IT` | `GOT IT` |

#### 30. `src/three/ThreeViewport.tsx`
| Line | Before | After |
|------|--------|-------|
| 179 | `WALK_MODE` | `WALK MODE` |

---

### HELP CONTENT LABELS (Category D)

#### 31. `src/components/help/helpContent.tsx`
| Line | Before | After |
|------|--------|-------|
| 10 | `label: "GETTING_STARTED"` | `label: "GETTING STARTED"` |
| 12 | `label: "LIBRARY_&_2D"` | `label: "LIBRARY & 2D"` |
| 13 | `label: "3D_&_WALK_&_ROOMS"` | `label: "3D & WALK & ROOMS"` |
| 112 | `3D_VIEW` | `3D VIEW` |
| 118 | `ROOM_CONFIG` | `ROOM CONFIG` |
| 197 | `ADD_PRODUCT` | `ADD PRODUCT` |
| 205 | `SKIP_DIMENSIONS` | `SKIP DIMENSIONS` |
| 239 | `3_INCH, 6_INCH, and 1_FOOT` | `3 INCH, 6 INCH, and 1 FOOT` |
| 253 | `2D_PLAN` | `2D PLAN` |
| 254 | `3D_VIEW` | `3D VIEW` |

#### 32. `src/components/help/helpIndex.ts`
| Line | Before | After |
|------|--------|-------|
| 59 | `ADD_PRODUCT` | `ADD PRODUCT` |
| 67 | `SKIP_DIMENSIONS` | `SKIP DIMENSIONS` |
| 115 | `3_INCH, 6_INCH, or 1_FOOT` | `3 INCH, 6 INCH, or 1 FOOT` |
| 125 | `2D_PLAN` | `2D PLAN` |
| 125 | `3D_VIEW` | `3D VIEW` |

#### 33. `src/components/onboarding/onboardingSteps.ts`
| Line | Before | After |
|------|--------|-------|
| 53 | `3D_VIEW` | `3D VIEW` |

#### 34. `src/components/help/HelpSearch.tsx`
| Line | Before | After |
|------|--------|-------|
| 27 | `placeholder="SEARCH_HELP..."` | `placeholder="SEARCH HELP..."` |
| 45 | `NO_RESULTS` | `NO RESULTS` |

---

### CANVAS LABELS -- DO NOT CHANGE

The following use `.toUpperCase()` without `.replace()` and render product/element names as-is (with spaces preserved). No action needed:

- `src/canvas/fabricSync.ts` line 85: `el.name.toUpperCase()` -- already space-preserving
- `src/canvas/fabricSync.ts` line 842: `"MISSING_PRODUCT"` -- this is a single compound word used as a fallback label. Change to `"MISSING PRODUCT"`.

#### 35. `src/canvas/fabricSync.ts`
| Line | Before | After |
|------|--------|-------|
| 842 | `"MISSING_PRODUCT"` | `"MISSING PRODUCT"` |

---

## Change Count Summary

| Category | Files | Individual Changes |
|----------|-------|-------------------|
| Dynamic transforms | 4 | 4 |
| Data-layer labels | 1 | 1 |
| Static labels (.tsx) | 24 | ~108 |
| Help/onboarding content | 4 | ~15 |
| Canvas labels | 1 | 1 |
| **TOTAL** | **30 unique files** | **~129** |

(Some files appear in multiple categories; unique file count is 30.)

## Common Pitfalls

### Pitfall 1: Changing Icon Names
**What goes wrong:** Google Material Symbols icon identifiers like `upload_file`, `grid_view`, `add_box`, `cloud_upload`, `image_not_supported` contain underscores but are NOT display text.
**How to avoid:** Only change text content that renders visibly to the user. Icon names inside `<span className="material-symbols-outlined">` are identifiers.
**Files at risk:** TemplatePickerDialog, WelcomeScreen, AddProductModal, Toolbar

### Pitfall 2: Changing data-testid Attributes
**What goes wrong:** `data-testid="ADD_ROOM"` and `data-testid="ROOM_TABS"` are test identifiers, not display text.
**How to avoid:** Only change visible text, `title` attributes (tooltips), `placeholder` attributes, and `label` props.

### Pitfall 3: Changing Store Keys or Variable Names
**What goes wrong:** Constants like `DRAG_MIME`, `WALL_FILL`, `STATUS_MESSAGES`, `PRODUCT_CATEGORIES` are code identifiers.
**How to avoid:** Only edit string literals that appear in JSX text nodes, props that become visible text, or data object `label`/`title` fields.

### Pitfall 4: Breaking Template Literal Semantics
**What goes wrong:** `CEILING_{ceiling.id.slice(-4).toUpperCase()}` -- the underscore separates the label prefix from the dynamic ID suffix.
**How to avoid:** Replace the underscore with a space, keeping the template expression intact: `CEILING {ceiling.id.slice(-4).toUpperCase()}`.

### Pitfall 5: The Material Names Array in App.tsx
**What goes wrong:** Line 197 `["NATURAL_OAK", "BRUSHED_STEEL", "CONCRETE", "FABRIC"]` -- these strings are used as both `key=` props and displayed as `<span>` text in the same `.map()`.
**How to avoid:** Since they're only used as display labels and React keys (which can be any string), changing to spaces is safe. No store or data lookup depends on these specific strings.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (no test config files found) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LABEL-01 | Static labels display spaces | manual | Visual inspection | N/A |
| LABEL-02 | Dynamic transforms preserve spaces | manual | Visual inspection | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (type-check + bundle -- catches broken template literals)
- **Per wave merge:** Visual inspection of all views (2D, 3D, split, library, help modal, onboarding)
- **Phase gate:** Full build succeeds + visual sweep

### Wave 0 Gaps
None -- no test infrastructure exists; validation is build-check + visual.

## Sources

### Primary (HIGH confidence)
- Direct codebase grep of all `.tsx` and `.ts` files for underscore patterns
- Line-by-line reading of every flagged file to distinguish display text from code identifiers

### Confidence Assessment
- Standard stack: N/A (no new libraries)
- Architecture: HIGH -- exhaustive codebase search, every file read
- Pitfalls: HIGH -- all edge cases identified from direct code inspection

**Research date:** 2026-04-06
**Valid until:** Until next feature branch merges new UI components
