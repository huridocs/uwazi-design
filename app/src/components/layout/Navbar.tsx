import { ArrowLeft, BookOpen, Settings, Sun, Moon } from "lucide-react";
import type { Theme } from "../../atoms/theme";

interface NavbarProps {
  onLogoClick?: () => void;
  showingCatalog?: boolean;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export function Navbar({ onLogoClick, showingCatalog, theme, onToggleTheme }: NavbarProps) {
  return (
    <header
      className="h-[52px] bg-paper flex items-center justify-between px-5 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onLogoClick}
          className="flex items-center"
        >
          <img src="/nu-logo.svg" alt="Uwazi" style={{ height: 14.7 }} className="logo-img" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {showingCatalog ? (
          <button
            onClick={onLogoClick}
            className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors"
          >
            <ArrowLeft size={14} /> Return to app
          </button>
        ) : (
          <>
            <button className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors">
              <BookOpen size={14} /> Library
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors">
              <Settings size={14} /> Settings
            </button>
          </>
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
