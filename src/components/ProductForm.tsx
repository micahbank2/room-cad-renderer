import { useState, useRef } from "react";
import { uid } from "@/lib/geometry";
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";

interface Props {
  onAdd: (product: Product) => void;
}

export default function ProductForm({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [width, setWidth] = useState(3);
  const [depth, setDepth] = useState(2);
  const [height, setHeight] = useState(3);
  const [skipDims, setSkipDims] = useState(false);
  const [material, setMaterial] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !imageUrl) return;

    onAdd({
      id: `prod_${uid()}`,
      name,
      category,
      width: skipDims ? null : width,
      depth: skipDims ? null : depth,
      height: skipDims ? null : height,
      material,
      imageUrl,
      textureUrls: [],
    });

    // Reset
    setName("");
    setWidth(3);
    setDepth(2);
    setHeight(3);
    setMaterial("");
    setImageUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        placeholder="Product name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full px-2 py-1.5 rounded border border-border text-sm focus:outline-none focus:border-ring"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full px-2 py-1.5 rounded border border-border text-sm focus:outline-none focus:border-ring"
      >
        {PRODUCT_CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={skipDims}
          onChange={(e) => setSkipDims(e.target.checked)}
          className="w-3 h-3 accent-accent"
        />
        <span className="font-sans text-[8px] text-muted-foreground/60 tracking-wider">
          SKIP DIMENSIONS
        </span>
      </label>
      <div className={`grid grid-cols-3 gap-1.5 ${skipDims ? "opacity-40 pointer-events-none" : ""}`}>
        <label className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground">W (ft)</span>
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={width}
            onChange={(e) => setWidth(+e.target.value)}
            className="w-full px-1.5 py-1 rounded border border-border text-xs focus:outline-none focus:border-ring"
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground">D (ft)</span>
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={depth}
            onChange={(e) => setDepth(+e.target.value)}
            className="w-full px-1.5 py-1 rounded border border-border text-xs focus:outline-none focus:border-ring"
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground">H (ft)</span>
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={height}
            onChange={(e) => setHeight(+e.target.value)}
            className="w-full px-1.5 py-1 rounded border border-border text-xs focus:outline-none focus:border-ring"
          />
        </label>
      </div>
      <input
        type="text"
        placeholder="Material / finish (optional)"
        value={material}
        onChange={(e) => setMaterial(e.target.value)}
        className="w-full px-2 py-1.5 rounded border border-border text-sm focus:outline-none focus:border-ring"
      />
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
        />
        {imageUrl && (
          <img
            src={imageUrl}
            alt="preview"
            className="mt-1.5 w-12 h-12 object-contain rounded border border-border"
          />
        )}
      </div>
      <button
        type="submit"
        disabled={!name || !imageUrl}
        className="w-full py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
      >
        Add to Library
      </button>
    </form>
  );
}
