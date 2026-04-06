import { describe, it, expect } from "vitest";
import { resolvePaintHex } from "@/lib/colorUtils";
import { FB_COLORS } from "@/data/farrowAndBall";
import type { PaintColor } from "@/types/paint";

describe("resolvePaintHex", () => {
  it("returns correct hex for a known F&B id (first entry)", () => {
    const first = FB_COLORS[0];
    const result = resolvePaintHex(first.id, []);
    expect(result).toBe(first.hex);
  });

  it("returns correct hex for a custom color passed in array", () => {
    const custom: PaintColor = {
      id: "custom_test123",
      name: "My Custom Color",
      hex: "#aabbcc",
      source: "custom",
    };
    const result = resolvePaintHex("custom_test123", [custom]);
    expect(result).toBe("#aabbcc");
  });

  it("returns fallback '#f8f5ef' for unknown id", () => {
    const result = resolvePaintHex("unknown_id_xyz", []);
    expect(result).toBe("#f8f5ef");
  });

  it("returns custom fallback when provided", () => {
    const result = resolvePaintHex("unknown_id_xyz", [], "#ffffff");
    expect(result).toBe("#ffffff");
  });
});
