import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { useCADStore } from "@/stores/cadStore";

describe("Rotation preset chips — file-level contracts (GH #87)", () => {
  it("PropertiesPanel includes a RotationPresetChips row", () => {
    const src = fs.readFileSync(path.resolve("src/components/PropertiesPanel.tsx"), "utf-8");
    const hasPresets = /RotationPresetChips|data-rotation-preset/.test(src);
    expect(hasPresets).toBe(true);
  });
  it("test driver window.__driveRotationPreset documented", () => {
    const readme = fs.readFileSync(path.resolve("tests/phase33/README.md"), "utf-8");
    expect(readme).toMatch(/__driveRotationPreset/);
  });
  it("PropertiesPanel uses rotateProduct (history-pushing), NOT rotateProductNoHistory, in the preset block", () => {
    const src = fs.readFileSync(path.resolve("src/components/PropertiesPanel.tsx"), "utf-8");
    const presetBlock = src.match(/RotationPresetChips[\s\S]{0,800}/);
    if (presetBlock) {
      expect(presetBlock[0]).toMatch(/rotateProduct\(/);
      expect(presetBlock[0]).not.toMatch(/rotateProductNoHistory/);
    } else {
      // If chips are implemented differently, still require history-pushing action
      expect(src).toMatch(/rotateProduct\(/);
    }
  });
});

// Store-level behavior test — pure jsdom, no React/Fabric/R3F needed.
// D-20 invariant: one click = exactly one past[] entry.
describe("Rotation preset — single-undo invariant (D-20)", () => {
  let productId: string;

  beforeEach(() => {
    // Reset store to a clean state with one room + one placed product.
    // cadStore exposes addRoom(name) and placeProduct(productId, position).
    // Plan 08 may refine seeding; this is the minimum viable scene.
    const store = useCADStore.getState();
    store.addRoom("rotation-test-room");
    productId = store.placeProduct("seed-product-id", { x: 0, y: 0 });
  });

  it("one rotateProduct call increments past.length by exactly 1", () => {
    const before = useCADStore.getState().past.length;
    useCADStore.getState().rotateProduct(productId, 45);
    const after = useCADStore.getState().past.length;
    expect(after - before).toBe(1);
  });

  it("rotateProductNoHistory does NOT increment past.length", () => {
    const before = useCADStore.getState().past.length;
    useCADStore.getState().rotateProductNoHistory(productId, 90);
    const after = useCADStore.getState().past.length;
    expect(after - before).toBe(0);
  });
});
