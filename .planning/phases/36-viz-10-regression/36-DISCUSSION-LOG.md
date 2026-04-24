# Phase 36: Wallpaper/wallArt 2D↔3D Regression (VIZ-10) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 36-viz-10-regression
**Areas discussed:** Harness scope + location, Pixel-diff methodology, Root-cause discipline, Phase 32 code + CI guard

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Harness scope + location | Where Playwright lives (tests/e2e/ vs new playwright/ dir), dev-server vs prebuilt bundle, which scenarios to instrument | ✓ |
| Pixel-diff methodology | What "≤1% per 3D frame" means concretely — snapshot per cycle vs sequence, viewport + camera lock, diff tool | ✓ |
| Root-cause discipline | Enforce "ROOT-CAUSE.md before fix merges" as a hard gate vs allow one-line fixes if obvious | ✓ |
| Phase 32 code + CI guard | Keep/simplify Phase 32 defensive code AND how to run the retained harness in CI | ✓ |

**User's choice:** All four areas selected.

---

## Harness Scope + Location

User asked for plain-English explanation of all sub-decisions before deciding. After walkthrough, user directed "do all of your recommendations for each."

### Playwright directory

| Option | Description | Selected |
|--------|-------------|----------|
| `tests/e2e/` | Sibling to existing vitest `tests/` dir. One top-level test folder. | ✓ |
| `e2e/` (new root) | Top-level `e2e/` dir; strong separation. | |
| `src/__tests__/e2e/` | Nested inside src. Risk of runner confusion. | |

**User's choice:** `tests/e2e/` (Claude's recommendation).

### App boot

| Option | Description | Selected |
|--------|-------------|----------|
| Vite dev server | Fast iteration, HMR, sourcemaps. Best for investigation. | |
| Prebuilt bundle | Production-like; slower; catches minifier bugs. | |
| Both (dev + preview) | Two Playwright projects. | ✓ |

**User's choice:** Both — dev server for Plan 36-01 investigation, production-build project added for the retained CI guard in Plan 36-02.

### Surface scope

| Option | Description | Selected |
|--------|-------------|----------|
| Wallpaper on wall | Core VIZ-10 path. Required. | ✓ |
| wallArt on wall | Second VIZ-10 path. Required. | ✓ |
| Floor custom texture | Same code path; cheap addition. | ✓ |
| Ceiling custom texture | Same code path again. | ✓ |

**User's choice:** All 4 surfaces. Wallpaper + wallArt full 5-cycle test; floor + ceiling 2-cycle smoke test.

### Toggle cycles

| Option | Description | Selected |
|--------|-------------|----------|
| 5 cycles | Matches ROADMAP mandate. | ✓ |
| 3 cycles | Faster CI run. | |
| 10 cycles | Extra headroom. | |

**User's choice:** 5 cycles (ROADMAP-mandated, not actually a tradeoff).

**Notes:** User initially said "I don't understand what any of this means" — Claude pivoted to plain-English explanation, user then accepted all recommendations.

---

## Pixel-Diff Methodology

### Diff tool

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright `toHaveScreenshot()` | Built-in, zero deps, HTML report. | ✓ |
| `pixelmatch` library | More algorithm control; extra dependency. | |
| Custom byte-comparison | Manual loop; only for exotic needs. | |

**User's choice:** Playwright `toHaveScreenshot()`.

### Frame definition

| Option | Description | Selected |
|--------|-------------|----------|
| One screenshot per 2D→3D toggle | 5 screenshots per scenario. Matches bug signature. | ✓ |
| Sequence per 3D view | Multiple screenshots per mount; catches mid-view drift. | |

**User's choice:** One screenshot per 3D mount, taken after 200ms settle + zero pending rAF. 5 per scenario, all compared vs #1.

### Reproducibility locks

**User's choice:** Fixed 1280×720, `deviceScaleFactor: 1`, `window.__setTestCamera()` helper exposed in dev mode (mirrors Phase 31 convention). Camera pose set deterministically before each screenshot.

### Tolerance

| Option | Description | Selected |
|--------|-------------|----------|
| Strict (retries: 0 everywhere) | Fastest regression catch; risk of GPU-driver false positives in CI. | |
| Retry once in CI | Flake-resistant while preserving local strictness. | ✓ |

**User's choice:** `maxDiffPixelRatio: 0.01` (ROADMAP-exact). `retries: 1` in CI, `retries: 0` locally.

**Notes:** User directed "lock" after walkthrough.

---

## Root-Cause Discipline

### Plan structure

| Option | Description | Selected |
|--------|-------------|----------|
| Strict separation (2 plans, 2 PRs) | Plan 36-01 = harness + ROOT-CAUSE.md only (no fix); Plan 36-02 = fix. | ✓ |
| Soft separation (1 plan, 1 PR) | Ordered commits. One review. Easier to sneak a fix in early. | |

**User's choice:** Strict 2-plan split.

### ROOT-CAUSE.md content

**User's choice:** 4 required sections — (1) 4 Phase 32 candidate causes verbatim from 32-07-SUMMARY.md lines 36-43; (2) actual cause with harness evidence embedded inline; (3) ruling-out evidence for the other 3; (4) Phase 32 defensive-code redundancy classification.

### Fifth-cause fallback

**User's choice:** Add "Actual cause not previously considered" section with same evidence standard. Plan 36-01 does not merge without a named, evidenced cause.

### No-repro escalation

**User's choice:** Escalation decision written into ROOT-CAUSE.md itself. "Defensive code stays forever" is a valid outcome; silent "best guess" is not.

**Notes:** User directed "lock" after walkthrough.

---

## Phase 32 Code + CI Guard

### Defensive-code posture

| Option | Description | Selected |
|--------|-------------|----------|
| Keep ALL (belt + suspenders) | Zero regression risk. Confused future-you. | |
| Aggressively simplify | Clean codebase. Risk if ROOT-CAUSE.md is wrong. | |
| Case-by-case | Each of 3 pieces judged individually against ROOT-CAUSE.md evidence. | ✓ |

**User's choice:** Case-by-case, biased toward keeping. "Redundant" pieces deleted in Plan 36-02 with commit message citing ROOT-CAUSE.md section; "load-bearing" pieces kept with code comment linking back.

### CI cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Every PR | ~90s cost; catches regressions immediately. | ✓ |
| Path-filtered PRs | Faster for unrelated PRs; maintenance burden. | |
| Nightly cron | Zero PR-time cost; 24h regression blind spot. | |

**User's choice:** Every PR, no path filter.

### Headless/headed

**User's choice:** Headless in CI. Add `"test:e2e:debug": "playwright test --headed --debug"` npm script for local investigation.

### Browser matrix

| Option | Description | Selected |
|--------|-------------|----------|
| Chromium only | Fast, covers what most users run. | ✓ |
| Chromium + WebKit | Catches Safari WebGL driver bugs. | |
| All three | 3× CI cost, low marginal value. | |

**User's choice:** Chromium only. Revisit only if browser-specific regression surfaces.

**Notes:** User directed "lock" after walkthrough.

---

## Claude's Discretion

- Exact Playwright config file layout within locks above
- Naming of harness scenarios + test-helper file structure inside `tests/e2e/`
- `window.__setTestCamera()` implementation (API shape follows Phase 31 conventions)
- GitHub Actions workflow file name and job structure
- Whether harness uses `test.step()` or plain `await` sequences for lifecycle logging

## Deferred Ideas

- Firefox / WebKit browser matrix — deferred until a browser-specific regression surfaces
- Path-filtered CI — rejected (maintenance cost > 90s CI cost on single-dev project)
- Nightly cron harness — rejected (every-PR preferred)
- Broader visual-regression coverage (PBR presets, color wallpaper, paint) — out of scope; potential future phase
- Soft separation (single-PR, ordered commits) — rejected; too easy to sneak fix in early
- Sequence screenshots per 3D view — rejected; single-screenshot-per-mount matches bug signature
- Custom pixel-diff algorithm — rejected; Playwright built-in sufficient
