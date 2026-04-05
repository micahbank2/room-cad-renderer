import { useUIStore } from "@/stores/uiStore";
import { useCADStore } from "@/stores/cadStore";
import { exportRenderedImage } from "@/lib/export";
import type { ToolType } from "@/types/cad";

const tools: { id: ToolType; label: string; icon: string }[] = [
  { id: "select", label: "SELECT", icon: "arrow_selector_tool" },
  { id: "wall", label: "WALL", icon: "horizontal_rule" },
  { id: "door", label: "DOOR", icon: "door_front" },
  { id: "window", label: "WINDOW", icon: "window" },
];

interface Props {
  viewMode: "2d" | "3d" | "split" | "library";
  onViewChange: (mode: "2d" | "3d" | "split" | "library") => void;
  onHome?: () => void;
}

export default function Toolbar({ viewMode, onViewChange, onHome }: Props) {
  const activeTool = useUIStore((s) => s.activeTool);
  const setTool = useUIStore((s) => s.setTool);
  const undo = useCADStore((s) => s.undo);
  const redo = useCADStore((s) => s.redo);
  const pastLen = useCADStore((s) => s.past.length);
  const futureLen = useCADStore((s) => s.future.length);
  const cameraMode = useUIStore((s) => s.cameraMode);
  const toggleCameraMode = useUIStore((s) => s.toggleCameraMode);

  return (
    <header className="h-14 bg-obsidian-deepest flex items-center px-4 shrink-0 ghost-border border-0 border-b">
      {/* Brand — click to go home */}
      <button
        onClick={onHome}
        className="font-display font-bold text-accent text-sm tracking-[0.1em] mr-6 hover:text-accent-light transition-colors"
        title="Back to home"
      >
        OBSIDIAN_CAD
      </button>

      {/* View tabs */}
      <nav className="flex items-center gap-1 mr-6">
        {(["2d", "3d", "library", "split"] as const).map((mode) => {
          const labels = { "2d": "2D_PLAN", "3d": "3D_VIEW", library: "LIBRARY", split: "SPLIT" };
          return (
            <button
              key={mode}
              onClick={() => onViewChange(mode)}
              className={`font-mono text-[10px] tracking-widest px-3 py-1 transition-colors duration-150 ${
                viewMode === mode
                  ? "text-accent-light border-b-2 border-accent"
                  : "text-text-dim hover:text-accent-light"
              }`}
            >
              {labels[mode]}
            </button>
          );
        })}
      </nav>

      {(viewMode === "3d" || viewMode === "split") && (
        <button
          onClick={toggleCameraMode}
          title={cameraMode === "orbit" ? "Enter walk mode (E)" : "Exit to orbit (E)"}
          className={`flex items-center gap-1.5 font-mono text-[10px] tracking-widest px-3 py-1 transition-colors duration-150 mr-6 ${
            cameraMode === "walk"
              ? "text-accent-light border-b-2 border-accent"
              : "text-text-dim hover:text-accent-light"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">directions_walk</span>
          {cameraMode === "orbit" ? "WALK" : "ORBIT"}
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={undo}
          disabled={pastLen === 0}
          title="Undo (Ctrl+Z)"
          className="text-text-dim hover:text-text-primary disabled:opacity-20 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">undo</span>
        </button>
        <button
          onClick={redo}
          disabled={futureLen === 0}
          title="Redo (Ctrl+Shift+Z)"
          className="text-text-dim hover:text-text-primary disabled:opacity-20 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">redo</span>
        </button>

        <div className="w-px h-5 bg-outline-variant/20 mx-1" />

        <span className="font-mono text-[10px] text-text-ghost tracking-wider">SAVED</span>

        <button
          onClick={() => {
            if (viewMode === "2d") {
              alert("Switch to 3D view to export render.");
              return;
            }
            exportRenderedImage();
          }}
          className="font-mono text-[10px] tracking-widest px-3 py-1 border border-accent text-accent hover:bg-accent/10 transition-colors rounded-sm"
        >
          EXPORT
        </button>

        <button className="text-text-dim hover:text-text-primary transition-colors">
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>
        <div className="w-7 h-7 rounded-full bg-obsidian-high flex items-center justify-center">
          <span className="material-symbols-outlined text-[14px] text-text-dim">person</span>
        </div>
      </div>
    </header>
  );
}

/** Vertical tool palette — rendered inside the canvas area */
export function ToolPalette() {
  const activeTool = useUIStore((s) => s.activeTool);
  const setTool = useUIStore((s) => s.setTool);
  const showGrid = useUIStore((s) => s.showGrid);
  const toggleGrid = useUIStore((s) => s.toggleGrid);

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 glass-panel p-1.5 rounded-sm">
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          title={t.label}
          className={`w-8 h-8 flex items-center justify-center rounded-sm transition-all duration-150 ${
            activeTool === t.id
              ? "bg-accent text-white shadow-[0_0_15px_rgba(124,91,240,0.3)]"
              : "text-text-dim hover:text-text-primary hover:bg-obsidian-high"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
        </button>
      ))}
      <div className="w-full h-px bg-outline-variant/20 my-0.5" />
      <button
        onClick={toggleGrid}
        title="Toggle Grid"
        className={`w-8 h-8 flex items-center justify-center rounded-sm transition-colors ${
          showGrid ? "text-accent" : "text-text-ghost"
        } hover:bg-obsidian-high`}
      >
        <span className="material-symbols-outlined text-[18px]">grid_4x4</span>
      </button>
    </div>
  );
}
