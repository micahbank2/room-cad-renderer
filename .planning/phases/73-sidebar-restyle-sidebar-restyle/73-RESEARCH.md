# Phase 73: Sidebar Restyle — Research

**Researched:** 2026-05-07
**Domain:** React component restyle — spine/branch tree geometry, contextual panel mounting, spring animation
**Confidence:** HIGH (all findings from direct source inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- D-01: Vertical spine: `absolute top-0 bottom-0 left-[21px] w-px bg-border/50` per Pascal audit verbatim
- D-02: Horizontal branch per row: `absolute top-1/2 left-[21px] h-px w-[11px] bg-border/50` (spans 21px–32px)
- D-03: Depth indentation: `pl-8` (32px) for all depths; spine+branch carry hierarchy
- D-04: Row hover: `hover:bg-accent/30`; active/selected: `bg-accent/20 text-accent-foreground`; active room: `bg-accent text-accent-foreground`
- D-05: Phase 46 double-click focus + Phase 47 eye-icon visibility preserved exactly
- D-06: PropertiesPanel mounts only when `selectedIds.length > 0` — conditioned in App.tsx
- D-07: Click empty canvas already calls `clearSelection()` in selectTool — no new clearing logic needed
- D-08: AnimatePresence wrapper in App.tsx; PropertiesPanel in `motion.div` with `initial={{ x: 288, opacity: 0 }}` → `animate={{ x: 0, opacity: 1 }}` → `exit={{ x: 288, opacity: 0 }}` using SPRING_SNAPPY
- D-09: Right panel width: `w-72` (288px)
- D-10: Canvas `flex-1` fills freed space naturally
- D-11: Left sidebar stays always-visible
- D-12: Left sidebar width: `w-64` (256px)
- D-13: Sidebar.tsx local CollapsibleSection (lines ~24–44) replaced with PanelSection from `@/components/ui`
- D-14: No other structural changes to Sidebar.tsx content (Phase 75 scope)
- D-15: Saved-camera UI stays in rooms tree
- D-16: If PropertiesPanel un-mount/remount cycle introduced, any `__drive*` drivers registered inside PropertiesPanel effects must be moved to `src/test-utils/*Drivers.ts` with `installXDrivers()` pattern

### Claude's Discretion

- Exact left sidebar internal padding / gap values (match Phase 71/72 token scale: `p-2`, `gap-2`, `p-4`)
- Whether to use `layout` prop on motion.div for canvas resize (try without first)
- TreeRow icon sizing — keep existing `h-4 w-4` for ChevronRight, Eye, Camera icons

### Deferred Ideas (OUT OF SCOPE)

- Sidebar tab strip (Phase 75 or 76)
- Right panel tab strip (Phase 75)
- Left sidebar resize handle (v1.19)
- Toolbar rework (Phase 74), ProductLibrary/MaterialPicker restyle (Phase 75), Modals/WelcomeScreen (Phase 76)
</user_constraints>

---

## Summary

Phase 73 is a Chrome-only restyle of two surfaces: (1) the rooms tree left sidebar gets Pascal's spine-and-branches geometry, and (2) PropertiesPanel becomes contextual — it mounts only when `selectedIds.length > 0` and spring-animates in from the right.

The key technical risk is driver registration. PropertiesPanel currently registers two `__drive*` objects. One (`__driveLabelOverride`) is correctly registered inside a `useEffect` with a `return () => delete` cleanup — it will survive the new un-mount/remount cycle without changes. The other (`__driveRotationPreset`) is a **module-level `if (MODE === "test")` block** — it registers once at module parse time, never re-registers, and has no cleanup. Because it is not inside a `useEffect`, the unmount/remount cycle does not affect it. It is safe without migration.

TreeRow.tsx currently uses a `INDENT` constant (`pl-2`, `pl-4`, `pl-6`) for depth. All three classes are removed and replaced with a fixed `pl-8` plus two `absolute` div line elements. The row container also replaces `hover:bg-accent` and the `bg-secondary border-l-2 border-accent` selected state with D-04 tokens.

Sidebar.tsx has a local `CollapsibleSection` component (lines 24–44) that is a simple stateful `<div>` with a chevron. PanelSection is a drop-in replacement (same prop signature: `id, label, children, defaultOpen?`). The `id` prop is newly required — the Sidebar.tsx callers must supply one.

App.tsx mounts PropertiesPanel twice: line 258 (2D path, inside a relative div) and line 278 (3D-only path, inside a relative div). Both must be replaced with a single `AnimatePresence`-wrapped conditional. The canvas wrapper `div` is `flex-1` already, so it expands when the right panel unmounts without extra work.

**Primary recommendation:** No new state, no new store actions needed. All changes are class swaps and mount wiring.

---

## Standard Stack

All dependencies already installed. No npm additions required for this phase.

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `motion/react` | ^12.x (framer-motion) | AnimatePresence, motion.div, spring transitions | Installed Phase 72 |
| `src/lib/motion.ts` | — | SPRING_SNAPPY, springTransition(reduced) | Available |
| `src/components/ui/PanelSection.tsx` | — | Replaces Sidebar.tsx CollapsibleSection | Available Phase 72 |
| `src/hooks/useReducedMotion.ts` | — | D-39 guard for animations | Available Phase 33 |

---

## Architecture Patterns

### Pattern 1: Spine-and-Branch Tree Row

The Pascal pattern from the audit (verified):

```tsx
// Outer row: position:relative required for absolute children
<div className="relative flex items-center h-6 pr-2 pl-8 hover:bg-accent/30 rounded-smooth-md cursor-pointer">
  {/* Vertical spine — absolute, full row height */}
  <div className="absolute top-0 bottom-0 left-[21px] w-px bg-border/50" />
  {/* Horizontal branch — absolute, crosses spine to content */}
  <div className="absolute top-1/2 left-[21px] h-px w-[11px] bg-border/50" />
  {/* Row content starts at pl-8 (32px) */}
  ...
</div>
```

**Current row container class** (must change):
```tsx
// CURRENT (lines 68-76 of TreeRow.tsx)
const INDENT: Record<0 | 1 | 2, string> = { 0: "pl-2", 1: "pl-4", 2: "pl-6" };
// rowBase includes: INDENT[depth], "hover:bg-accent"
// selected state adds: "bg-secondary border-l-2 border-accent"
```

**Replacement:**
```tsx
// NEW — depth-agnostic; spine geometry carries the hierarchy
// Row container: always pl-8, add "relative" for absolute children
// hover: "hover:bg-accent/30" (was "hover:bg-accent")
// selected: "bg-accent/20 text-accent-foreground" (was "bg-secondary border-l-2 border-accent")
// active room: "bg-accent text-accent-foreground"
```

The depth indentation constant `INDENT` is deleted entirely. Add `"relative"` to rowBase. Both spine and branch divs render on every row — the vertical spine visually connects from parent to child rows by being full-height (`top-0 bottom-0`).

### Pattern 2: Contextual Right Panel with AnimatePresence

```tsx
// src/App.tsx — replaces lines 258 and 278
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { useUIStore } from "@/stores/uiStore";

// Inside the canvas div:
const selectedIds = useUIStore((s) => s.selectedIds);

<AnimatePresence>
  {selectedIds.length > 0 && (
    <motion.div
      key="properties-panel"
      className="w-72 shrink-0 overflow-y-auto bg-card"
      initial={{ x: 288, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 288, opacity: 0 }}
      transition={SPRING_SNAPPY}
    >
      <PropertiesPanel productLibrary={productLibrary} viewMode={viewMode} />
    </motion.div>
  )}
</AnimatePresence>
```

Important: The `key="properties-panel"` prop is required on the motion.div so AnimatePresence can track the element across viewMode changes.

### Pattern 3: PanelSection Drop-in

PanelSection props are identical to CollapsibleSection EXCEPT it requires an `id` string (used for localStorage persistence). Migration in Sidebar.tsx:

```tsx
// BEFORE:
<CollapsibleSection label="Room config">
// AFTER:
<PanelSection id="sidebar-room-config" label="Room config">
```

The storage key used by PanelSection is `"ui:propertiesPanel:sections"` (shared with PropertiesPanel usage). Sidebar sections need unique IDs like `"sidebar-room-config"`, `"sidebar-system-stats"`, `"sidebar-layers"`, `"sidebar-snap"`, `"sidebar-products"`.

### Anti-Patterns to Avoid

- **Do not add `relative` to child divs** — the row container itself needs `relative`, not the label span
- **Do not render spine/branch conditionally by depth** — always render both; the visual continuity across depths is intentional
- **Do not use `layout` prop initially** — try without first per Claude's Discretion; add only if canvas jump is visible during UAT
- **Do not pass `absolute` positioning to spine without `relative` on parent** — absolute children escape if parent lacks `relative`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Panel height animation | CSS height transitions | `AnimatePresence` + `motion.div` | Already used in PanelSection; consistent spring physics |
| Reduced motion | Manual `prefers-reduced-motion` media query | `useReducedMotion()` + `springTransition(reduced)` | Hook already exists, D-39 compliance |
| Panel slide | CSS `translate` transitions | `motion.div` with x initial/animate/exit | AnimatePresence handles exit animation; CSS can't |

---

## Driver Registration Audit (Critical for D-16)

Two `__drive*` objects live in PropertiesPanel.tsx. Both must be evaluated against the new unmount/remount cycle.

### `__driveLabelOverride` (line 718–748)
- **Pattern:** `useEffect` with `return () => delete` cleanup
- **Is it StrictMode-safe?** Yes — cleanup runs on unmount, re-registers on remount
- **Impact of new contextual mounting:** None. The `return () =>` cleanup already handles un-mount. PropertiesPanel unmounting when selection is cleared will fire the cleanup; remounting on next selection fires the registration. No migration needed.
- **Verdict: SAFE AS-IS**

### `__driveRotationPreset` (line 964–989)
- **Pattern:** Module-level `if (MODE === "test")` block — runs once at parse time, never inside a component lifecycle
- **Impact of new contextual mounting:** None. Module-level registrations are not affected by component mount/unmount cycles. The object is registered when the module is first imported regardless of whether the component is mounted.
- **Verdict: SAFE AS-IS — no migration needed**

**Conclusion:** D-16 does not require any driver migration for this phase. Both existing drivers survive the contextual mounting change.

---

## Exact Class Changes Required

### TreeRow.tsx

| Location | Current | New |
|----------|---------|-----|
| `INDENT` constant | `{ 0: "pl-2", 1: "pl-4", 2: "pl-6" }` | Delete entirely |
| `rowBase` array | includes `INDENT[depth]` | replace with `"pl-8"` + `"relative"` |
| `rowBase` hover | `"hover:bg-accent"` | `"hover:bg-accent/30"` |
| `rowBase` selected | `"bg-secondary border-l-2 border-accent"` | `"bg-accent/20 text-accent-foreground"` |
| Active room | No separate class (uses selected) | `"bg-accent text-accent-foreground"` when `isActiveRoom` |
| Row inner HTML | No spine/branch divs | Add two `<div className="absolute ...">` inside row div |

The chevron spacer `<span className="w-4 h-4">` at depth 2 (line 157) can be removed since all rows now use the same `pl-8` base — the spine geometry replaces the spacer role.

### App.tsx

- Line 258: Replace `<PropertiesPanel ... />` with AnimatePresence-wrapped conditional
- Line 278: Replace `<PropertiesPanel ... />` with same AnimatePresence-wrapped conditional (or consolidate both into one)
- Add `selectedIds` subscription from `useUIStore`
- Import `AnimatePresence`, `motion` from `"motion/react"` and `SPRING_SNAPPY` from `"@/lib/motion"`

### Sidebar.tsx

- Delete `CollapsibleSection` function (lines 20–46)
- Import `PanelSection` from `"@/components/ui"`
- Replace each `<CollapsibleSection label="...">` with `<PanelSection id="sidebar-..." label="...">`

---

## Common Pitfalls

### Pitfall 1: Spine Overflow at Row Boundaries
**What goes wrong:** Vertical spine `top-0 bottom-0` on each row creates gaps between rows because each row is a separate element. The spine appears as disconnected segments.
**Why it happens:** `absolute top-0 bottom-0` clips to the row's own box.
**How to avoid:** The row container should have no vertical padding above/below — confirmed current rows are `h-6` with no py classes. As long as rows stack with no gap, the segments visually merge. Avoid any `gap-y` on the list container.
**Warning signs:** Visible gaps between the spine of one row and the next during dev.

### Pitfall 2: AnimatePresence key Collision Across viewMode
**What goes wrong:** When viewMode changes from "2d" to "3d", if both views mount PropertiesPanel without a stable key, AnimatePresence cannot track the element and exit animation fires on every mode switch even when something is selected.
**Why it happens:** AnimatePresence uses key identity to match enter/exit; two PropertiesPanel instances with different keys both animate.
**How to avoid:** Use a single `AnimatePresence` outside the viewMode branches, or ensure both branches share the same `key="properties-panel"` on the motion.div.

### Pitfall 3: Typography Test Regression in Sidebar.tsx
**What goes wrong:** `tests/phase33/typography.test.ts` checks that Sidebar.tsx contains the literal string `"Room config"` (among others). Removing CollapsibleSection and migrating to PanelSection must preserve these label strings.
**How to avoid:** Keep `label="Room config"` on the PanelSection — the test reads the source file as a string. Confirmed the test assertion: `/["'`](?:Room config|Properties|Library|Project)["'`]/`.

### Pitfall 4: Spacing Audit Test in Sidebar.tsx
**What goes wrong:** `tests/phase33/spacingAudit.test.ts` checks that Sidebar.tsx has zero `p-[Npx]` / `m-[Npx]` / `rounded-[Npx]` / `gap-[Npx]` arbitrary values. Adding spine divs with `left-[21px]` is fine (not in the blocked pattern list). The regex blocks only `p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|gap|rounded` with `[Npx]`.
**How to avoid:** `left-[21px]` and `w-[11px]` in TreeRow.tsx do NOT appear in the Sidebar.tsx audit (different file). Confirmed the test targets only 4 specific files.

### Pitfall 5: Canvas Width Jump Without motion.layout
**What goes wrong:** When PropertiesPanel unmounts, canvas `flex-1` snaps to fill the freed space instantly (no animation). Can look jarring.
**Why it happens:** Only the panel has the spring transition; the canvas layout change is instant.
**How to avoid:** Per Claude's Discretion — try without `layout` prop first. If visible jump during UAT, add `layout` to the canvas div's parent (the `flex-1 flex overflow-hidden` container).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Config file | `vite.config.ts` (vitest block), `playwright.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | Notes |
|----------|-----------|-------------------|-------|
| Typography test still passes (Sidebar.tsx has "Room config") | Unit (file scan) | `npx vitest run tests/phase33/typography.test.ts` | Must pass after CollapsibleSection→PanelSection migration |
| Spacing audit still passes (no `p-[Npx]` in Sidebar.tsx) | Unit (file scan) | `npx vitest run tests/phase33/spacingAudit.test.ts` | `left-[21px]` in TreeRow.tsx is not in audit scope |
| Tree select roundtrip (e2e) | E2E | `npx playwright test e2e/tree-select-roundtrip.spec.ts` | Currently stubbed; spine restyle must not break data-tree-node attributes |
| Properties panel 3D (e2e) | E2E | `npx playwright test e2e/properties-panel-3d.spec.ts` | Panel must mount when selection active |
| PropertiesPanel unit tests | Unit | `npx vitest run tests/PropertiesPanel.length.test.tsx tests/components/PropertiesPanel.area.test.tsx tests/components/PropertiesPanel.ceiling-resize.test.tsx tests/components/PropertiesPanel.opening.test.tsx tests/components/PropertiesPanel.stair.test.tsx` | Must pass — contextual mounting should not affect these (they render PropertiesPanel directly) |

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. No new test files need to be created. The phase is Chrome-only; existing unit tests render PropertiesPanel directly and are unaffected by the App.tsx conditional wrapping.

---

## Environment Availability

Step 2.6: SKIPPED — phase is purely code/config changes (class swaps, mount wiring, no new external tools or services).

---

## Runtime State Inventory

Step 2.5: SKIPPED — this is a restyle phase, not a rename/refactor/migration. No stored data, service config, or OS registrations reference tree structure or panel mount patterns.

---

## Open Questions

1. **Split view PropertiesPanel consolidation**
   - What we know: App.tsx mounts PropertiesPanel twice (line 258 for 2D, line 278 for 3D-only). The two mounts are inside different viewMode branches.
   - What's unclear: Should both branches get their own AnimatePresence, or should the contextual panel be hoisted above the viewMode split and positioned absolutely?
   - Recommendation: Keep two AnimatePresence wrappers (one per viewMode branch), each with `key="properties-panel"`. Avoids restructuring the canvas layout. Both use identical motion.div props.

2. **Active-room vs selected-row distinction in TreeRow**
   - What we know: D-04 distinguishes `bg-accent` (active room) from `bg-accent/20` (selected non-room). Current code uses `selected` boolean for both `bg-secondary border-l-2 border-accent`.
   - What's unclear: `isActiveRoom` is already computed in TreeRow.tsx (line 63). The active room row needs `bg-accent text-accent-foreground` while a selected wall/product row needs `bg-accent/20 text-accent-foreground`.
   - Recommendation: Use `isActiveRoom` for the stronger `bg-accent` treatment, `selected && !isActiveRoom` for the softer `bg-accent/20`.

---

## Sources

### Primary (HIGH confidence)
- Direct file read: `src/components/RoomsTreePanel/TreeRow.tsx` — full source, all class names verified
- Direct file read: `src/components/Sidebar.tsx` — CollapsibleSection anatomy, lines 20–46
- Direct file read: `src/App.tsx` lines 250–285 — PropertiesPanel mount locations (lines 258, 278)
- Direct file read: `src/components/PropertiesPanel.tsx` lines 718–748 and 964–989 — both driver registrations verified
- Direct file read: `src/lib/motion.ts` — SPRING_SNAPPY confirmed: `{ type: "spring", stiffness: 400, damping: 30 }`
- Direct file read: `src/components/ui/PanelSection.tsx` — prop API confirmed identical to CollapsibleSection except required `id`
- Direct file read: `tests/phase33/spacingAudit.test.ts` — audit scope and regex confirmed
- Direct file read: `tests/phase33/typography.test.ts` — literal string check for `"Room config"` in Sidebar.tsx
- Direct file read: `.planning/competitive/pascal-visual-audit.md` — spine/branch code verbatim

### Secondary (MEDIUM confidence)
- E2e spec headers (`e2e/tree-select-roundtrip.spec.ts`, `e2e/properties-panel-3d.spec.ts`) — test scope understood; tree-select currently stubbed

---

## Metadata

**Confidence breakdown:**
- Class changes required: HIGH — exact current classes read from source
- Driver safety analysis: HIGH — both registrations read and evaluated
- Animation pattern: HIGH — SPRING_SNAPPY and AnimatePresence confirmed installed
- PanelSection API: HIGH — read from source; `id` prop required
- Test regression risk: HIGH — audit tests read and regex confirmed

**Research date:** 2026-05-07
**Valid until:** 2026-06-06 (stable codebase; no external deps)
