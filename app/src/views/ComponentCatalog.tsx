import { useEffect, useRef, useState } from "react";
import { ConfirmDelete } from "../components/shared/ConfirmDelete";
import { TypedConfirmModal } from "../components/shared/TypedConfirmModal";
import { PasswordConfirmModal } from "../components/shared/PasswordConfirmModal";
import { useAtomValue, useSetAtom } from "jotai";
import { appViewAtom } from "../atoms/navigation";
import { LoginView } from "./LoginView";
import { CatalogEntry } from "../components/catalog/CatalogEntry";
import { PinToggle } from "../components/shared/PinToggle";
import { SavedViewsPanel } from "../components/library/SavedViewsMenu";
import { CaseBody } from "../components/case/CasePanel";
import { libraryEntitiesAtom } from "../atoms/dataSource";
import { HighlightedText } from "../components/shared/HighlightedText";
import { StyleGuide } from "../components/catalog/StyleGuide";

// Components rendered directly inside the catalog body (not wrapped in a
// `*Demo` helper). Everything that needs scoped atom state or stateful
// interaction lives in `./catalog/demos.tsx` and is imported lower down.
import { EntityPill } from "../components/shared/EntityPill";
import { ProvenanceLine } from "../components/shared/ProvenanceLine";
import { ThesaurusValueLabel } from "../components/shared/ThesaurusValueLabel";
import { FieldMessage, issueBorderClass } from "../components/shared/FieldMessage";
import { BorrowedDocLine } from "../components/library/BorrowedDocLine";
import { PdfPageThumb } from "../components/shared/PdfPageThumb";
import { EntityTypeTag } from "../components/shared/EntityTypeTag";
import { ViewSwitcher } from "../components/library/ViewSwitcher";
import { entityTypes } from "../data/entities";
import { PageTag } from "../components/shared/PageTag";
import { Hint } from "../components/shared/Hint";
import { SectionLabel } from "../components/shared/SectionLabel";
import { MatchModeToggle, type MatchMode } from "../components/shared/MatchModeToggle";
import { CountBadge } from "../components/shared/CountBadge";
import { CopyFieldRow } from "../components/metadata/CopyFieldRow";
import { ListeningChip } from "../components/metadata/ListeningChip";
import { LangSwitch } from "../components/settings/pages/site/shared";
import { SyntaxBadge } from "../components/settings/pages/site/CodePageEditor";
import type { SiteLang } from "../data/sitePages";
import type { CopyPlan } from "../utils/copyFrom";
import { MetadataCard, Property, PropertyRow } from "../components/metadata/MetadataCard";
import { HighlightCard } from "../components/relationships/HighlightCard";
import { RelatedDocCard } from "../components/relationships/RelatedDocCard";
import { DrawerActionBar } from "../components/relationships/DrawerActionBar";
import { ActiveFilterChip } from "../components/shared/ActiveFilterChip";
import { FiltersButton } from "../components/shared/FiltersButton";
import { ListCardRow } from "../components/shared/ListCardRow";
import { UwaziLoader } from "../components/shared/UwaziLoader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { ProgressBar } from "../components/shared/ProgressBar";
import { StatsCard } from "../components/shared/StatsCard";
import { Stepper } from "../components/shared/Stepper";
import { AlertBanner } from "../components/shared/AlertBanner";
import { Breadcrumb } from "../components/layout/Breadcrumb";
import { SettingsNav } from "../components/settings/SettingsNav";

// Settings primitives (static demos)
import { SettingsBarContext, SettingsButton } from "../components/settings/SettingsButton";
import { SettingsField, TextInput } from "../components/settings/SettingsField";
import { RowActionButton, RowActions } from "../components/settings/RowActions";
import { SettingsSelectionBar } from "../components/settings/SettingsSelectionBar";
import { MoveButtons, ReorderGrip } from "../components/settings/ReorderControls";
import { AlphaJump } from "../components/shared/AlphaJump";
import { Dropzone } from "../components/shared/Dropzone";
import { TranslationProgress } from "../components/settings/TranslationProgress";
import { BulkPickModal } from "../components/settings/BulkPickModal";
import { SettingsEditorDemo, SettingsEmptyStateDemo, SettingsListPageDemo, SettingsSectionDemo } from "./catalog/settingsDemos";
import { DateInputDemo, ImagePickerModalDemo, MapPointPickerDemo, StatsCardDemo } from "./catalog/collectionDemos";
import { StatusPill } from "../components/settings/StatusPill";

// Icons
import { ArrowLeft, FileText, Pencil, Download, Trash2, Share2, Plus, Tag, Link2, FolderOpen } from "lucide-react";
import { BAR_DANGER, BAR_GHOST, BAR_LEAD } from "../components/shared/warmButton";
import { BarDivider } from "../components/shared/BarDivider";
import { ModalDemo, ModalPartsDemo } from "../components/catalog/ModalDemo";

// Data
import { references } from "../data/references";
import { files } from "../data/files";

// Stateful demo helpers — atom-scoped Providers, local React state, interaction.
import {
  FadeTruncate,
  SegmentedTabsDemo,
  DrawerTabsDemo,
  MainTabsDemo,
  BeaconDemo,
  ViewSwitcherDemo,
  CopyFromPickerDemo,
  FileTableDemo,
  SearchBarDemo,
  RelationshipGroupedCardDemo,
  RelationshipRowReferenceDemo,
  ActionBarDemo,
  RefMinimapDemo,
  FiltersSlideOverDemo,
  FacetSectionDemo,
  ToggleChipDemo,
  CollapseControlsDemo,
  ListInfoRowDemo,
  ZoomControlDemo,
  CheckboxesDemo,
  RelationshipRowAggregateDemo,
  RelationshipRowHubDemo,
  RowCheckboxDemo,
  RelationshipsActionBarDemo,
  ManageRelationTypesModalDemo,
  SelectControlsDemo,
  RelationshipGroupedCardAggregateDemo,
  ViewControlsDemo,
  YearStripDemo,
  EventRowDemo,
  DirectionGlyphDemo,
  ConnectionGroupCardDemo,
  RelationshipFieldCardDemo,
  InheritedValueChipDemo,
  RelationshipFieldEditorDemo,
  ThesaurusPickerDemo,
  SelectionActionsMenuDemo,
  ChangeTemplateDemo,
  ShareSelectionDemo,
  BulkFieldRowsDemo,
  RadioGroupDemo,
  DataTableDemo,
  FilterCardDemo,
} from "./catalog/demos";

import { DevPanel } from "./catalog/DevPanel";
import { sidebarGroups, allItemIds } from "./catalog/sidebarGroups";
import { handoffDocs, resolveHandoffAnchor } from "./catalog/handoffDocs";
import { Markdown } from "./catalog/Markdown";
import { Wordmark } from "../components/shared/Wordmark";

/** Demo data for the Copy From entry — a plan with matches AND refusals, so the
 *  half that explains itself is visible in the catalog too. */
/** A real judgment, so the thumb entry renders the page it actually would. */
const CATALOG_PDF = "/docs/Velasquez-Rodriguez_v_Honduras_Judgment_1988_EN.pdf";

const CATALOG_COPY_PLAN: CopyPlan = {
  matches: [
    {
      id: "region",
      label: "Region",
      type: "text",
      copies: "value",
      sourceValue: "South America",
      targetValue: "North America",
      emptyOnSource: false,
      unchanged: false,
    },
    {
      id: "ratified",
      label: "Ratified ACHR",
      type: "text",
      copies: "value",
      sourceValue: "1984",
      targetValue: "1981",
      emptyOnSource: false,
      unchanged: false,
    },
  ],
  skipped: [
    {
      id: "category",
      label: "Category",
      reason: "different-thesaurus",
      detail: "Both define Category, but they point at different vocabularies.",
      side: "both",
    },
    {
      id: "files",
      label: "Attachments",
      reason: "excluded-type",
      detail: "Files belong to the entity that holds them.",
      side: "both",
    },
  ],
  matchCount: 2,
};


interface Props {
  /** Called when the user clicks the "Return to app" button in the catalog
   *  header. Routes the appView atom back to "entity". */
  onReturn: () => void;
}

export function ComponentCatalog({ onReturn }: Props) {
  const setAppView = useSetAtom(appViewAtom);
  const [activeId, setActiveId] = useState(allItemIds[0]);
  const contentRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    // Track which section is "active" for highlight purposes only. The sidebar
    // is not auto-scrolled here — any nav scrolling during natural content
    // scroll caused visible jitter. The click handler still scrolls the nav
    // when a sidebar item is explicitly tapped.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        root: contentRef.current,
        rootMargin: "-5% 0px -85% 0px",
        threshold: 0,
      }
    );

    itemRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [mounted]);

  const sidebarBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [blinkId, setBlinkId] = useState<string | null>(null);
  // Live demo state for the MatchModeToggle entry — the control is a segmented
  // choice, so a static one shows only half of what it does.
  const [matchMode, setMatchMode] = useState<MatchMode>("OR");

  const scrollTo = (id: string) => {
    const container = contentRef.current;
    const target = itemRefs.current.get(id);
    if (container && target) {
      // Compute target's offset within the scrollable container.
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset =
        targetRect.top - containerRect.top + container.scrollTop;
      // Hard-clamp to [0, max] so the last entry lands at the bottom of the
      // visible area instead of producing blank space past its bottom.
      const max = Math.max(0, container.scrollHeight - container.clientHeight);
      // -16px gives the target a bit of breathing room from the column top
      // (mirrors `scroll-pt-4`); only applied when not at scroll bounds.
      const desired = Math.max(0, offset - 16);
      const top = Math.min(desired, max);
      container.scrollTo({ top, behavior: "smooth" });
    }
    // Same anti-feedback-loop pattern as the IntersectionObserver — scroll
    // the nav directly rather than using scrollIntoView (which would also
    // scroll the outer container).
    const btn = sidebarBtnRefs.current.get(id);
    const nav = btn?.closest("nav");
    if (btn && nav) {
      const btnRect = btn.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      const btnCenterInNav =
        btnRect.top - navRect.top + nav.scrollTop + btnRect.height / 2;
      const navTarget = btnCenterInNav - nav.clientHeight / 2;
      const navMax = nav.scrollHeight - nav.clientHeight;
      nav.scrollTo({
        top: Math.max(0, Math.min(navTarget, navMax)),
        behavior: "smooth",
      });
    }
    if (activeId === id) {
      // Force re-blink by toggling off then on
      setBlinkId(null);
      requestAnimationFrame(() => {
        setBlinkId(id);
        setTimeout(() => setBlinkId(null), 500);
      });
    }
  };

  const reg = (id: string) => (el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
  };

  return (
    // Catalog uses NATURAL PAGE SCROLL — no nested overflow-auto containers
    // fighting each other. The outer div is the body's only scrollable child;
    // sticky positions the header + sidebar to the viewport top while the
    // content column flows below. Scroll is bounded by the content's natural
    // height, so reaching the bottom shows the last entry with no phantom
    // blank space beyond it.
    <div
      ref={contentRef}
      className="h-screen overflow-y-auto overscroll-y-none bg-parchment"
    >
      {/* Sticky header — pinned at the top of the scroll container */}
      <header
        className="sticky top-0 z-30 h-13 bg-paper flex items-center justify-between px-5"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <Wordmark />
        <button
          onClick={onReturn}
          className="flex items-center gap-1.5 px-3 py-1 text-tab font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Return to app
        </button>
      </header>
      <div className="grid grid-cols-[220px_minmax(0,1fr)]">
      {/* Sidebar — sticky to top:52 (below the header). Self-scrolls if its
          own item list exceeds viewport height. */}
      <nav className="sticky top-13 z-20 self-start bg-paper border-r border-border/60 py-4 px-3 overflow-y-auto overscroll-y-none" style={{ height: "calc(100vh - 3.25rem)" }}>
        <h2 className="text-meta font-bold text-ink-muted uppercase tracking-widest px-2 mb-3">
          Component Catalog
        </h2>
        {sidebarGroups.map((group) => (
          <div key={group.label} className="mb-3">
            <SectionLabel className="px-2">{group.label}</SectionLabel>
            <div className="flex flex-col mt-1">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  ref={(el) => { if (el) sidebarBtnRefs.current.set(item.id, el); }}
                  onClick={() => scrollTo(item.id)}
                  className={`text-left px-2 py-1 text-xs rounded transition-colors ${
                    activeId === item.id
                      ? "bg-vellum text-ink font-medium"
                      : "text-ink-tertiary hover:text-ink-secondary hover:bg-warm"
                  } ${blinkId === item.id ? "flash-highlight" : ""}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Content */}
      <div className="px-8 pt-6 pb-12 scroll-pt-[4.25rem]">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">

          {/* ==================== HANDOFF ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Handoff</h2>
            <div className="flex flex-col gap-10">
              {handoffDocs.map((doc) => (
                <section
                  key={doc.id}
                  id={doc.id}
                  ref={reg(doc.id)}
                  className="max-w-[44rem] rounded-md bg-paper px-6 py-5 border border-border-soft"
                >
                  <p className="mb-4 font-mono text-meta text-ink-muted">
                    {doc.file}
                  </p>
                  <Markdown
                    source={doc.source}
                    resolveLink={resolveHandoffAnchor}
                    onNavigate={scrollTo}
                  />
                </section>
              ))}
            </div>
          </section>

          {/* ==================== STYLE GUIDE ==================== */}
          <div ref={(el) => {
            if (!el) return;
            // Register StyleGuide section IDs into itemRefs
            const sgIds = ["sg-colors", "sg-typography", "sg-shadows", "sg-radii", "sg-spacing"];
            sgIds.forEach((id) => {
              const node = el.querySelector(`#${id}`);
              if (node) itemRefs.current.set(id, node as HTMLElement);
            });
          }}>
            <StyleGuide />
          </div>

          {/* ==================== ELEMENTS ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Elements</h2>
            <div className="flex flex-col gap-6">
              <div id="el-entity-pill" ref={reg("el-entity-pill")}>
                <CatalogEntry
                  name="EntityPill"
                  description="Colored badge showing entity type with dot indicator"
                  code={`<EntityPill typeId="person" />
<EntityPill typeId="court_case" />
<EntityPill typeId="country" label="Honduras" />
<EntityPill typeId="violation" size="md" />`}
                  tailwind="rounded-full px-2 py-0.5 text-xs font-medium"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <EntityPill typeId="person" />
                    <EntityPill typeId="court_case" />
                    <EntityPill typeId="country" label="Honduras" />
                    <EntityPill typeId="violation" size="md" />
                    <EntityPill typeId="right" />
                    <EntityPill typeId="judgment" />
                    <EntityPill typeId="organization" />
                    <EntityPill typeId="document" />
                  </div>
                </CatalogEntry>
              </div>

              <div id="el-page-tag" ref={reg("el-page-tag")}>
                <CatalogEntry
                  name="PageTag"
                  description="Monospaced page number badge for document references"
                  code={`<PageTag page={3} />
<PageTag page={12} onClick={() => {}} />`}
                  tailwind="font-mono text-xs bg-vellum rounded px-1.5 py-0.5"
                >
                  <div className="flex items-center gap-2">
                    <PageTag page={1} />
                    <PageTag page={3} />
                    <PageTag page={12} />
                    <PageTag page={42} />
                  </div>
                </CatalogEntry>
              </div>

              <div id="el-hint" ref={reg("el-hint")}>
                <CatalogEntry
                  name="Hint"
                  description="One-line hint above an element on hover and keyboard focus, portalled to body. Replaces title attributes."
                  code={`<Hint text="Go to page 14" describe={false}>
  {(hint) => <button {...hint} aria-label="Go to page 14">Page 14</button>}
</Hint>`}
                  tailwind="fixed z-50 rounded-md bg-ink px-2 py-1 text-meta text-paper shadow-md"
                >
                  <div className="flex items-center gap-4 text-meta">
                    <Hint text="Go to page 14" describe={false}>
                      {(hint) => (
                        <button
                          {...hint}
                          type="button"
                          aria-label="Go to page 14"
                          className="rounded-sm uppercase tracking-wide text-ink-tertiary hover:underline
                            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
                        >
                          Page 14
                        </button>
                      )}
                    </Hint>
                    <Hint text="4 matches on this page">
                      {(hint) => (
                        <span {...hint} className="tabular-nums text-ink-tertiary">
                          4 matches
                        </span>
                      )}
                    </Hint>
                  </div>
                </CatalogEntry>
              </div>

              <div id="el-count-badge" ref={reg("el-count-badge")}>
                <CatalogEntry
                  name="CountBadge"
                  description="Small rounded badge displaying a numeric count"
                  code={`<CountBadge count={5} />
<CountBadge count={12} />
<CountBadge count={128} />`}
                  tailwind="min-w-5 h-5 rounded-full bg-parchment text-ink-tertiary"
                >
                  <div className="flex items-center gap-3">
                    <CountBadge count={3} />
                    <CountBadge count={12} />
                    <CountBadge count={128} />
                  </div>
                </CatalogEntry>
              </div>

              <div id="el-buttons" ref={reg("el-buttons")}>
                <CatalogEntry
                  name="Buttons"
                  description="Primary, secondary, ghost, danger, compact, and icon button styles"
                  code={`{/* Primary */}
<button className="px-4 py-2 text-sm font-medium rounded-md bg-ink text-parchment hover:bg-ink/90">
  Primary
</button>

{/* Secondary */}
<button className="px-4 py-2 text-sm font-medium rounded-md border border-border text-ink-secondary hover:bg-parchment">
  Secondary
</button>

{/* Danger */}
<button className="px-4 py-2 text-sm font-medium rounded-md bg-seal-fill text-white hover:bg-seal-fill/90">
  Delete
</button>

{/* Ghost */}
<button className="px-3 py-1.5 text-xs font-medium text-ink-tertiary hover:text-ink-secondary hover:bg-warm rounded-md">
  Ghost
</button>

{/* Compact (navbar) */}
<button className="flex items-center gap-1.5 px-3 py-1 text-tab font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment">
  <BookOpen size={14} /> Compact
</button>

{/* Icon + label (secondary) */}
<button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm">
  <Pencil size={12} /> Edit
</button>

{/* Icon + label (danger) */}
<button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-seal-fill rounded-md hover:bg-seal-fill/90">
  <Trash2 size={12} /> Delete
</button>

{/* Icon + label (add) */}
<button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm">
  <Plus size={12} /> Add file
</button>`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="px-4 py-2 text-sm font-medium rounded-md bg-ink text-parchment hover:bg-ink/90 transition-colors">Primary</button>
                      <button className="px-4 py-2 text-sm font-medium rounded-md border border-border text-ink-secondary hover:bg-parchment transition-colors">Secondary</button>
                      <button className="px-4 py-2 text-sm font-medium rounded-md bg-seal-fill text-white hover:bg-seal-fill/90 transition-colors">Delete</button>
                      <button className="px-3 py-1.5 text-xs font-medium text-ink-tertiary hover:text-ink-secondary hover:bg-warm rounded-md transition-colors">Ghost</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
                        <Pencil size={12} /> Edit
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
                        <Share2 size={12} /> Share
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
                        <Download size={12} /> Download
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
                        <Plus size={12} /> Add file
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-seal-fill rounded-md hover:bg-seal-fill/90 transition-colors">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== ENTITY VIEW — LAYOUT ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Entity View — Layout</h2>
            <div className="flex flex-col gap-6">
              <div id="ev-main-tabs" ref={reg("ev-main-tabs")}>
                <CatalogEntry
                  name="MainTabs"
                  description="Primary navigation tabs with back arrow"
                  code={`<MainTabs
  tabs={[
    { id: "metadata", label: "Metadata" },
    { id: "document", label: "Document" },
    { id: "references", label: "References", count: 12 },
    { id: "files", label: "Files", count: 6 },
  ]}
  activeId="document"
  onChange={(id) => {}}
/>`}
                >
                  <MainTabsDemo />
                </CatalogEntry>
              </div>

              <div id="ev-segmented-tabs" ref={reg("ev-segmented-tabs")}>
                <CatalogEntry
                  name="SegmentedTabs"
                  description="Pill-style segmented control with optional counts"
                  code={`<SegmentedTabs
  tabs={[
    { id: "all", label: "All", count: 12 },
    { id: "docs", label: "Documents", count: 4 },
    { id: "refs", label: "References", count: 8 },
  ]}
  activeId="all"
  onChange={(id) => {}}
/>`}
                >
                  <SegmentedTabsDemo />
                </CatalogEntry>
              </div>

              <div id="ev-drawer-tabs" ref={reg("ev-drawer-tabs")}>
                <CatalogEntry
                  name="DrawerTabs"
                  description="Bordered tab group used in side drawers"
                  code={`<DrawerTabs
  tabs={[
    { id: "metadata", label: "Metadata" },
    { id: "references", label: "References", count: 12 },
    { id: "toc", label: "TOC" },
  ]}
  activeId="metadata"
  onChange={(id) => {}}
/>`}
                >
                  <DrawerTabsDemo />
                </CatalogEntry>
              </div>

              <div id="ev-beacon" ref={reg("ev-beacon")}>
                <CatalogEntry
                  name="Beacon"
                  description="Navbar notification beacon — a colour-coded loader mark (seal/amber/carbon/black by severity, animated while processing) that expands on a new task or hover, and opens the notifications drawer on click"
                  code={`// State lives in atoms/notifications.ts
//   tasksAtom        — the in-flight task (animates the mark + TASKS)
//   notificationsAtom   — past events (the drawer log)
//   beaconOpenAtom      — drawer open?
// Collapsed = the UwaziLoader mark; expands for a task intro / on hover.
// Renders <NotificationsSlideOver /> internally.
<Beacon />`}
                >
                  <BeaconDemo />
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== ENTITY VIEW — DOCUMENT ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Entity View — Document</h2>
            <div className="flex flex-col gap-6">
              <div id="ev-floating-menu" ref={reg("ev-floating-menu")}>
                <CatalogEntry
                  name="FloatingMenu"
                  description="Context menu on text selection in document viewer"
                  code={`<FloatingMenu x={200} y={100} text="selected text" />

{/* Dark bg-ink bar with Create Reference, Copy, Highlight buttons */}`}
                >
                  <div className="relative h-16 w-full flex items-center justify-center">
                    <div className="flex items-center gap-0.5 rounded-md shadow-xl px-1 py-1" style={{ backgroundColor: "#1A1A1A" }}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md hover:bg-white/15 transition-colors">Create Reference</button>
                      <div className="w-px h-4 bg-white/20" />
                      <button className="p-1.5 text-white/70 rounded-md hover:bg-white/15 hover:text-white transition-colors">Copy</button>
                      <button className="p-1.5 text-white/70 rounded-md hover:bg-white/15 hover:text-white transition-colors">Highlight</button>
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="ev-action-bar" ref={reg("ev-action-bar")}>
                <CatalogEntry
                  name="ActionBar"
                  description="Document viewer footer with OCR button and page navigation"
                  code={`<ActionBar numPages={15} onScrollToPage={(page) => {}} />`}
                >
                  <ActionBarDemo />
                </CatalogEntry>
              </div>

              <div id="ev-hover-expand" ref={reg("ev-hover-expand")}>
                <CatalogEntry
                  name="HoverExpand"
                  description="Tooltip card on reference highlight hover"
                  code={`<HoverExpand reference={reference} x={200} y={100} />

{/* Fixed-positioned, pointer-events-none */}`}
                >
                  <div className="relative w-full flex justify-center">
                    <div className="bg-paper border border-border rounded-md shadow-lg px-3 py-2.5 max-w-xs">
                      <div className="flex items-center gap-2 mb-1.5">
                        <EntityPill typeId="person" label="Juan Carlos Abella" size="sm" />
                        <span className="text-meta text-ink-muted capitalize">mentions</span>
                      </div>
                      <p className="text-xs text-ink-secondary leading-relaxed line-clamp-3">
                        "Juan Carlos Abella and other persons were detained on January 23, 1989..."
                      </p>
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="ev-ref-minimap" ref={reg("ev-ref-minimap")}>
                <CatalogEntry
                  name="RefMinimap"
                  description="Vertical reference track alongside the document. Dots cluster by position and colour by target entity type. Toggle between global (all pages) and current-page modes; click a dot to jump."
                  code={`<RefMinimap numPages={numPages} />

{/* Reads referencesAtom + currentPageAtom + activeRefIdAtom.
    Entity-level refs (no page anchor) are filtered out. */}`}
                >
                  <RefMinimapDemo />
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== ENTITY VIEW — REFERENCES ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Entity View — References</h2>
            <div className="flex flex-col gap-6">
              <div id="ev-search-bar" ref={reg("ev-search-bar")}>
                <CatalogEntry
                  name="SearchBar"
                  description="Search input with icon, connected to filter atoms"
                  code={`<SearchBar />

{/* Uses relSearchQueryAtom from atoms/filters.ts */}`}
                >
                  <SearchBarDemo />
                </CatalogEntry>
              </div>

              <div id="ev-relationship-row-ref" ref={reg("ev-relationship-row-ref")}>
                <CatalogEntry
                  name="RelationshipRow · reference"
                  description="Text-anchored row variant — entity pill, page tag, snippet, direction + rel label. Two targets, and the row itself is not one: the pill opens the entity, the p.N tag goes to the passage."
                  code={`<RelationshipRow
  kind="reference"
  ref={reference}
  onDelete={(id) => {}}
/>`}
                >
                  <div className="w-full max-w-md border border-border/40 rounded-md overflow-hidden">
                    <RelationshipRowReferenceDemo />
                  </div>
                </CatalogEntry>
              </div>

              <div id="ev-relationship-grouped-card" ref={reg("ev-relationship-grouped-card")}>
                <CatalogEntry
                  name="RelationshipGroupedCard"
                  description="Collapsible group with expand/collapse signal handling + count badge"
                  code={`<RelationshipGroupedCard
  title="Person"
  color="#7C3AED"
  count={3}
  defaultExpanded
>
  {refs.map((ref) => (
    <RelationshipRow kind="reference" reference={ref} />
  ))}
</RelationshipGroupedCard>`}
                >
                  <div className="w-full max-w-md">
                    <RelationshipGroupedCardDemo />
                  </div>
                </CatalogEntry>
              </div>

              <div id="ev-highlight-card" ref={reg("ev-highlight-card")}>
                <CatalogEntry
                  name="HighlightCard"
                  description="Reference card with highlighted text snippet and entity pill"
                  code={`<HighlightCard reference={reference} />`}
                >
                  <div className="w-full max-w-md">
                    <HighlightCard reference={references[0]} />
                  </div>
                </CatalogEntry>
              </div>

              <div id="ev-related-doc" ref={reg("ev-related-doc")}>
                <CatalogEntry
                  name="RelatedDocCard"
                  description="Card showing a related document with entity type and reference count"
                  code={`<RelatedDocCard
  title="Case 12.045 — Pueblo Bello Massacre"
  entityTypeId="court_case"
  referenceCount={7}
/>`}
                >
                  <div className="w-full max-w-md flex flex-col gap-2">
                    <RelatedDocCard title="Case 12.045 — Pueblo Bello Massacre" entityTypeId="court_case" referenceCount={7} />
                    <RelatedDocCard title="Right to Life — Article 4" entityTypeId="right" referenceCount={3} />
                  </div>
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== ENTITY VIEW — METADATA ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Entity View — Metadata</h2>
            <div className="flex flex-col gap-6">
              <div id="ev-metadata-card" ref={reg("ev-metadata-card")}>
                <CatalogEntry
                  name="MetadataCard + Property"
                  description="Card container with label/value property pairs"
                  code={`<MetadataCard title="Case details" icon={<FileText size={14} className="text-ink-tertiary" />}>
  <Property label="Country" value="Honduras" />
  <PropertyRow>
    <Property label="Date" value="June 26, 1987" />
    <Property label="Type" value="Judgment" />
  </PropertyRow>
  <Property label="Mechanism" value="Corte IDH" linked />
</MetadataCard>`}
                >
                  <div className="w-full max-w-sm">
                    <MetadataCard title="Case details" icon={<FileText size={14} className="text-ink-tertiary" />}>
                      <Property label="Country" value="Honduras" />
                      <PropertyRow>
                        <Property label="Date" value="June 26, 1987" />
                        <Property label="Type" value="Judgment" />
                      </PropertyRow>
                      <Property label="Mechanism" value="Corte IDH" linked />
                    </MetadataCard>
                  </div>
                </CatalogEntry>
              </div>

              <div id="ev-copy-from-picker" ref={reg("ev-copy-from-picker")}>
                <CatalogEntry
                  name="CopyFromPicker"
                  description="Step 1 of the Copy From modal: the entity to copy metadata FROM. Defaults to the target's OWN type with 'Any type' beside it — Uwazi searches the whole library title-only with no filter, so editors pick sources sharing zero properties and find out afterwards. Every candidate is badged with how many fields it would actually bring across, before it is chosen. Choosing one turns the same panel, at the same size, into step 2. Traps focus, closes on Escape, moves focus to the step heading."
                  code={`<CopyFromPicker
  target={entity}
  resolveUnits={copyUnitsFor}   // what THIS form can apply of a plan
  onCopy={applyCopy}            // (source, tickedUnits) — writes the form, never saves
  onClose={close}
/>

{/* Badge = countCopyMatchesFor(index, candidate, language) */}`}
                >
                  <CopyFromPickerDemo />
                </CatalogEntry>
              </div>

              <div id="ev-click-to-fill" ref={reg("ev-click-to-fill")}>
                <CatalogEntry
                  name="Click-to-fill · listening field"
                  description="A metadata input that is waiting for a value from somewhere else on screen — a passage in the document, a property on a connected entity. Focus arms it and the arm is LATCHED, because finding the value means leaving the field: the input keeps its focus ring while blurred so the form never looks like it forgot where you were. The chip rides the label row (already mounted, so nothing shifts) and says what to do rather than what state we are in. Filling, Escape, the chip's ×, or leaving the form all end it."
                  code={`// atoms/fillTarget.ts — a VALUE signal, never a callback
setFillTarget({ fieldId: field.id, label: field.label });   // on focus + click
sendFill(selection.text);                                    // commits, then disarms

<EditSection label={field.label} listening onStopListening={disarm}>`}
                >
                  <div className="w-full max-w-md space-y-1.5">
                    {/* Mirrors `EditSection`'s real row, form-label recipe and
                        `min-h-4` included — a catalog demo that drifts from the
                        thing it documents is worse than no demo. */}
                    <div className="flex items-center gap-2 min-h-4">
                      <label
                        htmlFor="catalog-fill-demo"
                        className="text-xs font-medium text-ink-secondary"
                      >
                        Description
                      </label>
                      <ListeningChip label="Description" onStop={() => {}} />
                    </div>
                    <textarea
                      id="catalog-fill-demo"
                      readOnly
                      rows={3}
                      placeholder="Select a passage in the document to fill this…"
                      className="w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border
                        ring-2 ring-carbon/20 border-carbon/40 resize-none placeholder:text-ink-muted"
                    />
                  </div>
                </CatalogEntry>
              </div>

              <div id="ev-copy-from" ref={reg("ev-copy-from")}>
                <CatalogEntry
                  name="CopyFrom · properties step + field rows"
                  description="Step 2 of the Copy From modal, and the row it is built from. The chosen source's properties: what would copy, each deselectable with incoming beside current so an overwrite is never silent (a copy that would CLEAR a value starts unticked), select all/none, and what would NOT copy with the reason for each refusal (Uwazi's shows only the matches). 'Copy N properties' writes exactly the ticked set into the edit form — never saves — and stamps each copied field with `↳ copied from`."
                  code={`<CopyFromPicker target={entity} initialSource={source} resolveUnits={copyUnitsFor} onCopy={applyCopy} onClose={close} />
<CopyFieldRow match={plan.matches[0]} checked={checked} onChange={setChecked} />`}
                >
                  <div className="w-full max-w-md space-y-3">
                    <CopyFromPickerDemo step="properties" />
                    <CopyFieldRow match={CATALOG_COPY_PLAN.matches[0]} checked onChange={() => {}} />
                    <CopyFieldRow
                      match={CATALOG_COPY_PLAN.matches[1]}
                      checked={false}
                      onChange={() => {}}
                    />
                  </div>
                </CatalogEntry>
              </div>

              <div id="ev-connection-group-card" ref={reg("ev-connection-group-card")}>
                <CatalogEntry
                  name="ConnectionGroupCard · multi-inheritance"
                  description="One connection, many inherited columns. Sibling relationship fields sharing a connectionKey collapse into a single table — entities listed once (rows), each inherited property a column. Missing source values show an em-dash."
                  code={`const { groups } = groupConnections(relationshipFieldsByLanguage.EN, "EN");
<ConnectionGroupCard group={groups[0]} span="full" />`}
                >
                  <ConnectionGroupCardDemo />
                </CatalogEntry>
              </div>

              <div id="ev-relationship-field-card" ref={reg("ev-relationship-field-card")}>
                <CatalogEntry
                  name="RelationshipFieldCard · single-inheritance + link-only"
                  description="A standalone relationship field. Top: single-inheritance (Related cases → inherits Region, one row missing its value). Bottom: link-only (Rights invoked — connected entities, no inherited value, '· linked' caption)."
                  code={`<RelationshipFieldCard field={relCases} />   {/* inherits Region */}
<RelationshipFieldCard field={relRights} />  {/* link-only */}`}
                >
                  <RelationshipFieldCardDemo />
                </CatalogEntry>
              </div>

              <div id="ev-inherited-value-chip" ref={reg("ev-inherited-value-chip")}>
                <CatalogEntry
                  name="InheritedValueChip + RelationCaption"
                  description="One connected-entity row: an entity pill (opens the source preview) and its carbon-accented inherited value, or an em-dash when the source has none. RelationCaption is the shared provenance line used by every relationship card."
                  code={`<RelationCaption relationLabel="Cites" inheritLabel="Region" />
<InheritedValueChip value={v} inherits relationLabel="Cites" />`}
                >
                  <InheritedValueChipDemo />
                </CatalogEntry>
              </div>

              <div id="ev-relationship-field-editor" ref={reg("ev-relationship-field-editor")}>
                <CatalogEntry
                  name="RelationshipFieldEditor"
                  description="Edits one connection: add/remove connected entities (search filtered by target type). Inherited values are read-only previews — change the connection here, or edit the value at its source entity."
                  code={`<RelationshipFieldEditor
  title="People involved"
  relationLabel="Relates to"
  targetTypeId="person"
  columns={columns}
  entityIds={ids}
  onChange={setIds}
/>`}
                >
                  <RelationshipFieldEditorDemo />
                </CatalogEntry>
              </div>

              <div id="ev-thesaurus-picker" ref={reg("ev-thesaurus-picker")}>
                <CatalogEntry
                  name="ThesaurusPicker · AddThesaurusValueModal"
                  description="The edit form's editor for select and multiselect properties: the thesaurus's values as an inline list — search box, rows, 'N more' — built on FacetSection's bare flavour, so no popover and nothing for the drawer to clip. Chosen values sort to the top, carrying their group in the label. A select is the same list as a radio group. 'Add value' on the field's label row opens a one-field modal (focus trap, Escape) that writes to the shared thesauri store, so Settings › Thesauri and the Library facets see it; a label that folds to an existing value selects that one. In bulk the rows go tri-state with coverage ('4 of 12'). A property bound to no thesaurus offers 'Create thesaurus' in place of the list."
                  code={`<ThesaurusPicker
  label={field.label}
  values={thesaurus?.values ?? null}   // null = no thesaurus bound
  multiple={field.type === "multiselect"}
  chosen={chosenLabels(field)}
  mixed={mixedLabels}                  // bulk
  coverage={{ counts, of: ids.length }}  // bulk
  onToggle={toggle}
/>
<AddThesaurusValueModal thesaurusName={t.name} existing={labels} onSave={add} onClose={close} />`}
                >
                  <ThesaurusPickerDemo />
                </CatalogEntry>
              </div>

              <div id="ev-bulk-field-row" ref={reg("ev-bulk-field-row")}>
                <CatalogEntry
                  name="BulkFieldRow · bulk edit"
                  description="One property in the bulk edit form (MetadataEditBody with a bulk subject, in the Library's selection drawer). The label row says whether the selected entities agree: shared (the value is prefilled), mixed ('Mixed · 4 values', the editor starts empty), or will change (carbon dot, 'Will change', Revert). Only a field the user changed is written, with the same value for all. A multiselect or a connection is a list of tri-state rows with coverage: tick = add to all, untick = remove from all, mixed = untouched. The row order is fixed when the list opens, so a ticked row never jumps."
                  code={`<BulkFieldRow label={f.label} state={touched ? "changed" : shared ? "shared" : "mixed"} distinct={n} onRevert={revert}>
  <ThesaurusPicker multiple chosen={all} mixed={some} coverage={{ counts, of: ids.length }} onToggle={cycle} />
</BulkFieldRow>`}
                >
                  <BulkFieldRowsDemo />
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== ENTITY VIEW — FILES ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Entity View — Files</h2>
            <div className="flex flex-col gap-6">
              <div id="ev-file-table" ref={reg("ev-file-table")}>
                <CatalogEntry
                  name="FileTable"
                  description="Tabular file listing with checkboxes, type icons, and metadata columns"
                  code={`<FileTable
  files={files}
  selectedIds={new Set()}
  onSelect={(id) => {}}
  onSelectAll={() => {}}
/>`}
                >
                  <div className="w-full">
                    <FileTableDemo />
                  </div>
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== ENTITY VIEW — DRAWER ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Entity View — Drawer</h2>
            <div className="flex flex-col gap-6">
              <div id="ev-drawer-action-bar" ref={reg("ev-drawer-action-bar")}>
                <CatalogEntry
                  name="DrawerActionBar"
                  description="Context-sensitive action bar for drawer panels"
                  code={`<DrawerActionBar activeTab="metadata" />
<DrawerActionBar activeTab="references" />`}
                >
                  <div className="w-full flex flex-col gap-2">
                    <div className="border border-border/40 rounded-md overflow-hidden">
                      <DrawerActionBar activeTab="metadata" />
                    </div>
                    <div className="border border-border/40 rounded-md overflow-hidden">
                      <DrawerActionBar activeTab="references" />
                    </div>
                  </div>
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== IMPORT CSV — LAYOUT ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Import CSV — Layout</h2>
            <div className="flex flex-col gap-6">
              <div id="csv-sidebar" ref={reg("csv-sidebar")}>
                <CatalogEntry
                  name="SettingsNav · Import CSV rail"
                  description="The Tools rail, driven by settingsGroups — the same component and the same list the Settings rail uses, with Import CSV as the active destination. There is no separate ToolsSidebar: it was a hand-kept copy of these items whose rows only raised a toast, and its arrays had already drifted from the real ones."
                  code={`<SettingsNav onNavigate={handleNavigate} activeId="import-csv" />`}
                >
                  <div className="w-full h-96 border border-border/40 rounded-md overflow-hidden">
                    <SettingsNav activeId="import-csv" />
                  </div>
                </CatalogEntry>
              </div>

              <div id="csv-breadcrumb" ref={reg("csv-breadcrumb")}>
                <CatalogEntry
                  name="Breadcrumb"
                  description="Clickable navigation breadcrumb with chevron separators"
                  code={`<Breadcrumb segments={[
  { label: "Import CSV", onClick: () => {} },
  { label: "cases.csv" },
]} />`}
                >
                  <div className="flex flex-col gap-3">
                    <Breadcrumb segments={[{ label: "Import CSV" }]} />
                    <Breadcrumb segments={[
                      { label: "Import CSV", onClick: () => {} },
                      { label: "cases.csv" },
                    ]} />
                    <Breadcrumb segments={[
                      { label: "Import CSV", onClick: () => {} },
                      { label: "Settings", onClick: () => {} },
                      { label: "Advanced" },
                    ]} />
                  </div>
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== IMPORT CSV — COMPONENTS ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Import CSV — Components</h2>
            <div className="flex flex-col gap-6">
              <div id="csv-status-badge" ref={reg("csv-status-badge")}>
                <CatalogEntry
                  name="StatusBadge"
                  description="An import's status in Uwazi's words: the stage while it runs, then Completed, Completed with errors, Failed or Cancelled."
                  code={`<StatusBadge status="queued" />
<StatusBadge status="entities" />
<StatusBadge status="completed" />
<StatusBadge status="completed" rowsFailed={2} />
<StatusBadge status="failed" />
<StatusBadge status="cancelled" />`}
                  tailwind="inline-flex w-fit px-2 py-0.5 text-meta font-medium rounded-md"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status="queued" />
                    <StatusBadge status="entities" />
                    <StatusBadge status="completed" />
                    <StatusBadge status="completed" rowsFailed={2} />
                    <StatusBadge status="failed" />
                    <StatusBadge status="cancelled" />
                  </div>
                </CatalogEntry>
              </div>

              <div id="csv-progress-bar" ref={reg("csv-progress-bar")}>
                <CatalogEntry
                  name="ProgressBar"
                  description="Horizontal bar with color variants and optional percentage label"
                  code={`<ProgressBar value={75} color="green" showLabel />
<ProgressBar value={45} color="blue" showLabel size="md" />
<ProgressBar value={30} color="red" />`}
                >
                  <div className="flex flex-col gap-4 w-full max-w-sm">
                    <div>
                      <span className="text-meta text-ink-muted mb-1 block">Green (completed)</span>
                      <ProgressBar value={100} color="green" showLabel />
                    </div>
                    <div>
                      <span className="text-meta text-ink-muted mb-1 block">Blue (processing) — md</span>
                      <ProgressBar value={64} color="blue" showLabel size="md" />
                    </div>
                    <div>
                      <span className="text-meta text-ink-muted mb-1 block">Red (failed)</span>
                      <ProgressBar value={37} color="red" showLabel />
                    </div>
                    <div>
                      <span className="text-meta text-ink-muted mb-1 block">No label</span>
                      <ProgressBar value={50} color="blue" />
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="csv-stats-card" ref={reg("csv-stats-card")}>
                <CatalogEntry
                  name="StatsCard"
                  description="Bordered card with label and large value, optional colored dot accent"
                  code={`<StatsCard label="Entities" value="847" accent="blue" />
<StatsCard label="Failed" value={0} />
<StatsCard label="Warnings" value={12} accent="amber" />
<StatsCard label="Errors" value={3} accent="red" />`}
                >
                  <div className="grid grid-cols-4 gap-3 w-full">
                    <StatsCard label="Entities" value="847" accent="blue" />
                    <StatsCard label="Failed" value={0} />
                    <StatsCard label="Warnings" value={12} accent="amber" />
                    <StatsCard label="Errors" value={3} accent="red" />
                  </div>
                </CatalogEntry>
              </div>

              <div id="csv-stepper" ref={reg("csv-stepper")}>
                <CatalogEntry
                  name="Stepper"
                  description="3-step progress indicator with completed, active, and upcoming states"
                  code={`<Stepper steps={[
  { label: "Upload", state: "completed" },
  { label: "Process", state: "active" },
  { label: "Complete", state: "upcoming" },
]} />`}
                >
                  <div className="flex flex-col gap-4 w-full">
                    <div className="px-4 py-3 rounded-lg bg-paper" style={{ border: "1px solid var(--border-primary)" }}>
                      <Stepper steps={[
                        { label: "Upload", state: "active" },
                        { label: "Process", state: "upcoming" },
                        { label: "Complete", state: "upcoming" },
                      ]} />
                    </div>
                    <div className="px-4 py-3 rounded-lg bg-paper" style={{ border: "1px solid var(--border-primary)" }}>
                      <Stepper steps={[
                        { label: "Upload", state: "completed" },
                        { label: "Process", state: "active" },
                        { label: "Complete", state: "upcoming" },
                      ]} />
                    </div>
                    <div className="px-4 py-3 rounded-lg bg-paper" style={{ border: "1px solid var(--border-primary)" }}>
                      <Stepper steps={[
                        { label: "Upload", state: "completed" },
                        { label: "Process", state: "completed" },
                        { label: "Complete", state: "completed" },
                      ]} />
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="csv-alert-banner" ref={reg("csv-alert-banner")}>
                <CatalogEntry
                  name="AlertBanner"
                  description="Warning (amber) and error (red) banners with icon and message"
                  code={`<AlertBanner variant="warning">
  3 warnings detected — review issues below.
</AlertBanner>

<AlertBanner variant="error">
  Import failed — 3 errors encountered.
</AlertBanner>`}
                >
                  <div className="flex flex-col gap-3 w-full">
                    <AlertBanner variant="warning">
                      3 warnings detected — review the issues below. Entities were imported but some fields may need attention.
                    </AlertBanner>
                    <AlertBanner variant="error">
                      Import failed — 3 errors encountered. Review the issues below and re-import the file.
                    </AlertBanner>
                  </div>
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== FILTERS & LISTS ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Filters & Lists</h2>
            <div className="flex flex-col gap-6">

              <div id="fl-filters-button" ref={reg("fl-filters-button")}>
                <CatalogEntry
                  name="FiltersButton"
                  description="Trigger button for the filters slide-over with active-count badge"
                  code={`<FiltersButton activeCount={0} onClick={...} />
<FiltersButton activeCount={3} onClick={...} size="sm" />`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <FiltersButton activeCount={0} onClick={() => {}} />
                    <FiltersButton activeCount={1} onClick={() => {}} />
                    <FiltersButton activeCount={5} onClick={() => {}} />
                    <FiltersButton activeCount={0} onClick={() => {}} size="sm" />
                    <FiltersButton activeCount={3} onClick={() => {}} size="sm" />
                  </div>
                </CatalogEntry>
              </div>

              <div id="fl-filters-drawer" ref={reg("fl-filters-drawer")}>
                <CatalogEntry
                  name="FiltersSlideOver"
                  description="Slide-over panel scoped to the nearest relative overflow-hidden parent"
                  code={`<FiltersSlideOver open={open} onClose={() => setOpen(false)}>
  {/* facet content */}
</FiltersSlideOver>`}
                >
                  <FiltersSlideOverDemo />
                </CatalogEntry>
              </div>

              <div id="fl-facet-section" ref={reg("fl-facet-section")}>
                <CatalogEntry
                  name="FacetSection"
                  description="Collapsible facet block with checkbox options (used inside FiltersSlideOver)"
                  code={`<FacetSection
  title="Relationship type"
  options={[{ id: "cites", label: "Cites" }, ...]}
  selected={selected}
  onToggle={(id) => ...}
/>`}
                >
                  <FacetSectionDemo />
                </CatalogEntry>
              </div>

              <div id="fl-active-filter-chip" ref={reg("fl-active-filter-chip")}>
                <CatalogEntry
                  name="ActiveFilterChip"
                  description="Small pill representing a single active filter; X removes it"
                  code={`<ActiveFilterChip label="Cites" onRemove={...} />
<ActiveFilterChip label="Person" color="#7C3AED" onRemove={...} />`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ActiveFilterChip label="Cites" onRemove={() => {}} />
                    <ActiveFilterChip label="Person" color="#7C3AED" onRemove={() => {}} />
                    <ActiveFilterChip label="Country" color="#16A34A" onRemove={() => {}} />
                    <ActiveFilterChip label={'"rights"'} onRemove={() => {}} />
                  </div>
                </CatalogEntry>
              </div>

              <div id="fl-toggle-chip" ref={reg("fl-toggle-chip")}>
                <CatalogEntry
                  name="ToggleChip"
                  description="ActiveFilterChip's toggleable sibling — same chip, aria-pressed instead of an X. Off drops the fill."
                  code={`<ToggleChip label="Document" count={658} active={on} onToggle={...} />`}
                >
                  <ToggleChipDemo />
                </CatalogEntry>
              </div>

              <div id="fl-modal" ref={reg("fl-modal")}>
                <CatalogEntry
                  name="Modal"
                  description="The one modal shell: bg-overlay scrim, bordered paper panel (sm 28 / md 32 / lg 40 / xl 48rem; full screen below md except sm), 3rem header with inline subtitle and close, body on the main gutter, 3rem footer with one commit and ghosts. Focus trap, Escape and aria built in."
                  code={`<Modal size="md" title="Upload 2 documents" onClose={close}
  footer={<><button className={ghost}>Cancel</button><button className={MODAL_COMMIT}>Upload</button></>}>
  …body…
</Modal>`}
                >
                  <ModalDemo />
                </CatalogEntry>
              </div>

              <div id="fl-modal-parts" ref={reg("fl-modal-parts")}>
                <CatalogEntry
                  name="ModalParts"
                  description="What goes inside a modal body, so every picker reads the same: ModalSearchRow (search field + optional trailing scope control), ModalList + ModalListRow (one 2.25rem row: leading mark, title, chip, trailing meta; button, label-around-control or static), ModalSectionLabel, ModalField (label, control, always-mounted hint), ModalStatus (the empty line), and MODAL_INPUT / MODAL_LABEL for controls."
                  code={`<ModalSearchRow value={q} onChange={setQ} placeholder="Search templates" ariaLabel="Search templates" />
<ModalList>
  <ModalListRow onClick={choose} leading={<ModalTypeDot color={c} />} title="Person" meta="Default" />
</ModalList>`}
                >
                  <ModalPartsDemo />
                </CatalogEntry>
              </div>

              <div id="fl-action-bar" ref={reg("fl-action-bar")}>
                <CatalogEntry
                  name="Action bar weight"
                  description="One lead (BAR_LEAD, vellum) or one ink commit per bar, no borders on any bar button; every other action is a ghost (BAR_GHOST), Delete is seal text (BAR_DANGER), and groups split on a BarDivider."
                  code={`<button className={BAR_LEAD}>Edit</button>
<button className={BAR_GHOST}>Share</button>
<BarDivider />
<button className={BAR_DANGER}>Delete</button>`}
                >
                  <div data-gutter-host className="gutter-host">
                    <div
                      className="bleed flex items-center gap-1 h-12 bg-paper"
                      style={{ borderTop: "1px solid var(--border-primary)" }}
                    >
                      <span className="text-xs font-semibold text-ink tabular-nums me-2">3 selected</span>
                      <button type="button" className={`px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md`}>Clear</button>
                      <BarDivider />
                      <button type="button" className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_LEAD} rounded-md`}>
                        <Pencil size={13} className="text-ink-tertiary" /> Edit
                      </button>
                      <button type="button" className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md`}>
                        <Share2 size={13} className="text-ink-tertiary" /> Share
                      </button>
                      <BarDivider />
                      <button type="button" className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_DANGER} rounded-md`}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="fl-collapse-controls" ref={reg("fl-collapse-controls")}>
                <CatalogEntry
                  name="CollapseControls"
                  description="Collapse all / Expand all pair; disabled prop overrides atom-driven logic"
                  code={`<CollapseControls
  onCollapseAll={...}
  onExpandAll={...}
  disabled={viewMode === "all"}
/>`}
                >
                  <CollapseControlsDemo />
                </CatalogEntry>
              </div>

              <div id="fl-list-info-row" ref={reg("fl-list-info-row")}>
                <CatalogEntry
                  name="ListInfoRow"
                  description="Count + 'Filters:' + ActiveFilterChips + rightSlot. One row under the toolbar."
                  code={`<ListInfoRow
  count={<><b>221</b> references</>}
  activeFilterCount={activeFilterCount}
  rightSlot={<CollapseControls ... />}
/>`}
                >
                  <ListInfoRowDemo />
                </CatalogEntry>
              </div>

              <div id="fl-list-card-row" ref={reg("fl-list-card-row")}>
                <CatalogEntry
                  name="ListCardRow"
                  description="Shell for list rows — owns selected (bg-parchment), cursor, border-b, px-3 py-2.5. With onClick it renders the stretched primary-action button; without one the row is chrome (no tab stop, no pointer)."
                  code={`<ListCardRow selected={selected} onClick={...}>
  {/* row content */}
</ListCardRow>`}
                >
                  <div className="w-full max-w-md border border-border/60 rounded-md overflow-hidden bg-paper">
                    <ListCardRow selected={false} onClick={() => {}}>
                      <span className="text-xs text-ink">Default row — click me</span>
                    </ListCardRow>
                    <ListCardRow selected={true} onClick={() => {}}>
                      <span className="text-xs text-ink">Selected row (bg-parchment)</span>
                    </ListCardRow>
                    <ListCardRow selected={false} onClick={() => {}}>
                      <span className="text-xs text-ink">Another default row</span>
                    </ListCardRow>
                  </div>
                </CatalogEntry>
              </div>

              <div id="fl-checkbox" ref={reg("fl-checkbox")}>
                <CatalogEntry
                  name="Checkbox"
                  description="Shared native checkbox primitive — used by FacetSection and FileTable. Accent-color adapts to dark mode."
                  code={`<Checkbox
  checked={checked}
  onChange={(e) => setChecked(e.target.checked)}
  ariaLabel="Select"
/>`}
                >
                  <CheckboxesDemo />
                </CatalogEntry>
              </div>

              <div id="fl-wordmark" ref={reg("fl-wordmark")}>
                <CatalogEntry
                  name="Wordmark"
                  description="The Uwazi wordmark at the navbar's size. Used by the navbar, this catalog's header and the login screen; inverts in dark mode."
                  code={`<Wordmark />`}
                >
                  <Wordmark />
                </CatalogEntry>
              </div>

              <div id="fl-zoom-control" ref={reg("fl-zoom-control")}>
                <CatalogEntry
                  name="ZoomControl"
                  description="Segmented detail/compact/overview + graph toggle for the Relationships view"
                  code={`<ZoomControl />

{/* Bound to relZoomAtom */}`}
                >
                  <ZoomControlDemo />
                </CatalogEntry>
              </div>

              <div id="fl-fade-truncate" ref={reg("fl-fade-truncate")}>
                <CatalogEntry
                  name="FadeTruncate"
                  description="Clamp text to N lines with a gradient fade; optional expand button"
                  code={`<FadeTruncate text={longString} maxLines={2} expandable />`}
                >
                  <div className="w-full max-w-md">
                    <FadeTruncate
                      text="The Inter-American Commission on Human Rights received the petition on February 15, 1993, alleging systemic abuses under the military regime and invoking the American Convention to request provisional measures on behalf of the named detainees."
                      maxLines={2}
                      expandable
                      className="text-xs text-ink-secondary leading-relaxed"
                    />
                  </div>
                </CatalogEntry>
              </div>

              <div id="fl-select-controls" ref={reg("fl-select-controls")}>
                <CatalogEntry
                  name="SelectControls"
                  description="Select all / Deselect all pair, scoped to (totalCount, selectedCount). Each button greys out when its action would be a no-op. Shared between FilesActionBar and RelationshipsActionBar."
                  code={`<SelectControls
  allSelected={allSelected}
  hasSelection={selectedCount > 0}
  totalCount={total}
  onSelectAll={() => {}}
  onDeselectAll={() => {}}
/>`}
                >
                  <SelectControlsDemo />
                </CatalogEntry>
              </div>

              <div id="fl-selection-actions-menu" ref={reg("fl-selection-actions-menu")}>
                <CatalogEntry
                  name="SelectionActionsMenu"
                  description="The selection drawer's Actions: the footer bar's actions that don't fit a 24rem footer — Change template, Export CSV, Share, Permissions, and Delete last after a separator, in seal. The same list the bar and the phone sheet show (useSelectionActions), firing the same dialogs. role=menu: arrows move, Escape closes and returns focus. Opens upward; disabled items stay, saying why."
                  code={`const actions = useSelectionActions({ order: ids, corpus });
<SelectionActionsMenu actions={actions.filter((a) => a.id !== "edit")} />`}
                >
                  <SelectionActionsMenuDemo />
                </CatalogEntry>
              </div>

              <div id="fl-change-template" ref={reg("fl-change-template")}>
                <CatalogEntry
                  name="ChangeTemplateDialog"
                  description="Change the template of a selection. One decision with a consequence list: pick the target, and per source template it lists what is KEPT (same property name, type and thesaurus), DROPPED (with how many values go, amber) and NEW (empty). Entities already on the target are skipped and counted. The warning line is always mounted; the confirm is seal when values are deleted. Undo restores templates and values; over 200 entities it runs as a Beacon task."
                  code={`<ChangeTemplateDialog ids={[...selection]} corpus={corpus} types={types} onClose={close} />`}
                >
                  <ChangeTemplateDemo />
                </CatalogEntry>
              </div>

              <div id="fl-share-bulk" ref={reg("fl-share-bulk")}>
                <CatalogEntry
                  name="ShareEntityModal · selection"
                  description="Share and Permissions over a selection — the one Share modal, given ids. Share focuses general access, Permissions the people lookup. Where the entities disagree it says so: 'Mixed access · 7 published, 5 private' with neither option checked; member rows carry coverage ('4 of 12') and 'Mixed access' for differing levels. A fixed first row, Administrators and Editors, can always edit. Only changed rows are written ('Will change · added to 8', with revert); Save opens a review in the same panel, and Apply records Undo. Publishing patches the entity, so the Status facet follows."
                  code={`<ShareEntityModal open onClose={close} ids={[...selection]} initialFocus="access" />   // Share
<ShareEntityModal open onClose={close} ids={[...selection]} initialFocus="people" />   // Permissions`}
                >
                  <ShareSelectionDemo />
                </CatalogEntry>
              </div>

            </div>
          </section>

          {/* ==================== RELATIONSHIPS ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Entity View — Relationships</h2>
            <div className="flex flex-col gap-6">
              <div id="relationship-row-aggregate" ref={reg("relationship-row-aggregate")}>
                <CatalogEntry
                  name="RelationshipRow · aggregate"
                  description="Aggregate row variant — entity pill, evidence count badge, direction + rel label. The entity (pill at overview, title at compact/detail) opens the overlay; the count jumps into the refs cluster, or expands them in place inside the tree."
                  code={`<RelationshipRow
  kind="aggregate"
  rel={rel}
/>

{/* rel comes from deriveRelationships(references) */}`}
                >
                  <RelationshipRowAggregateDemo />
                </CatalogEntry>
              </div>

              <div id="relationship-row-hub" ref={reg("relationship-row-hub")}>
                <CatalogEntry
                  name="RelationshipRow · hub"
                  description="N-ary hub row — multiple member pills, evidence count badge, no direction (hubs are symmetric). Each member pill opens its own entity; a hub has no single one, so the row has no open of its own. Rendered when refs share a hubId."
                  code={`<RelationshipRow kind="hub" hub={hub} />

{/* hub comes from deriveHubs(references) */}`}
                >
                  <RelationshipRowHubDemo />
                </CatalogEntry>
              </div>

              <div id="relationship-grouped-card-aggregate" ref={reg("relationship-grouped-card-aggregate")}>
                <CatalogEntry
                  name="RelationshipGroupedCard · aggregate"
                  description="Same group primitive holding aggregate rows. Responds to expand/collapse signal atoms."
                  code={`<RelationshipGroupedCard
  title="Person"
  color="#8b5cf6"
  count={rels.length}
  defaultExpanded
>
  {rels.map((rel) => (
    <RelationshipRow kind="aggregate" rel={rel} />
  ))}
</RelationshipGroupedCard>`}
                >
                  <RelationshipGroupedCardAggregateDemo />
                </CatalogEntry>
              </div>

              <div id="view-controls" ref={reg("view-controls")}>
                <CatalogEntry
                  name="ViewControls"
                  description="Presentation toggle for the merged Relationships panel: list / tree / graph / when."
                  code={`<ViewControls />`}
                >
                  <ViewControlsDemo />
                </CatalogEntry>
              </div>

              <div id="year-strip" ref={reg("year-strip")}>
                <CatalogEntry
                  name="YearStrip"
                  description="The When view's events per year — one bar per year across the span, empty years included. Click narrows to a year, Shift+click extends, the chip clears. The chip's line is always mounted, so choosing a range moves nothing."
                  code={`<YearStrip years={[{ year: 1995, count: 3 }, …]} range={range} onChange={setRange} />`}
                >
                  <YearStripDemo />
                </CatalogEntry>
              </div>

              <div id="event-row" ref={reg("event-row")}>
                <CatalogEntry
                  name="EventRow"
                  description="One line of the When spine. The entity's own dates print their label in ink; a connected entity's print its pill (opens the preview), the date's label and the relation that reached it (+N when several). A span prints its years."
                  code={`<EventRow event={event} selected={event.entityId === previewing} />`}
                >
                  <EventRowDemo />
                </CatalogEntry>
              </div>

              <div id="direction-glyph" ref={reg("direction-glyph")}>
                <CatalogEntry
                  name="DirectionGlyph"
                  description="Shared arrow badge — outgoing, incoming, or bidirectional ('both'). The 'both' variant lights up on aggregate rows whose backing refs cover both directions on the same (target, relationType)."
                  code={`<DirectionGlyph direction="outgoing" />
<DirectionGlyph direction="incoming" size="md" />
<DirectionGlyph direction="both" />`}
                >
                  <DirectionGlyphDemo />
                </CatalogEntry>
              </div>

              <div id="row-checkbox" ref={reg("row-checkbox")}>
                <CatalogEntry
                  name="RowCheckbox"
                  description="Per-row checkbox gated behind relEditModeAtom. Aggregate / hub rows pass every backing refId; toggling adds or removes the whole set atomically against selectedRefIdsAtom."
                  code={`<RowCheckbox refIds={[reference.id]} />
<RowCheckbox refIds={rel.refIds} />`}
                >
                  <RowCheckboxDemo />
                </CatalogEntry>
              </div>

              <div id="relationships-action-bar" ref={reg("relationships-action-bar")}>
                <CatalogEntry
                  name="RelationshipsActionBar"
                  description="Bottom action bar with Edit toggle. View mode shows just Edit; edit mode reveals Create relationship, Manage types, Select all/Deselect all on the left, and selection count + Delete + Cancel + Save on the right."
                  code={`<RelationshipsActionBar />`}
                >
                  <RelationshipsActionBarDemo />
                </CatalogEntry>
              </div>

              <div id="manage-relation-types-modal" ref={reg("manage-relation-types-modal")}>
                <CatalogEntry
                  name="ManageRelationTypesModal"
                  description="CRUD for the relation-type registry. Add via slugified id; delete reassigns orphaned references to the no_label fallback. The fallback type is non-deletable."
                  code={`<ManageRelationTypesModal />

{/* Open from anywhere by writing manageRelationTypesOpenAtom */}`}
                >
                  <ManageRelationTypesModalDemo />
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== SHARED ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Shared</h2>
            <div className="flex flex-col gap-6">
              <div id="sh-view-switcher" ref={reg("sh-view-switcher")}>
                <CatalogEntry
                  name="ViewSwitcher"
                  description="The Library's view switcher: the same dropdown Sort and Language use, so the toolbar reads as three of one control rather than two dropdowns flanking a segmented widget. 124.55px against the bare icon rail's 156px, constant across all five views because Select's `steady` reserves the widest option — this row is Sort · View · Display · Language, and a trigger that resized with its value would shove every control beside it. The cost is a menu: one click became two."
                  code={`<ViewSwitcher value={viewMode} onChange={setViewMode} />

{/* Width held by Select's steady prop — reserves the widest label. */}`}
                >
                  <ViewSwitcherDemo />
                </CatalogEntry>
              </div>

              <div id="sh-pin-toggle" ref={reg("sh-pin-toggle")}>
                <CatalogEntry
                  name="PinToggle"
                  description="Pins a record to the collection's case, or takes it out. `icon` sits in a Library card's footer and beside a relationship row's entity pill: hidden until the card or row is hovered or focused, always shown once pinned, and always shown on a phone. `label` is the entity header's Pin / Pinned, both words held in one slot so the button keeps its width. The pins here are live: they land in the case of the collection shown."
                  code={`<PinToggle entityId={id} title={title} reveal />
<PinToggle entityId={id} title={title} variant="label" />`}
                >
                  <PinToggleDemo />
                </CatalogEntry>
              </div>

              <div id="sh-saved-views" ref={reg("sh-saved-views")}>
                <CatalogEntry
                  name="SavedViewsMenu · SavedViewsPanel"
                  description="The Library masthead's Views menu: save the filters, search, sort, view and display as a named view per collection (localStorage), open one to restore it exactly, rename, delete, or copy a link whose hash (#view=…) restores it on load. Below, the last 20 searches with the filters they ran under (sessionStorage), each opening that state. On phones it is a bottom sheet."
                  code={`<SavedViewsMenu />   // masthead, beside Display
<SavedViewsPanel onDone={close} />`}
                >
                  <div className="w-80 rounded-md border border-border bg-paper p-1">
                    <SavedViewsPanel />
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-case-panel" ref={reg("sh-case-panel")}>
                <CatalogEntry
                  name="CasePanel · CaseBody"
                  description="The case: a named set of pinned records and markdown notes per collection, kept in localStorage. Pinned lists each record with its template, status and how many passages it is quoted in; Citations is the list the exports carry (title, address, publisher, date, status, quote, page anchor). Footer: Copy citations as text, Markdown download, CSV of the pinned records. A slide-over from the navbar's Case button on desktop, a sheet on phones. Live: it shows the case of the collection shown."
                  code={`<CaseButton rtl={rtl} compact={isMobile} />   // navbar; mounts CasePanel
<CaseBody onClose={close} />`}
                >
                  <div data-gutter-host className="gutter-host-main flex flex-col h-[32rem] w-[26rem] max-w-full rounded-md border border-border bg-paper overflow-hidden">
                    <CaseBody />
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-pages-editor" ref={reg("sh-pages-editor")}>
                <CatalogEntry
                  name="Pages editor · LangSwitch + SyntaxBadge"
                  description="Settings › Pages. LangSwitch picks the language being edited: one tab stop, arrow keys move the choice, and a dot marks a language that already has content, so an empty one shows before you open it. SyntaxBadge says which of Uwazi's two component syntaxes a component takes — an HTML-style tag or the older {name}(options) extension — because nothing in Uwazi's editor says so today."
                  code={`<LangSwitch value={lang} onChange={setLang} filled={(l) => !!draft[l].html.trim()} />
<SyntaxBadge syntax="jsx" />   // <EntityInfo …/>
<SyntaxBadge syntax="ext" />   // {link}(…)`}
                >
                  <PagesEditorDemo />
                </CatalogEntry>
              </div>

              <div id="sh-provenance-line" ref={reg("sh-provenance-line")}>
                <CatalogEntry
                  name="ProvenanceLine"
                  description="The app's SINGLE provenance idiom — one ↳ mark for every 'this did not originate here' statement. The library attributes a passage to the document it was quoted from (↳ from), metadata names the hops an inherited value was reached through (↳ via, clickable), and Copy From names the entity a staged value came off (↳ copied from). Same glyph, same quiet 11px tertiary type, so the mark is learned once. `inline` rides an existing line rather than occupying one — a line that appears and disappears would shift the rows under the reader."
                  code={`<ProvenanceLine label="from">Caso Gelman vs. Uruguay</ProvenanceLine>
<ProvenanceLine label="via">{hops.map(...)}</ProvenanceLine>
<ProvenanceLine label="copied from"><EntityPill typeId="country" label="Argentina" /></ProvenanceLine>`}
                >
                  <div className="w-full max-w-md space-y-3">
                    <ProvenanceLine label="from">Bámaca-Velásquez v. Guatemala</ProvenanceLine>
                    <ProvenanceLine label="via">
                      <button className="min-w-0 truncate text-carbon hover:underline cursor-pointer">
                        Sentencia de 25 de noviembre de 2000
                      </button>
                    </ProvenanceLine>
                    <ProvenanceLine label="copied from">
                      <EntityPill typeId="country" label="Argentina" />
                    </ProvenanceLine>
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-field-message" ref={reg("sh-field-message")}>
                <CatalogEntry
                  name="FieldMessage"
                  description="The ONE per-field validation line — the entity metadata edit form and the settings forms both render it, so an error reads the same everywhere. Seal message + seal-tinted input border = error (blocks save); amber pair = warning (saving allowed). `reserve` keeps the line mounted at its height while empty so a message landing on blur never shoves the fields below it. Inputs link it via aria-describedby (+ aria-invalid on errors); role='alert' is reserved for the save-attempt summary."
                  code={`<FieldMessage issue={issues[field.id]} reserve />

{/* input border tinted to match: */}
className={\`… border \${issueBorderClass(issues[field.id])} …\`}`}
                >
                  <div className="w-full max-w-sm space-y-3">
                    {(
                      [
                        { label: "Title", value: "", issue: { severity: "error", message: "Title is required." } },
                        { label: "Date filed", value: "2031-01-01", issue: { severity: "warning", message: "Date filed is more than a year in the future." } },
                        { label: "Country", value: "Honduras", issue: null },
                      ] as const
                    ).map(({ label, value, issue }) => (
                      <div key={label} className="space-y-1.5">
                        <span className="text-sm font-bold text-ink">{label}</span>
                        <input
                          type="text"
                          readOnly
                          value={value}
                          aria-invalid={issue?.severity === "error" || undefined}
                          className={`w-full px-3 py-2 text-sm text-ink bg-paper border ${issueBorderClass(issue)} rounded-md focus:outline-none focus:ring-2 focus:ring-carbon/20`}
                        />
                        <FieldMessage issue={issue} reserve />
                      </div>
                    ))}
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-borrowed-doc-line" ref={reg("sh-borrowed-doc-line")}>
                <CatalogEntry
                  name="BorrowedDocLine"
                  description="↳ from <document> — the passages beside it were quoted from a document the result doesn't own. A case with no PDF of its own reads a connected judgment's, so hundreds of results can quote the same page of the same file; unattributed that reads as duplicates or a bug. Renders NOTHING for an entity's own document, so it must ride a line that is mounted either way."
                  code={`<BorrowedDocLine from={snippets.borrowedFrom} />

{/* null → renders nothing; host line stays put. */}`}
                >
                  <div className="w-full max-w-md space-y-2">
                    <SectionLabel as="p">
                      Document
                      <BorrowedDocLine from={{ entityId: "e-1", title: "Velásquez-Rodríguez v. Honduras" }} />
                    </SectionLabel>
                    <SectionLabel as="p">
                      Document
                      <BorrowedDocLine from={null} />
                    </SectionLabel>
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-pdf-page-thumb" ref={reg("sh-pdf-page-thumb")}>
                <CatalogEntry
                  name="PdfPageThumb"
                  description="Page one of the real PDF in the cropped-sheet frame — the WHOLE page fitted to width. A 1.8× masthead crop was tried and rejected on sight: legible, but it read as a fragment jammed against the top edge rather than a document. Rasterised only once on screen and cached per (url, width); the blank sheet is both the placeholder and what a failed render looks like, which is why `npm run check:thumbs` exists."
                  code={`<PdfPageThumb url={file.url} ext="pdf" />
<PdfPageThumb url={file.url} size="sm" />   {/* 36px list thumb */}`}
                >
                  <div className="flex items-end gap-4">
                    <div className="w-9 h-9 rounded overflow-hidden">
                      <PdfPageThumb url={CATALOG_PDF} size="sm" />
                    </div>
                    <div className="w-[17.5rem] h-24 rounded overflow-hidden border border-border/60">
                      <PdfPageThumb url={CATALOG_PDF} ext="pdf" />
                    </div>
                    <div className="w-[17.5rem] h-24 rounded overflow-hidden border border-border/60">
                      <PdfPageThumb ext="pdf" />
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-entity-type-swatch" ref={reg("sh-entity-type-swatch")}>
                <CatalogEntry
                  name="EntityTypeTag · swatch"
                  description="The dot-only template indicator for dense rows, expanding to the tinted pill on hover. Its label never uses the raw type colour: utils/typeColor.ts (typeLabelColor) mixes saturated colours toward ink by --label-mix and sends pale ones to ink, so 12px text clears AA in both themes. The dot keeps the true colour. EntityPill shows the same treatment permanently."
                  code={`<EntityTypeTag variant="swatch" typeId={entity.typeId} />

{/* The shared rule, one implementation: */}
const textColor = typeLabelColor(type.color);`}
                >
                  <div className="w-full max-w-md space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {entityTypes.map((t) => (
                        <EntityTypeTag variant="swatch" key={t.id} typeId={t.id} />
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {entityTypes.map((t) => (
                        <EntityPill key={t.id} typeId={t.id} />
                      ))}
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-section-label" ref={reg("sh-section-label")}>
                <CatalogEntry
                  name="SectionLabel"
                  description="The small uppercase label introducing a group of content — 'Properties' over a card's field hits, 'Document' over its page hits, 'Tasks · 3' over the notification drawer's running work. Replaced four separately-written components of the same name that agreed on size and weight and nothing else (three tracking-wide against one -wider, two ink-tertiary against two ink-muted). Typography is fixed; className takes the BOX only — padding, a sticky ground — so where a label sits stays the caller's while what it looks like can't vary. ink-tertiary, not -muted: at 10px this is small text by WCAG's measure and muted lands under AA. `as` is the one other thing a caller owns, and only because several of the labels it replaced were real h3/h4 headings — rendering those as a span would have quietly deleted them from the document outline."
                  code={`<SectionLabel>Properties</SectionLabel>
<SectionLabel icon={<Tag size={11} />}>Properties</SectionLabel>

{/* The box is the caller's — a sticky group header: */}
<SectionLabel className="sticky top-0 z-10 bg-warm px-4 pt-3 pb-1.5">
  Tasks · 3
</SectionLabel>`}
                >
                  <div className="flex flex-col gap-3 w-full max-w-md">
                    <SectionLabel>Properties</SectionLabel>
                    <SectionLabel icon={<Tag size={11} />}>Properties</SectionLabel>
                    <SectionLabel icon={<FileText size={11} />}>Document</SectionLabel>
                    <div className="h-24 overflow-auto bg-warm rounded-md">
                      <SectionLabel className="sticky top-0 z-10 bg-warm px-4 pt-3 pb-1.5">
                        Tasks · 3
                      </SectionLabel>
                      <ul className="px-4 pb-3 space-y-2">
                        {Array.from({ length: 6 }, (_, i) => (
                          <li key={i} className="text-xs text-ink-secondary">
                            Reprocessing document {i + 1}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-filter-card" ref={reg("sh-filter-card")}>
                <CatalogEntry
                  name="FilterCard"
                  description="The filter panel's parts: paper cards on a warm rail (FILTER_RAIL), one header (title, ticked count, Clear while the card narrows), one 28px value row (checkbox, marker, label, count; a 0 row is dimmed and cannot be ticked, a ticked one stays live), the search box, the Match line (SegmentRow) and Load N more. The Library's Filters and the Relationships filters (drawer tab, slide-over, phone sheet) both draw with these, so the two panels cannot drift. FilterListCard also takes a pinned No label row and thesaurus groups."
                  code={`<div className={FILTER_RAIL}>
  <FilterListCard
    title="Target country"
    entries={entries}          // [id, count][], in the collection's order
    selected={selected}
    onToggle={toggle}
    onClear={clear}
    searchable
    match={<SegmentRow caption="Match" … />}
  />
  <FilterCard title="As of" stack>{dateField}</FilterCard>
</div>`}
                >
                  <FilterCardDemo />
                </CatalogEntry>
              </div>

              <div id="sh-match-mode-toggle" ref={reg("sh-match-mode-toggle")}>
                <CatalogEntry
                  name="MatchModeToggle"
                  description="The AND/OR segmented control that says how a facet's ticked values combine — every one of them, or any one of them. Replaced two separately-written copies (FacetSection's drawer flavour after a 'Match' caption, and the Library keyword card's bare one in a header row) that had drifted into the same pixels by coincidence rather than by reference. Neither named itself: two buttons reading AND and OR with nothing saying what they switch, and the current mode carried by a background tint alone. This one puts a named role='group' on the pair and aria-pressed on the segments, so the mode is announced rather than merely tinted."
                  code={`{/* Drawer flavour — the caption is the only difference. */}
<MatchModeToggle mode={mode} onChange={setMode} label="Match" />

{/* Header flavour — the card title already names the facet, so the
    group takes its accessible name instead of a visible caption. */}
<MatchModeToggle mode={mode} onChange={setMode} groupLabel="Match mode for Countries" />`}
                >
                  <div className="flex flex-col gap-3 w-full max-w-md">
                    <MatchModeToggle mode={matchMode} onChange={setMatchMode} label="Match" />
                    <MatchModeToggle
                      mode={matchMode}
                      onChange={setMatchMode}
                      groupLabel="Match mode for Countries"
                    />
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-highlighted-text" ref={reg("sh-highlighted-text")}>
                <CatalogEntry
                  name="HighlightedText"
                  description="Wraps case-insensitive query matches in the shared search-highlight mark. Used across the Library query surfaces (cards, table, timeline) and the Results-tab snippets — one visual family with document highlights. Paints without shifting layout (px-0.5 cancelled by -mx-0.5, no weight change) so wrapping is identical to plain text; RTL-safe."
                  code={`<HighlightedText text={entity.title} query={q} />

{/* Empty query → text unchanged (drop-in for {text}). */}
{/* Mark: rounded-[2px] px-0.5 -mx-0.5 bg-highlight/60 text-ink */}`}
                >
                  <div className="flex flex-col gap-3 w-full max-w-md text-sm text-ink leading-relaxed">
                    <p>
                      <HighlightedText text="Case 12.045 (Velásquez Rodríguez)" query="Velásquez" />
                    </p>
                    <p className="text-ink-secondary">
                      <HighlightedText
                        text="…the Court found the State responsible in this case, and in every case since."
                        query="case"
                      />
                    </p>
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-confirm-dialog" ref={reg("sh-confirm-dialog")}>
                <CatalogEntry
                  name="ConfirmDialog"
                  description="Modal confirmation dialog with danger and default variants"
                  code={`<ConfirmDialog
  open={true}
  title="Delete reference?"
  message="This action cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={() => {}}
  onCancel={() => {}}
/>`}
                >
                  <div className="relative h-48 w-full overflow-hidden rounded-md border border-border/40">
                    <div className="absolute inset-0 flex items-center justify-center bg-overlay/30">
                      <div className="bg-paper rounded-lg shadow-xl w-full max-w-xs p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-seal-tint flex items-center justify-center">
                              <span className="text-seal-label text-sm">!</span>
                            </div>
                            <h3 className="text-sm font-semibold text-ink">Delete reference?</h3>
                          </div>
                        </div>
                        <p className="text-xs text-ink-secondary mb-4">This action cannot be undone. The reference will be permanently removed.</p>
                        <div className="flex justify-end gap-2">
                          <button className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-ink-secondary hover:bg-parchment transition-colors">Cancel</button>
                          <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-seal-fill text-white hover:bg-seal-fill/90 transition-colors">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-confirm-delete" ref={reg("sh-confirm-delete")}>
                <CatalogEntry
                  name="ConfirmDelete"
                  description="Settings delete: lists what the delete touches, or the rule that refuses it (OK only)"
                  code={`<ConfirmDelete
  open={open}
  title="Delete thesaurus"
  message="Delete the Case status thesaurus?"
  impact={useAtomValue(thesaurusUsageAtom(id))}
  onConfirm={…}
  onCancel={…}
/>`}
                >
                  <ConfirmDeleteDemo />
                </CatalogEntry>
              </div>

              <div id="sh-typed-confirm" ref={reg("sh-typed-confirm")}>
                <CatalogEntry
                  name="TypedConfirmModal"
                  description="Uwazi's type-the-word confirm (Languages Reset and Uninstall): warning band, what changes, accept off until CONFIRM is typed"
                  code={`<TypedConfirmModal
  open={open}
  message="You are about to uninstall a language."
  impact={["4 entities have a version in this language."]}
  confirmLabel="Uninstall"
  onConfirm={…}
  onCancel={…}
/>`}
                >
                  <TypedConfirmDemo />
                </CatalogEntry>
              </div>

              <div id="sh-password-confirm" ref={reg("sh-password-confirm")}>
                <CatalogEntry
                  name="PasswordConfirmModal"
                  description="Current-password check before an account change (G15). Mocked: any non-empty password is accepted"
                  code={`<PasswordConfirmModal open={open} onAccept={(pw) => save()} onCancel={…} />`}
                >
                  <PasswordConfirmDemo />
                </CatalogEntry>
              </div>

              <div id="sh-toast" ref={reg("sh-toast")}>
                <CatalogEntry
                  name="Toast"
                  description="Success, error, and info toast notifications"
                  code={`{/* Uses toastsAtom from atoms/references.ts */}
{/* setToasts(prev => [...prev, { id, type, message }]) */}

<ToastContainer />

{/* Types: "success" | "error" | "info" */}`}
                >
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-paper border border-border rounded-md shadow-lg">
                      <span className="text-success">&#10003;</span>
                      <span className="text-sm text-ink">Reference created successfully</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-paper border border-border rounded-md shadow-lg">
                      <span className="text-seal-label">&#10007;</span>
                      <span className="text-sm text-ink">Failed to save changes</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-paper border border-border rounded-md shadow-lg">
                      <span className="text-carbon">&#9432;</span>
                      <span className="text-sm text-ink">2 references updated</span>
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-uwazi-loader" ref={reg("sh-uwazi-loader")}>
                <CatalogEntry
                  name="UwaziLoader"
                  description="Branded loading animation — 3x2 grid with left-to-right column sweep"
                  code={`<UwaziLoader />
<UwaziLoader size="xs" />
<UwaziLoader size="sm" />
<UwaziLoader size="lg" />
<UwaziLoader size="sm" color="white" />

{/* In a button */}
<button className="... bg-ink text-parchment">
  <UwaziLoader size="sm" color="white" /> Saving
</button>

{/* In a toast */}
<div className="... bg-paper border rounded-md shadow-lg">
  <UwaziLoader size="sm" />
  <span>Importing 3 files</span>
</div>`}
                >
                  <div className="flex flex-col gap-6 w-full">
                    {/* Sizes */}
                    <div className="flex flex-col gap-3">
                      <SectionLabel>Sizes</SectionLabel>
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col items-center gap-2">
                          <UwaziLoader size="xs" />
                          <span className="text-meta text-ink-muted">xs</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <UwaziLoader size="sm" />
                          <span className="text-meta text-ink-muted">sm</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <UwaziLoader size="md" />
                          <span className="text-meta text-ink-muted">md</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <UwaziLoader size="lg" />
                          <span className="text-meta text-ink-muted">lg</span>
                        </div>
                      </div>
                    </div>

                    {/* In buttons */}
                    <div className="flex flex-col gap-3">
                      <SectionLabel>Buttons</SectionLabel>
                      <div className="flex flex-wrap items-center gap-3">
                        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-ink text-parchment cursor-default">
                          <UwaziLoader size="sm" color="white" /> Saving
                        </button>
                        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border text-ink-secondary cursor-default">
                          <UwaziLoader size="sm" /> Processing
                        </button>
                        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-seal-fill text-white cursor-default">
                          <UwaziLoader size="sm" color="white" /> Deleting
                        </button>
                      </div>
                    </div>

                    {/* In toasts */}
                    <div className="flex flex-col gap-3">
                      <SectionLabel>Toasts</SectionLabel>
                      <div className="flex flex-col gap-2 max-w-sm">
                        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-paper border border-border rounded-md shadow-lg">
                          <UwaziLoader size="sm" />
                          <span className="text-sm text-ink">Importing 3 files</span>
                        </div>
                        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-paper border border-border rounded-md shadow-lg">
                          <UwaziLoader size="sm" />
                          <span className="text-sm text-ink">Processing document</span>
                        </div>
                      </div>
                    </div>

                    {/* Inline */}
                    <div className="flex flex-col gap-3">
                      <SectionLabel>Inline</SectionLabel>
                      <div className="text-sm text-ink-secondary flex items-center gap-1.5">
                        <UwaziLoader size="xs" /> Extracting information
                      </div>
                    </div>

                    {/* In card */}
                    <div className="flex flex-col gap-3">
                      <SectionLabel>Card</SectionLabel>
                      <div className="max-w-xs bg-paper border border-border/40 rounded-md px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-warm flex items-center justify-center shrink-0">
                            <UwaziLoader size="sm" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-ink">Processing document</p>
                            <p className="text-meta text-ink-muted">Extracting text from PDF</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="sh-thesaurus-value-label" ref={reg("sh-thesaurus-value-label")}>
                <CatalogEntry
                  name="ThesaurusValueLabel"
                  description="A thesaurus-backed value with its group as QUIET context — Americas › Central America: group in tertiary ink, muted ›, child in the host row's own style. Uwazi thesauri nest exactly one level; the group resolves by label against every known thesaurus, so this wraps ANY value cell — top-level values and free text pass through untouched. One implementation shared by entity cards, the metadata record and inherited-value tags."
                  code={`<ThesaurusValueLabel value="Central America" />
{/* resolves the group itself → Americas › Central America */}

<ThesaurusValueLabel value="Honduras" parent="Americas" />
{/* explicit parent skips the lookup */}

<ThesaurusValueLabel value={f.value}>
  <HighlightedText text={f.value} query={query} />
</ThesaurusValueLabel>
{/* children render the child label with the host's treatment */}`}
                >
                  <div className="flex flex-col gap-2 text-sm font-medium text-ink">
                    <ThesaurusValueLabel value="Central America" />
                    <ThesaurusValueLabel value="Torture" />
                    <ThesaurusValueLabel value="Forced displacement" />
                  </div>
                </CatalogEntry>
              </div>

            </div>
          </section>

          {/* ==================== SETTINGS ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Settings</h2>
            <div className="flex flex-col gap-6">
              <div id="set-data-table" ref={reg("set-data-table")}>
                <CatalogEntry
                  name="DataTable"
                  description="The canonical data table (entity-view Files style), generic via a declarative column API. Backs FileTable, every Settings list and the Library's list view. `density` takes height out of the ROW and never out of the type — text-sm rows and an 11px header at both settings — so compact buys rows per screen without spending legibility."
                  code={`<DataTable
  data={rows}
  getRowId={(r) => r.id}
  onRowClick={(r) => …}
  isRowSelected={(r) => r.id === selected}
  footer={<span>{rows.length} rows</span>}
  columns={[
    { id: "name", header: "Template", cell: (r) => r.name },
    { id: "count", header: "Entities", width: "6rem", align: "right", cell: (r) => r.count },
  ]}
/>

{/* Compact: shorter rows, identical type. */}
<DataTable density="compact" … />`}
                >
                  <div className="w-full max-w-md">
                    <DataTableDemo />
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-radio-group" ref={reg("set-radio-group")}>
                <CatalogEntry
                  name="RadioGroup"
                  description="Single-choice control (native radios, label + hint). For picking one setting value — not navigation (that's tabs)."
                  code={`<RadioGroup
  name="default-view"
  value={value}
  onChange={setValue}
  options={[
    { id: "cards", label: "Cards", hint: "Visual entity cards" },
    { id: "table", label: "Table", hint: "Dense rows" },
  ]}
/>`}
                >
                  <div className="w-full max-w-md">
                    <RadioGroupDemo />
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-button" ref={reg("set-button")}>
                <CatalogEntry
                  name="SettingsButton"
                  description="Settings button on the bar ladder. Inside SettingsContent.Footer the variants take their bar rung (lead, ghost, seal text); in a page body primary and secondary keep the warm fill. Ink commits; green only on a Save."
                  code={`<SettingsBarContext.Provider value={true}>
  <SettingsButton variant="primary" size="sm">Add template</SettingsButton>
  <SettingsButton variant="ghost" size="sm">Cancel</SettingsButton>
  <SettingsButton variant="danger" size="sm">Delete</SettingsButton>
  <SettingsButton variant="commit" size="sm">Create template</SettingsButton>
  <SettingsButton variant="success" size="sm">Save</SettingsButton>
</SettingsBarContext.Provider>
<SettingsButton variant="secondary" size="sm">Translate</SettingsButton>`}
                >
                  <div className="flex flex-col gap-3">
                    <SettingsBarContext.Provider value={true}>
                      <div className="flex flex-wrap items-center gap-2">
                        <SettingsButton variant="primary" size="sm">Add template</SettingsButton>
                        <SettingsButton variant="ghost" size="sm">Cancel</SettingsButton>
                        <SettingsButton variant="danger" size="sm">Delete</SettingsButton>
                        <SettingsButton variant="commit" size="sm">Create template</SettingsButton>
                        <SettingsButton variant="success" size="sm">Save</SettingsButton>
                        <SettingsButton variant="success" size="sm" disabled>Save</SettingsButton>
                      </div>
                    </SettingsBarContext.Provider>
                    <div className="flex flex-wrap items-center gap-2">
                      <SettingsButton variant="secondary" size="sm">Translate</SettingsButton>
                      <SettingsButton variant="danger" size="sm">Disable</SettingsButton>
                      <SettingsButton variant="secondary" size="sm" disabled>Disabled</SettingsButton>
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-field" ref={reg("set-field")}>
                <CatalogEntry
                  name="SettingsField"
                  description="Labelled form field wrapper (label + hint/error) with the warm TextInput."
                  code={`<SettingsField label="Username" hint="Used to log in.">
  <TextInput defaultValue="admin" />
</SettingsField>`}
                >
                  <div className="w-full max-w-sm flex flex-col gap-3">
                    <SettingsField label="Username" hint="Used to log in.">
                      <TextInput defaultValue="admin" />
                    </SettingsField>
                    <SettingsField label="Password" error="Passwords don't match">
                      <TextInput type="password" defaultValue="••••••" />
                    </SettingsField>
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-status-pill" ref={reg("set-status-pill")}>
                <CatalogEntry
                  name="StatusPill"
                  description="Status badge for extraction / processing jobs, on semantic tints."
                  code={`<StatusPill status="ready" /> // ready | training | processing | error`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status="ready" />
                    <StatusPill status="training" />
                    <StatusPill status="processing" />
                    <StatusPill status="error" />
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-row-actions" ref={reg("set-row-actions")}>
                <CatalogEntry
                  name="RowActions"
                  description="The action cluster at the end of a settings row. Shown on hover and on keyboard focus inside the row (group-focus-within), always on phones and touch; opacity only, so nothing moves. A row that opens its editor carries no pencil. Extra actions (RowActionButton) go before delete; deleteLabel names the verb (Revoke, Uninstall). Stops the click reaching the row target."
                  code={`<RowActions label="logo.svg" onDelete={() => …}>
  <RowActionButton label="Copy URL for logo.svg" icon={<Link2 size={14} />} onClick={() => …} />
</RowActions>`}
                >
                  <div className="w-full max-w-xs flex flex-col gap-2">
                    <div className="group flex items-center justify-between bg-paper border border-border-soft rounded-md px-3 py-2 hover:bg-warm">
                      <span className="text-sm text-ink">Court Case (hover)</span>
                      <RowActions label="Court Case" onDelete={() => {}} />
                    </div>
                    <div className="group flex items-center justify-between bg-paper border border-border-soft rounded-md px-3 py-2 hover:bg-warm">
                      <span className="text-sm text-ink">logo.svg</span>
                      <RowActions label="logo.svg" onDelete={() => {}}>
                        <RowActionButton label="Copy URL for logo.svg" icon={<Link2 size={14} aria-hidden />} onClick={() => {}} />
                      </RowActions>
                    </div>
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-selection-bar" ref={reg("set-selection-bar")}>
                <CatalogEntry
                  name="SettingsSelectionBar"
                  description="A settings footer's selected state (UX2): the count in a fixed-width live slot (n of m selected), ghost actions, a hairline, the danger action, Clear. SettingsListPage and SettingsEditor take a selection prop and swap it in place of the footer's idle start group at the same height; SettingsTable's selection prop adds the checkbox column. Disabled actions stay focusable and say why. Phones get one Actions button opening a sheet."
                  code={`<SettingsListPage
  selection={{ count: ticked.size, total: rows.length, onClear, actions: [
    { id: "role", label: "Change role", icon: <Shield size={13} />, onClick },
    { id: "delete", label: "Delete", icon: <Trash2 size={13} />, onClick, danger: true },
  ] }}
>
  <SettingsTable selection={{ selected: ticked, onChange: setTicked, label: (u) => u.username }} … />
</SettingsListPage>`}
                >
                  <div className="w-full flex items-center gap-2 h-12 px-4 bg-paper border border-border-soft rounded-md">
                    <SettingsSelectionBar
                      count={3}
                      total={12}
                      onClear={() => {}}
                      actions={[
                        { id: "group", label: "Add to group", icon: <FolderOpen size={13} aria-hidden />, onClick: () => {} },
                        { id: "delete", label: "Delete", icon: <Trash2 size={13} aria-hidden />, onClick: () => {}, danger: true },
                      ]}
                    />
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-reorder" ref={reg("set-reorder")}>
                <CatalogEntry
                  name="ReorderGrip · MoveButtons"
                  description="Keyboard reordering for settings rows (UX9), from the Filters pattern. The grip is a button: focused, ArrowUp and ArrowDown move the row, Home and End send it to either end of its own list, and focus moves with it. Move up and Move down sit with the row's actions. The new position is announced through the page's live region (useSettingsAnnounce). The caller owns the list, so a value never leaves its group."
                  code={`const props = { label: r.title, index: i, count: rows.length, onMove: (to) => setRows((p) => moveTo(p, i, to)) };
<ReorderGrip {...props} draggable onDragStart={…} />
<MoveButtons {...props} />`}
                >
                  <div className="w-full max-w-xs flex flex-col gap-1">
                    {["Main menu", "About", "Cases"].map((r, i) => (
                      <div key={r} className="group flex items-center gap-2 bg-paper border border-border-soft rounded-md px-3 h-10">
                        <ReorderGrip label={r} index={i} count={3} onMove={() => {}} />
                        <span className="flex-1 text-sm text-ink">{r}</span>
                        <MoveButtons label={r} index={i} count={3} onMove={() => {}} />
                      </div>
                    ))}
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-alpha-jump" ref={reg("set-alpha-jump")}>
                <CatalogEntry
                  name="AlphaJump"
                  description="An A–Z index for a long list (the thesaurus editor's 2,443 values). Letters with no row are disabled; # covers labels that start with anything else. A toolbar of buttons; the caller scrolls to the first row filed under the letter and focuses it."
                  code={`<AlphaJump present={lettersInList} onJump={(letter) => scrollToFirst(letter)} />`}
                >
                  <AlphaJump present={new Set([..."ABCDEGHIJLMNOPQRSTUVYZ"])} onJump={() => {}} />
                </CatalogEntry>
              </div>

              <div id="set-bulk-pick" ref={reg("set-bulk-pick")}>
                <CatalogEntry
                  name="BulkPickModal"
                  description="One choice applied to a selection: Add to group, Change role, Move to group. A radio list (searchable past eight options) and a reserved readback line saying what the choice changes and what it leaves alone and why, before anything is applied. A choice that changes nothing keeps the commit off."
                  code={`<BulkPickModal
  title="Change role" subtitle="3 users" confirmLabel="Change role"
  options={roles}
  readback={(role) => ({ text: "2 users become Editor. admin stays: …", none: false })}
  onConfirm={apply} onClose={close}
/>`}
                >
                  <BulkPickDemo />
                </CatalogEntry>
              </div>

              <div id="set-dropzone" ref={reg("set-dropzone")}>
                <CatalogEntry
                  name="Dropzone"
                  description="The Import CSV file picker, shared by New import and the thesaurus CSV import: a dashed warm well that opens the file chooser or takes a dropped file, then a row naming the chosen file with Remove. onFile receives the File; onBrowse replaces the chooser (the Import CSV demo). The input is cleared after each pick, so choosing the same file again still reports it."
                  code={`<Dropzone onFile={read} file={file && { name: file.name, detail: summary }} onRemove={() => setFile(null)} />`}
                >
                  <div className="max-w-md flex flex-col gap-2">
                    <Dropzone onFile={() => {}} />
                    <Dropzone file={{ name: "estados.csv", detail: "Adds 3 values and 1 group." }} onRemove={() => {}} />
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-translation-progress" ref={reg("set-translation-progress")}>
                <CatalogEntry
                  name="TranslationProgress"
                  description="Per-language translation progress (UX8). The strip heads the Translations editor: one cell per target language with its bar and n of m; with onPick a cell is a button that filters the grid to that language's untranslated keys. The compact form (ES 80%) sits in the Translations list. A value that is empty or still equals the source text counts as untranslated (Uwazi's rule)."
                  code={`<TranslationProgress progress={progressOf(rows)} active={lang} onPick={setLang} />
<TranslationProgress variant="compact" progress={progressOf(rows)} />`}
                >
                  <div className="max-w-2xl flex flex-col gap-3">
                    <TranslationProgress
                      progress={[
                        { key: "es", label: "Spanish", done: 8, total: 10 },
                        { key: "fr", label: "French", done: 10, total: 10 },
                        { key: "ar", label: "Arabic", done: 3, total: 10 },
                      ]}
                    />
                    <TranslationProgress
                      variant="compact"
                      progress={[
                        { key: "es", label: "Spanish", done: 8, total: 10 },
                        { key: "fr", label: "French", done: 10, total: 10 },
                        { key: "ar", label: "Arabic", done: 3, total: 10 },
                      ]}
                    />
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-list-page" ref={reg("set-list-page")}>
                <CatalogEntry
                  name="SettingsListPage"
                  description="The shell of every Settings list page: header, one intro line, the toolbar (SettingsToolbar: search on the start side, filters on the end, always mounted at one height), the table, and a footer whose lead is the create action (BAR_LEAD). useSettingsSearch filters the rows. Tabs (DrawerTabs) sit above the toolbar; dialogs go in overlays."
                  code={`const search = useSettingsSearch(rows, (r) => r.name);
<SettingsListPage
  component="ThesauriPage"
  title="Thesauri"
  intro="Controlled vocabularies you can attach to template properties."
  search={{ value: search.query, onChange: search.setQuery, label: "Search thesauri" }}
  filters={<Select … />}
  lead={{ label: "Add thesaurus", onClick: add }}
  overlays={<ConfirmDialog … />}
>
  <SettingsTable corpusScoped data={search.rows} … emptyState={<SettingsEmptyState … />} />
</SettingsListPage>`}
                >
                  <SettingsListPageDemo />
                </CatalogEntry>
              </div>

              <div id="set-empty-state" ref={reg("set-empty-state")}>
                <CatalogEntry
                  name="SettingsEmptyState"
                  description="A settings list with no rows: a vellum tile, the object named, one line on what it is for, and the create action. With a live search it says nothing matched and offers Clear search. A corpusScoped SettingsTable shows loading rows instead while the corpus loads, and an error with Try again if it fails."
                  code={`<SettingsEmptyState
  icon={<BookOpen size={16} />}
  title="No thesauri yet"
  hint="A thesaurus gives a property a fixed list of values to choose from."
  action={{ label: "Add thesaurus", onClick: add }}
  query={search.query}
  onClearQuery={search.clear}
/>`}
                >
                  <SettingsEmptyStateDemo />
                </CatalogEntry>
              </div>

              <div id="set-section" ref={reg("set-section")}>
                <CatalogEntry
                  name="SettingsSection"
                  description="The blocks of a settings form. SettingsForm is the 40rem column (wide for grids); SettingsSection is a heading, a one-line description, an optional action on the heading's line, then content, with a soft rule between sections. SettingsFieldRow puts two fields side by side from sm up. SettingsCheckList is a fieldset named by the section heading; SettingsStat is one figure in a stats list."
                  code={`<SettingsForm>
  <SettingsSection>
    <SettingsFieldRow>…two SettingsFields…</SettingsFieldRow>
  </SettingsSection>
  <SettingsSection title="Groups" description="…" action={<SettingsButton …>Add group</SettingsButton>}>
    <SettingsCheckList>
      <SettingsCheckRow><Checkbox … />Litigation</SettingsCheckRow>
    </SettingsCheckList>
  </SettingsSection>
</SettingsForm>`}
                >
                  <SettingsSectionDemo />
                </CatalogEntry>
              </div>

              <div id="set-editor" ref={reg("set-editor")}>
                <CatalogEntry
                  name="SettingsEditor · SettingsFormPage"
                  description="The two form shells, both fed by useSettingsDraft (which registers with the dirty guard). SettingsEditor is the detail a list opens: breadcrumb and back arrow (guarded), the form, then Cancel and the commit: ink with createLabel for a new record, green Save for an existing one. SettingsFormPage is a top-level page that is one form: Discard changes then Save, both enabled only while dirty."
                  code={`const { draft, update, dirty, markSaved, discard } = useSettingsDraft({ id, label, saved });
<SettingsEditor component="RelationTypeEditor" path={["Relationship types"]} title={name}
  onBack={close} isNew={isNew} createLabel="Create type" dirty={dirty} valid={!!name.trim()} onSave={save}>
  <SettingsSection>…</SettingsSection>
</SettingsEditor>

<SettingsFormPage component="CollectionPage" title="Collection" intro="…"
  dirty={dirty} onSave={() => markSaved()} onDiscard={discard}>…</SettingsFormPage>`}
                >
                  <SettingsEditorDemo />
                </CatalogEntry>
              </div>

              <div id="set-stats-card" ref={reg("set-stats-card")}>
                <CatalogEntry
                  name="StatsCard"
                  description="One dashboard figure: label, value, its unit and a detail line. With onOpen the card is a button to the page the figure comes from (chevron, focus ring, name 'Users, 5 total users'); without it, plain text."
                  code={`<StatsCard label="Users" value={5} caption="total users" detail="1 Admins | 2 Editors | 2 Collaborators" onOpen={open} />`}
                >
                  <StatsCardDemo />
                </CatalogEntry>
              </div>

              <div id="set-date-input" ref={reg("set-date-input")}>
                <CatalogEntry
                  name="DateInput"
                  description="A date field in the collection's date format (Settings › Collection). Typed text in the pattern, the browser's calendar on a button; yyyy-mm-dd in and out, like a native date input."
                  code={`<DateInput value={iso} onChange={setIso} aria-label="Date filed" className={inputClass} />`}
                >
                  <DateInputDemo />
                </CatalogEntry>
              </div>

              <div id="set-map-point" ref={reg("set-map-point")}>
                <CatalogEntry
                  name="MapPointPicker"
                  description="A world map that places one point where it is clicked or tapped. The latitude and longitude inputs beside it are the keyboard path."
                  code={`<MapPointPicker point={point} onPick={setPoint} label="Map starting point" />`}
                >
                  <MapPointPickerDemo />
                </CatalogEntry>
              </div>

              <div id="set-image-picker" ref={reg("set-image-picker")}>
                <CatalogEntry
                  name="ImagePickerModal"
                  description="Pick an image from Settings › Uploads, or drop one to upload it at once. Lists only images that pass the size rule; a dropped file that fails it is refused with the actual and expected size."
                  code={`<ImagePickerModal title="Select favicon image" rule={FAVICON_RULE} value={id} onPick={pick} onClose={close} />`}
                >
                  <ImagePickerModalDemo />
                </CatalogEntry>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Screens</h2>
            <div className="space-y-10">
              <div id="sc-login" ref={reg("sc-login")}>
                <CatalogEntry
                  name="LoginView"
                  description="The login screen (appView “login”; the navbar's Log out leads here). Art panel beside the form, a band above it on phones. One of six images per page load, never the previous load's, cropped around its focal point, faded in over paper. Mock auth: a seed user's username and any password of 4+ characters."
                  code={`<LoginView onLoggedIn={(username) => setAppView("library")} />`}
                >
                  <div className="w-full space-y-3">
                    <div className="relative w-full h-[36rem] overflow-hidden rounded-lg border border-border">
                      <LoginView onLoggedIn={() => {}} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppView("login")}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-ink text-paper hover:bg-ink/90"
                    >
                      Open full screen
                    </button>
                  </div>
                </CatalogEntry>
              </div>
            </div>
          </section>

          {import.meta.env.DEV && (
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Dev</h2>
            <div className="space-y-10">
              <div id="dev-panel" ref={reg("dev-panel")}>
                <CatalogEntry
                  name="Dev panel"
                  description="Switches for demos and QA, in dev builds only. Fail next request: the next action of the chosen kind fails once with the given reason (one 'An error occurred' entry, edits kept). Slow load: Settings lists read as loading for two seconds. Zero rows: empty a store to see its empty state. Reset demo data clears every switch."
                  code={`set(failNextAtom, { scope: "save", reason })`}
                >
                  <DevPanel />
                </CatalogEntry>
              </div>
            </div>
          </section>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}


function PagesEditorDemo() {
  const [lang, setLang] = useState<SiteLang>("en");
  return (
    <div className="flex flex-wrap items-center gap-4">
      <LangSwitch value={lang} onChange={setLang} filled={(l) => l === "en" || l === "es"} />
      <SyntaxBadge syntax="jsx" />
      <SyntaxBadge syntax="ext" />
    </div>
  );
}

/** Live ConfirmDelete: one allowed delete with its facts, one refused. */
function ConfirmDeleteDemo() {
  const [open, setOpen] = useState<"allowed" | "blocked" | null>(null);
  const btn = "px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer";
  return (
    <div className="flex gap-2">
      <button type="button" className={btn} onClick={() => setOpen("allowed")}>Delete a group</button>
      <button type="button" className={btn} onClick={() => setOpen("blocked")}>Delete a used template</button>
      <ConfirmDelete
        open={open !== null}
        title={open === "blocked" ? "Delete template" : "Delete group"}
        message="Delete the Research group?"
        impact={
          open === "blocked"
            ? { lines: ["Used by 337 entities."], block: "337 entities use this template. Move or delete them first." }
            : { lines: ["2 members lose this group: jnkemba and afarah."], block: null }
        }
        onConfirm={() => setOpen(null)}
        onCancel={() => setOpen(null)}
      />
    </div>
  );
}

function TypedConfirmDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer">
        Uninstall a language
      </button>
      <TypedConfirmModal
        open={open}
        message="You are about to uninstall a language."
        impact={["4 entities have a version in this language.", "18 translated keys are removed."]}
        confirmLabel="Uninstall"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

function PasswordConfirmDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer">
        Update account
      </button>
      <PasswordConfirmModal open={open} onAccept={() => setOpen(false)} onCancel={() => setOpen(false)} />
    </>
  );
}

function BulkPickDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="px-3 py-1.5 text-xs rounded-md bg-paper text-ink border border-border-soft cursor-pointer">
        Open Change role
      </button>
      {open && (
        <BulkPickModal
          title="Change role"
          subtitle="3 users"
          confirmLabel="Change role"
          options={[
            { value: "admin", label: "Admin" },
            { value: "editor", label: "Editor" },
            { value: "collaborator", label: "Collaborator" },
          ]}
          readback={(v) => (v === "admin" ? { text: "All 3 users are already Admin.", none: true } : { text: `3 users become ${v === "editor" ? "Editor" : "Collaborator"}.` })}
          onConfirm={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** Two of the collection's records, each with both PinToggle variants. */
function PinToggleDemo() {
  const entities = useAtomValue(libraryEntitiesAtom).slice(0, 2);
  if (!entities.length) return <p className="text-xs text-ink-tertiary">The collection is still loading.</p>;
  return (
    <div className="flex flex-col gap-3">
      {entities.map((e) => (
        <div key={e.id} className="group flex items-center gap-3 rounded-md border border-border-soft bg-paper px-3 py-2">
          <span className="flex-1 min-w-0 truncate text-sm text-ink">{e.title}</span>
          <PinToggle entityId={e.id} title={e.title} reveal />
          <PinToggle entityId={e.id} title={e.title} variant="label" />
        </div>
      ))}
    </div>
  );
}
