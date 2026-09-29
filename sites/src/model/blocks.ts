/* The block registry: what each block is called, where it may go, what it
 * starts with, and which fields its form shows. The builder's block forms are
 * generated from `fields`, so adding a block is one entry here and one
 * component in render/blocks. */
import type { Block, BlockProps, BlockType, L10n, PageKind } from "./config";
import { newId } from "./config";

export type FieldKind =
  | "l10n"
  | "l10nLong"
  | "text"
  | "number"
  | "select"
  | "template"
  | "key"
  | "keys"
  | "toggle"
  | "image"
  | "entities"
  | "stats"
  | "lines";

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  /** Shown only when this returns true for the block's current props. */
  when?: (p: Record<string, unknown>) => boolean;
  /** For `key`: options offered before the collection's own keys. */
  extra?: { value: string; label: string }[];
  /** For `key` / `keys`: which keys the picker offers. */
  keyKinds?: ("dates" | "values" | "all")[];
}

export type BlockGroup = "Content" | "Collection" | "Action" | "Entity";

export interface BlockDef<T extends BlockType = BlockType> {
  label: string;
  hint: string;
  group: BlockGroup;
  /** Page kinds this block can be added to. */
  on: PageKind[];
  defaults: (ctx: { main?: string }) => BlockProps[T];
  fields: Field[];
}

const L = (en: string, es = ""): L10n => (es ? { en, es } : { en });
const ALL: PageKind[] = ["home", "list", "about", "custom", "entity"];
const PAGES: PageKind[] = ["home", "about", "custom"];

const title: Field = { key: "title", label: "Heading", kind: "l10n" };
const template: Field = { key: "template", label: "From", kind: "template" };

export const BLOCKS: { [T in BlockType]: BlockDef<T> } = {
  hero: {
    label: "Hero",
    hint: "The page's opening: a title, a line under it, an optional picture and button.",
    group: "Content",
    on: PAGES,
    defaults: () => ({ title: L("Welcome"), subtitle: L(""), ctaLabel: L(""), ctaHref: "", ctaKind: "none" }),
    fields: [
      { key: "title", label: "Title", kind: "l10n" },
      { key: "subtitle", label: "Line under the title", kind: "l10nLong" },
      { key: "image", label: "Picture", kind: "image" },
      {
        key: "ctaKind",
        label: "Button",
        kind: "select",
        options: [
          { value: "none", label: "No button" },
          { value: "link", label: "Link" },
          { value: "form", label: "Open a form" },
          { value: "signup", label: "Sign up" },
          { value: "donate", label: "Donate" },
        ],
      },
      { key: "ctaLabel", label: "Button text", kind: "l10n", when: (p) => p.ctaKind !== "none" },
      { key: "ctaHref", label: "Button link", kind: "text", when: (p) => p.ctaKind !== "none", hint: "A URL, or a page of this site like /about" },
    ],
  },
  search: {
    label: "Search box",
    hint: "Searches the collection and opens the results page.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ placeholder: L("Search the collection", "Buscar en la colección"), template: main }),
    fields: [{ key: "placeholder", label: "Placeholder", kind: "l10n" }, { ...template, label: "Searches" }],
  },
  facets: {
    label: "Browse by",
    hint: "Filter chips that open the results page already filtered.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ title: L("Browse by", "Explorar por"), template: main, keys: ["country"] }),
    fields: [title, template, { key: "keys", label: "Filters", kind: "keys", keyKinds: ["values"] }],
  },
  stats: {
    label: "Key numbers",
    hint: "Counters, each a live count of the collection.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ title: L(""), items: [{ id: newId("s"), label: L("Records", "Registros"), template: main }] }),
    fields: [title, { key: "items", label: "Numbers", kind: "stats" }],
  },
  statusBar: {
    label: "Status overview",
    hint: "One stacked bar: how many records are in each status.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ title: L("Where things stand", "Estado actual"), template: main, key: "status" }),
    fields: [title, template, { key: "key", label: "Status from", kind: "key", keyKinds: ["values"] }],
  },
  entityList: {
    label: "List of records",
    hint: "The latest, the most connected, or A–Z — as cards, a list or a table.",
    group: "Collection",
    on: ALL,
    defaults: ({ main }) => ({ title: L("Latest", "Lo más reciente"), template: main, sort: "recent", limit: 6, layout: "cards" }),
    fields: [
      title,
      template,
      {
        key: "sort",
        label: "Order",
        kind: "select",
        options: [
          { value: "recent", label: "Newest first" },
          { value: "oldest", label: "Oldest first" },
          { value: "connected", label: "Most connected" },
          { value: "title", label: "A–Z" },
        ],
      },
      { key: "limit", label: "How many", kind: "number", min: 1, max: 24 },
      {
        key: "layout",
        label: "Show as",
        kind: "select",
        options: [
          { value: "cards", label: "Cards" },
          { value: "list", label: "List" },
          { value: "table", label: "Table" },
        ],
      },
      { key: "filterKey", label: "Only where", kind: "key", keyKinds: ["values"], extra: [{ value: "", label: "Everything" }] },
      { key: "filterValue", label: "Equals", kind: "text", when: (p) => !!p.filterKey },
    ],
  },
  featured: {
    label: "Featured records",
    hint: "Records you choose, in the order you choose.",
    group: "Collection",
    on: PAGES,
    defaults: () => ({ title: L("Featured", "Destacados"), ids: [], lead: false }),
    fields: [title, { key: "ids", label: "Records", kind: "entities" }, { key: "lead", label: "First one larger", kind: "toggle" }],
  },
  topics: {
    label: "Topics",
    hint: "A grid of a property's values, each with its count.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ title: L("Topics", "Temas"), template: main, key: "country", limit: 12 }),
    fields: [title, template, { key: "key", label: "Values of", kind: "key", keyKinds: ["values"] }, { key: "limit", label: "How many", kind: "number", min: 3, max: 48 }],
  },
  map: {
    label: "Map",
    hint: "Every located record, clustered by place.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ title: L("Where", "Dónde"), template: main }),
    fields: [title, template],
  },
  chart: {
    label: "Chart",
    hint: "Counts over time, or by a property.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ title: L("Over time", "En el tiempo"), template: main, by: "year", kind: "columns" }),
    fields: [
      title,
      template,
      { key: "by", label: "Count by", kind: "key", keyKinds: ["dates", "values"] },
      {
        key: "kind",
        label: "Shape",
        kind: "select",
        options: [
          { value: "columns", label: "Columns" },
          { value: "bars", label: "Bars" },
        ],
      },
    ],
  },
  timeline: {
    label: "Timeline",
    hint: "Dated records on one line, oldest to newest.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ title: L("Timeline", "Cronología"), template: main, limit: 12 }),
    fields: [title, template, { key: "limit", label: "How many", kind: "number", min: 3, max: 40 }],
  },
  index: {
    label: "A–Z index",
    hint: "A directory: every record, or every value, under its letter.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ title: L("Index", "Índice"), template: main, key: "title" }),
    fields: [title, template, { key: "key", label: "Index of", kind: "key", keyKinds: ["values"], extra: [{ value: "title", label: "Titles" }], hint: "Titles, or the values of a property with their counts" }],
  },
  gallery: {
    label: "Picture grid",
    hint: "Records with a picture; opens each in a viewer.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ title: L(""), template: main, limit: 24, layout: "masonry" }),
    fields: [
      title,
      template,
      { key: "limit", label: "How many", kind: "number", min: 3, max: 60 },
      {
        key: "layout",
        label: "Arrangement",
        kind: "select",
        options: [
          { value: "masonry", label: "Masonry" },
          { value: "grid", label: "Even grid" },
        ],
      },
    ],
  },
  collections: {
    label: "Collections",
    hint: "One cover per value of a property — a genre, a place, a series.",
    group: "Collection",
    on: PAGES,
    defaults: ({ main }) => ({ title: L("Collections", "Colecciones"), template: main, key: "country" }),
    fields: [title, template, { key: "key", label: "Grouped by", kind: "key", keyKinds: ["values"] }],
  },
  table: {
    label: "Table",
    hint: "Records as rows, with the columns you pick.",
    group: "Collection",
    on: ALL,
    defaults: ({ main }) => ({ title: L(""), template: main, keys: ["country", "year"], limit: 12 }),
    fields: [title, template, { key: "keys", label: "Columns", kind: "keys", keyKinds: ["all"] }, { key: "limit", label: "Rows", kind: "number", min: 3, max: 50 }],
  },
  text: {
    label: "Text",
    hint: "Paragraphs. **bold**, [links](https://…), and lines starting with - become a list.",
    group: "Content",
    on: ALL,
    defaults: () => ({ title: L(""), body: L("") }),
    fields: [title, { key: "body", label: "Text", kind: "l10nLong" }],
  },
  quote: {
    label: "Quote",
    hint: "A pull quote with its source.",
    group: "Content",
    on: ALL,
    defaults: () => ({ text: L(""), attribution: L("") }),
    fields: [
      { key: "text", label: "Quote", kind: "l10nLong" },
      { key: "attribution", label: "Who said it", kind: "l10n" },
    ],
  },
  asks: {
    label: "What we're asking",
    hint: "A numbered list of demands.",
    group: "Action",
    on: PAGES,
    defaults: () => ({ title: L("What we're asking", "Lo que pedimos"), items: [L("")] }),
    fields: [title, { key: "items", label: "Asks", kind: "lines" }],
  },
  cta: {
    label: "Call to action",
    hint: "A band with one button: a link, a form, sign-up or donate.",
    group: "Action",
    on: ALL,
    defaults: () => ({ title: L("Get involved", "Participe"), body: L(""), label: L("Sign the petition", "Firme la petición"), href: "", kind: "link" }),
    fields: [
      title,
      { key: "body", label: "Text", kind: "l10nLong" },
      {
        key: "kind",
        label: "Button does",
        kind: "select",
        options: [
          { value: "link", label: "Opens a link" },
          { value: "form", label: "Opens a form" },
          { value: "signup", label: "Sign up by email" },
          { value: "donate", label: "Donate" },
        ],
      },
      { key: "label", label: "Button text", kind: "l10n" },
      { key: "href", label: "Link", kind: "text", when: (p) => p.kind === "link" || p.kind === "donate" },
    ],
  },
  share: {
    label: "Share",
    hint: "Share buttons for the page.",
    group: "Action",
    on: ALL,
    defaults: () => ({ title: L("Share", "Compartir") }),
    fields: [title],
  },
  contact: {
    label: "Contact",
    hint: "A short contact form that emails your team.",
    group: "Action",
    on: PAGES,
    defaults: () => ({ title: L("Contact", "Contacto"), body: L(""), email: "info@example.org" }),
    fields: [title, { key: "body", label: "Text", kind: "l10nLong" }, { key: "email", label: "Sends to", kind: "text" }],
  },
  results: {
    label: "Search results",
    hint: "The results page: search, filters and the matching records.",
    group: "Collection",
    on: ["list"],
    defaults: ({ main }) => ({ template: main, keys: ["country", "year"], layout: "list" }),
    fields: [
      template,
      { key: "keys", label: "Filters", kind: "keys", keyKinds: ["values", "dates"] },
      {
        key: "layout",
        label: "Show as",
        kind: "select",
        options: [
          { value: "list", label: "List" },
          { value: "cards", label: "Cards" },
          { value: "table", label: "Table" },
        ],
      },
    ],
  },
  entityHeader: {
    label: "Record title",
    hint: "The record's title, type and date.",
    group: "Entity",
    on: ["entity"],
    defaults: () => ({ showImage: true }),
    fields: [{ key: "showImage", label: "Show its picture", kind: "toggle" }],
  },
  entityFields: {
    label: "Properties",
    hint: "The record's metadata. Leave empty to show all.",
    group: "Entity",
    on: ["entity"],
    defaults: () => ({ title: L("Details", "Detalles"), keys: [] }),
    fields: [title, { key: "keys", label: "Only these", kind: "keys", keyKinds: ["all"] }],
  },
  entitySummary: {
    label: "Summary",
    hint: "The record's summary text.",
    group: "Entity",
    on: ["entity"],
    defaults: () => ({ title: L("Summary", "Resumen") }),
    fields: [title],
  },
  entityHistory: {
    label: "Status history",
    hint: "Each change of status, with its date.",
    group: "Entity",
    on: ["entity"],
    defaults: () => ({ title: L("Status history", "Historial") }),
    fields: [title],
  },
  entityConnections: {
    label: "Connections",
    hint: "The records this one is connected to.",
    group: "Entity",
    on: ["entity"],
    defaults: () => ({ title: L("Connected records", "Registros conectados"), mode: "all", limit: 12 }),
    fields: [
      title,
      {
        key: "mode",
        label: "Show",
        kind: "select",
        options: [
          { value: "all", label: "Every connection" },
          { value: "cites", label: "Documents it links to" },
          { value: "citedBy", label: "Records that link to it" },
        ],
      },
      { key: "limit", label: "How many", kind: "number", min: 3, max: 60 },
    ],
  },
  entityDownload: {
    label: "Download",
    hint: "A button to download the record's document.",
    group: "Entity",
    on: ["entity"],
    defaults: () => ({ title: L("Download", "Descargar") }),
    fields: [title],
  },
  entityCitation: {
    label: "How to cite",
    hint: "A ready citation with a copy button.",
    group: "Entity",
    on: ["entity"],
    defaults: () => ({ title: L("How to cite", "Cómo citar") }),
    fields: [title],
  },
};

export function makeBlock<T extends BlockType>(type: T, main?: string, patch: Partial<BlockProps[T]> = {}): Block<T> {
  return { id: newId(), type, props: { ...BLOCKS[type].defaults({ main }), ...patch } as BlockProps[T] };
}
