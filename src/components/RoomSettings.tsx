import {
  useCADStore,
  useActiveRoom,
  useActiveRoomDoc,
} from "@/stores/cadStore";
import { MaterialPicker } from "./MaterialPicker";

export default function RoomSettings() {
  const room = useActiveRoom() ?? { width: 20, length: 16, wallHeight: 8 };
  const setRoom = useCADStore((s) => s.setRoom);

  // Phase 68 D-05: floor MaterialPicker target. Sourced from RoomDoc so the
  // canonical floorMaterialId / floorScaleFt fields drive the picker.
  const activeRoomDoc = useActiveRoomDoc();
  const activeRoomId = useCADStore((s) => s.activeRoomId);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">WIDTH FT</span>
          <input
            type="number"
            min={4}
            max={200}
            step={0.5}
            value={room.width}
            onChange={(e) => setRoom({ width: Math.max(4, +e.target.value) })}
            className="w-full px-2 py-1.5 text-xs text-foreground"
          />
        </label>
        <label className="space-y-1">
          <span className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">LENGTH FT</span>
          <input
            type="number"
            min={4}
            max={200}
            step={0.5}
            value={room.length}
            onChange={(e) => setRoom({ length: Math.max(4, +e.target.value) })}
            className="w-full px-2 py-1.5 text-xs text-foreground"
          />
        </label>
      </div>
      <label className="space-y-1 block">
        <span className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">HEIGHT FT</span>
        <input
          type="number"
          min={6}
          max={20}
          step={0.5}
          value={room.wallHeight}
          onChange={(e) => setRoom({ wallHeight: Math.max(6, +e.target.value) })}
          className="w-full px-2 py-1.5 text-xs text-foreground"
        />
      </label>

      {/* Phase 68 D-05: floor MaterialPicker. Replaces the legacy
          FloorMaterialPicker (kept on disk for v1.18 cleanup). */}
      {activeRoomId && (
        <MaterialPicker
          surface="floor"
          target={{ kind: "floor", roomId: activeRoomId }}
          value={activeRoomDoc?.floorMaterialId}
          tileSizeOverride={activeRoomDoc?.floorScaleFt}
        />
      )}
    </div>
  );
}
