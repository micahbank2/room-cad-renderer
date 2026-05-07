// src/components/PropertiesPanel.OpeningSection.tsx
// Phase 61 OPEN-01 (D-10, research Q4): per-opening editor section.
//
// Rendered inside PropertiesPanel for the selected wall. Replaces the
// previous static `{N} OPENING(S)` text. Each opening shows a row with kind
// + offset; clicking expands to width / height / sillHeight / offset
// inputs. Niche openings get an extra Depth (inches) input that clamps to
// wallThickness − 1″ on commit. Passthrough rows show a placeholder note
// that height defaults to wall.height. Archway hides the depth input.
//
// All inputs use the Phase 31 single-undo pattern:
//   onChange  → updateOpeningNoHistory(wallId, openingId, partial)
//   onBlur/Enter → updateOpening(wallId, openingId, partial)  (commit)
import { useState } from "react";
import type { WallSegment, Opening } from "@/types/cad";
import { clampNicheDepth } from "@/types/cad";
import { useCADStore } from "@/stores/cadStore";

interface Props {
  wall: WallSegment;
}

export function OpeningsSection({ wall }: Props) {
  if (!wall.openings || wall.openings.length === 0) {
    return (
      <div className="font-mono text-[11px] text-muted-foreground/60">
        0 OPENING(S)
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest uppercase">
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
    <div className="bg-card ghost-border rounded-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        data-testid={`opening-row-${opening.id}`}
        className="w-full flex items-center justify-between px-2 py-1 font-mono text-[11px] text-foreground hover:bg-accent transition-colors"
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

function OpeningEditor({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  const updateNoHistory = useCADStore((s) => s.updateOpeningNoHistory);
  const update = useCADStore((s) => s.updateOpening);

  return (
    <div className="px-2 pb-2 pt-1 space-y-1">
      <NumericRow
        label="WIDTH"
        unit="ft"
        value={opening.width}
        onPreview={(v) => updateNoHistory(wall.id, opening.id, { width: v })}
        onCommit={(v) => update(wall.id, opening.id, { width: v })}
      />
      <NumericRow
        label="HEIGHT"
        unit="ft"
        value={opening.height}
        placeholder={opening.type === "passthrough" ? "Wall height" : undefined}
        onPreview={(v) => updateNoHistory(wall.id, opening.id, { height: v })}
        onCommit={(v) => update(wall.id, opening.id, { height: v })}
      />
      <NumericRow
        label="SILL"
        unit="ft"
        value={opening.sillHeight}
        onPreview={(v) => updateNoHistory(wall.id, opening.id, { sillHeight: v })}
        onCommit={(v) => update(wall.id, opening.id, { sillHeight: v })}
      />
      <NumericRow
        label="OFFSET"
        unit="ft"
        value={opening.offset}
        onPreview={(v) => updateNoHistory(wall.id, opening.id, { offset: v })}
        onCommit={(v) => update(wall.id, opening.id, { offset: v })}
      />
      {opening.type === "niche" && (
        <NumericRow
          label="DEPTH"
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
      <span className="font-mono text-[10px] text-muted-foreground/60 tracking-widest uppercase">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <input
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
          className="w-16 font-mono text-[11px] bg-accent text-foreground border border-border/60 px-1 py-0.5 rounded-sm text-right"
        />
        <span className="font-mono text-[10px] text-muted-foreground/60">{unit}</span>
      </div>
    </div>
  );
}
