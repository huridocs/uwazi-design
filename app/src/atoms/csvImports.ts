import { useEffect } from "react";
import { useStore } from "jotai";
import type { Corpus } from "../data/entityChanges";
import {
  CSV_STAGES,
  CSV_STATUS_TEXT,
  csvTitle,
  isTerminal,
  seedCsvImports,
  type CsvImport,
  type CsvRowError,
  type CsvStage,
} from "../data/imports";
import { createSettingsCollection, hasId } from "./settingsCollection";
import { tasksAtom, toastsAtom, type Task } from "./notifications";
import { appendActivityAtom } from "./activityLog";
import { consumeFailureAtom } from "./devSwitches";

/** Import CSV's imports: one list per collection, kept like every settings
 *  store (seed plus the session's changes, in sessionStorage), so a running
 *  import survives leaving the view and a reload. The runner below moves
 *  every unfinished import along whatever view is open, and keeps one Beacon
 *  task per import, as Uwazi's `CsvImportTasksSubscriber` does. */

const isImport = (r: unknown): boolean => {
  if (!hasId(r)) return false;
  const i = r as Partial<CsvImport>;
  return typeof i.filename === "string" && typeof i.templateId === "string" && typeof i.status === "string" && Array.isArray(i.rowErrors);
};

export const csvImports = createSettingsCollection<CsvImport>({
  name: "csv-imports",
  idPrefix: "imp",
  seedOf: (scope) => (scope === "mock" ? seedCsvImports : []),
  corpusScoped: true,
  isRecord: isImport,
});

const CORPORA: Corpus[] = ["mock", "cejil", "artworks", "travesia", "nepal", "vegas"];
/** One runner step. */
const TICK_MS = 700;
/** Steps each stage before "Creating entities" takes. */
const STAGE_TICKS = 2;

type Store = ReturnType<typeof useStore>;

const taskId = (i: CsvImport) => `csv-${i.id}`;

/** How far along the whole job is, 0–100: the stages before entities take
 *  the first fifth, entity rows the rest. */
function percent(i: CsvImport): number {
  if (i.status === "completed") return 100;
  const stage = CSV_STAGES.indexOf(i.status as CsvStage);
  if (i.status === "entities" || stage < 0) return 20 + Math.round((i.rowsProcessed / Math.max(1, i.totalRows)) * 80);
  return Math.round((stage / (CSV_STAGES.length - 1)) * 20);
}

function taskOf(i: CsvImport): Task {
  return {
    id: taskId(i),
    label: `CSV Import: ${csvTitle(i).title}`,
    detail: i.filename,
    current: percent(i),
    total: 100,
    driven: true,
    done: { title: "CSV import completed", detail: i.filename },
  };
}

/** Put the import's task in the Beacon, or bring it up to date. */
function syncTask(store: Store, i: CsvImport) {
  store.set(tasksAtom, (prev) => {
    const t = taskOf(i);
    const at = prev.findIndex((x) => x.id === t.id);
    if (at < 0) return [...prev, t];
    const next = [...prev];
    next[at] = { ...prev[at], label: t.label, current: Math.min(t.current, 99) };
    return next;
  });
}

function endTask(store: Store, i: CsvImport, outcome: "completed" | "failed" | "cancelled", detail?: string) {
  const id = taskId(i);
  if (outcome === "completed") {
    // The Beacon turns a finished task into its "done" notification.
    store.set(tasksAtom, (prev) => prev.map((t) => (t.id === id ? { ...t, current: t.total } : t)));
    return;
  }
  if (outcome === "cancelled") {
    // Uwazi relabels the task and ends it; its notification names the file.
    store.set(tasksAtom, (prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, label: "CSV Import: Cancelled", current: t.total, done: { title: "CSV import cancelled", detail: i.filename } }
          : t,
      ),
    );
    return;
  }
  store.set(tasksAtom, (prev) => prev.filter((t) => t.id !== id));
  store.set(toastsAtom, (prev) => [
    ...prev,
    { id: `${id}-failed`, type: "error", message: "CSV import failed", detail: detail ?? i.filename },
  ]);
}

/** One step of one import. Returns the patch, or null when nothing moves. */
function step(store: Store, i: CsvImport, all: CsvImport[]): Partial<CsvImport> | null {
  if (isTerminal(i.status)) return null;
  if (i.status === "queued" && i.waitFor) {
    const ahead = all.find((x) => x.id === i.waitFor);
    if (ahead && !isTerminal(ahead.status)) return null;
  }
  const now = Date.now();
  if (i.status !== "entities") {
    const ticks = (i.ticks ?? 0) + 1;
    if (ticks < STAGE_TICKS) return { ticks };
    const stage = i.status === "retrying" ? "entities" : CSV_STAGES[CSV_STAGES.indexOf(i.status) + 1];
    // A Dev panel "Run" failure lands as the job enters its next stage.
    const reason = store.set(consumeFailureAtom, "run");
    if (reason)
      return {
        status: "failed",
        stoppedAt: stage,
        updated: now,
        ticks: 0,
        failure: { message: reason, stage: CSV_STATUS_TEXT[stage].title, code: "JOB_FAILED", retryable: false },
      };
    // The preflight stages leave their counts behind as they finish.
    const made: Partial<CsvImport> =
      i.status === "thesauri" ? { thesauriValuesCreated: Math.floor(Math.random() * 6) }
      : i.status === "relationships" ? { relatedEntitiesCreated: Math.floor(Math.random() * 12) }
      : {};
    return { status: stage, ticks: 0, updated: now, ...made };
  }
  const rate = i.rate ?? Math.max(1, Math.ceil(i.totalRows / 10));
  const processed = Math.min(i.totalRows, i.rowsProcessed + rate);
  const hit = (i.plannedErrors ?? []).filter((e) => e.row - 1 > i.rowsProcessed && e.row - 1 <= processed);
  const rowsFailed = i.rowsFailed + hit.length;
  const patch: Partial<CsvImport> = {
    rowsProcessed: processed,
    rowsFailed,
    entitiesCreated: processed - rowsFailed - i.entitiesUpdated,
    rowErrors: hit.length ? [...i.rowErrors, ...hit] : i.rowErrors,
    updated: now,
  };
  if (processed >= i.totalRows) patch.status = "completed";
  return patch;
}

function tick(store: Store) {
  for (const corpus of CORPORA) {
    const list = store.get(csvImports.listOfAtom(corpus));
    for (const i of list) {
      const patch = step(store, i, list);
      if (!patch) continue;
      store.set(csvImports.patchAtom, { id: i.id, patch, corpus });
      const next = { ...i, ...patch };
      if (next.status === "completed" || next.status === "failed") {
        endTask(store, next, next.status, next.failure?.message);
        store.set(appendActivityAtom, {
          method: "UPDATE",
          summary:
            next.status === "completed"
              ? `CSV import “${next.filename}” completed: ${next.entitiesCreated.toLocaleString()} entities created, ${next.rowsFailed.toLocaleString()} rows failed`
              : `CSV import “${next.filename}” failed: ${next.failure?.message ?? "error"}`,
          domain: "csv-import",
          targetId: next.id,
          scope: corpus,
        });
      } else syncTask(store, next);
    }
  }
}

/** Runs every unfinished import, in every collection, while the app is open.
 *  Mounted once, by `App`. On mount it also restores the Beacon tasks of the
 *  imports still running (a reload clears the task list). */
export function useCsvImportRunner() {
  const store = useStore();
  useEffect(() => {
    for (const corpus of CORPORA)
      for (const i of store.get(csvImports.listOfAtom(corpus))) if (!isTerminal(i.status)) syncTask(store, i);
    const id = setInterval(() => tick(store), TICK_MS);
    return () => clearInterval(id);
  }, [store]);
}

/** Register an import (the modal's Accept). It starts Queued, with its task
 *  "CSV Import: Queued". Returns its id. */
export function registerCsvImport(
  store: Store,
  { filename, templateId, user, corpus }: { filename: string; templateId: string; user: string; corpus: Corpus },
): string {
  const totalRows = 60 + Math.floor(Math.random() * 420);
  // The mock's row errors: none, one or two rows that will fail.
  const planned: CsvRowError[] = [
    { row: 2 + Math.floor(totalRows * 0.3), property: "date", message: "Value cannot be transformed to the correct type." },
    { row: 2 + Math.floor(totalRows * 0.7), property: "", message: "Row is empty or malformed." },
  ].slice(0, Math.floor(Math.random() * 3));
  const now = Date.now();
  const value: Omit<CsvImport, "id"> = {
    filename,
    templateId,
    status: "queued",
    created: now,
    updated: now,
    user,
    totalRows,
    rowsProcessed: 0,
    entitiesCreated: 0,
    entitiesUpdated: 0,
    rowsFailed: 0,
    thesauriValuesCreated: 0,
    relatedEntitiesCreated: 0,
    rowErrors: [],
    plannedErrors: planned,
  };
  const id = store.set(csvImports.createAtom, { value, corpus });
  syncTask(store, { ...value, id });
  return id;
}

/** Cancel a running import (Uwazi's `cancel`): created entities stay. Its task
 *  is relabelled "Cancelled" and ends with "CSV import cancelled". Returns
 *  false when the import had already ended. */
export function cancelCsvImport(store: Store, corpus: Corpus, id: string): boolean {
  const i = store.get(csvImports.listOfAtom(corpus)).find((x) => x.id === id);
  if (!i || isTerminal(i.status)) return false;
  const patch: Partial<CsvImport> = { status: "cancelled", stoppedAt: i.status === "retrying" ? "entities" : i.status, updated: Date.now() };
  store.set(csvImports.patchAtom, { id, patch, corpus });
  endTask(store, { ...i, ...patch }, "cancelled");
  return true;
}

/** The failed rows as Uwazi's report: a header, then Row, Property, Message. */
export function failedRowsCsv(i: CsvImport): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return ["Row,Property,Message", ...i.rowErrors.map((e) => [e.row, e.property, e.message].map(cell).join(","))].join("\n") + "\n";
}
