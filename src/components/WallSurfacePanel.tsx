import { useRef, useState, useMemo } from "react";
import { useCADStore, useActiveWalls } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { angle } from "@/lib/geometry";
import { useFramedArtStore } from "@/stores/framedArtStore";
import { useWainscotStyleStore } from "@/stores/wainscotStyleStore";
import { FRAME_PRESETS } from "@/types/framedArt";
import { STYLE_META } from "@/types/wainscotStyle";
import { MaterialPicker } from "./MaterialPicker";

/** Appears in PropertiesPanel when exactly one wall is selected. */
export default function WallSurfacePanel() {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const walls = useActiveWalls();
  const activeSide = useUIStore((s) => s.activeWallSide);
  const focusWallSide = useUIStore((s) => s.focusWallSide);
  const toggleWainscoting = useCADStore((s) => s.toggleWainscoting);
  const toggleCrownMolding = useCADStore((s) => s.toggleCrownMolding);
  const addWallArt = useCADStore((s) => s.addWallArt);
  const removeWallArt = useCADStore((s) => s.removeWallArt);
  const copyWallSide = useCADStore((s) => s.copyWallSide);
  const swapWallSides = useCADStore((s) => s.swapWallSides);
  const artFileRef = useRef<HTMLInputElement>(null);
  const framedArtItems = useFramedArtStore((s) => s.items);
  const wainscotStyles = useWainscotStyleStore((s) => s.items);
  const [showLibrary, setShowLibrary] = useState(false);

  // Detect which side faces the room interior (centroid of all wall endpoints)
  const interiorSide = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const w = walls[selectedIds[0]];
    if (!w) return null;
    const allWalls = Object.values(walls);
    if (allWalls.length < 2) return null;
    // Room centroid = average of all wall midpoints
    let cx = 0, cy = 0;
    for (const ww of allWalls) {
      cx += (ww.start.x + ww.end.x) / 2;
      cy += (ww.start.y + ww.end.y) / 2;
    }
    cx /= allWalls.length;
    cy /= allWalls.length;
    // Wall perpendicular (Side A direction = left of start→end)
    const a = angle(w.start, w.end);
    const perpAngle = a + Math.PI / 2;
    const perpX = Math.cos(perpAngle);
    const perpY = Math.sin(perpAngle);
    // Wall midpoint
    const mx = (w.start.x + w.end.x) / 2;
    const my = (w.start.y + w.end.y) / 2;
    // Side A is in the -perp direction (left), Side B is +perp (right)
    // Check which direction the centroid is relative to the wall
    const toCentroidX = cx - mx;
    const toCentroidY = cy - my;
    const dot = toCentroidX * perpX + toCentroidY * perpY;
    // dot < 0 → centroid is on Side A (left), dot > 0 → centroid is on Side B (right)
    return dot < 0 ? "A" as const : "B" as const;
  }, [selectedIds, walls]);

  if (selectedIds.length !== 1) return null;
  const wall = walls[selectedIds[0]];
  if (!wall) return null;

  const wains = wall.wainscoting?.[activeSide];
  const crown = wall.crownMolding?.[activeSide];
  const artItems = (wall.wallArt ?? []).filter((a) => (a.side ?? "A") === activeSide);

  // Phase 68 D-05: per-side material lookup. Replaces wallpaper + paint state.
  const sideMaterialId = activeSide === "A" ? wall.materialIdA : wall.materialIdB;
  const sideScaleFt = activeSide === "A" ? wall.scaleFtA : wall.scaleFtB;

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
        side: activeSide,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddFromLibrary = (itemId: string) => {
    const item = framedArtItems.find((i) => i.id === itemId);
    if (!item) return;
    addWallArt(wall.id, {
      offset: 2,
      centerY: wall.height / 2,
      width: 2,
      height: 2.5,
      imageUrl: item.imageUrl,
      frameStyle: item.frameStyle,
      side: activeSide,
    });
    setShowLibrary(false);
  };

  return (
    <div className="space-y-3 p-3 border-t border-border/50">
      <h3 className="font-sans text-[10px] text-foreground tracking-widest uppercase">
        WALL SURFACE
      </h3>

      {/* Side toggle (Phase 17) */}
      <div className="flex gap-1">
        {(["A", "B"] as const).map((s) => (
          <button
            key={s}
            onClick={() => focusWallSide(wall.id, s)}
            className={`flex-1 font-sans text-[11px] tracking-widest py-2 rounded-smooth-md border ${
              activeSide === s
                ? "border-accent text-foreground bg-accent/10"
                : "border-border/60 text-muted-foreground/80"
            }`}
          >
            Side {s}
            {interiorSide === s && (
              <span className="text-[8px] text-success ml-1">Interior</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => swapWallSides(wall.id)}
          className="flex-1 font-sans text-[11px] text-muted-foreground/80 hover:text-accent tracking-widest py-1.5 border border-border/60 rounded-smooth-md hover:bg-accent/10"
        >
          Swap A/B
        </button>
        <button
          onClick={() => {
            const target = activeSide === "A" ? "B" : "A";
            copyWallSide(wall.id, activeSide, target);
          }}
          className="flex-1 font-sans text-[11px] text-foreground hover:text-accent tracking-widest py-1.5 border border-ring rounded-smooth-md hover:bg-accent/10"
        >
          Copy to {activeSide === "A" ? "B" : "A"}
        </button>
      </div>

      {/* Phase 68 D-05: unified Material picker replaces wallpaper + paint pickers.
          Legacy PaintSection / SurfaceMaterialPicker remain on disk for v1.18 cleanup. */}
      <MaterialPicker
        surface="wallSide"
        target={{ kind: "wallSide", wallId: wall.id, side: activeSide }}
        value={sideMaterialId}
        tileSizeOverride={sideScaleFt}
      />

      {/* Wainscoting — pick from library (Phase 16) */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={wains?.enabled ?? false}
            onChange={(e) =>
              toggleWainscoting(
                wall.id,
                activeSide,
                e.target.checked,
                wains?.heightFt,
                wains?.color,
                wains?.styleItemId
              )
            }
            className="w-3 h-3 accent-accent rounded-none"
          />
          <span className="font-sans text-[11px] text-muted-foreground/80 tracking-wider">Wainscoting</span>
        </label>
        {wains?.enabled && (
          <div className="ml-5 mt-1 space-y-1">
            {wainscotStyles.length === 0 ? (
              <div className="font-sans text-[8px] text-muted-foreground/60">
                Create style in library first
              </div>
            ) : (
              <select
                value={wains.styleItemId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || undefined;
                  const selected = id ? wainscotStyles.find((s) => s.id === id) : null;
                  toggleWainscoting(
                    wall.id,
                    activeSide,
                    true,
                    selected?.heightFt ?? wains.heightFt,
                    selected?.color ?? wains.color,
                    id
                  );
                }}
                className="w-full font-sans text-[11px] bg-accent text-foreground border border-border/60 px-1 py-0.5 rounded-smooth-md"
              >
                <option value="">(LEGACY DEFAULT)</option>
                {wainscotStyles.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name.toUpperCase()} · {STYLE_META[it.style].label}
                  </option>
                ))}
              </select>
            )}
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
              toggleCrownMolding(wall.id, activeSide, e.target.checked, crown?.heightFt, crown?.color)
            }
            className="w-3 h-3 accent-accent rounded-none"
          />
          <span className="font-sans text-[11px] text-muted-foreground/80 tracking-wider">CROWN MOLDING</span>
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
                toggleCrownMolding(wall.id, activeSide, true, parseFloat(e.target.value) || 0.33, crown.color)
              }
              className="w-16 font-sans text-[11px] bg-accent text-foreground border border-border/60 px-1 py-0.5 rounded-smooth-md"
            />
            <span className="font-sans text-[8px] text-muted-foreground/60">FT</span>
            <input
              type="color"
              value={crown.color}
              onChange={(e) =>
                toggleCrownMolding(wall.id, activeSide, true, crown.heightFt, e.target.value)
              }
              className="w-6 h-5 bg-transparent border border-border/60 rounded-smooth-md cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Wall art */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-sans text-[11px] text-muted-foreground/80 tracking-wider">
            WALL ART ({artItems.length})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLibrary((v) => !v)}
              className="font-sans text-[11px] text-foreground hover:text-accent tracking-widest"
            >
              {showLibrary ? "CLOSE" : "+ LIB"}
            </button>
            <button
              onClick={() => artFileRef.current?.click()}
              className="font-sans text-[11px] text-foreground hover:text-accent tracking-widest"
            >
              + ADD
            </button>
          </div>
        </div>
        {showLibrary && (
          <div className="bg-accent rounded-smooth-md p-2 mb-1 max-h-40 overflow-y-auto">
            {framedArtItems.length === 0 ? (
              <div className="font-sans text-[11px] text-muted-foreground/60 text-center py-1">
                ART LIBRARY EMPTY
              </div>
            ) : (
              <ul className="space-y-1">
                {framedArtItems.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => handleAddFromLibrary(it.id)}
                      className="w-full flex items-center gap-2 px-1 py-1 hover:bg-secondary rounded-smooth-md"
                    >
                      <div
                        className="w-5 h-5 rounded-smooth-md overflow-hidden shrink-0 border"
                        style={{
                          borderColor: FRAME_PRESETS[it.frameStyle].color,
                          borderWidth: Math.max(1, FRAME_PRESETS[it.frameStyle].width * 8),
                        }}
                      >
                        <img
                          src={it.imageUrl}
                          alt={it.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="font-sans text-[11px] text-muted-foreground/80 truncate">
                        {it.name.toUpperCase()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {artItems.length > 0 && (
          <ul className="space-y-1">
            {artItems.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between font-sans text-[11px] text-muted-foreground/80 px-2 py-1 bg-accent rounded-smooth-md"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="truncate">
                    {a.width.toFixed(1)}' × {a.height.toFixed(1)}' @ {a.offset.toFixed(1)}ft
                  </span>
                  {a.frameStyle && a.frameStyle !== "none" && (
                    <input
                      type="color"
                      value={a.frameColorOverride ?? FRAME_PRESETS[a.frameStyle].color}
                      onFocus={() =>
                        useCADStore.getState().updateWallArt(wall.id, a.id, {
                          frameColorOverride: a.frameColorOverride ?? FRAME_PRESETS[a.frameStyle].color,
                        })
                      }
                      onChange={(e) =>
                        useCADStore.getState().updateWallArtNoHistory(wall.id, a.id, {
                          frameColorOverride: e.target.value,
                        })
                      }
                      title="FRAME COLOR OVERRIDE"
                      className="w-5 h-4 bg-transparent border border-border/60 rounded-smooth-md cursor-pointer shrink-0"
                    />
                  )}
                </div>
                <button
                  onClick={() => removeWallArt(wall.id, a.id)}
                  className="text-muted-foreground/60 hover:text-foreground shrink-0"
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
