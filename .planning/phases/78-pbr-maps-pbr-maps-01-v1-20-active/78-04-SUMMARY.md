---
phase: 78-pbr-maps-pbr-maps-01-v1-20
plan: "04"
subsystem: material-library
tags: [pbr, material-card, badges, ui]
dependency_graph:
  requires: [78-01]
  provides: [PBR-04-visual-indicators]
  affects: [src/components/MaterialCard.tsx, src/types/material.ts]
tech_stack:
  added: []
  patterns: [MapBadge sub-component, conditional presence check, Pascal semantic tokens]
key_files:
  created:
    - tests/materialCardBadges.test.tsx
  modified:
    - src/components/MaterialCard.tsx
    - src/types/material.ts
decisions:
  - "text-[10px] arbitrary value used for sub-text badge label (smallest Pascal token text-sm=11px is slightly too tall for indicator row)"
  - "MapBadge defined as file-local unexported function (not a separate file) — single-use within MaterialCard"
metrics:
  duration_minutes: 8
  completed: "2026-05-08"
  tasks_completed: 1
  files_changed: 3
---

# Phase 78 Plan 04: MaterialCard Map-Presence Badges Summary

**One-liner:** PBR map presence badges (COLOR/ROUGH/REFL/AO/DISP) added to MaterialCard using Pascal semantic tokens and font-mono, with paint-Material guard preventing false COLOR badge.

## What Was Built

`MapBadge` sub-component added to `src/components/MaterialCard.tsx`. A badge row renders beneath the name + tile-size block, showing one pill per populated `*MapId` field. The COLOR badge is gated on `colorMapId` (not `colorHex`) so paint Materials correctly show 0 color badges even if optional AO/displacement maps are attached.

### Insertion Point

Lines 148-156 of `MaterialCard.tsx` — inside the `<div className="mt-2 flex flex-col gap-1">` container, after the tile-size `<span>`.

### MapBadge Definition

Located at the bottom of `MaterialCard.tsx` (after `export default`), lines 167-186. Marks classes: `font-mono text-[10px] px-1 py-0.5 rounded-smooth bg-accent/20 text-muted-foreground uppercase tracking-wide`. `data-testid="map-badge-{label-lowercase}"` for test assertions.

## Token Compliance

- `bg-accent/20` — Pascal semantic token (accent purple at 20% opacity)
- `text-muted-foreground` — Pascal semantic token
- `rounded-smooth` — Phase 71 squircle utility (D-13)
- `font-mono` — Geist Mono for data identifiers (D-10)
- No `bg-obsidian-*` or `text-text-*` leaks confirmed via grep

## Type Extension (Rule 3 — Auto-fix)

`src/types/material.ts` was missing `aoMapId` and `displacementMapId` fields added by Plan 78-01 in a parallel wave. Added both optional string fields (same pattern as `roughnessMapId`/`reflectionMapId`) to unblock badge rendering.

## Test Coverage

`tests/materialCardBadges.test.tsx` — 5 tests:
1. All 5 mapIds → 5 badges in order COLOR, ROUGH, REFL, AO, DISP
2. colorMapId only → 1 badge (COLOR)
3. Paint Material (colorHex, no colorMapId) → 0 badges
4. Paint Material with colorHex + aoMapId → AO badge only, no COLOR badge
5. Badge class list includes font-mono, bg-accent/20, text-muted-foreground, uppercase, rounded-smooth

All existing MaterialCard tests pass unchanged (11/11 total across both files).

## No Extra IDB Reads

Badge rendering is a pure synchronous truthiness check on `Material` fields. No `getUserTexture` calls, no async operations, no IDB reads introduced. The existing thumbnail `useEffect` (lines 52-71) is untouched.

## Phase-Level UAT

Open the Material Library after uploading a Material with all 5 map slots populated. Under the material name and tile size, 5 small badges should appear: COLOR, ROUGH, REFL, AO, DISP. A paint Material (flat color, no texture) should show 0 badges. A material with only a color map should show 1 badge (COLOR).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] aoMapId/displacementMapId missing from Material type**
- **Found during:** Task 1 implementation (Wave 1 dependency)
- **Issue:** Plan 78-01 adds these fields to `material.ts`; in this parallel worktree the fields were absent, causing TypeScript errors and badge render failures
- **Fix:** Added `aoMapId?: string` and `displacementMapId?: string` to `Material` interface in `src/types/material.ts`
- **Files modified:** `src/types/material.ts`
- **Commit:** 0bc2b55

## Self-Check: PASSED
