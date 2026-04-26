import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { RoomsTreePanel } from "@/components/RoomsTreePanel";

describe("RoomsTreePanel — expand (D-03 persistence)", () => {
  beforeEach(() => localStorage.clear());
  it("default: active room expanded, others collapsed (D-02)", () => {
    // Plan 03 implementation
  });
  it("chevron toggle writes to localStorage 'gsd:tree:room:{roomId}:expanded'", () => {
    // Plan 03 implementation
  });
  it("aria-label uses 'Expand {room name}' / 'Collapse {room name}' verbatim (UI-SPEC § Copywriting)", () => {
    // Plan 03 implementation
  });
});
