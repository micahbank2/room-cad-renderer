# Phase 72: Primitives Shelf — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 72-primitives-shelf
**Areas discussed:** Animation library, Component API surface, Migration scope, Underlying primitives
**Mode:** --auto (all decisions auto-selected with recommended defaults)

---

## Animation Library

| Option | Description | Selected |
|--------|-------------|----------|
| motion/react (framer-motion v11+) | Spring-based, tree-shakeable, React-native API | x |
| CSS transitions only | No dependency, limited to timing functions | |
| react-spring | Spring-based alternative, heavier API surface | |

**User's choice:** [auto] motion/react — per roadmap spec
**Notes:** Roadmap explicitly names "motion/react animations". Existing codebase uses CSS transitions only; this is the first spring animation dependency.

---

## Component API Surface

| Option | Description | Selected |
|--------|-------------|----------|
| cva + custom (shadcn-inspired) | Thin wrappers, forwardRef, cn() merge | x |
| Full shadcn/ui install | Copy-paste from shadcn registry | |
| Headless UI + custom styles | Headless primitives with Tailwind styling | |

**User's choice:** [auto] cva + custom — CLAUDE.md says "No shadcn/ui — custom component set only"
**Notes:** cva not currently in codebase. Introduces class-variance-authority + clsx + tailwind-merge.

---

## Migration Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Roadmap target (~30 buttons, ~5 tabs, ~5 panels) | Moderate, proves primitives work | x |
| Minimal (primitives only, no migration) | Fastest, but untested in real usage | |
| Full sweep (all sites) | Comprehensive but overlaps Phases 73-76 | |

**User's choice:** [auto] Roadmap target — matches success criteria exactly
**Notes:** Exact site list determined during planning via grep audit.

---

## Underlying Primitives (Radix vs Custom)

| Option | Description | Selected |
|--------|-------------|----------|
| Radix for Dialog/Popover/Tooltip, custom for rest | Best accessibility for complex overlays, lightweight for simple components | x |
| All custom | Full control, no dependencies | |
| All Radix | Consistent API, heavier bundle | |

**User's choice:** [auto] Hybrid — Radix for accessibility-critical overlays, custom for simple components
**Notes:** Dialog focus traps, Popover positioning, Tooltip delay/placement are hard to get right. Radix solves these with minimal API surface.

---

## Claude's Discretion

- Exact spring constants (stiffness/damping) within reasonable range
- asChild pattern vs direct render for Button
- Internal file organization within primitives
- Whether SegmentedControl/Switch need Radix or can be pure custom

## Deferred Ideas

None
