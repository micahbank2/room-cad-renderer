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

import { useState, useEffect } from "react";
import { useCADStore } from "@/stores/cadStore";
import type { CustomElement, PlacedCustomElement } from "@/types/cad";
import type { FaceDirection } from "@/types/material";
import { resolveEffectiveCustomDims } from "@/types/product";
import { PanelSection } from "@/components/ui/PanelSection";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { MaterialPicker } from "@/components/MaterialPicker";
import { installNumericInputDrivers } from "@/test-utils/numericInputDrivers";
import {
  NumericInputRow,
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
  // Phase 85 PARAM-01/02/03 — store actions wired to numeric inputs.
  const resizeCustomElementAxis = useCADStore((s) => s.resizeCustomElementAxis);
  const resizeCustomElementHeight = useCADStore(
    (s) => s.resizeCustomElementHeight,
  );
  const updatePlacedCustomElement = useCADStore(
    (s) => s.updatePlacedCustomElement,
  );

  // Phase 85 D-05 — install __driveNumericInput test driver. StrictMode-safe
  // via identity-check cleanup inside installNumericInputDrivers (CLAUDE.md §7).
  useEffect(() => installNumericInputDrivers(), []);

  const [activeTab, setActiveTab] = useState<CustomTab>("dimensions");
  // Phase 68 D-07: which face of the selected custom element the picker
  // targets. Kept at function scope — shared across the Material tab.
  const [activeFace, setActiveFace] = useState<FaceDirection>("top");

  // Phase 85 — effective dims honor per-placement overrides.
  const dims = resolveEffectiveCustomDims(ce, pce);

  const hasOverrides =
    pce.widthFtOverride !== undefined ||
    pce.depthFtOverride !== undefined ||
    pce.heightFtOverride !== undefined;

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
                <NumericInputRow
                  label="Width (ft)"
                  value={dims.width}
                  onCommit={(v) =>
                    resizeCustomElementAxis(pce.id, "width", v)
                  }
                  testid="custom-element-width-input"
                />
                <NumericInputRow
                  label="Depth (ft)"
                  value={dims.depth}
                  onCommit={(v) =>
                    resizeCustomElementAxis(pce.id, "depth", v)
                  }
                  testid="custom-element-depth-input"
                />
                <NumericInputRow
                  label="Height (ft)"
                  value={dims.height}
                  onCommit={(v) => resizeCustomElementHeight(pce.id, v)}
                  testid="custom-element-height-input"
                />
              </div>
            </PanelSection>
            <PanelSection id="position" label="Position">
              <div className="space-y-1.5">
                <NumericInputRow
                  label="X (ft)"
                  value={pce.position.x}
                  onCommit={(v) =>
                    updatePlacedCustomElement(pce.id, {
                      position: { x: v, y: pce.position.y },
                    })
                  }
                  testid="custom-element-x-input"
                />
                <NumericInputRow
                  label="Y (ft)"
                  value={pce.position.y}
                  onCommit={(v) =>
                    updatePlacedCustomElement(pce.id, {
                      position: { x: pce.position.x, y: v },
                    })
                  }
                  testid="custom-element-y-input"
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
