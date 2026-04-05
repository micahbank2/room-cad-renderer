import { useCADStore } from "@/stores/cadStore";
import { defaultSnapshot } from "@/lib/snapshotMigration";

interface Props {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: Props) {
  const loadSnapshot = useCADStore((s) => s.loadSnapshot);

  function handleBlankRoom() {
    loadSnapshot(defaultSnapshot());
    onStart();
  }

  return (
    <div className="h-full flex flex-col">
      {/* Nav bar — DS1 style (lighter) */}
      <header className="h-14 bg-obsidian-deepest flex items-center px-6 ghost-border border-0 border-b">
        <span className="font-display font-bold text-accent text-sm tracking-[0.1em] mr-8">
          OBSIDIAN_CAD
        </span>
        <nav className="flex gap-6">
          {["PROJECTS", "LAYERS", "ASSETS", "MEASURE"].map((item) => (
            <button
              key={item}
              className="font-mono text-[10px] text-text-ghost tracking-widest hover:text-text-dim transition-colors"
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <span className="font-mono text-[10px] text-text-ghost tracking-wider">
          SAVED
        </span>
        <button className="ml-4 font-mono text-[10px] tracking-widest px-3 py-1 border border-accent text-accent rounded-sm hover:bg-accent/10 transition-colors">
          EXPORT
        </button>
      </header>

      {/* Main content — centered, DS1 clean layout */}
      <div className="flex-1 flex">
        {/* Left nav skeleton */}
        <aside className="w-40 bg-obsidian-low p-4 space-y-4 shrink-0">
          {["PROJECTS", "LAYERS", "ASSETS", "MEASURE", "HISTORY"].map((item, i) => (
            <button
              key={item}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-sm font-mono text-[10px] tracking-widest transition-colors ${
                i === 0
                  ? "bg-accent text-white"
                  : "text-text-ghost hover:text-text-dim"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {["folder", "layers", "inventory_2", "straighten", "history"][i]}
              </span>
              {item}
            </button>
          ))}

          <div className="absolute bottom-4 left-4 space-y-2">
            <button className="flex items-center gap-2 font-mono text-[10px] text-accent tracking-widest px-2 py-1.5 bg-accent/10 rounded-sm w-full hover:bg-accent/20 transition-colors">
              NEW_ELEMENT
            </button>
          </div>
        </aside>

        {/* Center — hero content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="max-w-2xl text-center">
            <h1 className="font-display font-bold text-5xl text-text-primary tracking-tight mb-4 leading-tight">
              DESIGN_YOUR_SPACE
            </h1>
            <p className="text-text-dim text-sm leading-relaxed max-w-lg mx-auto mb-10">
              Create dimensionally accurate floor plans with architectural precision.
              Start from a blank slate or utilize our verified technical frameworks.
            </p>

            {/* Action cards */}
            <div className="flex gap-5 justify-center">
              {/* Blank Room */}
              <div className="w-64 bg-obsidian-low border border-outline-variant/10 hover:border-accent/20 rounded-sm p-6 text-left transition-all group">
                <span className="material-symbols-outlined text-2xl text-accent mb-3 block">
                  grid_view
                </span>
                <h3 className="font-mono text-xs text-text-primary tracking-widest mb-2">
                  BLANK_ROOM
                </h3>
                <p className="text-[11px] text-text-ghost leading-relaxed mb-4">
                  Start with presets and manual dimensions.
                </p>
                <button
                  onClick={handleBlankRoom}
                  className="w-full font-mono text-[10px] tracking-widest py-2 bg-accent text-white rounded-sm hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(124,91,240,0.2)]"
                >
                  CREATE
                </button>
              </div>

              {/* From Template */}
              <div className="w-64 bg-obsidian-low border border-outline-variant/10 hover:border-outline-variant/20 rounded-sm p-6 text-left transition-all group">
                <span className="material-symbols-outlined text-2xl text-text-ghost mb-3 block">
                  architecture
                </span>
                <h3 className="font-mono text-xs text-text-primary tracking-widest mb-2">
                  FROM_TEMPLATE
                </h3>
                <p className="text-[11px] text-text-ghost leading-relaxed mb-4">
                  Use premade architectural shells and layouts.
                </p>
                <button
                  disabled
                  className="w-full font-mono text-[10px] tracking-widest py-2 border border-outline-variant/30 text-text-ghost rounded-sm opacity-50 cursor-not-allowed"
                >
                  BROWSE
                </button>
              </div>
            </div>

            <p className="mt-8 font-mono text-[10px] text-text-ghost tracking-wider">
              OR LOAD A SAVED PROJECT →
            </p>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-8 bg-obsidian-deepest flex items-center px-4 ghost-border border-0 border-t">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="font-mono text-[9px] text-text-ghost tracking-widest">
            SYSTEM_STATUS: READY
          </span>
        </div>
        <div className="flex-1" />
        <span className="font-mono text-[9px] text-text-ghost tracking-wider">
          COORDINATES: 0.00, 0.00
        </span>
        <span className="font-mono text-[9px] text-text-ghost tracking-wider ml-6">
          SCALE: 1:50
        </span>
      </div>
    </div>
  );
}
