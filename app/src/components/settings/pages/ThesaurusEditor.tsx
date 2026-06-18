import { useState } from "react";
import { useSetAtom } from "jotai";
import { Plus, GripVertical } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { Field, TextInput } from "../Field";
import { seedThesaurusItems, type SettingsThesaurus } from "../../../data/settings";
import { cejilThesaurusItems } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/references";

interface Item {
  id: string;
  label: string;
}

/** Thesaurus detail/editor — name + the editable item list (a thesaurus's
 *  children). Opened from the Thesauri list (list → detail). */
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

  const [name, setName] = useState(base?.name ?? "");
  const [items, setItems] = useState<Item[]>(
    isNew
      ? []
      : (cejilThesaurusItems[base!.id] ?? seedThesaurusItems[base!.id] ?? []).map((label, i) => ({ id: `i${i}`, label })),
  );

  const initialLabels = isNew ? [] : cejilThesaurusItems[base!.id] ?? seedThesaurusItems[base!.id] ?? [];
  const dirty =
    name !== (base?.name ?? "") ||
    JSON.stringify(items.map((i) => i.label)) !== JSON.stringify(initialLabels);

  const patch = (id: string, label: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, label } : it)));
  const addItem = () =>
    setItems((prev) => [...prev, { id: `n-${prev.length}-${name.length}`, label: "" }]);

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Thesaurus created" : `${name || "Thesaurus"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  const columns: Column<Item>[] = [
    {
      id: "label",
      header: "Item",
      cell: (it) => (
        <div className="flex items-center gap-2 w-full">
          <GripVertical size={14} className="text-ink-muted shrink-0 cursor-grab" />
          <input
            value={it.label}
            onChange={(e) => patch(it.id, e.target.value)}
            placeholder="Item label"
            className="flex-1 min-w-0 bg-transparent text-sm text-ink focus:outline-none focus:bg-warm rounded px-1 py-0.5"
            aria-label="Item label"
          />
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "4rem",
      align: "right",
      cell: (it) => (
        <RowActions label={it.label || "item"} onDelete={() => setItems((prev) => prev.filter((x) => x.id !== it.id))} />
      ),
    },
  ];

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
              <h3 className="text-sm font-semibold text-ink">Items <span className="text-ink-tertiary font-normal">({items.length})</span></h3>
              <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addItem}>
                Add item
              </Button>
            </div>
            <Table columns={columns} data={items} getRowId={(it) => it.id} emptyState="No items yet." />
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
