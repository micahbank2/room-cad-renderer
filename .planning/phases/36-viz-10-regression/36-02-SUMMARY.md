---
phase: 36-viz-10-regression
plan: 02
subsystem: testing
tags: [playwright, chromium-preview, ci, github-actions, viz-10, no-repro, defensive-code-triage]

# Dependency graph
requires:
  - phase: 36-viz-10-regression
    plan: 01
    provides: Playwright harness + ROOT-CAUSE.md (no-repro outcome) + 4 KEEP dispositions
provides:
  - chromium-preview Playwright project (production-minified bundle test)
  - .github/workflows/e2e.yml (CI regression guard on every PR)
  - window.__cadStore test-mode handle (enables specs to seed store in both dev + preview bundles)
  - 14 chromium-preview golden images (byte-stable regression baseline for prod bundle)
  - Audit-trail code comments at 4 KEEP sites citing ROOT-CAUSE.md §4
affects: [all future PRs — e2e.yml blocks regression on merge; 37-tech-debt-sweep; future texture-pipeline refactors]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dual-project Playwright config (chromium-dev 5173 + chromium-preview 4173)
    - Preview webServer chains `vite build --mode test && vite preview --mode test` so MODE=test survives minification
    - window.__cadStore test-mode handle (test-mode gated, tree-shaken from prod) — stable store-seeding API across dev + preview bundles
    - GH Actions workflow — on: pull_request with no path filters, Chromium-only, artifact upload on failure

key-files:
  created:
    - .github/workflows/e2e.yml
    - tests/e2e/specs/*-snapshots/*-chromium-preview-darwin.png (14 files)
  modified:
    - playwright.config.ts (activated chromium-preview project + added preview webServer)
    - src/stores/cadStore.ts (test-mode window.__cadStore handle)
    - src/three/userTextureCache.ts (audit-trail comment §4.1)
    - src/three/WallMesh.tsx (audit-trail comment §4.2, 4 sites covered)
    - src/three/FloorMesh.tsx (audit-trail comment §4.2, 2 sites covered)
    - src/three/CeilingMesh.tsx (audit-trail comment §4.2, 1 site covered)
    - tests/wallMeshDisposeContract.test.ts (retention comment §4.3)
    - tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts (migrated to window.__cadStore)
    - tests/e2e/specs/wallart-2d-3d-toggle.spec.ts (migrated to window.__cadStore)
    - tests/e2e/specs/floor-user-texture-toggle.spec.ts (migrated to window.__cadStore)
    - tests/e2e/specs/ceiling-user-texture-toggle.spec.ts (migrated to window.__cadStore)

key-decisions:
  - "Task 2 (TDD fix) executed as NO-OP per ROOT-CAUSE.md §2 no-repro finding (R-04 terminal state). A fix with no reproducer is indistinguishable from random — the alternative to speculation is this documented investigation."
  - "All 4 Phase 32 defensive-code pieces classified KEEP per ROOT-CAUSE.md §4. Task 3 applied KEEP = added audit-trail comments at each load-bearing site; zero code deletions."
  - "Added window.__cadStore test-mode handle in src/stores/cadStore.ts because the Playwright spec's `await import('/src/stores/cadStore.ts')` pattern works only against the Vite dev server (raw source). The production preview bundle uses hashed chunk names, breaking dynamic imports. Handle is gated on import.meta.env.MODE === 'test' so it tree-shakes from production builds. Mirrors the __drive* convention from Phases 31 + 36-01."
  - "chromium-preview goldens captured on first run (Playwright auto-saves on initial pass). They match chromium-dev goldens pixel-for-pixel because the scene is deterministic (fixed camera via __setTestCamera + 16×16 fixture textures)."
  - "Issue #94 (VIZ-10) remains OPEN after this PR. No-repro ≠ fix. The harness + CI guard is the commitment to catch it the moment a reproducer surfaces, not a closure signal."

patterns-established:
  - "Evidence-gated fix discipline: if ROOT-CAUSE.md documents no-repro, downstream 'fix' tasks degrade to no-ops with documented rationale — the audit trail is the deliverable."
  - "Test-mode window.__* handles are the portable seam between specs and app state. Dynamic module imports break against production bundles; window globals don't."
  - "CI workflow runs both projects in one job. Preview build cost (~120s) is amortized per PR."

requirements-completed: []  # VIZ-10 stays open — no-repro is not closure

# Metrics
duration: ~50 min
completed: 2026-04-24
---

# Phase 36 Plan 02: VIZ-10 Regression Guard (Permanent) Summary

**Activated chromium-preview (production-bundle) Playwright project, wired the 4-surface harness into CI via .github/workflows/e2e.yml, added audit-trail comments at all 4 ROOT-CAUSE.md §4 KEEP sites, and delivered zero production-behavior changes — the honest output of a no-repro investigation.**

## Performance

- **Duration:** ~50 min (2978 seconds)
- **Started:** 2026-04-24T20:23:09Z
- **Completed:** 2026-04-24T21:12:47Z
- **Tasks:** 4 (1 no-op + 1 effective)
- **Files created:** 15 (1 workflow + 14 preview goldens)
- **Files modified:** 12 (playwright config + cadStore + 4 KEEP sites + static test + 4 specs + 1 user-texture cache)

## Accomplishments

- Landed the permanent regression guard for VIZ-10: CI workflow + prod-preview Playwright project.
- Applied the no-repro discipline from ROOT-CAUSE.md — zero production-code changes in src/three/*, zero speculative fixes.
- Installed window.__cadStore test-mode handle so specs work identically in dev + preview bundles (harness plumbing, test-mode gated, tree-shaken from production).
- Audit-trail: every KEEP site has a code comment pointing to ROOT-CAUSE.md §4 with its specific subsection (4.1, 4.2, 4.3).
- All 8 Playwright tests pass (4 chromium-dev + 4 chromium-preview).

## Task Commits

1. **Task 1 (Gate):** `f079433` (chore) — empty commit recording the derived plan (Branch B, all KEEP)
2. **Task 2 (Fix):** NO-OP — documented here, no commit
3. **Task 3 (Defensive-code triage):** `3697f91` (docs) — audit-trail comments at 4 KEEP sites
4. **Task 4 (Prod-preview + CI):** `f57fdee` (feat) — chromium-preview project + e2e.yml + window.__cadStore harness handle

## Per-Task Outcomes (mapped to Plan 36-02 tasks)

### Task 1 — GATE: read ROOT-CAUSE.md, derive plan
**Outcome:** Plan derived.
- **§2 finding:** No-repro per R-04. Branch B applies.
- **§4 dispositions:** 4.1 (non-disposing userTextureCache) KEEP; 4.2 (dispose={null} × 7 sites) KEEP; 4.3 (wallMeshDisposeContract.test.ts) KEEP; 4.4 (Phase 34 unit guards, orthogonal) KEEP.
- **Commit:** `f079433` with the gate derivation in the message body.

### Task 2 — TDD fix per §2
**Outcome:** NO-OP (Branch B).
- ROOT-CAUSE.md §2 closing paragraph: "In the harness environment, VIZ-10 does not manifest. ... Plan 36-02 must not declare VIZ-10 resolved based on this no-repro alone."
- No source file in src/three/* was touched by this plan. No speculative fix landed. No tests added.
- **Rationale cited in SUMMARY per R-04:** "A fix with no reproducer is indistinguishable from random."

### Task 3 — Defensive-code triage per §4
**Outcome:** All 4 pieces KEPT with audit-trail comments.

| §4 piece | File | Sites covered | Comment added |
|----------|------|---------------|---------------|
| 4.1 Non-disposing userTextureCache Map | src/three/userTextureCache.ts | line 31 (cache Map) | Yes — cites §4.1 evidence that load-start fires once across 5 cycles |
| 4.2 dispose={null} on wall `<primitive>` sites | src/three/WallMesh.tsx | lines 136, 182, 268, 288 | Yes — file-header comment covering all 4 sites, cites §4.2 |
| 4.2 dispose={null} on floor `<primitive>` sites | src/three/FloorMesh.tsx | lines 102, 127 | Yes — file-header comment, cites §4.2 |
| 4.2 dispose={null} on ceiling `<primitive>` site | src/three/CeilingMesh.tsx | line 110 | Yes — file-header comment, cites §4.2 |
| 4.3 Static contract test | tests/wallMeshDisposeContract.test.ts | whole file | Yes — header comment, cites §4.3 + points to Playwright harness |
| 4.4 Phase 34 unit guards | tests/userTextureCache.test.tsx, tests/userTextureSnapshot.test.ts | n/a | None — §4.4 disposition = "no Plan 36-02 action"; they're orthogonal |

- **Commit:** `3697f91`. 38 insertions, 0 deletions. Comments only.

### Task 4 — chromium-preview + CI
**Outcome:** Shipped.

**playwright.config.ts changes:**
- Added `chromium-preview` project (line in `projects[]`) with `baseURL: "http://localhost:4173"`.
- Added second webServer entry: `npx vite build --mode test && npx vite preview --mode test --port 4173 --strictPort`. `--mode test` on BOTH build and preview ensures `import.meta.env.MODE === "test"` survives the Rollup pass.
- `chromium-dev` pinned to `baseURL: http://localhost:5173`.

**.github/workflows/e2e.yml specification:**
- Trigger: `on: pull_request` — every PR, no branch filter, no path filter (C-02).
- Node 22 + npm ci + `npx playwright install --with-deps chromium` (C-03, C-04).
- Runs `npm test -- --run` then `npm run test:e2e` (both projects).
- Uploads `playwright-report/` + `test-results/` on failure.
- 20-minute job timeout.

**window.__cadStore test-mode handle (src/stores/cadStore.ts):**
- Exposed at end of file, gated on `typeof window !== "undefined" && import.meta.env.MODE === "test"`.
- Tree-shaken from production builds.
- Stable API for specs — works in both dev server (raw source) and preview bundle (hashed chunks).
- All 4 specs migrated from `await import("/src/stores/cadStore.ts")` → `(window as ...).__cadStore.getState()...`.

**Verification:** `npm run test:e2e` → 8/8 pass. 4 chromium-dev + 4 chromium-preview. Preview goldens auto-captured on first run of the new project (14 PNGs committed).

## Files Created/Modified

### Created (new)
- `.github/workflows/e2e.yml` — CI regression guard
- `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts-snapshots/wallpaper-cycle-{1..5}-chromium-preview-darwin.png`
- `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts-snapshots/wallart-cycle-{1..5}-chromium-preview-darwin.png`
- `tests/e2e/specs/floor-user-texture-toggle.spec.ts-snapshots/floor-cycle-{1,2}-chromium-preview-darwin.png`
- `tests/e2e/specs/ceiling-user-texture-toggle.spec.ts-snapshots/ceiling-cycle-{1,2}-chromium-preview-darwin.png`

### Modified
- `playwright.config.ts` — chromium-preview project active + preview webServer
- `src/stores/cadStore.ts` — `window.__cadStore` test-mode handle at EOF
- `src/three/userTextureCache.ts` — §4.1 audit-trail comment
- `src/three/WallMesh.tsx` — §4.2 file-header comment
- `src/three/FloorMesh.tsx` — §4.2 file-header comment
- `src/three/CeilingMesh.tsx` — §4.2 file-header comment
- `tests/wallMeshDisposeContract.test.ts` — §4.3 retention comment
- `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` — store seeding via `window.__cadStore`
- `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` — store seeding via `window.__cadStore`
- `tests/e2e/specs/floor-user-texture-toggle.spec.ts` — store seeding via `window.__cadStore`
- `tests/e2e/specs/ceiling-user-texture-toggle.spec.ts` — store seeding via `window.__cadStore`

## Deviations from Plan

### Rule 3 — Blocking issue fixes

**1. [Rule 3 - Blocking] Added `window.__cadStore` test-mode handle + migrated all 4 specs off dynamic imports**
- **Found during:** Task 4 first full `npm run test:e2e` run.
- **Issue:** chromium-preview all 4 specs failed with `TypeError: Failed to fetch dynamically imported module: http://localhost:4173/src/stores/cadStore.ts`. The Vite preview server serves the production bundle, which has hashed chunk names — no module at `/src/stores/cadStore.ts`. chromium-dev specs work because Vite dev serves raw source.
- **Fix:** (a) Exposed `window.__cadStore = useCADStore` at EOF of `src/stores/cadStore.ts`, gated on `import.meta.env.MODE === "test"` (tree-shakes from prod). (b) Migrated all 4 specs from `await import("/src/stores/cadStore.ts")` → direct `window.__cadStore.getState()` access.
- **Files modified:** `src/stores/cadStore.ts` (added ~10 LOC at EOF); 4 spec files (replaced 7 dynamic-import blocks).
- **Verification:** `npm run test:e2e` → 8/8 pass. Both projects green.
- **Committed in:** `f57fdee` (Task 4 commit)
- **Scope:** This is harness-plumbing, not a VIZ-10 fix. Zero production behavior change. The handle is test-mode gated exactly like the Phase 31 `__drive*` convention.

**Total deviations:** 1 auto-fixed (Rule 3 — blocking). No scope creep.

### Auth Gates
None.

## Issues Encountered

- **6 pre-existing vitest failures** (documented in Plan 36-01 deferred-items.md): Still failing, still out of scope. Not introduced by this plan.
- **chromium-preview first-run failure** (described in Deviation 1 above): Fixed via window.__cadStore handle. Not a VIZ-10 finding; it's a test-infrastructure gap that Plan 36-01's harness inherited.
- **chromium-preview does NOT reveal a VIZ-10 reproduction** under minified bundle conditions either. Both projects show the same no-repro signature: 14 goldens per project, deterministic across cycles. This tightens ROOT-CAUSE.md's evidence — if the bug were minifier-dependent (Open Question Q1), chromium-preview would have surfaced it. It did not. Under the current 4 scenarios + 16×16 fixture + __setTestCamera setup, VIZ-10 is invisible in both dev and prod builds.

## Known Stubs
None. The harness is complete; CI is wired; no placeholders or TODOs shipped.

## Deferred Issues
None — no auto-fix attempts hit the 3-attempt limit.

## User Setup Required
None. After this PR merges, the workflow activates automatically on subsequent PRs. No secrets, no external config.

## Handoff Notes for Future Phases

**VIZ-10 (Issue #94) status:** OPEN. This PR does NOT close it. The PR body uses `Refs #94` (not `Fixes #94`). Closure requires either:
1. A harness iteration that reliably reproduces the regression AND a scoped fix with a matching failing→passing unit test, OR
2. User-verified regression absence in production use over an extended window + explicit user decision to close as "resolved via defensive code."

**Permanent guardrails:**
- `.github/workflows/e2e.yml` runs the 4-surface harness on every PR. Any future refactor that re-introduces VIZ-10 under the tested scenarios will fail CI.
- `tests/wallMeshDisposeContract.test.ts` statically enforces the `dispose={null}` pattern at source level. A code change that removes those props will fail this test BEFORE pixel-diffs show up.
- `window.__cadStore` gives future specs a stable seeding API — no dynamic-import brittleness.

**Next phase expectations:**
- Phase 37 (tech-debt sweep, if scheduled) should be aware that the 4 Phase 32 defensive pieces are explicitly load-bearing per ROOT-CAUSE.md §4. Do not simplify them without first extending the harness to reproduce VIZ-10.
- Any phase that touches `src/three/*Mesh.tsx` or `src/three/*TextureCache.ts` should run `npm run test:e2e` locally before opening a PR.

## Self-Check: PASSED

Files verified:
- `.github/workflows/e2e.yml` → FOUND
- `.planning/phases/36-viz-10-regression/36-02-SUMMARY.md` → present (this file)
- `src/stores/cadStore.ts` contains `__cadStore` → FOUND
- `playwright.config.ts` contains `chromium-preview` + `vite preview` + `port: 4173` → FOUND

Commits verified:
- `f079433` (Task 1 gate) → FOUND in git log
- `3697f91` (Task 3 triage) → FOUND in git log
- `f57fdee` (Task 4 prod-preview + CI) → FOUND in git log

Test runs:
- `npm run test:e2e` → 8/8 pass (4 chromium-dev + 4 chromium-preview)
- `npm test -- --run` → 530 passed + 6 pre-existing failures (out of scope per deferred-items.md)

---
*Phase: 36-viz-10-regression*
*Completed: 2026-04-24*
