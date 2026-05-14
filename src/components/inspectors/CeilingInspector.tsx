// src/components/inspectors/CeilingInspector.tsx
//
// Phase 82 Plan 82-02 — Ceiling inspector tab system (D-05).
// Tabs: Geometry / Material (default Geometry).
//
// Geometry tab owns: WIDTH + DEPTH override inputs + Height + Vertices
// read-only rows + Reset-size button (when overrides exist).
// Material tab owns: MaterialPicker.
// D-05 trailing row: <SavedCameraButtons> below tabs, always visible.
// D-03: key={ceiling.id} forces fresh mount on selection change.

import { useState } from "react";
import { useCADStore } from "@/stores/cadStore";
import type { Ceiling } from "@/types/cad";
import { PanelSection } from "@/components/ui/PanelSection";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { MaterialPicker } from "@/components/MaterialPicker";
import {
  Row,
  CeilingDimInput,
  SavedCameraButtons,
} from "./PropertiesPanel.shared";

interface Props {
  ceiling: Ceiling;
  viewMode: "2d" | "3d" | "split" | "library";
}

type CeilingTab = "geometry" | "material";

export function CeilingInspector({ ceiling, viewMode }: Props) {
  const setSavedCameraOnCeilingNoHistory = useCADStore(
    (s) => s.setSavedCameraOnCeilingNoHistory,
  );
  const clearSavedCameraNoHistory = useCADStore(
    (s) => s.clearSavedCameraNoHistory,
  );

  const [activeTab, setActiveTab] = useState<CeilingTab>("geometry");

  const hasOverrides =
    ceiling.widthFtOverride !== undefined ||
    ceiling.depthFtOverride !== undefined ||
    ceiling.anchorXFt !== undefined ||
    ceiling.anchorYFt !== undefined;

  return (
    <div className="space-y-2" key={ceiling.id}>
      <div className="font-sans text-xs text-foreground">
        CEILING {ceiling.id.slice(-4).toUpperCase()}
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as CeilingTab)}
      >
        <TabsList>
          <TabsTrigger value="geometry">Geometry</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
        </TabsList>
        <TabsContent value="geometry">
          <div className="space-y-2">
            <PanelSection id="dimensions" label="Dimensions">
              <div className="space-y-1.5">
                {/* Phase 65 CEIL-02 — WIDTH + DEPTH override inputs above
                    HEIGHT. Live-preview via NoHistory on every keystroke;
                    Enter/blur commits via the history-pushing variant. */}
                <CeilingDimInput ceiling={ceiling} axis="width" label="Width" />
                <CeilingDimInput ceiling={ceiling} axis="depth" label="Depth" />
                <Row label="Height" value={`${ceiling.height.toFixed(1)} FT`} />
                <Row label="Vertices" value={String(ceiling.points.length)} />
              </div>
            </PanelSection>
            {hasOverrides && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  useCADStore.getState().clearCeilingOverrides(ceiling.id)
                }
              >
                Reset size
              </Button>
            )}
          </div>
        </TabsContent>
        <TabsContent value="material">
          <MaterialPicker
            surface="ceiling"
            target={{ kind: "ceiling", ceilingId: ceiling.id }}
            value={ceiling.materialId}
            tileSizeOverride={ceiling.scaleFt}
          />
        </TabsContent>
      </Tabs>
      <SavedCameraButtons
        kind="ceiling"
        id={ceiling.id}
        hasSavedCamera={!!ceiling.savedCameraPos}
        viewMode={viewMode}
        onSave={(cId, pos, target) =>
          setSavedCameraOnCeilingNoHistory(cId, pos, target)
        }
        onClear={clearSavedCameraNoHistory}
      />
    </div>
  );
}
