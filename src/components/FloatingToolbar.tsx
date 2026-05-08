// src/components/FloatingToolbar.tsx
// Phase 74 TOOLBAR-REWORK: Glass pill fixed at bottom-center of canvas.
// Two rows of tool buttons — top row for drawing tools, bottom row for
// manipulation + view controls. Replaces the legacy left-panel ToolPalette.
//
// D-15: No Material Symbols imports. All icons from lucide-react.
// D-07: Active tool uses bg-accent/10 + ring-1 ring-accent/40 (no legacy shadow glow).

import { useRef, useState } from "react";
import {
  Minus,
  DoorOpen,
  RectangleVertical,
  Triangle,
  Footprints,
  ChevronDown,
  Ruler,
  Type,
  Package,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Redo2,
  Grid2x2,
  LayoutGrid,
  Square,
  Move3d,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore } from "@/stores/cadStore";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/Tooltip";
import { WallCutoutsDropdown } from "@/components/Toolbar.WallCutoutsDropdown";
import { setPendingStair } from "@/canvas/tools/stairTool";

type ViewMode = "2d" | "3d" | "split" | "library";

interface Props {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

// ─── Display mode config ───────────────────────────────────────────────────

const DISPLAY_MODES = [
  { id: "normal" as const, label: "Normal", Icon: LayoutGrid, tooltip: "All rooms render together", testId: "display-mode-normal" },
  { id: "solo" as const, label: "Solo", Icon: Square, tooltip: "Only the active room renders", testId: "display-mode-solo" },
  { id: "explode" as const, label: "Explode", Icon: Move3d, tooltip: "Rooms separated along X-axis", testId: "display-mode-explode" },
];

const VIEW_MODES = [
  { id: "2d" as const, label: "2D", tooltip: "2D Plan view", testId: "view-mode-2d" },
  { id: "3d" as const, label: "3D", tooltip: "3D View", testId: "view-mode-3d" },
  { id: "split" as const, label: "Split", tooltip: "Side-by-side 2D + 3D", testId: "view-mode-split" },
];

// ─── Thin divider ─────────────────────────────────────────────────────────

function Divider() {
  return <div className="w-px h-5 bg-border/40 mx-0.5" />;
}

// ─── Main component ────────────────────────────────────────────────────────

export function FloatingToolbar({ viewMode, onViewChange }: Props): JSX.Element {
  const activeTool = useUIStore((s) => s.activeTool);
  const setTool = useUIStore((s) => s.setTool);
  const showGrid = useUIStore((s) => s.showGrid);
  const toggleGrid = useUIStore((s) => s.toggleGrid);
  const userZoom = useUIStore((s) => s.userZoom);
  const setUserZoom = useUIStore((s) => s.setUserZoom);
  const resetView = useUIStore((s) => s.resetView);
  const displayMode = useUIStore((s) => s.displayMode);
  const setDisplayMode = useUIStore((s) => s.setDisplayMode);

  const past = useCADStore((s) => s.past);
  const future = useCADStore((s) => s.future);
  const undo = useCADStore((s) => s.undo);
  const redo = useCADStore((s) => s.redo);

  const wallCutoutsTriggerRef = useRef<HTMLButtonElement>(null);
  const [showWallCutouts, setShowWallCutouts] = useState(false);

  const isCutoutTool =
    activeTool === "archway" || activeTool === "passthrough" || activeTool === "niche";

  function toolActive(tool: string) {
    return activeTool === tool;
  }

  function toolClass(isActive: boolean) {
    return isActive ? "ring-1 ring-accent/40" : "";
  }

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-0 rounded-2xl border border-border bg-background/90 shadow-2xl backdrop-blur-md p-1.5 max-w-[calc(100vw-24px)]">

        {/* ── Top row: drawing tools ─────────────────────────────────── */}
        <div className="flex items-center gap-0.5">

          {/* Wall */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="tool-wall"
                data-onboarding="tool-wall"
                active={toolActive("wall")}
                className={toolClass(toolActive("wall"))}
                onClick={() => setTool("wall")}
              >
                <Minus size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Wall tool <kbd>W</kbd></TooltipContent>
          </Tooltip>

          {/* Door */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="tool-door"
                active={toolActive("door")}
                className={toolClass(toolActive("door"))}
                onClick={() => setTool("door")}
              >
                <DoorOpen size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Door tool <kbd>D</kbd></TooltipContent>
          </Tooltip>

          {/* Window — D-15: substitute for material-symbols 'window' */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="tool-window"
                active={toolActive("window")}
                className={toolClass(toolActive("window"))}
                onClick={() => setTool("window")}
              >
                <RectangleVertical size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Window tool <kbd>N</kbd></TooltipContent>
          </Tooltip>

          {/* Ceiling — D-15: substitute for material-symbols 'roofing' */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="tool-ceiling"
                active={toolActive("ceiling")}
                className={toolClass(toolActive("ceiling"))}
                onClick={() => setTool("ceiling")}
              >
                <Triangle size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Ceiling tool <kbd>C</kbd></TooltipContent>
          </Tooltip>

          {/* Stairs — D-05: must call setPendingStair before setTool — D-15: substitute for material-symbols 'stairs' */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="tool-stair"
                active={toolActive("stair")}
                className={toolClass(toolActive("stair"))}
                onClick={() => {
                  setPendingStair({ rotation: 0, widthFt: 3, stepCount: 12, riseIn: 7, runIn: 11 });
                  setTool("stair");
                }}
              >
                <Footprints size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Stair tool</TooltipContent>
          </Tooltip>

          {/* Wall Cutouts trigger */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                ref={wallCutoutsTriggerRef}
                variant="ghost"
                size="icon"
                data-testid="wall-cutouts-trigger"
                active={isCutoutTool || showWallCutouts}
                className={toolClass(isCutoutTool || showWallCutouts)}
                onClick={() => setShowWallCutouts((v) => !v)}
              >
                <ChevronDown size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Wall cutouts</TooltipContent>
          </Tooltip>

          {/* Measure */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="tool-measure"
                active={toolActive("measure")}
                className={toolClass(toolActive("measure"))}
                onClick={() => setTool("measure")}
              >
                <Ruler size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Measure tool <kbd>M</kbd></TooltipContent>
          </Tooltip>

          {/* Label */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="tool-label"
                active={toolActive("label")}
                className={toolClass(toolActive("label"))}
                onClick={() => setTool("label")}
              >
                <Type size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Label tool <kbd>T</kbd></TooltipContent>
          </Tooltip>

          {/* Product */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="tool-product"
                active={toolActive("product")}
                className={toolClass(toolActive("product"))}
                onClick={() => setTool("product")}
              >
                <Package size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Product tool</TooltipContent>
          </Tooltip>

        </div>

        {/* Horizontal divider between rows */}
        <div className="w-full h-px bg-border/30 my-1" />

        {/* ── Bottom row: manipulation + view controls ────────────────── */}
        <div className="flex items-center gap-0.5">

          {/* Select */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="tool-select"
                data-onboarding="tool-select"
                active={toolActive("select")}
                className={toolClass(toolActive("select"))}
                onClick={() => setTool("select")}
              >
                <MousePointer size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Select tool <kbd>V</kbd></TooltipContent>
          </Tooltip>

          <Divider />

          {/* Zoom In */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUserZoom(userZoom * 1.2)}
              >
                <ZoomIn size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Zoom in</TooltipContent>
          </Tooltip>

          {/* Zoom Out */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUserZoom(userZoom / 1.2)}
              >
                <ZoomOut size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Zoom out</TooltipContent>
          </Tooltip>

          {/* Fit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => resetView()}
              >
                <Maximize size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Fit to screen <kbd>0</kbd></TooltipContent>
          </Tooltip>

          <Divider />

          {/* Undo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="toolbar-undo"
                disabled={past.length === 0}
                onClick={() => undo()}
              >
                <Undo2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Undo <kbd>Ctrl+Z</kbd></TooltipContent>
          </Tooltip>

          {/* Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="toolbar-redo"
                disabled={future.length === 0}
                onClick={() => redo()}
              >
                <Redo2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Redo <kbd>Ctrl+Shift+Z</kbd></TooltipContent>
          </Tooltip>

          <Divider />

          {/* Grid toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleGrid()}
                className={showGrid ? "text-foreground" : "text-muted-foreground/60"}
              >
                <Grid2x2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Toggle grid</TooltipContent>
          </Tooltip>

          <Divider />

          {/* Display Mode buttons — only in 3D/split where display modes are meaningful */}
          {(viewMode === "3d" || viewMode === "split") && (
            <div
              role="group"
              aria-label="Display mode"
              data-testid="display-mode-segmented"
              className="flex items-center gap-0.5"
            >
              {DISPLAY_MODES.map(({ id, label, Icon, tooltip, testId }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={testId}
                      aria-label={label}
                      aria-pressed={displayMode === id}
                      title={tooltip}
                      active={displayMode === id}
                      className={toolClass(displayMode === id)}
                      onClick={() => setDisplayMode(id)}
                    >
                      <Icon size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{tooltip}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
          {(viewMode === "3d" || viewMode === "split") && <Divider />}

          <Divider />

          {/* View Mode buttons */}
          <div
            role="group"
            aria-label="View mode"
            data-testid="view-mode-segmented"
            className="flex items-center gap-0.5"
          >
            {VIEW_MODES.map(({ id, label, tooltip, testId }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={testId}
                    active={viewMode === id}
                    className={`${toolClass(viewMode === id)} font-sans text-[11px] w-auto px-2`}
                    onClick={() => onViewChange(id)}
                  >
                    {label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </div>

        </div>

        {/* Zoom percentage display */}
        <div className="text-center font-mono text-[9px] text-muted-foreground/60 mt-0.5">
          {Math.round(userZoom * 100)}%
        </div>

      </div>

      {/* Wall Cutouts dropdown — direction="up" so it grows upward from the pill */}
      {showWallCutouts && (
        <WallCutoutsDropdown
          anchorRef={wallCutoutsTriggerRef}
          direction="up"
          onClose={() => setShowWallCutouts(false)}
          onPick={(kind) => {
            setTool(kind);
            setShowWallCutouts(false);
          }}
        />
      )}
    </TooltipProvider>
  );
}
