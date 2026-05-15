import { useActiveWalls } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";

const STATUS_MESSAGES: Record<string, string> = {
  select: "CLICK TO SELECT · DRAG TO MOVE · DEL TO REMOVE",
  wall: "CLICK TO PLACE · SHIFT FOR STRAIGHT · ESC TO CANCEL",
  door: "CLICK ON WALL TO PLACE DOOR",
  window: "CLICK ON WALL TO PLACE WINDOW",
  product: "CLICK ON CANVAS TO PLACE PRODUCT · ESC TO CANCEL",
  ceiling: "CLICK TO ADD VERTICES · CLICK FIRST POINT OR DBL-CLICK TO CLOSE · ESC TO CANCEL",
};

export default function StatusBar() {
  const activeTool = useUIStore((s) => s.activeTool);
  const walls = useActiveWalls();
  const wallCount = Object.keys(walls).length;
  const gridSnap = useUIStore((s) => s.gridSnap);
  const cameraMode = useUIStore((s) => s.cameraMode);

  return (
    <div className="h-8 bg-background flex items-center px-4 border border-border/50 border-0 border-t shrink-0">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span className="font-mono text-[11px] text-muted-foreground/60 tracking-widest">
          {activeTool.toUpperCase()} TOOL
        </span>
        <span className="font-mono text-[11px] text-muted-foreground/60 mx-2">·</span>
        <span className="font-mono text-[11px] text-muted-foreground/80 tracking-wider">
          {STATUS_MESSAGES[activeTool] ?? ""}
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <span className="font-mono text-[11px] text-muted-foreground/60 tracking-wider">
          WALLS: <span className="text-foreground">{wallCount}</span>
        </span>
        <span className="font-mono text-[11px] text-muted-foreground/60 tracking-wider">
          GRID: <span className="text-foreground">{gridSnap > 0 ? `${gridSnap * 12}"` : "OFF"}</span>
        </span>
        <span className="font-mono text-[11px] text-muted-foreground/60 tracking-wider">
          SCALE: <span className="text-foreground">1:50</span>
        </span>
        <span className="font-mono text-[11px] text-muted-foreground/60 tracking-wider">
          CAM: <span className="text-foreground">{cameraMode === "walk" ? "WALK MODE" : "ORBIT MODE"}</span>
        </span>
      </div>
    </div>
  );
}
