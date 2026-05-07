import { useState } from "react";
import { useCADStore, useCustomElements, useActiveRoom } from "@/stores/cadStore";
import type { CustomElement } from "@/types/cad";
import { LibraryCard } from "@/components/library";

export default function CustomElementsPanel() {
  const elements = useCustomElements();
  const addCustomElement = useCADStore((s) => s.addCustomElement);
  const removeCustomElement = useCADStore((s) => s.removeCustomElement);
  const placeCustomElement = useCADStore((s) => s.placeCustomElement);
  const room = useActiveRoom() ?? { width: 20, length: 16, wallHeight: 8 };
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [shape, setShape] = useState<"box" | "plane">("box");
  const [width, setWidth] = useState(3);
  const [depth, setDepth] = useState(2);
  const [height, setHeight] = useState(2.5);
  const [color, setColor] = useState("#8a7b65");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = Object.values(elements);

  const handleCreate = () => {
    if (!name.trim()) return;
    addCustomElement({
      name: name.trim(),
      shape,
      width,
      depth,
      height,
      color,
    });
    setName("");
    setCreating(false);
  };

  const handlePlace = (el: CustomElement) => {
    setSelectedId(el.id);
    placeCustomElement(el.id, { x: room.width / 2, y: room.length / 2 });
  };

  /**
   * Build a tiny inline SVG data URL for the color preview thumbnail.
   * Custom elements don't have images; they have a color swatch.
   */
  const buildColorThumb = (hex: string): string => {
    const safe = hex.replace("#", "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="%23${safe}"/></svg>`;
    return `data:image/svg+xml;utf8,${svg}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-[10px] text-muted-foreground/60 tracking-widest uppercase">
          CUSTOM ELEMENTS
        </h3>
        <button
          onClick={() => setCreating((v) => !v)}
          className="font-mono text-[9px] text-foreground hover:text-accent tracking-widest"
        >
          {creating ? "CANCEL" : "+ NEW"}
        </button>
      </div>

      {creating && (
        <div className="space-y-1.5 bg-accent rounded-sm p-2 mb-2">
          <input
            type="text"
            placeholder="NAME..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full font-mono text-[10px] bg-background text-foreground border border-border/60 px-2 py-1 rounded-sm placeholder:text-muted-foreground/60"
          />
          <div className="flex gap-1">
            <button
              onClick={() => setShape("box")}
              className={`flex-1 font-mono text-[9px] tracking-widest py-1 rounded-sm border ${
                shape === "box"
                  ? "border-accent text-foreground bg-accent/10"
                  : "border-border/60 text-muted-foreground/80"
              }`}
            >
              BOX
            </button>
            <button
              onClick={() => setShape("plane")}
              className={`flex-1 font-mono text-[9px] tracking-widest py-1 rounded-sm border ${
                shape === "plane"
                  ? "border-accent text-foreground bg-accent/10"
                  : "border-border/60 text-muted-foreground/80"
              }`}
            >
              PLANE
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <DimInput label="W" value={width} onChange={setWidth} />
            <DimInput label="D" value={depth} onChange={setDepth} />
            {shape === "box" && <DimInput label="H" value={height} onChange={setHeight} />}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-7 h-6 bg-transparent border border-border/60 rounded-sm cursor-pointer"
            />
            <span className="font-mono text-[9px] text-muted-foreground/80">{color}</span>
          </div>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full font-mono text-[10px] tracking-widest py-1 bg-primary text-primary-foreground rounded-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            CREATE
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="font-mono text-[9px] text-muted-foreground/60 text-center py-2">
          NO CUSTOM ELEMENTS YET
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((el) => (
            <LibraryCard
              key={el.id}
              thumbnail={buildColorThumb(el.color)}
              label={`${el.name} · ${el.shape} · ${el.width}'×${el.depth}'${el.shape === "box" ? `×${el.height}'` : ""}`}
              selected={selectedId === el.id}
              onClick={() => handlePlace(el)}
              onRemove={() => removeCustomElement(el.id)}
              variant="list"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DimInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="font-mono text-[8px] text-muted-foreground/60 block">{label}</span>
      <input
        type="number"
        step="0.5"
        min="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full font-mono text-[10px] bg-background text-foreground border border-border/60 px-1 py-0.5 rounded-sm"
      />
    </label>
  );
}
