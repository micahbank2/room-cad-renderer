import { useState, useRef } from "react";
import { X } from "lucide-react";
import { uid } from "@/lib/geometry";
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";
import { saveGltfWithDedup } from "@/lib/gltfStore";

interface Props {
  onAdd: (product: Product) => void;
  onClose: () => void;
}

export default function AddProductModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [width, setWidth] = useState(3);
  const [depth, setDepth] = useState(2);
  const [height, setHeight] = useState(3);
  const [skipDims, setSkipDims] = useState(false);
  const [material, setMaterial] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [gltfFile, setGltfFile] = useState<File | null>(null);
  const [gltfError, setGltfError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const gltfRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function validateGltf(file: File): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext !== "gltf" && ext !== "glb") return "FILE MUST BE .GLTF OR .GLB";
    if (file.size > 25 * 1024 * 1024) return "FILE EXCEEDS 25MB LIMIT";
    return null;
    // DO NOT check file.type — MIME is inconsistent across browsers (Research §Focus Area 5)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;

    let gltfId: string | undefined;
    if (gltfFile) {
      const result = await saveGltfWithDedup({ blob: gltfFile, name: gltfFile.name });
      gltfId = result.id;
    }

    onAdd({
      id: `prod_${uid()}`,
      name,
      category,
      width: skipDims ? null : width,
      depth: skipDims ? null : depth,
      height: skipDims ? null : height,
      material,
      imageUrl: imageUrl ?? "",
      textureUrls: [],
      ...(gltfId ? { gltfId } : {}),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-obsidian-deepest/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[600px] bg-obsidian-mid/90 backdrop-blur-xl border border-outline-variant/20 rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <h2 className="font-mono text-sm text-text-primary tracking-widest">
            ADD PRODUCT
          </h2>
          <button
            onClick={onClose}
            className="text-text-ghost hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div className="flex gap-5">
            {/* Left: image upload */}
            <div className="w-48 shrink-0">
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className={`aspect-square rounded-sm border border-dashed cursor-pointer flex flex-col items-center justify-center transition-colors ${
                  imageUrl
                    ? "border-accent/30 bg-obsidian-deepest"
                    : "border-outline-variant/30 bg-obsidian-deepest hover:border-accent/40"
                }`}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="preview"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-2xl text-text-ghost mb-2">
                      cloud_upload
                    </span>
                    <span className="font-mono text-[8px] text-text-ghost tracking-wider text-center px-3">
                      DRAG ASSETS HERE
                    </span>
                    <span className="font-mono text-[7px] text-text-ghost/50 mt-1">
                      JPG, PNG, GLB (MAX 20MB)
                    </span>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  className="hidden"
                />
              </div>
              {imageName && (
                <span className="font-mono text-[8px] text-text-ghost block mt-1 truncate">
                  {imageName}
                </span>
              )}
            </div>

            {/* Right: form fields */}
            <div className="flex-1 space-y-3">
              <label className="block space-y-1">
                <span className="font-mono text-[9px] text-text-ghost tracking-wider">
                  PRODUCT NAME
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.G. 'EAMES CHAIR L.01'"
                  className="w-full px-3 py-2 text-xs"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="font-mono text-[9px] text-text-ghost tracking-wider">
                  CATEGORY
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] text-text-ghost tracking-wider block">
                    DIMENSIONS (W / D / H)
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDims}
                      onChange={(e) => setSkipDims(e.target.checked)}
                      className="w-3 h-3 accent-accent"
                    />
                    <span className="font-mono text-[8px] text-text-ghost tracking-wider">
                      SKIP DIMENSIONS
                    </span>
                  </label>
                </div>
                <div className={`grid grid-cols-3 gap-2 ${skipDims ? "opacity-40 pointer-events-none" : ""}`}>
                  <div className="relative">
                    <input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={width}
                      onChange={(e) => setWidth(+e.target.value)}
                      className="w-full px-3 py-2 text-xs pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[8px] text-text-ghost">
                      FT
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={depth}
                      onChange={(e) => setDepth(+e.target.value)}
                      className="w-full px-3 py-2 text-xs pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[8px] text-text-ghost">
                      FT
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={height}
                      onChange={(e) => setHeight(+e.target.value)}
                      className="w-full px-3 py-2 text-xs pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[8px] text-text-ghost">
                      FT
                    </span>
                  </div>
                </div>
              </div>

              <label className="block space-y-1">
                <span className="font-mono text-[9px] text-text-ghost tracking-wider">
                  MATERIAL FINISH
                </span>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="E.G. BRUSHED STEEL"
                  className="w-full px-3 py-2 text-xs"
                />
              </label>

              {/* 3D Model — optional (Phase 55 GLTF-UPLOAD-01) */}
              <div className="space-y-1">
                <span className="font-mono text-[9px] text-text-ghost tracking-wider">
                  3D MODEL (OPTIONAL)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => gltfRef.current?.click()}
                    className="font-mono text-[9px] px-3 py-1.5 border border-outline-variant/30 rounded-sm text-text-dim hover:text-text-primary hover:border-accent/40 transition-colors"
                  >
                    {gltfFile ? gltfFile.name.toUpperCase() : "CHOOSE .GLTF / .GLB"}
                  </button>
                  {gltfFile && (
                    <button
                      type="button"
                      onClick={() => { setGltfFile(null); setGltfError(null); }}
                      className="text-text-ghost hover:text-error transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <input
                    ref={gltfRef}
                    data-testid="gltf-file-input"
                    type="file"
                    accept=".gltf,.glb"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const err = validateGltf(f);
                      if (err) { setGltfError(err); setGltfFile(null); }
                      else { setGltfFile(f); setGltfError(null); }
                      e.target.value = ""; // allow re-select of same file
                    }}
                    className="hidden"
                  />
                </div>
                {gltfError && (
                  <span className="font-mono text-[8px] text-error block">{gltfError}</span>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[10px] tracking-widest px-4 py-2 text-text-dim hover:text-text-primary transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!name}
              className="font-mono text-[10px] tracking-widest px-5 py-2 bg-accent text-white rounded-sm hover:opacity-90 active:scale-95 disabled:opacity-30 transition-all shadow-[0_0_15px_rgba(124,91,240,0.2)]"
            >
              ADD TO REGISTRY
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
