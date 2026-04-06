import { useCADStore } from "@/stores/cadStore";
import SwatchPicker from "./SwatchPicker";
import type { Ceiling } from "@/types/cad";

interface Props {
  ceilingId: string;
  ceiling: Ceiling;
}

export default function CeilingPaintSection({ ceilingId, ceiling }: Props) {
  const updateCeiling = useCADStore((s) => s.updateCeiling);

  const handleApplyPaint = (paintId: string) => {
    updateCeiling(ceilingId, { paintId });
  };

  const handleToggleLimeWash = (checked: boolean) => {
    if (!ceiling.paintId) return;
    updateCeiling(ceilingId, { limeWash: checked });
  };

  return (
    <div className="space-y-3 border-t border-outline-variant/20 pt-3">
      <div className="font-mono text-[10px] tracking-widest uppercase text-accent-light">
        CEILING_PAINT
      </div>

      <SwatchPicker
        activePaintId={ceiling.paintId}
        onSelectPaint={handleApplyPaint}
      />

      {/* LIME_WASH checkbox — only relevant when paint is applied */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={ceiling.limeWash ?? false}
          onChange={(e) => handleToggleLimeWash(e.target.checked)}
          disabled={!ceiling.paintId}
          className="accent-accent"
        />
        <span className="font-mono text-[9px] tracking-widest uppercase text-text-dim">
          LIME_WASH_FINISH
        </span>
      </label>
    </div>
  );
}
