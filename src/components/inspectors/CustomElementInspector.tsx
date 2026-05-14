// src/components/inspectors/CustomElementInspector.tsx
//
// Phase 82 Plan 82-02 — Custom element inspector tab system (D-05).
// Tabs: Dimensions / Label / Material (default Dimensions).
//
// Dimensions tab owns: dim PanelSection + Position (collapsed) +
// Rotation PanelSection + Reset-size button (when overrides exist).
// Label tab owns: LabelOverrideInput.
// Material tab owns: per-face selector + MaterialPicker (Phase 68 D-07
// activeFace state stays at function scope — shared across faces inside
// the Material tab).
// D-05 trailing row: <SavedCameraButtons> below tabs.
// D-03: key={pce.id} forces fresh mount on selection change.

import { useState } from "react";
import { useCADStore } from "@/stores/cadStore";
import type { CustomElement, PlacedCustomElement } from "@/types/cad";
import type { FaceDirection } from "@/types/material";
import { PanelSection } from "@/components/ui/PanelSection";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
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

type CustomTab = "dimensions" | "label" | "material";

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

  const [activeTab, setActiveTab] = useState<CustomTab>("dimensions");
  // Phase 68 D-07: which face of the selected custom element the picker
  // targets. Kept at function scope — shared across the Material tab.
  const [activeFace, setActiveFace] = useState<FaceDirection>("top");

  const hasOverrides =
    pce.widthFtOverride !== undefined || pce.depthFtOverride !== undefined;

  return (
    <div className="space-y-2" key={pce.id}>
      <div className="font-sans text-xs text-foreground">
        {ce.name.toUpperCase()}
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as CustomTab)}
      >
        <TabsList>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="label">Label</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
        </TabsList>
        <TabsContent value="dimensions">
          <div className="space-y-2">
            <PanelSection id="dimensions" label="Dimensions">
              <div className="space-y-1.5">
                <Row label="Width" value={`${ce.width} FT`} />
                <Row label="Depth" value={`${ce.depth} FT`} />
                <Row label="Height" value={`${ce.height} FT`} />
              </div>
            </PanelSection>
            <PanelSection id="position" label="Position" defaultOpen={false}>
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
            {hasOverrides && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => clearCustomElementOverrides(pce.id)}
              >
                Reset size
              </Button>
            )}
          </div>
        </TabsContent>
        <TabsContent value="label">
          <LabelOverrideInput pce={pce} catalogName={ce.name} />
        </TabsContent>
        <TabsContent value="material">
          <div className="space-y-2">
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
          </div>
        </TabsContent>
      </Tabs>
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
