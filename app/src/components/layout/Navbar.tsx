import { useState, useRef, useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Wrench,
  Settings,
  Sun,
  Moon,
  Monitor,
  User,
  Server,
  Languages,
  Menu,
  Sparkles,
  ChevronDown,
  Check,
  ExternalLink,
} from "lucide-react";
import type { Theme } from "../../atoms/theme";
import type { AppView } from "../../atoms/navigation";
import { breakpointAtom } from "../../atoms/viewport";
import { dataSourceAtom, type DataSource } from "../../atoms/dataSource";
import { selectDataSourceAtom } from "../../atoms/library";
import {
  settingsSectionAtom,
  settingsMobileDrilledAtom,
  settingsToolsItems,
  settingsEntryOf,
  settingsDocumentation,
} from "../../atoms/settings";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
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
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);
  const dataSource = useAtomValue(dataSourceAtom);
  const selectSource = useSetAtom(selectDataSourceAtom);
  const [settingsSection, setSettingsSection] = useAtom(settingsSectionAtom);
  const setSettingsDrilled = useSetAtom(settingsMobileDrilledAtom);
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  const openAgent = useSetAtom(agentOpenAtom);
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const focalTitle = getEntity(focusedId)?.title ?? "Entity";

  const ThemeIcon = theme === "dark" ? Moon : theme === "auto" ? Monitor : Sun;
  const themeLabel = theme === "dark" ? "Dark" : theme === "auto" ? "Auto" : "Light";

  useEffect(() => {
    if (!settingsOpen && !toolsOpen && !collectionOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsOpen && settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
      if (
        collectionOpen &&
        collectionRef.current &&
        !collectionRef.current.contains(e.target as Node)
      ) {
        setCollectionOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen, toolsOpen, collectionOpen]);

  const showingCatalog = appView === "catalog";

  const COLLECTIONS: { id: DataSource; label: string; detail: string }[] = [
    { id: "mock", label: "Sample", detail: "Curated demo entities" },
    { id: "cejil", label: "CEJIL", detail: "Published corpus · 4,398" },
  ];
  const collection = COLLECTIONS.find((c) => c.id === dataSource) ?? COLLECTIONS[0];

  // The Tools dropdown IS the Tools settings group — one list, not a hardcoded
  // copy of it that had drifted into five mostly-disabled placeholders while the
  // real pages sat unreachable in the settings rail.
  const toolsItems = settingsToolsItems();

  /** Open a settings destination. The rail scopes itself to the group the
   *  section belongs to, so this is also what picks User vs System vs Tools. */
  const openSettings = (sectionId: string) => {
    setSettingsSection(sectionId);
    setSettingsDrilled(true); // mobile: land on the page, not the rail
    onNavigate?.("settings");
  };

  return (
    <header
      className="relative h-13 bg-paper flex items-center justify-between px-4 md:px-5 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      {/* Left: Logo + (mobile hamburger | desktop nav) */}
      <div className="flex items-center gap-3 md:gap-4">
        {isMobile && !showingCatalog && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center justify-center rounded-md hover:bg-warm transition-colors w-8 h-8"
            style={{ color: "var(--text-secondary)" }}
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
            {appView === "entity" ? (
              // Locator/breadcrumb: Library (back) › current entity.
              <div className="flex items-center gap-1 min-w-0">
                <button
                  onClick={() => onNavigate?.("library")}
                  className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium rounded-md transition-colors text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
                >
                  <BookOpen size={14} /> Library
                </button>
                <ChevronRight size={14} className="text-ink-tertiary shrink-0" />
                <span
                  title={focalTitle}
                  className="px-2.5 py-1 text-[13px] font-medium text-ink bg-vellum rounded-md truncate max-w-[16rem]"
                >
                  {focalTitle}
                </span>
              </div>
            ) : (
              // Library + its COLLECTION picker. The dataset switch used to sit in
              // the Library toolbar, where it was one more thing pushing the view
              // controls around; it belongs to the destination, not the view.
              <div ref={collectionRef} className="relative flex items-center">
                <button
                  onClick={() => onNavigate?.("library")}
                  className={`flex items-center gap-1.5 ps-3 pe-2 py-1 text-[13px] font-medium rounded-s-md transition-colors ${
                    appView === "library"
                      ? "text-ink bg-vellum"
                      : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
                  }`}
                >
                  <BookOpen size={14} /> Library
                </button>
                <button
                  onClick={() => {
                    setCollectionOpen((o) => !o);
                    setToolsOpen(false);
                    setSettingsOpen(false);
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={collectionOpen}
                  aria-label={`Collection: ${collection.label}`}
                  title={`Collection: ${collection.label}`}
                  className={`flex items-center gap-1 ps-1.5 pe-2 py-1 text-[13px] font-medium rounded-e-md transition-colors ${
                    collectionOpen || appView === "library"
                      ? "text-ink bg-vellum"
                      : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
                  }`}
                  style={{ borderInlineStart: "1px solid var(--border-primary)" }}
                >
                  <span className="text-ink-tertiary">{collection.label}</span>
                  <ChevronDown
                    size={13}
                    className={`text-ink-tertiary transition-transform ${collectionOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {collectionOpen && (
                  <div
                    role="listbox"
                    className="absolute top-full mt-1.5 end-0 w-52 bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-50 py-1"
                  >
                    <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                      Collection
                    </p>
                    {COLLECTIONS.map((c) => {
                      const on = c.id === dataSource;
                      return (
                        <button
                          key={c.id}
                          role="option"
                          aria-selected={on}
                          onClick={() => {
                            selectSource(c.id);
                            setCollectionOpen(false);
                            onNavigate?.("library");
                          }}
                          className={`w-full flex items-start gap-2 px-3 py-1.5 text-start transition-colors cursor-pointer ${
                            on ? "bg-vellum" : "hover:bg-warm"
                          }`}
                        >
                          <span className="w-4 shrink-0 pt-0.5 text-carbon">
                            {on && <Check size={13} />}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={`block text-xs ${on ? "text-ink font-semibold" : "text-ink-secondary"}`}
                            >
                              {c.label}
                            </span>
                            <span className="block text-[10px] text-ink-tertiary">{c.detail}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
                      const cls =
                        "flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors cursor-pointer";
                      const inner = (
                        <>
                          <span className="flex items-center gap-2">
                            <Icon size={14} className="text-ink-tertiary" />
                            {item.label}
                          </span>
                          {item.external ? (
                            <ExternalLink size={12} className="text-ink-muted" />
                          ) : (
                            ((item.navigateTo && appView === item.navigateTo) ||
                              (appView === "settings" && settingsSection === item.id)) && (
                              <span className="w-1.5 h-1.5 rounded-[1px] bg-carbon" />
                            )
                          )}
                        </>
                      );

                      if (item.external) {
                        return (
                          <a
                            key={item.id}
                            href={item.external}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cls}
                            onClick={() => setToolsOpen(false)}
                          >
                            {inner}
                          </a>
                        );
                      }

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            // Import CSV is its own top-level view; the rest are
                            // settings pages that were sitting unreachable in a
                            // rail group nothing linked to.
                            if (item.navigateTo) onNavigate?.(item.navigateTo);
                            else openSettings(item.id);
                            setToolsOpen(false);
                          }}
                          className={cls}
                        >
                          {inner}
                        </button>
                      );
                    })}
                    <DocumentationLink onDone={() => setToolsOpen(false)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Notifications + Assistant + Settings + Theme toggle */}
      <div className="flex items-center gap-2">
        {!showingCatalog && <Beacon rtl={rtl} />}
        {!showingCatalog && (
          <button
            onClick={() => openAgent(true)}
            className="flex items-center gap-1.5 px-2.5 h-7 text-[13px] font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors"
            title={`Ask Bert (${shortcutLabel})`}
          >
            <Sparkles size={14} className="text-carbon" />
            {!isMobile && "Ask Bert"}
          </button>
        )}
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
                  {/* Two doors, two destinations. Both used to dump you on the
                      same page with the same twenty-item rail — the distinction
                      was a label, not a place. */}
                  <button
                    onClick={() => {
                      openSettings(settingsEntryOf("user"));
                      setSettingsOpen(false);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors cursor-pointer"
                  >
                    User settings
                    <User size={14} className="text-ink-tertiary" />
                  </button>
                  <button
                    onClick={() => {
                      openSettings(settingsEntryOf("system"));
                      setSettingsOpen(false);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors cursor-pointer"
                  >
                    System settings
                    <Server size={14} className="text-ink-tertiary" />
                  </button>
                  <DocumentationLink onDone={() => setSettingsOpen(false)} />
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
              onClick={() => { onNavigate?.("library"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
                appView === "library" || appView === "entity" ? "bg-vellum text-ink" : "text-ink-secondary hover:bg-warm"
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
              const active =
                (item.navigateTo && appView === item.navigateTo) ||
                (appView === "settings" && settingsSection === item.id);
              const cls = `flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
                active ? "bg-vellum text-ink" : "text-ink-secondary hover:bg-warm"
              }`;

              if (item.external) {
                return (
                  <a
                    key={item.id}
                    href={item.external}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cls}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon size={16} className="text-ink-tertiary" />
                    {item.label}
                  </a>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.navigateTo) onNavigate?.(item.navigateTo);
                    else openSettings(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={cls}
                >
                  <Icon size={16} className="text-ink-tertiary" />
                  {item.label}
                </button>
              );
            })}
            <a
              href={settingsDocumentation.external}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors"
            >
              <ExternalLink size={16} className="text-ink-tertiary" />
              {settingsDocumentation.label}
            </a>

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
            <button
              onClick={() => { onNavigate?.("settings"); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors"
            >
              <User size={16} className="text-ink-tertiary" />
              User settings
            </button>
            <button
              onClick={() => { onNavigate?.("settings"); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors"
            >
              <Server size={16} className="text-ink-tertiary" />
              System settings
            </button>
          </div>
        </MobileBottomSheet>
      )}
    </header>
  );
}

/** Documentation, appended to every menu that opens onto settings. It belongs to
 *  no group — it's the way OUT of all of them — so it isn't a Tools item that you
 *  only find if you already went looking somewhere else. */
function DocumentationLink({ onDone }: { onDone: () => void }) {
  const Icon = settingsDocumentation.icon;
  return (
    <a
      href={settingsDocumentation.external}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onDone}
      className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors cursor-pointer"
      style={{ borderTop: "1px solid var(--border-soft)" }}
    >
      <span className="flex items-center gap-2">
        <Icon size={14} className="text-ink-tertiary" />
        {settingsDocumentation.label}
      </span>
      <ExternalLink size={12} className="text-ink-muted" />
    </a>
  );
}
