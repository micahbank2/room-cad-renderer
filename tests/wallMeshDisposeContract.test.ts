// Retained per .planning/phases/36-viz-10-regression/ROOT-CAUSE.md §4.3.
// Orthogonal coverage to the Playwright harness: this static source-level
// test catches the *disappearance of the `dispose={null}` pattern* BEFORE a
// pixel-diff regression would surface. ~50ms runtime.
// Runtime verification: tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts,
// wallart-2d-3d-toggle.spec.ts, floor-user-texture-toggle.spec.ts,
// ceiling-user-texture-toggle.spec.ts (Plan 36-01).
//
// Phase 49 update: the user-texture branch (formerly a <primitive attach="map">
// site) was converted to a direct `map={userTex}` prop per BUG-02 fix.
// R3F does NOT auto-dispose externally-passed texture props — only objects it
// created internally. The userTextureCache module retains ownership, which is
// equivalent to the dispose={null} contract on the removed <primitive>.
// This test now asserts: (a) the wallpaper + wallArt <primitive> sites are
// unchanged, AND (b) the user-texture branch uses the direct map={} prop.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression contract for the Phase 32 wallpaper / wallArt / custom-floor
 * view-toggle fix.
 *
 * Every render site that attaches a CACHED / SHARED texture (from the
 * non-disposing module caches in wallpaperTextureCache / wallArtTextureCache /
 * floorTexture.ts) MUST use R3F's `<primitive attach="map" object={tex}
 * dispose={null} />` escape hatch instead of the `map={tex}` shorthand.
 *
 * Without this, R3F's default auto-dispose traverses unmounting primitives
 * and calls `.dispose()` on the cached Texture instances, invalidating them
 * for the next mount cycle — producing the wallpaper-disappears-on-toggle
 * bug that Plans 32-05 and 32-06 misdiagnosed before 32-07 identified it.
 *
 * Exception (Phase 49 / BUG-02): the user-texture branch uses `map={userTex}`
 * as a direct prop instead of `<primitive>`. This is safe because R3F does NOT
 * auto-dispose externally-passed texture objects — only internally created ones.
 * The module-level userTextureCache owns the texture lifetime. The test below
 * explicitly asserts this direct-prop pattern exists.
 *
 * This test is static-source-level on purpose. Testing R3F's actual dispose
 * traversal at runtime requires a full Canvas + WebGLRenderer setup which
 * is heavy and fragile in vitest. Locking the source pattern catches every
 * known mechanism for the bug to return.
 */

function read(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), "utf8");
}

describe("R3F dispose={null} contract — cached texture render sites", () => {
  it("WallMesh.tsx uses <primitive attach=\"map\" ... dispose={null}> for wallpaper + wallArt, and map={userTex} direct prop for user-texture branch", () => {
    const src = read("src/three/WallMesh.tsx");

    // Phase 49: user-texture branch uses direct map={userTex} prop (BUG-02 fix).
    // R3F does NOT auto-dispose externally-passed textures — userTextureCache owns lifetime.
    expect(src).toMatch(/map=\{userTex\}/);

    // The wallpaper (imageUrl) and wallArt branches still use <primitive attach="map" dispose={null}>.
    // There are 3 remaining sites: pattern/imageUrl wallpaper overlay (1),
    // wall art unframed (1), wall art framed inner mesh (1).
    const attachCount = (src.match(/attach="map"/g) ?? []).length;
    expect(attachCount).toBeGreaterThanOrEqual(3);

    const disposeNullCount = (src.match(/dispose=\{null\}/g) ?? []).length;
    expect(disposeNullCount).toBeGreaterThanOrEqual(3);

    // Must NOT use map={wallpaperATex} / map={wallpaperBTex} / map={artTex} / generic map={tex}
    // (these are the exact shorthand forms that trigger R3F auto-dispose for cached textures)
    const badShorthand = src.match(/map=\{(wallpaper[AB]Tex|artTex|tex)\}/g) ?? [];
    expect(badShorthand).toEqual([]);
  });

  it("FloorMesh.tsx uses <primitive attach=\"map\" ... dispose={null}> for cached texture", () => {
    const src = read("src/three/FloorMesh.tsx");
    const attachCount = (src.match(/attach="map"/g) ?? []).length;
    expect(attachCount).toBeGreaterThanOrEqual(1);

    const disposeNullCount = (src.match(/dispose=\{null\}/g) ?? []).length;
    expect(disposeNullCount).toBeGreaterThanOrEqual(1);

    // No bare map={texture} shorthand remains in cached path
    const badShorthand = src.match(/map=\{texture\s*\}/g) ?? [];
    expect(badShorthand).toEqual([]);
  });

  it("PBR paths are untouched — PbrSurface import still present", () => {
    const floorSrc = read("src/three/FloorMesh.tsx");
    const ceilingSrc = read("src/three/CeilingMesh.tsx");
    expect(floorSrc).toMatch(/PbrSurface/);
    expect(ceilingSrc).toMatch(/PbrSurface/);
  });

  it("Module texture caches remain non-disposing (no cache.delete, no .dispose call)", () => {
    for (const rel of [
      "src/three/wallpaperTextureCache.ts",
      "src/three/wallArtTextureCache.ts",
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/cache\.delete\(/);
      expect(src).not.toMatch(/\.dispose\(/);
    }
  });
});
