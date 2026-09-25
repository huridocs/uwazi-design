import { useId, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { ArrowLeft, CopyPlus, Plus, Undo2, X } from "lucide-react";
import type { Corpus } from "../../data/entityOverlay";
import type { EntityType } from "../../data/entities";
import type { MetadataField } from "../../data/metadata";
import type { ThesaurusValue } from "../../data/settings";
import { LANGUAGES, type Language } from "../../atoms/language";
import { createBatchAtom } from "../../atoms/entityOverlay";
import {
  addThesaurusValueAtom,
  bindingKey,
  labelsForKeys,
  localizeValues,
  thesauriAtom,
  thesaurusBindingsAtom,
} from "../../atoms/thesauri";
import { notificationsAtom } from "../../atoms/notifications";
import { librarySelectedEntityIdAtom, selectIdsAtom, clearSelectionAtom } from "../../atoms/library";
import { templateFields } from "../../utils/createEntity";
import { parseDateValue } from "../../utils/dateValue";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../shared/Modal";
import { MODAL_LABEL } from "../shared/ModalParts";
import { TemplateSelect } from "../shared/TemplateSelect";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { BAR_GHOST } from "../shared/warmButton";

/** The property types a grid cell can hold honestly. A country picker, files,
 *  media, connections and list-valued dates don't fit in a cell; they are
 *  named above the grid, to be added from each entity's form afterwards. */
const GRID_TYPES = new Set<MetadataField["type"]>(["text", "multiline", "date", "link", "select", "multiselect"]);
const START_ROWS = 10;
const MAX_ROWS = 300;
const HISTORY = 50;

/** Column widths by what the column holds: a date is short, a title long. */
const WIDTH: Partial<Record<MetadataField["type"] | "title", string>> = {
  title: "w-[20rem]",
  date: "w-[8.5rem]",
  link: "w-[12rem]",
  select: "w-[13rem]",
  multiselect: "w-[15rem]",
};

type Cells = Record<string, string>;
interface Row {
  key: string;
  cells: Cells;
}
let rowSeq = 0;
const newRow = (cells: Cells = {}): Row => ({ key: `r${++rowSeq}`, cells });
const blankRows = (n: number) => Array.from({ length: n }, () => newRow());

/** Case- and accent-insensitive. */
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const pad = (n: number) => String(n).padStart(2, "0");

/** Edit distance, capped: enough to rank "Merito" near "Méritos". */
function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 4) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

interface Issue {
  message: string;
  /** For a thesaurus value the thesaurus doesn't hold: the unknown label,
   *  near matches to use instead, and the thesaurus it could be added to. */
  unknown?: { label: string; suggestions: string[]; thesaurusId: string | null; thesaurusName?: string };
}

/** A pasted block waiting to be placed: its cells, whether its first row is a
 *  header, and which grid column each pasted column goes to (null = skip). */
interface PasteDraft {
  block: string[][];
  header: boolean;
  mapping: (string | null)[];
  at: number;
}

/** Batch entry: many entities of one template, as rows of a grid.
 *
 *  A spreadsheet-shaped form for a run of similar records. One row per new
 *  entity, a column per property a cell can hold (Title first and pinned
 *  beside the row numbers while the grid scrolls sideways).
 *
 *  - Keys: Tab / Shift+Tab across; Enter / Shift+Enter and the arrow keys
 *    down and up (Enter on the last row adds one); Left / Right leave a cell
 *    at its text's edge; Cmd/Ctrl+D fills a cell from the one above;
 *    Cmd/Ctrl+Z undoes the last grid change once the cell's own edit is
 *    undone. Rows duplicate and remove from their end cell.
 *  - Paste a block from a spreadsheet and it opens a preview first: a header
 *    row is detected and its columns mapped to properties by name (or, with no
 *    header, from the cell it was pasted into), every mapping can be changed
 *    or skipped, and the first rows show with their problems before anything
 *    is written.
 *  - Every cell is checked as it is read (a date must parse, a thesaurus value
 *    must be one the thesaurus holds, a row with anything in it needs a
 *    title). The focused cell's problem is spelled out in the always-mounted
 *    line above the footer, with near matches to use or "Add to <thesaurus>"
 *    for an unknown value; the footer counts ready and to-fix rows.
 *  - "Review" shows what will be created before it is; after Create the new
 *    entities are SELECTED in the Library and the notification offers Undo. */
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
  const store = useStore();
  const createBatch = useSetAtom(createBatchAtom);
  const addValue = useSetAtom(addThesaurusValueAtom);
  const thesauri = useAtomValue(thesauriAtom(corpus));
  const bindings = useAtomValue(thesaurusBindingsAtom(corpus));
  const [typeId, setTypeId] = useState(initialTypeId);
  const [rows, setRows] = useState<Row[]>(() => blankRows(START_ROWS));
  const [same, setSame] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<{ label: string; rows: Row[]; same: Set<string>; typeId: string }[]>([]);
  const [focus, setFocus] = useState<{ r: number; c: number } | null>(null);
  const [view, setView] = useState<"grid" | "map" | "review">("grid");
  const [paste, setPaste] = useState<PasteDraft | null>(null);
  const [pendingType, setPendingType] = useState<{ typeId: string; dropped: string[] } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  /** The value a cell held when it took focus: Cmd+Z undoes the grid only
   *  once the cell's own typing is back to this. */
  const focusValue = useRef("");

  const fieldsOf = (tid: string) => (templateFields(tid, corpus)[language] ?? []).filter((f) => f.id !== "description");
  const blank = useMemo(() => templateFields(typeId, corpus), [typeId, corpus]);
  const fields = useMemo(() => fieldsOf(typeId), [typeId, corpus, language]); // eslint-disable-line react-hooks/exhaustive-deps
  const columns = fields.filter((f) => GRID_TYPES.has(f.type) && !f.list);
  const left = fields.filter((f) => !columns.includes(f));
  const colIds = ["title", ...columns.map((f) => f.id)];
  const colLabel = (id: string) => (id === "title" ? "Title" : (columns.find((f) => f.id === id)?.label ?? id));
  const typeName = types.find((t) => t.id === typeId)?.name ?? "entities";
  /** "Edit Fecha" → "edit Fecha": the verb goes lower case, a property keeps its own. */
  const lowerFirst = (l: string) => l.charAt(0).toLowerCase() + l.slice(1);

  /* ── History ── */
  const snapshot = (label: string) =>
    setHistory((h) => [...h.slice(-(HISTORY - 1)), { label, rows, same, typeId }]);
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setRows(last.rows);
    setSame(last.same);
    setTypeId(last.typeId);
  };

  /* ── Thesauri ── */
  const thesaurusOf = (f: MetadataField) => {
    const id = bindings[bindingKey(typeId, f.id)] ?? f.thesaurus;
    return thesauri.find((x) => x.id === id) ?? null;
  };
  const flat = (vals: ThesaurusValue[]) => vals.flatMap((v) => (v.values ? v.values : [v]));
  const optionsOf = (f: MetadataField) => {
    const t = thesaurusOf(f);
    return t ? flat(localizeValues(t.values, corpus, language)) : [];
  };
  const keyFor = (f: MetadataField, label: string) =>
    optionsOf(f).find((v) => fold(v.label) === fold(label))?.id ?? null;
  const suggest = (f: MetadataField, label: string) => {
    const q = fold(label);
    return optionsOf(f)
      .map((v) => {
        const l = fold(v.label);
        const score = l.startsWith(q) || q.startsWith(l) ? 0 : l.includes(q) || q.includes(l) ? 1 : distance(q, l);
        return { label: v.label, score };
      })
      .filter((x) => x.score <= 3)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((x) => x.label);
  };

  /* ── Cells and checks ── */
  const cell = (r: number, id: string) => (same.has(id) ? rows[0]?.cells[id] : rows[r]?.cells[id]) ?? "";
  const rowFilled = (r: number) =>
    !!rows[r]?.cells.title?.trim() || columns.some((f) => !same.has(f.id) && !!rows[r]?.cells[f.id]?.trim());
  const issueOf = (r: number, id: string): Issue | null => {
    if (id === "title") return rowFilled(r) && !cell(r, "title").trim() ? { message: "Every entity needs a title." } : null;
    const f = columns.find((x) => x.id === id);
    if (!f) return null;
    const v = cell(r, id).trim();
    if (!v || !rowFilled(r)) return null;
    if (f.type === "date")
      return parseDateValue(v) ? null : { message: `“${v}” is not a date. Write it as dd/mm/yyyy.` };
    if (f.type === "select" || f.type === "multiselect") {
      const parts = f.type === "select" ? [v] : v.split(";").map((x) => x.trim()).filter(Boolean);
      const bad = parts.find((x) => !keyFor(f, x));
      if (!bad) return null;
      const t = thesaurusOf(f);
      return {
        message: `“${bad}” is not a value of ${f.label}.`,
        unknown: { label: bad, suggestions: suggest(f, bad), thesaurusId: t?.id ?? null, thesaurusName: t?.name },
      };
    }
    return null;
  };
  const rowIssues = (r: number) => colIds.map((id) => issueOf(r, id)).filter(Boolean).length;
  const filledRows = rows.map((_, r) => r).filter(rowFilled);
  const readyRows = filledRows.filter((r) => rowIssues(r) === 0);
  const fixRows = filledRows.length - readyRows.length;

  const setCell = (r: number, id: string, value: string) =>
    setRows((prev) => prev.map((row, i) => (i === r ? { ...row, cells: { ...row.cells, [id]: value } } : row)));

  /* ── Focus movement ── */
  const focusCell = (r: number, c: number) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${r}:${c}"]`);
    if (el) {
      el.focus();
      el.select();
    }
  };
  const move = (r: number, c: number) => {
    if (r >= rows.length) {
      snapshot("Add row");
      setRows((prev) => (prev.length < MAX_ROWS ? [...prev, newRow()] : prev));
      requestAnimationFrame(() => focusCell(r, c));
      return;
    }
    focusCell(Math.max(0, r), Math.max(0, Math.min(colIds.length - 1, c)));
  };
  const onCellKey = (r: number, c: number, e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "d") {
      e.preventDefault();
      if (r === 0) return;
      snapshot("Fill down");
      setCell(r, colIds[c], cell(r - 1, colIds[c]));
      return;
    }
    if (mod && e.key.toLowerCase() === "z" && !e.shiftKey && el.value === focusValue.current && history.length) {
      e.preventDefault();
      undo();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      move(e.shiftKey ? r - 1 : r + 1, c);
    } else if (e.key === "ArrowDown" && !el.list) {
      e.preventDefault();
      move(r + 1, c);
    } else if (e.key === "ArrowUp" && !el.list) {
      e.preventDefault();
      move(r - 1, c);
    } else if (e.key === "ArrowLeft" && el.selectionStart === 0 && el.selectionEnd === 0 && c > 0) {
      e.preventDefault();
      focusCell(r, c - 1);
    } else if (e.key === "ArrowRight" && el.selectionStart === el.value.length && c < colIds.length - 1) {
      e.preventDefault();
      focusCell(r, c + 1);
    }
  };

  /* ── Rows ── */
  const addRows = (n: number) => {
    snapshot(n === 1 ? "Add row" : `Add ${n} rows`);
    setRows((prev) => [...prev, ...blankRows(Math.min(n, MAX_ROWS - prev.length))]);
  };
  const duplicateRow = (r: number) => {
    snapshot("Duplicate row");
    setRows((prev) => [...prev.slice(0, r + 1), newRow({ ...prev[r].cells }), ...prev.slice(r + 1)].slice(0, MAX_ROWS));
  };
  const removeRow = (r: number) => {
    snapshot("Remove row");
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== r) : [newRow()]));
  };
  const toggleSame = (id: string) => {
    snapshot("Same for all rows");
    setSame((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  /* ── Template switch: keep what the new template also has ── */
  const requestType = (next: string) => {
    if (next === typeId) return;
    const keep = new Set(fieldsOf(next).filter((f) => GRID_TYPES.has(f.type) && !f.list).map((f) => f.id));
    const dropped = columns.filter((f) => !keep.has(f.id) && rows.some((row) => row.cells[f.id]?.trim())).map((f) => f.label);
    if (dropped.length) setPendingType({ typeId: next, dropped });
    else switchType(next);
  };
  const switchType = (next: string) => {
    snapshot("Change template");
    const keep = new Set(["title", ...fieldsOf(next).map((f) => f.id)]);
    setRows((prev) =>
      prev.map((row) => ({ ...row, cells: Object.fromEntries(Object.entries(row.cells).filter(([k]) => keep.has(k))) })),
    );
    setSame((prev) => new Set([...prev].filter((k) => keep.has(k))));
    setTypeId(next);
  };

  /* ── Paste ── */
  const onPaste = (r: number, c: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();
    const block = text
      .replace(/\r/g, "")
      .replace(/\n+$/, "")
      .split("\n")
      .map((line) => line.split("\t").map((v) => v.trim()));
    // A header row names the properties: match each pasted cell to a column
    // label (or "Title"/"Título"), folded.
    const byLabel = new Map<string, string>([
      ["title", "title"],
      ["titulo", "title"],
      ["titre", "title"],
      ...columns.map((f) => [fold(f.label), f.id] as [string, string]),
    ]);
    const first = block[0].map((v) => byLabel.get(fold(v)) ?? null);
    const header = first.filter(Boolean).length >= Math.max(1, Math.ceil(block[0].length / 2));
    const mapping = header ? first : block[0].map((_, j) => colIds[c + j] ?? null);
    setPaste({ block, header, mapping, at: header ? r : r });
    setView("map");
  };
  const pasteRows = (d: PasteDraft) => (d.header ? d.block.slice(1) : d.block);
  const applyPaste = () => {
    if (!paste) return;
    snapshot("Paste");
    const data = pasteRows(paste);
    setRows((prev) => {
      const next = prev.slice();
      data.forEach((cells, i) => {
        const at = paste.at + i;
        if (at >= MAX_ROWS) return;
        while (next.length <= at) next.push(newRow());
        const row = { ...next[at], cells: { ...next[at].cells } };
        cells.forEach((v, j) => {
          const id = paste.mapping[j];
          if (id) row.cells[id] = v;
        });
        next[at] = row;
      });
      return next;
    });
    setPaste(null);
    setView("grid");
  };

  /* ── Create ── */
  const create = () => {
    if (!readyRows.length) return;
    const out = readyRows.map((r) => {
      const byLang = Object.fromEntries(
        LANGUAGES.map((l) => [l, blank[l].map((f) => ({ ...f }))]),
      ) as Record<Language, MetadataField[]>;
      for (const f of columns) {
        const raw = cell(r, f.id).trim();
        if (!raw) continue;
        if (f.type === "select" || f.type === "multiselect") {
          const labels = f.type === "select" ? [raw] : raw.split(";").map((x) => x.trim()).filter(Boolean);
          const keys = labels.map((l) => keyFor(f, l)).filter((k): k is string => !!k);
          const t = thesaurusOf(f);
          const { byLang: lab, ids } = labelsForKeys(keys, t ? t.values : null, corpus);
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
    const { ids, ref } = createBatch({ corpus, typeId, rows: out, language });
    // The new entities, selected: the selection bar is what to do next with
    // them (bulk edit, share, export), and it says how many there are.
    store.set(librarySelectedEntityIdAtom, null);
    store.set(clearSelectionAtom);
    store.set(selectIdsAtom, ids);
    store.set(notificationsAtom, (prev) => [
      {
        id: `n-batch-${Date.now()}`,
        kind: "success",
        title: `${ids.length} ${ids.length === 1 ? "entity" : "entities"} created as ${typeName}.`,
        detail: "They are selected in the Library. Undo removes them until your next bulk change or delete.",
        time: Date.now(),
        read: false,
        ...(ref ? { action: { label: "Undo", kind: "undo" as const, ref } } : {}),
      },
      ...prev,
    ]);
    onClose();
  };

  /* ── The focused cell's problem, spelled out ── */
  const focusIssue = focus ? issueOf(focus.r, colIds[focus.c]) : null;
  const firstBad = (() => {
    for (const r of filledRows) for (let c = 0; c < colIds.length; c++) if (issueOf(r, colIds[c])) return { r, c };
    return null;
  })();
  const useSuggestion = (label: string) => {
    if (!focus) return;
    const id = colIds[focus.c];
    const f = columns.find((x) => x.id === id);
    snapshot("Use suggestion");
    const raw = cell(focus.r, id);
    const bad = focusIssue?.unknown?.label ?? "";
    const next =
      f?.type === "multiselect"
        ? raw.split(";").map((x) => (x.trim() === bad ? label : x.trim())).join("; ")
        : label;
    setCell(same.has(id) ? 0 : focus.r, id, next);
  };
  const addToThesaurus = () => {
    const u = focusIssue?.unknown;
    if (!u?.thesaurusId) return;
    addValue({ corpus, thesaurusId: u.thesaurusId, label: u.label });
  };

  const hintId = `${uid}-hint`;
  const cellClass = (bad: boolean, locked: boolean) =>
    `w-full h-8 px-2 text-xs text-ink bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-carbon/40 ${
      bad ? "bg-warning-light" : ""
    } ${locked ? "text-ink-tertiary" : ""}`;
  const stick = "sticky z-[1] bg-paper";

  const footer =
    view === "map" ? (
      <>
        <span className="me-auto text-meta text-ink-tertiary">
          {paste ? `${pasteRows(paste).length} rows from row ${paste.at + 1}` : ""}
        </span>
        <button
          type="button"
          onClick={() => {
            setPaste(null);
            setView("grid");
          }}
          className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}
        >
          Cancel paste
        </button>
        <button type="button" onClick={applyPaste} className={MODAL_COMMIT}>
          Put in the grid
        </button>
      </>
    ) : view === "review" ? (
      <>
        <button
          type="button"
          onClick={() => setView("grid")}
          data-gutter-align="box"
          className={`me-auto inline-flex items-center gap-1.5 ${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}
        >
          <ArrowLeft size={12} aria-hidden /> Back to the grid
        </button>
        <button type="button" onClick={create} className={MODAL_COMMIT}>
          Create {readyRows.length} {readyRows.length === 1 ? "entity" : "entities"}
        </button>
      </>
    ) : (
      <>
        <span role="status" className="me-auto text-meta text-ink-tertiary tabular-nums">
          {readyRows.length} ready{fixRows ? ` · ${fixRows} to fix` : ""}
          {fixRows > 0 && firstBad && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => focusCell(firstBad.r, firstBad.c)}
                className="text-carbon hover:underline cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
              >
                Go to the first
              </button>
            </>
          )}
        </span>
        <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => readyRows.length && setView("review")}
          aria-disabled={!readyRows.length || undefined}
          className={readyRows.length ? MODAL_COMMIT : MODAL_COMMIT_DISABLED}
        >
          {readyRows.length ? `Review ${readyRows.length} ${readyRows.length === 1 ? "entity" : "entities"}` : "Review"}
        </button>
      </>
    );

  return (
    <Modal
      component="BatchEntryModal"
      size="grid"
      height="md:h-[min(44rem,100%)]"
      onClose={onClose}
      dismissOnScrim={false}
      title="Batch entry"
      subtitle={
        view === "map"
          ? "place the pasted columns"
          : view === "review"
            ? `${readyRows.length} ${typeName} to create`
            : "one row per new entity; paste from a spreadsheet"
      }
      flush
      footer={footer}
    >
      {/* Toolbar: template, what the grid leaves out, undo. Mounted in every
          view so the grid below never moves. */}
      <div className="bleed shrink-0 flex items-center gap-2 py-2 border-b border-border">
        <span className={MODAL_LABEL}>Template</span>
        <div className={`w-[15rem] shrink-0 ${view === "grid" ? "" : "pointer-events-none opacity-60"}`}>
          <TemplateSelect value={typeId} onChange={requestType} types={types} />
        </div>
        <p
          className="min-w-0 flex-1 truncate text-meta text-ink-tertiary"
          title={left.map((f) => f.label).join(", ")}
        >
          {left.length > 0 ? `Not in the grid, add from each entity's form: ${left.map((f) => f.label).join(", ")}` : ""}
        </p>
        <button
          type="button"
          onClick={undo}
          disabled={!history.length || view !== "grid"}
          title={history.length ? `Undo ${lowerFirst(history[history.length - 1].label)} (Cmd/Ctrl+Z)` : "Nothing to undo"}
          className={`shrink-0 inline-flex items-center gap-1.5 ${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer disabled:opacity-40 disabled:cursor-default`}
        >
          <Undo2 size={12} aria-hidden />
          Undo{history.length ? ` ${lowerFirst(history[history.length - 1].label)}` : ""}
        </button>
      </div>

      {view === "map" && paste ? (
        <div className="bleed flex-1 min-h-0 overflow-auto py-4 space-y-3">
          <div className="flex items-center gap-4 text-xs text-ink-secondary">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={paste.header}
                onChange={(e) => {
                  const header = e.target.checked;
                  setPaste({ ...paste, header, mapping: header ? paste.mapping : paste.block[0].map((_, j) => colIds[j] ?? null) });
                }}
                className="w-3.5 h-3.5 accent-ink"
              />
              The first row is a header
            </label>
            <label className="inline-flex items-center gap-1.5">
              Start at row
              <input
                type="number"
                min={1}
                max={MAX_ROWS}
                value={paste.at + 1}
                onChange={(e) => setPaste({ ...paste, at: Math.max(0, Math.min(MAX_ROWS - 1, Number(e.target.value) - 1)) })}
                className="w-16 h-7 px-2 text-xs bg-paper border border-border rounded-md"
              />
            </label>
          </div>
          <div className="overflow-auto border border-border rounded-md">
            <table className="w-max min-w-full border-collapse text-xs" aria-label="Pasted columns">
              <thead className="bg-warm">
                <tr>
                  {paste.block[0].map((h, j) => (
                    <th key={j} scope="col" className="min-w-[11rem] px-2 py-1.5 text-start font-medium border-b border-e border-border">
                      <span className="block text-meta text-ink-tertiary truncate">
                        {paste.header ? `“${h}”` : `Column ${j + 1}`}
                      </span>
                      <select
                        aria-label={`Property for pasted column ${j + 1}`}
                        value={paste.mapping[j] ?? ""}
                        onChange={(e) => {
                          const mapping = paste.mapping.slice();
                          mapping[j] = e.target.value || null;
                          setPaste({ ...paste, mapping });
                        }}
                        className="mt-1 w-full h-7 px-1.5 text-xs text-ink bg-paper border border-border rounded-md cursor-pointer"
                      >
                        <option value="">Skip this column</option>
                        {colIds.map((id) => (
                          <option key={id} value={id}>
                            {colLabel(id)}
                          </option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pasteRows(paste)
                  .slice(0, 6)
                  .map((cells, i) => (
                    <tr key={i}>
                      {paste.block[0].map((_, j) => (
                        <td
                          key={j}
                          className={`px-2 py-1.5 border-b border-e border-border-soft truncate max-w-[16rem] ${
                            paste.mapping[j] ? "text-ink" : "text-ink-muted line-through"
                          }`}
                        >
                          {cells[j] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="text-meta text-ink-tertiary">
            {pasteRows(paste).length > 6 ? `…and ${pasteRows(paste).length - 6} more rows. ` : ""}
            Values are checked once they are in the grid; nothing is created until you review.
          </p>
        </div>
      ) : view === "review" ? (
        <div className="bleed flex-1 min-h-0 overflow-auto py-4 space-y-3">
          <p className="text-xs text-ink-secondary">
            {readyRows.length} {typeName} will be created
            {fixRows ? `. ${fixRows} ${fixRows === 1 ? "row still needs" : "rows still need"} fixing and will not be.` : "."}
          </p>
          <ol className="divide-y divide-border-soft border-y border-border-soft">
            {readyRows.map((r) => {
              const shown = columns.filter((f) => cell(r, f.id).trim()).slice(0, 3);
              return (
                <li key={rows[r].key} className="py-2 flex items-baseline gap-3 min-w-0">
                  <span className="w-6 shrink-0 text-meta text-ink-muted tabular-nums">{r + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{cell(r, "title")}</span>
                    <span className="block text-meta text-ink-tertiary truncate">
                      {shown.map((f) => `${f.label}: ${cell(r, f.id)}`).join(" · ") || "No properties"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <>
          {/* A scroll lane edge to edge on purpose: the grid is as wide as its
              columns and scrolls sideways inside it (`data-gutter-bleed`). */}
          <div ref={gridRef} data-gutter-bleed className="bleed-flush flex-1 min-h-0 overflow-auto">
            <table
              role="grid"
              aria-label={`New ${typeName} entities`}
              aria-rowcount={rows.length + 1}
              aria-colcount={colIds.length}
              className="w-max min-w-full border-collapse text-xs table-fixed"
            >
              <thead className="sticky top-0 z-[2] bg-warm">
                <tr>
                  <th scope="col" className={`w-10 ${stick} start-0 bg-warm border-b border-e border-border`}>
                    <span className="sr-only">Row</span>
                  </th>
                  {colIds.map((id, c) => {
                    const f = columns.find((x) => x.id === id);
                    const w = WIDTH[id === "title" ? "title" : (f?.type ?? "text")] ?? "w-[14rem]";
                    return (
                      <th
                        key={id}
                        scope="col"
                        className={`${w} px-2 py-1.5 text-start font-medium text-ink-secondary border-b border-e border-border ${
                          c === 0 ? `${stick} start-10 bg-warm` : ""
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="truncate" title={colLabel(id)}>
                            {colLabel(id)}
                            {id === "title" ? "*" : ""}
                          </span>
                          {id !== "title" && (
                            <label className="ms-auto inline-flex items-center gap-1 text-meta font-normal text-ink-tertiary whitespace-nowrap cursor-pointer">
                              <input
                                type="checkbox"
                                checked={same.has(id)}
                                onChange={() => toggleSame(id)}
                                aria-label={`Same ${colLabel(id)} for all rows`}
                                className="w-3 h-3 accent-ink"
                              />
                              All rows
                            </label>
                          )}
                        </span>
                      </th>
                    );
                  })}
                  <th scope="col" className="w-16 border-b border-border">
                    <span className="sr-only">Row actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr key={row.key} aria-rowindex={r + 2} className="group">
                    <th
                      scope="row"
                      className={`${stick} start-0 px-1 text-center text-meta font-normal tabular-nums border-b border-e border-border-soft ${
                        rowFilled(r) ? (rowIssues(r) ? "text-warning" : "text-ink-tertiary") : "text-ink-muted"
                      }`}
                    >
                      {r + 1}
                    </th>
                    {colIds.map((id, c) => {
                      const f = columns.find((x) => x.id === id);
                      const locked = same.has(id) && r > 0;
                      const issue = issueOf(r, id);
                      const listId = f && (f.type === "select" || f.type === "multiselect") ? `${uid}-${id}` : undefined;
                      return (
                        <td
                          key={id}
                          role="gridcell"
                          className={`p-0 border-b border-e border-border-soft ${c === 0 ? `${stick} start-10` : ""}`}
                        >
                          <input
                            data-cell={`${r}:${c}`}
                            aria-label={`Row ${r + 1}, ${colLabel(id)}`}
                            aria-invalid={!!issue || undefined}
                            aria-describedby={issue ? hintId : undefined}
                            value={cell(r, id)}
                            readOnly={locked}
                            list={listId}
                            placeholder={
                              r === 0 && f ? (f.type === "date" ? "dd/mm/yyyy" : f.type === "multiselect" ? "a; b" : "") : ""
                            }
                            onFocus={(e) => {
                              setFocus({ r, c });
                              focusValue.current = e.currentTarget.value;
                            }}
                            onBlur={(e) => {
                              if (e.currentTarget.value !== focusValue.current)
                                setHistory((h) => [
                                  ...h.slice(-(HISTORY - 1)),
                                  {
                                    label: `Edit ${colLabel(id)}`,
                                    rows: rows.map((x, i) =>
                                      i === r ? { ...x, cells: { ...x.cells, [id]: focusValue.current } } : x,
                                    ),
                                    same,
                                    typeId,
                                  },
                                ]);
                            }}
                            onChange={(e) => setCell(r, id, e.target.value)}
                            onKeyDown={(e) => onCellKey(r, c, e)}
                            onPaste={(e) => onPaste(r, c, e)}
                            title={locked ? "Same for all rows: edit the first row" : undefined}
                            className={cellClass(!!issue, locked)}
                          />
                        </td>
                      );
                    })}
                    <td className="p-0 border-b border-border-soft">
                      <span className="flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          aria-label={`Duplicate row ${r + 1}`}
                          title="Duplicate row"
                          onClick={() => duplicateRow(r)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-warm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
                        >
                          <CopyPlus size={12} aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove row ${r + 1}`}
                          title="Remove row"
                          onClick={() => removeRow(r)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-warm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
                        >
                          <X size={12} aria-hidden />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {columns
              .filter((f) => f.type === "select" || f.type === "multiselect")
              .map((f) => (
                <datalist key={f.id} id={`${uid}-${f.id}`}>
                  {optionsOf(f).map((v) => (
                    <option key={v.id} value={v.label} />
                  ))}
                </datalist>
              ))}
            <div className="bleed py-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => addRows(1)}
                data-gutter-align="box"
                className={`inline-flex items-center gap-1.5 ${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}
              >
                <Plus size={12} aria-hidden /> Add row
              </button>
              <button type="button" onClick={() => addRows(10)} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
                Add 10
              </button>
              <span className="ms-auto text-meta text-ink-muted">
                Enter moves down · Cmd/Ctrl+D fills from above · paste a block to map it
              </span>
            </div>
          </div>
          {/* The focused cell's problem, and what to do about it. Always
              mounted at one height: a hint that appears would push the grid. */}
          <div
            id={hintId}
            aria-live="polite"
            className="bleed shrink-0 h-10 flex items-center gap-2 border-t border-border text-xs"
          >
            {focusIssue ? (
              <>
                <span className="min-w-0 truncate text-ink">
                  <span className="text-ink-tertiary">
                    Row {focus!.r + 1}, {colLabel(colIds[focus!.c])}:
                  </span>{" "}
                  {focusIssue.message}
                </span>
                {focusIssue.unknown?.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => useSuggestion(s)}
                    className="shrink-0 px-2 h-6 rounded-md bg-warm text-ink hover:bg-parchment cursor-pointer"
                  >
                    Use “{s}”
                  </button>
                ))}
                {focusIssue.unknown?.thesaurusId && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={addToThesaurus}
                    className="shrink-0 px-2 h-6 rounded-md text-carbon hover:bg-warm cursor-pointer"
                  >
                    Add “{focusIssue.unknown.label}” to {focusIssue.unknown.thesaurusName}
                  </button>
                )}
              </>
            ) : (
              <span className="text-ink-muted">
                {filledRows.length ? "" : "Type in the grid, or paste rows copied from a spreadsheet."}
              </span>
            )}
          </div>
        </>
      )}
      <ConfirmDialog
        open={!!pendingType}
        title={`Change to ${types.find((t) => t.id === pendingType?.typeId)?.name ?? "this template"}?`}
        message={`It has no column for ${pendingType?.dropped.join(", ")}, so ${
          pendingType && pendingType.dropped.length === 1 ? "that column's values are" : "those columns' values are"
        } dropped. Everything the two templates share stays. Undo brings them back.`}
        confirmLabel="Change template"
        cancelLabel="Keep this template"
        onConfirm={() => {
          const t = pendingType!.typeId;
          setPendingType(null);
          switchType(t);
        }}
        onCancel={() => setPendingType(null)}
      />
    </Modal>
  );
}
