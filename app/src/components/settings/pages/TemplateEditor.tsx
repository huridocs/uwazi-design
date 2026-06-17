import { useState } from "react";
import { useSetAtom } from "jotai";
import { Plus, GripVertical } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { Field, TextInput } from "../Field";
import { Checkbox } from "../../shared/Checkbox";
import {
  templatePropertiesByTemplate,
  defaultTemplateProperties,
  propertyTypeLabels,
  type SettingsTemplate,
  type TemplateProperty,
} from "../../../data/settings";
import { entityTypes } from "../../../data/entities";
import { toastsAtom } from "../../../atoms/references";

const PALETTE = entityTypes.map((t) => t.color);

/** Template detail/editor — name, colour, and the property list. Opened from
 *  the Templates list (list → detail pattern). `onClose` returns to the list. */
export function TemplateEditor({
  template,
  onClose,
}: {
  template: SettingsTemplate | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = template === "new";
  const base = isNew ? undefined : template;

  const [name, setName] = useState(base?.name ?? "");
  const [color, setColor] = useState(base?.color ?? PALETTE[0]);
  const [props, setProps] = useState<TemplateProperty[]>(
    isNew ? [...defaultTemplateProperties] : templatePropertiesByTemplate[base!.id] ?? defaultTemplateProperties,
  );

  const patchProp = (id: string, patch: Partial<TemplateProperty>) =>
    setProps((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addProperty = () =>
    setProps((prev) => [
      ...prev,
      { id: `np-${prev.length}-${name.length}`, label: "New property", type: "text", required: false, filterable: false },
    ]);

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Template created" : `${name || "Template"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  const columns: Column<TemplateProperty>[] = [
    {
      id: "label",
      header: "Property",
      cell: (p) => (
        <div className="flex items-center gap-2 w-full">
          <GripVertical size={14} className="text-ink-muted shrink-0 cursor-grab" />
          <input
            value={p.label}
            onChange={(e) => patchProp(p.id, { label: e.target.value })}
            className="flex-1 min-w-0 bg-transparent text-sm font-medium text-ink focus:outline-none focus:bg-warm rounded px-1 py-0.5"
            aria-label="Property label"
          />
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      width: "9rem",
      cell: (p) => (
        <span className="text-[11px] font-semibold text-ink-secondary bg-vellum px-2 py-0.5 rounded-md w-fit">
          {propertyTypeLabels[p.type]}
        </span>
      ),
    },
    {
      id: "required",
      header: "Required",
      width: "6rem",
      align: "center",
      cell: (p) => (
        <Checkbox checked={p.required} onChange={(e) => patchProp(p.id, { required: e.target.checked })} ariaLabel={`${p.label} required`} />
      ),
    },
    {
      id: "filterable",
      header: "Filter",
      width: "5rem",
      align: "center",
      cell: (p) => (
        <Checkbox checked={p.filterable} onChange={(e) => patchProp(p.id, { filterable: e.target.checked })} ariaLabel={`${p.label} filterable`} />
      ),
    },
    {
      id: "actions",
      header: "",
      width: "4rem",
      align: "right",
      cell: (p) => <RowActions label={p.label} onDelete={() => setProps((prev) => prev.filter((x) => x.id !== p.id))} />,
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Templates"]} title={isNew ? "New template" : base!.name} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <section className="grid sm:grid-cols-2 gap-3">
            <Field label="Template name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Court Case" />
            </Field>
            <Field label="Colour">
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`Colour ${c}`}
                    className={`w-6 h-6 rounded-md transition-transform ${color === c ? "ring-2 ring-offset-1 ring-ink scale-105" : "hover:scale-105"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-ink">Properties</h3>
              <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addProperty}>
                Add property
              </Button>
            </div>
            <Table columns={columns} data={props} getRowId={(p) => p.id} emptyState="No properties yet." />
          </section>
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" onClick={save}>
          {isNew ? "Create template" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
