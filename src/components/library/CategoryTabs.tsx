export interface CategoryTab {
  id: string;
  label: string;
  count?: number;
}

export interface CategoryTabsProps {
  tabs: CategoryTab[];
  activeId: string;
  onChange: (id: string) => void;
}

/**
 * Shared category tab primitive (Phase 33 GH #89).
 *
 * Horizontal tab row with active underline and optional "(count)" badge.
 * Uses canonical spacing tokens (gap-4, pb-1) and font-sans text-sm.
 */
export function CategoryTabs({ tabs, activeId, onChange }: CategoryTabsProps) {
  return (
    <div className="flex items-end gap-4 border-b border-border/50">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const baseClasses = "pb-1 font-sans text-sm transition-colors";
        const stateClasses = isActive
          ? "text-foreground font-medium border-b border-accent -mb-px"
          : "text-muted-foreground/80 hover:text-muted-foreground";
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`${baseClasses} ${stateClasses}`}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="ml-1 text-muted-foreground/60 font-sans text-sm">
                ({tab.count})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
