import type { Entity } from "../data/entities";
import { entityInRange } from "./timeline";
import { EMPTY_CONTENT, entityContent, hasContentSelection, matchesContent, registerContentProvider, type ContentSelection } from "./entityContent";
import type { Language } from "../atoms/language";
import { typeHasDocument } from "../data/entityProfiles";
import { chains, valueAt, type ChainGraph, type ChainSegment } from "./chainTraversal";
import {
  entityFullTextBlob,
  entitySearchFields,
  matchCategoriesWithTerms,
  type MatchCategories,
} from "./librarySnippets";
import { fold, termIn, type SearchQuery } from "./queryTokens";
import {
  entityCountries,
  entityInheritedValues,
  type DataSource,
  type LibraryInheritedDef,
} from "./libraryFacets";

/** How a facet's ticked values select records. `any` and `all` are Uwazi's OR
 *  and AND; `none` keeps records that carry none of them; `missing` keeps
 *  records with no value at all, and ignores the ticks. `none` and `missing`
 *  only keep records whose template can carry the value (`carriers`), so
 *  "no cause" means casualties without one, not every event and source. */
export type LibraryMatch = "any" | "all" | "none" | "missing";

/** The active inherited-property selections (a facet def + its chosen values). */
export interface ActiveInherited {
  def: LibraryInheritedDef;
  values: Set<string>;
  mode: LibraryMatch;
  /** The types that can carry the value; read by `none` and `missing`. */
  carriers: ReadonlySet<string>;
}

/** Does a facet with this mode and these ticks narrow at all? */
export const facetActive = (mode: LibraryMatch, ticked: number) => mode === "missing" || ticked > 0;

/** One facet's test on one record: its values against the ticked set. */
export function matchValues(
  vals: readonly string[],
  selected: ReadonlySet<string>,
  mode: LibraryMatch,
  carrier: boolean,
): boolean {
  switch (mode) {
    case "all":
      for (const v of selected) if (!vals.includes(v)) return false;
      return true;
    case "none":
      return carrier && !vals.some((v) => selected.has(v));
    case "missing":
      return carrier && vals.length === 0;
    default:
      return vals.some((v) => selected.has(v));
  }
}

/** The types at least one record of which has a value for a facet, per entity
 *  list. Curated facets have no template list to say which types carry them,
 *  so `none` and `missing` read this instead. */
const carrierCache = new WeakMap<readonly Entity[], Map<string, Set<string>>>();
export function carrierTypes(
  entities: readonly Entity[],
  key: string,
  valuesOf: (e: Entity) => readonly string[],
): ReadonlySet<string> {
  let byKey = carrierCache.get(entities);
  if (!byKey) carrierCache.set(entities, (byKey = new Map()));
  let out = byKey.get(key);
  if (!out) {
    out = new Set();
    for (const e of entities) if (!out.has(e.typeId) && valuesOf(e).length) out.add(e.typeId);
    byKey.set(key, out);
  }
  return out;
}

/** The types that carry a country, and a descriptor: the fixed facets'
 *  carriers for `none` and `missing`. */
export const countryCarriersOf = (entities: readonly Entity[], source: DataSource, language: Language) =>
  carrierTypes(entities, `${source}|country|${language}`, (e) => entityCountries(e, language));
export const descriptorCarriersOf = (entities: readonly Entity[], source: DataSource) =>
  carrierTypes(entities, `${source}|descriptor`, (e) => e.descriptors ?? []);

/** The facet key a property facet's mode is stored and excepted under. */
export const inheritedKey = (propId: string) => `inh:${propId}`;

/** The inherited and property facets that narrow, from the atoms: the ticked
 *  values, the mode, and the types that carry the value. Shared by the Library
 *  view and the Filters panel so the two states cannot disagree. */
export function activeInheritedOf(
  filters: Record<string, Record<string, boolean>>,
  match: Record<string, LibraryMatch>,
  defs: readonly LibraryInheritedDef[],
  entities: readonly Entity[],
  language: Language,
  source: DataSource,
): ActiveInherited[] {
  const out: ActiveInherited[] = [];
  for (const def of defs) {
    const mode = match[inheritedKey(def.propId)] ?? "any";
    const values = new Set(Object.entries(filters[def.propId] ?? {}).filter(([, on]) => on).map(([v]) => v));
    if (!facetActive(mode, values.size)) continue;
    out.push({ def, values, mode, carriers: inheritedCarriers(def, entities, language, source) });
  }
  return out;
}

/** The types that can carry an inherited or property facet's value. */
export function inheritedCarriers(
  def: LibraryInheritedDef,
  entities: readonly Entity[],
  language: Language,
  source: DataSource,
): ReadonlySet<string> {
  if (def.templateIds) return new Set(def.templateIds);
  if (def.targetTypeId) return new Set([def.targetTypeId]);
  return carrierTypes(entities, `${source}|${def.propId}`, (e) => entityInheritedValues(e, def, language, source));
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
  /** Walk only as deep as the deepest node an active constraint reads (see
   *  `ChainDecl.partialPaths`). */
  partialPaths?: boolean;
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
  countryMode: LibraryMatch;
  /** Types that carry a country; read by `none` and `missing`. */
  countryCarriers?: ReadonlySet<string>;
  descriptors: string[];
  descriptorMode: LibraryMatch;
  descriptorCarriers?: ReadonlySet<string>;
  fromMs: number | null;
  toMs: number | null;
  inherited: ActiveInherited[];
  /** Active relationship-chain filters (collections whose templates declare
   *  chains; empty otherwise). */
  chains: ActiveChain[];
  q: string;
  searchIndex: Map<string, string>;
  /** Lowercased highlight terms of `q` (quoted phrases as units, bare words
   *  separately, operators dropped) — shared with snippets + marks via
   *  `utils/queryTokens.ts`. A term must hit metadata OR full text; all must hit
   *  (AND). */
  searchTerms: string[];
  /** The parsed query — AND groups of OR terms, plus NOT terms — from the RAW
   *  query (`q` is lowercased, which would turn the operators into words). Built
   *  with `parseSearchQuery`. Absent: every `searchTerms` entry is ANDed, as
   *  before operators were read. */
  searchQuery?: SearchQuery;
  /** Whether to scan document bodies (gated on `q.length ≥ 3` for corpus perf). */
  fullTextSearch: boolean;
  /** Which KINDS of match to keep (Results-tab chips). All-true = no narrowing. */
  matchTypes: { title: boolean; properties: boolean; document: boolean };
  /** The Content card: ticked rows per group, and Contains' Any/All. */
  content: ContentSelection;
  contentMode: "AND" | "OR";
}

/** One independent filter dimension. A facet's own key is excluded when
 *  computing that facet's aggregation, so its options never count against
 *  themselves (and never vanish). Property facets are excepted one by one,
 *  by `inheritedKey(propId)`. */
export type FacetKey =
  | "type"
  | "doc"
  | "status"
  | "country"
  | "descriptor"
  | "date"
  | "search"
  | "matchType"
  | "content";

export function entityIsDoc(e: Entity, source: DataSource): boolean {
  switch (source) {
    case "cejil":
      return e.preview === "document";
    case "travesia":
      // Records, not documents: the schema carries no files.
      return false;
    case "nepal":
      // 51 records carry an attached PDF (sources and official actions).
      return (entityContent(e, source).contains ?? []).includes("document");
    case "artworks":
      // An image corpus: nothing carries a document. Previously this fell
      // through to the mock branch and was right only because "artwork" and
      // "artist" happen to miss the mock's DOC_TYPES set.
      return false;
    case "mock":
      return typeHasDocument(e.typeId);
    default: {
      const _exhaustive: never = source;
      void _exhaustive;
      return false;
    }
  }
}

/** Per-entity searchable text (title + country + metadata field values +
 *  descriptors), lowercased. Built once and shared by the result filter and the
 *  facet aggregations so search narrows both identically.
 *
 *  The parts come from `entitySearchFields` — the SAME per-field list the snippet
 *  builder excerpts and the categoriser reads — rather than a second
 *  concatenation of its own. It used to assemble `e.fields` here, which on an
 *  adapter that summarises for the card is three fields, first value only, cut at
 *  90 characters: the index inherited the card's ellipsis, so most of the CEJIL
 *  corpus's metadata was unmatchable, and a term that DID reach the snippet
 *  builder (mock profile fields) could disagree with what the filter had seen. */
export function buildSearchIndex(entities: Entity[], language: Language): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of entities) {
    m.set(e.id, fold(entitySearchFields(e, language).map((f) => f.text).join(" ")));
  }
  return m;
}

/** The Sample's content: a document for the document-bearing types (their
 *  renditions carry embedded text), an image where the record has one. */
registerContentProvider("mock", (e) => {
  const doc = typeHasDocument(e.typeId);
  const img = !!(e.image || e.images?.length);
  if (!doc && !img) return EMPTY_CONTENT;
  return {
    contains: [...(doc ? ["document"] : []), ...(img ? ["image"] : [])],
    storage: ["stored"],
    ...(doc ? { text: ["embedded"] } : {}),
  };
});


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
  countryMode: "any",
  descriptors: [],
  descriptorMode: "any",
  fromMs: null,
  toMs: null,
  inherited: [],
  chains: [],
  q: "",
  searchIndex: EMPTY_SEARCH_INDEX,
  searchTerms: [],
  fullTextSearch: false,
  matchTypes: ALL_MATCH_TYPES,
  content: {},
  contentMode: "OR",
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
    countryMode: s.countryMode ?? "any",
    countryCarriers: s.countryCarriers,
    descriptors: s.descriptors ?? [],
    descriptorMode: s.descriptorMode ?? "any",
    descriptorCarriers: s.descriptorCarriers,
    fromMs: s.fromMs ?? null,
    toMs: s.toMs ?? null,
    inherited: s.inherited ?? [],
    chains: s.chains ?? [],
    q: s.q ?? "",
    searchIndex: s.searchIndex ?? EMPTY_SEARCH_INDEX,
    searchTerms: s.searchTerms ?? [],
    searchQuery: s.searchQuery ?? { groups: (s.searchTerms ?? []).map((t) => [t]), exclude: [] },
    fullTextSearch: s.fullTextSearch ?? false,
    matchTypes: s.matchTypes ?? ALL_MATCH_TYPES,
    content: s.content ?? {},
    contentMode: s.contentMode ?? "OR",
  };
  normalizedStates.set(s, out);
  normalizedStates.set(out, out);
  return out;
}

/** One AND-ed term of the filter: the facet keys it reads and its test. A
 *  facet's aggregation skips the node holding its key ("except me"). */
interface FilterNode {
  keys: readonly string[];
  test: (e: Entity) => boolean;
}

/** The filter as a list of AND-ed nodes, built once per state and holding
 *  only the facets that narrow, cheapest first. Replaces a fixed table that
 *  ran every predicate for every record, active or not. */
const compiledStates = new WeakMap<LibraryFilterState, FilterNode[]>();
function compile(s: LibraryFilterState): FilterNode[] {
  const hit = compiledStates.get(s);
  if (hit) return hit;
  const nodes: FilterNode[] = [];
  const leaf = (key: string, test: (e: Entity) => boolean) => nodes.push({ keys: [key], test });
  if (s.typeIds.length) leaf("type", (e) => s.typeIds.includes(e.typeId));
  if (s.hasDocOnly) leaf("doc", (e) => entityIsDoc(e, s.source));
  if (s.wantPublished || s.wantRestricted)
    leaf("status", (e) => (s.wantPublished && e.published) || (s.wantRestricted && !e.published));
  if (facetActive(s.countryMode, s.countries.length)) {
    const sel = new Set(s.countries);
    const carriers = s.countryCarriers;
    leaf("country", (e) =>
      matchValues(entityCountries(e, s.language), sel, s.countryMode, !carriers || carriers.has(e.typeId)),
    );
  }
  if (facetActive(s.descriptorMode, s.descriptors.length)) {
    const sel = new Set(s.descriptors);
    const carriers = s.descriptorCarriers;
    leaf("descriptor", (e) =>
      matchValues(e.descriptors ?? [], sel, s.descriptorMode, !carriers || carriers.has(e.typeId)),
    );
  }
  // Overlap with the record's span where it has one (an event's start and
  // end), else its date as a point: see `entityInRange`.
  if (s.fromMs !== null || s.toMs !== null) leaf("date", (e) => entityInRange(e, s.fromMs, s.toMs));
  // One cached answer per entity (`entityContent`); the card's own groups
  // are faceted inside it.
  if (hasContentSelection(s.content))
    leaf("content", (e) => matchesContent(entityContent(e, s.source), s.content, s.contentMode));
  for (const f of s.inherited)
    leaf(inheritedKey(f.def.propId), (e) =>
      matchValues(entityInheritedValues(e, f.def, s.language, s.source), f.values, f.mode, f.carriers.has(e.typeId)),
    );
  // Match every query token (AND) somewhere in the entity's metadata index OR —
  // when the query is long enough to be worth the corpus scan — its document
  // body. Quoted phrases are single contiguous tokens. Sharing `searchTerms`
  // with the snippet builder + highlighter keeps filter, snippets, and marks in
  // one semantics (so "torture cruel" matches an entity carrying both words in
  // different fields/pages, and both get marked).
  if (s.q) leaf("search", (e) => matchesSearch(e, s));
  // Where the query matched (title / properties / document). All-on is the
  // common case and adds no node, so the (blob-scanning) categorisation is
  // only paid when the user has actually narrowed.
  const { title, properties, document } = s.matchTypes;
  if (s.q && !(title && properties && document))
    leaf("matchType", (e) =>
      passesMatchTypes(s.matchTypes, s.q, () =>
        // The parsed terms, not `s.q`: that is lowercased, and re-tokenising it
        // would read `not` / `or` as words to match.
        matchCategoriesWithTerms(e, s.searchTerms, s.language, s.source),
      ),
    );
  compiledStates.set(s, nodes);
  return nodes;
}

/** The match-type chip gate, as ONE definition.
 *
 *  `LibraryView` applies the same gate directly — it derives the chip-narrowed
 *  list from the pre-chip list rather than running a second full-corpus pass —
 *  and it holds categories it has already computed. So the rule lives here and
 *  takes the categories LAZILY: the all-on case (much the commonest) returns
 *  before the thunk is ever called, which is what keeps the blob scan off the
 *  path until the user has actually narrowed. */
export function passesMatchTypes(
  matchTypes: { title: boolean; properties: boolean; document: boolean },
  q: string,
  categories: () => MatchCategories,
): boolean {
  const { title, properties, document } = matchTypes;
  if (title && properties && document) return true;
  if (!q) return true;
  const c = categories();
  return (title && c.title) || (properties && c.properties) || (document && c.document);
}

/** The search predicate on its own (facets excepted). A term "hits" when it is
 *  in the entity's metadata index OR its document body; every group needs one
 *  hit (implicit AND, `OR` inside a group) and no `NOT` term may hit — in the
 *  body either, so an excluded word can't hide in a document. Exported so callers
 *  can count "entities matching the search regardless of facets" (e.g. the
 *  Results tab's hidden-by-filters line). */
export function matchesSearch(e: Entity, state: LibraryFilterState): boolean {
  const s = withDefaults(state);
  if (!s.q) return true;
  const { groups, exclude } = s.searchQuery!;
  if (groups.length === 0 && exclude.length === 0) return true;
  const meta = s.searchIndex.get(e.id) ?? "";
  const hit = (t: string) =>
    termIn(meta, t) ||
    (s.fullTextSearch && termIn(entityFullTextBlob(e, s.language, s.source), t));
  return groups.every((g) => g.some(hit)) && !exclude.some(hit);
}

/** How deep to walk a chain: every segment, or with `partialPaths` only as
 *  far as the deepest node the tested facets read. */
const chainDepth = (partial: boolean | undefined, segments: ChainSegment[], indices: number[]) =>
  partial ? Math.max(1, ...indices) : segments.length;

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
    const maxDepth = chainDepth(ac.partialPaths, ac.segments, active.map((c) => c.segmentIndex));
    const { tuples } = chains(ac.graph, e.id, ac.segments, { maxPaths: ac.maxPaths, maxDepth });
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
  for (const node of compile(s)) {
    if (except !== undefined && node.keys.includes(except)) continue;
    if (!node.test(e)) return false;
  }
  return chainMatches(e, s, except);
}

/** One pass that serves the aggregation of many facets at once. `visit` gets
 *  each record that passes every node but at most one, with the keys of the
 *  node it failed (`null` when it failed none): it counts towards a facet when
 *  it failed none, or only that facet's node. The same answer as one
 *  `matchesAll(e, s, key)` pass per facet, in one pass. */
export function forEachFacetBase(
  entities: readonly Entity[],
  state: LibraryFilterState,
  visit: (e: Entity, failed: readonly string[] | null) => void,
): void {
  const s = withDefaults(state);
  const nodes = compile(s);
  outer: for (const e of entities) {
    let failed: readonly string[] | null = null;
    for (const node of nodes) {
      if (node.test(e)) continue;
      if (failed) continue outer;
      failed = node.keys;
    }
    if (!chainMatches(e, s)) continue;
    visit(e, failed);
  }
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
    partialPaths?: boolean;
  },
  graph: ChainGraph,
): Map<string, number> {
  const s = withDefaults(state);
  const m = new Map<string, number>();
  const ac = s.chains.find((c) => c.chainId === def.chainId);
  const others = ac
    ? ac.constraints.filter((c) => c.facetKey !== def.key && c.values.size > 0)
    : [];
  const maxDepth = chainDepth(def.partialPaths, def.segments, [
    def.segmentIndex,
    ...others.map((c) => c.segmentIndex),
  ]);
  for (const e of entities) {
    if (e.typeId !== def.rootTypeId) continue;
    if (!matchesAll(e, s, def.key)) continue;
    const { tuples } = chains(graph, e.id, def.segments, { maxPaths: def.maxPaths, maxDepth });
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
