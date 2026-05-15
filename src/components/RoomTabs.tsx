import { useCADStore } from "@/stores/cadStore";
import { InlineEditableText } from "@/components/ui/InlineEditableText";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";

interface Props {
  onAddClick: () => void;
}

export default function RoomTabs({ onAddClick }: Props) {
  const rooms = useCADStore((s) => s.rooms);
  const activeRoomId = useCADStore((s) => s.activeRoomId);
  const roomList = Object.values(rooms);
  const canDelete = roomList.length > 1;

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!canDelete) return;
    if (window.confirm(`Delete room "${name}"?`)) {
      useCADStore.getState().removeRoom(id);
    }
  };

  return (
    <div
      className="bg-card border-b border-border/50 px-2 h-10 flex items-center gap-2 shrink-0"
      data-testid="ROOM_TABS"
    >
      <Tabs
        value={activeRoomId ?? ""}
        onValueChange={(id) => useCADStore.getState().switchRoom(id)}
        className="flex-1 flex-row"
      >
        {/* Phase 33 GH #88: active tab is inline-editable; inactive tabs switch on click.
            Phase 02 D-04 note: UPPERCASE transform dropped for editable labels. */}
        <TabsList className="h-10 bg-transparent p-0 gap-0 rounded-none border-none">
          {roomList.map((room) => {
            const isActive = room.id === activeRoomId;
            return (
              <TabsTrigger
                key={room.id}
                value={room.id}
                className={`group h-10 px-2 gap-1.5 font-sans text-[12px] tracking-wider rounded-none border-b-2
                  data-[active=true]:border-accent-light data-[active=true]:bg-transparent data-[active=true]:text-foreground
                  border-transparent text-muted-foreground/80 hover:text-muted-foreground
                  ${isActive ? "cursor-text" : "cursor-pointer"}`}
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
                    className="font-sans text-[12px] tracking-wider min-w-[40px] max-w-[200px]"
                  />
                ) : (
                  <span>{room.name}</span>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => handleDelete(e, room.id, room.name)}
                    className="invisible group-hover:visible text-muted-foreground/60 hover:text-destructive text-[13px] leading-none"
                    aria-label={`Delete ${room.name}`}
                  >
                    ×
                  </button>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <button
        onClick={onAddClick}
        className="ml-auto font-sans text-[12px] tracking-wider text-muted-foreground/80 hover:text-foreground transition-colors px-2 shrink-0"
      >
        + ADD ROOM
      </button>
    </div>
  );
}
