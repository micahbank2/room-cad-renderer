---
phase: 36
slug: viz-10-regression
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) + Playwright (Wave 0 installs) |
| **Config file** | `vitest.config.ts` (existing), `playwright.config.ts` (Wave 0 installs) |
| **Quick run command** | `npm run test -- --run` (vitest, non-watch) |
| **Full suite command** | `npm run test -- --run && npx playwright test` |
| **Estimated runtime** | ~90s (vitest ~30s + playwright E2E ~60s per dev/prod project) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run` (fast vitest check)
- **After every plan wave:** Run full suite — vitest + Playwright
- **Before `/gsd:verify-work`:** Full suite must be green on both dev and production Playwright projects
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

*Tasks finalized during planning — this table will be populated from PLAN.md task IDs.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 0 | VIZ-10 | e2e install | `npx playwright --version` | ❌ W0 | ⬜ pending |
| 36-01-02 | 01 | 1 | VIZ-10 | e2e | `npx playwright test tests/e2e/viz-10-wallpaper.spec.ts` | ❌ W0 | ⬜ pending |
| 36-01-03 | 01 | 1 | VIZ-10 | e2e | `npx playwright test tests/e2e/viz-10-wall-art.spec.ts` | ❌ W0 | ⬜ pending |
| 36-01-04 | 01 | 1 | VIZ-10 | e2e | `npx playwright test tests/e2e/viz-10-floor.spec.ts` | ❌ W0 | ⬜ pending |
| 36-01-05 | 01 | 1 | VIZ-10 | e2e | `npx playwright test tests/e2e/viz-10-ceiling.spec.ts` | ❌ W0 | ⬜ pending |
| 36-01-06 | 01 | 2 | VIZ-10 | doc | `test -f .planning/phases/36-viz-10-regression/ROOT-CAUSE.md` | ❌ W0 | ⬜ pending |
| 36-02-01 | 02 | 1 | VIZ-10 | e2e | Playwright 4-surface regression suite all green (5-cycle wallpaper/wallArt, 2-cycle floor/ceiling) | ❌ W0 | ⬜ pending |
| 36-02-02 | 02 | 1 | VIZ-10 | unit | Phase 32 defensive-code triage reflected in tests per ROOT-CAUSE.md decisions | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install `@playwright/test` + Chromium browser (`npx playwright install chromium`)
- [ ] Create `playwright.config.ts` with dual projects: `dev-server` (uses `npm run dev -- --mode test`) and `production` (uses `npm run build && npm run preview`)
- [ ] Create `tests/e2e/` directory with fixture images (small uploaded-texture PNGs for data-URL flow)
- [ ] Create `tests/e2e/helpers/camera.ts` exposing `window.__setTestCamera(pos, target)` gated by `import.meta.env.MODE === "test"`
- [ ] Create `tests/e2e/helpers/lifecycle-tap.ts` — texture load/bind/unbind/dispose event log via `window.__textureLifecycleEvents[]`, installed in 4 cache modules (`userTextureCache.ts`, `wallpaperTextureCache.ts`, `wallArtTextureCache.ts`, `useUserTexture.ts`)
- [ ] Update `vitest.config.ts` with `exclude: ["tests/e2e/**"]` so vitest does not pick up Playwright specs
- [ ] Add `.github/workflows/e2e.yml` — runs Playwright on every PR (Chromium-only, no path filters)

*All Wave 0 work lives in Plan 36-01 Wave 0 tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Human UAT: Jessica uploads real wallpaper + toggles views on actual hardware | VIZ-10 | Final confidence check before closing VIZ-10; Playwright runs headless Chromium, Jessica uses real browser with real images | After 36-02 merges: Open app locally, upload a wallpaper image, toggle 2D→3D→2D→3D five times, verify texture persists on every 3D mount |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (Playwright install, config, helpers, fixture images, CI workflow)
- [ ] No watch-mode flags (vitest runs with `--run`, Playwright is inherently non-watch in CI)
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
