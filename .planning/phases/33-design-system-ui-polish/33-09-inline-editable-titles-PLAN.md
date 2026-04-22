---
phase: 33-design-system-ui-polish
plan: 09
type: execute
wave: 3
depends_on: [00, 01, 02, 03]
files_modified:
  - src/stores/projectStore.ts
  - src/stores/cadStore.ts
  - src/components/ui/InlineEditableText.tsx
  - src/components/Toolbar.tsx
  - src/components/ProjectManager.tsx
  - src/components/RoomTabs.tsx
autonomous: true
requirements:
  - "GH #88"
must_haves:
  truths:
    - "InlineEditableText primitive reuses Phase 31 LabelOverrideInput invariants: skipNextBlurRef, live-preview keystroke, Enter/blur commits, Escape reverts"
    - "Clicking the project name in the Toolbar enters edit mode; typing live-previews into projectStore.draftName (NOT activeName); Enter/blur flushes draftName → activeName via commitDraftName; Escape clears draftName and reverts"
    - "Clicking a room tab label enters edit mode; Enter/blur commits to cadStore.renameRoom; Escape reverts"
    - "Empty commit reverts to previous name (D-27); whitespace trimmed; max 60 chars"
    - "projectStore has draftName field + commitDraftName action — auto-save does NOT subscribe to draftName, so keystroke preview does NOT trigger debounced save (genuine D-23 bypass — checker warning 4 fix)"
    - "cadStore has renameRoomNoHistory (genuine bypass — renameRoom calls pushHistory, NoHistory variant does not)"
    - "Document title relocated from ProjectManager sidebar input to Toolbar center slot (research recommendation — matches UI-SPEC + Pascal)"
  artifacts:
    - path: "src/components/ui/InlineEditableText.tsx"
      provides: "Reusable inline-edit primitive based on Phase 31 LabelOverrideInput"
      min_lines: 60
    - path: "src/stores/projectStore.ts"
      provides: "draftName (ephemeral — auto-save does NOT watch) + commitDraftName (flushes draft → activeName, triggers auto-save exactly once)"
    - path: "src/stores/cadStore.ts"
      provides: "renameRoomNoHistory (genuine bypass of pushHistory) + existing renameRoom"
    - path: "src/components/Toolbar.tsx"
      provides: "Document title inline-edit slot (relocated from ProjectManager) — onLivePreview binds to draftName, onCommit flushes"
    - path: "src/components/ProjectManager.tsx"
      provides: "Project name input REMOVED (read-only display or Save/Load buttons only)"
    - path: "src/components/RoomTabs.tsx"
      provides: "Room tab labels use InlineEditableText with renameRoomNoHistory / renameRoom split"
  key_links:
    - from: "src/components/ui/InlineEditableText.tsx"
      to: "Phase 31 LabelOverrideInput pattern at src/components/PropertiesPanel.tsx:292-403"
      via: "skipNextBlurRef + originalRef + onLivePreview/onCommit callback props"
      pattern: "skipNextBlurRef"
    - from: "src/components/Toolbar.tsx"
      to: "projectStore.setDraftName / commitDraftName"
      via: "InlineEditableText with onCommit/onLivePreview callbacks"
      pattern: "draftName"
    - from: "src/components/RoomTabs.tsx"
      to: "cadStore.renameRoom / renameRoomNoHistory"
      via: "InlineEditableText"
      pattern: "renameRoom"
---

<objective>
Ship GH #88 — document title (Toolbar) and room tab labels are click-to-edit inline, reusing the Phase 31 LabelOverrideInput live-preview pattern (Enter/blur commits, Escape reverts, keystroke live-preview).

**Locked decision (research open question #1):** Document title is **relocated from ProjectManager sidebar input to Toolbar center slot**. Matches UI-SPEC + Pascal layout. ProjectManager becomes read-only name display + Save/Load/New buttons.

**Locked decision (checker warning 4 fix — D-23 auto-save bypass):**
Pre-research of `src/hooks/useAutoSave.ts:72` confirms the auto-save debounce DOES subscribe to `projectStore.activeName` changes. Every keystroke write to `activeName` would therefore kick debounced save. A naive `setActiveNameNoHistory = (n) => set({ activeName: n })` would be semantic theater — identical side effects to `setActiveName`.

Plan 09 chooses **option (a) genuine bypass:** add an ephemeral `draftName` field to projectStore that auto-save does NOT subscribe to. Live preview writes go to `draftName`; `commitDraftName` flushes `draftName → activeName` exactly once, triggering auto-save a single time per commit.

Plan 09 adopts option (b) — documented trade-off — only for `cadStore.renameRoom`: but since `renameRoom` calls `pushHistory` (verified at cadStore.ts:1031), a `renameRoomNoHistory` variant is a GENUINE bypass (skips pushHistory) and is therefore not semantic theater. Both option paths are resolved.

Purpose: Single-click inline edit without switching tools. Matches Pascal affordance.

Output: `src/components/ui/InlineEditableText.tsx` reusable primitive, `draftName` + `commitDraftName` in projectStore (genuine auto-save bypass), `renameRoomNoHistory` in cadStore (genuine history bypass), doc title relocated to Toolbar, room tabs use the same primitive.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-design-system-ui-polish/33-UI-SPEC.md
@.planning/phases/33-design-system-ui-polish/33-CONTEXT.md
@.planning/phases/33-design-system-ui-polish/33-RESEARCH.md
@src/components/PropertiesPanel.tsx
@src/stores/projectStore.ts
@src/stores/cadStore.ts
@src/hooks/useAutoSave.ts

<interfaces>
**Phase 31 reference (MANDATORY READ before implementing):**
`src/components/PropertiesPanel.tsx:292-403` — `LabelOverrideInput` component. This is the battle-tested pattern. Reuse verbatim, generalize via props.

**Phase 31 invariants to preserve (research Pitfall 4):**
1. `skipNextBlurRef` — Escape calls `.blur()` which fires `onBlur → commit()`; the ref makes blur skip with stale draft
2. Live preview writes use `*NoHistory` / draft-field store variant; commit uses canonical (history/auto-save-triggering) variant
3. `useEffect` reseeds draft when bound `value` changes (e.g., selection swap)
4. Test driver `window.__drive*` gated by `import.meta.env.MODE === "test"`

**Auto-save subscription (verified at `src/hooks/useAutoSave.ts:72`):**
```typescript
const unsubProj = useProjectStore.subscribe((state, prevState) => {
  if (state.activeName === prevState.activeName) return;
  if (state.activeId === null) return; // skip clearActive
  if (prevState.activeId !== state.activeId) return; // skip project switch / null→id hydration
  triggerDebouncedSave();
});
```
This subscribes to `activeName` changes ONLY. Adding a new `draftName` field that auto-save does NOT reference gives us a genuine bypass: keystroke writes hit `draftName`, auto-save ignores them, commit flushes `draftName → activeName` once → auto-save fires exactly once per commit.

**Current project title location (research Pitfall 6):**
- Currently in `src/components/ProjectManager.tsx` sidebar — a plain input bound to `projectStore.activeName` via `setActiveName`
- Toolbar.tsx only shows brand "OBSIDIAN CAD"
- **Plan 09 relocates the inline-editable title to the Toolbar center slot.** ProjectManager keeps read-only display + Save/Load/New buttons.

**Store APIs (verified):**
- `projectStore.activeName: string` + `setActiveName(name): void` exist (lines 7, 20) — unchanged
- **NEW:** `projectStore.draftName: string | null` (null = not editing)
- **NEW:** `projectStore.setDraftName(name: string | null): void` — ephemeral live-preview write
- **NEW:** `projectStore.commitDraftName(): void` — if draftName is non-null, set `activeName = draftName.trim().slice(0,60)` AND set `draftName = null`. Triggers auto-save exactly once via the existing `activeName` subscription.
- `cadStore.renameRoom(id, name)` exists at line 1031 — calls pushHistory (verified)
- **NEW:** `cadStore.renameRoomNoHistory(id, name): void` — identical mutation but skips `pushHistory(s)` call → GENUINE bypass (not semantic theater)

**InlineEditableText props (generic):**
```typescript
interface InlineEditableTextProps {
  value: string;
  onLivePreview: (v: string) => void;
  onCommit: (v: string) => void;
  maxLength?: number;  // D-27: max 60
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}
```

**Validation (D-27):**
- Trim whitespace
- Max 60 chars
- Empty commit → revert to previous name

**Styling:**
- Transparent background when inactive
- `border-b border-accent` when active (focused)
- `cursor: text` on hover (affordance per D-24)
- No edit icon
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add draftName + commitDraftName to projectStore (genuine auto-save bypass) + renameRoomNoHistory to cadStore (genuine pushHistory bypass)</name>
  <files>src/stores/projectStore.ts, src/stores/cadStore.ts</files>
  <read_first>
    - src/stores/projectStore.ts (full — small file, ~23 lines; confirm current setActiveName is plain `set({ activeName })`)
    - src/hooks/useAutoSave.ts:72 (confirm subscription is ONLY on activeName — so a new draftName field is NOT watched)
    - src/stores/cadStore.ts (find renameRoom at line 1031 — confirm it calls pushHistory; the NoHistory variant must skip it)
    - src/components/PropertiesPanel.tsx:292-403 (Phase 31 reference showing live-preview vs commit split)
  </read_first>
  <action>
    **projectStore.ts — CHECKER WARNING 4 FIX (option a, genuine bypass):**

    Update the state interface:
    ```typescript
    interface ProjectState {
      activeId: string | null;
      activeName: string;
      draftName: string | null;   // NEW — ephemeral; null when not editing
      saveStatus: SaveStatus;
      setActive: (id: string, name: string) => void;
      setActiveName: (name: string) => void;    // unchanged — commits to activeName, triggers auto-save
      setDraftName: (name: string | null) => void;  // NEW — ephemeral; auto-save does NOT subscribe
      commitDraftName: () => void;              // NEW — flushes draftName → activeName, then clears draftName
      clearActive: () => void;
      setSaveStatus: (s: SaveStatus) => void;
    }
    ```

    Update the create() call:
    ```typescript
    export const useProjectStore = create<ProjectState>()((set, get) => ({
      activeId: null,
      activeName: "Untitled Room",
      draftName: null,
      saveStatus: "idle",
      setActive: (id, name) => set({ activeId: id, activeName: name, draftName: null }),
      setActiveName: (name) => set({ activeName: name }),
      setDraftName: (name) => set({ draftName: name }),
      commitDraftName: () => {
        const draft = get().draftName;
        if (draft === null) return; // nothing to commit
        const trimmed = draft.trim().slice(0, 60);
        if (trimmed.length === 0) {
          // D-27: empty commit → revert (do not overwrite activeName)
          set({ draftName: null });
          return;
        }
        set({ activeName: trimmed, draftName: null });
      },
      clearActive: () => set({ activeId: null, activeName: "Untitled Room", draftName: null }),
      setSaveStatus: (s) => set({ saveStatus: s }),
    }));
    ```

    **Critical invariant:** `useAutoSave.ts:72` subscribes ONLY to `activeName`. `draftName` changes fire the general zustand subscription but the gated subscriber shortcircuits on `state.activeName === prevState.activeName`. Therefore draftName keystrokes do NOT trigger auto-save. Commit triggers auto-save exactly once (when activeName changes).

    Smoke-test this in task verification: temporarily log inside useAutoSave and confirm only one `triggerDebouncedSave` fires per commit, none during typing.

    **cadStore.ts — `renameRoomNoHistory` (genuine pushHistory bypass):**

    Add `renameRoomNoHistory: (id: string, name: string) => void;` to CADState. Implement WITHOUT calling `pushHistory`:
    ```typescript
    renameRoomNoHistory: (id, name) =>
      set(
        produce((s: CADState) => {
          if (!s.rooms[id]) return;
          // NOTE: No pushHistory(s) — this is a genuine bypass for live-preview keystrokes.
          s.rooms[id].name = name;
        })
      ),
    ```

    The existing `renameRoom` at line 1031 DOES call `pushHistory(s)` (verified). The NoHistory variant skips that call — so keystroke preview does NOT flood undo history. Commit via `renameRoom` pushes one history entry.
  </action>
  <verify>
    <automated>grep -q "draftName" src/stores/projectStore.ts &amp;&amp; grep -q "commitDraftName" src/stores/projectStore.ts &amp;&amp; grep -q "setDraftName" src/stores/projectStore.ts &amp;&amp; grep -q "renameRoomNoHistory" src/stores/cadStore.ts &amp;&amp; npm run build 2>&amp;1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `grep "draftName" src/stores/projectStore.ts` matches (interface field + state init + 3 action references)
    - `grep "commitDraftName" src/stores/projectStore.ts` matches (interface + impl)
    - `grep "setDraftName" src/stores/projectStore.ts` matches
    - `grep "renameRoomNoHistory" src/stores/cadStore.ts` matches
    - `renameRoomNoHistory` impl does NOT call `pushHistory` (grep its body — no `pushHistory(s)` inside the produce block)
    - `commitDraftName` flushes draftName to activeName only when non-null + non-empty-after-trim
    - `useAutoSave.ts` is NOT modified (the existing `activeName`-only subscription handles the flush correctly)
    - `npm run build` succeeds
  </acceptance_criteria>
  <done>Store fields added. draftName is a genuine auto-save bypass (checker warning 4 resolved via option a). renameRoomNoHistory is a genuine pushHistory bypass.</done>
</task>

<task type="auto">
  <name>Task 2: Create src/components/ui/InlineEditableText.tsx by extracting Phase 31 LabelOverrideInput</name>
  <files>src/components/ui/InlineEditableText.tsx</files>
  <read_first>
    - src/components/PropertiesPanel.tsx:292-403 (LabelOverrideInput — MANDATORY, verbatim source)
    - .planning/phases/33-design-system-ui-polish/33-RESEARCH.md Pitfall 4 + Pattern 2
    - .planning/phases/33-design-system-ui-polish/33-CONTEXT.md D-23/D-24/D-25/D-27
  </read_first>
  <action>
    Create `src/components/ui/InlineEditableText.tsx`:

    ```typescript
    import { useEffect, useRef, useState } from "react";

    export interface InlineEditableTextProps {
      value: string;
      onLivePreview: (v: string) => void;
      onCommit: (v: string) => void;
      maxLength?: number;
      placeholder?: string;
      className?: string;
      "data-testid"?: string;
    }

    /**
     * Phase 33 GH #88: inline-edit primitive.
     * Extracted from Phase 31 LabelOverrideInput (src/components/PropertiesPanel.tsx:292-403).
     * Invariants preserved: skipNextBlurRef (Pitfall 4), live-preview NoHistory writes, commit on Enter/blur, revert on Escape.
     */
    export function InlineEditableText({
      value,
      onLivePreview,
      onCommit,
      maxLength = 60,
      placeholder,
      className,
      "data-testid": testId,
    }: InlineEditableTextProps) {
      const [draft, setDraft] = useState(value);
      const originalRef = useRef(value);
      const skipNextBlurRef = useRef(false);
      const inputRef = useRef<HTMLInputElement>(null);

      // Reseed when external value changes (selection swap etc.)
      useEffect(() => {
        setDraft(value);
        originalRef.current = value;
      }, [value]);

      function commit() {
        if (skipNextBlurRef.current) {
          skipNextBlurRef.current = false;
          return;
        }
        const trimmed = draft.trim();
        if (trimmed === "") {
          // D-27: empty → revert
          cancel();
          return;
        }
        const final = trimmed.slice(0, maxLength);
        onCommit(final);
        originalRef.current = final;
      }

      function cancel() {
        skipNextBlurRef.current = true;
        onLivePreview(originalRef.current);
        setDraft(originalRef.current);
      }

      return (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={maxLength}
          placeholder={placeholder}
          data-testid={testId}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            onLivePreview(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              inputRef.current?.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
              inputRef.current?.blur();
            }
          }}
          onBlur={commit}
          className={
            "bg-transparent outline-none border-b border-transparent focus:border-accent cursor-text " +
            (className ?? "")
          }
        />
      );
    }

    // Test driver — gated, targets the active InlineEditableText via data-testid
    if (import.meta.env.MODE === "test") {
      (window as any).__driveInlineTitleEdit = {
        type: (text: string, testid = "inline-doc-title") => {
          const input = document.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement | null;
          if (!input) return;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          setter?.call(input, text);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        },
        commit: (testid = "inline-doc-title") => {
          const input = document.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement | null;
          input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        },
        cancel: (testid = "inline-doc-title") => {
          const input = document.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement | null;
          input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        },
        getDraft: (testid = "inline-doc-title") => {
          const input = document.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement | null;
          return input?.value ?? "";
        },
      };
    }
    ```

    Invariants to cross-check against Phase 31:
    - skipNextBlurRef: ✓
    - originalRef: ✓
    - useEffect reseeds on value change: ✓
    - Empty commit reverts: ✓
    - maxLength slice: ✓
    - Escape preventDefault + blur: ✓
  </action>
  <verify>
    <automated>test -f src/components/ui/InlineEditableText.tsx &amp;&amp; grep -q "skipNextBlurRef" src/components/ui/InlineEditableText.tsx &amp;&amp; grep -q "originalRef" src/components/ui/InlineEditableText.tsx &amp;&amp; npm run build 2>&amp;1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - File exists
    - Contains `skipNextBlurRef` ref
    - Contains `originalRef` ref
    - Contains Escape handler calling `cancel` + `blur`
    - Contains Enter handler calling `commit` + `blur`
    - Contains `onChange` calling `onLivePreview`
    - Contains `maxLength` default of 60
    - Contains empty-commit revert logic (D-27)
    - Test driver `__driveInlineTitleEdit` gated
    - `tests/phase33/inlineTitleEdit.test.ts` first 2 assertions GREEN
  </acceptance_criteria>
  <done>Primitive ready for Toolbar + RoomTabs wiring.</done>
</task>

<task type="auto">
  <name>Task 3: Relocate doc title to Toolbar (binds to draftName/commitDraftName); remove editable input from ProjectManager; wire RoomTabs with NoHistory bypass</name>
  <files>src/components/Toolbar.tsx, src/components/ProjectManager.tsx, src/components/RoomTabs.tsx</files>
  <read_first>
    - src/components/Toolbar.tsx (full — identify center slot; brand "OBSIDIAN CAD" is at ~line 42 per research)
    - src/components/ProjectManager.tsx (full — find the existing project-name input at ~line 72)
    - src/components/RoomTabs.tsx (full — 64 lines per research; identify room.name.toUpperCase() at line 32)
    - src/components/ui/InlineEditableText.tsx (Task 2 output)
    - src/stores/projectStore.ts + src/stores/cadStore.ts (Task 1 output — draftName, commitDraftName, renameRoomNoHistory)
  </read_first>
  <action>
    **Part A — Toolbar.tsx (add doc title slot — binds to draftName/commitDraftName for genuine auto-save bypass):**

    Add a center slot between the existing toolbar sections (left tool palette, right actions). Render:
    ```tsx
    import { InlineEditableText } from "@/components/ui/InlineEditableText";
    import { useProjectStore } from "@/stores/projectStore";
    // ...
    const activeName = useProjectStore(s => s.activeName);
    const draftName = useProjectStore(s => s.draftName);
    const setDraftName = useProjectStore(s => s.setDraftName);
    const commitDraftName = useProjectStore(s => s.commitDraftName);

    // Display value = draftName during edit, activeName otherwise
    const displayValue = draftName ?? activeName;
    // ...
    <div className="flex-1 flex items-center justify-center">
      <InlineEditableText
        value={displayValue}
        onLivePreview={(v) => setDraftName(v)}
        onCommit={(v) => {
          // v is already trimmed + sliced by InlineEditableText; commitDraftName will also guard.
          // Ensure draftName is set so commit flushes (edge case: user pastes full value + Enter).
          setDraftName(v);
          commitDraftName();
        }}
        maxLength={60}
        data-testid="inline-doc-title"
        className="font-mono text-sm text-text-primary text-center min-w-40"
      />
    </div>
    ```

    Place between the brand cluster and the right-hand actions (undo/redo/save status/view mode). Ensure the flexbox layout doesn't crowd — the center slot should truncate gracefully on narrow viewports.

    **Auto-save invariant (per D-23 + checker warning 4):** Typing into the inline input calls `setDraftName(keystroke)` — auto-save ignores `draftName` changes (it subscribes only to `activeName`). On Enter/blur, `commitDraftName()` flushes `draftName → activeName` in a single `set()` call, triggering the auto-save subscription exactly once per commit. Manual verification: open devtools, type 5 characters in the title, press Enter — auto-save fires once, not 5 times.

    **Part B — ProjectManager.tsx (remove the input):**

    Remove the existing `<input value={projectName} onChange={setActiveName}>` block. Replace with a read-only display or simply remove the row entirely — project name is now edited in Toolbar. Keep Save / Load / New / Delete buttons.

    Optional: Show a small read-only label in ProjectManager for clarity:
    ```tsx
    <div className="font-mono text-sm text-text-dim">Editing: {activeName}</div>
    ```

    **Part C — RoomTabs.tsx (inline-edit room names with genuine NoHistory bypass):**

    Currently `room.name.toUpperCase()` displayed at line 32 per research. Replace the non-editable label with InlineEditableText:
    ```tsx
    import { InlineEditableText } from "@/components/ui/InlineEditableText";
    // ...
    <InlineEditableText
      value={room.name}
      onLivePreview={(v) => useCADStore.getState().renameRoomNoHistory(room.id, v)}
      onCommit={(v) => useCADStore.getState().renameRoom(room.id, v)}
      maxLength={60}
      data-testid={`inline-room-tab-${room.id}`}
      className="font-mono text-sm"
    />
    ```

    Because `renameRoomNoHistory` skips `pushHistory` (verified in Task 1), keystroke preview does NOT flood undo. Commit via `renameRoom` pushes exactly one history entry.

    **Note on case:** Phase 02 noted dynamic identifiers stay UPPERCASE (D-04). Room names were displayed `.toUpperCase()`. For consistency with inline-editable UX, DROP the uppercase transform — edits now show what the user typed. If user wants UPPERCASE display, they can type it. Document this decision in SUMMARY.

    **Only-active-tab editable (optional):** If all tabs being clickable-to-edit breaks the tab-switch UX (click would ambiguate between "switch tab" and "edit label"), wrap only the active tab's label in InlineEditableText and render inactive tabs as plain text. Per D-25 (single-click enters edit mode), the safer default is: clicking a non-active tab switches to it; clicking the ALREADY-active tab's label enters edit mode. Implement that guard.
  </action>
  <verify>
    <automated>grep -q "InlineEditableText" src/components/Toolbar.tsx &amp;&amp; grep -q "InlineEditableText" src/components/RoomTabs.tsx &amp;&amp; grep -q "inline-doc-title" src/components/Toolbar.tsx &amp;&amp; grep -q "commitDraftName\|setDraftName" src/components/Toolbar.tsx &amp;&amp; grep -q "renameRoomNoHistory" src/components/RoomTabs.tsx &amp;&amp; npm run build 2>&amp;1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `grep "InlineEditableText" src/components/Toolbar.tsx` matches
    - `grep "inline-doc-title" src/components/Toolbar.tsx` matches (data-testid for driver)
    - `grep "setDraftName\|commitDraftName" src/components/Toolbar.tsx` matches (binds to draft bypass, NOT to setActiveName directly)
    - Toolbar's `onLivePreview` callback uses `setDraftName` (NOT `setActiveName`) — verified by grepping the InlineEditableText prop block
    - `grep "InlineEditableText" src/components/RoomTabs.tsx` matches
    - `grep "renameRoomNoHistory" src/components/RoomTabs.tsx` matches (live-preview uses NoHistory variant)
    - `grep "renameRoom(room.id" src/components/RoomTabs.tsx` matches (commit uses history-pushing variant)
    - ProjectManager.tsx no longer has `<input ... onChange={.*setActiveName}>` editable binding (grep returns zero direct bindings of that shape)
    - `tests/phase33/inlineTitleEdit.test.ts` full suite GREEN (including "Toolbar renders InlineEditableText" + "projectStore exposes draftName/commitDraftName")
    - `npm run build` succeeds
    - Manual smoke: type 5 chars in Toolbar title, verify auto-save subscriber does not fire mid-typing (per D-23 genuine bypass); press Enter, verify it fires exactly once.
  </acceptance_criteria>
  <done>Doc title in Toolbar is inline-editable with genuine auto-save bypass; room tabs inline-editable with NoHistory bypass; ProjectManager simplified.</done>
</task>

</tasks>

<verification>
```bash
npm test -- --run tests/phase33/inlineTitleEdit.test.ts
npm run build 2>&1 | tail -3

# Manual: Edit doc title in Toolbar, type 5 chars, watch auto-save subscriber count — should fire 0 times during typing, 1 time on Enter.
# Manual: Edit room tab name, type 5 chars, watch past[] length — should grow by 0 during typing, by 1 on Enter.
```
</verification>

<success_criteria>
- [ ] projectStore has `draftName` + `setDraftName` + `commitDraftName` (genuine auto-save bypass — option a)
- [ ] cadStore has `renameRoomNoHistory` (genuine pushHistory bypass)
- [ ] InlineEditableText primitive exists with Phase 31 invariants
- [ ] Doc title relocated to Toolbar (center slot) — binds to `setDraftName` / `commitDraftName`
- [ ] ProjectManager project-name input REMOVED
- [ ] RoomTabs labels use InlineEditableText with `renameRoomNoHistory` preview / `renameRoom` commit
- [ ] `tests/phase33/inlineTitleEdit.test.ts` GREEN
- [ ] Auto-save (Phase 28) fires exactly once per commit (verified by the fact that useAutoSave subscription is on `activeName`, which mutates only inside `commitDraftName`)
- [ ] Checker warning 4 resolved (no semantic theater — `draftName` is a real field, not a rename of `activeName`)
</success_criteria>

<output>
After completion, create `.planning/phases/33-design-system-ui-polish/33-09-SUMMARY.md` documenting:
- Store additions: `draftName`, `setDraftName`, `commitDraftName` (projectStore); `renameRoomNoHistory` (cadStore)
- D-23 genuine bypass via `draftName` field (checker warning 4 resolved)
- InlineEditableText primitive + Phase 31 invariants preserved
- Doc title relocation decision (Toolbar, per research recommendation)
- Room tab case decision (mixed-case; UPPERCASE dropped for editable tabs)
- Auto-save verification: fires once per commit, zero times during typing
- Closes #88
</output>
</output>
