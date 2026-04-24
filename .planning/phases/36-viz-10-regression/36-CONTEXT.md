# Phase 36: Wallpaper/wallArt 2D↔3D Regression (VIZ-10) - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 36 identifies the root cause of the Phase 32 wallpaper/wallArt 2D↔3D view-toggle regression via runtime instrumentation BEFORE any fix lands, then fixes it with root-cause evidence on record. Deliverables: a Playwright instrumentation harness, a ROOT-CAUSE.md document with embedded harness evidence, a fix informed by that evidence, and retention of the harness as a CI regression guard. Requirement: VIZ-10.

New capabilities (camera presets, tech-debt sweep, texture-library features) are out of scope — they belong to Phases 35/37 or future milestones.

</domain>

<decisions>
## Implementation Decisions

### Harness Scope + Location (H)
- **H-01:** Playwright lives in `tests/e2e/`, sibling to existing vitest `tests/` dir. Single test cabinet — reduces folder sprawl.
- **H-02:** Two Playwright "projects" in `playwright.config.ts`: dev-server project for Plan 36-01 investigation (Vite HMR + sourcemaps); production-build (`vite build && vite preview`) project added when wiring the retained CI guard at end of Plan 36-02.
- **H-03:** Four surfaces exercised — wallpaper on wall + wallArt on wall get the full 5-cycle toggle scenario (required by ROADMAP success criterion). Floor + ceiling get a shorter 2-cycle smoke scenario (same `userTextureCache` / `dispose={null}` plumbing; cheap cache-regression guard).
- **H-04:** 5 toggle cycles per wallpaper/wallArt scenario — literal ROADMAP mandate, not a tradeoff.

### Pixel-Diff Methodology (D)
- **D-01:** Diff tool = Playwright's built-in `toHaveScreenshot()`. Zero extra dependencies; HTML report lands in CI artifacts; golden-image storage handled automatically.
- **D-02:** One screenshot per 3D mount, taken after a settle delay (200ms + await zero pending `requestAnimationFrame`). 5 screenshots per wallpaper/wallArt scenario; 2 per floor/ceiling smoke scenario. All compared against screenshot #1 of that scenario.
- **D-03:** Reproducibility locks — viewport fixed at 1280×720, `deviceScaleFactor: 1`, and a test-only `window.__setTestCamera()` helper exposed in dev mode (mirrors Phase 31 `window.__drive*` pattern, gated by `import.meta.env.MODE === "test"`). Each screenshot is preceded by a deterministic camera-pose set.
- **D-04:** Tolerance `maxDiffPixelRatio: 0.01` (≤1%, ROADMAP-exact). `retries: 1` when `process.env.CI` is truthy, `retries: 0` locally — guards against GPU-driver flake in CI without masking local regressions.

### Root-Cause Discipline (R)
- **R-01:** Strict 2-plan split with separate PRs. Plan 36-01 = harness + ROOT-CAUSE.md only; NO production code changes. Plan 36-02 = fix informed by Plan 36-01's findings. Enforced structurally — Plan 36-02 does not begin until Plan 36-01 PR merges.
- **R-02:** ROOT-CAUSE.md required sections:
  1. The 4 candidate causes from `.planning/phases/32-pbr-foundation/32-07-SUMMARY.md` lines 36-43 (HTMLImageElement WebGL context binding, meshStandardMaterial uniform re-link, ImageBitmap decode state, canvas sizing).
  2. The actual cause, with harness output embedded inline (not linked) — console logs, WebGL state dumps, screenshot timeline.
  3. Evidence ruling out each of the other 3 candidates.
  4. Which Phase 32 defensive code pieces become redundant (feeds C-01).
- **R-03:** Fifth-cause fallback — if the harness proves all 4 Phase 32 candidates wrong and reveals a 5th cause, a "Actual cause not previously considered" section is added with the same evidence standard. Plan 36-01 does not merge until *some* cause is named and evidenced.
- **R-04:** No-repro escalation — if the harness can't reproduce VIZ-10, the escalation decision is written into ROOT-CAUSE.md itself ("harness attempted X, could not reproduce, defensive code stays"). Honest "defensive code stays forever" is a valid outcome; silent "best guess" is not.

### Phase 32 Code + CI Guard (C)
- **C-01:** Phase 32 defensive code handled case-by-case, biased toward keeping. Each of the 3 pieces — non-disposing `userTextureCache` (`src/three/userTextureCache.ts`), `<primitive attach="map" dispose={null} />` at wall/floor/ceiling mesh render sites, and the static cache-contract regression test — is classified in ROOT-CAUSE.md as either "redundant" (deleted in Plan 36-02 with commit message citing the ROOT-CAUSE.md section) or "load-bearing" (kept, with a code comment pointing back to ROOT-CAUSE.md). No blanket delete, no blanket keep.
- **C-02:** Retained Playwright harness runs on **every PR** via GitHub Actions. No `paths:` filter — the ~90-second cost is cheaper than maintaining a path-filter list on a single-dev project, and VIZ-10-class bugs surface only at integration.
- **C-03:** CI uses headless Chromium. Local investigation gets a `"test:e2e:debug": "playwright test --headed --debug"` npm script for watching toggle cycles in a real browser window.
- **C-04:** Chromium-only browser matrix. Firefox and WebKit are out of scope — the tool is personal/local-first, not cross-browser SaaS. Revisit only if a specific browser-specific regression surfaces.

### Claude's Discretion
- Exact Playwright config file layout (projects, webServer definitions, reporter choices) — within locks above.
- Naming of harness scenarios, test-helper file structure inside `tests/e2e/`.
- Implementation details of `window.__setTestCamera()` helper (API shape) — follow Phase 31 test-driver conventions.
- GitHub Actions workflow file name and job structure — within "runs on every PR, Chromium headless" constraint.
- Whether the harness uses Playwright's `test.step()` or plain `await` sequences for lifecycle logging.

### Folded Todos
None — `gsd-tools todo match-phase` returned no backlog matches specific to Phase 36. VIZ-10 is its own requirement and has been tracked via ROADMAP phase 999.2 (now promoted into Phase 36 itself per STATE.md).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 32 Regression Context (Primary Evidence Base)
- `.planning/phases/32-pbr-foundation/32-07-SUMMARY.md` — 4 still-plausible candidate causes (lines 36-43), defensive code rationale (lines 19-22), R3F `dispose={null}` escape hatch reasoning
- `.planning/phases/32-pbr-foundation/32-07-PLAN.md` — original defensive-code plan for dispose={null} at mesh render sites
- `.planning/phases/32-pbr-foundation/32-06-SUMMARY.md` — non-disposing `userTextureCache` introduction (replaces refcount-disposing pattern)
- `.planning/phases/32-pbr-foundation/32-06-PLAN.md` — cache design rationale
- `.planning/phases/32-pbr-foundation/32-HUMAN-UAT.md` § VIZ-10 (lines 64-69) — exact reproduction steps and regression signature

### Phase 34 VIZ-10 Guards (Current Defensive State)
- `tests/userTextureCache.test.tsx:122-143` — "VIZ-10 guard: useUserTexture unmount does NOT dispose the texture" (unit-level cache-stability test; baseline contract the Playwright harness extends)
- `tests/userTextureSnapshot.test.ts` — "VIZ-10 regression guard — userTextureCache stability" describe block (cache survival + snapshot purity / LIB-08 zero `data:image` substrings)
- `src/three/userTextureCache.ts` — non-disposing cache module
- `src/three/WallMesh.tsx`, `src/three/FloorMesh.tsx`, `src/three/CeilingMesh.tsx` — `<primitive attach="map" object={tex} dispose={null} />` render sites

### Project + Roadmap
- `.planning/ROADMAP.md` §Phase 36 (lines 168-179) — goal, 5 success criteria, 2-plan estimate, sequencing constraint
- `.planning/REQUIREMENTS.md` §VIZ-10 — acceptance criteria
- `.planning/PROJECT.md` — Core value ("Jessica can see her future room… before spending money"), v1.8 milestone scope
- `.planning/STATE.md` — Phase 34 completion status, v1.8 roadmap decisions (split of legacy Phase 36 into 36/37), 999.2 → Phase 36 promotion

### Test Infrastructure
- `package.json` — existing vitest scripts (`test`, `test:watch`, `test:quick`); add `test:e2e` + `test:e2e:debug` in Plan 36-01
- `vitest.config.ts` — happy-dom + globals; do NOT let Playwright tests match vitest globs (Plan 36-01 adds exclude pattern for `tests/e2e/**`)
- `tests/setup.ts` — fake-indexeddb wiring (reference for test-mode env gating)

### Codebase Maps
- `.planning/codebase/TESTING.md` — test infra snapshot (NOTE: pre-Phase 34, incorrectly states "no test runner"; vitest is fully operational with 74+ test files)
- `.planning/codebase/STACK.md` — React 18 / R3F v8 / three.js v0.183.2 / Vite version constraints relevant to Playwright compatibility

### Convention References
- Phase 31 test drivers (`window.__driveResize`, `window.__drivePlacement`, etc.) — convention for `window.__setTestCamera()` API shape and `import.meta.env.MODE === "test"` gating

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`userTextureCache.ts`** (Phase 34) — non-disposing Map<id, Promise<THREE.Texture | null>>. Entry point `getUserTextureCached(id)`. Harness will instrument this module's internal state (cache size, entry identity across mounts) to answer "is the same texture instance returned after remount?"
- **`useUserTexture.ts` hook** — consumer of the cache; harness observes its mount/unmount lifecycle
- **Mesh render sites** (`WallMesh.tsx`, `FloorMesh.tsx`, `CeilingMesh.tsx`) — where `dispose={null}` is applied; where the VIZ-10 symptom manifests
- **Phase 31 `window.__drive*` pattern** — test-only globals gated by `import.meta.env.MODE === "test"`. Phase 36 reuses this convention for `window.__setTestCamera()` and any lifecycle-event taps (`window.__textureLifecycleEvents`)
- **Phase 34 unit-level VIZ-10 tests** — baseline for what the Playwright harness *must* catch (it must fail on any regression these tests catch, plus the integration-level regression they don't)

### Established Patterns
- **React 18 + R3F v8** — R3F's `dispose={null}` prop is the canonical escape hatch (Phase 32 rationale). Playwright does not change this contract.
- **Vite + happy-dom for unit tests** — Phase 36 does NOT replace vitest; Playwright is *additive*. Exclude pattern on `tests/e2e/**` keeps the two runners separate.
- **Data-URL-backed user textures** — `createObjectURL(blob)` from IndexedDB-stored Blobs. The VIZ-10 regression signature involves these specifically (not PBR preset textures, not color wallpaper). Harness must use a real uploaded image blob, not a static URL.
- **`import.meta.env.MODE === "test"` gating** — universal pattern for test-only globals. Playwright starts Vite in dev mode (not test mode) — Plan 36-01 must either (a) set `MODE=test` in the dev-server project, or (b) expose the camera helper unconditionally in dev and guard it in production. (Implementation detail — Claude's discretion.)

### Integration Points
- **GitHub Actions workflow** — `.github/workflows/*.yml` — new `e2e.yml` (or add `e2e` job to existing workflow) triggering on `pull_request` for all branches. Uses `npx playwright install --with-deps chromium` for first-run browser download.
- **`package.json` scripts** — add `test:e2e`, `test:e2e:debug`. Existing `test` (vitest) remains the default `npm test`.
- **`.gitignore`** — add `playwright-report/`, `test-results/`, `tests/e2e/**/*-snapshots/` if not already covered.
- **`vitest.config.ts` exclude** — add `tests/e2e/**` to `exclude` array so vitest does not attempt to run Playwright specs.

</code_context>

<specifics>
## Specific Ideas

- **Embed harness output inline in ROOT-CAUSE.md, not link** — a future reader (human or Claude) should be able to read ROOT-CAUSE.md standalone without fetching CI artifacts. This is the document's audit value.
- **"Honest no-repro is valid"** — user explicitly accepted that if the harness cannot reproduce VIZ-10, the correct outcome is documenting the failure and keeping defensive code forever. No "we give up, best guess" fixes.
- **`window.__setTestCamera()` naming** follows Phase 31 test-driver precedent (`window.__driveResize`, `window.__drivePlacement`). Downstream agents should not invent a different naming scheme.
- **The bug is data-URL-specific** — color wallpaper, PBR presets, and paint paths all work. The harness MUST use a real uploaded-image blob to reproduce (Base64 data URL from IndexedDB via `createObjectURL`). A bundled PNG imported via Vite's asset pipeline would miss the bug entirely.
- **Case-by-case defensive-code triage** — user rejected both "keep everything forever" and "aggressively simplify." Each of the 3 Phase 32 pieces gets individual evidence-based disposition in ROOT-CAUSE.md.

</specifics>

<deferred>
## Deferred Ideas

- **Firefox / WebKit browser matrix** — deferred (C-04). Revisit only if a browser-specific VIZ regression surfaces.
- **Path-filtered CI** — rejected (C-02). 90-second CI cost is cheaper than path-filter maintenance on a single-dev project.
- **Nightly cron harness runs** — rejected (C-02). Every-PR cadence catches regressions before they sit for 24 hours.
- **Visual-regression harness for NON-user-uploaded textures** (PBR presets, color wallpaper, paint) — out of scope; VIZ-10 is specifically the data-URL path. Broader visual-regression coverage is a potential future phase.
- **Soft separation (single-PR, ordered-commits)** for root-cause discipline — rejected (R-01). Too easy to land a fix with an afterthought document.
- **Sequence screenshots per 3D view** (multiple per mount) — rejected (D-02). Single-screenshot-per-mount matches the VIZ-10 bug signature; sequence-per-mount is overkill.
- **Custom pixel-diff algorithm** — rejected (D-01). Playwright's built-in is sufficient.

### Reviewed Todos (not folded)
None — `todo match-phase` returned no matches.

</deferred>

---

*Phase: 36-viz-10-regression*
*Context gathered: 2026-04-24*
