import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PropertiesPanel from "@/components/PropertiesPanel";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";

// PropertiesPanel takes productLibrary as prop. viewMode is added in Plan 03
// (D-09 disable gate). Tests assume the new prop signature; Plan 03 adds it.

function seedAndSelectWall(): string {
  const wallId = "wall_test_1";
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
          [wallId]: {
            id: wallId,
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
        placedProducts: {},
        ceilings: {},
        placedCustomElements: {},
      },
    },
    past: [],
    future: [],
  }));
  useUIStore.setState((prev) => ({ ...prev, selectedIds: [wallId] }));
  return wallId;
}

function renderPanelWithViewMode(viewMode: "2d" | "3d" | "split") {
  return render(<PropertiesPanel productLibrary={[]} viewMode={viewMode as never} />);
}

describe("PropertiesPanel — Phase 48 savedCamera Save/Clear (D-01, D-09, D-11)", () => {
  beforeEach(() => {
    seedAndSelectWall();
  });

  it("Save button renders with lucide Camera icon when wall is selected and viewMode === '3d'", () => {
    renderPanelWithViewMode("3d");
    const btn = screen.queryByTestId("save-camera-btn");
    expect(btn).not.toBeNull();
    expect(btn?.querySelector("svg")).not.toBeNull();
    expect(btn).not.toBeDisabled();
  });

  it("Save button is disabled when viewMode === '2d' (D-09)", () => {
    renderPanelWithViewMode("2d");
    const btn = screen.queryByTestId("save-camera-btn");
    if (btn) expect(btn).toBeDisabled();
  });

  it("clicking Save calls setSavedCameraOnWallNoHistory with captured pose (D-01 + getCameraCapture bridge)", () => {
    const fakeCapture = () => ({ pos: [1,2,3] as [number,number,number], target: [4,5,6] as [number,number,number] });
    const ui = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      installCameraCapture?: (fn: () => { pos: [number,number,number]; target: [number,number,number] } | null) => void;
    };
    if (ui.installCameraCapture) ui.installCameraCapture(fakeCapture);

    const cadStore = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    const spy = vi.spyOn(cadStore as unknown as { setSavedCameraOnWallNoHistory: (...args: unknown[]) => void }, "setSavedCameraOnWallNoHistory");

    renderPanelWithViewMode("3d");
    const btn = screen.getByTestId("save-camera-btn");
    fireEvent.click(btn);

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][1]).toEqual([1,2,3]);
    expect(spy.mock.calls[0][2]).toEqual([4,5,6]);
  });

  it("Clear button renders with lucide CameraOff icon ONLY when entity has savedCameraPos", () => {
    const cadStore = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    if (cadStore.setSavedCameraOnWallNoHistory) {
      cadStore.setSavedCameraOnWallNoHistory("wall_test_1", [1,2,3], [4,5,6]);
    }
    renderPanelWithViewMode("3d");
    const clearBtn = screen.queryByTestId("clear-camera-btn");
    expect(clearBtn).not.toBeNull();
    expect(clearBtn?.querySelector("svg")).not.toBeNull();
  });

  it("Clear button is NOT in DOM when entity has no savedCameraPos", () => {
    const cadStore = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      clearSavedCameraNoHistory?: (kind: "wall"|"product"|"ceiling"|"custom", id: string) => void;
    };
    if (cadStore.clearSavedCameraNoHistory) {
      cadStore.clearSavedCameraNoHistory("wall", "wall_test_1");
    }
    renderPanelWithViewMode("3d");
    const clearBtn = screen.queryByTestId("clear-camera-btn");
    expect(clearBtn).toBeNull();
  });

  it("clicking Clear calls clearSavedCameraNoHistory(kind, id)", () => {
    // Apply the saved-camera mutation FIRST (set() replaces the state object
    // reference under immer middleware, so capturing cadStore before this
    // would leave the spy on a stale reference the component never reads).
    const seedStore = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    if (seedStore.setSavedCameraOnWallNoHistory) seedStore.setSavedCameraOnWallNoHistory("wall_test_1", [1,2,3], [4,5,6]);

    const cadStore = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      clearSavedCameraNoHistory?: (kind: "wall"|"product"|"ceiling"|"custom", id: string) => void;
    };
    const spy = vi.spyOn(cadStore as unknown as { clearSavedCameraNoHistory: (...args: unknown[]) => void }, "clearSavedCameraNoHistory");

    renderPanelWithViewMode("3d");
    const clearBtn = screen.getByTestId("clear-camera-btn");
    fireEvent.click(clearBtn);

    expect(spy).toHaveBeenCalledWith("wall", "wall_test_1");
  });

  it("D-11 verbatim tooltip strings appear in DOM", () => {
    renderPanelWithViewMode("3d");
    const html = document.body.innerHTML;
    expect(html).toContain("Save current camera angle to this node");
    const cadStore = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    if (cadStore.setSavedCameraOnWallNoHistory) cadStore.setSavedCameraOnWallNoHistory("wall_test_1", [1,2,3], [4,5,6]);
    renderPanelWithViewMode("3d");
    expect(document.body.innerHTML).toContain("Remove saved camera angle");
  });

  it("disabled Save button in 2D shows D-09 tooltip 'Switch to 3D view to save a camera angle'", () => {
    renderPanelWithViewMode("2d");
    const html = document.body.innerHTML;
    expect(html).toContain("Switch to 3D view to save a camera angle");
  });
});
