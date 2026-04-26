import { describe, it, expect } from "vitest";

describe("ThreeViewport — hiddenIds filter (D-11)", () => {
  it("walls .map filters by !effectivelyHidden.has(wall.id)", () => {
    // Plan 04 implementation
  });
  it("placedProducts .map filters", () => {
    // Plan 04
  });
  it("ceilings .map filters", () => {
    // Plan 04
  });
  it("placedCustomElements .map filters", () => {
    // Plan 04
  });
  it("FabricCanvas.tsx is NOT touched (D-11 boundary — 2D ignores hiddenIds)", () => {
    // Plan 04 must guard this — no diff for src/canvas/FabricCanvas.tsx
  });
});
