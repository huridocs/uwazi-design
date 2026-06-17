import { useState } from "react";
import { useSetAtom } from "jotai";
import { GripVertical, ChevronUp, ChevronDown, FolderPlus, Trash2 } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { Checkbox } from "../../shared/Checkbox";
import { Select } from "../../shared/Select";
import { seedFilterConfig, seedTemplates } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const entityCountById = Object.fromEntries(seedTemplates.map((t) => [t.id, t.entityCount]));
const colorById = Object.fromEntries(seedFilterConfig.map((f) => [f.templateId, f.color]));
const nameById = Object.fromEntries(seedFilterConfig.map((f) => [f.templateId, f.name]));

interface FilterGroup {
  id: string;
  name: string;
}
interface FilterRow {
  templateId: string;
  active: boolean;
  groupId: string; // "" = ungrouped
}

function swap<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function FiltersPage() {
  const setToasts = useSetAtom(toastsAtom);
  const [groups, setGroups] = useState<FilterGroup[]>([]);
  const [rows, setRows] = useState<FilterRow[]>(
    seedFilterConfig.map((f) => ({ templateId: f.templateId, active: f.active, groupId: "" })),
  );

  const activeCount = rows.filter((r) => r.active).length;
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
          <GripVertical size={14} className="text-ink-muted shrink-0 cursor-grab" />
          <Checkbox checked={r.active} onChange={() => toggle(r.templateId)} ariaLabel={`Show ${nameById[r.templateId]}`} />
          <span className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ backgroundColor: colorById[r.templateId] }} />
          <span className={`truncate text-sm ${r.active ? "text-ink" : "text-ink-tertiary"}`}>
            {nameById[r.templateId]}
          </span>
          <span className="sr-only">{`row ${i + 1}`}</span>
        </div>
      ),
    },
    {
      id: "entities",
      header: "Entities",
      width: "7rem",
      cell: (r) => <span className="text-xs text-ink-tertiary tabular-nums">{entityCountById[r.templateId] ?? 0}</span>,
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

        <Table columns={columns} data={rows} getRowId={(r) => r.templateId} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" onClick={save}>
          Save
        </Button>
        <span className="text-xs text-ink-tertiary">{activeCount} filters shown</span>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
