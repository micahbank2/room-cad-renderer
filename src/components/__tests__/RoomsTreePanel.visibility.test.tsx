import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RoomsTreePanel } from "@/components/RoomsTreePanel";
import { useUIStore } from "@/stores/uiStore";

describe("RoomsTreePanel — visibility cascade (D-12, UI-SPEC § Visibility tokens)", () => {
  it("self hidden + parent visible → eye dimmed, EyeOff glyph", () => {
    // Plan 03 / Plan 02 contract
  });
  it("self visible + parent hidden → row at opacity-50, eye still shows self's actual state (Eye glyph)", () => {
    // D-12 cascade preservation
  });
  it("self hidden + parent hidden → both stacked (opacity-50 AND EyeOff)", () => {
    // D-12 visual layering
  });
  it("hiddenIds.has(child.id) preserved through parent toggle cycle (round-trip)", () => {
    // Toggle child off; toggle parent off; toggle parent on; child should STILL be hidden.
  });
  it("aria-label uses verbatim UI-SPEC strings: 'Hide {label} from 3D view' / 'Show {label} in 3D view' / '{label} hidden because {parent label} is hidden'", () => {
    // Plan 03 implementation
  });
});
