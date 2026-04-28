import { useEffect, useRef } from "react";
import { useCADStore } from "@/stores/cadStore";
import { defaultSnapshot } from "@/lib/snapshotMigration";
import { ROOM_TEMPLATES, type RoomTemplateId } from "@/data/roomTemplates";
import type { CADSnapshot } from "@/types/cad";
import { uid } from "@/lib/geometry";

interface Props {
  open: boolean;
  onClose: () => void;
  onPicked?: () => void; // fired after a template is loaded
  /** When true, also shows an "Upload Image" option and a "Remove Image" option. */
  showUploadOptions?: boolean;
}

export default function TemplatePickerDialog({ open, onClose, onPicked, showUploadOptions }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const loadSnapshot = useCADStore.getState().loadSnapshot;
  const setFloorPlanImage = useCADStore.getState().setFloorPlanImage;

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFloorPlanImage(reader.result as string);
      onPicked?.();
      onClose();
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFloorPlanImage(undefined);
    onPicked?.();
    onClose();
  };

  const pickTemplate = async (id: RoomTemplateId) => {
    if (id === "BLANK") {
      await loadSnapshot(defaultSnapshot());
    } else {
      const tpl = ROOM_TEMPLATES[id];
      const roomId = `room_${uid()}`;
      const snap: CADSnapshot = {
        version: 2,
        rooms: {
          [roomId]: {
            id: roomId,
            name: tpl.label.split(" ")[0],
            room: tpl.room,
            walls: tpl.makeWalls(),
            placedProducts: {},
            // Phase 43 (DEFAULT-01 / GH #100): named templates ship with a
            // ceiling. BLANK omits `makeCeiling` so the field stays absent.
            ...(tpl.makeCeiling ? { ceilings: tpl.makeCeiling() } : {}),
          },
        },
        activeRoomId: roomId,
      };
      await loadSnapshot(snap);
    }
    onPicked?.();
    onClose();
  };

  const templates: { id: RoomTemplateId; title: string; sub: string; icon: string }[] = [
    { id: "BLANK", title: "BLANK ROOM", sub: "Draw walls from scratch", icon: "grid_view" },
    { id: "LIVING_ROOM", title: "LIVING ROOM", sub: "16 × 20 ft perimeter", icon: "weekend" },
    { id: "BEDROOM", title: "BEDROOM", sub: "12 × 14 ft perimeter", icon: "bed" },
    { id: "KITCHEN", title: "KITCHEN", sub: "10 × 12 ft perimeter", icon: "kitchen" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-obsidian-deepest/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-[700px] max-w-[95vw] bg-obsidian-mid border border-outline-variant/30 rounded-sm shadow-2xl"
        role="dialog"
        aria-label="Choose a floor plan template"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/20">
          <h2 className="font-mono text-sm text-text-primary tracking-widest uppercase">
            Choose A Template
          </h2>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="text-text-ghost hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => pickTemplate(t.id)}
              className="group text-left bg-obsidian-low border border-outline-variant/10 hover:border-accent/40 rounded-sm p-4 transition-all"
            >
              <span className="material-symbols-outlined text-[28px] text-accent mb-2 block">
                {t.icon}
              </span>
              <h3 className="font-mono text-[11px] text-text-primary tracking-widest mb-1 group-hover:text-accent-light transition-colors">
                {t.title}
              </h3>
              <p className="font-mono text-[10px] text-text-ghost leading-relaxed">
                {t.sub}
              </p>
            </button>
          ))}
          {showUploadOptions && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group text-left bg-obsidian-low border border-outline-variant/10 hover:border-accent/40 rounded-sm p-4 transition-all"
              >
                <span className="material-symbols-outlined text-[28px] text-accent mb-2 block">
                  upload_file
                </span>
                <h3 className="font-mono text-[11px] text-text-primary tracking-widest mb-1 group-hover:text-accent-light transition-colors">
                  UPLOAD IMAGE
                </h3>
                <p className="font-mono text-[10px] text-text-ghost leading-relaxed">
                  Use an existing plan as a tracing reference.
                </p>
              </button>
              <button
                onClick={handleRemoveImage}
                className="group text-left bg-obsidian-low border border-outline-variant/10 hover:border-accent/40 rounded-sm p-4 transition-all"
              >
                <span className="material-symbols-outlined text-[28px] text-text-ghost mb-2 block">
                  image_not_supported
                </span>
                <h3 className="font-mono text-[11px] text-text-primary tracking-widest mb-1 group-hover:text-accent-light transition-colors">
                  REMOVE IMAGE
                </h3>
                <p className="font-mono text-[10px] text-text-ghost leading-relaxed">
                  Clear the current tracing background.
                </p>
              </button>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
        <div className="px-5 pb-4">
          <p className="font-mono text-[9px] text-text-ghost tracking-wider">
            ESC TO CLOSE
          </p>
        </div>
      </div>
    </div>
  );
}
