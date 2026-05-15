/**
 * Phase 85 D-05 — RED unit tests for CustomElementInspector numeric inputs.
 *
 * Mirrors ProductInspector.numeric.test.tsx — same 11 contract cases,
 * targeting placedCustomElements + custom-element-* data-testids.
 *
 * Plan 85-01 ships these RED — they MUST FAIL today. Plan 85-03 turns them
 * GREEN by adding the numeric inputs to CustomElementInspector.
 *
 * data-testid contract Plan 85-03 must honor:
 *   - custom-element-width-input
 *   - custom-element-depth-input
 *   - custom-element-height-input
 *   - custom-element-x-input
 *   - custom-element-y-input
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { CustomElementInspector } from "@/components/inspectors/CustomElementInspector";
import { installNumericInputDrivers } from "@/test-utils/numericInputDrivers";

vi.mock("idb-keyval", () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  values: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(() => ({})),
}));

const ROOM_ID = "room_main";
const PCE_ID = "pce_test_param";
const CE_ID = "ce_test_param";

function seedCustomElement() {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      [ROOM_ID]: {
        id: ROOM_ID,
        name: "Main",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {},
        ceilings: {},
        placedCustomElements: {
          [PCE_ID]: {
            id: PCE_ID,
            customElementId: CE_ID,
            position: { x: 5, y: 5 },
            rotation: 0,
            sizeScale: 1,
          },
        },
        stairs: {},
      },
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
        color: "#cccccc",
      },
    },
    past: [],
    future: [],
  } as never);
  useUIStore.setState({ selectedIds: [PCE_ID] } as never);
}

function getPlaced() {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!].placedCustomElements![PCE_ID];
}

function renderInspector() {
  const pce = getPlaced();
  const ce = (useCADStore.getState() as unknown as {
    customElements: Record<string, import("@/types/cad").CustomElement>;
  }).customElements[CE_ID];
  return render(<CustomElementInspector pce={pce} ce={ce} viewMode="2d" />);
}

let cleanupDriver: () => void = () => {};

describe("CustomElementInspector numeric inputs (Phase 85 PARAM-01/02/03 RED)", () => {
  beforeEach(() => {
    seedCustomElement();
    cleanupDriver = installNumericInputDrivers();
  });

  afterEach(() => {
    cleanupDriver();
  });

  it("Width input commits to widthFtOverride (resizeCustomElementAxis)", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("custom-element-width-input", 4.5);
    });
    expect(getPlaced().widthFtOverride).toBe(4.5);
  });

  it("Out-of-range width below floor → silent clamp to 0.5", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("custom-element-width-input", 0.1);
    });
    expect(getPlaced().widthFtOverride).toBe(0.5);
  });

  it("Out-of-range width above ceiling → silent clamp to 50", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("custom-element-width-input", 200);
    });
    expect(getPlaced().widthFtOverride).toBe(50);
  });

  it("Depth input commits to depthFtOverride", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("custom-element-depth-input", 2.5);
    });
    expect(getPlaced().depthFtOverride).toBe(2.5);
  });

  it("Height input commits to heightFtOverride (Phase 85 D-05 new field)", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("custom-element-height-input", 7);
    });
    expect(getPlaced().heightFtOverride).toBe(7);
  });

  it("Height clamp — typing 100 → 50", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("custom-element-height-input", 100);
    });
    expect(getPlaced().heightFtOverride).toBe(50);
  });

  it("X position input updates position.x", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("custom-element-x-input", 8);
    });
    expect(getPlaced().position.x).toBe(8);
  });

  it("Y position input updates position.y", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("custom-element-y-input", 11);
    });
    expect(getPlaced().position.y).toBe(11);
  });

  it("Single-undo invariant: width edit = past.length increments by exactly 1", () => {
    renderInspector();
    const before = useCADStore.getState().past.length;
    act(() => {
      window.__driveNumericInput!("custom-element-width-input", 4);
    });
    const after = useCADStore.getState().past.length;
    expect(after - before).toBe(1);
  });

  it("Single-undo invariant: X position edit = past.length increments by exactly 1", () => {
    renderInspector();
    const before = useCADStore.getState().past.length;
    act(() => {
      window.__driveNumericInput!("custom-element-x-input", 7);
    });
    const after = useCADStore.getState().past.length;
    expect(after - before).toBe(1);
  });

  it("Reset size clears heightFtOverride alongside width/depth", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("custom-element-width-input", 4);
      window.__driveNumericInput!("custom-element-depth-input", 4);
      window.__driveNumericInput!("custom-element-height-input", 7);
    });
    act(() => {
      useCADStore.getState().clearCustomElementOverrides(PCE_ID);
    });
    const pce = getPlaced();
    expect(pce.widthFtOverride).toBeUndefined();
    expect(pce.depthFtOverride).toBeUndefined();
    expect(pce.heightFtOverride).toBeUndefined();
  });
});
