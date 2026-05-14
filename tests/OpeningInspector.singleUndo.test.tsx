/**
 * Phase 82 Plan 82-03 — RED single-undo invariant (D-07 from Phase 79).
 *
 * Clicking a preset chip inside OpeningInspector's Preset tab MUST:
 *  - call update(wall.id, opening.id, { width, height, sillHeight }) exactly once
 *  - increment past.length by exactly 1
 *  - apply the catalog dims
 *  - revert to prior dims on a single undo() call
 *
 * Mirrors tests/windowTool.preset.test.tsx Wide-chip case but exercises the
 * NEW OpeningInspector mount path (Plan 82-03), not the soon-to-be-removed
 * inline WindowPresetRow inside OpeningEditor.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import RightInspector from "@/components/RightInspector";

vi.mock("idb-keyval", () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  values: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(() => ({})),
}));

const ROOM_ID = "room_main";
const WALL_ID = "wall_w1";

function baseRoom(walls: Record<string, unknown>) {
  return {
    id: ROOM_ID,
    name: "Main",
    room: { width: 20, length: 16, wallHeight: 8 },
    walls,
    placedProducts: {},
    ceilings: {},
    placedCustomElements: {},
    stairs: {},
  };
}

function seedAndSelect(): string {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      [ROOM_ID]: baseRoom({
        [WALL_ID]: {
          id: WALL_ID,
          start: { x: 0, y: 5 },
          end: { x: 20, y: 5 },
          thickness: 0.5,
          height: 8,
          openings: [],
        },
      }),
    },
    activeRoomId: ROOM_ID,
    past: [],
    future: [],
  } as never);
  useCADStore.getState().addOpening(WALL_ID, {
    type: "window",
    offset: 5,
    width: 3,
    height: 4,
    sillHeight: 3,
  });
  const op = useCADStore.getState().rooms[ROOM_ID].walls[WALL_ID].openings![0];
  useUIStore.setState({
    activeTool: "select",
    selectedIds: [WALL_ID],
    selectedOpeningId: op.id,
  } as never);
  return op.id;
}

function getOpening(openingId: string) {
  return useCADStore
    .getState()
    .rooms[ROOM_ID].walls[WALL_ID].openings!.find((o) => o.id === openingId)!;
}

describe("Phase 82 IA-05 — single-undo invariant on preset chip click (Phase 79 D-07)", () => {
  let openingId = "";

  beforeEach(() => {
    openingId = seedAndSelect();
  });

  it("Picture chip click: past.length += 1, dims = 6/4/1", () => {
    render(<RightInspector productLibrary={[]} viewMode="2d" />);
    const before = useCADStore.getState().past.length;
    const chip = screen.getByTestId(`opening-preset-chip-${openingId}-picture`);
    act(() => {
      chip.click();
    });
    const after = useCADStore.getState().past.length;
    expect(after - before).toBe(1);
    const op = getOpening(openingId);
    expect(op.width).toBe(6);
    expect(op.height).toBe(4);
    expect(op.sillHeight).toBe(1);
  });

  it("undo() after Picture chip click reverts dims to 3/4/3", () => {
    render(<RightInspector productLibrary={[]} viewMode="2d" />);
    const chip = screen.getByTestId(`opening-preset-chip-${openingId}-picture`);
    act(() => {
      chip.click();
    });
    act(() => {
      useCADStore.getState().undo();
    });
    const op = getOpening(openingId);
    expect(op.width).toBe(3);
    expect(op.height).toBe(4);
    expect(op.sillHeight).toBe(3);
  });

  it("Wide chip click: past.length += 1, dims = 4/5/3", () => {
    render(<RightInspector productLibrary={[]} viewMode="2d" />);
    const before = useCADStore.getState().past.length;
    const chip = screen.getByTestId(`opening-preset-chip-${openingId}-wide`);
    act(() => {
      chip.click();
    });
    const after = useCADStore.getState().past.length;
    expect(after - before).toBe(1);
    const op = getOpening(openingId);
    expect(op.width).toBe(4);
    expect(op.height).toBe(5);
    expect(op.sillHeight).toBe(3);
  });
});
