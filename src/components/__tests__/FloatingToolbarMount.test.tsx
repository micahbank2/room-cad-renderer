// Phase 88 Plan 01 — RED test for FloatingToolbar mount relocation (D-03).
// String-grep fallback (preferred over full App-render) — verifies the
// mount-site lives OUTSIDE the (viewMode === "2d" || viewMode === "split")
// branch in App.tsx so the toolbar paints in 2D, 3D, and Split view modes.
//
// MUST FAIL on this commit: the FloatingToolbar mount is currently nested
// inside the 2D-or-split branch (line ~268 of App.tsx).

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("FloatingToolbar mount site (Phase 88 D-03)", () => {
  const appSrc = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");

  it("App.tsx contains exactly one <FloatingToolbar mount", () => {
    const matches = appSrc.match(/<FloatingToolbar\s/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("FloatingToolbar mount lives OUTSIDE the (viewMode === '2d' || viewMode === 'split') branch", () => {
    // Find the closing brace of the 2D-only branch and the position of
    // the FloatingToolbar mount. The mount should appear AFTER the
    // ` (viewMode === "3d" || viewMode === "split") ` branch closes — i.e.,
    // as a sibling of both view-mode branches rather than nested inside the 2D one.
    const mountIdx = appSrc.indexOf("<FloatingToolbar");
    expect(mountIdx).toBeGreaterThan(-1);

    // The 2D-or-split conditional opens at this string. After Task 2,
    // FloatingToolbar mount should appear AFTER the line containing
    // `(viewMode === "3d" || viewMode === "split")` — i.e., as a peer of
    // both branches, not nested.
    const threeDBranchIdx = appSrc.indexOf('(viewMode === "3d" || viewMode === "split")');
    expect(threeDBranchIdx).toBeGreaterThan(-1);
    // The hoisted mount must come AFTER the 3D branch opens (sibling-of-branches
    // structure). If it comes before, it's still nested inside the 2D branch.
    expect(mountIdx).toBeGreaterThan(threeDBranchIdx);
  });
});
