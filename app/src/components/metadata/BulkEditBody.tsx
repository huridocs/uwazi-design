import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { languageAtom, languageName, type Language } from "../../atoms/language";
import { applyBulkEditAtom } from "../../atoms/entityOverlay";
import { notificationsAtom } from "../../atoms/notifications";
import {
  addThesaurusValueAtom,
  bindingKey,
  fieldKeys,
  foldLabel,
  localizeValues,
  pseudoKey,
  selectableLabels,
  thesauriAtom,
  thesaurusBindingsAtom,
} from "../../atoms/thesauri";
import { entityCorpusOf, getEntity, type Entity } from "../../data/entities";
import { isOverlayDeleted } from "../../data/entityOverlay";
import type { ThesaurusValue } from "../../data/settings";
import { useRegisterDirtyForm } from "../../hooks/useDirtyGuard";
import {
  commonFields,
  planBulkEdit,
  scalarOf,
  summarizeInto,
  type BulkCtx,
  type FieldSummary,
  type BulkEdits,
  type BulkField,
  type BulkPlan,
} from "../../utils/bulkEdit";
import { fromDateInputValue, toDateInputValue } from "../../utils/dateValue";
import { BULK_TASK_THRESHOLD, runBulkApply } from "../../utils/libraryTasks";
import { FacetSection } from "../shared/FacetSection";
import { BAR_GHOST } from "../shared/warmButton";
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
  // `getEntity` still resolves a deleted id (by design, for undo and stale
  // links); a deleted entity is no longer one this form edits.
  const entities = useMemo(
    () => ids.filter((id) => !isOverlayDeleted(id)).map((id) => getEntity(id)).filter((e): e is Entity => !!e),
    [ids],
  );
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
  const thesaurusOf = useCallback(
    (f: BulkField): ThesaurusValue[] | null => {
      const id = bindings[bindingKey(entities[0]?.typeId ?? "", f.id)] ?? f.thesaurus;
      return thesauri.find((t) => t.id === id)?.values ?? null;
    },
    [bindings, entities, thesauri],
  );
  const ctx = useMemo<BulkCtx>(() => ({ corpus, thesaurusOf }), [corpus, thesaurusOf]);
  // What the entities hold, per field — once per (set, fields, language), not
  // per render, and chunked for a large set (see useBulkSummaries).
  const summaries = useBulkSummaries(ids, fields, language, ctx);
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

  // Past the threshold Apply runs as a Beacon task, so the review builds only
  // its counts; the records are built chunk by chunk by the task.
  const asTask = n > BULK_TASK_THRESHOLD;
  const openReview = () => {
    if (!dirty || !summaries) return;
    setReview(planBulkEdit({ entities, fields, edits, language, corpus, thesaurusOf, withRecords: !asTask }));
  };

  const apply = () => {
    if (!review) return;
    if (asTask) {
      runBulkApply(store, {
        corpus,
        entities,
        verb: "Editing",
        plan: (chunk) => planBulkEdit({ entities: chunk, fields, edits, language, corpus, thesaurusOf }),
      });
      onApplied();
      return;
    }
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
          {/* The set Apply writes to — the one frozen when the form opened. */}
          <p data-part="applies-to" className="text-meta text-ink-tertiary">
            Applies to {entities.slice(0, 3).map((e) => e.title).join(", ")}
            {n > 3 ? ` and ${(n - 3).toLocaleString()} more` : ""}.
            {asTask ? " Runs in the background; you can cancel it from the notifications." : ""}
          </p>
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
          {/* Scalars are localised on the record, so they go in the edited
              language only; the reader has to know the others stay. */}
          {fields.some((f) => edits[f.id] && f.kind === "scalar" && f.type !== "link") && (
            <p data-part="language-note" className="text-meta text-ink-tertiary">
              {`Text and dates are written in ${languageName(language)} only; the other languages keep their values.`}
            </p>
          )}
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
            data-gutter-align="box"
            className={`me-auto px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
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
        {!summaries && fields.length > 0 && (
          <p role="status" className="text-xs text-ink-tertiary py-6 text-center tabular-nums">
            Reading the values of {n.toLocaleString()} entities…
          </p>
        )}
        {fields.length === 0 && (
          <p className="text-xs text-ink-tertiary py-6 text-center">These templates share no editable properties.</p>
        )}
        {summaries && fields.map((f) => {
          const e = edits[f.id];
          const inputId = `bulk-${f.id}`;
          if (f.kind === "multi" || f.kind === "connection") {
            return (
              <MultiField
                key={f.id}
                field={f}
                n={n}
                cov={summaries[f.id]?.counts ?? {}}
                edit={e?.kind === "multi" ? e : undefined}
                values={f.kind === "multi" ? shownValues(f) : undefined}
                fresh={fresh}
                onToggle={toggleMulti}
                onRevert={() => setEdit(f.id, null)}
                onAddValue={f.kind === "multi" && thesaurusOf(f) ? () => setAdding(f) : undefined}
              />
            );
          }
          const sum = scalarOf(summaries[f.id] ?? { distinct: new Set(), counts: {} });
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
          className={`px-4 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
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
            // A label the reader's language already shows IS that value — by
            // the same fold the modal names the match with.
            const match = selectableLabels(shownValues(adding) ?? []).find((l) => foldLabel(l) === foldLabel(label));
            let pick = match
              ? fieldKeys({ type: "select", value: match }, thesaurusOf(adding), corpus, language)[0]
              : undefined;
            if (!pick) {
              const tid = bindings[bindingKey(entities[0]?.typeId ?? "", adding.id)] ?? adding.thesaurus;
              const saved = tid ? addValue({ corpus, thesaurusId: tid, label }) : { id: null, label };
              // The id it returns, not its label: a label is one language's.
              pick = saved.id ?? pseudoKey(saved.label);
              const existed = (thesaurusOf(adding) ?? []).some(
                (v) => v.id === saved.id || v.values?.some((c) => c.id === saved.id),
              );
              if (!existed) setFresh((p) => new Set([...p, pick!]));
            }
            // A new value is on nobody yet: ticking it adds it to all.
            const e = edits[adding.id];
            const add = new Set(e?.kind === "multi" ? e.add : []);
            const remove = new Set(e?.kind === "multi" ? e.remove : []);
            remove.delete(pick);
            if ((summaries?.[adding.id]?.counts[pick] ?? 0) < n) add.add(pick);
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
  n,
  cov,
  edit,
  values,
  fresh,
  onToggle,
  onRevert,
  onAddValue,
}: {
  field: BulkField;
  n: number;
  /** How many entities hold each value (key or connected id). */
  cov: Record<string, number>;
  edit?: { add: string[]; remove: string[] };
  values?: ThesaurusValue[] | null;
  fresh: ReadonlySet<string>;
  onToggle: (f: BulkField, value: string, cov: Record<string, number>) => void;
  onRevert: () => void;
  onAddValue?: () => void;
}) {
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

/** The per-field summaries of what `ids` hold. Up to the task threshold they
 *  are computed at once; past it, in chunks between frames — reading a whole
 *  CEJIL selection builds every profile, and doing that in one render froze
 *  the page. `null` until complete. */
function useBulkSummaries(ids: string[], fields: BulkField[], language: Language, ctx: BulkCtx) {
  const small = ids.length <= BULK_TASK_THRESHOLD;
  const now = useMemo(
    () => (small ? summarizeInto({}, ids, fields, language, ctx) : null),
    [small, ids, fields, language, ctx],
  );
  const [chunked, setChunked] = useState<Record<string, FieldSummary> | null>(null);
  useEffect(() => {
    if (small) return;
    setChunked(null);
    const acc: Record<string, FieldSummary> = {};
    let at = 0;
    let timer = 0;
    const step = () => {
      summarizeInto(acc, ids.slice(at, at + 200), fields, language, ctx);
      at += 200;
      if (at >= ids.length) setChunked({ ...acc });
      else timer = window.setTimeout(step, 0);
    };
    timer = window.setTimeout(step, 0);
    return () => window.clearTimeout(timer);
  }, [small, ids, fields, language, ctx]);
  return small ? now : chunked;
}
