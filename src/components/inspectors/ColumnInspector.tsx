// src/components/inspectors/ColumnInspector.tsx
//
// Phase 86 Plan 86-03 (D-08) — ColumnInspector.
//
// Tabbed inspector for a selected Column, mirroring the Phase 82 D-05
// ProductInspector pattern. Three tabs:
//
//   1. Dimensions — W/D/H/X/Y numeric inputs (Phase 85 NumericInputRow +
//      clampInspectorValue). Single-undo per commit. "Reset to wall height"
//      button under the Height input snaps heightFt back to the room's
//      current wallHeight (D-03 — one history push).
//
//   2. Material — Phase 68/82 MaterialPicker writes column.materialId via
//      updateColumn({ materialId }). Falls back to off-white paint when
//      unset (handled in ColumnMesh — not the inspector).
//
//   3. Rotation — Numeric input for degrees + "Reset to 0°" button.
//      Single-undo per commit.
//
// Trailing row: <SavedCameraButtons kind="column"> below the tabs, always
// visible (mirrors ProductInspector trailing row).
//
// D-03 (Plan 82-02): key={column.id} forces a fresh mount on selection swap.

import { useEffect, useState } from "react";
import { useCADStore } from "@/stores/cadStore";
import type { Column } from "@/types/cad";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { PanelSection } from "@/components/ui/PanelSection";
import { Button } from "@/components/ui/Button";
import { MaterialPicker } from "@/components/MaterialPicker";
import { installNumericInputDrivers } from "@/test-utils/numericInputDrivers";
import {
  NumericInputRow,
  Row,
  SavedCameraButtons,
  clampInspectorValue,
} from "./PropertiesPanel.shared";

interface Props {
  column: Column;
  activeRoomId: string;
  viewMode: "2d" | "3d" | "split" | "library";
}

type ColumnTab = "dimensions" | "material" | "rotation";

export function ColumnInspector({ column, activeRoomId, viewMode }: Props) {
  const room = useCADStore((s) => s.rooms[activeRoomId]?.room);

  const resizeColumnAxis = useCADStore((s) => s.resizeColumnAxis);
  const resizeColumnHeight = useCADStore((s) => s.resizeColumnHeight);
  const moveColumn = useCADStore((s) => s.moveColumn);
  const rotateColumn = useCADStore((s) => s.rotateColumn);
  const updateColumn = useCADStore((s) => s.updateColumn);
  const clearSavedCameraNoHistory = useCADStore(
    (s) => s.clearSavedCameraNoHistory,
  );

  // Phase 85 D-05 — install __driveNumericInput test driver. StrictMode-safe
  // via identity-check cleanup inside installNumericInputDrivers (CLAUDE.md §7).
  useEffect(() => installNumericInputDrivers(), []);

  const [activeTab, setActiveTab] = useState<ColumnTab>("dimensions");

  return (
    <div className="space-y-2" key={column.id}>
      <div className="font-sans text-xs text-foreground">
        {(column.name ?? "COLUMN").toUpperCase()}
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ColumnTab)}
      >
        <TabsList>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="rotation">Rotation</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions">
          <div className="space-y-2">
            <PanelSection id="column-dimensions" label="Dimensions">
              <div className="space-y-1.5">
                <NumericInputRow
                  label="Width (ft)"
                  value={column.widthFt}
                  onCommit={(v) =>
                    resizeColumnAxis(
                      activeRoomId,
                      column.id,
                      "width",
                      clampInspectorValue(v),
                    )
                  }
                  testid="column-width-input"
                />
                <NumericInputRow
                  label="Depth (ft)"
                  value={column.depthFt}
                  onCommit={(v) =>
                    resizeColumnAxis(
                      activeRoomId,
                      column.id,
                      "depth",
                      clampInspectorValue(v),
                    )
                  }
                  testid="column-depth-input"
                />
                <NumericInputRow
                  label="Height (ft)"
                  value={column.heightFt}
                  onCommit={(v) =>
                    resizeColumnHeight(
                      activeRoomId,
                      column.id,
                      clampInspectorValue(v),
                    )
                  }
                  testid="column-height-input"
                />
                {/* D-03: Reset to wall height — exactly one history push. */}
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="column-reset-height"
                    onClick={() => {
                      if (room) {
                        resizeColumnHeight(
                          activeRoomId,
                          column.id,
                          room.wallHeight,
                        );
                      }
                    }}
                  >
                    Reset to wall height
                  </Button>
                </div>
              </div>
            </PanelSection>

            <PanelSection id="column-position" label="Position">
              <div className="space-y-1.5">
                <NumericInputRow
                  label="X (ft)"
                  value={column.position.x}
                  onCommit={(v) =>
                    moveColumn(activeRoomId, column.id, {
                      x: v,
                      y: column.position.y,
                    })
                  }
                  testid="column-x-input"
                />
                <NumericInputRow
                  label="Y (ft)"
                  value={column.position.y}
                  onCommit={(v) =>
                    moveColumn(activeRoomId, column.id, {
                      x: column.position.x,
                      y: v,
                    })
                  }
                  testid="column-y-input"
                />
              </div>
            </PanelSection>
          </div>
        </TabsContent>

        <TabsContent value="material">
          <div className="space-y-2">
            <PanelSection id="column-material" label="Material">
              <div className="space-y-1.5">
                {/* D-08 Material tab — reuse customElementFace surface (same
                    uniform-tile pipeline ColumnMesh consumes via Phase 78
                    useResolvedMaterial). onChange writes column.materialId. */}
                <MaterialPicker
                  surface="customElementFace"
                  value={column.materialId}
                  onChange={(materialId) =>
                    updateColumn(activeRoomId, column.id, { materialId })
                  }
                />
              </div>
            </PanelSection>
          </div>
        </TabsContent>

        <TabsContent value="rotation">
          {/* Plan 82-02 single-section tab — no PanelSection wrapper. */}
          <div className="space-y-1.5">
            <Row label="Rotation" value={`${column.rotation.toFixed(0)}°`} />
            <NumericInputRow
              label="Rotation (°)"
              value={column.rotation}
              onCommit={(v) => rotateColumn(activeRoomId, column.id, v)}
              testid="column-rotation-input"
              min={-360}
              max={360}
              step={1}
            />
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                data-testid="column-reset-rotation"
                onClick={() => rotateColumn(activeRoomId, column.id, 0)}
              >
                Reset to 0°
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <SavedCameraButtons
        kind="column"
        id={column.id}
        hasSavedCamera={!!column.savedCameraPos}
        viewMode={viewMode}
        onSave={() => {
          /* dispatched via cadState typed-extension inside SavedCameraButtons */
        }}
        onClear={clearSavedCameraNoHistory}
      />
    </div>
  );
}
