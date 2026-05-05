/**
 * Phase 60 STAIRS-01 (D-15) component tests C1-C3.
 *
 * Verifies:
 *   C1: Selecting a stair shows rise/run/width/stepCount/rotation/label
 *       inputs + Save Camera button.
 *   C2: Editing rise input dispatches updateStairNoHistory per keystroke;
 *       commit on Enter via updateStair (single-undo).
 *   C3: Width edge-handle drag pattern: resizeStairWidthNoHistory mid-drag
 *       (×3) + resizeStairWidth on release → widthFtOverride === 5.0 AND
 *       past.length increased by exactly 1.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, act, screen } from "@testing-library/react";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import PropertiesPanel from "@/components/PropertiesPanel";

const STAIR_ID = "stair_pp_test";

function seedOneStairAndSelect() {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {},
        stairs: {
          [STAIR_ID]: {
            id: STAIR_ID,
            position: { x: 5, y: 5 },
            rotation: 0,
            riseIn: 7,
            runIn: 11,
            stepCount: 12,
            widthFtOverride: undefined,
            labelOverride: undefined,
          },
        },
      },
    },
    activeRoomId: "room_main",
    past: [],
    future: [],
  });
  useUIStore.setState({ selectedIds: [STAIR_ID] });
}

describe("Phase 60 PropertiesPanel — StairSection (D-08, D-15)", () => {
  beforeEach(() => {
    seedOneStairAndSelect();
  });

  it("C1: renders rise / run / width / stepCount / rotation / label inputs + Save Camera button", () => {
    render(<PropertiesPanel productLibrary={[]} viewMode={"3d" as never} />);

    expect(screen.getByLabelText(/width/i)).toBeTruthy();
    expect(screen.getByLabelText(/rise/i)).toBeTruthy();
    expect(screen.getByLabelText(/^run$/i)).toBeTruthy();
    expect(screen.getByLabelText(/step.*count/i)).toBeTruthy();
    expect(screen.getByLabelText(/rotation/i)).toBeTruthy();
    expect(screen.getByLabelText(/^label$/i)).toBeTruthy();
    expect(screen.getByTestId("save-camera-btn")).toBeTruthy();
  });

  it("C2: rise input dispatches updateStairNoHistory per keystroke; Enter commits via updateStair (single undo)", async () => {
    render(<PropertiesPanel productLibrary={[]} viewMode={"3d" as never} />);

    const input = screen.getByLabelText(/rise/i) as HTMLInputElement;
    expect(input.value).toBe("7");
    const beforePast = useCADStore.getState().past.length;

    await act(async () => {
      // Single-character "8" replaces "7" — one keystroke writes via NoHistory.
      fireEvent.change(input, { target: { value: "8" } });
    });

    // Live-preview stair has riseIn=8 but past.length unchanged.
    expect(useCADStore.getState().rooms.room_main.stairs![STAIR_ID].riseIn).toBe(8);
    expect(useCADStore.getState().past.length).toBe(beforePast);

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
    });

    // Commit pushed exactly one history entry.
    expect(useCADStore.getState().rooms.room_main.stairs![STAIR_ID].riseIn).toBe(8);
    expect(useCADStore.getState().past.length).toBe(beforePast + 1);
  });

  it("C3: width edge-handle drag — 3× NoHistory mid-drag + 1 history on release ⇒ single past entry, widthFtOverride === 5.0", () => {
    render(<PropertiesPanel productLibrary={[]} viewMode={"3d" as never} />);

    const beforePast = useCADStore.getState().past.length;
    const cad = useCADStore.getState();

    // Mid-drag — three NoHistory writes.
    cad.resizeStairWidthNoHistory("room_main", STAIR_ID, 3.5);
    cad.resizeStairWidthNoHistory("room_main", STAIR_ID, 4.2);
    cad.resizeStairWidthNoHistory("room_main", STAIR_ID, 4.8);

    // Past unchanged across NoHistory writes.
    expect(useCADStore.getState().past.length).toBe(beforePast);

    // Release — one history-pushing call.
    cad.resizeStairWidth("room_main", STAIR_ID, 5.0);

    const stair = useCADStore.getState().rooms.room_main.stairs![STAIR_ID];
    expect(stair.widthFtOverride).toBe(5.0);
    expect(useCADStore.getState().past.length).toBe(beforePast + 1);
  });
});
