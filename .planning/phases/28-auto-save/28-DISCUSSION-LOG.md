# Phase 28: Auto-Save — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `28-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 28-auto-save
**Areas discussed:** Scope framing, Reload-restore UX, First-edit on unsaved scene, Save-failure handling, Save triggers coverage

---

## Scope framing — hardening vs rewrite

| Option | Description | Selected |
|--------|-------------|----------|
| Harden existing `useAutoSave.ts` | Verify SAVE-05/06, fill gaps, no rewrite (recommended) | ✓ |
| Replace with fresh implementation | Build new hook from scratch | |
| Other | Free text | |

**User's choice:** Harden existing `useAutoSave.ts` (1a)
**Notes:** Rationale discussed: happy path already meets SAVE-05/06; rewrite risks regressing Phase 25 drag fast-path behavior.

---

## Reload-restore UX

| Option | Description | Selected |
|--------|-------------|----------|
| Silent auto-load of last project | App launch drops user directly into last scene (recommended) | ✓ |
| WelcomeScreen with "last project" preselected | Middle ground — still shows picker but defaults to last | |
| Always WelcomeScreen (current) | Manual pick every time | |
| Other | Free text | |

**User's choice:** Silent auto-load (2a)
**Notes:** Chosen because success criterion #3 literally says "reloading the page restores the scene exactly as left." Any picker step contradicts that. Added D-02a safety: fall back to WelcomeScreen if the last project can't be loaded.

---

## First-edit on unsaved scene

| Option | Description | Selected |
|--------|-------------|----------|
| Silent "Untitled Room" default (current) | Zero friction; matches "without manual action" (recommended) | ✓ |
| Prompt for a name on first save | Blocks save until named | |
| Require explicit "New Project" click | Editing disabled until project exists | |
| Other | Free text | |

**User's choice:** Silent default (3a)
**Notes:** Rename remains available via ProjectManager; not load-bearing.

---

## Save-failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Silent (current) | Swallow errors | |
| `SAVE_FAILED` status, no retry | Surface failure in SAVE-04 surface (recommended) | ✓ |
| `SAVE_FAILED` + silent retry w/ backoff | Retry once before showing error | |
| Other | Free text | |

**User's choice:** `SAVE_FAILED` status, no retry (4b)
**Notes:** IndexedDB failures are typically permanent (quota/permission/private mode), not transient — retry adds complexity without reliability gain. Honest failure beats silent data loss.

---

## Save triggers — coverage gap check

| Option | Description | Selected |
|--------|-------------|----------|
| Add project-rename to save triggers | Close the rename-loss gap (recommended) | ✓ |
| Keep current scope | Rename saves only on next edit | |
| Audit deeper | Planner investigates other non-`rooms` state | |
| Other | Free text | |

**User's choice:** Add project-rename (5a)
**Notes:** Confirmed in discussion that walls, products, paint, materials, room dimensions, and undo/redo all flow through `rooms` — already covered. `ui-store` state deliberately excluded (session state, not scene state).

---

## Claude's Discretion

- Exact pointer mechanism for "last active project" (dedicated idb-keyval key vs. unified app-state record).
- Subscriber structure for project-rename trigger (second `useProjectStore.subscribe` vs. unified watcher).
- `SaveIndicator` variant shape for `SAVE_FAILED` rendering.
- Choice of drag-no-spam test strategy (fake timers + spy vs. integration drag sim).

## Deferred Ideas

- Cloud sync / multi-device persistence (out of scope — PROJECT.md)
- Manual save button redesign (SAVE-04 UI is locked)
- Retry-with-backoff on save failure (rejected this phase, D-04)
- Rich recovery UI for corrupted projects (only WelcomeScreen fallback for now)
- Prompting for project name on first save (rejected, D-03)
- Auto-saving `ui-store` state across reloads (out of scope — session state)
