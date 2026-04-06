import { materialsForSurface } from "@/data/surfaceMaterials";

interface Props {
  surface: "floor" | "ceiling";
  activeId: string | undefined;
  onSelect: (id: string | undefined) => void;
}

export default function SurfaceMaterialPicker({ surface, activeId, onSelect }: Props) {
  const materials = materialsForSurface(surface);

  return (
    <div className="grid grid-cols-4 gap-1">
      {materials.map((m) => {
        const isActive = activeId === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(isActive ? undefined : m.id)}
            className={[
              "p-1 rounded-sm border",
              isActive
                ? "border-accent ring-1 ring-accent/30"
                : "border-outline-variant/20 hover:border-outline-variant/40",
            ].join(" ")}
          >
            <div
              className="w-full aspect-square rounded-sm"
              style={{ backgroundColor: m.color }}
            />
            <span className="font-mono text-[8px] text-text-dim block mt-1 truncate">
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
