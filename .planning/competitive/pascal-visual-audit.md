# Pascal Editor — Visual Design Audit

**Audited:** 2026-05-07
**Source:** [github.com/pascalorg/editor](https://github.com/pascalorg/editor) @ shallow clone (`/tmp/pascal-editor`)
**Scope:** Visual design system only — color, type, spacing, components, motion. Feature audit lives in `pascal-audit.md` (2026-04-21).
**Decision context:** v1.18 milestone "Pascal Visual Parity" — make Room CAD Renderer look extremely similar to Pascal while keeping all existing functionality.

---

## Executive summary

Pascal's visual system is **shadcn/ui v4 with the Vercel/Geist font stack and a soft squircle radius** — almost the canonical "modern dark UI" template, executed cleanly. Our current Obsidian CAD theme is **a custom dark-blue cyberpunk look with monospace UI chrome and 2px sharp corners** — visually opposite on every axis.

The migration is mechanically small (Tailwind v4 token swap + class rename pass) but perceptually huge:

| Axis | Ours (Obsidian CAD) | Pascal | Perceptual shift |
|---|---|---|---|
| Mood | Cyberpunk dark, blue-purple | Neutral dark, soft grays | "tactical" → "calm" |
| Corners | 2px sharp | 10px squircle | "blueprint" → "Apple" |
| Color | Saturated purple accent (`#7c5bf0`) | No accent color anywhere in chrome | "branded" → "neutral" |
| Type | IBM Plex Mono UI chrome, UPPERCASE_SNAKE | Barlow + Geist Sans, mixed case | "terminal" → "app" |
| Effects | `glass-panel` blur, `accent-glow` purple shadow | flat with `border-border/50` | "neon" → "minimal" |
| Density | Tight, 4/8/16 spacing | Roomier, 8/12/16 spacing | "dense" → "breathable" |

**Both stacks already use Tailwind v4** — Pascal uses `@theme` blocks with oklch tokens, identical syntax to ours. That's the lucky coincidence that makes this tractable: we can port their CSS variables directly, then evolve component-by-component.

---

## Tech-stack alignment (already compatible)

| Tool | Pascal | Ours | Notes |
|---|---|---|---|
| CSS framework | Tailwind v4 (`@tailwindcss/postcss`) | Tailwind v4 (`@tailwindcss/vite`) | Same major version; tokens transferable |
| Token system | `@theme {}` blocks, oklch colors | `@theme {}` blocks, hex colors | Same syntax; convert hex→oklch trivially |
| React | 19.2.4 | 18.3.1 | We're tracking R3F v9 / React 19 upgrade (#56) — would unblock framer-motion newer APIs |
| Animations | `motion/react` (framer-motion v12) | none | New dep needed |
| Icons | `lucide-react` + custom PNG icons | `lucide-react` + 10 Material Symbols | Already 90% aligned; stop adding Material Symbols |
| Component library | Custom (no shadcn dep, but uses shadcn token names) | Custom (Obsidian) | Both hand-rolled; copy classes, not packages |
| Radix primitives | `@radix-ui/react-slot` (only one) | none | Adopt for `Slot` pattern in Button |
| Variant management | `class-variance-authority` (cva) | inline conditional classes | Adopt cva — cleaner button/input variants |

**No package conflicts.** Adoption surface: add `motion`, `class-variance-authority`, `@radix-ui/react-slot`, `tw-animate-css`, `geist` font, `tailwind-merge` (we may already have it).

---

## Design tokens

### Pascal's `:root` (light mode)

```css
:root {
  --radius: 0.625rem;                    /* 10px base — soft */

  --background: oklch(0.998 0 0);        /* near-white */
  --foreground: oklch(0.145 0 0);        /* near-black */
  --card: oklch(0.998 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(0.998 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);           /* dark gray, the "filled button" color */
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);          /* very light gray */
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);  /* mid gray for secondary text */
  --accent: oklch(0.97 0 0);             /* same as muted in light mode */
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);  /* red */
  --border: oklch(0.922 0 0);            /* light gray border */
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);              /* focus ring */
  /* charts: 5 saturated colors — only place color appears in chrome */
  --chart-1: oklch(0.646 0.222 41.116);  /* orange */
  --chart-2: oklch(0.6 0.118 184.704);   /* teal */
  --chart-3: oklch(0.398 0.07 227.392);  /* dark blue */
  --chart-4: oklch(0.828 0.189 84.429);  /* yellow */
  --chart-5: oklch(0.769 0.188 70.08);   /* gold */
  /* sidebar variants — separate so sidebar can be styled independently */
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

### Pascal's `.dark` (dark mode — what we'd actually adopt)

```css
.dark {
  --background: oklch(0.205 0 0);    /* ≈ #171717 — neutral near-black */
  --foreground: oklch(0.985 0 0);    /* off-white */
  --card: oklch(0.205 0 0);          /* same as background — flat */
  --popover: oklch(0.205 0 0);
  --primary: oklch(0.922 0 0);       /* light gray — buttons are *light* on dark */
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);     /* slightly lighter than bg */
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0); /* mid gray — secondary text */
  --accent: oklch(0.235 0 0);        /* between bg and secondary */
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);      /* white at 10% — soft border */
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  /* charts — same hues, slightly different lightness for dark */
  --chart-1: oklch(0.488 0.243 264.376);  /* purple — only purple in entire system */
  --chart-2: oklch(0.696 0.17 162.48);    /* green */
  --chart-3: oklch(0.769 0.188 70.08);    /* gold */
  --chart-4: oklch(0.627 0.265 303.9);    /* magenta */
  --chart-5: oklch(0.645 0.246 16.439);   /* red-orange */
  --sidebar-primary: oklch(0.488 0.243 264.376);  /* purple — only chrome use */
}
```

### Radius scale (what makes Pascal look "soft")

```css
--radius: 0.625rem;                  /* 10px — base */
--radius-sm: calc(var(--radius) - 4px);  /*  6px */
--radius-md: calc(var(--radius) - 2px);  /*  8px */
--radius-lg: var(--radius);              /* 10px */
--radius-xl: calc(var(--radius) + 4px);  /* 14px */

/* + Apple-style continuous corners on supporting browsers */
.rounded-smooth { border-radius: var(--radius-lg); corner-shape: squircle; }
.rounded-smooth-xl { border-radius: var(--radius-xl); corner-shape: squircle; }
```

### Our current radius (for contrast)

```css
--radius-sm: 2px;   /*  -8px from Pascal */
--radius-md: 4px;   /*  -4px from Pascal */
--radius-lg: 8px;   /*  -2px from Pascal */
```

### Typography

**Pascal:**
```css
--font-sans:   var(--font-barlow), var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
--font-mono:   var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
--font-pixel:  var(--font-geist-pixel-square), var(--font-geist-mono), ui-monospace, ...;  /* pixel-style accents */
--font-barlow: var(--font-barlow), var(--font-geist-sans), ...;
```

- **Barlow** — primary UI sans (semi-condensed, slightly geometric)
- **Geist Sans** — fallback / body
- **Geist Mono** — code-only
- **Geist Pixel Square** — pixel-style accents (rare; for special labels)

**Ours:**
- **Inter** — body
- **IBM Plex Mono** — ALL UI chrome (labels, buttons, tabs, identifiers)
- **Space Grotesk** — hero displays only

The biggest single visual difference is monospace UI chrome. Switching to Barlow + Geist Sans makes the app feel like a 2025 SaaS product instead of a developer terminal.

---

## Component patterns

### Button (Pascal's default, via `cva`)

```tsx
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-barlow font-medium text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 ...",
  {
    variants: {
      variant: {
        default:    'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:'bg-destructive text-white hover:bg-destructive/90 ...',
        outline:    'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground ...',
        secondary:  'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:      'hover:bg-accent hover:text-accent-foreground ...',
        link:       'text-primary underline-offset-4 hover:underline',
      },
      size: { default: 'h-9 px-4 py-2', sm: 'h-8 px-3', lg: 'h-10 px-6', icon: 'size-9', 'icon-sm': 'size-8', 'icon-lg': 'size-10' },
    },
  }
)
```

Six variants × six sizes via `cva`. We currently inline-style every button.

### Tab bar

```tsx
<div className="flex h-10 shrink-0 items-center gap-0.5 border-border/50 border-b px-2">
  {tabs.map(tab => (
    <button
      className={cn(
        'relative h-7 rounded-md px-3 font-medium text-sm transition-colors',
        isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      )}
    >{tab.label}</button>
  ))}
</div>
```

Subtle. No glow, no border on active state — just a darker fill.

### Panel section (collapsible accordion — what our `RoomSettings` should become)

```tsx
<motion.div className="flex shrink-0 flex-col overflow-hidden border-border/50 border-b" layout
  transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>
  <motion.button
    className={cn(
      'group/section flex h-10 shrink-0 items-center justify-between px-3 transition-all duration-200',
      isExpanded ? 'bg-accent/50 text-foreground' : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
    )}>
    <span className="truncate font-medium text-sm">{title}</span>
    <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isExpanded ? 'rotate-180' : 'rotate-0')} />
  </motion.button>
  <AnimatePresence initial={false}>
    {isExpanded && (
      <motion.div animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>
        <div className="flex flex-col gap-1.5 p-3 pt-2">{children}</div>
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

Spring-animated expand/collapse, separator borders between sections, inactive sections muted out.

### Segmented control (their NORMAL/SOLO/EXPLODE replacement)

```tsx
<div className="flex h-9 w-full items-center rounded-lg border border-border/50 bg-[#2C2C2E] p-[3px]">
  {options.map(option => (
    <button
      className={cn(
        'relative flex h-full flex-1 items-center justify-center rounded-md font-medium text-xs transition-all duration-200',
        isSelected
          ? 'bg-[#3e3e3e] text-foreground shadow-sm ring-1 ring-border/50'
          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
      )}
    >...</button>
  ))}
</div>
```

iOS-style segmented control with inset selected pill.

### Floating bottom action menu (their toolbar)

```tsx
<motion.div className={cn(
  'fixed bottom-6 left-1/2 z-50 -translate-x-1/2',
  'rounded-2xl border border-border bg-background/90 shadow-2xl backdrop-blur-md',
  'transition-colors duration-200 ease-out'
)}>
  {/* Tool rows stacked vertically with motion AnimatePresence */}
</motion.div>
```

Floating glass pill at bottom-center of canvas. Each tool group (structure/furnish/camera) animates in as a row when activated.

### Tree node (sidebar — their signature visual)

```tsx
<div className="relative flex items-center justify-between py-2 pr-3 pl-10">
  {/* vertical tree spine */}
  <div className="absolute top-0 bottom-0 left-[21px] w-px bg-border/50" />
  {/* horizontal branch */}
  <div className="absolute top-1/2 left-[21px] h-px w-4 bg-border/50" />
  <div className="flex items-center gap-2">
    <Pentagon className="h-4 w-4 text-muted-foreground" />
    <span className="font-medium text-sm">Property Line</span>
  </div>
  ...
</div>
```

1px gray lines drawn at left:21px form the visual tree spine. Horizontal branches at left:21px..32px connect to each row. Looks like a Finder column / Notion sidebar.

---

## Layout architecture

Pascal's screen layout (deduced from component tree):

```
┌─────┬──────────────────────────────────────┬─────────────┐
│ ico │ canvas                               │ side panel  │
│ rail│                                      │ (tabs)      │
│ 48px│                                      │ 320–400px   │
│     │                                      │             │
│ [S] │                                      │ ┌─tabs────┐ │
│ [Z] │                                      │ │ site     │ │
│ [⚙] │                                      │ │ settings │ │
│     │                                      │ │ zone     │ │
│     │                                      │ └──────────┘ │
│     │                                      │             │
│     │                                      │ panel       │
│     │                                      │ content     │
│     │                                      │ (tree /     │
│     │                                      │  controls)  │
│     │                                      │             │
│     │      ┌──────────────────────┐        │             │
│     │      │ floating action menu  │        │             │
│     │      └──────────────────────┘        │             │
└─────┴──────────────────────────────────────┴─────────────┘
```

- **Icon rail** (left, 48px) — vertical strip of large category icons (custom PNGs, not lucide)
- **Canvas** (center, fluid) — 3D viewport
- **Side panel** (right, ~320-400px, resizable) — tab bar at top, content below
- **Floating action menu** (bottom-center) — context tools (build/furnish/camera modes)

Versus our current layout:

```
┌────────────────┬─────────────────────────────────┬───────┐
│ vertical       │ canvas (2D / 3D / split)        │ side  │
│ toolbar (left) │                                 │ bar   │
│ ~64px wide     │                                 │ ~320  │
│ tools + status │                                 │       │
└────────────────┴─────────────────────────────────┴───────┘
```

We have toolbar-left + canvas + sidebar-right. Pascal has icon-rail-left + canvas + tab-panel-right + floating-bottom-menu. The layout shapes are similar; the floating action menu is the major net-new affordance.

---

## Motion & animation

Pascal uses `motion/react` (framer-motion v12) extensively:
- `<motion.div layout>` for size-aware container resizing
- `<AnimatePresence>` for enter/exit animations
- Spring transitions: `{ type: 'spring', bounce: 0, duration: 0.4 }` is their default
- Layout animations on tree expansions, panel section accordions, action menu rows

Reduced motion is respected via `useReducedMotion` hook (matches our existing Phase 33 D-39 hook — ours is already compatible).

Our current motion: minimal. CSS transitions for hover, no spring/layout animations. Adopting framer-motion is the single biggest "feels Pascal" win, separate from any color/font work.

---

## Migration cost matrix

| Surface | Files touched | Mechanical | Subjective |
|---|---|---|---|
| **Token swap** (`src/index.css` `@theme {}` block) | 1 | High — rewrite color/radius vars | Low — one decision file |
| **Font swap** (Geist + Barlow, drop IBM Plex) | 2 (`index.html` link + `index.css`) | Trivial | Low |
| **Label convention** (UPPERCASE_SNAKE → mixed case) | ~25 component files | High — find/replace per file | Medium — need to preserve dynamic identifier convention (WALL_SEGMENT_id) |
| **Button primitive** (introduce `cva`) | 1 new file + ~30 button sites | Medium | Low — gradual migration |
| **Tab bar primitive** | 1 new + 3 sites (Sidebar, ProductLibrary, dialogs) | Low | Low |
| **Panel section primitive** (RoomSettings, etc.) | 1 new + ~5 sites | Medium | Low |
| **Sidebar tree** (rooms tree from Phase 46) | 2-3 files | Medium — restyle existing tree | Medium — line geometry is exacting |
| **Floating action menu** (replace top-left toolbar) | New component, refactor `Toolbar.tsx` | High | High — biggest layout shift |
| **Material picker / properties panel** (just shipped Phase 68) | ~5 files | Medium | Low |
| **Modal / dialog primitives** | 1 new + ~5 sites | Low | Low |
| **Motion adoption** (framer-motion) | New dep + selective use | Low — incremental | Low |
| **Icon audit** (drop Material Symbols, ensure lucide parity) | ~10 files | Low — already 90% there | Low |
| **CAD glow / glass classes** (`accent-glow`, `glass-panel`, `cad-grid-bg`) | Remove/restyle | Low | Medium — these are Obsidian's signature; removing them is committing to the new look |

Total estimate: **5–7 phases** (~v1.18.x), depending on whether we phase the floating action menu separately.

---

## What stays the same (functional invariants)

Every behavior in `CLAUDE.md` continues unchanged:
- Zustand stores (cadStore, uiStore) — untouched
- Snapshot v6 model + migrations — untouched
- Fabric.js 2D canvas + tools — only the toolbar chrome around it changes
- Three.js + R3F 3D viewport — untouched
- Test drivers (`__drive*`) — untouched
- Keyboard shortcuts (V/W/D/N/Ctrl+Z/etc.) — untouched
- Auto-save, undo/redo, snap engine, dimension editor — all continue as-is
- StrictMode-safe useEffect cleanup pattern — still applies
- D-33 icon policy — gets *stricter* (drop Material Symbols entirely)
- D-34 spacing — gets *replaced* with new Pascal scale
- D-39 reduced motion — already compatible

---

## Open questions for v1.18 planning

1. **Light mode support?** Pascal ships both. We're dark-only. Adding light mode is a 1-phase scope ask.
2. **Sidebar architecture** — adopt Pascal's icon-rail + tab-panel split, or keep our single-sidebar structure with new styles?
3. **Floating action menu** — replace our top-left toolbar entirely, or keep the toolbar AND add a floating menu for canvas-center actions?
4. **Custom PNG icons** — Pascal uses chunky PNG icons in their icon rail (custom-room.png, blueprint.png, paint.png). Worth commissioning a similar icon set, or stay 100% lucide?
5. **Squircle corners** — opt in via `corner-shape: squircle` (progressive enhancement; non-Safari browsers fall back to regular `border-radius`)?

---

## Concrete proposed token mapping (CSS)

**`src/index.css` `@theme {}` block — proposed v1.18.0 starting state:**

```css
@theme {
  /* Radius — soft Pascal scale */
  --radius: 0.625rem;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  /* Fonts — adopt Barlow + Geist; drop IBM Plex Mono UI usage */
  --font-sans: 'Barlow', 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  --font-display: 'Barlow', 'Geist', sans-serif;  /* keep tier name for migration ease */
  --font-body:    'Geist', sans-serif;

  /* Colors — Pascal dark palette (oklch) */
  --color-background: oklch(0.205 0 0);
  --color-foreground: oklch(0.985 0 0);
  --color-card:       oklch(0.205 0 0);
  --color-popover:    oklch(0.205 0 0);
  --color-primary:    oklch(0.922 0 0);
  --color-primary-foreground: oklch(0.205 0 0);
  --color-secondary:  oklch(0.269 0 0);
  --color-muted:      oklch(0.269 0 0);
  --color-muted-foreground: oklch(0.708 0 0);
  --color-accent:     oklch(0.235 0 0);
  --color-accent-foreground: oklch(0.985 0 0);
  --color-destructive: oklch(0.704 0.191 22.216);
  --color-border:     oklch(1 0 0 / 10%);
  --color-input:      oklch(1 0 0 / 15%);
  --color-ring:       oklch(0.556 0 0);
  --color-sidebar:    oklch(0.205 0 0);
  --color-sidebar-foreground: oklch(0.985 0 0);
  --color-sidebar-accent: oklch(0.235 0 0);
  --color-sidebar-border: oklch(1 0 0 / 10%);

  /* Keep semantic tokens we already export but they now reference Pascal vars */
  --color-success: oklch(0.696 0.17 162.48);   /* green chart */
  --color-warning: oklch(0.769 0.188 70.08);   /* gold chart */
  --color-error:   var(--color-destructive);
  --color-info:    oklch(0.488 0.243 264.376); /* purple chart — only purple in chrome */
}
```

**Removed from current `index.css`:**
- All `--color-obsidian-*` variants (8 surface levels)
- `--color-accent` purple `#7c5bf0` and friends
- `glass-panel`, `accent-glow`, `cad-grid-bg`, `ghost-border` custom classes
- `--text-display: 28px / --text-base: 13px / --text-sm: 11px` ramp (replaced by Pascal's `text-xs/sm/base/lg`)
- Aging-dot semantic colors stay (functional, not chrome)

---

## Proposed phase breakdown (v1.18)

```
v1.18 Pascal Visual Parity (~6 phases, ~5-7 days)

Phase 71. Token foundation         — CSS vars, fonts, font loading
Phase 72. Primitives shelf          — Button, Tab, Panel, Segmented, Switch, Slider via cva
Phase 73. Sidebar restyle           — Tree, panel sections, icon rail mood
Phase 74. Toolbar rework            — Floating action menu OR restyle in-place
Phase 75. Properties + Library      — MaterialPicker, ProductLibrary, RoomSettings restyle
Phase 76. Modals + WelcomeScreen + final passes
```

Each phase ships through normal GSD loop. Functionality regression-tested by existing Playwright + vitest suites — no behavior changes.

---

## Risks

1. **Behavior regression** from class swaps — mitigated by existing 800+ test suite; any layout-dependent test (Phase 36 visual regressions, etc.) flags real changes.
2. **Aesthetic drift** — Pascal's restraint is hard to maintain over time. Need a `.claude/rules/` subdirectory or design QA pass at each phase end.
3. **Accent recovery** — losing the purple feel (`--color-accent: #7c5bf0`) means the app loses brand color in chrome. Pascal's solution: chart colors only. We'd lose the purple smart-snap guides and selection glow unless we explicitly preserve them as functional (non-chrome) tokens.
4. **Font licensing** — Geist + Barlow are open (Vercel released Geist; Barlow is OFL). No issues.
5. **Squircle browser support** — `corner-shape: squircle` is Safari/WebKit-only at writing. Progressive enhancement; Chrome falls back to plain `border-radius`. Acceptable.

---

## Live screenshots (added 2026-05-07)

Booted Pascal locally at `localhost:3002` and captured headless screenshots. Note: dev tooling overlays (`react-grab` purple component tags + `react-scan` FPS/notif chrome at bottom-right) are present — those are dev-only and absent from production. Saved under `.planning/competitive/pascal-screenshots/`.

### 01-home.png — editor canvas, dark mode

What's visible despite the overlay:
- Left sidebar: "Scene" header → Site/Building/Level breadcrumb → `Structure | Furnish | Zones` segmented tab → "ContentSection" with empty state ("No elements on this level")
- Top-right: 3D / 2D / Split view-mode toggle, "Local editor — scenes are not saved" status, "Open recent scenes / Create new" links, then "Stack | Full height | 0.50 zoom | grid | layer | preview" cluster
- **Floating bottom action menu — TWO ROWS:**
  - **Top row**: chunky 3D-rendered PNG icons (cubes, blueprints, doors, windows, fences, stairs, roofs) — these are the "structure tools"
  - **Bottom row**: flat lucide icons (cursor V, location pin, settings/wrench, paint bucket, trash with `0` counter, layers with `0` counter, more cubes)
- Floating mid-canvas: keyboard-shortcut hint card (`Set wall start / end | Shift Allow non-45° angles | Esc Cancel`) — shows their tooltip pattern
- Background: confirmed neutral dark `oklch(0.205 0 0)` ≈ `#171717`. No blue, no purple, no glow.

**Key insight:** The two-row action menu is one of Pascal's signature affordances. Top row is "what to add" (chunky 3D PNGs make them feel like physical objects), bottom row is "how to manipulate" (flat lucide for tools). Adopting this directly means commissioning ~10 isometric PNG icons.

### 02-scenes.png — scene index, light mode (default)

Even simpler than expected:
- Breadcrumb at top: `Home / Scenes`
- Bare-page hero: "**Your scenes**" h1 in heavy Barlow + "No scenes yet. Create one to get started." in muted Geist Sans
- Empty state card with dashed-border container: "You haven't saved any scenes yet." + a single "Create new scene" outlined button
- Bottom-right: floating circular FAB with stack icon (`rounded-full`, primary fill)

**Key insight:** Pascal's marketing/scene-list pages are **light mode by default** while the editor is dark. Both modes are first-class.

### 03-editor-1600.png — same as 01 but wider viewport

Confirms left sidebar holds steady at ~250px while canvas fills. The action menu stays floating at the bottom, not docked. Right side is empty by default — the right rail only appears when something is selected (different from our always-on PropertiesPanel).

### 04-privacy.png — typography sample

Clean light-mode page demonstrating Pascal's type hierarchy:
- **h1 "Privacy Policy"** — large display, heavy Barlow, ~36px
- "Effective Date: ..." caption — small muted Geist Sans
- **h2 "1. Introduction" / "2. Information We Collect"** — semibold Barlow ~24px
- **h3 "Account Information" / "Project Data"** — semibold ~18px
- Body — regular Geist Sans 16px, comfortable line-height
- Bullets — standard, no custom markers

Generous whitespace, ~700px max-width content column, centered.

---

## Updated migration take-aways from screenshots

1. **Adopt light + dark dual-mode from day 1.** Don't ship dark-only Pascal-styled then add light later — Pascal's chrome is built theme-aware, and our dark-only Obsidian is the reason we'd have to redo any naked color literals later.
2. **The chunky PNG icon set is a defining feature.** If we want to "look like Pascal" we need either (a) commissioned isometric PNG icons for our element types (Wall, Floor, Ceiling, Door, Window, Wall Art, Wainscoting, Crown Molding, Stair) or (b) a stylistic substitute (heavy lucide icons at 1.5x size with high contrast). Option (a) is the visceral hit.
3. **Floating two-row action menu replaces our top-left toolbar entirely.** This is the single biggest layout shift — and the most "Pascal-feeling" change. Consider doing this as its own phase so it can be reviewed/refined in isolation.
4. **Right sidebar should appear contextually**, not always-mounted. Empty selection = empty right side = canvas feels bigger. Our current PropertiesPanel is always there with empty-state copy; Pascal's only renders when something is selected.
5. **Marketing/empty pages stay light mode**, editor stays dark. WelcomeScreen + ProjectManager + scene index live in light. Editor-proper lives in dark.

---

*Audit completed: 2026-05-07. Source under `/tmp/pascal-editor` (shallow clone, gitignored). Live dev server captured before being killed.*
