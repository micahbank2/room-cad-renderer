# Phase 51 — Validation Map (DEBT-05)

Traces each DEBT-05 requirement to test file, assertion, and automated command.

---

## DEBT-05 Requirement

> Migrate legacy `FloorMaterial { kind: "custom", imageUrl: "data:..." }` to `{ kind: "user-texture", userTextureId }` on snapshot load via existing IDB pipeline. Bump version 2 → 3.
>
> **Acceptance:** One-time migration on `loadSnapshot()` rewrites legacy data-URL FloorMaterial entries. Saved JSON contains a `userTextureId` reference, NOT a `data:image/...` string. No data loss.

---

## Unit Tests — `tests/lib/snapshotMigration.floorMaterial.test.ts`

| # | Test name | DEBT-05 behavior verified | Automated command |
|---|-----------|--------------------------|-------------------|
| 1 | v2 snapshot with 1 legacy custom FloorMaterial → migrates to user-texture | Happy path: kind becomes "user-texture", userTextureId set, IDB has 1 entry | `npx vitest run tests/lib/snapshotMigration.floorMaterial.test.ts` |
| 2 | v2 snapshot with 0 legacy entries → no-op, version 3 | Migration does not corrupt clean v2 projects; no IDB writes | same |
| 3 | v3 snapshot input → passthrough, no IDB calls | Idempotency: already-migrated snapshots are never re-processed | same |
| 4 | Malformed data URL (no comma) → entry preserved, console.warn called, version 3 | Graceful degradation per D-03; no data corruption | same |
| 5 | Two FloorMaterials with identical data URLs → 1 IDB entry, both userTextureIds equal | SHA-256 dedup via saveUserTextureWithDedup (LIB-07) | same |
| 6 | IDB quota rejection → entry preserved as legacy, version still 3 | Quota-tolerant per D-03; entry stays as-is, version still advances | same |

**Run all 6:**
```bash
npx vitest run tests/lib/snapshotMigration.floorMaterial.test.ts
```
Expected: 6 passed, 0 failed.

---

## E2E Tests — `e2e/floor-material-migration.spec.ts`

| # | Test name | DEBT-05 behavior verified | Automated command |
|---|-----------|--------------------------|-------------------|
| 1 | v2 legacy FloorMaterial is rewritten to user-texture on loadSnapshot | End-to-end: store state after load has kind:"user-texture" + utex_ prefixed id | `npx playwright test e2e/floor-material-migration.spec.ts --project=chromium-dev` |
| 2 | saved project JSON contains no data:image/ string after migration | Acceptance criterion: JSON never contains embedded data URL | same |
| 3 | v2 snapshot with NO custom FloorMaterial loads correctly (no regression) | D-07: clean projects unaffected | same |

**Run all 3:**
```bash
npx playwright test e2e/floor-material-migration.spec.ts --project=chromium-dev
```
Expected: 3 passed, 0 failed.

---

## Regression Guards (D-07)

These existing specs must continue passing after Phase 51 changes:

| Spec | What it guards | Command |
|------|----------------|---------|
| `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` | Phase 32 LIB-06/07/08 user-texture upload + apply; Phase 36 VIZ-10 harness | `npx playwright test tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts --project=chromium-dev` |
| `e2e/wall-user-texture-first-apply.spec.ts` | Phase 49 BUG-02 wall texture first-apply fix | `npx playwright test e2e/wall-user-texture-first-apply.spec.ts --project=chromium-dev` |
| `tests/e2e/specs/floor-user-texture-toggle.spec.ts` | Floor user-texture apply + 2D↔3D persist | `npx playwright test tests/e2e/specs/floor-user-texture-toggle.spec.ts --project=chromium-dev` |
| `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` | Phase 50 BUG-03 wallArt persistence | `npx playwright test tests/e2e/specs/wallart-2d-3d-toggle.spec.ts --project=chromium-dev` |
| `tests/e2e/specs/ceiling-user-texture-toggle.spec.ts` | Ceiling user-texture | `npx playwright test tests/e2e/specs/ceiling-user-texture-toggle.spec.ts --project=chromium-dev` |
| `e2e/keyboard-shortcuts-overlay.spec.ts` | Phase 52 HOTKEY-01 (seedScene uses loadSnapshot) | `npx playwright test e2e/keyboard-shortcuts-overlay.spec.ts --project=chromium-dev` |

**Full e2e suite regression sweep:**
```bash
npx playwright test e2e/ --project=chromium-dev
```

---

## Vitest Regression Guard

Pre-existing vitest failure count must stay at 6:
```bash
npx vitest run 2>&1 | grep "Tests"
```
Expected output shape: `Tests  6 failed | N passed (M)`

The 6 pre-existing failures are unrelated to Phase 51. Any increase is a regression.

---

## TypeScript Compilation Gate

```bash
npx tsc --noEmit
```
Expected: exits 0. Any error is a blocker before merging.

---

## Caller Update Completeness Check

Verify all 23 loadSnapshot call sites were updated (no remaining `() => void` cast):
```bash
grep -rn "loadSnapshot" src/ e2e/ tests/ --include="*.ts" --include="*.tsx" | grep -v "Promise<void>" | grep -v "\.ts:" | head -20
```
Or more targeted — confirm no evaluate block has a sync callback calling loadSnapshot:
```bash
grep -n "loadSnapshot" e2e/*.spec.ts tests/e2e/**/*.spec.ts tests/e2e/playwright-helpers/*.ts 2>/dev/null | grep -v "async"
```
Expected: no output (all evaluate callbacks are async).

---

## Key Assertions Summary

| Assertion | Test | Passes when |
|-----------|------|-------------|
| `floorMaterial.kind === "user-texture"` | e2e #1, unit #1 | Migration ran successfully |
| `floorMaterial.userTextureId.startsWith("utex_")` | e2e #1, unit #1 | IDB write succeeded with correct prefix |
| `floorMaterial.imageUrl === undefined` | e2e #1 | Old field not carried forward |
| `JSON.stringify(rooms)` does not contain `"data:image/"` | e2e #2 | No embedded base64 survives to store state |
| `Blob([savedJSON]).size < 10_000` | e2e #2 | Size regression: rooms JSON stays small |
| `listUserTextures().length === 1` after two identical uploads | unit #5 | SHA-256 dedup works |
| `console.warn` called once on malformed URL | unit #4 | Error reporting per D-03 |
| snap.version === 3 in all migration paths | unit #1–6 | Version bump always happens |
| snap.version === 3 input → snap unchanged (=== reference) | unit #3 | v3 passthrough is a no-op |
