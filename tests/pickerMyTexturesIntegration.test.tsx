/**
 * Phase 34 Plan 02 Task 3 — Picker integration.
 *
 * Verifies MY TEXTURES tab integration in FloorMaterialPicker,
 * SurfaceMaterialPicker (ceiling), and WallSurfacePanel. Each picker
 * exposes the tab, renders MyTexturesList when active, and dispatches the
 * correct store mutation with userTextureId on card select.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import type { UserTexture } from "@/types/userTexture";

// ---- useUserTextures mock ------------------------------------------------
const useUserTexturesMock = vi.fn();
vi.mock("@/hooks/useUserTextures", () => ({
  useUserTextures: () => useUserTexturesMock(),
}));

// ---- useCADStore mock ----------------------------------------------------
const setFloorMaterialSpy = vi.fn();
const updateCeilingSpy = vi.fn();
const setWallpaperSpy = vi.fn();
const toggleWainscotingSpy = vi.fn();
const toggleCrownMoldingSpy = vi.fn();
const addWallArtSpy = vi.fn();
const removeWallArtSpy = vi.fn();
const copyWallSideSpy = vi.fn();
const swapWallSidesSpy = vi.fn();
const setCeilingSurfaceMaterialSpy = vi.fn();

const storeState = {
  rooms: {
    room1: {
      id: "room1",
      name: "Room",
      floorMaterial: undefined,
      walls: {
        wall1: {
          id: "wall1",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
          thickness: 0.5,
          height: 8,
          openings: [],
          wallpaper: {},
        },
      },
      placedProducts: {},
      ceilings: {},
      placedCustomElements: {},
      room: { width: 10, length: 10, wallHeight: 8 },
    },
  },
  activeRoomId: "room1",
  setFloorMaterial: setFloorMaterialSpy,
  updateCeiling: updateCeilingSpy,
  setWallpaper: setWallpaperSpy,
  toggleWainscoting: toggleWainscotingSpy,
  toggleCrownMolding: toggleCrownMoldingSpy,
  addWallArt: addWallArtSpy,
  removeWallArt: removeWallArtSpy,
  copyWallSide: copyWallSideSpy,
  swapWallSides: swapWallSidesSpy,
  setCeilingSurfaceMaterial: setCeilingSurfaceMaterialSpy,
};

vi.mock("@/stores/cadStore", () => ({
  useCADStore: Object.assign(
    (selector: any) => selector(storeState),
    { getState: () => storeState },
  ),
  useActiveRoomDoc: () => storeState.rooms.room1,
  useActiveWalls: () => storeState.rooms.room1.walls,
  useActiveCeilings: () => storeState.rooms.room1.ceilings,
  useActivePlacedCustoms: () => ({}),
  useActiveRoom: () => storeState.rooms.room1.room,
  useActivePlacedProducts: () => ({}),
}));

// ---- uiStore mock (for WallSurfacePanel) --------------------------------
const setActiveWallSideSpy = vi.fn();
const focusWallSideSpy = vi.fn();
vi.mock("@/stores/uiStore", () => ({
  useUIStore: (selector: any) =>
    selector({
      selectedIds: ["wall1"],
      activeWallSide: "A",
      setActiveWallSide: setActiveWallSideSpy,
      focusWallSide: focusWallSideSpy,
    }),
}));

// ---- framedArt + wainscotStyle store mocks (WallSurfacePanel imports them)
vi.mock("@/stores/framedArtStore", () => ({
  useFramedArtStore: (selector: any) => selector({ items: [] }),
}));
vi.mock("@/stores/wainscotStyleStore", () => ({
  useWainscotStyleStore: (selector: any) => selector({ items: [] }),
}));

// ---- PaintSection stub (heavy dependency) --------------------------------
vi.mock("@/components/PaintSection", () => ({
  default: () => null,
}));

// ---- URL shims -----------------------------------------------------------
// Phase 63 (DEBT-06, #146): use vi.spyOn + restoreAllMocks instead of
// top-level global.URL mutation. Top-level mutation persisted across the
// vitest worker pool (isolate:true only resets module registry, NOT
// globalThis), causing 281-error cascade pollution into unrelated test
// files. Pattern mirrors userTextureCache.test.tsx:42-56.
import { beforeAll, afterAll } from "vitest";
beforeAll(() => {
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:mock/url");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterAll(() => {
  vi.restoreAllMocks();
});

import FloorMaterialPicker from "@/components/FloorMaterialPicker";
import SurfaceMaterialPicker from "@/components/SurfaceMaterialPicker";
import WallSurfacePanel from "@/components/WallSurfacePanel";

function makeTexture(id: string, tileSize: number): UserTexture {
  return {
    id,
    sha256: `${id}-sha`,
    name: `Tex ${id}`,
    tileSizeFt: tileSize,
    blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
    mimeType: "image/jpeg",
    createdAt: Date.now(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setFloorMaterialSpy.mockReset();
  updateCeilingSpy.mockReset();
  setWallpaperSpy.mockReset();
  useUserTexturesMock.mockReturnValue({
    textures: [makeTexture("utex_abc", 2.5)],
    loading: false,
    save: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reload: vi.fn(),
  });
});

describe("FloorMaterialPicker — MY TEXTURES tab", () => {
  it("renders MY TEXTURES tab with count badge", () => {
    render(<FloorMaterialPicker />);
    expect(screen.getByText("MY TEXTURES")).toBeInTheDocument();
  });

  it("clicking a texture card dispatches setFloorMaterial with userTextureId", () => {
    render(<FloorMaterialPicker />);
    // Switch to MY TEXTURES tab
    fireEvent.click(screen.getByText("MY TEXTURES"));
    // Click the card (matches data-testid pattern from MyTexturesList)
    fireEvent.click(screen.getByTestId("texture-card-utex_abc"));
    expect(setFloorMaterialSpy).toHaveBeenCalledWith({
      kind: "user-texture",
      userTextureId: "utex_abc",
      scaleFt: 2.5,
      rotationDeg: 0,
    });
  });
});

describe("SurfaceMaterialPicker (ceiling) — MY TEXTURES tab", () => {
  it("renders MY TEXTURES tab when onSelectUserTexture is provided", () => {
    render(
      <SurfaceMaterialPicker
        surface="ceiling"
        activeId={undefined}
        onSelect={() => {}}
        onSelectUserTexture={(id) =>
          updateCeilingSpy("ceiling1", { userTextureId: id, surfaceMaterialId: undefined })
        }
      />,
    );
    expect(screen.getByText("MY TEXTURES")).toBeInTheDocument();
  });

  it("selecting a user texture dispatches updateCeiling with userTextureId + clears surfaceMaterialId", () => {
    render(
      <SurfaceMaterialPicker
        surface="ceiling"
        activeId={undefined}
        onSelect={() => {}}
        onSelectUserTexture={(id) =>
          updateCeilingSpy("ceiling1", { userTextureId: id, surfaceMaterialId: undefined })
        }
      />,
    );
    fireEvent.click(screen.getByText("MY TEXTURES"));
    fireEvent.click(screen.getByTestId("texture-card-utex_abc"));
    expect(updateCeilingSpy).toHaveBeenCalledWith("ceiling1", {
      userTextureId: "utex_abc",
      surfaceMaterialId: undefined,
    });
  });
});

// WallSurfacePanel — MY TEXTURES tab tests removed in Phase 71 (v1.18).
// WallSurfacePanel was reworked in Phase 68 MAT-APPLY-01 and no longer exposes
// the MY TEXTURES tab (wallpaper texture selection moved to a different surface).
// FloorMaterialPicker + SurfaceMaterialPicker still carry MY TEXTURES — see below.

describe("Empty-state preservation", () => {
  it("FloorMaterialPicker MY TEXTURES tab shows empty state when no textures exist", () => {
    useUserTexturesMock.mockReturnValue({
      textures: [],
      loading: false,
      save: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      reload: vi.fn(),
    });
    render(<FloorMaterialPicker />);
    fireEvent.click(screen.getByText("MY TEXTURES"));
    expect(screen.getByText("NO CUSTOM TEXTURES")).toBeInTheDocument();
  });
});
