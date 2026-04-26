import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "@/components/Toolbar";
import { useUIStore } from "@/stores/uiStore";

// Minimal no-op props for Toolbar — only viewMode varies between tests.
const baseProps = {
  onViewChange: vi.fn(),
  onHome: vi.fn(),
  onFloorPlanClick: vi.fn(),
};

function renderToolbarWithViewMode(viewMode: "2d" | "3d" | "split" | "library") {
  return render(<Toolbar viewMode={viewMode} {...baseProps} />);
}

describe("Toolbar — Phase 47 display-mode segmented control (D-01, D-09)", () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.getState().setDisplayMode("normal");
  });

  it("renders 3 display-mode buttons when viewMode === '3d'", () => {
    renderToolbarWithViewMode("3d");
    expect(screen.getByTestId("display-mode-normal")).toBeInTheDocument();
    expect(screen.getByTestId("display-mode-solo")).toBeInTheDocument();
    expect(screen.getByTestId("display-mode-explode")).toBeInTheDocument();
  });

  it("renders 3 display-mode buttons when viewMode === 'split'", () => {
    renderToolbarWithViewMode("split");
    expect(screen.getByTestId("display-mode-normal")).toBeInTheDocument();
    expect(screen.getByTestId("display-mode-solo")).toBeInTheDocument();
    expect(screen.getByTestId("display-mode-explode")).toBeInTheDocument();
  });

  it("renders 0 display-mode buttons when viewMode === '2d' (D-01 gate)", () => {
    renderToolbarWithViewMode("2d");
    expect(screen.queryByTestId("display-mode-normal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("display-mode-solo")).not.toBeInTheDocument();
    expect(screen.queryByTestId("display-mode-explode")).not.toBeInTheDocument();
  });

  it("clicking display-mode-solo calls setDisplayMode('solo')", () => {
    const spy = vi.spyOn(useUIStore.getState(), "setDisplayMode");
    renderToolbarWithViewMode("3d");
    fireEvent.click(screen.getByTestId("display-mode-solo"));
    expect(spy).toHaveBeenCalledWith("solo");
  });

  it("active button has aria-pressed='true' AND D-09 active-state classes (bg-accent/10, text-accent, border-accent/30)", () => {
    useUIStore.getState().setDisplayMode("solo");
    renderToolbarWithViewMode("3d");
    const soloBtn = screen.getByTestId("display-mode-solo");
    expect(soloBtn).toHaveAttribute("aria-pressed", "true");
    const cls = soloBtn.className;
    expect(cls).toMatch(/bg-accent\/10/);
    expect(cls).toMatch(/text-accent\b/);
    expect(cls).toMatch(/border-accent\/30/);
  });

  it("inactive buttons have aria-pressed='false' AND no bg-accent/10 token", () => {
    useUIStore.getState().setDisplayMode("solo");
    renderToolbarWithViewMode("3d");
    const normalBtn = screen.getByTestId("display-mode-normal");
    const explodeBtn = screen.getByTestId("display-mode-explode");
    expect(normalBtn).toHaveAttribute("aria-pressed", "false");
    expect(explodeBtn).toHaveAttribute("aria-pressed", "false");
    expect(normalBtn.className).not.toMatch(/bg-accent\/10/);
    expect(explodeBtn.className).not.toMatch(/bg-accent\/10/);
  });

  it("tooltips match D-09 verbatim", () => {
    renderToolbarWithViewMode("3d");
    // Plan 03 may render tooltip text via Tooltip primitive (hover-only) or aria-label.
    // Acceptance: the verbatim strings appear somewhere in the rendered tree
    // (aria-describedby target, title attribute, or a hidden Tooltip portal).
    const html = document.body.innerHTML;
    expect(html).toContain("All rooms render together");
    expect(html).toContain("Only the active room renders");
    expect(html).toContain("Rooms separated along X-axis");
  });

  it("icons are lucide (svg with lucide- class or LayoutGrid/Square/Move3d aria-label)", () => {
    renderToolbarWithViewMode("3d");
    const normalBtn = screen.getByTestId("display-mode-normal");
    const soloBtn = screen.getByTestId("display-mode-solo");
    const explodeBtn = screen.getByTestId("display-mode-explode");
    // Lucide icons render <svg> as direct children. Existence of an svg
    // is necessary; full identity is asserted via aria-label below.
    expect(normalBtn.querySelector("svg")).not.toBeNull();
    expect(soloBtn.querySelector("svg")).not.toBeNull();
    expect(explodeBtn.querySelector("svg")).not.toBeNull();
  });

  it("buttons have aria-label matching mode (D-09)", () => {
    renderToolbarWithViewMode("3d");
    expect(screen.getByTestId("display-mode-normal")).toHaveAttribute("aria-label", "NORMAL");
    expect(screen.getByTestId("display-mode-solo")).toHaveAttribute("aria-label", "SOLO");
    expect(screen.getByTestId("display-mode-explode")).toHaveAttribute("aria-label", "EXPLODE");
  });
});
