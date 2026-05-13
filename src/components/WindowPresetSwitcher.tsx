// src/components/WindowPresetSwitcher.tsx
//
// Phase 79 WIN-PRESETS-01 (Wave 3 — D-02/D-03/D-04/D-05/D-06): floating chip
// row + Custom inline-expand panel that arms the windowTool bridge.
//
// Mount contract: rendered by App.tsx ONLY when `activeTool === "window"` so
// chip clicks (and the live-typing Custom panel) are tied to the active tool.
// Bridge writes happen ONLY in chip / input event handlers — never in a mount
// useEffect — so the first mount under React StrictMode does NOT clobber a
// previously-armed preset (RESEARCH Pitfall 1).
//
// Visual language: mirrors FloatingToolbar (Phase 74 D-15) — rounded glass
// pill with backdrop-blur, ring-1 ring-accent/40 for the active chip. Mixed
// case chip labels (D-09). lucide-react only — no Material Symbols (D-15).
// Custom expand animation guards on useReducedMotion (D-39).
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  WINDOW_PRESETS,
  type WindowPresetId,
} from "@/lib/windowPresets";
import { setCurrentWindowPreset } from "@/canvas/tools/windowTool";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { springTransition } from "@/lib/motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type ActiveId = WindowPresetId | "custom";

interface CustomDims {
  width: number;
  height: number;
  sillHeight: number;
}

/**
 * Floating window-preset switcher. Renders 5 named preset chips + Custom.
 * Selecting a preset chip writes its dimensions to the windowTool bridge
 * synchronously; the user's next wall click drops a window with those dims.
 *
 * Selecting Custom expands an inline panel with W/H/Sill number inputs that
 * write to the bridge live (D-04). Custom defaults to the dims of the
 * last-used named preset (D-06).
 */
export function WindowPresetSwitcher(): JSX.Element {
  const reduced = useReducedMotion();
  // Standard is the most common residential pick — defaults to it on mount
  // when no chip has been clicked yet. windowTool's bridge default ({3,4,3})
  // happens to match Standard, so the visible highlight + the armed preset
  // agree from frame one.
  const [activeId, setActiveId] = useState<ActiveId>("standard");
  const [customDims, setCustomDims] = useState<CustomDims>({
    width: 3,
    height: 4,
    sillHeight: 3,
  });

  // Chip click handler: covers both named presets AND the Custom chip.
  // Bridge write happens here (event-time), NOT in a useEffect (Pitfall 1).
  function handleChipClick(id: ActiveId): void {
    setActiveId(id);
    if (id === "custom") {
      // Re-arm with the current Custom dims so the next placement uses them.
      setCurrentWindowPreset(customDims);
      return;
    }
    const p = WINDOW_PRESETS.find((x) => x.id === id);
    if (!p) return;
    const dims = { width: p.width, height: p.height, sillHeight: p.sillHeight };
    setCurrentWindowPreset(dims);
    // D-06: Custom defaults track last-used named preset.
    setCustomDims(dims);
  }

  // Number-input handler — live ghost update (D-04): each keystroke writes
  // the bridge so the cursor-ghost-preview in windowTool reflects the new
  // dimensions immediately (on the next mousemove).
  function handleCustomChange(
    field: keyof CustomDims,
    rawValue: string,
  ): void {
    const v = Number(rawValue);
    if (!Number.isFinite(v)) return;
    const next: CustomDims = { ...customDims, [field]: v };
    setCustomDims(next);
    setCurrentWindowPreset(next);
  }

  return (
    <div
      data-testid="window-preset-switcher"
      // Position above the FloatingToolbar pill (which sits at bottom-6).
      // bottom-32 leaves room for the toolbar's two-row layout + zoom %.
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 max-w-[calc(100vw-24px)]"
    >
      {/* Chip row — mirrors FloatingToolbar pill aesthetic */}
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5",
          "bg-background/90 border border-border rounded-2xl shadow-2xl backdrop-blur-md",
          "font-sans",
        )}
      >
        {WINDOW_PRESETS.map((p) => (
          <Button
            key={p.id}
            data-testid={`window-preset-chip-${p.id}`}
            variant="ghost"
            size="sm"
            active={activeId === p.id}
            className={cn(
              activeId === p.id && "ring-1 ring-accent/40",
            )}
            onClick={() => handleChipClick(p.id)}
          >
            {p.label}
          </Button>
        ))}
        <Button
          data-testid="window-preset-chip-custom"
          variant="ghost"
          size="sm"
          active={activeId === "custom"}
          className={cn(
            activeId === "custom" && "ring-1 ring-accent/40",
          )}
          onClick={() => handleChipClick("custom")}
        >
          Custom
        </Button>
      </div>

      {/* Custom inline-expand panel — three small numeric inputs */}
      <AnimatePresence>
        {activeId === "custom" && (
          <motion.div
            // D-39 reduced-motion: snap to final state (no slide-in distance).
            initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0, y: 0 } : { opacity: 0, y: -4 }}
            transition={springTransition(reduced)}
            className={cn(
              "flex items-center gap-3 px-3 py-2",
              "bg-background/90 border border-border rounded-2xl shadow-2xl backdrop-blur-md",
              "font-sans text-sm",
            )}
          >
            <label className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">W</span>
              <Input
                data-testid="window-preset-custom-width"
                type="number"
                step={0.5}
                min={0.5}
                value={customDims.width}
                onChange={(e) => handleCustomChange("width", e.target.value)}
                className="w-16 h-7 text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">H</span>
              <Input
                data-testid="window-preset-custom-height"
                type="number"
                step={0.5}
                min={0.5}
                value={customDims.height}
                onChange={(e) => handleCustomChange("height", e.target.value)}
                className="w-16 h-7 text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Sill</span>
              <Input
                data-testid="window-preset-custom-sill"
                type="number"
                step={0.5}
                min={0}
                value={customDims.sillHeight}
                onChange={(e) =>
                  handleCustomChange("sillHeight", e.target.value)
                }
                className="w-16 h-7 text-xs"
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
