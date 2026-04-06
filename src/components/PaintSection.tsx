import { useCADStore } from "@/stores/cadStore";
import SwatchPicker from "./SwatchPicker";
import type { WallSide, Wallpaper } from "@/types/cad";

interface Props {
  wallId: string;
  side: WallSide;
  currentWallpaper?: Wallpaper;
}

export default function PaintSection({ wallId, side, currentWallpaper }: Props) {
  const setWallpaper = useCADStore((s) => s.setWallpaper);
  const applyPaintToAllWalls = useCADStore((s) => s.applyPaintToAllWalls);

  const handleApplyPaint = (paintId: string) => {
    setWallpaper(wallId, side, {
      ...currentWallpaper,
      kind: "paint",
      paintId,
      limeWash: currentWallpaper?.limeWash,
    });
  };

  const handleToggleLimeWash = (checked: boolean) => {
    if (currentWallpaper?.kind !== "paint") return;
    setWallpaper(wallId, side, { ...currentWallpaper, kind: "paint", limeWash: checked });
  };

  return (
    <div className="space-y-3 border-t border-outline-variant/20 pt-3">
      <div className="font-mono text-[10px] tracking-widest uppercase text-accent-light">
        PAINT
      </div>

      <SwatchPicker
        activePaintId={currentWallpaper?.paintId}
        onSelectPaint={handleApplyPaint}
      />

      {/* LIME_WASH checkbox — only relevant when paint is applied */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={currentWallpaper?.limeWash ?? false}
          onChange={(e) => handleToggleLimeWash(e.target.checked)}
          disabled={currentWallpaper?.kind !== "paint"}
          className="accent-accent"
        />
        <span className="font-mono text-[9px] tracking-widest uppercase text-text-dim">
          LIME_WASH_FINISH
        </span>
      </label>

      {/* APPLY_TO_ALL_WALLS button */}
      <button
        onClick={() => {
          if (currentWallpaper?.kind === "paint" && currentWallpaper.paintId) {
            applyPaintToAllWalls(currentWallpaper.paintId, side);
          }
        }}
        disabled={currentWallpaper?.kind !== "paint" || !currentWallpaper?.paintId}
        className="w-full py-2 border border-outline-variant/30 text-text-dim font-mono text-[9px] tracking-widest uppercase hover:border-accent/50 hover:text-accent-light disabled:opacity-40 disabled:cursor-not-allowed"
      >
        APPLY_TO_ALL_WALLS
      </button>
    </div>
  );
}
