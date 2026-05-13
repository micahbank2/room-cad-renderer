import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { wallLength, angle as wallAngle } from "@/lib/geometry";
import { pxToFeet, findClosestWall } from "./toolUtils";
import { WINDOW_PRESETS } from "@/lib/windowPresets";
import type { WallSegment } from "@/types/cad";

/**
 * Phase 79 WIN-PRESETS-01 — switcher → tool bridge.
 *
 * CLAUDE.md D-07 intentional exception: this is a module-level public-API
 * bridge between the React WindowPresetSwitcher and the imperative
 * Fabric tool, parallel to productTool.pendingProductId.
 *
 * Default matches the historical hardcoded 3/4/3 so existing placements
 * (and tests written against the old default) still work when no
 * switcher has written a selection yet.
 *
 * Pitfall 1: do NOT clear this on tool deactivation — StrictMode would
 * race the next mount's write against the live tool's read. The bridge
 * persists for the lifetime of the page.
 */
let currentWindowPreset: { width: number; height: number; sillHeight: number } = {
  width: 3,
  height: 4,
  sillHeight: 3,
};

export function setCurrentWindowPreset(p: {
  width: number;
  height: number;
  sillHeight: number;
}): void {
  currentWindowPreset = { width: p.width, height: p.height, sillHeight: p.sillHeight };
}

export function getCurrentWindowPreset(): {
  width: number;
  height: number;
  sillHeight: number;
} {
  return currentWindowPreset;
}

export function activateWindowTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
  let previewPolygon: fabric.Polygon | null = null;

  const updatePreview = (
    hit: { wall: WallSegment; offset: number } | null,
  ) => {
    if (!hit) {
      if (previewPolygon) {
        fc.remove(previewPolygon);
        previewPolygon = null;
        fc.renderAll();
      }
      return;
    }
    const len = wallLength(hit.wall);
    const halfWin = currentWindowPreset.width / 2;
    const clampedOffset = Math.max(halfWin, Math.min(len - halfWin, hit.offset));
    const startOffset = clampedOffset - halfWin;
    const endOffset = clampedOffset + halfWin;
    const tStart = startOffset / len;
    const tEnd = endOffset / len;
    const dx = hit.wall.end.x - hit.wall.start.x;
    const dy = hit.wall.end.y - hit.wall.start.y;
    const oStart = { x: hit.wall.start.x + dx * tStart, y: hit.wall.start.y + dy * tStart };
    const oEnd = { x: hit.wall.start.x + dx * tEnd, y: hit.wall.start.y + dy * tEnd };
    const a = wallAngle(hit.wall.start, hit.wall.end);
    const perpAngle = a + Math.PI / 2;
    const halfT = hit.wall.thickness / 2;
    const pdx = Math.cos(perpAngle) * halfT;
    const pdy = Math.sin(perpAngle) * halfT;

    const pts = [
      { x: origin.x + (oStart.x - pdx) * scale, y: origin.y + (oStart.y - pdy) * scale },
      { x: origin.x + (oStart.x + pdx) * scale, y: origin.y + (oStart.y + pdy) * scale },
      { x: origin.x + (oEnd.x + pdx) * scale, y: origin.y + (oEnd.y + pdy) * scale },
      { x: origin.x + (oEnd.x - pdx) * scale, y: origin.y + (oEnd.y - pdy) * scale },
    ];

    // Recreate the polygon each update — Fabric doesn't recompute polygon
    // bounds when .points is mutated.
    if (previewPolygon) {
      fc.remove(previewPolygon);
    }
    previewPolygon = new fabric.Polygon(pts, {
      fill: "rgba(124,91,240,0.25)",
      stroke: "#ccbeff",
      strokeWidth: 1,
      strokeDashArray: [4, 3],
      selectable: false,
      evented: false,
    });
    fc.add(previewPolygon);
    fc.renderAll();
  };

  const clearPreview = () => {
    if (previewPolygon) {
      fc.remove(previewPolygon);
      previewPolygon = null;
      fc.renderAll();
    }
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const hit = findClosestWall(feet, currentWindowPreset.width);
    updatePreview(hit);
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const hit = findClosestWall(feet, currentWindowPreset.width);

    if (hit) {
      const len = wallLength(hit.wall);
      const halfWin = currentWindowPreset.width / 2;
      const clampedOffset = Math.max(halfWin, Math.min(len - halfWin, hit.offset));

      useCADStore.getState().addOpening(hit.wall.id, {
        type: "window",
        offset: clampedOffset - halfWin,
        width: currentWindowPreset.width,
        height: currentWindowPreset.height,
        sillHeight: currentWindowPreset.sillHeight,
      });
      clearPreview();
      // Auto-revert to Select after placing (EDIT-11)
      useUIStore.getState().setTool("select");
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      clearPreview();
      useUIStore.getState().setTool("select");
    }
  };

  fc.on("mouse:move", onMouseMove);
  fc.on("mouse:down", onMouseDown);
  document.addEventListener("keydown", onKeyDown);

  // Phase 79 — test-mode driver. Mirrors productTool.ts driver pattern.
  // The bridge itself defaults at module load and is NOT cleared on cleanup
  // (Pitfall 1 — StrictMode would clobber the next mount's write).
  let driveHook:
    | ((
        arg:
          | "small"
          | "standard"
          | "wide"
          | "picture"
          | "bathroom"
          | { width: number; height: number; sillHeight: number },
      ) => void)
    | null = null;
  if (import.meta.env.MODE === "test") {
    driveHook = (arg) => {
      if (typeof arg === "string") {
        const p = WINDOW_PRESETS.find((x) => x.id === arg);
        if (p) {
          setCurrentWindowPreset({
            width: p.width,
            height: p.height,
            sillHeight: p.sillHeight,
          });
        }
      } else {
        setCurrentWindowPreset(arg);
      }
    };
    (window as unknown as { __driveWindowPreset?: typeof driveHook }).__driveWindowPreset =
      driveHook;
  }

  return () => {
    fc.off("mouse:move", onMouseMove);
    fc.off("mouse:down", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
    clearPreview();
    // Phase 79 — identity-check delete the test driver (Pattern 7). The
    // bridge value itself persists per Pitfall 1.
    if (import.meta.env.MODE === "test" && driveHook) {
      const w = window as unknown as { __driveWindowPreset?: typeof driveHook };
      if (w.__driveWindowPreset === driveHook) {
        delete w.__driveWindowPreset;
      }
    }
  };
}
