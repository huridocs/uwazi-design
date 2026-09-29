/* The same DataSource over a real Uwazi instance's public API. STUBBED.
 *
 * Nothing in this prototype calls a live instance — not summa.cejil.org, not
 * any other. The methods below document which endpoint each call maps to and
 * how the answer would be reshaped; each one throws until a deployment wires a
 * base URL it is allowed to use (and, in production, calls it server-side: see
 * sites/README.md, "What a real deployment needs").
 *
 *   info        GET /api/settings            → site name, languages
 *               GET /api/search?limit=0      → totalRows
 *   templates   GET /api/templates           → [{ _id, name, color, properties }]
 *   thesauri    GET /api/thesauris           → [{ _id, name, values }]
 *   search      GET /api/search?searchTerm=&types=["<tpl>"]&filters={...}
 *                   &sort=metadata.<date>|title|creationDate&order=desc&limit=&from=
 *                   → { rows, totalRows }  (rows = entities, public only)
 *   aggregate   the same /api/search call with `aggregations` read back
 *               (Uwazi returns per-property buckets for filterable properties;
 *                year/decade buckets are computed from the date property)
 *   entity      GET /api/entities?sharedId=<id>&omitRelationships=false
 *   entities    GET /api/entities?ids=[...] (or one search with `ids`)
 *
 * Uwazi's metadata is `{ [prop]: [{ value, label? }] }`; `toEntity` flattens it
 * to `MetadataValue[]` against the template's property list, which is also
 * where `date`, `country` and `status` come from (the site config names which
 * property plays each role). */
import type { AggregateQuery, Bucket, CollectionInfo, DataSource, Entity, SearchQuery, SearchResult, Template, Thesaurus } from "./types";

export class UwaziApiSource implements DataSource {
  readonly kind = "uwazi" as const;
  constructor(readonly baseUrl: string) {}

  private refuse(endpoint: string): Error {
    return new Error(
      `UwaziApiSource is a stub: ${endpoint} on ${this.baseUrl} is not called from the prototype. Use the mock collections.`,
    );
  }

  info(): Promise<CollectionInfo> {
    return Promise.reject(this.refuse("GET /api/settings"));
  }
  templates(): Promise<Template[]> {
    return Promise.reject(this.refuse("GET /api/templates"));
  }
  thesauri(): Promise<Thesaurus[]> {
    return Promise.reject(this.refuse("GET /api/thesauris"));
  }
  search(_q: SearchQuery): Promise<SearchResult> {
    return Promise.reject(this.refuse("GET /api/search"));
  }
  aggregate(_q: AggregateQuery): Promise<Bucket[]> {
    return Promise.reject(this.refuse("GET /api/search (aggregations)"));
  }
  entity(_id: string): Promise<Entity | null> {
    return Promise.reject(this.refuse("GET /api/entities"));
  }
  entities(_ids: string[]): Promise<Entity[]> {
    return Promise.reject(this.refuse("GET /api/entities"));
  }
}
