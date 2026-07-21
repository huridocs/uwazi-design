import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import { typeHasDocument } from "../data/entityProfiles";
import { chains, valueAt, type ChainGraph, type ChainSegment } from "./chainTraversal";
import { entityFullTextBlob, matchCategories } from "./librarySnippets";
import { getEntityProfile } from "../data/entityProfiles";
import { fold } from "./queryTokens";
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

/** One active value-constraint on a chain segment — the selections of a single
 *  chain-segment facet (Approach B), e.g. "signing judge ∈ {…}". */
export interface ActiveChainConstraint {
  segmentIndex: number;
  facetKey: string;
  property: string;
  values: Set<string>;
}

/** A relationship CHAIN with ≥1 active segment constraint. The constraints are
 *  PATH-COUPLED: a row matches only when a SINGLE traversed path satisfies them
 *  all at once (so "judge from Brasil who signed" can't be faked by two
 *  unrelated paths). See utils/chainTraversal.ts + docs/relationship-chain-filters.md. */
export interface ActiveChain {
  chainId: string;
  rootTypeId: string;
  segments: ChainSegment[];
  graph: ChainGraph;
  maxPaths: number;
  constraints: ActiveChainConstraint[];
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
  /** Active relationship-chain filters (CEJIL only; empty otherwise). */
  chains: ActiveChain[];
  q: string;
  searchIndex: Map<string, string>;
  /** Lowercased highlight terms of `q` (quoted phrases as units, bare words
   *  separately, operators dropped) — shared with snippets + marks via
   *  `utils/queryTokens.ts`. A term must hit metadata OR full text; all must hit
   *  (AND). */
  searchTerms: string[];
  /** Whether to scan document bodies (gated on `q.length ≥ 3` for corpus perf). */
  fullTextSearch: boolean;
  /** Which KINDS of match to keep (Results-tab chips). All-true = no narrowing. */
  matchTypes: { title: boolean; properties: boolean; document: boolean };
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
  | "search"
  | "matchType";

export function entityIsDoc(e: Entity, source: DataSource): boolean {
  return source === "cejil" ? e.preview === "document" : typeHasDocument(e.typeId);
}

/** Per-entity searchable text (title + country + field values + descriptors),
 *  lowercased. Built once and shared by the result filter and the facet
 *  aggregations so search narrows both identically. */
export function buildSearchIndex(entities: Entity[], language: Language): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of entities) {
    const parts = [
      e.title,
      e.country ?? "",
      ...(e.fields?.map((f) => f.value) ?? []),
      ...(e.descriptors ?? []),
    ];
    // Mock entities carry their scalar metadata in the PROFILE, not `fields`, so
    // fold it in — otherwise the search reaches only titles. CEJIL entities have
    // `fields`, so they skip this (and its per-entity profile build).
    if (!e.fields?.length) {
      for (const f of getEntityProfile(e.id).metadata[language] ?? []) {
        if (f.type !== "relationship" && f.value) parts.push(f.value);
      }
    }
    m.set(e.id, fold(parts.join(" ")));
  }
  return m;
}

/** Inert defaults for every filter dimension — each value means "don't narrow". */
const EMPTY_SEARCH_INDEX: Map<string, string> = new Map();
const ALL_MATCH_TYPES = { title: true, properties: true, document: true };
const DEFAULT_FILTER_STATE: LibraryFilterState = {
  source: "mock",
  language: "EN",
  typeIds: [],
  hasDocOnly: false,
  wantPublished: false,
  wantRestricted: false,
  countries: [],
  countryMode: "OR",
  descriptors: [],
  descriptorMode: "OR",
  fromMs: null,
  toMs: null,
  inherited: [],
  chains: [],
  q: "",
  searchIndex: EMPTY_SEARCH_INDEX,
  searchTerms: [],
  fullTextSearch: false,
  matchTypes: ALL_MATCH_TYPES,
};

/** Fill in any dimension the caller didn't supply.
 *
 *  EVERY entry point normalises through this, so a filter state that predates a
 *  dimension — a call-site not yet updated, or a half-swapped module during an
 *  HMR reload — degrades to "no narrowing" instead of throwing inside a
 *  predicate and unmounting the entire Library. That failure mode blanked the
 *  view twice while these dimensions were being added; defaulting centrally
 *  means adding the NEXT dimension can't repeat it, and no predicate has to
 *  defend itself.
 *
 *  Cached by state identity: `matchesAll` runs per entity per facet aggregation,
 *  so normalising on every call would allocate thousands of objects per render.
 *  The state is rebuilt each render, so the WeakMap turns over on its own; the
 *  result is also mapped to itself, making normalisation idempotent. */
const normalizedStates = new WeakMap<LibraryFilterState, LibraryFilterState>();
function withDefaults(s: LibraryFilterState | null | undefined): LibraryFilterState {
  if (!s) return DEFAULT_FILTER_STATE;
  const hit = normalizedStates.get(s);
  if (hit) return hit;
  const out: LibraryFilterState = {
    source: s.source ?? DEFAULT_FILTER_STATE.source,
    language: s.language ?? DEFAULT_FILTER_STATE.language,
    typeIds: s.typeIds ?? [],
    hasDocOnly: s.hasDocOnly ?? false,
    wantPublished: s.wantPublished ?? false,
    wantRestricted: s.wantRestricted ?? false,
    countries: s.countries ?? [],
    countryMode: s.countryMode ?? "OR",
    descriptors: s.descriptors ?? [],
    descriptorMode: s.descriptorMode ?? "OR",
    fromMs: s.fromMs ?? null,
    toMs: s.toMs ?? null,
    inherited: s.inherited ?? [],
    chains: s.chains ?? [],
    q: s.q ?? "",
    searchIndex: s.searchIndex ?? EMPTY_SEARCH_INDEX,
    searchTerms: s.searchTerms ?? [],
    fullTextSearch: s.fullTextSearch ?? false,
    matchTypes: s.matchTypes ?? ALL_MATCH_TYPES,
  };
  normalizedStates.set(s, out);
  normalizedStates.set(out, out);
  return out;
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
  // Match every query token (AND) somewhere in the entity's metadata index OR —
  // when the query is long enough to be worth the corpus scan — its document
  // body. Quoted phrases are single contiguous tokens. Sharing `searchTerms`
  // with the snippet builder + highlighter keeps filter, snippets, and marks in
  // one semantics (so "torture cruel" matches an entity carrying both words in
  // different fields/pages, and both get marked).
  search: (e, s) => matchesSearch(e, s),
  // Where the query matched (title / properties / document). All-on is the
  // common case and short-circuits BEFORE categorising, so the (blob-scanning)
  // categorisation is only paid when the user has actually narrowed.
  matchType: (e, s) => {
    const { title, properties, document } = s.matchTypes;
    if (title && properties && document) return true;
    if (!s.q) return true;
    const c = matchCategories(e, s.q, s.language, s.source);
    return (title && c.title) || (properties && c.properties) || (document && c.document);
  },
};

/** The search predicate on its own (facets excepted) — every query token must
 *  hit the entity's metadata index OR its document body. Exported so callers can
 *  count "entities matching the search regardless of facets" (e.g. the Results
 *  tab's hidden-by-filters line). */
export function matchesSearch(e: Entity, state: LibraryFilterState): boolean {
  const s = withDefaults(state);
  if (!s.q) return true;
  if (s.searchTerms.length === 0) return true;
  const meta = s.searchIndex.get(e.id) ?? "";
  return s.searchTerms.every(
    (t) =>
      meta.includes(t) ||
      (s.fullTextSearch && entityFullTextBlob(e, s.language, s.source).includes(t)),
  );
}

const ALL_KEYS = Object.keys(PREDICATES) as FacetKey[];

/** Path-coupled chain predicate. For each active chain, the entity must be of
 *  the chain's root type and have at least ONE traversed path that satisfies
 *  every active segment constraint jointly. `except` skips one segment facet (by
 *  its facetKey) so that facet's own aggregation doesn't count against itself. */
function chainMatches(e: Entity, s: LibraryFilterState, except?: string): boolean {
  for (const ac of s.chains) {
    const active = ac.constraints.filter(
      (c) => c.values.size > 0 && c.facetKey !== except,
    );
    if (active.length === 0) continue;
    // A chain narrows results to its root type — like an inherited facet, an
    // entity that can't carry the value is filtered out, not passed through.
    if (e.typeId !== ac.rootTypeId) return false;
    const { tuples } = chains(ac.graph, e.id, ac.segments, { maxPaths: ac.maxPaths });
    const ok = tuples.some((t) =>
      active.every((c) =>
        valueAt(ac.graph, t, c.segmentIndex, c.property).some((v) => c.values.has(v)),
      ),
    );
    if (!ok) return false;
  }
  return true;
}

/** Does the entity pass every active filter, optionally skipping one dimension?
 *  Skip a facet's own key to get the faceted-aggregation base for that facet.
 *  `except` is a static FacetKey or a chain-segment facetKey (`chainId:segIdx`). */
export function matchesAll(
  e: Entity,
  state: LibraryFilterState,
  except?: FacetKey | string,
): boolean {
  const s = withDefaults(state);
  for (const key of ALL_KEYS) {
    if (key === except) continue;
    if (!PREDICATES[key](e, s)) return false;
  }
  return chainMatches(e, s, except);
}

/** Faceted value counts for one chain-segment facet. For each root-type entity
 *  passing the other dimensions AND the chain's OTHER active constraints, tally
 *  the distinct values it reaches at this segment on a path that also satisfies
 *  those other constraints (path-coupling). `graph`/`def` come from the facet
 *  registry so counts work even before the chain has any selection. */
export function chainFacetCounts(
  entities: Entity[],
  state: LibraryFilterState,
  def: {
    key: string;
    chainId: string;
    rootTypeId: string;
    segments: ChainSegment[];
    segmentIndex: number;
    property: string;
    maxPaths: number;
  },
  graph: ChainGraph,
): Map<string, number> {
  const s = withDefaults(state);
  const m = new Map<string, number>();
  const ac = s.chains.find((c) => c.chainId === def.chainId);
  const others = ac
    ? ac.constraints.filter((c) => c.facetKey !== def.key && c.values.size > 0)
    : [];
  for (const e of entities) {
    if (e.typeId !== def.rootTypeId) continue;
    if (!matchesAll(e, s, def.key)) continue;
    const { tuples } = chains(graph, e.id, def.segments, { maxPaths: def.maxPaths });
    const reached = new Set<string>();
    for (const t of tuples) {
      if (
        others.every((c) =>
          valueAt(graph, t, c.segmentIndex, c.property).some((v) => c.values.has(v)),
        )
      ) {
        for (const v of valueAt(graph, t, def.segmentIndex, def.property))
          if (v) reached.add(v);
      }
    }
    for (const v of reached) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}
