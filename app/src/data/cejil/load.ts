// Lazy loader for the full CEJIL corpus. The heavy entity / relationship / file
// / fullText data lives as JSON assets under public/cejil-data and is fetched
// once, on demand, when the CEJIL data source is activated — so the default
// (Sample) experience never pays for it and the bundle stays lean.
//
// After the fetch resolves, the raw arrays + derived indexes live in module
// state; the synchronous adapters (adapt.ts / profile.ts) read them through the
// getters below. UI that can reach CEJIL records (the Library, and anything
// downstream of it) gates on `cejilLoaded()` so those getters are only consulted
// once the corpus is present.
import type { CejilEntity, CejilRelationship, CejilFile } from "./types";

export interface CejilCorpus {
  entities: CejilEntity[];
  relationships: CejilRelationship[];
  files: CejilFile[];
  fullText: Record<string, string[]>;
}

let corpus: CejilCorpus | null = null;
const bySidLang = new Map<string, CejilEntity>();
const esBySid = new Map<string, CejilEntity>();
const relsByEntity = new Map<string, CejilRelationship[]>();
const filesBySid = new Map<string, CejilFile[]>();
const sharedIds = new Set<string>();

let promise: Promise<CejilCorpus> | null = null;

/** Fetch + index the corpus once. Subsequent calls return the cached promise. */
export function loadCejilData(): Promise<CejilCorpus> {
  if (corpus) return Promise.resolve(corpus);
  if (!promise) {
    const base = import.meta.env.BASE_URL || "/";
    const j = (n: string) =>
      fetch(`${base}cejil-data/${n}`).then((r) => {
        if (!r.ok) throw new Error(`CEJIL: failed to load ${n} (${r.status})`);
        return r.json();
      });
    promise = (async () => {
      const [entities, relationships, files, fullText] = (await Promise.all([
        j("entities.json"),
        j("relationships.json"),
        j("files.json"),
        j("fullText.json"),
      ])) as [CejilEntity[], CejilRelationship[], CejilFile[], Record<string, string[]>];

      for (const e of entities) {
        bySidLang.set(`${e.sharedId}::${e.language}`, e);
        if (e.language === "es") esBySid.set(e.sharedId, e);
        sharedIds.add(e.sharedId);
      }
      for (const r of relationships) {
        for (const sid of new Set([r.from, r.to])) {
          const arr = relsByEntity.get(sid);
          if (arr) arr.push(r);
          else relsByEntity.set(sid, [r]);
        }
      }
      for (const f of files) {
        const arr = filesBySid.get(f.entity);
        if (arr) arr.push(f);
        else filesBySid.set(f.entity, [f]);
      }

      corpus = { entities, relationships, files, fullText };
      return corpus;
    })().catch((err) => {
      // Don't cache the rejection — clearing the promise lets a later call
      // retry the fetch instead of wedging every consumer forever.
      promise = null;
      throw err;
    });
  }
  return promise;
}

export const cejilLoaded = (): boolean => corpus !== null;
export const cejilCorpus = (): CejilCorpus | null => corpus;
export const cejilBySidLang = (): Map<string, CejilEntity> => bySidLang;
export const cejilEsBySid = (): Map<string, CejilEntity> => esBySid;
export const cejilRelsByEntity = (): Map<string, CejilRelationship[]> => relsByEntity;
export const cejilFilesBySid = (): Map<string, CejilFile[]> => filesBySid;
export const cejilSharedIdSet = (): Set<string> => sharedIds;
export const cejilFullText = (): Record<string, string[]> => corpus?.fullText ?? {};
