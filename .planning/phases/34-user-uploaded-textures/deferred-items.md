# Phase 34 — Deferred Items (out-of-scope discoveries)

Pre-existing test failures observed while running the full suite during plan
34-03 execution. Each reproduces on the plan-34-02 baseline (without this
plan's changes) so they are NOT caused by Wave 3 work.

1. `tests/AddProductModal.test.tsx` — "renders SKIP_DIMENSIONS checkbox" (and
   two sibling cases). LIB-04 skip-dimensions UI test failing.
2. `tests/SidebarProductPicker.test.tsx` — "typing 'eames' filters..." and
   "dragstart sets effectAllowed". LIB-05 picker behavior.
3. `tests/productStore.test.ts` — "before load() resolves, mutating products
   does NOT trigger set()". LIB-03 load-guard.

These should be triaged into a phase 34/35 bug-sweep or a 999.x backlog entry
with an accompanying GH issue. Not fixed here — scope boundary per
execute-plan.md.
