import { ArrowLeft } from "lucide-react";

interface MainTab {
  id: string;
  label: string;
  count?: number;
}

interface MainTabsProps {
  tabs: MainTab[];
  activeId: string;
  onChange: (id: string) => void;
  languages?: string[];
}

export function MainTabs({ tabs, activeId, onChange, languages = [] }: MainTabsProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 shrink-0"
    >
      {/* Left: Back + Tabs */}
      <div className="flex items-center gap-4">
        <button className="text-ink-tertiary hover:text-ink transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div
          className="flex items-center rounded-md overflow-hidden"
          style={{
            border: "1px solid var(--border-primary)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          {tabs.map((tab, i) => (
            <div key={tab.id} className="flex items-center">
              {i > 0 && <div className="w-px self-stretch bg-border" />}
              <button
                onClick={() => onChange(tab.id)}
                className={`flex items-center justify-center gap-1 px-3 py-1.5 text-[13px] font-medium transition-colors ${
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

      {/* Right: Language badges */}
      {languages.length > 0 && (
        <div className="flex items-center gap-1">
          {languages.map((lang) => (
            <span
              key={lang}
              className="px-2.5 py-1 text-xs font-medium text-ink rounded-md bg-vellum"
            >
              {lang}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
