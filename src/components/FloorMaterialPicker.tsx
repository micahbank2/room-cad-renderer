import { useRef } from "react";
import { useCADStore, useActiveRoomDoc } from "@/stores/cadStore";
import { FLOOR_PRESETS, FLOOR_PRESET_IDS, type FloorPresetId } from "@/data/floorMaterials";
import SurfaceMaterialPicker from "./SurfaceMaterialPicker";
import type { FloorMaterial } from "@/types/cad";

export default function FloorMaterialPicker() {
  const doc = useActiveRoomDoc();
  const setFloorMaterial = useCADStore((s) => s.setFloorMaterial);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const current = doc?.floorMaterial;
  const isCustom = current?.kind === "custom";
  const currentPresetId: string =
    current?.kind === "preset" && current.presetId ? current.presetId : "DEFAULT";

  const handlePreset = (presetId: FloorPresetId | "DEFAULT") => {
    if (presetId === "DEFAULT") {
      setFloorMaterial(undefined);
      return;
    }
    const preset = FLOOR_PRESETS[presetId];
    const material: FloorMaterial = {
      kind: "preset",
      presetId,
      scaleFt: current?.scaleFt ?? preset.defaultScaleFt,
      rotationDeg: current?.rotationDeg ?? 0,
    };
    setFloorMaterial(material);
  };

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const material: FloorMaterial = {
        kind: "custom",
        imageUrl: reader.result as string,
        scaleFt: current?.scaleFt ?? 2,
        rotationDeg: current?.rotationDeg ?? 0,
      };
      setFloorMaterial(material);
    };
    reader.readAsDataURL(file);
  };

  const handleScaleChange = (value: number) => {
    if (!current) return;
    setFloorMaterial({ ...current, scaleFt: Math.max(0.1, value) });
  };

  const handleRotationChange = (value: number) => {
    if (!current) return;
    setFloorMaterial({ ...current, rotationDeg: value });
  };

  return (
    <div>
      <h3 className="font-mono text-[10px] text-text-ghost tracking-widest uppercase mb-2">
        FLOOR MATERIAL
      </h3>

      {/* Preset swatch grid */}
      <SurfaceMaterialPicker
        surface="floor"
        activeId={isCustom ? undefined : (currentPresetId === "DEFAULT" ? undefined : currentPresetId)}
        onSelect={(id) => handlePreset((id ?? "DEFAULT") as FloorPresetId | "DEFAULT")}
      />

      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full font-mono text-[10px] text-text-ghost hover:text-text-primary tracking-widest uppercase py-1 border border-outline-variant/20 rounded-sm mt-2"
      >
        {isCustom ? "CUSTOM IMAGE" : "UPLOAD IMAGE..."}
      </button>

      {/* Color swatch preview */}
      {!isCustom && currentPresetId !== "DEFAULT" && (
        <div className="flex items-center gap-2 mb-2 mt-2">
          <div
            className="w-4 h-4 rounded-sm border border-outline-variant/30"
            style={{ backgroundColor: FLOOR_PRESETS[currentPresetId as FloorPresetId].color }}
          />
          <span className="font-mono text-[9px] text-text-dim">
            {FLOOR_PRESETS[currentPresetId as FloorPresetId].color}
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />

      {/* Scale + rotation controls (only when a material is chosen) */}
      {current && (
        <div className="space-y-1.5 mt-2">
          <label className="block">
            <span className="font-mono text-[9px] text-text-dim block">SCALE (ft)</span>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={current.scaleFt}
              onChange={(e) => handleScaleChange(parseFloat(e.target.value) || 1)}
              className="w-full font-mono text-[10px] bg-obsidian-high text-accent-light border border-outline-variant/30 px-2 py-1 rounded-sm"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[9px] text-text-dim block">ROTATION (°)</span>
            <input
              type="number"
              step="15"
              value={current.rotationDeg}
              onChange={(e) => handleRotationChange(parseFloat(e.target.value) || 0)}
              className="w-full font-mono text-[10px] bg-obsidian-high text-accent-light border border-outline-variant/30 px-2 py-1 rounded-sm"
            />
          </label>
          <button
            onClick={() => setFloorMaterial(undefined)}
            className="w-full font-mono text-[9px] text-text-ghost hover:text-text-primary tracking-widest uppercase py-1 mt-1"
          >
            RESET TO DEFAULT
          </button>
        </div>
      )}
    </div>
  );
}
