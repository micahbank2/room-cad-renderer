import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Toolbar from "@/components/Toolbar";
import { useProjectStore } from "@/stores/projectStore";

beforeEach(() => {
  vi.useFakeTimers();
  useProjectStore.setState({ activeId: null, activeName: "Untitled Room", saveStatus: "idle" });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("ToolbarSaveStatus (SAVE-06 SAVE_FAILED branch)", () => {
  it("renders SAVE_FAILED in text-error when saveStatus === 'failed' (D-04)", () => {
    useProjectStore.setState({ saveStatus: "failed" });
    render(<Toolbar viewMode="2d" onViewChange={() => {}} />);
    const el = screen.getByText("SAVE_FAILED");
    expect(el).toBeInTheDocument();
    expect(el.className).toMatch(/text-error/);
  });

  it("SAVE_FAILED persists — does NOT auto-fade (D-04a)", () => {
    useProjectStore.setState({ saveStatus: "failed" });
    render(<Toolbar viewMode="2d" onViewChange={() => {}} />);
    expect(screen.getByText("SAVE_FAILED")).toBeInTheDocument();
    vi.advanceTimersByTime(5000);
    expect(screen.getByText("SAVE_FAILED")).toBeInTheDocument();
  });

  it("saved branch still renders SAVED (regression guard)", () => {
    useProjectStore.setState({ saveStatus: "saved" });
    render(<Toolbar viewMode="2d" onViewChange={() => {}} />);
    expect(screen.getByText("SAVED")).toBeInTheDocument();
    expect(screen.queryByText("SAVE_FAILED")).not.toBeInTheDocument();
  });
});
