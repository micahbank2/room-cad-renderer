---
phase: 28-auto-save
verified: 2026-04-20T17:09:00Z
status: human_needed
score: 6/6 must-haves verified (code); 4 perceptual items remain
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "Save failures surface SAVE_FAILED in the SAVE-04 surface (D-04, D-04a) — ToolbarSaveStatus now has a dedicated status === 'failed' branch rendering literal SAVE_FAILED in text-error with no setTimeout/auto-fade; covered by tests/Toolbar.saveStatus.test.tsx (3/3 green)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "SAVING→SAVED toolbar animation fidelity"
    expected: "Draw a wall; ToolbarSaveStatus transitions SAVING (accent-light, spinning progress_activity icon) → SAVED (success green, cloud_done icon) → fades back to ghost/idle. Obsidian-theme typography (font-mono, tracking-widest, 10px)."
    why_human: "Visual polish, animation timing, and token fidelity are perceptual and cannot be asserted programmatically."
  - test: "Single save per continuous drag (no spam)"
    expected: "Open DevTools → Application → IndexedDB → keyval-store; drag a product continuously for 3+ seconds; observe exactly ONE write to the room-cad-project-* key at drag-end (plus one to room-cad-last-project pointer)."
    why_human: "Simulating Fabric mouse-drag with accurate write-count observability in a unit test is fragile; DevTools storage log is the highest-fidelity check."
  - test: "Hard-refresh restores scene exactly"
    expected: "Draw a wall + place a product; wait for SAVED; hard-refresh (Cmd+Shift+R); canvas shows the identical wall + product without a WelcomeScreen flash."
    why_human: "End-to-end hydration spans IndexedDB + React mount + Fabric/Three viewports; visual identity of restored scene is perceptual."
  - test: "SAVE_FAILED persistence under IndexedDB block"
    expected: "DevTools → simulate IndexedDB quota/write failure; draw a wall; toolbar displays SAVE_FAILED in text-error and PERSISTS indefinitely (no fade) while block remains; clear the block; draw another wall; successful save transitions failed → SAVING → SAVED → idle."
    why_human: "Requires runtime simulation of IndexedDB failure and observation over a sustained window (>5s). Gap blocking this check from Phase 28 initial verification is now CLOSED — toolbar surface honors the 'failed' state."
---

# Phase 28: Auto-Save Verification Report (Re-Verification)

**Phase Goal:** Jessica never loses work — the CAD scene saves itself within ~2s of any edit, drag doesn't spam saves, reload restores the scene exactly as left, SAVING/SAVED indicator uses v1.1 SAVE-04 surface (no new chrome), save failures surface SAVE_FAILED without auto-fade.
**Verified:** 2026-04-20T17:09:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plan 28-05)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After ~2s post-edit, toolbar shows SAVING then SAVED (automatic) | ✓ VERIFIED | src/hooks/useAutoSave.ts: DEBOUNCE_MS=2000, setSaveStatus("saving") → saveProject → setSaveStatus("saved") with FADE_MS=2000 back to idle. Unit tests in tests/useAutoSave.test.ts green. Perceptual animation → human item #1. |
| 2 | Continuous drag produces exactly one save at mouse-up | ✓ VERIFIED (code) / ? HUMAN (behavior) | useAutoSave.ts timer reset on every store emission; only fires 2s after last mutation. DevTools storage-log count → human item #2. |
| 3 | Reload restores scene exactly as left | ✓ VERIFIED (code) / ? HUMAN (perceptual) | App.tsx mount-time useEffect: getLastProjectId() → loadProject() → cadStore.loadSnapshot() + projectStore.setActive(); D-02a WelcomeScreen fall-through. tests/App.restore.test.tsx 4/4 green. Visual fidelity → human item #3. |
| 4 | SAVE-04 surface reused (no new chrome) | ✓ VERIFIED | Toolbar.tsx:122 renders `<ToolbarSaveStatus />` inline (lines 169-213). No new toolbar elements, panels, or surfaces introduced. Phase 28 added only branch logic inside the pre-existing component. |
| 5 | SAVE_FAILED surfaces in SAVE-04 surface on failure, persists (no auto-fade) | ✓ VERIFIED (gap closed) | Toolbar.tsx:173-182 — dedicated `if (status === "failed")` branch renders literal "SAVE_FAILED" with text-error token and material `error` icon; NO setTimeout, NO fade scheduling anywhere in the branch. tests/Toolbar.saveStatus.test.tsx:23-29 asserts persistence after `vi.advanceTimersByTime(5000)`. Runtime IndexedDB-block observation → human item #4. |
| 6 | Project rename triggers auto-save | ✓ VERIFIED | useAutoSave.ts projectStore subscriber fires triggerDebouncedSave on activeName change (stable non-null activeId guard — Pitfall 3). |

**Score:** 6/6 truths verified on code. 4 perceptual items routed to human UAT.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useAutoSave.ts` | Debounce, dual-subscriber, try/catch with SAVE_FAILED, last-project pointer, no fade reschedule on failure | ✓ VERIFIED | All invariants preserved from initial verification. No regressions. |
| `src/stores/projectStore.ts` | SaveStatus includes "failed" | ✓ VERIFIED | `type SaveStatus = "idle" \| "saving" \| "saved" \| "failed"`. |
| `src/components/Toolbar.tsx` | ToolbarSaveStatus with saving / saved / **failed** branches, no auto-fade for failed | ✓ VERIFIED | Lines 169-213. The `status === "failed"` branch at 173-182 is a standalone early-return with no timer scheduling. Saved/idle/saving branches untouched (regression-guarded by test 3/3). |
| `tests/Toolbar.saveStatus.test.tsx` | RTL assertions: failed render, no-fade persistence, SAVED regression | ✓ VERIFIED | 3/3 green; asserts text-error class, persistence at +5000ms, and SAVED regression guard. |
| `src/App.tsx` | Mount-time silent restore via LAST_PROJECT_KEY + WelcomeScreen fallback | ✓ VERIFIED | Lines 67-86 implement D-02 with D-02a fall-through. |
| `src/lib/serialization.ts` | LAST_PROJECT_KEY + setLastProjectId + getLastProjectId | ✓ VERIFIED | Lines 6-15. |
| `src/components/SaveIndicator.tsx` | (Previously flagged as orphaned) | ℹ️ Non-blocking | Still present, still not imported. Functionality was re-implemented inline in Toolbar.tsx per the gap-closure design. Could be deleted as dead code, but non-blocking for phase 28 goal. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| cadStore mutations | useAutoSave.triggerDebouncedSave | useCADStore.subscribe | ✓ WIRED | App.tsx line 49. |
| projectStore rename | useAutoSave.triggerDebouncedSave | useProjectStore.subscribe | ✓ WIRED | useAutoSave.ts rename subscriber. |
| useAutoSave | saveProject + setLastProjectId | direct call | ✓ WIRED | |
| App mount | getLastProjectId + loadProject + loadSnapshot | useEffect | ✓ WIRED | |
| projectStore.saveStatus="failed" | User-visible SAVE_FAILED chip | ToolbarSaveStatus failed branch | ✓ WIRED (was NOT_WIRED) | Toolbar.tsx:173-182; asserted in RTL test 1/3. |
| Toolbar mount | ToolbarSaveStatus | JSX | ✓ WIRED | Toolbar.tsx:122. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ToolbarSaveStatus (failed) | `status` | `useProjectStore((s) => s.saveStatus)` set by useAutoSave catch block | ✓ Real state | ✓ FLOWING |
| ToolbarSaveStatus (saving/saved) | `status` | same | ✓ Real state | ✓ FLOWING |
| App silent restore | `project.snapshot` | `loadProject(lastId)` → IndexedDB via idb-keyval | ✓ Real data | ✓ FLOWING |
| useAutoSave save payload | `rooms, activeRoomId, customElements` | `useCADStore.getState()` | ✓ Real data | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Targeted SAVE_FAILED UI tests | `npx vitest run tests/Toolbar.saveStatus.test.tsx` | 3/3 passed (0.4s) | ✓ PASS |
| Typecheck clean | `npx tsc --noEmit` | exit 0 (only a pre-existing baseUrl deprecation warning) | ✓ PASS |
| Full suite sanity | `npx vitest run` (per user sign-off) | 204 passed / 6 pre-existing unrelated failures | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SAVE-05 | 28-01 … 28-04 | Auto-save within ~2s, debounced against drag spam, silent restore | ✓ SATISFIED | useAutoSave.ts + App.tsx restore path; all phase tests green. Drag-spam invariant → human item #2. |
| SAVE-06 | 28-01 … 28-05 | SAVING / SAVED / SAVE_FAILED in existing SAVE-04 surface | ✓ SATISFIED | All three branches now in ToolbarSaveStatus (Toolbar.tsx:169-213). RTL tests cover failed branch + persistence + SAVED regression. |

**Orphaned requirements check:** REQUIREMENTS.md maps SAVE-05 and SAVE-06 to Phase 28; both declared in plan frontmatter. No orphans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/SaveIndicator.tsx` | whole file | Dead code — still not imported after gap-closure re-implemented the logic inline in Toolbar.tsx | ℹ️ Info | Non-blocking for Phase 28 goal. Consider deletion in a future cleanup. |
| `src/hooks/useAutoSave.ts` | 28 | `useCADStore.getState() as any` | ℹ️ Info | Carried from initial verification; type coercion, not a correctness issue. |

No blocker or warning anti-patterns. No new TODOs, FIXMEs, placeholders, empty handlers, or hollow props introduced by plan 28-05.

### Human Verification Required

See `human_verification` in frontmatter. Four perceptual checks from plan's manual checkpoint. **Item #4 (SAVE_FAILED persistence under IndexedDB block) is now UNBLOCKED** — the toolbar surface honors the 'failed' state, so a DevTools-injected write failure will produce an observable SAVE_FAILED chip that the tester can watch for no-fade behavior.

### Gaps Summary

No gaps. The single gap from the initial verification (ToolbarSaveStatus missing a 'failed' branch, SaveIndicator.tsx orphaned) is CLOSED by plan 28-05, which added the dedicated `status === "failed"` branch directly in Toolbar.tsx:173-182 and shipped three RTL assertions covering render, no-fade persistence, and SAVED regression. Typecheck is clean and targeted tests are 3/3 green. Full suite is 204 passed with only pre-existing unrelated failures.

Phase 28 code is complete. Status is `human_needed` solely because four perceptual/runtime behaviors (animation fidelity, drag-storage write count, hard-refresh scene restore, IndexedDB-block SAVE_FAILED persistence) cannot be verified programmatically and require Jessica/Micah UAT in the browser.

---

*Verified: 2026-04-20T17:09:00Z*
*Verifier: Claude (gsd-verifier)*
