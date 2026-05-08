import { useRef, useState, useEffect } from "react";
import { Plus, Upload, FolderOpen, ArrowRight } from "lucide-react";
import { useCADStore } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";
import { defaultSnapshot } from "@/lib/snapshotMigration";
import { listProjects, loadProject, type SavedProject } from "@/lib/serialization";
import TemplatePickerDialog from "./TemplatePickerDialog";

interface Props {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: Props) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadSnapshot = useCADStore((s) => s.loadSnapshot);
  const setFloorPlanImage = useCADStore((s) => s.setFloorPlanImage);
  const setActive = useProjectStore((s) => s.setActive);

  useEffect(() => {
    listProjects().then(setProjects);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleOpenProject = async (project: SavedProject) => {
    const full = await loadProject(project.id);
    if (full) {
      await loadSnapshot(full.snapshot);
      setActive(full.id, full.name);
      onStart();
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (PNG, JPG, etc.)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      void loadSnapshot(defaultSnapshot()); // Phase 51: defaultSnapshot() is v3, no async migration work needed
      setFloorPlanImage(dataUrl);
      onStart();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="light h-full flex flex-col bg-background">
      {/* Minimal top bar — just the brand */}
      <header className="h-14 bg-background flex items-center px-6 border border-border/50 border-0 border-b">
        <span className="font-sans font-bold text-foreground text-sm tracking-[0.1em]">
          Room CAD Renderer
        </span>
      </header>

      {/* Centered hero with 2 CTAs */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="max-w-2xl text-center">
          <h1 className="font-sans font-bold text-5xl text-foreground tracking-tight mb-4 leading-tight">
            Design Your Space
          </h1>
          <p className="text-muted-foreground/80 text-sm leading-relaxed max-w-lg mx-auto mb-10">
            Start by creating a new floor plan from a template, or upload a reference
            image of an existing plan to trace walls on top of.
          </p>

          {/* Exactly 2 primary CTAs (HOME-01) */}
          <div className="flex gap-5 justify-center">
            {/* Create floor plan */}
            <button
              onClick={() => setShowTemplates(true)}
              className="w-72 bg-card border border-border/10 hover:border-accent/40 rounded-smooth-md p-6 text-left transition-all group"
            >
              <Plus size={28} className="text-foreground mb-3 block" />
              <h3 className="font-sans text-xs text-foreground tracking-widest mb-2 group-hover:text-foreground transition-colors">
                CREATE FLOOR PLAN
              </h3>
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                Start with a blank room or one of four pre-drawn templates.
              </p>
            </button>

            {/* Upload floor plan */}
            <button
              onClick={handleUploadClick}
              className="w-72 bg-card border border-border/10 hover:border-accent/40 rounded-smooth-md p-6 text-left transition-all group"
            >
              <Upload size={28} className="text-foreground mb-3 block" />
              <h3 className="font-sans text-xs text-foreground tracking-widest mb-2 group-hover:text-foreground transition-colors">
                UPLOAD FLOOR PLAN
              </h3>
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                Drop an image of an existing plan and trace walls on top of it.
              </p>
            </button>

            {/* Open existing project */}
            {projects.length > 0 && (
              <button
                onClick={() => setShowProjects((v) => !v)}
                className="w-72 bg-card border border-border/10 hover:border-accent/40 rounded-smooth-md p-6 text-left transition-all group"
              >
                <FolderOpen size={28} className="text-foreground mb-3 block" />
                <h3 className="font-sans text-xs text-foreground tracking-widest mb-2 group-hover:text-foreground transition-colors">
                  OPEN PROJECT
                </h3>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  Resume a previously saved project from your library.
                </p>
              </button>
            )}
          </div>

          {/* Saved project list */}
          {showProjects && projects.length > 0 && (
            <div className="mt-6 w-full max-w-2xl">
              <div className="bg-card border border-border/10 rounded-smooth-md p-4 space-y-2">
                <h4 className="font-sans text-[9px] text-muted-foreground/60 tracking-widest mb-3">
                  SAVED PROJECTS
                </h4>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleOpenProject(p)}
                    className="w-full flex items-center justify-between p-3 rounded-smooth-md border border-border/10 hover:border-accent/40 bg-background transition-all group text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-sans text-xs text-foreground tracking-wide group-hover:text-foreground transition-colors truncate">
                        {p.name.toUpperCase().replace(/\s/g, "_")}
                      </div>
                      <div className="font-sans text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-muted-foreground/60 group-hover:text-accent transition-colors ml-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
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
      <div className="h-8 bg-background flex items-center px-4 border border-border/50 border-0 border-t">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="font-sans text-[9px] text-muted-foreground/60 tracking-widest">
            SYSTEM STATUS: READY
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
