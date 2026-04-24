/**
 * Phase 34 Plan 00 — Task 1: UserTexture type + CADSnapshot schema extensions.
 *
 * Locks the type-level contract for user-uploaded textures. No runtime behavior
 * tested here beyond the USER_TEXTURE_ID_PREFIX constant — the assertions are
 * primarily TypeScript compile-time checks embedded in the test bodies.
 */
import { describe, it, expect } from "vitest";
import {
  USER_TEXTURE_ID_PREFIX,
  type UserTexture,
} from "@/types/userTexture";
import type { Wallpaper, FloorMaterial, Ceiling } from "@/types/cad";

describe("userTexture schema (Phase 34 Plan 00 — LIB-06/07/08)", () => {
  it("exports USER_TEXTURE_ID_PREFIX === 'utex_'", () => {
    expect(USER_TEXTURE_ID_PREFIX).toBe("utex_");
  });

  it("UserTexture interface has exactly the 7 required fields", () => {
    // Compile-time + runtime: constructing the object proves the shape.
    const tex: UserTexture = {
      id: "utex_abc",
      sha256: "deadbeef".repeat(8), // 64 hex chars
      name: "Oak Floor",
      tileSizeFt: 2,
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
      mimeType: "image/jpeg",
      createdAt: Date.now(),
    };
    expect(tex.id.startsWith(USER_TEXTURE_ID_PREFIX)).toBe(true);
    expect(tex.sha256.length).toBe(64);
    expect(tex.blob).toBeInstanceOf(Blob);
    expect(tex.mimeType).toBe("image/jpeg");
    expect(typeof tex.createdAt).toBe("number");
    expect(tex.tileSizeFt).toBeGreaterThan(0);
  });

  it("Wallpaper accepts optional userTextureId alongside legacy imageUrl", () => {
    // Legacy imageUrl path still compiles (backward compat)
    const legacy: Wallpaper = {
      kind: "pattern",
      imageUrl: "data:image/jpeg;base64,AAAA",
      scaleFt: 2,
    };
    // New userTextureId path compiles
    const modern: Wallpaper = {
      kind: "pattern",
      userTextureId: "utex_oak_v1",
      scaleFt: 2,
    };
    expect(legacy.imageUrl).toBeDefined();
    expect(modern.userTextureId).toBe("utex_oak_v1");
  });

  it("FloorMaterial.kind union includes 'user-texture' literal", () => {
    // Phase 34 — new union member
    const fm: FloorMaterial = {
      kind: "user-texture",
      userTextureId: "utex_concrete",
      scaleFt: 4,
      rotationDeg: 0,
    };
    expect(fm.kind).toBe("user-texture");
    expect(fm.userTextureId).toBe("utex_concrete");

    // Existing kinds still compile
    const preset: FloorMaterial = { kind: "preset", presetId: "oak", scaleFt: 2, rotationDeg: 0 };
    const custom: FloorMaterial = { kind: "custom", imageUrl: "data:...", scaleFt: 2, rotationDeg: 0 };
    expect(preset.kind).toBe("preset");
    expect(custom.kind).toBe("custom");
  });

  it("Ceiling accepts optional userTextureId", () => {
    const c: Ceiling = {
      id: "c1",
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
      height: 8,
      material: "#f5f5f5",
      userTextureId: "utex_ceiling_1",
    };
    expect(c.userTextureId).toBe("utex_ceiling_1");

    // Pre-Phase-34 ceiling (no userTextureId) still compiles — backward compat
    const legacy: Ceiling = {
      id: "c2",
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
      height: 8,
      material: "#f5f5f5",
      surfaceMaterialId: "mat-plaster",
    };
    expect(legacy.userTextureId).toBeUndefined();
  });
});
