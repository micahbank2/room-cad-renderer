// tests/components/PropertiesPanel.opening.test.tsx
// Phase 61 OPEN-01 (D-12 C1-C3): kind-aware opening editor rendering.
//
// Phase 82 Plan 82-03 (IA-05) migration: clicking an opening row no
// longer expands an inline editor inside OpeningsSection — it sets
// uiStore.selectedOpeningId, and the editor surface moves to
// <OpeningInspector>. Tests now render OpeningInspector directly for
// the kind-specific assertions (Depth presence/absence, Height
// placeholder). The data-testid + label contracts are preserved
// verbatim (D-06).
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { OpeningInspector } from "@/components/inspectors/OpeningInspector";
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

function clickTab(name: string) {
  const tabs = screen.queryAllByRole("tab");
  const tab = tabs.find((t) => (t.textContent ?? "").trim() === name);
  if (tab) act(() => { tab.click(); });
}

describe("Phase 61 — OpeningInspector kind-aware rendering (C1-C3, updated for Phase 82 IA-05)", () => {
  beforeEach(() => {
    // OpeningInspector + NumericRow are pure store consumers; no
    // cross-test state to clear here.
  });

  it("C1: niche shows Depth input on the Position tab", () => {
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
    render(<OpeningInspector wall={wall} opening={niche} />);
    // Niche openings are non-window — Type tab is default. Switch to
    // Dimensions for the W/H/Sill assertions, then Position for Depth.
    clickTab("Dimensions");
    // Phase 71 D-09: labels are mixed-case ("Width" not "WIDTH")
    expect(screen.getByText("Width")).toBeTruthy();
    expect(screen.getByText("Height")).toBeTruthy();
    expect(screen.getByText("Sill")).toBeTruthy();
    clickTab("Position");
    expect(screen.getByText("Offset")).toBeTruthy();
    expect(screen.getByText("Depth")).toBeTruthy();
    expect(screen.getByTestId("opening-depth-op1")).toBeTruthy();
  });

  it("C2: passthrough shows wall-height placeholder on the Height input (Dimensions tab)", () => {
    const passthrough: Opening = {
      id: "op2",
      type: "passthrough",
      offset: 2,
      width: 5,
      height: 8,
      sillHeight: 0,
    };
    const wall = makeWall([passthrough]);
    render(<OpeningInspector wall={wall} opening={passthrough} />);
    clickTab("Dimensions");
    const heightInputs = screen.getAllByPlaceholderText("Wall height");
    expect(heightInputs.length).toBe(1);
  });

  it("C3: archway hides the Depth input on the Position tab", () => {
    const archway: Opening = {
      id: "op3",
      type: "archway",
      offset: 1,
      width: 3,
      height: 7,
      sillHeight: 0,
    };
    const wall = makeWall([archway]);
    render(<OpeningInspector wall={wall} opening={archway} />);
    clickTab("Position");
    // Phase 71 D-09: label is mixed-case ("Depth" not "DEPTH")
    expect(screen.queryByText("Depth")).toBeNull();
    expect(screen.queryByTestId("opening-depth-op3")).toBeNull();
  });
});
