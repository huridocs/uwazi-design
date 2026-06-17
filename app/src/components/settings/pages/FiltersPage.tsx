import { useState } from "react";
import { useSetAtom } from "jotai";
import { GripVertical, ChevronUp, ChevronDown, Folder, FolderPlus, Trash2 } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Checkbox } from "../../shared/Checkbox";
import { Select } from "../../shared/Select";
import { seedFilterConfig, seedTemplates } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const entityCountById = Object.fromEntries(seedTemplates.map((t) => [t.id, t.entityCount]));
const colorById = Object.fromEntries(seedFilterConfig.map((f) => [f.templateId, f.color]));
const nameById = Object.fromEntries(seedFilterConfig.map((f) => [f.templateId, f.name]));

interface FilterLeaf {
  templateId: string;
  active: boolean;
}
type FilterNode =
  | ({ kind: "filter"; key: string } & FilterLeaf)
  | { kind: "group"; key: string; name: string; children: FilterLeaf[] };

const initialNodes: FilterNode[] = seedFilterConfig.map((f) => ({
  kind: "filter",
  key: f.templateId,
  templateId: f.templateId,
  active: f.active,
}));

/** Reorder helper — swap item `i` with its neighbour in direction `dir`. */
function swap<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function FiltersPage() {
  const setToasts = useSetAtom(toastsAtom);
  const [nodes, setNodes] = useState<FilterNode[]>(initialNodes);
  let groupSeq = nodes.filter((n) => n.kind === "group").length;

  const groups = nodes.filter((n): n is Extract<FilterNode, { kind: "group" }> => n.kind === "group");
  const groupOptions = [
    { value: "", label: "No group" },
    ...groups.map((g) => ({ value: g.key, label: g.name || "Untitled group" })),
  ];

  const activeCount =
    nodes.reduce(
      (sum, n) =>
        sum + (n.kind === "filter" ? (n.active ? 1 : 0) : n.children.filter((c) => c.active).length),
      0,
    );

  // ── mutations ──
  const toggleTop = (key: string) =>
    setNodes((prev) => prev.map((n) => (n.kind === "filter" && n.key === key ? { ...n, active: !n.active } : n)));
  const toggleChild = (groupKey: string, templateId: string) =>
    setNodes((prev) =>
      prev.map((n) =>
        n.kind === "group" && n.key === groupKey
          ? { ...n, children: n.children.map((c) => (c.templateId === templateId ? { ...c, active: !c.active } : c)) }
          : n,
      ),
    );
  const moveTop = (i: number, dir: -1 | 1) => setNodes((prev) => swap(prev, i, dir));
  const moveChild = (groupKey: string, i: number, dir: -1 | 1) =>
    setNodes((prev) =>
      prev.map((n) => (n.kind === "group" && n.key === groupKey ? { ...n, children: swap(n.children, i, dir) } : n)),
    );

  const addGroup = () => {
    groupSeq += 1;
    setNodes((prev) => [...prev, { kind: "group", key: `g-${prev.length}-${groupSeq}`, name: "New group", children: [] }]);
  };
  const renameGroup = (key: string, name: string) =>
    setNodes((prev) => prev.map((n) => (n.kind === "group" && n.key === key ? { ...n, name } : n)));
  const removeGroup = (key: string) =>
    setNodes((prev) => {
      const g = prev.find((n) => n.kind === "group" && n.key === key) as Extract<FilterNode, { kind: "group" }> | undefined;
      const freed: FilterNode[] = (g?.children ?? []).map((c) => ({ kind: "filter", key: c.templateId, ...c }));
      return [...prev.filter((n) => n.key !== key), ...freed];
    });

  /** Move a leaf (identified by templateId) to a target group ("" = top level). */
  const moveLeaf = (templateId: string, fromGroupKey: string, toGroupKey: string) => {
    if (fromGroupKey === toGroupKey) return;
    setNodes((prev) => {
      let leaf: FilterLeaf | undefined;
      // pluck from source
      const stripped = prev
        .map((n) => {
          if (n.kind === "filter" && fromGroupKey === "" && n.templateId === templateId) {
            leaf = { templateId: n.templateId, active: n.active };
            return null;
          }
          if (n.kind === "group" && n.key === fromGroupKey) {
            const child = n.children.find((c) => c.templateId === templateId);
            if (child) leaf = child;
            return { ...n, children: n.children.filter((c) => c.templateId !== templateId) };
          }
          return n;
        })
        .filter(Boolean) as FilterNode[];
      if (!leaf) return prev;
      // place into target
      if (toGroupKey === "") {
        return [...stripped, { kind: "filter", key: leaf.templateId, ...leaf }];
      }
      return stripped.map((n) =>
        n.kind === "group" && n.key === toGroupKey ? { ...n, children: [...n.children, leaf!] } : n,
      );
    });
  };

  const save = () =>
    setToasts((p) => [...p, { id: Date.now().toString(), message: "Library filters updated", type: "success" as const }]);

  return (
    <SettingsContent>
      <SettingsContent.Header title="Filters" />
      <SettingsContent.Body className="max-w-2xl">
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

        <div
          className="rounded-md bg-paper p-1.5 flex flex-col gap-0.5"
          style={{ border: "1px solid var(--border-primary)" }}
        >
          {nodes.map((node, i) =>
            node.kind === "filter" ? (
              <FilterRow
                key={node.key}
                templateId={node.templateId}
                active={node.active}
                onToggle={() => toggleTop(node.key)}
                onUp={i > 0 ? () => moveTop(i, -1) : undefined}
                onDown={i < nodes.length - 1 ? () => moveTop(i, 1) : undefined}
                groupValue=""
                groupOptions={groupOptions}
                onGroupChange={(to) => moveLeaf(node.templateId, "", to)}
              />
            ) : (
              <div key={node.key} className="rounded-md bg-warm/40 p-1">
                <div className="flex items-center gap-2 px-1.5 py-1">
                  <Folder size={14} className="text-ink-tertiary shrink-0" />
                  <input
                    value={node.name}
                    onChange={(e) => renameGroup(node.key, e.target.value)}
                    aria-label="Group name"
                    className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-ink focus:outline-none focus:bg-paper rounded px-1 py-0.5"
                  />
                  <ReorderButtons
                    onUp={i > 0 ? () => moveTop(i, -1) : undefined}
                    onDown={i < nodes.length - 1 ? () => moveTop(i, 1) : undefined}
                  />
                  <button
                    onClick={() => removeGroup(node.key)}
                    aria-label={`Remove group ${node.name}`}
                    className="p-1 rounded text-ink-tertiary hover:bg-seal-tint hover:text-seal transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {node.children.length === 0 ? (
                  <p className="px-2 py-2 text-[11px] text-ink-muted">
                    Empty group — use a filter's group menu to move it here.
                  </p>
                ) : (
                  <div className="ps-5 flex flex-col gap-0.5">
                    {node.children.map((c, ci) => (
                      <FilterRow
                        key={c.templateId}
                        templateId={c.templateId}
                        active={c.active}
                        onToggle={() => toggleChild(node.key, c.templateId)}
                        onUp={ci > 0 ? () => moveChild(node.key, ci, -1) : undefined}
                        onDown={ci < node.children.length - 1 ? () => moveChild(node.key, ci, 1) : undefined}
                        groupValue={node.key}
                        groupOptions={groupOptions}
                        onGroupChange={(to) => moveLeaf(c.templateId, node.key, to)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
        </div>
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

function ReorderButtons({ onUp, onDown }: { onUp?: () => void; onDown?: () => void }) {
  return (
    <div className="flex items-center shrink-0">
      <button
        onClick={onUp}
        disabled={!onUp}
        aria-label="Move up"
        className="p-0.5 rounded text-ink-tertiary hover:bg-warm hover:text-ink transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
      >
        <ChevronUp size={14} />
      </button>
      <button
        onClick={onDown}
        disabled={!onDown}
        aria-label="Move down"
        className="p-0.5 rounded text-ink-tertiary hover:bg-warm hover:text-ink transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );
}

function FilterRow({
  templateId,
  active,
  onToggle,
  onUp,
  onDown,
  groupValue,
  groupOptions,
  onGroupChange,
}: {
  templateId: string;
  active: boolean;
  onToggle: () => void;
  onUp?: () => void;
  onDown?: () => void;
  groupValue: string;
  groupOptions: { value: string; label: string }[];
  onGroupChange: (to: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-warm transition-colors">
      <GripVertical size={14} className="text-ink-muted shrink-0 cursor-grab" />
      <Checkbox checked={active} onChange={onToggle} ariaLabel={`Show ${nameById[templateId]} filter`} />
      <span className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ backgroundColor: colorById[templateId] }} />
      <span className={`flex-1 min-w-0 truncate text-sm ${active ? "text-ink" : "text-ink-tertiary"}`}>
        {nameById[templateId]}
      </span>
      <span className="text-[11px] text-ink-tertiary tabular-nums shrink-0">{entityCountById[templateId] ?? 0}</span>
      {groupOptions.length > 1 && (
        <Select value={groupValue} options={groupOptions} onChange={onGroupChange} ariaLabel="Move to group" align="end" />
      )}
      <ReorderButtons onUp={onUp} onDown={onDown} />
    </div>
  );
}
