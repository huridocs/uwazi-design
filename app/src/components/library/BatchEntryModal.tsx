import { useId, useMemo, useState, type ClipboardEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Plus, X } from "lucide-react";
import type { Corpus } from "../../data/entityOverlay";
import type { EntityType } from "../../data/entities";
import type { MetadataField } from "../../data/metadata";
import type { ThesaurusValue } from "../../data/settings";
import { LANGUAGES, type Language } from "../../atoms/language";
import { createBatchAtom } from "../../atoms/entityOverlay";
import { bindingKey, labelsForKeys, localizeValues, thesauriAtom, thesaurusBindingsAtom } from "../../atoms/thesauri";
import { notificationsAtom } from "../../atoms/notifications";
import { templateFields } from "../../utils/createEntity";
import { parseDateValue } from "../../utils/dateValue";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../shared/Modal";
import { MODAL_LABEL } from "../shared/ModalParts";
import { BAR_GHOST } from "../shared/warmButton";

/** The property types a grid cell can hold honestly. A country picker, files,
 *  media and list-valued dates don't fit in a cell; they are named under the
 *  grid, to be added from each entity's form afterwards. */
const GRID_TYPES = new Set<MetadataField["type"]>(["text", "multiline", "date", "link", "select", "multiselect"]);
const START_ROWS = 5;
const MAX_ROWS = 200;

type Cells = Record<string, string>;
const emptyRow = (): Cells => ({});
const pad = (n: number) => String(n).padStart(2, "0");

/** Batch entry: many entities of one template, as rows of a grid.
 *
 *  One row per new entity, one column per property the grid can hold (title
 *  first). Paste from a spreadsheet: a tab/newline block pasted into a cell
 *  fills the grid from that cell, adding rows as it needs. "Same for all rows"
 *  on a column fills every row from the first. Cells are checked as they are
 *  read: a date must parse, a thesaurus value must be one the thesaurus holds;
 *  a row with any value needs a title. Only complete rows are created, and the
 *  count on the commit says how many. */
export function BatchEntryModal({
  corpus,
  types,
  initialTypeId,
  language,
  onClose,
}: {
  corpus: Corpus;
  types: EntityType[];
  initialTypeId: string;
  language: Language;
  onClose: () => void;
}) {
  const uid = useId();
  const createBatch = useSetAtom(createBatchAtom);
  const setNotifications = useSetAtom(notificationsAtom);
  const thesauri = useAtomValue(thesauriAtom(corpus));
  const bindings = useAtomValue(thesaurusBindingsAtom(corpus));
  const [typeId, setTypeId] = useState(initialTypeId);
  const [rows, setRows] = useState<Cells[]>(() => Array.from({ length: START_ROWS }, emptyRow));
  const [same, setSame] = useState<Set<string>>(new Set());

  const blank = useMemo(() => templateFields(typeId, corpus), [typeId, corpus]);
  const fields = blank[language] ?? [];
  const columns = fields.filter((f) => GRID_TYPES.has(f.type) && !f.list && f.id !== "description");
  const left = fields.filter((f) => !columns.includes(f) && f.id !== "description");

  /** A select column's values, in the reader's language. */
  const valuesOf = (f: MetadataField): ThesaurusValue[] | null => {
    const id = bindings[bindingKey(typeId, f.id)] ?? f.thesaurus;
    const t = thesauri.find((x) => x.id === id);
    return t ? localizeValues(t.values, corpus, language) : null;
  };
  const flat = (vals: ThesaurusValue[]) => vals.flatMap((v) => (v.values ? v.values : [v]));
  const keyFor = (f: MetadataField, label: string) => {
    const vals = valuesOf(f);
    if (!vals) return null;
    const hit = flat(vals).find((v) => v.label.toLowerCase() === label.trim().toLowerCase());
    return hit?.id ?? null;
  };

  const cell = (r: number, id: string) => (same.has(id) ? rows[0]?.[id] : rows[r]?.[id]) ?? "";
  /** What is wrong with a cell, if anything. */
  const problem = (r: number, f: MetadataField | "title"): string | null => {
    const filled = rowFilled(r);
    if (f === "title") return filled && !cell(r, "title").trim() ? "Needs a title" : null;
    const v = cell(r, f.id).trim();
    if (!v) return null;
    if (f.type === "date") return parseDateValue(v) ? null : "Not a date (dd/mm/yyyy)";
    if (f.type === "select") return keyFor(f, v) ? null : `Not a value of ${f.label}`;
    if (f.type === "multiselect") {
      const bad = v.split(";").map((x) => x.trim()).filter((x) => x && !keyFor(f, x));
      return bad.length ? `Not values of ${f.label}: ${bad.join(", ")}` : null;
    }
    return null;
  };
  const rowFilled = (r: number) =>
    !!rows[r]?.title?.trim() || columns.some((f) => !same.has(f.id) && !!rows[r]?.[f.id]?.trim());
  const rowOk = (r: number) =>
    rowFilled(r) && !problem(r, "title") && columns.every((f) => !problem(r, f));
  const ready = rows.map((_, r) => r).filter(rowOk);
  const issues = rows.reduce(
    (n, _, r) => n + (rowFilled(r) ? [problem(r, "title"), ...columns.map((f) => problem(r, f))].filter(Boolean).length : 0),
    0,
  );

  const setCell = (r: number, id: string, value: string) =>
    setRows((prev) => {
      const next = prev.slice();
      next[r] = { ...next[r], [id]: value };
      return next;
    });

  /** A block pasted from a spreadsheet: rows by newline, cells by tab, laid
   *  over the grid from the cell it was pasted into. */
  const onPaste = (r: number, c: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();
    const block = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));
    const ids = ["title", ...columns.map((f) => f.id)];
    setRows((prev) => {
      const next = prev.slice();
      block.forEach((cells, i) => {
        const at = r + i;
        if (at >= MAX_ROWS) return;
        while (next.length <= at) next.push(emptyRow());
        const row = { ...next[at] };
        cells.forEach((v, j) => {
          const id = ids[c + j];
          if (id) row[id] = v.trim();
        });
        next[at] = row;
      });
      return next;
    });
  };

  const create = () => {
    if (!ready.length) return;
    const out = ready.map((r) => {
      const byLang = Object.fromEntries(
        LANGUAGES.map((l) => [l, blank[l].map((f) => ({ ...f }))]),
      ) as Record<Language, MetadataField[]>;
      for (const f of columns) {
        const raw = cell(r, f.id).trim();
        if (!raw) continue;
        if (f.type === "select" || f.type === "multiselect") {
          const labels = f.type === "select" ? [raw] : raw.split(";").map((x) => x.trim()).filter(Boolean);
          const keys = labels.map((l) => keyFor(f, l)!).filter(Boolean);
          const vals = valuesOf(f);
          const { byLang: lab, ids } = labelsForKeys(keys, vals, corpus);
          for (const l of LANGUAGES) {
            const target = byLang[l].find((x) => x.id === f.id);
            if (!target) continue;
            target.value = lab[l].join(", ");
            if (f.type === "multiselect") target.values = lab[l];
            target.valueIds = ids.filter((x): x is string => !!x);
          }
        } else {
          let value = raw;
          if (f.type === "date") {
            const d = parseDateValue(raw)!;
            value = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
          }
          for (const l of LANGUAGES) {
            const target = byLang[l].find((x) => x.id === f.id);
            if (target) target.value = value;
          }
        }
      }
      return { title: cell(r, "title").trim(), fieldsByLang: byLang };
    });
    const n = createBatch({ corpus, typeId, rows: out, language });
    const name = types.find((t) => t.id === typeId)?.name ?? "entities";
    setNotifications((prev) => [
      {
        id: `n-batch-${Date.now()}`,
        kind: "success",
        title: `${n} ${n === 1 ? "entity" : "entities"} created as ${name}.`,
        detail: "They are in the library now; open one to add what the grid doesn't hold.",
        time: Date.now(),
        read: false,
      },
      ...prev,
    ]);
    onClose();
  };

  const cellClass = (bad: boolean, locked: boolean) =>
    `w-full min-w-0 h-8 px-2 text-xs text-ink bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-carbon/30 ${
      bad ? "bg-warning-light" : ""
    } ${locked ? "text-ink-tertiary" : ""}`;

  return (
    <Modal
      component="BatchEntryModal"
      size="xl"
      height="md:h-[min(40rem,100%)]"
      onClose={onClose}
      dismissOnScrim={false}
      title="Batch entry"
      subtitle="one row per new entity; paste from a spreadsheet"
      flush
      footer={
        <>
          <span role="status" className="me-auto text-meta text-ink-tertiary tabular-nums">
            {ready.length} {ready.length === 1 ? "row" : "rows"} ready
            {issues > 0 ? ` · ${issues} ${issues === 1 ? "cell needs" : "cells need"} a fix` : ""}
          </span>
          <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={create}
            aria-disabled={!ready.length || undefined}
            className={ready.length ? MODAL_COMMIT : MODAL_COMMIT_DISABLED}
          >
            {ready.length ? `Create ${ready.length} ${ready.length === 1 ? "entity" : "entities"}` : "Create entities"}
          </button>
        </>
      }
    >
      <div className="bleed shrink-0 flex items-center gap-2 py-2 border-b border-border">
        <label htmlFor={`${uid}-template`} className={MODAL_LABEL}>
          Template
        </label>
        <select
          id={`${uid}-template`}
          value={typeId}
          onChange={(e) => {
            // A new template is a new set of columns: the grid starts over.
            setTypeId(e.target.value);
            setRows(Array.from({ length: START_ROWS }, emptyRow));
            setSame(new Set());
          }}
          className="h-8 px-2 text-xs text-ink bg-warm rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {left.length > 0 && (
          <p className="min-w-0 truncate text-meta text-ink-tertiary" title={left.map((f) => f.label).join(", ")}>
            Not in the grid, add from each entity's form: {left.map((f) => f.label).join(", ")}
          </p>
        )}
      </div>
      <div className="bleed-flush flex-1 min-h-0 overflow-auto">
        <table className="w-max min-w-full border-collapse text-xs" aria-label="New entities">
          <thead className="sticky top-0 z-10 bg-warm">
            <tr>
              <th scope="col" className="w-8 border-b border-e border-border" aria-label="Row" />
              <th scope="col" className="min-w-[14rem] px-2 py-1.5 text-start font-medium text-ink-secondary border-b border-e border-border">
                Title*
              </th>
              {columns.map((f) => (
                <th
                  key={f.id}
                  scope="col"
                  className="min-w-[10rem] px-2 py-1.5 text-start font-medium text-ink-secondary border-b border-e border-border"
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate">{f.label}</span>
                    <label className="ms-auto inline-flex items-center gap-1 text-meta font-normal text-ink-tertiary whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={same.has(f.id)}
                        onChange={() =>
                          setSame((prev) => {
                            const n = new Set(prev);
                            if (n.has(f.id)) n.delete(f.id);
                            else n.add(f.id);
                            return n;
                          })
                        }
                        className="w-3 h-3 accent-ink"
                      />
                      Same for all
                    </label>
                  </span>
                </th>
              ))}
              <th scope="col" className="w-8 border-b border-border" aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {rows.map((_, r) => (
              <tr key={r} className="group">
                <th scope="row" className="px-1 text-center text-meta font-normal text-ink-muted tabular-nums border-b border-e border-border-soft">
                  {r + 1}
                </th>
                <td className="p-0 border-b border-e border-border-soft">
                  <input
                    aria-label={`Row ${r + 1} title`}
                    value={cell(r, "title")}
                    onChange={(e) => setCell(r, "title", e.target.value)}
                    onPaste={(e) => onPaste(r, 0, e)}
                    title={problem(r, "title") ?? undefined}
                    aria-invalid={!!problem(r, "title") || undefined}
                    className={cellClass(!!problem(r, "title"), false)}
                  />
                </td>
                {columns.map((f, c) => {
                  const locked = same.has(f.id) && r > 0;
                  const bad = problem(r, f);
                  const listId = f.type === "select" || f.type === "multiselect" ? `${uid}-${f.id}` : undefined;
                  return (
                    <td key={f.id} className="p-0 border-b border-e border-border-soft">
                      <input
                        aria-label={`Row ${r + 1} ${f.label}`}
                        value={cell(r, f.id)}
                        readOnly={locked}
                        list={listId}
                        placeholder={r === 0 ? (f.type === "date" ? "dd/mm/yyyy" : f.type === "multiselect" ? "a; b" : "") : ""}
                        onChange={(e) => setCell(r, f.id, e.target.value)}
                        onPaste={(e) => onPaste(r, c + 1, e)}
                        title={bad ?? (locked ? "Same for all rows: edit the first row" : undefined)}
                        aria-invalid={!!bad || undefined}
                        className={cellClass(!!bad, locked)}
                      />
                    </td>
                  );
                })}
                <td className="p-0 border-b border-border-soft text-center">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove row ${r + 1}`}
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== r))}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-warm cursor-pointer
                        opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                    >
                      <X size={12} aria-hidden />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {columns
          .filter((f) => f.type === "select" || f.type === "multiselect")
          .map((f) => (
            <datalist key={f.id} id={`${uid}-${f.id}`}>
              {flat(valuesOf(f) ?? []).map((v) => (
                <option key={v.id} value={v.label} />
              ))}
            </datalist>
          ))}
        <div className="bleed py-2">
          <button
            type="button"
            onClick={() => setRows((prev) => (prev.length < MAX_ROWS ? [...prev, emptyRow()] : prev))}
            data-gutter-align="box"
            className={`inline-flex items-center gap-1.5 ${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}
          >
            <Plus size={12} aria-hidden /> Add row
          </button>
        </div>
      </div>
    </Modal>
  );
}
