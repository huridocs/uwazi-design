// Lazy loader for the Nepal corpus: records, references and thesauri are JSON
// assets under public/nepal-data, fetched the first time the collection is
// picked. After it resolves, the synchronous adapters (adapt.ts / profile.ts)
// read the indexes below, and everything that can reach a Nepal record gates
// on `nepalLoaded()` first. Travesía's loader is the same shape.
import { asset } from "../../utils/asset";
import type { NepalDoc, NepalEntity, NepalReference, NepalThesaurus } from "./types";
import type * as ProfileParts from "./profileParts";

export interface NepalCorpus {
  entities: NepalEntity[];
  references: NepalReference[];
  thesauri: NepalThesaurus[];
  docs: NepalDoc[];
}

let corpus: NepalCorpus | null = null;
const byId = new Map<string, NepalEntity>();
const refsByEntity = new Map<string, NepalReference[]>();
const docsById = new Map<string, NepalDoc>();
let parts: typeof ProfileParts | null = null;
let promise: Promise<NepalCorpus> | null = null;

/** Fetch and index the corpus once. Later calls return the cached promise. */
export function loadNepalData(): Promise<NepalCorpus> {
  if (corpus) return Promise.resolve(corpus);
  if (!promise) {
    const j = (n: string) =>
      fetch(asset(`/nepal-data/${n}`)).then((r) => {
        if (!r.ok) throw new Error(`Nepal: failed to load ${n} (${r.status})`);
        return r.json();
      });
    // docs.json is the bundled documents' text (about 550 kB): search reads it,
    // so it loads with the records. The PDFs and images load when shown.
    // The profile's document and media code is a chunk of its own, fetched
    // beside the data.
    promise = Promise.all([
      j("entities.json"),
      j("relationships.json"),
      j("thesauri.json"),
      j("docs.json"),
      import("./profileParts"),
    ])
      .then(([entities, references, thesauri, docs, profileParts]: [NepalEntity[], NepalReference[], NepalThesaurus[], NepalDoc[], typeof ProfileParts]) => {
        parts = profileParts;
        for (const x of entities) byId.set(x.sharedId, x);
        for (const d of docs) docsById.set(d.id, d);
        for (const ref of references) {
          for (const id of new Set([ref.from, ref.to])) {
            const arr = refsByEntity.get(id);
            if (arr) arr.push(ref);
            else refsByEntity.set(id, [ref]);
          }
        }
        corpus = { entities, references, thesauri, docs };
        return corpus;
      })
      .catch((err) => {
        // Not cached: a later call retries instead of wedging every consumer.
        promise = null;
        throw err;
      });
  }
  return promise;
}

export const nepalLoaded = () => corpus !== null;
export const nepalCorpus = () => corpus;
export const nepalEntity = (id: string) => byId.get(id);
export const nepalRefsByEntity = () => refsByEntity;
export const isNepalEntity = (id: string) => byId.has(id);
export const nepalDoc = (id: string) => docsById.get(id);
/** The profile's document and media builders (profileParts.ts), once loaded. */
export const nepalProfileParts = () => parts;
/** A bundled PDF's file id: what search passages and page jumps name. */
export const nepalDocFileId = (docId: string) => `np-doc-${docId}`;
/** The document a record shows: its primary attached PDF. */
export const nepalPrimaryDoc = (entityId: string) => {
  const id = byId.get(entityId)?.docs?.[0];
  return id ? docsById.get(id) : undefined;
};

/** The loaded thesauri in the Settings / thesauri-store shapes (empty until
 *  the corpus has loaded). Built once per load. */
let _settings: {
  list: { id: string; name: string; itemCount: number }[];
  values: Record<string, { id: string; label: string }[]>;
} | null = null;
export function nepalSettingsThesauri() {
  if (!corpus) return { list: [], values: {} };
  if (!_settings) {
    _settings = {
      list: corpus.thesauri.map((d) => ({ id: d._id, name: d.name, itemCount: d.values.length })),
      values: Object.fromEntries(corpus.thesauri.map((d) => [d._id, d.values.map((v) => ({ id: v.id, label: v.label }))])),
    };
  }
  return _settings;
}
