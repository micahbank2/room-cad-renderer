---
phase: 68
slug: material-application-system-mat-apply-01
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 68 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `68-RESEARCH.md` (Validation Architecture section)

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x (unit/integration), Playwright (e2e) |
| **Config file** | `vite.config.ts` (vitest), `playwright.config.ts` |
| **Quick run command** | `npm run test -- --run src/stores/__tests__/cadStore.material.test.ts` |
| **Full suite command** | `npm run test -- --run && npm run test:e2e` |
| **Estimated runtime** | ~12s unit, ~90s e2e |

---

## Sampling Rate

- **After every task commit:** Run scoped vitest for the file(s) modified (e.g. `npm run test -- --run src/lib/snapshotMigration.test.ts`)
- **After every plan wave:** Run `npm run test -- --run` (full vitest)
- **Before `/gsd:verify-work`:** Full suite (vitest + playwright) must be green
- **Max feedback latency:** 15 seconds for unit, 120 seconds for e2e

---

## Per-Task Verification Map

> Filled in by gsd-planner during planning. One row per task. Every task must have either an automated verify command OR a Wave 0 dependency.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 68-XX-XX | XX | X | MAT-APPLY-01 | unit | TBD | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Test files / fixtures the planner expects to exist before later waves run. Wave 0 (test scaffolding) writes RED tests; subsequent waves turn them GREEN.

- [ ] `src/lib/__tests__/snapshotMigration.v6.test.ts` — RED tests for v5→v6 migration (paint→Material, wallpaper→Material, floor→Material, idempotency)
- [ ] `src/stores/__tests__/cadStore.material.test.ts` — RED tests for `applySurfaceMaterial` / `applySurfaceMaterialNoHistory` single-undo contract
- [ ] `src/lib/__tests__/materialResolver.test.ts` — RED tests for tile-size precedence (D-04: surface.scaleFt → material.tileSizeFt → 1ft default), PBR fallbacks (D-08)
- [ ] `src/components/__tests__/MaterialPicker.test.tsx` — RED tests for unified picker (open from PropertiesPanel, select Material, apply, close)
- [ ] `src/canvas/__tests__/fabricSync.materialFill.test.ts` — RED tests for 2D Fabric.Pattern texture-fill on walls/floors/ceilings
- [ ] `tests/e2e/material-apply.spec.ts` — RED e2e: select wall side → open picker → apply Material → verify 2D + 3D render → undo reverts → save/load round-trip

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3D material visual fidelity (texture tiling, color accuracy) | MAT-APPLY-01 SC#2 | Three.js render output is image-based; pixel-diff goldens are platform-coupled per project convention | Open dev server, apply a tile material to a floor, switch to 3D, confirm tiles appear at correct real-world size, no stretching, no z-fighting |
| Auto-migration of an existing v5 project file | MAT-APPLY-01 SC#4 | Requires a real saved v5 project from before phase 68 | Load a project saved in v1.16, confirm wall paint colors / wallpaper / floor materials still display identically to before, save, reload, confirm v6 snapshot persists |
| MaterialPicker UX feel (search, scroll, empty state) | MAT-APPLY-01 SC#1 | Subjective interaction quality | Open picker on a wall, scroll through materials, search by name, select one, confirm picker closes and material applies in <300ms |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (6 test files listed above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s for unit, < 120s for e2e
- [ ] `nyquist_compliant: true` set in frontmatter (after planner fills task map)

**Approval:** pending
