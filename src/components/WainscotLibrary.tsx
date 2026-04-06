import { useState, lazy, Suspense } from "react";
import { useWainscotStyleStore } from "@/stores/wainscotStyleStore";
import {
  ALL_STYLES,
  STYLE_META,
  type WainscotStyle,
  type WainscotStyleItem,
} from "@/types/wainscotStyle";

const WainscotPreview3D = lazy(() => import("./WainscotPreview3D"));

export default function WainscotLibrary() {
  const items = useWainscotStyleStore((s) => s.items);
  const addItem = useWainscotStyleStore((s) => s.addItem);
  const removeItem = useWainscotStyleStore((s) => s.removeItem);
  const updateItem = useWainscotStyleStore((s) => s.updateItem);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<WainscotStyleItem, "id">>({
    name: "",
    style: "recessed-panel",
    heightFt: 3,
    color: "#f0ece2",
    ...STYLE_META["recessed-panel"].defaults,
  });

  const meta = STYLE_META[draft.style];

  const selectStyle = (s: WainscotStyle) => {
    const def = STYLE_META[s].defaults;
    setDraft((d) => ({
      ...d,
      style: s,
      heightFt: def.heightFt ?? d.heightFt,
      panelWidth: def.panelWidth,
      plankWidth: def.plankWidth,
      battenWidth: def.battenWidth,
      plankHeight: def.plankHeight,
      stileWidth: def.stileWidth,
      gridRows: def.gridRows,
      depth: def.depth,
    }));
  };

  const handleCreate = () => {
    if (!draft.name.trim()) return;
    addItem({ ...draft, name: draft.name.trim() });
    setDraft({
      name: "",
      style: "recessed-panel",
      heightFt: 3,
      color: "#f0ece2",
      ...STYLE_META["recessed-panel"].defaults,
    });
    setCreating(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-[10px] text-text-ghost tracking-widest uppercase">
          WAINSCOT LIBRARY
        </h3>
        <button
          onClick={() => setCreating((v) => !v)}
          className="font-mono text-[11px] text-accent-light hover:text-accent tracking-widest"
        >
          {creating ? "CANCEL" : "+ NEW"}
        </button>
      </div>

      {creating && (
        <div className="space-y-1.5 bg-obsidian-high rounded-sm p-2 mb-2">
          <input
            type="text"
            placeholder="NAME..."
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="w-full font-mono text-[10px] bg-obsidian-base text-text-primary border border-outline-variant/30 px-2 py-1 rounded-sm placeholder:text-text-ghost"
          />

          <select
            value={draft.style}
            onChange={(e) => selectStyle(e.target.value as WainscotStyle)}
            className="w-full font-mono text-[10px] bg-obsidian-base text-accent-light border border-outline-variant/30 px-2 py-1 rounded-sm"
          >
            {ALL_STYLES.map((s) => (
              <option key={s} value={s}>
                {STYLE_META[s].label}
              </option>
            ))}
          </select>

          {/* Height + color (always shown) */}
          <div className="flex items-center gap-1">
            <NumberKnob
              label="HT"
              value={draft.heightFt}
              step={0.25}
              min={0.5}
              max={8}
              onChange={(v) => setDraft({ ...draft, heightFt: v })}
            />
            <input
              type="color"
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              className="w-7 h-6 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer"
            />
          </div>

          {/* Style-specific knobs */}
          {meta.knobs.length > 0 && (
            <div className="grid grid-cols-2 gap-1">
              {meta.knobs.includes("panelWidth") && (
                <NumberKnob label="PANEL W" value={draft.panelWidth ?? 1.5} step={0.25} min={0.5} max={4}
                  onChange={(v) => setDraft({ ...draft, panelWidth: v })} />
              )}
              {meta.knobs.includes("stileWidth") && (
                <NumberKnob label="STILE W" value={draft.stileWidth ?? 0.33} step={0.08} min={0.08} max={1}
                  onChange={(v) => setDraft({ ...draft, stileWidth: v })} />
              )}
              {meta.knobs.includes("plankWidth") && (
                <NumberKnob label="PLANK W" value={draft.plankWidth ?? 0.25} step={0.08} min={0.08} max={1}
                  onChange={(v) => setDraft({ ...draft, plankWidth: v })} />
              )}
              {meta.knobs.includes("battenWidth") && (
                <NumberKnob label="BATTEN W" value={draft.battenWidth ?? 0.33} step={0.08} min={0.08} max={0.75}
                  onChange={(v) => setDraft({ ...draft, battenWidth: v })} />
              )}
              {meta.knobs.includes("plankHeight") && (
                <NumberKnob label="PLANK H" value={draft.plankHeight ?? 0.5} step={0.08} min={0.17} max={1}
                  onChange={(v) => setDraft({ ...draft, plankHeight: v })} />
              )}
              {meta.knobs.includes("gridRows") && (
                <NumberKnob label="ROWS" value={draft.gridRows ?? 2} step={1} min={1} max={5}
                  onChange={(v) => setDraft({ ...draft, gridRows: Math.round(v) })} />
              )}
              {meta.knobs.includes("depth") && (
                <NumberKnob label="DEPTH" value={draft.depth ?? 0.18} step={0.02} min={0.02} max={0.5}
                  onChange={(v) => setDraft({ ...draft, depth: v })} />
              )}
            </div>
          )}

          {/* Live 3D preview (lazy-loaded) */}
          <Suspense
            fallback={
              <div className="w-full aspect-video bg-obsidian-base rounded-sm border border-outline-variant/30 grid place-items-center">
                <span className="font-mono text-[11px] text-text-ghost">LOADING PREVIEW...</span>
              </div>
            }
          >
            <WainscotPreview3D item={{ id: "preview", ...draft }} />
          </Suspense>

          <button
            onClick={handleCreate}
            disabled={!draft.name.trim()}
            className="w-full font-mono text-[10px] tracking-widest py-1 bg-accent text-white rounded-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            SAVE TO LIBRARY
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="font-mono text-[11px] text-text-ghost text-center py-2">
          NO WAINSCOT STYLES YET
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li
              key={it.id}
              className="bg-obsidian-high rounded-sm px-2 py-1.5"
              onDoubleClick={() => setEditingId(it.id)}
              title="DOUBLE CLICK TO EDIT"
            >
              {editingId === it.id ? (
                <div className="space-y-1 w-full">
                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="w-full font-mono text-[10px] bg-obsidian-base text-text-primary border border-accent/50 px-1 py-0.5 rounded-sm"
                  />
                  <div className="flex items-center gap-1">
                    <NumberKnob
                      label="HT"
                      value={it.heightFt}
                      step={0.25}
                      min={0.5}
                      max={8}
                      onChange={(v) => updateItem(it.id, { heightFt: v })}
                    />
                    <input
                      type="color"
                      value={it.color}
                      onChange={(e) => updateItem(it.id, { color: e.target.value })}
                      className="w-7 h-6 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer"
                    />
                    <button
                      onClick={() => setEditingId(null)}
                      className="font-mono text-[11px] text-accent-light hover:text-accent px-1"
                    >
                      DONE
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-sm border border-outline-variant/30 shrink-0"
                      style={{ backgroundColor: it.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] text-text-primary truncate">
                        {it.name.toUpperCase()}
                      </div>
                      <div className="font-mono text-[11px] text-text-ghost">
                        {STYLE_META[it.style].label} · {it.heightFt}'
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(it.id)}
                    title="Delete from library"
                    className="font-mono text-[11px] text-text-ghost hover:text-text-primary px-1"
                  >
                    ✕
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NumberKnob({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] text-text-ghost block">{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full font-mono text-[10px] bg-obsidian-base text-accent-light border border-outline-variant/30 px-1 py-0.5 rounded-sm"
      />
    </label>
  );
}
