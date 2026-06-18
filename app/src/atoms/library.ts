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

/** Keyword-style Descriptores (violations) facet — CEJIL property facet (OR). */
export const libraryDescriptorFiltersAtom = atom<Record<string, boolean>>({});

/** Results layout. */
export type LibraryViewMode = "cards" | "list" | "map";
export const libraryViewModeAtom = atom<LibraryViewMode>("cards");

/** Sort order. */
export type LibrarySort = "recent" | "title" | "connections";
export const librarySortAtom = atom<LibrarySort>("recent");

/** Count of active filters (search + each selected type + has-doc + countries). */
export const libraryActiveFilterCountAtom = atom((get) => {
  let n = get(libraryQueryAtom).trim() ? 1 : 0;
  n += Object.values(get(libraryTypeFiltersAtom)).filter(Boolean).length;
  if (get(libraryHasDocAtom)) n += 1;
  n += Object.values(get(libraryStatusFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(libraryCountryFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(libraryDescriptorFiltersAtom)).filter(Boolean).length;
  return n;
});
