import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RoomsTreePanel } from "@/components/RoomsTreePanel";
import { useUIStore } from "@/stores/uiStore";

describe("RoomsTreePanel — select (UI-SPEC § Color, § Interaction)", () => {
  it("row click writes selectedIds", () => {
    // Plan 03 implementation
  });
  it("group-header click is NO-OP for selection (only toggles expand)", () => {
    // UI-SPEC § Interaction: 'Group header click ... NO selection change'
  });
  it("selected row has classes: bg-obsidian-highest, border-l-2 border-accent, label text-accent-light, aria-current='true'", () => {
    // Per UI-SPEC § Color verbatim. All 4 must be present when selectedIds.includes(node.id).
  });
  it("active room name uses text-accent-light (when activeRoomId === room.id)", () => {
    // Per UI-SPEC § Color: 'Active-room indicator — the room that matches cadStore.activeRoomId shows its room-name label in text-accent-light'
  });
  it("every interactive element has focus-visible:ring-1 focus-visible:ring-accent", () => {
    // Per UI-SPEC § Color § Focus ring.
  });
});
