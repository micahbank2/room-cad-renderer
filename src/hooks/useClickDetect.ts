// Phase 54 PROPS3D-01: click-vs-orbit-drag detection for R3F mesh components.
// D-01: track pointer-down screen position; on pointer-up, compute distance moved.
// If < CLICK_THRESHOLD_PX, treat as click (dispatch select). If >= threshold, treat as drag.
// Each hook call gets its own useRef — no shared module-level state.

import { useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";

export const CLICK_THRESHOLD_PX = 5;

/** Pure function — testable without DOM. Returns true if pointer movement qualifies as a click. */
export function isClick(x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy) < CLICK_THRESHOLD_PX;
}

/**
 * Returns onPointerDown/onPointerUp handlers for R3F meshes.
 * Only fires onSelect for left-click (button=0) with < 5px movement.
 * Calls e.stopPropagation() on confirmed click to prevent Canvas onPointerMissed deselect.
 */
export function useClickDetect(onSelect: () => void): {
  handlePointerDown: (e: ThreeEvent<PointerEvent>) => void;
  handlePointerUp: (e: ThreeEvent<PointerEvent>) => void;
} {
  const downPos = useRef<{ x: number; y: number } | null>(null);

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    if (e.button !== 0) return;
    downPos.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerUp(e: ThreeEvent<PointerEvent>) {
    if (e.button !== 0 || !downPos.current) return;
    if (isClick(downPos.current.x, downPos.current.y, e.clientX, e.clientY)) {
      e.stopPropagation(); // prevent Canvas onPointerMissed from also deselecting
      onSelect();
    }
    downPos.current = null;
  }

  return { handlePointerDown, handlePointerUp };
}
