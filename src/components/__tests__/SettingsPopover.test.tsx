// Phase 87 Plan 01 — RED tests for Settings popover + theme toggle.
// Verifies THEME-01 / THEME-02 / THEME-03 / D-03 (popover stays open).
//
// Asserts:
//  1. TopBar renders a gear button with data-testid="topbar-settings-button".
//  2. Clicking the gear opens a popover with "Theme" header + 3 segments.
//  3. localStorage["room-cad-theme"]="dark" → "Dark" segment aria-checked=true.
//  4. Click Light → .dark removed from <html>; Click Dark → .dark added;
//     Click System → class follows mocked matchMedia.
//  5. D-03 — popover stays open after segment click.

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TopBar } from "@/components/TopBar";
import { TooltipProvider } from "@/components/ui/Tooltip";

// Provide deterministic matchMedia for System mode (no dark OS pref).
function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function renderTopBar() {
  return render(
    <TooltipProvider>
      <TopBar viewMode="2d" onViewChange={() => {}} />
    </TooltipProvider>,
  );
}

describe("SettingsPopover — Phase 87 (THEME-01/02/03, D-03)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    mockMatchMedia(false); // System default to light
  });

  it("renders a gear button with data-testid=topbar-settings-button in TopBar", () => {
    renderTopBar();
    const gear = screen.getByTestId("topbar-settings-button");
    expect(gear).toBeInTheDocument();
    expect(gear).toHaveAttribute("aria-label", "Settings");
  });

  it("clicking the gear opens a popover with Theme header + Light/Dark/System segments", () => {
    renderTopBar();
    const gear = screen.getByTestId("topbar-settings-button");
    fireEvent.click(gear);

    // Popover body should be in the DOM after open
    expect(screen.getByTestId("settings-popover")).toBeInTheDocument();
    // Theme section header
    expect(screen.getByText("Theme")).toBeInTheDocument();
    // Three radio options
    const radios = screen.getAllByRole("radio");
    const labels = radios.map((r) => r.textContent?.trim());
    expect(labels).toEqual(expect.arrayContaining(["Light", "Dark", "System"]));
    expect(radios).toHaveLength(3);
  });

  it("when localStorage room-cad-theme=dark, Dark segment is aria-checked", () => {
    localStorage.setItem("room-cad-theme", "dark");
    renderTopBar();
    fireEvent.click(screen.getByTestId("topbar-settings-button"));

    const radios = screen.getAllByRole("radio");
    const darkRadio = radios.find((r) => r.textContent?.trim() === "Dark");
    const lightRadio = radios.find((r) => r.textContent?.trim() === "Light");
    const systemRadio = radios.find((r) => r.textContent?.trim() === "System");

    expect(darkRadio).toHaveAttribute("aria-checked", "true");
    expect(lightRadio).toHaveAttribute("aria-checked", "false");
    expect(systemRadio).toHaveAttribute("aria-checked", "false");
  });

  it("clicking Dark adds .dark to <html>; clicking Light removes it", () => {
    renderTopBar();
    fireEvent.click(screen.getByTestId("topbar-settings-button"));

    const radios = screen.getAllByRole("radio");
    const lightRadio = radios.find((r) => r.textContent?.trim() === "Light")!;
    const darkRadio = radios.find((r) => r.textContent?.trim() === "Dark")!;

    act(() => {
      fireEvent.click(darkRadio);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("room-cad-theme")).toBe("dark");

    act(() => {
      fireEvent.click(lightRadio);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("room-cad-theme")).toBe("light");
  });

  it("clicking System follows matchMedia (dark OS pref → .dark applied)", () => {
    // System pref = dark
    mockMatchMedia(true);
    renderTopBar();
    fireEvent.click(screen.getByTestId("topbar-settings-button"));

    const radios = screen.getAllByRole("radio");
    const systemRadio = radios.find((r) => r.textContent?.trim() === "System")!;

    act(() => {
      fireEvent.click(systemRadio);
    });
    expect(localStorage.getItem("room-cad-theme")).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("D-03 — popover stays open after a segment is clicked", () => {
    renderTopBar();
    fireEvent.click(screen.getByTestId("topbar-settings-button"));
    expect(screen.getByText("Theme")).toBeInTheDocument();

    const radios = screen.getAllByRole("radio");
    const darkRadio = radios.find((r) => r.textContent?.trim() === "Dark")!;
    act(() => {
      fireEvent.click(darkRadio);
    });

    // Popover still open
    expect(screen.queryByTestId("settings-popover")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
  });
});
