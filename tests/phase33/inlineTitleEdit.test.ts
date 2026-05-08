import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("InlineEditableText (GH #88) — reuses Phase 31 LabelOverrideInput pattern", () => {
  it("component exists at src/components/ui/InlineEditableText.tsx", () => {
    expect(fs.existsSync(path.resolve("src/components/ui/InlineEditableText.tsx"))).toBe(true);
  });
  it("uses skipNextBlurRef (Phase 31 pitfall 4 invariant)", () => {
    const src = fs.readFileSync(
      path.resolve("src/components/ui/InlineEditableText.tsx"),
      "utf-8",
    );
    expect(src).toMatch(/skipNextBlurRef/);
  });
  it("projectStore exposes draftName + commitDraftName (genuine auto-save bypass per D-23)", () => {
    const src = fs.readFileSync(path.resolve("src/stores/projectStore.ts"), "utf-8");
    expect(src).toMatch(/draftName/);
    expect(src).toMatch(/commitDraftName/);
  });
  it("cadStore exposes renameRoomNoHistory", () => {
    const src = fs.readFileSync(path.resolve("src/stores/cadStore.ts"), "utf-8");
    expect(src).toMatch(/renameRoomNoHistory/);
  });
  it("TopBar renders the InlineEditableText for project name (relocated to TopBar per Phase 74 TOOLBAR-REWORK)", () => {
    const src = fs.readFileSync(path.resolve("src/components/TopBar.tsx"), "utf-8");
    expect(src).toMatch(/InlineEditableText/);
  });
});
