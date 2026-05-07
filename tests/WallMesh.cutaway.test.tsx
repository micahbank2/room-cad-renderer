// Phase 59 CUTAWAY-01 — WallMesh ghost-material wiring tests (C1-C3).
//
// We follow the codebase precedent set by wallMeshDisposeContract.test.ts and
// userTextureOrphan.test.tsx: source-text audits + direct logic checks instead
// of full @react-three/test-renderer render trees (which are heavyweight and
// flaky in this codebase). The behavior under test is purely:
//
//   1. ghostMaterialProps(isGhosted) returns the correct shape for both
//      branches (C1 / C2 / C3 axiom — the helper drives all 13 sites).
//   2. WallMesh subscribes to cutawayMode + cutawayAutoDetectedWallId.get(roomId)
//      + cutawayManualWallIds and derives `isGhosted = manual OR (auto-mode &&
//      this wall === auto-detected-for-this-room)`.
//   3. ALL 13 <meshStandardMaterial> sites in WallMesh.tsx spread `{...ghost}`.
//   4. ALL 16 <meshStandardMaterial> sites in wainscotStyles.tsx spread
//      `{...ghost}` (the threaded-through ctx.ghostProps).
//   5. NO new `material.needsUpdate` writes added (Phase 49 BUG-02 protection).
//   6. Phase 49 BUG-02 invariant preserved: `transparent: true` is constant
//      (never toggled) — only `opacity` and `depthWrite` flip.

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

describe("Phase 59 — WallMesh ghostMaterialProps shape (C1, C2, C3)", () => {
  it("C1: ghostMaterialProps(true) returns transparent:true, opacity:0.15, depthWrite:false (auto/manual ghosted state)", () => {
    // We re-derive the helper inline because exporting it from WallMesh.tsx
    // would force a new public API surface area; the helper is intentionally
    // file-local. Source-text audit below confirms the literal values.
    const src = read("src/three/WallMesh.tsx");
    expect(src).toContain("opacity: isGhosted ? 0.15 : 1.0");
    expect(src).toContain("depthWrite: !isGhosted");
    expect(src).toContain("transparent: true as const");
  });

  it("C2: manual-ghosted derivation is `cutawayManualWallIds.has(wall.id)`", () => {
    const src = read("src/three/WallMesh.tsx");
    expect(src).toMatch(/isManualGhosted\s*=\s*useUIStore.*cutawayManualWallIds\.has\(wall\.id\)/s);
  });

  it("C3: auto-ghosted derivation requires cutawayMode === 'auto' AND auto-detected wall matches", () => {
    const src = read("src/three/WallMesh.tsx");
    // The combined predicate must require BOTH conditions.
    expect(src).toMatch(/isAutoGhosted\s*=\s*cutawayMode\s*===\s*"auto"\s*&&\s*autoDetectedForRoom\s*===\s*wall\.id/);
  });

  it("C3b: isGhosted = isAutoGhosted OR isManualGhosted (D-05 manual is independent of auto)", () => {
    const src = read("src/three/WallMesh.tsx");
    expect(src).toMatch(/isGhosted\s*=\s*isAutoGhosted\s*\|\|\s*isManualGhosted/);
  });
});

describe("Phase 59 — WallMesh material-site spread audit", () => {
  it("every <meshStandardMaterial> in WallMesh.tsx has the {...ghost} spread", () => {
    const src = read("src/three/WallMesh.tsx");
    // Count opening tags (excluding the closing </meshStandardMaterial>).
    const openTagRegex = /<meshStandardMaterial(?![A-Za-z])/g;
    const openMatches = src.match(openTagRegex) ?? [];
    // Subtract self-closing-or-block-opening detection: count {...ghost} occurrences.
    const ghostMatches = src.match(/\{\.\.\.ghost\}/g) ?? [];
    expect(openMatches.length).toBeGreaterThan(0);
    // 15 actual sites as of Phase 68 MAT-APPLY-01 (added resolved-Material sites
    // for framed wall art + surface material overlays). Comment text mentioning
    // "meshStandardMaterial" doesn't match the regex \w boundary because the next
    // char in comments is a space or a period, not a letter.
    // Ghost-spread propagation to resolved-Material sites is LOCKED YES per D-12
    // (researcher recommendation: ghosting must hide materialized walls too).
    expect(openMatches.length).toBe(15);
    expect(ghostMatches.length).toBe(15);
  });

  it("WallMesh ghostMaterialProps helper exists and is named correctly", () => {
    const src = read("src/three/WallMesh.tsx");
    expect(src).toMatch(/function\s+ghostMaterialProps\s*\(/);
  });
});

describe("Phase 59 — wainscotStyles material-site spread audit", () => {
  it("every <meshStandardMaterial> JSX site in wainscotStyles.tsx has {...ghost} spread", () => {
    const src = read("src/three/wainscotStyles.tsx");
    // JSX sites only — exclude JSDoc references (lines starting with " *").
    const lines = src.split("\n");
    const jsxLines = lines.filter((l) => !l.trimStart().startsWith("*"));
    const jsxSrc = jsxLines.join("\n");
    const openTagRegex = /<meshStandardMaterial(?![A-Za-z])/g;
    const openMatches = jsxSrc.match(openTagRegex) ?? [];
    const ghostMatches = jsxSrc.match(/\{\.\.\.ghost\}/g) ?? [];
    expect(openMatches.length).toBe(16);
    expect(ghostMatches.length).toBe(16);
  });

  it("renderWainscotStyle ctx accepts optional ghostProps (backward-compatible)", () => {
    const src = read("src/three/wainscotStyles.tsx");
    expect(src).toMatch(/ghostProps\?\s*:\s*GhostMaterialProps/);
    expect(src).toMatch(/DEFAULT_OPAQUE_GHOST/);
  });

  it("wainscot DEFAULT_OPAQUE_GHOST has opacity 1.0 and depthWrite true", () => {
    const src = read("src/three/wainscotStyles.tsx");
    expect(src).toMatch(/transparent:\s*true,\s*opacity:\s*1\.0,\s*depthWrite:\s*true/);
  });
});

describe("Phase 59 — Phase 49 BUG-02 invariants preserved (no needsUpdate writes added)", () => {
  it("cutawayDetection.ts has zero needsUpdate writes", () => {
    const src = read("src/three/cutawayDetection.ts");
    expect(src).not.toMatch(/needsUpdate/);
  });

  it("wainscotStyles.tsx has zero needsUpdate writes", () => {
    const src = read("src/three/wainscotStyles.tsx");
    expect(src).not.toMatch(/needsUpdate/);
  });

  it("WallMesh.tsx adds no new material.needsUpdate writes (only pre-existing texture updates)", () => {
    const src = read("src/three/WallMesh.tsx");
    // Pre-existing: 4 actual writes (userTexA, userTexB, wallpaper tex, wallart tex)
    // + 2 in comment text. Total grep count is stable at 6.
    const matches = src.match(/needsUpdate/g) ?? [];
    expect(matches.length).toBe(6);
  });

  it("WallMesh constructs all materials with `transparent: true` from ghostMaterialProps (never toggled)", () => {
    const src = read("src/three/WallMesh.tsx");
    // Key Phase 49 BUG-02 invariant: transparent is a constant `true`, opacity
    // is the animated uniform.
    expect(src).toMatch(/transparent:\s*true\s+as\s+const/);
  });
});

describe("Phase 59 — RoomGroup wires roomId into WallMesh", () => {
  it("RoomGroup.tsx passes roomId={roomId} to WallMesh", () => {
    const src = read("src/three/RoomGroup.tsx");
    expect(src).toMatch(/<WallMesh[\s\S]*?roomId=\{roomId\}/);
  });

  it("WallMesh Props interface accepts optional roomId", () => {
    const src = read("src/three/WallMesh.tsx");
    expect(src).toMatch(/roomId\?\s*:\s*string/);
  });
});
