import { atom, useStore } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Corpus } from "../data/entityChanges";
import { getEntityProfile } from "../data/entityProfiles";
import type { Language } from "./language";
import type { MetadataField } from "../data/metadata";
import type { TemplateDef } from "../data/templates/types";
import { hashOf, seedIxExtractors, IX_PROPERTY_TYPES, type IxExtractor, type IxRun, type IxRunStatus } from "../data/extraction";
import { createSettingsCollection, hasId } from "./settingsCollection";
import { libraryEntitiesAtom } from "./dataSource";
import { libraryEntityOverlayAtom, saveEntityEditAtom } from "./entityChanges";
import { templatesAtom } from "./templates";
import { tasksAtom, toastsAtom } from "./notifications";
import { appendActivityAtom } from "./activityLog";
import { consumeFailureAtom } from "./devSwitches";
import { SETTINGS_NOTICES } from "../data/settingsNotices";

/** Settings › Metadata extraction. Two stores per collection:
 *   - the extractors (name, property, templates, source, model status);
 *   - what happened to each suggestion (accepted, used for training, found
 *     by a run), keyed `extractor|template epoch|entity`.
 *  A suggestion row itself is derived: the entity's current value, read
 *  through the entity overlay, against the mock model's suggestion. Accept
 *  writes the suggestion into the entity (decision G12). */

const isExtractor = (r: unknown): boolean => {
  if (!hasId(r)) return false;
  const x = r as Partial<IxExtractor>;
  return typeof x.name === "string" && typeof x.property === "string" && Array.isArray(x.templates) && typeof x.status === "string";
};

export const ixExtractors = createSettingsCollection<IxExtractor>({
  name: "ix-extractors",
  idPrefix: "ix",
  seedOf: (scope) => (scope === "mock" ? seedIxExtractors : []),
  corpusScoped: true,
  isRecord: isExtractor,
});

interface SuggestionState {
  id: string;
  useForTraining?: boolean;
  accepted?: boolean;
  /** A run found a suggestion for it (or found it again). */
  processed?: boolean;
}

export const ixStates = createSettingsCollection<SuggestionState>({
  name: "ix-suggestions",
  idPrefix: "ixs",
  seedOf: () => [],
  corpusScoped: true,
});

export interface IxSuggestion {
  /** The state key. */
  id: string;
  entityId: string;
  title: string;
  language: Language;
  templateId: string;
  current: string;
  /** "" when not processed or errored. */
  suggested: string;
  /** The text the suggestion was read from, and the part that is the value. */
  context: { before: string; match: string; after: string } | null;
  processed: boolean;
  obsolete: boolean;
  error: boolean;
  labeled: boolean;
  useForTraining: boolean;
  accepted: boolean;
  /** The model's confidence in the suggestion, 0–100. */
  score: number;
  state: "accepted" | "match" | "empty" | "mismatch" | "unprocessed" | "obsolete" | "error";
}

/* ── The mock model ──────────────────────────────────────────────────── */

const ALT_TEXT = ["Honduras", "Guatemala", "El Salvador", "Perú", "Colombia", "Nicaragua", "Paraguay", "Chile"];
const ALT_OUTCOME = ["Violation found", "No violation", "Partially admissible", "Inadmissible"];
const ALT_REGION = ["Central America", "South America", "Caribbean", "North America"];
const pad = (n: number) => String(n).padStart(2, "0");

function valueFor(type: string, property: string, h: number): string {
  // As the records write dates, so a suggestion compares with the value.
  if (type === "date") return `${1981 + ((h >>> 9) % 40)}-${pad(((h >>> 5) % 12) + 1)}-${pad((h % 28) + 1)}`;
  if (type === "numeric") return String((h % 900) + 10);
  if (/region/i.test(property)) return ALT_REGION[h % ALT_REGION.length];
  if (/outcome/i.test(property)) return ALT_OUTCOME[h % ALT_OUTCOME.length];
  return ALT_TEXT[h % ALT_TEXT.length];
}

/** The property's type in a template, "title" for the title. */
export function propertyOf(t: TemplateDef | undefined, name: string) {
  if (name === "title") return { name: "title", label: "Title", type: "text" as const };
  return t?.properties.find((p) => p.name === name);
}

function currentValue(entityId: string, property: string, title: string): string {
  if (property === "title") return title;
  const f = getEntityProfile(entityId).metadata.EN?.find((m) => m.id === property) as MetadataField | undefined;
  return f?.value ?? "";
}

/** One extractor's suggestion rows in the collection shown, `${corpus}|${id}`. */
export const ixSuggestionsAtom = atomFamily((key: string) =>
  atom<IxSuggestion[]>((get) => {
    const [corpus, id] = key.split("|") as [Corpus, string];
    const x = get(ixExtractors.listOfAtom(corpus)).find((e) => e.id === id);
    if (!x) return [];
    get(libraryEntityOverlayAtom); // an Accept writes the entity: read again
    const templates = get(templatesAtom(corpus));
    const states = new Map(get(ixStates.listOfAtom(corpus)).map((s) => [s.id, s]));
    const out: IxSuggestion[] = [];
    for (const e of get(libraryEntitiesAtom)) {
      if (!x.templates.includes(e.typeId)) continue;
      const t = templates.find((tt) => tt.id === e.typeId);
      const prop = propertyOf(t, x.property);
      if (!prop) continue;
      const epoch = x.epochs?.[e.typeId] ?? 0;
      const sid = `${x.id}|${epoch}|${e.id}`;
      const s = states.get(sid);
      const h = hashOf(`${x.id}:${e.id}`);
      const roll = h % 10;
      const current = currentValue(e.id, x.property, e.title);
      // A discarded template starts again with nothing processed.
      const seeded = epoch === 0;
      const processed = !!s?.processed || (seeded && roll !== 0);
      const error = processed && !s?.processed && roll === 1;
      const obsolete = processed && !s?.processed && roll === 2;
      let suggested = "";
      if (processed && !error) {
        if (current && roll >= 3 && roll <= 6) suggested = current;
        else suggested = valueFor(prop.type, x.property, h >>> 3);
      }
      const accepted = !!s?.accepted;
      const hasContext = x.source !== "title" && roll !== 5;
      const context =
        !processed || error
          ? null
          : x.source === "title"
            ? { before: "", match: e.title, after: "" }
            : hasContext
              ? { before: `… ${prop.label}: `, match: suggested, after: " as recorded in the judgment …" }
              : null;
      const state: IxSuggestion["state"] = error
        ? "error"
        : obsolete
          ? "obsolete"
          : !processed
            ? "unprocessed"
            : accepted
              ? "accepted"
              : !current
                ? "empty"
                : current === suggested
                  ? "match"
                  : "mismatch";
      out.push({
        id: sid,
        entityId: e.id,
        title: e.title,
        language: "EN",
        templateId: e.typeId,
        current,
        suggested,
        context,
        processed,
        obsolete,
        error,
        labeled: !!current,
        useForTraining: s?.useForTraining ?? (seeded && !!current && roll % 3 === 0),
        accepted,
        score: processed && !error ? 62 + ((h >>> 11) % 37) : 0,
        state,
      });
    }
    return out;
  }),
);

/** The figures the list, the strip and Stats & Filters share. Accuracy is
 *  Uwazi's: matches against mismatches, over labeled rows that were
 *  processed. */
export function ixStats(rows: IxSuggestion[]) {
  const live = rows.filter((r) => r.processed && !r.error && !r.obsolete);
  const labeled = live.filter((r) => r.labeled);
  const match = labeled.filter((r) => r.current === r.suggested).length;
  const mismatch = labeled.length - match;
  return {
    documents: rows.length,
    labeled: rows.filter((r) => r.labeled).length,
    nonLabeled: rows.filter((r) => !r.labeled).length,
    training: rows.filter((r) => r.useForTraining).length,
    nonProcessed: rows.filter((r) => !r.processed).length,
    obsolete: rows.filter((r) => r.obsolete).length,
    error: rows.filter((r) => r.error).length,
    match: live.filter((r) => r.current && r.current === r.suggested).length,
    mismatch: live.filter((r) => r.current && r.suggested && r.current !== r.suggested).length,
    noContext: live.filter((r) => !r.context).length,
    reviewed: rows.filter((r) => r.accepted).length,
    pending: rows.filter((r) => acceptable(r) && r.current !== r.suggested).length,
    accuracy: match + mismatch ? Math.round((match / (match + mismatch)) * 100) : null,
  };
}

/** Accept is offered for a row with a suggestion, not errored or obsolete. */
export const acceptable = (r: IxSuggestion) => r.processed && !r.error && !r.obsolete && !!r.suggested;

/** The properties an extractor can target in one template: the allowed
 *  types, then the title. */
export function extractableProperties(t: TemplateDef) {
  return [
    { name: "title", label: "Title", type: "text" as string },
    ...t.properties.filter((p) => (IX_PROPERTY_TYPES as readonly string[]).includes(p.type)),
  ];
}

/* ── Writes ──────────────────────────────────────────────────────────── */

type Store = ReturnType<typeof useStore>;

function upsertState(store: Store, corpus: Corpus, id: string, patch: Omit<SuggestionState, "id">) {
  const exists = store.get(ixStates.listOfAtom(corpus)).some((s) => s.id === id);
  if (exists) store.set(ixStates.patchAtom, { id, patch, corpus });
  else store.set(ixStates.restoreAtom, { record: { id, ...patch }, corpus });
}

/** Write accepted suggestions into their entities and mark them Accepted. */
export function acceptSuggestions(store: Store, corpus: Corpus, rows: IxSuggestion[], property: string) {
  const templates = store.get(templatesAtom(corpus));
  for (const r of rows) {
    if (!acceptable(r)) continue;
    if (property === "title") {
      store.set(saveEntityEditAtom, {
        id: r.entityId,
        language: "EN",
        result: { titles: { EN: r.suggested } as Record<Language, string>, fieldsByLang: { EN: [], ES: [], FR: [], AR: [] } },
      });
    } else {
      const existing = getEntityProfile(r.entityId).metadata.EN?.find((m) => m.id === property) as MetadataField | undefined;
      const prop = propertyOf(templates.find((t) => t.id === r.templateId), property);
      const field: MetadataField = existing
        ? { ...existing, value: r.suggested }
        : { id: property, label: prop?.label ?? property, type: prop?.type === "date" ? "date" : "text", value: r.suggested };
      store.set(saveEntityEditAtom, {
        id: r.entityId,
        language: "EN",
        result: { titles: {} as Record<Language, string>, fieldsByLang: { EN: [field], ES: [], FR: [], AR: [] } },
      });
    }
    upsertState(store, corpus, r.id, { accepted: true });
  }
}

export function setUseForTraining(store: Store, corpus: Corpus, id: string, on: boolean) {
  upsertState(store, corpus, id, { useForTraining: on });
}

/* ── Runs ────────────────────────────────────────────────────────────── */

/** Running timers, by extractor. A reload drops them; the page resumes any
 *  extractor still marked running when it opens. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const PHASE_MS = { send: 1200, train: 2400, findStep: 350, accept: 1400, cancel: 900 };

const patchX = (store: Store, corpus: Corpus, id: string, patch: Partial<IxExtractor>) =>
  store.set(ixExtractors.patchAtom, { id, patch, corpus });
const xOf = (store: Store, corpus: Corpus, id: string) => store.get(ixExtractors.listOfAtom(corpus)).find((e) => e.id === id);

function task(store: Store, x: IxExtractor, label: string, pct: number) {
  const id = `ix-${x.id}`;
  store.set(tasksAtom, (prev) => {
    const t = { id, label, detail: x.name, current: Math.min(99, pct), total: 100, driven: true, done: { title: "Suggestions updated", detail: x.name } };
    const at = prev.findIndex((p) => p.id === id);
    if (at < 0) return [...prev, t];
    const next = [...prev];
    next[at] = { ...prev[at], label, current: t.current };
    return next;
  });
}
const endTask = (store: Store, x: IxExtractor, ok: boolean) =>
  store.set(tasksAtom, (prev) =>
    ok ? prev.map((t) => (t.id === `ix-${x.id}` ? { ...t, current: t.total } : t)) : prev.filter((t) => t.id !== `ix-${x.id}`),
  );

function later(id: string, ms: number, fn: () => void) {
  clearTimeout(timers.get(id));
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms),
  );
}

/** Rows a find covers: the filtered ones (or the ticked ones), up to `n`. */
function findTargets(store: Store, corpus: Corpus, x: IxExtractor, run: IxRun): IxSuggestion[] {
  const rows = store.get(ixSuggestionsAtom(`${corpus}|${x.id}`));
  const f = run.filters ?? { nonProcessed: true, obsolete: true, error: true };
  const picked = run.only
    ? rows.filter((r) => run.only!.includes(r.entityId))
    : rows.filter((r) => (f.nonProcessed && !r.processed) || (f.obsolete && r.obsolete) || (f.error && r.error) || run.kind === "train");
  return picked.slice(0, run.find || picked.length);
}

function finish(store: Store, corpus: Corpus, id: string, run: IxRun, accepted: number) {
  const x = xOf(store, corpus, id);
  if (!x) return;
  patchX(store, corpus, id, { status: "ready", progress: undefined, error: undefined });
  endTask(store, x, true);
  store.set(appendActivityAtom, {
    method: "UPDATE",
    summary: `${run.kind === "train" ? "Trained" : "Processed"} extractor “${x.name}”${accepted ? `, ${accepted} suggestions accepted` : ""}`,
    domain: "extractor",
    targetId: id,
    scope: corpus,
  });
}

function autoAccept(store: Store, corpus: Corpus, id: string, run: IxRun, found: IxSuggestion[]) {
  const x = xOf(store, corpus, id);
  if (!x || x.status === "cancel") return;
  patchX(store, corpus, id, { status: "processing_auto_accept" });
  task(store, x, `Accepting suggestions: ${x.name}`, 90);
  later(id, PHASE_MS.accept, () => {
    if (xOf(store, corpus, id)?.status !== "processing_auto_accept") return;
    const all = store.get(ixSuggestionsAtom(`${corpus}|${id}`));
    const ids = new Set(found.map((r) => r.id));
    const pool = run.acceptFrom === "all" ? all : all.filter((r) => ids.has(r.id));
    const rows = pool.filter((r) => acceptable(r) && !r.accepted && r.current !== r.suggested && (run.overwrite === "all" || !r.current));
    acceptSuggestions(store, corpus, rows, x.property);
    finish(store, corpus, id, run, rows.length);
  });
}

function findPhase(store: Store, corpus: Corpus, id: string, run: IxRun) {
  const x = xOf(store, corpus, id);
  if (!x) return;
  const targets = findTargets(store, corpus, x, run);
  const total = targets.length;
  let done = 0;
  const step = () => {
    const cur = xOf(store, corpus, id);
    if (!cur || cur.status !== "processing_suggestions") return;
    const n = Math.max(1, Math.ceil(total / 8));
    const batch = targets.slice(done, done + n);
    for (const r of batch) upsertState(store, corpus, r.id, { processed: true });
    done = Math.min(total, done + n);
    patchX(store, corpus, id, { progress: { processed: done, total } });
    task(store, cur, `Finding suggestions: ${cur.name}`, total ? Math.round((done / total) * 85) : 85);
    if (done < total) later(id, PHASE_MS.findStep, step);
    else if (run.autoAccept) autoAccept(store, corpus, id, run, targets);
    else finish(store, corpus, id, run, 0);
  };
  patchX(store, corpus, id, { status: "processing_suggestions", progress: { processed: 0, total } });
  if (total === 0) return run.autoAccept ? autoAccept(store, corpus, id, run, []) : finish(store, corpus, id, run, 0);
  later(id, PHASE_MS.findStep, step);
}

/** Start a train or process run. A Dev panel "Run" failure ends it at once
 *  with "Error" and its reason. Returns false when it failed. */
export function startRun(store: Store, corpus: Corpus, id: string, run: IxRun): boolean {
  const x = xOf(store, corpus, id);
  if (!x) return false;
  const reason = store.set(consumeFailureAtom, "run");
  if (reason) {
    patchX(store, corpus, id, { status: "error", error: reason, lastRun: run, progress: undefined });
    store.set(toastsAtom, (p) => [...p, { id: `ix-${id}-${Date.now()}`, type: "error", message: SETTINGS_NOTICES.error, detail: reason }]);
    return false;
  }
  patchX(store, corpus, id, { lastRun: run, error: undefined });
  if (run.kind === "train") {
    patchX(store, corpus, id, { status: "sending_labeled_data" });
    task(store, x, `Training model: ${x.name}`, 5);
    later(id, PHASE_MS.send, () => {
      if (xOf(store, corpus, id)?.status !== "sending_labeled_data") return;
      patchX(store, corpus, id, { status: "processing_model" });
      task(store, x, `Training model: ${x.name}`, 30);
      later(id, PHASE_MS.train, () => {
        if (xOf(store, corpus, id)?.status !== "processing_model") return;
        if (run.find > 0) findPhase(store, corpus, id, run);
        else finish(store, corpus, id, run, 0);
      });
    });
  } else if (run.find > 0) {
    task(store, x, `Finding suggestions: ${x.name}`, 0);
    findPhase(store, corpus, id, run);
  } else {
    task(store, x, `Accepting suggestions: ${x.name}`, 0);
    autoAccept(store, corpus, id, run, []);
  }
  return true;
}

/** Cancel the run: "Canceling..." then ready; from an error, ready at once. */
export function cancelRun(store: Store, corpus: Corpus, id: string) {
  const x = xOf(store, corpus, id);
  if (!x || x.status === "ready") return;
  clearTimeout(timers.get(id));
  timers.delete(id);
  endTask(store, x, false);
  if (x.status === "error") return patchX(store, corpus, id, { status: "ready", error: undefined, progress: undefined });
  patchX(store, corpus, id, { status: "cancel" });
  later(id, PHASE_MS.cancel, () => patchX(store, corpus, id, { status: "ready", progress: undefined }));
}

/** After a reload: a run still marked as running has no timer. Start it
 *  again from its own beginning, or settle a cancel. */
export function resumeRuns(store: Store, corpus: Corpus) {
  for (const x of store.get(ixExtractors.listOfAtom(corpus))) {
    if (timers.has(x.id) || x.status === "ready" || x.status === "error") continue;
    if (x.status === "cancel" || !x.lastRun) {
      patchX(store, corpus, x.id, { status: "ready", progress: undefined });
      continue;
    }
    startRun(store, corpus, x.id, x.lastRun);
  }
}

/** Running statuses, for the buttons. */
export const isRunning = (s: IxRunStatus) => s !== "ready" && s !== "error";
