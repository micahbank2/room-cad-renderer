/**
 * Phase 84 Plan 01 — IA-08 contextual visibility contract.
 *
 * Verifies D-02 gating + D-04 forceOpen on the left Sidebar:
 *
 *   D-02:
 *     - sidebar-custom-elements visible only when activeTool ∈ {select, product}
 *     - sidebar-framed-art visible only when activeTool === "select" AND
 *       selectedIds[0] is a wall id
 *     - sidebar-wainscoting same gate as sidebar-framed-art
 *
 *   D-04:
 *     - sidebar-product-library forceOpen={activeTool === "product"} —
 *       renders expanded even when persisted state says collapsed.
 *       Persisted state is NOT mutated; reverts when tool leaves "product".
 *
 * Catalog data persistence (D-05) sanity check: switching tools unmounts the
 * library section but the underlying store data survives, so remount shows
 * the previously-added catalog item.
 *
 * All assertions are RED today — Sidebar.tsx mounts the 3 target sections
 * unconditionally and PanelSection.tsx has no forceOpen prop.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Sidebar from "@/components/Sidebar";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useWainscotStyleStore } from "@/stores/wainscotStyleStore";

const STORAGE_KEY = "ui:propertiesPanel:sections";

function hasPanel(id: string): boolean {
  return document.querySelector(`[data-panel-id="${id}"]`) !== null;
}

function getAriaExpanded(id: string): string | null {
  const el = document.querySelector(`[data-panel-id="${id}"]`);
  const btn = el?.querySelector("button");
  return btn?.getAttribute("aria-expanded") ?? null;
}

beforeEach(() => {
  localStorage.clear();
  resetCADStoreForTests();
  // Reset UI store interaction state — leave the rest of UIState intact.
  act(() => {
    useUIStore.setState({ activeTool: "select", selectedIds: [] });
  });
});

describe("Sidebar IA-08 — Custom Elements gating (D-02)", () => {
  it("hidden when activeTool=wall", () => {
    act(() => {
      useUIStore.setState({ activeTool: "wall", selectedIds: [] });
    });
    render(<Sidebar productLibrary={[]} />);
    expect(hasPanel("sidebar-custom-elements")).toBe(false);
  });

  it("visible when activeTool=select", () => {
    act(() => {
      useUIStore.setState({ activeTool: "select", selectedIds: [] });
    });
    render(<Sidebar productLibrary={[]} />);
    expect(hasPanel("sidebar-custom-elements")).toBe(true);
  });

  it("visible when activeTool=product", () => {
    act(() => {
      useUIStore.setState({ activeTool: "product", selectedIds: [] });
    });
    render(<Sidebar productLibrary={[]} />);
    expect(hasPanel("sidebar-custom-elements")).toBe(true);
  });

  for (const tool of ["door", "window", "measure", "label", "stair", "ceiling"] as const) {
    it(`hidden when activeTool=${tool}`, () => {
      act(() => {
        useUIStore.setState({ activeTool: tool, selectedIds: [] });
      });
      render(<Sidebar productLibrary={[]} />);
      expect(hasPanel("sidebar-custom-elements")).toBe(false);
    });
  }
});

describe("Sidebar IA-08 — Wainscot + Framed Art gating (D-02)", () => {
  function seedWall(): string {
    act(() => {
      useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    });
    const walls = useCADStore.getState().rooms["room_main"]!.walls;
    return Object.keys(walls)[0]!;
  }

  it("both hidden when activeTool=select with no selection", () => {
    render(<Sidebar productLibrary={[]} />);
    expect(hasPanel("sidebar-wainscoting")).toBe(false);
    expect(hasPanel("sidebar-framed-art")).toBe(false);
  });

  it("both hidden when activeTool=select but selectedIds is a non-wall id", () => {
    act(() => {
      useUIStore.setState({ activeTool: "select", selectedIds: ["pp_not_a_wall"] });
    });
    render(<Sidebar productLibrary={[]} />);
    expect(hasPanel("sidebar-wainscoting")).toBe(false);
    expect(hasPanel("sidebar-framed-art")).toBe(false);
  });

  it("both visible when activeTool=select AND a wall is selected", () => {
    const wallId = seedWall();
    act(() => {
      useUIStore.setState({ activeTool: "select", selectedIds: [wallId] });
    });
    render(<Sidebar productLibrary={[]} />);
    expect(hasPanel("sidebar-wainscoting")).toBe(true);
    expect(hasPanel("sidebar-framed-art")).toBe(true);
  });

  it("both hidden when activeTool=wall even with a wall id selected (tool gate fails first)", () => {
    const wallId = seedWall();
    act(() => {
      useUIStore.setState({ activeTool: "wall", selectedIds: [wallId] });
    });
    render(<Sidebar productLibrary={[]} />);
    expect(hasPanel("sidebar-wainscoting")).toBe(false);
    expect(hasPanel("sidebar-framed-art")).toBe(false);
  });

  it("both hidden when activeTool=product even with a wall id selected", () => {
    const wallId = seedWall();
    act(() => {
      useUIStore.setState({ activeTool: "product", selectedIds: [wallId] });
    });
    render(<Sidebar productLibrary={[]} />);
    expect(hasPanel("sidebar-wainscoting")).toBe(false);
    expect(hasPanel("sidebar-framed-art")).toBe(false);
  });
});

describe("Sidebar IA-08 — Product Library forceOpen (D-04)", () => {
  it("renders collapsed under select tool when persisted=false", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ "sidebar-product-library": false }),
    );
    render(<Sidebar productLibrary={[]} />);
    expect(getAriaExpanded("sidebar-product-library")).toBe("false");
  });

  it("renders forced-open under product tool even when persisted=false", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ "sidebar-product-library": false }),
    );
    act(() => {
      useUIStore.setState({ activeTool: "product", selectedIds: [] });
    });
    render(<Sidebar productLibrary={[]} />);
    expect(getAriaExpanded("sidebar-product-library")).toBe("true");
  });

  it("returns to persisted=false when tool switches back to select", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ "sidebar-product-library": false }),
    );
    // Start on product tool — forced open.
    act(() => {
      useUIStore.setState({ activeTool: "product", selectedIds: [] });
    });
    const { rerender } = render(<Sidebar productLibrary={[]} />);
    expect(getAriaExpanded("sidebar-product-library")).toBe("true");

    // Switch to select — persisted state takes over.
    act(() => {
      useUIStore.setState({ activeTool: "select", selectedIds: [] });
    });
    rerender(<Sidebar productLibrary={[]} />);
    expect(getAriaExpanded("sidebar-product-library")).toBe("false");
  });

  it("idempotent when persisted=true and forceOpen=true (still open)", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ "sidebar-product-library": true }),
    );
    act(() => {
      useUIStore.setState({ activeTool: "product", selectedIds: [] });
    });
    render(<Sidebar productLibrary={[]} />);
    expect(getAriaExpanded("sidebar-product-library")).toBe("true");
  });
});

describe("Sidebar IA-08 — Catalog data persistence (D-05)", () => {
  it("wainscot styles survive a tool toggle unmount/remount", async () => {
    // Seed a wall + select it so the wainscot section is initially mounted.
    act(() => {
      useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    });
    const wallId = Object.keys(useCADStore.getState().rooms["room_main"]!.walls)[0]!;

    // Add a wainscot style to the catalog.
    let addedId = "";
    act(() => {
      addedId = useWainscotStyleStore.getState().addItem({
        name: "Test Beadboard",
        style: "beadboard",
        heightFt: 3,
        color: "#ffffff",
      });
    });
    const itemsBeforeUnmount = useWainscotStyleStore.getState().items.length;
    expect(addedId).toMatch(/^wain_/);
    expect(itemsBeforeUnmount).toBeGreaterThan(0);

    // Mount with wall selected → section is in DOM.
    act(() => {
      useUIStore.setState({ activeTool: "select", selectedIds: [wallId] });
    });
    const { unmount } = render(<Sidebar productLibrary={[]} />);
    expect(hasPanel("sidebar-wainscoting")).toBe(true);

    // Switch to wall tool — section unmounts.
    act(() => {
      useUIStore.setState({ activeTool: "wall", selectedIds: [] });
    });
    expect(hasPanel("sidebar-wainscoting")).toBe(false);

    unmount();
    cleanup();

    // Back to select + wall selected → section remounts with catalog intact.
    act(() => {
      useUIStore.setState({ activeTool: "select", selectedIds: [wallId] });
    });
    render(<Sidebar productLibrary={[]} />);
    expect(hasPanel("sidebar-wainscoting")).toBe(true);
    expect(useWainscotStyleStore.getState().items.length).toBe(itemsBeforeUnmount);
  });
});
