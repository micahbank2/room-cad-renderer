import { useCADStore } from "@/stores/cadStore";
import { InlineEditableText } from "@/components/ui/InlineEditableText";

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
      className="bg-card border-b border-border/50 px-4 h-10 flex items-center gap-2 shrink-0"
      data-testid="ROOM_TABS"
    >
      {roomList.map((room) => {
        const isActive = room.id === activeRoomId;
        // Phase 33 GH #88: active tab is inline-editable; inactive tabs switch on click.
        // Phase 02 D-04 note: UPPERCASE transform dropped for editable labels — edits
        // reflect literal user input. Users wanting uppercase can type it.
        return (
          <div
            key={room.id}
            onClick={() => {
              if (!isActive) handleSwitch(room.id);
            }}
            className={`group flex items-center gap-1.5 px-2 h-10 -mb-px font-mono text-[10px] tracking-wider transition-colors ${
              isActive
                ? "text-foreground border-b-2 border-accent-light cursor-text"
                : "text-muted-foreground/80 hover:text-muted-foreground cursor-pointer"
            }`}
          >
            {isActive ? (
              <InlineEditableText
                value={room.name}
                onLivePreview={(v) =>
                  useCADStore.getState().renameRoomNoHistory(room.id, v)
                }
                onCommit={(v) =>
                  useCADStore.getState().renameRoom(room.id, v)
                }
                maxLength={60}
                data-testid={`inline-room-tab-${room.id}`}
                className="font-mono text-[10px] tracking-wider min-w-[40px] max-w-[200px]"
              />
            ) : (
              <span>{room.name}</span>
            )}
            {canDelete && (
              <button
                onClick={(e) => handleDelete(e, room.id, room.name)}
                className="invisible group-hover:visible text-muted-foreground/60 hover:text-error text-[11px] leading-none"
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
        className="ml-auto font-mono text-[10px] tracking-wider text-muted-foreground/80 hover:text-foreground transition-colors px-2"
      >
        + ADD ROOM
      </button>
    </div>
  );
}
