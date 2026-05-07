/**
 * Phase 72 Plan 03 — PanelSection unit tests
 * TDD RED phase: tests written before implementation.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PanelSection } from "@/components/ui/PanelSection";

const STORAGE_KEY = "ui:propertiesPanel:sections";

// Reset localStorage before each test (do NOT clear __drivePanelSection — it's registered once at module load)
beforeEach(() => {
  localStorage.clear();
});

describe("PanelSection", () => {
  it("Test 1: renders collapsed by default when defaultOpen=false", () => {
    render(
      <PanelSection id="test-1" label="Section 1" defaultOpen={false}>
        <div>Content 1</div>
      </PanelSection>
    );
    const btn = screen.getByRole("button", { name: /Section 1/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("Test 2: renders expanded by default when defaultOpen=true (default)", () => {
    render(
      <PanelSection id="test-2" label="Section 2">
        <div>Content 2</div>
      </PanelSection>
    );
    const btn = screen.getByRole("button", { name: /Section 2/i });
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("Test 3: clicking header toggles open/closed", () => {
    render(
      <PanelSection id="test-3" label="Section 3" defaultOpen={false}>
        <div>Content 3</div>
      </PanelSection>
    );
    const btn = screen.getByRole("button", { name: /Section 3/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("Test 4: persists open state to localStorage under ui:propertiesPanel:sections key", () => {
    render(
      <PanelSection id="test-4" label="Section 4" defaultOpen={false}>
        <div>Content 4</div>
      </PanelSection>
    );
    const btn = screen.getByRole("button", { name: /Section 4/i });
    fireEvent.click(btn);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored["test-4"]).toBe(true);
  });

  it("Test 5: reads persisted state on mount (localStorage continuity with CollapsibleSection)", () => {
    // Pre-seed localStorage as CollapsibleSection would have stored it
    const initial = { "test-5": false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));

    render(
      <PanelSection id="test-5" label="Section 5" defaultOpen={true}>
        <div>Content 5</div>
      </PanelSection>
    );
    const btn = screen.getByRole("button", { name: /Section 5/i });
    // Should read persisted false, not use defaultOpen=true
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("Test 6: aria-expanded reflects open state", () => {
    render(
      <PanelSection id="test-6" label="Section 6" defaultOpen={true}>
        <div>Content 6</div>
      </PanelSection>
    );
    const btn = screen.getByRole("button", { name: /Section 6/i });
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("Test 7: data-panel-id attribute present with correct id", () => {
    const { container } = render(
      <PanelSection id="test-7" label="Section 7">
        <div>Content 7</div>
      </PanelSection>
    );
    const el = container.querySelector('[data-panel-id="test-7"]');
    expect(el).not.toBeNull();
  });

  it("Test 8: __drivePanelSection.toggle(id) toggles the section", () => {
    render(
      <PanelSection id="test-8" label="Section 8" defaultOpen={false}>
        <div>Content 8</div>
      </PanelSection>
    );
    const driver = (window as Record<string, unknown>).__drivePanelSection as {
      toggle: (id: string) => void;
      getOpen: (id: string) => boolean;
      getPersisted: () => Record<string, boolean>;
    };
    expect(driver).toBeDefined();
    act(() => { driver.toggle("test-8"); });
    const btn = screen.getByRole("button", { name: /Section 8/i });
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("Test 9: __drivePanelSection.getOpen(id) returns current state", () => {
    render(
      <PanelSection id="test-9" label="Section 9" defaultOpen={true}>
        <div>Content 9</div>
      </PanelSection>
    );
    const driver = (window as Record<string, unknown>).__drivePanelSection as {
      toggle: (id: string) => void;
      getOpen: (id: string) => boolean;
      getPersisted: () => Record<string, boolean>;
    };
    expect(driver.getOpen("test-9")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Section 9/i }));
    expect(driver.getOpen("test-9")).toBe(false);
  });

  it("Test 10: __drivePanelSection.getPersisted() returns localStorage object", () => {
    render(
      <PanelSection id="test-10" label="Section 10" defaultOpen={true}>
        <div>Content 10</div>
      </PanelSection>
    );
    const driver = (window as Record<string, unknown>).__drivePanelSection as {
      toggle: (id: string) => void;
      getOpen: (id: string) => boolean;
      getPersisted: () => Record<string, boolean>;
    };
    fireEvent.click(screen.getByRole("button", { name: /Section 10/i }));
    const persisted = driver.getPersisted();
    expect(persisted["test-10"]).toBe(false);
  });
});
