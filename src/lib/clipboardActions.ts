// src/lib/clipboardActions.ts
// Shared clipboard operations for Cmd+C/V shortcuts (shortcuts.ts) and
// right-click context menu (CanvasContextMenu.tsx).
// Phase 53: extracted from shortcuts.ts to avoid coupling context-menu to the keyboard registry.

import type { WallSegment, PlacedProduct, RoomDoc } from "@/types/cad";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { uid } from "@/lib/geometry";

export const PASTE_OFFSET = 1;

let _clipboard: { walls: WallSegment[]; products: PlacedProduct[] } | null = null;

export function hasClipboardContent(): boolean {
  return (
    _clipboard !== null &&
    (_clipboard.walls.length > 0 || _clipboard.products.length > 0)
  );
}

export function copySelection(): boolean {
  const selectedIds = useUIStore.getState().selectedIds;
  if (selectedIds.length === 0) return false;
  const doc = getActiveRoomDoc();
  if (!doc) return false;
  const walls: WallSegment[] = [];
  const products: PlacedProduct[] = [];
  for (const id of selectedIds) {
    if (doc.walls[id]) walls.push(JSON.parse(JSON.stringify(doc.walls[id])) as WallSegment);
    if (doc.placedProducts[id]) products.push(JSON.parse(JSON.stringify(doc.placedProducts[id])) as PlacedProduct);
  }
  if (walls.length === 0 && products.length === 0) return false;
  _clipboard = { walls, products };
  return true;
}

export function pasteSelection(): boolean {
  if (!_clipboard) return false;
  const store = useCADStore.getState();
  const newIds: string[] = [];
  for (const w of _clipboard.walls) {
    store.addWall(
      { x: w.start.x + PASTE_OFFSET, y: w.start.y + PASTE_OFFSET },
      { x: w.end.x + PASTE_OFFSET, y: w.end.y + PASTE_OFFSET },
    );
    const doc: RoomDoc | null = getActiveRoomDoc();
    if (doc) {
      const allIds = Object.keys(doc.walls);
      const latestId = allIds[allIds.length - 1];
      if (latestId) {
        store.updateWall(latestId, {
          thickness: w.thickness,
          height: w.height,
          openings: w.openings.map((o) => ({ ...o, id: `op_${uid()}` })),
          wallpaper: w.wallpaper ? JSON.parse(JSON.stringify(w.wallpaper)) : undefined,
          wainscoting: w.wainscoting ? JSON.parse(JSON.stringify(w.wainscoting)) : undefined,
          crownMolding: w.crownMolding ? JSON.parse(JSON.stringify(w.crownMolding)) : undefined,
          wallArt: w.wallArt?.map((a) => ({ ...a, id: `art_${uid()}` })),
        });
        newIds.push(latestId);
      }
    }
  }
  for (const p of _clipboard.products) {
    const newId = store.placeProduct(p.productId, {
      x: p.position.x + PASTE_OFFSET,
      y: p.position.y + PASTE_OFFSET,
    });
    if (p.rotation) store.rotateProduct(newId, p.rotation);
    if (p.sizeScale) store.resizeProduct(newId, p.sizeScale);
    newIds.push(newId);
  }
  if (newIds.length > 0) useUIStore.getState().select(newIds);
  // Offset clipboard for next paste
  _clipboard = {
    walls: _clipboard.walls.map((w) => ({
      ...w,
      start: { x: w.start.x + PASTE_OFFSET, y: w.start.y + PASTE_OFFSET },
      end: { x: w.end.x + PASTE_OFFSET, y: w.end.y + PASTE_OFFSET },
    })),
    products: _clipboard.products.map((p) => ({
      ...p,
      position: { x: p.position.x + PASTE_OFFSET, y: p.position.y + PASTE_OFFSET },
    })),
  };
  return true;
}
