import { useEffect, useState } from "react";
import { materialsForSurface } from "@/data/surfaceMaterials";
import { CategoryTabs, type CategoryTab } from "@/components/library/CategoryTabs";
import { MyTexturesList } from "@/components/MyTexturesList";
import { useUserTextures } from "@/hooks/useUserTextures";
import { generateBatch } from "@/three/swatchThumbnailGenerator";
import { MaterialThumbnail } from "@/components/MaterialThumbnail";

interface Props {
  surface: "floor" | "ceiling";
  activeId: string | undefined;
  onSelect: (id: string | undefined) => void;
  /** When provided, the picker exposes a MY TEXTURES tab (Phase 34 LIB-06).
   *  Invoked when Jessica clicks a user-uploaded texture card. The host is
   *  responsible for dispatching the appropriate cadStore action. */
  onSelectUserTexture?: (id: string, tileSizeFt: number) => void;
  /** Currently-applied userTextureId on this surface — highlights that card. */
  selectedUserTextureId?: string;
}

export default function SurfaceMaterialPicker({
  surface,
  activeId,
  onSelect,
  onSelectUserTexture,
  selectedUserTextureId,
}: Props) {
  const materials = materialsForSurface(surface);
  const { textures } = useUserTextures();
  const [activeTab, setActiveTab] = useState<string>("presets");

  // Phase 45 THUMB-01: warm the thumbnail cache for every visible swatch on
  // mount / surface change. Fire-and-forget — each MaterialThumbnail re-renders
  // independently as its own generateThumbnail() resolves. The .catch() is a
  // belt-and-suspenders guard for environments without WebGL (jsdom/happy-dom
  // test runs, or hostile browser contexts). MaterialThumbnail will still show
  // its solid hex placeholder if the cache stays empty (D-06 / D-07).
  useEffect(() => {
    generateBatch(materials).catch(() => {
      /* swallow — placeholder tiles remain visible as designed */
    });
  }, [materials]);

  const showTextureTab = Boolean(onSelectUserTexture);

  const grid = (
    <div className="grid grid-cols-4 gap-1">
      {materials.map((m) => {
        const isActive = activeId === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(isActive ? undefined : m.id)}
            className={[
              "p-1 rounded-smooth-md border",
              isActive
                ? "border-accent ring-1 ring-accent/30"
                : "border-border/50 hover:border-border/40",
            ].join(" ")}
          >
            <MaterialThumbnail materialId={m.id} fallbackColor={m.color} />
            <span className="font-sans text-[8px] text-muted-foreground/80 block mt-1 truncate">
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (!showTextureTab) return grid;

  const tabs: CategoryTab[] = [
    { id: "presets", label: "PRESETS" },
    {
      id: "my-textures",
      label: "MY TEXTURES",
      count: textures.length > 0 ? textures.length : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <CategoryTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
      {activeTab === "my-textures" ? (
        <MyTexturesList
          selectedId={selectedUserTextureId}
          onSelect={(id, tileSizeFt) => onSelectUserTexture!(id, tileSizeFt)}
        />
      ) : (
        grid
      )}
    </div>
  );
}
