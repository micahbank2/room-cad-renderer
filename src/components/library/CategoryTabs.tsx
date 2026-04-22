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
 * Uses canonical spacing tokens (gap-4, pb-1) and font-mono text-sm.
 */
export function CategoryTabs({ tabs, activeId, onChange }: CategoryTabsProps) {
  return (
    <div className="flex items-end gap-4 border-b border-outline-variant/20">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const baseClasses = "pb-1 font-mono text-sm transition-colors";
        const stateClasses = isActive
          ? "text-text-primary font-medium border-b border-accent -mb-px"
          : "text-text-dim hover:text-text-muted";
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`${baseClasses} ${stateClasses}`}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="ml-1 text-text-ghost font-mono text-sm">
                ({tab.count})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
