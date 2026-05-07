// src/components/PropertiesPanel.StairSection.tsx
// Phase 60 STAIRS-01 (D-08): stair-specific properties section.
//
// Inputs (D-08):
//   - Width (feet)        — float input, default = widthFtOverride ?? 3
//   - Rise per step (in)  — integer 4-9 (clamped on commit)
//   - Run per step (in)   — integer 9-13
//   - Step count          — integer 3-30
//   - Rotation (deg)      — 0-359
//   - Label               — text, max 40 chars (empty → undefined)
//
// Live-edit pattern (mirror Phase 31 D-09/D-10):
//   - onChange writes via updateStairNoHistory or resizeStairWidthNoHistory
//   - onBlur / Enter commits via the history-pushing variant
//   - Past[] increments by exactly 1 per edit session
//
// RESET button (D-08): when widthFtOverride is set, render a reset link that
// calls clearStairOverrides.
//
// Phase 33 D-34 spacing: only canonical (4/8/16/24/32). No p-3 / m-3 / gap-3.
// Phase 33 D-33 icons: lucide only (no Material Symbols in this file).

import { useEffect, useRef, useState } from "react";
import { useCADStore } from "@/stores/cadStore";
import type { Stair } from "@/types/cad";
import { DEFAULT_STAIR_WIDTH_FT } from "@/types/cad";

interface StairSectionProps {
  stair: Stair;
  roomId: string;
}

const RISE_MIN = 4;
const RISE_MAX = 9;
const RUN_MIN = 9;
const RUN_MAX = 13;
const STEP_COUNT_MIN = 3;
const STEP_COUNT_MAX = 30;
const ROTATION_MIN = 0;
const ROTATION_MAX = 359;
const LABEL_MAX = 40;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function StairSection({ stair, roomId }: StairSectionProps) {
  const updateStair = useCADStore((s) => s.updateStair);
  const updateStairNoHistory = useCADStore((s) => s.updateStairNoHistory);
  const resizeStairWidth = useCADStore((s) => s.resizeStairWidth);
  const resizeStairWidthNoHistory = useCADStore((s) => s.resizeStairWidthNoHistory);
  const clearStairOverrides = useCADStore((s) => s.clearStairOverrides);

  const widthFt = stair.widthFtOverride ?? DEFAULT_STAIR_WIDTH_FT;

  // Local draft state for live-preview. Reseed when stair changes.
  const [widthDraft, setWidthDraft] = useState(String(widthFt));
  const [riseDraft, setRiseDraft] = useState(String(stair.riseIn));
  const [runDraft, setRunDraft] = useState(String(stair.runIn));
  const [stepCountDraft, setStepCountDraft] = useState(String(stair.stepCount));
  const [rotationDraft, setRotationDraft] = useState(String(stair.rotation));
  const [labelDraft, setLabelDraft] = useState(stair.labelOverride ?? "");

  // Reseed drafts when the selected stair changes (or its underlying values
  // change due to undo/redo).
  const lastIdRef = useRef(stair.id);
  useEffect(() => {
    if (lastIdRef.current === stair.id) return;
    lastIdRef.current = stair.id;
    setWidthDraft(String(stair.widthFtOverride ?? DEFAULT_STAIR_WIDTH_FT));
    setRiseDraft(String(stair.riseIn));
    setRunDraft(String(stair.runIn));
    setStepCountDraft(String(stair.stepCount));
    setRotationDraft(String(stair.rotation));
    setLabelDraft(stair.labelOverride ?? "");
  }, [stair]);

  // ------------------------------------------------------------------------
  // Live-edit handlers — write NoHistory on every keystroke; commit (history)
  // on Enter or blur. Single past[] entry per edit session.
  // ------------------------------------------------------------------------
  function liveUpdate(patch: Partial<Stair>) {
    updateStairNoHistory(roomId, stair.id, patch);
  }
  function commitUpdate(patch: Partial<Stair>) {
    updateStair(roomId, stair.id, patch);
  }

  // Width has its own dedicated action (Phase 31-mirror — distinct because
  // it writes widthFtOverride, not the usual update path).
  function liveUpdateWidth(w: number) {
    resizeStairWidthNoHistory(roomId, stair.id, w);
  }
  function commitWidth(w: number) {
    resizeStairWidth(roomId, stair.id, w);
  }

  return (
    <div className="space-y-2">
      <div className="font-sans text-xs text-foreground">
        STAIR {stair.id.slice(-4).toUpperCase()}
      </div>

      <div className="space-y-2 border-t border-border/50 pt-2">
        <NumberRow
          label="Width"
          ariaLabel="Width"
          suffix="FT"
          value={widthDraft}
          onChange={(v) => {
            setWidthDraft(v);
            const n = parseFloat(v);
            if (!Number.isNaN(n) && n > 0) liveUpdateWidth(n);
          }}
          onCommit={() => {
            const n = parseFloat(widthDraft);
            if (Number.isNaN(n) || n <= 0) {
              setWidthDraft(String(widthFt));
              return;
            }
            const clamped = clamp(n, 0.5, 20);
            setWidthDraft(String(clamped));
            commitWidth(clamped);
          }}
          step={0.25}
        />
        {stair.widthFtOverride !== undefined && (
          <button
            type="button"
            onClick={() => {
              clearStairOverrides(roomId, stair.id);
              setWidthDraft(String(DEFAULT_STAIR_WIDTH_FT));
            }}
            data-testid="reset-stair-size"
            className="font-sans text-sm text-foreground hover:text-foreground"
          >
            Reset size
          </button>
        )}

        <NumberRow
          label="Rise"
          ariaLabel="Rise"
          suffix="IN"
          value={riseDraft}
          onChange={(v) => {
            setRiseDraft(v);
            const n = parseInt(v, 10);
            if (!Number.isNaN(n)) liveUpdate({ riseIn: n });
          }}
          onCommit={() => {
            const n = parseInt(riseDraft, 10);
            if (Number.isNaN(n)) {
              setRiseDraft(String(stair.riseIn));
              return;
            }
            const clamped = clamp(n, RISE_MIN, RISE_MAX);
            setRiseDraft(String(clamped));
            commitUpdate({ riseIn: clamped });
          }}
          step={1}
        />

        <NumberRow
          label="Run"
          ariaLabel="Run"
          suffix="IN"
          value={runDraft}
          onChange={(v) => {
            setRunDraft(v);
            const n = parseInt(v, 10);
            if (!Number.isNaN(n)) liveUpdate({ runIn: n });
          }}
          onCommit={() => {
            const n = parseInt(runDraft, 10);
            if (Number.isNaN(n)) {
              setRunDraft(String(stair.runIn));
              return;
            }
            const clamped = clamp(n, RUN_MIN, RUN_MAX);
            setRunDraft(String(clamped));
            commitUpdate({ runIn: clamped });
          }}
          step={1}
        />

        <NumberRow
          label="Step count"
          ariaLabel="Step count"
          suffix=""
          value={stepCountDraft}
          onChange={(v) => {
            setStepCountDraft(v);
            const n = parseInt(v, 10);
            if (!Number.isNaN(n)) liveUpdate({ stepCount: n });
          }}
          onCommit={() => {
            const n = parseInt(stepCountDraft, 10);
            if (Number.isNaN(n)) {
              setStepCountDraft(String(stair.stepCount));
              return;
            }
            const clamped = clamp(n, STEP_COUNT_MIN, STEP_COUNT_MAX);
            setStepCountDraft(String(clamped));
            commitUpdate({ stepCount: clamped });
          }}
          step={1}
        />

        <NumberRow
          label="Rotation"
          ariaLabel="Rotation"
          suffix="DEG"
          value={rotationDraft}
          onChange={(v) => {
            setRotationDraft(v);
            const n = parseFloat(v);
            if (!Number.isNaN(n)) liveUpdate({ rotation: n });
          }}
          onCommit={() => {
            const n = parseFloat(rotationDraft);
            if (Number.isNaN(n)) {
              setRotationDraft(String(stair.rotation));
              return;
            }
            const clamped = clamp(n, ROTATION_MIN, ROTATION_MAX);
            setRotationDraft(String(clamped));
            commitUpdate({ rotation: clamped });
          }}
          step={1}
        />

        <div className="flex flex-col gap-1">
          <label
            className="font-sans text-sm text-muted-foreground/60 tracking-wider"
            htmlFor={`stair-label-${stair.id}`}
          >
            Label
          </label>
          <input
            id={`stair-label-${stair.id}`}
            type="text"
            value={labelDraft}
            maxLength={LABEL_MAX}
            placeholder="Stairs"
            aria-label="Label"
            onChange={(e) => {
              const v = e.target.value;
              setLabelDraft(v);
              liveUpdate({
                labelOverride: v.trim() === "" ? undefined : v.slice(0, LABEL_MAX),
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            onBlur={() => {
              const v = labelDraft;
              commitUpdate({
                labelOverride: v.trim() === "" ? undefined : v.slice(0, LABEL_MAX),
              });
            }}
            className="px-2 py-1 font-sans text-sm text-foreground bg-background border border-border/60 rounded-smooth-md"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: simple number input row with label + suffix.
// Live-preview on change; commit on Enter or blur.
// ---------------------------------------------------------------------------
function NumberRow({
  label,
  ariaLabel,
  suffix,
  value,
  onChange,
  onCommit,
  step,
}: {
  label: string;
  ariaLabel: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  step: number;
}) {
  // Pitfall guard (mirror LabelOverrideInput skipNextBlurRef): Enter calls
  // .blur() to clean up focus, which also fires onBlur → commit a second
  // time. Set this ref in the Enter path so the synthesized blur skips.
  const skipNextBlurRef = useRef(false);
  return (
    <div className="flex flex-col gap-1">
      <label
        className="font-sans text-sm text-muted-foreground/60 tracking-wider"
        htmlFor={`stair-input-${ariaLabel}`}
      >
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={`stair-input-${ariaLabel}`}
          type="number"
          aria-label={ariaLabel}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              skipNextBlurRef.current = true;
              onCommit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          onBlur={() => {
            if (skipNextBlurRef.current) {
              skipNextBlurRef.current = false;
              return;
            }
            onCommit();
          }}
          className="flex-1 px-2 py-1 font-sans text-sm text-foreground bg-background border border-border/60 rounded-smooth-md"
        />
        {suffix && (
          <span className="font-sans text-sm text-muted-foreground/60">{suffix}</span>
        )}
      </div>
    </div>
  );
}
