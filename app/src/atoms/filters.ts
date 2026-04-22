import { atom } from "jotai";

export type ViewMode =
  | "all"
  | "by-entity-type"
  | "by-relation-type"
  | "density"
  | "by-document";

export const viewModeAtom = atom<ViewMode>("all");

export const searchQueryAtom = atom("");

/** Filter by entity type ID */
export const entityTypeFilterAtom = atom<string | null>(null);

/** Filter by relation type */
export const relationTypeFilterAtom = atom<string | null>(null);

/** Expand/collapse signal: increments to trigger all groups to expand or collapse */
export const expandAllSignalAtom = atom(0);
export const collapseAllSignalAtom = atom(0);

/** Sort order for references */
export type SortOrder = "none" | "asc" | "desc";
export const sortOrderAtom = atom<SortOrder>("none");

/** Track expanded group count for greying out collapse/expand buttons */
export const expandedGroupCountAtom = atom(0);
export const totalGroupCountAtom = atom(0);

/** IDs of refs in the currently expanded cluster on the minimap track */
export const activeClusterRefIdsAtom = atom<string[] | null>(null);

/** Relationship tab: selected relation types (empty = no filter). */
export const relationshipTypeFiltersAtom = atom<Record<string, boolean>>({});

/** Relationship tab: selected target entity types (empty = no filter). */
export const relationshipEntityTypeFiltersAtom = atom<Record<string, boolean>>({});
