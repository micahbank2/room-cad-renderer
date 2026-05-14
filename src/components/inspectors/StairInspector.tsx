// src/components/inspectors/StairInspector.tsx
//
// Phase 82 Plan 82-01 — Stair inspector extracted from PropertiesPanel.tsx
// L639-651. Per D-04 stairs stay FLAT (single-pane scroll, no tabs) for
// v1.21. Future phase may decompose.

import { useCADStore } from "@/stores/cadStore";
import type { Stair } from "@/types/cad";
import { StairSection } from "@/components/PropertiesPanel.StairSection";
import { SavedCameraButtons } from "./PropertiesPanel.shared";

interface Props {
  stair: Stair;
  activeRoomId: string;
  viewMode: "2d" | "3d" | "split" | "library";
}

export function StairInspector({ stair, activeRoomId, viewMode }: Props) {
  const clearSavedCameraNoHistory = useCADStore(
    (s) => s.clearSavedCameraNoHistory,
  );

  return (
    <div className="space-y-2">
      <StairSection stair={stair} roomId={activeRoomId} />
      <SavedCameraButtons
        kind="stair"
        id={stair.id}
        hasSavedCamera={!!stair.savedCameraPos}
        viewMode={viewMode}
        onSave={() => {
          /* dispatched via cadState typed-extension inside SavedCameraButtons */
        }}
        onClear={clearSavedCameraNoHistory}
      />
    </div>
  );
}
