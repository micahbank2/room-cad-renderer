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
  resizeWallByLabel: (id: string, newLengthFt: number) => void;
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
  loadSnapshot: (raw: unknown) => void;

  // NEW: room-management actions
  addRoom: (name: string, templateId?: RoomTemplateId) => string;
  renameRoom: (id: string, name: string) => void;
  removeRoom: (id: string) => void;
  switchRoom: (id: string) => void;
}

function snapshot(state: CADState): CADSnapshot {
  return {
    version: 2,
    rooms: JSON.parse(JSON.stringify(state.rooms)),
    activeRoomId: state.activeRoomId,
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
      })
    ),

  loadSnapshot: (raw) =>
    set(
      produce((s: CADState) => {
        const snap = migrateSnapshot(raw);
        s.rooms = snap.rooms;
        s.activeRoomId = snap.activeRoomId;
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

// Non-hook for imperative paths (tools)
export function getActiveRoomDoc(): RoomDoc | undefined {
  const s = useCADStore.getState();
  return s.activeRoomId ? s.rooms[s.activeRoomId] : undefined;
}

// Test helper
export function resetCADStoreForTests(): void {
  useCADStore.setState(initialState() as Partial<CADState>);
}
