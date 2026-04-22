/**
 * Phase 34 Plan 00 — Task 2: userTextureStore IDB keyspace + SHA-256 dedup.
 *
 * Uses fake-indexeddb (loaded globally via tests/setup.ts) to exercise real
 * IDB semantics against a named store. Verifies isolation from the default
 * idb-keyval store used by serialization.ts (LIB-08 foundation).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { keys as defaultKeys, set as defaultSet, clear as defaultClear } from "idb-keyval";
import {
  userTextureIdbStore,
  computeSHA256,
  saveUserTexture,
  getUserTexture,
  deleteUserTexture,
  listUserTextures,
  findTextureBySha256,
  saveUserTextureWithDedup,
  clearAllUserTextures,
} from "@/lib/userTextureStore";
import { USER_TEXTURE_ID_PREFIX } from "@/types/userTexture";
import type { UserTexture } from "@/types/userTexture";

function makeBlob(content = "hello"): Blob {
  return new Blob([new TextEncoder().encode(content)], { type: "image/jpeg" });
}

async function bytesOf(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

beforeEach(async () => {
  await clearAllUserTextures();
  await defaultClear();
});

describe("userTextureStore — named IDB keyspace isolation", () => {
  it("save + load round-trip through the named store (not the default)", async () => {
    const blob = makeBlob("alpha");
    const sha256 = await computeSHA256(await bytesOf(blob));
    const tex: UserTexture = {
      id: `${USER_TEXTURE_ID_PREFIX}alpha`,
      sha256,
      name: "Alpha Texture",
      tileSizeFt: 2,
      blob,
      mimeType: "image/jpeg",
      createdAt: Date.now(),
    };
    await saveUserTexture(tex);

    const loaded = await getUserTexture(tex.id);
    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe(tex.id);
    expect(loaded!.name).toBe("Alpha Texture");
    expect(loaded!.sha256).toBe(sha256);
    // NOTE: fake-indexeddb round-trips Blobs via its own structured-clone impl
    // which strips the Blob prototype in some versions. Real browser IDB
    // preserves Blob instanceof. We assert the shape/type marker here instead.
    expect(loaded!.blob).toBeDefined();
    expect((loaded!.blob as Blob).type ?? (loaded!.blob as { type: string }).type).toBe("image/jpeg");
  });

  it("getUserTexture returns undefined for unknown ids", async () => {
    const result = await getUserTexture(`${USER_TEXTURE_ID_PREFIX}nonexistent`);
    expect(result).toBeUndefined();
  });

  it("deleteUserTexture removes the entry", async () => {
    const blob = makeBlob("beta");
    const sha256 = await computeSHA256(await bytesOf(blob));
    const tex: UserTexture = {
      id: `${USER_TEXTURE_ID_PREFIX}beta`,
      sha256,
      name: "Beta",
      tileSizeFt: 1,
      blob,
      mimeType: "image/jpeg",
      createdAt: Date.now(),
    };
    await saveUserTexture(tex);
    await deleteUserTexture(tex.id);
    const loaded = await getUserTexture(tex.id);
    expect(loaded).toBeUndefined();
  });

  it("writes to userTextureIdbStore do NOT leak into the default store (LIB-08 isolation)", async () => {
    // Seed the default store so we have a baseline to diff against
    await defaultSet("room-cad-project-EXISTING", { id: "EXISTING", payload: "x" });
    const defaultBefore = await defaultKeys();

    // Write several entries into the named user-texture store
    for (let i = 0; i < 3; i++) {
      const blob = makeBlob(`iso-${i}`);
      const sha256 = await computeSHA256(await bytesOf(blob));
      await saveUserTexture({
        id: `${USER_TEXTURE_ID_PREFIX}iso${i}`,
        sha256,
        name: `iso ${i}`,
        tileSizeFt: 2,
        blob,
        mimeType: "image/jpeg",
        createdAt: Date.now() + i,
      });
    }

    const defaultAfter = await defaultKeys();
    // Key counts unchanged — the default store saw zero new keys
    expect(defaultAfter.length).toBe(defaultBefore.length);
    // None of the new ids leaked into the default store
    for (const k of defaultAfter) {
      expect(String(k).startsWith(USER_TEXTURE_ID_PREFIX)).toBe(false);
    }
  });
});

describe("userTextureStore — listing sort order (D-06)", () => {
  it("listUserTextures returns entries sorted by createdAt DESC (most recent first)", async () => {
    const base = Date.now();
    const entries: Array<{ id: string; createdAt: number }> = [
      { id: "older", createdAt: base },
      { id: "newest", createdAt: base + 200 },
      { id: "middle", createdAt: base + 100 },
    ];
    for (const e of entries) {
      const blob = makeBlob(e.id);
      const sha256 = await computeSHA256(await bytesOf(blob));
      await saveUserTexture({
        id: `${USER_TEXTURE_ID_PREFIX}${e.id}`,
        sha256,
        name: e.id,
        tileSizeFt: 2,
        blob,
        mimeType: "image/jpeg",
        createdAt: e.createdAt,
      });
    }
    const list = await listUserTextures();
    expect(list.length).toBe(3);
    // Newest first → middle → oldest
    expect(list[0].name).toBe("newest");
    expect(list[1].name).toBe("middle");
    expect(list[2].name).toBe("older");
  });
});

describe("userTextureStore — SHA-256 dedup (LIB-07)", () => {
  it("computeSHA256 returns 64-char lowercase hex for known input", async () => {
    const hex = await computeSHA256(new TextEncoder().encode("hello"));
    // SHA-256 of "hello" (UTF-8) is well known
    expect(hex).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
    expect(hex.length).toBe(64);
    expect(hex).toBe(hex.toLowerCase());
  });

  it("findTextureBySha256 returns existing entry when hash matches, undefined otherwise", async () => {
    const blob = makeBlob("findme");
    const sha256 = await computeSHA256(await bytesOf(blob));
    await saveUserTexture({
      id: `${USER_TEXTURE_ID_PREFIX}findme`,
      sha256,
      name: "findme",
      tileSizeFt: 2,
      blob,
      mimeType: "image/jpeg",
      createdAt: Date.now(),
    });
    const hit = await findTextureBySha256(sha256);
    expect(hit?.name).toBe("findme");

    const miss = await findTextureBySha256("0".repeat(64));
    expect(miss).toBeUndefined();
  });

  it("saveUserTextureWithDedup: first upload writes a fresh row with utex_-prefixed id, deduped=false", async () => {
    const blob = makeBlob("fresh");
    const sha256 = await computeSHA256(await bytesOf(blob));
    const result = await saveUserTextureWithDedup(
      { name: "Fresh", tileSizeFt: 2, blob, mimeType: "image/jpeg" },
      sha256,
    );
    expect(result.deduped).toBe(false);
    expect(result.id.startsWith(USER_TEXTURE_ID_PREFIX)).toBe(true);
    const loaded = await getUserTexture(result.id);
    expect(loaded?.name).toBe("Fresh");
  });

  it("saveUserTextureWithDedup: second upload with same sha256 returns existing id, deduped=true, no new row", async () => {
    const blob = makeBlob("dup");
    const sha256 = await computeSHA256(await bytesOf(blob));
    const first = await saveUserTextureWithDedup(
      { name: "First", tileSizeFt: 2, blob, mimeType: "image/jpeg" },
      sha256,
    );
    const second = await saveUserTextureWithDedup(
      { name: "Second different name", tileSizeFt: 4, blob, mimeType: "image/jpeg" },
      sha256,
    );
    expect(second.deduped).toBe(true);
    expect(second.id).toBe(first.id);

    // Only one row in the store
    const list = await listUserTextures();
    expect(list.length).toBe(1);
    // Original name preserved — dedup does NOT overwrite existing catalog metadata
    expect(list[0].name).toBe("First");
    expect(list[0].tileSizeFt).toBe(2);
  });
});
