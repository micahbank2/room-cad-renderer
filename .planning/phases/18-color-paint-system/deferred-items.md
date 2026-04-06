# Deferred Items — Phase 18

## Out-of-scope pre-existing issues discovered during 18-01 execution

### SidebarProductPicker drag test behavioral difference (happy-dom vs jsdom)

- **File:** `tests/SidebarProductPicker.test.tsx`
- **Test:** `dragstart sets effectAllowed to copy`
- **Issue:** The test asserts `dt.effectAllowed === 'copy'` after `fireEvent.dragStart`. Under jsdom, `dataTransfer.effectAllowed` was settable via event; under happy-dom it is not.
- **Why deferred:** This was a pre-existing issue. The entire test suite was broken before 18-01 (all tests failed with `ERR_REQUIRE_ASYNC_MODULE` under Node 24 + jsdom 29). Switching to happy-dom fixed the suite but exposed this behavioral difference.
- **Fix:** Either mock `dataTransfer` differently in the test setup or downgrade `@asamuzakjp/css-color` to a version compatible with Node 24 + jsdom CJS mode.
- **Impact:** 1 test fails. All other 114 tests pass.
