import { useCADStore, useActiveRoom } from "@/stores/cadStore";

export default function RoomSettings() {
  const room = useActiveRoom() ?? { width: 20, length: 16, wallHeight: 8 };
  const setRoom = useCADStore((s) => s.setRoom);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="font-mono text-[9px] text-text-ghost tracking-wider">WIDTH FT</span>
          <input
            type="number"
            min={4}
            max={200}
            step={0.5}
            value={room.width}
            onChange={(e) => setRoom({ width: Math.max(4, +e.target.value) })}
            className="w-full px-2 py-1.5 text-xs text-accent-light"
          />
        </label>
        <label className="space-y-1">
          <span className="font-mono text-[9px] text-text-ghost tracking-wider">LENGTH FT</span>
          <input
            type="number"
            min={4}
            max={200}
            step={0.5}
            value={room.length}
            onChange={(e) => setRoom({ length: Math.max(4, +e.target.value) })}
            className="w-full px-2 py-1.5 text-xs text-accent-light"
          />
        </label>
      </div>
      <label className="space-y-1 block">
        <span className="font-mono text-[9px] text-text-ghost tracking-wider">HEIGHT FT</span>
        <input
          type="number"
          min={6}
          max={20}
          step={0.5}
          value={room.wallHeight}
          onChange={(e) => setRoom({ wallHeight: Math.max(6, +e.target.value) })}
          className="w-full px-2 py-1.5 text-xs text-accent-light"
        />
      </label>
    </div>
  );
}
