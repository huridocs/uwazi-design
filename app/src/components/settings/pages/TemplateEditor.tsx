import { useEffect, useId, useState } from "react";
import { useSetAtom } from "jotai";
import { Plus, X } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { TemplateCardPreview } from "../TemplateCardPreview";
import { SettingsButton } from "../SettingsButton";
import { RowActions } from "../RowActions";
import { DragGrip } from "../DragGrip";
import { useReorder } from "../../../hooks/useReorder";
import { SettingsField, TextInput } from "../SettingsField";
import { Checkbox } from "../../shared/Checkbox";
import { Select } from "../../shared/Select";
import {
  templatePropertiesByTemplate,
  defaultTemplateProperties,
  propertyTypeLabels,
  seedThesauri,
  seedTemplates,
  seedRelationTypes,
  type SettingsTemplate,
  type TemplateProperty,
} from "../../../data/settings";
import { cejilTemplateProperties } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/references";
import { validateValue, blockingSummary, type ValidationIssue } from "../../../utils/validation";

/** A distinct, calm palette (no duplicates) + a custom picker. */
const PALETTE = [
  "#C03B22", "#D97706", "#CA8A04", "#65A30D", "#059669",
  "#0D9488", "#0891B2", "#2563EB", "#7C3AED", "#DB2777", "#6B7280",
];

const TYPE_OPTIONS = Object.entries(propertyTypeLabels).map(([value, label]) => ({ value, label }));
const THESAURUS_OPTIONS = seedThesauri.map((t) => ({ value: t.name, label: t.name }));
const TEMPLATE_OPTIONS = seedTemplates.map((t) => ({ value: t.name, label: t.name }));
const RELATION_OPTIONS = seedRelationTypes.map((r) => ({ value: r.name, label: r.name }));

/** Per-property type-specific config, held locally (the shared TemplateProperty
 *  type stays scalar). Keyed by property id. */
interface PropConfig {
  content?: string;
  targetTemplate?: string;
  relationType?: string;
}

/** The full editable shape a property dialog produces. */
interface PropertyDraft extends PropConfig {
  label: string;
  type: TemplateProperty["type"];
  required: boolean;
  filterable: boolean;
}

/** Template detail/editor — name, colour, and the property list. Opened from
 *  the Templates list (list → detail pattern). `onClose` returns to the list. */
export function TemplateEditor({
  template,
  onClose,
  onSave,
}: {
  template: SettingsTemplate | "new";
  onClose: () => void;
  /** Persist the edited name/colour back to the list so changes stick for the
   *  session (the mock has no backend). */
  onSave?: (patch: { name: string; color: string }) => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = template === "new";
  const base = isNew ? undefined : template;

  const [name, setName] = useState(base?.name ?? "");
  const [color, setColor] = useState(base?.color ?? PALETTE[0]);
  const [props, setProps] = useState<TemplateProperty[]>(
    isNew
      ? [...defaultTemplateProperties]
      : cejilTemplateProperties[base!.id] ?? templatePropertiesByTemplate[base!.id] ?? defaultTemplateProperties,
  );
  const [config, setConfig] = useState<Record<string, PropConfig>>({});
  // The property being edited in the dialog: an existing property, "new", or none.
  const [editing, setEditing] = useState<TemplateProperty | "new" | null>(null);
  const { dragIdx, rowProps, gripProps } = useReorder(setProps);
  const propertiesHeadingId = useId();

  /* ── Validation — same rules + message idiom as the entity metadata form.
     Name is required (error, blocks save); a very short name only warns. */
  const [nameIssue, setNameIssue] = useState<ValidationIssue | null>(null);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const checkName = (v: string) =>
    validateValue("text", v, { required: true, label: "Template name" });
  const saveBlocked = saveAttempted && nameIssue?.severity === "error";

  const initialColor = base?.color ?? PALETTE[0];
  const initialProps = isNew
    ? defaultTemplateProperties
    : cejilTemplateProperties[base!.id] ?? templatePropertiesByTemplate[base!.id] ?? defaultTemplateProperties;
  const dirty =
    name !== (base?.name ?? "") ||
    color !== initialColor ||
    JSON.stringify(props) !== JSON.stringify(initialProps) ||
    Object.keys(config).length > 0;

  const patchProp = (id: string, patch: Partial<TemplateProperty>) =>
    setProps((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const deleteProperty = (id: string) => {
    setProps((prev) => prev.filter((x) => x.id !== id));
    setConfig((prev) => {
      const { [id]: _drop, ...rest } = prev;
      return rest;
    });
  };

  /** Commit a property dialog — append (new) or patch (existing) + its config. */
  const commitProperty = (draft: PropertyDraft) => {
    const { label, type, required, filterable, ...cfg } = draft;
    if (editing === "new") {
      const id = `np-${props.length}-${name.length}-${label.length}`;
      setProps((prev) => [...prev, { id, label, type, required, filterable }]);
      setConfig((prev) => ({ ...prev, [id]: cfg }));
    } else if (editing) {
      patchProp(editing.id, { label, type, required, filterable });
      setConfig((prev) => ({ ...prev, [editing.id]: cfg }));
    }
    setEditing(null);
  };

  /** Save attempt: an error on the name blocks it, alerts, and refocuses the
   *  field; warnings let it through. */
  const trySave = () => {
    const issue = checkName(name);
    setNameIssue(issue);
    if (issue?.severity === "error") {
      setSaveAttempted(true);
      document.getElementById("template-name-input")?.focus();
      return;
    }
    save();
  };

  const save = () => {
    onSave?.({ name: name.trim() || base?.name || "Untitled template", color });
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Template created" : `${name || "Template"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  const customSelected = !PALETTE.some((c) => c.toLowerCase() === color.toLowerCase());

  return (
    <SettingsContent component="TemplateEditor">
      <SettingsContent.Header path={["Templates"]} title={isNew ? "New template" : base!.name} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col gap-6 flex-1 min-w-0">
          <section className="grid sm:grid-cols-2 gap-3">
            <SettingsField label="Template name" issue={nameIssue}>
              <TextInput
                id="template-name-input"
                value={name}
                issue={nameIssue}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameIssue) setNameIssue(checkName(e.target.value));
                }}
                onBlur={(e) => setNameIssue(checkName(e.currentTarget.value))}
                placeholder="e.g. Court Case"
              />
            </SettingsField>
            <SettingsField label="Colour" group>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`Colour ${c}`}
                    className={`w-6 h-6 rounded-md border border-ink/20 transition-transform ${color.toLowerCase() === c.toLowerCase() ? "ring-2 ring-offset-1 ring-ink scale-105" : "hover:scale-105"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                {customSelected && (
                  <span
                    className="w-6 h-6 rounded-md border border-ink/20 ring-2 ring-offset-1 ring-ink"
                    style={{ backgroundColor: color }}
                    aria-label="Custom colour (selected)"
                  />
                )}
                {/* Custom colour picker — opens the native swatch. */}
                <label
                  className="relative w-6 h-6 rounded-md cursor-pointer overflow-hidden grid place-items-center"
                  style={{ background: "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)" }}
                  title="Custom colour"
                >
                  <Plus size={12} className="text-white" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.4))" }} />
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    aria-label="Custom colour"
                  />
                </label>
              </div>
            </SettingsField>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 id={propertiesHeadingId} className="text-sm font-semibold text-ink mb-3">Properties</h3>

            {/* A real table, re-displayed as grid rows like the shared DataTable.
                WebKit drops table semantics from re-displayed table elements, so
                the implicit roles are stated too. */}
            <table
              role="table"
              aria-labelledby={propertiesHeadingId}
              data-part="properties"
              className="flex flex-col rounded-md overflow-hidden"
              style={{ border: "1px solid var(--border-soft)" }}
            >
              <thead role="rowgroup" className="block">
                <tr
                  role="row"
                  className="grid items-center gap-3 px-3 py-2 text-meta font-semibold uppercase tracking-wide text-ink-tertiary bg-warm"
                  style={{ gridTemplateColumns: "1fr 9rem 6rem 5rem 4rem" }}
                >
                  <th role="columnheader" scope="col" className="font-semibold text-start">Property</th>
                  <th role="columnheader" scope="col" className="font-semibold text-start">Type</th>
                  <th role="columnheader" scope="col" className="font-semibold text-center">Required</th>
                  <th role="columnheader" scope="col" className="font-semibold text-center">Filter</th>
                  <th role="columnheader" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody role="rowgroup" className="block">
                {props.length === 0 ? (
                  <tr role="row" className="block">
                    <td role="cell" className="block px-3 py-6 text-sm text-ink-muted text-center">No properties yet.</td>
                  </tr>
                ) : (
                  props.map((p, i) => {
                    const cfg = config[p.id] ?? {};
                    const detail =
                      p.type === "relationship"
                        ? cfg.targetTemplate
                        : p.type === "select"
                          ? cfg.content
                          : undefined;
                    return (
                      <tr
                        key={p.id}
                        {...rowProps(i)}
                        role="row"
                        data-part="property"
                        className={`grid items-center gap-3 px-3 py-2 transition-opacity ${dragIdx === i ? "opacity-40" : ""}`}
                        style={{ gridTemplateColumns: "1fr 9rem 6rem 5rem 4rem", borderTop: "1px solid var(--border-soft)" }}
                      >
                        <td role="cell" className="flex items-center gap-2 w-full min-w-0">
                          <DragGrip {...gripProps(i)} />
                          <span className="truncate text-sm font-medium text-ink">{p.label}</span>
                          {detail && (
                            <span className="truncate text-xs text-ink-tertiary shrink-0">· {detail}</span>
                          )}
                        </td>
                        <td role="cell">
                          <span className="block text-meta font-semibold text-ink-secondary bg-vellum px-2 py-0.5 rounded-md w-fit">
                            {propertyTypeLabels[p.type]}
                          </span>
                        </td>
                        <td role="cell" className="flex justify-center">
                          <Checkbox checked={p.required} onChange={(e) => patchProp(p.id, { required: e.target.checked })} ariaLabel={`${p.label} required`} />
                        </td>
                        <td role="cell" className="flex justify-center">
                          <Checkbox checked={p.filterable} onChange={(e) => patchProp(p.id, { filterable: e.target.checked })} ariaLabel={`${p.label} filterable`} />
                        </td>
                        <td role="cell">
                          <RowActions label={p.label} onEdit={() => setEditing(p)} onDelete={() => deleteProperty(p.id)} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        </div>

        {/* Live card preview — beside the field list on wide screens, stacked
            below it on narrow ones so the property table keeps its width. */}
        <aside className="lg:w-[17rem] shrink-0 pt-6 lg:pt-0 border-t border-border-soft lg:border-t-0">
          <div className="lg:sticky lg:top-0">
            <TemplateCardPreview name={name} color={color} properties={props} config={config} />
          </div>
        </aside>
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="secondary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Add property
        </SettingsButton>
        {/* Save-attempt summary — alert only on the attempt, not per keystroke.
            The footer keeps its fixed height; this rides the existing row. */}
        {saveBlocked && (
          <span role="alert" className="text-meta font-medium text-seal-label">
            {blockingSummary(1, 0)}
          </span>
        )}
        <SettingsButton variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </SettingsButton>
        <SettingsButton
          variant="success"
          size="sm"
          disabled={!dirty}
          aria-disabled={saveBlocked || undefined}
          className={saveBlocked ? "opacity-60" : undefined}
          onClick={trySave}
        >
          {isNew ? "Create template" : "Save"}
        </SettingsButton>
      </SettingsContent.Footer>

      {editing !== null && (
        <PropertyDialog
          property={editing === "new" ? null : editing}
          config={editing === "new" ? undefined : config[editing.id]}
          onCancel={() => setEditing(null)}
          onSave={commitProperty}
        />
      )}
    </SettingsContent>
  );
}

/** Modal to edit a single property — label, type, type-specific config, and the
 *  required / filterable flags. Drives both the edit pencil and "Add property". */
function PropertyDialog({
  property,
  config,
  onCancel,
  onSave,
}: {
  property: TemplateProperty | null;
  config?: PropConfig;
  onCancel: () => void;
  onSave: (draft: PropertyDraft) => void;
}) {
  const isNew = property === null;
  const [label, setLabel] = useState(property?.label ?? "");
  const [type, setType] = useState<TemplateProperty["type"]>(property?.type ?? "text");
  const [required, setRequired] = useState(property?.required ?? false);
  const [filterable, setFilterable] = useState(property?.filterable ?? false);
  const [content, setContent] = useState(config?.content ?? THESAURUS_OPTIONS[0]?.value ?? "");
  const [targetTemplate, setTargetTemplate] = useState(config?.targetTemplate ?? TEMPLATE_OPTIONS[0]?.value ?? "");
  const [relationType, setRelationType] = useState(config?.relationType ?? RELATION_OPTIONS[0]?.value ?? "");
  const [labelIssue, setLabelIssue] = useState<ValidationIssue | null>(null);
  const checkLabel = (v: string) => validateValue("text", v, { required: true, label: "Label" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = () => {
    const draft: PropertyDraft = { label: label.trim() || "Untitled", type, required, filterable };
    if (type === "select") draft.content = content;
    if (type === "relationship") {
      draft.targetTemplate = targetTemplate;
      draft.relationType = relationType;
    }
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-[26rem] bg-paper rounded-lg shadow-xl flex flex-col"
        style={{ border: "1px solid var(--border-primary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between h-12 px-4" style={{ borderBottom: "1px solid var(--border-soft)" }}>
          <h3 className="text-sm font-semibold text-ink">{isNew ? "New property" : "Edit property"}</h3>
          <button onClick={onCancel} aria-label="Close" className="p-1.5 rounded-md hover:bg-warm text-ink-muted hover:text-ink transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <SettingsField label="Label" issue={labelIssue}>
            <TextInput
              value={label}
              issue={labelIssue}
              onChange={(e) => {
                setLabel(e.target.value);
                if (labelIssue) setLabelIssue(checkLabel(e.target.value));
              }}
              onBlur={(e) => setLabelIssue(checkLabel(e.currentTarget.value))}
              placeholder="e.g. Date filed"
              autoFocus
            />
          </SettingsField>
          <SettingsField label="Type">
            <Select value={type} options={TYPE_OPTIONS} onChange={(v) => setType(v as TemplateProperty["type"])} ariaLabel="Property type" />
          </SettingsField>

          {type === "select" && (
            <SettingsField label="Thesaurus" hint="Which thesaurus the options come from.">
              <Select value={content} options={THESAURUS_OPTIONS} onChange={setContent} ariaLabel="Thesaurus" />
            </SettingsField>
          )}
          {type === "relationship" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SettingsField label="Related template">
                <Select value={targetTemplate} options={TEMPLATE_OPTIONS} onChange={setTargetTemplate} ariaLabel="Related template" />
              </SettingsField>
              <SettingsField label="Relation type">
                <Select value={relationType} options={RELATION_OPTIONS} onChange={setRelationType} ariaLabel="Relation type" />
              </SettingsField>
            </div>
          )}

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <Checkbox checked={required} onChange={(e) => setRequired(e.target.checked)} ariaLabel="Required" />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <Checkbox checked={filterable} onChange={(e) => setFilterable(e.target.checked)} ariaLabel="Use as filter" />
              Use as filter
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 h-12 px-4" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <SettingsButton variant="ghost" size="sm" onClick={onCancel}>Cancel</SettingsButton>
          <SettingsButton variant="success" size="sm" disabled={!label.trim()} onClick={submit}>
            {isNew ? "Add property" : "Save"}
          </SettingsButton>
        </div>
      </div>
    </div>
  );
}
