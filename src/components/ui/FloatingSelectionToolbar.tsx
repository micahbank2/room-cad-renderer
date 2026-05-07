import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Copy, Trash2 } from "lucide-react";
import type * as fabric from "fabric";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Phase 33 GH #85 — Floating Selection Toolbar (D-10, D-11, D-12, D-13, D-14).
 *
 * Renders a glass-panel mini-toolbar above the current selection's bounding box
 * in the 2D Fabric canvas. Offers Duplicate (lucide Copy) and Delete (lucide
 * Trash2). Hides during active drag via `uiStore.isDragging` (set by selectTool).
 *
 * Positioning (UI-SPEC Interaction Contracts):
 *   toolbarTop  = bbox.top - h - 8px  (flip below if < 0)
 *   toolbarLeft = bbox.left + bbox.w/2 - toolbarW/2  (clamped to wrapper)
 *
 * Scope: 2D only (D-10). 3D toolbar deferred per backlog.
 */

interface Props {
  fc: fabric.Canvas | null;
  wrapperRef: React.RefObject<HTMLElement | null>;
}

const GAP = 8; // --spacing-sm
const TOOLBAR_HEIGHT = 32;
const DEFAULT_TOOLBAR_WIDTH = 96;

export function FloatingSelectionToolbar({ fc, wrapperRef }: Props) {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const isDragging = useUIStore((s) => s.isDragging);
  const reduced = useReducedMotion();

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const visible = selectedIds.length >= 1 && !isDragging && pos !== null;

  useEffect(() => {
    if (!fc || !wrapperRef.current) {
      setPos(null);
      return;
    }

    function recompute() {
      if (!fc || !wrapperRef.current) {
        setPos(null);
        return;
      }
      const obj = fc.getActiveObject();
      if (!obj) {
        setPos(null);
        return;
      }
      const bbox = obj.getBoundingRect();
      const toolbarWidth = toolbarRef.current?.offsetWidth ?? DEFAULT_TOOLBAR_WIDTH;
      const wrapperRect = wrapperRef.current.getBoundingClientRect();

      let top = bbox.top - TOOLBAR_HEIGHT - GAP;
      if (top < 0) top = bbox.top + bbox.height + GAP; // flip below
      let left = bbox.left + bbox.width / 2 - toolbarWidth / 2;
      left = Math.max(0, Math.min(left, wrapperRect.width - toolbarWidth));
      setPos({ top, left });
    }

    recompute();
    fc.on("selection:created", recompute);
    fc.on("selection:updated", recompute);
    fc.on("selection:cleared", () => setPos(null));
    fc.on("object:modified", recompute);
    fc.on("after:render", recompute);
    return () => {
      fc.off("selection:created", recompute);
      fc.off("selection:updated", recompute);
      fc.off("object:modified", recompute);
      fc.off("after:render", recompute);
    };
    // selectedIds changes trigger recompute via after:render; keep dep on length
    // to re-bind listeners when selection transitions empty <-> populated.
  }, [fc, wrapperRef, selectedIds.length]);

  function handleDuplicate() {
    const id = selectedIds[0];
    if (!id) return;
    const cad = useCADStore.getState();
    const doc = getActiveRoomDoc();
    if (!doc) return;

    if (id.startsWith("pp_")) {
      const original = doc.placedProducts[id];
      if (!original) return;
      // placeProduct pushes history internally and returns the new id.
      // Note (D-40 scope boundary): rotation resets to 0 — acceptable MVP.
      cad.placeProduct(original.productId, {
        x: original.position.x + 0.5,
        y: original.position.y + 0.5,
      });
    } else if (id.startsWith("wall_")) {
      // Walls: no duplicate MVP in Phase 33. Silently no-op.
      return;
    } else {
      // Custom elements: no placeProduct analog verified in scope; defer.
      return;
    }
  }

  function handleDelete() {
    const id = selectedIds[0];
    if (!id) return;
    const cad = useCADStore.getState();
    if (id.startsWith("pp_")) {
      cad.removeProduct(id);
    } else if (id.startsWith("wall_")) {
      cad.removeWall(id);
    } else {
      // Placed custom element removal — pushes history (cadStore.ts:712).
      cad.removePlacedCustomElement?.(id);
    }
  }

  if (!visible) return null;
  return (
    <div
      ref={toolbarRef}
      style={{
        position: "absolute",
        top: pos!.top,
        left: pos!.left,
        transition: reduced
          ? "none"
          : "opacity 150ms ease-out, transform 150ms ease-out",
      }}
      className="glass-panel rounded-lg px-2 py-1 flex items-center gap-2 z-20"
      data-testid="floating-selection-toolbar"
    >
      <button
        type="button"
        onClick={handleDuplicate}
        className="p-1 rounded-sm text-muted-foreground hover:bg-accent/20 hover:text-foreground"
        aria-label="Duplicate"
      >
        <Copy size={14} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        className="p-1 rounded-sm text-muted-foreground hover:bg-error/20 hover:text-error"
        aria-label="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// Test driver — gated by Vite MODE so it never ships to production bundles.
if (import.meta.env.MODE === "test") {
  (window as unknown as Record<string, unknown>).__driveFloatingToolbar = {
    isVisible: () => !!document.querySelector('[aria-label="Duplicate"]'),
    getPosition: () => {
      const btn = document.querySelector('[aria-label="Duplicate"]')
        ?.parentElement as HTMLElement | null;
      if (!btn) return null;
      return { top: btn.offsetTop, left: btn.offsetLeft };
    },
    clickDuplicate: () =>
      (
        document.querySelector('[aria-label="Duplicate"]') as HTMLButtonElement | null
      )?.click(),
    clickDelete: () =>
      (
        document.querySelector('[aria-label="Delete"]') as HTMLButtonElement | null
      )?.click(),
  };
}
