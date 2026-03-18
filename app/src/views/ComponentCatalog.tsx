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
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { DrawerActionBar } from "../components/references/DrawerActionBar";
import { FiltersRow } from "../components/references/FiltersRow";
import { GroupedCard } from "../components/references/GroupedCard";
import { RefRow } from "../components/references/RefRow";
import { ActionBar } from "../components/viewer/ActionBar";

// Icons for MetadataCard
import { FileText } from "lucide-react";

// Data
import { references } from "../data/references";
import { files } from "../data/files";

const sections = [
  { id: "style-guide", label: "Style Guide" },
  { id: "elements", label: "Elements" },
  { id: "components", label: "Components" },
];

export function ComponentCatalog() {
  const [activeSection, setActiveSection] = useState("style-guide");
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // IntersectionObserver for scroll tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      {
        root: contentRef.current,
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0,
      }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    sectionRefs.current.get(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const registerRef = (id: string) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <nav className="w-[200px] shrink-0 bg-paper border-r border-border/60 py-4 px-3 flex flex-col gap-1">
        <h2 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider px-2 mb-2">
          Catalog
        </h2>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className={`text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
              activeSection === s.id
                ? "bg-vellum text-ink font-medium"
                : "text-ink-tertiary hover:text-ink-secondary hover:bg-warm"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-12">
          {/* Style Guide */}
          <section id="style-guide" ref={registerRef("style-guide")}>
            <h2 className="text-lg font-bold text-ink mb-6">Style Guide</h2>
            <StyleGuide />
          </section>

          {/* Elements */}
          <section id="elements" ref={registerRef("elements")}>
            <h2 className="text-lg font-bold text-ink mb-6">Elements</h2>
            <div className="flex flex-col gap-6">
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

              <CatalogEntry
                name="Button patterns"
                description="Primary, secondary, ghost, and danger button styles"
                code={`{/* Primary */}
<button className="px-4 py-2 text-sm font-medium rounded-md bg-ink text-white hover:bg-ink/90">
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
  Compact
</button>`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button className="px-4 py-2 text-sm font-medium rounded-md bg-ink text-white hover:bg-ink/90 transition-colors">
                    Primary
                  </button>
                  <button className="px-4 py-2 text-sm font-medium rounded-md border border-border text-ink-secondary hover:bg-parchment transition-colors">
                    Secondary
                  </button>
                  <button className="px-4 py-2 text-sm font-medium rounded-md bg-seal text-white hover:bg-seal/90 transition-colors">
                    Delete
                  </button>
                  <button className="px-3 py-1.5 text-xs font-medium text-ink-tertiary hover:text-ink-secondary hover:bg-warm rounded-md transition-colors">
                    Ghost
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors">
                    Compact
                  </button>
                </div>
              </CatalogEntry>
            </div>
          </section>

          {/* Components */}
          <section id="components" ref={registerRef("components")}>
            <h2 className="text-lg font-bold text-ink mb-6">Components</h2>
            <div className="flex flex-col gap-6">
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

              <CatalogEntry
                name="MainTabs"
                description="Primary navigation tabs with back arrow and language badges"
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

              <CatalogEntry
                name="SearchBar"
                description="Search input with icon, connected to filter atoms"
                code={`<SearchBar />

{/* Uses searchQueryAtom from atoms/filters.ts */}
{/* Wrap in isolated <Provider> to avoid shared state */}`}
              >
                <IsolatedSearchBar />
              </CatalogEntry>

              <CatalogEntry
                name="FiltersRow"
                description="View mode toggle + sort dropdown + collapse/expand controls"
                code={`<FiltersRow
  onCollapseAll={() => {}}
  onExpandAll={() => {}}
/>

{/* Uses viewModeAtom, sortOrderAtom, expandedGroupCountAtom */}
{/* Wrap in isolated <Provider> to avoid shared state */}`}
              >
                <IsolatedFiltersRow />
              </CatalogEntry>

              <CatalogEntry
                name="HighlightCard"
                description="Reference card with highlighted text snippet and entity pill"
                code={`<HighlightCard reference={reference} />

{/* Props: { reference: Reference } */}
{/* Shows EntityPill, PageTag, and quoted text */}`}
              >
                <div className="w-full max-w-md">
                  <HighlightCard reference={references[0]} />
                </div>
              </CatalogEntry>

              <CatalogEntry
                name="DensityCard"
                description="Bar chart showing reference density across document pages"
                code={`<DensityCard
  references={references}
  totalPages={15}
/>`}
              >
                <div className="w-full max-w-md bg-paper border border-border/40 rounded-md">
                  <DensityCard references={references} totalPages={15} />
                </div>
              </CatalogEntry>

              <CatalogEntry
                name="RelatedDocCard"
                description="Card showing a related document with entity type and reference count"
                code={`<RelatedDocCard
  title="Case 12.045 — Pueblo Bello Massacre"
  entityTypeId="court_case"
  referenceCount={7}
/>`}
              >
                <div className="w-full max-w-md">
                  <RelatedDocCard title="Case 12.045 — Pueblo Bello Massacre" entityTypeId="court_case" referenceCount={7} />
                  <div className="h-2" />
                  <RelatedDocCard title="Right to Life — Article 4" entityTypeId="right" referenceCount={3} />
                </div>
              </CatalogEntry>

              <CatalogEntry
                name="GroupedCard"
                description="Collapsible group of references with expand/collapse + count badge"
                code={`<GroupedCard
  title="Person"
  color="#7C3AED"
  references={references.slice(0, 3)}
  onDeleteRef={(id) => {}}
  defaultExpanded
/>

{/* Uses expand/collapse signal atoms */}
{/* Wrap in isolated <Provider> to avoid shared state */}`}
              >
                <div className="w-full max-w-md">
                  <IsolatedGroupedCard />
                </div>
              </CatalogEntry>

              <CatalogEntry
                name="RefRow"
                description="Single reference entry with entity pill, page tag, text preview"
                code={`<RefRow
  reference={reference}
  onDelete={(id) => {}}
/>

{/* Uses activeRefIdAtom, scrollToHighlightAtom */}
{/* Wrap in isolated <Provider> to avoid shared state */}`}
              >
                <div className="w-full max-w-md border border-border/40 rounded-md overflow-hidden">
                  <IsolatedRefRow />
                </div>
              </CatalogEntry>

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

              <CatalogEntry
                name="FloatingMenu"
                description="Context menu appearing on text selection in document viewer"
                code={`<FloatingMenu x={200} y={100} text="selected text" />

{/* Normally fixed-positioned, shown here in relative container */}
{/* Dark bg-ink bar with Create Reference, Copy, Highlight buttons */}`}
              >
                <div className="relative h-16 w-full flex items-center justify-center">
                  <div className="flex items-center gap-0.5 bg-ink rounded-md shadow-xl px-1 py-1">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md hover:bg-white/15 transition-colors">
                      Create Reference
                    </button>
                    <div className="w-px h-4 bg-white/20" />
                    <button className="p-1.5 text-white/70 rounded-md hover:bg-white/15 hover:text-white transition-colors">
                      Copy
                    </button>
                    <button className="p-1.5 text-white/70 rounded-md hover:bg-white/15 hover:text-white transition-colors">
                      Highlight
                    </button>
                  </div>
                </div>
              </CatalogEntry>

              <CatalogEntry
                name="ActionBar"
                description="Document viewer footer with OCR button and page navigation"
                code={`<ActionBar numPages={15} onScrollToPage={(page) => {}} />

{/* Uses currentPageAtom for page display */}
{/* Wrap in isolated <Provider> to avoid shared state */}`}
              >
                <IsolatedActionBar />
              </CatalogEntry>

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
                        <button className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-ink-secondary hover:bg-parchment transition-colors">
                          Cancel
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-seal text-white hover:bg-seal/90 transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CatalogEntry>

              <CatalogEntry
                name="HoverExpand"
                description="Tooltip-like card that appears on reference highlight hover"
                code={`<HoverExpand reference={reference} x={200} y={100} />

{/* Normally fixed-positioned, pointer-events-none */}
{/* Shows EntityPill, relation type, quoted text */}`}
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

              <CatalogEntry
                name="Toast notifications"
                description="Success, error, and info toast messages"
                code={`{/* Toast system uses toastsAtom from atoms/references.ts */}
{/* Add toast: setToasts(prev => [...prev, { id, type, message }]) */}

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
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------- Isolated demos (own Jotai store, no shared state) ----------

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
  return (
    <FileTable
      files={files.slice(0, 4)}
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
          prev.size === 4 ? new Set() : new Set(files.slice(0, 4).map((f) => f.id))
        )
      }
    />
  );
}

function IsolatedSearchBar() {
  // Inline version to avoid atom dependency
  const [query, setQuery] = useState("");
  return (
    <div className="w-full max-w-sm">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full h-8 pl-3 pr-8 text-xs font-medium bg-warm border border-border rounded-md
            placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20
            focus:border-carbon/40 transition-all"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
    </div>
  );
}

function IsolatedFiltersRow() {
  const store = createStore();
  return (
    <Provider store={store}>
      <div className="w-full max-w-md">
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
