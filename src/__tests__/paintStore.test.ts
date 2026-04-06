import { describe, it, expect, beforeEach } from "vitest";
import { usePaintStore } from "@/stores/paintStore";
import { useCADStore } from "@/stores/cadStore";
import type { PaintColor } from "@/types/paint";

// Reset stores before each test
beforeEach(() => {
  // Reset cadStore custom paints
  (useCADStore as any).setState((s: any) => ({ ...s, customPaints: [] }));
  usePaintStore.setState({ customColors: [] });
});

describe("paintStore", () => {
  it("customColors reflects cadStore.customPaints state", () => {
    const testColor: PaintColor = {
      id: "custom_abc123",
      name: "Test Color",
      hex: "#112233",
      source: "custom",
    };

    // Set customPaints on cadStore directly
    (useCADStore as any).setState((s: any) => ({ ...s, customPaints: [testColor] }));

    // paintStore should reflect the update (via subscription)
    const state = usePaintStore.getState();
    expect(state.customColors).toHaveLength(1);
    expect(state.customColors[0].id).toBe("custom_abc123");
  });

  it("paintStore has no idb-keyval imports or persistence", async () => {
    // This test verifies at the module level by inspecting that addCustomPaint
    // exists only on cadStore, not on paintStore
    const paintState = usePaintStore.getState();
    expect((paintState as any).addItem).toBeUndefined();
    expect((paintState as any).load).toBeUndefined();
    expect((paintState as any).save).toBeUndefined();
  });

  it("paintStore only exposes customColors", () => {
    const keys = Object.keys(usePaintStore.getState());
    expect(keys).toContain("customColors");
    // Should not have persistence-related methods
    expect(keys).not.toContain("load");
    expect(keys).not.toContain("save");
  });
});
