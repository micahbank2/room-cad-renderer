/**
 * Phase 82 Plan 82-03 — RED IA-05 specs for OpeningInspector + sub-selection.
 *
 * Asserts:
 *  - When uiStore.selectedOpeningId is set, RightInspector renders the
 *    OpeningInspector instead of the Wall tabs.
 *  - Window opening: Preset / Dimensions / Position tabs (Preset default).
 *  - Door opening: Type / Dimensions / Position tabs (Type default, no
 *    Preset tab per D-05).
 *  - All 6 preset chips render (5 catalog + Custom) with the verbatim
 *    Phase 79 data-testids (D-06).
 *  - opening-preset-label reads "Preset: Standard" for 3/4/3 dims.
 *  - "← Back to wall" breadcrumb clears selectedOpeningId and restores
 *    Wall tabs.
 *
 * MUST be RED on this commit — OpeningInspector does not exist; WallInspector
 * doesn't dispatch to it. Task 2 + Task 3 turn this GREEN.
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

function seedWallWithWindow(): { wallId: string; openingId: string } {
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
  return { wallId: WALL_ID, openingId: op.id };
}

function seedWallWithDoor(): { wallId: string; openingId: string } {
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
    type: "door",
    offset: 4,
    width: 3,
    height: 7,
    sillHeight: 0,
  });
  const op = useCADStore.getState().rooms[ROOM_ID].walls[WALL_ID].openings![0];
  return { wallId: WALL_ID, openingId: op.id };
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

describe("Phase 82 IA-05 — OpeningInspector (window)", () => {
  let openingId = "";

  beforeEach(() => {
    const seeded = seedWallWithWindow();
    openingId = seeded.openingId;
    useUIStore.setState({
      activeTool: "select",
      selectedIds: [WALL_ID],
      selectedOpeningId: openingId,
    } as never);
  });

  it("renders Preset / Dimensions / Position tabs in that order", () => {
    render(<RightInspector productLibrary={[]} viewMode="2d" />);
    expect(tabLabels()).toEqual(["Preset", "Dimensions", "Position"]);
  });

  it("defaults to the Preset tab", () => {
    render(<RightInspector productLibrary={[]} viewMode="2d" />);
    expect(activeTabLabel()).toBe("Preset");
  });

  it("renders all 6 preset chips with verbatim data-testids", () => {
    render(<RightInspector productLibrary={[]} viewMode="2d" />);
    expect(
      screen.getByTestId(`opening-preset-chip-${openingId}-small`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`opening-preset-chip-${openingId}-standard`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`opening-preset-chip-${openingId}-wide`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`opening-preset-chip-${openingId}-picture`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`opening-preset-chip-${openingId}-bathroom`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`opening-preset-chip-${openingId}-custom`),
    ).toBeInTheDocument();
  });

  it("renders 'Preset: Standard' for 3/4/3 dims via opening-preset-label", () => {
    render(<RightInspector productLibrary={[]} viewMode="2d" />);
    const label = screen.getByTestId("opening-preset-label");
    expect(label.textContent ?? "").toMatch(/preset:\s*standard/i);
  });

  it("'← Back to wall' breadcrumb clears selectedOpeningId and restores Wall tabs", () => {
    render(<RightInspector productLibrary={[]} viewMode="2d" />);
    const back = screen.getByTestId("opening-back-to-wall");
    expect(back).toBeInTheDocument();
    act(() => {
      back.click();
    });
    expect(useUIStore.getState().selectedOpeningId).toBeNull();
    expect(useUIStore.getState().selectedIds).toEqual([WALL_ID]);
    // Wall tabs are back.
    expect(tabLabels()).toEqual(["Geometry", "Material", "Openings"]);
  });
});

describe("Phase 82 IA-05 — OpeningInspector (door)", () => {
  beforeEach(() => {
    const seeded = seedWallWithDoor();
    useUIStore.setState({
      activeTool: "select",
      selectedIds: [WALL_ID],
      selectedOpeningId: seeded.openingId,
    } as never);
  });

  it("renders Type / Dimensions / Position tabs (no Preset)", () => {
    render(<RightInspector productLibrary={[]} viewMode="2d" />);
    expect(tabLabels()).toEqual(["Type", "Dimensions", "Position"]);
    expect(activeTabLabel()).toBe("Type");
  });
});
