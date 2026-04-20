/**
 * Phase 29 Wave 0 — red stubs for the dimension-label overlay.
 *
 * Covers: D-03 pre-fill via formatFeet, D-03a select-all, D-04 96px width,
 * EDIT-20 commit via resizeWallByLabel, EDIT-21 single-undo, D-06 Escape-cancels.
 *
 * Driving the overlay: FabricCanvas mounts a fabric.Canvas, which is fragile
 * in jsdom. The overlay input already carries `data-testid="dimension-edit-input"`,
 * so we drive it by firing `mouse:dblclick` on the fabric canvas instance.
 * Some assertions may fail due to jsdom/fabric interop until Plan 02 lands —
 * that is the intended Wave 0 state (see plan 29-01 Task 2 acceptance criteria).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import FabricCanvas from "@/canvas/FabricCanvas";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { formatFeet } from "@/lib/geometry";

const WALL_ID = "wall_test1";

function seedOneWall(lengthFt = 12.5) {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {
          [WALL_ID]: {
            id: WALL_ID,
            start: { x: 0, y: 0 },
            end: { x: lengthFt, y: 0 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
        placedProducts: {},
      },
    },
    activeRoomId: "room_main",
    past: [],
    future: [],
  });
}

/**
 * Simulate a double-click on the wall's dimension label. We reach into the
 * fabric canvas via its DOM attachment and fire the fabric event directly.
 * If fabric isn't fully initialized in jsdom this will throw; the test
 * assertion that follows will then fail — still a valid Wave 0 red state.
 */
function openOverlayForWall(_container: HTMLElement) {
  // Plan 02 exposed `window.__openDimensionEditor(wallId)` as the driver —
  // fabric's native dblclick path depends on getBoundingClientRect, which
  // returns 0 in jsdom and never resolves the label hit-test.
  const hook = (window as any).__openDimensionEditor;
  if (typeof hook === "function") hook(WALL_ID);
}

describe("Dimension label overlay (Phase 29)", () => {
  beforeEach(() => {
    seedOneWall(12.5);
  });

  it("prefills overlay with formatFeet(currentLen) on dblclick (D-03)", async () => {
    const { container, queryByTestId } = render(<FabricCanvas productLibrary={[]} />);
    await act(async () => {
      openOverlayForWall(container);
    });
    const input = queryByTestId("dimension-edit-input") as HTMLInputElement | null;
    // D-03: expected seed is formatFeet(12.5) === "12'-6\""
    expect(input).not.toBeNull();
    expect(input!.value).toBe(formatFeet(12.5));
  });

  it("selects all text on focus (D-03a)", async () => {
    const { container, queryByTestId } = render(<FabricCanvas productLibrary={[]} />);
    await act(async () => {
      openOverlayForWall(container);
    });
    const input = queryByTestId("dimension-edit-input") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    // D-03a: autoFocus + onFocus should select-all
    expect(input!.selectionStart).toBe(0);
    expect(input!.selectionEnd).toBe(input!.value.length);
  });

  it("overlay input width style is 96px (D-04)", async () => {
    const { container, queryByTestId } = render(<FabricCanvas productLibrary={[]} />);
    await act(async () => {
      openOverlayForWall(container);
    });
    const input = queryByTestId("dimension-edit-input") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    // D-04: inline style.width should be 96px (currently 64)
    expect(input!.style.width).toBe("96px");
  });

  it("Enter with '10'' commits via resizeWallByLabel (EDIT-20 + EDIT-21)", async () => {
    const priorPast = useCADStore.getState().past.length;
    const { container, queryByTestId } = render(<FabricCanvas productLibrary={[]} />);
    await act(async () => {
      openOverlayForWall(container);
    });
    const input = queryByTestId("dimension-edit-input") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    await act(async () => {
      fireEvent.change(input!, { target: { value: "10'" } });
      fireEvent.keyDown(input!, { key: "Enter" });
    });
    const wall = useCADStore.getState().rooms.room_main.walls[WALL_ID];
    const len = Math.sqrt(
      (wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2,
    );
    // EDIT-20: resized to 10ft via resizeWallByLabel
    expect(len).toBeCloseTo(10, 3);
    // EDIT-21: exactly one new history entry
    expect(useCADStore.getState().past.length).toBe(priorPast + 1);
  });

  it("Escape cancels without mutating store (D-06 complement)", async () => {
    const priorPast = useCADStore.getState().past.length;
    const priorWall = { ...useCADStore.getState().rooms.room_main.walls[WALL_ID] };
    const { container, queryByTestId } = render(<FabricCanvas productLibrary={[]} />);
    await act(async () => {
      openOverlayForWall(container);
    });
    const input = queryByTestId("dimension-edit-input") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    await act(async () => {
      fireEvent.change(input!, { target: { value: "99'" } });
      fireEvent.keyDown(input!, { key: "Escape" });
    });
    const wall = useCADStore.getState().rooms.room_main.walls[WALL_ID];
    expect(wall.end.x).toBeCloseTo(priorWall.end.x, 5);
    expect(wall.end.y).toBeCloseTo(priorWall.end.y, 5);
    expect(useCADStore.getState().past.length).toBe(priorPast);
  });
});
