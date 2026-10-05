import { useId, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import { settingsRelationTypesAtom } from "../../../atoms/relationTypes";
import { Plus } from "lucide-react";
import { SettingsEditor } from "../SettingsEditor";
import { SettingsFieldRow, SettingsSection } from "../SettingsSection";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { TemplateCardPreview } from "../TemplateCardPreview";
import { SettingsBarContext, SettingsButton } from "../SettingsButton";
import { Modal } from "../../shared/Modal";
import { ModalField, MODAL_INPUT } from "../../shared/ModalParts";
import { FieldMessage } from "../../shared/FieldMessage";
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
  type SettingsTemplate,
  type TemplateProperty,
} from "../../../data/settings";
import { cejilTemplateProperties } from "../../../data/cejil/settingsAdapt";
import { validateValue, blockingSummary, type ValidationIssue } from "../../../utils/validation";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useSettingsUndo } from "../../../hooks/useSettingsUndo";
import { propertyUsageAtom } from "../../../atoms/settingsUsage";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { newSettingsId } from "../../../atoms/settingsCollection";
import { deepEqual } from "../../../utils/deepEqual";

/** A distinct, calm palette (no duplicates) + a custom picker. */
const PALETTE = [
  "#C03B22", "#D97706", "#CA8A04", "#65A30D", "#059669",
  "#0D9488", "#0891B2", "#2563EB", "#7C3AED", "#DB2777", "#6B7280",
];

const TYPE_OPTIONS = Object.entries(propertyTypeLabels).map(([value, label]) => ({ value, label }));
const THESAURUS_OPTIONS = seedThesauri.map((t) => ({ value: t.name, label: t.name }));
const TEMPLATE_OPTIONS = seedTemplates.map((t) => ({ value: t.name, label: t.name }));

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
  showInCard: boolean;
}

/** The property table's tracks — header and rows must share them to align:
 *  property · type · required · filter · cards · actions. From `md` up only:
 *  on a phone these fixed tracks left the name nothing (390px), so a row
 *  wraps instead, the name on its own line and the flags labelled under it. */
const PROPERTY_COLUMNS = "minmax(0, 1fr) 8rem 5rem 3.5rem 3.5rem 4rem";

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
  onSave?: (patch: { name: string; color: string }) => string | undefined;
}) {
  const store = useStore();
  const { record } = useSettingsNotify();
  const isNew = template === "new";
  const base = isNew ? undefined : template;

  // Property storage is unchanged (pending a decision): only name and colour
  // reach `onSave`. The draft covers everything so the guard sees every edit.
  const { draft, setField, dirty } = useSettingsDraft({
    id: `template:${base?.id ?? "new"}`,
    label: "Template edits",
    saved: {
      name: base?.name ?? "",
      color: base?.color ?? PALETTE[0],
      props: isNew
        ? [...defaultTemplateProperties]
        : cejilTemplateProperties[base!.id] ?? templatePropertiesByTemplate[base!.id] ?? defaultTemplateProperties,
      config: {} as Record<string, PropConfig>,
    },
  });
  const { name, color, props, config } = draft;
  const setName = setField("name");
  const setColor = setField("color");
  const setProps = setField("props");
  const setConfig = setField("config");
  // The property being edited in the dialog: an existing property, "new", or none.
  const [editing, setEditing] = useState<TemplateProperty | "new" | null>(null);
  const { dragIdx, rowProps, gripProps } = useReorder(setProps);

  /* ── Validation — same rules + message idiom as the entity metadata form.
     Name is required (error, blocks save); a very short name only warns. */
  const [nameIssue, setNameIssue] = useState<ValidationIssue | null>(null);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const checkName = (v: string) =>
    validateValue("text", v, { required: true, label: "Template name" });
  const saveBlocked = saveAttempted && nameIssue?.severity === "error";

  const patchProp = (id: string, patch: Partial<TemplateProperty>) =>
    setProps((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  /** Remove a property from the draft, with an Undo in the Beacon (UX5),
   *  unless another template inherits it: Uwazi refuses that
   *  (UpdateTemplate.ts), so the dialog names the rule. */
  const [refused, setRefused] = useState<{ label: string; block: string } | null>(null);
  const offerUndo = useSettingsUndo<{ prop: TemplateProperty; index: number; cfg?: PropConfig }>(({ prop, index, cfg }) => {
    setProps((prev) => (prev.some((p) => p.id === prop.id) ? prev : [...prev.slice(0, index), prop, ...prev.slice(index)]));
    if (cfg) setConfig((prev) => ({ ...prev, [prop.id]: cfg }));
  });
  const deleteProperty = (id: string) => {
    const index = props.findIndex((x) => x.id === id);
    const prop = props[index];
    if (!prop) return;
    const usage = base
      ? store.get(
          propertyUsageAtom({
            templateId: base.id,
            label: prop.label,
            name: prop.id.startsWith(`${base.id}-`) ? prop.id.slice(base.id.length + 1) : undefined,
          }),
        )
      : null;
    if (usage?.block) {
      setRefused({ label: prop.label, block: usage.block });
      return;
    }
    setProps((prev) => prev.filter((x) => x.id !== id));
    setConfig((prev) => {
      const { [id]: _drop, ...rest } = prev;
      return rest;
    });
    offerUndo(
      { prop, index, cfg: config[id] },
      `${prop.label} removed`,
      [...(usage?.lines ?? []), "Nothing is saved until you save the template."].join(" "),
    );
  };

  /** Commit a property dialog — append (new) or patch (existing) + its config. */
  const commitProperty = (prop: PropertyDraft) => {
    const { label, type, required, filterable, showInCard, ...cfg } = prop;
    if (editing === "new") {
      const id = newSettingsId("np");
      setProps((prev) => [...prev, { id, label, type, required, filterable, showInCard }]);
      setConfig((prev) => ({ ...prev, [id]: cfg }));
    } else if (editing) {
      patchProp(editing.id, { label, type, required, filterable, showInCard });
      // A dialog saved with no change leaves the config as it was: writing the
      // dialog's defaults made an unchanged template read as dirty.
      if (!deepEqual(cfg, effectiveConfig(editing.type, config[editing.id])))
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
    const finalName = name.trim() || base?.name || "Untitled template";
    const id = onSave?.({ name: finalName, color }) ?? base?.id;
    record({ log: false, 
      method: isNew ? "CREATE" : "UPDATE",
      domain: "template",
      noun: "template",
      id,
      name: finalName,
      message: isNew ? "Template created" : `${finalName} saved`,
    });
    onClose();
  };

  const customSelected = !PALETTE.some((c) => c.toLowerCase() === color.toLowerCase());

  return (
    <SettingsEditor
      component="TemplateEditor"
      path={["Templates"]}
      title={isNew ? "New template" : base!.name}
      onBack={onClose}
      isNew={isNew}
      createLabel="Create template"
      dirty={dirty}
      saveBlocked={saveBlocked}
      onSave={trySave}
      wide
      footerStatus={
        // Save-attempt summary — alert only on the attempt, not per keystroke.
        // The footer keeps its fixed height; this rides the existing row.
        saveBlocked ? (
          <span role="alert" className="text-meta font-medium text-seal-label">
            {blockingSummary(1, 0)}
          </span>
        ) : (
          <LastSavedLine domain="template" id={base?.id} />
        )
      }
      overlays={
        <>
          <ConfirmDelete
            open={refused !== null}
            title="Remove property"
            message=""
            impact={refused ? { lines: [], block: refused.block } : null}
            onConfirm={() => setRefused(null)}
            onCancel={() => setRefused(null)}
          />
          {editing !== null && (
            <PropertyDialog
              property={editing === "new" ? null : editing}
              config={editing === "new" ? undefined : config[editing.id]}
              onCancel={() => setEditing(null)}
              onSave={commitProperty}
            />
          )}
        </>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col gap-6 flex-1 min-w-0">
          <SettingsSection>
            <SettingsFieldRow>
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
            </SettingsFieldRow>
          </SettingsSection>

          <SettingsSection
            title="Properties"
            action={
              <SettingsButton variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
                Add property
              </SettingsButton>
            }
          >

            {/* A real table, re-displayed as grid rows like the shared DataTable.
                WebKit drops table semantics from re-displayed table elements, so
                the implicit roles are stated too. */}
            <table
              role="table"
              aria-label="Properties"
              data-part="properties"
              className="flex flex-col rounded-md overflow-hidden border border-border-soft"
            >
              <thead role="rowgroup" className="block">
                <tr
                  role="row"
                  // Phone rows label their own flags, so the header row is for
                  // screen readers only below `md`.
                  className="sr-only md:not-sr-only md:grid items-center gap-3 md:px-3 md:py-2 text-meta font-semibold uppercase tracking-wide text-ink-tertiary bg-warm"
                  style={{ gridTemplateColumns: PROPERTY_COLUMNS }}
                >
                  <th role="columnheader" scope="col" className="font-semibold text-start min-w-0 truncate">Property</th>
                  <th role="columnheader" scope="col" className="font-semibold text-start">Type</th>
                  <th role="columnheader" scope="col" className="font-semibold text-center">Required</th>
                  <th role="columnheader" scope="col" className="font-semibold text-center">Filter</th>
                  <th role="columnheader" scope="col" className="font-semibold text-center">Cards</th>
                  <th role="columnheader" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody role="rowgroup" className="block">
                {props.length === 0 ? (
                  <tr role="row" className="block">
                    <td role="cell" className="block px-3 py-8 border-t border-border-soft">
                      <SettingsEmptyState
                        title="No properties yet"
                        hint="Add the fields an entity of this template carries."
                      />
                    </td>
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
                        className={`group flex flex-wrap md:grid items-center gap-x-3 gap-y-1.5 md:gap-3 px-3 py-2 border-t border-border-soft transition-opacity ${dragIdx === i ? "opacity-40" : ""}`}
                        style={{ gridTemplateColumns: PROPERTY_COLUMNS }}
                      >
                        <td role="cell" className="flex items-center gap-2 basis-full md:basis-auto w-full min-w-0">
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
                        <td role="cell" className="flex md:justify-center">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox checked={p.required} onChange={(e) => patchProp(p.id, { required: e.target.checked })} ariaLabel={`${p.label} required`} />
                            <span aria-hidden className="md:hidden text-meta text-ink-tertiary">Required</span>
                          </label>
                        </td>
                        <td role="cell" className="flex md:justify-center">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox checked={p.filterable} onChange={(e) => patchProp(p.id, { filterable: e.target.checked })} ariaLabel={`${p.label} filterable`} />
                            <span aria-hidden className="md:hidden text-meta text-ink-tertiary">Filter</span>
                          </label>
                        </td>
                        <td role="cell" className="flex md:justify-center">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox checked={p.showInCard} onChange={(e) => patchProp(p.id, { showInCard: e.target.checked })} ariaLabel={`${p.label} show in cards`} />
                            <span aria-hidden className="md:hidden text-meta text-ink-tertiary">Cards</span>
                          </label>
                        </td>
                        <td role="cell" className="ms-auto md:ms-0">
                          <RowActions label={p.label} onEdit={() => setEditing(p)} onDelete={() => deleteProperty(p.id)} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </SettingsSection>
        </div>

        {/* Live card preview — beside the field list on wide screens, stacked
            below it on narrow ones so the property table keeps its width. */}
        <aside className="lg:w-[17rem] shrink-0 pt-6 lg:pt-0 border-t border-border-soft lg:border-t-0">
          <div className="lg:sticky lg:top-0">
            <TemplateCardPreview name={name} color={color} properties={props} config={config} />
          </div>
        </aside>
      </div>
    </SettingsEditor>
  );
}

/** Modal to edit a single property — label, type, type-specific config, and the
 *  required / filterable flags. Drives both the edit pencil and "Add property". */
/** The config a property dialog opens with, and submits when left alone:
 *  the stored config, else the first option of each list. */
function effectiveConfig(type: TemplateProperty["type"], config?: PropConfig): PropConfig {
  if (type === "select") return { content: config?.content ?? THESAURUS_OPTIONS[0]?.value ?? "" };
  if (type === "relationship")
    return {
      targetTemplate: config?.targetTemplate ?? TEMPLATE_OPTIONS[0]?.value ?? "",
      // By registry id; none until chosen (Uwazi's "Select...").
      relationType: config?.relationType ?? "",
    };
  return {};
}

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
  // The collection's relationship types, by id: a type added or renamed in
  // Settings › Relationship types is here at once.
  const relationTypes = useAtomValue(settingsRelationTypesAtom);
  const isNew = property === null;
  const [label, setLabel] = useState(property?.label ?? "");
  const [type, setType] = useState<TemplateProperty["type"]>(property?.type ?? "text");
  const [required, setRequired] = useState(property?.required ?? false);
  const [filterable, setFilterable] = useState(property?.filterable ?? false);
  // A new property is on the card unless the author says otherwise.
  const [showInCard, setShowInCard] = useState(property?.showInCard ?? true);
  const [content, setContent] = useState(effectiveConfig("select", config).content ?? "");
  const [targetTemplate, setTargetTemplate] = useState(effectiveConfig("relationship", config).targetTemplate ?? "");
  const [relationType, setRelationType] = useState(effectiveConfig("relationship", config).relationType ?? "");
  const [labelIssue, setLabelIssue] = useState<ValidationIssue | null>(null);
  const checkLabel = (v: string) => validateValue("text", v, { required: true, label: "Label" });

  const submit = () => {
    const draft: PropertyDraft = { label: label.trim() || "Untitled", type, required, filterable, showInCard };
    if (type === "select") draft.content = content;
    if (type === "relationship") {
      draft.targetTemplate = targetTemplate;
      draft.relationType = relationType;
    }
    onSave(draft);
  };

  const labelInputId = useId();
  const labelMsgId = useId();
  const typeId = useId();
  const contentId = useId();
  const targetId = useId();
  const relationId = useId();

  return (
    <Modal
      component="PropertyDialog"
      title={isNew ? "New property" : "Edit property"}
      closeLabel={isNew ? "Close new property" : "Close property editor"}
      onClose={onCancel}
      size="md"
      // Fixed, so the panel does not resize when a type adds its own fields,
      // and an open type list has room below its trigger.
      height="md:h-[min(30rem,100%)]"
      footer={
        <SettingsBarContext.Provider value={true}>
          <SettingsButton variant="ghost" size="sm" onClick={onCancel}>Cancel</SettingsButton>
          <SettingsButton variant={isNew ? "commit" : "success"} size="sm" disabled={!label.trim()} onClick={submit}>
            {isNew ? "Add property" : "Save"}
          </SettingsButton>
        </SettingsBarContext.Provider>
      }
    >
      <div className="flex flex-col gap-3">
        <ModalField label="Label" htmlFor={labelInputId}>
          <input
            id={labelInputId}
            type="text"
            value={label}
            aria-invalid={labelIssue?.severity === "error" || undefined}
            aria-describedby={labelMsgId}
            onChange={(e) => {
              setLabel(e.target.value);
              if (labelIssue) setLabelIssue(checkLabel(e.target.value));
            }}
            onBlur={(e) => setLabelIssue(checkLabel(e.currentTarget.value))}
            placeholder="e.g. Date filed"
            autoFocus
            className={MODAL_INPUT}
          />
          <FieldMessage id={labelMsgId} issue={labelIssue} reserve />
        </ModalField>
        <ModalField label="Type" htmlFor={typeId}>
          <Select id={typeId} value={type} options={TYPE_OPTIONS} onChange={(v) => setType(v as TemplateProperty["type"])} ariaLabel="Property type" sheetTitle="Type" />
        </ModalField>

        {type === "select" && (
          <ModalField label="Thesaurus" htmlFor={contentId} hint="Which thesaurus the options come from.">
            <Select id={contentId} value={content} options={THESAURUS_OPTIONS} onChange={setContent} ariaLabel="Thesaurus" sheetTitle="Thesaurus" />
          </ModalField>
        )}
        {type === "relationship" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ModalField label="Related template" htmlFor={targetId}>
              <Select id={targetId} value={targetTemplate} options={TEMPLATE_OPTIONS} onChange={setTargetTemplate} ariaLabel="Related template" sheetTitle="Related template" />
            </ModalField>
            <ModalField label="Relationship type" htmlFor={relationId}>
              <Select id={relationId} value={relationType} options={[{ value: "", label: "Select...", disabled: true }, ...relationTypes.map((r) => ({ value: r.id, label: r.label }))]} onChange={setRelationType} ariaLabel="Relationship type" sheetTitle="Relationship type" />
            </ModalField>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
            <Checkbox checked={required} onChange={(e) => setRequired(e.target.checked)} ariaLabel="Required" />
            Required
          </label>
          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
            <Checkbox checked={filterable} onChange={(e) => setFilterable(e.target.checked)} ariaLabel="Use as filter" />
            Use as filter
          </label>
          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
            <Checkbox checked={showInCard} onChange={(e) => setShowInCard(e.target.checked)} ariaLabel="Show in cards" />
            Show in cards
          </label>
        </div>
      </div>
    </Modal>
  );
}
