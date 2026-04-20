# Phase 29: Editable Dimension Labels — Research

**Researched:** 2026-04-20
**Domain:** Feet+inches parser + React overlay hardening
**Confidence:** HIGH

## Summary

Phase 29 hardens an already-working dim-label edit flow. The entire runtime (dblclick → overlay → `validateInput` → `resizeWallByLabel` → single `pushHistory`) is wired; only `validateInput` is strict-decimal. Research focused on the three open planning questions: (1) a regex grammar that cleanly covers D-02 without false accepts, (2) how to extend `EditableRow` (which is an **inline component inside `PropertiesPanel.tsx`**, not a separate file) without breaking the three existing call sites, (3) a test harness that mixes pure-unit coverage for the parser with RTL for the overlay.

**Primary recommendation:** Extend `validateInput` in place inside `src/canvas/dimensionEditor.ts` (keep the parser colocated with its primary caller; no separate `src/lib/feetInches.ts` file needed — exported symbol is enough for PropertiesPanel to import). Use a three-branch regex strategy (inches-only, feet-optional-inches, decimal-fallback) rather than one mega-regex. Hoist `EditableRow` out of `PropertiesPanel.tsx` into its own file only if the planner wants cleaner imports; otherwise add the optional `parser` prop in place.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** Harden existing, no rewrite. Keep `mouse:dblclick` handler, input overlay, `hitTestDimLabel` (24px), `computeLabelPx`, `resizeWallByLabel` (single `pushHistory`), `resizeWall` geometry helper.
- **D-02** Liberal parser grammar — accept `12'6"`, `12' 6"`, `12'-6"`, `12'`, `6"`, `12.5`, `12`, `12.5ft`, `12ft 6in`, `12 ft 6 in`.
- **D-02a** Reject ambiguous `12 6` (two bare numbers, no units). Whitespace inside valid forms is fine.
- **D-02b** Reject ≤0. Return `number | null` (decimal feet). Existing callers handle `null` as silent cancel.
- **D-02c** Pure function, unit-testable without DOM. Planner picks location.
- **D-03** Pre-fill with `formatFeet(currentLen)` (e.g. `12'-6"`), replacing `currentLen.toFixed(2)`.
- **D-03a** Select-all on focus.
- **D-04** Overlay width 64px → 96px. Fixed width, not auto-grow. Vertical sizing + styling unchanged.
- **D-05** PropertiesPanel LENGTH (and other dimension rows) accept the same grammar. Share parser.
- **D-05a** `EditableRow` gets optional `parser?: (raw: string) => number | null`. Default = current `parseFloat` path.
- **D-05b** Display (non-editing) formatter unchanged. Only input parse path changes.
- **D-06** Commit on blur (current). Escape cancels explicitly.
- **D-06a** Invalid commit = silent cancel (no toast).

### Claude's Discretion
- Parser location: inline in `dimensionEditor.ts` vs. new `src/lib/feetInches.ts`.
- Exact regex(es) used — as long as grammar is covered and each case unit-tested.
- Whether `EditableRow` gets optional prop vs. separate `EditableDimensionRow` wrapper.
- Visual polish for 96px overlay (padding, focus ring) — within existing token palette.

### Deferred Ideas (OUT OF SCOPE)
- Tab/arrow nav between multiple dim labels
- Hover tooltip "double-click to edit"
- Toast/shake on invalid input
- Drag-to-resize (Phase 31 / EDIT-22/23)
- Editing height/thickness via canvas labels
- Metric / unit toggles
- Auto-mitre regeneration beyond existing endpoint propagation
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDIT-20 | Double-click wall dim label → feet+inches input in place; Enter commits; Escape cancels; resizes from start along existing angle | Pivot-from-start already satisfied by `resizeWall` in `geometry.ts:228`. Overlay + dblclick already wired in `FabricCanvas.tsx:264-306`. Only the parser (accept feet+inches) and pre-fill format (D-03) are new. |
| EDIT-21 | Each edit = exactly one undo/redo entry | Already satisfied: `resizeWallByLabel` in `cadStore.ts:258` calls `pushHistory(s)` exactly once inside its `produce` block. Research task is test coverage (assert `past.length` delta = 1). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Obsidian CAD theme: `font-mono`, accent palette, `UPPERCASE_UNDERSCORE` labels. No new design tokens.
- Path alias: `@/*` → `./src/*` (use in imports + tests).
- Pure functions in `@/lib` or `@/canvas`; React state + effects in components.
- Zustand store is single source of truth; mutations wrapped in `produce` + `pushHistory` for one undo entry.
- TypeScript strict mode; target ES2020.
- GSD workflow: all file edits via a GSD command (we're inside `/gsd:plan-phase`).

## Standard Stack

### Already in repo (nothing new needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | (in deps) | Unit + RTL test runner | Already used by `tests/dimensionEditor.test.ts` + `Toolbar.saveStatus.test.tsx` |
| `@testing-library/react` | (in deps) | Overlay input test harness | Pattern proven by `Toolbar.saveStatus.test.tsx:2` |
| `zustand` + `immer` | 5.x / 11.x | Store mutations + `pushHistory` | `cadStore.resizeWallByLabel` already correct |

**No new packages.** This is a hardening phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled regex | `parse-feet-inches` npm lib | Not worth a dep — D-02 grammar is small, regex ~15 lines, avoids supply-chain risk |
| Separate `src/lib/feetInches.ts` | Inline export from `dimensionEditor.ts` | Inline keeps parser next to its primary caller + existing test file; one symbol import from PropertiesPanel is trivial |

## Architecture Patterns

### Recommended Parser Location
**Keep in `src/canvas/dimensionEditor.ts`.** Export `parseFeetInches(raw: string): number | null` as a sibling to `validateInput`, then make `validateInput` a thin wrapper (or rename — see discretion). PropertiesPanel imports from `@/canvas/dimensionEditor`.

Rationale: (a) test file already exists at `tests/dimensionEditor.test.ts`; (b) parser is primarily about dimension labels — that's its domain home; (c) avoids creating a new file for ~30 LOC.

### Parser Grammar — Three-Branch Regex Strategy

Rather than one mega-regex, use **ordered branches**. First branch that matches wins. Returns `null` if none match or result ≤ 0.

```typescript
// Source: designed for D-02/D-02a — covers all accepted forms, rejects `12 6`
const INCHES_ONLY = /^(\d+(?:\.\d+)?)\s*(?:"|in|inches?)$/i;
const FEET_INCHES = /^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)(?:\s*[-\s]?\s*(\d+(?:\.\d+)?)\s*(?:"|in|inches?)?)?$/i;
const DECIMAL_ONLY = /^(\d+(?:\.\d+)?)\s*(?:ft|feet)?$/i;

export function parseFeetInches(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // Branch 1: inches-only — `6"`, `6in`, `6 inches`, `6.5"`
  let m = s.match(INCHES_ONLY);
  if (m) {
    const inches = parseFloat(m[1]);
    const feet = inches / 12;
    return feet > 0 ? feet : null;
  }

  // Branch 2: feet with optional inches — `12'`, `12'6"`, `12' 6"`, `12'-6"`, `12ft 6in`
  m = s.match(FEET_INCHES);
  if (m) {
    const ft = parseFloat(m[1]);
    const inPart = m[2] ? parseFloat(m[2]) : 0;
    const total = ft + inPart / 12;
    return total > 0 ? total : null;
  }

  // Branch 3: bare decimal feet (back-compat) — `12`, `12.5`, `12.5ft`
  m = s.match(DECIMAL_ONLY);
  if (m) {
    const ft = parseFloat(m[1]);
    return ft > 0 ? ft : null;
  }

  return null; // rejects `12 6`, `abc`, `-5`, etc.
}
```

**Why this works:**
- `12 6` → no `'`/`ft`/`"`/`in` → fails INCHES_ONLY, FEET_INCHES, DECIMAL_ONLY (`\d+\s+\d+` doesn't match `^\d+(\.\d+)?\s*(ft|feet)?$`). ✅ Rejects.
- `12'-6"` → hyphen consumed by `[-\s]?` separator, not interpreted as sign. ✅ Accepts as 12.5 ft.
- `-5` → leading `-` fails all three anchors (which require `\d`). ✅ Rejects.
- `0` / `0'0"` → passes regex but fails `> 0` check. ✅ Rejects.

### Integration Plan for `EditableRow`

`EditableRow` lives **inline inside `PropertiesPanel.tsx`** (lines 229-282), not in its own file. Three call sites in the same file: LENGTH (line 112), THICKNESS (119), HEIGHT (127).

**Minimal-diff approach (D-05/D-05a):**
```typescript
function EditableRow({
  label, value, suffix, onCommit,
  min = 0, step = 0.25,
  parser,  // NEW — optional
  initialFormat,  // NEW optional — replaces `value.toFixed(2)` seed
}: {
  // ...existing props...
  parser?: (raw: string) => number | null;
  initialFormat?: (v: number) => string;
}) {
  // startEdit: use initialFormat?.(value) ?? value.toFixed(2)
  // commit: const v = parser ? parser(draft) : parseFloat(draft);
  //         if (v !== null && !isNaN(v) && v >= min && v !== value) onCommit(v);
}
```

LENGTH call site opts in:
```typescript
<EditableRow label="LENGTH" value={wallLength(wall)} suffix="FT"
  onCommit={(v) => resizeWallByLabel(wall.id, v)}
  min={0.5}
  parser={parseFeetInches}
  initialFormat={formatFeet} />
```

THICKNESS/HEIGHT untouched (no parser prop → falls back to `parseFloat` default). **Zero breakage risk for existing rows.** Hoisting `EditableRow` to its own file is optional polish, not required.

### Pre-fill + Select-All (D-03/D-03a)
In `FabricCanvas.tsx:278`:
```typescript
// Before: setPendingValue(currentLen.toFixed(2));
setPendingValue(formatFeet(currentLen));
```
Add to overlay `<input>` at line 494:
```typescript
onFocus={(e) => e.currentTarget.select()}
```
`autoFocus` fires before `onFocus`, so ordering is fine — browsers guarantee `onFocus` runs after the element has focus.

### Overlay Width (D-04)
One-line diff in `overlayStyle` at `FabricCanvas.tsx:446-449`:
```typescript
left: label.x - 48,  // was -32 (half of 64)
top: label.y - 10,
width: 96,           // was 64
height: 20,
```
Keep `left` centered on label by updating to `-48`.

### Anti-Patterns to Avoid
- **Don't `eval` or `Function()` the input** — no expression evaluation, only structured parse.
- **Don't accept negative inches** (`12' -6"`) — regex separator is `[-\s]?` with no sign on the inch capture. A stray `-` before the inch number will fall through to `null`.
- **Don't mutate state in the parser** — pure function, no side effects.
- **Don't change `resizeWallByLabel`** — EDIT-21 is already satisfied; a second `pushHistory` would break single-undo.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Length display ("12.5 ft" → "12'-6\"") | Custom formatter | `formatFeet` in `geometry.ts:191` | Already canonical — D-03 seed uses it |
| Wall resize geometry | Custom vector math | `resizeWall` in `geometry.ts:228` | Already pivots from start along unit vector — EDIT-20 requirement |
| Undo entry | Custom snapshot | `resizeWallByLabel` already wraps in `produce` + `pushHistory` once | EDIT-21 already satisfied |
| Hit test for label | Custom bbox | `hitTestDimLabel` (24px radius) in `dimensionEditor.ts:30` | Tested, tuned, done |

**Key insight:** The only thing Phase 29 "builds" is the parser. Everything else is reuse + tiny wiring edits.

## Runtime State Inventory

Not applicable — Phase 29 is code-only, no rename/refactor/migration. No stored data, no live service config, no OS-registered state, no secrets, no build artifacts at risk.

## Common Pitfalls

### Pitfall 1: Regex greediness swallowing the inch marker
**What goes wrong:** `/^(\d+\.?\d*)'(\d+)?"?$/` on `12'6"` — the trailing `"?` is optional, so `12'6` also accepts, which isn't in the D-02 grammar.
**How to avoid:** Make inch marker **required when an inch number is present**. The FEET_INCHES regex above anchors `[-\s]?\s*(\d+(?:\.\d+)?)\s*(?:"|in|inches?)?` — but we can tighten by requiring `"|in|inches` after the inch number. Tradeoff: `12'6` becomes invalid. Check tests to decide — current design leaves marker optional since `formatFeet` always emits `"`.
**Warning signs:** Test case `12'6` (no closing quote) — document whether accepted.

### Pitfall 2: `formatFeet` round-trip loses 0.5ft grid snap
**What goes wrong:** `formatFeet(12.5) → "12'-6\""`; `parse("12'-6\"") → 12.5`. ✅ Exact. But `formatFeet(12.4) → "12'-5\""` (rounds inches), and `parse("12'-5\"") → 12.4166…`. If user opens the input, doesn't edit, hits Enter → commit fires with a slightly different value.
**How to avoid:** `EditableRow.commit` already has `v !== value` guard — but with float drift `12.4 !== 12.4166…` is true, so it would commit the rounded value. **Recommendation:** tighten commit guard to `Math.abs(v - value) > 1e-6` OR accept that open-close-commit snaps to label-displayed value (which is arguably correct — "what you see is what you get"). Flag for planner decision.
**Warning signs:** Undo history grows on pure focus-blur with no edit.

### Pitfall 3: `onFocus={() => select()}` fires before input has content
**What goes wrong:** If `onFocus` fires before React commits the `value` prop, `select()` selects empty text.
**How to avoid:** React controlled `<input value={pendingValue}>` has content set synchronously before focus events fire in practice. RTL test should verify: open overlay, assert selection range covers full prefilled value.

### Pitfall 4: Blur commits on Escape path
**What goes wrong:** Escape sets `editingWallId = null` which unmounts the overlay, which fires `onBlur` in some browsers. If `commitEdit` doesn't short-circuit on cleared state, you commit after cancel.
**How to avoid:** Check existing `commitEdit` in `FabricCanvas.tsx:475` — it early-returns if `!editingWallId`. `cancelEdit` clears `editingWallId` first. ✅ Already safe. Add a regression test.

### Pitfall 5: Ambiguous `12.5` in D-02c unit-test without DOM
**What goes wrong:** Parser tested outside a DOM context — no jsdom needed for the parser itself. Good. But RTL tests for the overlay need jsdom.
**How to avoid:** Vitest config already has jsdom (Toolbar test uses `render`). No new config.

## Code Examples

### Parser tests (extend `tests/dimensionEditor.test.ts`)
```typescript
// Source: D-02/D-02a — one case per accepted form + one per explicit reject
describe("parseFeetInches / validateInput (D-02)", () => {
  it.each([
    ["12'6\"",   12.5],
    ["12' 6\"",  12.5],
    ["12'-6\"",  12.5],
    ["12'",      12],
    ["6\"",      0.5],
    ["12.5",     12.5],
    ["12",       12],
    ["12.5ft",   12.5],
    ["12ft 6in", 12.5],
    ["12 ft 6 in", 12.5],
    ["3'0\"",    3],
  ])("accepts %s → %s ft", (input, expected) => {
    expect(parseFeetInches(input)).toBeCloseTo(expected, 5);
  });

  it.each(["12 6", "abc", "-5", "0", "0'0\"", "", "   ", "'6\""])(
    "rejects %s",
    (input) => expect(parseFeetInches(input)).toBeNull()
  );

  it.each([0.5, 1, 2.5, 12, 12.5, 20])("round-trips formatFeet(%s)", (x) => {
    expect(parseFeetInches(formatFeet(x))).toBeCloseTo(x, 5);
  });
});
```

### Overlay RTL test (new file: `tests/dimensionOverlay.test.tsx`)
```typescript
// Source: follows tests/Toolbar.saveStatus.test.tsx pattern
import { render, screen, fireEvent } from "@testing-library/react";
import { useCADStore } from "@/stores/cadStore";
import FabricCanvas from "@/canvas/FabricCanvas";

// Seed a wall in the store; render FabricCanvas; simulate dblclick at label position.
// Easier: test commitEdit behavior via data-testid="dimension-edit-input":
//   1. programmatically set editingWallId via store/component test harness
//   2. assert input is present with prefilled `12'-6"`
//   3. fireEvent.change + fireEvent.keyDown Enter
//   4. assert useCADStore.getState().<activeRoom>.walls[id].end reflects new length
//   5. assert past.length increased by exactly 1 (EDIT-21)
```

### PropertiesPanel row test
```typescript
// Verify parser prop integration — typing "12'6\"" commits 12.5
it("LENGTH row accepts feet+inches via parser prop", () => {
  // seed wall of length 10 in store, render PropertiesPanel
  // click LENGTH value → input appears with "10'"
  // clear, type "12'6\"", press Enter
  // assert wallLength reads 12.5
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `parseFloat` only | Regex-based liberal parser | Phase 29 (this) | User can type in the same notation she reads |
| Seed input with `12.50` | Seed with `12'-6"` | Phase 29 (this) | Round-trip obvious; select-all enables replace-in-one-keystroke |
| 64px overlay | 96px overlay | Phase 29 (this) | Fits `12'-11"` without wrap |

No deprecated libs involved. Tailwind v4 theme tokens stay as-is.

## Open Questions

1. **Should `12'6` (no closing quote on inches) be accepted?**
   - What we know: `formatFeet` always emits `"`; users reading off labels will always see the quote.
   - What's unclear: Does Jessica sometimes type without closing the quote (shift-2 on a laptop)?
   - Recommendation: **Accept it.** Liberal parser philosophy (D-02). Document in test as accepted edge case. Inch marker regex makes `"|in|inches?` optional inside FEET_INCHES — already handled by proposed regex.

2. **No-op commit (open → blur without edit) creates a 1e-6 drift undo entry — fix or accept?**
   - What we know: `formatFeet` rounds inches; parsing its output back drifts ≤ 1/24 ft.
   - What's unclear: User impact — is an empty undo entry ever observable?
   - Recommendation: Tighten `EditableRow.commit` guard to `Math.abs(v - value) > 1e-6`. Cheap insurance. Add test.

3. **Should `EditableRow` be hoisted to its own file during this phase?**
   - Recommendation: **No.** Three call sites in one file; hoisting is orthogonal to the parser work. Defer to a future refactor phase if ever needed.

## Environment Availability

Skipped — no external dependencies. Pure in-repo TypeScript + existing test runner.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (already in deps) + @testing-library/react for RTL |
| Config file | Inherits from existing `vitest.config.*` / `vite.config.ts` (jsdom env used by Toolbar test) |
| Quick run command | `npx vitest run tests/dimensionEditor.test.ts tests/dimensionOverlay.test.tsx tests/PropertiesPanel.length.test.tsx` |
| Full suite command | `npx vitest run` |
| Phase gate | Full suite green before `/gsd:verify-work` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDIT-20 | Parser accepts every form in D-02 | unit | `npx vitest run tests/dimensionEditor.test.ts -t "accepts"` | ✅ extend |
| EDIT-20 | Parser rejects every form in D-02a + ≤0 | unit | `npx vitest run tests/dimensionEditor.test.ts -t "rejects"` | ✅ extend |
| EDIT-20 | `formatFeet` round-trip stable for grid-snap values | unit | `npx vitest run tests/dimensionEditor.test.ts -t "round-trips"` | ✅ extend |
| EDIT-20 | Dblclick label → overlay renders prefilled with `formatFeet(current)` | RTL | `npx vitest run tests/dimensionOverlay.test.tsx -t "prefill"` | ❌ Wave 0 |
| EDIT-20 | Overlay input select-all on focus (D-03a) | RTL | `npx vitest run tests/dimensionOverlay.test.tsx -t "select-all"` | ❌ Wave 0 |
| EDIT-20 | Enter with `12'6"` commits 12.5 to store via `resizeWallByLabel` | RTL + store | `npx vitest run tests/dimensionOverlay.test.tsx -t "commits feet-inches"` | ❌ Wave 0 |
| EDIT-20 | Escape cancels without commit (no store mutation) | RTL + store | `npx vitest run tests/dimensionOverlay.test.tsx -t "escape cancels"` | ❌ Wave 0 |
| EDIT-20 | Blur commits (D-06) | RTL + store | `npx vitest run tests/dimensionOverlay.test.tsx -t "blur commits"` | ❌ Wave 0 |
| EDIT-20 | Overlay width = 96px (D-04) | RTL (computed style) | `npx vitest run tests/dimensionOverlay.test.tsx -t "width 96"` | ❌ Wave 0 |
| EDIT-20 | PropertiesPanel LENGTH accepts `12'6"` via parser prop (D-05) | RTL + store | `npx vitest run tests/PropertiesPanel.length.test.tsx -t "feet-inches"` | ❌ Wave 0 |
| EDIT-20 | PropertiesPanel THICKNESS still uses decimal parser (regression) | RTL + store | `npx vitest run tests/PropertiesPanel.length.test.tsx -t "thickness decimal"` | ❌ Wave 0 |
| EDIT-21 | One edit = exactly one `past` entry | unit (store) | `npx vitest run tests/cadStore.resizeWallByLabel.test.ts -t "single undo"` | ❌ Wave 0 |
| EDIT-21 | Undo reverts dim-label edit to prior length | unit (store) | same file, `-t "undo reverts"` | ❌ Wave 0 |
| — | Pure parser function works with no DOM | unit | `npx vitest run tests/dimensionEditor.test.ts` | ✅ |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/dimensionEditor.test.ts tests/dimensionOverlay.test.tsx tests/PropertiesPanel.length.test.tsx tests/cadStore.resizeWallByLabel.test.ts`
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green + manual smoke (dblclick a label, type `12'6"`, Enter, Ctrl+Z)

### Automated vs. Manual
- **Automated:** parser grammar coverage, overlay prefill/commit/cancel, store undo entry count, PropertiesPanel parser prop integration, width style assertion.
- **Manual-only:** visual polish (focus ring, 96px fit of `12'-11"` without wrap), real double-click latency, actual browser blur semantics with OrbitControls competing for focus. These are covered by a one-minute smoke in `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `tests/dimensionOverlay.test.tsx` — new; mirrors `Toolbar.saveStatus.test.tsx` pattern for render + fireEvent
- [ ] `tests/PropertiesPanel.length.test.tsx` — new; covers D-05/D-05a
- [ ] `tests/cadStore.resizeWallByLabel.test.ts` — new; EDIT-21 single-undo assertion + undo revert
- [ ] (Optional) shared helper `tests/helpers/seedWall.ts` — creates a store with one wall, used by three new test files

## Sources

### Primary (HIGH confidence)
- `src/canvas/dimensionEditor.ts` (lines 1-49) — existing `validateInput` signature + sibling helpers
- `src/canvas/FabricCanvas.tsx` (lines 260-307, 433-508) — dblclick handler, overlay style, commit/cancel
- `src/stores/cadStore.ts` (lines 258-282) — `resizeWallByLabel` already single-`pushHistory`
- `src/lib/geometry.ts` (lines 191-237) — `formatFeet`, `resizeWall` canonical implementations
- `src/components/PropertiesPanel.tsx` (lines 112-282) — `EditableRow` inline component, three call sites
- `tests/dimensionEditor.test.ts` — existing test structure to extend
- `tests/Toolbar.saveStatus.test.tsx` — proven RTL + vitest + zustand pattern
- `.planning/REQUIREMENTS.md` §EDIT-20/EDIT-21 — phase-owned requirements
- `.planning/phases/29-editable-dim-labels/29-CONTEXT.md` — locked decisions D-01..D-06a

### Secondary (MEDIUM confidence)
- Vitest `it.each` table pattern — standard idiom, well-documented

### Tertiary (LOW confidence)
- None — no external research required; entire phase is local code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all libs already in package.json
- Architecture: HIGH — existing structure fully understood, three one-line diffs + one new exported function
- Pitfalls: MEDIUM — Pitfall #2 (float-drift no-op undo) is hypothesis-level; planner should decide
- Test plan: HIGH — pattern precedent in `Toolbar.saveStatus.test.tsx`

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — stable in-repo scope)
