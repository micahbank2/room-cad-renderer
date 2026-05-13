# Phase 81 — Deferred Items

## Pre-existing test failures (not caused by Plan 81-01)

Observed at HEAD~1 (commit c724b71) BEFORE any 81-01 changes:
- `tests/SaveIndicator.test.tsx` — file-level fail
- `tests/SidebarProductPicker.test.tsx` — file-level fail
- `tests/pickerMyTexturesIntegration.test.tsx` — WebGL context error (`Error creating WebGL context` in jsdom)

These are environmental / pre-existing and out of scope for Phase 81. Tracked here so they don't get retro-attributed to this phase's PRs.

## Plan-spec drift (Rule 3 deviation, auto-resolved)

`81-01-PLAN.md` Task 1 `<verify>` block names `npm run typecheck && npm run lint` — neither script exists in `package.json` (only `dev`, `build`, `test`, `test:watch`, `test:quick`, `test:e2e`, `test:e2e:debug`, `preview`). Substituted `npm run build` (exercises tsc via Vite) + `npm run test:quick` per Task 2's verify command and baseline-comparison practice. No code regression — recorded as a documentation correction for future plans.
