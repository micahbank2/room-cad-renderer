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
      version: 2,
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
    <div className="space-y-3">
      <h3 className="font-mono text-base font-medium text-text-muted">
        Project
      </h3>

      {/* Phase 33 GH #88 — inline editing relocated to Toolbar. Read-only here. */}
      <div
        className="w-full px-2 py-1.5 font-mono text-sm text-text-dim truncate"
        title={projectName}
      >
        Editing: <span className="text-text-primary">{projectName}</span>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-1.5 rounded bg-cad-accent text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={handleNew}
          className="px-3 py-1.5 rounded bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
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
                  ? "border-cad-accent bg-blue-50"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-700 truncate">
                  {p.name}
                </div>
                <div className="text-[10px] text-gray-400">
                  {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleLoad(p.id)}
                  className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-[10px]"
                >
                  Load
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="px-1.5 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100 text-[10px]"
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
