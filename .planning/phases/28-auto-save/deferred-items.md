# Phase 28 Deferred Items

## Plan 03 discoveries (2026-04-20)

### tests/App.restore.test.tsx — WainscotLibrary unhandled error
**Found during:** Task 3 verification.
**Issue:** The test stubs `useWainscotStyleStore` to return `{ styles: [] }`, but `WainscotLibrary.tsx:167` reads `items.length`. When silent restore succeeds and the full app tree renders, this produces a `TypeError: Cannot read properties of undefined (reading 'length')` as an uncaught exception during render.
**Impact:** Test assertions still pass correctly (WelcomeScreen not visible, activeId set, loadProject called with right id). The exception is swallowed by React's error boundary fallback path.
**Scope:** Pre-existing test mock bug inherited from Plan 01. Not caused by Plan 03 changes. Fix belongs in a future test-infra pass — update the `useWainscotStyleStore` mock to return `{ items: [] }` (or whatever the real shape is).
