// src/components/PropertiesPanel.OpeningSection.tsx
// Phase 61 OPEN-01 (D-10, research Q4): per-opening editor section.
//
// Phase 82 Plan 82-03 (IA-05) — opening rows now navigate to the new
// <OpeningInspector> via uiStore.setSelectedOpeningId. The previous
// accordion-style expand/collapse + inline OpeningEditor body is no
// longer reachable through the production UI; the inline expand is kept
// behind the same data-testid="opening-row-{id}" only so that the
// component itself still works in isolation (e.g. in unit-test contexts
// that don't mount RightInspector). With Plan 82-03 wired, clicking the
// row sets selectedOpeningId and the Wall inspector swaps into the
// OpeningInspector instead — see WallInspector.tsx.
//
// Phase 79 WIN-PRESETS-01 (Wave 3 — D-07/D-08/D-09): the window preset
// chip row LIVED here originally and was lifted VERBATIM into
// inspectors/OpeningInspector.tsx by Plan 82-03. Same applyPreset body
// (single update call → single past push), same derivePreset() on read,
// same data-testids.
import { useState } from "react";
import type { WallSegment, Opening } from "@/types/cad";
import { useUIStore } from "@/stores/uiStore";
import { Input } from "@/components/ui/Input";

interface Props {
  wall: WallSegment;
}

export function OpeningsSection({ wall }: Props) {
  if (!wall.openings || wall.openings.length === 0) {
    return (
      <div className="font-sans text-[13px] text-muted-foreground/60">
        0 OPENING(S)
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="font-sans text-[12px] text-muted-foreground/60 tracking-widest uppercase">
        {wall.openings.length} OPENING(S)
      </div>
      {wall.openings.map((op) => (
        <OpeningRow key={op.id} wall={wall} opening={op} />
      ))}
    </div>
  );
}

function OpeningRow({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  // Phase 82 Plan 82-03 (IA-05): clicking the row sets the opening
  // sub-selection; WallInspector watches uiStore.selectedOpeningId and
  // swaps in <OpeningInspector> instead of the Wall tabs. No inline
  // expand/collapse, no "+/−" toggle indicator. data-testid preserved.
  const setSelectedOpeningId = useUIStore((s) => s.setSelectedOpeningId);
  const kindLabel = opening.type.toUpperCase();
  const offsetLabel = `${opening.offset.toFixed(1)}'`;

  void wall; // wall arg preserved for parity with the old API; not needed here.

  return (
    <button
      type="button"
      onClick={() => setSelectedOpeningId(opening.id)}
      data-testid={`opening-row-${opening.id}`}
      className="w-full flex items-center justify-between px-2 py-1 font-sans text-[13px] text-foreground hover:bg-accent rounded-smooth-md transition-colors bg-card border border-border/50"
    >
      <span>
        {kindLabel} @ {offsetLabel}
      </span>
      <span className="text-muted-foreground/60">→</span>
    </button>
  );
}

// Phase 79 WindowPresetRow + the inline OpeningEditor body were lifted into
// inspectors/OpeningInspector.tsx by Phase 82 Plan 82-03. The function
// bodies (applyPreset → single update(...) call, derivePreset on read,
// all data-testids, the W/H/Sill/Offset/Depth NumericRow stack) moved
// with them; this comment is the bookmark. Production UI never expands
// an opening inline now — clicking an opening row sets
// uiStore.selectedOpeningId and WallInspector swaps to <OpeningInspector>.

// Phase 82 Plan 82-03: exported so OpeningInspector can reuse it inside
// its Dimensions / Position tabs without duplicating the input draft
// state + onBlur/Enter/Escape pattern.
export function NumericRow({
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
      <span className="font-sans text-[12px] text-muted-foreground/60 tracking-widest uppercase">
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
        <span className="font-sans text-[12px] text-muted-foreground/60">{unit}</span>
      </div>
    </div>
  );
}
