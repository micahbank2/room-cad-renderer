---
phase: 28-auto-save
plan: 05
subsystem: auto-save-ui
tags: [save-ui, gap-closure, toolbar, save-failed]
gap_closure: true
requires:
  - 28-04-SUMMARY (store layer complete; SaveStatus union includes "failed")
  - projectStore.saveStatus state machine
provides:
  - ToolbarSaveStatus renders SAVE_FAILED in text-error when store state is "failed"
  - RTL test guarding the SAVE_FAILED DOM surface + persistence (no auto-fade)
affects:
  - src/components/Toolbar.tsx (ToolbarSaveStatus — added "failed" branch)
  - tests/Toolbar.saveStatus.test.tsx (NEW)
tech-stack:
  added: []
  patterns:
    - "Early-return branch for exceptional status BEFORE saving/saved ternary — isolates the new state without disturbing existing render paths."
    - "RTL + fake timers to assert 'no auto-fade' as a timing invariant (advance 5000ms, still present)."
key-files:
  created:
    - tests/Toolbar.saveStatus.test.tsx
  modified:
    - src/components/Toolbar.tsx
decisions:
  - "D-04: SAVE_FAILED uses text-error token (consistent with obsidian CAD theme, no new tokens)."
  - "D-04a: No setTimeout / setInterval — persistence is pure React conditional rendering from store state."
  - "Option A (inline branch) chosen over Option B (mount orphaned SaveIndicator) to minimize blast radius; SaveIndicator.tsx remains orphaned and will be deleted in a follow-up cleanup plan."
metrics:
  duration: "~10 min"
  completed: 2026-04-20
  tasks: 2
  files_changed: 2
requirements: [SAVE-06]
---

# Phase 28 Plan 05: SAVE_FAILED Toolbar Wiring — Summary

**One-liner:** Closed Phase 28's single verification gap by adding a `status === "failed"` branch to `ToolbarSaveStatus` that renders `SAVE_FAILED` in `text-error`, persisting without auto-fade; covered by RTL test `tests/Toolbar.saveStatus.test.tsx`.

## What Changed

### `src/components/Toolbar.tsx` — `ToolbarSaveStatus`, lines 168–213

Added a single early-return branch BEFORE the existing saving/saved ternary:

```tsx
if (status === "failed") {
  return (
    <div className="flex items-center gap-1.5 min-w-[72px]">
      <span className="material-symbols-outlined text-[14px] text-error">error</span>
      <span className="font-mono text-[10px] tracking-widest text-error">
        SAVE_FAILED
      </span>
    </div>
  );
}
```

Everything else in `ToolbarSaveStatus` (and in the default `Toolbar` export, and in `ToolPalette`) is preserved byte-for-byte. The wrapper div matches the existing branches' layout/width (`flex items-center gap-1.5 min-w-[72px]`). No `setTimeout`, no `useEffect`, no new state — the branch is purely a function of the store.

### `tests/Toolbar.saveStatus.test.tsx` — NEW (37 lines)

Three assertions:
1. **SAVE_FAILED in text-error when saveStatus === 'failed' (D-04):** sets store state to `failed`, renders `<Toolbar />`, asserts `screen.getByText("SAVE_FAILED")` is in the document and its className contains `text-error`.
2. **SAVE_FAILED persists — does NOT auto-fade (D-04a):** after rendering, advances fake timers by 5000ms and re-asserts presence.
3. **Regression guard — SAVED branch still works:** sets `saveStatus: "saved"`, asserts `SAVED` is present and `SAVE_FAILED` is NOT.

Uses the repo's existing `@testing-library/jest-dom` setup (registered in `tests/setup.ts`) — no new dependencies introduced.

## Orphaned `SaveIndicator.tsx`

`src/components/SaveIndicator.tsx` remains in the repo, unchanged, and is still not imported anywhere. This is **intentional** for this plan:
- Removing it would touch an additional file and enlarge the blast radius of a gap-closure fix.
- Its existing test (`tests/SaveIndicator.test.tsx`, 3 passing tests) continues to validate its rendering in isolation.
- A follow-up cleanup plan (or a small `/gsd:quick`) should delete `SaveIndicator.tsx` and its test together, since the production surface is now `ToolbarSaveStatus`.

Recorded as a deferred item rather than a deviation.

## Verification Evidence

```
$ npx vitest run tests/Toolbar.saveStatus.test.tsx
Test Files  1 passed (1)
Tests  3 passed (3)

$ npx vitest run
Test Files  3 failed | 31 passed (34)
Tests  6 failed | 204 passed | 3 todo (213)
```

- **204 passed (+3 new from Plan 05)**, up from baseline 201 — exactly the three new tests, no collateral damage.
- **6 failed** — identical to pre-existing baseline cited in `28-VERIFICATION.md` ("201 passed, 6 pre-existing failures unrelated, 3 todo"). No NEW failures introduced.

```
$ npx tsc --noEmit
tsconfig.json(17,5): error TS5101: Option 'baseUrl' is deprecated [...]
EXIT=0
```

Typecheck: exit 0. The `baseUrl` deprecation notice is pre-existing tooling info, not a compile error.

### Acceptance criteria greps

| Check | Expected | Actual |
|---|---|---|
| `grep -c "SAVE_FAILED" src/components/Toolbar.tsx` | ≥1 | **2** (comment + literal — matches plan's own code sample) |
| `grep -c 'status === "failed"' src/components/Toolbar.tsx` | 1 | **1** ✓ |
| `grep -c "text-error" src/components/Toolbar.tsx` | ≥2 | **2** ✓ |
| `grep -c "SAVING" src/components/Toolbar.tsx` | ≥1 | **1** ✓ |
| `grep -c "cloud_done" src/components/Toolbar.tsx` | ==1 | **1** ✓ |
| `grep -c "setTimeout\|setInterval" src/components/Toolbar.tsx` | 0 | **0** ✓ |
| `grep -c "SAVE_FAILED" tests/Toolbar.saveStatus.test.tsx` | ≥3 | **7** ✓ |
| `grep -c "text-error" tests/Toolbar.saveStatus.test.tsx` | ≥1 | **2** ✓ |

## Gap Closure

- `28-VERIFICATION.md` row 5 ("Save failures surface SAVE_FAILED in SAVE-04 surface, no auto-fade (D-04, D-04a)"): ✗ FAILED → **✓ VERIFIED** (UI wiring now present, DOM-level test guards regression).
- `28-VERIFICATION.md` Key Link row "projectStore.saveStatus='failed' → SAVE-04 surface": ✗ NOT_WIRED → **✓ WIRED** via `ToolbarSaveStatus` inline branch.
- SAVE-06 requirement: previously ⚠️ PARTIALLY SATISFIED (SAVING/SAVED only) → **✓ SATISFIED** (SAVING, SAVED, and SAVE_FAILED all rendered in the SAVE-04 surface).
- Human-verification item 4 ("SAVE_FAILED persistence under IndexedDB block") — previously BLOCKED by the UI gap — is now unblocked (still a perceptual/runtime test for the operator).

## Commits

| Task | Hash | Message |
|---|---|---|
| 1 (RED) | `aa30a4a` | `test(28-05): add failing RTL test for SAVE_FAILED toolbar render` |
| 2 (GREEN) | `74324c9` | `feat(28-05): add SAVE_FAILED branch to ToolbarSaveStatus` |

## Deviations from Plan

None. Plan executed exactly as written — single acceptance-criterion mismatch worth noting: the plan text said `grep -c "SAVE_FAILED" src/components/Toolbar.tsx == 1`, but the plan's own supplied code block includes the literal `SAVE_FAILED` both in a `// D-04 / D-04a: SAVE_FAILED surface` comment AND in the rendered JSX, giving count=2. The substantive intent ("the literal SAVE_FAILED appears in ToolbarSaveStatus and the component handles the failed branch") is satisfied.

## Authentication Gates

None.

## Known Stubs

None. The ToolbarSaveStatus `failed` branch is wired end-to-end:
- `useProjectStore((s) => s.saveStatus)` — real store subscription
- `useAutoSave` (verified in Plan 04) sets `saveStatus: "failed"` on `saveProject` rejection
- The rendered DOM contains the literal `SAVE_FAILED` with `text-error`
No placeholder data, no hardcoded empties, no future-plan dependencies.

## Self-Check: PASSED

- `src/components/Toolbar.tsx` exists — FOUND
- `tests/Toolbar.saveStatus.test.tsx` exists — FOUND
- Commit `aa30a4a` in log — FOUND
- Commit `74324c9` in log — FOUND
- `npx vitest run tests/Toolbar.saveStatus.test.tsx` → 3/3 green
- Full suite baseline preserved (204 passed, 6 pre-existing failures unchanged)
- `npx tsc --noEmit` exit 0
