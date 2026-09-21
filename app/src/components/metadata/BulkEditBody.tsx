import { useMemo, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { languageAtom, type Language } from "../../atoms/language";
import { applyBulkEditAtom } from "../../atoms/entityOverlay";
import { notificationsAtom } from "../../atoms/notifications";
import {
  addThesaurusValueAtom,
  bindingKey,
  localizeValues,
  selectableLabels,
  thesauriAtom,
  thesaurusBindingsAtom,
} from "../../atoms/thesauri";
import { entityCorpusOf, getEntity, type Entity } from "../../data/entities";
import type { ThesaurusValue } from "../../data/settings";
import { useRegisterDirtyForm } from "../../hooks/useDirtyGuard";
import {
  commonFields,
  coverageOf,
  planBulkEdit,
  scalarSummary,
  type BulkEdits,
  type BulkField,
  type BulkPlan,
} from "../../utils/bulkEdit";
import { fromDateInputValue, toDateInputValue } from "../../utils/dateValue";
import { FacetSection } from "../shared/FacetSection";
import { WARM_BUTTON } from "../shared/warmButton";
import { BulkFieldRow } from "./BulkFieldRow";
import { AddThesaurusValueModal, ThesaurusPicker } from "./ThesaurusPicker";

/** The metadata edit form in BULK mode — `MetadataEditBody` with a
 *  `{ kind: "bulk" }` subject renders this. One form over many entities:
 *
 *   - only the properties every selected template shares (`commonFields`),
 *     no Title (it is per entity), no files, recordings or places;
 *   - each field is shared, mixed or will-change (`BulkFieldRow`), and only a
 *     field the user changed is written, with the same value for all;
 *   - a multi-value property (multiselect, connections) is a list of
 *     tri-state rows with coverage: tick = add to all, untick = remove from
 *     all, mixed = untouched;
 *   - Save opens a review step in place with what will change and on how many
 *     entities; Apply writes through the overlay with an exact-inverse Undo.
 *
 *  Click-to-fill and Copy From are off here: both write a value from ONE
 *  source into ONE form, and a bulk form has no one entity to read against. */
export function BulkEditBody({
  ids,
  onCancel,
  onApplied,
}: {
  ids: string[];
  onCancel: () => void;
  /** After Apply: the form closes, the selection stays. */
  onApplied: () => void;
}) {
  const store = useStore();
  const language = useAtomValue(languageAtom);
  const entities = useMemo(() => ids.map((id) => getEntity(id)).filter((e): e is Entity => !!e), [ids]);
  const corpus = entities[0] ? entityCorpusOf(entities[0].id) : "mock";
  const fields = useMemo(() => commonFields(entities, corpus, language), [entities, corpus, language]);
  const thesauri = useAtomValue(thesauriAtom(corpus));
  const bindings = useAtomValue(thesaurusBindingsAtom(corpus));
  const addValue = useSetAtom(addThesaurusValueAtom);
  const applyBulk = useSetAtom(applyBulkEditAtom);

  const [edits, setEdits] = useState<BulkEdits>({});
  const [review, setReview] = useState<BulkPlan | null>(null);
  const [adding, setAdding] = useState<BulkField | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const dirty = Object.keys(edits).length > 0;
  useRegisterDirtyForm("bulk-edit", "Bulk edits", dirty);

  const n = entities.length;
  // A property is bound per template; a common select shares its thesaurus
  // by construction, so the first entity's template answers for all.
  const thesaurusOf = (f: BulkField): ThesaurusValue[] | null => {
    const id = bindings[bindingKey(entities[0]?.typeId ?? "", f.id)] ?? f.thesaurus;
    return thesauri.find((t) => t.id === id)?.values ?? null;
  };
  const shownValues = (f: BulkField) => {
    const v = thesaurusOf(f);
    return v ? localizeValues(v, corpus, language) : null;
  };

  const setEdit = (id: string, next: BulkEdits[string] | null) =>
    setEdits((prev) => {
      const out = { ...prev };
      if (next) out[id] = next;
      else delete out[id];
      return out;
    });

  /* Multi rows: original coverage → none / some / all; a click moves a row
     between add-to-all, remove-from-all and untouched, never landing on a
     state that writes nothing new (see the spec's tri-state rule). */
  const toggleMulti = (f: BulkField, value: string, cov: Record<string, number>) => {
    const e = edits[f.id];
    const add = new Set(e?.kind === "multi" ? e.add : []);
    const remove = new Set(e?.kind === "multi" ? e.remove : []);
    const had = cov[value] ?? 0;
    const orig = had === 0 ? "none" : had === n ? "all" : "some";
    const eff = add.has(value) ? "all" : remove.has(value) ? "none" : orig;
    add.delete(value);
    remove.delete(value);
    if (eff === "all") {
      if (orig !== "none") remove.add(value);
    } else if (eff === "none") {
      if (orig === "none") add.add(value);
    } else add.add(value);
    setEdit(f.id, add.size || remove.size ? { kind: "multi", add: [...add], remove: [...remove] } : null);
  };

  const openReview = () => {
    if (!dirty) return;
    setReview(planBulkEdit({ entities, fields, edits, language, corpus, thesaurusOf }));
  };

  const apply = () => {
    if (!review) return;
    const ref = applyBulk({ corpus, records: review.records, patches: review.patches });
    const touched = review.touched;
    store.set(notificationsAtom, (prev) => [
      {
        id: `n-${ref}`,
        kind: "success",
        title: `${touched.toLocaleString()} ${touched === 1 ? "entity" : "entities"} updated.`,
        detail: "Undo restores their previous values until your next bulk change or delete.",
        time: Date.now(),
        read: false,
        action: { label: "Undo", kind: "undo", ref },
      },
      ...prev,
    ]);
    onApplied();
  };

  if (review) {
    const props = new Set(review.lines.map((l) => l.fieldId)).size;
    const danger = review.removes > 0;
    return (
      <>
        <div data-part="review" className="bleed flex-1 overflow-auto body-top pb-8 space-y-3">
          <h3 className="text-sm font-semibold text-ink" aria-live="polite">
            Change {props} {props === 1 ? "property" : "properties"} on {review.touched.toLocaleString()}{" "}
            {review.touched === 1 ? "entity" : "entities"}?
          </h3>
          <table className="w-full text-xs">
            <tbody>
              {review.lines.map((l, i) => (
                <tr key={i} className="border-b border-border-soft align-top">
                  <td className="py-1.5 pe-3 font-medium text-ink-secondary whitespace-nowrap">{l.label}</td>
                  <td className={`py-1.5 pe-3 ${l.removes ? "text-seal-label" : "text-ink"}`}>{l.change}</td>
                  <td className="py-1.5 text-ink-tertiary tabular-nums whitespace-nowrap text-end">
                    {l.entities.toLocaleString()} {l.entities === 1 ? "entity" : "entities"}
                    {l.note ? ` (${l.note})` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {danger && (
            <p className="text-meta text-seal-label">
              Removes {review.removes.toLocaleString()} {review.removes === 1 ? "value" : "values"}.
            </p>
          )}
          {review.touched === 0 && (
            <p className="text-meta text-ink-tertiary">Every entity already holds these values; nothing will be written.</p>
          )}
        </div>
        <div
          className="bleed flex items-center justify-end gap-2 h-12 bg-paper shrink-0"
          style={{ borderTop: "1px solid var(--border-primary)" }}
        >
          <button
            type="button"
            onClick={() => setReview(null)}
            className={`me-auto px-3 py-1.5 text-xs font-medium ${WARM_BUTTON} rounded-md transition-colors cursor-pointer`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={apply}
            aria-disabled={review.touched === 0 || undefined}
            disabled={review.touched === 0}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              review.touched === 0
                ? "bg-ink/40 text-paper cursor-not-allowed"
                : danger
                  ? "bg-seal text-white hover:bg-seal/90 cursor-pointer"
                  : "bg-ink text-paper hover:bg-ink/90 cursor-pointer"
            }`}
          >
            Apply to {review.touched.toLocaleString()} {review.touched === 1 ? "entity" : "entities"}
          </button>
        </div>
      </>
    );
  }

  const inputClass =
    "w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border transition-shadow placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40";

  return (
    <>
      <div data-part="fields" className="bleed flex-1 overflow-auto body-top pb-8 space-y-3">
        {fields.length === 0 && (
          <p className="text-xs text-ink-tertiary py-6 text-center">These templates share no editable properties.</p>
        )}
        {fields.map((f) => {
          const e = edits[f.id];
          const inputId = `bulk-${f.id}`;
          if (f.kind === "multi" || f.kind === "connection") {
            return (
              <MultiField
                key={f.id}
                field={f}
                ids={ids}
                n={n}
                language={language}
                edit={e?.kind === "multi" ? e : undefined}
                values={f.kind === "multi" ? shownValues(f) : undefined}
                fresh={fresh}
                onToggle={toggleMulti}
                onRevert={() => setEdit(f.id, null)}
                onAddValue={f.kind === "multi" && thesaurusOf(f) ? () => setAdding(f) : undefined}
              />
            );
          }
          const sum = scalarSummary(ids, f, language);
          const touched = e?.kind === "scalar";
          const value = touched ? e.value : sum.shared ? sum.value : "";
          const state = touched ? "changed" : sum.shared ? "shared" : "mixed";
          const set = (v: string) =>
            setEdit(f.id, !sum.shared || v !== sum.value ? { kind: "scalar", value: v } : null);
          return (
            <BulkFieldRow
              key={f.id}
              label={f.label}
              htmlFor={f.kind === "select" ? undefined : inputId}
              state={state}
              distinct={sum.distinct}
              onRevert={() => setEdit(f.id, null)}
            >
              {f.kind === "select" ? (
                <ThesaurusPicker
                  label={f.label}
                  values={shownValues(f)}
                  multiple={false}
                  chosen={value ? [value] : []}
                  onToggle={set}
                  fresh={fresh}
                />
              ) : f.type === "date" ? (
                <input
                  id={inputId}
                  type="date"
                  value={toDateInputValue(value)}
                  onChange={(ev) => set(fromDateInputValue(ev.target.value, value))}
                  className={inputClass}
                />
              ) : f.type === "multiline" ? (
                <textarea
                  id={inputId}
                  value={value}
                  placeholder={state === "mixed" ? "Mixed" : undefined}
                  onChange={(ev) => set(ev.target.value)}
                  rows={3}
                  className={`${inputClass} resize-y`}
                />
              ) : (
                <input
                  id={inputId}
                  type="text"
                  value={value}
                  placeholder={state === "mixed" ? "Mixed" : undefined}
                  onChange={(ev) => set(ev.target.value)}
                  className={inputClass}
                />
              )}
            </BulkFieldRow>
          );
        })}
      </div>

      <div
        className="bleed flex items-center justify-end gap-2 h-12 bg-paper shrink-0"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-1.5 text-xs font-medium ${WARM_BUTTON} rounded-md transition-colors cursor-pointer`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={openReview}
          aria-disabled={!dirty || undefined}
          title={dirty ? undefined : "Change a field first"}
          className={`px-4 py-1.5 text-xs font-medium rounded-md text-white bg-success transition-colors ${
            dirty ? "hover:bg-success/90 cursor-pointer" : "opacity-50 cursor-not-allowed"
          }`}
        >
          Save
        </button>
      </div>

      {adding && (
        <AddThesaurusValueModal
          thesaurusName={thesauri.find((t) => t.id === (bindings[bindingKey(entities[0]?.typeId ?? "", adding.id)] ?? adding.thesaurus))?.name ?? adding.label}
          existing={selectableLabels(shownValues(adding) ?? [])}
          onClose={() => setAdding(null)}
          onSave={(label) => {
            const shown = selectableLabels(shownValues(adding) ?? []);
            const match = shown.find((l) => l.toLowerCase() === label.toLowerCase());
            let pick = match;
            if (!pick) {
              const tid = bindings[bindingKey(entities[0]?.typeId ?? "", adding.id)] ?? adding.thesaurus;
              const saved = tid ? addValue({ corpus, thesaurusId: tid, label }) : { id: null, label };
              pick = saved.label;
              setFresh((p) => new Set([...p, saved.label]));
            }
            // A new value is on nobody yet: ticking it adds it to all.
            const e = edits[adding.id];
            const add = new Set(e?.kind === "multi" ? e.add : []);
            const remove = new Set(e?.kind === "multi" ? e.remove : []);
            remove.delete(pick);
            if ((coverageOf(ids, adding, language)[pick] ?? 0) < n) add.add(pick);
            setEdit(adding.id, add.size || remove.size ? { kind: "multi", add: [...add], remove: [...remove] } : null);
            setAdding(null);
          }}
        />
      )}
    </>
  );
}

/** A multiselect or a connection: the union of what the entities hold, one
 *  tri-state row per value, with coverage beside it — the count PROJECTED
 *  through the pending edit, so a ticked row reads "12 of 12". */
function MultiField({
  field,
  ids,
  n,
  language,
  edit,
  values,
  fresh,
  onToggle,
  onRevert,
  onAddValue,
}: {
  field: BulkField;
  ids: string[];
  n: number;
  language: Language;
  edit?: { add: string[]; remove: string[] };
  values?: ThesaurusValue[] | null;
  fresh: ReadonlySet<string>;
  onToggle: (f: BulkField, value: string, cov: Record<string, number>) => void;
  onRevert: () => void;
  onAddValue?: () => void;
}) {
  const cov = useMemo(() => coverageOf(ids, field, language), [ids, field, language]);
  const add = new Set(edit?.add ?? []);
  const remove = new Set(edit?.remove ?? []);
  const projected = (v: string) => (add.has(v) ? n : remove.has(v) ? 0 : cov[v] ?? 0);
  const held = [...new Set([...Object.keys(cov), ...add])];
  const chosen = held.filter((v) => projected(v) === n);
  const mixed = held.filter((v) => projected(v) > 0 && projected(v) < n);
  const counts = Object.fromEntries(held.map((v) => [v, projected(v)]));
  const title = (id: string) => getEntity(id)?.title ?? id;

  return (
    <BulkFieldRow
      label={field.label}
      state={edit ? "changed" : mixed.length ? "mixed" : "shared"}
      onRevert={onRevert}
      action={
        onAddValue && (
          <button
            type="button"
            onClick={onAddValue}
            className="text-meta font-medium text-ink-tertiary hover:text-ink-secondary transition-colors cursor-pointer"
          >
            Add value
          </button>
        )
      }
    >
      <div>
        {field.kind === "multi" ? (
          <ThesaurusPicker
            label={field.label}
            values={values ?? null}
            multiple
            chosen={chosen}
            mixed={mixed}
            coverage={{ counts, of: n }}
            onToggle={(v) => onToggle(field, v, cov)}
            fresh={fresh}
          />
        ) : (
          <div data-component="ThesaurusPicker" className="rounded-md border border-border bg-paper px-1 py-1">
            <FacetSection
              bare
              title={field.label}
              total={held.length}
              entries={held.map((v) => [v, counts[v]] as [string, number])}
              selected={Object.fromEntries(chosen.map((v) => [v, true]))}
              mixed={Object.fromEntries(mixed.map((v) => [v, true]))}
              onToggle={(v) => onToggle(field, v, cov)}
              label={title}
              searchable
              searchPlaceholder="Search connected entities"
              renderCount={(v) => `${counts[v] ?? 0} of ${n}`}
              ariaLabelOf={(v) => `${title(v)}, on ${counts[v] ?? 0} of ${n}`}
              emptyState={<p className="px-2 py-2 text-xs text-ink-tertiary">No connections yet.</p>}
            />
          </div>
        )}
      </div>
    </BulkFieldRow>
  );
}
