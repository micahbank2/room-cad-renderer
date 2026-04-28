// src/lib/shortcuts.ts
// Phase 52 (HOTKEY-01): single source of truth for keyboard shortcuts.
//
// Two consumers:
//   1. src/components/help/helpContent.tsx  — reads SHORTCUT_DISPLAY_LIST for the overlay
//   2. src/App.tsx                          — calls buildRegistry(ctx) for the keyboard handler
//
// ITERATION-ORDER INVARIANT (do not reorder lightly):
// Modifier-gated entries MUST come before bare-key entries with the same letter.
// Example: "Copy selected" (Ctrl/Cmd+C) must precede "Ceiling tool" (bare C).
// The App.tsx registry loop returns on first match — if bare C appears first,
// Ctrl+C would activate the Ceiling tool instead of copying.
// The unit test at tests/lib/shortcuts.registry.test.ts asserts this ordering.
//
// AUDIT INVARIANT: every conditional branch in src/App.tsx keyboard handler
// must have a corresponding entry here AND in EXPECTED_ACTIONS in the test.

import type { ToolType } from "@/types/cad";
import { PRESETS } from "@/three/cameraPresets";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore } from "@/stores/cadStore";
import { copySelection, pasteSelection } from "@/lib/clipboardActions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShortcutGroup =
  | "Tools"
  | "Editing"
  | "View"
  | "Camera Presets"
  | "3D & Walk"
  | "Rooms"
  | "Help";

/** Display-only shape consumed by helpContent.tsx + helpIndex.ts. */
export interface ShortcutDisplay {
  keys: string[];
  action: string;
  group: ShortcutGroup;
  context?: string;
}

/** Full runtime entry — used only by the App.tsx keyboard handler. */
export interface Shortcut extends ShortcutDisplay {
  /**
   * Returns true when this shortcut should fire for the given event.
   * The App.tsx active-element guard (INPUT/TEXTAREA/SELECT) runs BEFORE any
   * match() call — predicates may assume focus is not in a form field.
   */
  match: (e: KeyboardEvent) => boolean;
  handler: () => void;
}

/** Context passed from App.tsx to buildRegistry(). */
export interface ShortcutContext {
  viewMode: "2d" | "3d" | "split" | "library";
  setTool: (tool: ToolType) => void;
}

// ---------------------------------------------------------------------------
// Display list — exactly the entries the overlay shows.
// Order respects the iteration-order invariant (modifier-gated entries first).
// ---------------------------------------------------------------------------

export const SHORTCUT_DISPLAY_LIST: ShortcutDisplay[] = [
  // --- Editing (modifier-gated — MUST come before bare-key Tools) ---
  { keys: ["Ctrl", "Z"], action: "Undo", group: "Editing" },
  { keys: ["Ctrl", "Shift", "Z"], action: "Redo", group: "Editing" },
  { keys: ["Cmd", "C"], action: "Copy selected", group: "Editing", context: "On Mac (Ctrl+C on Windows/Linux)" },
  { keys: ["Cmd", "V"], action: "Paste", group: "Editing", context: "On Mac (Ctrl+V on Windows/Linux)" },
  { keys: ["Delete"], action: "Delete selected", group: "Editing" },
  { keys: ["Backspace"], action: "Delete selected wall or product", group: "Editing" },
  { keys: ["Escape"], action: "Cancel current action / close modal", group: "Editing" },
  { keys: ["Double-click"], action: "Edit wall dimension label", group: "Editing", context: "On a wall length label" },
  { keys: ["Shift"], action: "Free rotate (no 15° snap)", group: "Editing", context: "While dragging rotation handle" },
  { keys: ["Shift"], action: "Orthogonal constraint while drawing walls", group: "Editing", context: "Hold while drawing" },

  // --- Rooms (modifier-gated — MUST come before bare-key entries) ---
  { keys: ["Cmd", "Tab"], action: "Cycle to next room", group: "Rooms", context: "Ctrl+Tab on Windows/Linux" },

  // --- Camera Presets (bare digit keys — no conflict with bare letters) ---
  { keys: ["1"], action: "Camera preset: Eye level", group: "Camera Presets", context: "3D or split view" },
  { keys: ["2"], action: "Camera preset: Top down", group: "Camera Presets", context: "3D or split view" },
  { keys: ["3"], action: "Camera preset: 3/4 view", group: "Camera Presets", context: "3D or split view" },
  { keys: ["4"], action: "Camera preset: Corner", group: "Camera Presets", context: "3D or split view" },

  // --- View ---
  { keys: ["0"], action: "Reset canvas view", group: "View", context: "2D or split view" },

  // --- 3D & Walk ---
  { keys: ["E"], action: "Toggle walk/orbit camera", group: "3D & Walk", context: "3D or split view" },
  { keys: ["W", "A", "S", "D"], action: "Move forward / left / back / right", group: "3D & Walk", context: "Walk mode" },
  { keys: ["Mouse"], action: "Look around", group: "3D & Walk", context: "Walk mode with pointer lock" },

  // --- Tools (bare keys — must come AFTER modifier-gated Copy/Paste) ---
  { keys: ["V"], action: "Select tool", group: "Tools" },
  { keys: ["W"], action: "Wall tool", group: "Tools" },
  { keys: ["D"], action: "Door tool", group: "Tools" },
  { keys: ["N"], action: "Window tool", group: "Tools" },
  { keys: ["C"], action: "Ceiling tool", group: "Tools" },

  // --- Help ---
  { keys: ["?"], action: "Open keyboard shortcuts", group: "Help" },
];

// ---------------------------------------------------------------------------
// Runtime registry factory — called by App.tsx
// ---------------------------------------------------------------------------

function cycleRoomForward(): boolean {
  const st = useCADStore.getState();
  const ids = Object.keys(st.rooms);
  if (ids.length < 2 || !st.activeRoomId) return false;
  const i = ids.indexOf(st.activeRoomId);
  st.switchRoom(ids[(i + 1) % ids.length]);
  return true;
}

/**
 * Build the runtime shortcut registry. Called from App.tsx inside useMemo([viewMode, setTool]).
 *
 * Order respects ITERATION-ORDER INVARIANT:
 *   1. Modifier-gated entries (Ctrl/Cmd+C, +V, +Tab, +Z, etc.)
 *   2. Camera Presets (bare digits 1-4 — no letter conflict)
 *   3. Bare-key View/Walk entries (0, E)
 *   4. Bare-key Tools (V/W/D/N/C — must come AFTER modifier-gated Copy/Paste)
 *   5. Help (?)
 */
export function buildRegistry(ctx: ShortcutContext): Shortcut[] {
  const { viewMode, setTool } = ctx;

  const registry: Shortcut[] = [];

  // ---- Modifier-gated entries (FIRST, before any bare-key letter shortcut) ----

  // Copy (Ctrl/Cmd+C)
  registry.push({
    keys: ["Cmd", "C"],
    action: "Copy selected",
    group: "Editing",
    context: "On Mac (Ctrl+C on Windows/Linux)",
    match: (e) => e.key.toLowerCase() === "c" && (e.ctrlKey || e.metaKey) && !e.shiftKey,
    handler: () => { copySelection(); },
  });

  // Paste (Ctrl/Cmd+V)
  registry.push({
    keys: ["Cmd", "V"],
    action: "Paste",
    group: "Editing",
    context: "On Mac (Ctrl+V on Windows/Linux)",
    match: (e) => e.key.toLowerCase() === "v" && (e.ctrlKey || e.metaKey) && !e.shiftKey,
    handler: () => { pasteSelection(); },
  });

  // Cycle to next room (Ctrl/Cmd+Tab)
  registry.push({
    keys: ["Cmd", "Tab"],
    action: "Cycle to next room",
    group: "Rooms",
    context: "Ctrl+Tab on Windows/Linux",
    match: (e) => e.key === "Tab" && (e.ctrlKey || e.metaKey),
    handler: () => { cycleRoomForward(); },
  });

  // ---- Camera Presets (bare digits 1-4) ----
  for (const preset of PRESETS) {
    registry.push({
      keys: [preset.key],
      action: `Camera preset: ${preset.label}`,
      group: "Camera Presets",
      context: "3D or split view",
      match: (e) => {
        if (e.key !== preset.key) return false;
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false;
        if (viewMode !== "3d" && viewMode !== "split") return false;
        if (useUIStore.getState().cameraMode === "walk") return false;
        return true;
      },
      handler: () => { useUIStore.getState().requestPreset(preset.id); },
    });
  }

  // ---- View / 3D-Walk bare-key entries ----

  // Reset canvas view (0)
  registry.push({
    keys: ["0"],
    action: "Reset canvas view",
    group: "View",
    context: "2D or split view",
    match: (e) => e.key === "0" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
      && (viewMode === "2d" || viewMode === "split"),
    handler: () => { useUIStore.getState().resetView(); },
  });

  // Toggle walk/orbit camera (E)
  registry.push({
    keys: ["E"],
    action: "Toggle walk/orbit camera",
    group: "3D & Walk",
    context: "3D or split view",
    match: (e) => e.key.toLowerCase() === "e" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
      && (viewMode === "3d" || viewMode === "split"),
    handler: () => { useUIStore.getState().toggleCameraMode(); },
  });

  // ---- Bare-key Tools (AFTER modifier-gated Copy/Paste) ----
  const toolMap: Record<string, { tool: ToolType; action: string }> = {
    v: { tool: "select", action: "Select tool" },
    w: { tool: "wall", action: "Wall tool" },
    d: { tool: "door", action: "Door tool" },
    n: { tool: "window", action: "Window tool" },
    c: { tool: "ceiling", action: "Ceiling tool" },
  };
  for (const [letter, info] of Object.entries(toolMap)) {
    registry.push({
      keys: [letter.toUpperCase()],
      action: info.action,
      group: "Tools",
      match: (e) => e.key.toLowerCase() === letter
        && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
        && viewMode !== "library",
      handler: () => { setTool(info.tool); },
    });
  }

  // ---- Help (? key — Shift+/ on US layout) ----
  registry.push({
    keys: ["?"],
    action: "Open keyboard shortcuts",
    group: "Help",
    match: (e) => e.key === "?" || (e.key === "/" && e.shiftKey),
    handler: () => { useUIStore.getState().openHelp("shortcuts"); },
  });

  return registry;
}
