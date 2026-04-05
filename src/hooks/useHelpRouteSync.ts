import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import type { HelpSectionId } from "@/stores/uiStore";

const VALID_SECTIONS: HelpSectionId[] = [
  "getting-started",
  "shortcuts",
  "library",
  "3d",
];

/**
 * Two-way sync between help modal state (Zustand) and the URL.
 * - `/help` or `/help/<section>` opens the modal (with that section)
 * - Closing the modal navigates back to `/` (or to the previous location)
 * - Clicking a section while open updates the URL without adding history entries
 */
export function useHelpRouteSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const showHelp = useUIStore((s) => s.showHelp);
  const activeSection = useUIStore((s) => s.activeHelpSection);
  const openHelp = useUIStore((s) => s.openHelp);
  const closeHelp = useUIStore((s) => s.closeHelp);
  const setHelpSection = useUIStore((s) => s.setHelpSection);
  const didInit = useRef(false);

  // URL → store: open modal if path starts with /help
  useEffect(() => {
    const path = location.pathname;
    const match = path.match(/^\/help(?:\/([\w-]+))?\/?$/);

    if (match) {
      const urlSection = match[1] as HelpSectionId | undefined;
      const section = urlSection && VALID_SECTIONS.includes(urlSection)
        ? urlSection
        : undefined;
      const state = useUIStore.getState();
      if (!state.showHelp) {
        state.openHelp(section);
      } else if (section && state.activeHelpSection !== section) {
        state.setHelpSection(section);
      }
    } else {
      // Path is NOT /help — close modal if open (handles browser back)
      const state = useUIStore.getState();
      if (state.showHelp && didInit.current) {
        state.closeHelp();
      }
    }
    didInit.current = true;
  }, [location.pathname]);

  // Store → URL: push URL when opening, replace when changing sections
  useEffect(() => {
    if (!didInit.current) return;
    const onHelpPath = location.pathname.startsWith("/help");

    if (showHelp) {
      const target = `/help/${activeSection}`;
      if (location.pathname !== target) {
        // First open: push; section change while open: replace
        navigate(target, { replace: onHelpPath });
      }
    } else if (onHelpPath) {
      // Modal closed while URL is still /help — navigate back to root
      navigate("/", { replace: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHelp, activeSection]);

  // Return helpers for components that want to imperatively open help via URL
  return {
    openHelpRoute: (section?: HelpSectionId) => {
      navigate(section ? `/help/${section}` : "/help");
    },
    closeHelpRoute: () => {
      closeHelp();
      // closeHelp will trigger the URL sync above
      void openHelp; // silence unused warnings
      void setHelpSection;
    },
  };
}
