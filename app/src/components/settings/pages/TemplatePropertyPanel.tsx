import { useId, useMemo, useState, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { CircleHelp } from "lucide-react";
import { Modal } from "../../shared/Modal";
import { ModalField, MODAL_INPUT } from "../../shared/ModalParts";
import { FieldMessage } from "../../shared/FieldMessage";
import { Checkbox } from "../../shared/Checkbox";
import { Select } from "../../shared/Select";
import { Hint } from "../../shared/Hint";
import { SettingsBarContext, SettingsButton } from "../SettingsButton";
import { TYPE_ICONS } from "../propertyTypeIcons";
import { thesauriAtom } from "../../../atoms/thesauri";
import { relationTypesCorpus, relationTypesOfAtom } from "../../../atoms/relationTypes";
import type { Corpus } from "../../../data/entityChanges";
import type { PropertyDef, PropertyType, TemplateDef } from "../../../data/templates/types";
import { deepEqual } from "../../../utils/deepEqual";
import {
  ADDABLE_TYPES,
  TYPE_LABELS,
  commonKindOf,
  mismatches,
  panelFields,
  propertyLabelIssue,
  sameLabelIssue,
  sameLabelRows,
  withFilter,
  withType,
  type MatchField,
} from "../../../utils/templateRules";

/** Uwazi's help texts, verbatim (page-briefs.md, property dialog §4). */
const HELP = {
  style: {
    cover: "Will attempt to fill the container, using its entire width. In cards, cropping is likely to occur.",
    contain: "Will show the entire media inside the container.",
  },
  fullWidth: "This property will be shown using all the width available.",
  noLabel: "This property will be shown without the label",
  required: "You won't be able to save an entity if this property is empty.",
  showInCard: "This property will appear in the library cards as part of the basic info.",
  filter:
    "This property will be used for filtering the library results. When properties match in equal name and field type with other entity types, they will be combined for filtering.",
  defaultfilter: "This property will be the default filter in the library for this template.",
  prioritySorting:
    "Properties marked as priority sorting will be used as default sorting criteria. If more than one property is marked as priority sorting the system will try to pick-up the best fit. When listing mixed template types, the system will pick-up the best combined priority sorting.",
  generatedId: "A generated ID will be the default title.",
};

const REQUIRED = "This field is required";
const byLabel = <T,>(list: T[], label: (x: T) => string) => [...list].sort((a, b) => label(a).localeCompare(label(b)));

/** A question-mark button that shows a help text on hover and keyboard focus. */
function HelpTip({ label, text }: { label: string; text: string }) {
  return (
    <Hint text={text}>
      {(hint) => (
        <button
          {...hint}
          type="button"
          aria-label={`About ${label}`}
          className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-ink-muted hover:text-ink-secondary cursor-help"
        >
          <CircleHelp size={14} aria-hidden />
        </button>
      )}
    </Hint>
  );
}

/** One checkbox of the panel, its help beside it, and an optional visible
 *  help line under it (for the flags that change the Library). */
function Flag({
  label,
  help,
  checked,
  onChange,
  visibleHelp = false,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  visibleHelp?: boolean;
}) {
  return (
    <div data-part="flag" className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
          <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} ariaLabel={label} />
          {label}
        </label>
        <HelpTip label={label} text={help} />
      </div>
      {visibleHelp && <p className="ps-5.5 text-xs text-ink-tertiary text-pretty">{help}</p>}
    </div>
  );
}

/** The property panel (Uwazi's ConfigPropertyPanel), on the shared Modal: the
 *  fields a type offers, in Uwazi's order, with its help texts, its label
 *  rules and its same-label table. Nothing is stored until the editor saves:
 *  `onSubmit` hands the edited property back to the draft. */
export function TemplatePropertyPanel({
  property,
  isCommon,
  draft,
  saved,
  corpus,
  onCancel,
  onSubmit,
}: {
  /** The property edited, or null for a new one. */
  property: PropertyDef | null;
  isCommon: boolean;
  /** The template being edited, as drafted: labels are unique against it. */
  draft: TemplateDef;
  /** The corpus's templates as saved: the same-label table compares them. */
  saved: TemplateDef[];
  corpus: Corpus;
  onCancel: () => void;
  onSubmit: (p: PropertyDef) => void;
}) {
  const isNew = property === null;
  const initial = useMemo<PropertyDef>(() => property ?? { id: "", name: "", label: "", type: "text" }, [property]);
  const [form, setForm] = useState<PropertyDef>(initial);
  const [attempted, setAttempted] = useState(false);
  const thesauri = useAtomValue(thesauriAtom(corpus));
  const relationTypes = useAtomValue(relationTypesOfAtom(relationTypesCorpus(corpus)));
  const common = isCommon ? commonKindOf(form) : null;
  const fields = panelFields(form.type, common, !!form.filter);
  const set = (patch: Partial<PropertyDef>) => setForm((f) => ({ ...f, ...patch }));

  const ids = { label: useId(), labelMsg: useId(), type: useId(), thesaurus: useId(), relationType: useId(), entities: useId(), inherit: useId() };

  const labelIssue = common
    ? form.label.trim()
      ? null
      : REQUIRED
    : propertyLabelIssue(draft, property?.id ?? null, form.label);
  const thesaurusIssue = fields.thesaurus && !form.content ? REQUIRED : null;
  const relationIssue = fields.relationship && !form.relationType ? REQUIRED : null;
  const rows = fields.sameLabel ? sameLabelRows(saved, draft, { ...form, id: property?.id ?? "__new__" }) : [];
  const conflict = fields.sameLabel ? sameLabelIssue(rows) : null;
  const dirty = !deepEqual(form, initial);

  const submit = () => {
    setAttempted(true);
    if (labelIssue || thesaurusIssue || relationIssue || conflict) return;
    onSubmit({ ...form, label: form.label.trim() });
  };

  const templateName = (id?: string) => (id ? (saved.find((t) => t.id === id)?.name ?? id) : "Any entity");
  const thesaurusName = (id?: string) => (id ? (thesauri.find((t) => t.id === id)?.name ?? "No type") : "No type");
  const relationName = (id?: string) => (id ? (relationTypes.find((t) => t.id === id)?.label ?? "No type") : "No type");
  const target = form.content ? saved.find((t) => t.id === form.content) : undefined;
  const targetProps = target ? byLabel(target.properties, (p) => p.label) : [];
  const renamed = !isNew && !common && form.label.trim() !== "" && form.label.trim() !== property!.label;

  const TypeIcon = TYPE_ICONS[form.type];

  return (
    <Modal
      component="TemplatePropertyPanel"
      title={isNew ? "New property" : "Edit property"}
      closeLabel="Close"
      onClose={onCancel}
      // Typed edits are not dropped by a stray click outside.
      dismissOnScrim={!dirty}
      size="md"
      height="md:h-[min(40rem,100%)]"
      footer={
        <SettingsBarContext.Provider value={true}>
          {conflict && attempted && (
            <span role="alert" className="me-auto min-w-0 truncate text-meta font-medium text-seal-label" title={conflict}>
              {conflict}
            </span>
          )}
          <SettingsButton variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </SettingsButton>
          <SettingsButton variant="commit" size="sm" disabled={!!conflict} onClick={submit}>
            {isNew ? "Add property" : "Save"}
          </SettingsButton>
        </SettingsBarContext.Provider>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {isNew ? (
          <ModalField label="Property type" htmlFor={ids.type}>
            <Select
              id={ids.type}
              value={form.type}
              options={ADDABLE_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
              onChange={(v) => setForm((f) => withType(f, v as PropertyType))}
              ariaLabel="Property type"
              sheetTitle="Property type"
            />
          </ModalField>
        ) : (
          <div data-part="type-box" className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-secondary">Type</span>
            <span className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md bg-vellum text-sm text-ink w-fit">
              <TypeIcon size={14} aria-hidden className="text-ink-tertiary" />
              {TYPE_LABELS[form.type]}
            </span>
          </div>
        )}

        <ModalField label="Label" htmlFor={ids.label}>
          <input
            id={ids.label}
            type="text"
            value={form.label}
            disabled={common === "date"}
            placeholder={TYPE_LABELS[form.type]}
            aria-invalid={(attempted && !!labelIssue) || undefined}
            aria-describedby={ids.labelMsg}
            onChange={(e) => set({ label: e.target.value })}
            autoFocus={common !== "date"}
            className={`${MODAL_INPUT} disabled:opacity-60`}
          />
          <FieldMessage
            id={ids.labelMsg}
            issue={attempted && labelIssue ? { severity: "error", message: labelIssue } : null}
            reserve
          />
          {renamed && (
            <p className="text-xs text-ink-tertiary">Internal name stays “{property!.name}”, so entity values are kept.</p>
          )}
        </ModalField>

        {fields.style && (
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs font-medium text-ink-secondary mb-1">Style</legend>
            <div role="radiogroup" aria-label="Style" className="flex items-center gap-4">
              {(["cover", "contain"] as const).map((v) => (
                <div key={v} className="flex items-center gap-1.5">
                  <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                    <input
                      type="radio"
                      name={`${ids.type}-style`}
                      value={v}
                      checked={(form.style ?? "cover") === v}
                      onChange={() => set({ style: v })}
                      className="accent-ink"
                    />
                    {v === "cover" ? "Fill" : "Fit"}
                  </label>
                  <HelpTip label={v === "cover" ? "Fill" : "Fit"} text={HELP.style[v]} />
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {fields.thesaurus && (
          <ModalField label="Thesaurus" htmlFor={ids.thesaurus}>
            <Select
              id={ids.thesaurus}
              value={form.content ?? ""}
              options={[
                { value: "", label: "Select...", disabled: true },
                ...byLabel(thesauri, (t) => t.name).map((t) => ({ value: t.id, label: t.name })),
              ]}
              onChange={(v) => set({ content: v })}
              ariaLabel="Thesaurus"
              sheetTitle="Thesaurus"
            />
            <FieldMessage issue={attempted && thesaurusIssue ? { severity: "error", message: thesaurusIssue } : null} reserve />
          </ModalField>
        )}

        {fields.relationship && (
          <>
            <ModalField label="Relationship type" htmlFor={ids.relationType}>
              <Select
                id={ids.relationType}
                value={form.relationType ?? ""}
                options={[
                  { value: "", label: "Select...", disabled: true },
                  ...byLabel(relationTypes, (r) => r.label).map((r) => ({ value: r.id, label: r.label })),
                ]}
                onChange={(v) => set({ relationType: v })}
                ariaLabel="Relationship type"
                sheetTitle="Relationship type"
              />
              <FieldMessage issue={attempted && relationIssue ? { severity: "error", message: relationIssue } : null} reserve />
            </ModalField>
            <ModalField label="Entities" htmlFor={ids.entities}>
              <Select
                id={ids.entities}
                value={form.content ?? ""}
                options={[
                  { value: "", label: "Any entity" },
                  ...byLabel(
                    saved.filter((t) => t.id !== draft.id),
                    (t) => t.name,
                  ).map((t) => ({ value: t.id, label: t.name })),
                ]}
                // The inherited property belongs to the old target: a change
                // of Entities by the user clears it. Opening never does.
                onChange={(v) => setForm((f) => ({ ...f, content: v, inherit: undefined }))}
                ariaLabel="Entities"
                sheetTitle="Entities"
              />
            </ModalField>
            {target && (
              <ModalField label="Inherit property" htmlFor={ids.inherit}>
                <Select
                  id={ids.inherit}
                  value={form.inherit?.property ?? ""}
                  options={[{ value: "", label: "Select..." }, ...targetProps.map((p) => ({ value: p.id, label: p.label }))]}
                  onChange={(v) => {
                    const p = targetProps.find((x) => x.id === v);
                    set({ inherit: p ? { property: p.id, type: p.type } : undefined });
                  }}
                  ariaLabel="Inherit property"
                  sheetTitle="Inherit property"
                />
              </ModalField>
            )}
          </>
        )}

        <div data-part="flags" className="flex flex-col gap-2 pt-1">
          {fields.fullWidth && (
            <Flag label="Full width" help={HELP.fullWidth} checked={!!form.fullWidth} onChange={(v) => set({ fullWidth: v || undefined })} />
          )}
          {fields.hideLabel && (
            <Flag label="Hide label" help={HELP.noLabel} checked={!!form.noLabel} onChange={(v) => set({ noLabel: v || undefined })} />
          )}
          {fields.required && (
            <Flag label="Required property" help={HELP.required} checked={!!form.required} onChange={(v) => set({ required: v || undefined })} />
          )}
          {fields.showInCard && (
            <Flag label="Show in cards" help={HELP.showInCard} checked={!!form.showInCard} onChange={(v) => set({ showInCard: v || undefined })} />
          )}
          {fields.filter && (
            <Flag label="Use as filter" help={HELP.filter} checked={!!form.filter} onChange={(v) => setForm((f) => withFilter(f, v))} visibleHelp />
          )}
          {fields.defaultfilter && (
            <Flag label="Default filter" help={HELP.defaultfilter} checked={!!form.defaultfilter} onChange={(v) => set({ defaultfilter: v || undefined })} />
          )}
          {fields.prioritySorting && (
            <Flag
              label="Priority sorting"
              help={HELP.prioritySorting}
              checked={!!form.prioritySorting}
              onChange={(v) => set({ prioritySorting: v || undefined })}
              visibleHelp
            />
          )}
          {fields.generatedId && (
            <Flag label="Generated ID" help={HELP.generatedId} checked={!!form.generatedId} onChange={(v) => set({ generatedId: v || undefined })} />
          )}
        </div>

        {fields.sameLabel && (
          <SameLabelTable
            rows={rows}
            type={form.type}
            thesaurusName={thesaurusName}
            relationName={relationName}
            templateName={templateName}
            inheritLabel={(p) => (p.inherit ? TYPE_LABELS[p.inherit.type] : "No type")}
          />
        )}
        {conflict && (
          <p role="alert" className="text-xs font-medium text-seal-label">
            {conflict}
          </p>
        )}
        {/* Enter in a field submits, as in Uwazi. */}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** Uwazi's matching-properties table: this property, then every property with
 *  the same label; a cell that differs is red. */
function SameLabelTable({
  rows,
  type,
  thesaurusName,
  relationName,
  templateName,
  inheritLabel,
}: {
  rows: ReturnType<typeof sameLabelRows>;
  type: PropertyType;
  thesaurusName: (id?: string) => string;
  relationName: (id?: string) => string;
  templateName: (id?: string) => string;
  inheritLabel: (p: PropertyDef) => string;
}) {
  const select = type === "select" || type === "multiselect";
  const rel = type === "relationship";
  const own = rows[0].property;
  const cell = (diff: MatchField[], f: MatchField, content: ReactNode) => (
    <td className={`px-2 py-1.5 ${diff.includes(f) ? "text-seal-label font-medium" : "text-ink-secondary"}`}>{content}</td>
  );
  return (
    <section data-part="same-label" className="flex flex-col gap-2 pt-2">
      <h4 className="text-xs font-semibold text-ink">Properties from other templates in the collection using the same label.</h4>
      <div className="overflow-x-auto rounded-md border border-border-soft">
        <table className="w-full text-xs">
          <thead className="bg-warm text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
            <tr>
              <th scope="col" className="px-2 py-1.5 text-start">Template</th>
              <th scope="col" className="px-2 py-1.5 text-start">Type</th>
              {select && <th scope="col" className="px-2 py-1.5 text-start">Thesauri</th>}
              {rel && (
                <>
                  <th scope="col" className="px-2 py-1.5 text-start">Relation type</th>
                  <th scope="col" className="px-2 py-1.5 text-start">Entities</th>
                  <th scope="col" className="px-2 py-1.5 text-start">Inherit type</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const diff = i === 0 ? [] : mismatches(own, r.property);
              const Icon = TYPE_ICONS[r.property.type];
              return (
                <tr key={`${r.templateId}:${r.property.id}`} className="border-t border-border-soft">
                  <td className="px-2 py-1.5 text-ink max-w-[12rem] truncate">
                    {r.templateName || "New template"}
                    {r.own && <span className="text-ink-tertiary"> (this template)</span>}
                  </td>
                  {cell(
                    diff,
                    "type",
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={12} aria-hidden />
                      {TYPE_LABELS[r.property.type]}
                    </span>,
                  )}
                  {select && cell(diff, "thesaurus", thesaurusName(r.property.content))}
                  {rel && (
                    <>
                      {cell(diff, "relationType", relationName(r.property.relationType))}
                      {cell(diff, "entities", templateName(r.property.content))}
                      {cell(diff, "inherit", inheritLabel(r.property))}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
