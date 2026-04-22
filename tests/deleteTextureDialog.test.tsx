/**
 * Phase 34 Plan 02 Task 2 — DeleteTextureDialog.
 *
 * Locked UI-SPEC §3 contract:
 *   - Header: "DELETE TEXTURE"
 *   - Body (N === 0):  "Delete {NAME}? This texture isn't used by any surface."
 *   - Body (N >= 1):   "Delete {NAME}? {N} surface{s} in this project use it.
 *                       They'll fall back to their base color."
 *   - Destructive CTA: "Delete Texture"
 *   - Dismiss CTA:     "Discard"
 *
 * On Delete confirm: calls useUserTextures().remove(id), dispatches
 * `user-texture-deleted` CustomEvent on window (Plan 03 cache subscribes),
 * fires onDeleted(id), then onClose().
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import type { UserTexture } from "@/types/userTexture";

// Mock useUserTextures — we spy on remove().
const removeMock = vi.fn<(id: string) => Promise<void>>();
vi.mock("@/hooks/useUserTextures", () => ({
  useUserTextures: () => ({
    textures: [],
    loading: false,
    save: vi.fn(),
    update: vi.fn(),
    remove: removeMock,
    reload: vi.fn(),
  }),
}));

// Mock countTextureRefs — we control the returned count per test.
const countRefsMock = vi.fn<() => number>();
vi.mock("@/lib/countTextureRefs", () => ({
  countTextureRefs: (...args: unknown[]) => countRefsMock(),
}));

// Mock useCADStore — minimal snapshot-shaped state so DeleteTextureDialog
// can read from it via useCADStore(selector).
vi.mock("@/stores/cadStore", () => {
  const state = {
    rooms: {},
    activeRoomId: null,
    customElements: {},
    customPaints: [],
    recentPaints: [],
    version: 2,
  };
  const useCADStore: any = (selector: any) => selector(state);
  useCADStore.getState = () => state;
  return { useCADStore };
});

import { DeleteTextureDialog } from "@/components/DeleteTextureDialog";

function makeTexture(name = "Oak Floor"): UserTexture {
  return {
    id: "utex_test",
    sha256: "deadbeef",
    name,
    tileSizeFt: 2,
    blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
    mimeType: "image/jpeg",
    createdAt: Date.now(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  removeMock.mockReset();
  countRefsMock.mockReset();
});

describe("DeleteTextureDialog — copy contracts", () => {
  it("count=0 body: 'This texture isn't used by any surface.' and name UPPERCASE", () => {
    countRefsMock.mockReturnValue(0);
    render(
      <DeleteTextureDialog
        open={true}
        texture={makeTexture("Oak Floor")}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("OAK FLOOR")).toBeInTheDocument();
    expect(
      screen.getByText(/This texture isn't used by any surface\./),
    ).toBeInTheDocument();
  });

  it("count=1 body: '1 surface ... use it. They'll fall back to their base color.'", () => {
    countRefsMock.mockReturnValue(1);
    render(
      <DeleteTextureDialog
        open={true}
        texture={makeTexture("Oak Floor")}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByText(
        /1 surface in this project use it\. They'll fall back to their base color\./,
      ),
    ).toBeInTheDocument();
  });

  it("count=3 body: plural 'surfaces'", () => {
    countRefsMock.mockReturnValue(3);
    render(
      <DeleteTextureDialog
        open={true}
        texture={makeTexture("Oak Floor")}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByText(
        /3 surfaces in this project use it\. They'll fall back to their base color\./,
      ),
    ).toBeInTheDocument();
  });

  it("renders 'DELETE TEXTURE' header and 'Delete Texture' + 'Discard' CTAs", () => {
    countRefsMock.mockReturnValue(0);
    render(
      <DeleteTextureDialog open={true} texture={makeTexture()} onClose={() => {}} />,
    );
    expect(screen.getByText("DELETE TEXTURE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete Texture/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });
});

describe("DeleteTextureDialog — interactions", () => {
  it("Discard click closes without removing", () => {
    countRefsMock.mockReturnValue(2);
    const onClose = vi.fn();
    render(
      <DeleteTextureDialog
        open={true}
        texture={makeTexture()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("Delete Texture: remove() + dispatchEvent('user-texture-deleted') + onDeleted + onClose", async () => {
    countRefsMock.mockReturnValue(2);
    removeMock.mockResolvedValue();
    const onClose = vi.fn();
    const onDeleted = vi.fn();

    const eventSpy = vi.fn();
    const listener = (e: Event) => eventSpy((e as CustomEvent).type, (e as CustomEvent).detail);
    window.addEventListener("user-texture-deleted", listener);

    render(
      <DeleteTextureDialog
        open={true}
        texture={makeTexture()}
        onClose={onClose}
        onDeleted={onDeleted}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Delete Texture/ }));

    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledWith("utex_test");
    });
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith("utex_test");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(eventSpy).toHaveBeenCalledWith(
      "user-texture-deleted",
      { id: "utex_test" },
    );
    window.removeEventListener("user-texture-deleted", listener);
  });
});
