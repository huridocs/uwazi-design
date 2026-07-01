// AUTO-GENERATED source — kept in scripts/ and copied to data/cejil/types.ts.
// Shapes mirror the Uwazi Mongo documents (and the Postgres JSONB lift-and-shift
// target): metadata / properties / values stay as document-shaped blobs.

/** Baked corpus aggregates (counts only — no heavy data), so Settings and the
 *  Dashboard render without fetching the lazy-loaded JSON. */
export interface CejilStats {
  entities: number;
  entityDocs: number;
  relationships: number;
  files: number;
  pdfs: number;
  fullTextDocs: number;
  templates: number;
  thesauri: number;
  relationTypes: number;
  languages: number;
}

export interface CejilTemplateProperty {
  name: string;
  label: string;
  type: string;
  /** relationship props: target relation type + target template */
  relationType?: string;
  content?: string;
  /** single-level inheritance of one native property from connected entities */
  inherit?: { property: string; type: string };
}

export interface CejilTemplate {
  _id: string;
  name: string;
  color: string | null;
  default: boolean;
  commonProperties: CejilTemplateProperty[];
  properties: CejilTemplateProperty[];
}

export interface CejilThesaurusValue {
  id: string;
  label: string;
  values?: CejilThesaurusValue[];
}
export interface CejilThesaurus {
  _id: string;
  name: string;
  values: CejilThesaurusValue[];
}

export interface CejilRelationType {
  _id: string;
  name: string;
}

/** A metadata value as stored in Uwazi: `value` plus denormalized `label`/`icon`
 *  for select + relationship + inherited values. Heterogeneous by design. */
export interface CejilMetaValue {
  value: unknown;
  label?: string;
  icon?: unknown;
  type?: string;
  [k: string]: unknown;
}

export interface CejilEntity {
  _id: string;
  sharedId: string;
  language: string;
  title: string;
  template: string;
  templateName: string | null;
  published: boolean;
  metadata: Record<string, CejilMetaValue[]>;
}

/** Hub-collapsed pairwise edge (case-centric where a Causa is in the hub). */
export interface CejilRelationship {
  from: string;
  to: string;
  type: string | null;
  typeName: string | null;
  hub: string;
  reference?: { text: string; page?: string };
}

export interface CejilTocEntry {
  label: string;
  indentation: number;
  range?: unknown;
}

export interface CejilFile {
  _id: string;
  entity: string;
  language: string;
  filename: string;
  originalname: string;
  mimetype: string;
  totalPages: number | null;
  isPdf: boolean;
  /** the case's featured document (carries fullText + a downloaded PDF) */
  primary: boolean;
  /** public path under /cejil-docs when the binary was fetched, else null */
  url: string | null;
  toc?: CejilTocEntry[];
}

export interface CejilMenuLink {
  id: string;
  title: string;
  url: string;
  type: "link" | "group";
}

export interface CejilPage {
  id: string;
  title: string;
  slug: string;
  published: boolean;
}

/** A library filter node: a template leaf (`id`) or a named group of leaves. */
export interface CejilFilterNode {
  id?: string;
  name: string;
  items?: CejilFilterNode[];
}

export interface CejilSettings {
  siteName: string;
  defaultLibraryView: string;
  dateFormat: string;
  languages: { key: string; label: string; default: boolean }[];
  /** The curated library filter config (real summa.cejil.org grouping). */
  filters: CejilFilterNode[];
}
