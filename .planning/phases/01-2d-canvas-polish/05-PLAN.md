---
phase: 01-2d-canvas-polish
plan: 05
type: execute
wave: 3
depends_on: [00, 01, 02, 03, 04]
files_modified:
  - src/stores/projectStore.ts
  - src/hooks/useAutoSave.ts
  - src/components/SaveIndicator.tsx
  - src/components/ProjectManager.tsx
  - src/components/StatusBar.tsx
  - src/App.tsx
  - tests/useAutoSave.test.ts
  - tests/SaveIndicator.test.tsx
autonomous: true
requirements: [SAVE-02]
must_haves:
  truths:
    - "After any change to walls, room, or placedProducts, the project auto-saves to IndexedDB 2 seconds after the last mutation (D-11)"
    - "A subtle indicator shows 'SAVING...' then 'SAVED' and fades to idle (D-12)"
    - "If no active project exists when the user makes a change, auto-save creates 'Untitled Room' automatically (D-13)"
    - "ProjectManager reads and writes active project ID/name via projectStore (lifted from component state)"
  artifacts:
    - path: "src/stores/projectStore.ts"
      provides: "Zustand store with activeId, activeName, saveStatus + setActive, setSaveStatus actions"
      exports: ["useProjectStore"]
    - path: "src/hooks/useAutoSave.ts"
      provides: "useAutoSave() hook that subscribes to cadStore with 2s debounce, calls saveProject"
      exports: ["useAutoSave", "DEBOUNCE_MS"]
    - path: "src/components/SaveIndicator.tsx"
      provides: "reads saveStatus; renders SAVING/SAVED/hidden with fade"
      exports: ["default"]
    - path: "src/App.tsx"
      provides: "calls useAutoSave() once at top level"
      contains: "useAutoSave()"
  key_links:
    - from: "useAutoSave"
      to: "useCADStore.subscribe"
      via: "subscribe with 2s debounce on room/walls/placedProducts"
      pattern: "useCADStore.subscribe"
    - from: "useAutoSave"
      to: "saveProject + projectStore.setActive"
      via: "creates Untitled Room if no activeId (D-13)"
      pattern: "Untitled Room"
    - from: "ProjectManager"
      to: "projectStore"
      via: "reads activeId/activeName via useProjectStore"
      pattern: "useProjectStore"
---

<objective>
Implement SAVE-02: auto-save with 2-second debounce so work is never lost (D-11). Subtle SAVING/SAVED indicator in status bar that fades to idle (D-12). If no active project, auto-create "Untitled Room" on first change (D-13).

Architecture per 01-RESEARCH.md §Pattern 5:
- New Zustand `projectStore` holds activeId, activeName, saveStatus (replaces the local component state currently in ProjectManager.tsx).
- `useAutoSave` hook subscribes to `useCADStore` with a setTimeout-based debounce, compares room/walls/placedProducts (NOT past/future), calls `saveProject` from existing serialization lib.
- `SaveIndicator` component reads saveStatus and renders in the StatusBar.
- `ProjectManager` is refactored to read/write activeId/activeName via the store.

Purpose: Jessica never has to remember to save. Every change is persisted within 2s.
Output: Auto-save works end-to-end; indicator is visible; Untitled Room is created on first edit.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-2d-canvas-polish/01-RESEARCH.md
@.planning/phases/01-2d-canvas-polish/01-CONTEXT.md
@src/stores/cadStore.ts
@src/lib/serialization.ts
@src/lib/geometry.ts
@src/components/ProjectManager.tsx
@src/App.tsx

<interfaces>
From src/lib/serialization.ts:
```typescript
export async function saveProject(id: string, name: string, snapshot: CADSnapshot): Promise<void>;
```

From src/lib/geometry.ts:
```typescript
export function uid(): string;
```

From src/stores/cadStore.ts (shape of subscription state):
```typescript
interface CADState {
  room: Room;
  walls: Record<string, WallSegment>;
  placedProducts: Record<string, PlacedProduct>;
  past: CADSnapshot[];
  future: CADSnapshot[];
  ...
}
```

Zustand v5 subscribe signature:
```typescript
useCADStore.subscribe((state, prevState) => void): () => void;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create src/stores/projectStore.ts</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/stores/uiStore.ts (for Zustand v5 pattern to mirror)
    - /Users/micahbank/room-cad-renderer/.planning/phases/01-2d-canvas-polish/01-RESEARCH.md (§Pattern 5 lines 330-340)
  </read_first>
  <files>src/stores/projectStore.ts</files>
  <action>
    Create /Users/micahbank/room-cad-renderer/src/stores/projectStore.ts with exact content:

    ```typescript
    import { create } from "zustand";

    export type SaveStatus = "idle" | "saving" | "saved";

    interface ProjectState {
      activeId: string | null;
      activeName: string;
      saveStatus: SaveStatus;
      setActive: (id: string, name: string) => void;
      setActiveName: (name: string) => void;
      clearActive: () => void;
      setSaveStatus: (s: SaveStatus) => void;
    }

    export const useProjectStore = create<ProjectState>()((set) => ({
      activeId: null,
      activeName: "Untitled Room",
      saveStatus: "idle",
      setActive: (id, name) => set({ activeId: id, activeName: name }),
      setActiveName: (name) => set({ activeName: name }),
      clearActive: () => set({ activeId: null, activeName: "Untitled Room" }),
      setSaveStatus: (s) => set({ saveStatus: s }),
    }));
    ```
  </action>
  <verify>
    <automated>test -f src/stores/projectStore.ts && grep -q "useProjectStore" src/stores/projectStore.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/stores/projectStore.ts` succeeds
    - `grep -q "export type SaveStatus" src/stores/projectStore.ts` succeeds
    - `grep -q "export const useProjectStore = create" src/stores/projectStore.ts` succeeds
    - `grep -q "activeId: string | null" src/stores/projectStore.ts` succeeds
    - `grep -q "activeName: string" src/stores/projectStore.ts` succeeds
    - `grep -q "saveStatus: SaveStatus" src/stores/projectStore.ts` succeeds
    - `grep -q "setActive:" src/stores/projectStore.ts` succeeds
    - `grep -q "setSaveStatus:" src/stores/projectStore.ts` succeeds
    - `grep -q "activeName: \"Untitled Room\"" src/stores/projectStore.ts` succeeds
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>projectStore exists with activeId/activeName/saveStatus + mutation actions.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create src/hooks/useAutoSave.ts with debounce logic + tests (fake timers)</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/.planning/phases/01-2d-canvas-polish/01-RESEARCH.md (§Pattern 5 full code, lines 341-395)
    - /Users/micahbank/room-cad-renderer/src/lib/serialization.ts
    - /Users/micahbank/room-cad-renderer/src/stores/cadStore.ts
    - /Users/micahbank/room-cad-renderer/tests/useAutoSave.test.ts (stubs)
  </read_first>
  <files>src/hooks/useAutoSave.ts, tests/useAutoSave.test.ts</files>
  <behavior>
    - Test ("debounce: multiple rapid mutations collapse to a single saveProject call after 2s"): With fake timers, make 5 cadStore mutations 100ms apart. Advance 1900ms → saveProject NOT called. Advance another 200ms → saveProject called exactly ONCE.
    - Test ("auto-create: with no activeId, creates new proj_ id and sets name Untitled Room"): projectStore.activeId=null. Trigger a cadStore change. After debounce fires, projectStore.activeId matches /^proj_/ and activeName is "Untitled Room".
    - Test ("status transitions: idle -> saving -> saved -> idle"): After save fires, saveStatus goes to "saving" then (after await) "saved" then (after 2s fade timer) "idle".
  </behavior>
  <action>
    Create /Users/micahbank/room-cad-renderer/src/hooks/useAutoSave.ts with exact content:

    ```typescript
    import { useEffect } from "react";
    import { useCADStore } from "@/stores/cadStore";
    import { useProjectStore } from "@/stores/projectStore";
    import { saveProject } from "@/lib/serialization";
    import { uid } from "@/lib/geometry";

    export const DEBOUNCE_MS = 2000;
    export const FADE_MS = 2000;

    export function useAutoSave(): void {
      useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        let fadeTimer: ReturnType<typeof setTimeout> | null = null;

        const unsub = useCADStore.subscribe((state, prevState) => {
          // Only trigger on data changes, not past/future mutations
          if (
            state.room === prevState.room &&
            state.walls === prevState.walls &&
            state.placedProducts === prevState.placedProducts
          ) {
            return;
          }

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
            const { room, walls, placedProducts } = useCADStore.getState();
            await saveProject(id, name, { room, walls, placedProducts });
            useProjectStore.getState().setSaveStatus("saved");
            if (fadeTimer) clearTimeout(fadeTimer);
            fadeTimer = setTimeout(() => {
              useProjectStore.getState().setSaveStatus("idle");
            }, FADE_MS);
          }, DEBOUNCE_MS);
        });

        return () => {
          unsub();
          if (timer) clearTimeout(timer);
          if (fadeTimer) clearTimeout(fadeTimer);
        };
      }, []);
    }
    ```

    REPLACE /Users/micahbank/room-cad-renderer/tests/useAutoSave.test.ts with:
    ```typescript
    import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
    import { renderHook } from "@testing-library/react";

    vi.mock("@/lib/serialization", () => ({
      saveProject: vi.fn().mockResolvedValue(undefined),
    }));

    import { useAutoSave, DEBOUNCE_MS } from "@/hooks/useAutoSave";
    import { useCADStore } from "@/stores/cadStore";
    import { useProjectStore } from "@/stores/projectStore";
    import { saveProject } from "@/lib/serialization";

    beforeEach(() => {
      vi.useFakeTimers();
      vi.mocked(saveProject).mockClear();
      useCADStore.setState({
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {},
        past: [],
        future: [],
      });
      useProjectStore.setState({ activeId: null, activeName: "Untitled Room", saveStatus: "idle" });
    });
    afterEach(() => { vi.useRealTimers(); });

    describe("useAutoSave hook", () => {
      it("debounce: multiple rapid mutations collapse to a single saveProject call after 2s", async () => {
        renderHook(() => useAutoSave());
        // 5 mutations 100ms apart
        for (let i = 0; i < 5; i++) {
          useCADStore.getState().placeProduct(`prod_${i}`, { x: i, y: 0 });
          await vi.advanceTimersByTimeAsync(100);
        }
        // 500ms elapsed + debounce window not yet reached
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 500 - 1);
        expect(saveProject).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(2);
        // Allow pending promise to resolve
        await Promise.resolve();
        expect(saveProject).toHaveBeenCalledTimes(1);
      });

      it("auto-create: with no activeId, creates new proj_ id and sets name Untitled Room", async () => {
        renderHook(() => useAutoSave());
        expect(useProjectStore.getState().activeId).toBeNull();
        useCADStore.getState().placeProduct("prod_x", { x: 1, y: 1 });
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
        await Promise.resolve();
        const id = useProjectStore.getState().activeId;
        expect(id).not.toBeNull();
        expect(id).toMatch(/^proj_/);
        expect(useProjectStore.getState().activeName).toBe("Untitled Room");
      });

      it("status transitions: idle -> saving -> saved -> idle", async () => {
        renderHook(() => useAutoSave());
        useCADStore.getState().placeProduct("prod_y", { x: 1, y: 1 });
        expect(useProjectStore.getState().saveStatus).toBe("idle");
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
        // After timer fires but before await resolves, status is "saving" then "saved"
        await Promise.resolve();
        await Promise.resolve();
        expect(useProjectStore.getState().saveStatus).toBe("saved");
        await vi.advanceTimersByTimeAsync(2001);
        expect(useProjectStore.getState().saveStatus).toBe("idle");
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/useAutoSave.test.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/hooks/useAutoSave.ts` succeeds
    - `grep -q "export const DEBOUNCE_MS = 2000" src/hooks/useAutoSave.ts` succeeds
    - `grep -q "export function useAutoSave" src/hooks/useAutoSave.ts` succeeds
    - `grep -q "useCADStore.subscribe" src/hooks/useAutoSave.ts` succeeds
    - `grep -q "state.room === prevState.room" src/hooks/useAutoSave.ts` succeeds
    - `grep -q "state.walls === prevState.walls" src/hooks/useAutoSave.ts` succeeds
    - `grep -q "state.placedProducts === prevState.placedProducts" src/hooks/useAutoSave.ts` succeeds
    - `grep -q "name = \"Untitled Room\"" src/hooks/useAutoSave.ts` succeeds
    - `grep -q "proj_\${uid()}" src/hooks/useAutoSave.ts` succeeds
    - `grep -q "setSaveStatus(\"saving\")" src/hooks/useAutoSave.ts` succeeds
    - `grep -q "setSaveStatus(\"saved\")" src/hooks/useAutoSave.ts` succeeds
    - `grep -q "setSaveStatus(\"idle\")" src/hooks/useAutoSave.ts` succeeds
    - `npx vitest run tests/useAutoSave.test.ts` passes all 3 tests
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>useAutoSave hook debounces, auto-creates Untitled Room, transitions status through idle→saving→saved→idle; tests pass with fake timers.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create SaveIndicator component + test</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/stores/projectStore.ts (just created)
    - /Users/micahbank/room-cad-renderer/tests/SaveIndicator.test.tsx (stubs)
    - /Users/micahbank/room-cad-renderer/CLAUDE.md (Obsidian tokens: font-mono, text-text-dim, text-success)
  </read_first>
  <files>src/components/SaveIndicator.tsx, tests/SaveIndicator.test.tsx</files>
  <behavior>
    - Test: status="idle" → component renders null (or empty).
    - Test: status="saving" → renders text "SAVING..." with class text-text-dim.
    - Test: status="saved" → renders text "SAVED" with class text-success.
  </behavior>
  <action>
    Create /Users/micahbank/room-cad-renderer/src/components/SaveIndicator.tsx with exact content:

    ```tsx
    import { useProjectStore } from "@/stores/projectStore";

    export default function SaveIndicator() {
      const status = useProjectStore((s) => s.saveStatus);
      if (status === "idle") return null;
      if (status === "saving") {
        return (
          <span
            data-testid="save-indicator"
            className="font-mono text-[9px] tracking-widest text-text-dim transition-opacity duration-200"
          >
            SAVING...
          </span>
        );
      }
      return (
        <span
          data-testid="save-indicator"
          className="font-mono text-[9px] tracking-widest text-success transition-opacity duration-200"
        >
          SAVED
        </span>
      );
    }
    ```

    REPLACE /Users/micahbank/room-cad-renderer/tests/SaveIndicator.test.tsx with:
    ```tsx
    import { describe, it, expect, beforeEach } from "vitest";
    import { render, screen } from "@testing-library/react";
    import SaveIndicator from "@/components/SaveIndicator";
    import { useProjectStore } from "@/stores/projectStore";

    beforeEach(() => {
      useProjectStore.setState({ activeId: null, activeName: "Untitled Room", saveStatus: "idle" });
    });

    describe("SaveIndicator component", () => {
      it("renders nothing when status is idle", () => {
        useProjectStore.setState({ saveStatus: "idle" });
        const { container } = render(<SaveIndicator />);
        expect(container.firstChild).toBeNull();
      });

      it("renders SAVING when status is saving", () => {
        useProjectStore.setState({ saveStatus: "saving" });
        render(<SaveIndicator />);
        const el = screen.getByTestId("save-indicator");
        expect(el).toHaveTextContent("SAVING...");
        expect(el.className).toContain("text-text-dim");
      });

      it("renders SAVED when status is saved", () => {
        useProjectStore.setState({ saveStatus: "saved" });
        render(<SaveIndicator />);
        const el = screen.getByTestId("save-indicator");
        expect(el).toHaveTextContent("SAVED");
        expect(el.className).toContain("text-success");
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/SaveIndicator.test.tsx && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/components/SaveIndicator.tsx` succeeds
    - `grep -q "export default function SaveIndicator" src/components/SaveIndicator.tsx` succeeds
    - `grep -q "useProjectStore((s) => s.saveStatus)" src/components/SaveIndicator.tsx` succeeds
    - `grep -q "SAVING..." src/components/SaveIndicator.tsx` succeeds
    - `grep -q "SAVED" src/components/SaveIndicator.tsx` succeeds
    - `grep -q "text-text-dim" src/components/SaveIndicator.tsx` succeeds
    - `grep -q "text-success" src/components/SaveIndicator.tsx` succeeds
    - `grep -q "font-mono" src/components/SaveIndicator.tsx` succeeds
    - `grep -q "data-testid=\"save-indicator\"" src/components/SaveIndicator.tsx` succeeds
    - `npx vitest run tests/SaveIndicator.test.tsx` passes 3 tests
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>SaveIndicator renders per status using Obsidian tokens; tests pass.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Wire useAutoSave into App.tsx, mount SaveIndicator into StatusBar, refactor ProjectManager to use projectStore</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/App.tsx
    - /Users/micahbank/room-cad-renderer/src/components/ProjectManager.tsx (lines 12-35: currentId/projectName local state)
    - /Users/micahbank/room-cad-renderer/src/components/StatusBar.tsx
    - /Users/micahbank/room-cad-renderer/src/stores/projectStore.ts
    - /Users/micahbank/room-cad-renderer/src/hooks/useAutoSave.ts
  </read_first>
  <files>src/App.tsx, src/components/ProjectManager.tsx, src/components/StatusBar.tsx</files>
  <action>
    **A. Edit /Users/micahbank/room-cad-renderer/src/App.tsx:**

    1. Add import:
    ```typescript
    import { useAutoSave } from "@/hooks/useAutoSave";
    ```

    2. Inside `App()` component body, right after the existing `useUIStore` hook call (around line 28), add:
    ```typescript
    useAutoSave();
    ```

    **B. Refactor /Users/micahbank/room-cad-renderer/src/components/ProjectManager.tsx:**

    1. Add import:
    ```typescript
    import { useProjectStore } from "@/stores/projectStore";
    ```

    2. REMOVE the two local state hooks:
    ```typescript
    // DELETE: const [currentId, setCurrentId] = useState<string | null>(null);
    // DELETE: const [projectName, setProjectName] = useState("Untitled Project");
    ```

    3. ADD at the top of the component (replacing those):
    ```typescript
    const currentId = useProjectStore((s) => s.activeId);
    const projectName = useProjectStore((s) => s.activeName);
    const setActive = useProjectStore((s) => s.setActive);
    const clearActive = useProjectStore((s) => s.clearActive);
    const setActiveName = useProjectStore((s) => s.setActiveName);
    ```

    4. In `handleSave`: replace `setCurrentId(id); ... setProjectName(projectName)` with `setActive(id, projectName);` (use the name already in state).
       Specifically, replace `setCurrentId(id);` with `setActive(id, projectName);`.

    5. In `handleLoad`: replace `setCurrentId(project.id); setProjectName(project.name);` with `setActive(project.id, project.name);`.

    6. In `handleDelete`: replace `if (currentId === id) setCurrentId(null);` with `if (currentId === id) clearActive();`.

    7. In `handleNew`: replace `setCurrentId(null); setProjectName("Untitled Project");` with `clearActive();`. Note: clearActive sets name to "Untitled Room" to match D-13.

    8. In the projectName input's onChange: replace `setProjectName(e.target.value)` with `setActiveName(e.target.value)`.

    **C. Edit /Users/micahbank/room-cad-renderer/src/components/StatusBar.tsx:**

    1. Add import at top:
    ```typescript
    import SaveIndicator from "./SaveIndicator";
    ```

    2. Mount `<SaveIndicator />` somewhere inside the StatusBar's returned JSX. Place it as a new element in the main row (typically at the end, right side):
    ```tsx
    <SaveIndicator />
    ```
    (Insert just before the closing element of the main status bar row — read the file first to find the appropriate location.)
  </action>
  <verify>
    <automated>grep -q "useAutoSave()" src/App.tsx && grep -q "import { useAutoSave }" src/App.tsx && grep -q "useProjectStore" src/components/ProjectManager.tsx && ! grep -q "useState<string | null>(null)" src/components/ProjectManager.tsx && grep -q "SaveIndicator" src/components/StatusBar.tsx && npx tsc --noEmit && npx vitest run</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "import { useAutoSave } from \"@/hooks/useAutoSave\"" src/App.tsx` succeeds
    - `grep -q "useAutoSave()" src/App.tsx` succeeds
    - `grep -q "import { useProjectStore } from \"@/stores/projectStore\"" src/components/ProjectManager.tsx` succeeds
    - `grep -q "useProjectStore((s) => s.activeId)" src/components/ProjectManager.tsx` succeeds
    - `grep -q "setActive(id" src/components/ProjectManager.tsx` succeeds
    - `grep -q "clearActive()" src/components/ProjectManager.tsx` succeeds
    - `grep -q "setActiveName" src/components/ProjectManager.tsx` succeeds
    - `grep -c "setCurrentId" src/components/ProjectManager.tsx` returns 0
    - `grep -c "setProjectName" src/components/ProjectManager.tsx` returns 0
    - `grep -q "import SaveIndicator" src/components/StatusBar.tsx` succeeds
    - `grep -q "<SaveIndicator" src/components/StatusBar.tsx` succeeds
    - `npx tsc --noEmit` exits 0
    - `npx vitest run` exits 0 (all tests green)
  </acceptance_criteria>
  <done>useAutoSave runs at top level; ProjectManager uses projectStore; SaveIndicator visible in StatusBar.</done>
</task>

</tasks>

<verification>
- `npx vitest run` all green (all stubs across all tests now have real implementations)
- `npx tsc --noEmit` passes
- Manual (post-execute, browser): make a change (draw wall, place product) → SAVING appears 2s later → turns to SAVED → fades. Reload page: via ProjectManager, load the "Untitled Room" — changes persisted.
</verification>

<success_criteria>
SAVE-02 closed: every mutation auto-saves within 2s; indicator shows transitions; Untitled Room auto-created if no active project. Phase 1 complete.
</success_criteria>

<output>
Create `.planning/phases/01-2d-canvas-polish/01-05-SUMMARY.md` documenting: projectStore API, useAutoSave debounce + auto-create flow, SaveIndicator visual states, ProjectManager refactor from local state to store, and confirmation that all Phase 1 requirements (EDIT-06/07/08/09, SAVE-02) are closed.
</output>
