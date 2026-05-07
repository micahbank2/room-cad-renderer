/**
 * Phase 68 D-05: unified Material picker. Replaces PaintSection /
 * CeilingPaintSection / FloorMaterialPicker / SurfaceMaterialPicker.
 *
 * Mid-pick preview decision (RESEARCH §"MaterialPicker UX Architecture"):
 * NO mid-pick preview in v1.17 — single click applies, single Ctrl+Z reverts
 * (D-06). Simpler, fewer failure modes. Mid-pick preview can be revisited in
 * v1.18 if Jessica reports the UX feels lifeless.
 *
 * Empty-library state: dispatches `phase68:upload-material` window event so
 * the host can open the existing UploadMaterialModal (Phase 67) without this
 * component having to import it directly.
 *
 * Default action: when `onChange` is omitted, clicking a card calls
 * `useCADStore.getState().applySurfaceMaterial(target, materialId)` directly,
 * which is a single-undo apply per D-06.
 */
import { X } from "lucide-react";
import { useCADStore } from "@/stores/cadStore";
import { useMaterials } from "@/hooks/useMaterials";
import { materialsForSurface } from "@/data/surfaceMaterials";
import { MaterialCard } from "@/components/MaterialCard";
import type { SurfaceTarget } from "@/lib/surfaceMaterial";

export type MaterialPickerSurface =
  | "wallSide"
  | "floor"
  | "ceiling"
  | "customElementFace";

export interface MaterialPickerProps {
  surface: MaterialPickerSurface;
  /**
   * Discriminated union from src/lib/surfaceMaterial.ts pointing at the
   * specific wall side / floor / ceiling / custom-element face. Optional so
   * the Wave 0 RED test (no target) still renders an empty-state picker —
   * production callers always pass `target`.
   */
  target?: SurfaceTarget;
  value: string | undefined;
  /**
   * Optional override for the apply behavior. When omitted, the picker calls
   * `applySurfaceMaterial(target, materialId)` directly on the store (D-06).
   */
  onChange?: (materialId: string | undefined) => void;
  tileSizeOverride?: number;
  onTileSizeChange?: (v: number | undefined) => void;
}

export function MaterialPicker({
  surface,
  target,
  value,
  onChange,
  tileSizeOverride,
  onTileSizeChange,
}: MaterialPickerProps): JSX.Element {
  const { materials } = useMaterials();
  const filtered = materialsForSurface(materials, surface);
  const selected = materials.find((m) => m.id === value);

  const apply = (materialId: string | undefined) => {
    if (onChange) {
      onChange(materialId);
      return;
    }
    if (target) {
      useCADStore.getState().applySurfaceMaterial(target, materialId);
    }
  };

  const setTileSize = (v: number | undefined) => {
    if (onTileSizeChange) {
      onTileSizeChange(v);
      return;
    }
    if (target) {
      useCADStore.getState().applySurfaceTileSize(target, v);
    }
  };

  return (
    <section
      data-testid="material-picker"
      data-surface={surface}
      className="flex flex-col gap-2 p-4 bg-card rounded-md"
    >
      <header className="font-mono text-[--font-size-sm] text-muted-foreground uppercase">
        Material
      </header>

      {filtered.length === 0 ? (
        <div className="flex flex-col gap-2 items-center p-4">
          <p className="font-mono text-[--font-size-sm] text-muted-foreground/80">
            No materials uploaded yet
          </p>
          <button
            type="button"
            className="font-mono text-[--font-size-sm] text-foreground hover:text-foreground"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("phase68:upload-material"),
                );
              }
            }}
          >
            + Upload Material
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {filtered.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              aria-label={`Apply material ${m.name}`}
              aria-pressed={m.id === value}
              data-selected={m.id === value ? "true" : "false"}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  apply(m.id);
                }
              }}
              className={
                m.id === value
                  ? "ring-1 ring-accent rounded-md"
                  : "rounded-md"
              }
            >
              <MaterialCard material={m} onClick={() => apply(m.id)} />
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-2 mt-2">
          <label className="font-mono text-[--font-size-sm] text-muted-foreground/80 uppercase">
            Tile size (override)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              step="0.1"
              min="0.05"
              className="font-mono text-[--font-size-sm] bg-popover p-1 rounded-sm w-20"
              placeholder={selected.tileSizeFt.toString()}
              value={tileSizeOverride ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setTileSize(undefined);
                  return;
                }
                const parsed = parseFloat(raw);
                if (!Number.isNaN(parsed)) setTileSize(parsed);
              }}
            />
            <span className="font-mono text-[--font-size-sm] text-muted-foreground/60">
              FT
            </span>
            {tileSizeOverride !== undefined && (
              <button
                type="button"
                className="font-mono text-[--font-size-sm] text-muted-foreground/80 hover:text-accent"
                onClick={() => setTileSize(undefined)}
              >
                use default
              </button>
            )}
          </div>
        </div>
      )}

      {value && (
        <button
          type="button"
          onClick={() => apply(undefined)}
          className="flex items-center gap-1 font-mono text-[--font-size-sm] text-muted-foreground/80 hover:text-error mt-2"
        >
          <X className="w-3 h-3" /> Clear material
        </button>
      )}
    </section>
  );
}

export default MaterialPicker;
