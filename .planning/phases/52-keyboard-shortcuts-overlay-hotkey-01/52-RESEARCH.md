# Phase 52: Keyboard Shortcuts Overlay (HOTKEY-01) — Research

**Researched:** 2026-04-27
**Domain:** Keyboard shortcut registry, HelpModal, App.tsx keyboard handler
**Confidence:** HIGH (all findings from direct file reads, no speculation)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Create `src/lib/shortcuts.ts` as single source of truth consumed by both `App.tsx` keyboard handler and `helpContent.tsx` SHORTCUTS display. Each entry has `keys`, `match`, `action`, `group`, `context?`, `inertWhenFormFocused?`.
- **D-02** — Audit ALL handler branches in `App.tsx`; add any missing entries to registry. A vitest unit test asserts coverage.
- **D-03** — Verify HelpModal entrance animation respects `useReducedMotion()`. Add guard if animation exists without one.
- **D-04** — `?` MUST be inert when focus is in a form input. Implement via active-element check at the `?` handler site.
- **D-05** — Create `e2e/keyboard-shortcuts-overlay.spec.ts` mirroring Phase 49/50 setup pattern.
- **D-06** — Keep `icon: "keyboard"` (Material Symbols) in `helpContent.tsx`. Do NOT migrate to lucide.
- **D-07** — Atomic commits per task.
- **D-08** — Zero regressions on existing HelpModal navigation, App.tsx shortcuts, Phase 35 preset hotkeys, Phase 31 copy/paste hotkeys, Phase 49/50 e2e specs.

### Claude's Discretion

None specified — all decisions locked.

### Deferred Ideas (OUT OF SCOPE)

- Replacing HelpModal with a new `KeyboardShortcutsOverlay` component
- Adding shortcuts that don't currently exist
- Refactoring HelpModal layout / search / section system
- Adding tooltips on Toolbar buttons for keyboard shortcuts
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOTKEY-01 | Pressing `?` opens keyboard shortcuts cheat sheet overlay. Auto-discovers shortcuts from single source of truth. Reduced-motion guard. Inert when form focused. Closeable via Escape or backdrop click. | Registry design §3; migration §5; D-03 audit §7; D-04 audit §8; e2e design §9 |
</phase_requirements>

---

## Summary

The infrastructure for a keyboard shortcuts overlay is already 80% built. `HelpModal` is the overlay; the `"shortcuts"` section already exists in `HelpSectionId`. The `SHORTCUTS` array in `helpContent.tsx` lists 19 hotkeys but is missing 7 shortcuts that are wired in `App.tsx` (Camera Presets 1/2/3/4, Copy Ctrl+C, Paste Ctrl+V, Fit-to-view 0). The `?` key already opens `HelpModal`, but it calls `openHelp()` with no section argument, meaning it opens to whatever section was last active rather than always showing "shortcuts." That needs fixing.

Phase 52's core work is: (1) create the registry file, (2) wire `App.tsx` to use it, (3) derive `SHORTCUTS` from the registry, (4) add missing entries, (5) make `?` open to the shortcuts section specifically, (6) add the coverage-gate test, and (7) add the e2e spec.

**Primary recommendation:** Use Option B for migration — derive `SHORTCUTS` as a computed constant from the registry. This is the lowest-risk change: both `helpContent.tsx:142` and `helpIndex.ts:179` continue to consume `SHORTCUTS` without modification; only the source of truth changes.

---

## Complete Shortcut Audit (App.tsx lines 124–265)

Walking every conditional branch in the keyboard handler. Line numbers cite `src/App.tsx`.

| # | Key(s) | Modifiers | Action | Guard / Context | In current SHORTCUTS? | Suggested Group |
|---|--------|-----------|--------|-----------------|----------------------|-----------------|
| 1 | `Escape` | — | Close HelpModal | `showHelp === true` (line 128); runs even when input focused | Yes (as "Cancel current action / close modal") | Editing |
| 2 | `?` / `/` | Shift | Open HelpModal | Skips if `e.target` is INPUT/TEXTAREA/SELECT (lines 134–138); checked BEFORE help guard (lines 141–145) | Yes (as "Open this help") | Help |
| 3 | `v` | — | Select tool | Not in library viewMode (line 154) | Yes | Tools |
| 4 | `w` | — | Wall tool | Not in library viewMode (line 154) | Yes |  Tools |
| 5 | `d` | — | Door tool | Not in library viewMode (line 154) | Yes | Tools |
| 6 | `n` | — | Window tool | Not in library viewMode (line 154) | Yes | Tools |
| 7 | `c` | — | Ceiling tool | Not in library viewMode (line 154) | **No** — missing entirely | Tools |
| 8 | `0` | — | Reset canvas view (fit-to-view) | viewMode === "2d" or "split" (line 156) | **No** — missing | View |
| 9 | `e` | — | Toggle walk/orbit camera | viewMode === "3d" or "split" (line 160) | Yes | 3D & Walk |
| 10 | `1` | — | Camera preset: Eye-level | viewMode === "3d" or "split"; no modifiers; cameraMode !== "walk" (lines 170–178) | **No** — missing | Camera Presets |
| 11 | `2` | — | Camera preset: Top-down | Same as #10 | **No** — missing | Camera Presets |
| 12 | `3` | — | Camera preset: 3/4 view | Same as #10 | **No** — missing | Camera Presets |
| 13 | `4` | — | Camera preset: Corner | Same as #10 | **No** — missing | Camera Presets |
| 14 | `c` | Ctrl/Cmd (no Shift) | Copy selected walls/products | selectedIds.length > 0 (line 183) | **No** — missing | Editing |
| 15 | `v` | Ctrl/Cmd (no Shift) | Paste clipboard with offset | `_clipboard` not null (line 200) | **No** — missing | Editing |
| 16 | `Tab` | Ctrl/Cmd | Cycle to next room | rooms.length >= 2 (line 258) | Yes (two entries for Ctrl+Tab and Cmd+Tab) | Rooms |
| 17 | Undo `z` | Ctrl/Cmd | Undo | Not guarded at App.tsx level — handled by Fabric/keyboard elsewhere | Yes | Editing |
| 18 | Redo `z` | Ctrl/Cmd+Shift | Redo | Same | Yes | Editing |
| 19 | Delete / Backspace | — | Delete selected | Same | Yes (two entries) | Editing |
| 20 | Shift (held) | — | Orthogonal wall constraint | wallTool closure, not App.tsx | Yes | Tools |
| 21 | Double-click | — | Edit wall dimension label | Canvas tool, not App.tsx | Yes | Editing |
| 22 | Shift (held) | — | Free rotate (no 15° snap) | selectTool rotation handle, not App.tsx | Yes | Editing |
| 23 | WASD | — | Walk mode movement | ThreeViewport walk mode, not App.tsx | Yes | 3D & Walk |
| 24 | Mouse | — | Look around in walk mode | ThreeViewport pointer lock, not App.tsx | Yes | 3D & Walk |

**Entries missing from current SHORTCUTS (7 gaps):**
- `c` → Ceiling tool (line 150–154)
- `0` → Fit-to-view / reset canvas (line 156)
- `1` → Camera preset: Eye-level (line 170–178, via PRESETS[0])
- `2` → Camera preset: Top-down (line 170–178, via PRESETS[1])
- `3` → Camera preset: 3/4 view (line 170–178, via PRESETS[2])
- `4` → Camera preset: Corner (line 170–178, via PRESETS[3])
- `Ctrl/Cmd+C` → Copy (line 181)
- `Ctrl/Cmd+V` → Paste (line 199)

Note: Ctrl/Cmd+V and the bare `V` (select tool) share the same key but differ on modifier — this is handled correctly in the handler at lines 150–154 (bare key) and 199–253 (with Ctrl/Cmd). The registry must distinguish these.

Note: `openHelp()` at line 142 calls `openHelp()` with **no section argument**. `uiStore.ts:190–193` shows `openHelp: (section) => set((s) => ({ showHelp: true, activeHelpSection: section ?? s.activeHelpSection }))` — so without a section argument, the modal opens to whichever section was last active. HOTKEY-01 requires `?` opens the shortcuts section. Fix: call `openHelp("shortcuts")` (line 142).

---

## Registry Shape (TypeScript)

### Recommended `Shortcut` type for `src/lib/shortcuts.ts`

D-01 specifies `match: (e: KeyboardEvent) => boolean`. Use the predicate approach — it is more flexible than a structured `{ key, modifiers }` object because some shortcuts (Camera Presets 1–4, tool shortcuts) have complex multi-condition guards that would require a DSL to express structurally.

```typescript
// src/lib/shortcuts.ts

export type ShortcutGroup =
  | "Tools"
  | "Editing"
  | "View"
  | "Camera Presets"
  | "3D & Walk"
  | "Rooms"
  | "Help";

export interface Shortcut {
  /** Display key(s) shown in the overlay, e.g. ["Ctrl", "Z"] or ["1"] */
  keys: string[];
  /** Human-readable description, e.g. "Undo" */
  action: string;
  /** Overlay group heading */
  group: ShortcutGroup;
  /** Optional sub-label rendered in smaller text below action (context/condition) */
  context?: string;
  /**
   * Predicate that returns true when this shortcut should fire.
   * App.tsx keyboard handler iterates the registry and calls match(e).
   * The handler's own active-element guard (INPUT/TEXTAREA/SELECT check
   * at App.tsx:134-138) runs BEFORE any match() call — predicates can
   * assume focus is not in a form field (except for Escape, which is
   * checked before the form guard and is handled separately).
   */
  match: (e: KeyboardEvent) => boolean;
  /**
   * Action to execute when match() returns true.
   * App.tsx's handler calls this; the dispatch is the same store action
   * the current inline branches call.
   */
  handler: () => void;
}
```

### Why predicate over structured object

A structured `{ key: string, ctrl?: boolean, meta?: boolean }` object can express most shortcuts but breaks on:
- Camera Presets: require `viewMode` closure (runtime state, not keyboard event data)
- Copy/Paste: require `selectedIds` / `_clipboard` checks
- `0` reset: requires `viewMode` check

A predicate captures all of this naturally. The `handler` field keeps dispatch co-located with the match condition.

### Cross-platform modifier pattern

Mirrors Phase 31 (lines 181, 199): `e.ctrlKey || e.metaKey` without `e.shiftKey`:

```typescript
match: (e) => e.key.toLowerCase() === "c" && (e.ctrlKey || e.metaKey) && !e.shiftKey,
```

The `keys` display field handles the dual-platform label:

```typescript
keys: ["Ctrl / Cmd", "C"],
```

### "Key is a digit 1–4" pattern (Camera Presets)

The App.tsx handler (lines 170–178) already uses `PRESETS.find((p) => p.key === e.key)`. The registry should generate Camera Preset entries from `PRESETS` to stay DRY:

```typescript
import { PRESETS } from "@/three/cameraPresets";

// Generated entries — one per preset
...PRESETS.map((p) => ({
  keys: [p.key],
  action: `Camera preset: ${p.label}`,
  group: "Camera Presets" as ShortcutGroup,
  context: "3D or split view, orbit mode only",
  match: (e: KeyboardEvent) =>
    e.key === p.key &&
    !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey &&
    (viewMode === "3d" || viewMode === "split") &&
    useUIStore.getState().cameraMode !== "walk",
  handler: () => useUIStore.getState().requestPreset(p.id),
})),
```

The `viewMode` closure is the key challenge here — see Migration section below.

### Sample entries

```typescript
// Tool: Select
{
  keys: ["V"],
  action: "Select tool",
  group: "Tools",
  match: (e) => e.key.toLowerCase() === "v" && !e.ctrlKey && !e.metaKey,
  handler: () => setTool("select"),
},

// Editing: Copy
{
  keys: ["Ctrl / Cmd", "C"],
  action: "Copy selected",
  group: "Editing",
  match: (e) => e.key.toLowerCase() === "c" && (e.ctrlKey || e.metaKey) && !e.shiftKey,
  handler: () => { /* copy dispatch — needs store access */ },
},

// Camera Preset: Eye-level
{
  keys: ["1"],
  action: "Camera preset: Eye level",
  group: "Camera Presets",
  context: "3D or split view, orbit mode only",
  match: (e) =>
    e.key === "1" &&
    !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey &&
    (viewMode === "3d" || viewMode === "split") &&
    useUIStore.getState().cameraMode !== "walk",
  handler: () => useUIStore.getState().requestPreset("eye-level"),
},

// Help: Open shortcuts overlay
{
  keys: ["?"],
  action: "Open keyboard shortcuts",
  group: "Help",
  match: (e) => e.key === "?" || (e.key === "/" && e.shiftKey),
  handler: () => useUIStore.getState().openHelp("shortcuts"),
},
```

### The `viewMode` closure problem

Several shortcuts are gated on `viewMode` (a React state variable in `App.tsx`). The current handler closes over it via the `useEffect([..., viewMode])` dependency array. The registry entries that need `viewMode` must either:

**Option A (recommended):** Pass `viewMode` as a parameter to a factory function that creates the registry inside the `useEffect`. The registry is rebuilt when `viewMode` changes — same behavior as today.

```typescript
// In App.tsx
const registry = buildRegistry({ viewMode, setTool, getActiveRoomDoc });
```

`src/lib/shortcuts.ts` exports `buildRegistry(ctx: ShortcutContext): Shortcut[]`. This keeps the registry pure (no store imports for `viewMode`) while remaining the single source of truth for all shortcut metadata and display data.

**Option B:** Store `viewMode` in `uiStore` so predicates can read it via `useUIStore.getState()`. This is a larger change and not warranted — `viewMode` is intentionally local React state in `App.tsx`.

**Recommendation:** Option A. `buildRegistry` is called once inside `useEffect`, the returned array replaces the current inline handler logic. For display purposes (`SHORTCUTS` in `helpContent.tsx`), a second export `SHORTCUT_DISPLAY_LIST` is a static array (no closures, no context) used only for the overlay and search index.

---

## Migration Strategy

### Current consumers of `SHORTCUTS`

1. `helpContent.tsx:142` — `Array.from(new Set(SHORTCUTS.map((s) => s.group)))` for group rendering
2. `helpIndex.ts:179` — `...SHORTCUTS.map((s, i) => ({ id: \`sc-${i}\`, section: "shortcuts", heading: s.action, body: ..., keywords: [...] }))` for search index

Both consume `SHORTCUTS` as `{ keys: string[], action: string, group: string, context?: string }[]`. Neither calls `match()` or `handler()`.

### Three options

| Option | Description | Risk |
|--------|-------------|------|
| A | Import `SHORTCUTS` from `@/lib/shortcuts` — re-export from helpContent | Low — consumers unchanged |
| B | `SHORTCUTS = SHORTCUT_DISPLAY_LIST` computed from registry — derive display shape | Low — consumers unchanged |
| C | helpContent + helpIndex import directly from registry | Medium — two import sites change |

### Recommendation: Option B

`src/lib/shortcuts.ts` exports two things:
1. `SHORTCUT_DISPLAY_LIST: ShortcutDisplay[]` — static array of `{ keys, action, group, context }` used by helpContent and helpIndex. No closures.
2. `buildRegistry(ctx): Shortcut[]` — factory that returns full `Shortcut[]` with `match` and `handler`, consumed by App.tsx.

In `helpContent.tsx`, rename: `export const SHORTCUTS = SHORTCUT_DISPLAY_LIST` (or just change the import). The `Shortcut` interface in helpContent.tsx is currently defined locally — it should be replaced by the `ShortcutDisplay` type imported from `@/lib/shortcuts.ts`.

This approach:
- Keeps both `helpContent.tsx:142` and `helpIndex.ts:179` untouched (they still consume a `SHORTCUTS` binding with the same shape)
- Single source of truth: `shortcuts.ts` owns all shortcut data
- No risk to search index

---

## Coverage-Gate Test Design (D-02)

### The core challenge

The handler at `App.tsx:124–265` is imperative inline code, not a dispatch table. A test cannot statically enumerate handler branches from the source file without a build step. Runtime discovery is the practical path.

### Recommended approach: snapshot comparison (LOW build cost)

The registry exports a list of shortcut IDs (or action strings). The test imports the registry and asserts that a curated set of known handler branches (hardcoded in the test) all appear in the registry.

```typescript
// tests/lib/shortcuts.registry.test.ts
import { SHORTCUT_DISPLAY_LIST } from "@/lib/shortcuts";

const EXPECTED_ACTIONS = [
  "Select tool",
  "Wall tool",
  "Door tool",
  "Window tool",
  "Ceiling tool",       // was missing
  "Reset canvas view",  // was missing
  "Toggle walk/orbit camera",
  "Camera preset: Eye level",   // was missing
  "Camera preset: Top down",    // was missing
  "Camera preset: 3/4 view",    // was missing
  "Camera preset: Corner",      // was missing
  "Copy selected",              // was missing
  "Paste",                      // was missing
  "Undo",
  "Redo",
  "Delete selected",
  "Cycle to next room",
  "Open keyboard shortcuts",
];

test("registry covers all keyboard handler branches", () => {
  const registeredActions = SHORTCUT_DISPLAY_LIST.map((s) => s.action);
  for (const expected of EXPECTED_ACTIONS) {
    expect(registeredActions).toContain(expected);
  }
});
```

**Failure mode:** Developer adds a new hotkey to App.tsx, adds it to `EXPECTED_ACTIONS` in the test (because tests catch the omission), but forgets `shortcuts.ts` — test fails with "expected registry to contain X." Developer adds the registry entry — pass.

Alternatively: developer adds hotkey to App.tsx and does NOT update the test — the test still passes (a limitation). To close this gap, add a lint comment in App.tsx at the keyboard handler: `// INVARIANT: every branch here must have a corresponding entry in src/lib/shortcuts.ts AND appear in EXPECTED_ACTIONS in tests/lib/shortcuts.registry.test.ts`. This is a documentation-level enforcement, not automated, but matches the project's existing invariant-comment pattern (see App.tsx line 165).

**Trade-off noted:** A truly automated approach would parse the AST of App.tsx at test time. This adds significant build complexity (typescript-eslint or ts-morph as test dep). Not worth it for a list of ~18 branches. The snapshot approach with a lint comment is the right cost/benefit.

---

## D-03: Reduced-Motion Audit (HelpModal entrance animation)

**Finding: HelpModal has NO entrance animation. D-03 scope is zero.**

Reading `src/components/HelpModal.tsx` in full:
- The modal renders with `if (!showHelp) return null` (line 50) — it mounts/unmounts, no CSS transition
- The outer container is `className="fixed inset-0 z-50 flex items-center justify-center"` — static positioning, no `transition-*` or `animate-*` classes (line 53)
- The backdrop is `className="absolute inset-0 bg-obsidian-deepest/80 backdrop-blur-sm"` — no transition (line 56)
- The modal panel is `className="relative w-[900px] h-[640px] ..."` — no transition (line 62)
- No `useReducedMotion()` import or reference anywhere in the file

**Conclusion:** HelpModal opens and closes instantly via mount/unmount. There is no animation to guard. D-03 is a verification task, not an implementation task. Research confirms: no `useReducedMotion` guard needed. Document this finding in the task so the developer does not waste time looking for an animation.

---

## D-04: Inert-When-Input Audit (? handler site)

**Finding: The existing guard already covers all required cases. D-04 is a verification + one fix.**

App.tsx lines 134–138:
```typescript
if (
  e.target instanceof HTMLInputElement ||
  e.target instanceof HTMLTextAreaElement ||
  e.target instanceof HTMLSelectElement
) return;
```

This guard runs at line 133, **before** the `?` handler at line 141. So pressing `?` while focused in an `<input>`, `<textarea>`, or `<select>` is already inert.

Phase 35 Research §4 (line 367–374 of 35-RESEARCH.md) confirms this guard covers all editable surfaces in the app: `InlineEditableText` (renders `<input>`), PropertiesPanel inputs, RoomSettings, AddRoomDialog, TemplatePickerDialog.

**The one gap:** `contenteditable` elements. None exist in the current component tree — confirmed by the Phase 35 research (which explicitly lists all editable surfaces and found none are `contenteditable`). No action needed.

**The actual D-04 task:** Verify the behavior in the e2e spec (scenario 4: focus an input, press `?`, assert modal does NOT open). The guard exists; the test confirms it.

**Bonus fix needed:** `openHelp()` at line 142 currently calls `openHelp()` with no argument, so pressing `?` opens the modal to whatever section was last active, not necessarily "shortcuts." Fix: change to `openHelp("shortcuts")` so `?` always lands on the shortcuts section. This is a one-line change co-located with D-04.

---

## e2e Spec Design (D-05)

### Setup pattern

Mirror `e2e/display-mode-cycle.spec.ts` and `e2e/wall-user-texture-first-apply.spec.ts`:

```typescript
// e2e/keyboard-shortcuts-overlay.spec.ts
import { test, expect, type Page } from "@playwright/test";

const SNAPSHOT = { /* minimal snapshot with one wall, same shape as Phase 47/49 */ };

async function seedScene(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try { localStorage.setItem("room-cad-onboarding-completed", "1"); } catch {}
  });
  await page.goto("/");
  await page.evaluate(async (snap) => {
    (window as any).__cadStore.getState().loadSnapshot(snap);
  }, SNAPSHOT);
  // Wait for canvas to render
  await page.getByTestId("view-mode-2d").waitFor();
}
```

### Test scenarios

```typescript
test("? opens help modal to shortcuts section", async ({ page }) => {
  await seedScene(page);
  await page.keyboard.press("?");
  // Assert modal is visible — check for the shortcuts section heading
  await expect(page.getByText("Keyboard Shortcuts")).toBeVisible();
  // Assert shortcuts section nav button is active
  // (HelpModal renders nav buttons with active class; check aria or data attr)
});

test("Escape closes the modal", async ({ page }) => {
  await seedScene(page);
  await page.keyboard.press("?");
  await expect(page.getByText("Keyboard Shortcuts")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Keyboard Shortcuts")).not.toBeVisible();
});

test("backdrop click closes the modal", async ({ page }) => {
  await seedScene(page);
  await page.keyboard.press("?");
  await expect(page.getByText("Keyboard Shortcuts")).toBeVisible();
  // Click the backdrop (fixed inset-0 div behind the modal panel)
  await page.mouse.click(10, 10); // far corner, outside modal panel
  await expect(page.getByText("Keyboard Shortcuts")).not.toBeVisible();
});

test("? is inert when a text input has focus", async ({ page }) => {
  await seedScene(page);
  // Focus an input — PropertiesPanel room name or RoomSettings width
  // The sidebar's ROOM CONFIG section has a width input (RoomSettings.tsx)
  const input = page.locator('input[type="number"]').first();
  await input.focus();
  await page.keyboard.press("?");
  // Modal should NOT open
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("reduced-motion: modal opens instantly (no animation delay)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedScene(page);
  const t0 = Date.now();
  await page.keyboard.press("?");
  await expect(page.getByText("Keyboard Shortcuts")).toBeVisible();
  const elapsed = Date.now() - t0;
  // HelpModal has no animation — should be immediate (<100ms)
  expect(elapsed).toBeLessThan(100);
});
```

### Playwright native keyboard — sufficient

`page.keyboard.press("?")` is sufficient. No `__driveKeyPress` window driver needed — Playwright dispatches real KeyboardEvent to the document. This is simpler than Phase 35's `window.__requestPreset` driver approach, which was needed because preset tweens are async Three.js operations. Here the modal state change is synchronous React state.

**Fixture for inert test:** The RoomSettings panel has `<input type="number">` fields (width, length, height). These are always rendered in the sidebar when the canvas is active. Use `.locator('input[type="number"]').first()` — reliable without adding test-only `data-testid`.

**No visual goldens** — per `feedback_playwright_goldens_ci.md`, no `toHaveScreenshot`. All assertions are DOM/attribute-based.

---

## Standard Stack

No new dependencies required. Everything needed is already in the project:

| File | Existing? | Phase 52 Change |
|------|-----------|-----------------|
| `src/lib/shortcuts.ts` | No | CREATE — registry file |
| `src/App.tsx` | Yes | Refactor keyboard handler + fix `openHelp("shortcuts")` |
| `src/components/help/helpContent.tsx` | Yes | Replace local `SHORTCUTS` + `Shortcut` type with registry imports |
| `src/components/help/helpIndex.ts` | Yes | Update import if SHORTCUTS renamed |
| `e2e/keyboard-shortcuts-overlay.spec.ts` | No | CREATE |
| `tests/lib/shortcuts.registry.test.ts` | No | CREATE |

---

## Architecture Patterns

### Registry file structure

```
src/lib/shortcuts.ts
  export type ShortcutDisplay        // { keys, action, group, context }
  export type ShortcutContext        // { viewMode, setTool, getActiveRoomDoc }
  export const SHORTCUT_DISPLAY_LIST // static array for help overlay + search
  export function buildRegistry(ctx: ShortcutContext): Shortcut[] // factory for App.tsx
```

### App.tsx handler refactor pattern

Current: one monolithic `if/else` chain.
After: iterate over `registry = buildRegistry(ctx)`, call `entry.match(e)` and `entry.handler()`.

```typescript
const registry = useMemo(() => buildRegistry({ viewMode, setTool, getActiveRoomDoc }), [viewMode, setTool]);

useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    // Special case: Escape closes help regardless of focus (line 128-131 today)
    if (e.key === "Escape" && useUIStore.getState().showHelp) {
      useUIStore.getState().closeHelp();
      e.preventDefault();
      return;
    }
    // Active-element guard (lines 134-138 today)
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) return;
    // Registry-driven dispatch
    for (const entry of registry) {
      if (entry.match(e)) {
        e.preventDefault();
        entry.handler();
        return;
      }
    }
  };
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}, [registry]);
```

Note: Escape / help-open logic needs care. The current handler lets `?` work even when `showHelp` is true (it just re-opens help). With the registry approach, the "help is open, suppress all other shortcuts" guard at line 148 should still run between the Escape check and the registry loop. Keep that guard or encode it in the Camera Preset / tool predicates.

### HelpContent migration

```typescript
// src/components/help/helpContent.tsx — after
import { SHORTCUT_DISPLAY_LIST } from "@/lib/shortcuts";
export const SHORTCUTS = SHORTCUT_DISPLAY_LIST;  // alias for backwards compat
// Remove local Shortcut interface — import ShortcutDisplay from @/lib/shortcuts
```

---

## Common Pitfalls

### Pitfall 1: Tool shortcuts conflict with Ctrl+C / Ctrl+V

The bare `c` key activates the Ceiling tool; `Ctrl/Cmd+C` copies. The current handler at lines 150–154 (`shortcuts[e.key.toLowerCase()]`) fires on any `c` press, but copy/paste branches (lines 181, 199) check for `ctrlKey || metaKey` first and `return` early. With a registry loop, the iteration order and early-return semantics must replicate this. Ensure Copy/Paste entries appear earlier in the registry than the Ceiling tool entry, OR give them higher-priority match predicates that check modifiers first.

**Prevention:** Place modifier-keyed shortcuts before bare-key shortcuts in `SHORTCUT_DISPLAY_LIST`. The `buildRegistry` factory should output them in priority order.

### Pitfall 2: `viewMode` closure in registry

`buildRegistry` is called inside `useMemo([viewMode])`. If `viewMode` changes during a keypress (theoretically impossible in one event loop tick), the registry could be stale. This is the same guarantee as today (the `useEffect([..., viewMode])` dep array). No new risk.

### Pitfall 3: `openHelp()` with no section arg

Current line 142 calls `openHelp()` with no arg. `uiStore.ts:190` shows `section ?? s.activeHelpSection` — so the section stays whatever it was last. If the user navigated to "getting-started" before pressing `?`, the modal opens to getting-started, not shortcuts. Fix: `openHelp("shortcuts")`.

### Pitfall 4: Registry `Shortcut` type vs display `ShortcutDisplay` type

`helpContent.tsx` and `helpIndex.ts` consume shape `{ keys, action, group, context }`. The registry's full `Shortcut` type adds `match` and `handler`. Ensure `SHORTCUT_DISPLAY_LIST` is typed as `ShortcutDisplay[]` (the subset shape), not `Shortcut[]`, so consumers don't accidentally depend on `match`/`handler` being present.

---

## Task Breakdown Estimate

**1 plan, 4 tasks.** Matches CONTEXT.md estimate.

| Task | Description | Files touched | Size |
|------|-------------|---------------|------|
| T1: Registry file | Create `src/lib/shortcuts.ts` with `ShortcutDisplay`, `SHORTCUT_DISPLAY_LIST` (all 26 entries incl. 7 missing), `buildRegistry()` factory | `shortcuts.ts` (new) | S |
| T2: App.tsx refactor | Refactor keyboard handler to use `buildRegistry()`; fix `openHelp("shortcuts")`; remove inline handler branches | `App.tsx` | M |
| T3: helpContent + helpIndex migration | Replace local `Shortcut` type and `SHORTCUTS` array with imports from registry; verify search index entries match new count | `helpContent.tsx`, `helpIndex.ts` | S |
| T4: Tests | Create `tests/lib/shortcuts.registry.test.ts` (coverage-gate) + `e2e/keyboard-shortcuts-overlay.spec.ts` (5 scenarios) | 2 new files | M |

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. All changes are TypeScript source file edits + test files. Vitest and Playwright are already installed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + Playwright (e2e) |
| Config file | `vite.config.ts` (vitest inline) + `playwright.config.ts` |
| Quick run command | `npx vitest run tests/lib/shortcuts.registry.test.ts` |
| Full suite command | `npx vitest run && npx playwright test e2e/keyboard-shortcuts-overlay.spec.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOTKEY-01 | Registry covers all handler branches | unit | `npx vitest run tests/lib/shortcuts.registry.test.ts` | ❌ Wave 0 |
| HOTKEY-01 | `?` opens shortcuts section | e2e | `npx playwright test e2e/keyboard-shortcuts-overlay.spec.ts -k "opens"` | ❌ Wave 0 |
| HOTKEY-01 | Escape closes modal | e2e | `npx playwright test e2e/keyboard-shortcuts-overlay.spec.ts -k "Escape"` | ❌ Wave 0 |
| HOTKEY-01 | Backdrop click closes | e2e | `npx playwright test e2e/keyboard-shortcuts-overlay.spec.ts -k "backdrop"` | ❌ Wave 0 |
| HOTKEY-01 | Inert when input focused | e2e | `npx playwright test e2e/keyboard-shortcuts-overlay.spec.ts -k "inert"` | ❌ Wave 0 |
| HOTKEY-01 | No animation delay (reduced-motion) | e2e | `npx playwright test e2e/keyboard-shortcuts-overlay.spec.ts -k "reduced"` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `tests/lib/shortcuts.registry.test.ts` — registry coverage gate (HOTKEY-01)
- [ ] `e2e/keyboard-shortcuts-overlay.spec.ts` — 5 overlay scenarios (HOTKEY-01)

---

## Open Questions

1. **`?` section routing** — Confirmed open, confirmed fix: `openHelp("shortcuts")` at App.tsx:142. No decision needed; implement in T2.

2. **Registry iteration order** — Bare `v`/`c`/`w`/`d`/`n` tool shortcuts fire for ANY press of that key. Ctrl+C copy shortcut must match first. In `buildRegistry`, return modifier-gated entries before bare-key entries. Document this invariant in a comment in `shortcuts.ts`.

3. **Delete/Backspace — how wired?** — Listed in `SHORTCUTS` but not visible in the App.tsx excerpt (lines 124–265). Likely handled in `selectTool.ts` via `document.addEventListener("keydown")`. They should remain in the registry for display purposes with `context: "Select tool active"`.

---

## Sources

### Primary (HIGH confidence)

- `src/App.tsx:124–265` — direct read, complete keyboard handler
- `src/components/help/helpContent.tsx:1–42` — direct read, SHORTCUTS array
- `src/components/help/helpIndex.ts:179–190` — direct read, consumer pattern
- `src/components/HelpModal.tsx:1–169` — direct read, no animation found
- `src/stores/uiStore.ts:190–193` — direct read, openHelp signature
- `src/hooks/useReducedMotion.ts` — direct read, hook pattern
- `src/three/cameraPresets.ts:56–61` — direct read, PRESETS array
- `.planning/phases/35-camera-presets/35-RESEARCH.md:367–374` — activeElement coverage check
- `e2e/display-mode-cycle.spec.ts` — Phase 47 e2e setup pattern
- `e2e/wall-user-texture-first-apply.spec.ts` — Phase 49 e2e setup pattern

### Secondary (MEDIUM confidence)

None needed — all findings grounded in direct file reads.

---

## Metadata

**Confidence breakdown:**
- Shortcut audit: HIGH — every branch confirmed by line-number citation in App.tsx
- Registry shape: HIGH — predicate approach confirmed as matching existing PRESETS pattern (App.tsx:170)
- Migration strategy: HIGH — both consumers read directly, no ambiguity
- Coverage test: HIGH — snapshot approach, no static analysis complexity
- D-03 animation audit: HIGH — HelpModal has no Tailwind transition classes or animation hooks
- D-04 guard audit: HIGH — App.tsx:133-138 runs before the ? handler at line 141

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (stable domain — no fast-moving deps)
