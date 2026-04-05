import { useEffect } from "react";
import { useCADStore } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";
import { saveProject } from "@/lib/serialization";
import { uid } from "@/lib/geometry";

export const DEBOUNCE_MS = 2000;
export const FADE_MS = 2000;

export function useAutoSave(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;

    const unsub = useCADStore.subscribe((state, prevState) => {
      // Only trigger on data changes, not past/future mutations
      if (
        state.room === prevState.room &&
        state.walls === prevState.walls &&
        state.placedProducts === prevState.placedProducts
      ) {
        return;
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const proj = useProjectStore.getState();
        let id = proj.activeId;
        let name = proj.activeName;
        if (!id) {
          id = `proj_${uid()}`;
          name = "Untitled Room";
          useProjectStore.getState().setActive(id, name);
        }
        useProjectStore.getState().setSaveStatus("saving");
        const { room, walls, placedProducts } = useCADStore.getState();
        await saveProject(id, name, { room, walls, placedProducts });
        useProjectStore.getState().setSaveStatus("saved");
        if (fadeTimer) clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => {
          useProjectStore.getState().setSaveStatus("idle");
        }, FADE_MS);
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, []);
}
