/**
 * Phase 34 Plan 03 Task 1 — userTextureCache tests.
 *
 * Verifies the non-disposing Map<id, Promise<THREE.Texture | null>> contract
 * and the `user-texture-deleted` event subscription. This is the VIZ-10
 * regression guard — if the cache ever starts refcount-disposing, test #8
 * (non-disposing) fails.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import { act, render } from "@testing-library/react";
import React from "react";
import type { UserTexture } from "@/types/userTexture";

// Mock getUserTexture from userTextureStore so cache tests don't touch IDB.
vi.mock("@/lib/userTextureStore", () => ({
  getUserTexture: vi.fn(),
}));
import { getUserTexture } from "@/lib/userTextureStore";
const mockGetUserTexture = getUserTexture as unknown as ReturnType<typeof vi.fn>;

// Import cache module AFTER the mock is declared so the module's
// `getUserTexture` binding resolves to the mock.
import {
  getUserTextureCached,
  clearUserTextureCache,
  _clearAllForTests,
} from "@/three/userTextureCache";
import { useUserTexture } from "@/hooks/useUserTexture";

const makeFakeUserTexture = (id: string): UserTexture => ({
  id,
  sha256: "f".repeat(64),
  name: "Fake",
  tileSizeFt: 2,
  blob: new Blob([new Uint8Array([0, 1, 2, 3])], { type: "image/jpeg" }),
  mimeType: "image/jpeg",
  createdAt: Date.now(),
});

describe("userTextureCache — non-disposing + event-driven invalidation", () => {
  beforeEach(() => {
    _clearAllForTests();
    mockGetUserTexture.mockReset();
    // Spy URL.createObjectURL / revokeObjectURL so we can assert on them.
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:mock-${Math.random()}`);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    // Default loader success — each test overrides if needed.
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockImplementation(() =>
      Promise.resolve(new THREE.Texture()),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("first call resolves to a THREE.Texture with SRGBColorSpace + RepeatWrapping on both axes", async () => {
    mockGetUserTexture.mockResolvedValue(makeFakeUserTexture("utex_a"));
    const tex = await getUserTextureCached("utex_a");
    expect(tex).not.toBeNull();
    expect(tex!.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(tex!.wrapS).toBe(THREE.RepeatWrapping);
    expect(tex!.wrapT).toBe(THREE.RepeatWrapping);
  });

  it("second call with same id returns SAME Promise (cache dedup)", async () => {
    mockGetUserTexture.mockResolvedValue(makeFakeUserTexture("utex_b"));
    const p1 = getUserTextureCached("utex_b");
    const p2 = getUserTextureCached("utex_b");
    expect(p1).toBe(p2); // reference equality on the Promise itself
    const [t1, t2] = await Promise.all([p1, p2]);
    expect(t1).toBe(t2);
    expect(mockGetUserTexture).toHaveBeenCalledTimes(1);
  });

  it("orphan (getUserTexture returns undefined) resolves to null — no throw", async () => {
    mockGetUserTexture.mockResolvedValue(undefined);
    const tex = await getUserTextureCached("utex_missing");
    expect(tex).toBeNull();
  });

  it("loader throw resolves to null (no throw)", async () => {
    mockGetUserTexture.mockResolvedValue(makeFakeUserTexture("utex_bad"));
    vi.mocked(THREE.TextureLoader.prototype.loadAsync).mockRejectedValue(
      new Error("decode failed"),
    );
    const tex = await getUserTextureCached("utex_bad");
    expect(tex).toBeNull();
  });

  it("clearUserTextureCache removes entry; subsequent call returns NEW Promise", async () => {
    mockGetUserTexture.mockResolvedValue(makeFakeUserTexture("utex_c"));
    const p1 = getUserTextureCached("utex_c");
    await p1;
    clearUserTextureCache("utex_c");
    const p2 = getUserTextureCached("utex_c");
    expect(p2).not.toBe(p1);
  });

  it("ObjectURL lifecycle: createObjectURL on load, revokeObjectURL on clear", async () => {
    mockGetUserTexture.mockResolvedValue(makeFakeUserTexture("utex_d"));
    await getUserTextureCached("utex_d");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    clearUserTextureCache("utex_d");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("window 'user-texture-deleted' event invalidates the cache for that id", async () => {
    mockGetUserTexture.mockResolvedValue(makeFakeUserTexture("utex_e"));
    const p1 = getUserTextureCached("utex_e");
    await p1;
    // Dispatch the event with detail.id matching our cached entry.
    window.dispatchEvent(
      new CustomEvent("user-texture-deleted", { detail: { id: "utex_e" } }),
    );
    // After the event, a new call must produce a fresh Promise (re-fetch).
    const p2 = getUserTextureCached("utex_e");
    expect(p2).not.toBe(p1);
  });

  it("VIZ-10 guard: useUserTexture unmount does NOT dispose the texture", async () => {
    const fakeTex = new THREE.Texture();
    const disposeSpy = vi.spyOn(fakeTex, "dispose");
    vi.mocked(THREE.TextureLoader.prototype.loadAsync).mockResolvedValue(fakeTex);
    mockGetUserTexture.mockResolvedValue(makeFakeUserTexture("utex_f"));

    function HookProbe() {
      const tex = useUserTexture("utex_f");
      return <span data-testid="probe">{tex ? "loaded" : "null"}</span>;
    }
    const { unmount } = render(<HookProbe />);
    // Wait one microtask-tick for the effect's promise to resolve.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    unmount();
    expect(disposeSpy).not.toHaveBeenCalled();

    // Re-mounting should still get the same cached texture.
    const tex2 = await getUserTextureCached("utex_f");
    expect(tex2).toBe(fakeTex);
  });

  it("useUserTexture handles id change correctly (new id → new resolution)", async () => {
    const texA = new THREE.Texture();
    const texB = new THREE.Texture();
    vi.mocked(THREE.TextureLoader.prototype.loadAsync)
      .mockResolvedValueOnce(texA)
      .mockResolvedValueOnce(texB);
    mockGetUserTexture
      .mockResolvedValueOnce(makeFakeUserTexture("utex_x"))
      .mockResolvedValueOnce(makeFakeUserTexture("utex_y"));

    function HookProbe({ id }: { id: string }) {
      const tex = useUserTexture(id);
      return <span data-testid="probe">{tex ? tex.uuid : "null"}</span>;
    }

    const { rerender, getByTestId } = render(<HookProbe id="utex_x" />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    const firstUuid = getByTestId("probe").textContent;
    expect(firstUuid).toBe(texA.uuid);

    rerender(<HookProbe id="utex_y" />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    const secondUuid = getByTestId("probe").textContent;
    expect(secondUuid).toBe(texB.uuid);
  });

  it("undefined id → hook returns null and never touches cache", async () => {
    function HookProbe() {
      const tex = useUserTexture(undefined);
      return <span data-testid="probe">{tex ? "loaded" : "null"}</span>;
    }
    const { getByTestId } = render(<HookProbe />);
    expect(getByTestId("probe").textContent).toBe("null");
    expect(mockGetUserTexture).not.toHaveBeenCalled();
  });
});
