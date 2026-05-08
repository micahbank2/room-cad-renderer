/**
 * Phase 78 PBR-MAPS-01 Plan 03 Task 1 — TDD tests for aoMap/displacementMap
 * binding on WallMesh, FloorMesh, CeilingMesh, CustomElementMesh.
 *
 * These tests verify the acceptance criteria via grepping the source text
 * (fast, no R3F environment needed) and via import checks.
 *
 * RED phase: these fail until the mesh files are updated.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "../../..");

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(root, "src/three", rel), "utf8");
}

describe("PBR-03 aoMap/displacementMap binding — source-text acceptance criteria", () => {
  const files = [
    "WallMesh.tsx",
    "FloorMesh.tsx",
    "CeilingMesh.tsx",
    "CustomElementMesh.tsx",
  ];

  for (const file of files) {
    describe(file, () => {
      it("binds aoMap={resolved.aoMap ?? undefined} on the priority-1 meshStandardMaterial", () => {
        const src = readSrc(file);
        expect(src).toMatch(/aoMap=\{resolved[^}]*?\.aoMap\s*\?\?\s*undefined\}/);
      });

      it("binds displacementMap={resolved.displacementMap ?? undefined}", () => {
        const src = readSrc(file);
        expect(src).toMatch(/displacementMap=\{resolved[^}]*?\.displacementMap\s*\?\?\s*undefined\}/);
      });

      it("sets displacementScale={0.05} (RESEARCH Pitfall 2 — prevents geometry explosion)", () => {
        const src = readSrc(file);
        expect(src).toMatch(/displacementScale=\{0\.05\}/);
      });

      it("sets up uv2 setAttribute on the priority-1 geometry (RESEARCH Pitfall 1)", () => {
        const src = readSrc(file);
        expect(src).toMatch(/setAttribute\(['""]uv2['""][^)]*\)/);
      });
    });
  }

  describe("ProductMesh.tsx", () => {
    it("has a Phase 78 PBR-03 scope-clarification comment (out-of-scope note)", () => {
      const src = readSrc("ProductMesh.tsx");
      expect(src).toMatch(/Phase 78/);
    });
  });

  describe("ProductBox.tsx", () => {
    it("has a Phase 78 PBR-03 scope-clarification comment (out-of-scope note)", () => {
      const src = readSrc("ProductBox.tsx");
      expect(src).toMatch(/Phase 78/);
    });
  });
});
