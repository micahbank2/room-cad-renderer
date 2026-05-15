import { useEffect } from "react";
import { useCADStore } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";
import { saveProject, setLastProjectId } from "@/lib/serialization";
import { uid } from "@/lib/geometry";

export const DEBOUNCE_MS = 2000;
export const FADE_MS = 2000;

export function useAutoSave(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerDebouncedSave = () => {
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
        try {
          const st = useCADStore.getState() as any;
          await saveProject(id, name, {
            // Phase 86 D-04: persist at current schema version (10).
            version: 10,
            rooms: st.rooms,
            activeRoomId: st.activeRoomId,
            ...(st.customElements ? { customElements: st.customElements } : {}),
          });
          // D-02b: write last-active pointer after successful project write,
          // before the SAVED status flip. If this fails, the catch branch
          // fires and surfaces SAVE_FAILED (pointer mismatch = Jessica's
          // reload won't restore, so treat as failed).
          await setLastProjectId(id);
          useProjectStore.getState().setSaveStatus("saved");
          if (fadeTimer) clearTimeout(fadeTimer);
          fadeTimer = setTimeout(() => {
            useProjectStore.getState().setSaveStatus("idle");
          }, FADE_MS);
        } catch (err) {
          console.error("[useAutoSave] saveProject failed", err);
          if (fadeTimer) clearTimeout(fadeTimer);
          useProjectStore.getState().setSaveStatus("failed");
          // D-04a: intentionally NO fadeTimer scheduled here — SAVE_FAILED persists
          // until the next successful save transitions status back to "saved" → "idle".
        }
      }, DEBOUNCE_MS);
    };

    // Subscriber 1: CAD data changes (filter UNCHANGED — Phase 25 drag fast-path invariant)
    const unsubCad = useCADStore.subscribe((state, prevState) => {
      const prevCustom = (prevState as any).customElements;
      const nextCustom = (state as any).customElements;
      if (
        state.rooms === prevState.rooms &&
        state.activeRoomId === prevState.activeRoomId &&
        prevCustom === nextCustom
      ) {
        return;
      }
      triggerDebouncedSave();
    });

    // Subscriber 2: project rename (D-05) — gated to prevent Pitfall 3 (hydration)
    // and project-switch bleed. Fires only when activeName changes on a stable,
    // non-null activeId.
    const unsubProj = useProjectStore.subscribe((state, prevState) => {
      if (state.activeName === prevState.activeName) return;
      if (state.activeId === null) return; // skip clearActive
      if (prevState.activeId !== state.activeId) return; // skip project switch / null→id hydration
      triggerDebouncedSave();
    });

    return () => {
      unsubCad();
      unsubProj();
      if (timer) clearTimeout(timer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, []);
}
