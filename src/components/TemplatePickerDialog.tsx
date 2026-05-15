import { useEffect, useRef } from "react";
import { LayoutGrid, Sofa, BedDouble, ChefHat, Upload, ImageOff, X, type LucideIcon } from "lucide-react";
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
        // Phase 86 D-04: write at current schema version (10).
        version: 10,
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

  const templates: { id: RoomTemplateId; title: string; sub: string; Icon: LucideIcon }[] = [
    { id: "BLANK",       title: "BLANK ROOM",   sub: "Draw walls from scratch",   Icon: LayoutGrid },
    { id: "LIVING_ROOM", title: "LIVING ROOM",  sub: "16 × 20 ft perimeter",     Icon: Sofa },       // D-15: substitute for material-symbols 'weekend'
    { id: "BEDROOM",     title: "BEDROOM",      sub: "12 × 14 ft perimeter",     Icon: BedDouble },  // D-15: substitute for material-symbols 'bed'
    { id: "KITCHEN",     title: "KITCHEN",      sub: "10 × 12 ft perimeter",     Icon: ChefHat },    // D-15: substitute for material-symbols 'kitchen'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-[700px] max-w-[95vw] bg-popover border border-border/60 rounded-smooth-md shadow-2xl"
        role="dialog"
        aria-label="Choose a floor plan template"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <h2 className="font-sans text-sm text-foreground tracking-widest uppercase">
            Choose A Template
          </h2>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => pickTemplate(t.id)}
              className="group text-left bg-card border border-border/10 hover:border-accent/40 rounded-smooth-md p-4 transition-all"
            >
              <t.Icon size={28} className="text-foreground mb-2 block" />
              <h3 className="font-sans text-[11px] text-foreground tracking-widest mb-1 group-hover:text-foreground transition-colors">
                {t.title}
              </h3>
              <p className="font-sans text-[10px] text-muted-foreground/60 leading-relaxed">
                {t.sub}
              </p>
            </button>
          ))}
          {showUploadOptions && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group text-left bg-card border border-border/10 hover:border-accent/40 rounded-smooth-md p-4 transition-all"
              >
                <Upload size={28} className="text-foreground mb-2 block" />
                <h3 className="font-sans text-[11px] text-foreground tracking-widest mb-1 group-hover:text-foreground transition-colors">
                  UPLOAD IMAGE
                </h3>
                <p className="font-sans text-[10px] text-muted-foreground/60 leading-relaxed">
                  Use an existing plan as a tracing reference.
                </p>
              </button>
              <button
                onClick={handleRemoveImage}
                className="group text-left bg-card border border-border/10 hover:border-accent/40 rounded-smooth-md p-4 transition-all"
              >
                <ImageOff size={28} className="text-muted-foreground/60 mb-2 block" />
                <h3 className="font-sans text-[11px] text-foreground tracking-widest mb-1 group-hover:text-foreground transition-colors">
                  REMOVE IMAGE
                </h3>
                <p className="font-sans text-[10px] text-muted-foreground/60 leading-relaxed">
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
          <p className="font-sans text-[9px] text-muted-foreground/60 tracking-wider">
            ESC TO CLOSE
          </p>
        </div>
      </div>
    </div>
  );
}
