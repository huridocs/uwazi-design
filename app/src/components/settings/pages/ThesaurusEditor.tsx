import { useState } from "react";
import { useSetAtom } from "jotai";
import { Plus, GripVertical, FolderOpen } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { RowActions } from "../RowActions";
import { Field, TextInput } from "../Field";
import { seedThesaurusItems, type SettingsThesaurus } from "../../../data/settings";
import { cejilThesaurusItems } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/references";

interface Item {
  id: string;
  label: string;
  children?: Item[];
}

const isGroup = (it: Item): boolean => Array.isArray(it.children);
const countItems = (items: Item[]): number =>
  items.reduce((n, it) => n + 1 + (it.children ? it.children.length : 0), 0);
/** Serialize the full nested structure (labels + grouping) for dirty checks. */
const serialize = (items: Item[]): string =>
  JSON.stringify(items.map((it) => (it.children ? { g: it.label, c: it.children.map((c) => c.label) } : it.label)));

let uid = 0;
const newId = () => `n${++uid}`;

const move = <T,>(arr: T[], from: number, to: number): T[] => {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/** Thesaurus detail/editor — name + the editable item list (a thesaurus's
 *  children). Items can be flat or grouped: a group is a parent Item carrying
 *  a `children` array of sub-items. Opened from the Thesauri list. */
export function ThesaurusEditor({
  thesaurus,
  onClose,
}: {
  thesaurus: SettingsThesaurus | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = thesaurus === "new";
  const base = isNew ? undefined : thesaurus;

  const seedLabels = isNew ? [] : cejilThesaurusItems[base!.id] ?? seedThesaurusItems[base!.id] ?? [];
  const seedItems = (): Item[] => seedLabels.map((label, i) => ({ id: `i${i}`, label }));

  const [name, setName] = useState(base?.name ?? "");
  const [items, setItems] = useState<Item[]>(seedItems);

  const initialSerialized = serialize(seedItems());
  const dirty = name !== (base?.name ?? "") || serialize(items) !== initialSerialized;

  // Top-level edits
  const patch = (id: string, label: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, label } : it)));
  const remove = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));
  const addItem = () => setItems((prev) => [...prev, { id: newId(), label: "" }]);
  const addGroup = () => setItems((prev) => [...prev, { id: newId(), label: "", children: [] }]);

  // Sub-item edits (scoped to a group)
  const patchChild = (groupId: string, childId: string, label: string) =>
    setItems((prev) =>
      prev.map((g) =>
        g.id === groupId && g.children
          ? { ...g, children: g.children.map((c) => (c.id === childId ? { ...c, label } : c)) }
          : g,
      ),
    );
  const removeChild = (groupId: string, childId: string) =>
    setItems((prev) =>
      prev.map((g) =>
        g.id === groupId && g.children ? { ...g, children: g.children.filter((c) => c.id !== childId) } : g,
      ),
    );
  const addChild = (groupId: string) =>
    setItems((prev) =>
      prev.map((g) =>
        g.id === groupId && g.children ? { ...g, children: [...g.children, { id: newId(), label: "" }] } : g,
      ),
    );

  // Drag-to-reorder: top-level items/groups, and sub-items within one group.
  const [dragTop, setDragTop] = useState<number | null>(null);
  const reorderTop = (to: number) => {
    if (dragTop === null || dragTop === to) return;
    setItems((prev) => move(prev, dragTop, to));
    setDragTop(to);
  };
  const [dragChild, setDragChild] = useState<{ g: string; i: number } | null>(null);
  const reorderChild = (groupId: string, to: number) => {
    if (!dragChild || dragChild.g !== groupId || dragChild.i === to) return;
    const from = dragChild.i;
    setItems((prev) =>
      prev.map((g) => (g.id === groupId && g.children ? { ...g, children: move(g.children, from, to) } : g)),
    );
    setDragChild({ g: groupId, i: to });
  };

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Thesaurus created" : `${name || "Thesaurus"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  const dragGrip = (props: { onDragStart: () => void; onDragEnd: () => void }) => (
    <span
      draggable
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      aria-label="Drag to reorder"
      className="shrink-0 cursor-grab active:cursor-grabbing"
    >
      <GripVertical size={14} className="text-ink-muted" />
    </span>
  );

  const itemInput = (value: string, onChange: (v: string) => void, placeholder: string, ariaLabel: string) => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 min-w-0 bg-transparent text-sm text-ink focus:outline-none focus:bg-warm rounded px-1 py-0.5"
      aria-label={ariaLabel}
    />
  );

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Thesauri"]} title={isNew ? "New thesaurus" : base!.name} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <section className="max-w-sm">
            <Field label="Thesaurus name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Violation types" />
            </Field>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-ink">
                Items <span className="text-ink-tertiary font-normal">({countItems(items)})</span>
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={<FolderOpen size={14} />} onClick={addGroup}>
                  Add group
                </Button>
                <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addItem}>
                  Add item
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-md py-8 text-center text-sm text-ink-tertiary" style={{ border: "1px solid var(--border-soft)" }}>
                No items yet.
              </div>
            ) : (
              <ul className="flex flex-col divide-y" style={{ borderColor: "var(--border-soft)" }}>
                {items.map((it, i) =>
                  isGroup(it) ? (
                    <li
                      key={it.id}
                      onDragEnter={() => reorderTop(i)}
                      onDragOver={(e) => e.preventDefault()}
                      className={`py-1 transition-opacity ${dragTop === i ? "opacity-40" : ""}`}
                    >
                      {/* Group header */}
                      <div className="flex items-center gap-2 py-1.5">
                        {dragGrip({ onDragStart: () => setDragTop(i), onDragEnd: () => setDragTop(null) })}
                        <FolderOpen size={14} className="text-ink-tertiary shrink-0" />
                        <input
                          value={it.label}
                          onChange={(e) => patch(it.id, e.target.value)}
                          placeholder="Group name"
                          className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-ink focus:outline-none focus:bg-warm rounded px-1 py-0.5"
                          aria-label="Group name"
                        />
                        <RowActions label={it.label || "group"} onDelete={() => remove(it.id)} />
                      </div>
                      {/* Sub-items, indented via padding */}
                      <div className="pl-7 flex flex-col">
                        {it.children!.map((child, ci) => (
                          <div
                            key={child.id}
                            onDragEnter={() => reorderChild(it.id, ci)}
                            onDragOver={(e) => e.preventDefault()}
                            className={`flex items-center gap-2 py-1.5 transition-opacity ${dragChild?.g === it.id && dragChild.i === ci ? "opacity-40" : ""}`}
                          >
                            {dragGrip({ onDragStart: () => setDragChild({ g: it.id, i: ci }), onDragEnd: () => setDragChild(null) })}
                            {itemInput(child.label, (v) => patchChild(it.id, child.id, v), "Item label", "Item label")}
                            <RowActions label={child.label || "item"} onDelete={() => removeChild(it.id, child.id)} />
                          </div>
                        ))}
                        <div className="py-1.5">
                          <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => addChild(it.id)}>
                            Add item
                          </Button>
                        </div>
                      </div>
                    </li>
                  ) : (
                    <li
                      key={it.id}
                      onDragEnter={() => reorderTop(i)}
                      onDragOver={(e) => e.preventDefault()}
                      className={`flex items-center gap-2 py-1.5 transition-opacity ${dragTop === i ? "opacity-40" : ""}`}
                    >
                      {dragGrip({ onDragStart: () => setDragTop(i), onDragEnd: () => setDragTop(null) })}
                      {itemInput(it.label, (v) => patch(it.id, v), "Item label", "Item label")}
                      <RowActions label={it.label || "item"} onDelete={() => remove(it.id)} />
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="success" size="sm" disabled={!dirty || !name} onClick={save}>
          {isNew ? "Create thesaurus" : "Save"}
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
