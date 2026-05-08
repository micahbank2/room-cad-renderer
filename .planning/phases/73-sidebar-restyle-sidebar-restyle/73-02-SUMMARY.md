---
phase: 73-sidebar-restyle-sidebar-restyle
plan: "02"
subsystem: App shell / right panel
tags: [animation, contextual-ui, framer-motion, properties-panel]
dependency_graph:
  requires: []
  provides: [contextual-right-panel, animated-properties-panel]
  affects: [src/App.tsx]
tech_stack:
  added: [motion/react AnimatePresence, springTransition]
  patterns: [conditional mount, spring slide, reduced-motion guard]
key_files:
  modified: [src/App.tsx]
decisions:
  - "Wrapped the 2D canvas div in flex layout (added inner div for FabricCanvas+ToolPalette) so the motion.div slides in as a sibling rather than an absolute overlay"
  - "Pre-existing 4 test failures in App.restore.test.tsx are caused by Sidebar.tsx JSX mismatch (PanelSection / CollapsibleSection) — out of scope for this plan"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-07"
  tasks: 1
  files: 1
---

# Phase 73 Plan 02: Contextual PropertiesPanel with AnimatePresence Summary

**One-liner:** Added `AnimatePresence` + `motion.div` around both PropertiesPanel mount sites in App.tsx, conditioned on `selectedIds.length > 0`, with a spring slide-in from the right and reduced-motion guard.

---

## Changes Made to App.tsx

### Imports added (top of file)
```ts
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { springTransition } from "@/lib/motion";
```

### State reads added (inside App component, near existing useUIStore calls)
```ts
const selectedIds = useUIStore((s) => s.selectedIds);
const reduced = useReducedMotion();
```

### Site 1 — 2D/split branch (previously bare `<PropertiesPanel />`)
The containing `<div>` was restructured from `relative` to `flex`, with an inner `div` holding `<FabricCanvas>` + `<ToolPalette>`, and the panel moved into an `AnimatePresence` sibling:

```tsx
<div className="... flex">
  <div className="flex-1 h-full relative">
    <FabricCanvas ... />
    <ToolPalette />
  </div>
  <AnimatePresence>
    {selectedIds.length > 0 && (
      <motion.div
        key="properties-panel"
        className="w-72 h-full shrink-0 overflow-y-auto bg-card border-l border-border"
        initial={{ x: 288, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 288, opacity: 0 }}
        transition={springTransition(reduced)}
      >
        <PropertiesPanel productLibrary={productLibrary} viewMode={viewMode} />
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

### Site 2 — 3D-only branch (previously `{viewMode === "3d" && <PropertiesPanel />}`)
```tsx
<AnimatePresence>
  {viewMode === "3d" && selectedIds.length > 0 && (
    <motion.div
      key="properties-panel-3d"
      className="w-72 h-full shrink-0 overflow-y-auto bg-card border-l border-border"
      initial={{ x: 288, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 288, opacity: 0 }}
      transition={springTransition(reduced)}
    >
      <PropertiesPanel productLibrary={productLibrary} viewMode={viewMode} />
    </motion.div>
  )}
</AnimatePresence>
```

---

## D-16 Driver Check

PropertiesPanel contains test driver registrations. The plan notes these are already StrictMode-safe and should not be disturbed. This plan only changes where PropertiesPanel is mounted in the tree (conditioned on selectedIds) — no driver code was touched. On deselection, PropertiesPanel unmounts and its driver cleanup functions fire. On reselection, the component remounts and registers fresh drivers. No identity-check issue was observed (drivers are registered in useEffect with cleanup), so this is safe per the existing pattern.

If e2e tests reveal stale driver references after a select → deselect → reselect cycle, a follow-up plan should add the Set<() => void> pattern (CLAUDE.md Phase 58 fix) to the affected driver registrations.

---

## Test Results

- TypeScript: clean compile (one pre-existing deprecation warning on `baseUrl` in tsconfig, not new)
- Vitest: 863 passed, 4 failed
  - All 4 failures are pre-existing, caused by a JSX mismatch in `src/components/Sidebar.tsx` (`PanelSection` opened, `CollapsibleSection` used as closing tag at line 100). This error exists on `main` before these changes and is out of scope for this plan.
  - No new test failures introduced.

---

## Deviations from Plan

### Structural deviation — flex wrapper for Site 1

**What:** The plan's Site 1 description implied wrapping only the bare `<PropertiesPanel>` inside `AnimatePresence`. In the actual App.tsx, PropertiesPanel was rendered inside a `relative`-positioned div alongside `<FabricCanvas>` and `<ToolPalette>`. A bare AnimatePresence wrap at that level would have stacked the panel incorrectly.

**Fix:** Changed the outer container from `relative` to `relative flex`, moved FabricCanvas + ToolPalette into an inner `flex-1` div, and placed the AnimatePresence + motion.div as a flex sibling. This achieves D-10 (canvas `flex-1` fills freed space naturally on exit) and matches the plan's intent exactly.

**Classification:** Rule 1 auto-fix (structural correction to make the animation work as specified).

---

## Known Stubs

None. The panel is fully wired to the real `selectedIds` from uiStore.

## Self-Check: PASSED

- src/App.tsx: exists and modified
- Commit b19e62b: confirmed present
- grep "AnimatePresence" src/App.tsx: 2 occurrences (both sites)
- grep "selectedIds.length > 0" src/App.tsx: 2 occurrences
- grep "x: 288" src/App.tsx: 2 occurrences (initial + exit on each site)
