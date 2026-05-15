import { useState, useEffect } from "react";
import { useCADStore } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";
import {
  saveProject,
  loadProject,
  deleteProject,
  listProjects,
  type SavedProject,
} from "@/lib/serialization";
import { uid } from "@/lib/geometry";
import { defaultSnapshot } from "@/lib/snapshotMigration";

export default function ProjectManager() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [saving, setSaving] = useState(false);
  const currentId = useProjectStore((s) => s.activeId);
  const projectName = useProjectStore((s) => s.activeName);
  const setActive = useProjectStore((s) => s.setActive);
  const clearActive = useProjectStore((s) => s.clearActive);
  // Phase 33 GH #88: document title is now edited inline in the Toolbar.
  // ProjectManager shows it read-only; setActiveName is no longer wired here.

  const loadSnapshot = useCADStore((s) => s.loadSnapshot);

  useEffect(() => {
    listProjects().then(setProjects);
  }, []);

  async function handleSave() {
    setSaving(true);
    const id = currentId ?? `proj_${uid()}`;
    const st = useCADStore.getState() as any;
    await saveProject(id, projectName, {
      // Persist at current schema version — Phase 86 D-04 bumped to 10.
      // Legacy on-disk values flow through migrateSnapshot on load.
      version: 10,
      rooms: st.rooms,
      activeRoomId: st.activeRoomId,
      ...(st.customElements ? { customElements: st.customElements } : {}),
    });
    setActive(id, projectName);
    const updated = await listProjects();
    setProjects(updated);
    setSaving(false);
  }

  async function handleLoad(id: string) {
    const project = await loadProject(id);
    if (project) {
      await loadSnapshot(project.snapshot);
      setActive(project.id, project.name);
    }
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    if (currentId === id) clearActive();
    const updated = await listProjects();
    setProjects(updated);
  }

  async function handleNew() {
    clearActive();
    await loadSnapshot(defaultSnapshot());
  }

  return (
    <div className="light space-y-3">
      <h3 className="font-sans text-base font-medium text-muted-foreground">
        Project
      </h3>

      {/* Phase 33 GH #88 — inline editing relocated to Toolbar. Read-only here. */}
      <div
        className="w-full px-2 py-1.5 font-sans text-sm text-muted-foreground/80 truncate"
        title={projectName}
      >
        Editing: <span className="text-foreground">{projectName}</span>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={handleNew}
          className="px-3 py-1.5 rounded bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
        >
          New
        </button>
      </div>

      {projects.length > 0 && (
        <div className="space-y-1 max-h-[150px] overflow-y-auto">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-1.5 rounded text-xs border transition-colors ${
                currentId === p.id
                  ? "border-ring bg-accent/10"
                  : "border-border hover:border-border/60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-sans font-medium text-foreground truncate">
                  {p.name}
                </div>
                <div className="font-sans text-[10px] text-muted-foreground">
                  {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleLoad(p.id)}
                  className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/80 text-[10px]"
                >
                  Load
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 text-[10px]"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
