import { useRef } from "react";
import { useCADStore, useActiveWalls } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import type { Wallpaper } from "@/types/cad";

/** Appears in PropertiesPanel when exactly one wall is selected. */
export default function WallSurfacePanel() {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const walls = useActiveWalls();
  const setWallpaper = useCADStore((s) => s.setWallpaper);
  const toggleWainscoting = useCADStore((s) => s.toggleWainscoting);
  const toggleCrownMolding = useCADStore((s) => s.toggleCrownMolding);
  const addWallArt = useCADStore((s) => s.addWallArt);
  const removeWallArt = useCADStore((s) => s.removeWallArt);
  const wallpaperFileRef = useRef<HTMLInputElement>(null);
  const artFileRef = useRef<HTMLInputElement>(null);

  if (selectedIds.length !== 1) return null;
  const wall = walls[selectedIds[0]];
  if (!wall) return null;

  const wp = wall.wallpaper;
  const wains = wall.wainscoting;
  const crown = wall.crownMolding;
  const artItems = wall.wallArt ?? [];

  const handleWallpaperColor = (color: string) => {
    setWallpaper(wall.id, { kind: "color", color });
  };

  const handleWallpaperImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const material: Wallpaper = {
        kind: "pattern",
        imageUrl: reader.result as string,
        scaleFt: wp?.scaleFt ?? 2,
      };
      setWallpaper(wall.id, material);
    };
    reader.readAsDataURL(file);
  };

  const handleAddArt = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      addWallArt(wall.id, {
        offset: wall.start && wall.end ? 2 : 1,
        centerY: wall.height / 2,
        width: 2,
        height: 2.5,
        imageUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3 p-3 border-t border-outline-variant/20">
      <h3 className="font-mono text-[10px] text-accent-light tracking-widest uppercase">
        WALL_SURFACE
      </h3>

      {/* Wallpaper */}
      <div>
        <div className="font-mono text-[9px] text-text-dim mb-1">WALLPAPER</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={wp?.color ?? "#f8f5ef"}
            onChange={(e) => handleWallpaperColor(e.target.value)}
            className="w-8 h-7 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer"
          />
          <button
            onClick={() => wallpaperFileRef.current?.click()}
            className="flex-1 font-mono text-[9px] text-text-dim hover:text-accent-light tracking-widest uppercase px-2 py-1 border border-outline-variant/30 rounded-sm"
          >
            UPLOAD_PATTERN
          </button>
          {wp && (
            <button
              onClick={() => setWallpaper(wall.id, undefined)}
              className="font-mono text-[9px] text-text-ghost hover:text-text-primary px-2 py-1"
              title="Remove wallpaper"
            >
              ✕
            </button>
          )}
        </div>
        <input
          ref={wallpaperFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleWallpaperImage(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Wainscoting */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={wains?.enabled ?? false}
            onChange={(e) => toggleWainscoting(wall.id, e.target.checked, wains?.heightFt, wains?.color)}
            className="w-3 h-3 accent-accent rounded-none"
          />
          <span className="font-mono text-[9px] text-text-dim tracking-wider">WAINSCOTING</span>
        </label>
        {wains?.enabled && (
          <div className="ml-5 mt-1 flex items-center gap-2">
            <input
              type="number"
              step="0.25"
              min="0.5"
              max="6"
              value={wains.heightFt}
              onChange={(e) =>
                toggleWainscoting(wall.id, true, parseFloat(e.target.value) || 3, wains.color)
              }
              className="w-16 font-mono text-[9px] bg-obsidian-high text-accent-light border border-outline-variant/30 px-1 py-0.5 rounded-sm"
            />
            <span className="font-mono text-[8px] text-text-ghost">FT</span>
            <input
              type="color"
              value={wains.color}
              onChange={(e) => toggleWainscoting(wall.id, true, wains.heightFt, e.target.value)}
              className="w-6 h-5 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Crown molding */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={crown?.enabled ?? false}
            onChange={(e) =>
              toggleCrownMolding(wall.id, e.target.checked, crown?.heightFt, crown?.color)
            }
            className="w-3 h-3 accent-accent rounded-none"
          />
          <span className="font-mono text-[9px] text-text-dim tracking-wider">CROWN_MOLDING</span>
        </label>
        {crown?.enabled && (
          <div className="ml-5 mt-1 flex items-center gap-2">
            <input
              type="number"
              step="0.08"
              min="0.17"
              max="1"
              value={crown.heightFt}
              onChange={(e) =>
                toggleCrownMolding(wall.id, true, parseFloat(e.target.value) || 0.33, crown.color)
              }
              className="w-16 font-mono text-[9px] bg-obsidian-high text-accent-light border border-outline-variant/30 px-1 py-0.5 rounded-sm"
            />
            <span className="font-mono text-[8px] text-text-ghost">FT</span>
            <input
              type="color"
              value={crown.color}
              onChange={(e) => toggleCrownMolding(wall.id, true, crown.heightFt, e.target.value)}
              className="w-6 h-5 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Wall art */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[9px] text-text-dim tracking-wider">WALL_ART ({artItems.length})</span>
          <button
            onClick={() => artFileRef.current?.click()}
            className="font-mono text-[9px] text-accent-light hover:text-accent tracking-widest"
          >
            + ADD
          </button>
        </div>
        {artItems.length > 0 && (
          <ul className="space-y-1">
            {artItems.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between font-mono text-[9px] text-text-dim px-2 py-1 bg-obsidian-high rounded-sm"
              >
                <span>
                  {a.width.toFixed(1)}' × {a.height.toFixed(1)}' @ {a.offset.toFixed(1)}ft
                </span>
                <button
                  onClick={() => removeWallArt(wall.id, a.id)}
                  className="text-text-ghost hover:text-text-primary"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={artFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleAddArt(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
