/**
 * Phase 34 Plan 03 Task 2 — Orphan-fallback + static-source contract.
 *
 * Verifies:
 *   1. Each of WallMesh / FloorMesh / CeilingMesh imports useUserTexture.
 *   2. Each render site uses the <primitive attach="map" ... dispose={null}>
 *      escape hatch (matches Phase 32 VIZ-07 contract, extended to user
 *      textures).
 *   3. User-texture branch is guarded by `userTextureId` truthiness AND the
 *      hook's non-null return — so orphan ids (hook returns null) fall
 *      through to the existing base-color / legacy branches.
 *   4. Mesh files do NOT reuse pbrTextureCache's refcount API
 *      (acquireTexture/releaseTexture) for the user-texture path.
 *
 * The full "render-the-mesh-and-assert-tree" flavor of the plan's test spec
 * requires @react-three/test-renderer which is not installed. The codebase's
 * established idiom for these mesh contracts is static-source regex
 * (see tests/wallMeshDisposeContract.test.ts) — we extend that pattern.
 * Unit-level hook-return-null behavior is separately covered by the
 * useUserTexture tests in tests/userTextureCache.test.tsx.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), "utf8");
}

describe("Phase 34 — user-texture mesh integration contract", () => {
  describe("WallMesh.tsx", () => {
    const src = read("src/three/WallMesh.tsx");

    it("imports useUserTexture hook", () => {
      expect(src).toMatch(/from\s+["']@\/hooks\/useUserTexture["']/);
      expect(src).toMatch(/useUserTexture/);
    });

    it("branches on wall.wallpaper?.A?.userTextureId and wall.wallpaper?.B?.userTextureId", () => {
      expect(src).toMatch(/wallpaper\?\.A\?\.userTextureId/);
      expect(src).toMatch(/wallpaper\?\.B\?\.userTextureId/);
    });

    it("uses <primitive attach=\"map\" ... dispose={null}> for user-texture", () => {
      // At least 2 attach="map" (wallpaper A + B) AND 2 dispose={null} total
      const attachCount = (src.match(/attach="map"/g) ?? []).length;
      expect(attachCount).toBeGreaterThanOrEqual(2);
      const disposeNullCount = (src.match(/dispose=\{null\}/g) ?? []).length;
      expect(disposeNullCount).toBeGreaterThanOrEqual(2);
    });

    it("does NOT call pbrTextureCache acquire/release for user textures", () => {
      expect(src).not.toMatch(/acquireTexture|releaseTexture/);
    });
  });

  describe("FloorMesh.tsx", () => {
    const src = read("src/three/FloorMesh.tsx");

    it("imports useUserTexture hook", () => {
      expect(src).toMatch(/from\s+["']@\/hooks\/useUserTexture["']/);
      expect(src).toMatch(/useUserTexture/);
    });

    it("branches on material.kind === \"user-texture\"", () => {
      expect(src).toMatch(/kind\s*===\s*["']user-texture["']/);
    });

    it("uses <primitive attach=\"map\" ... dispose={null}> for the user-texture branch", () => {
      const attachCount = (src.match(/attach="map"/g) ?? []).length;
      expect(attachCount).toBeGreaterThanOrEqual(1);
      const disposeNullCount = (src.match(/dispose=\{null\}/g) ?? []).length;
      // Floor now has two cached-texture branches: the legacy custom path + new user-texture path.
      expect(disposeNullCount).toBeGreaterThanOrEqual(1);
    });

    it("does NOT call pbrTextureCache acquire/release for user textures", () => {
      expect(src).not.toMatch(/acquireTexture|releaseTexture/);
    });
  });

  describe("CeilingMesh.tsx", () => {
    const src = read("src/three/CeilingMesh.tsx");

    it("imports useUserTexture hook", () => {
      expect(src).toMatch(/from\s+["']@\/hooks\/useUserTexture["']/);
      expect(src).toMatch(/useUserTexture/);
    });

    it("branches on ceiling.userTextureId (highest priority)", () => {
      expect(src).toMatch(/ceiling\.userTextureId/);
    });

    it("uses <primitive attach=\"map\" ... dispose={null}> for the user-texture branch", () => {
      expect(src).toMatch(/attach="map"/);
      expect(src).toMatch(/dispose=\{null\}/);
    });

    it("does NOT call pbrTextureCache acquire/release for user textures", () => {
      expect(src).not.toMatch(/acquireTexture|releaseTexture/);
    });
  });

  describe("orphan-fallback guard — branch is gated on hook non-null return", () => {
    it("WallMesh guards user-texture overlay on a non-null hook result", () => {
      const src = read("src/three/WallMesh.tsx");
      // The hook returns THREE.Texture | null; a correct guard looks like
      // `userTexA &&` or `if (userTexA)`. Assert at least one such guard exists.
      expect(src).toMatch(/userTex[AB]\s*(&&|!==\s*null)/);
    });

    it("FloorMesh guards user-texture on non-null hook result", () => {
      const src = read("src/three/FloorMesh.tsx");
      expect(src).toMatch(/userTex\w*\s*(&&|!==\s*null)/);
    });

    it("CeilingMesh guards user-texture on non-null hook result", () => {
      const src = read("src/three/CeilingMesh.tsx");
      expect(src).toMatch(/userTex\w*\s*(&&|!==\s*null)/);
    });
  });
});
