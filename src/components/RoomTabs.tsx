import { useCADStore } from "@/stores/cadStore";

interface Props {
  onAddClick: () => void;
}

export default function RoomTabs({ onAddClick }: Props) {
  const rooms = useCADStore((s) => s.rooms);
  const activeRoomId = useCADStore((s) => s.activeRoomId);
  const roomList = Object.values(rooms);
  const canDelete = roomList.length > 1;

  const handleSwitch = (id: string) => {
    useCADStore.getState().switchRoom(id);
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!canDelete) return;
    if (window.confirm(`Delete room "${name}"?`)) {
      useCADStore.getState().removeRoom(id);
    }
  };

  return (
    <div
      className="bg-obsidian-low border-b border-outline-variant/20 px-4 h-10 flex items-center gap-2 shrink-0"
      data-testid="ROOM_TABS"
    >
      {roomList.map((room) => {
        const isActive = room.id === activeRoomId;
        const label = room.name.toUpperCase();
        return (
          <div
            key={room.id}
            onClick={() => handleSwitch(room.id)}
            className={`group flex items-center gap-1.5 px-2 h-10 -mb-px cursor-pointer font-mono text-[10px] tracking-wider transition-colors ${
              isActive
                ? "text-accent-light border-b-2 border-accent-light"
                : "text-text-dim hover:text-text-muted"
            }`}
          >
            <span>{label}</span>
            {canDelete && (
              <button
                onClick={(e) => handleDelete(e, room.id, room.name)}
                className="invisible group-hover:visible text-text-ghost hover:text-error text-[11px] leading-none"
                aria-label={`Delete ${room.name}`}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={onAddClick}
        className="ml-auto font-mono text-[10px] tracking-wider text-text-dim hover:text-accent-light transition-colors px-2"
      >
        + ADD_ROOM
      </button>
    </div>
  );
}
