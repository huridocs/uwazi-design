// Lazy loader for the Travesía corpus. The generated entities and
// relationships and the thesauri are JSON assets under public/travesia-data,
// fetched the first time the source is picked — the Sample experience never
// pays for them. After it resolves, the synchronous adapters
// (adapt.ts / profile.ts) read the indexes below, and everything that can reach
// a Travesía record gates on `travesiaLoaded()` first. CEJIL's loader
// (data/cejil/load.ts) is the same shape.
import { asset } from "../../utils/asset";
import type { TravesiaEntity, TravesiaRelationship, TravesiaThesaurus } from "./types";

export interface TravesiaCorpus {
  entities: TravesiaEntity[];
  relationships: TravesiaRelationship[];
  thesauri: TravesiaThesaurus[];
}

let corpus: TravesiaCorpus | null = null;
const byId = new Map<string, TravesiaEntity>();
const relsByEntity = new Map<string, TravesiaRelationship[]>();
let promise: Promise<TravesiaCorpus> | null = null;

/** Import + index the corpus once. Later calls return the cached promise. */
export function loadTravesiaData(): Promise<TravesiaCorpus> {
  if (corpus) return Promise.resolve(corpus);
  if (!promise) {
    const j = (n: string) =>
      fetch(asset(`/travesia-data/${n}`)).then((r) => {
        if (!r.ok) throw new Error(`Travesía: failed to load ${n} (${r.status})`);
        return r.json();
      });
    promise = Promise.all([j("entities.json"), j("relationships.json"), j("thesauri.json")])
      .then(([entities, relationships, thesauri]: [TravesiaEntity[], TravesiaRelationship[], TravesiaThesaurus[]]) => {
        for (const x of entities) byId.set(x.sharedId, x);
        for (const rel of relationships) {
          for (const id of new Set([rel.from, rel.to])) {
            const arr = relsByEntity.get(id);
            if (arr) arr.push(rel);
            else relsByEntity.set(id, [rel]);
          }
        }
        corpus = { entities, relationships, thesauri };
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

export const travesiaLoaded = () => corpus !== null;
export const travesiaCorpus = () => corpus;
export const travesiaEntity = (id: string) => byId.get(id);
export const travesiaRelsByEntity = () => relsByEntity;
export const isTravesiaEntity = (id: string) => byId.has(id);

/** The loaded thesauri in the Settings / thesauri-store shapes (empty until
 *  the corpus has loaded). Built once per load. */
let _settings: {
  list: { id: string; name: string; itemCount: number }[];
  values: Record<string, { id: string; label: string; values?: { id: string; label: string }[] }[]>;
} | null = null;
export function travesiaSettingsThesauri() {
  if (!corpus) return { list: [], values: {} };
  if (!_settings) {
    _settings = {
      list: corpus.thesauri.map((d) => ({
        id: d._id,
        name: d.name,
        itemCount: d.values.reduce((n, v) => n + 1 + (v.values?.length ?? 0), 0),
      })),
      values: Object.fromEntries(
        corpus.thesauri.map((d) => [
          d._id,
          d.values.map((v) => ({
            id: v.id,
            label: v.label,
            ...(v.values ? { values: v.values.map((c) => ({ id: c.id, label: c.label })) } : {}),
          })),
        ]),
      ),
    };
  }
  return _settings;
}
