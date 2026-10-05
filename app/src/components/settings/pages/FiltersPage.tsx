import { useId, useMemo, type Dispatch, type SetStateAction } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { ChevronUp, ChevronDown, FolderPlus, Trash2 } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsTable, type Column } from "../SettingsTable";
import { DragGrip } from "../DragGrip";
import { useReorder } from "../../../hooks/useReorder";
import { Checkbox } from "../../shared/Checkbox";
import { Select } from "../../shared/Select";
import { dataSourceAtom, libraryEntitiesAtom, libraryTypesAtom } from "../../../atoms/dataSource";
import { libraryTypeFiltersAtom } from "../../../atoms/library";
import { cejilFilterMeta, cejilPropertyFilterMeta } from "../../../data/cejil/settingsAdapt";
import {
  filterSettings,
  sampleFilterProperties,
  type FilterGroup,
  type FilterRow,
  type FilterSettings,
  type PropertyFilterRow,
} from "../../../atoms/settingsSingletons";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useSettingsUndo } from "../../../hooks/useSettingsUndo";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { newSettingsId } from "../../../atoms/settingsCollection";


/** name / value count per filterable property, by id. */
const mockPropertyMeta: Record<string, { name: string; count: number | null }> = Object.fromEntries(
  sampleFilterProperties.map((p) => [p.id, { name: p.label, count: null }]),
);

function swap<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function FiltersPage() {
  const { record } = useSettingsNotify();
  const cejil = useAtomValue(dataSourceAtom) === "cejil";
  // name / colour / entity count per template: CEJIL's from its Settings
  // adapter, every other corpus's from its own types and entities.
  const types = useAtomValue(libraryTypesAtom);
  const entities = useAtomValue(libraryEntitiesAtom);
  const corpusMeta = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entities) counts.set(e.typeId, (counts.get(e.typeId) ?? 0) + 1);
    return Object.fromEntries(types.map((t) => [t.id, { name: t.name, color: t.color, count: counts.get(t.id) ?? 0 }]));
  }, [types, entities]);
  const meta = cejil ? cejilFilterMeta : corpusMeta;
  const setTypeFilters = useSetAtom(libraryTypeFiltersAtom);
  const propertyMeta = cejil ? cejilPropertyFilterMeta : mockPropertyMeta;
  // The corpus's saved filters (`atoms/settingsSingletons.ts`), which the
  // Library's Template facet reads. Compared with the last save.
  const stored = useAtomValue(filterSettings.valueAtom);
  const saveFilters = useSetAtom(filterSettings.saveAtom);
  const { draft, setField, dirty, markSaved } = useSettingsDraft<FilterSettings>({
    id: "filters",
    label: "Filter changes",
    saved: stored,
  });
  const { groups, rows, propertyRows } = draft;
  const setGroups = setField("groups");
  const setRows = setField("rows");
  const setPropertyRows = setField("propertyRows");
  const { dragIdx, rowProps, gripProps } = useReorder(setRows);
  const propertyReorder = useReorder(setPropertyRows);
  const typesHeadingId = useId();
  const propertiesHeadingId = useId();

  const activeCount = rows.filter((r) => r.active).length + propertyRows.filter((r) => r.active).length;
  const groupOptions = [
    { value: "", label: "No group" },
    ...groups.map((g) => ({ value: g.id, label: g.name || "Untitled group" })),
  ];

  const toggle = (templateId: string) =>
    setRows((prev) => prev.map((r) => (r.templateId === templateId ? { ...r, active: !r.active } : r)));
  const setGroup = (templateId: string, groupId: string) =>
    setRows((prev) => prev.map((r) => (r.templateId === templateId ? { ...r, groupId } : r)));
  const toggleProperty = (propertyId: string) =>
    setPropertyRows((prev) => prev.map((r) => (r.propertyId === propertyId ? { ...r, active: !r.active } : r)));

  const addGroup = () =>
    setGroups((prev) => [...prev, { id: newSettingsId("fg"), name: `Group ${prev.length + 1}` }]);
  const renameGroup = (id: string, name: string) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  /** A removed group gets an Undo in the Beacon (UX5): it puts the group
   *  back with the templates it held. */
  const offerUndo = useSettingsUndo<{ group: FilterGroup; index: number; members: string[] }>(
    ({ group, index, members }) => {
      setGroups((prev) => (prev.some((g) => g.id === group.id) ? prev : [...prev.slice(0, index), group, ...prev.slice(index)]));
      setRows((prev) => prev.map((r) => (members.includes(r.templateId) && !r.groupId ? { ...r, groupId: group.id } : r)));
    },
  );
  const removeGroup = (id: string) => {
    const index = groups.findIndex((g) => g.id === id);
    if (index < 0) return;
    const group = groups[index];
    const members = rows.filter((r) => r.groupId === id).map((r) => r.templateId);
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setRows((prev) => prev.map((r) => (r.groupId === id ? { ...r, groupId: "" } : r)));
    offerUndo(
      { group, index, members },
      `${group.name || "Group"} removed`,
      `${members.length ? `${members.length} ${members.length === 1 ? "filter moves" : "filters move"} out of the group. ` : ""}Nothing is saved until you save the filters.`,
    );
  };

  const save = () => {
    // Empty groups are dropped on save, as Uwazi does.
    const value = { ...draft, groups: groups.filter((g) => rows.some((r) => r.groupId === g.id)) };
    saveFilters({ value });
    markSaved(value);
    offerUndo.end();
    // A type filter set on a template the facet no longer shows could not be
    // cleared from the Library: drop it.
    // With none ticked the Library lists them all (Uwazi), so nothing is hidden.
    const hidden = new Set(
      value.rows.some((r) => r.active) ? value.rows.filter((r) => !r.active).map((r) => r.templateId) : [],
    );
    if (hidden.size)
      setTypeFilters((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !hidden.has(id))));
    record({ method: "UPDATE", domain: "filters", noun: "settings", id: "filters", name: "Library filters", message: "Library filters updated" });
  };

  const columns: Column<FilterRow>[] = [
    {
      id: "filter",
      header: "Filter",
      cell: (r, i) => (
        <div className="flex items-center gap-2 w-full min-w-0">
          <DragGrip {...gripProps(i)} />
          <Checkbox checked={r.active} onChange={() => toggle(r.templateId)} ariaLabel={`Show ${meta[r.templateId]?.name}`} />
          <span className="w-2.5 h-2.5 rounded-[2px] border border-ink/20 shrink-0" style={{ backgroundColor: meta[r.templateId]?.color }} />
          <span className={`truncate text-sm ${r.active ? "text-ink" : "text-ink-tertiary"}`}>
            {meta[r.templateId]?.name}
          </span>
          <span className="sr-only">{`row ${i + 1}`}</span>
        </div>
      ),
    },
    {
      id: "entities",
      header: "Entities",
      width: "7rem",
      cell: (r) => <span className="text-xs text-ink-tertiary tabular-nums">{meta[r.templateId]?.count ?? 0}</span>,
    },
    {
      id: "group",
      header: "Group",
      width: "11rem",
      cell: (r) =>
        groupOptions.length > 1 ? (
          <Select value={r.groupId} options={groupOptions} onChange={(g) => setGroup(r.templateId, g)} ariaLabel="Move to group" />
        ) : (
          <span className="text-xs text-ink-muted">—</span>
        ),
    },
    orderColumn(setRows, rows.length),
  ];

  const propertyColumns: Column<PropertyFilterRow>[] = [
    {
      id: "filter",
      header: "Filter",
      cell: (r, i) => (
        <div className="flex items-center gap-2 w-full min-w-0">
          <DragGrip {...propertyReorder.gripProps(i)} />
          <Checkbox checked={r.active} onChange={() => toggleProperty(r.propertyId)} ariaLabel={`Show ${propertyMeta[r.propertyId]?.name}`} />
          <span className={`truncate text-sm ${r.active ? "text-ink" : "text-ink-tertiary"}`}>
            {propertyMeta[r.propertyId]?.name}
          </span>
          <span className="sr-only">{`row ${i + 1}`}</span>
        </div>
      ),
    },
    {
      id: "values",
      header: "Values",
      width: "7rem",
      cell: (r) => (
        <span className="text-xs text-ink-tertiary tabular-nums">{propertyMeta[r.propertyId]?.count ?? "—"}</span>
      ),
    },
    {
      id: "group",
      header: "Group",
      width: "11rem",
      cell: () => <span className="text-xs text-ink-muted">—</span>,
    },
    orderColumn(setPropertyRows, propertyRows.length),
  ];

  return (
    <SettingsContent component="FiltersPage">
      <SettingsContent.Header title="Filters" />
      <SettingsContent.Body>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
          <p className="text-xs text-ink-tertiary min-w-0 sm:max-w-md">
            Choose which entity types and properties appear as filters in the library sidebar, group
            the types, and set the order of each — exactly how readers will see them.
          </p>
          <SettingsButton
            variant="secondary"
            size="sm"
            icon={<FolderPlus size={14} />}
            onClick={addGroup}
            className="shrink-0 whitespace-nowrap"
          >
            New group
          </SettingsButton>
        </div>

        <section aria-labelledby={typesHeadingId} className="mb-6">
          <h3 id={typesHeadingId} className="text-sm font-semibold text-ink mb-2">Types</h3>
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {groups.map((g) => (
                <div key={g.id} className="flex items-center gap-1 rounded-md bg-warm px-2 py-1">
                  <input
                    value={g.name}
                    onChange={(e) => renameGroup(g.id, e.target.value)}
                    aria-label="Group name"
                    className="bg-transparent text-xs font-medium text-ink w-28 focus:outline-none focus:bg-paper rounded px-1"
                  />
                  <button
                    onClick={() => removeGroup(g.id)}
                    aria-label={`Remove ${g.name}`}
                    className="p-0.5 rounded text-ink-tertiary hover:bg-seal-tint hover:text-seal-label transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <SettingsTable
            columns={columns}
            data={rows}
            getRowId={(r) => r.templateId}
            rowProps={(_r, i) => ({
              ...rowProps(i),
              className: dragIdx === i ? "opacity-60" : undefined,
            })}
          />
        </section>

        <section aria-labelledby={propertiesHeadingId}>
          <h3 id={propertiesHeadingId} className="text-sm font-semibold text-ink mb-2">Properties</h3>
          <SettingsTable
            columns={propertyColumns}
            data={propertyRows}
            getRowId={(r) => r.propertyId}
            rowProps={(_r, i) => ({
              ...propertyReorder.rowProps(i),
              className: propertyReorder.dragIdx === i ? "opacity-60" : undefined,
            })}
            emptyState={<span className="text-sm text-ink-muted">No filterable properties.</span>}
          />
        </section>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <span className="text-xs text-ink-tertiary me-auto">
          {rows.some((r) => r.active)
            ? `${activeCount} filters shown`
            : "No template ticked: the Library lists every template"}
        </span>
        <LastSavedLine domain="filters" id="filters" />
        <SettingsButton variant="success" size="sm" disabled={!dirty} onClick={save}>
          Save
        </SettingsButton>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}

/** Move up / down within ONE section's rows: each section is its own list, so
 *  a row can never cross into the other. */
function orderColumn<T>(setList: Dispatch<SetStateAction<T[]>>, length: number): Column<T> {
  const move = (i: number, dir: -1 | 1) => setList((prev) => swap(prev, i, dir));
  return {
    id: "order",
    header: "",
    width: "5rem",
    align: "right",
    cell: (_r, i) => (
      <div className="flex items-center justify-end">
        <button
          onClick={() => move(i, -1)}
          disabled={i === 0}
          aria-label="Move up"
          className="p-0.5 rounded text-ink-tertiary hover:bg-warm hover:text-ink transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={() => move(i, 1)}
          disabled={i === length - 1}
          aria-label="Move down"
          className="p-0.5 rounded text-ink-tertiary hover:bg-warm hover:text-ink transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    ),
  };
}
