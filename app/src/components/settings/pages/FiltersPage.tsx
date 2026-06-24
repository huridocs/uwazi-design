import { useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { ChevronUp, ChevronDown, FolderPlus, Trash2 } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { DragGrip } from "../DragGrip";
import { useReorder } from "../../../hooks/useReorder";
import { Checkbox } from "../../shared/Checkbox";
import { Select } from "../../shared/Select";
import { seedFilterConfig, seedTemplates } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import {
  cejilFilterRows,
  cejilFilterGroups,
  cejilFilterMeta,
} from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/references";

interface FilterGroup {
  id: string;
  name: string;
}
interface FilterRow {
  templateId: string;
  active: boolean;
  groupId: string; // "" = ungrouped
}

/** name / colour / entity-count per template, by id, for the active source. */
const mockMeta: Record<string, { name: string; color: string; count: number }> =
  Object.fromEntries(
    seedFilterConfig.map((f) => [
      f.templateId,
      { name: f.name, color: f.color, count: seedTemplates.find((t) => t.id === f.templateId)?.entityCount ?? 0 },
    ]),
  );

const mockRows = (): FilterRow[] =>
  seedFilterConfig.map((f) => ({ templateId: f.templateId, active: f.active, groupId: "" }));

function swap<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function FiltersPage() {
  const setToasts = useSetAtom(toastsAtom);
  const cejil = useAtomValue(dataSourceAtom) === "cejil";
  const meta = cejil ? cejilFilterMeta : mockMeta;
  const initialRows = cejil ? cejilFilterRows : mockRows();
  const initialGroups: FilterGroup[] = cejil ? cejilFilterGroups : [];

  const [groups, setGroups] = useState<FilterGroup[]>(initialGroups);
  const [rows, setRows] = useState<FilterRow[]>(initialRows);
  const { dragIdx, rowProps, gripProps } = useReorder(setRows);

  const activeCount = rows.filter((r) => r.active).length;
  const dirty =
    JSON.stringify(groups) !== JSON.stringify(initialGroups) ||
    JSON.stringify(rows) !== JSON.stringify(initialRows);
  const groupOptions = [
    { value: "", label: "No group" },
    ...groups.map((g) => ({ value: g.id, label: g.name || "Untitled group" })),
  ];

  const toggle = (templateId: string) =>
    setRows((prev) => prev.map((r) => (r.templateId === templateId ? { ...r, active: !r.active } : r)));
  const setGroup = (templateId: string, groupId: string) =>
    setRows((prev) => prev.map((r) => (r.templateId === templateId ? { ...r, groupId } : r)));
  const move = (i: number, dir: -1 | 1) => setRows((prev) => swap(prev, i, dir));

  const addGroup = () =>
    setGroups((prev) => [...prev, { id: `g-${prev.length}-${rows.length}`, name: `Group ${prev.length + 1}` }]);
  const renameGroup = (id: string, name: string) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  const removeGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setRows((prev) => prev.map((r) => (r.groupId === id ? { ...r, groupId: "" } : r)));
  };

  const save = () =>
    setToasts((p) => [...p, { id: Date.now().toString(), message: "Library filters updated", type: "success" as const }]);

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
    {
      id: "order",
      header: "",
      width: "5rem",
      align: "right",
      cell: (r, i) => (
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
            disabled={i === rows.length - 1}
            aria-label="Move down"
            className="p-0.5 rounded text-ink-tertiary hover:bg-warm hover:text-ink transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Filters" />
      <SettingsContent.Body>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
          <p className="text-xs text-ink-tertiary min-w-0 sm:max-w-md">
            Choose which entity types appear as filters in the library sidebar, group them, and set
            their order — exactly how readers will see them.
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={<FolderPlus size={14} />}
            onClick={addGroup}
            className="shrink-0 whitespace-nowrap"
          >
            New group
          </Button>
        </div>

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
                  className="p-0.5 rounded text-ink-tertiary hover:bg-seal-tint hover:text-seal transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <Table
          columns={columns}
          data={rows}
          getRowId={(r) => r.templateId}
          rowProps={(_r, i) => ({
            ...rowProps(i),
            className: dragIdx === i ? "opacity-60" : undefined,
          })}
        />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <span className="text-xs text-ink-tertiary me-auto">{activeCount} filters shown</span>
        <Button variant="success" size="sm" disabled={!dirty} onClick={save}>
          Save
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
