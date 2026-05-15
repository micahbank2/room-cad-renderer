/**
 * Phase 81 Plan 01 — Sidebar IA-02 contract
 * (Updated in Phase 84 Plan 01 for IA-08 contextual visibility — D-06.)
 *
 * Verifies the "left sidebar default visibility" contract under two regimes:
 *
 *   Default (activeTool="select", no selection):
 *     - 4 unconditional sections mount: rooms-tree, room-config,
 *       custom-elements, product-library.
 *     - framed-art + wainscoting are HIDDEN per Phase 84 D-02 (wall must
 *       be selected to expose wall-surface catalog managers).
 *     - Only sidebar-rooms-tree expanded; others collapsed.
 *     - Toggle persists to localStorage["ui:propertiesPanel:sections"] and
 *       survives unmount/remount.
 *
 *   Wall-selected (activeTool="select", wallId in selectedIds):
 *     - All 6 sections mount including framed-art + wainscoting.
 *
 * (sidebar-snap was removed in Phase 83 D-04 — Snap migrated to the
 * FloatingToolbar Utility group.)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Sidebar from "@/components/Sidebar";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";

const STORAGE_KEY = "ui:propertiesPanel:sections";

const DEFAULT_VISIBLE_IDS = [
  "sidebar-rooms-tree",
  "sidebar-room-config",
  "sidebar-custom-elements",
  "sidebar-product-library",
] as const;

const WALL_SELECTED_ADDITIONAL_IDS = [
  "sidebar-framed-art",
  "sidebar-wainscoting",
] as const;

const ALL_LABELS: Record<string, string> = {
  "sidebar-rooms-tree": "Rooms",
  "sidebar-room-config": "Room config",
  "sidebar-custom-elements": "Custom elements",
  "sidebar-framed-art": "Framed art library",
  "sidebar-wainscoting": "Wainscoting library",
  "sidebar-product-library": "Product library",
};

beforeEach(() => {
  localStorage.clear();
  resetCADStoreForTests();
  act(() => {
    useUIStore.setState({ activeTool: "select", selectedIds: [] });
  });
});

describe("Sidebar — IA-02 contract — default sidebar state (no wall selected)", () => {
  it("mounts the 4 unconditional sections with their stable sidebar-* ids", () => {
    render(<Sidebar productLibrary={[]} />);
    for (const id of DEFAULT_VISIBLE_IDS) {
      const el = document.querySelector(`[data-panel-id="${id}"]`);
      expect(el, `missing data-panel-id="${id}"`).not.toBeNull();
    }
  });

  it("does NOT mount wall-surface sections (framed-art, wainscoting) when no wall selected", () => {
    render(<Sidebar productLibrary={[]} />);
    for (const id of WALL_SELECTED_ADDITIONAL_IDS) {
      const el = document.querySelector(`[data-panel-id="${id}"]`);
      expect(el, `sidebar-* should be hidden when no wall selected: ${id}`).toBeNull();
    }
  });

  it("on fresh state, only sidebar-rooms-tree is expanded by default", () => {
    render(<Sidebar productLibrary={[]} />);
    for (const id of DEFAULT_VISIBLE_IDS) {
      const panel = document.querySelector(`[data-panel-id="${id}"]`);
      const btn = panel?.querySelector("button");
      const expected = id === "sidebar-rooms-tree" ? "true" : "false";
      expect(btn?.getAttribute("aria-expanded"), `${id} aria-expanded`).toBe(expected);
    }
  });

  it("uses mixed-case labels per CLAUDE.md D-09 (no UPPERCASE)", () => {
    render(<Sidebar productLibrary={[]} />);
    for (const id of DEFAULT_VISIBLE_IDS) {
      const panel = document.querySelector(`[data-panel-id="${id}"]`);
      const btn = panel?.querySelector("button");
      expect(btn?.getAttribute("aria-label"), `${id} aria-label`).toBe(ALL_LABELS[id]);
    }
  });

  it("expanding a panel persists to localStorage under the canonical key", () => {
    const { unmount } = render(<Sidebar productLibrary={[]} />);

    // Expand "Custom elements" (still visible by default under D-02).
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

describe("Sidebar — IA-02 contract — with a wall selected", () => {
  function seedAndSelectWall(): string {
    act(() => {
      useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    });
    const walls = useCADStore.getState().rooms["room_main"]!.walls;
    const wallId = Object.keys(walls)[0]!;
    act(() => {
      useUIStore.setState({ activeTool: "select", selectedIds: [wallId] });
    });
    return wallId;
  }

  it("mounts all 6 sections (default 4 + framed-art + wainscoting)", () => {
    seedAndSelectWall();
    render(<Sidebar productLibrary={[]} />);
    for (const id of [...DEFAULT_VISIBLE_IDS, ...WALL_SELECTED_ADDITIONAL_IDS]) {
      const el = document.querySelector(`[data-panel-id="${id}"]`);
      expect(el, `missing data-panel-id="${id}"`).not.toBeNull();
    }
  });

  it("framed-art + wainscoting use mixed-case labels", () => {
    seedAndSelectWall();
    render(<Sidebar productLibrary={[]} />);
    for (const id of WALL_SELECTED_ADDITIONAL_IDS) {
      const panel = document.querySelector(`[data-panel-id="${id}"]`);
      const btn = panel?.querySelector("button");
      expect(btn?.getAttribute("aria-label"), `${id} aria-label`).toBe(ALL_LABELS[id]);
    }
  });

  it("framed-art + wainscoting default collapsed on fresh state", () => {
    seedAndSelectWall();
    render(<Sidebar productLibrary={[]} />);
    for (const id of WALL_SELECTED_ADDITIONAL_IDS) {
      const panel = document.querySelector(`[data-panel-id="${id}"]`);
      const btn = panel?.querySelector("button");
      expect(btn?.getAttribute("aria-expanded"), `${id} aria-expanded`).toBe("false");
    }
  });
});
