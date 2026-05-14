// src/components/inspectors/WallInspector.tsx
//
// Phase 82 Plan 82-01 — Wall inspector extracted from PropertiesPanel.tsx
// L365-421. JSX is verbatim. No tabs yet (Plan 82-02).
//
// Owns: Dimensions / Position / Openings / Wall surface / Camera buttons
// for the selected wall.

import { useCADStore } from "@/stores/cadStore";
import { wallLength } from "@/lib/geometry";
import { validateInput } from "@/canvas/dimensionEditor";
import type { WallSegment } from "@/types/cad";
import { PanelSection } from "@/components/ui/PanelSection";
import WallSurfacePanel from "@/components/WallSurfacePanel";
import { OpeningsSection } from "@/components/PropertiesPanel.OpeningSection";
import {
  Row,
  EditableRow,
  SavedCameraButtons,
} from "./PropertiesPanel.shared";

interface Props {
  wall: WallSegment;
  viewMode: "2d" | "3d" | "split" | "library";
}

export function WallInspector({ wall, viewMode }: Props) {
  const resizeWallByLabel = useCADStore((s) => s.resizeWallByLabel);
  const updateWall = useCADStore((s) => s.updateWall);
  const setSavedCameraOnWallNoHistory = useCADStore(
    (s) => s.setSavedCameraOnWallNoHistory,
  );
  const clearSavedCameraNoHistory = useCADStore(
    (s) => s.clearSavedCameraNoHistory,
  );

  return (
    <div className="space-y-2">
      <div className="font-sans text-xs text-foreground">
        WALL SEGMENT {wall.id.slice(-4).toUpperCase()}
      </div>
      <PanelSection id="dimensions" label="Dimensions">
        <div className="space-y-1.5">
          <EditableRow
            label="Length"
            value={wallLength(wall)}
            suffix="FT"
            onCommit={(v) => resizeWallByLabel(wall.id, v)}
            min={0.5}
            parser={validateInput}
          />
          <EditableRow
            label="Thickness"
            value={wall.thickness}
            suffix="FT"
            onCommit={(v) => updateWall(wall.id, { thickness: v })}
            min={0.1}
            step={0.1}
          />
          <EditableRow
            label="Height"
            value={wall.height}
            suffix="FT"
            onCommit={(v) => updateWall(wall.id, { height: v })}
            min={1}
          />
        </div>
      </PanelSection>
      <PanelSection id="position" label="Position">
        <div className="space-y-1.5">
          <Row
            label="Start"
            value={`${wall.start.x.toFixed(1)}, ${wall.start.y.toFixed(1)}`}
          />
          <Row
            label="End"
            value={`${wall.end.x.toFixed(1)}, ${wall.end.y.toFixed(1)}`}
          />
        </div>
      </PanelSection>
      {/* Phase 61 OPEN-01 (D-10): per-opening editor section. */}
      <OpeningsSection wall={wall} />
      <WallSurfacePanel />
      <SavedCameraButtons
        kind="wall"
        id={wall.id}
        hasSavedCamera={!!wall.savedCameraPos}
        viewMode={viewMode}
        onSave={(wId, pos, target) =>
          setSavedCameraOnWallNoHistory(wId, pos, target)
        }
        onClear={clearSavedCameraNoHistory}
      />
    </div>
  );
}
