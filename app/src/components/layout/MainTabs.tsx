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
  availableLanguages?: string[];
  activeLanguage?: string;
  onLanguageChange?: (lang: string) => void;
}

export function MainTabs({ tabs, activeId, onChange, languages = [], availableLanguages, activeLanguage, onLanguageChange }: MainTabsProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 shrink-0 overflow-x-auto"
    >
      {/* Left: Back + Tabs */}
      <div className="flex items-center gap-4 min-w-0">
        <button className="text-ink-tertiary hover:text-ink transition-colors shrink-0" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div
          className="flex items-center rounded-md overflow-hidden shrink-0"
          role="tablist"
          style={{
            border: "1px solid var(--border-primary)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          {tabs.map((tab, i) => (
            <div key={tab.id} className="flex items-center">
              {i > 0 && <div className="w-px self-stretch bg-border" aria-hidden="true" />}
              <button
                role="tab"
                aria-selected={activeId === tab.id}
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
        <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Language selection">
          {languages.map((lang) => {
            const isActive = lang === (activeLanguage ?? languages[0]);
            const isAvailable = !availableLanguages || availableLanguages.includes(lang);
            return (
              <button
                key={lang}
                onClick={() => isAvailable && onLanguageChange?.(lang)}
                disabled={!isAvailable}
                aria-label={`Language: ${lang}`}
                aria-pressed={isActive}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-vellum text-ink"
                    : isAvailable
                    ? "bg-warm text-ink-tertiary hover:text-ink-secondary"
                    : "bg-warm/50 text-ink-muted/40 cursor-not-allowed"
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
