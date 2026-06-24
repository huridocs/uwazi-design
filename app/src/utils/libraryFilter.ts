import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import { typeHasDocument } from "../data/entityProfiles";
import {
  entityCountries,
  matchesCountries,
  entityInheritedValues,
  type DataSource,
  type LibraryInheritedDef,
} from "./libraryFacets";

/** The active inherited-property selections (a facet def + its chosen values). */
export interface ActiveInherited {
  def: LibraryInheritedDef;
  values: Set<string>;
}

/** Everything the library filters by, resolved from the atoms once per render.
 *  Shared by the result filter AND every facet's aggregation so they can't
 *  drift. */
export interface LibraryFilterState {
  source: DataSource;
  language: Language;
  typeIds: string[];
  hasDocOnly: boolean;
  wantPublished: boolean;
  wantRestricted: boolean;
  countries: string[];
  countryMode: "AND" | "OR";
  descriptors: string[];
  descriptorMode: "AND" | "OR";
  fromMs: number | null;
  toMs: number | null;
  inherited: ActiveInherited[];
  q: string;
  searchIndex: Map<string, string>;
}

/** One independent filter dimension. A facet's own key is excluded when
 *  computing that facet's aggregation, so its options never count against
 *  themselves (and never vanish). */
export type FacetKey =
  | "type"
  | "doc"
  | "status"
  | "country"
  | "descriptor"
  | "date"
  | "inherited"
  | "search";

export function entityIsDoc(e: Entity, source: DataSource): boolean {
  return source === "cejil" ? e.preview === "document" : typeHasDocument(e.typeId);
}

/** Per-entity searchable text (title + country + field values + descriptors),
 *  lowercased. Built once and shared by the result filter and the facet
 *  aggregations so search narrows both identically. */
export function buildSearchIndex(entities: Entity[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of entities) {
    const parts = [
      e.title,
      e.country ?? "",
      ...(e.fields?.map((f) => f.value) ?? []),
      ...(e.descriptors ?? []),
    ];
    m.set(e.id, parts.join(" ").toLowerCase());
  }
  return m;
}

const PREDICATES: Record<
  FacetKey,
  (e: Entity, s: LibraryFilterState) => boolean
> = {
  type: (e, s) => s.typeIds.length === 0 || s.typeIds.includes(e.typeId),
  doc: (e, s) => !s.hasDocOnly || entityIsDoc(e, s.source),
  status: (e, s) =>
    !(s.wantPublished || s.wantRestricted) ||
    (s.wantPublished && e.published) ||
    (s.wantRestricted && !e.published),
  country: (e, s) =>
    s.countries.length === 0 ||
    matchesCountries(entityCountries(e, s.language), s.countries, s.countryMode),
  descriptor: (e, s) =>
    s.descriptors.length === 0 ||
    (s.descriptorMode === "AND"
      ? s.descriptors.every((d) => (e.descriptors ?? []).includes(d))
      : (e.descriptors ?? []).some((d) => s.descriptors.includes(d))),
  date: (e, s) => {
    if (!s.fromMs && !s.toMs) return true;
    if (!e.createdAt) return false;
    const ts = Date.parse(e.createdAt);
    return (!s.fromMs || ts >= s.fromMs) && (!s.toMs || ts <= s.toMs);
  },
  inherited: (e, s) =>
    s.inherited.every((f) =>
      entityInheritedValues(e, f.def, s.language, s.source).some((v) =>
        f.values.has(v),
      ),
    ),
  search: (e, s) => !s.q || (s.searchIndex.get(e.id) ?? "").includes(s.q),
};

const ALL_KEYS = Object.keys(PREDICATES) as FacetKey[];

/** Does the entity pass every active filter, optionally skipping one dimension?
 *  Skip a facet's own key to get the faceted-aggregation base for that facet. */
export function matchesAll(
  e: Entity,
  s: LibraryFilterState,
  except?: FacetKey,
): boolean {
  for (const key of ALL_KEYS) {
    if (key === except) continue;
    if (!PREDICATES[key](e, s)) return false;
  }
  return true;
}
