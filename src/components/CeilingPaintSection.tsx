import { useCADStore } from "@/stores/cadStore";
import SwatchPicker from "./SwatchPicker";
import SurfaceMaterialPicker from "./SurfaceMaterialPicker";
import { SURFACE_MATERIALS } from "@/data/surfaceMaterials";
import type { Ceiling } from "@/types/cad";

interface Props {
  ceilingId: string;
  ceiling: Ceiling;
}

export default function CeilingPaintSection({ ceilingId, ceiling }: Props) {
  const updateCeiling = useCADStore((s) => s.updateCeiling);
  const setCeilingSurfaceMaterial = useCADStore((s) => s.setCeilingSurfaceMaterial);

  const handleApplyPaint = (paintId: string) => {
    updateCeiling(ceilingId, { paintId, surfaceMaterialId: undefined });
  };

  // Phase 34 — apply a user-uploaded texture to this ceiling.
  // Phase 42 BUG-01 — write `scaleFt` at apply-time so per-ceiling tile
  // size is isolated from the catalog (mirrors FloorMaterialPicker +
  // WallSurfacePanel apply-time pattern). Closes GH #96.
  const handleCeilingUserTexture = (id: string, tileSizeFt: number) => {
    updateCeiling(ceilingId, {
      userTextureId: id,
      scaleFt: tileSizeFt,
      surfaceMaterialId: undefined,
    });
  };

  const handleToggleLimeWash = (checked: boolean) => {
    if (!ceiling.paintId) return;
    updateCeiling(ceilingId, { limeWash: checked });
  };

  const hasMaterial = Boolean(ceiling.surfaceMaterialId);

  return (
    <div className="space-y-3 border-t border-outline-variant/20 pt-3">
      {/* SURFACE_MATERIAL section */}
      <div
        className={[
          "font-mono text-[10px] tracking-widest uppercase",
          hasMaterial ? "text-accent-light" : "text-text-ghost",
        ].join(" ")}
      >
        SURFACE MATERIAL
      </div>

      <SurfaceMaterialPicker
        surface="ceiling"
        activeId={ceiling.surfaceMaterialId}
        onSelect={(id) => setCeilingSurfaceMaterial(ceilingId, id)}
        onSelectUserTexture={handleCeilingUserTexture}
        selectedUserTextureId={ceiling.userTextureId}
      />

      {hasMaterial && (
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] text-accent-light">
            MATERIAL: {SURFACE_MATERIALS[ceiling.surfaceMaterialId!]?.label}
          </div>
          <button
            onClick={() => setCeilingSurfaceMaterial(ceilingId, undefined)}
            className="font-mono text-[10px] text-text-ghost hover:text-text-primary tracking-widest uppercase py-1"
          >
            CLEAR MATERIAL
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-outline-variant/20 pt-3 mt-3" />

      {/* CEILING_PAINT section */}
      <div
        className={[
          "font-mono text-[10px] tracking-widest uppercase",
          !hasMaterial && ceiling.paintId ? "text-accent-light" : "text-text-ghost",
        ].join(" ")}
      >
        CEILING PAINT
      </div>

      <div className={hasMaterial ? "opacity-60" : undefined}>
        {hasMaterial && (
          <div className="mb-1">
            <span className="font-mono text-[8px] text-text-ghost tracking-wider italic">
              SELECT PAINT TO REPLACE MATERIAL
            </span>
          </div>
        )}

        <SwatchPicker
          activePaintId={ceiling.paintId}
          onSelectPaint={handleApplyPaint}
        />

        {/* LIME_WASH checkbox — only relevant when paint is applied */}
        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={ceiling.limeWash ?? false}
            onChange={(e) => handleToggleLimeWash(e.target.checked)}
            disabled={!ceiling.paintId}
            className="accent-accent"
          />
          <span className="font-mono text-[9px] tracking-widest uppercase text-text-dim">
            LIME WASH FINISH
          </span>
        </label>
      </div>
    </div>
  );
}
