import { create } from "zustand";
import { produce } from "immer";
import type {
  Room,
  WallSegment,
  PlacedProduct,
  CADSnapshot,
  Point,
  Opening,
} from "@/types/cad";
import { uid } from "@/lib/geometry";

const MAX_HISTORY = 50;

interface CADState {
  room: Room;
  walls: Record<string, WallSegment>;
  placedProducts: Record<string, PlacedProduct>;

  past: CADSnapshot[];
  future: CADSnapshot[];

  setRoom: (changes: Partial<Room>) => void;
  addWall: (start: Point, end: Point) => void;
  updateWall: (id: string, changes: Partial<WallSegment>) => void;
  removeWall: (id: string) => void;
  addOpening: (wallId: string, opening: Omit<Opening, "id">) => void;
  placeProduct: (productId: string, position: Point) => string;
  moveProduct: (id: string, position: Point) => void;
  rotateProduct: (id: string, angle: number) => void;
  rotateProductNoHistory: (id: string, angle: number) => void;
  removeProduct: (id: string) => void;
  removeSelected: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  loadSnapshot: (snap: CADSnapshot) => void;
}

function snapshot(state: CADState): CADSnapshot {
  return {
    room: { ...state.room },
    walls: JSON.parse(JSON.stringify(state.walls)),
    placedProducts: JSON.parse(JSON.stringify(state.placedProducts)),
  };
}

function pushHistory(state: CADState): void {
  state.past.push(snapshot(state));
  if (state.past.length > MAX_HISTORY) state.past.shift();
  state.future = [];
}

export const useCADStore = create<CADState>()((set) => ({
  room: { width: 20, length: 16, wallHeight: 8 },
  walls: {},
  placedProducts: {},
  past: [],
  future: [],

  setRoom: (changes) =>
    set(
      produce((s: CADState) => {
        pushHistory(s);
        Object.assign(s.room, changes);
      })
    ),

  addWall: (start, end) =>
    set(
      produce((s: CADState) => {
        pushHistory(s);
        const id = `wall_${uid()}`;
        s.walls[id] = {
          id,
          start,
          end,
          thickness: 0.5,
          height: s.room.wallHeight,
          openings: [],
        };
      })
    ),

  updateWall: (id, changes) =>
    set(
      produce((s: CADState) => {
        if (!s.walls[id]) return;
        pushHistory(s);
        Object.assign(s.walls[id], changes);
      })
    ),

  removeWall: (id) =>
    set(
      produce((s: CADState) => {
        if (!s.walls[id]) return;
        pushHistory(s);
        delete s.walls[id];
      })
    ),

  addOpening: (wallId, opening) =>
    set(
      produce((s: CADState) => {
        if (!s.walls[wallId]) return;
        pushHistory(s);
        s.walls[wallId].openings.push({ ...opening, id: `op_${uid()}` });
      })
    ),

  placeProduct: (productId, position) => {
    const id = `pp_${uid()}`;
    set(
      produce((s: CADState) => {
        pushHistory(s);
        s.placedProducts[id] = { id, productId, position, rotation: 0 };
      })
    );
    return id;
  },

  moveProduct: (id, position) =>
    set(
      produce((s: CADState) => {
        if (!s.placedProducts[id]) return;
        pushHistory(s);
        s.placedProducts[id].position = position;
      })
    ),

  rotateProduct: (id, angle) =>
    set(
      produce((s: CADState) => {
        if (!s.placedProducts[id]) return;
        pushHistory(s);
        s.placedProducts[id].rotation = angle;
      })
    ),

  rotateProductNoHistory: (id, angle) =>
    set(
      produce((s: CADState) => {
        if (!s.placedProducts[id]) return;
        s.placedProducts[id].rotation = angle;
      })
    ),

  removeProduct: (id) =>
    set(
      produce((s: CADState) => {
        if (!s.placedProducts[id]) return;
        pushHistory(s);
        delete s.placedProducts[id];
      })
    ),

  removeSelected: (ids) =>
    set(
      produce((s: CADState) => {
        pushHistory(s);
        for (const id of ids) {
          delete s.walls[id];
          delete s.placedProducts[id];
        }
      })
    ),

  undo: () =>
    set(
      produce((s: CADState) => {
        if (s.past.length === 0) return;
        s.future.push(snapshot(s));
        const prev = s.past.pop()!;
        s.room = prev.room;
        s.walls = prev.walls;
        s.placedProducts = prev.placedProducts;
      })
    ),

  redo: () =>
    set(
      produce((s: CADState) => {
        if (s.future.length === 0) return;
        s.past.push(snapshot(s));
        const next = s.future.pop()!;
        s.room = next.room;
        s.walls = next.walls;
        s.placedProducts = next.placedProducts;
      })
    ),

  loadSnapshot: (snap) =>
    set(
      produce((s: CADState) => {
        s.room = snap.room;
        s.walls = snap.walls;
        s.placedProducts = snap.placedProducts;
        s.past = [];
        s.future = [];
      })
    ),
}));
