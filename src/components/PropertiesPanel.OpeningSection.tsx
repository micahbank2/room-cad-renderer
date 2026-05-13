// src/components/PropertiesPanel.OpeningSection.tsx
// Phase 61 OPEN-01 (D-10, research Q4): per-opening editor section.
// Phase 79 WIN-PRESETS-01 (Wave 3 — D-07/D-08/D-09): for window-type openings,
// renders a derived "Preset: {Label}" row + chip switcher above the
// numeric W/H/Sill inputs. The label is computed on read via derivePreset()
// — no field is stored on Opening; switching presets reuses the existing
// updateOpening action (single Ctrl+Z entry per chip click).
//
// Rendered inside PropertiesPanel for the selected wall. Each opening shows
// a row with kind + offset; clicking expands to width / height / sillHeight
// / offset inputs. Niche openings get an extra Depth (inches) input that
// clamps to wallThickness − 1″ on commit. Passthrough rows show a
// placeholder note that height defaults to wall.height. Archway hides the
// depth input.
//
// All inputs use the Phase 31 single-undo pattern:
//   onChange  → updateOpeningNoHistory(wallId, openingId, partial)
//   onBlur/Enter → updateOpening(wallId, openingId, partial)  (commit)
import { useState } from "react";
import type { WallSegment, Opening } from "@/types/cad";
import { clampNicheDepth } from "@/types/cad";
import { useCADStore } from "@/stores/cadStore";
import { Input } from "@/components/ui/Input";
import {
  WINDOW_PRESETS,
  derivePreset,
  type WindowPresetId,
} from "@/lib/windowPresets";
import { cn } from "@/lib/cn";

interface Props {
  wall: WallSegment;
}

export function OpeningsSection({ wall }: Props) {
  if (!wall.openings || wall.openings.length === 0) {
    return (
      <div className="font-sans text-[11px] text-muted-foreground/60">
        0 OPENING(S)
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="font-sans text-[10px] text-muted-foreground/60 tracking-widest uppercase">
        {wall.openings.length} OPENING(S)
      </div>
      {wall.openings.map((op) => (
        <OpeningRow key={op.id} wall={wall} opening={op} />
      ))}
    </div>
  );
}

function OpeningRow({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  const [expanded, setExpanded] = useState(false);
  const kindLabel = opening.type.toUpperCase();
  const offsetLabel = `${opening.offset.toFixed(1)}'`;

  return (
    <div className="bg-card border border-border/50 rounded-smooth-md">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        data-testid={`opening-row-${opening.id}`}
        className="w-full flex items-center justify-between px-2 py-1 font-sans text-[11px] text-foreground hover:bg-accent transition-colors"
      >
        <span>
          {kindLabel} @ {offsetLabel}
        </span>
        <span className="text-muted-foreground/60">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && <OpeningEditor wall={wall} opening={opening} />}
    </div>
  );
}

/**
 * Phase 79 WIN-PRESETS-01 (D-07, D-09): derived preset label + chip row.
 * - Renders only when opening.type === "window" (door / archway / passthrough
 *   / niche are unaffected).
 * - Label text is derived on read from current dims via derivePreset(); no
 *   field is stored on Opening (D-09 invariant).
 * - Chip click calls `update(wall.id, opening.id, { width, height, sillHeight })`
 *   — single updateOpening call → exactly one past[] entry per click.
 */
function WindowPresetRow({
  wall,
  opening,
  update,
}: {
  wall: WallSegment;
  opening: Opening;
  update: (
    wallId: string,
    openingId: string,
    changes: Partial<Opening>,
  ) => void;
}) {
  const derivedId: WindowPresetId | "custom" = derivePreset({
    width: opening.width,
    height: opening.height,
    sillHeight: opening.sillHeight,
  });
  const derivedLabel =
    derivedId === "custom"
      ? "Custom"
      : (WINDOW_PRESETS.find((p) => p.id === derivedId)?.label ?? "Custom");

  function applyPreset(p: { width: number; height: number; sillHeight: number }) {
    update(wall.id, opening.id, {
      width: p.width,
      height: p.height,
      sillHeight: p.sillHeight,
    });
  }

  return (
    <div className="flex flex-col gap-2 pb-2 border-b border-border/40">
      <div
        data-testid="opening-preset-label"
        className="text-sm font-sans text-muted-foreground"
      >
        {`Preset: ${derivedLabel}`}
      </div>
      <div className="flex flex-wrap gap-1">
        {WINDOW_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-testid={`opening-preset-chip-${opening.id}-${p.id}`}
            onClick={() => applyPreset(p)}
            className={cn(
              "px-2 py-0.5 text-xs font-sans rounded-smooth-md border transition-colors",
              derivedId === p.id
                ? "bg-accent/10 ring-1 ring-accent/40 border-transparent text-foreground"
                : "border-border hover:bg-accent text-muted-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        {/* Custom chip — no-op on click (Custom = "use current values"); the
            label still highlights this chip when dims don't match a preset. */}
        <button
          type="button"
          data-testid={`opening-preset-chip-${opening.id}-custom`}
          onClick={() => {
            /* no-op: user edits W/H/Sill manually in NumericRows below */
          }}
          className={cn(
            "px-2 py-0.5 text-xs font-sans rounded-smooth-md border transition-colors",
            derivedId === "custom"
              ? "bg-accent/10 ring-1 ring-accent/40 border-transparent text-foreground"
              : "border-border hover:bg-accent text-muted-foreground",
          )}
        >
          Custom
        </button>
      </div>
    </div>
  );
}

function OpeningEditor({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  const updateNoHistory = useCADStore((s) => s.updateOpeningNoHistory);
  const update = useCADStore((s) => s.updateOpening);

  return (
    <div className="px-2 pb-2 pt-1 space-y-2">
      {/* Phase 79 WIN-PRESETS-01: window-only preset label + chip row */}
      {opening.type === "window" && (
        <WindowPresetRow wall={wall} opening={opening} update={update} />
      )}
      <div className="space-y-1">
        <NumericRow
          label="Width"
          unit="ft"
          value={opening.width}
          onPreview={(v) => updateNoHistory(wall.id, opening.id, { width: v })}
          onCommit={(v) => update(wall.id, opening.id, { width: v })}
        />
        <NumericRow
          label="Height"
          unit="ft"
          value={opening.height}
          placeholder={opening.type === "passthrough" ? "Wall height" : undefined}
          onPreview={(v) => updateNoHistory(wall.id, opening.id, { height: v })}
          onCommit={(v) => update(wall.id, opening.id, { height: v })}
        />
        <NumericRow
          label="Sill"
          unit="ft"
          value={opening.sillHeight}
          onPreview={(v) => updateNoHistory(wall.id, opening.id, { sillHeight: v })}
          onCommit={(v) => update(wall.id, opening.id, { sillHeight: v })}
        />
        <NumericRow
          label="Offset"
          unit="ft"
          value={opening.offset}
          onPreview={(v) => updateNoHistory(wall.id, opening.id, { offset: v })}
          onCommit={(v) => update(wall.id, opening.id, { offset: v })}
        />
        {opening.type === "niche" && (
          <NumericRow
            label="Depth"
            unit="in"
            // Display the depth in inches (1ft = 12in).
            value={(opening.depthFt ?? 0.5) * 12}
            onPreview={(inches) => {
              const ft = inches / 12;
              updateNoHistory(wall.id, opening.id, { depthFt: ft });
            }}
            onCommit={(inches) => {
              const ft = clampNicheDepth(inches / 12, wall.thickness);
              update(wall.id, opening.id, { depthFt: ft });
            }}
            dataTestId={`opening-depth-${opening.id}`}
          />
        )}
      </div>
    </div>
  );
}

function NumericRow({
  label,
  unit,
  value,
  placeholder,
  onPreview,
  onCommit,
  dataTestId,
}: {
  label: string;
  unit: string;
  value: number;
  placeholder?: string;
  onPreview: (v: number) => void;
  onCommit: (v: number) => void;
  dataTestId?: string;
}) {
  const [draft, setDraft] = useState<string>(value.toFixed(2));

  // When the canonical value changes from outside (e.g. undo), refresh draft
  // unless the input is currently focused.
  // (Lightweight controlled-on-blur pattern; matches Phase 31 convention.)
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-sans text-[10px] text-muted-foreground/60 tracking-widest uppercase">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.1"
          data-testid={dataTestId}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseFloat(e.target.value);
            if (!Number.isFinite(n)) return;
            onPreview(n);
          }}
          onBlur={() => {
            const n = parseFloat(draft);
            if (!Number.isFinite(n)) {
              setDraft(value.toFixed(2));
              return;
            }
            onCommit(n);
            setDraft(n.toFixed(2));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setDraft(value.toFixed(2));
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-16 h-7 text-xs text-right bg-accent"
        />
        <span className="font-sans text-[10px] text-muted-foreground/60">{unit}</span>
      </div>
    </div>
  );
}
