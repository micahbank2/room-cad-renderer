/**
 * Phase 29 Wave 0 — red stubs for the PropertiesPanel LENGTH row parser.
 *
 * Covers: D-05 (LENGTH accepts feet+inches), D-05a (optional `parser` prop;
 * default parseFloat for THICKNESS/HEIGHT unchanged), D-02a reject guard,
 * RESEARCH Pitfall #2 (no-op commit must not grow history).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, act, screen } from "@testing-library/react";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { wallLength } from "@/lib/geometry";
import PropertiesPanel from "@/components/PropertiesPanel";

const WALL_ID = "wall_pp_test";

function seedOneWallAndSelect(lengthFt = 10) {
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
  useUIStore.setState({ selectedIds: [WALL_ID] });
}

/**
 * The LENGTH row renders a <span> with formatFeet(value) when not editing.
 * Clicking the parent row enters edit mode; an <input> then appears.
 * Labels are lifted from `EditableRow` — "LENGTH", "THICKNESS", "HEIGHT".
 */
function openEditForLabel(label: string): HTMLInputElement {
  // Find the row by its label text, click its parent flex container to enter edit mode.
  const labelEl = screen.getByText(label);
  const row = labelEl.parentElement as HTMLElement;
  fireEvent.click(row);
  // After click, an input should be rendered as a sibling of the label.
  const input = row.querySelector("input") as HTMLInputElement;
  return input;
}

describe("PropertiesPanel Length row (D-05 parser prop)", () => {
  beforeEach(() => {
    seedOneWallAndSelect(10);
  });

  it("accepts feet+inches notation and commits decimal feet (D-05)", async () => {
    render(<PropertiesPanel productLibrary={[]} />);
    let input!: HTMLInputElement;
    await act(async () => {
      input = openEditForLabel("Length");
    });
    expect(input).toBeTruthy();
    await act(async () => {
      fireEvent.change(input, { target: { value: "12'6\"" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
    });
    const wall = useCADStore.getState().rooms.room_main.walls[WALL_ID];
    expect(wallLength(wall)).toBeCloseTo(12.5, 3);
  });

  it("rejects bare '12 6' silently (D-02a, D-06a)", async () => {
    render(<PropertiesPanel productLibrary={[]} />);
    let input!: HTMLInputElement;
    await act(async () => {
      input = openEditForLabel("Length");
    });
    await act(async () => {
      fireEvent.change(input, { target: { value: "12 6" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
    });
    const wall = useCADStore.getState().rooms.room_main.walls[WALL_ID];
    // Wall length unchanged at 10ft
    expect(wallLength(wall)).toBeCloseTo(10, 3);
  });

  it("THICKNESS row keeps decimal-only parsing (D-05a default parser unchanged)", async () => {
    render(<PropertiesPanel productLibrary={[]} />);
    // Commit a plain decimal via THICKNESS — must still work.
    let input!: HTMLInputElement;
    await act(async () => {
      input = openEditForLabel("Thickness");
    });
    await act(async () => {
      fireEvent.change(input, { target: { value: "0.75" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
    });
    expect(useCADStore.getState().rooms.room_main.walls[WALL_ID].thickness).toBeCloseTo(0.75, 3);

    // Type feet+inches into THICKNESS — must NOT commit (default parseFloat
    // would yield 0, which is below THICKNESS min=0.1). D-05a regression lock:
    // only LENGTH receives the feet+inches parser prop.
    await act(async () => {
      input = openEditForLabel("Thickness");
    });
    await act(async () => {
      fireEvent.change(input, { target: { value: "0'9\"" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
    });
    // Thickness stays at 0.75 (not parsed as 0.75ft feet+inches)
    expect(useCADStore.getState().rooms.room_main.walls[WALL_ID].thickness).toBeCloseTo(0.75, 3);
  });

  it("no-op commit (same value) does not grow past history (RESEARCH Pitfall #2)", async () => {
    render(<PropertiesPanel productLibrary={[]} />);
    const priorPast = useCADStore.getState().past.length;
    let input!: HTMLInputElement;
    await act(async () => {
      input = openEditForLabel("Length");
    });
    // Don't change the value — just commit
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
    });
    expect(useCADStore.getState().past.length).toBe(priorPast);
  });
});
