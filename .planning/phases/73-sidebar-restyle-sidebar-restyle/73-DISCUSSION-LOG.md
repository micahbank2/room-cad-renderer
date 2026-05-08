# Phase 73: Sidebar Restyle — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 73-sidebar-restyle
**Mode:** --auto (all decisions made automatically from recommended defaults + Pascal audit)
**Areas discussed:** Tree spine geometry, Contextual right panel, Left sidebar shell, Phase 48 saved camera, Driver registration

---

## Tree Spine Geometry

| Option | Description | Selected |
|--------|-------------|----------|
| Pascal verbatim | 1px `bg-border/50` at `left-[21px]`; branches 21px–32px; content at `pl-8` | ✓ |
| Tailwind indent only | Keep `pl-2/4/6` depth classes, add subtle left border | |
| No spine | Pure indentation, no connecting lines | |

**Auto-selected:** Pascal verbatim  
**Notes:** Pascal audit contains exact code snippets. Verbatim copy is fastest and most accurate.

---

## Contextual Right Panel

| Option | Description | Selected |
|--------|-------------|----------|
| AnimatePresence spring x-slide | Mount/unmount conditioned on selectedIds; x: 288→0 entry, 0→288 exit; SPRING_SNAPPY | ✓ |
| Always mounted, visibility toggle | `visibility: hidden` or `opacity: 0` when nothing selected | |
| Fade only (no slide) | opacity 0→1, no translate | |

**Auto-selected:** AnimatePresence spring x-slide  
**Notes:** Matches Pascal's right-rail behavior per audit. Frees canvas space when nothing selected. selectedIds already exists in uiStore — no new state.

---

## Panel Width

| Option | Description | Selected |
|--------|-------------|----------|
| w-72 (288px) | Slightly below Pascal's 320–400px; maximizes canvas | ✓ |
| w-80 (320px) | Bottom of Pascal's range | |
| w-96 (384px) | Mid-Pascal range; more comfortable for dense PropertiesPanel | |

**Auto-selected:** w-72 (288px)  
**Notes:** Adjustable during UAT if panels feel cramped. Canvas gets the extra 32–96px back.

---

## Claude's Discretion

- Internal padding/gap values within left sidebar
- Whether to use `layout` prop on canvas motion.div for smooth resize
- TreeRow icon sizing

## Deferred Ideas

- Sidebar tab strip (Layers / Settings) — Phase 75 or 76
- Right panel tab strip — Phase 75
- Left sidebar resize handle — v1.19
