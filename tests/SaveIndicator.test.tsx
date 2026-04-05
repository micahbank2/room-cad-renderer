import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SaveIndicator from "@/components/SaveIndicator";
import { useProjectStore } from "@/stores/projectStore";

beforeEach(() => {
  useProjectStore.setState({ activeId: null, activeName: "Untitled Room", saveStatus: "idle" });
});

describe("SaveIndicator component", () => {
  it("renders nothing when status is idle", () => {
    useProjectStore.setState({ saveStatus: "idle" });
    const { container } = render(<SaveIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("renders SAVING when status is saving", () => {
    useProjectStore.setState({ saveStatus: "saving" });
    render(<SaveIndicator />);
    const el = screen.getByTestId("save-indicator");
    expect(el).toHaveTextContent("SAVING...");
    expect(el.className).toContain("text-text-dim");
  });

  it("renders SAVED when status is saved", () => {
    useProjectStore.setState({ saveStatus: "saved" });
    render(<SaveIndicator />);
    const el = screen.getByTestId("save-indicator");
    expect(el).toHaveTextContent("SAVED");
    expect(el.className).toContain("text-success");
  });
});
