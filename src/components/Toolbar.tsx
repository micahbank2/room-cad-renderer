import { useRef, useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { exportRenderedImage } from "@/lib/export";
import type { ToolType } from "@/types/cad";
import Tooltip from "@/components/Tooltip";
import { InlineEditableText } from "@/components/ui/InlineEditableText";
import { PRESETS, type PresetId } from "@/three/cameraPresets";
import { WallCutoutsDropdown } from "@/components/Toolbar.WallCutoutsDropdown";
import {
  PersonStanding,
  Map as MapIcon,
  Box,
  CornerDownRight,
  LayoutGrid,
  Square,
  Move3d,
  EyeOff,
  ChevronDown,
  Ruler,
  Type,
  type LucideIcon,
} from "lucide-react";
import { setPendingStair } from "@/canvas/tools/stairTool";

// Phase 35 CAM-01 — lucide icon map per PresetId (Phase 33 D-33).
const PRESET_ICONS: Record<PresetId, LucideIcon> = {
  "eye-level": PersonStanding,
  "top-down": MapIcon,
  "three-quarter": Box,
  corner: CornerDownRight,
};

/** Phase 47 D-09: display-mode segmented-control config. */
const DISPLAY_MODES = [
  { id: "normal" as const,  label: "NORMAL",  Icon: LayoutGrid, tooltip: "All rooms render together" },
  { id: "solo" as const,    label: "SOLO",    Icon: Square,     tooltip: "Only the active room renders" },
  { id: "explode" as const, label: "EXPLODE", Icon: Move3d,     tooltip: "Rooms separated along X-axis" },
];

const tools: { id: ToolType; label: string; icon: string }[] = [
  { id: "select", label: "SELECT", icon: "arrow_selector_tool" },
  { id: "wall", label: "WALL", icon: "horizontal_rule" },
  { id: "door", label: "DOOR", icon: "door_front" },
  { id: "window", label: "WINDOW", icon: "window" },
  { id: "ceiling", label: "CEILING", icon: "roofing" },
  // Phase 60 STAIRS-01 (research Q1): Material Symbols `stairs` glyph;
  // lucide-react has no Stairs export (Toolbar.tsx is on the D-33 allowlist).
  { id: "stair", label: "STAIRS", icon: "stairs" },
];

interface Props {
  viewMode: "2d" | "3d" | "split" | "library";
  onViewChange: (mode: "2d" | "3d" | "split" | "library") => void;
  onHome?: () => void;
  onFloorPlanClick?: () => void;
}

export function Toolbar({ viewMode, onViewChange, onHome, onFloorPlanClick }: Props) {
  const activeTool = useUIStore((s) => s.activeTool);
  const setTool = useUIStore((s) => s.setTool);
  const undo = useCADStore((s) => s.undo);
  const redo = useCADStore((s) => s.redo);
  const pastLen = useCADStore((s) => s.past.length);
  const futureLen = useCADStore((s) => s.future.length);
  const cameraMode = useUIStore((s) => s.cameraMode);
  const toggleCameraMode = useUIStore((s) => s.toggleCameraMode);
  const activePreset = useUIStore((s) => s.activePreset);
  const requestPreset = useUIStore((s) => s.requestPreset);
  const openHelp = useUIStore((s) => s.openHelp);
  // Phase 47 D-02: displayMode subscriptions
  const displayMode = useUIStore((s) => s.displayMode);
  const setDisplayMode = useUIStore((s) => s.setDisplayMode);
  // Phase 59 CUTAWAY-01: cutaway-mode subscriptions
  const cutawayMode = useUIStore((s) => s.cutawayMode);
  const setCutawayMode = useUIStore((s) => s.setCutawayMode);

  // Phase 33 GH #88 — inline-edit document title in Toolbar center slot.
  // Live-preview writes go to `draftName` (auto-save does NOT subscribe);
  // commit flushes draftName → activeName in a single set() call, so
  // auto-save fires exactly once per commit (genuine D-23 bypass).
  const activeName = useProjectStore((s) => s.activeName);
  const draftName = useProjectStore((s) => s.draftName);
  const setDraftName = useProjectStore((s) => s.setDraftName);
  const commitDraftName = useProjectStore((s) => s.commitDraftName);
  const displayValue = draftName ?? activeName;

  return (
    <header className="h-14 bg-obsidian-deepest flex items-center px-4 shrink-0 ghost-border border-0 border-b">
      {/* Brand — click to go home */}
      <button
        onClick={onHome}
        className="font-display font-bold text-accent text-sm tracking-[0.1em] mr-6 hover:text-accent-light transition-colors"
        title="Back to home"
      >
        OBSIDIAN CAD
      </button>

      {/* View tabs */}
      <nav className="flex items-center gap-1 mr-6">
        {onFloorPlanClick && (
          <Tooltip content="Change floor plan / upload reference image" placement="bottom">
            <button
              onClick={onFloorPlanClick}
              className="flex items-center gap-1.5 font-mono text-sm font-normal px-2 py-1 text-text-dim hover:text-accent-light transition-colors duration-150"
            >
              <span className="material-symbols-outlined text-[14px]">grid_view</span>
              Floor plan
            </button>
          </Tooltip>
        )}
        {(["2d", "3d", "library", "split"] as const).map((mode) => {
          const labels = { "2d": "2D plan", "3d": "3D view", library: "Library", split: "Split" };
          return (
            <button
              key={mode}
              data-testid={`view-mode-${mode}`}
              onClick={() => onViewChange(mode)}
              className={`font-mono text-sm font-normal px-2 py-1 transition-colors duration-150 ${
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
        <Tooltip
          content={cameraMode === "orbit" ? "Enter walk mode" : "Exit to orbit"}
          shortcut="E"
          placement="bottom"
        >
          <button
            onClick={toggleCameraMode}
            className={`flex items-center gap-1.5 font-mono text-sm font-normal px-2 py-1 transition-colors duration-150 mr-6 ${
              cameraMode === "walk"
                ? "text-accent-light border-b-2 border-accent"
                : "text-text-dim hover:text-accent-light"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">directions_walk</span>
            {cameraMode === "orbit" ? "Walk" : "Orbit"}
          </button>
        </Tooltip>
      )}

      {/* Phase 35 CAM-01 — camera preset cluster (D-06: right of camera-mode toggle,
          D-03: only mounted in 3d/split, D-01: disabled in walk mode,
          D-02: active preset persists until another applied). */}
      {(viewMode === "3d" || viewMode === "split") && (
        <div
          className="flex items-center gap-1 mr-6"
          role="group"
          aria-label="Camera presets"
        >
          {PRESETS.map(({ id, key, label }) => {
            const Icon = PRESET_ICONS[id];
            const isActive = activePreset === id;
            const isWalkMode = cameraMode === "walk";
            return (
              <Tooltip
                key={id}
                content={isWalkMode ? "Exit walk mode to use presets" : label}
                shortcut={key}
                placement="bottom"
              >
                <button
                  data-testid={`preset-${id}`}
                  onClick={() => {
                    if (!isWalkMode) requestPreset(id);
                  }}
                  disabled={isWalkMode}
                  aria-label={label}
                  aria-pressed={isActive}
                  className={`flex items-center justify-center p-1 rounded-sm transition-colors duration-150 ${
                    isActive
                      ? "bg-accent/20 text-accent-light border border-accent/30"
                      : "text-text-dim hover:text-accent-light border border-transparent"
                  } ${isWalkMode ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <Icon size={16} strokeWidth={1.5} />
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}

      {/* Phase 47 D-01/D-09: display-mode segmented control — only in 3d/split */}
      {(viewMode === "3d" || viewMode === "split") && (
        <div
          className="flex items-center gap-1 mr-6"
          role="group"
          aria-label="Display mode"
        >
          {DISPLAY_MODES.map(({ id, label, Icon, tooltip }) => {
            const isActive = displayMode === id;
            return (
              <Tooltip key={id} content={tooltip} placement="bottom">
                <button
                  data-testid={`display-mode-${id}`}
                  onClick={() => setDisplayMode(id)}
                  aria-label={label}
                  aria-pressed={isActive}
                  title={tooltip}
                  className={`flex items-center justify-center gap-1 px-2 py-1 rounded-sm font-mono text-sm transition-colors duration-150 border ${
                    isActive
                      ? "bg-accent/10 text-accent border-accent/30"
                      : "text-text-dim hover:text-accent-light border-transparent"
                  }`}
                >
                  <Icon size={14} strokeWidth={1.5} />
                  <span>{label}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}

      {/* Phase 59 CUTAWAY-01 (D-06): single cycling button — off ↔ auto.
          Active state mirrors Phase 47 displayMode active styling.
          Manual hide is per-wall via right-click (CanvasContextMenu); not exposed here. */}
      {(viewMode === "3d" || viewMode === "split") && (
        <Tooltip
          content={cutawayMode === "auto" ? "Cutaway: AUTO (click to disable)" : "Cutaway: OFF (click to auto-ghost the wall closest to the camera)"}
          placement="bottom"
        >
          <button
            data-testid="cutaway-toggle"
            onClick={() => setCutawayMode(cutawayMode === "off" ? "auto" : "off")}
            aria-label="Toggle wall cutaway"
            aria-pressed={cutawayMode === "auto"}
            title={`CUTAWAY: ${cutawayMode === "auto" ? "AUTO" : "OFF"}`}
            className={`flex items-center justify-center gap-1 px-2 py-1 rounded-sm font-mono text-sm transition-colors duration-150 border mr-6 ${
              cutawayMode === "auto"
                ? "bg-accent/10 text-accent border-accent/30 accent-glow"
                : "text-text-dim hover:text-accent-light border-transparent"
            }`}
          >
            <EyeOff size={14} strokeWidth={1.5} />
            <span>CUTAWAY</span>
          </button>
        </Tooltip>
      )}

      {/* Document title — inline-editable (Phase 33 GH #88) */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-4">
        <InlineEditableText
          value={displayValue}
          onLivePreview={(v) => setDraftName(v)}
          onCommit={(v) => {
            // InlineEditableText has already trimmed + sliced. Ensure draftName
            // is set so commitDraftName flushes (edge case: paste + Enter).
            setDraftName(v);
            commitDraftName();
          }}
          maxLength={60}
          data-testid="inline-doc-title"
          placeholder="Untitled Room"
          className="font-mono text-sm text-text-primary text-center min-w-0 max-w-[320px] truncate"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <Tooltip content="Undo" shortcut="Ctrl+Z" placement="bottom">
          <button
            onClick={undo}
            disabled={pastLen === 0}
            aria-label="Undo"
            className="text-text-dim hover:text-text-primary disabled:opacity-20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">undo</span>
          </button>
        </Tooltip>
        <Tooltip content="Redo" shortcut="Ctrl+Shift+Z" placement="bottom">
          <button
            onClick={redo}
            disabled={futureLen === 0}
            aria-label="Redo"
            className="text-text-dim hover:text-text-primary disabled:opacity-20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">redo</span>
          </button>
        </Tooltip>

        <div className="w-px h-5 bg-outline-variant/20 mx-1" />

        <ToolbarSaveStatus />

        <Tooltip content="Export 3D view as PNG" placement="bottom">
          <button
            onClick={() => {
              if (viewMode === "2d") {
                alert("Switch to 3D view to export render.");
                return;
              }
              exportRenderedImage();
            }}
            className="font-mono text-sm font-normal px-4 py-1 border border-accent text-accent hover:bg-accent/10 transition-colors rounded-sm"
            aria-label="Export"
          >
            Export
          </button>
        </Tooltip>

        <Tooltip content="Help &amp; shortcuts" shortcut="?" placement="bottom">
          <button
            onClick={() => openHelp()}
            className="text-text-dim hover:text-text-primary transition-colors"
            data-onboarding="help-button"
          >
            <span className="material-symbols-outlined text-[18px]">help</span>
          </button>
        </Tooltip>
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

export default Toolbar;

const TOOL_SHORTCUTS: Record<ToolType, string> = {
  select: "V",
  wall: "W",
  door: "D",
  window: "N",
  ceiling: "C",
  product: "",
  stair: "",
  // Phase 61 OPEN-01 (D-03): no keyboard shortcuts for the 3 dropdown tools
  // (toolbar dropdown is the canonical entry; mirror the pattern of `product`
  // which has no shortcut).
  archway: "",
  passthrough: "",
  niche: "",
  // Phase 62 MEASURE-01 (D-14): keyboard shortcuts M / T.
  measure: "M",
  label: "T",
};

/** Prominent save indicator in the top toolbar (SAVE-04) */
function ToolbarSaveStatus() {
  const status = useProjectStore((s) => s.saveStatus);
  // Phase 44 A11Y-01: drop the SAVING spinner's continuous rotation when
  // prefers-reduced-motion is on. Icon stays visible (semantic meaning
  // preserved); rotation removed.
  const reducedMotion = useReducedMotion();

  // D-04 / D-04a: SAVE_FAILED surface — persists (no auto-fade) until store leaves "failed"
  if (status === "failed") {
    return (
      <div className="flex items-center gap-1.5 min-w-[72px]" aria-label="Save status">
        <span className="material-symbols-outlined text-[14px] text-error">error</span>
        <span className="font-mono text-base tracking-widest text-error">
          SAVE_FAILED
        </span>
      </div>
    );
  }

  const isSaving = status === "saving";
  const isSaved = status === "saved" || status === "idle";
  return (
    <div className="flex items-center gap-1.5 min-w-[72px]" aria-label="Save status">
      {isSaving ? (
        <>
          <span
            className={`material-symbols-outlined text-[14px] text-accent-light ${
              reducedMotion ? "" : "animate-spin"
            }`}
          >
            progress_activity
          </span>
          <span className="font-mono text-base tracking-widest text-accent-light">
            SAVING
          </span>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[14px] text-success">
            cloud_done
          </span>
          <span
            className={`font-mono text-base tracking-widest ${
              isSaved ? "text-success" : "text-text-ghost"
            }`}
          >
            SAVED
          </span>
        </>
      )}
    </div>
  );
}

/** Vertical tool palette — rendered inside the canvas area */
export function ToolPalette() {
  const activeTool = useUIStore((s) => s.activeTool);
  const setTool = useUIStore((s) => s.setTool);
  // Phase 60 STAIRS-01: clicking the Stairs tool button must also seed
  // pendingStairConfig so the placement loop has dimensions to commit.
  const onSelectTool = (id: ToolType) => {
    if (id === "stair") {
      setPendingStair({
        rotation: 0,
        widthFt: 3,
        stepCount: 12,
        riseIn: 7,
        runIn: 11,
      });
    }
    setTool(id);
  };
  const showGrid = useUIStore((s) => s.showGrid);
  const toggleGrid = useUIStore((s) => s.toggleGrid);
  const userZoom = useUIStore((s) => s.userZoom);
  const setUserZoom = useUIStore((s) => s.setUserZoom);
  const resetView = useUIStore((s) => s.resetView);
  // Phase 61 OPEN-01 (D-03): Wall Cutouts dropdown trigger state.
  const wallCutoutsTriggerRef = useRef<HTMLButtonElement>(null);
  const [showWallCutouts, setShowWallCutouts] = useState(false);
  const isCutoutTool = activeTool === "archway" || activeTool === "passthrough" || activeTool === "niche";

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 glass-panel p-1.5 rounded-sm">
      {tools.map((t) => (
        <Tooltip
          key={t.id}
          content={t.label.charAt(0) + t.label.slice(1).toLowerCase() + " tool"}
          shortcut={TOOL_SHORTCUTS[t.id]}
          placement="right"
        >
          <button
            onClick={() => onSelectTool(t.id)}
            data-onboarding={`tool-${t.id}`}
            data-testid={`tool-${t.id}`}
            className={`w-8 h-8 flex items-center justify-center rounded-sm transition-all duration-150 ${
              activeTool === t.id
                ? "bg-accent text-white shadow-[0_0_15px_rgba(124,91,240,0.3)]"
                : "text-text-dim hover:text-text-primary hover:bg-obsidian-high"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
          </button>
        </Tooltip>
      ))}
      {/* Phase 61 OPEN-01 (D-03): Wall Cutouts dropdown trigger — opens
          archway / passthrough / niche picker. Active when one of those
          tools is currently selected. */}
      <Tooltip content="Wall cutouts (archway / passthrough / niche)" placement="right">
        <button
          ref={wallCutoutsTriggerRef}
          data-testid="wall-cutouts-trigger"
          onClick={() => setShowWallCutouts((v) => !v)}
          className={`w-8 h-8 flex items-center justify-center rounded-sm transition-all duration-150 ${
            isCutoutTool
              ? "bg-accent text-white shadow-[0_0_15px_rgba(124,91,240,0.3)]"
              : "text-text-dim hover:text-text-primary hover:bg-obsidian-high"
          }`}
        >
          <ChevronDown size={16} />
        </button>
      </Tooltip>
      {showWallCutouts && (
        <WallCutoutsDropdown
          anchorRef={wallCutoutsTriggerRef}
          onClose={() => setShowWallCutouts(false)}
          onPick={(kind) => {
            setTool(kind);
            setShowWallCutouts(false);
          }}
        />
      )}
      {/* Phase 62 MEASURE-01 (D-14): Measure + Label buttons (lucide-only per D-33). */}
      <Tooltip content="Measure tool" shortcut="M" placement="right">
        <button
          onClick={() => setTool("measure")}
          data-testid="tool-measure"
          className={`w-8 h-8 flex items-center justify-center rounded-sm transition-all duration-150 ${
            activeTool === "measure"
              ? "bg-accent text-white shadow-[0_0_15px_rgba(124,91,240,0.3)]"
              : "text-text-dim hover:text-text-primary hover:bg-obsidian-high"
          }`}
        >
          <Ruler size={18} />
        </button>
      </Tooltip>
      <Tooltip content="Label tool" shortcut="T" placement="right">
        <button
          onClick={() => setTool("label")}
          data-testid="tool-label"
          className={`w-8 h-8 flex items-center justify-center rounded-sm transition-all duration-150 ${
            activeTool === "label"
              ? "bg-accent text-white shadow-[0_0_15px_rgba(124,91,240,0.3)]"
              : "text-text-dim hover:text-text-primary hover:bg-obsidian-high"
          }`}
        >
          <Type size={18} />
        </button>
      </Tooltip>
      <div className="w-full h-px bg-outline-variant/20 my-0.5" />
      <Tooltip content="Toggle grid" placement="right">
        <button
          onClick={toggleGrid}
          className={`w-8 h-8 flex items-center justify-center rounded-sm transition-colors ${
            showGrid ? "text-accent" : "text-text-ghost"
          } hover:bg-obsidian-high`}
        >
          <span className="material-symbols-outlined text-[18px]">grid_4x4</span>
        </button>
      </Tooltip>
      <div className="w-full h-px bg-outline-variant/20 my-0.5" />
      <Tooltip content="Zoom in" placement="right">
        <button
          onClick={() => setUserZoom(userZoom * 1.2)}
          className="w-8 h-8 flex items-center justify-center rounded-sm text-text-dim hover:text-text-primary hover:bg-obsidian-high transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">zoom_in</span>
        </button>
      </Tooltip>
      <Tooltip content="Zoom out" placement="right">
        <button
          onClick={() => setUserZoom(userZoom / 1.2)}
          className="w-8 h-8 flex items-center justify-center rounded-sm text-text-dim hover:text-text-primary hover:bg-obsidian-high transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">zoom_out</span>
        </button>
      </Tooltip>
      <Tooltip content="Fit to view" shortcut="0" placement="right">
        <button
          onClick={resetView}
          className="w-8 h-8 flex items-center justify-center rounded-sm text-text-dim hover:text-text-primary hover:bg-obsidian-high transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">fit_screen</span>
        </button>
      </Tooltip>
      <div className="w-8 h-5 flex items-center justify-center font-mono text-[9px] text-text-ghost tracking-wider">
        {Math.round(userZoom * 100)}%
      </div>
    </div>
  );
}
