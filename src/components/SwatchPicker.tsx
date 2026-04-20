import { useState, useEffect, useRef } from "react";
import { HexColorPicker } from "react-colorful";
import { FB_COLORS, HUE_FAMILIES } from "@/data/farrowAndBall";
import { usePaintStore } from "@/stores/paintStore";
import { useCADStore } from "@/stores/cadStore";
import { resolvePaintHex } from "@/lib/colorUtils";

interface Props {
  /** Currently applied paintId — highlighted with accent ring. */
  activePaintId?: string;
  /** Called when the user clicks a swatch to apply it. */
  onSelectPaint: (paintId: string) => void;
}

const HUE_CHIP_COLORS: Record<string, string> = {
  WHITES: "#f4f0e8",
  NEUTRALS: "#b5a99a",
  BLUES: "#2d4a6e",
  GREENS: "#6b7c5e",
  PINKS: "#c7918a",
  YELLOWS: "#d4a84b",
  BLACKS: "#2a2a2a",
};

export default function SwatchPicker({ activePaintId, onSelectPaint }: Props) {
  const customColors = usePaintStore((s) => s.customColors);
  // Select raw state slice — return stable reference (undefined) when absent to avoid
  // re-triggering render on every store snapshot (React 18 "getSnapshot should be cached").
  const recentPaintsRaw = useCADStore((s) => (s as any).recentPaints as string[] | undefined);
  const recentPaints: string[] = recentPaintsRaw ?? [];
  const addCustomPaint = useCADStore((s) => s.addCustomPaint);
  const removeCustomPaint = useCADStore((s) => s.removeCustomPaint);

  const [activeHue, setActiveHue] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#7c5bf0");
  const [deleteMenuId, setDeleteMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close delete menu on outside click
  useEffect(() => {
    if (!deleteMenuId) return;
    const handleClick = () => setDeleteMenuId(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [deleteMenuId]);

  // Cleanup tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const filteredColors = FB_COLORS.filter(
    (c) =>
      (!activeHue || c.hueFamily === activeHue) &&
      (!search || c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSwatchMouseEnter = (id: string, name: string, e: React.MouseEvent) => {
    tooltipTimerRef.current = setTimeout(() => {
      setTooltipId(id);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }, 300);
  };

  const handleSwatchMouseLeave = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltipId(null);
  };

  const handleSaveColor = () => {
    if (!newName.trim()) return;
    addCustomPaint({ name: newName.trim(), hex: newHex, hueFamily: undefined });
    setShowAddForm(false);
    setNewName("");
    setNewHex("#7c5bf0");
  };

  return (
    <div className="space-y-3">
      {/* RECENTLY_USED row */}
      <div>
        <span className="font-mono text-[9px] tracking-widest uppercase text-text-dim">
          RECENTLY USED
        </span>
        <div className="flex gap-1 flex-wrap mt-1">
          {recentPaints.length === 0 ? (
            <span className="font-mono text-[9px] text-text-ghost">NO RECENT COLORS</span>
          ) : (
            recentPaints.map((id) => {
              const hex = resolvePaintHex(id, customColors);
              return (
                <button
                  key={id}
                  title={id}
                  onClick={() => onSelectPaint(id)}
                  className={`w-[18px] h-[18px] rounded-sm border ${
                    activePaintId === id
                      ? "ring-2 ring-accent ring-offset-1 ring-offset-obsidian-low"
                      : "hover:ring-1 hover:ring-white/30"
                  }`}
                  style={{ backgroundColor: hex, borderColor: "transparent" }}
                />
              );
            })
          )}
        </div>
      </div>

      {/* HUE_FILTER chips */}
      <div>
        <span className="font-mono text-[9px] tracking-widest uppercase text-text-dim">
          HUE FILTER
        </span>
        <div className="flex gap-1 items-center flex-wrap mt-1">
          {HUE_FAMILIES.map((family) => (
            <button
              key={family}
              onClick={() => setActiveHue((prev) => (prev === family ? null : family))}
              className={`w-[14px] h-[14px] rounded-sm border ${
                activeHue === family
                  ? "border-accent bg-accent/10"
                  : "border-outline-variant/30 hover:border-outline-variant/60"
              }`}
              style={{ backgroundColor: HUE_CHIP_COLORS[family] }}
              title={family}
            />
          ))}
        </div>
      </div>

      {/* SEARCH_COLORS input */}
      <input
        type="text"
        placeholder="SEARCH BY NAME"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-obsidian-high border border-outline-variant/20 rounded-sm px-2 py-1 font-mono text-[9px] text-text-primary placeholder:text-text-ghost focus:border-accent/50 outline-none"
      />

      {/* F&B_CATALOG swatch grid */}
      <div>
        <span className="font-mono text-[9px] tracking-widest uppercase text-text-dim">
          F&amp;B CATALOG ({filteredColors.length})
        </span>
        <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto mt-1">
          {filteredColors.length === 0 ? (
            <div className="col-span-8 text-center py-2 font-mono text-[9px] text-text-ghost">
              NO COLORS FOUND
            </div>
          ) : (
            filteredColors.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectPaint(c.id)}
                onMouseEnter={(e) => handleSwatchMouseEnter(c.id, c.name, e)}
                onMouseLeave={handleSwatchMouseLeave}
                className={`w-[20px] h-[20px] rounded-sm ${
                  activePaintId === c.id
                    ? "ring-2 ring-accent ring-offset-1 ring-offset-obsidian-low"
                    : "hover:ring-1 hover:ring-white/30"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))
          )}
        </div>
      </div>

      {/* MY_COLORS section */}
      <div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-widest uppercase text-text-dim">
            MY COLORS
          </span>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="font-mono text-[9px] text-text-dim hover:text-accent-light"
          >
            + ADD COLOR
          </button>
        </div>
        <div className="flex gap-1 flex-wrap mt-1">
          {customColors.length === 0 ? (
            <span className="font-mono text-[9px] text-text-ghost">NO CUSTOM COLORS</span>
          ) : (
            customColors.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectPaint(c.id)}
                onMouseEnter={(e) => handleSwatchMouseEnter(c.id, c.name, e)}
                onMouseLeave={handleSwatchMouseLeave}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDeleteMenuId(c.id);
                  setMenuPos({ x: e.clientX, y: e.clientY });
                }}
                className={`w-[20px] h-[20px] rounded-sm ${
                  activePaintId === c.id
                    ? "ring-2 ring-accent ring-offset-1 ring-offset-obsidian-low"
                    : "hover:ring-1 hover:ring-white/30"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))
          )}
        </div>

        {/* Inline add-color form */}
        {showAddForm && (
          <div className="mt-2 space-y-2 p-2 bg-obsidian-mid border border-outline-variant/20 rounded-sm">
            <input
              type="text"
              placeholder="COLOR NAME"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveColor();
              }}
              className="w-full bg-obsidian-high border border-outline-variant/20 rounded-sm px-2 py-1 font-mono text-[9px] text-text-primary placeholder:text-text-ghost outline-none focus:border-accent/50"
            />
            <HexColorPicker
              color={newHex}
              onChange={setNewHex}
              style={{ width: "160px", height: "120px" }}
            />
            <button
              onClick={handleSaveColor}
              disabled={!newName.trim()}
              className={
                newName.trim()
                  ? "font-mono text-[9px] text-accent-light hover:text-accent cursor-pointer"
                  : "font-mono text-[9px] text-text-ghost cursor-not-allowed"
              }
            >
              SAVE COLOR
            </button>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltipId && (
        <div
          className="fixed z-50 font-mono text-[8px] text-text-primary bg-obsidian-highest border border-outline-variant/30 rounded-sm px-1 py-1 pointer-events-none"
          style={{ left: tooltipPos.x + 8, top: tooltipPos.y - 24 }}
        >
          {(() => {
            const fb = FB_COLORS.find((c) => c.id === tooltipId);
            if (fb) return fb.name;
            const custom = customColors.find((c) => c.id === tooltipId);
            return custom?.name ?? tooltipId;
          })()}
        </div>
      )}

      {/* Context menu for deleting custom swatches */}
      {deleteMenuId && (
        <div
          className="fixed z-50 bg-obsidian-highest border border-outline-variant/30 rounded-sm px-2 py-1"
          style={{ left: menuPos.x, top: menuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="font-mono text-[9px] text-error"
            onClick={() => {
              removeCustomPaint(deleteMenuId);
              setDeleteMenuId(null);
            }}
          >
            DELETE
          </button>
        </div>
      )}
    </div>
  );
}
