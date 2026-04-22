---
phase: 33-design-system-ui-polish
plan: 07
type: execute
wave: 3
depends_on: [00, 01, 02, 03, 06]
files_modified:
  - src/components/ui/GestureChip.tsx
  - src/canvas/FabricCanvas.tsx
  - src/three/ThreeViewport.tsx
autonomous: true
requirements:
  - "GH #86"
must_haves:
  truths:
    - "In 2D mode, a glass-panel chip at bottom-left reads 'Drag to pan  •  Wheel to zoom'"
    - "In 3D mode, the chip reads 'L-drag rotate  •  R-drag pan  •  Wheel zoom'"
    - "Chip has a dismiss X that sets localStorage['ui:gestureChip:dismissed']=true; dismissed stays hidden until localStorage cleared"
    - "Chip hides during active drag (uiStore.isDragging === true) — reuses Plan 06 bridge"
  artifacts:
    - path: "src/components/ui/GestureChip.tsx"
      provides: "Reusable chip component with 2D/3D copy variants and localStorage dismiss"
    - path: "src/canvas/FabricCanvas.tsx"
      provides: "Mounts GestureChip with mode='2d'"
    - path: "src/three/ThreeViewport.tsx"
      provides: "Mounts GestureChip with mode='3d' in DOM overlay"
  key_links:
    - from: "src/components/ui/GestureChip.tsx"
      to: "localStorage['ui:gestureChip:dismissed']"
      via: "readUIBool / writeUIBool from src/lib/uiPersistence.ts"
      pattern: "ui:gestureChip:dismissed"
    - from: "src/components/ui/GestureChip.tsx"
      to: "src/stores/uiStore.ts"
      via: "useUIStore(s => s.isDragging) (Plan 06 bridge)"
      pattern: "isDragging"
---

<objective>
Ship GH #86 — persistent gesture affordance chip in the bottom-left of both 2D and 3D canvas viewports. Different copy per mode. Dismissible with X button; dismissal persists across reloads. Hides during active drag (reuses Plan 06 uiStore.isDragging).

Purpose: Jessica is new to CAD conventions; a one-time discoverable hint lowers learning curve. Dismiss so it's not noise for returning sessions.

Output: `src/components/ui/GestureChip.tsx` reusable across 2D and 3D; both viewports mount it.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-design-system-ui-polish/33-UI-SPEC.md
@.planning/phases/33-design-system-ui-polish/33-CONTEXT.md
@src/lib/uiPersistence.ts
@src/hooks/useReducedMotion.ts
@src/canvas/FabricCanvas.tsx
@src/three/ThreeViewport.tsx

<interfaces>
GestureChip props:
  mode: "2d" | "3d"

Copy (UI-SPEC Copywriting Contract D-16):
  2D: "Drag to pan  •  Wheel to zoom"
  3D: "L-drag rotate  •  R-drag pan  •  Wheel zoom"

Styling (UI-SPEC):
  Container: absolute bottom-left, inset 8px (--spacing-sm per UI-SPEC Conflict Note; was 12px in D-17)
  className: "glass-panel rounded-lg px-2 py-1 flex items-center gap-2 text-text-dim font-mono text-sm"
  Dismiss button: lucide X 10px, text-text-ghost hover:text-text-muted
  z-index: 10 (below floating toolbar z-20 from Plan 06)

Visibility (D-15 + D-18):
  visible = !dismissed && !isDragging

Dismissal (D-15):
  localStorage key: "ui:gestureChip:dismissed"
  value: "true" when dismissed
  Use readUIBool / writeUIBool from Plan 04 Task 1.

Mount sites:
  2D: inside FabricCanvas wrapper (same wrapper as Plan 06 FloatingSelectionToolbar)
  3D: DOM overlay inside ThreeViewport parent div (OUTSIDE R3F Canvas — DOM chip, not 3D). Simpler than hooking R3F event bus per research.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create src/components/ui/GestureChip.tsx with 2D/3D copy + localStorage dismiss + drag-hide</name>
  <files>src/components/ui/GestureChip.tsx</files>
  <read_first>
    - src/lib/uiPersistence.ts (Plan 04 output — readUIBool/writeUIBool)
    - src/stores/uiStore.ts (Plan 06 output — isDragging)
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md sections "Gesture Chip" + "Copywriting Contract"
    - .planning/phases/33-design-system-ui-polish/33-CONTEXT.md D-15/D-16/D-17/D-18
  </read_first>
  <action>
    Create `src/components/ui/GestureChip.tsx`:

    ```typescript
    import { useState } from "react";
    import { X } from "lucide-react";
    import { useUIStore } from "@/stores/uiStore";
    import { readUIBool, writeUIBool } from "@/lib/uiPersistence";

    const DISMISS_KEY = "ui:gestureChip:dismissed";

    const COPY_2D = "Drag to pan  \u2022  Wheel to zoom";
    const COPY_3D = "L-drag rotate  \u2022  R-drag pan  \u2022  Wheel zoom";

    export function GestureChip({ mode }: { mode: "2d" | "3d" }) {
      const isDragging = useUIStore(s => s.isDragging);
      const [dismissed, setDismissed] = useState<boolean>(() => readUIBool(DISMISS_KEY));

      if (dismissed || isDragging) return null;

      function handleDismiss() {
        writeUIBool(DISMISS_KEY, true);
        setDismissed(true);
      }

      const text = mode === "2d" ? COPY_2D : COPY_3D;
      return (
        <div
          className="glass-panel rounded-lg px-2 py-1 flex items-center gap-2 text-text-dim font-mono text-sm absolute bottom-2 left-2 z-10 pointer-events-auto"
          data-gesture-chip-mode={mode}
        >
          <span>{text}</span>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-text-ghost hover:text-text-muted"
            aria-label="Dismiss gesture hint"
          >
            <X size={10} />
          </button>
        </div>
      );
    }

    // Test driver — gated
    if (import.meta.env.MODE === "test") {
      (window as any).__driveGestureChip = {
        isVisible: () => !!document.querySelector("[data-gesture-chip-mode]"),
        getMode: (): "2d" | "3d" | null => {
          const el = document.querySelector("[data-gesture-chip-mode]");
          return (el?.getAttribute("data-gesture-chip-mode") as "2d" | "3d") ?? null;
        },
        dismiss: () => {
          const btn = document.querySelector('[aria-label="Dismiss gesture hint"]') as HTMLButtonElement | null;
          btn?.click();
        },
        getPersistedDismissed: () => readUIBool(DISMISS_KEY),
      };
    }
    ```

    Note: `\u2022` is the bullet character `•` — use unicode escape so the test regex in Plan 00 matches literal string `Drag to pan` and `L-drag rotate`.

    Inset 8px (bottom-2 left-2 = 8px per Tailwind v4 default). UI-SPEC Conflict Note drops 12px, uses 8px (--spacing-sm).
  </action>
  <verify>
    <automated>npm test -- --run tests/phase33/gestureChip.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - Component file exists
    - Contains literal "Drag to pan" text
    - Contains literal "L-drag rotate" text
    - Uses localStorage key "ui:gestureChip:dismissed"
    - Imports X from lucide-react
    - Imports readUIBool/writeUIBool from @/lib/uiPersistence
    - Subscribes to useUIStore.isDragging
    - Test driver `__driveGestureChip` gated
    - `tests/phase33/gestureChip.test.ts` GREEN
  </acceptance_criteria>
  <done>Component is testable and self-contained.</done>
</task>

<task type="auto">
  <name>Task 2: Mount GestureChip in FabricCanvas (2D) and ThreeViewport (3D DOM overlay)</name>
  <files>src/canvas/FabricCanvas.tsx, src/three/ThreeViewport.tsx</files>
  <read_first>
    - src/canvas/FabricCanvas.tsx (Plan 06 output — wrapperRef with position: relative)
    - src/three/ThreeViewport.tsx (full — find the parent div around the R3F Canvas)
  </read_first>
  <action>
    **Part A — FabricCanvas.tsx (2D):**

    Mount inside the same wrapper that holds FloatingSelectionToolbar (Plan 06):
    ```tsx
    import { GestureChip } from "@/components/ui/GestureChip";
    // ...
    <div ref={wrapperRef} className="relative ...">
      <canvas ref={canvasRef} />
      <FloatingSelectionToolbar fc={fabricCanvasRef.current} wrapperRef={wrapperRef} />
      <GestureChip mode="2d" />
    </div>
    ```

    **Part B — ThreeViewport.tsx (3D DOM overlay):**

    3D mount is a DOM sibling of the R3F `<Canvas>`, NOT inside the 3D scene:
    ```tsx
    import { GestureChip } from "@/components/ui/GestureChip";
    // ...
    return (
      <div className="relative w-full h-full">
        <Canvas /* R3F config */>
          <Scene />
        </Canvas>
        <GestureChip mode="3d" />
      </div>
    );
    ```

    The parent div must be `position: relative` so the chip's `absolute bottom-2 left-2` anchors to the viewport.

    **Invariant:** No new R3F event bus wiring needed. The chip is DOM-only; drag detection comes from the uiStore bridge (Plan 06). 3D drag currently isn't wired to uiStore — only 2D selectTool is — which is acceptable: the chip persists in 3D during actual orbit drags because uiStore.isDragging stays false. That's fine per D-18 intent (hide during 2D drags); 3D orbit is not the same interaction. If user wants 3D drag-hide, it's a future enhancement (note in SUMMARY).
  </action>
  <verify>
    <automated>grep -q "GestureChip" src/canvas/FabricCanvas.tsx && grep -q "GestureChip" src/three/ThreeViewport.tsx && grep -q "mode=\"2d\"" src/canvas/FabricCanvas.tsx && grep -q "mode=\"3d\"" src/three/ThreeViewport.tsx && npm run build 2>&amp;1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `grep "GestureChip" src/canvas/FabricCanvas.tsx` matches
    - `grep "GestureChip" src/three/ThreeViewport.tsx` matches
    - `grep "mode=\"2d\"" src/canvas/FabricCanvas.tsx` matches
    - `grep "mode=\"3d\"" src/three/ThreeViewport.tsx` matches
    - ThreeViewport parent div uses `position: relative` (Tailwind `relative`)
    - `npm run build` succeeds
    - Manual smoke: chip visible at bottom-left in both 2D and 3D views; dismiss persists across reload
  </acceptance_criteria>
  <done>GestureChip wired in both viewports.</done>
</task>

</tasks>

<verification>
```bash
npm test -- --run tests/phase33/gestureChip.test.ts
npm run build 2>&1 | tail -3
```
</verification>

<success_criteria>
- [ ] `src/components/ui/GestureChip.tsx` exists
- [ ] 2D chip text: "Drag to pan  •  Wheel to zoom"
- [ ] 3D chip text: "L-drag rotate  •  R-drag pan  •  Wheel zoom"
- [ ] Dismiss persists via localStorage
- [ ] Mounted in both FabricCanvas and ThreeViewport
- [ ] `tests/phase33/gestureChip.test.ts` GREEN
</success_criteria>

<output>
After completion, create `.planning/phases/33-design-system-ui-polish/33-07-SUMMARY.md` documenting:
- Component + copy strings
- localStorage key
- Mount sites
- Known limitation: 3D orbit drag doesn't hide chip (uiStore.isDragging wired only for 2D selectTool) — note as acceptable per D-18 scope; file follow-up if user complains
- Closes #86
</output>
