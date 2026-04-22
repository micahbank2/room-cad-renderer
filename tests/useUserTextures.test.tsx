/**
 * Phase 34 Plan 00 — Task 3: useUserTextures hook lifecycle.
 *
 * Exercises the hook via React Testing Library renderHook against the real
 * (fake-indexeddb-backed) userTextureStore. Covers mount, save, remove, update.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useUserTextures } from "@/hooks/useUserTextures";
import { clearAllUserTextures, computeSHA256 } from "@/lib/userTextureStore";
import { USER_TEXTURE_ID_PREFIX } from "@/types/userTexture";

function makeBlob(content: string): Blob {
  return new Blob([new TextEncoder().encode(content)], { type: "image/jpeg" });
}

async function hashOf(blob: Blob): Promise<string> {
  return computeSHA256(await blob.arrayBuffer());
}

beforeEach(async () => {
  await clearAllUserTextures();
});

describe("useUserTextures — initial mount", () => {
  it("starts with loading=true, resolves to loading=false with empty list", async () => {
    const { result } = renderHook(() => useUserTextures());
    // Immediately after mount, loading should be true
    expect(result.current.loading).toBe(true);
    expect(result.current.textures).toEqual([]);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.textures).toEqual([]);
  });
});

describe("useUserTextures — save / remove / update", () => {
  it("save → textures list grows to 1; returned id is utex_-prefixed", async () => {
    const { result } = renderHook(() => useUserTextures());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const blob = makeBlob("alpha");
    const sha256 = await hashOf(blob);
    let newId: string = "";
    await act(async () => {
      newId = await result.current.save(
        { name: "Alpha", tileSizeFt: 2, blob, mimeType: "image/jpeg" },
        sha256,
      );
    });
    expect(newId.startsWith(USER_TEXTURE_ID_PREFIX)).toBe(true);
    await waitFor(() => expect(result.current.textures.length).toBe(1));
    expect(result.current.textures[0].name).toBe("Alpha");
  });

  it("remove → textures list shrinks back to empty", async () => {
    const { result } = renderHook(() => useUserTextures());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const blob = makeBlob("toremove");
    const sha256 = await hashOf(blob);
    let newId: string = "";
    await act(async () => {
      newId = await result.current.save(
        { name: "Doomed", tileSizeFt: 2, blob, mimeType: "image/jpeg" },
        sha256,
      );
    });
    await waitFor(() => expect(result.current.textures.length).toBe(1));

    await act(async () => {
      await result.current.remove(newId);
    });
    await waitFor(() => expect(result.current.textures.length).toBe(0));
  });

  it("update → catalog metadata (name) reflected on next list", async () => {
    const { result } = renderHook(() => useUserTextures());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const blob = makeBlob("editme");
    const sha256 = await hashOf(blob);
    let newId: string = "";
    await act(async () => {
      newId = await result.current.save(
        { name: "Old Name", tileSizeFt: 2, blob, mimeType: "image/jpeg" },
        sha256,
      );
    });
    await waitFor(() => expect(result.current.textures[0].name).toBe("Old Name"));

    await act(async () => {
      await result.current.update(newId, { name: "New Name", tileSizeFt: 4 });
    });
    await waitFor(() => expect(result.current.textures[0].name).toBe("New Name"));
    expect(result.current.textures[0].tileSizeFt).toBe(4);
  });

  it("update on unknown id is a no-op (doesn't throw, doesn't add a row)", async () => {
    const { result } = renderHook(() => useUserTextures());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.update("utex_does_not_exist", { name: "x" });
    });
    expect(result.current.textures.length).toBe(0);
  });
});

describe("useUserTextures — window.__getUserTextures test driver", () => {
  it("test driver is registered in test mode (vite MODE === 'test')", async () => {
    // Register driver — the hook file's top-level block runs on import.
    // We just need to verify the driver is present and functional.
    await import("@/hooks/useUserTextures");
    const driver = (window as unknown as { __getUserTextures?: () => Promise<unknown[]> })
      .__getUserTextures;
    expect(typeof driver).toBe("function");
    const list = await driver!();
    expect(Array.isArray(list)).toBe(true);
  });
});
