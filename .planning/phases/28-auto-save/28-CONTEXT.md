# Phase 28: Auto-Save — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Make auto-save robust enough that Jessica never loses work in daily editing. The CAD scene saves itself within ~2s of any edit, drag operations don't cause save spam, and reloading the page drops her back into the exact scene she left. Uses the existing SAVE-04 toolbar surface (SAVING… / SAVED). No new chrome.

Explicit non-goals: cloud sync, multi-project background saving, manual save button changes, any new toolbar UI.
</domain>

<decisions>
## Implementation Decisions

### Scope framing
- **D-01:** Harden and extend the existing `src/hooks/useAutoSave.ts`. Do NOT rewrite. The hook already meets SAVE-05 happy path (2000ms debounce) and SAVE-06 (flips `projectStore.saveStatus` → drives `ToolbarSaveStatus`). Phase 28 work is verification + targeted gap-fills.

### Reload-restore UX
- **D-02:** On app launch, silently auto-load the last active project if one exists. Do not show WelcomeScreen in that case. Matches SAVE-05 success criterion #3 — "Reloading the page restores the scene exactly as left."
- **D-02a:** If the last-active project id is missing or the IndexedDB record fails to load, fall back to the current WelcomeScreen flow. Never surface a broken/empty canvas.
- **D-02b:** "Last active" is identified via a persisted pointer (e.g., an `idb-keyval` key like `room-cad-last-project`) written whenever `projectStore.activeId` is set. Researcher/planner to finalize the exact key name and where the write is wired.

### First-edit on unsaved scene
- **D-03:** Keep the current silent "Untitled Room" behavior. No prompts. Auto-save must happen "without any manual action." Rename remains available via ProjectManager.

### Save-failure handling
- **D-04:** On a `saveProject()` rejection, set `projectStore.saveStatus` to a new `"failed"` value. The existing SAVE-04 surface renders `SAVE_FAILED` in the error color. No retry, no backoff, no modal.
- **D-04a:** `SAVE_FAILED` stays visible until the next successful save clears it back to `saved` → `idle`. Do not auto-fade `SAVE_FAILED` on a timer — it must persist so Jessica sees it before closing the tab.
- **D-04b:** Log the underlying error to the console for debugging; do not surface error details in the UI.

### Save triggers — coverage
- **D-05:** Extend the subscribe filter so project **rename** (`projectStore.activeName` change while `activeId` is set) also triggers the debounced save path. All other mutations already flow through `rooms` / `activeRoomId` / `customElements` and are covered.
- **D-05a:** Undo/redo mutate `rooms` → already trigger save. No change needed.
- **D-05b:** `ui-store` state (active tool, selection, grid toggles, `gridSnap`) must NOT trigger save — these are session-scoped, not scene data.

### Claude's Discretion
- Exact mechanism for the "last project" pointer (separate idb-keyval key vs. updating a small "app-state" record) — planner picks.
- Whether the rename trigger uses a second `useProjectStore.subscribe` or a unified subscriber — planner picks.
- Whether `SAVE_FAILED` uses a new variant of `SaveIndicator` or a status-prop switch — implementation detail.
- Test harness for verifying "no save spam during drag" — planner can pick between fake timers + store-subscription spy, or an integration-style drag simulation.

### Folded Todos
(none)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source files (current auto-save machinery)
- `src/hooks/useAutoSave.ts` — existing debounced subscriber; the primary target of this phase
- `src/stores/projectStore.ts` — `saveStatus` state machine (`idle | saving | saved`); will add `failed`
- `src/lib/serialization.ts` — `saveProject` / `loadProject` IndexedDB CRUD; error surface for D-04
- `src/components/SaveIndicator.tsx` — inline status text; will render `SAVE_FAILED`
- `src/components/Toolbar.tsx` §`ToolbarSaveStatus` (~line 168) — the SAVE-04 surface referenced by SAVE-06
- `src/App.tsx` — `useAutoSave()` call site (~line 49) and the app-launch path that decides whether to show WelcomeScreen (target for D-02 silent restore)
- `src/components/WelcomeScreen.tsx` — the flow D-02 is bypassing on silent restore; must still be reachable via "New Project" and as a fallback for D-02a
- `src/stores/cadStore.ts` — source of the `rooms` / `activeRoomId` / `customElements` slices the subscriber watches

### Prior-phase specs & context
- `.planning/phases/08-home-save-tabs/08-PLAN.md` — SAVE-04 origin (v1.1 prominent save indicator)
- `.planning/phases/08-home-save-tabs/08-SUMMARY.md` — v1.1 save outcomes
- `.planning/phases/25-canvas-store-performance/` — PERF-01 drag fast-path; auto-save MUST NOT regress it
- `.planning/REQUIREMENTS.md` §Auto-Save — SAVE-05, SAVE-06 acceptance criteria
- `.planning/PROJECT.md` — "never lose work" principle, IndexedDB-only persistence, no backend

### External
- GitHub Issue [#44](https://github.com/micahbank2/room-cad-renderer/issues/44) — user-reported source for SAVE-05 / SAVE-06

No external ADRs — requirements fully captured in local planning docs and the decisions above.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useAutoSave.ts` — debounce + status transition already implemented; extend it, don't replace it.
- `projectStore.saveStatus` — existing state machine; add a `"failed"` case.
- `SaveIndicator` + `ToolbarSaveStatus` — rendering surface already in place; just needs a branch for `failed`.
- `saveProject` / `loadProject` in `src/lib/serialization.ts` — IndexedDB CRUD already production-safe; error path surfaces via the returned promise.
- `idb-keyval` is already a dependency — can be used directly for the "last-project" pointer without new deps.

### Established Patterns
- Zustand stores are the single source of truth; subscribers (not component state) drive side effects like save. Keep the auto-save hook as a subscriber, not a React render-derived effect.
- "Filter early, debounce later" is the pattern already in `useAutoSave` — preserve it to avoid save spam during tool activation / UI state changes.
- Phase 25 drag fast-path: store is NOT committed per drag frame — commit fires at drag-end. This is what makes debounce sufficient to prevent save spam. Any change to auto-save must preserve that assumption.
- All labels follow the obsidian CAD uppercase-underscore convention — use `SAVE_FAILED`, not `Save failed`.

### Integration Points
- **App launch**: `App.tsx` decides what to render first (WelcomeScreen vs. canvas). D-02 silent-restore logic lives here: on mount, check for a last-project pointer, try to load it, set cadStore + projectStore, skip WelcomeScreen on success.
- **Subscriber wiring**: `useAutoSave` currently subscribes to `useCADStore`. D-05 adds a subscription to `useProjectStore.activeName` (gated on `activeId` being non-null).
- **Failure path**: `useAutoSave` currently awaits `saveProject` without a try/catch. D-04 wraps it; on catch, `setSaveStatus("failed")` and skip the auto-fade timer.
- **Fade timer**: The current code clears `saveStatus` back to `"idle"` after `FADE_MS`. D-04a requires that timer is NOT scheduled when status is `"failed"`.

</code_context>

<specifics>
## Specific Ideas

- User framing: "Jessica never loses work." This is the north star — every ambiguity resolves toward data safety, not UX novelty.
- `SAVE_FAILED` uses the existing `text-error` / error color token — stays consistent with the obsidian CAD theme. No new tokens.
- Verification should explicitly include: drawing a wall → watching SAVING → SAVED; dragging a product for 3+ seconds → verifying exactly one save fires at drag-end (not per frame); hard refresh → verifying scene returns identical.

</specifics>

<deferred>
## Deferred Ideas

- **Cloud sync / multi-device persistence** — out of scope (PROJECT.md "no backend" principle). Would be its own milestone.
- **Manual save button changes** — SAVE-04 UI is locked; any redesign belongs in a future design-system pass.
- **Retry with backoff on save failure** — explicitly rejected for this phase (D-04). Revisit if telemetry ever shows transient failure patterns, which is unlikely for IndexedDB.
- **Recovery UI for corrupted project records** — D-02a says "fall back to WelcomeScreen." A richer "recovery / import last-known-good" flow would be a separate phase if data-loss incidents ever happen.
- **Project-name prompt on first save** — rejected (D-03). If `Untitled Room` becomes annoying in project lists, fix at the ProjectManager UX layer, not here.
- **Auto-save for `ui-store` state** (e.g., remembering last active tool across reloads) — deliberately out of scope. Session state, not scene state.

### Reviewed Todos (not folded)
(none)

</deferred>

---

*Phase: 28-auto-save*
*Context gathered: 2026-04-20*
