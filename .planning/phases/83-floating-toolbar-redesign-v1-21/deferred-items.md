
## Plan 83-02 deferred items

- **tests/SaveIndicator.test.tsx** — test file pre-existing failure, related to `src/lib/snapshotMigration.ts:2:1` import error. Not caused by Plan 83-02 (Snap migration didn't touch SaveIndicator or snapshotMigration).
- **tests/SidebarProductPicker.test.tsx** — same root cause; pre-existing failure. Not caused by Plan 83-02 (Sidebar.tsx changes were limited to removing the Snap PanelSection + dropping gridSnap selector imports).

Status: out of scope per Plan 83-02 scope-boundary rule. 1012 tests still pass on `gsd/phase-83-toolbar`; these 2 failures predate Wave 2.
