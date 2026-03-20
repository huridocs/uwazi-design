import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  BookOpen,
  Wrench,
  Settings,
  Sun,
  Moon,
  User,
  Server,
  Languages,
  Cog,
  FileSpreadsheet,
  Activity,
  Code2,
  Upload,
} from "lucide-react";
import type { Theme } from "../../atoms/theme";
import type { AppView } from "../../atoms/navigation";

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
  const settingsRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

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
            <button
              onClick={() => onNavigate?.("entity")}
              className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium rounded-md border transition-colors ${
                appView === "entity"
                  ? "text-ink bg-vellum border-border-soft"
                  : "text-ink-secondary bg-warm border-border-soft/60 hover:bg-parchment"
              }`}
            >
              <BookOpen size={14} /> Library
            </button>
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => { setToolsOpen((o) => !o); setSettingsOpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium rounded-md border transition-colors ${
                  toolsOpen || appView === "import-csv"
                    ? "text-ink bg-vellum border-border-soft"
                    : "text-ink-secondary bg-warm border-border-soft/60 hover:bg-parchment"
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
                            <span className="w-1.5 h-1.5 rounded-full bg-carbon" />
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
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => { setSettingsOpen((o) => !o); setToolsOpen(false); }}
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
