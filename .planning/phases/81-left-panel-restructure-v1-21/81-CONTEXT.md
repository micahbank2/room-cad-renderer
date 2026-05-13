# Phase 81 — Context

**Captured:** 2026-05-13
**Phase:** 81 — Left Panel Restructure
**Milestone:** v1.21 — Sidebar IA & Contextual Surfaces
**Issues closed:** #171 (IA-02), #172 (IA-03)
**Branch:** `gsd/phase-81-left-panel`

---

## What This Phase Does

Restructures the left sidebar into a Figma-style project-structure spine: Rooms tree pinned at top (expanded), all secondary panels collapsed-by-default with persistent state across reloads, and the Rooms tree gains hover-to-canvas-highlight + inline rename for the entities it contains.

This is the second of five v1.21 phases. Phase 80 produced the audit; Phase 81 ships the left-panel rebuild; Phases 82–84 will tackle the inspector, floating toolbar, and contextual visibility rules.

---

## Locked Decisions

### D-01 — Hidden state is transient

`uiStore.hiddenIds: Set<string>` is **NOT persisted**. Hiding a wall via the eye icon reverts to "visible" on reload. Hiding is a "right now" affordance — a per-session view filter — not a property of the entity. Matches the existing Phase 46 D-13 contract; Phase 81 reaffirms it.

Implication for plans: no migration of `hiddenIds` to localStorage/IDB. No code changes in the persistence layer for visibility.

### D-02 — Hover-glow is 2D-only in Phase 81

We add `hoveredEntityId: string | null` to `uiStore` and wire it through `fabricSync.ts` for a one-frame accent-purple outline on the matching wall/product/ceiling/custom-element/stair.

**3D hover wiring is deferred to Phase 82** (inspector rebuild — mesh outlines, raycasting). No `ThreeViewport` / `RoomGroup` / `WallMesh` changes in Phase 81. The IA-03 verifiable criterion explicitly says "2D canvas" — we don't expand scope.

### D-03 — Double-click = rename. Saved-camera moves to a camera-icon affordance

The Phase 48 saved-camera double-click binding is **REPLACED, not extended**. Going forward:

- **Double-click anywhere on a tree row** (label area) → inline rename via `InlineEditableText`.
- **Click the camera-icon affordance** next to the row → saved-camera focus (existing Phase 48 behavior, moved).

The camera-icon renders only for entity types that support saved cameras (walls, products, ceilings, custom elements, stairs — same set Phase 48 covered). The icon already exists in `TreeRow.tsx` L189–199 as a passive indicator (`data-saved-camera-indicator`); Plan 81-03 makes it interactive (`onClick`) and removes the dbl-click handler that used to fire saved-camera focus.

### D-04 — Walls get an optional `name?: string` field

`WallSegment` gains `name?: string` (max 40 chars). Behavior:

- Tree row renders `wall.name ?? wallCardinalLabel(wall, …)` (uses existing Phase 46 cardinal label helper).
- 2D dimension overlay continues to render the dimension value (length in feet+inches) — wall labels in the overlay use `wallCardinalLabel` ONLY when a name-aware label is needed; **the 2D length-label rendering at `dimensions.ts:drawWallDimension` is NOT changed** (it shows dimensions, not names — wall names live in the tree). The 2D dimension overlay is unchanged for Phase 81.
- On rename to empty string, the field is cleared (revert to default cardinal label).
- **Snapshot version bumps from 7 → 8.** Migration is a no-op: `name` is optional, so legacy v7 walls with no `name` field render the default label. `migrateV7ToV8` is a passthrough that flips the version number.

### D-05 — Snap dropdown stays in the sidebar

No move to FloatingToolbar in Phase 81. Phase 83 will handle that move as part of the floating-toolbar redesign. Plan 81-01 only sets `defaultOpen={false}` on the existing `sidebar-snap` PanelSection (already true today — no change required, just confirm).

---

## Phasing Boundaries

| Stays in Phase 81 | Defers to later phase |
|-------------------|----------------------|
| Persistent panel collapse state (IA-02) | Inspector rebuild — Phase 82 (IA-04, IA-05) |
| Rooms tree hover → 2D canvas highlight | Floating toolbar redesign — Phase 83 (IA-06, IA-07) |
| Inline rename via double-click | Contextual tool-bound surfaces — Phase 84 (IA-08) |
| Wall `name` field + schema v7→v8 bump | 3D hover-highlight wiring (Phase 82) |
| Saved-camera affordance migration (dbl-click → camera-icon click) | Snap → FloatingToolbar move (Phase 83) |

---

## Plan Decomposition

Three commit-shaped plans, executed sequentially (wave 1 → wave 2 → wave 3) so the shared `TreeRow.tsx` file changes don't conflict.

| Plan | Wave | Objective | Issue |
|------|------|-----------|-------|
| 81-01 | 1 | Persistent panel collapse state — flip all secondary panels to `defaultOpen={false}`, unify internal headers under shared `PanelSection`. | #171 (IA-02) |
| 81-02 | 2 | Tree-to-canvas hover highlight — add `hoveredEntityId` to uiStore, wire `onMouseEnter`/`onMouseLeave` on `TreeRow`, render outline in `fabricSync.ts` (2D only per D-02). | #172 (IA-03 hover) |
| 81-03 | 3 | Inline rename + `WallSegment.name` schema bump — replace dbl-click saved-camera with inline rename, move saved-camera to camera-icon click affordance per D-03, schema v7→v8. | #172 (IA-03 rename) |

---

## Out of Scope (Explicit)

- **3D hover wiring** — defer to Phase 82 per D-02.
- **Persisting `hiddenIds`** — explicitly transient per D-01.
- **Renaming products / ceilings / custom-elements / stairs via the tree** — products and custom elements already have `labelOverride` in PropertiesPanel; stairs already have `labelOverride`. The tree's dbl-click rename in Plan 81-03 covers walls (new `name` field), rooms (existing `renameRoom`), and the existing override-bearing types. Adding `Ceiling.labelOverride` is OPTIONAL within Plan 81-03 — if it lands cleanly, ship it; if it adds risk, defer to a later phase.
- **Snap dropdown move** — defer to Phase 83 per D-05.
- **Visual styling refinement of the tree** — Phase 46 already shipped the UI-SPEC; Phase 81 reuses it.

---

## Constraints from CLAUDE.md

- **D-09 (UI labels):** Tree row rename input + camera-icon button aria-labels must be mixed-case ("Rename North wall", "Focus saved camera on North wall"). UPPERCASE preserved only for dynamic CAD identifiers in the 2D overlay (which Phase 81 doesn't touch).
- **§7 (StrictMode-safe cleanup):** If Plan 81-02 or 81-03 installs any test driver (`window.__driveTreeHover`, `window.__driveTreeRename`), it MUST use the identity-check cleanup pattern. Phase 58 + 64 traps documented in CLAUDE.md.
- **PR-on-push:** Every push to `gsd/phase-81-left-panel` MUST be followed by `gh pr create` if no open PR exists. PR body MUST include `Closes #171` + `Closes #172`.
