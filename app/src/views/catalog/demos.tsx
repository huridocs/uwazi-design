import { useEffect, useState } from "react";
import { createStore, Provider, useSetAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { AddThesaurusValueModal, ThesaurusPicker } from "../../components/metadata/ThesaurusPicker";
import { BulkFieldRow } from "../../components/metadata/BulkFieldRow";
import { SelectionActionsMenu } from "../../components/library/SelectionActionsMenu";
import { ChangeTemplateDialog } from "../../components/library/ChangeTemplateDialog";
import { ShareEntityModal } from "../../components/share/ShareEntityModal";
import { entityTypes } from "../../data/entities";
import { FileDown, LayoutTemplate, Lock, Share2, Trash2 } from "lucide-react";
import { seedThesaurusValues, type ThesaurusValue } from "../../data/settings";
import { selectableLabels } from "../../atoms/thesauri";

// Components
import { SegmentedTabs } from "../../components/layout/SegmentedTabs";
import { DrawerTabs } from "../../components/layout/DrawerTabs";
import { MainTabs } from "../../components/layout/MainTabs";
import { Beacon } from "../../components/layout/Beacon";
import { FileTable } from "../../components/files/FileTable";
import { CollapseControls } from "../../components/relationships/CollapseControls";
import { FiltersButton } from "../../components/shared/FiltersButton";
import { FiltersDrawer } from "../../components/shared/FiltersDrawer";
import { FacetSection } from "../../components/shared/FacetSection";
import { RadioGroup } from "../../components/shared/RadioGroup";
import { DataTable } from "../../components/shared/DataTable";
import { FadeTruncate } from "../../components/shared/FadeTruncate";
import { ListInfoRow } from "../../components/shared/ListInfoRow";
import { ToggleChip } from "../../components/shared/ToggleChip";
import { Checkbox } from "../../components/shared/Checkbox";
import { ZoomControl } from "../../components/relationships/ZoomControl";
import { RelationshipRow } from "../../components/relationships/RelationshipRow";
import { RelationshipGroupedCard } from "../../components/relationships/RelationshipGroupedCard";
import { ViewControls } from "../../components/relationships/ViewControls";
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
import { InheritedValueChip, RelationCaption } from "../../components/metadata/InheritedValue";
import { RelationshipFieldEditor } from "../../components/metadata/RelationshipFieldEditor";
import { groupConnections, resolveRelationshipField } from "../../utils/inheritance";
import { relationshipFieldsByLanguage } from "../../data/metadata";
import { ViewSwitcher } from "../../components/library/ViewSwitcher";
import { CopyFromPicker } from "../../components/metadata/CopyFromPicker";
import { copyUnitsOneToOne } from "../../utils/copyFrom";
import { entities } from "../../data/entities";

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
    // The strip takes its side inset from its host, as in the app.
    <div data-gutter-host className="gutter-host">
      <DrawerTabs
        tabs={[
          { id: "metadata", label: "Metadata" },
          { id: "references", label: "References", count: 12 },
          { id: "toc", label: "TOC" },
        ]}
        activeId={active}
        onChange={setActive}
      />
    </div>
  );
}

export function MainTabsDemo() {
  const [active, setActive] = useState("document");
  return (
    // The strip takes its side inset from its host, as in the app.
    <div data-gutter-host className="gutter-host">
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
    </div>
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
      <div className="relative h-13 w-full bg-paper border border-border-soft rounded-lg flex items-center justify-end px-4">
        <Beacon />
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
      <p className="text-meta text-ink-muted uppercase tracking-wide mb-1.5">
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
      <div className="gutter-host w-full border border-border/40 rounded-md overflow-hidden">
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
      <div className="relative w-full h-[22.5rem] rounded-md border border-border/40 bg-paper overflow-hidden">
        <div className="absolute inset-0 right-[80px] px-6 py-4 text-meta text-ink-tertiary leading-relaxed">
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
      <p className="text-meta text-ink-muted mt-2">
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
              className="text-meta font-medium text-ink-secondary hover:text-ink cursor-pointer"
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

/** The match-type chips as they ride the Library's Results header — one on, one
 *  off, so both states of the shared toggle chip are visible at once. */
export function ToggleChipDemo() {
  const [on, setOn] = useState<Record<string, boolean>>({
    title: true,
    properties: true,
    document: false,
  });
  const chips: [string, string, number][] = [
    ["title", "Title", 3],
    ["properties", "Properties", 63],
    ["document", "Document", 658],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {chips.map(([key, label, count]) => (
        <ToggleChip
          key={key}
          label={label}
          count={count}
          active={on[key]}
          onToggle={() => setOn((s) => ({ ...s, [key]: !s[key] }))}
        />
      ))}
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
    <div className="gutter-host w-full max-w-xs border border-border/60 rounded-md bg-paper overflow-hidden">
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
            className="shrink-0 rounded-[2px] w-2 h-2"
            style={{ backgroundColor: colors[id] }}
          />
        )}
      />
    </div>
  );
}

export function IsolatedCollapseControls() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-6">
        <CollapseControls onCollapseAll={() => {}} onExpandAll={() => {}} />
        <span className="text-meta text-ink-muted">default (atom-driven)</span>
      </div>
      <div className="flex items-center gap-6">
        <CollapseControls
          onCollapseAll={() => {}}
          onExpandAll={() => {}}
          disabled
        />
        <span className="text-meta text-ink-muted">disabled (e.g. viewMode === "all")</span>
      </div>
    </div>
  );
}

export function IsolatedListInfoRow() {
  const store = createStore();
  return (
    <Provider store={store}>
      <div data-gutter-host className="gutter-host w-full border border-border/40 rounded-md bg-paper">
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
        <p className="text-meta text-ink-muted uppercase tracking-wide mb-1.5">
          Edit mode off — checkbox hidden, row layout unchanged
        </p>
        <RowCheckboxDemo editMode={false} preselectedRefIds={[]} />
      </div>
      <div>
        <p className="text-meta text-ink-muted uppercase tracking-wide mb-1.5">
          Edit mode on — checkbox visible, none selected
        </p>
        <RowCheckboxDemo editMode preselectedRefIds={[]} />
      </div>
      <div>
        <p className="text-meta text-ink-muted uppercase tracking-wide mb-1.5">
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
      <div className="gutter-host w-full border border-border/40 rounded-md overflow-hidden">
        <RelationshipsActionBar />
      </div>
      <p className="text-meta text-ink-muted mt-2">
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
      <p className="text-meta text-ink-muted">
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
      <p className="text-meta text-ink-muted uppercase tracking-wide mb-1.5">
        {label}
      </p>
      {children}
    </div>
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

export function IsolatedDirectionGlyph() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <DirectionGlyph direction="outgoing" />
        <DirectionGlyph direction="incoming" />
        <DirectionGlyph direction="both" />
        <span className="text-meta text-ink-muted">sm</span>
      </div>
      <div className="flex items-center gap-3">
        <DirectionGlyph direction="outgoing" size="md" />
        <DirectionGlyph direction="incoming" size="md" />
        <DirectionGlyph direction="both" size="md" />
        <span className="text-meta text-ink-muted">md</span>
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

/** The Library view switcher, holding its own value — the catalog's copy is
 *  live, so the constant-width claim is checkable by switching views in it. */
export function IsolatedViewSwitcher() {
  const [view, setView] = useState("cards");
  return <ViewSwitcher value={view} onChange={setView} />;
}

/** The Copy From source picker, in a bounded box (it fills its positioned
 *  parent — in the app, the metadata pane). Live: the type/any toggle and the
 *  match-count badges are computed from real entities. */
export function IsolatedCopyFromPicker({ step = "source" }: { step?: "source" | "properties" }) {
  const countries = entities.filter((e) => e.typeId === "country");
  return (
    <div className="relative h-[34rem] w-full overflow-hidden rounded-lg bg-vellum">
      <CopyFromPicker
        target={countries[0] ?? entities[0]}
        initialSource={step === "properties" ? (countries[1] ?? entities[1]) : undefined}
        resolveUnits={copyUnitsOneToOne}
        onCopy={() => {}}
        onClose={() => {}}
      />
    </div>
  );
}

/** ThesaurusPicker, live: a multiselect over the Sample's "Violation types"
 *  (nested groups), with "Add value" opening the one-field modal. Local state
 *  only — the catalog doesn't write the thesauri store. */
export function IsolatedThesaurusPicker() {
  const values = seedThesaurusValues.t1;
  const [extra, setExtra] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>(["Torture"]);
  const [adding, setAdding] = useState(false);
  const all: ThesaurusValue[] = [...values, ...extra.map((label, i) => ({ id: `demo-${i}`, label }))];
  return (
    <div className="w-full max-w-md space-y-1.5">
      <div className="flex items-center gap-2 min-h-4">
        <span className="text-xs font-medium text-ink-secondary">Violations</span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="ms-auto text-meta font-medium text-ink-tertiary hover:text-ink-secondary cursor-pointer"
        >
          Add value
        </button>
      </div>
      <ThesaurusPicker
        label="Violations"
        values={all}
        multiple
        chosen={chosen}
        fresh={new Set(extra)}
        onToggle={(l) => setChosen((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]))}
      />
      {adding && (
        <AddThesaurusValueModal
          thesaurusName="Violation types"
          existing={selectableLabels(all)}
          onClose={() => setAdding(false)}
          onSave={(label) => {
            setExtra((p) => (p.includes(label) ? p : [...p, label]));
            setChosen((p) => (p.includes(label) ? p : [...p, label]));
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

/** BulkFieldRow, live: a mixed text field that turns "Will change" when typed
 *  in, and a tri-state thesaurus list with coverage. Revert returns each. */
export function IsolatedBulkFieldRows() {
  const [text, setText] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ add: string[]; remove: string[] }>({ add: [], remove: [] });
  const base: Record<string, number> = { "American Convention on Human Rights": 12, ICCPR: 4 };
  const of = 12;
  const projected = (v: string) => (edit.add.includes(v) ? of : edit.remove.includes(v) ? 0 : base[v] ?? 0);
  const labels = seedThesaurusValues.t2.map((v) => v.label);
  const cycle = (v: string) =>
    setEdit((e) => {
      const add = e.add.filter((x) => x !== v);
      const remove = e.remove.filter((x) => x !== v);
      const orig = base[v] ?? 0;
      const eff = projected(v);
      if (eff === of) {
        if (orig > 0) remove.push(v);
      } else if (eff === 0) {
        if (orig === 0) add.push(v);
      } else add.push(v);
      return { add, remove };
    });
  const changed = edit.add.length + edit.remove.length > 0;
  return (
    <div className="w-full max-w-md space-y-4">
      <BulkFieldRow
        label="Case number"
        htmlFor="catalog-bulk-text"
        state={text === null ? "mixed" : "changed"}
        distinct={4}
        onRevert={() => setText(null)}
      >
        <input
          id="catalog-bulk-text"
          value={text ?? ""}
          placeholder="Mixed"
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border placeholder:text-ink-muted"
        />
      </BulkFieldRow>
      <BulkFieldRow label="Legal instruments" state={changed ? "changed" : "mixed"} onRevert={() => setEdit({ add: [], remove: [] })}>
        <ThesaurusPicker
          label="Legal instruments"
          values={seedThesaurusValues.t2}
          multiple
          chosen={labels.filter((l) => projected(l) === of)}
          mixed={labels.filter((l) => projected(l) > 0 && projected(l) < of)}
          coverage={{ counts: Object.fromEntries(labels.map((l) => [l, projected(l)])), of }}
          onToggle={cycle}
        />
      </BulkFieldRow>
    </div>
  );
}

/** SelectionActionsMenu with the selection's actions (inert here). */
export function IsolatedSelectionActionsMenu() {
  return (
    <div className="pt-48">
      <SelectionActionsMenu
        actions={[
          { id: "change-template", label: "Change template", icon: <LayoutTemplate size={13} />, onClick: () => {} },
          { id: "export", label: "Export CSV", icon: <FileDown size={13} />, onClick: () => {} },
          { id: "share", label: "Share", icon: <Share2 size={13} />, onClick: () => {} },
          { id: "permissions", label: "Permissions", icon: <Lock size={13} />, onClick: () => {} },
          { id: "delete", label: "Delete", icon: <Trash2 size={13} />, onClick: () => {}, danger: true },
        ]}
      />
    </div>
  );
}

/** ChangeTemplateDialog over three Sample entities (a Country and two Court
 *  Cases). Opens a live dialog; confirming writes to the catalog's session. */
export function IsolatedChangeTemplate() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="px-3 py-1.5 text-xs font-medium bg-warm rounded-md cursor-pointer">
        Open Change template
      </button>
      {open && <ChangeTemplateDialog ids={["e2", "e13", "e31"]} corpus="mock" types={entityTypes} onClose={() => setOpen(false)} />}
    </>
  );
}

/** ShareEntityModal over three Sample entities, as Share and as Permissions. */
export function IsolatedShareSelection() {
  const [focus, setFocus] = useState<"access" | "people" | null>(null);
  return (
    <>
      <div className="flex gap-2">
        <button type="button" onClick={() => setFocus("access")} className="px-3 py-1.5 text-xs font-medium bg-warm rounded-md cursor-pointer">
          Share 3 entities
        </button>
        <button type="button" onClick={() => setFocus("people")} className="px-3 py-1.5 text-xs font-medium bg-warm rounded-md cursor-pointer">
          Permissions
        </button>
      </div>
      <ShareEntityModal open={focus !== null} onClose={() => setFocus(null)} ids={["e2", "e13", "e31"]} initialFocus={focus ?? "access"} />
    </>
  );
}
