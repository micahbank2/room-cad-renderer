import { get, set, del, keys } from "idb-keyval";
import type { CADSnapshot } from "@/types/cad";

const PROJECT_PREFIX = "room-cad-project-";

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: number;
  snapshot: CADSnapshot;
}

export async function saveProject(
  id: string,
  name: string,
  snapshot: CADSnapshot
): Promise<void> {
  const project: SavedProject = {
    id,
    name,
    updatedAt: Date.now(),
    snapshot,
  };
  await set(`${PROJECT_PREFIX}${id}`, project);
}

export async function loadProject(id: string): Promise<SavedProject | null> {
  const project = await get<SavedProject>(`${PROJECT_PREFIX}${id}`);
  return project ?? null;
}

export async function deleteProject(id: string): Promise<void> {
  await del(`${PROJECT_PREFIX}${id}`);
}

export async function listProjects(): Promise<SavedProject[]> {
  const allKeys = await keys();
  const projectKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(PROJECT_PREFIX)
  );
  const projects: SavedProject[] = [];
  for (const key of projectKeys) {
    const p = await get<SavedProject>(key as string);
    if (p) projects.push(p);
  }
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}
