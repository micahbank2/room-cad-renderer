import { useRef, useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { exportRenderedImage } from "@/lib/export";
import type { ToolType } from "@/types/cad";
import Tooltip from "@/components/Tooltip";
import { InlineEditableText } from "@/components/ui/InlineEditableText";
import { Button } from "@/components/ui/Button";
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
  Footprints,
  Undo2,
  Redo2,
  HelpCircle,
  Settings,
  User,
  MousePointer,
  Minus,
  DoorOpen,
  RectangleVertical,
  Triangle,
  Grid2x2,
  ZoomIn,
  ZoomOut,
  Maximize,
  AlertCircle,
  Loader2,
  CloudCheck,
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
  { id: "normal" as const,  label: "Normal",  Icon: LayoutGrid, tooltip: "All rooms render together" },
  { id: "solo" as const,    label: "Solo",    Icon: Square,     tooltip: "Only the active room renders" },
  { id: "explode" as const, label: "Explode", Icon: Move3d,     tooltip: "Rooms separated along X-axis" },
];

// D-15: lucide-react icon map for tool palette (Material Symbols replaced)
const tools: { id: ToolType; label: string; Icon: LucideIcon }[] = [
  { id: "select", label: "Select", Icon: MousePointer },
  { id: "wall",   label: "Wall",   Icon: Minus },
  { id: "door",   label: "Door",   Icon: DoorOpen },
  { id: "window", label: "Window", Icon: RectangleVertical }, // D-15: substitute for material-symbols 'window'
  { id: "ceiling", label: "Ceiling", Icon: Triangle },        // D-15: substitute for material-symbols 'roofing'
  { id: "stair", label: "Stairs", Icon: Footprints },         // D-15: substitute for material-symbols 'stairs'
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
    <header className="h-14 bg-background flex items-center px-4 shrink-0 border border-border/50 border-0 border-b">
      {/* Brand — click to go home */}
      <Button
        onClick={onHome}
        variant="ghost"
        size="sm"
        className="font-bold tracking-[0.1em] mr-6"
        title="Back to home"
      >
        Room CAD Renderer
      </Button>

      {/* View tabs */}
      <nav className="flex items-center gap-1 mr-6">
        {onFloorPlanClick && (
          <Tooltip content="Change floor plan / upload reference image" placement="bottom">
            <Button
              onClick={onFloorPlanClick}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 text-muted-foreground/80 hover:text-foreground"
            >
              <LayoutGrid size={14} />
              Floor plan
            </Button>
          </Tooltip>
        )}
        {(["2d", "3d", "library", "split"] as const).map((mode) => {
          const labels = { "2d": "2D plan", "3d": "3D view", library: "Library", split: "Split" };
          const isActive = viewMode === mode;
          return (
            <Button
              key={mode}
              data-testid={`view-mode-${mode}`}
              onClick={() => onViewChange(mode)}
              variant="ghost"
              size="sm"
              className={isActive
                ? "text-foreground border-b-2 border-accent rounded-none"
                : "text-muted-foreground/80 hover:text-foreground"
              }
            >
              {labels[mode]}
            </Button>
          );
        })}
      </nav>

      {(viewMode === "3d" || viewMode === "split") && (
        <Tooltip
          content={cameraMode === "orbit" ? "Enter walk mode" : "Exit to orbit"}
          shortcut="E"
          placement="bottom"
        >
          <Button
            onClick={toggleCameraMode}
            variant="ghost"
            size="sm"
            className={`flex items-center gap-1.5 mr-6 ${
              cameraMode === "walk"
                ? "text-foreground border-b-2 border-accent rounded-none"
                : "text-muted-foreground/80 hover:text-foreground"
            }`}
          >
            <Footprints size={14} /> {/* D-15: substitute for material-symbols 'directions_walk' */}
            {cameraMode === "orbit" ? "Walk" : "Orbit"}
          </Button>
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
                <Button
                  data-testid={`preset-${id}`}
                  onClick={() => {
                    if (!isWalkMode) requestPreset(id);
                  }}
                  disabled={isWalkMode}
                  aria-label={label}
                  aria-pressed={isActive}
                  variant="ghost"
                  size="icon"
                  active={isActive}
                >
                  <Icon size={16} strokeWidth={1.5} />
                </Button>
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
                <Button
                  data-testid={`display-mode-${id}`}
                  onClick={() => setDisplayMode(id)}
                  aria-label={label}
                  aria-pressed={isActive}
                  title={tooltip}
                  variant="ghost"
                  size="sm"
                  active={isActive}
                  className="flex items-center gap-1"
                >
                  <Icon size={14} strokeWidth={1.5} />
                  <span>{label}</span>
                </Button>
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
          <Button
            data-testid="cutaway-toggle"
            onClick={() => setCutawayMode(cutawayMode === "off" ? "auto" : "off")}
            aria-label="Toggle wall cutaway"
            aria-pressed={cutawayMode === "auto"}
            title={`Cutaway: ${cutawayMode === "auto" ? "Auto" : "Off"}`}
            variant="ghost"
            size="sm"
            active={cutawayMode === "auto"}
            className="flex items-center gap-1 mr-6"
          >
            <EyeOff size={14} strokeWidth={1.5} />
            <span>Cutaway</span>
          </Button>
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
          className="font-sans text-sm text-foreground text-center min-w-0 max-w-[320px] truncate"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <Tooltip content="Undo" shortcut="Ctrl+Z" placement="bottom">
          <Button
            onClick={undo}
            disabled={pastLen === 0}
            aria-label="Undo"
            variant="ghost"
            size="icon"
          >
            <Undo2 size={18} />
          </Button>
        </Tooltip>
        <Tooltip content="Redo" shortcut="Ctrl+Shift+Z" placement="bottom">
          <Button
            onClick={redo}
            disabled={futureLen === 0}
            aria-label="Redo"
            variant="ghost"
            size="icon"
          >
            <Redo2 size={18} />
          </Button>
        </Tooltip>

        <div className="w-px h-5 bg-border/50 mx-1" />

        <ToolbarSaveStatus />

        <Tooltip content="Export 3D view as PNG" placement="bottom">
          <Button
            onClick={() => {
              if (viewMode === "2d") {
                alert("Switch to 3D view to export render.");
                return;
              }
              exportRenderedImage();
            }}
            variant="outline"
            size="sm"
            aria-label="Export"
          >
            Export
          </Button>
        </Tooltip>

        <Tooltip content="Help &amp; shortcuts" shortcut="?" placement="bottom">
          <Button
            onClick={() => openHelp()}
            variant="ghost"
            size="icon"
            data-onboarding="help-button"
          >
            <HelpCircle size={18} />
          </Button>
        </Tooltip>
        <Button variant="ghost" size="icon">
          <Settings size={18} />
        </Button>
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
          <User size={14} className="text-muted-foreground/80" />
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
        <AlertCircle size={14} className="text-error" />
        <span className="font-sans text-base tracking-widest text-error">
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
          <Loader2
            size={14}
            className={`text-foreground ${reducedMotion ? "" : "animate-spin"}`}
          />
          <span className="font-sans text-base tracking-widest text-foreground">
            SAVING
          </span>
        </>
      ) : (
        <>
          <CloudCheck size={14} className="text-success" />
          <span
            className={`font-sans text-base tracking-widest ${
              isSaved ? "text-success" : "text-muted-foreground/60"
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
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 bg-card border border-border p-1.5 rounded-smooth-md">
      {tools.map((t) => (
        <Tooltip
          key={t.id}
          content={t.label + " tool"}
          shortcut={TOOL_SHORTCUTS[t.id]}
          placement="right"
        >
          <Button
            onClick={() => onSelectTool(t.id)}
            data-onboarding={`tool-${t.id}`}
            data-testid={`tool-${t.id}`}
            variant="ghost"
            size="icon"
            active={activeTool === t.id}
            className={activeTool === t.id ? "shadow-[0_0_15px_rgba(124,91,240,0.3)]" : ""}
          >
            <t.Icon size={18} />
          </Button>
        </Tooltip>
      ))}
      {/* Phase 61 OPEN-01 (D-03): Wall Cutouts dropdown trigger — opens
          archway / passthrough / niche picker. Active when one of those
          tools is currently selected. */}
      <Tooltip content="Wall cutouts (archway / passthrough / niche)" placement="right">
        <Button
          ref={wallCutoutsTriggerRef}
          data-testid="wall-cutouts-trigger"
          onClick={() => setShowWallCutouts((v) => !v)}
          variant="ghost"
          size="icon"
          active={isCutoutTool}
          className={isCutoutTool ? "shadow-[0_0_15px_rgba(124,91,240,0.3)]" : ""}
        >
          <ChevronDown size={16} />
        </Button>
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
        <Button
          onClick={() => setTool("measure")}
          data-testid="tool-measure"
          variant="ghost"
          size="icon"
          active={activeTool === "measure"}
          className={activeTool === "measure" ? "shadow-[0_0_15px_rgba(124,91,240,0.3)]" : ""}
        >
          <Ruler size={18} />
        </Button>
      </Tooltip>
      <Tooltip content="Label tool" shortcut="T" placement="right">
        <Button
          onClick={() => setTool("label")}
          data-testid="tool-label"
          variant="ghost"
          size="icon"
          active={activeTool === "label"}
          className={activeTool === "label" ? "shadow-[0_0_15px_rgba(124,91,240,0.3)]" : ""}
        >
          <Type size={18} />
        </Button>
      </Tooltip>
      <div className="w-full h-px bg-border/50 my-0.5" />
      <Tooltip content="Toggle grid" placement="right">
        <Button
          onClick={toggleGrid}
          variant="ghost"
          size="icon"
          className={showGrid ? "text-foreground" : "text-muted-foreground/60"}
        >
          <Grid2x2 size={18} /> {/* D-15: substitute for material-symbols 'grid_4x4' */}
        </Button>
      </Tooltip>
      <div className="w-full h-px bg-border/50 my-0.5" />
      <Tooltip content="Zoom in" placement="right">
        <Button
          onClick={() => setUserZoom(userZoom * 1.2)}
          variant="ghost"
          size="icon"
        >
          <ZoomIn size={18} />
        </Button>
      </Tooltip>
      <Tooltip content="Zoom out" placement="right">
        <Button
          onClick={() => setUserZoom(userZoom / 1.2)}
          variant="ghost"
          size="icon"
        >
          <ZoomOut size={18} />
        </Button>
      </Tooltip>
      <Tooltip content="Fit to view" shortcut="0" placement="right">
        <Button
          onClick={resetView}
          variant="ghost"
          size="icon"
        >
          <Maximize size={18} />
        </Button>
      </Tooltip>
      <div className="w-8 h-5 flex items-center justify-center font-sans text-[9px] text-muted-foreground/60 tracking-wider">
        {Math.round(userZoom * 100)}%
      </div>
    </div>
  );
}
