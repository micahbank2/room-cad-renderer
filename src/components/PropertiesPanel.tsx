import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  useCADStore,
  useActiveWalls,
  useActivePlacedProducts,
  useActiveCeilings,
  useActivePlacedCustomElements,
  useActiveStairs,
  useCustomElements,
} from "@/stores/cadStore";
import { StairSection } from "./PropertiesPanel.StairSection";
import { useUIStore } from "@/stores/uiStore";
import { useProductStore } from "@/stores/productStore";
import { formatFeet, wallLength, polygonArea, polygonBbox } from "@/lib/geometry";
import { validateInput } from "@/canvas/dimensionEditor";
import type { Product } from "@/types/product";
import { hasDimensions } from "@/types/product";
import type { PlacedCustomElement, Ceiling } from "@/types/cad";
import WallSurfacePanel from "./WallSurfacePanel";
import CeilingPaintSection from "./CeilingPaintSection";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Camera, CameraOff } from "lucide-react";
import { OpeningsSection } from "@/components/PropertiesPanel.OpeningSection";

interface Props {
  productLibrary: Product[];
  /** Phase 48 D-09: Save button is disabled in 2D / library view. */
  viewMode: "2d" | "3d" | "split" | "library";
}

// Phase 33 Plan 08 (GH #87) — rotation preset chips (D-19/D-20/D-21/D-22).
// 5 presets per D-19. History-pushing action per chip click (D-20): call
// sites invoke `rotateProduct(id, deg)` for products and
// `updatePlacedCustomElement(id, { rotation: deg })` for custom elements.
// Each chip click MUST increment past[] by exactly one.
// Works for products AND custom elements (D-21). Placed to the RIGHT of the
// numeric rotation display (D-22).
const ROTATION_PRESETS = [-90, -45, 0, 45, 90] as const;

function RotationPresetChips({
  currentRotation,
  onSelect,
}: {
  currentRotation: number;
  // onSelect is wired to history-pushing store actions at the call site:
  //   products        → rotateProduct(id, deg)
  //   custom elements → updatePlacedCustomElement(id, { rotation: deg })
  onSelect: (deg: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" data-rotation-presets>
      {ROTATION_PRESETS.map((preset) => {
        const isActive = Math.abs(currentRotation - preset) < 0.5;
        const label =
          preset === 0
            ? "0\u00b0"
            : preset > 0
              ? `+${preset}\u00b0`
              : `${preset}\u00b0`;
        return (
          <button
            key={preset}
            type="button"
            onClick={() => onSelect(preset)}
            data-rotation-preset={preset}
            className={
              "px-2 py-0.5 rounded-sm font-mono text-sm border transition-colors " +
              (isActive
                ? "bg-accent/20 text-accent-light border-accent/30"
                : "bg-obsidian-high text-text-dim border-outline-variant/20 hover:bg-obsidian-highest")
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Phase 48 CAM-04 (D-01, D-09, D-11): Save / Clear camera buttons for a leaf entity.
 * Save reads the live OrbitControls pose via uiStore.getCameraCapture (Plan 02 bridge).
 * Save is disabled in 2D / library views (D-09) — no 3D camera available.
 * Clear renders only when the entity already has a savedCameraPos.
 */
function SavedCameraButtons({
  kind,
  id,
  hasSavedCamera,
  viewMode,
  onSave,
  onClear,
}: {
  kind: "wall" | "product" | "ceiling" | "custom" | "stair";
  id: string;
  hasSavedCamera: boolean;
  viewMode: "2d" | "3d" | "split" | "library";
  onSave: (id: string, pos: [number, number, number], target: [number, number, number]) => void;
  onClear: (kind: "wall" | "product" | "ceiling" | "custom" | "stair", id: string) => void;
}) {
  const disabled = viewMode === "2d" || viewMode === "library";
  const saveTitle = disabled
    ? "Switch to 3D view to save a camera angle"
    : "Save current camera angle to this node";

  const handleSave = () => {
    if (disabled) return;
    const uiState = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      getCameraCapture?: (() => { pos: [number, number, number]; target: [number, number, number] } | null) | null;
    };
    const capture = uiState.getCameraCapture?.();
    if (!capture) return;
    // Read action live from store so test spies (vi.spyOn on getState() result) are intercepted.
    const cadState = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: typeof onSave;
      setSavedCameraOnProductNoHistory?: typeof onSave;
      setSavedCameraOnCeilingNoHistory?: typeof onSave;
      setSavedCameraOnCustomElementNoHistory?: typeof onSave;
      setSavedCameraOnStairNoHistory?: (id: string, pos: [number, number, number], target: [number, number, number]) => void;
    };
    if (kind === "wall") cadState.setSavedCameraOnWallNoHistory?.(id, capture.pos, capture.target);
    else if (kind === "product") cadState.setSavedCameraOnProductNoHistory?.(id, capture.pos, capture.target);
    else if (kind === "ceiling") cadState.setSavedCameraOnCeilingNoHistory?.(id, capture.pos, capture.target);
    else if (kind === "custom") cadState.setSavedCameraOnCustomElementNoHistory?.(id, capture.pos, capture.target);
    else if (kind === "stair") cadState.setSavedCameraOnStairNoHistory?.(id, capture.pos, capture.target);
    else onSave(id, capture.pos, capture.target);
  };

  const handleClear = () => {
    // Read action live from store so test spies (vi.spyOn on getState() result) are intercepted.
    const cadState = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      clearSavedCameraNoHistory?: typeof onClear;
    };
    if (cadState.clearSavedCameraNoHistory) {
      cadState.clearSavedCameraNoHistory(kind, id);
    } else {
      onClear(kind, id);
    }
  };

  return (
    <div className="flex items-center gap-1" data-saved-camera-buttons>
      <button
        type="button"
        onClick={handleSave}
        disabled={disabled}
        data-testid="save-camera-btn"
        aria-label="Save camera"
        title={saveTitle}
        className={
          "px-2 py-1 rounded-sm font-mono text-sm border flex items-center gap-1 transition-colors " +
          (disabled
            ? "bg-obsidian-high text-text-ghost border-outline-variant/20 cursor-not-allowed"
            : "bg-obsidian-high text-text-dim border-outline-variant/20 hover:bg-obsidian-highest hover:text-accent-light")
        }
      >
        <Camera className="w-3.5 h-3.5" />
        <span>Save camera</span>
      </button>
      {hasSavedCamera && (
        <button
          type="button"
          onClick={handleClear}
          data-testid="clear-camera-btn"
          aria-label="Clear saved camera"
          title="Remove saved camera angle"
          className="px-2 py-1 rounded-sm font-mono text-sm border flex items-center gap-1 transition-colors bg-obsidian-high text-text-dim border-outline-variant/20 hover:bg-obsidian-highest hover:text-accent-light"
        >
          <CameraOff className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
}

export default function PropertiesPanel({ productLibrary, viewMode }: Props) {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const walls = useActiveWalls();
  const placedProducts = useActivePlacedProducts();
  const ceilings = useActiveCeilings();
  const removeSelected = useCADStore((s) => s.removeSelected);
  const resizeWallByLabel = useCADStore((s) => s.resizeWallByLabel);
  const updateWall = useCADStore((s) => s.updateWall);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const storeProducts = useProductStore((s) => s.products);

  // Phase 31 CUSTOM-06 — custom-element placement selectors (open question 1).
  const placedCustoms = useActivePlacedCustomElements();
  const customCatalog = useCustomElements();
  const stairs = useActiveStairs();
  const activeRoomId = useCADStore((s) => s.activeRoomId);
  const clearCustomElementOverrides = useCADStore(
    (s) => s.clearCustomElementOverrides,
  );
  const clearProductOverrides = useCADStore((s) => s.clearProductOverrides);

  // Phase 48 CAM-04 (D-01): camera bookmark actions (Plan 02 NoHistory setters).
  const setSavedCameraOnWallNoHistory = useCADStore((s) => s.setSavedCameraOnWallNoHistory);
  const setSavedCameraOnProductNoHistory = useCADStore((s) => s.setSavedCameraOnProductNoHistory);
  const setSavedCameraOnCeilingNoHistory = useCADStore((s) => s.setSavedCameraOnCeilingNoHistory);
  const setSavedCameraOnCustomElementNoHistory = useCADStore((s) => s.setSavedCameraOnCustomElementNoHistory);
  const clearSavedCameraNoHistory = useCADStore((s) => s.clearSavedCameraNoHistory);

  const id = selectedIds[0];
  const wall = id ? walls[id] : undefined;
  const pp = id ? placedProducts[id] : undefined;
  const ceiling = id ? ceilings[id] : undefined;
  const pce = id ? placedCustoms[id] : undefined;
  const ce = pce ? customCatalog[pce.customElementId] : undefined;
  // Phase 60 STAIRS-01 (D-08, research Q4): sequential `if (entity)` discriminator.
  const stair = id ? stairs[id] : undefined;

  function handleDelete() {
    removeSelected(selectedIds);
    clearSelection();
  }

  // Multi-selection bulk actions (POLISH-05)
  if (selectedIds.length > 1) {
    const wallIds = selectedIds.filter((id) => !!walls[id]);
    const totalCount = selectedIds.length;

    return (
      <div className="absolute right-3 top-3 z-10 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto glass-panel rounded-sm p-4 space-y-3">
        <h3 id="bulk-actions" className="font-mono text-base font-medium text-text-muted">
          Bulk actions
        </h3>
        <div className="font-mono text-[11px] text-accent-light">
          {totalCount} ITEMS SELECTED
          {wallIds.length > 0 && ` (${wallIds.length} WALLS)`}
        </div>

        {wallIds.length > 0 && (
          <div className="space-y-2 border-t border-outline-variant/20 pt-2">
            <div id="paint-walls" className="font-mono text-sm font-medium text-text-muted">Paint all walls</div>
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
                className="w-8 h-7 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer"
              />
              <span className="font-mono text-[11px] text-text-ghost">
                APPLIES TO BOTH SIDES
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleDelete}
          className="w-full font-mono text-sm font-normal text-error tracking-widest py-1 border border-error/30 rounded-sm hover:bg-error/10"
        >
          Delete all ({totalCount})
        </button>
      </div>
    );
  }

  // Phase 62 MEASURE-01 (D-04 / research Q7): replace empty-state with Room
  // properties. When nothing is selected, show width/length/height + auto-area
  // for the active room (live-recalculates as walls move via Zustand subscription).
  if (!wall && !pp && !ceiling && !pce && !stair) {
    const roomActive = useCADStore.getState().activeRoomId;
    const activeDoc = roomActive ? useCADStore.getState().rooms[roomActive] : null;
    const wallList = activeDoc ? Object.values(activeDoc.walls) : [];
    // polygonArea returns 0 for non-closed loops (research pitfall 5) — hide
    // the AREA row in that case so we never display garbage data.
    const areaSqFt = polygonArea(wallList);
    return (
      <div
        className="absolute right-3 top-3 z-10 w-64 glass-panel rounded-sm p-4 space-y-3"
        aria-label="Properties (room)"
      >
        <h3 className="font-mono text-base font-medium text-text-muted">
          Properties
        </h3>
        <div className="font-mono text-xs text-accent-light">
          {(activeDoc?.name ?? "ROOM").toUpperCase()}
        </div>
        <CollapsibleSection id="dimensions" label="Dimensions">
          <div className="space-y-1.5">
            <Row label="WIDTH" value={`${activeDoc?.room.width ?? 0} FT`} />
            <Row label="LENGTH" value={`${activeDoc?.room.length ?? 0} FT`} />
            <Row label="HEIGHT" value={`${activeDoc?.room.wallHeight ?? 0} FT`} />
            {areaSqFt > 0 && <Row label="AREA" value={`${Math.round(areaSqFt)} SQ FT`} />}
          </div>
        </CollapsibleSection>
        <p className="font-mono text-sm text-text-dim leading-snug">
          Select a wall, product, or ceiling to edit its properties.
        </p>
      </div>
    );
  }

  return (
    <div className="absolute right-3 top-3 z-10 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto glass-panel rounded-sm p-4 space-y-3">
      <h3 id="properties" aria-label="Properties" className="font-mono text-base font-medium text-text-muted">
        Properties
      </h3>

      {ceiling && (
        <div className="space-y-2">
          <div className="font-mono text-xs text-accent-light">
            CEILING {ceiling.id.slice(-4).toUpperCase()}
          </div>
          <CollapsibleSection id="dimensions" label="Dimensions">
            <div className="space-y-1.5">
              {/* Phase 65 CEIL-02 — WIDTH + DEPTH override inputs above HEIGHT.
                  Live-preview via NoHistory on every keystroke; Enter/blur
                  commits via the history-pushing variant (single undo). */}
              <CeilingDimInput
                ceiling={ceiling}
                axis="width"
                label="WIDTH"
              />
              <CeilingDimInput
                ceiling={ceiling}
                axis="depth"
                label="DEPTH"
              />
              <Row label="HEIGHT" value={`${ceiling.height.toFixed(1)} FT`} />
              <Row label="VERTICES" value={String(ceiling.points.length)} />
            </div>
          </CollapsibleSection>
          {(ceiling.widthFtOverride !== undefined ||
            ceiling.depthFtOverride !== undefined ||
            ceiling.anchorXFt !== undefined ||
            ceiling.anchorYFt !== undefined) && (
            <button
              type="button"
              onClick={() => useCADStore.getState().clearCeilingOverrides(ceiling.id)}
              className="w-full font-mono text-sm font-normal text-accent hover:text-accent-light tracking-wider py-1 border border-accent/30 rounded-sm"
            >
              Reset size
            </button>
          )}
          <CeilingPaintSection ceilingId={ceiling.id} ceiling={ceiling} />
          <SavedCameraButtons
            kind="ceiling"
            id={ceiling.id}
            hasSavedCamera={!!ceiling.savedCameraPos}
            viewMode={viewMode}
            onSave={(cId, pos, target) => setSavedCameraOnCeilingNoHistory(cId, pos, target)}
            onClear={clearSavedCameraNoHistory}
          />
        </div>
      )}

      {wall && (
        <div className="space-y-2">
          <div className="font-mono text-xs text-accent-light">
            WALL SEGMENT {wall.id.slice(-4).toUpperCase()}
          </div>
          <CollapsibleSection id="dimensions" label="Dimensions">
            <div className="space-y-1.5">
              <EditableRow
                label="LENGTH"
                value={wallLength(wall)}
                suffix="FT"
                onCommit={(v) => resizeWallByLabel(wall.id, v)}
                min={0.5}
                parser={validateInput}
              />
              <EditableRow
                label="THICKNESS"
                value={wall.thickness}
                suffix="FT"
                onCommit={(v) => updateWall(wall.id, { thickness: v })}
                min={0.1}
                step={0.1}
              />
              <EditableRow
                label="HEIGHT"
                value={wall.height}
                suffix="FT"
                onCommit={(v) => updateWall(wall.id, { height: v })}
                min={1}
              />
            </div>
          </CollapsibleSection>
          <CollapsibleSection id="position" label="Position">
            <div className="space-y-1.5">
              <Row
                label="START"
                value={`${wall.start.x.toFixed(1)}, ${wall.start.y.toFixed(1)}`}
              />
              <Row
                label="END"
                value={`${wall.end.x.toFixed(1)}, ${wall.end.y.toFixed(1)}`}
              />
            </div>
          </CollapsibleSection>
          {/* Phase 61 OPEN-01 (D-10): per-opening editor section. */}
          <OpeningsSection wall={wall} />
          <WallSurfacePanel />
          <SavedCameraButtons
            kind="wall"
            id={wall.id}
            hasSavedCamera={!!wall.savedCameraPos}
            viewMode={viewMode}
            onSave={(wId, pos, target) => setSavedCameraOnWallNoHistory(wId, pos, target)}
            onClear={clearSavedCameraNoHistory}
          />
        </div>
      )}

      {pp && (() => {
        const product = productLibrary.find((p) => p.id === pp.productId);
        const libProduct = storeProducts.find((p) => p.id === pp.productId) ?? product;
        return (
          <div className="space-y-2">
            <div className="font-mono text-xs text-accent-light">
              {product?.name?.toUpperCase() ?? "PRODUCT"}
            </div>
            {product && (
              <>
                <CollapsibleSection id="dimensions" label="Dimensions">
                  <div className="space-y-1.5">
                    {hasDimensions(product) ? (
                      <>
                        <Row label="WIDTH" value={`${product.width} FT`} />
                        <Row label="DEPTH" value={`${product.depth} FT`} />
                        <Row label="HEIGHT" value={`${product.height} FT`} />
                      </>
                    ) : (
                      <Row label="SIZE" value="UNSET" />
                    )}
                  </div>
                </CollapsibleSection>
                <CollapsibleSection id="material" label="Material">
                  <div className="space-y-1.5">
                    <Row label="CATEGORY" value={product.category.toUpperCase()} />
                    {product.material && (
                      <Row label="MATERIAL" value={product.material.toUpperCase()} />
                    )}
                  </div>
                </CollapsibleSection>
              </>
            )}
            <CollapsibleSection id="position" label="Position">
              <div className="space-y-1.5">
                <Row
                  label="POSITION"
                  value={`${pp.position.x.toFixed(1)}, ${pp.position.y.toFixed(1)}`}
                />
              </div>
            </CollapsibleSection>
            <CollapsibleSection id="rotation" label="Rotation">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Row label="ROTATION" value={`${pp.rotation.toFixed(0)}°`} />
                </div>
                <RotationPresetChips
                  currentRotation={pp.rotation}
                  onSelect={(deg) =>
                    useCADStore.getState().rotateProduct(pp.id, deg)
                  }
                />
              </div>
            </CollapsibleSection>
            {libProduct && !hasDimensions(libProduct) && (
              <div className="space-y-1.5 pt-2 border-t border-outline-variant/20">
                <span className="font-mono text-[11px] text-text-ghost tracking-wider">
                  SET DIMENSIONS (FT)
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(["width", "depth", "height"] as const).map((axis) => (
                    <input
                      key={axis}
                      type="number"
                      step={0.25}
                      min={0.25}
                      placeholder={axis.charAt(0).toUpperCase()}
                      defaultValue={libProduct[axis] ?? ""}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (v > 0) updateProduct(libProduct.id, { [axis]: v });
                      }}
                      className="w-full px-1.5 py-1 text-[11px] font-mono bg-obsidian-deepest border border-outline-variant/30"
                    />
                  ))}
                </div>
              </div>
            )}
            <SavedCameraButtons
              kind="product"
              id={pp.id}
              hasSavedCamera={!!pp.savedCameraPos}
              viewMode={viewMode}
              onSave={(pId, pos, target) => setSavedCameraOnProductNoHistory(pId, pos, target)}
              onClear={clearSavedCameraNoHistory}
            />
          </div>
        );
      })()}

      {pce && ce && (
        <div className="space-y-2">
          <div className="font-mono text-xs text-accent-light">
            {ce.name.toUpperCase()}
          </div>
          <CollapsibleSection id="dimensions" label="Dimensions">
            <div className="space-y-1.5">
              <Row label="WIDTH" value={`${ce.width} FT`} />
              <Row label="DEPTH" value={`${ce.depth} FT`} />
              <Row label="HEIGHT" value={`${ce.height} FT`} />
            </div>
          </CollapsibleSection>
          <CollapsibleSection id="position" label="Position">
            <div className="space-y-1.5">
              <Row
                label="POSITION"
                value={`${pce.position.x.toFixed(1)}, ${pce.position.y.toFixed(1)}`}
              />
            </div>
          </CollapsibleSection>
          <CollapsibleSection id="rotation" label="Rotation">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Row label="ROTATION" value={`${pce.rotation.toFixed(0)}°`} />
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
          </CollapsibleSection>
          <LabelOverrideInput pce={pce} catalogName={ce.name} />
          {(pce.widthFtOverride !== undefined ||
            pce.depthFtOverride !== undefined) && (
            <button
              type="button"
              onClick={() => clearCustomElementOverrides(pce.id)}
              className="w-full font-mono text-sm font-normal text-accent hover:text-accent-light tracking-wider py-1 border border-accent/30 rounded-sm"
            >
              Reset size
            </button>
          )}
          <SavedCameraButtons
            kind="custom"
            id={pce.id}
            hasSavedCamera={!!pce.savedCameraPos}
            viewMode={viewMode}
            onSave={(ceId, pos, target) => setSavedCameraOnCustomElementNoHistory(ceId, pos, target)}
            onClear={clearSavedCameraNoHistory}
          />
        </div>
      )}

      {pp &&
        (pp.widthFtOverride !== undefined || pp.depthFtOverride !== undefined) && (
          <button
            type="button"
            onClick={() => clearProductOverrides(pp.id)}
            className="w-full font-mono text-sm font-normal text-accent hover:text-accent-light tracking-wider py-1 border border-accent/30 rounded-sm"
          >
            Reset size
          </button>
        )}

      {/* Phase 60 STAIRS-01 (D-08): stair-specific properties section. */}
      {stair && activeRoomId && (
        <>
          <StairSection stair={stair} roomId={activeRoomId} />
          <SavedCameraButtons
            kind="stair"
            id={stair.id}
            hasSavedCamera={!!stair.savedCameraPos}
            viewMode={viewMode}
            onSave={() => { /* dispatched via cadState typed-extension above */ }}
            onClear={clearSavedCameraNoHistory}
          />
        </>
      )}

      <button
        onClick={handleDelete}
        className="w-full py-1.5 rounded-sm font-mono text-sm font-normal bg-red-900/30 text-red-400 border border-red-900/40 hover:bg-red-900/50 transition-colors"
      >
        Delete element
      </button>
    </div>
  );
}

/**
 * Phase 31 CUSTOM-06 — per-placement label override.
 *
 * Live preview on every keystroke via NoHistory (D-09 no debounce).
 * Commit on Enter or blur via the history-pushing variant — exactly ONE
 * history entry per edit session (D-10). Escape rewinds the live-preview
 * via NoHistory back to the original value (mirror Phase 29).
 *
 * Empty string (after trim) commits as `undefined` so the canvas reverts
 * to the catalog name (D-11). Client-enforced 40-char cap (D-12).
 */
function LabelOverrideInput({
  pce,
  catalogName,
}: {
  pce: PlacedCustomElement;
  catalogName: string;
}) {
  const updatePlacedCustomElement = useCADStore(
    (s) => s.updatePlacedCustomElement,
  );
  const updatePlacedCustomElementNoHistory = useCADStore(
    (s) => s.updatePlacedCustomElementNoHistory,
  );
  const [draft, setDraft] = useState<string>(pce.labelOverride ?? "");
  const originalRef = useRef<string | undefined>(pce.labelOverride);

  // Phase 53 CTXMENU-01: auto-focus when "Rename label" context menu action fires.
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingLabelFocus = useUIStore((s) => s.pendingLabelFocus);
  useEffect(() => {
    if (pendingLabelFocus === pce.id && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      useUIStore.getState().setPendingLabelFocus(null);
    }
  }, [pendingLabelFocus, pce.id]);
  // Pitfall guard: Escape calls .blur() to clean up focus, which also fires
  // onBlur → commit(). Escape ran cancel() with the pre-edit value, but
  // commit() reads the stale draft closure (still has the typed text). Set
  // this ref in cancel() so onBlur skips commit for the cancellation cycle.
  const skipNextBlurRef = useRef<boolean>(false);

  // Reseed on selection swap.
  useEffect(() => {
    setDraft(pce.labelOverride ?? "");
    originalRef.current = pce.labelOverride;
  }, [pce.id]);

  function commit() {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }
    const trimmed = draft.trim();
    const finalValue = trimmed === "" ? undefined : draft.slice(0, 40);
    updatePlacedCustomElement(pce.id, { labelOverride: finalValue });
    originalRef.current = finalValue;
  }

  function cancel() {
    skipNextBlurRef.current = true;
    updatePlacedCustomElementNoHistory(pce.id, {
      labelOverride: originalRef.current,
    });
    setDraft(originalRef.current ?? "");
  }

  // Phase 31 CUSTOM-06 D-10 — programmatic test driver. Bypasses the DOM
  // input but exercises the same store-action sequence the keyboard path
  // uses (NoHistory keystrokes + history-pushing commit).
  useEffect(() => {
    if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
    (window as unknown as {
      __driveLabelOverride?: {
        typeAndCommit: (
          pceId: string,
          text: string,
          mode: "enter" | "blur",
        ) => void;
      };
    }).__driveLabelOverride = {
      typeAndCommit: (pceId, text, _mode) => {
        // Live preview: one NoHistory write per cumulative prefix.
        for (let i = 1; i <= text.length; i++) {
          updatePlacedCustomElementNoHistory(pceId, {
            labelOverride: text.slice(0, i),
          });
        }
        // Commit: one history-pushing write.
        const trimmed = text.trim();
        const finalValue = trimmed === "" ? undefined : text.slice(0, 40);
        updatePlacedCustomElement(pceId, { labelOverride: finalValue });
        // mode is observational — Enter and blur are identical per D-10.
        void _mode;
      },
    };
    return () => {
      delete (window as unknown as { __driveLabelOverride?: unknown })
        .__driveLabelOverride;
    };
  }, [pce.id, updatePlacedCustomElement, updatePlacedCustomElementNoHistory]);

  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-[11px] text-text-ghost tracking-wider">
        LABEL_OVERRIDE
      </label>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        maxLength={40}
        placeholder={catalogName.toUpperCase()}
        aria-label="Label override"
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          updatePlacedCustomElementNoHistory(pce.id, { labelOverride: v });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            cancel();
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={commit}
        className="px-2 py-1 font-mono text-[11px] text-text-primary bg-obsidian-deepest border border-outline-variant/30 rounded-sm"
      />
    </div>
  );
}

/**
 * Phase 65 CEIL-02 — WIDTH/DEPTH input for a selected ceiling.
 *
 * Live-preview via resizeCeilingAxisNoHistory on every keystroke; commit on
 * Enter or blur via resizeCeilingAxis (single undo per edit session). Empty
 * commit is a no-op (the dedicated RESET_SIZE button handles clearing).
 *
 * Default value when no override is set: derived from polygonBbox of the
 * original points so users see the current size before editing.
 */
function CeilingDimInput({
  ceiling,
  axis,
  label,
}: {
  ceiling: Ceiling;
  axis: "width" | "depth";
  label: string;
}) {
  const resizeCeilingAxis = useCADStore((s) => s.resizeCeilingAxis);
  const resizeCeilingAxisNoHistory = useCADStore((s) => s.resizeCeilingAxisNoHistory);
  const baseValue =
    axis === "width"
      ? (ceiling.widthFtOverride ?? polygonBbox(ceiling.points).width)
      : (ceiling.depthFtOverride ?? polygonBbox(ceiling.points).depth);
  const [draft, setDraft] = useState<string>(baseValue.toFixed(2));
  // Track the value at the start of an edit session so we can:
  //   1. Roll back live-preview on Escape (mirror Phase 31 LabelOverride).
  //   2. Suppress redundant commit() calls when blur fires after Enter.
  const editStartedRef = useRef<boolean>(false);
  const originalOverrideRef = useRef<number | undefined>(
    axis === "width" ? ceiling.widthFtOverride : ceiling.depthFtOverride,
  );
  // Reseed when ceiling changes / override changes externally (e.g. drag).
  useEffect(() => {
    if (!editStartedRef.current) {
      setDraft(baseValue.toFixed(2));
    }
  }, [ceiling.id, ceiling.widthFtOverride, ceiling.depthFtOverride]);

  function commit() {
    if (!editStartedRef.current) return; // no-op if no edit in progress
    editStartedRef.current = false;
    const trimmed = draft.trim();
    if (trimmed === "") return;
    const v = parseFloat(trimmed);
    if (!isFinite(v) || v <= 0) return;
    // Push exactly one history entry. resizeCeilingAxis pushes its own
    // snapshot; the live-preview NoHistory writes did NOT push anything,
    // so this is the single undo entry for the edit session.
    resizeCeilingAxis(ceiling.id, axis, v);
    originalOverrideRef.current =
      axis === "width" ? v : originalOverrideRef.current;
  }

  return (
    <div className="flex justify-between items-center">
      <label
        className="font-mono text-[11px] text-text-ghost tracking-wider"
        htmlFor={`ceiling-dim-${axis}-${ceiling.id}`}
      >
        {label}
      </label>
      <input
        id={`ceiling-dim-${axis}-${ceiling.id}`}
        type="text"
        aria-label={label}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          editStartedRef.current = true;
          const num = parseFloat(v);
          if (isFinite(num) && num > 0) {
            resizeCeilingAxisNoHistory(ceiling.id, axis, num);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={commit}
        className="w-20 px-1 py-0.5 text-right font-mono text-[11px] text-accent-light bg-obsidian-deepest border border-accent/30 rounded-sm outline-none"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-mono text-[11px] text-text-ghost tracking-wider">{label}</span>
      <span className="font-mono text-[11px] text-accent-light">{value}</span>
    </div>
  );
}

function EditableRow({
  label,
  value,
  suffix,
  onCommit,
  min = 0,
  step = 0.25,
  parser,
}: {
  label: string;
  value: number;
  suffix: string;
  onCommit: (v: number) => void;
  min?: number;
  step?: number;
  parser?: (raw: string) => number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() {
    // flushSync so the <input> is in the DOM synchronously after click —
    // keeps inline-edit deterministic for tests and consistent with the
    // wainscot popover precedent.
    flushSync(() => {
      setDraft(value.toFixed(2));
      setEditing(true);
    });
  }

  function commit() {
    setEditing(false);
    // D-05a: when parser supplied, use it; otherwise preserve parseFloat behavior
    const parsed = parser ? parser(draft) : parseFloat(draft);
    // Silent cancel on null/NaN/non-finite (D-06a)
    if (parsed === null || parsed === undefined || !isFinite(parsed as number)) {
      return;
    }
    const v = parsed as number;
    // Existing min guard
    if (v < min) return;
    // RESEARCH Pitfall #2: no-op guard — suppress commits within float-drift tolerance
    if (Math.abs(v - value) <= 1e-6) return;
    onCommit(v);
  }

  if (editing) {
    return (
      <div className="flex justify-between items-center">
        <span className="font-mono text-[11px] text-text-ghost tracking-wider">{label}</span>
        <input
          autoFocus
          type={parser ? "text" : "number"}
          step={step}
          min={min}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-20 px-1 py-0.5 text-right font-mono text-[11px] text-accent-light bg-obsidian-deepest border border-accent/30 rounded-sm outline-none"
        />
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center group cursor-pointer" onClick={startEdit}>
      <span className="font-mono text-[11px] text-text-ghost tracking-wider">{label}</span>
      <span className="font-mono text-[11px] text-accent-light group-hover:underline">
        {formatFeet(value)} {suffix && <span className="text-text-ghost">{suffix}</span>}
      </span>
    </div>
  );
}

// Phase 33 Plan 08 (GH #87) — test driver for rotation preset chips.
// Gated by MODE === "test" per Phase 31 driver convention. Exposes click +
// lookup helpers so RTL specs can exercise the preset block without
// depending on jsdom hit-tests or Fabric state.
if (import.meta.env.MODE === "test" && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__driveRotationPreset = {
    click: (deg: number) => {
      const btn = document.querySelector(
        `[data-rotation-preset="${deg}"]`,
      ) as HTMLButtonElement | null;
      btn?.click();
    },
    getRotation: (id: string): number | null => {
      const state = useCADStore.getState() as unknown as {
        rooms: Record<
          string,
          {
            placedProducts?: Record<string, { rotation: number }>;
            placedCustomElements?: Record<string, { rotation: number }>;
          }
        >;
        activeRoomId: string | null;
      };
      const room = state.activeRoomId ? state.rooms[state.activeRoomId] : undefined;
      if (!room) return null;
      if (room.placedProducts?.[id]) return room.placedProducts[id].rotation;
      if (room.placedCustomElements?.[id])
        return room.placedCustomElements[id].rotation;
      return null;
    },
    getHistoryLength: () => useCADStore.getState().past.length,
  };
}
