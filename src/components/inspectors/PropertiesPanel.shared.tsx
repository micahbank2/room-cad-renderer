// src/components/inspectors/PropertiesPanel.shared.tsx
//
// Phase 82 Plan 82-01 — shared subcomponents lifted out of the 1010-line
// PropertiesPanel.tsx. JSX is verbatim; the file's only purpose is to
// let per-entity inspector files import these without pulling in the
// entity-discrimination dispatcher.
//
// Phase 79 preserved: __driveRotationPreset registers gated on
// import.meta.env.MODE === "test" (Phase 31 driver convention,
// CLAUDE.md §7 StrictMode-safe pattern — preserved from original site).
//
// No logic changes from the original PropertiesPanel.tsx blocks; only
// the function visibility (`export`) changed.

import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { formatFeet, polygonBbox } from "@/lib/geometry";
import type { PlacedCustomElement, Ceiling } from "@/types/cad";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Camera, CameraOff } from "lucide-react";

// Phase 33 Plan 08 (GH #87) — rotation preset chips (D-19/D-20/D-21/D-22).
// 5 presets per D-19. History-pushing action per chip click (D-20): call
// sites invoke `rotateProduct(id, deg)` for products and
// `updatePlacedCustomElement(id, { rotation: deg })` for custom elements.
// Each chip click MUST increment past[] by exactly one.
// Works for products AND custom elements (D-21). Placed to the RIGHT of the
// numeric rotation display (D-22).
const ROTATION_PRESETS = [-90, -45, 0, 45, 90] as const;

export function RotationPresetChips({
  currentRotation,
  onSelect,
}: {
  currentRotation: number;
  // onSelect is wired to history-pushing store actions at the call site:
  //   products        → rotateProduct(id, deg)
  //   custom elements → updatePlacedCustomElement(id, { rotation: deg })
  onSelect: (deg: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" data-rotation-presets>
      {ROTATION_PRESETS.map((preset) => {
        const isActive = Math.abs(currentRotation - preset) < 0.5;
        const label =
          preset === 0
            ? "0°"
            : preset > 0
              ? `+${preset}°`
              : `${preset}°`;
        return (
          <Button
            key={preset}
            variant="ghost"
            size="sm"
            active={isActive}
            onClick={() => onSelect(preset)}
            data-rotation-preset={preset}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Phase 48 CAM-04 (D-01, D-09, D-11): Save / Clear camera buttons for a leaf entity.
 * Save reads the live OrbitControls pose via uiStore.getCameraCapture (Plan 02 bridge).
 * Save is disabled in 2D / library views (D-09) — no 3D camera available.
 * Clear renders only when the entity already has a savedCameraPos.
 */
export function SavedCameraButtons({
  kind,
  id,
  hasSavedCamera,
  viewMode,
  onSave,
  onClear,
}: {
  kind: "wall" | "product" | "ceiling" | "custom" | "stair";
  id: string;
  hasSavedCamera: boolean;
  viewMode: "2d" | "3d" | "split" | "library";
  onSave: (id: string, pos: [number, number, number], target: [number, number, number]) => void;
  onClear: (kind: "wall" | "product" | "ceiling" | "custom" | "stair", id: string) => void;
}) {
  const disabled = viewMode === "2d" || viewMode === "library";
  const saveTitle = disabled
    ? "Switch to 3D view to save a camera angle"
    : "Save current camera angle to this node";

  const handleSave = () => {
    if (disabled) return;
    const uiState = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      getCameraCapture?: (() => { pos: [number, number, number]; target: [number, number, number] } | null) | null;
    };
    const capture = uiState.getCameraCapture?.();
    if (!capture) return;
    // Read action live from store so test spies (vi.spyOn on getState() result) are intercepted.
    const cadState = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: typeof onSave;
      setSavedCameraOnProductNoHistory?: typeof onSave;
      setSavedCameraOnCeilingNoHistory?: typeof onSave;
      setSavedCameraOnCustomElementNoHistory?: typeof onSave;
      setSavedCameraOnStairNoHistory?: (id: string, pos: [number, number, number], target: [number, number, number]) => void;
    };
    if (kind === "wall") cadState.setSavedCameraOnWallNoHistory?.(id, capture.pos, capture.target);
    else if (kind === "product") cadState.setSavedCameraOnProductNoHistory?.(id, capture.pos, capture.target);
    else if (kind === "ceiling") cadState.setSavedCameraOnCeilingNoHistory?.(id, capture.pos, capture.target);
    else if (kind === "custom") cadState.setSavedCameraOnCustomElementNoHistory?.(id, capture.pos, capture.target);
    else if (kind === "stair") cadState.setSavedCameraOnStairNoHistory?.(id, capture.pos, capture.target);
    else onSave(id, capture.pos, capture.target);
  };

  const handleClear = () => {
    // Read action live from store so test spies (vi.spyOn on getState() result) are intercepted.
    const cadState = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      clearSavedCameraNoHistory?: typeof onClear;
    };
    if (cadState.clearSavedCameraNoHistory) {
      cadState.clearSavedCameraNoHistory(kind, id);
    } else {
      onClear(kind, id);
    }
  };

  return (
    <div className="flex items-center gap-1" data-saved-camera-buttons>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={disabled}
        data-testid="save-camera-btn"
        aria-label="Save camera"
        title={saveTitle}
      >
        <Camera className="w-3.5 h-3.5" />
        <span>Save camera</span>
      </Button>
      {hasSavedCamera && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          data-testid="clear-camera-btn"
          aria-label="Clear saved camera"
          title="Remove saved camera angle"
        >
          <CameraOff className="w-3.5 h-3.5" />
          <span>Clear</span>
        </Button>
      )}
    </div>
  );
}

/**
 * Phase 31 CUSTOM-06 — per-placement label override.
 *
 * Live preview on every keystroke via NoHistory (D-09 no debounce).
 * Commit on Enter or blur via the history-pushing variant — exactly ONE
 * history entry per edit session (D-10). Escape rewinds the live-preview
 * via NoHistory back to the original value (mirror Phase 29).
 *
 * Empty string (after trim) commits as `undefined` so the canvas reverts
 * to the catalog name (D-11). Client-enforced 40-char cap (D-12).
 */
export function LabelOverrideInput({
  pce,
  catalogName,
}: {
  pce: PlacedCustomElement;
  catalogName: string;
}) {
  const updatePlacedCustomElement = useCADStore(
    (s) => s.updatePlacedCustomElement,
  );
  const updatePlacedCustomElementNoHistory = useCADStore(
    (s) => s.updatePlacedCustomElementNoHistory,
  );
  const [draft, setDraft] = useState<string>(pce.labelOverride ?? "");
  const originalRef = useRef<string | undefined>(pce.labelOverride);

  // Phase 53 CTXMENU-01: auto-focus when "Rename label" context menu action fires.
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingLabelFocus = useUIStore((s) => s.pendingLabelFocus);
  useEffect(() => {
    if (pendingLabelFocus === pce.id && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      useUIStore.getState().setPendingLabelFocus(null);
    }
  }, [pendingLabelFocus, pce.id]);
  // Pitfall guard: Escape calls .blur() to clean up focus, which also fires
  // onBlur → commit(). Escape ran cancel() with the pre-edit value, but
  // commit() reads the stale draft closure (still has the typed text). Set
  // this ref in cancel() so onBlur skips commit for the cancellation cycle.
  const skipNextBlurRef = useRef<boolean>(false);

  // Reseed on selection swap.
  useEffect(() => {
    setDraft(pce.labelOverride ?? "");
    originalRef.current = pce.labelOverride;
  }, [pce.id]);

  function commit() {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }
    const trimmed = draft.trim();
    const finalValue = trimmed === "" ? undefined : draft.slice(0, 40);
    updatePlacedCustomElement(pce.id, { labelOverride: finalValue });
    originalRef.current = finalValue;
  }

  function cancel() {
    skipNextBlurRef.current = true;
    updatePlacedCustomElementNoHistory(pce.id, {
      labelOverride: originalRef.current,
    });
    setDraft(originalRef.current ?? "");
  }

  // Phase 31 CUSTOM-06 D-10 — programmatic test driver. Bypasses the DOM
  // input but exercises the same store-action sequence the keyboard path
  // uses (NoHistory keystrokes + history-pushing commit).
  useEffect(() => {
    if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
    (window as unknown as {
      __driveLabelOverride?: {
        typeAndCommit: (
          pceId: string,
          text: string,
          mode: "enter" | "blur",
        ) => void;
      };
    }).__driveLabelOverride = {
      typeAndCommit: (pceId, text, _mode) => {
        // Live preview: one NoHistory write per cumulative prefix.
        for (let i = 1; i <= text.length; i++) {
          updatePlacedCustomElementNoHistory(pceId, {
            labelOverride: text.slice(0, i),
          });
        }
        // Commit: one history-pushing write.
        const trimmed = text.trim();
        const finalValue = trimmed === "" ? undefined : text.slice(0, 40);
        updatePlacedCustomElement(pceId, { labelOverride: finalValue });
        // mode is observational — Enter and blur are identical per D-10.
        void _mode;
      },
    };
    return () => {
      delete (window as unknown as { __driveLabelOverride?: unknown })
        .__driveLabelOverride;
    };
  }, [pce.id, updatePlacedCustomElement, updatePlacedCustomElementNoHistory]);

  return (
    <div className="flex flex-col gap-1">
      <label className="font-sans text-[11px] text-muted-foreground/60 tracking-wider">
        LABEL_OVERRIDE
      </label>
      <Input
        ref={inputRef}
        type="text"
        value={draft}
        maxLength={40}
        placeholder={catalogName.toUpperCase()}
        aria-label="Label override"
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          updatePlacedCustomElementNoHistory(pce.id, { labelOverride: v });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            cancel();
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={commit}
        className="h-7 text-xs"
      />
    </div>
  );
}

/**
 * Phase 65 CEIL-02 — WIDTH/DEPTH input for a selected ceiling.
 *
 * Live-preview via resizeCeilingAxisNoHistory on every keystroke; commit on
 * Enter or blur via resizeCeilingAxis (single undo per edit session). Empty
 * commit is a no-op (the dedicated RESET_SIZE button handles clearing).
 *
 * Default value when no override is set: derived from polygonBbox of the
 * original points so users see the current size before editing.
 */
export function CeilingDimInput({
  ceiling,
  axis,
  label,
}: {
  ceiling: Ceiling;
  axis: "width" | "depth";
  label: string;
}) {
  const resizeCeilingAxis = useCADStore((s) => s.resizeCeilingAxis);
  const resizeCeilingAxisNoHistory = useCADStore((s) => s.resizeCeilingAxisNoHistory);
  const baseValue =
    axis === "width"
      ? (ceiling.widthFtOverride ?? polygonBbox(ceiling.points).width)
      : (ceiling.depthFtOverride ?? polygonBbox(ceiling.points).depth);
  const [draft, setDraft] = useState<string>(baseValue.toFixed(2));
  // Track the value at the start of an edit session so we can:
  //   1. Roll back live-preview on Escape (mirror Phase 31 LabelOverride).
  //   2. Suppress redundant commit() calls when blur fires after Enter.
  const editStartedRef = useRef<boolean>(false);
  const originalOverrideRef = useRef<number | undefined>(
    axis === "width" ? ceiling.widthFtOverride : ceiling.depthFtOverride,
  );
  // Reseed when ceiling changes / override changes externally (e.g. drag).
  useEffect(() => {
    if (!editStartedRef.current) {
      setDraft(baseValue.toFixed(2));
    }
  }, [ceiling.id, ceiling.widthFtOverride, ceiling.depthFtOverride]);

  function commit() {
    if (!editStartedRef.current) return; // no-op if no edit in progress
    editStartedRef.current = false;
    const trimmed = draft.trim();
    if (trimmed === "") return;
    const v = parseFloat(trimmed);
    if (!isFinite(v) || v <= 0) return;
    // Push exactly one history entry. resizeCeilingAxis pushes its own
    // snapshot; the live-preview NoHistory writes did NOT push anything,
    // so this is the single undo entry for the edit session.
    resizeCeilingAxis(ceiling.id, axis, v);
    originalOverrideRef.current =
      axis === "width" ? v : originalOverrideRef.current;
  }

  return (
    <div className="flex justify-between items-center">
      <label
        className="font-sans text-[11px] text-muted-foreground/60 tracking-wider"
        htmlFor={`ceiling-dim-${axis}-${ceiling.id}`}
      >
        {label}
      </label>
      <Input
        id={`ceiling-dim-${axis}-${ceiling.id}`}
        type="text"
        aria-label={label}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          editStartedRef.current = true;
          const num = parseFloat(v);
          if (isFinite(num) && num > 0) {
            resizeCeilingAxisNoHistory(ceiling.id, axis, num);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={commit}
        className="w-20 h-7 text-xs text-right"
      />
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-sans text-[11px] text-muted-foreground/60 tracking-wider">{label}</span>
      <span className="font-sans text-[11px] text-foreground">{value}</span>
    </div>
  );
}

export function EditableRow({
  label,
  value,
  suffix,
  onCommit,
  min = 0,
  step = 0.25,
  parser,
}: {
  label: string;
  value: number;
  suffix: string;
  onCommit: (v: number) => void;
  min?: number;
  step?: number;
  parser?: (raw: string) => number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() {
    // flushSync so the <input> is in the DOM synchronously after click —
    // keeps inline-edit deterministic for tests and consistent with the
    // wainscot popover precedent.
    flushSync(() => {
      setDraft(value.toFixed(2));
      setEditing(true);
    });
  }

  function commit() {
    setEditing(false);
    // D-05a: when parser supplied, use it; otherwise preserve parseFloat behavior
    const parsed = parser ? parser(draft) : parseFloat(draft);
    // Silent cancel on null/NaN/non-finite (D-06a)
    if (parsed === null || parsed === undefined || !isFinite(parsed as number)) {
      return;
    }
    const v = parsed as number;
    // Existing min guard
    if (v < min) return;
    // RESEARCH Pitfall #2: no-op guard — suppress commits within float-drift tolerance
    if (Math.abs(v - value) <= 1e-6) return;
    onCommit(v);
  }

  if (editing) {
    return (
      <div className="flex justify-between items-center">
        <span className="font-sans text-[11px] text-muted-foreground/60 tracking-wider">{label}</span>
        <Input
          autoFocus
          type={parser ? "text" : "number"}
          step={step}
          min={min}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-20 h-7 text-xs text-right"
        />
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center group cursor-pointer" onClick={startEdit}>
      <span className="font-sans text-[11px] text-muted-foreground/60 tracking-wider">{label}</span>
      <span className="font-sans text-[11px] text-foreground group-hover:underline">
        {formatFeet(value)} {suffix && <span className="text-muted-foreground/60">{suffix}</span>}
      </span>
    </div>
  );
}

/** Phase 85 D-04 — silent clamp helper for inspector numeric inputs.
 *
 * Tightens the inspector-layer floor to 0.5 (vs. the store-layer 0.25 floor
 * preserved for Phase 31 drag-handle UX). Non-finite values (NaN / Infinity)
 * snap to the min — matches the "silent clamp, no error" UX from D-04.
 */
export function clampInspectorValue(v: number, min = 0.5, max = 50): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

interface NumericInputRowProps {
  label: string;
  value: number;
  onCommit: (clamped: number) => void;
  testid: string;
  min?: number;
  max?: number;
  step?: number;
}

/** Phase 85 D-05 — labeled numeric input row.
 *
 * Uncontrolled input keyed by `${testid}-${formatted}` so when the upstream
 * value changes (drag-resize, undo, redo, store update from another source)
 * the input re-mounts with the fresh defaultValue rather than retaining a
 * stale edit. Commits on Enter or blur via `onCommit(clamped)`; Escape
 * rewinds the buffer to the formatted source-of-truth value and blurs.
 *
 * Mixed-case labels per CLAUDE.md D-09.
 */
export function NumericInputRow({
  label,
  value,
  onCommit,
  testid,
  min = 0.5,
  max = 50,
  step = 0.25,
}: NumericInputRowProps) {
  const formatted = value.toFixed(2);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-sans text-[11px] text-muted-foreground/60 tracking-wider">
        {label}
      </span>
      <input
        data-testid={testid}
        type="number"
        step={step}
        min={min}
        max={max}
        defaultValue={formatted}
        key={`${testid}-${formatted}`}
        className="h-7 w-20 text-xs px-1.5 bg-card border border-border rounded-sm font-mono text-foreground"
        onBlur={(e) => {
          const raw = parseFloat(e.target.value);
          const clamped = clampInspectorValue(raw, min, max);
          e.target.value = clamped.toFixed(2);
          onCommit(clamped);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            (e.target as HTMLInputElement).value = formatted;
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}

// Phase 33 Plan 08 (GH #87) — test driver for rotation preset chips.
// Gated by MODE === "test" per Phase 31 driver convention. Exposes click +
// lookup helpers so RTL specs can exercise the preset block without
// depending on jsdom hit-tests or Fabric state.
if (import.meta.env.MODE === "test" && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__driveRotationPreset = {
    click: (deg: number) => {
      const btn = document.querySelector(
        `[data-rotation-preset="${deg}"]`,
      ) as HTMLButtonElement | null;
      btn?.click();
    },
    getRotation: (id: string): number | null => {
      const state = useCADStore.getState() as unknown as {
        rooms: Record<
          string,
          {
            placedProducts?: Record<string, { rotation: number }>;
            placedCustomElements?: Record<string, { rotation: number }>;
          }
        >;
        activeRoomId: string | null;
      };
      const room = state.activeRoomId ? state.rooms[state.activeRoomId] : undefined;
      if (!room) return null;
      if (room.placedProducts?.[id]) return room.placedProducts[id].rotation;
      if (room.placedCustomElements?.[id])
        return room.placedCustomElements[id].rotation;
      return null;
    },
    getHistoryLength: () => useCADStore.getState().past.length,
  };
}
