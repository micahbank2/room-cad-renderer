/**
 * Phase 85 D-05 — RED unit tests for ProductInspector numeric W/D/H/X/Y inputs.
 *
 * Plan 85-01 ships these RED — they MUST FAIL today because Plan 85-02 has not
 * yet replaced the read-only Width/Depth/Height/Position rows with editable
 * <Input> fields. Expected failure mode: "__driveNumericInput: no element with
 * data-testid=..." — i.e. the inputs do not exist yet.
 *
 * data-testid contract Plan 85-02 must honor:
 *   - product-width-input
 *   - product-depth-input
 *   - product-height-input
 *   - product-x-input
 *   - product-y-input
 *
 * Plan 85-02 turns these GREEN by:
 *   1. Replacing read-only Width/Depth/Height/Position Rows with <Input>
 *      components carrying the testids above.
 *   2. Wiring onBlur/onEnter to resizeProductAxis / resizeProductHeight /
 *      moveProduct with silent clamp at [0.5, 50].
 *   3. Calling installNumericInputDrivers() in a useEffect (with cleanup).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { ProductInspector } from "@/components/inspectors/ProductInspector";
import { installNumericInputDrivers } from "@/test-utils/numericInputDrivers";
import type { Product } from "@/types/product";

// Mock idb-keyval — keeps inspectors mountable in jsdom.
vi.mock("idb-keyval", () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  values: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(() => ({})),
}));

const ROOM_ID = "room_main";
const PROD_PLACED_ID = "pp_test_param";
const PROD_ID = "prod_test_param";

const PRODUCT_LIB: Product[] = [
  {
    id: PROD_ID,
    name: "Sofa",
    category: "Seating",
    width: 6,
    depth: 3,
    height: 3,
    material: "fabric",
    imageUrl: "",
    textureUrls: [],
  } as Product,
];

function seedProduct() {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      [ROOM_ID]: {
        id: ROOM_ID,
        name: "Main",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {
          [PROD_PLACED_ID]: {
            id: PROD_PLACED_ID,
            productId: PROD_ID,
            position: { x: 5, y: 5 },
            rotation: 0,
            sizeScale: 1,
          },
        },
        ceilings: {},
        placedCustomElements: {},
        stairs: {},
      },
    },
    activeRoomId: ROOM_ID,
    past: [],
    future: [],
  } as never);
  useUIStore.setState({ selectedIds: [PROD_PLACED_ID] } as never);
}

function getPlaced() {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!].placedProducts[PROD_PLACED_ID];
}

function renderInspector() {
  const pp = getPlaced();
  return render(
    <ProductInspector pp={pp} productLibrary={PRODUCT_LIB} viewMode="2d" />,
  );
}

let cleanupDriver: () => void = () => {};

describe("ProductInspector numeric inputs (Phase 85 PARAM-01/02/03 RED)", () => {
  beforeEach(() => {
    seedProduct();
    cleanupDriver = installNumericInputDrivers();
  });

  afterEach(() => {
    cleanupDriver();
  });

  it("Width input commits to widthFtOverride (resizeProductAxis)", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("product-width-input", 8.5);
    });
    expect(getPlaced().widthFtOverride).toBe(8.5);
  });

  it("Out-of-range width below floor → silent clamp to 0.5 (inspector floor)", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("product-width-input", 0.1);
    });
    // Inspector clamps to 0.5 (D-04 tighter floor); 0.25 is the store-layer
    // absolute floor preserved for drag-handle behavior.
    expect(getPlaced().widthFtOverride).toBe(0.5);
  });

  it("Out-of-range width above ceiling → silent clamp to 50", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("product-width-input", 100);
    });
    expect(getPlaced().widthFtOverride).toBe(50);
  });

  it("Depth input commits to depthFtOverride", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("product-depth-input", 4.25);
    });
    expect(getPlaced().depthFtOverride).toBe(4.25);
  });

  it("Height input commits to heightFtOverride (Phase 85 D-05 new field)", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("product-height-input", 7);
    });
    expect(getPlaced().heightFtOverride).toBe(7);
  });

  it("Height clamp — typing 100 → 50", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("product-height-input", 100);
    });
    expect(getPlaced().heightFtOverride).toBe(50);
  });

  it("X position input updates position.x", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("product-x-input", 12);
    });
    expect(getPlaced().position.x).toBe(12);
  });

  it("Y position input updates position.y", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("product-y-input", 9);
    });
    expect(getPlaced().position.y).toBe(9);
  });

  it("Single-undo invariant: width edit + commit = past.length increments by exactly 1", () => {
    renderInspector();
    const before = useCADStore.getState().past.length;
    act(() => {
      window.__driveNumericInput!("product-width-input", 8);
    });
    const after = useCADStore.getState().past.length;
    expect(after - before).toBe(1);
  });

  it("Single-undo invariant: X position edit + commit = past.length increments by exactly 1", () => {
    renderInspector();
    const before = useCADStore.getState().past.length;
    act(() => {
      window.__driveNumericInput!("product-x-input", 7);
    });
    const after = useCADStore.getState().past.length;
    expect(after - before).toBe(1);
  });

  it("Reset size clears heightFtOverride alongside width/depth", () => {
    // First set all three via inputs
    renderInspector();
    act(() => {
      window.__driveNumericInput!("product-width-input", 8);
      window.__driveNumericInput!("product-depth-input", 4);
      window.__driveNumericInput!("product-height-input", 7);
    });
    // Now invoke clearProductOverrides (Reset Size button's handler in 85-02)
    act(() => {
      useCADStore.getState().clearProductOverrides(PROD_PLACED_ID);
    });
    const pp = getPlaced();
    expect(pp.widthFtOverride).toBeUndefined();
    expect(pp.depthFtOverride).toBeUndefined();
    expect(pp.heightFtOverride).toBeUndefined();
  });
});
