// Lazy loader for the Vegas corpus: records, references and thesauri are JSON
// assets under public/vegas-data, fetched the first time the collection is
// picked. After it resolves, the synchronous adapters (adapt.ts / profile.ts)
// read the indexes below, and everything that can reach a Vegas record gates
// on `vegasLoaded()` first. Nepal's loader is the same shape.
import { asset } from "../../utils/asset";
import type { VegasEntity, VegasReference, VegasThesaurus } from "./types";
import type { FieldEvidence } from "../fieldEvidence";

export interface VegasCorpus {
  entities: VegasEntity[];
  references: VegasReference[];
  thesauri: VegasThesaurus[];
}

let corpus: VegasCorpus | null = null;
const byId = new Map<string, VegasEntity>();
const refsByEntity = new Map<string, VegasReference[]>();
let promise: Promise<VegasCorpus> | null = null;

/** Fetch and index the corpus once. Later calls return the cached promise. */
export function loadVegasData(): Promise<VegasCorpus> {
  if (corpus) return Promise.resolve(corpus);
  if (!promise) {
    const j = (n: string) =>
      fetch(asset(`/vegas-data/${n}`)).then((r) => {
        if (!r.ok) throw new Error(`Las Vegas: failed to load ${n} (${r.status})`);
        return r.json();
      });
    promise = Promise.all([j("entities.json"), j("relationships.json"), j("thesauri.json")])
      .then(([entities, references, thesauri]: [VegasEntity[], VegasReference[], VegasThesaurus[]]) => {
        for (const x of entities) byId.set(x.sharedId, x);
        for (const ref of references) {
          for (const id of new Set([ref.from, ref.to])) {
            const arr = refsByEntity.get(id);
            if (arr) arr.push(ref);
            else refsByEntity.set(id, [ref]);
          }
        }
        corpus = { entities, references, thesauri };
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

/** Per-property evidence (evidence.json, about 0.3 MB): fetched the first
 *  time a record shows its sources, as Nepal's. */
let evidence: Record<string, FieldEvidence[]> | null = null;
let evidencePromise: Promise<Record<string, FieldEvidence[]>> | null = null;
export function loadVegasEvidence(): Promise<Record<string, FieldEvidence[]>> {
  if (evidence) return Promise.resolve(evidence);
  if (!evidencePromise) {
    evidencePromise = fetch(asset("/vegas-data/evidence.json"))
      .then((r) => {
        if (!r.ok) throw new Error(`Las Vegas: failed to load evidence.json (${r.status})`);
        return r.json();
      })
      .then((x: Record<string, FieldEvidence[]>) => (evidence = x))
      .catch((err) => {
        evidencePromise = null;
        throw err;
      });
  }
  return evidencePromise;
}
/** A record's evidence rows: undefined until loaded, [] when it has none. */
export const vegasEvidence = (id: string): FieldEvidence[] | undefined =>
  evidence ? (evidence[id] ?? []) : undefined;

export const vegasLoaded = () => corpus !== null;
export const vegasCorpus = () => corpus;
export const vegasEntity = (id: string) => byId.get(id);
export const vegasRefsByEntity = () => refsByEntity;
export const isVegasEntity = (id: string) => byId.has(id);

/** The loaded thesauri in the Settings / thesauri-store shapes (empty until
 *  the corpus has loaded). Built once per load. */
let _settings: {
  list: { id: string; name: string; itemCount: number }[];
  values: Record<string, { id: string; label: string }[]>;
} | null = null;
export function vegasSettingsThesauri() {
  if (!corpus) return { list: [], values: {} };
  if (!_settings) {
    _settings = {
      list: corpus.thesauri.map((d) => ({ id: d._id, name: d.name, itemCount: d.values.length })),
      values: Object.fromEntries(corpus.thesauri.map((d) => [d._id, d.values.map((v) => ({ id: v.id, label: v.label }))])),
    };
  }
  return _settings;
}
