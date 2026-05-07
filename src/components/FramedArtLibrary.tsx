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
        <h3 className="font-sans text-[10px] text-muted-foreground/60 tracking-widest uppercase">
          ART LIBRARY
        </h3>
        <button
          onClick={() => setCreating((v) => !v)}
          className="font-sans text-[9px] text-foreground hover:text-accent tracking-widest"
        >
          {creating ? "CANCEL" : "+ NEW"}
        </button>
      </div>

      {creating && (
        <div className="space-y-1.5 bg-accent rounded-smooth-md p-2 mb-2">
          <input
            type="text"
            placeholder="NAME..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full font-sans text-[10px] bg-background text-foreground border border-border/60 px-2 py-1 rounded-smooth-md placeholder:text-muted-foreground/60"
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
            className="w-full font-sans text-[9px] tracking-widest py-1 bg-background text-muted-foreground/80 border border-border/60 rounded-smooth-md hover:text-foreground"
          >
            {imageUrl ? "CHANGE IMAGE" : "+ UPLOAD IMAGE"}
          </button>
          {imageUrl && (
            <div className="w-full aspect-video bg-background rounded-smooth-md border border-border/60 overflow-hidden">
              <img src={imageUrl} alt="preview" className="w-full h-full object-contain" />
            </div>
          )}
          <select
            value={frameStyle}
            onChange={(e) => setFrameStyle(e.target.value as FrameStyle)}
            className="w-full font-sans text-[10px] bg-background text-foreground border border-border/60 px-2 py-1 rounded-smooth-md"
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
            className="w-full font-sans text-[10px] tracking-widest py-1 bg-primary text-primary-foreground rounded-smooth-md hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            SAVE TO LIBRARY
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="font-sans text-[9px] text-muted-foreground/60 text-center py-2">
          NO ART YET
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => {
            const preset = FRAME_PRESETS[it.frameStyle];
            return (
              <li
                key={it.id}
                className="flex items-center justify-between bg-accent rounded-smooth-md px-2 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-6 h-6 rounded-smooth-md overflow-hidden shrink-0 border"
                    style={{ borderColor: preset.color, borderWidth: Math.max(1, preset.width * 8) }}
                  >
                    <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-sans text-[10px] text-foreground truncate">
                      {it.name.toUpperCase()}
                    </div>
                    <div className="font-sans text-[8px] text-muted-foreground/60">
                      {preset.label}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(it.id)}
                  title="Delete from library"
                  className="font-sans text-[9px] text-muted-foreground/60 hover:text-foreground px-1 shrink-0"
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
