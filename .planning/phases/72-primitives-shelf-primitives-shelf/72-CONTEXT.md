# Phase 72: Primitives Shelf — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a `cva`-driven primitive component library with `motion/react` spring animations. These primitives become the ONLY way to author chrome from this phase forward. Phases 73-76 consume them.

Primitives in scope: **Button, Tab, PanelSection, SegmentedControl, Switch, Slider, Tooltip, Dialog, Input, Popover**.

This phase also migrates ~30 button sites + ~5 tab sites + ~5 panel sites to the new primitives. Remaining migration happens in Phases 73-76.

</domain>

<decisions>
## Implementation Decisions

### Animation Library
- **D-01:** Use `motion/react` (framer-motion v11+) for all spring-based animations — dialog entry, panel expand/collapse, tab pill slide, tooltip fade. Install as a production dependency.
- **D-02:** Every animation MUST guard on the existing `useReducedMotion()` hook from `src/hooks/useReducedMotion.ts` (Phase 33 D-39). When `true`, snap — no duration, no spring.
- **D-03:** Spring config: use a single shared spring preset (e.g., `{ type: "spring", stiffness: 400, damping: 30 }`) exported from a `src/lib/motion.ts` constants file. Phases 73-76 import the same preset for consistency.

### Component API Surface
- **D-04:** All primitives use `cva` (class-variance-authority) for variant/size composition. Install `class-variance-authority` + `clsx` + `tailwind-merge` as dependencies.
- **D-05:** API style: shadcn-inspired (thin wrappers, forwardRef, className merge via `cn()` utility) but fully custom. Do NOT import from `@shadcn/ui` or copy-paste from shadcn registry — build from scratch using Pascal tokens.
- **D-06:** Each primitive lives in `src/components/ui/` as a single file (e.g., `Button.tsx`, `Tab.tsx`). Barrel export from `src/components/ui/index.ts`.
- **D-07:** `cn()` utility (clsx + tailwind-merge) at `src/lib/cn.ts` — standard pattern for className merging.

### Button Primitive
- **D-08:** Variants: `default` / `destructive` / `outline` / `secondary` / `ghost` / `link`. Sizes: `default` / `sm` / `lg` / `icon` / `icon-sm` / `icon-lg`. All consume Pascal tokens.
- **D-09:** Active state for tool buttons: darker fill ring (per roadmap success criterion 4). Implemented via an `active` boolean prop or `data-active` attribute.

### Tab Primitive
- **D-10:** Muted-background pill active state — no neon glow, no hard accent ring. Active pill slides via `motion/react` `layoutId` animation.
- **D-11:** API: `<Tabs value={} onValueChange={}>` + `<TabsList>` + `<TabsTrigger value={}>` + `<TabsContent value={}>`. Controlled component.

### PanelSection Primitive
- **D-12:** Replaces existing `CollapsibleSection` from `src/components/ui/CollapsibleSection.tsx`. Same localStorage persistence pattern (Phase 33 D-06), same default-expanded (D-07), but spring-animated height via `motion/react` `AnimatePresence` + `motion.div`.
- **D-13:** Chevron: lucide-react `ChevronRight`, rotates 90° on expand (spring-animated). Entire header row is click target.
- **D-14:** Preserve `__driveCollapsibleSection` test driver interface — rename to `__drivePanelSection` but keep the same `toggle(id)` / `isOpen(id)` contract so e2e specs survive.

### Dialog Primitive
- **D-15:** Use `@radix-ui/react-dialog` for underlying accessibility (focus trap, Escape close, aria attributes). Style overlay + content with Pascal tokens + `motion/react` spring entry.
- **D-16:** Overlay: `bg-background/80 backdrop-blur-sm`. Content: `bg-surface rounded-smooth-lg border border-border shadow-lg`. Spring entry from scale(0.95) + opacity(0).

### Popover + Tooltip Primitives
- **D-17:** Use `@radix-ui/react-popover` and `@radix-ui/react-tooltip` for underlying positioning + accessibility. Style with Pascal tokens.
- **D-18:** Tooltip: appears on hover after 200ms delay; simple fade-in (no spring needed). Dark chip style: `bg-foreground text-background text-xs rounded-md px-2 py-1`.

### Input Primitive
- **D-19:** Styled `<input>` wrapper with focus ring (`ring-ring`), Pascal surface colors, consistent height scale matching Button sizes.
- **D-20:** Supports `type="text" | "number"` and an optional `label` prop for form context.

### SegmentedControl Primitive
- **D-21:** Pill-slider active indicator (like iOS segmented control). Uses `motion/react` `layoutId` for sliding pill. Pascal surface + accent tokens.

### Switch + Slider Primitives
- **D-22:** Switch: simple toggle with `motion/react` knob slide. On = `bg-accent`, off = `bg-muted`.
- **D-23:** Slider: styled `<input type="range">` with accent track fill. Used for opacity/scale controls in properties panels.

### Migration Scope
- **D-24:** Phase 72 migrates: ~30 `<button>` sites across Toolbar, Sidebar, modals; ~5 tab-like patterns; ~5 CollapsibleSection usages in PropertiesPanel. Exact site list determined during planning (grep audit).
- **D-25:** Sites NOT migrated in Phase 72 continue to work as-is. Phases 73-76 will migrate them as they restyle each area.
- **D-26:** Existing `CollapsibleSection` component is REPLACED by `PanelSection`. Old import paths updated in migrated sites; unmigrated sites keep using old component until their phase.

### Claude's Discretion
- Exact spring stiffness/damping values within reasonable range
- Whether to use `asChild` pattern (Radix slot) or direct render for Button
- Internal file organization within each primitive file
- Whether SegmentedControl and Switch need Radix underneath or pure custom is sufficient
- Exact Tailwind token values for hover/focus states within Pascal palette

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system foundation (Phase 71)
- `src/index.css` — Pascal oklch tokens, font stack, radius scale, dark-mode block
- `src/hooks/useTheme.ts` — theme hook API + localStorage persistence
- `src/hooks/useReducedMotion.ts` — animation guard hook (Phase 33 D-39)

### Existing primitives to replace/extend
- `src/components/ui/CollapsibleSection.tsx` — current expand/collapse; replaced by PanelSection
- `src/components/ui/FloatingSelectionToolbar.tsx` — example of reduced-motion pattern
- `src/components/ui/GestureChip.tsx` — existing ui/ component; not touched this phase
- `src/components/ui/InlineEditableText.tsx` — existing ui/ component; not touched this phase

### Competitive reference
- `.planning/competitive/pascal-visual-audit.md` — Pascal Editor design patterns to emulate
- `.planning/competitive/pascal-audit.md` — § "Visual / interaction design patterns worth copying"

### Phase 33 decisions (carry forward)
- `.planning/phases/33-design-system-ui-polish/33-CONTEXT.md` — D-06 through D-09 (CollapsibleSection contract), D-33 (icon policy), D-34 (spacing/radius), D-39 (reduced motion)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useReducedMotion()` hook: already wired in 7+ components — primitives MUST use this, not a new hook
- `CollapsibleSection`: localStorage persistence + test driver pattern to preserve in PanelSection
- Pascal tokens in `src/index.css`: `bg-surface`, `bg-background`, `text-foreground`, `bg-accent`, `border-border`, `ring-ring` etc.
- `uid()` from `src/lib/geometry.ts` for any ID generation needed

### Established Patterns
- No cva currently — this phase introduces it as the standard
- No motion/react — this phase introduces it; all existing animations use CSS transitions
- `src/components/ui/` is the ui component directory (4 files currently)
- Toolbar has 20+ raw `<button>` elements with inline Tailwind — prime migration target

### Integration Points
- Button: replaces `<button className="...">` across Toolbar.tsx, Sidebar.tsx, modals
- PanelSection: replaces `<CollapsibleSection>` in PropertiesPanel.tsx (10+ usages)
- Tab: replaces manual tab-like patterns in Sidebar/PropertyPanel
- Dialog: wraps existing modal patterns (AddProductModal, UploadTextureModal, etc.)
- Tooltip: wraps existing title attributes on toolbar buttons

</code_context>

<specifics>
## Specific Ideas

- Pascal Editor reference: buttons have no visible border in default state, subtle fill on hover, darker fill on active/pressed
- Dialog entry: scale from 95% + fade in, spring-based, ~200ms feel
- Tab active pill: muted background (not accent-colored), slides between tabs
- PanelSection chevron rotates smoothly 0→90° on expand

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 72-primitives-shelf*
*Context gathered: 2026-05-07*
