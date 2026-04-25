---
phase_number: 44
plan_number: 01
plan_name: sweep
phase_dir: .planning/phases/44-reduced-motion-sweep
objective: >
  Add reduced-motion guards to two animation sites that pre-date Phase 33's
  D-39 discipline: wall-side camera lerp in ThreeViewport.tsx (snap instead
  of lerp) and SAVING spinner in Toolbar.tsx (drop animate-spin). v1.10
  milestone closer.
requirements_addressed: [A11Y-01]
depends_on: []
wave: 1
autonomous: true
files_modified:
  - src/three/ThreeViewport.tsx
  - src/components/Toolbar.tsx
must_haves:
  truths:
    - "Wall-side camera tween: when prefersReducedMotion is true, camera snaps directly to camPos / lookAt instead of lerping via useFrame. Mirrors Phase 35 preset-tween reduced-motion path."
    - "SAVING spinner: animate-spin class applied conditionally based on useReducedMotion(). Spinner icon stays visible (semantic meaning preserved); rotation removed."
    - "Toolbar.tsx imports useReducedMotion (currently not imported)."
    - "GH #76 closed with PR-reference comment after PR merges. Closing comment notes: snap guides did not need a guard (already render instantly per audit)."
    - "npm run build succeeds; npx tsc --noEmit clean (pre-existing baseUrl warning ignored)"
    - "npm test full suite: 6 pre-existing failures unchanged, no new regressions"
---

# Phase 44 Plan 01 — Reduced-Motion Sweep

## Context

2 atomic code commits + 1 SUMMARY commit. All decisions locked in 44-CONTEXT.md (D-01..D-06).

---

## Task 1 — Wall-side camera lerp guard

**Read first:**
- `src/three/ThreeViewport.tsx` lines ~215-244 (the `useEffect([wallSideCameraTarget, walls, cameraMode])`)
- `src/three/ThreeViewport.tsx` Phase 35 preset-tween useEffect — model for the snap-instead-of-lerp branch
- `src/three/ThreeViewport.tsx` line 67 — `prefersReducedMotion` already destructured here

**Edit:** `src/three/ThreeViewport.tsx`

In the existing wall-side useEffect, when `prefersReducedMotion` is true, snap directly instead of populating `cameraAnimTarget.current`. Sketch:

```tsx
useEffect(() => {
  if (!wallSideCameraTarget || cameraMode !== "orbit") return;
  const wall = walls[wallSideCameraTarget.wallId];
  if (!wall) return;

  // ...existing camPos / lookAt computation stays the same...

  if (prefersReducedMotion) {
    // Phase 44 A11Y-01: snap instantly, mirroring Phase 35 preset-tween path.
    const ctrl = orbitControlsRef.current;
    if (ctrl?.object) {
      ctrl.object.position.copy(camPos);
      ctrl.target.copy(lookAt);
      ctrl.update();
    }
  } else {
    cameraAnimTarget.current = { pos: camPos, look: lookAt };
  }

  useUIStore.getState().clearWallSideCameraTarget();
}, [wallSideCameraTarget, walls, cameraMode, prefersReducedMotion]);
```

(Adjust to match the actual code's variable names + flow. Add `prefersReducedMotion` to the dependency array.)

**Acceptance:**
- TypeScript compiles
- Manual smoke (default motion): trigger wall-side camera target (likely via "face wall side" UI in PropertiesPanel) — camera lerps as before
- Manual smoke (reduced motion enabled): same trigger — camera snaps directly to wall-side pose, no lerp

**Commit:** `feat(44-01): wall-side camera snaps when prefers-reduced-motion (A11Y-01)

Wraps the existing wall-side useEffect cameraAnimTarget assignment in a
prefersReducedMotion guard. When reduced-motion is on, snap directly via
ctrl.object.position.copy() / ctrl.target.copy() — no useFrame lerp.
Mirrors Phase 35 preset-tween reduced-motion path. Refs #76.`

---

## Task 2 — SAVING spinner guard

**Read first:**
- `src/components/Toolbar.tsx:280` — `animate-spin` site
- `src/components/MyTexturesList.tsx:27,44` — existing `useReducedMotion` import + consumer pattern

**Edit:** `src/components/Toolbar.tsx`

(a) Add `useReducedMotion` import at the top of the file (mirror MyTexturesList.tsx:27 style).

(b) Inside `ToolbarSaveStatus` component (around line 259), call the hook: `const reducedMotion = useReducedMotion();`

(c) On line 280, conditionally apply `animate-spin`:

```tsx
<span
  className={`material-symbols-outlined text-[14px] text-accent-light ${
    reducedMotion ? "" : "animate-spin"
  }`}
>
  progress_activity
</span>
```

**Acceptance:**
- TypeScript compiles
- Manual smoke (default motion): trigger save (any CAD edit + 2s wait) — spinner rotates as before during SAVING state
- Manual smoke (reduced motion enabled): same trigger — spinner icon visible but does NOT rotate; SAVED still appears after save completes

**Commit:** `feat(44-01): SAVING spinner stops rotating when prefers-reduced-motion (A11Y-01)

Toolbar's progress_activity icon's animate-spin class is now conditional
on useReducedMotion(). Icon stays visible during the SAVING state (semantic
meaning preserved); rotation removed. Closes #76 (SAVING spinner half) +
wraps up A11Y-01.`

---

## Task 3 — SUMMARY + GH #76 close

**Edit:** `.planning/phases/44-reduced-motion-sweep/44-01-sweep-SUMMARY.md` (new)

Standard SUMMARY.md format. Note explicitly:
- 2 sites guarded; snap guides verified to NOT need a guard (already render instantly — GH #76 problem-statement inaccuracy)
- Phase 35 preset tween was already guarded (D-39 discipline) — Phase 44 brings older paths to parity

**Close GH #76:**

```bash
gh issue close 76 --comment "Shipped in **Phase 44 (v1.10 milestone)** —
- Wall-side camera tween (ThreeViewport.tsx) snaps directly when prefers-reduced-motion is enabled, instead of lerping via useFrame
- SAVING spinner (Toolbar.tsx) drops animate-spin class when reduced-motion is enabled; icon stays visible

Snap guides (snapGuides.ts) verified to NOT need a guard — they render at static opacity and are instantly added/cleared, so 'fade in/out' from the issue body did not match actual behavior.

Phase 35 camera presets were already guarded (Phase 33 D-39 discipline). Phase 44 brings the older animation paths to parity. PR <#-this-PR>."
```

**Acceptance:**
- SUMMARY.md created at `.planning/phases/44-reduced-motion-sweep/44-01-sweep-SUMMARY.md`
- STATE.md + ROADMAP.md updated (44: 0/0 → 1/1 Complete)
- GH #76 closed with PR-reference comment

**Commit:** `docs(44-01): complete reduced-motion sweep SUMMARY + state updates

Closes #76. Phase 44 ships 2 reduced-motion guards (wall-side camera +
SAVING spinner) and documents that snap guides did not need a guard
(verified during planning). v1.10 milestone closer.

After this commit: /gsd:audit-milestone v1.10 → /gsd:complete-milestone v1.10.`

---

## Plan-level acceptance criteria

- [ ] All 3 tasks executed and committed atomically
- [ ] `npx tsc --noEmit` clean
- [ ] `npm test` full suite: 6 pre-existing failures unchanged, no new regressions
- [ ] Manual smoke for both code changes (default-motion + reduced-motion)
- [ ] GH #76 CLOSED with PR-reference comment
- [ ] SUMMARY.md created
- [ ] STATE.md + ROADMAP.md updated

---

*Plan: 44-01-sweep*
*Author: orchestrator-inline (CONTEXT.md fully prescriptive)*
