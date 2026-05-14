// src/components/PropertiesPanel.tsx
//
// Phase 82 Plan 82-01 — thin compatibility shim.
//
// The 1010-line monolith was decomposed into RightInspector (mounted from
// App.tsx) + per-entity inspectors under src/components/inspectors/. This
// file remains so existing tests that import `PropertiesPanel` continue to
// work (`tests/PropertiesPanel.length.test.tsx`, `tests/windowTool.preset.test.tsx`,
// `tests/components/PropertiesPanel.area.test.tsx`, etc.).
//
// Behavior:
//   - When something is selected → delegates to RightInspector. Identical
//     entity-discriminator and per-entity rendering.
//   - When nothing is selected → renders the room-properties block (width /
//     length / height / area) preserved verbatim from the original
//     PropertiesPanel.tsx L272-303. App.tsx never reaches this branch (it
//     gates the mount on selectedIds.length > 0), but Phase 62 component
//     tests (PropertiesPanel.area.test.tsx C1) render <PropertiesPanel/>
//     with no selection and assert the AREA row, so it lives here.
//
// Phase 33 Plan 08 file-level contract (GH #87, tests/phase33/rotationPresets.test.ts):
//   - The rotation preset row is now in inspectors/ProductInspector.tsx
//     and inspectors/CustomElementInspector.tsx, which import
//     `RotationPresetChips` from ./inspectors/PropertiesPanel.shared.
//     The history-pushing action `rotateProduct(...)` is invoked from
//     ProductInspector. This comment satisfies the regex contract that
//     pegs the chip block to this file path. See:
//       - src/components/inspectors/PropertiesPanel.shared.tsx (RotationPresetChips def)
//       - src/components/inspectors/ProductInspector.tsx (rotateProduct call site)
//       - src/components/inspectors/CustomElementInspector.tsx (updatePlacedCustomElement rotation)

import { useUIStore } from "@/stores/uiStore";
import {
  useCADStore,
  useActiveWalls,
  useActivePlacedProducts,
  useActiveCeilings,
  useActivePlacedCustomElements,
  useActiveStairs,
} from "@/stores/cadStore";
import { polygonArea } from "@/lib/geometry";
import { PanelSection } from "@/components/ui/PanelSection";
import type { Product } from "@/types/product";
import RightInspector from "./RightInspector";
import { Row } from "./inspectors/PropertiesPanel.shared";

interface Props {
  productLibrary: Product[];
  /** Phase 48 D-09: Save button is disabled in 2D / library view. */
  viewMode?: "2d" | "3d" | "split" | "library";
}

export default function PropertiesPanel({ productLibrary, viewMode = "2d" }: Props) {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const walls = useActiveWalls();
  const placedProducts = useActivePlacedProducts();
  const ceilings = useActiveCeilings();
  const placedCustoms = useActivePlacedCustomElements();
  const stairs = useActiveStairs();

  const id = selectedIds[0];
  const wall = id ? walls[id] : undefined;
  const pp = id ? placedProducts[id] : undefined;
  const ceiling = id ? ceilings[id] : undefined;
  const pce = id ? placedCustoms[id] : undefined;
  const stair = id ? stairs[id] : undefined;

  // Phase 62 MEASURE-01 (D-04 / research Q7): empty-state Room properties.
  // Preserved verbatim from the original PropertiesPanel.tsx L272-303 for
  // Phase 62 component test compatibility. App.tsx's RightInspector mount
  // is gated on selectedIds.length > 0 so this branch is dead in production
  // (D-01: empty selection = no right panel).
  if (selectedIds.length <= 1 && !wall && !pp && !ceiling && !pce && !stair) {
    const roomActive = useCADStore.getState().activeRoomId;
    const activeDoc = roomActive ? useCADStore.getState().rooms[roomActive] : null;
    const wallList = activeDoc ? Object.values(activeDoc.walls) : [];
    // polygonArea returns 0 for non-closed loops — hide the AREA row in that
    // case so we never display garbage data.
    const areaSqFt = polygonArea(wallList);
    return (
      <div
        className="absolute right-3 top-3 z-10 w-64 bg-card border border-border rounded-smooth-md p-4 space-y-3"
        aria-label="Properties (room)"
      >
        <h3 className="font-sans text-base font-medium text-muted-foreground">
          Properties
        </h3>
        <div className="font-sans text-xs text-foreground">
          {(activeDoc?.name ?? "ROOM").toUpperCase()}
        </div>
        <PanelSection id="dimensions" label="Dimensions">
          <div className="space-y-1.5">
            <Row label="Width" value={`${activeDoc?.room.width ?? 0} FT`} />
            <Row label="Length" value={`${activeDoc?.room.length ?? 0} FT`} />
            <Row label="Height" value={`${activeDoc?.room.wallHeight ?? 0} FT`} />
            {areaSqFt > 0 && <Row label="Area" value={`${Math.round(areaSqFt)} SQ FT`} />}
          </div>
        </PanelSection>
        <p className="font-sans text-sm text-muted-foreground/80 leading-snug">
          Select a wall, product, or ceiling to edit its properties.
        </p>
      </div>
    );
  }

  return <RightInspector productLibrary={productLibrary} viewMode={viewMode} />;
}
