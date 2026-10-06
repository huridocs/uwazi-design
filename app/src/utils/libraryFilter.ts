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
  bodyInScope,
  scopedFieldText,
  type MatchCategories,
  type SearchScope,
} from "./librarySnippets";
import { fold, termIn, type SearchQuery } from "./queryTokens";
import {
  entityCountries,
  entityInheritedValues,
  type DataSource,
  type LibraryInheritedDef,
  type LibraryRangeDef,
} from "./libraryFacets";
import { entityPropertyIntervals, type ValueInterval } from "./propertyValues";
import { dateBoundMs } from "./timeline";

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

/** An active range facet: bounds (ms for dates, the number itself for
 *  numerics; null = open), the mode, and the templates that carry it. */
export interface ActiveRange {
  def: LibraryRangeDef;
  lo: number | null;
  hi: number | null;
  mode: LibraryMatch;
  carriers: ReadonlySet<string>;
}

/** The facet key a range facet's mode and bounds are stored and excepted
 *  under. */
export const rangeKey = (name: string) => `range:${name}`;

/** A range facet's bounds as typed: a number or a "yyyy-mm-dd" day. */
export interface RangeBounds {
  from: string;
  to: string;
}

/** Typed bounds as numbers: a date's "to" covers its whole day. */
export function rangeBoundsOf(def: LibraryRangeDef, b: RangeBounds | undefined): { lo: number | null; hi: number | null } {
  if (!b) return { lo: null, hi: null };
  if (def.kind === "date") return { lo: dateBoundMs(b.from, "from"), hi: dateBoundMs(b.to, "to") };
  const num = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  return { lo: num(b.from), hi: num(b.to) };
}

/** The range facets that narrow: bounds set, or `missing`. */
export function activeRangesOf(
  bounds: Record<string, RangeBounds>,
  match: Record<string, LibraryMatch>,
  defs: readonly LibraryRangeDef[],
): ActiveRange[] {
  const out: ActiveRange[] = [];
  for (const def of defs) {
    const mode = match[rangeKey(def.name)] ?? "any";
    const { lo, hi } = rangeBoundsOf(def, bounds[def.name]);
    if (mode !== "missing" && lo === null && hi === null) continue;
    out.push({ def, lo, hi, mode, carriers: new Set(def.templateIds) });
  }
  return out;
}

/** One range facet's test on one record's intervals. A value matches when it
 *  touches [lo, hi]: a date range overlapping the window counts. */
export function matchInterval(
  ivs: readonly ValueInterval[],
  lo: number | null,
  hi: number | null,
  mode: LibraryMatch,
  carrier: boolean,
): boolean {
  const touches = (iv: ValueInterval) => (lo === null || iv[1] >= lo) && (hi === null || iv[0] <= hi);
  switch (mode) {
    case "all":
      return ivs.length > 0 && ivs.every(touches);
    case "none":
      return carrier && !ivs.some(touches);
    case "missing":
      return carrier && ivs.length === 0;
    default:
      return ivs.some(touches);
  }
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
  /** Active numeric and date range facets. */
  ranges: ActiveRange[];
  /** OR and NOT groups over the facets above. */
  groups: FilterGroup[];
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
  /** Which text the query is tested against (Adv. Search's "Search in").
   *  Absent = `all`. */
  searchScope?: SearchScope;
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
  ranges: [],
  groups: [],
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
    ranges: s.ranges ?? [],
    groups: s.groups ?? [],
    chains: s.chains ?? [],
    q: s.q ?? "",
    searchIndex: s.searchIndex ?? EMPTY_SEARCH_INDEX,
    searchTerms: s.searchTerms ?? [],
    searchQuery: s.searchQuery ?? { groups: (s.searchTerms ?? []).map((t) => [t]), exclude: [] },
    fullTextSearch: s.fullTextSearch ?? false,
    searchScope: s.searchScope ?? "all",
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

/** A group in the sidebar: two facets joined by OR, or one facet negated.
 *  The search, the match-type chips and the relationship chains (whose values
 *  are path-coupled to each other) are not groupable. Keys are facet keys ("type", "country", `inheritedKey(…)`, `rangeKey(…)`,
 *  …). A member that does not narrow drops out; a group with no member that
 *  narrows does nothing. */
export interface FilterGroup {
  id: string;
  op: "or" | "not";
  keys: string[];
}

/** The filter as an expression tree: an AND of nodes, each a facet or a
 *  group (OR of facets, or NOT of one). Built once per state, holding only the
 *  facets that narrow, cheapest first; a group sits where its first member
 *  would. A facet's aggregation skips the whole node that holds it, so inside
 *  an OR group a value's count is what ticking it would add, and inside a NOT
 *  group what it would take away. */
const compiledStates = new WeakMap<LibraryFilterState, FilterNode[]>();
function compile(s: LibraryFilterState): FilterNode[] {
  const hit = compiledStates.get(s);
  if (hit) return hit;
  const nodes: FilterNode[] = [];
  const leaf = (key: string, test: (e: Entity) => boolean) => nodes.push({ keys: [key], test });
  // Search and the match-type gate go after the groups: they are the costly
  // tests, and no group holds them.
  const tail: FilterNode[] = [];
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
  for (const r of s.ranges)
    leaf(rangeKey(r.def.name), (e) =>
      matchInterval(
        entityPropertyIntervals(e, r.def.name, s.language, r.def.kind),
        r.lo,
        r.hi,
        r.mode,
        r.carriers.has(e.typeId),
      ),
    );
  // Match every query token (AND) somewhere in the entity's metadata index OR —
  // when the query is long enough to be worth the corpus scan — its document
  // body. Quoted phrases are single contiguous tokens. Sharing `searchTerms`
  // with the snippet builder + highlighter keeps filter, snippets, and marks in
  // one semantics (so "torture cruel" matches an entity carrying both words in
  // different fields/pages, and both get marked).
  if (s.q) tail.push({ keys: ["search"], test: (e) => matchesSearch(e, s) });
  // Where the query matched (title / properties / document). All-on is the
  // common case and adds no node, so the (blob-scanning) categorisation is
  // only paid when the user has actually narrowed.
  const { title, properties, document } = s.matchTypes;
  if (s.q && !(title && properties && document))
    tail.push({
      keys: ["matchType"],
      test: (e) =>
        passesMatchTypes(s.matchTypes, s.q, () =>
          // The parsed terms, not `s.q`: that is lowercased, and re-tokenising it
          // would read `not` / `or` as words to match.
          matchCategoriesWithTerms(e, s.searchTerms, s.language, s.source, s.searchScope),
        ),
    });
  const out = [...withGroups(nodes, s.groups), ...tail];
  compiledStates.set(s, out);
  return out;
}

/** Does a group change the result? An OR needs two members that narrow (one
 *  is the facet alone); a NOT needs one. What the chips and the badge count. */
export const groupEffective = (g: FilterGroup, narrowing: (key: string) => boolean) =>
  g.keys.filter(narrowing).length >= (g.op === "or" ? 2 : 1);

/** Fold the groups into the AND list: each group's narrowing members leave
 *  the list and come back as one node, in the first member's place. The node
 *  also carries the keys of members that do not narrow yet, so their
 *  aggregation skips it: a value the group's other members exclude still has a
 *  count, and can be ticked inside the group. */
function withGroups(leaves: FilterNode[], groups: readonly FilterGroup[]): FilterNode[] {
  if (!groups.length) return leaves;
  const byKey = new Map(leaves.map((n) => [n.keys[0], n] as const));
  const replaced = new Map<FilterNode, FilterNode | null>();
  for (const g of groups) {
    const members = g.keys.map((k) => byKey.get(k)).filter((n): n is FilterNode => !!n && !replaced.has(n));
    if (!members.length) continue;
    const tests = members.map((n) => n.test);
    const narrowing = members.map((n) => n.keys[0]);
    const keys = [...narrowing, ...g.keys.filter((k) => !byKey.has(k))];
    const node: FilterNode =
      g.op === "not"
        ? { keys, test: (e) => !tests.some((t) => t(e)) }
        : { keys, test: (e) => tests.some((t) => t(e)) };
    replaced.set(members[0], node);
    for (const m of members.slice(1)) replaced.set(m, null);
  }
  const out: FilterNode[] = [];
  for (const n of leaves) {
    const r = replaced.get(n);
    if (r === undefined) out.push(n);
    else if (r) out.push(r);
  }
  return out;
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
  const scope = s.searchScope ?? "all";
  // Scoped, the fields in scope stand in for the whole index, and the body is
  // read only by `all` and `fulltext`.
  const meta =
    scope === "all" ? (s.searchIndex.get(e.id) ?? "") : scopedFieldText(e, s.language, scope);
  const body = s.fullTextSearch && bodyInScope(scope);
  const hit = (t: string) =>
    (!!meta && termIn(meta, t)) ||
    (body && termIn(entityFullTextBlob(e, s.language, s.source), t));
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
