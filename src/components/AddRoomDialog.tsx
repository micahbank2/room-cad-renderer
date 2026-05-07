import { useState } from "react";
import { useCADStore } from "@/stores/cadStore";
import { ROOM_TEMPLATES, type RoomTemplateId } from "@/data/roomTemplates";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TEMPLATE_IDS: RoomTemplateId[] = ["LIVING_ROOM", "BEDROOM", "KITCHEN", "BLANK"];

export default function AddRoomDialog({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [tpl, setTpl] = useState<RoomTemplateId>("BLANK");
  if (!open) return null;

  const handleCreate = () => {
    if (!name.trim()) return;
    useCADStore.getState().addRoom(name.trim(), tpl);
    setName("");
    setTpl("BLANK");
    onClose();
  };

  const handleCancel = () => {
    setName("");
    setTpl("BLANK");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      data-testid="ADD_ROOM"
    >
      <div className="bg-popover border border-border/60 p-6 w-[480px] font-sans">
        <h2 className="text-foreground text-sm mb-4 tracking-widest">ADD ROOM</h2>
        <label className="block text-muted-foreground/80 text-[9px] tracking-wider mb-1">ROOM NAME</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              handleCancel();
            }
          }}
          className="w-full bg-background text-foreground px-2 py-1.5 border border-border/60 mb-4 font-sans text-xs outline-none focus:border-accent"
          placeholder="ROOM NAME"
        />
        <label className="block text-muted-foreground/80 text-[9px] tracking-wider mb-2">Template</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {TEMPLATE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTpl(id)}
              className={`p-3 text-[10px] text-left border transition-colors ${
                tpl === id
                  ? "border-accent text-foreground bg-accent/10"
                  : "border-border/60 text-muted-foreground hover:border-accent/50"
              }`}
            >
              {ROOM_TEMPLATES[id].label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-[10px] tracking-widest text-muted-foreground/80 hover:text-muted-foreground"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-[10px] tracking-widest bg-accent text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            CREATE
          </button>
        </div>
      </div>
    </div>
  );
}
