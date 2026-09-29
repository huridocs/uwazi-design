import type {
  AggregateQuery,
  Bucket,
  CollectionId,
  CollectionInfo,
  DataSource,
  Entity,
  GroupBy,
  SearchQuery,
  SearchResult,
  Template,
  Thesaurus,
} from "./types";

interface SeedFile {
  collection: Omit<CollectionInfo, "total">;
  templates: Template[];
  thesauri: Thesaurus[];
  entities: Entity[];
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const yearOf = (e: Entity) => (e.date ? String(new Date(e.date).getUTCFullYear()) : undefined);

/** The value(s) an entity holds for a filter or grouping key. */
export function valuesOf(e: Entity, key: string): string[] {
  if (key === "country") return e.country ? [e.country] : [];
  if (key === "status") return e.status ? [e.status] : [];
  if (key === "year") return yearOf(e) ? [yearOf(e)!] : [];
  if (key === "decade") return e.date ? [`${Math.floor(new Date(e.date).getUTCFullYear() / 10) * 10}s`] : [];
  if (key === "template") return [e.template];
  if (key === "date") return e.date ? [new Date(e.date).toISOString().slice(0, 10)] : [];
  return e.metadata.find((m) => m.name === key)?.values ?? [];
}

/** Reads a seed exported by scripts/export-seed.mjs. Loaded once, then every
 *  query runs in memory. The delay is there so loading states are seen. */
export class MockSource implements DataSource {
  readonly kind = "mock" as const;
  private seed: Promise<SeedFile>;
  private index?: Promise<{ byId: Map<string, Entity>; text: Map<string, string>; degree: Map<string, number> }>;

  constructor(readonly collection: CollectionId, base = import.meta.env.BASE_URL) {
    this.seed = fetch(`${base}data/${collection}.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load the ${collection} collection (${r.status}).`);
      return r.json() as Promise<SeedFile>;
    });
  }

  private idx() {
    return (this.index ??= this.seed.then((s) => {
      const byId = new Map(s.entities.map((e) => [e.id, e]));
      const text = new Map(
        s.entities.map((e) => [e.id, fold([e.title, e.summary ?? "", e.country ?? "", ...e.metadata.flatMap((m) => m.values)].join(" "))]),
      );
      const degree = new Map(s.entities.map((e) => [e.id, e.links.length]));
      return { byId, text, degree };
    }));
  }

  async info(): Promise<CollectionInfo> {
    const s = await this.seed;
    return { ...s.collection, total: s.entities.length };
  }
  async templates() {
    return (await this.seed).templates;
  }
  async thesauri() {
    return (await this.seed).thesauri;
  }

  private async filter(q: { text?: string; template?: string; filters?: Record<string, string[]>; withImage?: boolean; withGeo?: boolean }) {
    const s = await this.seed;
    const { text } = await this.idx();
    const terms = q.text ? fold(q.text).split(/\s+/).filter(Boolean) : [];
    return s.entities.filter((e) => {
      if (q.template && e.template !== q.template) return false;
      if (q.withImage && !e.image) return false;
      if (q.withGeo && !e.geo) return false;
      for (const [k, accepted] of Object.entries(q.filters ?? {})) {
        if (!accepted.length) continue;
        const vals = valuesOf(e, k);
        if (!accepted.some((a) => vals.includes(a))) return false;
      }
      if (terms.length) {
        const t = text.get(e.id)!;
        if (!terms.every((w) => t.includes(w))) return false;
      }
      return true;
    });
  }

  async search(q: SearchQuery): Promise<SearchResult> {
    const found = await this.filter(q);
    const { degree } = await this.idx();
    const sorted = [...found];
    if (q.sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (q.sort === "connected") sorted.sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));
    else if (q.sort === "oldest") sorted.sort((a, b) => (a.date ?? Infinity) - (b.date ?? Infinity));
    else sorted.sort((a, b) => (b.date ?? -Infinity) - (a.date ?? -Infinity));
    const offset = q.offset ?? 0;
    return { rows: sorted.slice(offset, offset + (q.limit ?? 20)), total: found.length };
  }

  async aggregate(q: AggregateQuery): Promise<Bucket[]> {
    const found = await this.filter(q);
    const key = typeof q.by === "string" ? q.by : q.by.property;
    const counts = new Map<string, number>();
    for (const e of found) for (const v of valuesOf(e, key)) counts.set(v, (counts.get(v) ?? 0) + 1);
    const s = await this.seed;
    const tname = new Map(s.templates.map((t) => [t.id, t.name]));
    const buckets = [...counts.entries()].map(([k, count]) => ({ key: k, label: key === "template" ? (tname.get(k) ?? k) : k, count }));
    return chronological(q.by) ? buckets.sort((a, b) => a.key.localeCompare(b.key)) : buckets.sort((a, b) => b.count - a.count);
  }

  async entity(id: string) {
    return (await this.idx()).byId.get(id) ?? null;
  }
  async entities(ids: string[]) {
    const { byId } = await this.idx();
    return ids.map((id) => byId.get(id)).filter((e): e is Entity => !!e);
  }
}

const chronological = (by: GroupBy) => by === "year" || by === "decade";
