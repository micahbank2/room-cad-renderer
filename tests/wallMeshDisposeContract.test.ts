// Retained per .planning/phases/36-viz-10-regression/ROOT-CAUSE.md §4.3.
// Orthogonal coverage to the Playwright harness: this static source-level
// test catches the *disappearance of the `dispose={null}` pattern* BEFORE a
// pixel-diff regression would surface. ~50ms runtime.
// Runtime verification: tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts,
// wallart-2d-3d-toggle.spec.ts, floor-user-texture-toggle.spec.ts,
// ceiling-user-texture-toggle.spec.ts (Plan 36-01).

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
 * This test is static-source-level on purpose. Testing R3F's actual dispose
 * traversal at runtime requires a full Canvas + WebGLRenderer setup which
 * is heavy and fragile in vitest. Locking the source pattern catches every
 * known mechanism for the bug to return.
 */

function read(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), "utf8");
}

describe("R3F dispose={null} contract — cached texture render sites", () => {
  it("WallMesh.tsx uses <primitive attach=\"map\" ... dispose={null}> for wallpaper + wallArt", () => {
    const src = read("src/three/WallMesh.tsx");
    // Must attach cached textures via primitive pattern
    const attachCount = (src.match(/attach="map"/g) ?? []).length;
    expect(attachCount).toBeGreaterThanOrEqual(2);

    const disposeNullCount = (src.match(/dispose=\{null\}/g) ?? []).length;
    expect(disposeNullCount).toBeGreaterThanOrEqual(2);

    // Must NOT use map={wallpaperATex} / map={wallpaperBTex} / map={artTex} / generic map={tex}
    // (these are the exact shorthand forms that trigger R3F auto-dispose)
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
