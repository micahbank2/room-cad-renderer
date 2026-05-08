import { useUIStore } from "@/stores/uiStore";
import { useCADStore } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { exportRenderedImage } from "@/lib/export";
import { InlineEditableText } from "@/components/ui/InlineEditableText";
import { Button } from "@/components/ui/Button";
import { PRESETS, type PresetId } from "@/three/cameraPresets";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import {
  PersonStanding,
  Map as MapIcon,
  Box,
  CornerDownRight,
  BookOpen,
  HelpCircle,
  Settings,
  Undo2,
  Redo2,
  AlertCircle,
  Loader2,
  CloudCheck,
  type LucideIcon,
} from "lucide-react";

// Phase 35 CAM-01 — lucide icon map per PresetId (Phase 33 D-33).
const PRESET_ICONS: Record<PresetId, LucideIcon> = {
  "eye-level": PersonStanding,
  "top-down": MapIcon,
  "three-quarter": Box,
  corner: CornerDownRight,
};

interface TopBarProps {
  viewMode: "2d" | "3d" | "split" | "library";
  onViewChange: (mode: "2d" | "3d" | "split" | "library") => void;
  onHome?: () => void;
  onFloorPlanClick?: () => void;
}

/** Prominent save indicator — named export for external import (D-12) */
export function ToolbarSaveStatus(): JSX.Element {
  const status = useProjectStore((s) => s.saveStatus);
  // Phase 44 A11Y-01: drop the SAVING spinner's continuous rotation when
  // prefers-reduced-motion is on. Icon stays visible (semantic meaning preserved).
  const reducedMotion = useReducedMotion();

  // D-04 / D-04a: SAVE_FAILED surface — persists (no auto-fade) until store leaves "failed"
  if (status === "failed") {
    return (
      <div className="flex items-center gap-1.5 min-w-[72px]" aria-label="Save status">
        <AlertCircle size={14} className="text-error" />
        <span className="font-mono text-xs tracking-widest text-error">SAVE_FAILED</span>
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
          <span className="font-mono text-xs tracking-widest text-foreground">SAVING</span>
        </>
      ) : (
        <>
          <CloudCheck size={14} className="text-success" />
          <span
            className={`font-mono text-xs tracking-widest ${
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

export function TopBar({ viewMode, onViewChange }: TopBarProps): JSX.Element {
  const undo = useCADStore((s) => s.undo);
  const redo = useCADStore((s) => s.redo);
  const pastLen = useCADStore((s) => s.past.length);
  const futureLen = useCADStore((s) => s.future.length);
  const cameraMode = useUIStore((s) => s.cameraMode);
  const activePreset = useUIStore((s) => s.activePreset);
  const requestPreset = useUIStore((s) => s.requestPreset);
  const openHelp = useUIStore((s) => s.openHelp);

  // Phase 33 GH #88 — inline-edit document title.
  // Live-preview writes go to draftName (auto-save does NOT subscribe);
  // commit flushes draftName → activeName so auto-save fires exactly once per commit.
  const activeName = useProjectStore((s) => s.activeName);
  const draftName = useProjectStore((s) => s.draftName);
  const setDraftName = useProjectStore((s) => s.setDraftName);
  const commitDraftName = useProjectStore((s) => s.commitDraftName);
  const displayValue = draftName ?? activeName;

  const show3DControls = viewMode === "3d" || viewMode === "split";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-10 flex items-center justify-between px-3 bg-background/80 backdrop-blur-sm border-b border-border/30">
      {/* Left slot — project name (D-09) */}
      <div className="flex items-center min-w-0">
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
          className="font-sans text-sm text-foreground min-w-0 max-w-[280px] truncate"
        />
      </div>

      {/* Right slot — utilities (D-10) */}
      <div className="flex items-center gap-1">
        {/* Save status */}
        <ToolbarSaveStatus />

        <div className="w-px h-5 bg-border/50 mx-1" />

        {/* Undo / Redo (D-11) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={undo}
              disabled={pastLen === 0}
              aria-label="Undo"
              variant="ghost"
              size="icon-sm"
            >
              <Undo2 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Undo <kbd>Ctrl+Z</kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={redo}
              disabled={futureLen === 0}
              aria-label="Redo"
              variant="ghost"
              size="icon-sm"
            >
              <Redo2 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Redo <kbd>Ctrl+Shift+Z</kbd>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border/50 mx-1" />

        {/* Camera preset buttons — only in 3d/split (D-03 CAM-01) */}
        {show3DControls && (
          <>
            <div className="flex items-center gap-1" role="group" aria-label="Camera presets">
              {PRESETS.map(({ id, key, label }) => {
                const Icon = PRESET_ICONS[id];
                const isActive = activePreset === id;
                const isWalkMode = cameraMode === "walk";
                return (
                  <Tooltip key={id}>
                    <TooltipTrigger asChild>
                      <Button
                        data-testid={`preset-${id}`}
                        onClick={() => {
                          if (!isWalkMode) requestPreset(id);
                        }}
                        disabled={isWalkMode}
                        aria-label={label}
                        aria-pressed={isActive}
                        variant="ghost"
                        size="icon-sm"
                        active={isActive}
                      >
                        <Icon size={14} strokeWidth={1.5} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {isWalkMode ? "Exit walk mode to use presets" : label}{" "}
                      {key && <kbd>{key}</kbd>}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <div className="w-px h-5 bg-border/50 mx-1" />
          </>
        )}

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent side="bottom">Export 3D view as PNG</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border/50 mx-1" />

        {/* Library button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => onViewChange("library")}
              variant="ghost"
              size="icon-sm"
              data-testid="view-mode-library"
              aria-label="Product library"
              active={viewMode === "library"}
            >
              <BookOpen size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Product library</TooltipContent>
        </Tooltip>

        {/* Help */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => openHelp()}
              variant="ghost"
              size="icon-sm"
              aria-label="Help & shortcuts"
              data-onboarding="help-button"
            >
              <HelpCircle size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Help &amp; shortcuts</TooltipContent>
        </Tooltip>

        {/* Settings */}
        <Button variant="ghost" size="icon-sm" aria-label="Settings">
          <Settings size={16} />
        </Button>
      </div>
    </header>
  );
}

export default TopBar;
