import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    // Restore spies from prior tests so per-test vi.spyOn calls start fresh.
    // Without this, accumulated requestCameraTarget calls from earlier
    // double-click tests leak into the "group row is NO-OP" assertion.
    vi.restoreAllMocks();
    vi.clearAllMocks();
    seedSavedCameraScene();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("leaf row WITH savedCameraPos renders Camera icon button (Phase 81 D-03: was indicator, now button)", () => {
    render(<RoomsTreePanel productLibrary={[]} />);
    const row = document.querySelector('[data-tree-node="wall_with_cam"]') as HTMLElement | null;
    expect(row).not.toBeNull();
    // Phase 81 Plan 03 (D-03): the Camera affordance is now a button with
    // data-saved-camera-button (was a passive span with data-saved-camera-indicator).
    const button = row?.querySelector('[data-saved-camera-button]') as HTMLElement | null;
    expect(button).not.toBeNull();
    expect(button?.tagName.toLowerCase()).toBe("button");
    // Pascal token sweep — text-foreground preserved.
    expect(button?.className).toMatch(/text-foreground/);
    const svg = button?.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("leaf row WITHOUT savedCameraPos renders NO Camera button", () => {
    render(<RoomsTreePanel productLibrary={[]} />);
    const row = document.querySelector('[data-tree-node="wall_no_cam"]') as HTMLElement | null;
    expect(row).not.toBeNull();
    const button = row?.querySelector('[data-saved-camera-button]');
    expect(button).toBeNull();
  });

  it("group rows NEVER render Camera button (D-07 leaf-only)", () => {
    render(<RoomsTreePanel productLibrary={[]} />);
    const groupRows = document.querySelectorAll('[data-tree-kind="group"]');
    expect(groupRows.length).toBeGreaterThan(0);
    groupRows.forEach((g) => {
      const rowContainer = g.querySelector(":scope > div");
      const button = rowContainer?.querySelector(":scope > [data-saved-camera-button]");
      expect(button).toBeNull();
    });
  });

  it("room rows NEVER render Camera button (D-07 leaf-only)", () => {
    render(<RoomsTreePanel productLibrary={[]} />);
    const roomRows = document.querySelectorAll('[data-tree-kind="room"]');
    expect(roomRows.length).toBeGreaterThan(0);
    roomRows.forEach((r) => {
      const rowContainer = r.querySelector(":scope > div");
      const button = rowContainer?.querySelector(":scope > [data-saved-camera-button]");
      expect(button).toBeNull();
    });
  });

  it("Camera-button CLICK on leaf row WITH savedCameraPos dispatches requestCameraTarget(savedPos, savedTarget) (Phase 81 D-03)", () => {
    const ui = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      requestCameraTarget?: (p: [number,number,number], t: [number,number,number]) => void;
    };
    const spy = vi.spyOn(ui as unknown as { requestCameraTarget: (...args: unknown[]) => void }, "requestCameraTarget");

    render(<RoomsTreePanel productLibrary={[]} />);
    // Phase 81 Plan 03 (D-03): saved-camera now fires on Camera-button click,
    // not row dbl-click. Row dbl-click opens inline rename.
    const button = document.querySelector('[data-tree-node="wall_with_cam"] [data-saved-camera-button]') as HTMLElement | null;
    expect(button).not.toBeNull();
    fireEvent.click(button!);

    // Per seed: savedCameraPos = [10,6,12], savedCameraTarget = [5,3,5]
    expect(spy).toHaveBeenCalled();
    const callMatched = spy.mock.calls.some(
      (c) => Array.isArray(c[0]) && (c[0] as number[])[0] === 10 && (c[0] as number[])[1] === 6,
    );
    expect(callMatched).toBe(true);
  });

  it("Phase 81 D-03: dbl-click on a leaf row opens inline rename (NO saved-camera dispatch)", () => {
    const ui = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      requestCameraTarget?: (p: [number,number,number], t: [number,number,number]) => void;
    };
    const spy = vi.spyOn(ui as unknown as { requestCameraTarget: (...args: unknown[]) => void }, "requestCameraTarget");

    render(<RoomsTreePanel productLibrary={[]} />);
    // Phase 81 Plan 03: dbl-click on the row container flips it into edit mode.
    const rowContainer = document.querySelector('[data-tree-node="wall_with_cam"] > div') as HTMLElement | null;
    expect(rowContainer).not.toBeNull();
    fireEvent.doubleClick(rowContainer!);

    // Inline edit input appears — InlineEditableText with data-testid `tree-row-edit-{id}`.
    const editInput = document.querySelector('[data-testid="tree-row-edit-wall_with_cam"]');
    expect(editInput).not.toBeNull();
    // Saved-camera focus must NOT have fired (D-03 contract: dbl-click ≠ camera).
    expect(spy).not.toHaveBeenCalled();
  });

  it("dbl-click on group row is NO-OP (no rename, no camera) — group rows are not editable", () => {
    const ui = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      requestCameraTarget?: (p: [number,number,number], t: [number,number,number]) => void;
    };
    const spy = vi.spyOn(ui as unknown as { requestCameraTarget: (...args: unknown[]) => void }, "requestCameraTarget");

    render(<RoomsTreePanel productLibrary={[]} />);
    const groupRow = document.querySelector('[data-tree-kind="group"] > div') as HTMLElement | null;
    if (groupRow) {
      fireEvent.doubleClick(groupRow);
    }
    expect(spy).not.toHaveBeenCalled();
    // No edit input on any group row.
    const editInputs = document.querySelectorAll('[data-testid^="tree-row-edit-"]');
    // Could include the leaf-row edit input from a prior test if state leaked; assert
    // that no GROUP node carries an edit input by checking ancestry.
    editInputs.forEach((input) => {
      const groupAncestor = input.closest('[data-tree-kind="group"]');
      expect(groupAncestor).toBeNull();
    });
  });
});
