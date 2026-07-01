import { useEffect, useState } from "react";
import { createStore, Provider, useSetAtom } from "jotai";
import { ChevronDown } from "lucide-react";

// Components
import { SegmentedTabs } from "../../components/layout/SegmentedTabs";
import { DrawerTabs } from "../../components/layout/DrawerTabs";
import { MainTabs } from "../../components/layout/MainTabs";
import { Beacon } from "../../components/layout/Beacon";
import { FileTable } from "../../components/files/FileTable";
import { FiltersRow, ViewModeControls, CollapseControls } from "../../components/relationships/FiltersRow";
import { FiltersButton } from "../../components/shared/FiltersButton";
import { FiltersDrawer } from "../../components/shared/FiltersDrawer";
import { FacetSection } from "../../components/shared/FacetSection";
import { RadioGroup } from "../../components/shared/RadioGroup";
import { DataTable } from "../../components/shared/DataTable";
import { FadeTruncate } from "../../components/shared/FadeTruncate";
import { ListInfoRow } from "../../components/shared/ListInfoRow";
import { Checkbox } from "../../components/shared/Checkbox";
import { ZoomControl } from "../../components/relationships/ZoomControl";
import { RelationshipRow } from "../../components/relationships/RelationshipRow";
import { RelationshipGroupedCard } from "../../components/relationships/RelationshipGroupedCard";
import { ViewControls } from "../../components/relationships/ViewControls";
import { SortControl } from "../../components/relationships/SortControl";
import { DirectionGlyph } from "../../components/relationships/DirectionGlyph";
import { RelationshipsActionBar } from "../../components/relationships/RelationshipsActionBar";
import { ManageRelationTypesModal } from "../../components/relationships/ManageRelationTypesModal";
import { SelectControls } from "../../components/shared/SelectControls";
import { ActionBar } from "../../components/viewer/ActionBar";
import { RefMinimap } from "../../components/viewer/RefMinimap";

// Atoms & data
import { deriveHubs, deriveRelationships } from "../../utils/relationships";
import { editModeAtom, selectedRefIdsAtom, zoomAtom, type Zoom, type GroupBy } from "../../atoms/filters";
import { manageRelationTypesOpenAtom } from "../../atoms/references";
import { groupingOptions } from "../../utils/connectionGrouping";
import { references } from "../../data/references";
import { files } from "../../data/files";
import { ConnectionGroupCard } from "../../components/metadata/ConnectionGroupCard";
import { RelationshipFieldCard } from "../../components/metadata/RelationshipFieldCard";
import { InheritedValueChip, RelationCaption } from "../../components/metadata/InheritedValueChip";
import { RelationshipFieldEditor } from "../../components/metadata/RelationshipFieldEditor";
import { groupConnections, resolveRelationshipField } from "../../utils/inheritance";
import { relationshipFieldsByLanguage } from "../../data/metadata";

// Re-export so the catalog can use it directly without re-importing.
export { FadeTruncate };

export function SegmentedTabsDemo() {
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

export function DrawerTabsDemo() {
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

export function MainTabsDemo() {
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

export function FileTableDemo() {
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
      onRequestDelete={() => {}}
    />
  );
}

export function IsolatedSearchBar() {
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

export function IsolatedBeacon() {
  // Fresh store → the demo runs its own seeded import + notifications and
  // ticks to completion independently of the live navbar instance.
  const store = createStore();
  return (
    <Provider store={store}>
      <div className="relative h-[52px] w-full bg-paper border border-border-soft rounded-lg flex items-center justify-end px-4">
        <Beacon />
      </div>
    </Provider>
  );
}

export function IsolatedFiltersRow() {
  const store = createStore();
  return (
    <Provider store={store}>
      <div className="w-full">
        <FiltersRow onCollapseAll={() => {}} onExpandAll={() => {}} />
      </div>
    </Provider>
  );
}

export function IsolatedRelationshipGroupedCard() {
  const store = createStore();
  return (
    <Provider store={store}>
      <RelationshipGroupedCard
        title="Person"
        color="#7C3AED"
        count={3}
        defaultExpanded
      >
        {references.slice(0, 3).map((ref) => (
          <RelationshipRow
            key={ref.id}
            kind="reference"
            reference={ref}
            onDelete={() => {}}
          />
        ))}
      </RelationshipGroupedCard>
    </Provider>
  );
}

export function IsolatedRelationshipRowReference() {
  // Find an entity-level ref (no sourceSelection) so the "no text anchor"
  // variant is shown alongside the standard text-anchored one.
  const entityLevelRef = references.find((r) => !r.sourceSelection) ?? references[0];
  return (
    <div className="flex flex-col gap-3">
      <ZoomedRowDemo
        label="Detail · text-anchored"
        zoom="detail"
      >
        <RelationshipRow kind="reference" reference={references[0]} onDelete={() => {}} />
      </ZoomedRowDemo>
      <ZoomedRowDemo
        label="Detail · entity-level (no source selection)"
        zoom="detail"
      >
        <RelationshipRow kind="reference" reference={entityLevelRef} onDelete={() => {}} />
      </ZoomedRowDemo>
      <ZoomedRowDemo label="Compact" zoom="compact">
        {references.slice(0, 3).map((ref) => (
          <RelationshipRow key={ref.id} kind="reference" reference={ref} />
        ))}
      </ZoomedRowDemo>
      <ZoomedRowDemo label="Overview · stacked rows at the densest tier" zoom="overview">
        {references.slice(0, 5).map((ref) => (
          <RelationshipRow key={ref.id} kind="reference" reference={ref} />
        ))}
      </ZoomedRowDemo>
      <ZoomedRowDemo
        label="Nested (inline-expand under an aggregate)"
        zoom="detail"
      >
        <RelationshipRow kind="reference" reference={references[0]} nested />
      </ZoomedRowDemo>
    </div>
  );
}

/** Render `children` inside a fresh atom store with `zoomAtom` pre-set. The
 *  catalog uses this for showing rows at every density without leaking into
 *  the real surface. */
function ZoomedRowDemo({
  zoom,
  label,
  children,
}: {
  zoom: Zoom;
  label: string;
  children: React.ReactNode;
}) {
  const store = createStore();
  store.set(zoomAtom, zoom);
  return (
    <div>
      <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1.5">
        {label}
      </p>
      <Provider store={store}>
        <div className="w-full max-w-md border border-border/40 rounded-md overflow-hidden">
          {children}
        </div>
      </Provider>
    </div>
  );
}

export function IsolatedActionBar() {
  const store = createStore();
  return (
    <Provider store={store}>
      <div className="w-full border border-border/40 rounded-md overflow-hidden">
        <ActionBar numPages={15} onScrollToPage={() => {}} />
      </div>
    </Provider>
  );
}

/* ── Metadata: relationship & inherited fields ── */

/** Multi-inheritance: the "People involved" connection (country + role columns)
 *  rendered as one table. */
export function IsolatedConnectionGroupCard() {
  const store = createStore();
  const { groups } = groupConnections(relationshipFieldsByLanguage.EN, "EN");
  return (
    <Provider store={store}>
      <div className="flex flex-col gap-3 max-w-2xl">
        {groups.map((g) => (
          <ConnectionGroupCard key={g.connectionKey} group={g} span="single" />
        ))}
      </div>
    </Provider>
  );
}

/** Single-inheritance ("Related cases" → Region) and link-only ("Rights
 *  invoked") on the same lightweight card. */
export function IsolatedRelationshipFieldCard() {
  const store = createStore();
  const fields = relationshipFieldsByLanguage.EN;
  const single = fields.find((f) => f.id === "rel-cases")!;
  const link = fields.find((f) => f.id === "rel-rights")!;
  return (
    <Provider store={store}>
      <div className="flex flex-col gap-3 max-w-md">
        <RelationshipFieldCard field={single} span="single" />
        <RelationshipFieldCard field={link} span="single" />
      </div>
    </Provider>
  );
}

/** One connected-entity row: pill + inherited value, plus the missing-value
 *  (em-dash) state. */
export function IsolatedInheritedValueChip() {
  const store = createStore();
  const field = relationshipFieldsByLanguage.EN.find((f) => f.id === "rel-cases")!;
  const resolved = resolveRelationshipField(field, "EN");
  return (
    <Provider store={store}>
      <div className="flex flex-col gap-2 max-w-sm">
        <RelationCaption relationLabel={resolved.relationLabel} inheritLabel={field.inheritLabel} />
        {resolved.values.map((v) => (
          <InheritedValueChip key={v.entityId} value={v} inherits relationLabel={resolved.relationLabel} />
        ))}
      </div>
    </Provider>
  );
}

/** The connection editor — add/remove entities; inherited previews are
 *  read-only. Stateful so the catalog demo is interactive. */
export function IsolatedRelationshipFieldEditor() {
  const store = createStore();
  return (
    <Provider store={store}>
      <RelationshipFieldEditorDemo />
    </Provider>
  );
}

function RelationshipFieldEditorDemo() {
  const { groups } = groupConnections(relationshipFieldsByLanguage.EN, "EN");
  const g = groups[0];
  const [ids, setIds] = useState<string[]>(g.rows.map((r) => r.entityId));
  return (
    <div className="max-w-md">
      <RelationshipFieldEditor
        title={g.label}
        relationLabel={g.relationLabel}
        targetTypeId={g.targetTypeId}
        columns={g.columns}
        entityIds={ids}
        onChange={setIds}
      />
    </div>
  );
}

export function IsolatedRefMinimap() {
  const store = createStore();
  // `RefMinimap` uses `position: absolute` with top/bottom/right offsets so
  // it can sit alongside the real document viewer. The catalog demo needs a
  // positioned + min-height wrapper, otherwise the minimap escapes to the
  // nearest positioned ancestor up the tree.
  return (
    <Provider store={store}>
      <div className="relative w-full h-[360px] rounded-md border border-border/40 bg-paper overflow-hidden">
        <div className="absolute inset-0 right-[80px] px-6 py-4 text-[10px] text-ink-tertiary leading-relaxed">
          <p>
            (Document column — the minimap on the right shows a dot per text
            anchor in <code>referencesAtom</code>. Dots cluster by vertical
            position and colour by target entity type. Click a dot to jump to
            the matching reference; the toggle at the top switches between
            global page-by-page mode and current-page mode.)
          </p>
        </div>
        <RefMinimap numPages={14} />
      </div>
      <p className="text-[10px] text-ink-muted mt-2">
        Driven by <code>referencesAtom</code>, <code>activeRefIdAtom</code>,
        and <code>currentPageAtom</code>. Entity-level refs (no page anchor)
        are filtered out of the track.
      </p>
    </Provider>
  );
}

const DESCRIPTOR_FACET: [string, number][] = [
  ["Derecho a la vida", 142],
  ["Integridad personal", 118],
  ["Garantías judiciales", 96],
  ["Libertad personal", 74],
  ["Protección judicial", 61],
  ["Desaparición forzada", 53],
  ["Derechos del niño", 38],
  ["Libertad de expresión", 29],
  ["Propiedad privada", 22],
  ["Circulación y residencia", 14],
];

export function FiltersDrawerDemo() {
  const [open, setOpen] = useState(false);
  const [relSel, setRelSel] = useState<Record<string, boolean>>({ cites: true });
  const [descSel, setDescSel] = useState<Record<string, boolean>>({});
  const [descMode, setDescMode] = useState<"AND" | "OR">("OR");
  const activeCount =
    Object.values(relSel).filter(Boolean).length +
    Object.values(descSel).filter(Boolean).length;
  const toggle =
    (set: typeof setRelSel) => (id: string) =>
      set((s) => ({ ...s, [id]: !s[id] }));
  return (
    <div className="w-full">
      <FiltersButton activeCount={activeCount} onClick={() => setOpen(true)} />
      <div className="relative overflow-hidden mt-3 h-72 border border-border/60 rounded-md bg-paper">
        <div className="px-3 py-2 text-xs text-ink-muted">
          Demo container — FiltersDrawer is scoped to this pane. The descriptor
          block is searchable, capped with “Show more”, and has an Any/All mode.
        </div>
        <FiltersDrawer
          open={open}
          onClose={() => setOpen(false)}
          footer={
            <button
              onClick={() => {
                setRelSel({});
                setDescSel({});
              }}
              className="text-[11px] font-medium text-ink-secondary hover:text-ink cursor-pointer"
            >
              Clear all filters
            </button>
          }
        >
          <FacetSection
            title="Relation type"
            total={50}
            entries={[
              ["cites", 31],
              ["mentions", 12],
              ["refers", 7],
            ]}
            selected={relSel}
            onToggle={toggle(setRelSel)}
            onClear={() => setRelSel({})}
            label={(id) =>
              id === "cites" ? "Cites" : id === "mentions" ? "Mentions" : "Refers to"
            }
          />
          <FacetSection
            title="Descriptores"
            total={216}
            entries={DESCRIPTOR_FACET}
            selected={descSel}
            onToggle={toggle(setDescSel)}
            onClear={() => setDescSel({})}
            mode={descMode}
            onModeChange={setDescMode}
            searchable
            label={(id) => id}
            defaultExpanded
          />
        </FiltersDrawer>
      </div>
    </div>
  );
}

export function FacetSectionDemo() {
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

export function IsolatedViewModeControls() {
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

export function IsolatedCollapseControls() {
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

export function IsolatedListInfoRow() {
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

export function IsolatedZoomControl() {
  const store = createStore();
  return (
    <Provider store={store}>
      <ZoomControl />
    </Provider>
  );
}

export function IsolatedCheckboxes() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <div className="flex items-center gap-5">
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={a} onChange={(e) => setA(e.target.checked)} ariaLabel="Unchecked demo" />
        <span className="text-xs text-ink">Unchecked</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={b} onChange={(e) => setB(e.target.checked)} ariaLabel="Checked demo" />
        <span className="text-xs text-ink">Checked</span>
      </label>
      <label className="flex items-center gap-2 opacity-60 cursor-not-allowed">
        <Checkbox checked={false} onChange={() => {}} disabled ariaLabel="Disabled demo" />
        <span className="text-xs text-ink">Disabled</span>
      </label>
    </div>
  );
}

export function IsolatedRelationshipRowAggregate() {
  const rels = deriveRelationships(references);
  if (rels.length === 0) return null;
  // Find a bidirectional aggregate (refs in both directions collapsed into
  // one row) so the catalog covers that state too. Fall back to the first
  // aggregate if no bidirectional ones exist in seed.
  const bidirectional = rels.find((r) => r.directions.length > 1) ?? rels[0];
  return (
    <div className="flex flex-col gap-3">
      <ZoomedRowDemo label="Detail · standard" zoom="detail">
        <RelationshipRow kind="aggregate" rel={rels[0]} />
      </ZoomedRowDemo>
      <ZoomedRowDemo label="Detail · bidirectional (both directions collapsed)" zoom="detail">
        <RelationshipRow kind="aggregate" rel={bidirectional} />
      </ZoomedRowDemo>
      <ZoomedRowDemo label="Detail · hidePill (used under groupBy=target-entity)" zoom="detail">
        <RelationshipRow kind="aggregate" rel={rels[0]} hidePill />
      </ZoomedRowDemo>
      <ZoomedRowDemo label="Compact" zoom="compact">
        {rels.slice(0, 3).map((rel) => (
          <RelationshipRow key={rel.id} kind="aggregate" rel={rel} />
        ))}
      </ZoomedRowDemo>
      <ZoomedRowDemo label="Overview · stacked rows at the densest tier" zoom="overview">
        {rels.slice(0, 5).map((rel) => (
          <RelationshipRow key={rel.id} kind="aggregate" rel={rel} />
        ))}
      </ZoomedRowDemo>
    </div>
  );
}

export function IsolatedRelationshipRowHub() {
  const hubs = deriveHubs(references);
  if (hubs.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <ZoomedRowDemo label="Detail" zoom="detail">
        <RelationshipRow kind="hub" hub={hubs[0]} />
      </ZoomedRowDemo>
      <ZoomedRowDemo label="Compact" zoom="compact">
        <RelationshipRow kind="hub" hub={hubs[0]} />
      </ZoomedRowDemo>
      <ZoomedRowDemo label="Overview" zoom="overview">
        <RelationshipRow kind="hub" hub={hubs[0]} />
      </ZoomedRowDemo>
    </div>
  );
}

export function IsolatedRowCheckbox() {
  const someRefIds = references.slice(0, 3).map((r) => r.id);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1.5">
          Edit mode off — checkbox hidden, row layout unchanged
        </p>
        <RowCheckboxDemo editMode={false} preselectedRefIds={[]} />
      </div>
      <div>
        <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1.5">
          Edit mode on — checkbox visible, none selected
        </p>
        <RowCheckboxDemo editMode preselectedRefIds={[]} />
      </div>
      <div>
        <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1.5">
          Edit mode on — aggregate row's checkbox covers every backing ref; toggles them as a set
        </p>
        <RowCheckboxDemo editMode preselectedRefIds={someRefIds} />
      </div>
    </div>
  );
}

function RowCheckboxDemo({
  editMode,
  preselectedRefIds,
}: {
  editMode: boolean;
  preselectedRefIds: string[];
}) {
  const store = createStore();
  store.set(editModeAtom, editMode);
  store.set(selectedRefIdsAtom, new Set(preselectedRefIds));
  return (
    <Provider store={store}>
      <div className="w-full max-w-md border border-border/40 rounded-md overflow-hidden">
        <RelationshipRow kind="reference" reference={references[0]} />
      </div>
    </Provider>
  );
}

export function IsolatedRelationshipsActionBar() {
  const store = createStore();
  return (
    <Provider store={store}>
      <div className="w-full border border-border/40 rounded-md overflow-hidden">
        <RelationshipsActionBar />
      </div>
      <p className="text-[10px] text-ink-muted mt-2">
        Click <span className="font-semibold">Edit</span> to reveal Create
        relationship / Manage types / Select all / Delete / Cancel / Save.
      </p>
    </Provider>
  );
}

export function IsolatedManageRelationTypesModal() {
  const store = createStore();
  return (
    <Provider store={store}>
      <ManageRelationTypesModalDemo />
    </Provider>
  );
}

function ManageRelationTypesModalDemo() {
  return (
    <div className="flex flex-col gap-2">
      <ManageModalOpenButton />
      <ManageRelationTypesModal />
      <p className="text-[10px] text-ink-muted">
        Add via slugified id; delete reassigns orphans to the "No label"
        fallback. The fallback type is non-deletable.
      </p>
    </div>
  );
}

function ManageModalOpenButton() {
  const setOpen = useSetAtom(manageRelationTypesOpenAtom);
  return (
    <button
      onClick={() => setOpen(true)}
      className="self-start px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
    >
      Open Manage Types
    </button>
  );
}

export function IsolatedSelectControls() {
  return (
    <div className="flex flex-col gap-3">
      <SelectControlsRow label="Empty list (both disabled)">
        <SelectControls
          allSelected={false}
          hasSelection={false}
          totalCount={0}
          onSelectAll={() => {}}
          onDeselectAll={() => {}}
        />
      </SelectControlsRow>
      <SelectControlsRow label="Partial selection (both enabled)">
        <SelectControls
          allSelected={false}
          hasSelection
          totalCount={12}
          onSelectAll={() => {}}
          onDeselectAll={() => {}}
        />
      </SelectControlsRow>
      <SelectControlsRow label="All selected (only Deselect enabled)">
        <SelectControls
          allSelected
          hasSelection
          totalCount={12}
          onSelectAll={() => {}}
          onDeselectAll={() => {}}
        />
      </SelectControlsRow>
    </div>
  );
}

function SelectControlsRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

export function IsolatedGroupByControlMutex() {
  const [primary, setPrimary] = useState<GroupBy>("relation-type");
  const [secondary, setSecondary] = useState<GroupBy>("none");
  useEffect(() => {
    if (primary !== "none" && secondary === primary) setSecondary("none");
  }, [primary, secondary]);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] text-ink-muted">
        Picking the same axis on both is a degenerate state — primary and
        secondary mutex out each other's selection. Switch primary to a value
        currently in secondary and secondary resets to "None".
      </p>
      <div className="flex items-center gap-2">
        <GroupByPicker
          label="Group by"
          value={primary}
          onChange={setPrimary}
          exclude={secondary === "none" ? undefined : secondary}
        />
        <GroupByPicker
          label="Then by"
          value={secondary}
          onChange={setSecondary}
          exclude={primary === "none" ? undefined : primary}
        />
      </div>
    </div>
  );
}

function GroupByPicker({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: GroupBy;
  onChange: (v: GroupBy) => void;
  exclude?: GroupBy;
}) {
  const visible = groupingOptions.filter(
    (o) => o.id === "none" || o.id !== exclude,
  );
  const active = visible.find((o) => o.id === value) ?? visible[0];
  return (
    <label className="flex items-center gap-1 h-8 px-2 text-[11px] font-medium bg-warm border border-border rounded-md text-ink-secondary cursor-pointer">
      <span className="text-ink-tertiary">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as GroupBy)}
        className="appearance-none bg-transparent pr-4 focus:outline-none cursor-pointer"
      >
        {visible.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={10} className="text-ink-muted -ml-3 pointer-events-none" />
      <span className="sr-only">{active.label}</span>
    </label>
  );
}

export function IsolatedRelationshipGroupedCardAggregate() {
  const store = createStore();
  const rels = deriveRelationships(references);
  if (rels.length === 0) return null;
  return (
    <Provider store={store}>
      <RelationshipGroupedCard
        title="Person"
        color="#7C3AED"
        count={rels.slice(0, 4).length}
        defaultExpanded
      >
        {rels.slice(0, 4).map((rel) => (
          <RelationshipRow key={rel.id} kind="aggregate" rel={rel} />
        ))}
      </RelationshipGroupedCard>
    </Provider>
  );
}

export function IsolatedViewControls() {
  const store = createStore();
  return (
    <Provider store={store}>
      <ViewControls />
    </Provider>
  );
}

export function IsolatedSortControl() {
  const store = createStore();
  return (
    <Provider store={store}>
      <SortControl />
    </Provider>
  );
}

export function IsolatedDirectionGlyph() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <DirectionGlyph direction="outgoing" />
        <DirectionGlyph direction="incoming" />
        <DirectionGlyph direction="both" />
        <span className="text-[10px] text-ink-muted">sm</span>
      </div>
      <div className="flex items-center gap-3">
        <DirectionGlyph direction="outgoing" size="md" />
        <DirectionGlyph direction="incoming" size="md" />
        <DirectionGlyph direction="both" size="md" />
        <span className="text-[10px] text-ink-muted">md</span>
      </div>
    </div>
  );
}

export function IsolatedRadioGroup() {
  const [value, setValue] = useState("cards");
  return (
    <RadioGroup
      name="catalog-radio"
      ariaLabel="Default view"
      value={value}
      onChange={setValue}
      options={[
        { id: "cards", label: "Cards", hint: "Visual entity cards" },
        { id: "table", label: "Table", hint: "Dense rows" },
        { id: "map", label: "Map", hint: "Geographic" },
      ]}
    />
  );
}

export function IsolatedDataTable() {
  const [selected, setSelected] = useState<string | null>("r2");
  const rows = [
    { id: "r1", name: "Court Case", count: 18 },
    { id: "r2", name: "Person", count: 13 },
    { id: "r3", name: "Country", count: 9 },
  ];
  return (
    <DataTable
      data={rows}
      getRowId={(r) => r.id}
      onRowClick={(r) => setSelected(r.id)}
      isRowSelected={(r) => r.id === selected}
      footer={<span>{rows.length} rows</span>}
      columns={[
        { id: "name", header: "Template", cell: (r) => <span className="text-xs font-medium text-ink">{r.name}</span> },
        { id: "count", header: "Entities", width: "6rem", align: "right", cell: (r) => <span className="text-xs text-ink-tertiary tabular-nums">{r.count}</span> },
      ]}
    />
  );
}
