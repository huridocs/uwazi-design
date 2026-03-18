interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface SegmentedTabsProps {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
}

export function SegmentedTabs({ tabs, activeId, onChange }: SegmentedTabsProps) {
  return (
    <div className="flex bg-parchment rounded-md p-0.5 gap-0.5" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeId === tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeId === tab.id
              ? "bg-paper text-ink shadow-sm"
              : "text-ink-tertiary hover:text-ink-secondary"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-ink-muted">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
