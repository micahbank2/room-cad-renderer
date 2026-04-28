import { describe, test, expect } from "vitest";
import { hasClipboardContent } from "@/lib/clipboardActions";

// getActionsForKind and computeFlip are pure functions extracted for testing.
// CanvasContextMenu.tsx exports them for test access (added Task 2).
// For unit testing pre-implementation, test the logic contracts directly.

describe("clipboardActions — hasClipboardContent", () => {
  test("returns false initially (no copy performed)", () => {
    // _clipboard starts null in a fresh module import
    expect(hasClipboardContent()).toBe(false);
  });
});

describe("auto-flip math", () => {
  function computeFlippedX(anchorX: number, menuWidth: number, vw: number): number {
    let x = anchorX;
    if (x + menuWidth > vw) x = x - menuWidth;
    return Math.max(0, x);
  }
  function computeFlippedY(anchorY: number, menuHeight: number, vh: number): number {
    let y = anchorY;
    if (y + menuHeight > vh) y = y - menuHeight;
    return Math.max(0, y);
  }

  test("anchor near right edge -> flips leftward", () => {
    // 900 + 200 = 1100 > 1024 → flip to 700
    expect(computeFlippedX(900, 200, 1024)).toBe(700);
  });

  test("anchor within viewport -> no flip", () => {
    // 400 + 200 = 600 < 1024 → stays at 400
    expect(computeFlippedX(400, 200, 1024)).toBe(400);
  });

  test("anchor near bottom edge -> flips upward", () => {
    // 680 + 150 = 830 > 768 → flip to 530
    expect(computeFlippedY(680, 150, 768)).toBe(530);
  });

  test("anchor within vertical viewport -> no flip", () => {
    // 300 + 150 = 450 < 768 → stays at 300
    expect(computeFlippedY(300, 150, 768)).toBe(300);
  });
});

// Action set length tests are in a separate describe after Task 2 completes (CanvasContextMenu created).
// See tests/lib/contextMenuActionCounts.test.ts (added in Task 2).
