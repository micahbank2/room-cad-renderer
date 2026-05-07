# Phase 72: Primitives Shelf - Research

**Researched:** 2026-05-07
**Domain:** Component primitives (cva + motion/react + Radix UI)
**Confidence:** HIGH

## Summary

Phase 72 introduces a `cva`-driven component primitive library with `motion/react` spring animations, replacing ~130 raw `<button>` elements across 41 component files, 3 `CategoryTabs` consumer sites, and 13 `CollapsibleSection` usages in PropertiesPanel. All primitives consume the Phase 71 Pascal oklch tokens and live in `src/components/ui/`.

The tech stack is well-established: `class-variance-authority` (0.7.1) for variant composition, `motion` (12.38.0, import from `motion/react`) for spring animations, and `@radix-ui/react-dialog` + `@radix-ui/react-popover` + `@radix-ui/react-tooltip` for accessibility primitives. None of these packages are currently installed -- all are new dependencies.

**Primary recommendation:** Build primitives first (Button, cn(), motion presets), then migrate in waves: Toolbar buttons first (20 sites, highest density), then PropertiesPanel (CollapsibleSection -> PanelSection + buttons), then remaining modal/library sites.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Use `motion/react` (framer-motion v11+) for all spring-based animations
- D-02: Every animation MUST guard on existing `useReducedMotion()` hook
- D-03: Single shared spring preset in `src/lib/motion.ts`
- D-04: All primitives use `cva` (class-variance-authority)
- D-05: shadcn-inspired API but fully custom (no @shadcn/ui imports)
- D-06: Each primitive in `src/components/ui/` as single file; barrel export from `index.ts`
- D-07: `cn()` utility at `src/lib/cn.ts`
- D-08: Button variants: default/destructive/outline/secondary/ghost/link; sizes: default/sm/lg/icon/icon-sm/icon-lg
- D-09: Active state for tool buttons via `active` boolean prop or `data-active`
- D-10: Tab muted-background pill active state with `motion/react` `layoutId`
- D-11: Tabs API: `<Tabs value={} onValueChange={}>` + `<TabsList>` + `<TabsTrigger>` + `<TabsContent>`
- D-12: PanelSection replaces CollapsibleSection with spring-animated height
- D-13: Chevron: lucide `ChevronRight`, rotates 90 degrees on expand
- D-14: Preserve `__driveCollapsibleSection` test driver -> rename to `__drivePanelSection`
- D-15: @radix-ui/react-dialog for Dialog
- D-16: Dialog overlay: `bg-background/80 backdrop-blur-sm`; content spring from scale(0.95)
- D-17: @radix-ui/react-popover and @radix-ui/react-tooltip
- D-18: Tooltip: 200ms delay, fade-in, dark chip style
- D-19: Input styled wrapper with focus ring
- D-20: Input supports type="text"|"number" + optional label
- D-21: SegmentedControl pill-slider via `layoutId`
- D-22: Switch with motion knob slide
- D-23: Slider styled input[type=range]
- D-24: Phase 72 migrates ~30 button sites + ~5 tab sites + ~5 panel sites
- D-25: Unmigrated sites continue as-is until Phases 73-76
- D-26: CollapsibleSection replaced by PanelSection

### Claude's Discretion
- Exact spring stiffness/damping values within reasonable range
- Whether to use `asChild` pattern (Radix slot) or direct render for Button
- Internal file organization within each primitive file
- Whether SegmentedControl and Switch need Radix underneath or pure custom
- Exact Tailwind token values for hover/focus states within Pascal palette

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRIMITIVES-SHELF | Build cva-driven primitive library with motion/react animations; migrate ~30 button + ~5 tab + ~5 panel sites | Standard Stack + Architecture Patterns + Migration Inventory sections |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `class-variance-authority` | 0.7.1 | Variant/size composition for all primitives | Industry standard for Tailwind component systems; used by shadcn/ui, Vercel, every major design system |
| `motion` | 12.38.0 | Spring animations (dialog entry, panel expand, tab pill slide) | Import from `motion/react`. Successor to framer-motion; supports oklch animation natively in v12 |
| `clsx` | 2.1.1 | Conditional className joining | Lightweight, standard companion to cva |
| `tailwind-merge` | 3.5.0 | Tailwind class conflict resolution | Prevents duplicate/conflicting utility classes when merging cva output with consumer classNames |
| `@radix-ui/react-dialog` | 1.1.15 | Accessible dialog (focus trap, Escape, aria) | Zero-style headless primitive; industry standard |
| `@radix-ui/react-popover` | 1.1.15 | Positioned popover with accessible triggers | Same Radix ecosystem |
| `@radix-ui/react-tooltip` | 1.2.8 | Accessible tooltip with delay/positioning | Same Radix ecosystem |
| `@radix-ui/react-slot` | 1.2.4 | `asChild` pattern for Button (optional) | Enables polymorphic rendering without wrapper divs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `motion` | CSS transitions (current) | CSS transitions lack spring physics, layoutId, AnimatePresence exit animations |
| `cva` | `tailwind-variants` | TV is newer with built-in tw-merge, but cva is the D-04 locked decision |
| Radix Dialog | Custom dialog | Lose focus trap, Escape handling, screen reader support |
| SegmentedControl via Radix | Pure custom | Custom is sufficient -- no complex accessibility needs for a toggle group; Radix Tabs would be over-engineering |
| Switch via Radix | Pure custom | Custom is sufficient -- simple boolean toggle with motion animation |

**Installation:**
```bash
npm install class-variance-authority clsx tailwind-merge motion @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-tooltip @radix-ui/react-slot
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    cn.ts                    # clsx + tailwind-merge utility
    motion.ts                # shared spring presets
  components/
    ui/
      index.ts               # barrel export
      Button.tsx
      Tabs.tsx
      PanelSection.tsx
      SegmentedControl.tsx
      Switch.tsx
      Slider.tsx
      Tooltip.tsx
      Dialog.tsx
      Input.tsx
      Popover.tsx
      CollapsibleSection.tsx  # KEPT until Phase 76 (Sidebar uses its own local copy; PropertiesPanel migrates)
      FloatingSelectionToolbar.tsx  # untouched
      GestureChip.tsx              # untouched
      InlineEditableText.tsx       # untouched
```

### Pattern 1: cn() Utility
**What:** Standard className merge function
**When to use:** Every primitive and every consumer that passes className
```typescript
// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Pattern 2: cva Button with Variant Composition
**What:** Type-safe variant/size matrix
**When to use:** Every primitive component
```typescript
// src/components/ui/Button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  // Base classes (always applied)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 rounded-smooth-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
        "icon-lg": "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  active?: boolean;  // D-09: tool active state
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, active, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          active && "bg-accent/20 ring-1 ring-ring",
          className
        )}
        ref={ref}
        data-active={active || undefined}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
```

### Pattern 3: motion/react Spring Config + Reduced Motion Guard
**What:** Shared spring preset with reduced-motion bypass
**When to use:** Every animated primitive
```typescript
// src/lib/motion.ts
import type { Transition } from "motion/react";

/** Snappy spring for UI chrome (panels, pills, dialogs). ~200ms feel. */
export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

/** Instant transition for reduced-motion users. */
export const SPRING_NONE: Transition = {
  duration: 0,
};

/** Returns SPRING_SNAPPY when animation is OK, SPRING_NONE when reduced-motion is active. */
export function springTransition(reduced: boolean): Transition {
  return reduced ? SPRING_NONE : SPRING_SNAPPY;
}
```

### Pattern 4: PanelSection with AnimatePresence Height Animation
**What:** Collapsible section with spring-animated height
**When to use:** PropertiesPanel sections, sidebar sections
```typescript
// Key pattern: AnimatePresence + motion.div for height animation
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { springTransition } from "@/lib/motion";

// Inside render:
const reduced = useReducedMotion();

<AnimatePresence initial={false}>
  {open && (
    <motion.div
      key="content"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={springTransition(reduced)}
      style={{ overflow: "hidden" }}
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

### Pattern 5: Tab layoutId Pill Slide
**What:** Shared layout animation for active tab indicator
**When to use:** Tabs, SegmentedControl
```typescript
// Inside TabsTrigger render:
{isActive && (
  <motion.div
    layoutId={`tab-pill-${groupId}`}
    className="absolute inset-0 bg-muted rounded-smooth-md"
    transition={springTransition(reduced)}
    style={{ zIndex: -1 }}
  />
)}
```

### Pattern 6: Radix Dialog with motion/react Spring Entry
**What:** Accessible dialog with spring animation
```typescript
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";

// Overlay: bg-background/80 backdrop-blur-sm
// Content: scale from 0.95 + opacity fade
<AnimatePresence>
  {open && (
    <DialogPrimitive.Portal forceMount>
      <DialogPrimitive.Overlay asChild>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        />
      </DialogPrimitive.Overlay>
      <DialogPrimitive.Content asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={springTransition(reduced)}
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-card rounded-smooth-lg border border-border shadow-lg p-6"
        >
          {children}
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )}
</AnimatePresence>
```

### Anti-Patterns to Avoid
- **Don't use CSS transitions for panel height**: CSS cannot animate to `height: auto`. Use motion/react `AnimatePresence` with `height: "auto"`.
- **Don't use separate ChevronDown/ChevronRight icons**: Use a single `ChevronRight` with `rotate(90deg)` via `motion.div` for smooth spring rotation.
- **Don't put spring config inline**: All spring presets must come from `src/lib/motion.ts` (D-03).
- **Don't forget `initial={false}` on AnimatePresence**: Without it, PanelSections animate on first mount (jarring when page loads with sections already open).
- **Don't use framer-motion import**: The package is `motion`, import from `motion/react` (not `framer-motion`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap in dialogs | Manual focus management | `@radix-ui/react-dialog` | Focus trap edge cases (nested dialogs, portals, tab cycling) are extremely complex |
| Tooltip positioning | Manual `getBoundingClientRect` | `@radix-ui/react-tooltip` | Handles viewport overflow, collision detection, arrow positioning |
| Popover positioning | Manual positioning | `@radix-ui/react-popover` | Same collision/overflow handling |
| Class conflict resolution | String concatenation | `tailwind-merge` via `cn()` | `bg-red-500 bg-blue-500` must resolve to one; manual string concat breaks |
| Height animation to auto | CSS max-height hack | `motion/react` AnimatePresence | CSS `max-height: 9999px` (current CollapsibleSection) creates visible timing artifacts |
| Layout animation between tabs | Manual position calculation | `motion/react` layoutId | Handles cross-component shared layout animations automatically |

## Common Pitfalls

### Pitfall 1: motion/react and React.StrictMode Double-Mount
**What goes wrong:** AnimatePresence exit animations fire on StrictMode's first unmount, causing flicker.
**Why it happens:** StrictMode mounts -> unmounts -> remounts in dev.
**How to avoid:** Use `initial={false}` on AnimatePresence where appropriate (PanelSection). For registries written inside motion callbacks, follow the identity-check cleanup pattern from CLAUDE.md #7.
**Warning signs:** Animations play on page load when they shouldn't.

### Pitfall 2: Radix Portal Breaks Tailwind Dark Mode
**What goes wrong:** Radix portals render at document body level, outside any `.dark` class scope if dark class is on a nested element.
**Why it happens:** Portal content doesn't inherit parent CSS custom properties.
**How to avoid:** Ensure `.dark` class is on `<html>` (which this project already does via `useTheme`). Radix portals render into `document.body` which inherits from `<html>`.
**Warning signs:** Dialog/popover renders with light-mode colors while app is in dark mode.

### Pitfall 3: cva + tailwind-merge Version Mismatch
**What goes wrong:** `tailwind-merge` v3 doesn't recognize Tailwind v4 utility names.
**Why it happens:** Tailwind v4 changed some class name patterns.
**How to avoid:** Use `tailwind-merge` 3.5.0+ which supports Tailwind v4.
**Warning signs:** Classes not being properly merged; duplicate utilities surviving.

### Pitfall 4: CollapsibleSection Test Breaks on Rename
**What goes wrong:** `tests/phase33/collapsibleSections.test.ts` asserts file exists at exact path.
**Why it happens:** Test does `fs.existsSync("src/components/ui/CollapsibleSection.tsx")`.
**How to avoid:** Keep `CollapsibleSection.tsx` file in place until ALL consumers are migrated. PanelSection is a NEW file alongside it. Update the test to check for PanelSection as well, or keep both files.
**Warning signs:** Phase 33 test suite fails after migration.

### Pitfall 5: localStorage Key Continuity
**What goes wrong:** PanelSection uses a different localStorage key than CollapsibleSection, losing user's saved open/close state.
**Why it happens:** Renaming the storage key.
**How to avoid:** Keep the same `ui:propertiesPanel:sections` storage key in PanelSection.
**Warning signs:** All sections reset to defaultOpen after migration.

### Pitfall 6: Button Type Attribute
**What goes wrong:** Buttons inside forms trigger form submission.
**Why it happens:** HTML buttons default to `type="submit"`.
**How to avoid:** Button primitive should default `type` to `"button"` unless explicitly set.
**Warning signs:** Clicking a cancel button submits a form.

## Code Examples

### cn() Utility (verified pattern)
```typescript
// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Tooltip Primitive (Radix + Pascal tokens)
```typescript
// src/components/ui/Tooltip.tsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/cn";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={200}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Root>{children}</TooltipPrimitive.Root>;
}

export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, ...props }: TooltipPrimitive.TooltipContentProps) {
  return (
    <TooltipPrimitive.Content
      sideOffset={4}
      className={cn(
        "z-50 bg-foreground text-background text-xs rounded-md px-2 py-1 animate-in fade-in-0",
        className
      )}
      {...props}
    />
  );
}
```

### Switch Primitive (Pure custom + motion)
```typescript
// Key pattern for Switch
import { motion } from "motion/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { springTransition } from "@/lib/motion";

// Knob slides left/right
<motion.span
  layout
  transition={springTransition(reduced)}
  className={cn(
    "block h-4 w-4 rounded-full bg-background shadow-sm",
    checked ? "translate-x-4" : "translate-x-0"
  )}
/>
```

## Migration Inventory

### Button Sites (130 total `<button>` elements across 41 files)

**Phase 72 migration targets (~30 highest-impact sites):**

| File | Count | Notes |
|------|-------|-------|
| `Toolbar.tsx` | 20 | Highest density; tool activation buttons + view mode buttons |
| `PropertiesPanel.tsx` | 9 | Delete, action buttons within sections |
| `AddRoomDialog.tsx` | 3 | Cancel + Submit + Close |
| `ProjectManager.tsx` | 4 | Save/Load/New/Delete |
| `WelcomeScreen.tsx` | 4 | CTA buttons |

**Phase 73-76 migration targets (remaining ~100 sites):**

| File | Count | Phase |
|------|-------|-------|
| `WallSurfacePanel.tsx` | 7 | 75 |
| `SwatchPicker.tsx` | 7 | 75 |
| `AddProductModal.tsx` | 5 | 75 |
| `WainscotLibrary.tsx` | 4 | 75 |
| `UploadTextureModal.tsx` | 4 | 76 |
| `UploadMaterialModal.tsx` | 4 | 76 |
| `TemplatePickerDialog.tsx` | 4 | 76 |
| `MyTexturesList.tsx` | 4 | 75 |
| `FramedArtLibrary.tsx` | 4 | 75 |
| `CustomElementsPanel.tsx` | 4 | 75 |
| `HelpModal.tsx` | 3 | 76 |
| `MaterialPicker.tsx` | 3 | 75 |
| `OnboardingOverlay.tsx` | 3 | 76 |
| `TreeRow.tsx` | 3 | 73 |
| `RoomTabs.tsx` | 2 | 73 |
| `Sidebar.tsx` | 2 | 73 |
| `ProductLibrary.tsx` | 2 | 75 |
| `MaterialsSection.tsx` | 2 | 75 |
| `FloorMaterialPicker.tsx` | 2 | 75 |
| `DeleteTextureDialog.tsx` | 2 | 76 |
| `LibraryCard.tsx` | 2 | 75 |
| `CategoryTabs.tsx` | 1 | 75 (replaced by Tabs primitive) |
| Others (1 each) | ~15 | Various phases |

### Tab Sites (3 CategoryTabs consumers + 2 tab-like patterns)

| File | Pattern | Migration |
|------|---------|-----------|
| `ProductLibrary.tsx` | `<CategoryTabs>` | Phase 75 (library restyle) |
| `FloorMaterialPicker.tsx` | `<CategoryTabs>` | Phase 75 |
| `SurfaceMaterialPicker.tsx` | `<CategoryTabs>` | Phase 75 |
| `Toolbar.tsx` (viewMode buttons) | Manual button group | Phase 74 (SegmentedControl) |
| `RoomTabs.tsx` | Manual tab buttons | Phase 73 |

**Phase 72 tab migration:** Build the Tabs primitive and migrate 0-1 simple sites as proof. CategoryTabs consumers stay until Phase 75.

### CollapsibleSection Sites (13 usages in PropertiesPanel)

| File | Count | Section IDs |
|------|-------|-------------|
| `PropertiesPanel.tsx` | 13 | `dimensions` (5x for different selection types), `position` (3x), `rotation` (2x), `material` (1x), plus others |

**Sidebar.tsx has its own local `CollapsibleSection` function** (lines 20-46) -- a simpler version without localStorage persistence or test drivers. This local version uses 5 instances: "Room config", "System stats", "Layers", "Snap", "Product library". The Sidebar local version is NOT part of Phase 72 migration -- it stays as-is until Phase 73.

### Existing Custom Tooltip (src/components/Tooltip.tsx)

There is an existing custom `Tooltip.tsx` component that uses manual `getBoundingClientRect` positioning and `createPortal`. This will be replaced by the Radix-based `src/components/ui/Tooltip.tsx` primitive. The old file can be deleted once all consumers are migrated. Consumer migration happens primarily in Phase 74 (Toolbar hover tooltips) and Phase 75.

### Test Driver Contract

Current `__driveCollapsibleSection` in `CollapsibleSection.tsx` (lines 81-101):
- `getPersisted()` -> reads localStorage `ui:propertiesPanel:sections`
- `getOpen(id)` -> checks `aria-expanded` on button within `[data-collapsible-id="${id}"]`
- `toggle(id)` -> clicks the button

New `__drivePanelSection` must maintain the same contract:
- Same data attribute pattern: `data-panel-id="${id}"` (renamed from `data-collapsible-id`)
- Same `aria-expanded` attribute on the header button
- Same `toggle(id)` / `getOpen(id)` / `getPersisted()` API

**No e2e or unit tests currently consume `__driveCollapsibleSection`** -- only `tests/phase33/collapsibleSections.test.ts` checks the file exists and has the right imports. That structural test needs updating.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 + Playwright 1.59.1 |
| Config file | `vitest.config.ts` / `playwright.config.ts` |
| Quick run command | `npm run test:quick` |
| Full suite command | `npm test && npm run test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRIM-01 | Button renders all 6 variants x 6 sizes | unit | `npx vitest run tests/primitives/button.test.tsx -x` | Wave 0 |
| PRIM-02 | cn() merges classes correctly | unit | `npx vitest run tests/primitives/cn.test.ts -x` | Wave 0 |
| PRIM-03 | PanelSection persists to localStorage | unit | `npx vitest run tests/primitives/panelSection.test.tsx -x` | Wave 0 |
| PRIM-04 | PanelSection test driver API works | unit | `npx vitest run tests/primitives/panelSection.test.tsx -x` | Wave 0 |
| PRIM-05 | Phase 33 structural test still passes | unit | `npx vitest run tests/phase33/collapsibleSections.test.ts -x` | Existing (needs update) |
| PRIM-06 | Existing e2e tests pass after button migration | e2e | `npm run test:e2e` | Existing |
| PRIM-07 | Dialog renders with focus trap | unit | `npx vitest run tests/primitives/dialog.test.tsx -x` | Wave 0 |
| PRIM-08 | Tabs layoutId animation renders active pill | unit | `npx vitest run tests/primitives/tabs.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:quick`
- **Per wave merge:** `npm test && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/primitives/button.test.tsx` -- covers PRIM-01
- [ ] `tests/primitives/cn.test.ts` -- covers PRIM-02
- [ ] `tests/primitives/panelSection.test.tsx` -- covers PRIM-03, PRIM-04
- [ ] `tests/primitives/dialog.test.tsx` -- covers PRIM-07
- [ ] `tests/primitives/tabs.test.tsx` -- covers PRIM-08
- [ ] Update `tests/phase33/collapsibleSections.test.ts` to accept PanelSection alongside CollapsibleSection

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package, import `motion/react` | Mid-2025 | Package name changed; same API |
| CSS max-height hack for collapse | AnimatePresence + height: "auto" | motion v6+ | Smooth, accurate height animation |
| Manual className strings | cva variant composition | 2023+ | Type-safe, maintainable variant system |
| Custom tooltip positioning | Radix UI headless primitives | 2022+ | Accessible, battle-tested positioning |

## Open Questions

1. **tw-animate-css mentioned in REQUIREMENTS.md acceptance criteria**
   - What we know: The acceptance criteria mentions `tw-animate-css` but CONTEXT.md doesn't reference it. It provides Tailwind-compatible CSS animation utilities.
   - What's unclear: Whether it's actually needed given motion/react handles all spring animations.
   - Recommendation: Skip `tw-animate-css` -- motion/react covers all animation needs. The REQUIREMENTS.md mention appears to be from early Pascal audit before D-01 locked motion/react as the animation solution.

2. **Button type default**
   - What we know: HTML `<button>` defaults to `type="submit"`.
   - Recommendation: Default `type` to `"button"` in the Button primitive to prevent accidental form submissions. Override with `type="submit"` explicitly when needed.

3. **CollapsibleSection.tsx deletion timing**
   - What we know: PropertiesPanel migrates to PanelSection in Phase 72. Sidebar has its own local CollapsibleSection. The `ui/CollapsibleSection.tsx` file is only imported by PropertiesPanel.
   - Recommendation: Delete `ui/CollapsibleSection.tsx` at end of Phase 72 after PropertiesPanel migration is complete. Update the Phase 33 structural test accordingly.

## Sources

### Primary (HIGH confidence)
- Project source code -- direct grep of 41 component files for button/tab/panel sites
- `src/components/ui/CollapsibleSection.tsx` -- full contract analysis
- `src/index.css` -- Pascal oklch token system (Phase 71 output)
- `tests/phase33/collapsibleSections.test.ts` -- structural test contract

### Secondary (MEDIUM confidence)
- [Motion docs - React component](https://motion.dev/docs/react-motion-component) -- motion/react v12 API
- [Motion docs - Transitions](https://www.framer.com/motion/transition/) -- spring config syntax
- [CVA docs - Variants](https://cva.style/docs/getting-started/variants) -- cva variant API
- npm registry -- verified versions: cva 0.7.1, motion 12.38.0, radix-dialog 1.1.15, clsx 2.1.1, tailwind-merge 3.5.0

### Tertiary (LOW confidence)
- Spring stiffness/damping values (400/30) -- based on common shadcn/Pascal-like snappy spring configs; should be tuned visually during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on npm registry with exact versions
- Architecture: HIGH -- patterns well-established (shadcn, Radix, motion/react); direct codebase analysis
- Migration inventory: HIGH -- grep-verified exact file counts and line numbers
- Pitfalls: HIGH -- based on known React StrictMode + Radix portal + cva patterns
- Spring config: MEDIUM -- values are reasonable defaults; visual tuning needed

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (stable ecosystem, 30-day window)
