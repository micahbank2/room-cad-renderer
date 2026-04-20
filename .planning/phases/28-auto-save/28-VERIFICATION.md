---
phase: 28-auto-save
verified: 2026-04-20T00:00:00Z
status: gaps_found
score: 5/6 must-haves verified
gaps:
  - truth: "Save failures surface SAVE_FAILED in the SAVE-04 surface (D-04, D-04a)"
    status: failed
    reason: "The store correctly transitions to saveStatus='failed' and persists (no auto-fade), but the toolbar's ToolbarSaveStatus component — the actual SAVE-04 surface rendered in the UI — does NOT handle the 'failed' branch. When status='failed', its conditional (isSaving=false, isSaved=false) falls through to render 'SAVED' text with text-text-ghost color. The SaveIndicator.tsx component that DOES render 'SAVE_FAILED' with text-error is orphaned — not imported anywhere in src/."
    artifacts:
      - path: "src/components/SaveIndicator.tsx"
        issue: "ORPHANED — exports default SaveIndicator with correct SAVE_FAILED branch, but no import found in src/. Grep for 'SaveIndicator' returns only its own definition."
      - path: "src/components/Toolbar.tsx"
        issue: "ToolbarSaveStatus (lines 169-200) — the visible SAVE-04 surface — only branches on isSaving / isSaved. The 'failed' status silently renders 'SAVED' text with ghost color instead of SAVE_FAILED with text-error."
    missing:
      - "Render SaveIndicator inside ToolbarSaveStatus OR add a 'failed' branch to ToolbarSaveStatus that displays SAVE_FAILED with text-error and an appropriate icon (e.g. error or cloud_off)."
      - "Add an integration test asserting the toolbar DOM contains SAVE_FAILED text when useProjectStore.saveStatus === 'failed' (store-state-only assertions missed the missing UI wiring)."
human_verification:
  - test: "SAVING→SAVED toolbar animation fidelity"
    expected: "Draw a wall; ToolbarSaveStatus transitions SAVING (accent-light, spinning progress_activity icon) → SAVED (success, cloud_done icon) → fades back to SAVED/idle. Obsidian-theme typography (font-mono, tracking-widest)."
    why_human: "Visual polish and animation timing cannot be asserted programmatically."
  - test: "Single save per continuous drag (no spam)"
    expected: "Open DevTools → Application → IndexedDB → keyval-store; drag a product continuously for 3+ seconds; observe exactly ONE write to the room-cad-project-* key at drag-end (plus one to room-cad-last-project)."
    why_human: "Simulating Fabric mouse-drag with accurate write-count observability in a unit test is fragile; DevTools network/storage log is the highest-fidelity check."
  - test: "Hard-refresh restores scene exactly"
    expected: "Draw a wall + place a product; wait for SAVED; hard-refresh (Cmd+Shift+R); canvas shows the identical wall + product without a WelcomeScreen flash."
    why_human: "End-to-end hydration spans IndexedDB + React mount + Fabric/Three viewports; visual identity of restored scene is perceptual."
  - test: "SAVE_FAILED persistence under IndexedDB block"
    expected: "DevTools → simulate IndexedDB quota/write failure; draw a wall; SAVE_FAILED persists (no fade); clear the block; draw another wall; successful save clears failed → SAVED → idle."
    why_human: "Requires runtime simulation of IndexedDB failure and observation over the fade window — NOTE: this test is currently BLOCKED by the gap above; even when the store flips to 'failed', the toolbar UI does not show SAVE_FAILED."
---

# Phase 28: Auto-Save Verification Report

**Phase Goal:** Jessica never loses work — the CAD scene saves itself within ~2s of any edit, drag doesn't spam saves, reload restores the scene exactly as left, the SAVING/SAVED indicator uses the v1.1 SAVE-04 surface (no new chrome).
**Verified:** 2026-04-20
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Draw wall + wait ~2s → SAVING then SAVED without manual action | ✓ VERIFIED | useAutoSave.ts lines 56-67 subscribes to cadStore; DEBOUNCE_MS=2000; setSaveStatus("saving") at 26 → saveProject → setSaveStatus("saved") at 40; FADE_MS=2000 at line 42-44 back to idle. Tested in tests/useAutoSave.test.ts (6 stubs green). |
| 2 | Continuous drag → exactly one save after drag ends (no spam) | ? HUMAN | Debounce timer resets on every store change (line 16 `if (timer) clearTimeout(timer)`). Unit test for drag-single-save is stubbed green, but drag-frame spam observability in IndexedDB is strongest via DevTools (see human_verification). |
| 3 | Reload restores scene exactly as left | ✓ VERIFIED | App.tsx lines 67-86: mount-time useEffect reads getLastProjectId() → loadProject() → cadStore.loadSnapshot() + projectStore.setActive() + setHasStarted(true); D-02a fall-through to WelcomeScreen on missing/stale/throw. LAST_PROJECT_KEY pointer written in useAutoSave.ts line 39 after successful saveProject. Tested in tests/App.restore.test.tsx (4 stubs green). Visual fidelity → human test. |
| 4 | SAVING/SAVED uses existing SAVE-04 surface (no new chrome) | ✓ VERIFIED | Toolbar.tsx line 122 renders `<ToolbarSaveStatus />`, defined inline at lines 169-200. No new toolbar elements, surface, or panels introduced. Phase 28 plans added no new JSX mount points outside this existing component. |
| 5 | Save failures surface SAVE_FAILED in SAVE-04 surface, no auto-fade (D-04, D-04a) | ✗ FAILED | Store side correct (useAutoSave.ts lines 45-51 catch block sets "failed", clears fadeTimer, schedules NO new fade). BUT the SAVE-04 surface (ToolbarSaveStatus) has no "failed" branch — status "failed" falls through to render "SAVED" text with ghost color. SaveIndicator.tsx (which DOES render SAVE_FAILED with text-error) is orphaned. See gap detail. |
| 6 | Project rename triggers auto-save (D-05) | ✓ VERIFIED | useAutoSave.ts lines 72-77: projectStore subscriber fires triggerDebouncedSave() when activeName changes on a stable non-null activeId (guards against clearActive and hydration/switch bleed — Pitfall 3). |

**Score:** 5/6 truths verified (1 failed, 0 uncertain → human verification deferred on 4 perceptual items)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useAutoSave.ts` | Debounce, dual-subscriber, try/catch with SAVE_FAILED, last-project pointer, fade-does-not-reschedule-on-failure | ✓ VERIFIED | All six invariants present. No uiStore import (Phase 25 drag fast-path preserved). Filter at lines 58-65 skips no-op store emissions. |
| `src/stores/projectStore.ts` | SaveStatus includes "failed" | ✓ VERIFIED | Line 3: `type SaveStatus = "idle" \| "saving" \| "saved" \| "failed";` |
| `src/components/SaveIndicator.tsx` | SAVE_FAILED branch with text-error token | ⚠️ ORPHANED | File exists (35 lines), SAVE_FAILED branch correct (lines 6-15, text-error), but component is not imported in src/. Grep for "SaveIndicator" returns only its own definition. |
| `src/App.tsx` | Mount-time silent restore via LAST_PROJECT_KEY + WelcomeScreen fallback | ✓ VERIFIED | Lines 67-86 implement full D-02 flow including D-02a fall-through. |
| `src/lib/serialization.ts` | LAST_PROJECT_KEY, setLastProjectId, getLastProjectId | ✓ VERIFIED | Lines 6-15 define the key + both helpers. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| cadStore mutations | useAutoSave.triggerDebouncedSave | useCADStore.subscribe | ✓ WIRED | Lines 56-67, called in App.tsx line 49. |
| projectStore rename | useAutoSave.triggerDebouncedSave | useProjectStore.subscribe | ✓ WIRED | Lines 72-77. |
| useAutoSave | saveProject + setLastProjectId | direct call | ✓ WIRED | Lines 29-39. |
| App mount | getLastProjectId + loadProject + loadSnapshot | useEffect | ✓ WIRED | Lines 67-86. |
| projectStore.saveStatus="failed" | User-visible SAVE_FAILED chip | ToolbarSaveStatus | ✗ NOT_WIRED | ToolbarSaveStatus (Toolbar.tsx:169-200) has no "failed" branch; SaveIndicator.tsx is the correct component but is not mounted anywhere. |
| Toolbar mount | ToolbarSaveStatus | JSX | ✓ WIRED | Toolbar.tsx line 122. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ToolbarSaveStatus | `status` | `useProjectStore((s) => s.saveStatus)` → set by useAutoSave | ✓ Real state | ⚠️ HOLLOW for "failed" — receives the correct state but renders "SAVED" for it |
| App silent restore | `project.snapshot` | `loadProject(lastId)` → IndexedDB via idb-keyval | ✓ Real data | ✓ FLOWING |
| useAutoSave save payload | `rooms, activeRoomId, customElements` | `useCADStore.getState()` | ✓ Real data | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite passes for phase | `npx vitest run tests/useAutoSave.test.ts tests/App.restore.test.tsx` | 10/10 green (per VALIDATION.md sign-off) | ✓ PASS |
| Typecheck clean | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Full suite | `npx vitest run` | 201 passed (6 pre-existing failures unrelated, 3 todo) | ✓ PASS |
| UI renders SAVE_FAILED when store.saveStatus='failed' | (would require RTL render of Toolbar + setSaveStatus('failed')) | No such test; manual DOM inspection of ToolbarSaveStatus shows no "failed" branch | ✗ FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SAVE-05 | 28-01 through 28-04 | Auto-save within ~2s, debounced against drag spam | ✓ SATISFIED | useAutoSave.ts debounce + subscribe pattern; App.tsx restore path; tests green. Drag-spam invariant → human DevTools check. |
| SAVE-06 | 28-01 through 28-04 | SAVING/SAVED in existing SAVE-04 surface | ⚠️ PARTIALLY SATISFIED | SAVING and SAVED branches are correctly wired to ToolbarSaveStatus. The SAVE_FAILED branch (part of the SAVE-04 surface per Phase 28 D-04 scope extension) is NOT rendered in the toolbar — SaveIndicator.tsx orphaned. |

**Orphaned requirements check:** REQUIREMENTS.md lines 81-82 map SAVE-05 and SAVE-06 to Phase 28; both are declared in plan frontmatter. No orphans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/SaveIndicator.tsx` | whole file | ORPHANED COMPONENT — exported default but no import anywhere in src/ | 🛑 Blocker | SAVE_FAILED never shows to Jessica; D-04a user-facing invariant silently broken. |
| `src/components/Toolbar.tsx` | 169-200 | `ToolbarSaveStatus` ignores "failed" status (falls through to "SAVED" branch) | 🛑 Blocker | Same impact as above — root cause of the orphaned SaveIndicator symptom. |
| `src/hooks/useAutoSave.ts` | 28 | `useCADStore.getState() as any` | ℹ️ Info | Type coercion for customElements access; not a correctness bug. |

### Human Verification Required

See `human_verification` in frontmatter. Four perceptual checks from plan's manual checkpoint. **Note:** item 4 (SAVE_FAILED persistence) is blocked by the gap above — even under a DevTools IndexedDB block, the toolbar will not display SAVE_FAILED until the UI wiring gap is closed.

### Gaps Summary

The store layer of Phase 28 is complete and correct: debounce, dual-subscriber, try/catch, last-project pointer, no-fade-on-failure, rename-triggered save, silent restore with fallback — all verified in code and tests. The typecheck is clean and 10/10 phase tests pass.

The single gap is in the **UI surface** for D-04/D-04a. `SaveIndicator.tsx` was created with the correct SAVE_FAILED rendering (text-error, no fade), but it was never imported or mounted — the actual SAVE-04 surface rendered in the toolbar (`ToolbarSaveStatus` in Toolbar.tsx) retains its original two-branch structure (saving vs. saved/idle) and silently renders "SAVED" when the store is in the "failed" state. Phase 28 tests assert store state only and missed the UI integration.

Fix is small: either render `<SaveIndicator />` inside `ToolbarSaveStatus` (or replace it), or add a `status === "failed"` branch to `ToolbarSaveStatus` mirroring SaveIndicator.tsx's text-error SAVE_FAILED output. Add a render-level test (RTL) that flips saveStatus to "failed" and asserts the DOM contains "SAVE_FAILED".

---

*Verified: 2026-04-20*
*Verifier: Claude (gsd-verifier)*
