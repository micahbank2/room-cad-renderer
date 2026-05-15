import { useState, useRef } from "react";
import { X } from "lucide-react";
import { uid } from "@/lib/geometry";
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";
import { saveGltfWithDedup } from "@/lib/gltfStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Switch } from "@/components/ui";
import { Upload } from "lucide-react";

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
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[600px] max-w-[600px]">
        <DialogHeader>
          <DialogTitle>ADD PRODUCT</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-5">
            {/* Left: image upload */}
            <div className="w-48 shrink-0">
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className={`aspect-square rounded-smooth-md border border-dashed cursor-pointer flex flex-col items-center justify-center transition-colors ${
                  imageUrl
                    ? "border-ring bg-background"
                    : "border-border/60 bg-background hover:border-accent/40"
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
                    <Upload size={24} className="text-muted-foreground/60 mb-2" />
                    <span className="font-sans text-[8px] text-muted-foreground/60 tracking-wider text-center px-3">
                      DRAG ASSETS HERE
                    </span>
                    <span className="font-sans text-[7px] text-muted-foreground/60/50 mt-1">
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
                <span className="font-sans text-[8px] text-muted-foreground/60 block mt-1 truncate">
                  {imageName}
                </span>
              )}
            </div>

            {/* Right: form fields */}
            <div className="flex-1 space-y-3">
              <label className="block space-y-1">
                <span className="font-sans text-[11px] text-muted-foreground/60 tracking-wider">
                  PRODUCT NAME
                </span>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.G. 'EAMES CHAIR L.01'"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="font-sans text-[11px] text-muted-foreground/60 tracking-wider">
                  CATEGORY
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-9 w-full rounded-smooth-md border border-border bg-background px-3 py-1 text-sm font-sans text-foreground"
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
                  <span className="font-sans text-[11px] text-muted-foreground/60 tracking-wider block">
                    DIMENSIONS (W / D / H)
                  </span>
                  <Switch
                    checked={skipDims}
                    onCheckedChange={setSkipDims}
                    label="Skip dimensions"
                  />
                </div>
                <div className={`grid grid-cols-3 gap-2 ${skipDims ? "opacity-40 pointer-events-none" : ""}`}>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={width}
                      onChange={(e) => setWidth(+e.target.value)}
                      className="pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-sans text-[8px] text-muted-foreground/60">
                      FT
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={depth}
                      onChange={(e) => setDepth(+e.target.value)}
                      className="pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-sans text-[8px] text-muted-foreground/60">
                      FT
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={height}
                      onChange={(e) => setHeight(+e.target.value)}
                      className="pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-sans text-[8px] text-muted-foreground/60">
                      FT
                    </span>
                  </div>
                </div>
              </div>

              <label className="block space-y-1">
                <span className="font-sans text-[11px] text-muted-foreground/60 tracking-wider">
                  MATERIAL FINISH
                </span>
                <Input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="E.G. BRUSHED STEEL"
                />
              </label>

              {/* 3D Model — optional (Phase 55 GLTF-UPLOAD-01) */}
              <div className="space-y-1">
                <span className="font-sans text-[11px] text-muted-foreground/60 tracking-wider">
                  3D MODEL (OPTIONAL)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => gltfRef.current?.click()}
                  >
                    {gltfFile ? gltfFile.name.toUpperCase() : "CHOOSE .GLTF / .GLB"}
                  </Button>
                  {gltfFile && (
                    <button
                      type="button"
                      onClick={() => { setGltfFile(null); setGltfError(null); }}
                      className="text-muted-foreground/60 hover:text-error transition-colors"
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
                  <span className="font-sans text-[8px] text-error block">{gltfError}</span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" type="button" onClick={onClose}>
              CANCEL
            </Button>
            <Button type="submit" disabled={!name}>
              Add to registry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
