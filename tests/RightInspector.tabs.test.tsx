/**
 * Phase 82 Plan 82-02 — RED tab-system specs for RightInspector.
 *
 * Each non-stair inspector wraps its body in <Tabs> per D-05:
 *   - Wall:    Geometry / Material / Openings
 *   - Product: Dimensions / Material / Rotation
 *   - Custom:  Dimensions / Label / Material
 *   - Ceiling: Geometry / Material
 *   - Stair:   FLAT (no tabs, per D-04)
 *   - Bulk:    untabbed (per D-05)
 *
 * D-03: tab resets to first tab on every new entity selection (keyed
 * <Tabs> remount).
 *
 * These specs MUST fail in Task 1 (no tabs yet) and pass in Task 2 once
 * each inspector wraps its body in <Tabs>.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import RightInspector from "@/components/RightInspector";
import type { Product } from "@/types/product";

// Required mocks to keep RightInspector standalone-mountable.
vi.mock("idb-keyval", () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  values: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(() => ({})),
}));

const ROOM_ID = "room_main";

function baseRoom(extra: Record<string, unknown> = {}) {
  return {
    id: ROOM_ID,
    name: "Main",
    room: { width: 20, length: 16, wallHeight: 8 },
    walls: {},
    placedProducts: {},
    ceilings: {},
    placedCustomElements: {},
    stairs: {},
    ...extra,
  };
}

function tabLabels(): string[] {
  return screen
    .queryAllByRole("tab")
    .map((el) => (el.textContent ?? "").trim());
}

function activeTabLabel(): string | null {
  const tabs = screen.queryAllByRole("tab");
  const sel = tabs.find((t) => t.getAttribute("aria-selected") === "true");
  return sel ? (sel.textContent ?? "").trim() : null;
}

// ─── Wall ──────────────────────────────────────────────────────────────────

const WALL_A = "wall_a";
const WALL_B = "wall_b";

function seedTwoWallsAndSelectA() {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      [ROOM_ID]: baseRoom({
        walls: {
          [WALL_A]: {
            id: WALL_A,
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
          [WALL_B]: {
            id: WALL_B,
            start: { x: 0, y: 5 },
            end: { x: 10, y: 5 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
      }),
    },
    activeRoomId: ROOM_ID,
    past: [],
    future: [],
  } as never);
  useUIStore.setState({ selectedIds: [WALL_A] } as never);
}

// ─── Product ───────────────────────────────────────────────────────────────

const PROD_PLACED_ID = "pp_test_1";
const PROD_ID = "prod_test_1";

function seedProductAndSelect() {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      [ROOM_ID]: baseRoom({
        placedProducts: {
          [PROD_PLACED_ID]: {
            id: PROD_PLACED_ID,
            productId: PROD_ID,
            position: { x: 5, y: 5 },
            rotation: 0,
            sizeScale: 1,
          },
        },
      }),
    },
    activeRoomId: ROOM_ID,
    past: [],
    future: [],
  } as never);
  useUIStore.setState({ selectedIds: [PROD_PLACED_ID] } as never);
}

const PRODUCT_LIB: Product[] = [
  {
    id: PROD_ID,
    name: "Sofa",
    category: "Seating",
    width: 6,
    depth: 3,
    height: 3,
  } as Product,
];

// ─── Custom element ───────────────────────────────────────────────────────

const PCE_ID = "pce_test_1";
const CE_ID = "ce_test_1";

function seedCustomElementAndSelect() {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      [ROOM_ID]: baseRoom({
        placedCustomElements: {
          [PCE_ID]: {
            id: PCE_ID,
            customElementId: CE_ID,
            position: { x: 5, y: 5 },
            rotation: 0,
            sizeScale: 1,
          },
        },
      }),
    },
    activeRoomId: ROOM_ID,
    customElements: {
      [CE_ID]: {
        id: CE_ID,
        name: "Fridge",
        shape: "box",
        width: 3,
        depth: 3,
        height: 6,
        color: "#ccc",
      },
    },
    past: [],
    future: [],
  } as never);
  useUIStore.setState({ selectedIds: [PCE_ID] } as never);
}

// ─── Ceiling ──────────────────────────────────────────────────────────────

const CEIL_ID = "ceiling_test_1";

function seedCeilingAndSelect() {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      [ROOM_ID]: baseRoom({
        ceilings: {
          [CEIL_ID]: {
            id: CEIL_ID,
            points: [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
              { x: 10, y: 5 },
              { x: 0, y: 5 },
            ],
            height: 8,
            material: "#f5f5f5",
          },
        },
      }),
    },
    activeRoomId: ROOM_ID,
    past: [],
    future: [],
  } as never);
  useUIStore.setState({ selectedIds: [CEIL_ID] } as never);
}

// ─── Stair ────────────────────────────────────────────────────────────────

const STAIR_ID = "stair_test_1";

function seedStairAndSelect() {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      [ROOM_ID]: baseRoom({
        stairs: {
          [STAIR_ID]: {
            id: STAIR_ID,
            position: { x: 5, y: 5 },
            rotation: 0,
            riseIn: 7,
            runIn: 11,
            stepCount: 12,
          },
        },
      }),
    },
    activeRoomId: ROOM_ID,
    past: [],
    future: [],
  } as never);
  useUIStore.setState({ selectedIds: [STAIR_ID] } as never);
}

function seedBulkWallsSelect() {
  seedTwoWallsAndSelectA();
  useUIStore.setState({ selectedIds: [WALL_A, WALL_B] } as never);
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("Phase 82-02 RightInspector — per-entity tab system (D-05)", () => {
  it("Wall: tabs render in order [Geometry, Material, Openings] with Geometry active", () => {
    seedTwoWallsAndSelectA();
    render(<RightInspector productLibrary={[]} viewMode={"2d"} />);
    expect(tabLabels()).toEqual(["Geometry", "Material", "Openings"]);
    expect(activeTabLabel()).toBe("Geometry");
  });

  it("Product: tabs render in order [Dimensions, Material, Rotation] with Dimensions active", () => {
    seedProductAndSelect();
    render(<RightInspector productLibrary={PRODUCT_LIB} viewMode={"2d"} />);
    expect(tabLabels()).toEqual(["Dimensions", "Material", "Rotation"]);
    expect(activeTabLabel()).toBe("Dimensions");
  });

  it("Custom element: tabs render in order [Dimensions, Label, Material] with Dimensions active", () => {
    seedCustomElementAndSelect();
    render(<RightInspector productLibrary={[]} viewMode={"2d"} />);
    expect(tabLabels()).toEqual(["Dimensions", "Label", "Material"]);
    expect(activeTabLabel()).toBe("Dimensions");
  });

  it("Ceiling: tabs render in order [Geometry, Material] with Geometry active", () => {
    seedCeilingAndSelect();
    render(<RightInspector productLibrary={[]} viewMode={"2d"} />);
    expect(tabLabels()).toEqual(["Geometry", "Material"]);
    expect(activeTabLabel()).toBe("Geometry");
  });

  it("Stair: no tabs (D-04) — flat single-pane render", () => {
    seedStairAndSelect();
    render(<RightInspector productLibrary={[]} viewMode={"2d"} />);
    expect(screen.queryAllByRole("tab")).toEqual([]);
    // Stair inputs render directly (no tab indirection).
    expect(screen.getByLabelText(/width/i)).toBeTruthy();
    expect(screen.getByLabelText(/rise/i)).toBeTruthy();
  });

  it("Bulk select: no tabs (D-05) — bulk-actions header visible", () => {
    seedBulkWallsSelect();
    render(<RightInspector productLibrary={[]} viewMode={"2d"} />);
    expect(screen.queryAllByRole("tab")).toEqual([]);
    expect(screen.getByText(/Bulk actions/i)).toBeTruthy();
  });

  it("D-03: tab state resets to first tab when selection switches between walls", () => {
    seedTwoWallsAndSelectA();
    const { rerender } = render(
      <RightInspector productLibrary={[]} viewMode={"2d"} />,
    );
    // Switch to Openings tab on wall A.
    const openingsTab = screen.getAllByRole("tab").find(
      (t) => (t.textContent ?? "").trim() === "Openings",
    )!;
    expect(openingsTab).toBeTruthy();
    act(() => {
      fireEvent.click(openingsTab);
    });
    expect(activeTabLabel()).toBe("Openings");

    // Swap selection to wall B → Tabs should remount and default to Geometry.
    act(() => {
      useUIStore.setState({ selectedIds: [WALL_B] } as never);
    });
    rerender(<RightInspector productLibrary={[]} viewMode={"2d"} />);
    expect(activeTabLabel()).toBe("Geometry");
  });
});
