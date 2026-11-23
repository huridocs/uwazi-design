import { liveTranslateAtom } from "../../atoms/liveTranslate";
import { Fragment, useCallback, useState, useRef, useEffect, useLayoutEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Wrench,
  Settings,
  User,
  Server,
  Languages,
  Globe,
  Menu,
  Sparkles,
  ChevronDown,
  Check,
  ExternalLink,
  LogIn,
  LogOut,
  Database,
  Columns2,
  LayoutGrid,
  Power,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import type { AppView } from "../../atoms/navigation";
import { breakpointAtom } from "../../atoms/viewport";
import { dataSourceAtom, type DataSource } from "../../atoms/dataSource";
import { selectDataSourceAtom } from "../../atoms/library";
import {
  settingsSectionAtom,
  settingsMobileDrilledAtom,
  settingsToolsItems,
  settingsAccessAtom,
  settingsEntryOf,
  settingsDocumentation,
  settingsItemLabelAtom,
} from "../../atoms/settings";
import { collectionSettings } from "../../atoms/settingsSingletons";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
import { agentOpenAtom, shortcutLabel } from "../../atoms/agent";
import { uiLanguageAtom } from "../../atoms/uiLanguage";
import { libraryLayoutAtom, type LibraryLayout } from "../../atoms/session";
import { t, UI_LANGUAGES, type UiLanguage } from "../../utils/i18n";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";
import { logOutAtom } from "../../atoms/auth";
import { sessionStateAtom } from "../../atoms/users";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { Beacon } from "./Beacon";
import { NotebookButton } from "../notebook/NotebookButton";
import { Select } from "../shared/Select";
import { SectionLabel } from "../shared/SectionLabel";
import { Wordmark } from "../shared/Wordmark";
import { Hint } from "../shared/Hint";
import { headerLayoutAtom } from "../../atoms/branding";
import { hasMenuLinks, type HeaderLayout } from "../../utils/theme/headerLayout";
import { NavMenu, NavMenuSheetSection } from "./NavMenuLinks";
import { sitePagesAtom, type SitePage } from "../../atoms/sitePages";
import { PageViewModal } from "../settings/pages/site/PageViewModal";

interface NavbarProps {
  onLogoClick?: () => void;
  appView?: AppView;
  onNavigate?: (view: AppView) => void;
  rtl?: boolean;
  onToggleRtl?: () => void;
}

/** Both builds deploy to one site: `main` at the root, this branch under
 *  /playground/. Vite bakes the base URL in at build time, so it tells them apart. */
const IS_PLAYGROUND = import.meta.env.BASE_URL.includes("/playground/");


export function Navbar({ onLogoClick, appView = "entity", onNavigate, rtl, onToggleRtl }: NavbarProps) {
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
  const [libraryLayout, setLibraryLayout] = useAtom(libraryLayoutAtom);
  // Full width and Split both carry the Notebook on each pane's rail.
  const libraryFullWidth = appView === "library" && libraryLayout !== "drawer" && breakpoint === "desktop";
  const isMobile = breakpoint === "mobile";
  const openAgent = useSetAtom(agentOpenAtom);
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const focalTitle = getEntity(focusedId)?.title ?? "Entity";
  // UI (chrome) language — subscribing here is also what re-renders the navbar's
  // t() strings when the switcher below changes it.
  const [uiLang, setUiLang] = useAtom(uiLanguageAtom);
  const [liveTranslate, setLiveTranslate] = useAtom(liveTranslateAtom);
  const guard = useDirtyGuard();
  // Signed out: no Settings or Log out, a Log in button in their place.
  const signedOut = useAtomValue(sessionStateAtom) === "signed-out";
  const logOut = useSetAtom(logOutAtom);


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

  // Header layout (Settings › Theme and branding). Phones keep their own bar
  // for every layout, and the catalog's bar has no navigation to arrange.
  const chosenLayout = useAtomValue(headerLayoutAtom);
  const layout: HeaderLayout = isMobile || showingCatalog ? "standard" : chosenLayout;
  const compact = layout === "compact";
  /** The bar draws the collection's menu (Menu centred, Menu at end, Compact):
   *  its controls are 2rem boxes and its utilities are icons with a Hint. */
  const menuBar = hasMenuLinks(layout);
  const ctlH = menuBar ? "h-8" : "";
  const iconOnly = menuBar;
  /** An icon-only control: the bar's control height, squared. */
  const iconBox = "justify-center w-8 h-8";
  // The root carries the layout the bar draws: `--spacing-navbar` follows it
  // (`index.css`), so `h-navbar` and anything else measured from the bar agree.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (layout === "standard") return;
    root.dataset.headerLayout = layout;
    return () => root.removeAttribute("data-header-layout");
  }, [layout]);

  // Each collection reads as its saved name (Settings › Collection ›
  // "Collection Name"); the detail line says which demo dataset it is.
  const names: Record<DataSource, string> = {
    mock: useAtomValue(collectionSettings.valueOfAtom("mock")).name,
    cejil: useAtomValue(collectionSettings.valueOfAtom("cejil")).name,
    artworks: useAtomValue(collectionSettings.valueOfAtom("artworks")).name,
    travesia: useAtomValue(collectionSettings.valueOfAtom("travesia")).name,
    nepal: useAtomValue(collectionSettings.valueOfAtom("nepal")).name,
    vegas: useAtomValue(collectionSettings.valueOfAtom("vegas")).name,
  };
  const COLLECTIONS: { id: DataSource; label: string; detail: string }[] = [
    { id: "mock", label: names.mock, detail: "Sample · curated demo entities" },
    { id: "cejil", label: names.cejil, detail: "CEJIL · published corpus · 4,398" },
    { id: "artworks", label: names.artworks, detail: "60 paintings · 22 artists" },
    // A fictional shelter network: generated records, synthetic portraits.
    { id: "travesia", label: names.travesia, detail: "Fictional · synthetic portraits" },
    // Public sources only; every fact carries a verification status.
    { id: "nepal", label: names.nepal, detail: "Open sources · verified per fact · 2,126" },
    // Recordings linked, never stored; every one carries a content warning.
    { id: "vegas", label: names.vegas, detail: "Open sources · recordings timed to the second · 582" },
  ];
  const collection = COLLECTIONS.find((c) => c.id === dataSource) ?? COLLECTIONS[0];

  // The Tools dropdown reads the Tools settings group, so the two lists cannot drift.
  // Only what the signed-in role reaches: a collaborator has no Tools and no
  // System settings (`atoms/settings.ts`).
  const settingsAllowed = useAtomValue(settingsAccessAtom);
  const itemLabel = useAtomValue(settingsItemLabelAtom);
  const toolsItems = settingsToolsItems()
    .filter((i) => settingsAllowed(i.id))
    .map((i) => ({ ...i, label: itemLabel(i) }));
  const systemAllowed = settingsAllowed(settingsEntryOf("system"));
  const toolsActive = toolsOpen || appView === "import-csv";

  /** Open a settings destination. The rail scopes itself to the group the
   *  section belongs to, so this is also what picks User vs System vs Tools.
   *  Guarded as a whole — the section write must not land when a dirty form
   *  keeps the view switch itself from going through. */
  const openSettings = (sectionId: string) => {
    guard(() => {
      setSettingsSection(sectionId);
      setSettingsDrilled(true); // mobile: land on the page, not the rail
      onNavigate?.("settings");
    });
  };
  /** Switch collection and open the Library on it. Guarded as one step: an
   *  open settings or metadata form asks first, and "Cancel" leaves the
   *  collection as it was (Settings pages remount on a collection change). */
  const switchCollection = (source: DataSource) => {
    guard(() => {
      selectSource(source);
      onNavigate?.("library");
    });
  };
  /** Phones: open a settings group's list (the rail, full width), not a page.
   *  The rail lists every group; setting the section to the group's entry
   *  marks it current, and the rail scrolls its lane to the current item. */
  const openSettingsList = (groupId: string) => {
    guard(() => {
      setSettingsSection(settingsEntryOf(groupId));
      setSettingsDrilled(false);
      onNavigate?.("settings");
    });
  };

  // The collection's menu (Settings › Menu), in the layouts that draw it. A
  // page link opens the page as visitors see it, over the view it was opened
  // from, and is the current link while it is open.
  const [viewedPageId, setViewedPageId] = useState<string | null>(null);
  const viewedPage = useAtomValue(sitePagesAtom).find((pg) => pg.id === viewedPageId) ?? null;
  const openLibrary = useCallback(() => onNavigate?.("library"), [onNavigate]);
  const openPage = useCallback((pg: SitePage) => setViewedPageId(pg.id), []);
  const menuHandlers = {
    libraryActive: appView === "library" || appView === "entity",
    activePageId: viewedPage?.id ?? null,
    onLibrary: openLibrary,
    onPage: openPage,
  };
  const pageView = viewedPage && <PageViewModal page={viewedPage} onClose={() => setViewedPageId(null)} />;

  /* ── The bar's pieces. Standard arranges the app's own navigation; the
        menu layouts draw the collection's menu and fold the app's
        navigation into icon utilities (Settings › Theme and branding). ──── */

  const menuButton = isMobile && !showingCatalog && (
    <button
      type="button"
      onClick={() => setMobileMenuOpen(true)}
      data-part="menu-trigger"
      aria-haspopup="dialog"
      aria-expanded={mobileMenuOpen}
      className="flex items-center justify-center rounded-md hover:bg-warm transition-colors w-8 h-8"
      style={{ color: "var(--text-secondary)" }}
      aria-label="Open menu"
    >
      <Menu size={18} />
    </button>
  );

  const logo = (
    <button
      type="button"
      onClick={onLogoClick}
      data-part="logo"
      className={`flex items-center shrink-0 ${ctlH}`}
    >
      <Wordmark size={compact ? "sm" : "md"} />
    </button>
  );

  const buildTag = IS_PLAYGROUND && (
    <span
      data-part="build-tag"
      className="px-1.5 py-0.5 text-meta font-medium rounded bg-warm text-ink-secondary shrink-0"
      title="This build is the playground branch — it carries what main no longer does"
    >
      playground
    </span>
  );

  // Locator/breadcrumb: Library (back) › current entity.
  const locator = (
    <div data-part="locator" className="flex items-center gap-1 min-w-0">
      <button
        type="button"
        onClick={() => onNavigate?.("library")}
        data-part="library"
        className={`flex items-center gap-1.5 px-3 py-1 text-tab font-medium rounded-md transition-colors text-ink-secondary bg-warm hover:bg-parchment hover:text-ink shrink-0`}
      >
        <BookOpen size={14} /> {t("System", "Library")}
      </button>
      <ChevronRight size={14} aria-hidden className="text-ink-tertiary shrink-0" />
      <span
        title={focalTitle}
        data-part="current-entity"
        aria-current="page"
        className={`flex items-center min-w-0 px-2.5 py-1 text-tab font-medium text-ink bg-vellum rounded-md max-w-[16rem]`}
      >
        <span className="truncate">{focalTitle}</span>
      </span>
    </div>
  );

  // Library + its collection picker. The dataset belongs to the destination,
  // not the view, so it is not in the Library toolbar.
  const collectionControl = (
    <div ref={collectionRef} data-part="collection" className="relative flex items-center">
      <button
        type="button"
        onClick={() => onNavigate?.("library")}
        data-part="library"
        aria-current={appView === "library" ? "page" : undefined}
        className={`flex items-center gap-1.5 ps-3 pe-2 py-1 text-tab font-medium rounded-s-md transition-colors ${
          appView === "library"
            ? "text-ink bg-vellum"
            : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
        }`}
      >
        <BookOpen size={14} /> {t("System", "Library")}
      </button>
      <button
        type="button"
        data-part="collection-trigger"
        onClick={() => {
          setCollectionOpen((o) => !o);
          setToolsOpen(false);
          setSettingsOpen(false);
        }}
        aria-haspopup="listbox"
        aria-expanded={collectionOpen}
        aria-label={`Collection: ${collection.label}`}
        title={`Collection: ${collection.label}`}
        className={`flex items-center gap-1 ps-1.5 pe-2 py-1 rounded-e-md text-tab font-medium transition-colors ${
          collectionOpen || appView === "library"
            ? "text-ink bg-vellum"
            : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
        }`}
        style={{ borderInlineStart: "1px solid var(--border-primary)" }}
      >
        <span className="text-ink-tertiary truncate max-w-[12rem]">{collection.label}</span>
        <ChevronDown
          size={13}
          className={`text-ink-tertiary transition-transform ${collectionOpen ? "rotate-180" : ""}`}
        />
      </button>
      {collectionOpen && (
        <div
          role="listbox"
          data-part="collection-menu"
          aria-label="Collection"
          className={`absolute top-full mt-1.5 end-0 w-52 bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-50 py-1`}
        >
          <SectionLabel as="p" className="px-3 pt-1 pb-1">
            Collection
          </SectionLabel>
          {COLLECTIONS.map((c) => {
            const on = c.id === dataSource;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                data-part="option"
                aria-selected={on}
                onClick={() => {
                  setCollectionOpen(false);
                  switchCollection(c.id);
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
                  <span className="block text-meta text-ink-tertiary">{c.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  /** The Tools entries as menu rows: the Tools dropdown, and a section of the
   *  Settings menu in the layouts whose bar has no Tools button. */
  const toolsRows = (done: () => void) =>
    toolsItems.map((item, i) => {
              const Icon = item.icon;
              // Same subsections as the rail behind it — "ML tools" reads
              // as its own shelf in both places.
              const startsSub =
                !!item.subgroup && item.subgroup !== toolsItems[i - 1]?.subgroup;
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

              const sub = startsSub && (
                <SectionLabel as="p" className="px-3 pt-2 pb-1 border-t border-border-soft">
                  {item.subgroup}
                </SectionLabel>
              );

              if (item.external) {
                return (
                  <Fragment key={item.id}>
                    {sub}
                    <a
                      href={item.external}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cls}
                      onClick={() => done()}
                    >
                      {inner}
                    </a>
                  </Fragment>
                );
              }

              return (
                <Fragment key={item.id}>
                  {sub}
                  <button
                    type="button"
                    data-part="tools-item"
                    onClick={() => {
                      // Import CSV is its own top-level view; the rest are
                      // settings pages.
                      if (item.navigateTo) onNavigate?.(item.navigateTo);
                      else openSettings(item.id);
                      done();
                    }}
                    className={cls}
                  >
                    {inner}
                  </button>
                </Fragment>
              );
    });

  const toolsControl = (
    <div className={`relative ${toolsItems.length ? "" : "hidden"}`} ref={toolsRef} data-part="tools">
      <button
        type="button"
        onClick={() => { setToolsOpen((o) => !o); setSettingsOpen(false); }}
        data-part="tools-trigger"
        aria-expanded={toolsOpen}
        className={`flex items-center gap-1.5 px-3 py-1 text-tab font-medium rounded-md transition-colors ${
          toolsActive
            ? "text-ink bg-vellum"
            : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
        }`}
      >
        <Wrench size={14} /> {t("System", "Tools")}
      </button>
      {toolsOpen && (
        <div
          data-part="tools-menu"
          dir="ltr"
          className="absolute top-full mt-1.5 w-48 bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-50"
          style={{ left: rtl ? undefined : 0, right: rtl ? 0 : undefined }}
        >
          <div className="py-1">
            {toolsRows(() => setToolsOpen(false))}
          </div>
        </div>
      )}
    </div>
  );

  // Notifications + Notebook + Assistant + Settings + Theme toggle. In the
  // menu layouts, after the first three: the language as a bordered dropdown,
  // the Library as a grid icon, Settings as a gear and Log in / Log out as a
  // power icon, the order public Uwazi sites use.
  const appTools = !menuBar || !signedOut;
  const utilityIcon = (active: boolean) =>
    `flex items-center ${iconBox} rounded-md transition-colors ${
      active ? "text-ink bg-vellum" : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
    }`;
  const languageAndLibrary = menuBar && (
    <>
      <Select
        value={uiLang}
        onChange={(v) => setUiLang(v as UiLanguage)}
        ariaLabel={t("System", "Interface language")}
        align="end"
        options={UI_LANGUAGES}
        triggerIcon={<Globe size={14} aria-hidden />}
        steady
      />
      <Hint text={t("System", "Library")} describe={false} placement="below">
        {(hint) => (
          <button
            {...hint}
            type="button"
            onClick={() => onNavigate?.("library")}
            data-part="library"
            aria-label={t("System", "Library")}
            aria-current={appView === "library" ? "page" : undefined}
            className={utilityIcon(appView === "library")}
          >
            <LayoutGrid size={14} aria-hidden />
          </button>
        )}
      </Hint>
    </>
  );
  const utilities = (
    <div data-part="end" className="flex items-center gap-2 shrink-0">
      {/* The menu layouts keep the app's own tools for people who are signed
          in: a visitor gets the menu, the language, the Library and Log in. */}
      {!showingCatalog && appTools && <Beacon rtl={rtl} dense={menuBar} overlay={menuBar} />}
      {/* Full width puts the Notebook on the Library's rail, with its count. */}
      {!showingCatalog && appTools && !libraryFullWidth && <NotebookButton rtl={rtl} compact={isMobile || iconOnly} dense={menuBar} hinted={iconOnly} />}
      {!showingCatalog && appTools && (
        <Hint text={`${t("System", "Ask Bert")} (${shortcutLabel})`} describe={false} placement="below" muted={!iconOnly}>
          {(hint) => (
            <button
              {...hint}
              type="button"
              onClick={() => openAgent(true)}
              data-part="ask-bert"
              className={`flex items-center text-tab font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors ${
                iconOnly ? iconBox : "gap-1.5 px-2.5 h-7"
              }`}
              aria-label={iconOnly ? t("System", "Ask Bert") : undefined}
              title={iconOnly ? undefined : `${t("System", "Ask Bert")} (${shortcutLabel})`}
            >
              <Sparkles size={14} className="text-carbon" />
              {!isMobile && !iconOnly && t("System", "Ask Bert")}
            </button>
          )}
        </Hint>
      )}
      {languageAndLibrary}
      {showingCatalog ? (
        <button
          type="button"
          onClick={onLogoClick}
          data-part="return"
          className="flex items-center gap-1.5 px-3 py-1 text-tab font-medium text-ink-secondary rounded-md bg-warm hover:bg-parchment hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} /> Return to app
        </button>
      ) : signedOut ? (
        <Hint text={t("System", "Log in")} describe={false} placement="below" muted={!iconOnly}>
          {(hint) => (
            <button
              {...hint}
              type="button"
              onClick={() => onNavigate?.("login")}
              data-part="log-in"
              aria-label={iconOnly ? t("System", "Log in") : undefined}
              className={`flex items-center text-tab font-medium text-ink-secondary rounded-md bg-warm hover:bg-parchment hover:text-ink transition-colors ${
                iconOnly ? iconBox : "gap-1.5 px-3 py-1"
              }`}
            >
              {iconOnly ? <Power size={14} aria-hidden /> : <LogIn size={14} className="rtl:-scale-x-100" aria-hidden />} {!iconOnly && t("System", "Log in")}
            </button>
          )}
        </Hint>
      ) : !isMobile ? (
        <div className="relative" ref={settingsRef} data-part="settings">
          <Hint text={t("System", "Settings")} describe={false} placement="below" muted={!iconOnly || settingsOpen}>
            {(hint) => (
              <button
                {...hint}
                type="button"
                onClick={() => { setSettingsOpen((o) => !o); setToolsOpen(false); }}
                data-part="settings-trigger"
                aria-expanded={settingsOpen}
                aria-label={iconOnly ? t("System", "Settings") : undefined}
                className={`flex items-center text-tab font-medium rounded-md transition-colors ${
                  iconOnly ? iconBox : "gap-1.5 px-3 py-1"
                } ${
                  settingsOpen
                    ? "text-ink bg-vellum"
                    : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink"
                }`}
              >
                <Settings size={14} /> {!iconOnly && t("System", "Settings")}
              </button>
            )}
          </Hint>
          {/* No `dir="ltr"` on the panel: this menu is chrome and mirrors
              under RTL like every other; the left/right anchoring below flips. */}
          {settingsOpen && (
            <div
              data-part="settings-menu"
              // w-72: the language row carries a control in its trailing slot.
              // Sized for the longest UI language label ("Idioma de la
              // interfaz"); at w-64 it wraps and its row grows taller.
              className="absolute top-full mt-1.5 w-72 bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-50"
              style={{ right: rtl ? undefined : 0, left: rtl ? 0 : undefined }}
            >
              {/* The icon leads, as in the Tools dropdown and SettingsNav. The
                  trailing slot is reserved for state or a hint: the RTL pill,
                  ExternalLink for "leaves the app", a chevron for "goes deeper". */}
              <div className="py-1">
                {/* The menu layouts have no collection picker in the bar. */}
                {menuBar && (
                  <div data-part="collection" className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="flex items-center gap-2 text-xs font-medium text-ink-secondary">
                      <Database size={14} className="text-ink-tertiary" />
                      Collection
                    </span>
                    <Select
                      value={dataSource}
                      onChange={(v) => { setSettingsOpen(false); switchCollection(v as DataSource); }}
                      ariaLabel="Collection"
                      align="end"
                      options={COLLECTIONS.map((c) => ({ value: c.id, label: c.label, hint: c.detail }))}
                    />
                  </div>
                )}
                <button
                  onClick={() => { onToggleRtl?.(); setSettingsOpen(false); }}
                  className="flex items-center justify-between gap-2 w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Languages size={14} className="text-ink-tertiary" />
                    {t("System", "Test RTL layout")}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-meta font-semibold rounded ${
                      rtl
                        ? "bg-success-light text-success"
                        : "bg-warm text-ink-tertiary"
                    }`}
                  >
                    {rtl ? "ON" : "OFF"}
                  </span>
                </button>
                {/* Interface language: the chrome's language, not the
                    document's reading language or System › Languages. It sits
                    with the RTL toggle because both are switches, not
                    destinations; choosing writes `uiLanguageAtom` and closes the menu.
                    The menu layouts carry it in the bar instead. */}
                {!menuBar && <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-medium text-ink-secondary">
                    <Globe size={14} className="text-ink-tertiary" />
                    {t("System", "Interface language")}
                  </span>
                  <Select
                    value={uiLang}
                    onChange={(v) => { setUiLang(v as UiLanguage); setSettingsOpen(false); }}
                    ariaLabel={t("System", "Interface language")}
                    align="end"
                    options={UI_LANGUAGES}
                    steady
                  />
                </div>}
                {/* Live translate (Uwazi: the language menu's footer, admins
                    only). The row says whether it is on; the strip under the
                    navbar is where it ends. */}
                {systemAllowed && (
                  <button
                    onClick={() => { setLiveTranslate((v) => !v); setSettingsOpen(false); }}
                    data-part="live-translate"
                    className="flex items-center justify-between gap-2 w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Languages size={14} className="text-ink-tertiary" />
                      {t("System", "Live translate")}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-meta font-semibold rounded ${
                        liveTranslate ? "bg-success-light text-success" : "bg-warm text-ink-tertiary"
                      }`}
                    >
                      {liveTranslate ? "ON" : "OFF"}
                    </span>
                  </button>
                )}
                {/* Library layout: experimental, a session switch like the two
                    above. It applies from 1024px; on a tablet the row stays and
                    the options say so. Phones never get it (no dropdown there,
                    and the layout does not apply). */}
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-medium text-ink-secondary">
                    <Columns2 size={14} className="text-ink-tertiary" />
                    {t("System", "Library layout")}
                  </span>
                  <Select
                    value={libraryLayout}
                    onChange={(v) => { setLibraryLayout(v as LibraryLayout); setSettingsOpen(false); }}
                    ariaLabel={t("System", "Library layout")}
                    align="end"
                    options={[
                      { value: "drawer", label: t("System", "Drawer") },
                      {
                        value: "full",
                        label: t("System", "Full width"),
                        hint: breakpoint === "desktop" ? undefined : t("System", "From 1024px"),
                      },
                      {
                        value: "split",
                        label: t("System", "Split"),
                        hint: breakpoint === "desktop" ? undefined : t("System", "From 1024px"),
                      },
                    ]}
                    steady
                  />
                </div>
                {/* User settings and System settings each open their own
                    group's entry section, so the rail shows only that group. */}
                <button
                  onClick={() => {
                    openSettings(settingsEntryOf("user"));
                    setSettingsOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors cursor-pointer"
                >
                  <User size={14} className="text-ink-tertiary" />
                  {t("System", "User settings")}
                </button>
                {systemAllowed && <button
                  onClick={() => {
                    openSettings(settingsEntryOf("system"));
                    setSettingsOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors cursor-pointer"
                >
                  <Server size={14} className="text-ink-tertiary" />
                  {t("System", "System settings")}
                </button>}
                {/* The menu layouts have no Tools button in the bar. */}
                {menuBar && toolsItems.length > 0 && (
                  <div data-part="tools" style={{ borderTop: "1px solid var(--border-soft)" }}>
                    <SectionLabel as="p" className="px-3 pt-2 pb-1">{t("System", "Tools")}</SectionLabel>
                    {toolsRows(() => setSettingsOpen(false))}
                  </div>
                )}
                <DocumentationLink onDone={() => setSettingsOpen(false)} />
                {/* Log out is the power icon in the menu layouts' bar. */}
                {!menuBar && <button
                  onClick={() => {
                    setSettingsOpen(false);
                    guard(() => logOut());
                  }}
                  data-part="log-out"
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors cursor-pointer"
                  style={{ borderTop: "1px solid var(--border-soft)" }}
                >
                  <LogOut size={14} className="text-ink-tertiary rtl:-scale-x-100" />
                  {t("System", "Log out")}
                </button>}
              </div>
            </div>
          )}
        </div>
      ) : null}
      {menuBar && !signedOut && (
        <Hint text={t("System", "Log out")} describe={false} placement="below">
          {(hint) => (
            <button
              {...hint}
              type="button"
              onClick={() => guard(() => logOut())}
              data-part="log-out"
              aria-label={t("System", "Log out")}
              className={utilityIcon(false)}
            >
              <Power size={14} aria-hidden />
            </button>
          )}
        </Hint>
      )}
      {!isMobile && <ThemeToggle dense={menuBar} />}
    </div>
  );

  const mobileSheet = isMobile && (
    <MobileBottomSheet
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      title="Menu"
      // Full height: at half, Settings (theme, RTL, language, User/System)
      // sat below the fold with only a fade to say so.
      defaultSnap="full"
    >
      <nav data-part="mobile-nav" aria-label="Primary" className="flex flex-col py-2">
        {/* Library */}
        <button
          onClick={() => { onNavigate?.("library"); setMobileMenuOpen(false); }}
          className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
            appView === "library" || appView === "entity" ? "bg-vellum text-ink" : "text-ink-secondary hover:bg-warm"
          }`}
        >
          <BookOpen size={16} className="text-ink-tertiary" />
          {t("System", "Library")}
        </button>

        {/* Collection: the desktop crumb's picker, as one row so the menu's
            Settings stay above the fold. Choosing opens the Library on it. */}
        <div data-part="mobile-collection" className="flex items-center justify-between gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary">
          <div className="flex items-center gap-3">
            <Database size={16} className="text-ink-tertiary" />
            Collection
          </div>
          <Select
            value={dataSource}
            onChange={(v) => {
              setMobileMenuOpen(false);
              switchCollection(v as DataSource);
            }}
            ariaLabel="Collection"
            align="end"
            options={COLLECTIONS.map((c) => ({ value: c.id, label: c.label, hint: c.detail }))}
            steady
          />
        </div>

        {/* The collection's menu, when the header layout draws one. */}
        {hasMenuLinks(chosenLayout) && <NavMenuSheetSection {...menuHandlers} onDone={() => setMobileMenuOpen(false)} />}

        {/* Tools section */}
        {toolsItems.length > 0 && (
          <SectionLabel className="px-4 pt-4 pb-1">
            {t("System", "Tools")}
          </SectionLabel>
        )}
        {toolsItems.map((item, i) => {
          const Icon = item.icon;
          const active =
            (item.navigateTo && appView === item.navigateTo) ||
            (appView === "settings" && settingsSection === item.id);
          const cls = `flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
            active ? "bg-vellum text-ink" : "text-ink-secondary hover:bg-warm"
          }`;
          // Same "ML tools" shelf as the rail and the desktop dropdown.
          const sub = !!item.subgroup && item.subgroup !== toolsItems[i - 1]?.subgroup && (
            <SectionLabel className="px-4 pt-3 pb-1">
              {item.subgroup}
            </SectionLabel>
          );

          if (item.external) {
            return (
              <Fragment key={item.id}>
                {sub}
                <a
                  href={item.external}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={16} className="text-ink-tertiary" />
                  {item.label}
                </a>
              </Fragment>
            );
          }

          return (
            <Fragment key={item.id}>
              {sub}
              <button
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
            </Fragment>
          );
        })}
        {/* Settings section */}
        <SectionLabel className="px-4 pt-4 pb-1">
          {t("System", "Settings")}
        </SectionLabel>
        <ThemeToggle variant="row" />
        <button
          onClick={() => { onToggleRtl?.(); }}
          className="flex items-center justify-between gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors"
        >
          <div className="flex items-center gap-3">
            <Languages size={16} className="text-ink-tertiary" />
            {t("System", "Test RTL layout")}
          </div>
          <span
            className={`px-1.5 py-0.5 text-meta font-semibold rounded ${
              rtl ? "bg-success-light text-success" : "bg-warm text-ink-tertiary"
            }`}
          >
            {rtl ? "ON" : "OFF"}
          </span>
        </button>
        {/* Same control as the desktop Settings dropdown. Choosing leaves the
            sheet open so the user sees the menu strings change language. */}
        <div className="flex items-center justify-between gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary">
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-ink-tertiary" />
            {t("System", "Interface language")}
          </div>
          <Select
            value={uiLang}
            onChange={(v) => setUiLang(v as UiLanguage)}
            ariaLabel={t("System", "Interface language")}
            align="end"
            options={UI_LANGUAGES}
            steady
          />
        </div>
        {!signedOut && (
          <button
            onClick={() => { openSettingsList("user"); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors"
          >
            <User size={16} className="text-ink-tertiary" />
            {t("System", "User settings")}
          </button>
        )}
        {systemAllowed && (
          <button
            onClick={() => { openSettingsList("system"); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors"
          >
            <Server size={16} className="text-ink-tertiary" />
            {t("System", "System settings")}
          </button>
        )}
        {!signedOut && (
          <button
            onClick={() => { setMobileMenuOpen(false); guard(() => logOut()); }}
            data-part="log-out"
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors"
            style={{ borderTop: "1px solid var(--border-soft)" }}
          >
            <LogOut size={16} className="text-ink-tertiary rtl:-scale-x-100" />
            {t("System", "Log out")}
          </button>
        )}
      </nav>
    </MobileBottomSheet>
  );

  const showNav = !showingCatalog && !isMobile;
  const border = { borderBottom: "1px solid var(--border-primary)" };
  // The page's one h1. The logo is an image inside a button, so it can't
  // carry the heading itself without changing what the button announces.
  const heading = <h1 className="sr-only">Uwazi</h1>;

  if (menuBar) {
    return (
      // One row, as a public site's header: the logo, the collection's menu,
      // the utilities. The menu takes the room between the two and folds what
      // does not fit; where it sits in that room is the layout.
      <header
        data-component="Navbar"
        data-layout={layout}
        className="relative h-navbar bg-paper flex items-center gap-3 px-3 shrink-0"
        style={border}
      >
        {heading}
        <div data-part="start" className="flex items-center gap-3 shrink-0">
          {logo}
          {buildTag}
        </div>
        <NavMenu
          {...menuHandlers}
          align={layout === "menu-centred" ? "center" : layout === "menu-end" ? "end" : "start"}
          small={compact}
        />
        {utilities}
        {pageView}
      </header>
    );
  }

  const nav = showNav && (
    <nav data-part="primary-nav" aria-label="Primary" className="flex items-center gap-2 min-w-0">
      {appView === "entity" ? locator : collectionControl}
      {toolsControl}
    </nav>
  );

  return (
    // px-3 matches the content gutter below (Library toolbar, card grid,
    // MainTabs, DocMeta), so the logo and right cluster share their edges.
    <header
      data-component="Navbar"
      data-layout={layout}
      className="relative h-navbar bg-paper flex items-center justify-between px-3 shrink-0"
      style={border}
    >
      {heading}
      {/* Start: Logo + (mobile hamburger | desktop nav) */}
      <div data-part="start" className="flex items-center gap-3 md:gap-4 min-w-0">
        {menuButton}
        {logo}
        {buildTag}
        {nav}
      </div>
      {utilities}
      {mobileSheet}
      {pageView}
    </header>
  );
}

/** Documentation, appended to every menu that opens onto settings. It belongs to
 *  no settings group, so it is not listed as a Tools item. */
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
