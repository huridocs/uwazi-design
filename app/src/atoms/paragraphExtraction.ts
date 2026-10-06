import { atom, useStore } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Corpus } from "../data/entityOverlay";
import { hashOf } from "../data/extraction";
import { PARAGRAPH_SENTENCES, type PxExtractor, type PxStatus } from "../data/paragraphs";
import { createSettingsCollection, hasId } from "./settingsCollection";
import { libraryEntitiesAtom } from "./dataSource";
import { activitiesAtom as tasksAtom } from "./notifications";
import { toastsAtom } from "./references";
import { appendActivityAtom } from "./activityLog";
import { consumeFailureAtom } from "./devSwitches";
import { SETTINGS_NOTICES } from "../data/settingsNotices";

/** Settings › Paragraph extraction: the extractors, and each source entity's
 *  extraction status, per collection. A row's paragraphs are derived from
 *  the entity (the mock's text), so the counts the pages show always come
 *  from the same place. */

const isExtractor = (r: unknown): boolean => {
  if (!hasId(r)) return false;
  const x = r as Partial<PxExtractor>;
  return typeof x.sourceTemplateId === "string" && typeof x.targetTemplateId === "string" && typeof x.created === "number";
};

export const pxExtractors = createSettingsCollection<PxExtractor>({
  name: "px-extractors",
  idPrefix: "px",
  // Every collection starts with none (`data/paragraphs.ts`).
  seedOf: () => [],
  corpusScoped: true,
  isRecord: isExtractor,
});

interface StatusRecord {
  id: string;
  status: PxStatus;
  /** With `error`. */
  reason?: string;
}

export const pxStatuses = createSettingsCollection<StatusRecord>({
  name: "px-statuses",
  idPrefix: "pxs",
  seedOf: () => [],
  corpusScoped: true,
});

export interface PxRow {
  id: string;
  entityId: string;
  title: string;
  status: PxStatus;
  reason?: string;
  /** Languages that have paragraphs, main first. */
  languages: string[];
  paragraphs: number;
}

export interface PxParagraph {
  number: number;
  language: string;
  text: string;
}

const LANGS = ["en", "es"];

/** A seeded extractor's history: most entities processed, some new,
 *  obsolete or errored. A new extractor starts every entity at New. */
function baseStatus(x: PxExtractor, h: number): PxStatus {
  if (!x.seeded) return "new";
  const r = h % 20;
  return r < 12 ? "processed" : r < 16 ? "new" : r < 18 ? "obsolete" : r === 18 ? "error" : "new";
}

const countOf = (h: number) => 3 + ((h >>> 4) % 7);

/** An entity's paragraphs: the main language, then each other language. */
export function paragraphsOf(xId: string, entityId: string): PxParagraph[] {
  const h = hashOf(`${xId}:${entityId}`);
  const out: PxParagraph[] = [];
  for (let n = 1; n <= countOf(h); n++)
    for (const language of LANGS) {
      const pool = PARAGRAPH_SENTENCES[language as "en" | "es"];
      const k = (h >>> n) % pool.length;
      // Every third paragraph runs long, so the 200-character cut shows.
      const text = n % 3 === 0 ? [pool[k], pool[(k + 1) % pool.length], pool[(k + 2) % pool.length]].join(" ") : pool[k];
      out.push({ number: n, language, text });
    }
  return out;
}

/** One extractor's rows, `${corpus}|${id}`: the entities of its source
 *  template in the collection shown. */
export const pxRowsAtom = atomFamily((key: string) =>
  atom<PxRow[]>((get) => {
    const [corpus, id] = key.split("|") as [Corpus, string];
    const x = get(pxExtractors.listOfAtom(corpus)).find((e) => e.id === id);
    if (!x) return [];
    const states = new Map(get(pxStatuses.listOfAtom(corpus)).map((s) => [s.id, s]));
    return get(libraryEntitiesAtom)
      .filter((e) => e.typeId === x.sourceTemplateId)
      .map((e) => {
        const rid = `${x.id}|${e.id}`;
        const h = hashOf(`${x.id}:${e.id}`);
        const s = states.get(rid);
        const status = s?.status ?? baseStatus(x, h);
        const has = status === "processed" || status === "obsolete";
        return {
          id: rid,
          entityId: e.id,
          title: e.title,
          status,
          reason: s?.reason,
          languages: has ? LANGS : [],
          paragraphs: has ? countOf(h) : 0,
        };
      });
  }),
);

/* ── Writes ──────────────────────────────────────────────────────────── */

type Store = ReturnType<typeof useStore>;

function setStatus(store: Store, corpus: Corpus, id: string, status: PxStatus, reason?: string) {
  const exists = store.get(pxStatuses.listOfAtom(corpus)).some((s) => s.id === id);
  if (exists) store.set(pxStatuses.patchAtom, { id, patch: { status, reason }, corpus });
  else store.set(pxStatuses.restoreAtom, { record: { id, status, reason }, corpus });
}

let seq = 0;
/** Rows with a timer running. A reload drops the timers; `resumeExtraction`
 *  finishes the rows still marked Processing. */
const active = new Set<string>();

/** Extract paragraphs for these rows (Uwazi's `extract`): each goes
 *  Processing, then Processed on a timer, its old paragraphs replaced. A row
 *  already processing is skipped. A Dev panel "Run" failure sends them to
 *  Error with its reason. Returns how many started. */
export function extractParagraphs(store: Store, corpus: Corpus, x: PxExtractor, rows: PxRow[], sourceName: string): number {
  const todo = rows.filter((r) => r.status !== "processing");
  if (!todo.length) return 0;
  const reason = store.set(consumeFailureAtom, "run");
  if (reason) {
    for (const r of todo) setStatus(store, corpus, r.id, "error", reason);
    store.set(toastsAtom, (p) => [...p, { id: `px-err-${Date.now()}`, type: "error", message: SETTINGS_NOTICES.error, detail: reason }]);
    return 0;
  }
  for (const r of todo) setStatus(store, corpus, r.id, "processing");
  const taskId = `px-${x.id}-${++seq}`;
  store.set(tasksAtom, (p) => [
    ...p,
    {
      id: taskId,
      label: "Extracting paragraphs",
      detail: sourceName,
      current: 0,
      total: todo.length,
      driven: true,
      done: { title: "Paragraphs extracted", detail: `${todo.length.toLocaleString()} ${sourceName} entities` },
    },
  ]);
  let done = 0;
  todo.forEach((r, i) => {
    active.add(r.id);
    setTimeout(() => {
      active.delete(r.id);
      // Deleted meanwhile, or reset: nothing to finish.
      if (!store.get(pxExtractors.listOfAtom(corpus)).some((e) => e.id === x.id)) return;
      setStatus(store, corpus, r.id, "processed");
      done++;
      store.set(tasksAtom, (p) => p.map((t) => (t.id === taskId ? { ...t, current: done } : t)));
      if (done === todo.length)
        store.set(appendActivityAtom, {
          method: "UPDATE",
          summary: `Extracted paragraphs for ${todo.length.toLocaleString()} ${sourceName} entities`,
          domain: "paragraph-extractor",
          targetId: x.id,
          scope: corpus,
        });
    }, 1500 + i * 400);
  });
  return todo.length;
}

/** After a reload: rows left Processing have no timer; finish them. */
export function resumeExtraction(store: Store, corpus: Corpus, x: PxExtractor, sourceName: string) {
  const stuck = store.get(pxRowsAtom(`${corpus}|${x.id}`)).filter((r) => r.status === "processing" && !active.has(r.id));
  if (!stuck.length) return;
  for (const r of stuck) setStatus(store, corpus, r.id, "new");
  extractParagraphs(store, corpus, x, stuck.map((r) => ({ ...r, status: "new" as const })), sourceName);
}
