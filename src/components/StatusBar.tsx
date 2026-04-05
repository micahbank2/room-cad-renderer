import { useActiveWalls } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";

const STATUS_MESSAGES: Record<string, string> = {
  select: "CLICK TO SELECT · DRAG TO MOVE · DEL TO REMOVE",
  wall: "CLICK TO PLACE · SHIFT FOR STRAIGHT · ESC TO CANCEL",
  door: "CLICK ON WALL TO PLACE DOOR",
  window: "CLICK ON WALL TO PLACE WINDOW",
  product: "CLICK ON CANVAS TO PLACE PRODUCT · ESC TO CANCEL",
};

export default function StatusBar() {
  const activeTool = useUIStore((s) => s.activeTool);
  const walls = useActiveWalls();
  const wallCount = Object.keys(walls).length;
  const gridSnap = useUIStore((s) => s.gridSnap);
  const cameraMode = useUIStore((s) => s.cameraMode);

  return (
    <div className="h-8 bg-obsidian-deepest flex items-center px-4 ghost-border border-0 border-t shrink-0">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span className="font-mono text-[9px] text-text-ghost tracking-widest">
          {activeTool.toUpperCase()}_TOOL
        </span>
        <span className="font-mono text-[9px] text-text-ghost mx-2">·</span>
        <span className="font-mono text-[9px] text-text-dim tracking-wider">
          {STATUS_MESSAGES[activeTool] ?? ""}
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <span className="font-mono text-[9px] text-text-ghost tracking-wider">
          WALLS: <span className="text-accent-light">{wallCount}</span>
        </span>
        <span className="font-mono text-[9px] text-text-ghost tracking-wider">
          GRID: <span className="text-accent-light">{gridSnap > 0 ? `${gridSnap * 12}"` : "OFF"}</span>
        </span>
        <span className="font-mono text-[9px] text-text-ghost tracking-wider">
          SCALE: <span className="text-accent-light">1:50</span>
        </span>
        <span className="font-mono text-[9px] text-text-ghost tracking-wider">
          CAM: <span className="text-accent-light">{cameraMode === "walk" ? "WALK_MODE" : "ORBIT_MODE"}</span>
        </span>
      </div>
    </div>
  );
}
