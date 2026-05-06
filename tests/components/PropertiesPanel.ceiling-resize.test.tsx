/**
 * Phase 65 CEIL-02 (D-15) component tests C1-C2.
 *
 * C1: WIDTH + DEPTH inputs render; live-preview NoHistory on keystroke,
 *     Enter commits via resizeCeilingAxis (single undo).
 * C2: When at least one override is set the RESET_SIZE button is rendered;
 *     clicking it dispatches clearCeilingOverrides with the ceiling's id.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, act, screen } from "@testing-library/react";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import PropertiesPanel from "@/components/PropertiesPanel";
import type { Ceiling, Point } from "@/types/cad";

const CEILING_ID = "ceiling_pp_test";

function seedRectCeilingAndSelect(extra: Partial<Ceiling> = {}) {
  resetCADStoreForTests();
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 5 },
    { x: 0, y: 5 },
  ];
  useCADStore.setState({
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {},
        ceilings: {
          [CEILING_ID]: {
            id: CEILING_ID,
            points,
            height: 8,
            material: "#f5f5f5",
            ...extra,
          } as Ceiling,
        },
      },
    },
    activeRoomId: "room_main",
    past: [],
    future: [],
  });
  useUIStore.setState({ selectedIds: [CEILING_ID] });
}

describe("Phase 65 PropertiesPanel — ceiling-resize section", () => {
  beforeEach(() => {
    seedRectCeilingAndSelect();
  });

  it("C1: WIDTH + DEPTH inputs render; keystroke writes NoHistory, Enter commits via history", async () => {
    render(<PropertiesPanel productLibrary={[]} viewMode={"3d" as never} />);

    const widthInput = screen.getByLabelText(/^WIDTH$/i) as HTMLInputElement;
    const depthInput = screen.getByLabelText(/^DEPTH$/i) as HTMLInputElement;
    expect(widthInput).toBeTruthy();
    expect(depthInput).toBeTruthy();
    // Default values reflect bbox of the original 10x5 ceiling.
    expect(parseFloat(widthInput.value)).toBeCloseTo(10, 2);
    expect(parseFloat(depthInput.value)).toBeCloseTo(5, 2);

    const beforePast = useCADStore.getState().past.length;

    await act(async () => {
      fireEvent.change(widthInput, { target: { value: "12" } });
    });
    // Live-preview wrote widthFtOverride=12 via NoHistory; past unchanged.
    expect(useCADStore.getState().rooms.room_main.ceilings![CEILING_ID].widthFtOverride).toBe(12);
    expect(useCADStore.getState().past.length).toBe(beforePast);

    await act(async () => {
      fireEvent.keyDown(widthInput, { key: "Enter" });
      fireEvent.blur(widthInput);
    });
    // Commit pushed exactly one history entry.
    expect(useCADStore.getState().past.length).toBe(beforePast + 1);
    expect(useCADStore.getState().rooms.room_main.ceilings![CEILING_ID].widthFtOverride).toBe(12);
  });

  it("C2: RESET_SIZE button renders ONLY when an override is set; clicking dispatches clearCeilingOverrides", async () => {
    // Re-seed with widthFtOverride already set so the button shows up.
    seedRectCeilingAndSelect({ widthFtOverride: 15 });

    render(<PropertiesPanel productLibrary={[]} viewMode={"3d" as never} />);

    const button = screen.getByText(/^Reset size$/i);
    expect(button).toBeTruthy();

    const beforePast = useCADStore.getState().past.length;
    await act(async () => {
      fireEvent.click(button);
    });
    const c = useCADStore.getState().rooms.room_main.ceilings![CEILING_ID];
    expect(c.widthFtOverride).toBeUndefined();
    expect(c.depthFtOverride).toBeUndefined();
    expect(c.anchorXFt).toBeUndefined();
    expect(c.anchorYFt).toBeUndefined();
    expect(useCADStore.getState().past.length).toBe(beforePast + 1);
  });

  it("C2b: RESET_SIZE button is NOT rendered when there are no overrides", () => {
    render(<PropertiesPanel productLibrary={[]} viewMode={"3d" as never} />);
    expect(screen.queryByText(/^Reset size$/i)).toBeNull();
  });
});
