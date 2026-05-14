// src/components/inspectors/CeilingInspector.tsx
//
// Phase 82 Plan 82-01 — Ceiling inspector extracted from PropertiesPanel.tsx
// L311-363. JSX is verbatim. No tabs yet (Plan 82-02).
//
// Owns: Dimensions (width/depth/height/vertices) / Material picker / Camera
// buttons for the selected ceiling. Reset-size button visible when ceiling
// has size or anchor overrides.

import { useCADStore } from "@/stores/cadStore";
import type { Ceiling } from "@/types/cad";
import { PanelSection } from "@/components/ui/PanelSection";
import { Button } from "@/components/ui/Button";
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

export function CeilingInspector({ ceiling, viewMode }: Props) {
  const setSavedCameraOnCeilingNoHistory = useCADStore(
    (s) => s.setSavedCameraOnCeilingNoHistory,
  );
  const clearSavedCameraNoHistory = useCADStore(
    (s) => s.clearSavedCameraNoHistory,
  );

  return (
    <div className="space-y-2">
      <div className="font-sans text-xs text-foreground">
        CEILING {ceiling.id.slice(-4).toUpperCase()}
      </div>
      <PanelSection id="dimensions" label="Dimensions">
        <div className="space-y-1.5">
          {/* Phase 65 CEIL-02 — WIDTH + DEPTH override inputs above HEIGHT.
              Live-preview via NoHistory on every keystroke; Enter/blur
              commits via the history-pushing variant (single undo). */}
          <CeilingDimInput ceiling={ceiling} axis="width" label="Width" />
          <CeilingDimInput ceiling={ceiling} axis="depth" label="Depth" />
          <Row label="Height" value={`${ceiling.height.toFixed(1)} FT`} />
          <Row label="Vertices" value={String(ceiling.points.length)} />
        </div>
      </PanelSection>
      {(ceiling.widthFtOverride !== undefined ||
        ceiling.depthFtOverride !== undefined ||
        ceiling.anchorXFt !== undefined ||
        ceiling.anchorYFt !== undefined) && (
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
      <MaterialPicker
        surface="ceiling"
        target={{ kind: "ceiling", ceilingId: ceiling.id }}
        value={ceiling.materialId}
        tileSizeOverride={ceiling.scaleFt}
      />
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
