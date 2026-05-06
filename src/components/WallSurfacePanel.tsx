import { useRef, useState, useMemo } from "react";
import { useCADStore, useActiveWalls } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { angle } from "@/lib/geometry";
import { useFramedArtStore } from "@/stores/framedArtStore";
import { useWainscotStyleStore } from "@/stores/wainscotStyleStore";
import { useUserTextures } from "@/hooks/useUserTextures";
import type { Wallpaper } from "@/types/cad";
import { FRAME_PRESETS } from "@/types/framedArt";
import { STYLE_META } from "@/types/wainscotStyle";
import PaintSection from "./PaintSection";
import { CategoryTabs, type CategoryTab } from "@/components/library/CategoryTabs";
import { MyTexturesList } from "@/components/MyTexturesList";

/** Appears in PropertiesPanel when exactly one wall is selected. */
export default function WallSurfacePanel() {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const walls = useActiveWalls();
  const activeSide = useUIStore((s) => s.activeWallSide);
  const setActiveSide = useUIStore((s) => s.setActiveWallSide);
  const focusWallSide = useUIStore((s) => s.focusWallSide);
  const setWallpaper = useCADStore((s) => s.setWallpaper);
  const toggleWainscoting = useCADStore((s) => s.toggleWainscoting);
  const toggleCrownMolding = useCADStore((s) => s.toggleCrownMolding);
  const addWallArt = useCADStore((s) => s.addWallArt);
  const removeWallArt = useCADStore((s) => s.removeWallArt);
  const copyWallSide = useCADStore((s) => s.copyWallSide);
  const swapWallSides = useCADStore((s) => s.swapWallSides);
  const wallpaperFileRef = useRef<HTMLInputElement>(null);
  const artFileRef = useRef<HTMLInputElement>(null);
  const framedArtItems = useFramedArtStore((s) => s.items);
  const wainscotStyles = useWainscotStyleStore((s) => s.items);
  const [showLibrary, setShowLibrary] = useState(false);
  // Phase 34 — WALLPAPER source tab (presets/upload vs MY TEXTURES).
  const { textures: userTextures } = useUserTextures();
  const [wallpaperTab, setWallpaperTab] = useState<string>("presets");

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

  const wp = wall.wallpaper?.[activeSide];
  const wains = wall.wainscoting?.[activeSide];
  const crown = wall.crownMolding?.[activeSide];
  const artItems = (wall.wallArt ?? []).filter((a) => (a.side ?? "A") === activeSide);

  const handleWallpaperColor = (color: string) => {
    setWallpaper(wall.id, activeSide, { kind: "color", color });
  };

  const handleWallpaperImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Default to STRETCH (scaleFt=0) — users mostly upload wallpaper murals
      const material: Wallpaper = {
        kind: "pattern",
        imageUrl: reader.result as string,
        scaleFt: 0,
      };
      setWallpaper(wall.id, activeSide, material);
    };
    reader.readAsDataURL(file);
  };

  const toggleTile = () => {
    if (!wp || wp.kind !== "pattern") return;
    const newScale = (wp.scaleFt ?? 0) > 0 ? 0 : 2;
    setWallpaper(wall.id, activeSide, { ...wp, scaleFt: newScale });
  };

  // Phase 66 (TILE-02, #105): per-surface tile-size override. Range 0.5-10 ft.
  // Clamps to safe range to prevent zero/negative values that break texture.repeat.
  const setTileSize = (value: number) => {
    if (!wp || wp.kind !== "pattern") return;
    const clamped = Math.max(0.5, Math.min(10, value));
    setWallpaper(wall.id, activeSide, { ...wp, scaleFt: clamped });
  };

  // Phase 34 — apply a user-uploaded texture as wallpaper on the active side.
  const handleWallpaperUserTexture = (id: string, tileSizeFt: number) => {
    const material: Wallpaper = {
      kind: "pattern",
      userTextureId: id,
      scaleFt: tileSizeFt,
    };
    setWallpaper(wall.id, activeSide, material);
  };

  const wallpaperTabs: CategoryTab[] = [
    { id: "presets", label: "PRESETS" },
    {
      id: "my-textures",
      label: "MY TEXTURES",
      count: userTextures.length > 0 ? userTextures.length : undefined,
    },
  ];

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
    <div className="space-y-3 p-3 border-t border-outline-variant/20">
      <h3 className="font-mono text-[10px] text-accent-light tracking-widest uppercase">
        WALL SURFACE
      </h3>

      {/* Side toggle (Phase 17) */}
      <div className="flex gap-1">
        {(["A", "B"] as const).map((s) => (
          <button
            key={s}
            onClick={() => focusWallSide(wall.id, s)}
            className={`flex-1 font-mono text-[11px] tracking-widest py-2 rounded-sm border ${
              activeSide === s
                ? "border-accent text-accent-light bg-accent/10"
                : "border-outline-variant/30 text-text-dim"
            }`}
          >
            SIDE {s}
            {interiorSide === s && (
              <span className="text-[8px] text-success ml-1">INTERIOR</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => swapWallSides(wall.id)}
          className="flex-1 font-mono text-[11px] text-text-dim hover:text-accent tracking-widest py-1.5 border border-outline-variant/30 rounded-sm hover:bg-accent/10"
        >
          SWAP A/B
        </button>
        <button
          onClick={() => {
            const target = activeSide === "A" ? "B" : "A";
            copyWallSide(wall.id, activeSide, target);
          }}
          className="flex-1 font-mono text-[11px] text-accent-light hover:text-accent tracking-widest py-1.5 border border-accent/20 rounded-sm hover:bg-accent/10"
        >
          COPY TO {activeSide === "A" ? "B" : "A"}
        </button>
      </div>

      {/* Wallpaper */}
      <div>
        <div className="font-mono text-[11px] text-text-dim mb-1">WALLPAPER</div>
        <CategoryTabs
          tabs={wallpaperTabs}
          activeId={wallpaperTab}
          onChange={setWallpaperTab}
        />
        {wallpaperTab === "my-textures" ? (
          <MyTexturesList
            selectedId={wp?.kind === "pattern" ? wp.userTextureId : undefined}
            onSelect={handleWallpaperUserTexture}
          />
        ) : (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="color"
            value={wp?.color ?? "#f8f5ef"}
            onChange={(e) => handleWallpaperColor(e.target.value)}
            className="w-8 h-7 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer"
          />
          <button
            onClick={() => wallpaperFileRef.current?.click()}
            className="flex-1 font-mono text-[11px] text-text-dim hover:text-accent-light tracking-widest uppercase px-2 py-1 border border-outline-variant/30 rounded-sm"
          >
            UPLOAD PATTERN
          </button>
          {wp && (
            <button
              onClick={() => setWallpaper(wall.id, activeSide, undefined)}
              className="font-mono text-[11px] text-text-ghost hover:text-text-primary px-2 py-1"
              title="Remove wallpaper"
            >
              ✕
            </button>
          )}
        </div>
        )}
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
        {wp?.kind === "pattern" && (
          <div className="mt-1 space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(wp.scaleFt ?? 0) > 0}
                onChange={toggleTile}
                className="w-3 h-3 accent-accent rounded-none"
              />
              <span className="font-mono text-[11px] text-text-dim tracking-wider">
                TILE PATTERN {(wp.scaleFt ?? 0) > 0 ? `(${wp.scaleFt}ft)` : "(stretch)"}
              </span>
            </label>
            {/* Phase 66 (TILE-02, #105): per-surface tile-size input. Visible only when tiling is on. */}
            {(wp.scaleFt ?? 0) > 0 && (
              <label className="block">
                <span className="font-mono text-[9px] text-text-dim block">TILE SIZE (ft)</span>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={wp.scaleFt}
                  onChange={(e) => setTileSize(parseFloat(e.target.value) || 2)}
                  data-testid="wallpaper-tile-size"
                  className="w-full font-mono text-[10px] bg-obsidian-high text-accent-light border border-outline-variant/30 px-2 py-1 rounded-sm"
                />
              </label>
            )}
          </div>
        )}
      </div>

      {/* Paint — F&B catalog + custom colors (Phase 18) */}
      <PaintSection wallId={wall.id} side={activeSide} currentWallpaper={wp} />

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
          <span className="font-mono text-[11px] text-text-dim tracking-wider">WAINSCOTING</span>
        </label>
        {wains?.enabled && (
          <div className="ml-5 mt-1 space-y-1">
            {wainscotStyles.length === 0 ? (
              <div className="font-mono text-[8px] text-text-ghost">
                CREATE STYLE IN LIBRARY FIRST
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
                className="w-full font-mono text-[11px] bg-obsidian-high text-accent-light border border-outline-variant/30 px-1 py-0.5 rounded-sm"
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
          <span className="font-mono text-[11px] text-text-dim tracking-wider">CROWN MOLDING</span>
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
              className="w-16 font-mono text-[11px] bg-obsidian-high text-accent-light border border-outline-variant/30 px-1 py-0.5 rounded-sm"
            />
            <span className="font-mono text-[8px] text-text-ghost">FT</span>
            <input
              type="color"
              value={crown.color}
              onChange={(e) =>
                toggleCrownMolding(wall.id, activeSide, true, crown.heightFt, e.target.value)
              }
              className="w-6 h-5 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Wall art */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[11px] text-text-dim tracking-wider">
            WALL ART ({artItems.length})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLibrary((v) => !v)}
              className="font-mono text-[11px] text-accent-light hover:text-accent tracking-widest"
            >
              {showLibrary ? "CLOSE" : "+ LIB"}
            </button>
            <button
              onClick={() => artFileRef.current?.click()}
              className="font-mono text-[11px] text-accent-light hover:text-accent tracking-widest"
            >
              + ADD
            </button>
          </div>
        </div>
        {showLibrary && (
          <div className="bg-obsidian-high rounded-sm p-2 mb-1 max-h-40 overflow-y-auto">
            {framedArtItems.length === 0 ? (
              <div className="font-mono text-[11px] text-text-ghost text-center py-1">
                ART LIBRARY EMPTY
              </div>
            ) : (
              <ul className="space-y-1">
                {framedArtItems.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => handleAddFromLibrary(it.id)}
                      className="w-full flex items-center gap-2 px-1 py-1 hover:bg-obsidian-highest rounded-sm"
                    >
                      <div
                        className="w-5 h-5 rounded-sm overflow-hidden shrink-0 border"
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
                      <div className="font-mono text-[11px] text-text-dim truncate">
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
                className="flex items-center justify-between font-mono text-[11px] text-text-dim px-2 py-1 bg-obsidian-high rounded-sm"
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
                      className="w-5 h-4 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer shrink-0"
                    />
                  )}
                </div>
                <button
                  onClick={() => removeWallArt(wall.id, a.id)}
                  className="text-text-ghost hover:text-text-primary shrink-0"
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
