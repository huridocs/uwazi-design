interface DrawerTab {
  id: string;
  label: string;
  count?: number;
}

interface DrawerTabsProps {
  tabs: DrawerTab[];
  activeId: string;
  onChange: (id: string) => void;
}

export function DrawerTabs({ tabs, activeId, onChange }: DrawerTabsProps) {
  return (
    <div
      className="px-3 py-2 shrink-0"
    >
      <div
        className="flex items-center rounded-md overflow-hidden"
        style={{
          border: "1px solid var(--border-primary)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        {tabs.map((tab, i) => (
          <div key={tab.id} className="flex items-center flex-1">
            {i > 0 && <div className="w-px self-stretch bg-border" />}
            <button
              onClick={() => onChange(tab.id)}
              className={`flex items-center justify-center gap-1 w-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                activeId === tab.id
                  ? "bg-vellum text-ink"
                  : "bg-paper text-ink-tertiary hover:text-ink-secondary"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-xs font-semibold text-ink-tertiary bg-warm px-1 rounded">
                  {tab.count}
                </span>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
