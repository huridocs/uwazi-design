import { useEffect, useRef, useState } from "react";
import { createStore, Provider } from "jotai";
import { CatalogEntry } from "../components/catalog/CatalogEntry";
import { StyleGuide } from "../components/catalog/StyleGuide";

// Components
import { EntityPill } from "../components/shared/EntityPill";
import { PageTag } from "../components/shared/PageTag";
import { CountBadge } from "../components/shared/CountBadge";
import { MetadataCard, Property, PropertyRow } from "../components/metadata/MetadataCard";
import { SegmentedTabs } from "../components/layout/SegmentedTabs";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { MainTabs } from "../components/layout/MainTabs";
import { HighlightCard } from "../components/references/HighlightCard";
import { DensityCard } from "../components/references/DensityCard";
import { RelatedDocCard } from "../components/references/RelatedDocCard";
import { FileTable } from "../components/files/FileTable";
import { DrawerActionBar } from "../components/references/DrawerActionBar";
import { FiltersRow, ViewModeControls, CollapseControls } from "../components/references/FiltersRow";
import { GroupedCard } from "../components/references/GroupedCard";
import { RefRow } from "../components/references/RefRow";
import { FiltersButton } from "../components/shared/FiltersButton";
import { FiltersDrawer } from "../components/shared/FiltersDrawer";
import { FacetSection } from "../components/shared/FacetSection";
import { ActiveFilterChip } from "../components/shared/ActiveFilterChip";
import { FadeTruncate } from "../components/shared/FadeTruncate";
import { ListInfoRow } from "../components/shared/ListInfoRow";
import { ListCardRow } from "../components/shared/ListCardRow";
import { ZoomControl } from "../components/references/ZoomControl";
import { ActionBar } from "../components/viewer/ActionBar";
import { UwaziLoader } from "../components/shared/UwaziLoader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { ProgressBar } from "../components/shared/ProgressBar";
import { StatsCard } from "../components/shared/StatsCard";
import { Stepper } from "../components/shared/Stepper";
import { AlertBanner } from "../components/shared/AlertBanner";
import { Breadcrumb } from "../components/layout/Breadcrumb";
import { ToolsSidebar } from "../components/layout/ToolsSidebar";

// Icons
import { FileText, Pencil, Download, Trash2, Share2, Plus } from "lucide-react";

// Data
import { references } from "../data/references";
import { files } from "../data/files";

// --- Sidebar structure ---

interface SidebarGroup {
  label: string;
  items: { id: string; label: string }[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: "Style Guide",
    items: [
      { id: "sg-colors", label: "Colors" },
      { id: "sg-typography", label: "Typography" },
      { id: "sg-shadows", label: "Shadows" },
      { id: "sg-radii", label: "Border Radius" },
      { id: "sg-spacing", label: "Spacing" },
    ],
  },
  {
    label: "Elements",
    items: [
      { id: "el-entity-pill", label: "EntityPill" },
      { id: "el-page-tag", label: "PageTag" },
      { id: "el-count-badge", label: "CountBadge" },
      { id: "el-buttons", label: "Buttons" },
    ],
  },
  {
    label: "Entity View — Layout",
    items: [
      { id: "ev-main-tabs", label: "MainTabs" },
      { id: "ev-segmented-tabs", label: "SegmentedTabs" },
      { id: "ev-drawer-tabs", label: "DrawerTabs" },
    ],
  },
  {
    label: "Entity View — Document",
    items: [
      { id: "ev-floating-menu", label: "FloatingMenu" },
      { id: "ev-action-bar", label: "ActionBar" },
      { id: "ev-hover-expand", label: "HoverExpand" },
    ],
  },
  {
    label: "Entity View — References",
    items: [
      { id: "ev-search-bar", label: "SearchBar" },
      { id: "ev-filters-row", label: "FiltersRow" },
      { id: "ev-ref-row", label: "RefRow" },
      { id: "ev-grouped-card", label: "GroupedCard" },
      { id: "ev-highlight-card", label: "HighlightCard" },
      { id: "ev-density-card", label: "DensityCard" },
      { id: "ev-related-doc", label: "RelatedDocCard" },
    ],
  },
  {
    label: "Entity View — Metadata",
    items: [
      { id: "ev-metadata-card", label: "MetadataCard" },
    ],
  },
  {
    label: "Entity View — Files",
    items: [
      { id: "ev-file-table", label: "FileTable" },
    ],
  },
  {
    label: "Entity View — Drawer",
    items: [
      { id: "ev-drawer-action-bar", label: "DrawerActionBar" },
    ],
  },
  {
    label: "Import CSV — Layout",
    items: [
      { id: "csv-sidebar", label: "ToolsSidebar" },
      { id: "csv-breadcrumb", label: "Breadcrumb" },
    ],
  },
  {
    label: "Import CSV — Components",
    items: [
      { id: "csv-status-badge", label: "StatusBadge" },
      { id: "csv-progress-bar", label: "ProgressBar" },
      { id: "csv-stats-card", label: "StatsCard" },
      { id: "csv-stepper", label: "Stepper" },
      { id: "csv-alert-banner", label: "AlertBanner" },
    ],
  },
  {
    label: "Filters & Lists",
    items: [
      { id: "fl-filters-button", label: "FiltersButton" },
      { id: "fl-filters-drawer", label: "FiltersDrawer" },
      { id: "fl-facet-section", label: "FacetSection" },
      { id: "fl-active-filter-chip", label: "ActiveFilterChip" },
      { id: "fl-view-mode-controls", label: "ViewModeControls" },
      { id: "fl-collapse-controls", label: "CollapseControls" },
      { id: "fl-list-info-row", label: "ListInfoRow" },
      { id: "fl-list-card-row", label: "ListCardRow" },
      { id: "fl-zoom-control", label: "ZoomControl" },
      { id: "fl-fade-truncate", label: "FadeTruncate" },
    ],
  },
  {
    label: "Shared",
    items: [
      { id: "sh-confirm-dialog", label: "ConfirmDialog" },
      { id: "sh-toast", label: "Toast" },
      { id: "sh-uwazi-loader", label: "UwaziLoader" },
    ],
  },
];

const allItemIds = sidebarGroups.flatMap((g) => g.items.map((i) => i.id));

export function ComponentCatalog() {
  const [activeId, setActiveId] = useState(allItemIds[0]);
  const contentRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setActiveId(id);
            sidebarBtnRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    itemRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    sidebarBtnRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <nav className="w-[220px] shrink-0 bg-paper border-r border-border/60 py-4 px-3 overflow-y-auto">
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
      <div ref={contentRef} className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">

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
                  tailwind="min-w-[20px] h-5 rounded-full bg-parchment text-ink-tertiary"
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

              <div id="ev-ref-row" ref={reg("ev-ref-row")}>
                <CatalogEntry
                  name="RefRow"
                  description="Single reference entry with entity pill, page tag, text preview"
                  code={`<RefRow
  reference={reference}
  onDelete={(id) => {}}
/>`}
                >
                  <div className="w-full max-w-md border border-border/40 rounded-md overflow-hidden">
                    <IsolatedRefRow />
                  </div>
                </CatalogEntry>
              </div>

              <div id="ev-grouped-card" ref={reg("ev-grouped-card")}>
                <CatalogEntry
                  name="GroupedCard"
                  description="Collapsible group of references with expand/collapse + count badge"
                  code={`<GroupedCard
  title="Person"
  color="#7C3AED"
  references={references.slice(0, 3)}
  onDeleteRef={(id) => {}}
  defaultExpanded
/>`}
                >
                  <div className="w-full max-w-md">
                    <IsolatedGroupedCard />
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

              <div id="ev-density-card" ref={reg("ev-density-card")}>
                <CatalogEntry
                  name="DensityCard"
                  description="Stacked bar chart showing reference density by relation type"
                  code={`<DensityCard
  references={references}
  totalPages={15}
/>`}
                >
                  <div className="w-full max-w-md bg-paper border border-border/40 rounded-md">
                    <DensityCard references={references} totalPages={15} />
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

              <div id="fl-zoom-control" ref={reg("fl-zoom-control")}>
                <CatalogEntry
                  name="ZoomControl"
                  description="Segmented detail/compact/overview + graph toggle for the Relationships view"
                  code={`<ZoomControl />

{/* Bound to relationshipsZoomAtom + relationshipsViewModeAtom */}`}
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
                      <p className="text-sm text-ink-secondary flex items-center gap-1.5">
                        <UwaziLoader size="xs" /> Extracting information
                      </p>
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
        </div>
      </div>
    </div>
  );
}

// ---------- Isolated demos ----------

function SegmentedTabsDemo() {
  const [active, setActive] = useState("all");
  return (
    <SegmentedTabs
      tabs={[
        { id: "all", label: "All", count: 12 },
        { id: "docs", label: "Documents", count: 4 },
        { id: "refs", label: "References", count: 8 },
      ]}
      activeId={active}
      onChange={setActive}
    />
  );
}

function DrawerTabsDemo() {
  const [active, setActive] = useState("metadata");
  return (
    <DrawerTabs
      tabs={[
        { id: "metadata", label: "Metadata" },
        { id: "references", label: "References", count: 12 },
        { id: "toc", label: "TOC" },
      ]}
      activeId={active}
      onChange={setActive}
    />
  );
}

function MainTabsDemo() {
  const [active, setActive] = useState("document");
  return (
    <MainTabs
      tabs={[
        { id: "metadata", label: "Metadata" },
        { id: "document", label: "Document" },
        { id: "references", label: "References", count: 12 },
        { id: "files", label: "Files", count: 6 },
      ]}
      activeId={active}
      onChange={setActive}
    />
  );
}

function FileTableDemo() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const subset = files.slice(0, 4);
  return (
    <FileTable
      files={subset}
      selectedIds={selected}
      onSelect={(id) =>
        setSelected((prev) => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        })
      }
      onSelectAll={() =>
        setSelected((prev) =>
          prev.size === subset.length ? new Set() : new Set(subset.map((f) => f.id))
        )
      }
    />
  );
}

function IsolatedSearchBar() {
  const [query, setQuery] = useState("");
  return (
    <div className="w-full max-w-sm">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search"
          className="w-full h-8 pl-3 pr-8 text-xs font-medium bg-warm border border-border rounded-md
            placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20
            focus:border-carbon/40 transition-all"
        />
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
      </div>
    </div>
  );
}

function IsolatedFiltersRow() {
  const store = createStore();
  return (
    <Provider store={store}>
      <div className="w-full">
        <FiltersRow onCollapseAll={() => {}} onExpandAll={() => {}} />
      </div>
    </Provider>
  );
}

function IsolatedGroupedCard() {
  const store = createStore();
  return (
    <Provider store={store}>
      <GroupedCard
        title="Person"
        color="#7C3AED"
        references={references.slice(0, 3)}
        onDeleteRef={() => {}}
        defaultExpanded
      />
    </Provider>
  );
}

function IsolatedRefRow() {
  const store = createStore();
  return (
    <Provider store={store}>
      <RefRow reference={references[0]} onDelete={() => {}} />
      <RefRow reference={references[1]} onDelete={() => {}} />
    </Provider>
  );
}

function IsolatedActionBar() {
  const store = createStore();
  return (
    <Provider store={store}>
      <div className="w-full border border-border/40 rounded-md overflow-hidden">
        <ActionBar numPages={15} onScrollToPage={() => {}} />
      </div>
    </Provider>
  );
}

function FiltersDrawerDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <FiltersButton activeCount={open ? 2 : 0} onClick={() => setOpen(true)} />
      <div className="relative overflow-hidden mt-3 h-60 border border-border/60 rounded-md bg-paper">
        <div className="px-3 py-2 text-xs text-ink-muted">
          Demo container — FiltersDrawer is scoped to this pane.
        </div>
        <FiltersDrawer
          open={open}
          onClose={() => setOpen(false)}
          footer={
            <button className="text-[11px] font-medium text-ink-secondary hover:text-ink cursor-pointer">
              Clear all filters
            </button>
          }
        >
          <FacetSection
            title="Relation type"
            total={3}
            entries={[
              ["cites", 31],
              ["mentions", 12],
              ["refers", 7],
            ]}
            selected={{ cites: true }}
            onToggle={() => {}}
            label={(id) =>
              id === "cites" ? "Cites" : id === "mentions" ? "Mentions" : "Refers to"
            }
          />
        </FiltersDrawer>
      </div>
    </div>
  );
}

function FacetSectionDemo() {
  const [selected, setSelected] = useState<Record<string, boolean>>({ person: true });
  const entries: [string, number][] = [
    ["person", 8],
    ["country", 5],
    ["org", 3],
    ["case", 12],
  ];
  const colors: Record<string, string> = {
    person: "#7C3AED",
    country: "#16A34A",
    org: "#C026D3",
    case: "#0EA5E9",
  };
  const labels: Record<string, string> = {
    person: "Person",
    country: "Country",
    org: "Organization",
    case: "Court Case",
  };
  return (
    <div className="w-full max-w-xs border border-border/60 rounded-md bg-paper overflow-hidden">
      <FacetSection
        title="Target entity type"
        total={entries.length}
        entries={entries}
        selected={selected}
        onToggle={(id) =>
          setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
        }
        label={(id) => labels[id] ?? id}
        renderMarker={(id) => (
          <span
            className="shrink-0 rounded-[2px]"
            style={{ width: 8, height: 8, backgroundColor: colors[id] }}
          />
        )}
      />
    </div>
  );
}

function IsolatedViewModeControls() {
  const store = createStore();
  return (
    <Provider store={store}>
      <div className="flex flex-col gap-3">
        <ViewModeControls />
        <ViewModeControls modes={["all", "by-entity-type", "by-relation-type"]} />
      </div>
    </Provider>
  );
}

function IsolatedCollapseControls() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-6">
        <CollapseControls onCollapseAll={() => {}} onExpandAll={() => {}} />
        <span className="text-[10px] text-ink-muted">default (atom-driven)</span>
      </div>
      <div className="flex items-center gap-6">
        <CollapseControls
          onCollapseAll={() => {}}
          onExpandAll={() => {}}
          disabled
        />
        <span className="text-[10px] text-ink-muted">disabled (e.g. viewMode === "all")</span>
      </div>
    </div>
  );
}

function IsolatedListInfoRow() {
  const store = createStore();
  return (
    <Provider store={store}>
      <div className="w-full border border-border/40 rounded-md bg-paper">
        <ListInfoRow
          count={
            <>
              <span className="font-semibold text-ink-secondary tabular-nums">221</span>{" "}
              references
            </>
          }
          activeFilterCount={0}
          rightSlot={
            <CollapseControls onCollapseAll={() => {}} onExpandAll={() => {}} disabled />
          }
        />
      </div>
    </Provider>
  );
}

function IsolatedZoomControl() {
  const store = createStore();
  return (
    <Provider store={store}>
      <ZoomControl />
    </Provider>
  );
}
