# Domain Pitfalls: v1.4 Polish & Tech Debt

**Domain:** Interior design CAD tool -- deferred polish verification + UI label cleanup
**Researched:** 2026-04-06
**Confidence:** HIGH (all pitfalls verified by direct codebase inspection of relevant source files)

---

## Critical Pitfalls

Mistakes that cause visual regressions, broken interaction, or data loss.

---

### Pitfall 1: Underscore removal destroys the Obsidian CAD design system's visual identity

**What goes wrong:** The requirement says "remove underscores from UI labels" but the codebase has TWO distinct categories of underscore usage:

1. **Intentional design tokens** -- hardcoded labels like `WALL_SURFACE`, `ROOM_CONFIG`, `SYSTEM_STATS`, `COPY_TO_SIDE_B`, `CROWN_MOLDING`, `WAINSCOT_LIBRARY`, `3_INCH`, `6_INCH`. These are the Obsidian CAD theme's signature aesthetic (monospace + tracking-widest + underscores = "CAD terminal" feel). There are 50+ instances across components, help content, and onboarding.

2. **Dynamic content labels** -- `.toUpperCase().replace(/\s/g, "_")` applied to user-entered names. These turn "Leather Sofa" into "LEATHER_SOFA". There are exactly 4 call sites:
   - `PropertiesPanel.tsx:134`
   - `SidebarProductPicker.tsx:50`
   - `ProductLibrary.tsx:159`
   - `RoomTabs.tsx:32`

Only category 2 should change. Category 1 IS the design system.

**Why it happens:** A developer interprets "remove underscores" as a global operation, touching hardcoded string literals alongside dynamic `.replace()` calls. Or worse, uses a global find-and-replace regex that also hits code identifiers (`PRODUCT_CATEGORIES`, `MAX_HISTORY`), CSS class names, TypeScript constants, import paths, and data attributes.

**Consequences:**
- Removing category 1 underscores: `ROOM CONFIG` looks like a broken label, not a design choice. The monospace + tracking-widest + underscore combo reads as "CAD terminal." Without underscores it is just shouty text with no design language.
- Removing from code identifiers: Build failures, broken constants, test breakage.

**Prevention:**
- Scope the fix to ONLY the 4 dynamic `.replace(/\s/g, "_")` call sites listed above.
- Simply remove the `.replace()` call -- `.toUpperCase()` alone produces "LEATHER SOFA" with a space.
- Do NOT touch hardcoded string literals like `WALL_SURFACE`, `CROWN_MOLDING`, `SYSTEM_STATS`.
- Do NOT use a global regex find-and-replace on underscore characters.
- Run `npm run build` and `npm run test` after each file edit.

**Detection:** After the change, product names and room tab labels should have spaces. Section headers (`ROOM_CONFIG`, `WALL_SURFACE`) should still have underscores. TypeScript should compile cleanly.

**Phase affected:** UI cleanup phase.

---

### Pitfall 2: Double-click event collision between dimension labels and wainscot inline edit

**What goes wrong:** The 2D canvas already uses `mouse:dblclick` for wall dimension label editing (`FabricCanvas.tsx:224`). The handler iterates all walls checking `hitTestDimLabel()`. Adding a wainscot inline-edit double-click handler on the canvas creates ambiguous dispatch -- both features would fire on the same gesture when click targets overlap with wall regions.

**Why it happens:** The wainscot inline edit feature (POLISH-02) is described as "double-click to change style/height in place." If "in place" means on the 2D canvas, it conflicts with the existing dblclick handler. If "in place" means in the sidebar panel, there is no conflict.

**Consequences:** Double-clicking a wall either edits the dimension label when the user wanted wainscoting (or vice versa), or fires both handlers, creating two simultaneous edit states.

**Prevention:**
- Wainscot inline edit should live in the sidebar `WallSurfacePanel.tsx`, NOT on the canvas. The existing `WainscotLibrary.tsx` already has `onDoubleClick={() => setEditingId(it.id)}` (line 177) for editing library items -- this pattern already exists and should be the verification target.
- If canvas-based inline edit is truly required, add hit-test priority: dimension labels first (smaller, more specific target), then wainscot regions, with early return on first hit.
- Verify the existing `WainscotLibrary.tsx` double-click edit path works end-to-end: double-click a library item, change style/height, confirm the change persists and renders correctly in 3D.

**Detection:** Test double-clicking near a wall's dimension label when wainscoting is enabled on that wall. If both editors open or the wrong one opens, the collision exists.

**Phase affected:** POLISH-02 (wainscot inline edit).

---

### Pitfall 3: Frame color picker floods undo history during drag interaction

**What goes wrong:** In `WallSurfacePanel.tsx:349`, the `frameColorOverride` color picker's `onChange` calls `useCADStore.getState().updateWallArt(wall.id, a.id, { frameColorOverride: e.target.value })`. The `updateWallArt` action calls `pushHistory()` on every invocation (`cadStore.ts:529-535`). Browser color pickers fire many `change` events during a drag. Each drag position fires `updateWallArt` which pushes a full snapshot -- dragging through colors can flood the undo stack with dozens of intermediate states.

**Why it happens:** The codebase has the `*NoHistory` pattern for drags (e.g., `rotateProductNoHistory`, `resizeProductNoHistory`, `moveCustomElement` vs. history-boundary mousedown pattern). But `updateWallArt` has no no-history variant.

**Consequences:** User changes frame color by dragging the picker, then hits Ctrl+Z. Instead of reverting to the original color in one step, they undo through 20+ intermediate color states. The undo stack fills with noise, potentially pushing out meaningful history entries (MAX_HISTORY = 50).

**Prevention:**
- Add `updateWallArtNoHistory` action to cadStore, following the existing `*NoHistory` pattern.
- Use `updateWallArtNoHistory` on the color picker's `onChange` and push history only on the final committed value (on picker close/blur).
- Alternative: debounce the `updateWallArt` call with a 300ms trailing delay so only the final color pushes history.

**Detection:** Open a frame color picker, drag through several colors, then count how many Ctrl+Z presses it takes to restore the original color. Should be 1; will be 10+ without the fix.

**Phase affected:** POLISH-04 (frame color override).

---

## Moderate Pitfalls

---

### Pitfall 4: copyWallSide silently destroys existing target-side art without confirmation

**What goes wrong:** The `copyWallSide` action (`cadStore.ts:808`) removes ALL existing art on the target side before cloning source art: `wall.wallArt = (wall.wallArt ?? []).filter(a => (a.side ?? "A") !== to)`. Then it clones source-side art with new IDs and the target side value. If the user had carefully positioned art on side B, copying A to B permanently destroys B's art.

**Why it happens:** "Copy" semantically means "replace" in the current implementation, which is reasonable. But users may expect "merge" or "copy only surface treatments, not art."

**Consequences:** User places carefully positioned art on side B, then copies side A's paint/wainscoting to B (intending to copy only surface treatment). All side B art is gone. Undo is the only recovery path.

**Prevention:**
- Verify the behavior during testing: place art on both sides, copy A to B, confirm B's original art is replaced.
- Verify undo fully restores the target side's original art.
- Document "copy = full replace" as accepted behavior for v1.4.
- If the behavior feels destructive during testing, consider scoping copy to only wallpaper/wainscoting/crown (not wall art). This requires a targeted change to `copyWallSide`.

**Detection:** Place different art on side A and side B. Copy A to B. Verify B now shows A's art only, not both.

**Phase affected:** POLISH-03 (copy wall side).

---

### Pitfall 5: copyWallSide shallow-clone risk on nested objects

**What goes wrong:** If `copyWallSide` used spread or `Object.assign` instead of `JSON.parse(JSON.stringify(...))`, both sides would share the same nested object references. Immer's `produce()` would then mutate Side A and Side B would silently change too.

**Why it happens:** JavaScript object spread creates shallow copies. Nested objects (wallArt items with `frameColorOverride`, wainscot config with `styleItemId`) remain shared references.

**Consequences:** Editing one side of a wall changes the other side. Undo may not fully revert because the reference is shared.

**Prevention:** The existing `copyWallSide` action already uses `JSON.parse(JSON.stringify(...))` for deep clones (verified at cadStore.ts lines 787, 793, 799, 811). This is correct. During verification, confirm this by testing:
1. Copy side A to B.
2. Edit side A's wallpaper color.
3. Confirm side B's color did NOT change.
4. Also verify copied wallArt items have new IDs (not shared IDs with source side) -- the code generates new IDs at line 812.

**Detection:** Copy side A to B. Edit side A wallpaper. If side B also changed, shared reference bug exists. The current code is correct but verification confirms it.

**Phase affected:** POLISH-03 (copy wall side).

---

### Pitfall 6: Nested scroll containers in sidebar trap scroll events

**What goes wrong:** The Sidebar has `overflow-hidden` on the outer `<aside>` and `overflow-y-auto` on the inner scrollable `<div>` (`Sidebar.tsx:57,71`). Several sub-panels within the scrollable area use their own `max-h-* overflow-y-auto` containers (e.g., art library popup in `WallSurfacePanel.tsx:297` uses `max-h-40 overflow-y-auto`). On macOS, when the cursor is over a nested scrollable region that has reached its boundary, the outer sidebar stops scrolling.

**Why it happens:** Browser native scroll event propagation stops at the first `overflow: auto/scroll` element. Once the inner container hits its boundary, scroll events may or may not propagate to the parent depending on platform and momentum.

**Consequences:** User tries to scroll through the sidebar but gets "stuck" when hovering over the art library list, wainscot style list, or product library. They must move the cursor outside the nested container to continue scrolling.

**Prevention:**
- Test with ALL collapsible sections expanded simultaneously.
- Scroll from top to bottom with the cursor in one position. Verify continuous scrolling.
- If trapping occurs, add `overscroll-behavior: contain` to inner scroll containers, or remove `max-h` constraints and let inner lists expand fully within the outer scroll context.
- Also verify `min-h-0` is present on the flex child containing the scrollable area (common flexbox scroll pitfall). Current code has `flex-1` but may need explicit `min-h-0` to prevent the flex child from refusing to shrink below content height.

**Detection:** Open all sidebar sections, hover cursor over any nested scrollable list, try to scroll past it. If scrolling stops, nested scroll trapping is present.

**Phase affected:** POLISH-06 (sidebar scroll verification).

---

### Pitfall 7: Wainscot style/height state appears lost after undo due to cross-store reference

**What goes wrong:** Wainscoting config on walls stores `styleItemId` as a foreign key to a `WainscotStyleItem` in the separate `wainscotStyleStore`. The `snapshot()` function (`cadStore.ts:95-111`) captures `rooms`, `customElements`, `customPaints`, `recentPaints` but NOT wainscot style items. If a user applies a style, undoes, deletes the style from the library, then redoes -- the wall references a deleted style ID.

**Consequences:** `WallMesh.tsx` does `wainscotStyles.find(s => s.id === wains.styleItemId)` -- returns `undefined` -- falls to legacy fallback rendering (different visual, but no crash). User sees unexpected wainscoting appearance.

**Prevention:**
- Accept this as a known edge case (delete-then-redo is rare for a single-user tool).
- When verifying wainscot inline edit: test the full cycle (apply style, undo, redo) and confirm the correct style renders.
- Ensure the fallback rendering path in WallMesh produces reasonable output -- it already does (legacy recessed-panel defaults).

**Detection:** Apply a wainscoting style, undo, redo, confirm 3D renders the correct style (not fallback).

**Phase affected:** POLISH-02 (wainscot inline edit verification).

---

## Minor Pitfalls

---

### Pitfall 8: Help content and onboarding reference labels that may become inconsistent

**What goes wrong:** Help content files (`helpContent.tsx`, `helpIndex.ts`, `onboardingSteps.ts`) contain inline references to UI labels: `ADD_PRODUCT`, `SKIP_DIMENSIONS`, `ROOM_CONFIG`, `3D_VIEW`, `2D_PLAN`. These reference hardcoded design system labels. If the underscore removal is mistakenly applied to help content, the help text will not match the actual UI (which retains underscores).

**Prevention:** Do NOT change help content strings. After the fix, open the help panel and spot-check that referenced label names still match the actual UI.

**Detection:** Open help, search for "product" or "room" -- verify referenced labels match the actual UI labels.

**Phase affected:** UI cleanup phase.

---

### Pitfall 9: Frame color override persists across frame style changes

**What goes wrong:** If a user sets `frameColorOverride` to red on an art piece, then changes `frameStyle` to "Gold Classic," the art renders with the red override color, not the gold default. The override is sticky and invisible.

**Prevention:**
- Verify behavior: change frame style after setting a color override. Decide if the override should clear on style change.
- If clearing is desired, add `frameColorOverride: undefined` to the `updateWallArt` call when frame style changes.
- For v1.4, documenting the behavior is sufficient. The existing guard (`WallSurfacePanel.tsx:344`: color picker only shows when `art.frameStyle && art.frameStyle !== "none"`) is already correct.

**Detection:** Set frame color override to red. Change frame style. If the new style renders red instead of its default, the override persists.

**Phase affected:** POLISH-04 (frame color override).

---

### Pitfall 10: CollapsibleSection state resets on sidebar toggle

**What goes wrong:** `CollapsibleSection` uses local `useState` with `defaultOpen` (`Sidebar.tsx:25`). When the sidebar is collapsed and reopened, all sections reset. Sections that were `defaultOpen={false}` (SYSTEM_STATS, LAYERS, SNAP) revert to closed even if the user had opened them.

**Prevention:** Note as known behavior during sidebar scroll verification. Do not fix in v1.4 unless explicitly requested.

**Detection:** Expand all sections, collapse sidebar, reopen. SYSTEM_STATS, LAYERS, SNAP sections will be collapsed again.

**Phase affected:** POLISH-06 (sidebar scroll verification) -- observation only, not a fix target.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Wainscot inline edit (POLISH-02) | Double-click collision with dimension label editor | Keep edit in sidebar, verify existing WainscotLibrary.tsx onDoubleClick path works end-to-end |
| Wainscot inline edit (POLISH-02) | Style not persisting through undo/redo | Test apply/undo/redo cycle. Accept wainscotStyleStore-vs-history gap as known edge case |
| Copy wall side (POLISH-03) | Silent art destruction on target side | Test with art on both sides. Document "copy = full replace" behavior |
| Copy wall side (POLISH-03) | Shallow clone shares references | Verify JSON.parse(JSON.stringify) in copyWallSide (already correct in code, needs runtime verification) |
| Frame color override (POLISH-04) | Undo history flooding from color picker drag | Add `updateWallArtNoHistory` or debounce onChange. Follow history-boundary pattern |
| Frame color override (POLISH-04) | Override persists across frame style changes | Decide policy: clear on style change or keep. Document whichever |
| Sidebar scroll (POLISH-06) | Nested scroll containers trap scroll events | Test with all sections expanded. Add `overscroll-behavior: contain` if needed |
| Sidebar scroll (POLISH-06) | Flex child min-height prevents scrollbar | Verify or add `min-h-0` on flex-1 container |
| Remove underscores (UI cleanup) | Destroying design system labels' underscore aesthetic | Only change 4 dynamic `.replace()` call sites. Leave 50+ hardcoded labels alone |
| Remove underscores (UI cleanup) | Breaking code identifiers, constants, CSS classes | Edit labels individually, never global regex. Build + test after each file |
| Remove underscores (UI cleanup) | Help content label references become inconsistent | Do NOT change help content strings |

---

## Sources

- Direct codebase inspection: `cadStore.ts` (copyWallSide lines 777-817, snapshot lines 95-111, updateWallArt lines 529-535)
- Direct codebase inspection: `WallSurfacePanel.tsx` (frameColorOverride picker line 347, copyWallSide button line 119, frame guard line 344)
- Direct codebase inspection: `FabricCanvas.tsx` (dblclick handler line 224)
- Direct codebase inspection: `WainscotLibrary.tsx` (onDoubleClick line 177)
- Direct codebase inspection: `Sidebar.tsx` (overflow patterns lines 57, 71, CollapsibleSection line 25)
- Direct codebase inspection: `WallMesh.tsx` (frameColorOverride usage line 206, wainscot style lookup lines 155-160)
- Grep results: `.toUpperCase().replace(/\s/g, "_")` confirmed in exactly 4 files (PropertiesPanel, SidebarProductPicker, ProductLibrary, RoomTabs)
- Grep results: 50+ hardcoded `UPPER_SNAKE_CASE` labels across components and help content
- Project context: `.planning/PROJECT.md`
- Design system conventions: `CLAUDE.md` (Obsidian CAD theme, UI label convention)
