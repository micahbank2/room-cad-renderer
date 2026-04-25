---
phase: 44-reduced-motion-sweep
plan: 01
subsystem: a11y
tags: [a11y, reduced-motion, polish, milestone-closer]
requirements: [A11Y-01]
dependency-graph:
  requires:
    - Phase 33 useReducedMotion hook
    - Phase 35 preset-tween reduced-motion path (model)
  provides:
    - Wall-side camera tween honors prefers-reduced-motion (snap directly, no useFrame lerp)
    - SAVING spinner honors prefers-reduced-motion (icon stays visible, rotation removed)
  affects:
    - none beyond declared files_modified
tech-stack:
  added: []
  patterns:
    - "Reduced-motion guard mirrors Phase 35 preset-tween path: never enter useFrame lerp"
    - "Spinner stays visible to preserve semantic meaning; only rotation suppressed"
key-files:
  created:
    - .planning/phases/44-reduced-motion-sweep/44-01-sweep-SUMMARY.md
  modified:
    - src/three/ThreeViewport.tsx (wall-side useEffect: prefersReducedMotion guard + dependency)
    - src/components/Toolbar.tsx (useReducedMotion import + conditional animate-spin class)
decisions:
  - All 6 CONTEXT decisions (D-01..D-06) honored as-written.
  - Snap guides verified during planning to NOT need a guard (render at static GUIDE_OPACITY = 0.6, instantly cleared/added — GH #76's 'fade in/out' claim was incorrect). Documented for future audits.
  - Hover transition-colors micro-transitions left as-is per industry convention (color, not motion).
deviations:
  - GH #76 closed with comment noting the snap-guides finding (issue body was partially incorrect).
  - Plan executed inline by orchestrator (no gsd-executor subagent). Phase scope (~10 lines of code) made inline efficient.
verification:
  manual:
    - Default-motion: trigger wall-side camera target (PropertiesPanel 'face wall side') → camera lerps as before
    - Reduced-motion (DevTools → Rendering → Emulate prefers-reduced-motion: reduce): same trigger → camera snaps directly, no lerp
    - Default-motion: any CAD edit + 2s wait → SAVING spinner rotates briefly
    - Reduced-motion: same trigger → spinner icon visible, no rotation; SAVED appears as before once save completes
  automated:
    - npx tsc --noEmit clean (only pre-existing baseUrl deprecation warning)
    - npm test full suite: 537 passed / 6 failed (pre-existing baseline) / 3 todo
  human-uat:
    - Visual smoke for both reduced-motion changes (one-time, after merge)
test-results:
  build: succeeds (verified via Vite HMR in preview server)
  typecheck: clean (1 pre-existing deprecation warning unrelated)
  unit: 537 passed / 6 failed (pre-existing baseline) / 3 todo
  e2e: not run (visual presentation changes; manual smoke sufficient)
  preview-bundle-loaded: yes (cleanly reloaded after both edits)
---

# Phase 44 Plan 01 — Reduced-Motion Sweep SUMMARY

## What shipped

| # | Commit | What |
|---|--------|------|
| 1 | `9b7260f` | Wall-side camera tween snaps directly when `prefersReducedMotion` is true; otherwise uses existing `cameraAnimTarget` lerp. |
| 2 | `0f41ebd` | SAVING spinner's `animate-spin` class is conditional on `useReducedMotion()`. Icon stays visible during SAVING; rotation only when motion is allowed. |

## What we explicitly did NOT change

**Snap guides (`src/canvas/snapGuides.ts`)** — GH #76's problem statement claimed "accent-purple snap guides fade in/out." Code scout during planning verified: snap guides render at static `GUIDE_OPACITY = 0.6` and are instantly added/cleared via `clearSnapGuides()` + add loop. **No animation exists; no guard needed.** Documented in CONTEXT D-03 + here so future audits don't flag the absence as a gap.

**Hover transition-colors micro-transitions** — Color-only Toolbar/button hover effects (e.g. `transition-colors duration-150`) stay as-is. Industry convention treats `prefers-reduced-motion` as scoped to position/scale/rotation animations. Disabling hover color fades would harm rather than help UX.

## Phase 35 parity achieved

Phase 35 preset tween was already guarded (Phase 33 D-39 discipline). v1.10 brings the older animation paths (wall-side camera lerp from MIC-35; SAVING spinner from Phase 28) to the same standard. v1.10 milestone now closed.

## Phase 44 status

Single plan, complete. v1.10 status: **2 of 2 phases complete.** Ready for `/gsd:audit-milestone v1.10` → `/gsd:complete-milestone v1.10`.

After v1.10 milestone close: `/gsd:new-milestone` for v1.11 Pascal Feature Set (already pre-committed in PROJECT.md + ROADMAP.md).
