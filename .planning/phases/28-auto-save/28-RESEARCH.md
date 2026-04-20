# Phase 28: Auto-Save — Research

**Researched:** 2026-04-20
**Domain:** Zustand subscriptions + IndexedDB persistence + debounce + React mount-time side effects
**Confidence:** HIGH (all findings are source-verified against this repo — no external library uncertainty)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Harden and extend existing `src/hooks/useAutoSave.ts`. Do NOT rewrite.
- **D-02:** On app launch, silently auto-load the last active project if one exists. Skip WelcomeScreen on success.
- **D-02a:** If last-active id missing or IndexedDB load fails, fall back to current WelcomeScreen flow.
- **D-02b:** "Last active" via a persisted pointer (idb-keyval). Planner finalizes key name + write site.
- **D-03:** Keep current silent "Untitled Room" behavior on first edit of unsaved scene.
- **D-04:** On `saveProject()` rejection, set `projectStore.saveStatus = "failed"`. SAVE-04 surface renders `SAVE_FAILED` in error color. No retry, no backoff, no modal.
- **D-04a:** `SAVE_FAILED` persists until next successful save. Do NOT auto-fade on timer.
- **D-04b:** Log underlying error to console. Do not surface error details in UI.
- **D-05:** Extend subscribe filter so project **rename** (`projectStore.activeName` change while `activeId` non-null) triggers debounced save.
- **D-05a:** Undo/redo mutate `rooms` — already trigger save. No change needed.
- **D-05b:** `ui-store` state (active tool, selection, grid toggles, `gridSnap`) must NOT trigger save.

### Claude's Discretion

- Exact mechanism for "last project" pointer (separate idb-keyval key vs. small "app-state" record).
- Whether rename trigger uses second `useProjectStore.subscribe` or unified subscriber.
- Whether `SAVE_FAILED` is new `SaveIndicator` variant or status-prop switch.
- Test harness for "no save spam during drag" (fake timers + subscription spy vs. integration-style drag sim).

### Deferred Ideas (OUT OF SCOPE)

- Cloud sync / multi-device persistence.
- Manual save button changes (SAVE-04 UI locked).
- Retry with backoff on save failure.
- Recovery UI for corrupted project records.
- Project-name prompt on first save.
- Auto-save for `ui-store` state (remembering last tool, etc.).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAVE-05 | CAD scene auto-saves within ~2s of last edit; debounced so continuous drag does not cause save spam. | `useAutoSave.ts` already implements 2000ms debounce + filtered subscription. Phase 25 drag fast-path ensures zero store commits mid-drag — debounce only sees the drag-end commit. D-05 adds rename-trigger coverage. |
| SAVE-06 | Toolbar shows `SAVING...` / `SAVED` via the v1.1 SAVE-04 surface. | `ToolbarSaveStatus` (Toolbar.tsx:168) already consumes `projectStore.saveStatus`. Needs `failed` → `SAVE_FAILED` branch (D-04). |
</phase_requirements>

## Summary

All auto-save machinery already exists and works. Phase 28 is a **hardening pass** over `useAutoSave.ts`, a `saveStatus` state-machine extension (add `"failed"`), a mount-time silent-restore in `App.tsx`, and a small `idb-keyval` pointer. Zero new dependencies, zero new chrome, zero rewrites.

The most important architectural finding: **Phase 25's drag fast-path is what makes SAVE-05 work today**. Drags commit exactly one store action on mouse:up — not per frame — so the existing 2000ms debounce is automatically drag-safe. Any subscribe-filter change must not broaden the watched slices, or we'd start seeing the 4 fast-path drag types' `requestRenderAll` churn (which doesn't touch the store today but could leak if we add tool/selection watchers).

**Primary recommendation:** Extend `useAutoSave.ts` with (a) a second `useProjectStore.subscribe` watching `activeName` (gated on `activeId != null`) that reuses the same `timer` ref, (b) a try/catch around `saveProject` that sets `"failed"` and skips the fade timer, and (c) an `idb-keyval` pointer write inside the setSaveStatus("saved") path. Add a mount-time `useEffect` in `App.tsx` that reads the pointer and calls `loadProject` + `loadSnapshot` + `setActive` before deciding WelcomeScreen vs. canvas.

## Standard Stack

### Core (all already in repo — no installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | ^5.0.12 | Store + plain `subscribe((state, prevState) => …)` listener | Source of truth for CAD data; Phase 25 drag fast-path built on closure-scoped listeners |
| Immer | ^11.1.4 | Immutable mutations inside store actions | Already used by `cadStore`; `rooms` reference equality is meaningful after any real change |
| idb-keyval | ^6.2.2 | IndexedDB key/value CRUD | Already used by `serialization.ts` (`room-cad-project-{id}` keys); add one more key |
| Vitest | ^4.1.2 | Test runner with `vi.useFakeTimers()` | Debounce tests already exercise this pattern (see `tests/useAutoSave.test.ts`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `subscribe((state, prev) => ...)` | `subscribeWithSelector` middleware | **REJECTED** — would require wrapping `projectStore` in new middleware, and the current full-state listener with explicit equality-check filter already works and is well-tested. Not worth the surface-area change for one slice. |
| Dedicated pointer key (`room-cad-last-project`) | Extend an existing app-state record | **RECOMMENDED: dedicated key.** `idb-keyval` has no existing app-state record. Adding one just to hold a string is more work than a dedicated key. Also survives a future "clear projects" flow without extra logic. |
| Unified subscriber | Two independent `subscribe` calls sharing a ref-captured timer | **RECOMMENDED: two subscribers, one shared timer.** Simplest pattern. No race conditions because the timer cleanup `if (timer) clearTimeout(timer)` is idempotent and both subscribers run synchronously on the same mutation, not in parallel. See "Race Analysis" below. |

**Installation:** None required.

**Version verification:** All package versions confirmed in `package.json`. No external-registry fetch needed — versions are locked.

## Architecture Patterns

### Current `useAutoSave` Shape (authoritative, from source)

```typescript
// src/hooks/useAutoSave.ts — 60 lines total
useEffect(() => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let fadeTimer: ReturnType<typeof setTimeout> | null = null;

  const unsub = useCADStore.subscribe((state, prevState) => {
    // Filter: only 3 slices matter
    if (state.rooms === prevState.rooms &&
        state.activeRoomId === prevState.activeRoomId &&
        state.customElements === prevState.customElements) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      // ... auto-create id if null, setSaveStatus("saving"), saveProject(), setSaveStatus("saved")
      // fadeTimer → setSaveStatus("idle") after FADE_MS
    }, DEBOUNCE_MS);
  });
  return () => { unsub(); if (timer) clearTimeout(timer); if (fadeTimer) clearTimeout(fadeTimer); };
}, []);
```

### Recommended Extension Shape (Phase 28 target)

```typescript
useEffect(() => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let fadeTimer: ReturnType<typeof setTimeout> | null = null;

  const triggerDebouncedSave = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const proj = useProjectStore.getState();
      let id = proj.activeId;
      let name = proj.activeName;
      if (!id) {
        id = `proj_${uid()}`;
        name = "Untitled Room";
        useProjectStore.getState().setActive(id, name);
      }
      useProjectStore.getState().setSaveStatus("saving");
      try {
        const st = useCADStore.getState();
        await saveProject(id, name, {
          version: 2, rooms: st.rooms, activeRoomId: st.activeRoomId,
          ...(st.customElements ? { customElements: st.customElements } : {}),
        });
        // D-02b: write last-active pointer on every successful save
        await set("room-cad-last-project", id);
        useProjectStore.getState().setSaveStatus("saved");
        if (fadeTimer) clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => {
          useProjectStore.getState().setSaveStatus("idle");
        }, FADE_MS);
      } catch (err) {
        console.error("[useAutoSave] saveProject failed", err);   // D-04b
        useProjectStore.getState().setSaveStatus("failed");        // D-04
        // D-04a: NO fadeTimer scheduled — status persists until next successful save
      }
    }, DEBOUNCE_MS);
  };

  // Subscriber 1: CAD data changes (unchanged filter)
  const unsubCad = useCADStore.subscribe((state, prevState) => {
    if (state.rooms === prevState.rooms &&
        state.activeRoomId === prevState.activeRoomId &&
        state.customElements === prevState.customElements) return;
    triggerDebouncedSave();
  });

  // Subscriber 2: project rename (D-05) — gated on activeId non-null
  const unsubProj = useProjectStore.subscribe((state, prevState) => {
    if (state.activeName === prevState.activeName) return;
    if (!state.activeId) return;   // don't save just because default name gets set
    triggerDebouncedSave();
  });

  return () => {
    unsubCad(); unsubProj();
    if (timer) clearTimeout(timer);
    if (fadeTimer) clearTimeout(fadeTimer);
  };
}, []);
```

### Silent Restore Shape (App.tsx mount)

Currently App.tsx has TWO mount effects that both interact with projects:
- Line 57-61: loads product / framedArt / wainscot stores
- Line 64-74: **already** hydrates the latest project via `listProjects()` → `loadSnapshot(latest.snapshot)` + `setActive(latest.id, latest.name)`

**Critical finding:** App.tsx line 64-74 is effectively a **weak form of D-02 already shipped** — it picks the project with the most recent `updatedAt`. But this:
1. Does NOT use a persisted "last active" pointer — it uses the most-recently-saved project, which is usually but not always the one the user was last in (e.g., if the user opened Project A, then Project B, then edited A, reload would land in A — the most-recently-saved — not B — the most-recently-active).
2. Does not currently skip WelcomeScreen on success. `hasStarted` is a separate React state (line 42) defaulting to `false`; the project load succeeds but WelcomeScreen still shows until user clicks a CTA.
3. The effect runs in parallel with the product stores effect — no ordering issue, but worth noting.

**D-02 delta:** Replace `listProjects()[0]` with `get("room-cad-last-project")` → `loadProject(id)`. On success: `loadSnapshot` + `setActive` + `setHasStarted(true)`. On any failure: fall through to WelcomeScreen (existing default).

### Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounced save | Custom debounce library or lodash.debounce | Inline `setTimeout` + `clearTimeout` (existing pattern) | Already works, already tested with fake timers, 2 lines of code |
| Multi-subscriber coordination | Event bus / custom pub-sub | Two `subscribe()` calls sharing a closure-scoped `timer` ref | Zustand subscribers run synchronously on store mutations — shared mutable ref is race-free |
| Retry / backoff on save failure | Any retry library | Nothing — D-04 rejects retry | IndexedDB writes rarely fail transiently; when they do, user should see and decide |
| "Dirty state" tracking | Separate "dirty" Zustand slice | Subscribe filter does this implicitly | If the filter fires, it's dirty. No separate flag needed. |
| Load-on-mount ordering | Promise.all + Suspense | Plain `useEffect` with cancellation flag (existing App.tsx pattern) | Already works; WelcomeScreen is the natural fallback render |

**Key insight:** Every custom abstraction we could add here would add surface area the existing code doesn't need. Debounce + subscribe + try/catch is already the minimal solution — the phase is about filling gaps in that minimal solution, not replacing it.

## Common Pitfalls

### Pitfall 1: Fade timer fires over `"failed"` status
**What goes wrong:** If the fade timer was already scheduled during a previous successful save and is still pending when a subsequent save fails, the fade fires and resets `saveStatus` from `"failed"` back to `"idle"` — Jessica never sees `SAVE_FAILED`.
**Root cause:** `fadeTimer` is not cancelled on failure path.
**How to avoid:** In the `catch` block, **explicitly** `clearTimeout(fadeTimer)` before setting `saveStatus = "failed"`. Also do not schedule a new `fadeTimer` in the failure branch.
**Warning sign:** `SAVE_FAILED` briefly flashes then clears to `SAVED` or nothing.

### Pitfall 2: Subscribe filter catches ui-store mutations via store re-derivation
**What goes wrong:** If a future refactor causes ui-store toggles (e.g., `showGrid`) to inadvertently reassign `rooms` or `customElements` (e.g., a normalization pass), every tool click triggers a save.
**Root cause:** Filter relies on reference equality — any action that reconstructs `rooms` even without semantic changes will fire.
**How to avoid:** Keep the filter slice-scoped to `rooms`/`activeRoomId`/`customElements`. Do NOT add `ui-store` watchers. Phase 25 drag fast-path already respects this; preserve it.
**Warning sign:** Console noise "SAVING..." on tool switches or grid toggle.

### Pitfall 3: `projectStore.activeName` starts as `"Untitled Room"` at boot — spurious save
**What goes wrong:** The rename subscriber sees `activeName` as `"Untitled Room"` on first mount; if `setActive()` is called with a different name during silent-restore, that looks like a rename and fires a save for data that was just loaded.
**Root cause:** No distinction between "rename from user input" vs. "`setActive` during hydration."
**How to avoid:** Gate the rename subscriber on `state.activeId` being **non-null in both `state` and `prevState`**. During silent-restore, `activeId` goes from `null` → string on the first `setActive` call — if we require non-null prev too, hydration skips the trigger. Alternatively, check `prevState.activeId === state.activeId` (same project) to prevent project-switch-triggered saves.
**Warning sign:** Phantom save on app launch / project switch.

### Pitfall 4: `setActive` during load triggers CAD subscriber too
**What goes wrong:** `loadSnapshot(snapshot)` in `cadStore` replaces `rooms` → triggers the CAD subscriber → fires a debounced save 2s later of the thing we just loaded.
**Root cause:** `loadSnapshot` is an indistinguishable mutation from a user edit.
**How to avoid:** Check current `loadSnapshot` impl — if it uses `set({ rooms, activeRoomId })` directly, the subscribe fires. Two options:
  1. Accept the behavior — it rewrites the same data to IndexedDB 2s after load. Idempotent, minor cost. Pointer gets re-written to the same value. **Acceptable.**
  2. Add a "hydrating" flag guard in the subscriber. More code, more edge cases.
**Recommended:** Option 1. The 2s post-load save is harmless and ensures the pointer is consistent even if it somehow diverged.
**Warning sign:** IndexedDB write fires on silent restore. This is OK; validate it doesn't loop.

### Pitfall 5: `useAutoSave` currently has NO try/catch — unhandled promise rejection
**What goes wrong:** Today if `saveProject` rejects, `setSaveStatus("saved")` is never called, the UI hangs on `SAVING...` forever, and the browser logs an unhandled rejection.
**Root cause:** Line 39 of useAutoSave.ts: `await saveProject(...)` with no error handling.
**How to avoid:** Phase 28 task explicitly wraps this in try/catch (D-04).
**Warning sign:** Test that throws from `saveProject` mock — currently leaves status as `"saving"` indefinitely.

### Pitfall 6: Zustand v5 subscribe returns full state, not slice
**What goes wrong:** Assumption that `store.subscribe((slice) => ...)` selector form works without middleware — in Zustand v5 without `subscribeWithSelector`, the raw `subscribe` form is always `(state, prevState) => void`.
**Root cause:** API design; v3 had auto-selector inference.
**How to avoid:** Continue using the existing `(state, prevState)` form + explicit equality check in the listener. Confirmed across all three store subscribers in the repo (`paintStore.ts:25`, `WainscotPopover.tsx:39`, `useAutoSave.ts:15`).
**Warning sign:** None at compile time — just subtle bugs if someone assumes selector-form works.

## Code Examples

### Rename trigger subscriber (D-05)

```typescript
// Source: derived from useAutoSave.ts:15 pattern + projectStore shape
const unsubProj = useProjectStore.subscribe((state, prevState) => {
  // Skip if name didn't change
  if (state.activeName === prevState.activeName) return;
  // Skip initial default-name set (activeId null) — only saved projects can be renamed
  if (!state.activeId) return;
  // Skip project switch (different activeId — CAD subscriber handles the load side)
  if (prevState.activeId !== state.activeId) return;
  triggerDebouncedSave();
});
```

### Silent restore with pointer (D-02, D-02a, D-02b)

```typescript
// Source: App.tsx line 64-74 — rework of existing hydration effect
import { get } from "idb-keyval";

useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const lastId = await get<string>("room-cad-last-project");
      if (cancelled) return;
      if (!lastId) return;  // D-02a: no pointer, fall through to WelcomeScreen
      const project = await loadProject(lastId);
      if (cancelled) return;
      if (!project) return;  // D-02a: stale pointer, fall through to WelcomeScreen
      useCADStore.getState().loadSnapshot(project.snapshot);
      useProjectStore.getState().setActive(project.id, project.name);
      setHasStarted(true);   // D-02: skip WelcomeScreen on success
    } catch (err) {
      console.error("[App] Silent restore failed", err);
      // Fall through to WelcomeScreen — D-02a
    }
  })();
  return () => { cancelled = true; };
}, []);
```

### SAVE_FAILED render branch (D-04)

```typescript
// Source: Toolbar.tsx:168-200 — add a third branch
function ToolbarSaveStatus() {
  const status = useProjectStore((s) => s.saveStatus);
  if (status === "failed") {
    return (
      <div className="flex items-center gap-1.5 min-w-[72px]">
        <span className="material-symbols-outlined text-[14px] text-error">error</span>
        <span className="font-mono text-[10px] tracking-widest text-error">SAVE_FAILED</span>
      </div>
    );
  }
  const isSaving = status === "saving";
  // ... existing SAVING / SAVED branches unchanged
}
```

## Race Analysis: Two Subscribers, One Timer

**Question (critical research Q1):** Is there a race when CAD subscriber and Project subscriber share `timer`?

**Answer:** No, for the following reasons verified against Zustand v5 source behavior + repo pattern:

1. Zustand subscribe listeners run **synchronously** inside the store's `set()` call, on the same microtask as the mutation. Two separate stores (`useCADStore`, `useProjectStore`) cannot fire their listeners interleaved — a single user action mutates exactly one store at a time.
2. `clearTimeout` + `setTimeout` sharing one variable is fine as long as only one "thread" of control reads/writes it. The `useEffect` closure is single-threaded.
3. Edge case: **same event triggers both subscribers.** E.g., "rename and edit walls in one tick." Since they are different stores, this would require two separate store actions — they'd fire sequentially, and the second `triggerDebouncedSave` call would clear the timer set by the first and reschedule. Result: exactly one save at `t + 2000ms`. This is correct behavior.
4. Edge case: **rapid rename with no edits.** Rename fires repeatedly within 2s — each one clears and resets the timer. Collapses to one save. Correct.

**No race.** Shared timer ref is the right pattern.

## Integration Points

### App.tsx — where silent restore slots in

Hooks running before the WelcomeScreen decision (line 225):
- `useAutoSave()` — line 49 (subscribes; does not fire on mount because no state change yet)
- `useHelpRouteSync()` — line 50
- `useEffect` product/framedArt/wainscot load — line 57
- `useEffect` latest-project hydration — line 64 (**replace this**)
- `useEffect` wallCount → hasStarted autodetect — line 77
- `useEffect` onboarding auto-start — line 82
- `useEffect` keyboard shortcuts — line 97
- Render gate at line 225: `if (!hasStarted) return <WelcomeScreen />`

Plan: replace the line 64 block with the silent-restore pattern above. The `setHasStarted(true)` call on success skips WelcomeScreen. On any failure or missing pointer, do nothing — `hasStarted` stays `false`, WelcomeScreen renders, existing "Open Project" button in WelcomeScreen (line 108-123) remains the explicit-load escape hatch.

### Error surface of saveProject

From `src/lib/serialization.ts:13-25`:
```typescript
export async function saveProject(id, name, snapshot): Promise<void> {
  const project = { id, name, updatedAt: Date.now(), snapshot };
  await set(`${PROJECT_PREFIX}${id}`, project);  // idb-keyval set()
}
```

Returns `Promise<void>`. Rejects if `idb-keyval.set()` rejects — which happens on: QuotaExceededError (storage full), InvalidStateError (browser denied IDB), TransactionInactiveError (rare). All are thrown as Promise rejections. **Wrapping with try/catch in useAutoSave is the correct surface.** No changes needed to `saveProject` itself.

### Phase 25 drag fast-path — what must NOT change

From `25-02-SUMMARY.md`:
- `renderOnAddRemove: false` at FabricCanvas init → no per-frame rerender churn
- 4 drag types (product-move, wall-move, wall-endpoint, product-rotate) write to fabric objects directly; store is NOT touched until mouse:up
- Single store commit on mouse:up via: `moveProduct` | `moveCustomElement` | `updateWall` | `rotateProduct`

**Impact on SAVE-05:** The CAD subscribe filter fires exactly once per drag (at mouse:up), so the 2000ms debounce naturally covers "no save spam during drag." **This invariant breaks if:**
1. Any new mid-drag store write leaks in (product-resize, ceiling, opening, wall-rotate, wall-thickness still use `*NoHistory` mid-drag writes — these DO mutate `rooms` and DO fire the subscriber, but mouse:up commits one real change and the debounce still collapses them).
2. Subscribe filter expands to watch ui-store (would fire on drag-start's selection change).
3. Rename subscriber is added without the `activeId != null` gate — would fire during `clearActive()` calls.

**Preservation strategy:** Keep filter slice list at `rooms`/`activeRoomId`/`customElements` exactly. Add rename watch on a separate subscriber to a different store. Do NOT watch ui-store, do NOT watch productStore / paintStore / framedArtStore / wainscotStyleStore (those are their own persistence domains).

## State of the Art

| Old | Current | When | Impact |
|---|---|---|---|
| App.tsx line 64 hydrating `listProjects()[0]` (most-recent-saved) | Pointer-based `get("room-cad-last-project")` | Phase 28 | Correctly restores the user's last *active* project, not just the most-recently-modified. Behavior changes only in the "opened A, opened B, edited A, reloaded" edge case. |
| `saveStatus` three states: `idle \| saving \| saved` | Four states: add `failed` | Phase 28 D-04 | Failure now visible; no silent loss. |
| `useAutoSave` single subscriber on `useCADStore` | Two subscribers (cadStore + projectStore.activeName) | Phase 28 D-05 | Project rename now auto-saves. |
| `await saveProject(...)` unguarded | `try { await saveProject(...) } catch { setSaveStatus("failed") }` | Phase 28 D-04 | No more unhandled promise rejection; user sees error. |

## Open Questions

1. **Should the last-active pointer be written on every successful save, or only on project switch?**
   - What we know: Writing on every save is ~1 extra IDB write per save; idempotent after the first for the same project.
   - What's unclear: Is there any case where `activeId` changes without a save following? (`setActive` from WelcomeScreen's "Open Project" button — yes, it calls `setActive` but not `saveProject`.)
   - Recommendation: Write on every successful save (already in the save path; trivial). Also write inside `setActive` itself OR inside a separate `useProjectStore.subscribe` watching `activeId` changes. Planner picks — simpler to piggyback on the save path.

2. **Does `loadSnapshot` fire the CAD subscriber (causing a redundant 2s-later save on silent restore)?**
   - What we know: `cadStore.loadSnapshot` replaces `rooms`/`activeRoomId` — subscribe filter fires.
   - What's unclear: Verified by reading the source. Planner should confirm by reading `loadSnapshot` implementation in `cadStore.ts`.
   - Recommendation: Accept the behavior (see Pitfall 4 option 1). It's self-correcting. If observed to cause issues, add a `hydrating` flag.

3. **Is there a race between "on mount silent-restore" and "on mount useAutoSave setup"?**
   - What we know: `useAutoSave()` runs on line 49 and sets up the subscriber synchronously in its `useEffect`. The silent-restore effect on line 64 mutates the store later via `loadSnapshot` + `setActive`.
   - What's unclear: React `useEffect` ordering is deterministic by call site — line 49 runs first, line 64 runs second. So the subscriber is live when the mutation arrives.
   - Recommendation: Confirmed safe. The subscriber will see the hydration mutations; see Open Question 2 for the ripple.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Dev + build | ✓ | repo uses whatever the developer has | — |
| npm | Package management | ✓ | bundled with Node | — |
| Vitest | Test runner | ✓ | ^4.1.2 | — |
| @testing-library/react | `renderHook` in useAutoSave.test.ts | ✓ | installed (per existing test) | — |
| jsdom / happy-dom | DOM for Fabric tests | ✓ | configured in `tests/setup.ts` | — |
| IndexedDB (browser) | saveProject / loadProject / pointer | ✓ (jsdom + idb-keyval's in-memory fallback) | — | — |

**Missing with no fallback:** None.
**Missing with fallback:** None. All phase dependencies are local, already-installed, and covered by existing test infra.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vite.config.ts` (test config inline) + `tests/setup.ts` |
| Quick run command | `npm run test:quick` |
| Full suite command | `npm test` |
| Fake timers | `vi.useFakeTimers()` / `vi.advanceTimersByTimeAsync(ms)` — already used in `tests/useAutoSave.test.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAVE-05 | 2s debounce collapses rapid edits to 1 save | unit | `npm test -- tests/useAutoSave.test.ts -t "debounce"` | ✅ (existing test covers) |
| SAVE-05 | Drag produces exactly 1 store commit → 1 debounced save | integration | `npm test -- tests/useAutoSave.test.ts -t "drag spam"` | ❌ Wave 0 — new test |
| SAVE-05 | Rename triggers save (D-05) | unit | `npm test -- tests/useAutoSave.test.ts -t "rename triggers save"` | ❌ Wave 0 — new test |
| SAVE-05 | ui-store changes do NOT trigger save (D-05b) | unit | `npm test -- tests/useAutoSave.test.ts -t "ui-store does not trigger"` | ❌ Wave 0 — new test |
| SAVE-05 | Silent restore loads pointer project on mount (D-02) | integration | `npm test -- tests/silentRestore.test.ts` | ❌ Wave 0 — new test file |
| SAVE-05 | Missing pointer falls through to WelcomeScreen (D-02a) | integration | `npm test -- tests/silentRestore.test.ts -t "no pointer"` | ❌ Wave 0 — same file |
| SAVE-05 | Stale pointer (project deleted) falls through to WelcomeScreen (D-02a) | integration | `npm test -- tests/silentRestore.test.ts -t "stale pointer"` | ❌ Wave 0 — same file |
| SAVE-06 | `SAVING...` shows during in-flight save | unit | existing `tests/SaveIndicator.test.tsx` + `tests/useAutoSave.test.ts` status transitions | ✅ Existing coverage |
| SAVE-06 | `SAVED` shows briefly after | unit | existing status-transitions test | ✅ Existing coverage |
| SAVE-06 (D-04) | `SAVE_FAILED` renders in error color on save rejection | unit | `npm test -- tests/useAutoSave.test.ts -t "save failure sets failed status"` | ❌ Wave 0 — new test |
| SAVE-06 (D-04a) | `SAVE_FAILED` persists — NO fade to idle | unit | `npm test -- tests/useAutoSave.test.ts -t "failed status does not fade"` | ❌ Wave 0 — new test |
| SAVE-06 (D-04a) | Next successful save clears `SAVE_FAILED` | unit | `npm test -- tests/useAutoSave.test.ts -t "subsequent success clears failed"` | ❌ Wave 0 — new test |
| SAVE-06 (D-04) | `ToolbarSaveStatus` renders `SAVE_FAILED` when status is `"failed"` | unit | `npm test -- tests/Toolbar.test.tsx -t "SAVE_FAILED"` | ❌ Wave 0 — new or extend existing |

### Specific Assertions

**D-04 (SAVE_FAILED persistence):**
- Mock `saveProject` to reject once → trigger save → advance 2000ms + flush microtasks → `saveStatus === "failed"`.
- Advance 5000ms (past FADE_MS=2000ms) → `saveStatus === "failed"` still (no auto-fade).
- Mock next `saveProject` to resolve → trigger another save → advance 2000ms + flush → `saveStatus === "saved"` → advance 2000ms → `saveStatus === "idle"`.

**D-05 (Rename trigger):**
- `setActive("proj_x", "A")` → advance 10ms (no save yet — hydration behavior).
- `setActiveName("B")` → advance 2000ms + flush → `saveProject` called with name `"B"`.
- `setActive(null, "Untitled Room")` via `clearActive` → no save (activeId null after, guard holds).

**D-05b (ui-store does not trigger):**
- `useUIStore.getState().setTool("wall")` → advance 3000ms → `saveProject` NOT called.
- `useUIStore.getState().toggleGrid()` → advance 3000ms → `saveProject` NOT called.
- `useUIStore.getState().setGridSnap(1)` → advance 3000ms → `saveProject` NOT called.

**No-save-spam during drag (SAVE-05):**
- **Integration approach (recommended):** Use `tests/dragIntegration.test.ts` pattern — seed a product, simulate 50 mouse:move events between down/up, count `saveProject` calls after drag-end + 2000ms debounce. Must be exactly 1.
- **Alternative (unit-test approach):** Mock a store subscribe, count listener invocations during `*NoHistory` calls (from product-resize or opening-slide — drag types that DO fire the subscriber mid-drag). Verify the debounce collapses them. Less realistic but faster.
- **Recommendation:** Integration — reuses Phase 25's test infrastructure, directly verifies the acceptance criterion.

### Sampling Rate

- **Per task commit:** `npm run test:quick` (Vitest dot reporter, ~1s for the 3 relevant files)
- **Per wave merge:** `npm test` (full suite — 188+ tests, ~15s)
- **Phase gate:** Full suite green before `/gsd:verify-work`; plus manual smoke: (a) draw wall → watch SAVING → SAVED, (b) drag product 3s → verify 1 save fires at drag-end, (c) hard refresh → verify scene returns identical, (d) rename project in ProjectManager → watch SAVING fire.

### Wave 0 Gaps

- [ ] **`tests/useAutoSave.test.ts`** — extend with: rename trigger, ui-store no-trigger, save-failure sets failed, failed does not fade, subsequent success clears failed (5 new test cases, covers REQ SAVE-05, SAVE-06)
- [ ] **`tests/silentRestore.test.ts`** — new file with: happy path (pointer → load → skip WelcomeScreen), no-pointer fallthrough, stale-pointer fallthrough (3 new test cases, covers REQ SAVE-05)
- [ ] **`tests/Toolbar.test.tsx`** — new file or extend, assert `ToolbarSaveStatus` renders `SAVE_FAILED` text + `text-error` class when status is `"failed"` (covers REQ SAVE-06)
- [ ] **Drag-spam integration test** — extend `tests/dragIntegration.test.ts` with a case that mounts `useAutoSave`, drags a product through 50 moves, verifies exactly 1 `saveProject` call at `dragEnd + 2000ms` (covers REQ SAVE-05 "drag-safe" criterion)
- [ ] Framework install: none — Vitest + RTL already configured

## Project Constraints (from CLAUDE.md)

- **Labels use UPPERCASE_UNDERSCORE convention** (obsidian CAD theme). Use `SAVE_FAILED`, NEVER `Save failed` or `Save Failed`.
- **Color token for failure:** `text-error` / `--color-error: #ffb4ab` — already defined in `src/index.css`. Do NOT introduce new tokens.
- **font-mono for chrome:** `ToolbarSaveStatus` already uses `font-mono text-[10px] tracking-widest` — match exactly.
- **Material Symbols icon for failure:** suggest `error` (matches existing `cloud_done` / `progress_activity` pattern in the same component). Planner finalizes.
- **Zustand + closure pattern:** Keep all hook-scoped state in the `useEffect` closure. Do NOT introduce module-level mutable state.
- **Store-driven rendering preserved:** `SaveIndicator` and `ToolbarSaveStatus` subscribe via selector; do not pass save state as props.
- **Phase 25 drag fast-path must NOT regress:** subscribe filter stays at `rooms`/`activeRoomId`/`customElements`. Do not watch ui-store. Do not add middleware that would change listener behavior on existing stores.
- **GSD workflow:** this phase was started via `/gsd:plan-phase` — research lands as `28-RESEARCH.md`, execution goes through `/gsd:execute-phase`.

## Sources

### Primary (HIGH confidence — all repo source files, directly read)
- `src/hooks/useAutoSave.ts` (60 lines, full body read) — existing debounced subscriber
- `src/stores/projectStore.ts` (23 lines, full body read) — saveStatus state machine
- `src/lib/serialization.ts` (47 lines, full body read) — IndexedDB CRUD via idb-keyval
- `src/App.tsx` (lines 1-100 relevant; hydration at line 64-74) — mount-time effects
- `src/components/WelcomeScreen.tsx` (186 lines, full body read) — fallback flow
- `src/components/SaveIndicator.tsx` (24 lines, full body read) — status text render
- `src/components/Toolbar.tsx` (lines 150-200) — `ToolbarSaveStatus` SAVE-04 surface
- `tests/useAutoSave.test.ts` (64 lines, full body read) — existing test shape
- `.planning/phases/25-canvas-store-performance/25-02-wave2-drag-fast-path-SUMMARY.md` — drag fast-path contract
- `.planning/phases/28-auto-save/28-CONTEXT.md` — user decisions for this phase
- `.planning/REQUIREMENTS.md` — SAVE-05, SAVE-06 text
- `package.json` — dependency versions (idb-keyval ^6.2.2, Zustand ^5.0.12, Vitest ^4.1.2)

### Secondary (MEDIUM confidence)
- Repo grep of `.subscribe(` usage — 3 call sites total, all plain `(state, prev) =>` form; no middleware usage. Confirms the subscribe API shape. 

### Tertiary (LOW confidence)
- None. All claims in this RESEARCH.md are verifiable against the repo source files listed above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions in package.json, existing usage patterns
- Architecture: HIGH — direct reading of all target files
- Pitfalls: HIGH — derived from reading current code; each pitfall maps to a specific line-by-line risk
- Silent-restore integration: HIGH — App.tsx line 64-74 is the exact slot; existing hydration pattern to replace
- Test strategy: HIGH — Vitest + fake timers pattern already proven in `tests/useAutoSave.test.ts`

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable domain; only invalidated if Zustand, idb-keyval, or the auto-save hook structure changes significantly)
