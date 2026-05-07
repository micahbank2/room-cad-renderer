import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { HELP_INDEX } from "@/components/help/helpIndex";
import { searchHelp, highlightMatch } from "@/lib/helpSearch";
import type { HelpIndexEntry } from "@/components/help/helpIndex";
import { HELP_SECTIONS } from "@/components/help/helpContent";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (entry: HelpIndexEntry) => void;
}

export default function HelpSearch({ query, onQueryChange, onSelect }: Props) {
  const results = useMemo(() => searchHelp(query, HELP_INDEX), [query]);
  const hasQuery = query.trim().length > 0;

  return (
    <div className="px-3 mb-3">
      <div className="relative">
        <Search size={14} className="text-muted-foreground/60 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="SEARCH HELP..."
          className="w-full font-sans text-[10px] tracking-wider text-foreground placeholder:text-muted-foreground/60 bg-accent border border-border/60 pl-7 pr-2 py-1.5 rounded-smooth-md focus:outline-none focus:border-accent/50"
        />
        {hasQuery && (
          <button
            onClick={() => onQueryChange("")}
            title="Clear search"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {hasQuery && (
        <div className="mt-2 max-h-[380px] overflow-y-auto border border-border/50 rounded-smooth-md bg-background">
          {results.length === 0 ? (
            <div className="px-3 py-4 font-sans text-[10px] text-muted-foreground/60 text-center">
              NO RESULTS
            </div>
          ) : (
            <ul>
              {results.map(({ entry }) => {
                const sectionLabel =
                  HELP_SECTIONS.find((s) => s.id === entry.section)?.label ?? "";
                return (
                  <li key={entry.id}>
                    <button
                      onClick={() => onSelect(entry)}
                      className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b border-border/10 last:border-0"
                    >
                      <div className="font-sans text-[10px] text-foreground mb-0.5">
                        {renderHighlighted(entry.heading, query)}
                      </div>
                      <div className="font-sans text-[9px] text-muted-foreground/80 leading-snug">
                        {renderHighlighted(entry.body, query)}
                      </div>
                      <div className="font-sans text-[8px] text-muted-foreground/60 tracking-widest mt-1 uppercase">
                        {sectionLabel}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function renderHighlighted(text: string, query: string) {
  const segments = highlightMatch(text, query);
  return (
    <>
      {segments.map((seg, i) =>
        seg.matched ? (
          <mark key={i} className="bg-accent/30 text-foreground not-italic">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
