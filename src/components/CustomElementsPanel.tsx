import { useState } from "react";
import { useCADStore, useCustomElements, useActiveRoom } from "@/stores/cadStore";
import type { CustomElement } from "@/types/cad";

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
    placeCustomElement(el.id, { x: room.width / 2, y: room.length / 2 });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-[10px] text-text-ghost tracking-widest uppercase">
          CUSTOM_ELEMENTS
        </h3>
        <button
          onClick={() => setCreating((v) => !v)}
          className="font-mono text-[9px] text-accent-light hover:text-accent tracking-widest"
        >
          {creating ? "CANCEL" : "+ NEW"}
        </button>
      </div>

      {creating && (
        <div className="space-y-1.5 bg-obsidian-high rounded-sm p-2 mb-2">
          <input
            type="text"
            placeholder="NAME..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full font-mono text-[10px] bg-obsidian-base text-text-primary border border-outline-variant/30 px-2 py-1 rounded-sm placeholder:text-text-ghost"
          />
          <div className="flex gap-1">
            <button
              onClick={() => setShape("box")}
              className={`flex-1 font-mono text-[9px] tracking-widest py-1 rounded-sm border ${
                shape === "box"
                  ? "border-accent text-accent-light bg-accent/10"
                  : "border-outline-variant/30 text-text-dim"
              }`}
            >
              BOX
            </button>
            <button
              onClick={() => setShape("plane")}
              className={`flex-1 font-mono text-[9px] tracking-widest py-1 rounded-sm border ${
                shape === "plane"
                  ? "border-accent text-accent-light bg-accent/10"
                  : "border-outline-variant/30 text-text-dim"
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
              className="w-7 h-6 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer"
            />
            <span className="font-mono text-[9px] text-text-dim">{color}</span>
          </div>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full font-mono text-[10px] tracking-widest py-1 bg-accent text-white rounded-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            CREATE
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="font-mono text-[9px] text-text-ghost text-center py-2">
          NO_CUSTOM_ELEMENTS_YET
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((el) => (
            <li
              key={el.id}
              className="flex items-center justify-between bg-obsidian-high rounded-sm px-2 py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-3 h-3 rounded-sm border border-outline-variant/30 shrink-0"
                  style={{ backgroundColor: el.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] text-text-primary truncate">
                    {el.name.toUpperCase()}
                  </div>
                  <div className="font-mono text-[8px] text-text-ghost">
                    {el.shape} · {el.width}'×{el.depth}'
                    {el.shape === "box" ? `×${el.height}'` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handlePlace(el)}
                  title="Place in room"
                  className="font-mono text-[9px] text-accent-light hover:text-accent px-1"
                >
                  +
                </button>
                <button
                  onClick={() => removeCustomElement(el.id)}
                  title="Delete from library"
                  className="font-mono text-[9px] text-text-ghost hover:text-text-primary px-1"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DimInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="font-mono text-[8px] text-text-ghost block">{label}</span>
      <input
        type="number"
        step="0.5"
        min="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full font-mono text-[10px] bg-obsidian-base text-accent-light border border-outline-variant/30 px-1 py-0.5 rounded-sm"
      />
    </label>
  );
}
