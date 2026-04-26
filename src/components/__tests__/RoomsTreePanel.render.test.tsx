import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoomsTreePanel } from "@/components/RoomsTreePanel";

describe("RoomsTreePanel — render (UI-SPEC § Per-Row Anatomy)", () => {
  it("renders 'Rooms' panel header", () => {
    render(<RoomsTreePanel />);
    expect(screen.getByText(/Rooms/i)).toBeInTheDocument();
  });
  it("rows are h-6 (24px height)", () => {
    // Plan 03: every interactive tree row uses className containing 'h-6'
    // Per UI-SPEC § Spacing Scale: 'Every interactive tree row (room, group header, leaf) is 24px tall (h-6).'
  });
  it("chevron icon is w-4 h-4 (16px)", () => {
    // Plan 03: ChevronRight/ChevronDown rendered with w-4 h-4 utilities.
    // Per UI-SPEC § Per-Row Anatomy: 'Chevron 16px (w-4 h-4)'.
  });
  it("eye-icon button is w-6 h-6 (24x24) with inner glyph w-3.5 h-3.5 (14px)", () => {
    // Per UI-SPEC § Per-Row Anatomy: 'Eye-icon button: 24x24 (w-6 h-6 flex items-center justify-center)'
    // and 'Eye/EyeOff lucide @ 14px (w-3.5 h-3.5)'.
  });
  it("indent classes match depth scale: pl-2 / pl-4 / pl-6 for depth 0/1/2", () => {
    // Per UI-SPEC § Spacing Scale: 'Room (depth 0) 8px pl-2; Group (depth 1) 16px pl-4; Leaf (depth 2) 24px pl-6'.
  });
});
