import { useRef, useState } from "react";
import { useCADStore } from "@/stores/cadStore";
import { defaultSnapshot } from "@/lib/snapshotMigration";
import TemplatePickerDialog from "./TemplatePickerDialog";

interface Props {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: Props) {
  const [showTemplates, setShowTemplates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadSnapshot = useCADStore((s) => s.loadSnapshot);
  const setFloorPlanImage = useCADStore((s) => s.setFloorPlanImage);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (PNG, JPG, etc.)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      loadSnapshot(defaultSnapshot());
      setFloorPlanImage(dataUrl);
      onStart();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full flex flex-col bg-obsidian-base">
      {/* Minimal top bar — just the brand */}
      <header className="h-14 bg-obsidian-deepest flex items-center px-6 ghost-border border-0 border-b">
        <span className="font-display font-bold text-accent text-sm tracking-[0.1em]">
          OBSIDIAN_CAD
        </span>
      </header>

      {/* Centered hero with 2 CTAs */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="max-w-2xl text-center">
          <h1 className="font-display font-bold text-5xl text-text-primary tracking-tight mb-4 leading-tight">
            DESIGN_YOUR_SPACE
          </h1>
          <p className="text-text-dim text-sm leading-relaxed max-w-lg mx-auto mb-10">
            Start by creating a new floor plan from a template, or upload a reference
            image of an existing plan to trace walls on top of.
          </p>

          {/* Exactly 2 primary CTAs (HOME-01) */}
          <div className="flex gap-5 justify-center">
            {/* Create floor plan */}
            <button
              onClick={() => setShowTemplates(true)}
              className="w-72 bg-obsidian-low border border-outline-variant/10 hover:border-accent/40 rounded-sm p-6 text-left transition-all group"
            >
              <span className="material-symbols-outlined text-[28px] text-accent mb-3 block">
                add_box
              </span>
              <h3 className="font-mono text-xs text-text-primary tracking-widest mb-2 group-hover:text-accent-light transition-colors">
                CREATE_FLOOR_PLAN
              </h3>
              <p className="text-[11px] text-text-ghost leading-relaxed">
                Start with a blank room or one of four pre-drawn templates.
              </p>
            </button>

            {/* Upload floor plan */}
            <button
              onClick={handleUploadClick}
              className="w-72 bg-obsidian-low border border-outline-variant/10 hover:border-accent/40 rounded-sm p-6 text-left transition-all group"
            >
              <span className="material-symbols-outlined text-[28px] text-accent mb-3 block">
                upload_file
              </span>
              <h3 className="font-mono text-xs text-text-primary tracking-widest mb-2 group-hover:text-accent-light transition-colors">
                UPLOAD_FLOOR_PLAN
              </h3>
              <p className="text-[11px] text-text-ghost leading-relaxed">
                Drop an image of an existing plan and trace walls on top of it.
              </p>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Simple status bar */}
      <div className="h-8 bg-obsidian-deepest flex items-center px-4 ghost-border border-0 border-t">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="font-mono text-[9px] text-text-ghost tracking-widest">
            SYSTEM_STATUS: READY
          </span>
        </div>
      </div>

      <TemplatePickerDialog
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onPicked={onStart}
      />
    </div>
  );
}
