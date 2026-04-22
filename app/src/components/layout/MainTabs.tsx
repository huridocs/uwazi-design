import { useState, useRef, useEffect } from "react";
import { useAtom } from "jotai";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { breakpointAtom } from "../../atoms/viewport";

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
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!langRef.current?.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [langOpen]);

  const currentLang = activeLanguage ?? languages[0];

  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2 md:py-2.5 shrink-0"
    >
      {/* Left: Back + Tabs */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0 overflow-x-auto">
        {!isMobile && (
          <button className="text-ink-tertiary hover:text-ink transition-colors shrink-0" aria-label="Go back">
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

      {/* Right: Language picker */}
      {languages.length > 0 && (
        isMobile ? (
          <div ref={langRef} className="relative shrink-0">
            <button
              onClick={() => setLangOpen((o) => !o)}
              aria-label="Language"
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-warm text-ink-secondary hover:bg-parchment transition-colors"
            >
              {currentLang}
              <ChevronDown size={10} className="text-ink-tertiary" />
            </button>
            {langOpen && (
              <div
                className="absolute top-full mt-1 right-0 bg-paper rounded-md overflow-hidden"
                style={{
                  border: "1px solid var(--border-primary)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  zIndex: 30,
                  minWidth: 80,
                }}
              >
                {languages.map((lang) => {
                  const isActive = lang === currentLang;
                  const isAvailable = !availableLanguages || availableLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      onClick={() => {
                        if (isAvailable) {
                          onLanguageChange?.(lang);
                          setLangOpen(false);
                        }
                      }}
                      disabled={!isAvailable}
                      className={`block w-full px-3 py-2 text-xs font-medium text-left transition-colors ${
                        isActive
                          ? "bg-vellum text-ink"
                          : isAvailable
                            ? "text-ink-secondary hover:bg-warm"
                            : "text-ink-muted/40"
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Language selection">
            {languages.map((lang) => {
              const isActive = lang === currentLang;
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
        )
      )}
    </div>
  );
}
