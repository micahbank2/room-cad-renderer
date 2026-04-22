import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const TARGET_FILES = [
  "src/components/Toolbar.tsx",
  "src/components/Sidebar.tsx",
  "src/components/PropertiesPanel.tsx",
  "src/components/RoomSettings.tsx",
];

// Arbitrary Tailwind values: p-[Npx], m-[Npx], rounded-[Npx], gap-[Npx]
const ARBITRARY_RE =
  /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|rounded)-\[\d+px\]/g;

describe("Phase 33 spacing audit (GH #90) — zero arbitrary values in 4 target files", () => {
  TARGET_FILES.forEach((file) => {
    it(`${file} has zero arbitrary p-[Npx]/m-[Npx]/rounded-[Npx]/gap-[Npx]`, () => {
      const src = fs.readFileSync(path.resolve(file), "utf-8");
      const matches = src.match(ARBITRARY_RE) || [];
      expect(matches).toEqual([]);
    });
  });
});
