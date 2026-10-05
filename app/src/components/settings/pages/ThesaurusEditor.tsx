import { useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { Plus, FolderOpen } from "lucide-react";
import { SettingsButton } from "../SettingsButton";
import { SettingsEditor } from "../SettingsEditor";
import { SettingsSection } from "../SettingsSection";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { RowActions } from "../RowActions";
import { DragGrip } from "../DragGrip";
import { useReorder } from "../../../hooks/useReorder";
import { SettingsField, TextInput } from "../SettingsField";
import type { SettingsThesaurus, ThesaurusValue } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { saveThesaurusAtom, thesauriAtom } from "../../../atoms/thesauri";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useSettingsUndo } from "../../../hooks/useSettingsUndo";
import { valueUsageAtom } from "../../../atoms/settingsUsage";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";

interface Item {
  id: string;
  label: string;
  children?: Item[];
}

const isGroup = (it: Item): boolean => Array.isArray(it.children);
const countItems = (items: Item[]): number =>
  items.reduce((n, it) => n + 1 + (it.children ? it.children.length : 0), 0);
let uid = 0;
const newId = () => `tv-${Date.now().toString(36)}-${++uid}`;

/** The editor's items back into Uwazi's value shape. Blank rows are dropped:
 *  an empty label is a row someone added and never filled. */
const toValues = (items: Item[]): ThesaurusValue[] =>
  items
    .filter((it) => it.label.trim())
    .map((it) =>
      it.children
        ? {
            id: it.id,
            label: it.label.trim(),
            values: it.children.filter((c) => c.label.trim()).map((c) => ({ id: c.id, label: c.label.trim() })),
          }
        : { id: it.id, label: it.label.trim() },
    );

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
  const store = useStore();
  const { record } = useSettingsNotify();
  const corpus = useAtomValue(dataSourceAtom);
  const saveThesaurus = useSetAtom(saveThesaurusAtom);
  const isNew = thesaurus === "new";
  const base = isNew ? undefined : thesaurus;

  // The values come from the shared store, so a value the edit form added is
  // here too. Uwazi's { id, label, values? } shape maps straight onto the
  // editor's Item/group model: a value carrying `values` becomes a group whose
  // children render indented beneath it. Ids are kept, so a save writes the
  // same values back rather than renamed copies.
  const stored = useAtomValue(thesauriAtom(corpus)).find((t) => t.id === base?.id);
  const seedVals = stored?.values ?? [];
  const seedItems = (): Item[] =>
    seedVals.map((v) => ({
      id: v.id,
      label: v.label,
      ...(v.values ? { children: v.values.map((c) => ({ id: c.id, label: c.label })) } : {}),
    }));

  const { draft, setField, dirty } = useSettingsDraft({
    id: `thesaurus:${base?.id ?? "new"}`,
    label: "Thesaurus edits",
    saved: { name: base?.name ?? "", items: seedItems() },
  });
  const { name, items } = draft;
  const setName = setField("name");
  const setItems = setField("items");

  // Top-level edits
  const patch = (id: string, label: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, label } : it)));
  /** A removed value or group gets an Undo in the Beacon (UX5) rather than a
   *  dialog: the removal stays in the draft until Save. The notification says
   *  how many entities hold the value. A blank row has nothing to lose. */
  const offerUndo = useSettingsUndo<{ item: Item; index: number; groupId?: string }>(({ item, index, groupId }) =>
    setItems((prev) => {
      if (!groupId) return prev.some((x) => x.id === item.id) ? prev : [...prev.slice(0, index), item, ...prev.slice(index)];
      return prev.map((g) =>
        g.id === groupId && g.children && !g.children.some((c) => c.id === item.id)
          ? { ...g, children: [...g.children.slice(0, index), item, ...g.children.slice(index)] }
          : g,
      );
    }),
  );
  const undoNotice = (item: Item, index: number, groupId?: string) => {
    if (!item.label.trim()) return;
    const held = base
      ? store.get(valueUsageAtom(base.id))({
          id: item.id,
          label: item.label,
          ...(item.children ? { values: item.children.map((c) => ({ id: c.id, label: c.label })) } : {}),
        })
      : 0;
    offerUndo(
      { item, index, groupId },
      `${item.label} removed`,
      `${held === null ? "Entity counts appear when the collection's records have loaded. " : held ? `${held.toLocaleString()} ${held === 1 ? "entity holds" : "entities hold"} ${item.children ? "a value in this group" : "this value"}. ` : ""}Nothing is saved until you save the thesaurus.`,
    );
  };
  const remove = (id: string) => {
    const index = items.findIndex((x) => x.id === id);
    if (index < 0) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    undoNotice(items[index], index);
  };
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
  const removeChild = (groupId: string, childId: string) => {
    const index = items.find((g) => g.id === groupId)?.children?.findIndex((c) => c.id === childId) ?? -1;
    const child = index >= 0 ? items.find((g) => g.id === groupId)!.children![index] : undefined;
    setItems((prev) =>
      prev.map((g) =>
        g.id === groupId && g.children ? { ...g, children: g.children.filter((c) => c.id !== childId) } : g,
      ),
    );
    if (child) undoNotice(child, index, groupId);
  };
  const addChild = (groupId: string) =>
    setItems((prev) =>
      prev.map((g) =>
        g.id === groupId && g.children ? { ...g, children: [...g.children, { id: newId(), label: "" }] } : g,
      ),
    );

  // Drag-to-reorder: top-level via the shared hook; sub-items within one group
  // need a (group, index) key, so they stay bespoke.
  const { dragIdx: dragTop, rowProps: topRow, gripProps: topGrip } = useReorder(setItems);
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
    const finalName = name.trim() || base?.name || "Untitled";
    const id = saveThesaurus({ corpus, id: base?.id ?? null, name: finalName, values: toValues(items) });
    record({
      method: isNew ? "CREATE" : "UPDATE",
      domain: "thesaurus",
      noun: "thesaurus",
      id,
      name: finalName,
      message: isNew ? "Thesaurus created" : `${finalName} saved`,
    });
    onClose();
  };

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
    <SettingsEditor
      component="ThesaurusEditor"
      path={["Thesauri"]}
      title={isNew ? "New thesaurus" : base!.name}
      onBack={onClose}
      isNew={isNew}
      createLabel="Create thesaurus"
      dirty={dirty}
      valid={!!name.trim()}
      onSave={save}
      footerStart={<LastSavedLine domain="thesaurus" id={base?.id} />}
    >
      <SettingsSection>
        <div className="max-w-sm">
          <SettingsField label="Thesaurus name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Violation types" />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title={
          <>
            Items <span className="text-ink-tertiary font-normal">({countItems(items)})</span>
          </>
        }
        action={
          <>
            <SettingsButton variant="secondary" size="sm" icon={<FolderOpen size={14} />} onClick={addGroup}>
              Add group
            </SettingsButton>
            <SettingsButton variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addItem}>
              Add item
            </SettingsButton>
          </>
        }
      >
        {items.length === 0 ? (
          <div className="rounded-md py-8 border border-border-soft">
            <SettingsEmptyState
              title="No items yet"
              hint="Add the values a property using this thesaurus can take."
            />
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-soft">
            {items.map((it, i) =>
              isGroup(it) ? (
                <li
                  key={it.id}
                  {...topRow(i)}
                  className={`py-1 transition-opacity ${dragTop === i ? "opacity-40" : ""}`}
                >
                  {/* Group header */}
                  <div className="group flex items-center gap-2 py-1.5">
                    <DragGrip {...topGrip(i)} />
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
                        className={`group flex items-center gap-2 py-1.5 transition-opacity ${dragChild?.g === it.id && dragChild.i === ci ? "opacity-40" : ""}`}
                      >
                        <DragGrip
                          draggable
                          onDragStart={() => setDragChild({ g: it.id, i: ci })}
                          onDragEnd={() => setDragChild(null)}
                        />
                        {itemInput(child.label, (v) => patchChild(it.id, child.id, v), "Item label", "Item label")}
                        <RowActions label={child.label || "item"} onDelete={() => removeChild(it.id, child.id)} />
                      </div>
                    ))}
                    <div className="py-1.5">
                      <SettingsButton variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => addChild(it.id)}>
                        Add item
                      </SettingsButton>
                    </div>
                  </div>
                </li>
              ) : (
                <li
                  key={it.id}
                  {...topRow(i)}
                  className={`group flex items-center gap-2 py-1.5 transition-opacity ${dragTop === i ? "opacity-40" : ""}`}
                >
                  <DragGrip {...topGrip(i)} />
                  {itemInput(it.label, (v) => patch(it.id, v), "Item label", "Item label")}
                  <RowActions label={it.label || "item"} onDelete={() => remove(it.id)} />
                </li>
              ),
            )}
          </ul>
        )}
      </SettingsSection>
    </SettingsEditor>
  );
}
