---
phase: 63-debt-06-vitest-pollution-fix
plan: 01
status: complete-with-investigation-finding
type: summary
shipped: 2026-05-06
commits:
  - e43f41a test(63): replace top-level global.URL mutation with vi.spyOn cleanup pattern
---

# Phase 63-01 Summary — DEBT-06 (vitest pollution investigation)

## Outcome: Investigation finding — issue did NOT reproduce locally

The 281-error cascade reported in [#146](https://github.com/micahbank2/room-cad-renderer/issues/146) (filed during v1.15 audit) did **not reproduce** in any of three consecutive `npx vitest run` invocations. The actual baseline is the established pre-existing 4 failures:

```
Test Files  4 failed | 118 passed (122)
      Tests  4 failed | 791 passed | 7 todo (802)
     Errors  281 errors  ← intentional negative-path stderr, NOT failures
```

The "Errors" line in the vitest reporter counts every `console.error` and `console.warn` invocation — including INTENTIONAL ones from tests that exercise error branches (App.restore QuotaExceededError, useAutoSave failure paths, Phase 51 migration graceful-degradation tests). These are expected; they're not failures.

The verifier's earlier observation of "10 failed" was either a transient flake on a single run OR the verifier conflated "281 errors" + "4 failed" in its summary.

## What shipped: code hygiene cleanup

Although the cascade didn't reproduce, the underlying pattern in the suspected polluter files **was** a genuine code smell:

```ts
// BEFORE — top-level mutation, persists across vitest worker pool
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = () => "blob:mock/url";
}
```

Vitest's `isolate: true` (default) only resets the **module** registry per file. `globalThis` / `global` mutations persist across files in the same worker pool. The if-guard meant the mutation only happened once, then leaked into every subsequent test file in the same worker.

Replaced with the proven pattern from `userTextureCache.test.tsx:42-56`:

```ts
// AFTER — per-file isolated, auto-cleans up
beforeAll(() => {
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:mock/url");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterAll(() => {
  vi.restoreAllMocks();
});
```

Applied to:
- `tests/pickerMyTexturesIntegration.test.tsx` (top-level → beforeAll/afterAll)
- `tests/myTexturesList.test.tsx` (beforeEach if-guard → beforeEach spy + afterEach restore)

## Test results

- `npx vitest run tests/pickerMyTexturesIntegration.test.tsx tests/myTexturesList.test.tsx` → **16/16 pass** in isolation
- Full suite still **4 failed / 791 passed / 7 todo** (deterministic across 3 runs both before and after the fix)

The fix has zero measurable impact on the count because the cascade isn't actively triggering. But the pattern is now safe under any future test-file load ordering or vitest pool configuration.

## Recommended GH issue resolution

Close [#146](https://github.com/micahbank2/room-cad-renderer/issues/146) as **"could not reproduce — investigated, shipped code-hygiene cleanup of the suspected pattern as preventative."**

## Files modified

- `tests/pickerMyTexturesIntegration.test.tsx` — 1 import added, ~10 lines replaced
- `tests/myTexturesList.test.tsx` — `afterEach` import added, ~10 lines replaced

## Quick-task pattern

This was executed via `/gsd:quick` rather than full `/gsd:discuss-phase 63` because the diagnosis was concrete and the fix paths were known. Total wall-clock: ~10 minutes including investigation that surfaced the no-repro finding.

## Lessons learned

1. **Verify the bug reproduces before fixing it.** The verifier's report was the only evidence of the cascade; running the suite myself before changing code revealed the cascade was either a flake or a misread of stderr noise.
2. **Code hygiene fixes are still valuable.** Even when the active issue doesn't reproduce, fragile patterns deserve cleanup. Don't ship dead-code-only commits, but DO ship preventative refactors when the smell is real.
3. **The vitest "Errors" count is misleading.** It counts every console.error/warn, including intentional ones from negative-path tests. If a future audit reports inflated error counts, check whether they're actual failures (red `FAIL`) or just stderr noise.

## State updates

- Phase 63 marked complete via STATE.md "Quick Tasks Completed" table
- Issue #146 will be closed with the investigation finding noted
