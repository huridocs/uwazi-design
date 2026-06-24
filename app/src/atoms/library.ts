import { atom } from "jotai";

/** Library search box. */
export const libraryQueryAtom = atom("");

/** Selected entity-type facets (typeId → on). Empty = all types. */
export const libraryTypeFiltersAtom = atom<Record<string, boolean>>({});

/** "Has document" facet toggle. */
export const libraryHasDocAtom = atom(false);

/** Publishing-status facet: keys "published" / "restricted". */
export const libraryStatusFiltersAtom = atom<Record<string, boolean>>({});

/** Mobile filters drawer open state (the sidebar is persistent on desktop). */
export const libraryFiltersOpenAtom = atom(false);

/** Entity previewed in the right drawer. null → the drawer shows Filters. */
export const librarySelectedEntityIdAtom = atom<string | null>(null);

/** A map cluster opened in the drawer — the entities located at one place. */
export interface LibraryCluster {
  label: string;
  ids: string[];
}
export const librarySelectedClusterAtom = atom<LibraryCluster | null>(null);

/** Keyword-style Countries facet: selected country names + match mode. */
export const libraryCountryFiltersAtom = atom<Record<string, boolean>>({});
export type FacetMode = "AND" | "OR";
export const libraryCountryModeAtom = atom<FacetMode>("OR");

/** Keyword-style Descriptores (violations) facet — CEJIL property facet. The
 *  mode mirrors the Countries facet: "OR" = entity has any selected descriptor,
 *  "AND" = entity has all of them (meaningful — an entity carries several). */
export const libraryDescriptorFiltersAtom = atom<Record<string, boolean>>({});
export const libraryDescriptorModeAtom = atom<FacetMode>("OR");

/** Date-range property filter (the entity's representative date, e.g. CEJIL
 *  `Fecha`). ISO `yyyy-mm-dd` strings; "" = open-ended on that side. Mirrors
 *  Uwazi's per-property DateFilter (a from/to range). */
export const libraryDateFromAtom = atom<string>("");
export const libraryDateToAtom = atom<string>("");

/** Dynamic facets generated from INHERITED relationship properties (e.g. a
 *  person's Role, a case's Region) — keyed `inheritProperty → (value → on)`.
 *  Mirrors Uwazi, where an inherited relationship property becomes a filter. */
export const libraryInheritedFiltersAtom = atom<
  Record<string, Record<string, boolean>>
>({});

/** Results layout. */
export type LibraryViewMode = "cards" | "list" | "map";
export const libraryViewModeAtom = atom<LibraryViewMode>("cards");

/** Which information pieces the results show — a key is visible unless explicitly
 *  false, so the default (`{}`) shows everything. Driven by the header "Display"
 *  menu; applies to cards (thumbnail/metadata/connections) and the list table
 *  (country/date/connections columns). */
export type LibraryInfoKey =
  | "preview"
  | "metadata"
  | "country"
  | "date"
  | "connections";
export const libraryInfoAtom = atom<Partial<Record<LibraryInfoKey, boolean>>>({});

/** Sort order. */
export type LibrarySort =
  | "recent"
  | "title"
  | "connections"
  | "type"
  | "country";
export const librarySortAtom = atom<LibrarySort>("recent");
export type LibrarySortDir = "asc" | "desc";
export const librarySortDirAtom = atom<LibrarySortDir>("desc");
/** Natural direction for a freshly-picked sort key: text → A→Z, value → high→low. */
export const defaultSortDir = (key: LibrarySort): LibrarySortDir =>
  key === "title" || key === "type" || key === "country" ? "asc" : "desc";

/** Count of active filters (search + each selected type + has-doc + countries). */
export const libraryActiveFilterCountAtom = atom((get) => {
  let n = get(libraryQueryAtom).trim() ? 1 : 0;
  n += Object.values(get(libraryTypeFiltersAtom)).filter(Boolean).length;
  if (get(libraryHasDocAtom)) n += 1;
  n += Object.values(get(libraryStatusFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(libraryCountryFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(libraryDescriptorFiltersAtom)).filter(Boolean).length;
  if (get(libraryDateFromAtom) || get(libraryDateToAtom)) n += 1;
  for (const vals of Object.values(get(libraryInheritedFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  return n;
});
