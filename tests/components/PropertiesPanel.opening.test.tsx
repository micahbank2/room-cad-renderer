// tests/components/PropertiesPanel.opening.test.tsx
// Phase 61 OPEN-01 (D-12 C1-C3): kind-aware OpeningsSection rendering.
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OpeningsSection } from "@/components/PropertiesPanel.OpeningSection";
import type { WallSegment, Opening } from "@/types/cad";

function makeWall(openings: Opening[]): WallSegment {
  return {
    id: "w1",
    start: { x: 0, y: 0 },
    end: { x: 10, y: 0 },
    thickness: 0.5,
    height: 8,
    openings,
  };
}

describe("Phase 61 — PropertiesPanel OpeningsSection (C1-C3)", () => {
  beforeEach(() => {
    // Each test mounts fresh; no cross-test state to clear here since
    // OpeningsSection is purely store-backed and the store is per-process.
  });

  it("C1: niche row shows Depth input when expanded", () => {
    const niche: Opening = {
      id: "op1",
      type: "niche",
      offset: 4,
      width: 2,
      height: 3,
      sillHeight: 3,
      depthFt: 0.5,
    };
    const wall = makeWall([niche]);
    render(<OpeningsSection wall={wall} />);
    // Expand the row.
    fireEvent.click(screen.getByTestId("opening-row-op1"));
    // Depth input is rendered with kind-specific test id.
    expect(screen.getByTestId("opening-depth-op1")).toBeTruthy();
    // Width / Height / Sill / Offset rows also present.
    expect(screen.getByText("WIDTH")).toBeTruthy();
    expect(screen.getByText("HEIGHT")).toBeTruthy();
    expect(screen.getByText("SILL")).toBeTruthy();
    expect(screen.getByText("OFFSET")).toBeTruthy();
    expect(screen.getByText("DEPTH")).toBeTruthy();
  });

  it("C2: passthrough row shows wall-height placeholder on the Height input", () => {
    const passthrough: Opening = {
      id: "op2",
      type: "passthrough",
      offset: 2,
      width: 5,
      height: 8,
      sillHeight: 0,
    };
    const wall = makeWall([passthrough]);
    render(<OpeningsSection wall={wall} />);
    fireEvent.click(screen.getByTestId("opening-row-op2"));
    // Find the Height input — it's the input with placeholder "Wall height".
    const heightInputs = screen.getAllByPlaceholderText("Wall height");
    expect(heightInputs.length).toBe(1);
  });

  it("C3: archway row hides the Depth input", () => {
    const archway: Opening = {
      id: "op3",
      type: "archway",
      offset: 1,
      width: 3,
      height: 7,
      sillHeight: 0,
    };
    const wall = makeWall([archway]);
    render(<OpeningsSection wall={wall} />);
    fireEvent.click(screen.getByTestId("opening-row-op3"));
    // Depth label must NOT be in the DOM.
    expect(screen.queryByText("DEPTH")).toBeNull();
    // No Depth input either.
    expect(screen.queryByTestId("opening-depth-op3")).toBeNull();
  });
});
