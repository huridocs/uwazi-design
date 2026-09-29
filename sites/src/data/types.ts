/* The data a public site reads, and the one interface every source implements.
 *
 * A site never reads a collection directly: every block asks a DataSource. The
 * mock reads the prototype's seeds exported as JSON (scripts/export-seed.mjs);
 * `UwaziApiSource` is the same interface over a real instance's public API. A
 * block written against this file works on either. */

export type CollectionId = "sample" | "cejil" | "artworks";

export interface CollectionInfo {
  id: string;
  name: string;
  description: string;
  /** Languages the collection's data carries, first = default. */
  languages: string[];
  total: number;
}

export interface Property {
  name: string;
  label: string;
  type: "text" | "date" | "select" | "multiselect" | "relationship" | "link" | "country" | string;
}

export interface Template {
  id: string;
  name: string;
  color: string;
  properties: Property[];
}

export interface Thesaurus {
  /** The property name the values come from. */
  id: string;
  name: string;
  values: { id: string; label: string; count: number }[];
}

export interface MetadataValue {
  name: string;
  label: string;
  type: Property["type"];
  values: string[];
  /** For relationship values: the connected entities' ids, in order. */
  ids?: string[];
}

export interface EntityImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/** One step of a dated status history (Monitoring). */
export interface StatusStep {
  state: string;
  date: number;
}

export interface Entity {
  id: string;
  title: string;
  template: string;
  /** The entity's own date, in ms — the one a timeline or "latest" reads. */
  date?: number;
  country?: string;
  geo?: { lat: number; lng: number };
  status?: string;
  history?: StatusStep[];
  summary?: string;
  image?: EntityImage;
  metadata: MetadataValue[];
  links: { id: string; rel: string }[];
}

export type Sort = "recent" | "oldest" | "title" | "connected";

export interface SearchQuery {
  text?: string;
  template?: string;
  /** property name → accepted values. `country`, `status` and `year` are
   *  understood as well as template properties. */
  filters?: Record<string, string[]>;
  sort?: Sort;
  limit?: number;
  offset?: number;
  withImage?: boolean;
  withGeo?: boolean;
}

export interface SearchResult {
  rows: Entity[];
  total: number;
}

export type GroupBy = "template" | "country" | "status" | "year" | "decade" | { property: string };

export interface AggregateQuery {
  by: GroupBy;
  template?: string;
  filters?: Record<string, string[]>;
  text?: string;
}

export interface Bucket {
  key: string;
  label: string;
  count: number;
}

export interface DataSource {
  readonly kind: "mock" | "uwazi";
  info(): Promise<CollectionInfo>;
  templates(): Promise<Template[]>;
  thesauri(): Promise<Thesaurus[]>;
  search(q: SearchQuery): Promise<SearchResult>;
  aggregate(q: AggregateQuery): Promise<Bucket[]>;
  entity(id: string): Promise<Entity | null>;
  entities(ids: string[]): Promise<Entity[]>;
}
