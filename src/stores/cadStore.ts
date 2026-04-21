import { create } from "zustand";
import { produce, current, isDraft } from "immer";
import type {
  Room,
  WallSegment,
  PlacedProduct,
  CADSnapshot,
  Point,
  Opening,
  RoomDoc,
  Ceiling,
  FloorMaterial,
  Wallpaper,
  WallArt,
  WallSide,
  CustomElement,
  PlacedCustomElement,
} from "@/types/cad";
import { uid, resizeWall } from "@/lib/geometry";
import { ROOM_TEMPLATES, type RoomTemplateId } from "@/data/roomTemplates";
import { migrateSnapshot } from "@/lib/snapshotMigration";
import type { PaintColor } from "@/types/paint";

const MAX_HISTORY = 50;

interface CADState {
  rooms: Record<string, RoomDoc>;
  activeRoomId: string | null;

  past: CADSnapshot[];
  future: CADSnapshot[];

  // existing actions (signatures unchanged — mutate ACTIVE room only)
  setRoom: (changes: Partial<Room>) => void;
  addWall: (start: Point, end: Point) => void;
  updateWall: (id: string, changes: Partial<WallSegment>) => void;
  updateWallNoHistory: (id: string, changes: Partial<WallSegment>) => void;
  updateOpening: (wallId: string, openingId: string, changes: Partial<Opening>) => void;
  updateOpeningNoHistory: (wallId: string, openingId: string, changes: Partial<Opening>) => void;
  resizeWallByLabel: (id: string, newLengthFt: number) => void;
  removeWall: (id: string) => void;
  addOpening: (wallId: string, opening: Omit<Opening, "id">) => void;
  placeProduct: (productId: string, position: Point) => string;
  moveProduct: (id: string, position: Point) => void;
  rotateProduct: (id: string, angle: number) => void;
  rotateProductNoHistory: (id: string, angle: number) => void;
  rotateWall: (id: string, angleDeltaDeg: number) => void;
  rotateWallNoHistory: (id: string, angleDeltaDeg: number) => void;
  resizeProduct: (id: string, scale: number) => void;
  resizeProductNoHistory: (id: string, scale: number) => void;
  // Phase 31 — per-axis override mutations (D-01/D-02)
  resizeProductAxis: (id: string, axis: "width" | "depth", valueFt: number) => void;
  resizeProductAxisNoHistory: (id: string, axis: "width" | "depth", valueFt: number) => void;
  clearProductOverrides: (id: string) => void;
  setFloorPlanImage: (dataUrl: string | undefined) => void;
  addCeiling: (points: Point[], height: number, material?: string) => string;
  updateCeiling: (id: string, changes: Partial<Ceiling>) => void;
  updateCeilingNoHistory: (id: string, changes: Partial<Ceiling>) => void;
  removeCeiling: (id: string) => void;
  setFloorMaterial: (material: FloorMaterial | undefined) => void;
  setWallpaper: (wallId: string, side: WallSide, wallpaper: Wallpaper | undefined) => void;
  toggleWainscoting: (wallId: string, side: WallSide, enabled: boolean, heightFt?: number, color?: string, styleItemId?: string) => void;
  toggleCrownMolding: (wallId: string, side: WallSide, enabled: boolean, heightFt?: number, color?: string) => void;
  addWallArt: (wallId: string, art: Omit<WallArt, "id">) => string;
  updateWallArt: (wallId: string, artId: string, changes: Partial<WallArt>) => void;
  updateWallArtNoHistory: (wallId: string, artId: string, changes: Partial<WallArt>) => void;
  removeWallArt: (wallId: string, artId: string) => void;
  // Custom elements (v1.2 Phase 14)
  addCustomElement: (el: Omit<CustomElement, "id">) => string;
  updateCustomElement: (id: string, changes: Partial<CustomElement>) => void;
  removeCustomElement: (id: string) => void;
  placeCustomElement: (customElementId: string, position: Point) => string;
  moveCustomElement: (id: string, position: Point) => void;
  removePlacedCustomElement: (id: string) => void;
  rotateCustomElement: (id: string, angle: number) => void;
  rotateCustomElementNoHistory: (id: string, angle: number) => void;
  resizeCustomElement: (id: string, scale: number) => void;
  resizeCustomElementNoHistory: (id: string, scale: number) => void;
  // Phase 31 — placement-instance mutations (Pitfall 4: distinct from updateCustomElement)
  updatePlacedCustomElement: (id: string, changes: Partial<PlacedCustomElement>) => void;
  updatePlacedCustomElementNoHistory: (id: string, changes: Partial<PlacedCustomElement>) => void;
  resizeCustomElementAxis: (id: string, axis: "width" | "depth", valueFt: number) => void;
  resizeCustomElementAxisNoHistory: (id: string, axis: "width" | "depth", valueFt: number) => void;
  clearCustomElementOverrides: (id: string) => void;
  removeProduct: (id: string) => void;
  removeSelected: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  loadSnapshot: (raw: unknown) => void;

  // Surface material actions (Phase 20)
  setCeilingSurfaceMaterial: (ceilingId: string, materialId: string | undefined) => void;

  // Paint actions (Phase 18)
  addCustomPaint: (item: Omit<PaintColor, "id" | "source">) => string;
  removeCustomPaint: (id: string) => void;
  applyPaintToAllWalls: (paintId: string, side: WallSide) => void;
  copyWallSide: (wallId: string, from: WallSide, to: WallSide) => void;
  swapWallSides: (wallId: string) => void;

  // NEW: room-management actions
  addRoom: (name: string, templateId?: RoomTemplateId) => string;
  renameRoom: (id: string, name: string) => void;
  removeRoom: (id: string) => void;
  switchRoom: (id: string) => void;
}

// `snapshot` runs inside Immer `produce` blocks (via `pushHistory`), so the
// incoming slices are draft Proxies. `structuredClone` throws DataCloneError
// on Proxies, so we normalize via Immer `current(...)` first. `current` on a
// non-draft is a no-op; this keeps the helper safe for direct calls too.
function toPlain<T>(value: T): T {
  return isDraft(value) ? (current(value as object) as T) : value;
}

function snapshot(state: CADState): CADSnapshot {
  const root = state as any;
  const t0 = import.meta.env.DEV ? performance.now() : 0;
  const snap: CADSnapshot = {
    version: 2,
    rooms: structuredClone(toPlain(state.rooms)),
    activeRoomId: state.activeRoomId,
    ...(root.customElements
      ? { customElements: structuredClone(toPlain(root.customElements)) }
      : {}),
    ...(root.customPaints
      ? { customPaints: structuredClone(toPlain(root.customPaints)) }
      : {}),
    ...(root.recentPaints
      ? { recentPaints: [...root.recentPaints] }
      : {}),
  };
  if (import.meta.env.DEV) {
    const dt = performance.now() - t0;
    // Sampled logging: only surface snapshots that could matter for perf.
    if (dt > 2) {
      // eslint-disable-next-line no-console
      console.log(`[cadStore] snapshot ${dt.toFixed(2)}ms`);
    }
  }
  return snap;
}

function pushHistory(state: CADState): void {
  state.past.push(snapshot(state));
  if (state.past.length > MAX_HISTORY) state.past.shift();
  state.future = [];
}

function activeDoc(s: CADState): RoomDoc | undefined {
  return s.activeRoomId ? s.rooms[s.activeRoomId] : undefined;
}

/** Rotate a wall around its midpoint by the given angle delta (degrees).
 *  Mutates the wall in place. Does NOT update any neighbors — by design,
 *  rotation detaches this wall from any shared corners. */
function applyWallRotation(wall: WallSegment, angleDeltaDeg: number): void {
  const cx = (wall.start.x + wall.end.x) / 2;
  const cy = (wall.start.y + wall.end.y) / 2;
  const rad = (angleDeltaDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotatePoint = (p: Point) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  };
  wall.start = rotatePoint(wall.start);
  wall.end = rotatePoint(wall.end);
}

function initialState(): Pick<CADState, "rooms" | "activeRoomId" | "past" | "future"> {
  return {
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {},
      },
    },
    activeRoomId: "room_main",
    past: [],
    future: [],
  };
}

export const useCADStore = create<CADState>()((set) => ({
  ...initialState(),

  setRoom: (changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        pushHistory(s);
        Object.assign(doc.room, changes);
      })
    ),

  addWall: (start, end) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        pushHistory(s);
        const id = `wall_${uid()}`;
        doc.walls[id] = {
          id,
          start,
          end,
          thickness: 0.5,
          height: doc.room.wallHeight,
          openings: [],
        };
      })
    ),

  updateWall: (id, changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        if (!doc.walls[id]) return;
        pushHistory(s);
        Object.assign(doc.walls[id], changes);
      })
    ),

  updateWallNoHistory: (id, changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        if (!doc.walls[id]) return;
        Object.assign(doc.walls[id], changes);
      })
    ),

  updateOpening: (wallId, openingId, changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        const wall = doc.walls[wallId];
        if (!wall) return;
        const op = wall.openings.find((o) => o.id === openingId);
        if (!op) return;
        pushHistory(s);
        Object.assign(op, changes);
      })
    ),

  updateOpeningNoHistory: (wallId, openingId, changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        const wall = doc.walls[wallId];
        if (!wall) return;
        const op = wall.openings.find((o) => o.id === openingId);
        if (!op) return;
        Object.assign(op, changes);
      })
    ),

  resizeWallByLabel: (id, newLengthFt) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        const wall = doc.walls[id];
        if (!wall) return;
        if (!(newLengthFt > 0)) return;
        pushHistory(s);
        const oldEnd = { x: wall.end.x, y: wall.end.y };
        const newEnd = resizeWall(wall, newLengthFt);
        wall.end = newEnd;
        // Propagate to any wall whose start OR end matches oldEnd within epsilon
        const EPS = 0.01;
        for (const other of Object.values(doc.walls)) {
          if (other.id === id) continue;
          if (Math.abs(other.start.x - oldEnd.x) < EPS && Math.abs(other.start.y - oldEnd.y) < EPS) {
            other.start = { x: newEnd.x, y: newEnd.y };
          }
          if (Math.abs(other.end.x - oldEnd.x) < EPS && Math.abs(other.end.y - oldEnd.y) < EPS) {
            other.end = { x: newEnd.x, y: newEnd.y };
          }
        }
      })
    ),

  removeWall: (id) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        if (!doc.walls[id]) return;
        pushHistory(s);
        delete doc.walls[id];
      })
    ),

  addOpening: (wallId, opening) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        if (!doc.walls[wallId]) return;
        pushHistory(s);
        doc.walls[wallId].openings.push({ ...opening, id: `op_${uid()}` });
      })
    ),

  placeProduct: (productId, position) => {
    const id = `pp_${uid()}`;
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        pushHistory(s);
        doc.placedProducts[id] = { id, productId, position, rotation: 0 };
      })
    );
    return id;
  },

  moveProduct: (id, position) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        if (!doc.placedProducts[id]) return;
        pushHistory(s);
        doc.placedProducts[id].position = position;
      })
    ),

  rotateProduct: (id, angle) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        if (!doc.placedProducts[id]) return;
        pushHistory(s);
        doc.placedProducts[id].rotation = angle;
      })
    ),

  rotateProductNoHistory: (id, angle) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        if (!doc.placedProducts[id]) return;
        doc.placedProducts[id].rotation = angle;
      })
    ),

  rotateWall: (id, angleDeltaDeg) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        const wall = doc.walls[id];
        if (!wall) return;
        pushHistory(s);
        applyWallRotation(wall, angleDeltaDeg);
      })
    ),

  rotateWallNoHistory: (id, angleDeltaDeg) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        const wall = doc.walls[id];
        if (!wall) return;
        applyWallRotation(wall, angleDeltaDeg);
      })
    ),

  resizeProduct: (id, scale) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        if (!doc.placedProducts[id]) return;
        pushHistory(s);
        doc.placedProducts[id].sizeScale = Math.max(0.1, Math.min(10, scale));
      })
    ),

  resizeProductNoHistory: (id, scale) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        if (!doc.placedProducts[id]) return;
        doc.placedProducts[id].sizeScale = Math.max(0.1, Math.min(10, scale));
      })
    ),

  // Phase 31 — per-axis override mutations for placed products (D-01/D-02).
  resizeProductAxis: (id, axis, valueFt) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        const pp = doc.placedProducts[id];
        if (!pp) return;
        const v = Math.max(0.25, Math.min(50, valueFt));
        pushHistory(s);
        if (axis === "width") pp.widthFtOverride = v;
        else pp.depthFtOverride = v;
      })
    ),

  resizeProductAxisNoHistory: (id, axis, valueFt) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        const pp = doc.placedProducts[id];
        if (!pp) return;
        const v = Math.max(0.25, Math.min(50, valueFt));
        if (axis === "width") pp.widthFtOverride = v;
        else pp.depthFtOverride = v;
      })
    ),

  clearProductOverrides: (id) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        const pp = doc.placedProducts[id];
        if (!pp) return;
        pushHistory(s);
        pp.widthFtOverride = undefined;
        pp.depthFtOverride = undefined;
      })
    ),

  setFloorPlanImage: (dataUrl) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        pushHistory(s);
        if (dataUrl) doc.floorPlanImage = dataUrl;
        else delete doc.floorPlanImage;
      })
    ),

  addCeiling: (points, height, material = "#f5f5f5") => {
    const id = `ceiling_${uid()}`;
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        pushHistory(s);
        if (!doc.ceilings) doc.ceilings = {};
        doc.ceilings[id] = { id, points, height, material };
      })
    );
    return id;
  },

  updateCeiling: (id, changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.ceilings || !doc.ceilings[id]) return;
        pushHistory(s);
        Object.assign(doc.ceilings[id], changes);
        // Track recentPaints when applying a paint to ceiling
        if (changes.paintId) {
          const root = s as any;
          const recent: string[] = root.recentPaints ?? [];
          root.recentPaints = [changes.paintId, ...recent.filter((id: string) => id !== changes.paintId)].slice(0, 8);
        }
      })
    ),

  updateCeilingNoHistory: (id, changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.ceilings || !doc.ceilings[id]) return;
        Object.assign(doc.ceilings[id], changes);
      })
    ),

  setCeilingSurfaceMaterial: (ceilingId, materialId) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.ceilings?.[ceilingId]) return;
        pushHistory(s);
        const c = doc.ceilings[ceilingId];
        if (materialId) {
          c.surfaceMaterialId = materialId;
          delete c.paintId;
          delete c.limeWash;
        } else {
          delete c.surfaceMaterialId;
        }
      })
    ),

  removeCeiling: (id) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.ceilings || !doc.ceilings[id]) return;
        pushHistory(s);
        delete doc.ceilings[id];
      })
    ),

  setFloorMaterial: (material) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        pushHistory(s);
        if (material) doc.floorMaterial = material;
        else delete doc.floorMaterial;
      })
    ),

  setWallpaper: (wallId, side, wallpaper) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.walls[wallId]) return;
        pushHistory(s);
        const wall = doc.walls[wallId];
        if (!wall.wallpaper) wall.wallpaper = {};
        if (wallpaper) wall.wallpaper[side] = wallpaper;
        else delete wall.wallpaper[side];
        // Clean up if both sides empty
        if (!wall.wallpaper.A && !wall.wallpaper.B) delete wall.wallpaper;
        // Track recentPaints when applying a paint kind
        if (wallpaper?.kind === "paint" && wallpaper.paintId) {
          const root = s as any;
          const recent: string[] = root.recentPaints ?? [];
          root.recentPaints = [wallpaper.paintId, ...recent.filter((id: string) => id !== wallpaper.paintId)].slice(0, 8);
        }
      })
    ),

  toggleWainscoting: (wallId, side, enabled, heightFt = 3, color = "#ffffff", styleItemId) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.walls[wallId]) return;
        pushHistory(s);
        const wall = doc.walls[wallId];
        if (!wall.wainscoting) wall.wainscoting = {};
        if (enabled) {
          wall.wainscoting[side] = {
            enabled: true,
            heightFt,
            color,
            ...(styleItemId ? { styleItemId } : {}),
          };
        } else {
          delete wall.wainscoting[side];
        }
        if (!wall.wainscoting.A && !wall.wainscoting.B) delete wall.wainscoting;
      })
    ),

  toggleCrownMolding: (wallId, side, enabled, heightFt = 0.33, color = "#ffffff") =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.walls[wallId]) return;
        pushHistory(s);
        const wall = doc.walls[wallId];
        if (!wall.crownMolding) wall.crownMolding = {};
        if (enabled) {
          wall.crownMolding[side] = { enabled: true, heightFt, color };
        } else {
          delete wall.crownMolding[side];
        }
        if (!wall.crownMolding.A && !wall.crownMolding.B) delete wall.crownMolding;
      })
    ),

  addWallArt: (wallId, art) => {
    const id = `art_${uid()}`;
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.walls[wallId]) return;
        pushHistory(s);
        if (!doc.walls[wallId].wallArt) doc.walls[wallId].wallArt = [];
        doc.walls[wallId].wallArt!.push({ id, ...art });
      })
    );
    return id;
  },

  updateWallArt: (wallId, artId, changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.walls[wallId]?.wallArt) return;
        const item = doc.walls[wallId].wallArt!.find((a) => a.id === artId);
        if (!item) return;
        pushHistory(s);
        Object.assign(item, changes);
      })
    ),

  updateWallArtNoHistory: (wallId, artId, changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.walls[wallId]?.wallArt) return;
        const item = doc.walls[wallId].wallArt!.find((a) => a.id === artId);
        if (!item) return;
        Object.assign(item, changes);
      })
    ),

  removeWallArt: (wallId, artId) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.walls[wallId]?.wallArt) return;
        pushHistory(s);
        doc.walls[wallId].wallArt = doc.walls[wallId].wallArt!.filter((a) => a.id !== artId);
      })
    ),

  addCustomElement: (el) => {
    const id = `cust_${uid()}`;
    set(
      produce((s: CADState) => {
        pushHistory(s);
        // customElements lives at snapshot level (per-project), but our state
        // is flat — we keep it in a parallel top-level field
        const root = s as any;
        if (!root.customElements) root.customElements = {};
        root.customElements[id] = { id, ...el };
      })
    );
    return id;
  },

  updateCustomElement: (id, changes) =>
    set(
      produce((s: CADState) => {
        const root = s as any;
        if (!root.customElements?.[id]) return;
        pushHistory(s);
        Object.assign(root.customElements[id], changes);
      })
    ),

  removeCustomElement: (id) =>
    set(
      produce((s: CADState) => {
        const root = s as any;
        if (!root.customElements?.[id]) return;
        pushHistory(s);
        delete root.customElements[id];
        // Also remove any placements referencing this custom element across all rooms
        for (const room of Object.values(s.rooms)) {
          if (!room.placedCustomElements) continue;
          for (const [pid, p] of Object.entries(room.placedCustomElements)) {
            if (p.customElementId === id) delete room.placedCustomElements[pid];
          }
        }
      })
    ),

  placeCustomElement: (customElementId, position) => {
    const id = `pcust_${uid()}`;
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        pushHistory(s);
        if (!doc.placedCustomElements) doc.placedCustomElements = {};
        doc.placedCustomElements[id] = {
          id,
          customElementId,
          position,
          rotation: 0,
        };
      })
    );
    return id;
  },

  moveCustomElement: (id, position) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        pushHistory(s);
        doc.placedCustomElements[id].position = position;
      })
    ),

  removePlacedCustomElement: (id) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        pushHistory(s);
        delete doc.placedCustomElements[id];
      })
    ),

  rotateCustomElement: (id, angle) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        pushHistory(s);
        doc.placedCustomElements[id].rotation = angle;
      })
    ),

  rotateCustomElementNoHistory: (id, angle) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        doc.placedCustomElements[id].rotation = angle;
      })
    ),

  resizeCustomElement: (id, scale) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        pushHistory(s);
        doc.placedCustomElements[id].sizeScale = Math.max(0.1, Math.min(10, scale));
      })
    ),

  resizeCustomElementNoHistory: (id, scale) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        doc.placedCustomElements[id].sizeScale = Math.max(0.1, Math.min(10, scale));
      })
    ),

  // Phase 31 — placement-instance mutations (Pitfall 4).
  // These target rooms[active].placedCustomElements[id] (PLACEMENT), NOT the
  // root.customElements catalog. updateCustomElement (above) targets the catalog.
  updatePlacedCustomElement: (id, changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        pushHistory(s);
        Object.assign(doc.placedCustomElements[id], changes);
      })
    ),

  updatePlacedCustomElementNoHistory: (id, changes) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        Object.assign(doc.placedCustomElements[id], changes);
      })
    ),

  resizeCustomElementAxis: (id, axis, valueFt) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        const v = Math.max(0.25, Math.min(50, valueFt));
        pushHistory(s);
        if (axis === "width") doc.placedCustomElements[id].widthFtOverride = v;
        else doc.placedCustomElements[id].depthFtOverride = v;
      })
    ),

  resizeCustomElementAxisNoHistory: (id, axis, valueFt) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        const v = Math.max(0.25, Math.min(50, valueFt));
        if (axis === "width") doc.placedCustomElements[id].widthFtOverride = v;
        else doc.placedCustomElements[id].depthFtOverride = v;
      })
    ),

  clearCustomElementOverrides: (id) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc?.placedCustomElements?.[id]) return;
        pushHistory(s);
        doc.placedCustomElements[id].widthFtOverride = undefined;
        doc.placedCustomElements[id].depthFtOverride = undefined;
      })
    ),

  removeProduct: (id) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        if (!doc.placedProducts[id]) return;
        pushHistory(s);
        delete doc.placedProducts[id];
      })
    ),

  removeSelected: (ids) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        pushHistory(s);
        for (const id of ids) {
          delete doc.walls[id];
          delete doc.placedProducts[id];
          if (doc.placedCustomElements) delete doc.placedCustomElements[id];
          if (doc.ceilings) delete doc.ceilings[id];
        }
      })
    ),

  undo: () =>
    set(
      produce((s: CADState) => {
        if (s.past.length === 0) return;
        s.future.push(snapshot(s));
        const prev = s.past.pop()!;
        s.rooms = prev.rooms;
        s.activeRoomId = prev.activeRoomId;
        (s as any).customElements = (prev as any).customElements ?? {};
        (s as any).customPaints = (prev as any).customPaints ?? [];
        (s as any).recentPaints = (prev as any).recentPaints ?? [];
      })
    ),

  redo: () =>
    set(
      produce((s: CADState) => {
        if (s.future.length === 0) return;
        s.past.push(snapshot(s));
        const next = s.future.pop()!;
        s.rooms = next.rooms;
        s.activeRoomId = next.activeRoomId;
        (s as any).customElements = (next as any).customElements ?? {};
        (s as any).customPaints = (next as any).customPaints ?? [];
        (s as any).recentPaints = (next as any).recentPaints ?? [];
      })
    ),

  loadSnapshot: (raw) =>
    set(
      produce((s: CADState) => {
        const snap = migrateSnapshot(raw);
        s.rooms = snap.rooms;
        s.activeRoomId = snap.activeRoomId;
        (s as any).customElements = (snap as any).customElements ?? {};
        (s as any).customPaints = (snap as any).customPaints ?? [];
        (s as any).recentPaints = (snap as any).recentPaints ?? [];
        s.past = [];
        s.future = [];
      })
    ),

  // Paint actions (Phase 18)

  addCustomPaint: (item) => {
    const id = `custom_${Math.random().toString(36).slice(2, 10)}`;
    set(
      produce((s: CADState) => {
        pushHistory(s);
        const root = s as any;
        const paints: PaintColor[] = root.customPaints ?? [];
        root.customPaints = [...paints, { id, ...item, source: "custom" }];
      })
    );
    return id;
  },

  removeCustomPaint: (id) =>
    set(
      produce((s: CADState) => {
        pushHistory(s);
        const root = s as any;
        const paints: PaintColor[] = root.customPaints ?? [];
        root.customPaints = paints.filter((c: PaintColor) => c.id !== id);
      })
    ),

  applyPaintToAllWalls: (paintId, side) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc) return;
        pushHistory(s);
        for (const wall of Object.values(doc.walls)) {
          if (!wall.wallpaper) wall.wallpaper = {};
          wall.wallpaper[side] = { kind: "paint", paintId };
        }
        const root = s as any;
        const recent: string[] = root.recentPaints ?? [];
        root.recentPaints = [paintId, ...recent.filter((id: string) => id !== paintId)].slice(0, 8);
      })
    ),

  copyWallSide: (wallId, from, to) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.walls[wallId]) return;
        pushHistory(s);
        const wall = doc.walls[wallId];
        // Copy wallpaper
        if (!wall.wallpaper) wall.wallpaper = {};
        if (wall.wallpaper[from]) {
          wall.wallpaper[to] = JSON.parse(JSON.stringify(wall.wallpaper[from]));
        } else {
          delete wall.wallpaper[to];
        }
        // Copy wainscoting
        if (!wall.wainscoting) wall.wainscoting = {};
        if (wall.wainscoting[from]) {
          wall.wainscoting[to] = JSON.parse(JSON.stringify(wall.wainscoting[from]));
        } else {
          delete wall.wainscoting[to];
        }
        // Copy crown molding
        if (!wall.crownMolding) wall.crownMolding = {};
        if (wall.crownMolding[from]) {
          wall.crownMolding[to] = JSON.parse(JSON.stringify(wall.crownMolding[from]));
        } else {
          delete wall.crownMolding[to];
        }
        // Copy wall art — deep clone each item, flip side to target
        const fromArt = (wall.wallArt ?? []).filter((a) => (a.side ?? "A") === from);
        // Remove existing target-side art
        wall.wallArt = (wall.wallArt ?? []).filter((a) => (a.side ?? "A") !== to);
        // Clone from-side art with new IDs and target side
        for (const art of fromArt) {
          const clone = JSON.parse(JSON.stringify(art));
          clone.id = `wa_${Math.random().toString(36).slice(2, 10)}`;
          clone.side = to;
          wall.wallArt!.push(clone);
        }
      })
    ),

  swapWallSides: (wallId) =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.walls[wallId]) return;
        pushHistory(s);
        const wall = doc.walls[wallId];
        // Swap wallpaper A <-> B
        if (wall.wallpaper) {
          const tmp = wall.wallpaper.A;
          wall.wallpaper.A = wall.wallpaper.B;
          wall.wallpaper.B = tmp;
          if (!wall.wallpaper.A) delete wall.wallpaper.A;
          if (!wall.wallpaper.B) delete wall.wallpaper.B;
          if (!wall.wallpaper.A && !wall.wallpaper.B) delete wall.wallpaper;
        }
        // Swap wainscoting A <-> B
        if (wall.wainscoting) {
          const tmp = wall.wainscoting.A;
          wall.wainscoting.A = wall.wainscoting.B;
          wall.wainscoting.B = tmp;
          if (!wall.wainscoting.A) delete wall.wainscoting.A;
          if (!wall.wainscoting.B) delete wall.wainscoting.B;
          if (!wall.wainscoting.A && !wall.wainscoting.B) delete wall.wainscoting;
        }
        // Swap crown molding A <-> B
        if (wall.crownMolding) {
          const tmp = wall.crownMolding.A;
          wall.crownMolding.A = wall.crownMolding.B;
          wall.crownMolding.B = tmp;
          if (!wall.crownMolding.A) delete wall.crownMolding.A;
          if (!wall.crownMolding.B) delete wall.crownMolding.B;
          if (!wall.crownMolding.A && !wall.crownMolding.B) delete wall.crownMolding;
        }
        // Swap wall art sides
        if (wall.wallArt) {
          for (const art of wall.wallArt) {
            art.side = (art.side ?? "A") === "A" ? "B" : "A";
          }
        }
      })
    ),

  // NEW: room-management actions

  addRoom: (name, templateId) => {
    const newId = `room_${uid()}`;
    set(
      produce((s: CADState) => {
        pushHistory(s);
        const template = ROOM_TEMPLATES[templateId ?? "BLANK"];
        s.rooms[newId] = {
          id: newId,
          name,
          room: { ...template.room },
          walls: template.makeWalls(),
          placedProducts: {},
        };
        s.activeRoomId = newId;
      })
    );
    return newId;
  },

  renameRoom: (id, name) =>
    set(
      produce((s: CADState) => {
        if (!s.rooms[id]) return;
        pushHistory(s);
        s.rooms[id].name = name;
      })
    ),

  removeRoom: (id) =>
    set(
      produce((s: CADState) => {
        if (!s.rooms[id]) return;
        if (Object.keys(s.rooms).length <= 1) return; // last-room guard
        pushHistory(s);
        delete s.rooms[id];
        if (s.activeRoomId === id) {
          s.activeRoomId = Object.keys(s.rooms)[0] ?? null;
        }
      })
    ),

  switchRoom: (id) =>
    set((s) => {
      if (!s.rooms[id]) return s;
      return { ...s, activeRoomId: id };
    }),
}));

// Selector hooks
export const useActiveRoomDoc = () =>
  useCADStore((s) => (s.activeRoomId ? s.rooms[s.activeRoomId] : undefined));

export const useActiveRoom = () =>
  useCADStore((s) => (s.activeRoomId ? s.rooms[s.activeRoomId]?.room : undefined));

export const useActiveWalls = () =>
  useCADStore((s) => (s.activeRoomId ? s.rooms[s.activeRoomId]?.walls ?? {} : {}));

export const useActivePlacedProducts = () =>
  useCADStore((s) => (s.activeRoomId ? s.rooms[s.activeRoomId]?.placedProducts ?? {} : {}));

const EMPTY_CEILINGS: Record<string, Ceiling> = Object.freeze({});
export const useActiveCeilings = () =>
  useCADStore((s) => (s.activeRoomId ? s.rooms[s.activeRoomId]?.ceilings ?? EMPTY_CEILINGS : EMPTY_CEILINGS));

const EMPTY_CUSTOMS: Record<string, CustomElement> = Object.freeze({});
export const useCustomElements = () =>
  useCADStore((s) => (s as any).customElements ?? EMPTY_CUSTOMS);

const EMPTY_PLACED_CUSTOMS: Record<string, PlacedCustomElement> = Object.freeze({});
export const useActivePlacedCustomElements = () =>
  useCADStore((s) =>
    s.activeRoomId
      ? s.rooms[s.activeRoomId]?.placedCustomElements ?? EMPTY_PLACED_CUSTOMS
      : EMPTY_PLACED_CUSTOMS,
  );

// Non-hook for imperative paths (tools)
export function getActiveRoomDoc(): RoomDoc | undefined {
  const s = useCADStore.getState();
  return s.activeRoomId ? s.rooms[s.activeRoomId] : undefined;
}

// Test helper
export function resetCADStoreForTests(): void {
  useCADStore.setState(initialState() as Partial<CADState>);
}

// ─────────────────────────────────────────────────────────────────────
// Dev-only perf helpers (D-09, D-11) — stripped from production builds
// by Vite tree-shaking of the `import.meta.env.DEV` branch.
//
// window.__cadSeed(wallCount, productCount)
//   Seeds the active room with N walls + M placed products for the
//   canonical 50/30 benchmark scene. Walls arranged in a grid; products
//   arranged in a grid inside the room. Resets past/future so bench
//   timings aren't distorted by pre-existing history.
//
// window.__cadBench(iterations)
//   Runs snapshot() N times on the current state, returns { mean, p95,
//   samples } in milliseconds. Used by D-10 evidence bundle to prove
//   PERF-02 (snapshot ≥2× faster at 50W/30P).
// ─────────────────────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__cadSeed = (
    wallCount = 50,
    productCount = 30,
  ) => {
    const store = useCADStore.getState();
    const doc = store.activeRoomId ? store.rooms[store.activeRoomId] : undefined;
    if (!doc) return { walls: 0, products: 0, error: "no active room" };
    // Reset past/future so bench timings aren't distorted by old history
    useCADStore.setState({ past: [], future: [] } as Partial<CADState>);
    // Seed walls + products via direct mutation (dev-only; bypasses history).
    useCADStore.setState(
      produce((s: CADState) => {
        const d = s.activeRoomId ? s.rooms[s.activeRoomId] : undefined;
        if (!d) return;
        for (let i = 0; i < wallCount; i++) {
          const id = `wall_seed_${i}`;
          const x = (i % 10) * 1.5;
          const y = Math.floor(i / 10) * 1.5;
          d.walls[id] = {
            id,
            start: { x, y },
            end: { x: x + 1, y },
            thickness: 0.5,
            height: d.room.wallHeight,
            openings: [],
          };
        }
        for (let i = 0; i < productCount; i++) {
          const id = `pp_seed_${i}`;
          const x = 2 + (i % 6) * 2;
          const y = 2 + Math.floor(i / 6) * 2;
          d.placedProducts[id] = {
            id,
            productId: "seed_product",
            position: { x, y },
            rotation: 0,
          } as PlacedProduct;
        }
      }) as (s: CADState) => void,
    );
    return { walls: wallCount, products: productCount };
  };

  (window as unknown as Record<string, unknown>).__cadBench = (
    iterations = 100,
  ) => {
    const state = useCADStore.getState();
    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      snapshot(state);
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
    const p95 = samples[Math.floor(samples.length * 0.95)];
    // eslint-disable-next-line no-console
    console.log(
      `[__cadBench] n=${iterations} mean=${mean.toFixed(2)}ms p95=${p95.toFixed(2)}ms`,
    );
    return { mean, p95, samples };
  };
}
