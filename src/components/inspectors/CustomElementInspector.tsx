// src/components/inspectors/CustomElementInspector.tsx
//
// Phase 82 Plan 82-01 — Custom element inspector extracted from
// PropertiesPanel.tsx L530-624. JSX is verbatim. No tabs yet (Plan 82-02).
//
// The activeFace useState (Phase 68 D-07) lives here now since face
// selection is custom-element-specific.

import { useState } from "react";
import { useCADStore } from "@/stores/cadStore";
import type { CustomElement, PlacedCustomElement } from "@/types/cad";
import type { FaceDirection } from "@/types/material";
import { PanelSection } from "@/components/ui/PanelSection";
import { Button } from "@/components/ui/Button";
import { MaterialPicker } from "@/components/MaterialPicker";
import {
  Row,
  RotationPresetChips,
  LabelOverrideInput,
  SavedCameraButtons,
} from "./PropertiesPanel.shared";

interface Props {
  pce: PlacedCustomElement;
  ce: CustomElement;
  viewMode: "2d" | "3d" | "split" | "library";
}

export function CustomElementInspector({ pce, ce, viewMode }: Props) {
  const clearCustomElementOverrides = useCADStore(
    (s) => s.clearCustomElementOverrides,
  );
  const setSavedCameraOnCustomElementNoHistory = useCADStore(
    (s) => s.setSavedCameraOnCustomElementNoHistory,
  );
  const clearSavedCameraNoHistory = useCADStore(
    (s) => s.clearSavedCameraNoHistory,
  );

  // Phase 68 D-07: which face of the selected custom element the picker targets.
  const [activeFace, setActiveFace] = useState<FaceDirection>("top");

  return (
    <div className="space-y-2">
      <div className="font-sans text-xs text-foreground">
        {ce.name.toUpperCase()}
      </div>
      <PanelSection id="dimensions" label="Dimensions">
        <div className="space-y-1.5">
          <Row label="Width" value={`${ce.width} FT`} />
          <Row label="Depth" value={`${ce.depth} FT`} />
          <Row label="Height" value={`${ce.height} FT`} />
        </div>
      </PanelSection>
      <PanelSection id="position" label="Position">
        <div className="space-y-1.5">
          <Row
            label="Position"
            value={`${pce.position.x.toFixed(1)}, ${pce.position.y.toFixed(1)}`}
          />
        </div>
      </PanelSection>
      <PanelSection id="rotation" label="Rotation">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Row label="Rotation" value={`${pce.rotation.toFixed(0)}°`} />
          </div>
          <RotationPresetChips
            currentRotation={pce.rotation}
            onSelect={(deg) =>
              useCADStore
                .getState()
                .updatePlacedCustomElement(pce.id, { rotation: deg })
            }
          />
        </div>
      </PanelSection>
      <LabelOverrideInput pce={pce} catalogName={ce.name} />
      {(pce.widthFtOverride !== undefined ||
        pce.depthFtOverride !== undefined) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => clearCustomElementOverrides(pce.id)}
        >
          Reset size
        </Button>
      )}
      {/* Phase 68 D-07: per-face Material picker. */}
      <section className="flex flex-col gap-2 p-4 bg-card rounded-md">
        <header className="font-sans text-[--font-size-sm] text-muted-foreground uppercase">
          Face
        </header>
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              "top",
              "bottom",
              "north",
              "south",
              "east",
              "west",
            ] as FaceDirection[]
          ).map((f) => (
            <Button
              key={f}
              variant="ghost"
              size="sm"
              active={activeFace === f}
              onClick={() => setActiveFace(f)}
              className="uppercase"
            >
              {f}
            </Button>
          ))}
        </div>
      </section>
      <MaterialPicker
        surface="customElementFace"
        target={{
          kind: "customElementFace",
          placedId: pce.id,
          face: activeFace,
        }}
        value={pce.faceMaterials?.[activeFace]}
      />
      <SavedCameraButtons
        kind="custom"
        id={pce.id}
        hasSavedCamera={!!pce.savedCameraPos}
        viewMode={viewMode}
        onSave={(ceId, pos, target) =>
          setSavedCameraOnCustomElementNoHistory(ceId, pos, target)
        }
        onClear={clearSavedCameraNoHistory}
      />
    </div>
  );
}
