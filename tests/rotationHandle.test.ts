import { describe, it, expect } from "vitest";
import { getHandleWorldPos, snapAngle, hitTestHandle } from "@/canvas/rotationHandle";
import type { PlacedProduct } from "@/types/cad";

describe("rotation handle math", () => {
  it("snap 15: raw 22deg rounds to 15, 23deg rounds to 30", () => {
    expect(snapAngle(22, false)).toBe(15);
    expect(snapAngle(23, false)).toBe(30);
    expect(snapAngle(0, false)).toBe(0);
    expect(snapAngle(90, false)).toBe(90);
  });

  it("shift disables snap: raw angle passes through unchanged", () => {
    expect(snapAngle(22.7, true)).toBeCloseTo(22.7);
    expect(snapAngle(13.4, true)).toBeCloseTo(13.4);
  });

  it("world position: handle offset rotates with product rotation", () => {
    const pp: PlacedProduct = { id: "pp_1", productId: "prod_1", position: { x: 10, y: 10 }, rotation: 0 };
    const h0 = getHandleWorldPos(pp, 4);
    expect(h0.x).toBeCloseTo(10);
    expect(h0.y).toBeCloseTo(10 - 2 - 0.8);

    const pp90: PlacedProduct = { ...pp, rotation: 90 };
    const h90 = getHandleWorldPos(pp90, 4);
    expect(h90.x).toBeCloseTo(12.8);
    expect(h90.y).toBeCloseTo(10);
  });

  it("hitTestHandle: within 0.5ft returns true, outside returns false", () => {
    const pp: PlacedProduct = { id: "pp_1", productId: "prod_1", position: { x: 10, y: 10 }, rotation: 0 };
    const h = getHandleWorldPos(pp, 4);
    expect(hitTestHandle({ x: h.x + 0.2, y: h.y + 0.2 }, pp, 4)).toBe(true);
    expect(hitTestHandle({ x: h.x + 1.0, y: h.y + 1.0 }, pp, 4)).toBe(false);
  });
});
