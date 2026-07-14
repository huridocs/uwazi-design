import { useAtom } from "jotai";
import { ArrowLeft, Sparkles } from "lucide-react";
import { breakpointAtom } from "../../atoms/viewport";
import { Select } from "../shared/Select";

interface MainTab {
  id: string;
  label: string;
  count?: number;
  /** Show a tiny Sparkles icon next to the count — signals pending AI
   *  suggestions on the Relationships tab. */
  sparkle?: boolean;
}

interface MainTabsProps {
  tabs: MainTab[];
  activeId: string;
  onChange: (id: string) => void;
  languages?: string[];
  availableLanguages?: string[];
  activeLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  /** When provided, the header shows a back button that returns to the
   *  precedent screen. */
  onBack?: () => void;
}

export function MainTabs({ tabs, activeId, onChange, languages = [], availableLanguages, activeLanguage, onLanguageChange, onBack }: MainTabsProps) {
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  const currentLang = activeLanguage ?? languages[0];

  return (
    <div
      className="flex items-center justify-between gap-3 px-3 pt-2 pb-1 md:pt-2.5 shrink-0"
    >
      {/* Left: Back + Tabs */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0 overflow-x-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden text-ink-tertiary hover:text-ink transition-colors shrink-0 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
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
                className={`flex items-center justify-center gap-1 px-2.5 md:px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  activeId === tab.id
                    ? "bg-vellum text-ink"
                    : "bg-paper text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                {tab.label}
                {/* Counts are redundant on mobile (the panel's info row shows
                    them) and their width pushes later tabs off-screen — hide
                    them so all tabs fit without horizontal scroll. */}
                {!isMobile && tab.count !== undefined && (
                  <span className="text-xs font-semibold text-ink-tertiary bg-warm px-1 rounded">
                    {tab.count}
                  </span>
                )}
                {tab.sparkle && (
                  <Sparkles size={11} className="text-carbon" aria-label="AI suggestions pending" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right: language — the SAME control the Library uses (shared `Select`,
          codes not names), not a row of four pills. One language switcher, one
          shape, wherever you meet it; and it no longer widens the tab strip by a
          pill for every language the collection adds. Unavailable renditions stay
          listed but disabled. */}
      {languages.length > 0 && (
        <div className="shrink-0">
          <Select
            value={currentLang}
            onChange={(v) => onLanguageChange?.(v)}
            ariaLabel="Language"
            align="end"
            options={languages.map((lang) => ({
              value: lang,
              label: lang,
              disabled: !!availableLanguages && !availableLanguages.includes(lang),
            }))}
          />
        </div>
      )}
    </div>
  );
}
