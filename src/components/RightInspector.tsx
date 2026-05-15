// src/components/RightInspector.tsx
//
// Phase 82 Plan 82-01 — new shell. Replaces PropertiesPanel.tsx as the
// right-side inspector mount point. Discriminates by selectedIds[0]'s
// entity type and mounts the right *Inspector from inspectors/.
//
// No tabs yet (Plan 82-02). No opening sub-selection yet (Plan 82-03).
// Pure structural refactor — same UX as PropertiesPanel.tsx today.
//
// D-01: returns null when selectedIds.length === 0 (App.tsx gates the
// mount; this is defense-in-depth so a misuse from elsewhere doesn't
// crash).
// D-05: bulk-actions branch (selectedIds.length > 1) stays untabbed.

import {
  useCADStore,
  useActiveWalls,
  useActivePlacedProducts,
  useActiveCeilings,
  useActivePlacedCustomElements,
  useActiveStairs,
  useActiveColumns,
  useCustomElements,
} from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/types/product";
import { WallInspector } from "./inspectors/WallInspector";
import { ProductInspector } from "./inspectors/ProductInspector";
import { CeilingInspector } from "./inspectors/CeilingInspector";
import { CustomElementInspector } from "./inspectors/CustomElementInspector";
import { StairInspector } from "./inspectors/StairInspector";
import { ColumnInspector } from "./inspectors/ColumnInspector";

interface Props {
  productLibrary: Product[];
  /** Phase 48 D-09: Save button is disabled in 2D / library view. */
  viewMode: "2d" | "3d" | "split" | "library";
}

export default function RightInspector({ productLibrary, viewMode }: Props) {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const walls = useActiveWalls();
  const placedProducts = useActivePlacedProducts();
  const ceilings = useActiveCeilings();
  const placedCustoms = useActivePlacedCustomElements();
  const customCatalog = useCustomElements();
  const stairs = useActiveStairs();
  const columns = useActiveColumns();
  const activeRoomId = useCADStore((s) => s.activeRoomId);
  const removeSelected = useCADStore((s) => s.removeSelected);
  const clearSelection = useUIStore((s) => s.clearSelection);

  function handleDelete() {
    removeSelected(selectedIds);
    clearSelection();
  }

  // D-01 defense-in-depth — empty selection → no inspector.
  if (selectedIds.length === 0) return null;

  // D-05 — multi-select stays untabbed. Verbatim JSX from
  // PropertiesPanel.tsx L220-267.
  if (selectedIds.length > 1) {
    const wallIds = selectedIds.filter((id) => !!walls[id]);
    const totalCount = selectedIds.length;
    return (
      <div className="absolute right-3 top-3 z-10 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto bg-card border border-border rounded-smooth-md p-4 space-y-3">
        <h3 id="bulk-actions" className="font-sans text-base font-medium text-muted-foreground">
          Bulk actions
        </h3>
        <div className="font-sans text-[13px] text-foreground">
          {totalCount} ITEMS SELECTED
          {wallIds.length > 0 && ` (${wallIds.length} WALLS)`}
        </div>

        {wallIds.length > 0 && (
          <div className="space-y-2 border-t border-border/50 pt-2">
            <div id="paint-walls" className="font-sans text-sm font-medium text-muted-foreground">Paint all walls</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue="#f8f5ef"
                onChange={(e) => {
                  const color = e.target.value;
                  for (const wId of wallIds) {
                    useCADStore.getState().setWallpaper(wId, "A", { kind: "color", color });
                    useCADStore.getState().setWallpaper(wId, "B", { kind: "color", color });
                  }
                }}
                className="w-8 h-7 bg-transparent border border-border/60 rounded-smooth-md cursor-pointer"
              />
              <span className="font-sans text-[13px] text-muted-foreground/60">
                APPLIES TO BOTH SIDES
              </span>
            </div>
          </div>
        )}

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleDelete}
        >
          Delete all ({totalCount})
        </Button>
      </div>
    );
  }

  // Single-selection discriminator. Mirrors PropertiesPanel.tsx L205-212.
  const id = selectedIds[0];
  const wall = walls[id];
  const pp = placedProducts[id];
  const ceiling = ceilings[id];
  const pce = placedCustoms[id];
  const ce = pce ? customCatalog[pce.customElementId] : undefined;
  // Phase 60 STAIRS-01 (D-08): sequential `if (entity)` discriminator.
  const stair = stairs[id];
  // Phase 86 COL-01 (D-08): column branch.
  const column = columns[id];

  return (
    <div className="absolute right-3 top-3 z-10 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto bg-card border border-border rounded-smooth-md p-4 space-y-3">
      <h3 id="properties" aria-label="Properties" className="font-sans text-base font-medium text-muted-foreground">
        Properties
      </h3>

      {/* D-03 (Plan 82-02): each per-entity inspector is keyed on the
          entity id so React unmounts the previous inspector and mounts
          a fresh one — local activeTab useState resets to the default
          tab on every new selection. */}
      {ceiling && (
        <CeilingInspector
          key={ceiling.id}
          ceiling={ceiling}
          viewMode={viewMode}
        />
      )}
      {wall && (
        <WallInspector key={wall.id} wall={wall} viewMode={viewMode} />
      )}
      {pp && (
        <ProductInspector
          key={pp.id}
          pp={pp}
          productLibrary={productLibrary}
          viewMode={viewMode}
        />
      )}
      {pce && ce && (
        <CustomElementInspector
          key={pce.id}
          pce={pce}
          ce={ce}
          viewMode={viewMode}
        />
      )}
      {stair && activeRoomId && (
        <StairInspector
          key={stair.id}
          stair={stair}
          activeRoomId={activeRoomId}
          viewMode={viewMode}
        />
      )}
      {column && activeRoomId && (
        <ColumnInspector
          key={column.id}
          column={column}
          activeRoomId={activeRoomId}
          viewMode={viewMode}
        />
      )}

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={handleDelete}
      >
        Delete element
      </Button>
    </div>
  );
}
