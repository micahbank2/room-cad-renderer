// src/components/FloatingToolbar.tsx
// Phase 83 TOOLBAR-REDESIGN (v1.21 IA-06 + IA-07): Banded 5-group floating
// toolbar with 44 px hit targets (WCAG 2.5.5 AAA), always-on mixed-case
// group labels, and responsive flex-wrap collapse below ~1280 px.
//
// Group order, left → right (or top → bottom after wrap):
//   Drawing | Measure | Structure | View | Utility
//
// D-01: Every tool button uses size="icon-touch" (h-11 w-11 = 44 px).
// D-02: 5 visually banded groups via <ToolGroup label="…">.
// D-03: Container is flex-wrap with max-w-[min(calc(100vw-24px),1240px)].
// D-06: Tooltips side="top" + collisionPadding={8}.
// D-08: All pre-Phase-83 data-testids preserved verbatim; additive new
//       toolbar-grid-toggle / toolbar-zoom-in / toolbar-zoom-out /
//       toolbar-fit testids added for completeness.
// D-09: Group labels mixed-case ("Drawing", not "DRAWING"). Tooltip text
//       mixed-case throughout.
// D-15: lucide-react icons only.

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
  { id: "library" as const, label: "Library", tooltip: "Browse product + material library", testId: "view-mode-library" },
];

// ─── Thin vertical divider (between groups only — D-02) ────────────────────

function Divider() {
  return <div className="w-px h-8 bg-border/40 mx-0.5 self-end mb-1" />;
}

// ─── Group wrapper (D-02) ──────────────────────────────────────────────────
//
// Always-on mixed-case label above each group's button row. 9 px so it doesn't
// dominate the chrome. Mixed-case per D-09 — NO `.toUpperCase()` and NO
// `uppercase` Tailwind class.
function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="font-sans text-[9px] tracking-wider text-muted-foreground/70 leading-none select-none">
        {label}
      </div>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  );
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

  const showDisplayModes = viewMode === "3d" || viewMode === "split";

  return (
    <TooltipProvider>
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                   flex flex-wrap items-start justify-center gap-3
                   rounded-2xl border border-border bg-background/90
                   shadow-2xl backdrop-blur-md p-2
                   max-w-[min(calc(100vw-24px),1240px)]"
      >

        {/* ── Group 1: Drawing ────────────────────────────────────────── */}
        <ToolGroup label="Drawing">

          {/* Select — moved into Drawing per audit (was bottom row) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="tool-select"
                data-onboarding="tool-select"
                active={toolActive("select")}
                className={toolClass(toolActive("select"))}
                onClick={() => setTool("select")}
              >
                <MousePointer size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Select tool <kbd>V</kbd></TooltipContent>
          </Tooltip>

          {/* Wall */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="tool-wall"
                data-onboarding="tool-wall"
                active={toolActive("wall")}
                className={toolClass(toolActive("wall"))}
                onClick={() => setTool("wall")}
              >
                <Minus size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Wall tool <kbd>W</kbd></TooltipContent>
          </Tooltip>

          {/* Door */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="tool-door"
                active={toolActive("door")}
                className={toolClass(toolActive("door"))}
                onClick={() => setTool("door")}
              >
                <DoorOpen size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Door tool <kbd>D</kbd></TooltipContent>
          </Tooltip>

          {/* Window — D-15: substitute for material-symbols 'window' */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="tool-window"
                active={toolActive("window")}
                className={toolClass(toolActive("window"))}
                onClick={() => setTool("window")}
              >
                <RectangleVertical size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Window tool <kbd>N</kbd></TooltipContent>
          </Tooltip>

          {/* Wall Cutouts trigger */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                ref={wallCutoutsTriggerRef}
                variant="ghost"
                size="icon-touch"
                data-testid="wall-cutouts-trigger"
                active={isCutoutTool || showWallCutouts}
                className={toolClass(isCutoutTool || showWallCutouts)}
                onClick={() => setShowWallCutouts((v) => !v)}
              >
                <ChevronDown size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Wall cutouts</TooltipContent>
          </Tooltip>

          {/* Product */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="tool-product"
                active={toolActive("product")}
                className={toolClass(toolActive("product"))}
                onClick={() => setTool("product")}
              >
                <Package size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Product tool</TooltipContent>
          </Tooltip>

        </ToolGroup>

        <Divider />

        {/* ── Group 2: Measure ────────────────────────────────────────── */}
        <ToolGroup label="Measure">

          {/* Measure */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="tool-measure"
                active={toolActive("measure")}
                className={toolClass(toolActive("measure"))}
                onClick={() => setTool("measure")}
              >
                <Ruler size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Measure tool <kbd>M</kbd></TooltipContent>
          </Tooltip>

          {/* Label */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="tool-label"
                active={toolActive("label")}
                className={toolClass(toolActive("label"))}
                onClick={() => setTool("label")}
              >
                <Type size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Label tool <kbd>T</kbd></TooltipContent>
          </Tooltip>

        </ToolGroup>

        <Divider />

        {/* ── Group 3: Structure ──────────────────────────────────────── */}
        <ToolGroup label="Structure">

          {/* Ceiling — D-15: substitute for material-symbols 'roofing' */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="tool-ceiling"
                active={toolActive("ceiling")}
                className={toolClass(toolActive("ceiling"))}
                onClick={() => setTool("ceiling")}
              >
                <Triangle size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Ceiling tool <kbd>C</kbd></TooltipContent>
          </Tooltip>

          {/* Stairs — must call setPendingStair before setTool — D-15: substitute for material-symbols 'stairs' */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
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
            <TooltipContent side="top" collisionPadding={8}>Stair tool</TooltipContent>
          </Tooltip>

        </ToolGroup>

        <Divider />

        {/* ── Group 4: View ───────────────────────────────────────────── */}
        <ToolGroup label="View">

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
                    size="icon-touch"
                    data-testid={testId}
                    active={viewMode === id}
                    className={`${toolClass(viewMode === id)} font-sans text-[11px] w-auto px-3`}
                    onClick={() => onViewChange(id)}
                  >
                    {label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" collisionPadding={8}>{tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </div>

        </ToolGroup>

        <Divider />

        {/* ── Group 5: Utility ────────────────────────────────────────── */}
        <ToolGroup label="Utility">

          {/* Grid toggle — additive testid for testability */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="toolbar-grid-toggle"
                onClick={() => toggleGrid()}
                className={showGrid ? "text-foreground" : "text-muted-foreground/60"}
              >
                <Grid2x2 size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Toggle grid</TooltipContent>
          </Tooltip>

          {/* Zoom In — additive testid */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="toolbar-zoom-in"
                onClick={() => setUserZoom(userZoom * 1.2)}
              >
                <ZoomIn size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Zoom in</TooltipContent>
          </Tooltip>

          {/* Zoom Out — additive testid */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="toolbar-zoom-out"
                onClick={() => setUserZoom(userZoom / 1.2)}
              >
                <ZoomOut size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Zoom out</TooltipContent>
          </Tooltip>

          {/* Fit — additive testid */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="toolbar-fit"
                onClick={() => resetView()}
              >
                <Maximize size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Fit to screen <kbd>0</kbd></TooltipContent>
          </Tooltip>

          {/* Undo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="toolbar-undo"
                disabled={past.length === 0}
                onClick={() => undo()}
              >
                <Undo2 size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Undo <kbd>Ctrl+Z</kbd></TooltipContent>
          </Tooltip>

          {/* Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                data-testid="toolbar-redo"
                disabled={future.length === 0}
                onClick={() => redo()}
              >
                <Redo2 size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" collisionPadding={8}>Redo <kbd>Ctrl+Shift+Z</kbd></TooltipContent>
          </Tooltip>

          {/* Display Mode buttons — only in 3D/split where display modes are meaningful */}
          {showDisplayModes && (
            <div
              role="group"
              aria-label="Display mode"
              data-testid="display-mode-segmented"
              className="flex items-center gap-0.5 ml-1"
            >
              {DISPLAY_MODES.map(({ id, label, Icon, tooltip, testId }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-touch"
                      data-testid={testId}
                      aria-label={label}
                      aria-pressed={displayMode === id}
                      title={tooltip}
                      active={displayMode === id}
                      className={toolClass(displayMode === id)}
                      onClick={() => setDisplayMode(id)}
                    >
                      <Icon size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" collisionPadding={8}>{tooltip}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}

        </ToolGroup>

        {/* Zoom percentage — basis-full forces onto its own line beneath wrapped groups */}
        <div className="basis-full text-center font-mono text-[9px] text-muted-foreground/60 mt-0.5">
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
