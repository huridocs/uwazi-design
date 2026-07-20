import { useEffect, useRef, useState } from "react";
import { CatalogEntry } from "../components/catalog/CatalogEntry";
import { StyleGuide } from "../components/catalog/StyleGuide";

// Components rendered directly inside the catalog body (not wrapped in an
// Isolated* demo helper). Everything that needs scoped atom state or stateful
// interaction lives in `./catalog/demos.tsx` and is imported lower down.
import { EntityPill } from "../components/shared/EntityPill";
import { PageTag } from "../components/shared/PageTag";
import { CountBadge } from "../components/shared/CountBadge";
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
import { ToolsSidebar } from "../components/layout/ToolsSidebar";

// Settings primitives (static demos)
import { Button as SettingsButton } from "../components/settings/Button";
import { Field, TextInput } from "../components/settings/Field";
import { RowActions } from "../components/settings/RowActions";
import { StatusPill } from "../components/settings/StatusPill";

// Icons
import { ArrowLeft, FileText, Pencil, Download, Trash2, Share2, Plus } from "lucide-react";

// Data
import { references } from "../data/references";
import { files } from "../data/files";

// Stateful demo helpers — atom-scoped Providers, local React state, interaction.
import {
  FadeTruncate,
  SegmentedTabsDemo,
  DrawerTabsDemo,
  MainTabsDemo,
  IsolatedBeacon,
  FileTableDemo,
  IsolatedSearchBar,
  IsolatedFiltersRow,
  IsolatedRelationshipGroupedCard,
  IsolatedRelationshipRowReference,
  IsolatedActionBar,
  IsolatedRefMinimap,
  FiltersDrawerDemo,
  FacetSectionDemo,
  IsolatedViewModeControls,
  IsolatedCollapseControls,
  IsolatedListInfoRow,
  IsolatedZoomControl,
  IsolatedCheckboxes,
  IsolatedRelationshipRowAggregate,
  IsolatedRelationshipRowHub,
  IsolatedRowCheckbox,
  IsolatedRelationshipsActionBar,
  IsolatedManageRelationTypesModal,
  IsolatedSelectControls,
  IsolatedGroupByControlMutex,
  IsolatedRelationshipGroupedCardAggregate,
  IsolatedViewControls,
  IsolatedSortControl,
  IsolatedDirectionGlyph,
  IsolatedConnectionGroupCard,
  IsolatedRelationshipFieldCard,
  IsolatedInheritedValueChip,
  IsolatedRelationshipFieldEditor,
  IsolatedRadioGroup,
  IsolatedDataTable,
} from "./catalog/demos";

import { sidebarGroups, allItemIds } from "./catalog/sidebarGroups";
import { handoffDocs, resolveHandoffAnchor } from "./catalog/handoffDocs";
import { Markdown } from "./catalog/Markdown";
import { asset } from "../utils/asset";

interface Props {
  /** Called when the user clicks the "Return to app" button in the catalog
   *  header. Routes the appView atom back to "entity". */
  onReturn: () => void;
}

export function ComponentCatalog({ onReturn }: Props) {
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
        <img src={asset("/nu-logo.svg")} alt="Uwazi" style={{ height: 14.7 }} className="logo-img" />
        <button
          onClick={onReturn}
          className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Return to app
        </button>
      </header>
      <div className="grid grid-cols-[220px_minmax(0,1fr)]">
      {/* Sidebar — sticky to top:52 (below the header). Self-scrolls if its
          own item list exceeds viewport height. */}
      <nav className="sticky top-13 z-20 self-start bg-paper border-r border-border/60 py-4 px-3 overflow-y-auto overscroll-y-none" style={{ height: "calc(100vh - 3.25rem)" }}>
        <h2 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest px-2 mb-3">
          Component Catalog
        </h2>
        {sidebarGroups.map((group) => (
          <div key={group.label} className="mb-3">
            <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider px-2">
              {group.label}
            </span>
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
                  <p className="mb-4 font-mono text-[0.6875rem] text-ink-muted">
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
<button className="px-4 py-2 text-sm font-medium rounded-md bg-seal text-white hover:bg-seal/90">
  Delete
</button>

{/* Ghost */}
<button className="px-3 py-1.5 text-xs font-medium text-ink-tertiary hover:text-ink-secondary hover:bg-warm rounded-md">
  Ghost
</button>

{/* Compact (navbar) */}
<button className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment">
  <BookOpen size={14} /> Compact
</button>

{/* Icon + label (secondary) */}
<button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm">
  <Pencil size={12} /> Edit
</button>

{/* Icon + label (danger) */}
<button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-seal rounded-md hover:bg-seal/90">
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
                      <button className="px-4 py-2 text-sm font-medium rounded-md bg-seal text-white hover:bg-seal/90 transition-colors">Delete</button>
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
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-seal rounded-md hover:bg-seal/90 transition-colors">
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
//   activityAtom        — the in-flight task (animates the mark + TASKS)
//   notificationsAtom   — past events (the drawer log)
//   beaconOpenAtom      — drawer open?
// Collapsed = the UwaziLoader mark; expands for a task intro / on hover.
// Renders <NotificationsDrawer /> internally.
<Beacon />`}
                >
                  <IsolatedBeacon />
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
                  <IsolatedActionBar />
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
                        <span className="text-[10px] text-ink-muted capitalize">mentions</span>
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
                  <IsolatedRefMinimap />
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

{/* Uses searchQueryAtom from atoms/filters.ts */}`}
                >
                  <IsolatedSearchBar />
                </CatalogEntry>
              </div>

              <div id="ev-filters-row" ref={reg("ev-filters-row")}>
                <CatalogEntry
                  name="FiltersRow"
                  description="View mode toggle + sort dropdown + collapse/expand controls"
                  code={`<FiltersRow
  onCollapseAll={() => {}}
  onExpandAll={() => {}}
/>`}
                >
                  <IsolatedFiltersRow />
                </CatalogEntry>
              </div>

              <div id="ev-relationship-row-ref" ref={reg("ev-relationship-row-ref")}>
                <CatalogEntry
                  name="RelationshipRow · reference"
                  description="Text-anchored row variant — entity pill, page tag, snippet, direction + rel label"
                  code={`<RelationshipRow
  kind="reference"
  ref={reference}
  onDelete={(id) => {}}
/>`}
                >
                  <div className="w-full max-w-md border border-border/40 rounded-md overflow-hidden">
                    <IsolatedRelationshipRowReference />
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
                    <IsolatedRelationshipGroupedCard />
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

              <div id="ev-connection-group-card" ref={reg("ev-connection-group-card")}>
                <CatalogEntry
                  name="ConnectionGroupCard · multi-inheritance"
                  description="One connection, many inherited columns. Sibling relationship fields sharing a connectionKey collapse into a single table — entities listed once (rows), each inherited property a column. Missing source values show an em-dash."
                  code={`const { groups } = groupConnections(relationshipFieldsByLanguage.EN, "EN");
<ConnectionGroupCard group={groups[0]} span="full" />`}
                >
                  <IsolatedConnectionGroupCard />
                </CatalogEntry>
              </div>

              <div id="ev-relationship-field-card" ref={reg("ev-relationship-field-card")}>
                <CatalogEntry
                  name="RelationshipFieldCard · single-inheritance + link-only"
                  description="A standalone relationship field. Top: single-inheritance (Related cases → inherits Region, one row missing its value). Bottom: link-only (Rights invoked — connected entities, no inherited value, '· linked' caption)."
                  code={`<RelationshipFieldCard field={relCases} />   {/* inherits Region */}
<RelationshipFieldCard field={relRights} />  {/* link-only */}`}
                >
                  <IsolatedRelationshipFieldCard />
                </CatalogEntry>
              </div>

              <div id="ev-inherited-value-chip" ref={reg("ev-inherited-value-chip")}>
                <CatalogEntry
                  name="InheritedValueChip + RelationCaption"
                  description="One connected-entity row: an entity pill (opens the source preview) and its carbon-accented inherited value, or an em-dash when the source has none. RelationCaption is the shared provenance line used by every relationship card."
                  code={`<RelationCaption relationLabel="Cites" inheritLabel="Region" />
<InheritedValueChip value={v} inherits relationLabel="Cites" />`}
                >
                  <IsolatedInheritedValueChip />
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
                  <IsolatedRelationshipFieldEditor />
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
                  name="ToolsSidebar"
                  description="Fixed-width sidebar with Metadata and Tools sections, active item highlight"
                  code={`<ToolsSidebar activeItem="import-csv" />`}
                >
                  <div className="w-full h-64 border border-border/40 rounded-md overflow-hidden">
                    <ToolsSidebar activeItem="import-csv" />
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
                  description="Colored pill showing import status — completed, processing, failed, etc."
                  code={`<StatusBadge status="completed" />
<StatusBadge status="processing" />
<StatusBadge status="failed" />
<StatusBadge status="completed_warnings" />
<StatusBadge status="completed_errors" />
<StatusBadge status="uploading" />`}
                  tailwind="inline-flex w-fit px-2 py-0.5 text-[11px] font-semibold rounded-full"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status="completed" />
                    <StatusBadge status="processing" />
                    <StatusBadge status="uploading" />
                    <StatusBadge status="failed" />
                    <StatusBadge status="completed_warnings" />
                    <StatusBadge status="completed_errors" />
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
                      <span className="text-[10px] text-ink-muted mb-1 block">Green (completed)</span>
                      <ProgressBar value={100} color="green" showLabel />
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted mb-1 block">Blue (processing) — md</span>
                      <ProgressBar value={64} color="blue" showLabel size="md" />
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted mb-1 block">Red (failed)</span>
                      <ProgressBar value={37} color="red" showLabel />
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted mb-1 block">No label</span>
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
                  name="FiltersDrawer"
                  description="Slide-over panel scoped to the nearest relative overflow-hidden parent"
                  code={`<FiltersDrawer open={open} onClose={() => setOpen(false)}>
  {/* facet content */}
</FiltersDrawer>`}
                >
                  <FiltersDrawerDemo />
                </CatalogEntry>
              </div>

              <div id="fl-facet-section" ref={reg("fl-facet-section")}>
                <CatalogEntry
                  name="FacetSection"
                  description="Collapsible facet block with checkbox options (used inside FiltersDrawer)"
                  code={`<FacetSection
  title="Relation type"
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

              <div id="fl-view-mode-controls" ref={reg("fl-view-mode-controls")}>
                <CatalogEntry
                  name="ViewModeControls"
                  description="Segmented view-mode toggle + sort dropdown (used in SearchBar rightSlot)"
                  code={`<ViewModeControls />
<ViewModeControls modes={["all", "by-entity-type", "by-relation-type"]} />`}
                >
                  <IsolatedViewModeControls />
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
                  <IsolatedCollapseControls />
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
                  <IsolatedListInfoRow />
                </CatalogEntry>
              </div>

              <div id="fl-list-card-row" ref={reg("fl-list-card-row")}>
                <CatalogEntry
                  name="ListCardRow"
                  description="Shell for list rows — owns selected (bg-parchment), cursor, border-b, px-3 py-2.5"
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
                  <IsolatedCheckboxes />
                </CatalogEntry>
              </div>

              <div id="fl-zoom-control" ref={reg("fl-zoom-control")}>
                <CatalogEntry
                  name="ZoomControl"
                  description="Segmented detail/compact/overview + graph toggle for the Relationships view"
                  code={`<ZoomControl />

{/* Bound to zoomAtom + relationshipsViewModeAtom */}`}
                >
                  <IsolatedZoomControl />
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
                  <IsolatedSelectControls />
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
                  description="Aggregate row variant — entity pill, evidence count badge, direction + rel label. Click on the count jumps into the refs cluster."
                  code={`<RelationshipRow
  kind="aggregate"
  rel={rel}
/>

{/* rel comes from deriveRelationships(references) */}`}
                >
                  <IsolatedRelationshipRowAggregate />
                </CatalogEntry>
              </div>

              <div id="relationship-row-hub" ref={reg("relationship-row-hub")}>
                <CatalogEntry
                  name="RelationshipRow · hub"
                  description="N-ary hub row — multiple member pills, evidence count badge, no direction (hubs are symmetric). Rendered when refs share a hubId."
                  code={`<RelationshipRow kind="hub" hub={hub} />

{/* hub comes from deriveHubs(references) */}`}
                >
                  <IsolatedRelationshipRowHub />
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
                  <IsolatedRelationshipGroupedCardAggregate />
                </CatalogEntry>
              </div>

              <div id="view-controls" ref={reg("view-controls")}>
                <CatalogEntry
                  name="ViewControls"
                  description="Presentation toggle for the merged Relationships panel: list / tree / graph."
                  code={`<ViewControls />`}
                >
                  <IsolatedViewControls />
                </CatalogEntry>
              </div>

              <div id="group-by-control" ref={reg("group-by-control")}>
                <CatalogEntry
                  name="GroupByControl"
                  description="Primary + secondary grouping dropdowns. The pair mutex out each other's selection via excludeOption — picking 'Relation type' on primary removes it from secondary's options."
                  code={`<GroupByControl axis="primary" />
<GroupByControl
  axis="secondary"
  excludeOption={groupBy}
/>`}
                >
                  <IsolatedGroupByControlMutex />
                </CatalogEntry>
              </div>

              <div id="sort-control" ref={reg("sort-control")}>
                <CatalogEntry
                  name="SortControl"
                  description="Dropdown selecting the sort order (appearance / A → Z / Z → A)."
                  code={`<SortControl />`}
                >
                  <IsolatedSortControl />
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
                  <IsolatedDirectionGlyph />
                </CatalogEntry>
              </div>

              <div id="row-checkbox" ref={reg("row-checkbox")}>
                <CatalogEntry
                  name="RowCheckbox"
                  description="Per-row checkbox gated behind editModeAtom. Aggregate / hub rows pass every backing refId; toggling adds or removes the whole set atomically against selectedRefIdsAtom."
                  code={`<RowCheckbox refIds={[reference.id]} />
<RowCheckbox refIds={rel.refIds} />`}
                >
                  <IsolatedRowCheckbox />
                </CatalogEntry>
              </div>

              <div id="relationships-action-bar" ref={reg("relationships-action-bar")}>
                <CatalogEntry
                  name="RelationshipsActionBar"
                  description="Bottom action bar with Edit toggle. View mode shows just Edit; edit mode reveals Create relationship, Manage types, Select all/Deselect all on the left, and selection count + Delete + Cancel + Save on the right."
                  code={`<RelationshipsActionBar />`}
                >
                  <IsolatedRelationshipsActionBar />
                </CatalogEntry>
              </div>

              <div id="manage-relation-types-modal" ref={reg("manage-relation-types-modal")}>
                <CatalogEntry
                  name="ManageRelationTypesModal"
                  description="CRUD for the relation-type registry. Add via slugified id; delete reassigns orphaned references to the no_label fallback. The fallback type is non-deletable."
                  code={`<ManageRelationTypesModal />

{/* Open from anywhere by writing manageRelationTypesOpenAtom */}`}
                >
                  <IsolatedManageRelationTypesModal />
                </CatalogEntry>
              </div>
            </div>
          </section>

          {/* ==================== SHARED ==================== */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-6">Shared</h2>
            <div className="flex flex-col gap-6">
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
                              <span className="text-seal text-sm">!</span>
                            </div>
                            <h3 className="text-sm font-semibold text-ink">Delete reference?</h3>
                          </div>
                        </div>
                        <p className="text-xs text-ink-secondary mb-4">This action cannot be undone. The reference will be permanently removed.</p>
                        <div className="flex justify-end gap-2">
                          <button className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-ink-secondary hover:bg-parchment transition-colors">Cancel</button>
                          <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-seal text-white hover:bg-seal/90 transition-colors">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
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
                      <span className="text-seal">&#10007;</span>
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
                      <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Sizes</span>
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col items-center gap-2">
                          <UwaziLoader size="xs" />
                          <span className="text-[10px] text-ink-muted">xs</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <UwaziLoader size="sm" />
                          <span className="text-[10px] text-ink-muted">sm</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <UwaziLoader size="md" />
                          <span className="text-[10px] text-ink-muted">md</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <UwaziLoader size="lg" />
                          <span className="text-[10px] text-ink-muted">lg</span>
                        </div>
                      </div>
                    </div>

                    {/* In buttons */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Buttons</span>
                      <div className="flex flex-wrap items-center gap-3">
                        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-ink text-parchment cursor-default">
                          <UwaziLoader size="sm" color="white" /> Saving
                        </button>
                        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border text-ink-secondary cursor-default">
                          <UwaziLoader size="sm" /> Processing
                        </button>
                        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-seal text-white cursor-default">
                          <UwaziLoader size="sm" color="white" /> Deleting
                        </button>
                      </div>
                    </div>

                    {/* In toasts */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Toasts</span>
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
                      <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Inline</span>
                      <div className="text-sm text-ink-secondary flex items-center gap-1.5">
                        <UwaziLoader size="xs" /> Extracting information
                      </div>
                    </div>

                    {/* In card */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Card</span>
                      <div className="max-w-xs bg-paper border border-border/40 rounded-md px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-warm flex items-center justify-center shrink-0">
                            <UwaziLoader size="sm" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-ink">Processing document</p>
                            <p className="text-[10px] text-ink-muted">Extracting text from PDF</p>
                          </div>
                        </div>
                      </div>
                    </div>
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
                  description="The canonical data table (entity-view Files style), generic via a declarative column API. Backs FileTable and every Settings list."
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
/>`}
                >
                  <div className="w-full max-w-md">
                    <IsolatedDataTable />
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
                    <IsolatedRadioGroup />
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-button" ref={reg("set-button")}>
                <CatalogEntry
                  name="Button"
                  description="Settings-scoped action button. Warm fill is canonical; seal for danger only."
                  code={`<Button variant="primary" size="sm">Save</Button>
<Button variant="secondary" size="sm">Translate</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger" size="sm">Delete</Button>`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <SettingsButton variant="primary" size="sm">Save</SettingsButton>
                    <SettingsButton variant="secondary" size="sm">Translate</SettingsButton>
                    <SettingsButton variant="ghost" size="sm">Cancel</SettingsButton>
                    <SettingsButton variant="danger" size="sm">Delete</SettingsButton>
                    <SettingsButton variant="primary" size="sm" disabled>Disabled</SettingsButton>
                  </div>
                </CatalogEntry>
              </div>

              <div id="set-field" ref={reg("set-field")}>
                <CatalogEntry
                  name="Field"
                  description="Labelled form field wrapper (label + hint/error) with the warm TextInput."
                  code={`<Field label="Email" hint="Used to sign in.">
  <TextInput type="email" defaultValue="admin@uwazi.io" />
</Field>`}
                >
                  <div className="w-full max-w-sm flex flex-col gap-3">
                    <Field label="Email" hint="Used to sign in.">
                      <TextInput type="email" defaultValue="admin@uwazi.io" />
                    </Field>
                    <Field label="Password" error="Passwords don't match">
                      <TextInput type="password" defaultValue="••••••" />
                    </Field>
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
                  description="Edit + delete icon pair for a table row. Stops row-click propagation."
                  code={`<RowActions label="Court Case" onEdit={() => …} onDelete={() => …} />`}
                >
                  <div className="w-full max-w-xs flex items-center justify-between bg-paper border border-border-soft rounded-md px-3 py-2">
                    <span className="text-sm text-ink">Court Case</span>
                    <RowActions label="Court Case" onEdit={() => {}} onDelete={() => {}} />
                  </div>
                </CatalogEntry>
              </div>
            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}

