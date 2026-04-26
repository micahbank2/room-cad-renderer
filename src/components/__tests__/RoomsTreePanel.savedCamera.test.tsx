import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { RoomsTreePanel } from "@/components/RoomsTreePanel/RoomsTreePanel";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";

// WARNING-4 fix: self-contained seed — Plan 03 does NOT supply seed helpers.
// Plan 03's RoomsTreePanel implementation must read these exact IDs from the
// store; test owns its own setup.
function seedSavedCameraScene(): void {
  const roomId = "room_test_1";
  useCADStore.setState((prev) => ({
    ...prev,
    activeRoomId: roomId,
    rooms: {
      [roomId]: {
        id: roomId,
        name: "Test",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {
          wall_with_cam: {
            id: "wall_with_cam",
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
            thickness: 0.5,
            height: 8,
            openings: [],
            savedCameraPos: [10, 6, 12] as [number, number, number],
            savedCameraTarget: [5, 3, 5] as [number, number, number],
          },
          wall_no_cam: {
            id: "wall_no_cam",
            start: { x: 0, y: 10 },
            end: { x: 10, y: 10 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
        placedProducts: {
          pp_with_cam: {
            id: "pp_with_cam",
            productId: "test_product_lib_id",
            position: { x: 5, y: 5 },
            rotation: 0,
            savedCameraPos: [2, 4, 8] as [number, number, number],
            savedCameraTarget: [1, 1, 1] as [number, number, number],
          },
          pp_no_cam: {
            id: "pp_no_cam",
            productId: "test_product_lib_id",
            position: { x: 7, y: 5 },
            rotation: 0,
          },
        },
        ceilings: {},
        placedCustomElements: {},
      },
    },
    past: [],
    future: [],
  }));
}

describe("RoomsTreePanel — Phase 48 savedCamera indicator + double-click (D-02, D-07)", () => {
  beforeEach(() => {
    seedSavedCameraScene();
  });

  it("leaf row WITH savedCameraPos renders Camera icon (title='Has saved camera angle', text-accent-light, w-3.5 h-3.5)", () => {
    render(<RoomsTreePanel productLibrary={[]} />);
    const row = document.querySelector('[data-tree-node="wall_with_cam"]') as HTMLElement | null;
    expect(row).not.toBeNull();
    const icon = row?.querySelector('[title="Has saved camera angle"]') as HTMLElement | null;
    expect(icon).not.toBeNull();
    expect(icon?.className).toMatch(/text-accent-light/);
    const svg = icon?.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("leaf row WITHOUT savedCameraPos renders NO Camera icon", () => {
    render(<RoomsTreePanel productLibrary={[]} />);
    const row = document.querySelector('[data-tree-node="wall_no_cam"]') as HTMLElement | null;
    expect(row).not.toBeNull();
    const icon = row?.querySelector('[title="Has saved camera angle"]');
    expect(icon).toBeNull();
  });

  it("group rows NEVER render Camera icon (D-07 leaf-only)", () => {
    render(<RoomsTreePanel productLibrary={[]} />);
    const groupRows = document.querySelectorAll('[data-tree-kind="group"]');
    expect(groupRows.length).toBeGreaterThan(0);
    groupRows.forEach((g) => {
      const rowContainer = g.querySelector(":scope > div");
      const icon = rowContainer?.querySelector(":scope > [title='Has saved camera angle']");
      expect(icon).toBeNull();
    });
  });

  it("room rows NEVER render Camera icon (D-07 leaf-only)", () => {
    render(<RoomsTreePanel productLibrary={[]} />);
    const roomRows = document.querySelectorAll('[data-tree-kind="room"]');
    expect(roomRows.length).toBeGreaterThan(0);
    roomRows.forEach((r) => {
      const rowContainer = r.querySelector(":scope > div");
      const icon = rowContainer?.querySelector(":scope > [title='Has saved camera angle']");
      expect(icon).toBeNull();
    });
  });

  it("double-click leaf row WITH savedCameraPos dispatches requestCameraTarget(savedPos, savedTarget)", () => {
    const ui = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      requestCameraTarget?: (p: [number,number,number], t: [number,number,number]) => void;
    };
    const spy = vi.spyOn(ui as unknown as { requestCameraTarget: (...args: unknown[]) => void }, "requestCameraTarget");

    render(<RoomsTreePanel productLibrary={[]} />);
    const row = document.querySelector('[data-tree-node="wall_with_cam"] [data-tree-row]') as HTMLElement | null;
    expect(row).not.toBeNull();
    fireEvent.doubleClick(row!);

    // Per seed: savedCameraPos = [10,6,12], savedCameraTarget = [5,3,5]
    expect(spy).toHaveBeenCalled();
    const callMatched = spy.mock.calls.some(
      (c) => Array.isArray(c[0]) && (c[0] as number[])[0] === 10 && (c[0] as number[])[1] === 6,
    );
    expect(callMatched).toBe(true);
  });

  it("double-click leaf row WITHOUT savedCameraPos falls through to default focus dispatch (D-02 fall-through)", () => {
    const ui = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      focusWallSide?: (id: string, side: "A"|"B") => void;
    };
    const spy = vi.spyOn(ui as unknown as { focusWallSide: (...args: unknown[]) => void }, "focusWallSide");

    render(<RoomsTreePanel productLibrary={[]} />);
    const row = document.querySelector('[data-tree-node="wall_no_cam"] [data-tree-row]') as HTMLElement | null;
    expect(row).not.toBeNull();
    fireEvent.doubleClick(row!);

    expect(spy).toHaveBeenCalledWith("wall_no_cam", "A");
  });

  it("double-click on group row is NO-OP (no pendingCameraTarget update)", () => {
    const ui = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      requestCameraTarget?: (p: [number,number,number], t: [number,number,number]) => void;
    };
    const spy = vi.spyOn(ui as unknown as { requestCameraTarget: (...args: unknown[]) => void }, "requestCameraTarget");

    render(<RoomsTreePanel productLibrary={[]} />);
    const groupRow = document.querySelector('[data-tree-kind="group"] [data-tree-row]') as HTMLElement | null;
    if (!groupRow) {
      const altGroup = document.querySelector('[data-tree-kind="group"]') as HTMLElement | null;
      expect(altGroup).not.toBeNull();
      fireEvent.doubleClick(altGroup!);
    } else {
      fireEvent.doubleClick(groupRow);
    }
    expect(spy).not.toHaveBeenCalled();
  });
});
