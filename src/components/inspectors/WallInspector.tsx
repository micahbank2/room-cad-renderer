// src/components/inspectors/WallInspector.tsx
//
// Phase 82 Plan 82-02 — Wall inspector tab system (D-05).
// Tabs: Geometry / Material / Openings (default Geometry).
// D-03 tab reset via key={wall.id} on the outer wrapper — React unmounts
// the old Tabs and mounts a fresh one with default activeTab when the
// selected wall changes.
// D-05 trailing row: <SavedCameraButtons> renders BELOW the Tabs, always
// visible regardless of active tab.
//
// Phase 82 Plan 82-03 (IA-05) — when uiStore.selectedOpeningId matches an
// opening on this wall, the wall inspector body is replaced by
// <OpeningInspector>. The OpeningInspector owns its own "← Back to wall"
// breadcrumb that clears selectedOpeningId; <SavedCameraButtons> does
// NOT render in sub-selection (it's a wall-view affordance).

import { useState } from "react";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { wallLength } from "@/lib/geometry";
import { validateInput } from "@/canvas/dimensionEditor";
import type { WallSegment } from "@/types/cad";
import { PanelSection } from "@/components/ui/PanelSection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import WallSurfacePanel from "@/components/WallSurfacePanel";
import { OpeningsSection } from "@/components/PropertiesPanel.OpeningSection";
import { OpeningInspector } from "./OpeningInspector";
import {
  Row,
  EditableRow,
  SavedCameraButtons,
} from "./PropertiesPanel.shared";

interface Props {
  wall: WallSegment;
  viewMode: "2d" | "3d" | "split" | "library";
}

type WallTab = "geometry" | "material" | "openings";

export function WallInspector({ wall, viewMode }: Props) {
  const resizeWallByLabel = useCADStore((s) => s.resizeWallByLabel);
  const updateWall = useCADStore((s) => s.updateWall);
  const setSavedCameraOnWallNoHistory = useCADStore(
    (s) => s.setSavedCameraOnWallNoHistory,
  );
  const clearSavedCameraNoHistory = useCADStore(
    (s) => s.clearSavedCameraNoHistory,
  );

  // Phase 82 Plan 82-03 (IA-05): opening sub-selection. When non-null and
  // matching an opening on THIS wall, swap the wall inspector body for
  // <OpeningInspector>. selectedOpeningId is cleared by uiStore on any
  // selectedIds change (select / clearSelection / setTool), so a wall
  // swap also wipes the sub-selection automatically.
  const selectedOpeningId = useUIStore((s) => s.selectedOpeningId);
  const subOpening = selectedOpeningId
    ? (wall.openings ?? []).find((o) => o.id === selectedOpeningId)
    : undefined;

  const [activeTab, setActiveTab] = useState<WallTab>("geometry");

  if (subOpening) {
    return <OpeningInspector wall={wall} opening={subOpening} />;
  }

  return (
    // D-03: key forces a fresh mount + default activeTab on wall swap.
    <div className="space-y-2" key={wall.id}>
      <div className="font-sans text-xs text-foreground">
        WALL SEGMENT {wall.id.slice(-4).toUpperCase()}
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WallTab)}>
        <TabsList>
          <TabsTrigger value="geometry">Geometry</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="openings">Openings</TabsTrigger>
        </TabsList>
        <TabsContent value="geometry">
          <div className="space-y-2">
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
            {/* Audit: Position rows are read-only debug data —
                collapsed-by-default per D-05 commentary. */}
            <PanelSection id="position" label="Position" defaultOpen={false}>
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
          </div>
        </TabsContent>
        <TabsContent value="material">
          <WallSurfacePanel />
        </TabsContent>
        <TabsContent value="openings">
          {/* Phase 61 OPEN-01 (D-10) — JSX unchanged. Phase 79 chip row
              stays nested inside OpeningEditor; Plan 82-03 lifts it. */}
          <OpeningsSection wall={wall} />
        </TabsContent>
      </Tabs>
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
