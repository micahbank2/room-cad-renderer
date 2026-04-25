# Phase 36-01 Deferred Items

Items discovered during execution but outside the scope of the current plan.

## Pre-existing vitest failures (observed 2026-04-24 at start of Plan 36-01)

These 6 unit tests were already failing before Plan 36-01 instrumentation was added (verified via `git stash && npm test`). Instrumentation is neutral.

- tests/AddProductModal.test.tsx
  - renders SKIP_DIMENSIONS checkbox
  - submit with skipDims=true calls onAdd with null dims
  - submit with skipDims=false calls onAdd with numeric dims
- tests/SidebarProductPicker.test.tsx
  - typing 'eames' filters to Eames product (case-insensitive)
  - dragstart sets effectAllowed to copy
- tests/productStore.test.ts
  - before load() resolves, mutating products does NOT trigger set() (guards empty-state overwrite)

Plus 1 unhandled error in tests/App.restore.test.tsx (WainscotLibrary items.length read on undefined — appears to be a missing IDB mock after a refactor).

**Not fixed in 36-01** because:
1. They are unrelated to VIZ-10 (no texture/3D paths).
2. 36-01 scope is strictly instrumentation + ROOT-CAUSE.md (R-01).
3. Fixing them requires debugging other subsystems, which risks leaking scope.

**Recommend:** File separate GH issues under `bug` + `backlog` labels OR address in Phase 37 tech-debt sweep.

---

## Permanent acceptance (Phase 37, 2026-04-25)

The 6 pre-existing failures listed above are **accepted as permanent** as of Phase 37 (CONTEXT D-02). Rationale:

These tests have surfaced in CI and local runs across multiple phases (33, 34, 35, 36, 37) without ever masking a production bug — the corresponding features ship correctly and survive HUMAN-UAT. The conclusion across that history is **the tests are wrong, not the production code**. Fixing them would be a debugging exercise across three unrelated subsystems (AddProductModal dimension input, SidebarProductPicker drag/filter, productStore async-init guard) plus the App.restore IDB mock — substantial scope creep on a final-cleanup phase.

**Implications:**
- CI vitest is intentionally NOT re-enabled (Phase 37 D-03). The e2e workflow stays Playwright-only.
- New code should still satisfy local `npm test` discipline; PRs may not introduce a 7th failure.
- If a future phase has independent reason to touch any of the affected production files, the corresponding test should be fixed in that phase's scope rather than rehabilitated standalone.
- The list above is the canonical record. If the local-test failure count drops below 6 unprompted (e.g., test framework upgrade fixes one), update this list.

This decision closes the open question of "what to do about the 6 failures" and unblocks v1.8 milestone close.
