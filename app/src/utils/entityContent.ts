// What content a record carries, and how it is stored: the Library's Content
// card. One derived, cached answer per entity, from a provider per corpus, so
// the card, its counts and the filter read one model.
import type { DataSource } from "../atoms/dataSource";
import type { Entity } from "../data/entities";

/** The card's groups, in card order. */
export const CONTENT_GROUPS = ["contains", "storage", "language", "length", "text", "warning", "quotes"] as const;
export type ContentGroup = (typeof CONTENT_GROUPS)[number];

/** A record's values per group: row ids. A group a record has nothing in is
 *  absent or empty. */
export type EntityContent = Partial<Record<ContentGroup, string[]>>;

/** The selection: ticked row ids per group. Within a group, OR (Contains can
 *  be AND); across groups, AND. */
export type ContentSelection = Partial<Record<ContentGroup, string[]>>;

export const CONTENT_GROUP_LABEL: Record<ContentGroup, string> = {
  contains: "Contains",
  storage: "Where it is",
  language: "Language",
  length: "Length",
  text: "Text",
  warning: "Content warning",
  quotes: "Quoted passages",
};

/** Fixed rows, in row order, with their copy. Language rows are the languages
 *  present, named by `languageName`. */
export const CONTENT_ROWS: Record<Exclude<ContentGroup, "language">, { id: string; label: string; hint?: string }[]> = {
  contains: [
    { id: "document", label: "Document" },
    { id: "image", label: "Image" },
    { id: "video", label: "Video" },
    { id: "audio", label: "Audio" },
  ],
  storage: [
    { id: "stored", label: "Stored in this collection" },
    { id: "linked", label: "Linked or embedded" },
  ],
  length: [
    { id: "1", label: "1 page" },
    { id: "2-10", label: "2 to 10 pages" },
    { id: "11-100", label: "11 to 100 pages" },
    { id: "100+", label: "More than 100 pages" },
  ],
  text: [
    { id: "embedded", label: "Embedded text" },
    { id: "ocr", label: "Machine-read (OCR, unreviewed)", hint: "Read by software and not checked against the scan." },
    { id: "stand-in", label: "Stand-in text", hint: "The page text comes from a similar document, not this file." },
    { id: "none", label: "No text" },
  ],
  warning: [
    { id: "none", label: "None" },
    { id: "distressing", label: "Distressing" },
    { id: "graphic", label: "Graphic (link only)", hint: "Shown as a link with a warning; never stored here." },
    { id: "unassessed", label: "Not assessed" },
  ],
  quotes: [
    { id: "has", label: "Has quoted passages" },
    { id: "1-5", label: "1 to 5" },
    { id: "6-20", label: "6 to 20" },
    { id: "21+", label: "21 or more" },
  ],
};

const LANGUAGE_NAME: Record<string, string> = {
  es: "Spanish",
  spa: "Spanish",
  en: "English",
  eng: "English",
  pt: "Portuguese",
  por: "Portuguese",
  fr: "French",
  fra: "French",
  ne: "Nepali",
  nep: "Nepali",
  hi: "Hindi",
  hin: "Hindi",
};
/** A language row's id and label: the name, or Other for a code the card does
 *  not name. */
export const languageName = (code: string): string => LANGUAGE_NAME[code] ?? "Other";

/** A row's label, for chips. Language rows are labelled by their id. */
export function contentRowLabel(g: ContentGroup, id: string): string {
  if (g === "language") return id;
  return CONTENT_ROWS[g].find((r) => r.id === id)?.label ?? id;
}

/** A page count's Length row. */
export function lengthRow(pages: number): string {
  if (pages <= 1) return "1";
  if (pages <= 10) return "2-10";
  if (pages <= 100) return "11-100";
  return "100+";
}

/** A quote count's Quoted passages rows: "has" plus its bucket. */
export function quoteRows(n: number): string[] {
  if (n <= 0) return [];
  return ["has", n <= 5 ? "1-5" : n <= 20 ? "6-20" : "21+"];
}

type ContentProvider = (e: Entity) => EntityContent;
const providers: Partial<Record<DataSource, ContentProvider>> = {};

/** A corpus's content reader. Registered by the corpus's adapter, like the
 *  property readers in `data/entityMetadata.ts`. */
export function registerContentProvider(source: DataSource, read: ContentProvider): void {
  providers[source] = read;
}

const cache = new WeakMap<Entity, EntityContent>();
export const EMPTY_CONTENT: EntityContent = {};
const EMPTY = EMPTY_CONTENT;

/** The record's content. Cached by entity identity: the corpus builders return
 *  the same objects every render. */
export function entityContent(e: Entity, source: DataSource): EntityContent {
  const hit = cache.get(e);
  if (hit) return hit;
  const read = providers[source];
  const out = read ? read(e) : EMPTY;
  cache.set(e, out);
  return out;
}

/** Does the content pass the selection? `skip` leaves one group out (that
 *  group's own counts). */
export function matchesContent(
  c: EntityContent,
  sel: ContentSelection,
  containsMode: "AND" | "OR",
  skip?: ContentGroup,
): boolean {
  for (const g of CONTENT_GROUPS) {
    if (g === skip) continue;
    const want = sel[g];
    if (!want || want.length === 0) continue;
    const have = c[g] ?? [];
    const ok =
      g === "contains" && containsMode === "AND"
        ? want.every((v) => have.includes(v))
        : want.some((v) => have.includes(v));
    if (!ok) return false;
  }
  return true;
}

/** The card's atom shape (group → row → ticked) as a selection. */
export function contentSelectionOf(rec: Record<string, Record<string, boolean>>): ContentSelection {
  const out: ContentSelection = {};
  for (const g of CONTENT_GROUPS) {
    const on = Object.entries(rec[g] ?? {}).filter(([, v]) => v).map(([k]) => k);
    if (on.length) out[g] = on;
  }
  return out;
}

/** Does any group hold a selection? */
export const hasContentSelection = (sel: ContentSelection): boolean =>
  CONTENT_GROUPS.some((g) => (sel[g]?.length ?? 0) > 0);

/* ── Providers ─────────────────────────────────────────────────────────────
   This module imports nothing at runtime: the corpus adapters import it to
   register, and a runtime import back into them would run their registration
   before `providers` exists. Artworks reads only the Library entity; the
   Sample registers in `libraryFilter.ts`; CEJIL and Nepal in their adapters. */

registerContentProvider("artworks", (e) =>
  e.image || e.images?.length ? { contains: ["image"], storage: ["stored"] } : EMPTY,
);
