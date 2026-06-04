import { useState, useRef, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  ArrowLeft,
  BookOpen,
  Wrench,
  Settings,
  Sun,
  Moon,
  Monitor,
  User,
  Server,
  Languages,
  Cog,
  FileSpreadsheet,
  Activity,
  Code2,
  Upload,
  Menu,
  Sparkles,
} from "lucide-react";
import type { Theme } from "../../atoms/theme";
import type { AppView } from "../../atoms/navigation";
import { breakpointAtom } from "../../atoms/viewport";
import { agentOpenAtom, shortcutLabel } from "../../atoms/agent";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { Beacon } from "./Beacon";

interface NavbarProps {
  onLogoClick?: () => void;
  appView?: AppView;
  onNavigate?: (view: AppView) => void;
  theme?: Theme;
  onToggleTheme?: () => void;
  rtl?: boolean;
  onToggleRtl?: () => void;
}

export function Navbar({ onLogoClick, appView = "entity", onNavigate, theme, onToggleTheme, rtl, onToggleRtl }: NavbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  const openAgent = useSetAtom(agentOpenAtom);

  const ThemeIcon = theme === "dark" ? Moon : theme === "auto" ? Monitor : Sun;
  const themeLabel = theme === "dark" ? "Dark" : theme === "auto" ? "Auto" : "Light";

  useEffect(() => {
    if (!settingsOpen && !toolsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsOpen && settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen, toolsOpen]);

  const showingCatalog = appView === "catalog";

  const toolsItems = [
    { id: "processes", label: "Processes", icon: Cog, enabled: false },
    { id: "import-csv", label: "Import CSV", icon: FileSpreadsheet, enabled: true },
    { id: "activity-log", label: "Activity Log", icon: Activity, enabled: false },
    { id: "global-css", label: "Global CSS", icon: Code2, enabled: false },
    { id: "uploads", label: "Uploads", icon: Upload, enabled: false },
  ];

  return (
    <header
      className="relative h-[52px] bg-paper flex items-center justify-between px-4 md:px-5 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      {/* Left: Logo + (mobile hamburger | desktop nav) */}
      <div className="flex items-center gap-3 md:gap-4">
        {isMobile && !showingCatalog && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center justify-center rounded-md hover:bg-warm transition-colors"
            style={{ width: 32, height: 32, color: "var(--text-secondary)" }}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
        )}
        <button
          onClick={onLogoClick}
          className="flex items-center"
        >
          <img src="/nu-logo.svg" alt="Uwazi" style={{ height: 14.7 }} className="logo-img" />
        </button>
        {!showingCatalog && !isMobile && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate?.("entity")}
              className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium rounded-md transition-colors ${
                appView === "entity"
                  ? "text-ink bg-vellum"
                  : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
              }`}
            >
              <BookOpen size={14} /> Library
            </button>
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => { setToolsOpen((o) => !o); setSettingsOpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium rounded-md transition-colors ${
                  toolsOpen || appView === "import-csv"
                    ? "text-ink bg-vellum"
                    : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
                }`}
              >
                <Wrench size={14} /> Tools
              </button>
              {toolsOpen && (
                <div
                  dir="ltr"
                  className="absolute top-full mt-1.5 w-48 bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-50"
                  style={{ left: rtl ? undefined : 0, right: rtl ? 0 : undefined }}
                >
                  <div className="py-1">
                    {toolsItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.enabled && item.id === "import-csv") {
                              onNavigate?.("import-csv");
                            }
                            setToolsOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-3 py-2 text-xs font-medium transition-colors ${
                            item.enabled
                              ? "text-ink-secondary hover:bg-warm"
                              : "text-ink-muted cursor-default"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={14} className={item.enabled ? "text-ink-tertiary" : "text-ink-muted/50"} />
                            {item.label}
                          </div>
                          {appView === "import-csv" && item.id === "import-csv" && (
                            <span className="w-1.5 h-1.5 rounded-[1px] bg-carbon" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Assistant + Notifications + Settings + Theme toggle */}
      <div className="flex items-center gap-2">
        {!showingCatalog && (
          <button
            onClick={() => openAgent(true)}
            className="flex items-center gap-1.5 px-2.5 h-7 text-[13px] font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors"
            title={`Assistant (${shortcutLabel})`}
          >
            <Sparkles size={14} className="text-carbon" />
            {!isMobile && "Ask"}
          </button>
        )}
        {!showingCatalog && <Beacon rtl={rtl} />}
        {showingCatalog ? (
          <button
            onClick={onLogoClick}
            className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm hover:bg-parchment hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} /> Return to app
          </button>
        ) : !isMobile ? (
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => { setSettingsOpen((o) => !o); setToolsOpen(false); }}
              className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium rounded-md transition-colors ${
                settingsOpen
                  ? "text-ink bg-vellum"
                  : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
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
        ) : null}
        {!isMobile && (
          <button
            onClick={onToggleTheme}
            className="p-1.5 text-ink-tertiary hover:text-ink-secondary hover:bg-warm rounded-md transition-colors"
            aria-label={`Theme: ${themeLabel}`}
            title={`Theme: ${themeLabel}`}
          >
            <ThemeIcon size={16} />
          </button>
        )}
      </div>

      {/* Mobile menu sheet */}
      {isMobile && (
        <MobileBottomSheet
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          title="Menu"
        >
          <div className="flex flex-col py-2">
            {/* Library */}
            <button
              onClick={() => { onNavigate?.("entity"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
                appView === "entity" ? "bg-vellum text-ink" : "text-ink-secondary hover:bg-warm"
              }`}
            >
              <BookOpen size={16} className="text-ink-tertiary" />
              Library
            </button>

            {/* Tools section */}
            <div className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
              Tools
            </div>
            {toolsItems.map((item) => {
              const Icon = item.icon;
              const active = appView === "import-csv" && item.id === "import-csv";
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.enabled && item.id === "import-csv") {
                      onNavigate?.("import-csv");
                      setMobileMenuOpen(false);
                    }
                  }}
                  disabled={!item.enabled}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-vellum text-ink"
                      : item.enabled
                        ? "text-ink-secondary hover:bg-warm"
                        : "text-ink-muted/60"
                  }`}
                >
                  <Icon size={16} className={item.enabled ? "text-ink-tertiary" : "text-ink-muted/40"} />
                  {item.label}
                </button>
              );
            })}

            {/* Settings section */}
            <div className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
              Settings
            </div>
            <button
              onClick={() => { onToggleTheme?.(); }}
              className="flex items-center justify-between gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors"
            >
              <div className="flex items-center gap-3">
                <ThemeIcon size={16} className="text-ink-tertiary" />
                Theme
              </div>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-warm text-ink-muted">
                {themeLabel}
              </span>
            </button>
            <button
              onClick={() => { onToggleRtl?.(); }}
              className="flex items-center justify-between gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors"
            >
              <div className="flex items-center gap-3">
                <Languages size={16} className="text-ink-tertiary" />
                Test RTL layout
              </div>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                  rtl ? "bg-success-light text-success" : "bg-warm text-ink-muted"
                }`}
              >
                {rtl ? "ON" : "OFF"}
              </span>
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors">
              <User size={16} className="text-ink-tertiary" />
              User settings
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors">
              <Server size={16} className="text-ink-tertiary" />
              System settings
            </button>
          </div>
        </MobileBottomSheet>
      )}
    </header>
  );
}
