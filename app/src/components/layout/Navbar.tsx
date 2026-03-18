import { useState, useRef, useEffect } from "react";
import { ArrowLeft, BookOpen, Wrench, Settings, Sun, Moon, User, Server, Languages } from "lucide-react";
import type { Theme } from "../../atoms/theme";

interface NavbarProps {
  onLogoClick?: () => void;
  showingCatalog?: boolean;
  theme?: Theme;
  onToggleTheme?: () => void;
  rtl?: boolean;
  onToggleRtl?: () => void;
}

export function Navbar({ onLogoClick, showingCatalog, theme, onToggleTheme, rtl, onToggleRtl }: NavbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen]);

  return (
    <header
      className="h-[52px] bg-paper flex items-center justify-between px-5 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      {/* Left: Logo + Library + Tools */}
      <div className="flex items-center gap-4">
        <button
          onClick={onLogoClick}
          className="flex items-center"
        >
          <img src="/nu-logo.svg" alt="Uwazi" style={{ height: 14.7 }} className="logo-img" />
        </button>
        {!showingCatalog && (
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors">
              <BookOpen size={14} /> Library
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors">
              <Wrench size={14} /> Tools
            </button>
          </div>
        )}
      </div>

      {/* Right: Settings + Theme toggle */}
      <div className="flex items-center gap-2">
        {showingCatalog ? (
          <button
            onClick={onLogoClick}
            className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors"
          >
            <ArrowLeft size={14} /> Return to app
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium rounded-md border transition-colors ${
                settingsOpen
                  ? "text-ink bg-vellum border-border-soft"
                  : "text-ink-secondary bg-warm border-border-soft/60 hover:bg-parchment"
              }`}
            >
              <Settings size={14} /> Settings
            </button>
            {settingsOpen && (
              <div
                dir="ltr"
                className="absolute top-full mt-1.5 w-52 bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-50"
                style={{ right: rtl ? undefined : 0, left: rtl ? 0 : undefined }}
              >
                <div className="py-1">
                  <button
                    onClick={() => { onToggleRtl?.(); setSettingsOpen(false); }}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Test RTL layout
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                          rtl
                            ? "bg-success-light text-success"
                            : "bg-warm text-ink-muted"
                        }`}
                      >
                        {rtl ? "ON" : "OFF"}
                      </span>
                    </div>
                    <Languages size={14} className="text-ink-tertiary" />
                  </button>
                  <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors">
                    User settings
                    <User size={14} className="text-ink-tertiary" />
                  </button>
                  <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors">
                    System settings
                    <Server size={14} className="text-ink-tertiary" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <button
          onClick={onToggleTheme}
          className="p-1.5 text-ink-tertiary hover:text-ink-secondary hover:bg-warm rounded-md transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
