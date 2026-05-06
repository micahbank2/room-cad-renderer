// src/components/CanvasContextMenu.tsx
// Phase 53 CTXMENU-01: right-click context menu for canvas objects.
// Mounts once at App.tsx root. Renders null when uiStore.contextMenu === null.
// D-01: single component with getActionsForKind() registry (no per-kind components).
// D-04: auto-flip via single useLayoutEffect pass; position: fixed.
// D-05: 5 close paths — Escape, click outside, item click, right-click elsewhere (via openContextMenu),
//        window resize/scroll.
// D-06: lucide icons, Phase 33 tokens, 24px item height, 14px icons, IBM Plex Mono.
// D-07: inert when document.activeElement is INPUT/TEXTAREA/SELECT.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Camera, Eye, EyeOff, Copy, Clipboard, Trash2, Edit3 } from "lucide-react";
import { useUIStore, type ContextMenuKind } from "@/stores/uiStore";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { copySelection, pasteSelection, hasClipboardContent } from "@/lib/clipboardActions";
import {
  focusOnWall,
  focusOnPlacedProduct,
  focusOnCeiling,
  focusOnPlacedCustomElement,
  focusOnStair,
} from "@/components/RoomsTreePanel/focusDispatch";

interface ContextAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  handler: () => void;
  destructive?: boolean;
}

// D-02 (LOCKED): action sets per kind in display order.
// Exported for unit testing.
// Phase 61 OPEN-01 (D-11'): adds 'opening' branch with 4 actions
// (Focus camera, Save camera here, Hide/Show, Delete). Copy/Paste deferred.
export function getActionsForKind(kind: ContextMenuKind, nodeId: string | null, parentId?: string): ContextAction[] {
  const store = useCADStore.getState();
  const ui = useUIStore.getState();
  const doc = getActiveRoomDoc();

  const focusCamera = () => {
    if (!nodeId || !doc) return;
    if (kind === "wall") {
      const wall = doc.walls[nodeId];
      if (wall) focusOnWall(wall);
    } else if (kind === "product") {
      const pp = doc.placedProducts[nodeId];
      if (pp) {
        // product library lookup via productStore (lazy import avoids circular deps at module level)
        import("@/stores/productStore").then(({ useProductStore }) => {
          const productLib = useProductStore.getState().products;
          const product = productLib.find((p) => p.id === pp.productId);
          if (product) focusOnPlacedProduct(pp, product);
        });
      }
    } else if (kind === "ceiling") {
      const ceiling = doc.ceilings?.[nodeId];
      if (ceiling) focusOnCeiling(doc, ceiling);
    } else if (kind === "custom") {
      const pce = doc.placedCustomElements?.[nodeId];
      if (pce) {
        import("@/stores/cadStore").then(({ useCADStore: cadStore }) => {
          const catalog = cadStore.getState().customElements?.[pce.elementId];
          focusOnPlacedCustomElement(pce, catalog);
        });
      }
    } else if (kind === "stair") {
      const s = doc.stairs?.[nodeId];
      if (s) focusOnStair(s);
    }
  };

  const saveCameraHere = () => {
    const capture = ui.getCameraCapture?.();
    if (!capture || !nodeId) return;
    if (kind === "wall")    store.setSavedCameraOnWallNoHistory(nodeId, capture.pos, capture.target);
    else if (kind === "product") store.setSavedCameraOnProductNoHistory(nodeId, capture.pos, capture.target);
    else if (kind === "ceiling") store.setSavedCameraOnCeilingNoHistory(nodeId, capture.pos, capture.target);
    else if (kind === "custom")  store.setSavedCameraOnCustomElementNoHistory(nodeId, capture.pos, capture.target);
    else if (kind === "stair")   store.setSavedCameraOnStairNoHistory(nodeId, capture.pos, capture.target);
  };

  const isHidden = nodeId ? ui.hiddenIds.has(nodeId) : false;
  const hideShow = () => { if (nodeId) ui.toggleHidden(nodeId); };

  const baseActions: ContextAction[] = [
    { id: "focus",    label: "Focus camera",    icon: <Camera size={14} />,                                    handler: focusCamera },
    { id: "save-cam", label: "Save camera here", icon: <Camera size={14} className="text-accent" />,           handler: saveCameraHere },
    { id: "hide-show", label: isHidden ? "Show" : "Hide", icon: isHidden ? <Eye size={14} /> : <EyeOff size={14} />, handler: hideShow },
  ];

  if (kind === "wall") {
    // Phase 59 CUTAWAY-01 (D-05): per-wall right-click toggle for 3D-only
    // ghost. Independent from baseActions[2] hide-show (which uses hiddenIds
    // and applies to 2D + 3D + tree). The "in 3D" suffix disambiguates.
    const isCutawayManual = nodeId ? ui.cutawayManualWallIds.has(nodeId) : false;
    return [
      ...baseActions,
      { id: "copy",   label: "Copy",   icon: <Copy size={14} />,   handler: () => { copySelection(); } },
      {
        id: "cutaway-toggle",
        label: isCutawayManual ? "Show in 3D" : "Hide in 3D",
        icon: isCutawayManual ? <Eye size={14} /> : <EyeOff size={14} />,
        handler: () => { if (nodeId) ui.toggleCutawayManualWall(nodeId); },
      },
      { id: "delete", label: "Delete", icon: <Trash2 size={14} />, handler: () => { if (nodeId) store.removeWall(nodeId); }, destructive: true },
    ];
  }
  if (kind === "product") {
    return [
      ...baseActions,
      { id: "copy",   label: "Copy",   icon: <Copy size={14} />,      handler: () => { copySelection(); } },
      { id: "paste",  label: "Paste",  icon: <Clipboard size={14} />, handler: () => { pasteSelection(); } },
      { id: "delete", label: "Delete", icon: <Trash2 size={14} />,    handler: () => { if (nodeId) store.removeProduct(nodeId); }, destructive: true },
    ];
  }
  if (kind === "ceiling") {
    return [...baseActions];
  }
  if (kind === "stair") {
    // Phase 60 STAIRS-01 (D-11, research Q5): NEW branch (not product reuse)
    // — `delete` calls removeStair(roomId, stairId), distinct from removeProduct.
    return [
      ...baseActions,
      { id: "copy",   label: "Copy",   icon: <Copy size={14} />,      handler: () => { copySelection(); } },
      { id: "paste",  label: "Paste",  icon: <Clipboard size={14} />, handler: () => { pasteSelection(); } },
      {
        id: "delete", label: "Delete", icon: <Trash2 size={14} />,
        handler: () => {
          if (!nodeId) return;
          const activeDocLocal = getActiveRoomDoc();
          if (activeDocLocal) store.removeStair(activeDocLocal.id, nodeId);
        },
        destructive: true,
      },
    ];
  }
  if (kind === "custom") {
    return [
      ...baseActions,
      { id: "copy",   label: "Copy",         icon: <Copy size={14} />,   handler: () => { copySelection(); } },
      { id: "delete", label: "Delete",       icon: <Trash2 size={14} />, handler: () => { if (nodeId) store.removePlacedCustomElement(nodeId); }, destructive: true },
      {
        id: "rename", label: "Rename label", icon: <Edit3 size={14} />,
        handler: () => {
          if (!nodeId) return;
          ui.select([nodeId]);
          ui.setPendingLabelFocus(nodeId);
        },
      },
    ];
  }
  if (kind === "empty") {
    if (!hasClipboardContent()) return [];
    return [
      { id: "paste", label: "Paste", icon: <Clipboard size={14} />, handler: () => { pasteSelection(); } },
    ];
  }
  // Phase 61 OPEN-01 (D-11'): opening — 4 actions (Focus camera, Save camera here,
  // Hide/Show, Delete). Copy/Paste deferred (Opening is a sub-entity of WallSegment).
  if (kind === "opening") {
    const wallId = parentId;
    const focusOpening = () => {
      if (!wallId || !doc) return;
      const wall = doc.walls[wallId];
      if (wall) focusOnWall(wall);
    };
    const saveCameraForOpening = () => {
      const capture = ui.getCameraCapture?.();
      if (!capture || !wallId) return;
      // Phase 61 v1.15 simplification: persist saved-camera on the parent wall;
      // per-opening camera bookmarks deferred to v1.16.
      store.setSavedCameraOnWallNoHistory(wallId, capture.pos, capture.target);
    };
    return [
      { id: "focus",    label: "Focus camera",    icon: <Camera size={14} />,                                    handler: focusOpening },
      { id: "save-cam", label: "Save camera here", icon: <Camera size={14} className="text-accent" />,           handler: saveCameraForOpening },
      { id: "hide-show", label: isHidden ? "Show" : "Hide", icon: isHidden ? <Eye size={14} /> : <EyeOff size={14} />, handler: hideShow },
      { id: "delete", label: "Delete", icon: <Trash2 size={14} />, handler: () => { if (wallId && nodeId) store.removeOpening(wallId, nodeId); }, destructive: true },
    ];
  }
  // Phase 62 MEASURE-01 (D-11): measureLine — single Delete action.
  if (kind === "measureLine") {
    return [
      {
        id: "delete", label: "Delete", icon: <Trash2 size={14} />,
        handler: () => {
          if (!nodeId) return;
          const activeDocLocal = getActiveRoomDoc();
          if (activeDocLocal) store.removeMeasureLine(activeDocLocal.id, nodeId);
        },
        destructive: true,
      },
    ];
  }
  // Phase 62 MEASURE-01 (D-11): annotation — Edit text + Delete (2 actions).
  if (kind === "annotation") {
    return [
      {
        id: "edit-text", label: "Edit text", icon: <Edit3 size={14} />,
        handler: () => { if (nodeId) ui.setEditingAnnotationId(nodeId); },
      },
      {
        id: "delete", label: "Delete", icon: <Trash2 size={14} />,
        handler: () => {
          if (!nodeId) return;
          const activeDocLocal = getActiveRoomDoc();
          if (activeDocLocal) store.removeAnnotation(activeDocLocal.id, nodeId);
        },
        destructive: true,
      },
    ];
  }
  return [];
}

export function CanvasContextMenu() {
  const contextMenu = useUIStore((s) => s.contextMenu);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });

  // Initialize position before layout effect runs (prevents flash at 0,0)
  useEffect(() => {
    if (contextMenu) setAdjustedPos(contextMenu.position);
  }, [contextMenu?.position.x, contextMenu?.position.y]);

  // D-04: auto-flip after mount — measure bbox and flip if overflows viewport
  useLayoutEffect(() => {
    if (!contextMenu || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = contextMenu.position.x;
    let y = contextMenu.position.y;
    if (x + rect.width > vw)  x = x - rect.width;
    if (y + rect.height > vh) y = y - rect.height;
    x = Math.max(0, x);
    y = Math.max(0, y);
    setAdjustedPos({ x, y });
  }, [contextMenu?.position.x, contextMenu?.position.y]);

  // D-05 close path 1: Escape closes
  useEffect(() => {
    if (!contextMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeContextMenu(); }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [contextMenu, closeContextMenu]);

  // D-05 close path 2: click outside; close path 5: window resize/scroll
  useEffect(() => {
    if (!contextMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const onDismiss = () => closeContextMenu();
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onDismiss);
    window.addEventListener("scroll", onDismiss, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onDismiss);
      window.removeEventListener("scroll", onDismiss, true);
    };
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  const actions = getActionsForKind(contextMenu.kind, contextMenu.nodeId, contextMenu.parentId);
  if (actions.length === 0) return null; // empty-canvas with no clipboard

  return (
    <div
      ref={menuRef}
      data-testid="context-menu"
      style={{ position: "fixed", left: adjustedPos.x, top: adjustedPos.y, zIndex: 9999 }}
      className="bg-obsidian-mid border border-outline-variant/20 rounded-sm py-1 min-w-[160px] shadow-lg"
      onContextMenu={(e) => e.preventDefault()}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          data-testid="ctx-action"
          data-action-id={action.id}
          className={[
            "w-full flex items-center gap-2 px-3 h-6",
            "font-mono text-sm",
            action.destructive
              ? "text-error hover:bg-obsidian-high"
              : "text-text-primary hover:bg-obsidian-high",
          ].join(" ")}
          onClick={() => {
            // D-05 close path 3: item click
            action.handler();
            closeContextMenu();
          }}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}
