import { atom } from "jotai";
import { dataSourceAtom, type DataSource } from "./dataSource";

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

/** Relationship-CHAIN facet selections (CEJIL only) — keyed `${chainId}:${seg}`
 *  → (value → on). Several keys of one chain combine path-coupled (a single
 *  traversed path must satisfy them all). See utils/chainTraversal.ts. */
export const libraryChainFiltersAtom = atom<
  Record<string, Record<string, boolean>>
>({});

/** Results layout. */
export type LibraryViewMode = "cards" | "list" | "map" | "timeline";
export const libraryViewModeAtom = atom<LibraryViewMode>("cards");

/** Timeline body flavour — four ways to read the same chronology:
 *  - `rail`     the text-references minimap on a vertical time track: dots and
 *               counted clusters that fan out into their members. Navigation —
 *               clicking picks an entity, it does not filter.
 *  - `density`  the same track as a volume histogram; clicking a bar FILTERS the
 *               Library to that period.
 *  - `spine`    a proportional chronology — every entity at its exact instant
 *  - `lanes`    a template × period grid */
export type TimelineLayout = "rail" | "density" | "spine" | "lanes";
export const libraryTimelineLayoutAtom = atom<TimelineLayout>("rail");

/** Track scope, mirroring the document minimap's whole-document / this-page
 *  toggle: `all` plots the entire corpus span, `year` zooms the track to the
 *  year you're currently reading (months, with ↑/↓ counts for the rest). */
export type TimelineScope = "all" | "year";
export const libraryTimelineScopeAtom = atom<TimelineScope>("all");

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

/** Switch collection. Template ids, countries and descriptors are per-source, so
 *  every facet and the open preview have to go with it — this lives in an atom
 *  (not in the view) because the collection picker now sits in the navbar, and
 *  two call-sites clearing "most of" the facets would drift. */
export const selectDataSourceAtom = atom(null, (_get, set, source: DataSource) => {
  set(dataSourceAtom, source);
  set(libraryTypeFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryStatusFiltersAtom, {});
  set(libraryDescriptorFiltersAtom, {});
  set(libraryInheritedFiltersAtom, {});
  set(libraryChainFiltersAtom, {});
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(librarySelectedEntityIdAtom, null);
  set(librarySelectedClusterAtom, null);
});

/** Clear every filter. ONE definition: the Filters panel and the view each had
 *  their own, and they had already drifted — the panel's forgot the search box,
 *  the view's forgot the AND/OR modes. */
export const clearLibraryFiltersAtom = atom(null, (_get, set) => {
  set(libraryQueryAtom, "");
  set(libraryTypeFiltersAtom, {});
  set(libraryHasDocAtom, false);
  set(libraryStatusFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryCountryModeAtom, "OR");
  set(libraryDescriptorFiltersAtom, {});
  set(libraryDescriptorModeAtom, "OR");
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(libraryInheritedFiltersAtom, {});
  set(libraryChainFiltersAtom, {});
});

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
  for (const vals of Object.values(get(libraryChainFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  return n;
});
