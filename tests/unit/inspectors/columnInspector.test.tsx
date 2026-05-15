/**
 * Phase 86 Plan 86-03 — ColumnInspector component tests (D-08).
 *
 * GREEN — Plan 86-03 ships ColumnInspector.tsx; these tests verify:
 *   1. The three tabs (Dimensions / Material / Rotation) render.
 *   2. Width / Depth / Height / X / Y numeric inputs commit via the
 *      matching cadStore action (resizeColumnAxis / resizeColumnHeight /
 *      moveColumn).
 *   3. "Reset to wall height" button calls resizeColumnHeight with
 *      room.wallHeight — exactly one history push (D-03).
 *   4. Rotation input + "Reset to 0°" button each push one history entry.
 *   5. Out-of-range silent clamp at [0.5, 50] per Phase 85 D-04.
 *   6. Single-undo invariant — past.length increments by exactly 1 per
 *      committed edit.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, screen } from "@testing-library/react";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { ColumnInspector } from "@/components/inspectors/ColumnInspector";
import { installNumericInputDrivers } from "@/test-utils/numericInputDrivers";
import type { Column } from "@/types/cad";

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
const COL_ID = "col_test_one";

function seedColumn(overrides: Partial<Column> = {}) {
  resetCADStoreForTests();
  const column: Column = {
    id: COL_ID,
    position: { x: 5, y: 5 },
    widthFt: 1,
    depthFt: 1,
    heightFt: 12, // intentionally != room.wallHeight (8) for reset test
    rotation: 0,
    shape: "box",
    ...overrides,
  };
  useCADStore.setState({
    rooms: {
      [ROOM_ID]: {
        id: ROOM_ID,
        name: "Main",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {},
        ceilings: {},
        placedCustomElements: {},
        stairs: {},
        columns: { [COL_ID]: column },
      },
    },
    activeRoomId: ROOM_ID,
    past: [],
    future: [],
  } as never);
  useUIStore.setState({ selectedIds: [COL_ID] } as never);
}

function getColumn(): Column {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!].columns![COL_ID];
}

function renderInspector() {
  const column = getColumn();
  return render(
    <ColumnInspector column={column} activeRoomId={ROOM_ID} viewMode="2d" />,
  );
}

let cleanupDriver: () => void = () => {};

describe("ColumnInspector (Phase 86 D-08)", () => {
  beforeEach(() => {
    seedColumn();
    cleanupDriver = installNumericInputDrivers();
  });

  afterEach(() => {
    cleanupDriver();
  });

  it("Renders three tabs: Dimensions / Material / Rotation", () => {
    renderInspector();
    // Tabs primitive uses role="tab".
    expect(screen.getByRole("tab", { name: "Dimensions" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Material" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Rotation" })).toBeTruthy();
  });

  it("Width input commits via resizeColumnAxis", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("column-width-input", 5);
    });
    expect(getColumn().widthFt).toBe(5);
  });

  it("Depth input commits via resizeColumnAxis", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("column-depth-input", 2.5);
    });
    expect(getColumn().depthFt).toBe(2.5);
  });

  it("Height input commits via resizeColumnHeight", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("column-height-input", 9);
    });
    expect(getColumn().heightFt).toBe(9);
  });

  it("X input commits via moveColumn", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("column-x-input", 7);
    });
    expect(getColumn().position.x).toBe(7);
  });

  it("Y input commits via moveColumn", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("column-y-input", 11);
    });
    expect(getColumn().position.y).toBe(11);
  });

  it("Reset to wall height sets heightFt = room.wallHeight in one history push (D-03)", () => {
    renderInspector();
    const beforeLen = useCADStore.getState().past.length;
    // initial heightFt was 12 — room.wallHeight is 8.
    expect(getColumn().heightFt).toBe(12);
    act(() => {
      const btn = document.querySelector(
        '[data-testid="column-reset-height"]',
      ) as HTMLButtonElement | null;
      btn?.click();
    });
    expect(getColumn().heightFt).toBe(8);
    const afterLen = useCADStore.getState().past.length;
    expect(afterLen - beforeLen).toBe(1);
  });

  it("Out-of-range width above 50 → silent clamp to 50", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("column-width-input", 100);
    });
    expect(getColumn().widthFt).toBe(50);
  });

  it("Out-of-range width below 0.5 → silent clamp to 0.5", () => {
    renderInspector();
    act(() => {
      window.__driveNumericInput!("column-width-input", 0.1);
    });
    expect(getColumn().widthFt).toBe(0.5);
  });

  it("Single-undo invariant: width edit → past.length increments by exactly 1", () => {
    renderInspector();
    const before = useCADStore.getState().past.length;
    act(() => {
      window.__driveNumericInput!("column-width-input", 3);
    });
    const after = useCADStore.getState().past.length;
    expect(after - before).toBe(1);
  });

  it("Rotation input commits via rotateColumn (rotation tab)", () => {
    renderInspector();
    // Switch to the rotation tab so the input renders.
    act(() => {
      const tab = screen.getByRole("tab", { name: "Rotation" });
      (tab as HTMLElement).click();
    });
    act(() => {
      window.__driveNumericInput!("column-rotation-input", 45);
    });
    expect(getColumn().rotation).toBe(45);
  });

  it("Reset to 0° button sets rotation = 0 in one history push", () => {
    seedColumn({ rotation: 90 });
    renderInspector();
    act(() => {
      const tab = screen.getByRole("tab", { name: "Rotation" });
      (tab as HTMLElement).click();
    });
    const before = useCADStore.getState().past.length;
    act(() => {
      const btn = document.querySelector(
        '[data-testid="column-reset-rotation"]',
      ) as HTMLButtonElement | null;
      btn?.click();
    });
    expect(getColumn().rotation).toBe(0);
    const after = useCADStore.getState().past.length;
    expect(after - before).toBe(1);
  });
});
