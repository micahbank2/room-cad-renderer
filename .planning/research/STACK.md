# Technology Stack — v1.4 Polish & Tech Debt

**Project:** Room CAD Renderer
**Researched:** 2026-04-06
**Scope:** Stack assessment for v1.4 polish features only.
         Existing tech is locked and validated from v1.0-v1.3. Not re-researched here.

---

## Summary: Zero New Dependencies

All five v1.4 features are achievable with the existing stack. No new npm packages, no version bumps, no build config changes. This milestone is pure React component work and string formatting fixes.

---

## Current Stack (Unchanged for v1.4)

### Core
| Technology | Version | v1.4 Impact |
|------------|---------|-------------|
| React | ^18.3.1 | None |
| TypeScript | ^6.0.2 | None |
| Vite | ^8.0.3 | None |
| Tailwind CSS | ^4.2.2 | None |

### Canvas / 3D
| Technology | Version | v1.4 Impact |
|------------|---------|-------------|
| Fabric.js | ^6.9.1 | None — wainscot inline edit is React UI, not canvas interaction |
| Three.js | ^0.183.2 | None — frame color override already reads `frameColorOverride` in WallMesh.tsx |
| @react-three/fiber | ^8.17.14 | None |
| @react-three/drei | ^9.122.0 | None |

### State / Persistence
| Technology | Version | v1.4 Impact |
|------------|---------|-------------|
| Zustand | ^5.0.12 | One new action for copy-side (trivial) |
| Immer | ^11.1.4 | None |
| idb-keyval | ^6.2.2 | None |
| react-colorful | ^5.6.1 | Already installed, used for frame color override |

### Testing
| Technology | Version | v1.4 Impact |
|------------|---------|-------------|
| Vitest | ^4.1.2 | None |
| @testing-library/react | ^16 | None |

---

## Feature-by-Feature Stack Analysis

### POLISH-02: Wainscot Inline Edit (double-click to change style/height)

**Stack needed:** React state only. No library.

**Why no library:** The codebase already uses a triple-state inline edit pattern throughout (display -> editing on click/dblclick -> save on blur/Enter). This pattern appears in `TerritoryPlanner.tsx` in the sibling project and conceptually in how `RoomSettings.tsx` handles dimension inputs. It is 10-15 lines of React per editable field.

**Integration point:** `WallSurfacePanel.tsx` already renders wainscot style and height. Add local `useState` for edit mode, render a `<select>` for style and `<input type="number">` for height when editing, save to cadStore on blur.

**Rejected:** `react-editext`, `react-inline-editing`, `react-contenteditable` — all add dependencies for something trivially implementable with native React patterns already established in this codebase.

### POLISH-03: Copy Wall Treatment to Opposite Side

**Stack needed:** One new Zustand action in cadStore. No library.

**Why:** Wall treatments are stored per-side (`A`/`B`) on `WallSegment` as `wallpaper`, `wainscoting`, `crownMolding`, and `paint` fields. Copying A to B is a structured deep-copy within a single Immer `produce()` call.

**Integration point:** Add `copyWallTreatment(wallId: string, fromSide: 'A' | 'B')` action to `cadStore.ts`. Wire a button in `WallSurfacePanel.tsx`. The action deep-copies all surface properties from one side to the other using `JSON.parse(JSON.stringify(...))` (the same clone pattern used for undo snapshots).

**Rejected:** Clipboard APIs, copy-paste libraries — this is internal store mutation, not system clipboard.

### POLISH-04: Per-Placement Frame Color Override

**Stack needed:** None. Already fully wired.

**Evidence:**
- Type exists: `frameColorOverride?: string` on `WallArtPlacement` in `src/types/cad.ts:67`
- 3D reads it: `WallMesh.tsx:206` — `const frameColor = art.frameColorOverride ?? preset?.color ?? "#ffffff"`
- UI exists: `WallSurfacePanel.tsx:347-350` — color input bound to `frameColorOverride`

**Verdict:** This is a verification task, not an implementation task. The code shipped in v1.3. Verify end-to-end: change color in panel -> 3D mesh updates -> persists on save/reload.

### POLISH-06: Sidebar Scroll Verification

**Stack needed:** None. Pure CSS verification.

**Current state:** `Sidebar.tsx` line 71 has `overflow-y-auto` on the scrollable container. If any child panel (WallSurfacePanel, ProductLibrary, RoomSettings, etc.) breaks scroll, the fix is CSS — likely `min-h-0` on a flex child or `max-h-[calc(...)]` on a specific section.

**No scrollbar styling library needed.** Tailwind's scrollbar utilities or 5 lines of custom CSS in `index.css` handle any aesthetic tweaks.

### UI Cleanup: Remove Underscores from Labels

**Stack needed:** None. String replacement changes in 4 files + static label audit.

**Exact locations of dynamic underscore insertion:**
| File | Line | Current Code |
|------|------|-------------|
| `src/components/ProductLibrary.tsx` | 159 | `.toUpperCase().replace(/\s/g, "_")` |
| `src/components/PropertiesPanel.tsx` | 134 | `.toUpperCase().replace(/\s/g, "_")` |
| `src/components/SidebarProductPicker.tsx` | 50 | `.toUpperCase().replace(/\s/g, "_")` |
| `src/components/RoomTabs.tsx` | 32 | `.toUpperCase().replace(/\s/g, "_")` |

**Fix:** Remove the `.replace(/\s/g, "_")` call. Keep `.toUpperCase()` to maintain the Obsidian CAD monospace label aesthetic. Spaces in monospace uppercase text read cleanly (e.g., "LIVING ROOM" instead of "LIVING_ROOM").

**Additional audit needed:** 26 component files contain underscores in strings. Most are CSS class names or code identifiers (fine to keep). Audit for hardcoded UI label strings like `"ROOM_CONFIG"`, `"SYSTEM_STATUS"`, `"FLOOR_PLAN"` and decide per-label whether to replace with spaces. These are part of the CAD/terminal aesthetic and may be intentional design choices worth discussing.

---

## What NOT to Add

| Library | Why Not |
|---------|---------|
| Any inline-edit package | Triple-state edit pattern is 10 lines of React, already used in codebase |
| Any clipboard/copy package | Copy-side is internal store mutation, not clipboard |
| Any scrollbar library | Tailwind + native CSS overflow handles it |
| Any string formatting library | 4 string replacements do not justify a dependency |

---

## Installation

```bash
# Nothing to install. Current package.json is complete for v1.4.
npm install   # verify lockfile is clean
```

---

## Confidence Assessment

| Claim | Confidence | Basis |
|-------|-----------|-------|
| Zero new dependencies needed | HIGH | All 5 features analyzed against codebase; all use existing patterns |
| frameColorOverride already fully wired | HIGH | Confirmed in 3 files: type, 3D renderer, UI panel |
| Underscore labels in exactly 4 dynamic locations | HIGH | Grep confirmed: `toUpperCase().replace(/\s/g, "_")` in 4 files |
| Sidebar scroll fix is CSS-only | HIGH | `overflow-y-auto` already present; any fix is layout constraint adjustment |
| Copy-side needs one new cadStore action | HIGH | Per-side data model confirmed in `cad.ts`; deep-copy is the only operation |

---

## Sources

- Codebase grep: `frameColorOverride` in 4 files (`cad.ts`, `WallSurfacePanel.tsx`, `WallMesh.tsx`)
- Codebase grep: `.toUpperCase().replace` in 4 component files
- Codebase grep: `overflow-y` in `Sidebar.tsx:71`
- `package.json` dependency list — `react-colorful ^5.6.1` already installed
- `src/types/cad.ts` — `WainscotConfig`, `WallArtPlacement`, per-side wall treatment types
