/**
 * Phase 81 Plan 01 — Sidebar IA-02 contract
 *
 * Verifies the "left sidebar default visibility" contract:
 * 1. Sidebar mounts 7 PanelSections with the stable sidebar-* ids.
 * 2. On a fresh user state (empty localStorage), only sidebar-rooms-tree is
 *    expanded; every other section is collapsed.
 * 3. Toggling a section persists to localStorage["ui:propertiesPanel:sections"]
 *    and survives an unmount/remount.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Sidebar from "@/components/Sidebar";

const STORAGE_KEY = "ui:propertiesPanel:sections";

const EXPECTED_IDS = [
  "sidebar-rooms-tree",
  "sidebar-room-config",
  "sidebar-snap",
  "sidebar-custom-elements",
  "sidebar-framed-art",
  "sidebar-wainscoting",
  "sidebar-product-library",
] as const;

beforeEach(() => {
  localStorage.clear();
});

describe("Sidebar — IA-02 contract (Phase 81 Plan 01)", () => {
  it("mounts every section with its stable sidebar-* id", () => {
    render(<Sidebar productLibrary={[]} />);
    for (const id of EXPECTED_IDS) {
      const el = document.querySelector(`[data-panel-id="${id}"]`);
      expect(el, `missing data-panel-id="${id}"`).not.toBeNull();
    }
  });

  it("on fresh state, only sidebar-rooms-tree is expanded by default", () => {
    render(<Sidebar productLibrary={[]} />);
    for (const id of EXPECTED_IDS) {
      const panel = document.querySelector(`[data-panel-id="${id}"]`);
      const btn = panel?.querySelector("button");
      const expected = id === "sidebar-rooms-tree" ? "true" : "false";
      expect(btn?.getAttribute("aria-expanded"), `${id} aria-expanded`).toBe(expected);
    }
  });

  it("uses mixed-case labels per CLAUDE.md D-09 (no UPPERCASE)", () => {
    render(<Sidebar productLibrary={[]} />);
    const labelById: Record<string, string> = {
      "sidebar-rooms-tree": "Rooms",
      "sidebar-room-config": "Room config",
      "sidebar-snap": "Snap",
      "sidebar-custom-elements": "Custom elements",
      "sidebar-framed-art": "Framed art library",
      "sidebar-wainscoting": "Wainscoting library",
      "sidebar-product-library": "Product library",
    };
    for (const [id, label] of Object.entries(labelById)) {
      const panel = document.querySelector(`[data-panel-id="${id}"]`);
      const btn = panel?.querySelector("button");
      // aria-label on the section-toggle button comes from PanelSection
      expect(btn?.getAttribute("aria-label"), `${id} aria-label`).toBe(label);
    }
  });

  it("expanding a panel persists to localStorage under the canonical key", () => {
    const { unmount } = render(<Sidebar productLibrary={[]} />);

    // Expand "Custom elements" by clicking its section-toggle button (scoped via data-panel-id)
    const customPanel = document.querySelector('[data-panel-id="sidebar-custom-elements"]');
    const customBtn = customPanel?.querySelector("button") as HTMLButtonElement | null;
    expect(customBtn).not.toBeNull();
    act(() => {
      fireEvent.click(customBtn!);
    });

    // Persisted to canonical key
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored["sidebar-custom-elements"]).toBe(true);

    // Survives remount
    unmount();
    cleanup();
    render(<Sidebar productLibrary={[]} />);
    const remountedPanel = document.querySelector('[data-panel-id="sidebar-custom-elements"]');
    const remountedBtn = remountedPanel?.querySelector("button");
    expect(remountedBtn?.getAttribute("aria-expanded")).toBe("true");
  });
});
