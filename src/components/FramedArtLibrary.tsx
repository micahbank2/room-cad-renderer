import { useState, useRef } from "react";
import { useFramedArtStore } from "@/stores/framedArtStore";
import { FRAME_PRESETS, FRAME_STYLES, type FrameStyle } from "@/types/framedArt";

export default function FramedArtLibrary() {
  const items = useFramedArtStore((s) => s.items);
  const addItem = useFramedArtStore((s) => s.addItem);
  const removeItem = useFramedArtStore((s) => s.removeItem);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("thin-black");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (!name.trim() || !imageUrl) return;
    addItem({ name: name.trim(), imageUrl, frameStyle });
    setName("");
    setImageUrl("");
    setFrameStyle("thin-black");
    setCreating(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-[10px] text-text-ghost tracking-widest uppercase">
          ART_LIBRARY
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full font-mono text-[9px] tracking-widest py-1 bg-obsidian-base text-text-dim border border-outline-variant/30 rounded-sm hover:text-text-primary"
          >
            {imageUrl ? "CHANGE_IMAGE" : "+ UPLOAD_IMAGE"}
          </button>
          {imageUrl && (
            <div className="w-full aspect-video bg-obsidian-base rounded-sm border border-outline-variant/30 overflow-hidden">
              <img src={imageUrl} alt="preview" className="w-full h-full object-contain" />
            </div>
          )}
          <select
            value={frameStyle}
            onChange={(e) => setFrameStyle(e.target.value as FrameStyle)}
            className="w-full font-mono text-[10px] bg-obsidian-base text-accent-light border border-outline-variant/30 px-2 py-1 rounded-sm"
          >
            {FRAME_STYLES.map((s) => (
              <option key={s} value={s}>
                {FRAME_PRESETS[s].label}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !imageUrl}
            className="w-full font-mono text-[10px] tracking-widest py-1 bg-accent text-white rounded-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            SAVE_TO_LIBRARY
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="font-mono text-[9px] text-text-ghost text-center py-2">
          NO_ART_YET
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => {
            const preset = FRAME_PRESETS[it.frameStyle];
            return (
              <li
                key={it.id}
                className="flex items-center justify-between bg-obsidian-high rounded-sm px-2 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-6 h-6 rounded-sm overflow-hidden shrink-0 border"
                    style={{ borderColor: preset.color, borderWidth: Math.max(1, preset.width * 8) }}
                  >
                    <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] text-text-primary truncate">
                      {it.name.toUpperCase()}
                    </div>
                    <div className="font-mono text-[8px] text-text-ghost">
                      {preset.label}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(it.id)}
                  title="Delete from library"
                  className="font-mono text-[9px] text-text-ghost hover:text-text-primary px-1 shrink-0"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
