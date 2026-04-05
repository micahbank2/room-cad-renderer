import { create } from "zustand";
import { produce } from "immer";
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
  setFloorPlanImage: (dataUrl: string | undefined) => void;
  addCeiling: (points: Point[], height: number, material?: string) => string;
  updateCeiling: (id: string, changes: Partial<Ceiling>) => void;
  removeCeiling: (id: string) => void;
  setFloorMaterial: (material: FloorMaterial | undefined) => void;
  setWallpaper: (wallId: string, side: WallSide, wallpaper: Wallpaper | undefined) => void;
  toggleWainscoting: (wallId: string, side: WallSide, enabled: boolean, heightFt?: number, color?: string) => void;
  toggleCrownMolding: (wallId: string, side: WallSide, enabled: boolean, heightFt?: number, color?: string) => void;
  addWallArt: (wallId: string, art: Omit<WallArt, "id">) => string;
  updateWallArt: (wallId: string, artId: string, changes: Partial<WallArt>) => void;
  removeWallArt: (wallId: string, artId: string) => void;
  // Custom elements (v1.2 Phase 14)
  addCustomElement: (el: Omit<CustomElement, "id">) => string;
  updateCustomElement: (id: string, changes: Partial<CustomElement>) => void;
  removeCustomElement: (id: string) => void;
  placeCustomElement: (customElementId: string, position: Point) => string;
  moveCustomElement: (id: string, position: Point) => void;
  removePlacedCustomElement: (id: string) => void;
  removeProduct: (id: string) => void;
  removeSelected: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  loadSnapshot: (raw: unknown) => void;

  // NEW: room-management actions
  addRoom: (name: string, templateId?: RoomTemplateId) => string;
  renameRoom: (id: string, name: string) => void;
  removeRoom: (id: string) => void;
  switchRoom: (id: string) => void;
}

function snapshot(state: CADState): CADSnapshot {
  const root = state as any;
  return {
    version: 2,
    rooms: JSON.parse(JSON.stringify(state.rooms)),
    activeRoomId: state.activeRoomId,
    ...(root.customElements
      ? { customElements: JSON.parse(JSON.stringify(root.customElements)) }
      : {}),
  };
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
      })
    ),

  toggleWainscoting: (wallId, side, enabled, heightFt = 3, color = "#ffffff") =>
    set(
      produce((s: CADState) => {
        const doc = activeDoc(s);
        if (!doc || !doc.walls[wallId]) return;
        pushHistory(s);
        const wall = doc.walls[wallId];
        if (!wall.wainscoting) wall.wainscoting = {};
        if (enabled) {
          wall.wainscoting[side] = { enabled: true, heightFt, color };
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
      })
    ),

  loadSnapshot: (raw) =>
    set(
      produce((s: CADState) => {
        const snap = migrateSnapshot(raw);
        s.rooms = snap.rooms;
        s.activeRoomId = snap.activeRoomId;
        (s as any).customElements = (snap as any).customElements ?? {};
        s.past = [];
        s.future = [];
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
