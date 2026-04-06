import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import type { HelpSectionId } from "@/stores/uiStore";
import {
  HELP_SECTIONS,
  HelpSectionContent,
} from "@/components/help/helpContent";
import HelpSearch from "@/components/help/HelpSearch";
import { useOnboardingStore } from "@/stores/onboardingStore";

export default function HelpModal() {
  const showHelp = useUIStore((s) => s.showHelp);
  const activeSection = useUIStore((s) => s.activeHelpSection);
  const closeHelp = useUIStore((s) => s.closeHelp);
  const setHelpSection = useUIStore((s) => s.setHelpSection);
  const contentRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const startTour = useOnboardingStore((s) => s.start);
  const resetTour = useOnboardingStore((s) => s.reset);

  // Scroll content pane to top on section change (unless we have a pending anchor)
  useEffect(() => {
    if (!contentRef.current) return;
    if (pendingAnchor) {
      // Defer to next tick so section content is mounted
      const id = pendingAnchor;
      requestAnimationFrame(() => {
        const el = contentRef.current?.querySelector(
          `[id="${id}"]`,
        ) as HTMLElement | null;
        if (el && contentRef.current) {
          contentRef.current.scrollTo({
            top: el.offsetTop - 16,
            behavior: "auto",
          });
        }
        setPendingAnchor(null);
      });
    } else {
      contentRef.current.scrollTop = 0;
    }
  }, [activeSection, pendingAnchor]);

  // Clear search when modal closes
  useEffect(() => {
    if (!showHelp) setQuery("");
  }, [showHelp]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-obsidian-deepest/80 backdrop-blur-sm"
        onClick={closeHelp}
      />

      {/* Modal */}
      <div
        className="relative w-[900px] h-[640px] max-w-[95vw] max-h-[90vh] bg-obsidian-mid border border-outline-variant/30 rounded-sm shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-label="Help and documentation"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/20 shrink-0">
          <h2 className="font-mono text-sm text-text-primary tracking-widest uppercase">
            Help &amp; Documentation
          </h2>
          <button
            onClick={closeHelp}
            title="Close (Esc)"
            className="text-text-ghost hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left nav */}
          <nav className="w-56 bg-obsidian-low border-r border-outline-variant/20 py-4 shrink-0 overflow-y-auto">
            <HelpSearch
              query={query}
              onQueryChange={setQuery}
              onSelect={(entry) => {
                setHelpSection(entry.section);
                if (entry.anchor) setPendingAnchor(entry.anchor);
                setQuery("");
              }}
            />
            <h3 className="font-mono text-[9px] text-text-ghost tracking-widest uppercase px-4 mb-2">
              Topics
            </h3>
            <ul>
              {HELP_SECTIONS.map((s) => (
                <li key={s.id}>
                  <HelpNavButton
                    section={s.id}
                    label={s.label}
                    icon={s.icon}
                    active={activeSection === s.id}
                    onClick={() => setHelpSection(s.id)}
                  />
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto px-8 py-6 bg-obsidian-mid"
            >
              <HelpSectionContent section={activeSection} />
            </div>
            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-2 border-t border-outline-variant/20 bg-obsidian-low shrink-0">
              <button
                onClick={() => {
                  resetTour();
                  closeHelp();
                  // Start on next tick so modal has closed
                  setTimeout(() => startTour(), 50);
                }}
                className="font-mono text-[10px] tracking-widest text-text-dim hover:text-accent-light transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">replay</span>
                REPLAY TOUR
              </button>
              <span className="font-mono text-[9px] text-text-ghost tracking-widest">
                ESC TO CLOSE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpNavButton({
  label,
  icon,
  active,
  onClick,
}: {
  section: HelpSectionId;
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-4 py-2 font-mono text-[10px] tracking-widest text-left transition-colors border-l-2 ${
        active
          ? "text-accent-light bg-accent/10 border-accent"
          : "text-text-dim border-transparent hover:text-text-primary hover:bg-obsidian-high"
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
