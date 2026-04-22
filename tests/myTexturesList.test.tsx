/**
 * Phase 34 Plan 02 Task 1 — MyTexturesList.
 *
 * Shared component consumed by floor / ceiling / wall pickers. Hosts the
 * MY TEXTURES tab body: card grid + + UPLOAD tile + per-card ⋮ menu that
 * opens UploadTextureModal (edit) and DeleteTextureDialog.
 *
 * UI-SPEC §2: grid, empty state, ⋮ menu, aria-label, copy.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";
import type { UserTexture } from "@/types/userTexture";

// Mock useUserTextures BEFORE importing the component under test.
const removeMock = vi.fn<(id: string) => Promise<void>>();
const saveMock = vi.fn();
const updateMock = vi.fn();
const reloadMock = vi.fn();
const useUserTexturesMock = vi.fn();

vi.mock("@/hooks/useUserTextures", () => ({
  useUserTextures: () => useUserTexturesMock(),
}));

// Mock useCADStore — DeleteTextureDialog needs a snapshot. MyTexturesList
// itself doesn't, but if the Delete dialog mounts during "open delete"
// assertions we need a minimal store shape.
vi.mock("@/stores/cadStore", () => ({
  useCADStore: Object.assign(
    (selector: any) => selector({ rooms: {}, activeRoomId: null, customElements: {}, customPaints: [], recentPaints: [] }),
    {
      getState: () => ({ rooms: {}, activeRoomId: null, customElements: {}, customPaints: [], recentPaints: [] }),
    },
  ),
}));

import { MyTexturesList } from "@/components/MyTexturesList";

function makeTexture(id: string, name: string, tileSizeFt = 2, createdAt = Date.now()): UserTexture {
  return {
    id,
    sha256: `${id}-sha`,
    name,
    tileSizeFt,
    blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
    mimeType: "image/jpeg",
    createdAt,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: loaded, empty.
  useUserTexturesMock.mockReturnValue({
    textures: [],
    loading: false,
    save: saveMock,
    update: updateMock,
    remove: removeMock,
    reload: reloadMock,
  });
  // URL.createObjectURL / revokeObjectURL shim (happy-dom has it but make it deterministic)
  if (!global.URL.createObjectURL) {
    // @ts-expect-error — assigning for tests
    global.URL.createObjectURL = (_b: Blob) => `blob:mock/${Math.random()}`;
  }
  if (!global.URL.revokeObjectURL) {
    // @ts-expect-error
    global.URL.revokeObjectURL = () => {};
  }
});

describe("MyTexturesList — loading + empty + populated", () => {
  it("loading state renders 3 skeleton tiles", () => {
    useUserTexturesMock.mockReturnValue({
      textures: [],
      loading: true,
      save: saveMock,
      update: updateMock,
      remove: removeMock,
      reload: reloadMock,
    });
    const { container } = render(<MyTexturesList onSelect={() => {}} />);
    const skeletons = container.querySelectorAll("[data-testid='texture-skeleton']");
    expect(skeletons.length).toBe(3);
  });

  it("empty state shows locked heading + body copy", () => {
    render(<MyTexturesList onSelect={() => {}} />);
    expect(screen.getByText("NO CUSTOM TEXTURES")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Upload a photo of a surface to use it on walls, floors, and ceilings.",
      ),
    ).toBeInTheDocument();
  });

  it("populated: both texture names rendered UPPERCASE and UPLOAD tile present", () => {
    useUserTexturesMock.mockReturnValue({
      textures: [makeTexture("utex_a", "Oak Floor"), makeTexture("utex_b", "Concrete Wall")],
      loading: false,
      save: saveMock,
      update: updateMock,
      remove: removeMock,
      reload: reloadMock,
    });
    render(<MyTexturesList onSelect={() => {}} />);
    expect(screen.getByText("OAK FLOOR")).toBeInTheDocument();
    expect(screen.getByText("CONCRETE WALL")).toBeInTheDocument();
    expect(screen.getByText("UPLOAD")).toBeInTheDocument();
  });
});

describe("MyTexturesList — interactions", () => {
  it("clicking a texture card calls onSelect with (id, tileSizeFt)", () => {
    useUserTexturesMock.mockReturnValue({
      textures: [makeTexture("utex_a", "Oak Floor", 2.5)],
      loading: false,
      save: saveMock,
      update: updateMock,
      remove: removeMock,
      reload: reloadMock,
    });
    const onSelect = vi.fn();
    render(<MyTexturesList onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("texture-card-utex_a"));
    expect(onSelect).toHaveBeenCalledWith("utex_a", 2.5);
  });

  it("clicking UPLOAD tile opens UploadTextureModal in create mode", () => {
    render(<MyTexturesList onSelect={() => {}} />);
    fireEvent.click(screen.getByText("UPLOAD"));
    // UploadTextureModal renders "UPLOAD TEXTURE" heading when mounted open+create.
    expect(screen.getByText("UPLOAD TEXTURE")).toBeInTheDocument();
  });

  it("⋮ button has aria-label='Texture options' and opens menu with Edit and Delete", () => {
    useUserTexturesMock.mockReturnValue({
      textures: [makeTexture("utex_a", "Oak Floor")],
      loading: false,
      save: saveMock,
      update: updateMock,
      remove: removeMock,
      reload: reloadMock,
    });
    render(<MyTexturesList onSelect={() => {}} />);
    const menuBtn = screen.getByLabelText("Texture options");
    fireEvent.click(menuBtn);
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("⋮ → Edit opens UploadTextureModal in edit mode (shows EDIT TEXTURE heading)", () => {
    useUserTexturesMock.mockReturnValue({
      textures: [makeTexture("utex_a", "Oak Floor")],
      loading: false,
      save: saveMock,
      update: updateMock,
      remove: removeMock,
      reload: reloadMock,
    });
    render(<MyTexturesList onSelect={() => {}} />);
    fireEvent.click(screen.getByLabelText("Texture options"));
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByText("EDIT TEXTURE")).toBeInTheDocument();
  });

  it("⋮ → Delete opens DeleteTextureDialog (shows DELETE TEXTURE heading)", () => {
    useUserTexturesMock.mockReturnValue({
      textures: [makeTexture("utex_a", "Oak Floor")],
      loading: false,
      save: saveMock,
      update: updateMock,
      remove: removeMock,
      reload: reloadMock,
    });
    render(<MyTexturesList onSelect={() => {}} />);
    fireEvent.click(screen.getByLabelText("Texture options"));
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("DELETE TEXTURE")).toBeInTheDocument();
  });

  it("selectedId === texture.id renders selected ring class on that card", () => {
    useUserTexturesMock.mockReturnValue({
      textures: [makeTexture("utex_a", "Oak Floor"), makeTexture("utex_b", "Walnut")],
      loading: false,
      save: saveMock,
      update: updateMock,
      remove: removeMock,
      reload: reloadMock,
    });
    render(<MyTexturesList selectedId="utex_a" onSelect={() => {}} />);
    const card = screen.getByTestId("texture-card-utex_a");
    expect(card.className).toMatch(/ring-2/);
    expect(card.className).toMatch(/ring-accent/);
  });
});
