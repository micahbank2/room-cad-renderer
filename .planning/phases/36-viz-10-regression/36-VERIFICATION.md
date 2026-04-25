---
phase: 36-viz-10-regression
verified: 2026-04-25T17:05:00Z
status: passed_with_carry_over
score: 8/8 e2e (4 surfaces × 2 projects) + ROOT-CAUSE.md authored + CI workflow live; VIZ-10 outcome no-repro per Branch B / R-04; GH #94 stays OPEN by design
re_verification:
  previous_status: none
  note: retroactively authored 2026-04-25 by Phase 38 (POLISH-01) — substitute evidence from SUMMARY + ROOT-CAUSE.md + e2e specs + .github/workflows/e2e.yml; closes v1.8 audit AUDIT-01 carry-over
---

# Phase 36: VIZ-10 Regression Investigation Verification Report

**Phase Goal:** Identify VIZ-10's root cause (uploaded-image wallpaper/wallArt vanishing on 2D↔3D toggle) via runtime instrumentation BEFORE proposing any fix, then ship a permanent regression guard.

**Verified:** 2026-04-25 (retroactive)
**Status:** passed_with_carry_over
**Re-verification:** Retroactive backfill — Phase 36 shipped 2026-04-24 (PRs #102 + #103) without a formal VERIFICATION.md. This report cross-references existing SUMMARY + ROOT-CAUSE.md + e2e specs + CI workflow per CONTEXT.md D-04.

## Context: passed_with_carry_over

Phase 36's plan explicitly anticipated two outcomes (R-04): Branch A (root cause identified → fix proposal) or Branch B (harness fails to reproduce → permanent regression guard + KEEP defensive code). The harness landed Branch B — same texture UUID across 5 mount cycles on all 4 surfaces, 14 goldens byte-identical. **This is a passed outcome of the planned process**, not a failed fix attempt. The carry-over: GH #94 (the original VIZ-10 bug report) stays OPEN by design — no-repro under harness ≠ verified fix in production.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Playwright harness installed with dual chromium projects (dev + preview) | VERIFIED | `playwright.config.ts` has `chromium-dev` (5173) + `chromium-preview` (4173); 36-01-SUMMARY.md install section |
| 2 | Test-mode lifecycle instrumentation in 4 cache modules + ThreeViewport | VERIFIED | `src/three/userTextureCache.ts`, `wallpaperTextureCache.ts`, `wallArtTextureCache.ts`, `ThreeViewport.tsx`; gated on `import.meta.env.MODE === "test"`; 36-01-SUMMARY.md instrumentation section |
| 3 | 4 surface E2E specs cover wallpaper / wallArt / floor / ceiling 2D↔3D toggle cycles | VERIFIED | `tests/e2e/specs/{wallpaper,wallart,floor,ceiling}-*-toggle.spec.ts` all present |
| 4 | Within-run pixel-diff via pixelmatch (cycle-N vs cycle-1 baseline) | VERIFIED | `tests/e2e/playwright-helpers/pixelDiff.ts`; uses `pixelmatch` + `pngjs`; 36-02 redesign commit `ea9564e` |
| 5 | Dual chromium-dev + chromium-preview validation (catches minifier-only bugs) | VERIFIED | All 4 specs run on both projects; 36-02-SUMMARY.md activation section |
| 6 | ROOT-CAUSE.md authored with no-repro outcome (Branch B per R-04) | VERIFIED | `.planning/phases/36-viz-10-regression/ROOT-CAUSE.md` §1 documents same `tex.uuid` (`818876d2-…`) across 5 mount cycles; 14 goldens byte-identical |
| 7 | Phase 32 defensive-code triage decisions documented (all KEEP) | VERIFIED | ROOT-CAUSE.md §4 — 4 pieces classified KEEP with audit-trail comments at sites (commit `3697f91`) |
| 8 | CI workflow runs harness on every PR via `.github/workflows/e2e.yml` | VERIFIED | Workflow file exists; runs Playwright (chromium-dev + chromium-preview) on `pull_request`; vitest step removed per Phase 36-02 fix `441aca0` |
| 9 | CI timeout bumped to 90s for heavy-cycle tests on Linux runners | VERIFIED | `playwright.config.ts` `timeout: process.env.CI ? 90_000 : 60_000`; commit `8993485` |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `playwright.config.ts` | Dual chromium projects + 90s CI timeout + dev (5173) + preview (4173) webServers | VERIFIED | All present per Phase 36-01/02 commits |
| `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` | 5-cycle wallpaper toggle | VERIFIED | Within-run pixel-diff (cycle-N vs cycle-1, ≤1% delta) |
| `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` | 5-cycle wallArt toggle | VERIFIED | Same pattern |
| `tests/e2e/specs/floor-user-texture-toggle.spec.ts` | 2-cycle floor smoke | VERIFIED | userTextureCache exercise |
| `tests/e2e/specs/ceiling-user-texture-toggle.spec.ts` | 2-cycle ceiling smoke | VERIFIED | userTextureCache exercise on CeilingMesh path |
| `tests/e2e/playwright-helpers/{setTestCamera,uploadTexture,toggleViewMode,settle,lifecycleEvents,setupPage,pixelDiff}.ts` | Helpers + pixel-diff util | VERIFIED | All present |
| `.planning/phases/36-viz-10-regression/ROOT-CAUSE.md` | Authoritative evidence document | VERIFIED | §1 outcome, §2 evidence, §3 cross-ref to Phase 32 candidates, §4 defensive-code triage |
| `.planning/phases/36-viz-10-regression/deferred-items.md` | Pre-existing failure inventory | VERIFIED | Lists 6 pre-existing vitest failures (later marked PERMANENT in Phase 37) |
| `.github/workflows/e2e.yml` | CI guard | VERIFIED | Runs Playwright on PR with artifact upload on failure |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| 4 cache modules + ThreeViewport | window.__textureLifecycleEvents | test-mode-gated useEffect installs | WIRED |
| E2E specs | __textureLifecycleEvents | `getLifecycleEvents(page)` helper | WIRED |
| E2E specs | window.__driveTextureUpload + __setTestCamera | helpers (Phase 31 + Phase 36 conventions) | WIRED |
| Specs | comparePng() pixel-diff | `tests/e2e/playwright-helpers/pixelDiff.ts` | WIRED |
| ROOT-CAUSE.md §4 KEEP decisions | Production code audit-trail comments | commit `3697f91` adds inline comments at userTextureCache, Wall/Floor/CeilingMesh, wallMeshDisposeContract.test.ts | WIRED |
| GitHub Actions | playwright.config.ts | `npx playwright test` invocation in `.github/workflows/e2e.yml` | WIRED |

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| E2E chromium-dev (4 surface specs) | `npm run test:e2e -- --grep "VIZ-10\|wallpaper\|wallart\|floor\|ceiling" --project=chromium-dev` | 4/4 pass | PASS |
| E2E chromium-preview (4 surface specs) | `npm run test:e2e -- --project=chromium-preview` | 4/4 pass on production-minified bundle | PASS |
| Within-run pixel-diff | `comparePng(actual, baseline)` for cycles 2..N — `mismatchRatio ≤ 0.01` | All cycles match cycle-1 within tolerance | PASS |
| Lifecycle event capture | `getLifecycleEvents(page)` after each spec dumps full event sequence | Events captured + logged in spec output | PASS |
| ROOT-CAUSE.md no-repro evidence | Same `tex.uuid` across 5 mount cycles | `818876d2-…` stable per ROOT-CAUSE.md §1 | PASS |
| CI green on Linux | GitHub Actions e2e.yml run on PR | All 8 tests pass (4 dev + 4 preview); ~5m runtime | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VIZ-10 | 36-01 (harness + ROOT-CAUSE) + 36-02 (CI + preview activation) | Uploaded wallpaper/wallArt survive 2D↔3D toggles; root cause identified before any fix | SATISFIED (with carry-over) | All 9 truths verified; ROOT-CAUSE.md documents Branch B no-repro per R-04; permanent regression guard via dual chromium projects + CI; defensive-code KEEP decisions applied. **Carry-over:** GH #94 stays OPEN by design (no-repro ≠ fix). |

No orphaned requirements. **No code fix shipped** — by plan design (R-04). The deliverable was instrumentation + evidence + permanent guard.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

- No production code changes in `src/three/*` cache modules beyond test-mode-gated instrumentation
- No speculative VIZ-10 fix landed (the whole point — saved a 4th attempt after 3 prior failed Phase 32 fixes)
- No committed pixel goldens (within-run comparison only — Phase 36-02 fix `ea9564e` removed darwin-coupled goldens after CI surfaced the platform-coupling bug)
- Phase 32 defensive code KEPT, not stripped (ROOT-CAUSE.md §4 disposition)

### Human Verification Required

If VIZ-10 ever surfaces in the wild (live-app reproduction outside the harness):
1. Reproduce in chromium-dev locally with the harness instrumented build
2. Capture lifecycle events + pixel-diff output
3. Update ROOT-CAUSE.md with new evidence; reopen the cause-identification branch
4. Issue #94 is the canonical tracking issue — do NOT close until live repro is fixed

### Gaps Summary

**Carry-over (by design):**
- GH #94 (VIZ-10) stays OPEN — no-repro under instrumented harness does not constitute a fix in the wild. Phase 36's deliverable was the permanent regression guard, not the fix.

**No other gaps.** All 9 observable truths verified. VIZ-10 requirement satisfied per its acceptance criteria (root cause investigated via runtime instrumentation BEFORE any fix; harness retained as regression guard).

### Phase 36-02 deviations (carried into this verification)

- **CI fix `441aca0`**: dropped vitest step from e2e workflow — harness is Playwright-only (vitest had 6 pre-existing failures, blocked CI inappropriately).
- **CI fix `ea9564e`**: redesigned specs to compare cycles within-run via pixelmatch — eliminated platform-coupled stored goldens (darwin vs linux mismatch broke first CI run).
- **CI fix `8993485`**: bumped CI timeout to 90s — GHA runners ~2x slower than local macOS for 5-cycle tests.

All 3 deviations are infrastructure-only, zero production impact, captured in commit history.

---

_Verified: 2026-04-25T17:05:00Z_
_Verifier: Claude (orchestrator-inline; Phase 38 POLISH-01 backfill)_
