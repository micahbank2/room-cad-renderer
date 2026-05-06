// tests/lib/contextMenuActionCounts.test.ts
// Phase 53 CTXMENU-01: D-02 action count contract tests.
// Asserts the locked action sets from CONTEXT.md.
import { describe, test, expect, vi } from "vitest";
import { getActionsForKind } from "@/components/CanvasContextMenu";

// Mock stores and dependencies so getActionsForKind can be called outside a React tree.
vi.mock("@/stores/uiStore", () => ({
  useUIStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) => {
      const state = {
        contextMenu: null,
        closeContextMenu: vi.fn(),
        pendingLabelFocus: null,
        hiddenIds: new Set<string>(),
        getCameraCapture: null,
        // Phase 59 CUTAWAY-01: cutaway-manual state surface for getActionsForKind.
        cutawayManualWallIds: new Set<string>(),
      };
      return selector(state);
    },
    {
      getState: () => ({
        hiddenIds: new Set<string>(),
        getCameraCapture: null,
        toggleHidden: vi.fn(),
        select: vi.fn(),
        setPendingLabelFocus: vi.fn(),
        // Phase 59 CUTAWAY-01
        cutawayManualWallIds: new Set<string>(),
        toggleCutawayManualWall: vi.fn(),
      }),
    },
  ),
}));

vi.mock("@/stores/cadStore", () => ({
  useCADStore: vi.fn(),
  getActiveRoomDoc: () => ({
    id: "room_1",
    name: "Test",
    room: { width: 20, length: 16, wallHeight: 8 },
    walls: {},
    placedProducts: {},
    ceilings: {},
    placedCustomElements: {},
  }),
}));

// Provide a mock for cadStore.getState
const mockCadStoreState = {
  removeWall: vi.fn(),
  removeProduct: vi.fn(),
  removePlacedCustomElement: vi.fn(),
  removeStair: vi.fn(),
  setSavedCameraOnWallNoHistory: vi.fn(),
  setSavedCameraOnProductNoHistory: vi.fn(),
  setSavedCameraOnCeilingNoHistory: vi.fn(),
  setSavedCameraOnCustomElementNoHistory: vi.fn(),
  setSavedCameraOnStairNoHistory: vi.fn(),
};

vi.mock("@/stores/cadStore", () => ({
  useCADStore: Object.assign(vi.fn(), {
    getState: () => mockCadStoreState,
  }),
  getActiveRoomDoc: () => ({
    id: "room_1",
    name: "Test",
    room: { width: 20, length: 16, wallHeight: 8 },
    walls: {},
    placedProducts: {},
    ceilings: {},
    placedCustomElements: {},
  }),
}));

vi.mock("@/lib/clipboardActions", () => ({
  copySelection: vi.fn(),
  pasteSelection: vi.fn(),
  hasClipboardContent: () => false,
}));

vi.mock("@/components/RoomsTreePanel/focusDispatch", () => ({
  focusOnWall: vi.fn(),
  focusOnPlacedProduct: vi.fn(),
  focusOnCeiling: vi.fn(),
  focusOnPlacedCustomElement: vi.fn(),
  focusOnStair: vi.fn(),
}));

describe("getActionsForKind — D-02 action count contract", () => {
  test("wall has 6 actions (Phase 59: + cutaway-toggle between copy and delete)", () => {
    const actions = getActionsForKind("wall", "wall_1");
    expect(actions).toHaveLength(6);
    expect(actions.map((a) => a.id)).toEqual([
      "focus",
      "save-cam",
      "hide-show",
      "copy",
      "cutaway-toggle",
      "delete",
    ]);
  });

  test("Phase 59 — wall cutaway-toggle label is 'Hide in 3D' when wall is NOT in cutawayManualWallIds", () => {
    const actions = getActionsForKind("wall", "wall_1");
    const cutaway = actions.find((a) => a.id === "cutaway-toggle");
    expect(cutaway).toBeDefined();
    expect(cutaway!.label).toBe("Hide in 3D");
  });

  test("product has 6 actions", () => {
    const actions = getActionsForKind("product", "pp_1");
    expect(actions).toHaveLength(6);
    expect(actions.map((a) => a.id)).toEqual(["focus", "save-cam", "hide-show", "copy", "paste", "delete"]);
  });

  test("ceiling has 3 actions", () => {
    const actions = getActionsForKind("ceiling", "c_1");
    expect(actions).toHaveLength(3);
    expect(actions.map((a) => a.id)).toEqual(["focus", "save-cam", "hide-show"]);
  });

  test("custom has 6 actions ending with rename", () => {
    const actions = getActionsForKind("custom", "pce_1");
    expect(actions).toHaveLength(6);
    expect(actions[actions.length - 1].label).toBe("Rename label");
  });

  test("empty with no clipboard has 0 actions (hidden)", () => {
    const actions = getActionsForKind("empty", null);
    expect(actions).toHaveLength(0);
  });
});
