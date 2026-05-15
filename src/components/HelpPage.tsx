import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Flag,
  Keyboard,
  LayoutGrid,
  Cuboid,
  Search,
  X,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import {
  GettingStartedContent,
  KeyboardShortcutsContent,
  ProductLibraryContent,
  ThreeDContent,
} from "@/components/help/helpContent";
import type { HelpSectionId } from "@/stores/uiStore";

// ---------------------------------------------------------------------------
// Section metadata
// ---------------------------------------------------------------------------

interface SectionMeta {
  id: HelpSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}

const SECTIONS: SectionMeta[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    description: "Core loop, first room, saving & exporting",
    icon: Flag,
  },
  {
    id: "shortcuts",
    label: "Keyboard Shortcuts",
    description: "Every key that makes you faster",
    icon: Keyboard,
  },
  {
    id: "library",
    label: "Library & 2D Editing",
    description: "Products, walls, snap, and placement",
    icon: LayoutGrid,
  },
  {
    id: "3d",
    label: "3D View & Walk Mode",
    description: "Orbit, walk-through, multi-room projects",
    icon: Cuboid, // D-15: substitute for material-symbols 'view_in_ar'
  },
];

// ---------------------------------------------------------------------------
// HelpPage — full-page knowledge base (bookmarkable, standalone route)
// ---------------------------------------------------------------------------

export default function HelpPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] =
    useState<HelpSectionId>("getting-started");
  const [query, setQuery] = useState("");

  // Filter sections by search query (simple text match on label + description)
  const filtered = query.trim()
    ? SECTIONS.filter(
        (s) =>
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase()),
      )
    : SECTIONS;

  return (
    // Phase 87 D-04: respects user theme choice (was force-light prior to Phase 87).
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* Top bar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-20 h-12 flex items-center justify-between px-6 bg-background/90 backdrop-blur-sm border-b border-border shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Back to JessCAD
        </button>

        <div className="flex items-center gap-2 text-sm font-semibold text-foreground select-none">
          <span className="text-muted-foreground font-normal">JessCAD</span>
          <span className="text-border">/</span>
          <span>Help Center</span>
        </div>

        <a
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink size={13} />
          Open app
        </a>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Body: sidebar + content                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-60 shrink-0 bg-card border-r border-border flex flex-col overflow-y-auto">
          {/* Search */}
          <div className="p-3 border-b border-border/50">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics..."
                className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground/60 pl-8 pr-7 py-1.5 rounded-smooth-md border border-border/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Section list */}
          <nav className="flex-1 py-2" aria-label="Help topics">
            <p className="px-4 py-1.5 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
              Topics
            </p>
            <ul>
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-xs text-muted-foreground/60 italic">
                  No topics match "{query}"
                </li>
              ) : (
                filtered.map((s) => {
                  const Icon = s.icon;
                  const isActive = activeSection === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          setActiveSection(s.id);
                          setQuery("");
                        }}
                        className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors border-l-2 group ${
                          isActive
                            ? "bg-accent/10 border-accent text-foreground"
                            : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon
                          size={15}
                          className={`mt-0.5 shrink-0 transition-colors ${
                            isActive
                              ? "text-accent"
                              : "text-muted-foreground/60 group-hover:text-foreground"
                          }`}
                        />
                        <div>
                          <div className="text-sm font-medium leading-snug">
                            {s.label}
                          </div>
                          <div className="text-xs text-muted-foreground/70 leading-snug mt-0.5">
                            {s.description}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              Can't find what you're looking for? Try the{" "}
              <button
                onClick={() => navigate("/")}
                className="underline hover:text-foreground transition-colors"
              >
                in-app help
              </button>{" "}
              (press <kbd className="bg-muted border border-border rounded px-1 py-0.5 font-mono text-[12px]">?</kbd> while designing).
            </p>
          </div>
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* Article content                                                  */}
        {/* ---------------------------------------------------------------- */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-[720px] mx-auto px-8 py-10">
            {/* Breadcrumb */}
            <p className="text-xs text-muted-foreground/60 mb-6 uppercase tracking-widest">
              Help Center
              <span className="mx-2 text-border">/</span>
              {SECTIONS.find((s) => s.id === activeSection)?.label}
            </p>

            {/* Content — reuses the same content components as HelpModal */}
            <article className="prose-help">
              <SectionContent section={activeSection} />
            </article>

            {/* Navigation between sections */}
            <nav
              className="mt-12 pt-8 border-t border-border/50 flex items-center justify-between"
              aria-label="Topic navigation"
            >
              <PrevNextButton
                sections={SECTIONS}
                current={activeSection}
                direction="prev"
                onClick={setActiveSection}
              />
              <PrevNextButton
                sections={SECTIONS}
                current={activeSection}
                direction="next"
                onClick={setActiveSection}
              />
            </nav>

            {/* Footer note */}
            <p className="mt-8 text-xs text-muted-foreground/50 text-center leading-relaxed">
              JessCAD — built for Jessica.{" "}
              <button
                onClick={() => navigate("/")}
                className="underline hover:text-foreground transition-colors"
              >
                Back to designing
              </button>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section content switcher — wraps helpContent.tsx components
// ---------------------------------------------------------------------------

function SectionContent({ section }: { section: HelpSectionId }) {
  // Wrap existing modal content in a light-mode-friendly shell.
  // The helpContent.tsx components use semantic tokens (text-foreground,
  // text-muted-foreground) so they adapt to light mode automatically.
  switch (section) {
    case "getting-started":
      return <GettingStartedContent />;
    case "shortcuts":
      return <KeyboardShortcutsContent />;
    case "library":
      return <ProductLibraryContent />;
    case "3d":
      return <ThreeDContent />;
  }
}

// ---------------------------------------------------------------------------
// Prev / Next navigation
// ---------------------------------------------------------------------------

function PrevNextButton({
  sections,
  current,
  direction,
  onClick,
}: {
  sections: SectionMeta[];
  current: HelpSectionId;
  direction: "prev" | "next";
  onClick: (id: HelpSectionId) => void;
}) {
  const idx = sections.findIndex((s) => s.id === current);
  const target =
    direction === "prev" ? sections[idx - 1] : sections[idx + 1];

  if (!target) return <div />;

  return (
    <button
      onClick={() => onClick(target.id)}
      className={`flex flex-col gap-0.5 max-w-[240px] group ${
        direction === "next" ? "items-end text-right" : "items-start text-left"
      }`}
    >
      <span className="text-xs text-muted-foreground/60 uppercase tracking-widest">
        {direction === "prev" ? "← Previous" : "Next →"}
      </span>
      <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
        {target.label}
      </span>
    </button>
  );
}
