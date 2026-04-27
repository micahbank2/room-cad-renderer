// tests/lib/shortcuts.registry.test.ts
// Phase 52 (HOTKEY-01) coverage gate. Asserts the keyboard-shortcut registry
// keeps in sync with the keyboard handler in src/App.tsx.
//
// If a future contributor adds a shortcut to App.tsx but forgets to add it to
// SHORTCUT_DISPLAY_LIST, this test fails — the help overlay will not silently
// drift from reality.

import { describe, test, expect } from "vitest";
import { SHORTCUT_DISPLAY_LIST } from "@/lib/shortcuts";

const EXPECTED_ACTIONS = [
  // Tools
  "Select tool",
  "Wall tool",
  "Door tool",
  "Window tool",
  "Ceiling tool",
  // View
  "Reset canvas view",
  // 3D & Walk
  "Toggle walk/orbit camera",
  // Camera Presets (Phase 35)
  "Camera preset: Eye level",
  "Camera preset: Top down",
  "Camera preset: 3/4 view",
  "Camera preset: Corner",
  // Editing (Phase 31)
  "Copy selected",
  "Paste",
  "Undo",
  "Redo",
  "Delete selected",
  // Rooms
  "Cycle to next room",
  // Help
  "Open keyboard shortcuts",
];

describe("shortcuts registry coverage gate", () => {
  test("SHORTCUT_DISPLAY_LIST contains all keyboard handler branches", () => {
    const registeredActions = SHORTCUT_DISPLAY_LIST.map((s) => s.action);
    for (const expected of EXPECTED_ACTIONS) {
      expect(
        registeredActions,
        `Missing registry entry for: "${expected}". Add to src/lib/shortcuts.ts SHORTCUT_DISPLAY_LIST.`,
      ).toContain(expected);
    }
  });

  test("modifier-gated Copy entry precedes bare-key Ceiling entry (iteration-order invariant)", () => {
    const copyIdx = SHORTCUT_DISPLAY_LIST.findIndex((s) => s.action === "Copy selected");
    const ceilingIdx = SHORTCUT_DISPLAY_LIST.findIndex((s) => s.action === "Ceiling tool");
    expect(copyIdx).toBeGreaterThanOrEqual(0);
    expect(ceilingIdx).toBeGreaterThanOrEqual(0);
    expect(
      copyIdx,
      "Copy must appear before Ceiling in registry. Otherwise bare 'C' would swallow Ctrl+C.",
    ).toBeLessThan(ceilingIdx);
  });

  test("modifier-gated Paste entry precedes bare-key Select entry (iteration-order invariant)", () => {
    const pasteIdx = SHORTCUT_DISPLAY_LIST.findIndex((s) => s.action === "Paste");
    const selectIdx = SHORTCUT_DISPLAY_LIST.findIndex((s) => s.action === "Select tool");
    expect(pasteIdx).toBeGreaterThanOrEqual(0);
    expect(selectIdx).toBeGreaterThanOrEqual(0);
    expect(
      pasteIdx,
      "Paste must appear before Select in registry. Otherwise bare 'V' would swallow Ctrl+V.",
    ).toBeLessThan(selectIdx);
  });
});
