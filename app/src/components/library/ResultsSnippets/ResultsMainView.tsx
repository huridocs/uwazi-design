import { Children, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { breakpointAtom } from "../../../atoms/viewport";
import { ChevronDown, FileText, Tag } from "lucide-react";
import type { Entity } from "../../../data/entities";
import { getEntityType } from "../../../data/entities";
import type { Language } from "../../../atoms/language";
import type { DataSource } from "../../../utils/libraryFacets";
import {
  buildSnippetsFor,
  compareEvidence,
  contextWordsFor,
  evidenceBadge,
  MAX_FULLTEXT,
  type EntitySnippets,
  type FullTextSnippet,
  type MetadataSnippet,
} from "../../../utils/librarySnippets";
import {
  ALL_MATCH_TYPES,
  libraryHasQuotesAtom,
  matchTypeFiltersAtom,
  libraryResultsLayoutAtom,
  librarySearchMatchAtom,
  librarySearchScopeAtom,
  type LibraryPageSize,
  type ResultsLayout,
} from "../../../atoms/library";
import { LibraryPageEnd } from "../LibraryPagination";
import { entityTime } from "../../../utils/timeline";
import { SectionLabel } from "../../shared/SectionLabel";
import { TimeSpine, SpineDate } from "../TimeSpine";
import { HighlightedText } from "../../shared/HighlightedText";
import { BorrowedDocLine } from "../BorrowedDocLine";
import { AlsoUnder } from "./AlsoUnder";
import { holdTextSelection, selectionIntent, useDrawnIds, useSelectionOrder } from "../EntitySelectBox";
import { useSettledWidth } from "../../../hooks/useSettledWidth";
import { CountBadge } from "../../shared/CountBadge";
import { MatchedTerms } from "../MatchedTerms";
import type { RelevanceBreakdown } from "../../../utils/relevance";
import { AdvancedSearchBar } from "./AdvancedSearchBar";
import type { ZeroResultSuggestion } from "../../../utils/zeroResultSuggestions";

const NO_SUGGESTIONS: readonly ZeroResultSuggestion[] = [];
import {
  CorpusLoadState,
  HiddenByFilters,
  NoSearchState,
  RankedEvidence,
  ResultEvidence,
  ResultRecord,
  SharedLines,
  SnippetLine,
  ZeroResults,
  mixesTemplates,
  passageKey,
  passageOwners,
  properties,
  splitShared,
  labelRuns,
  refsNote,
  type EvidenceHandlers,
  type PassageOwner,
  type Result,
  type SelectHandler,
} from "./ResultRecord";

/** The Results view in the main pane. Same data path as the drawer's Results tab
 *  (`buildSnippetsFor`); `libraryResultsLayoutAtom` picks one of four layouts:
 *  grouped (card per entity), tree (entity → field → snippets), passages (flat
 *  ranked list) and spine (best passage on a time axis).
 *
 *  Page tags and page jumps appear only where the corpus is page-mapped (PATTERNS
 *  §4.2). Counts use `fullTextTotal`, and any render cap is stated. The header
 *  strip stays mounted so toggling a chip can't shift the results; the count
 *  lives in the toolbar masthead only. */

/** Passages excerpts more per record (it IS the passage list) but still a
 *  bounded number; the surplus is reported, never silently dropped. */
const PASSAGES_PER_ENTITY = 8;

/** Container width at which a tree field's snippets go two-up — the point where
 *  one column of short leaf lines stops filling the pane. */
const TWO_COL_TREE = 1024; // 64rem
/** …and where a passage can afford a third line of context. */
const THREE_LINE_PASSAGE = 896; // 56rem

/** Context words per excerpt for each layout, sized to the row's real text
 *  width and line count, so a wider pane shows more words around the hit. */
function excerptBudget(layout: ResultsLayout, w: number): { ctx: number; twoCol: boolean } {
  if (!w) return { ctx: contextWordsFor(0), twoCol: false };
  if (layout === "passages") {
    // The row's padding (`px-3`) and the line's own (16).
    return { ctx: contextWordsFor(w - 40, w >= THREE_LINE_PASSAGE ? 3 : 2), twoCol: false };
  }
  if (layout === "tree") {
    const twoCol = w >= TWO_COL_TREE;
    const col = (w - 56) / (twoCol ? 2 : 1) - (twoCol ? 24 : 0);
    return { ctx: contextWordsFor(col, 2), twoCol };
  }
  if (layout === "grouped") {
    // Properties and pages stack, each the card's full inner width: the
    // card's padding and border (26) and the snippet line's own padding (16).
    const col = w - 26 - 16;
    return { ctx: contextWordsFor(col, 3), twoCol: false };
  }
  // Spine: the passage takes its own line across the row (`SPINE_ROW_H`),
  // which runs from the pane's inline-start to the axis — the axis column and
  // the row's padding off the pane's width.
  return { ctx: contextWordsFor(w - 96, 1), twoCol: false };
}

interface Props {
  query: string;
  /** The already-filtered, query-ranked entity set — the same array the other
   *  library layouts render. */
  entities: Entity[];
  source: DataSource;
  language: Language;
  cejilLoading: boolean;
  cejilError: boolean;
  onRetry: () => void;
  /** Open the entity's Metadata tab focused on a field. */
  onFocusProperty: (id: string, fieldKey: string) => void;
  /** Select + jump the preview's document to a page. */
  onSelectSnippet: (id: string, page: number) => void;
  /** Select for preview (no page jump). */
  onSelect: SelectHandler;
  selectedId: string | null;
  onClearSearch: () => void;
  hiddenByFilters: number;
  onClearFilters: () => void;
  totalMatches: number;
  /** The relevance breakdown LibraryView already computes once per entity per
   *  query. Read for attribution only (`MatchedTerms`); never printed as a score. */
  relevanceOf: (e: Entity) => RelevanceBreakdown;
  /** The page of `entities` drawn, on the Library's page state (the one Cards
   *  and List use, so the same records are on page N in every view). */
  page: number;
  pageSize: LibraryPageSize;
  onPage: (page: number) => void;
  /** The pager's accessible name ("Pages, left pane" in Split). */
  pageLabel: string;
  /** The scroller, for the Library's page scroll: a new page starts at the
   *  top, and Back from a record puts `restoreScroll` back once the page is
   *  built. */
  laneRef: (el: HTMLDivElement | null) => void;
  restoreScroll: number;
  onScrollTop: (top: number) => void;
  /** With no result, the switches that would bring results back. */
  zeroSuggestions?: readonly ZeroResultSuggestion[];
}

export function ResultsMainView({
  query,
  entities,
  source,
  language,
  cejilLoading,
  cejilError,
  onRetry,
  onFocusProperty,
  onSelectSnippet,
  onSelect,
  selectedId,
  onClearSearch,
  hiddenByFilters,
  onClearFilters,
  totalMatches,
  relevanceOf,
  page,
  pageSize,
  onPage,
  pageLabel,
  laneRef,
  restoreScroll,
  onScrollTop,
  zeroSuggestions = NO_SUGGESTIONS,
}: Props) {
  const layout = useAtomValue(libraryResultsLayoutAtom);
  // A Shift range runs in the ranked order these results are drawn in.
  const rankedIds = useMemo(() => entities.map((e) => e.id), [entities]);
  useSelectionOrder(rankedIds);
  // "Search in" replaces the drawer's match-type chips here, so chips left
  // narrowed in the drawer must not narrow this view behind a control it lacks.
  const setMatchTypes = useSetAtom(matchTypeFiltersAtom);
  useEffect(() => setMatchTypes(ALL_MATCH_TYPES), [setMatchTypes]);
  const scope = useAtomValue(librarySearchScopeAtom);
  const narrow = useAtomValue(breakpointAtom) === "mobile";
  const match = useAtomValue(librarySearchMatchAtom);
  const hasQuotes = useAtomValue(libraryHasQuotesAtom);
  const pageStart = (page - 1) * pageSize;
  const pageEntities = useMemo(() => entities.slice(pageStart, pageStart + pageSize), [entities, pageStart, pageSize]);
  // The page this view draws, for "select all" on the page.
  const drawnIds = useMemo(() => pageEntities.map((e) => e.id), [pageEntities]);
  useDrawnIds(drawnIds);
  /* Pane width, quantised to 64px and held while the drawer divider is dragged
     (`useSettledWidth`). It feeds the re-snippeting memo below, so it must only
     change on release, not at every step of a drag. */
  const [bodyRef, paneW] = useSettledWidth();
  // Per-entity "show every page-snippet", owned here so the capped `results`
  // memo stays cheap and only the expanded cards pay for the extra windowing.
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const trimmed = query.trim();

  useEffect(() => {
    setShowAll({});
  }, [pageEntities, trimmed, language, source, layout]);

  const budget = excerptBudget(layout, paneW);

  // Nothing is built until the pane is measured — see ResultsBody.
  const measured = paneW > 0;
  const cappedResults = useMemo<Result[]>(
    () =>
      (measured ? pageEntities : [])
        .map((e) => ({
          entity: e,
          snippets: buildSnippetsFor(e, trimmed, language, source, {
            maxFullText: layout === "passages" ? PASSAGES_PER_ENTITY : MAX_FULLTEXT,
            contextWords: budget.ctx,
            scope,
            match,
          }),
        }))
        .filter((r) => r.snippets.count > 0),
    [measured, pageEntities, trimmed, language, source, layout, budget.ctx, scope, match],
  );

  // Only the cards the user expanded are re-derived uncapped — the windowing
  // pass is the cost, so the common case shouldn't pay it. Kept as its own memo
  // so expanding one card doesn't rebuild the rest.
  const results = useMemo<Result[]>(
    () =>
      cappedResults.map((r) =>
        showAll[r.entity.id]
          ? {
              entity: r.entity,
              snippets: buildSnippetsFor(r.entity, trimmed, language, source, {
                maxFullText: Infinity,
                contextWords: budget.ctx,
                scope,
                match,
              }),
            }
          : r,
      ),
    [cappedResults, showAll, trimmed, language, source, budget.ctx, scope, match],
  );

  // Spine's axis spans every dated result, not only this page's.
  const spineDomain = useMemo(() => {
    if (layout !== "spine") return undefined;
    let min = Infinity;
    let max = -Infinity;
    let count = 0;
    for (const e of entities) {
      const t = entityTime(e);
      if (t === null) continue;
      count++;
      if (t < min) min = t;
      if (t > max) max = t;
    }
    return count ? { min, max, count } : undefined;
  }, [entities, layout]);

  // Back from a record: the scroll goes back once the page is built (the
  // scroller is empty until the pane is measured).
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pendingScroll = useRef(restoreScroll);
  useLayoutEffect(() => {
    if (!results.length || pendingScroll.current <= 0 || !scrollerRef.current) return;
    scrollerRef.current.scrollTop = pendingScroll.current;
    pendingScroll.current = 0;
  }, [results]);
  const setScroller = useCallback(
    (el: HTMLDivElement | null) => {
      scrollerRef.current = el;
      bodyRef(el);
      laneRef(el);
    },
    [bodyRef, laneRef],
  );

  // Template · country · year on each head only where the set mixes templates.
  const facts = useMemo(() => mixesTemplates(entities), [entities]);
  // Who shows each passage first, in the order Grouped and Tree draw them.
  // Passages and Spine order their own and build theirs.
  const owners = useMemo(() => passageOwners(results), [results]);
  const handlers = useMemo<EvidenceHandlers>(
    () => ({ onFocusProperty, onSelectSnippet, onSelect }),
    [onFocusProperty, onSelectSnippet, onSelect],
  );
  const toggleShowAll = useCallback((id: string) => setShowAll((m) => ({ ...m, [id]: !m[id] })), []);

  if (source === "cejil" && cejilLoading) {
    return (
      <Frame bar={null}>
        <CorpusLoadState error={cejilError} onRetry={onRetry} />
      </Frame>
    );
  }

  // The toolbar heads every state below, the empty ones included: it can build
  // a query from nothing, and widening a scope is the way out of "No matches".
  const bar = (
    <AdvancedSearchBar
      hasQuotes={hasQuotes}
      layout={narrow ? "stacked" : "wide"}
      trailing={
        // Always mounted, so ticking facets never changes the bar's height or
        // shifts the results. Empty, it takes no width, which the query's chips
        // use instead; showing it only narrows their scrolling row.
        <HiddenByFilters count={hiddenByFilters} onClear={onClearFilters} inline />
      }
    />
  );

  // The switcher keeps this segment whether or not a query exists (removing it
  // would shift every control beside it), so the view owns the no-query state.
  if (!trimmed) {
    return (
      <Frame bar={bar}>
        <NoSearchState hint="Type in the search box, or add an exact phrase, alternatives or exclusions above." />
      </Frame>
    );
  }

  if (totalMatches === 0) {
    return (
      <Frame bar={bar}>
        <ZeroResults query={trimmed} scope={scope} suggestions={zeroSuggestions} onClearSearch={onClearSearch} />
      </Frame>
    );
  }

  const pageCount = Math.max(1, Math.ceil(entities.length / pageSize));

  return (
    <Frame bar={bar} layout={layout}>
      {/* Hosted by the Library main pane (a gutter host): the card lane is a
          `bleed` scroll lane, so its scrollbar sits at the pane edge. */}
      <div
        ref={setScroller}
        data-part="results"
        onScroll={(e) => onScrollTop(e.currentTarget.scrollTop)}
        className="@container bleed flex-1 min-h-0 overflow-auto"
      >
        {entities.length === 0 ? (
          <p data-part="empty" className="pt-6 text-center text-xs text-ink-tertiary">
            No results with the current filters.
          </p>
        ) : layout === "grouped" ? (
          <GroupedBody
            results={results}
            query={trimmed}
            selectedId={selectedId}
            facts={facts}
            owners={owners}
            handlers={handlers}
            showAll={showAll}
            relevanceOf={relevanceOf}
            onToggleShowAll={toggleShowAll}
          />
        ) : layout === "tree" ? (
          <TreeBody
            results={results}
            query={trimmed}
            selectedId={selectedId}
            facts={facts}
            owners={owners}
            handlers={handlers}
            relevanceOf={relevanceOf}
            twoUp={budget.twoCol}
          />
        ) : layout === "passages" ? (
          <PassagesBody results={results} query={trimmed} selectedId={selectedId} handlers={handlers} />
        ) : (
          <SpineBody
            results={results}
            query={trimmed}
            selectedId={selectedId}
            onSelect={onSelect}
            onSelectSnippet={onSelectSnippet}
            domain={spineDomain}
            undatedTotal={spineDomain ? entities.length - spineDomain.count : 0}
          />
        )}

        {/* The pager again under the last record, as under Cards and List. */}
        {pageCount > 1 && (
          <LibraryPageEnd
            total={entities.length}
            page={page}
            pageSize={pageSize}
            onPage={onPage}
            compact={narrow}
            label={pageLabel}
          />
        )}
      </div>
    </Frame>
  );
}


/** The view's column: the toolbar, then the state below it. No count in the
 *  toolbar: the masthead is the one place this surface prints its number. */
function Frame({ bar, layout, children }: { bar: ReactNode; layout?: ResultsLayout; children: ReactNode }) {
  return (
    <div data-component="ResultsMainView" data-layout={layout} className="flex flex-col h-full min-h-0">
      <header data-part="header" className="shrink-0">
        {bar}
      </header>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 1 — Grouped: one card per record, properties then pages.
 * ------------------------------------------------------------------ */

function GroupedBody({
  results,
  query,
  selectedId,
  facts,
  owners,
  handlers,
  showAll,
  onToggleShowAll,
  relevanceOf,
}: {
  results: Result[];
  query: string;
  selectedId: string | null;
  /** The set mixes templates: each head names its template, country and year. */
  facts: boolean;
  owners: Map<string, PassageOwner>;
  handlers: EvidenceHandlers;
  relevanceOf: (e: Entity) => RelevanceBreakdown;
  /** Records showing every page snippet rather than the capped few. */
  showAll: Record<string, boolean>;
  onToggleShowAll: (id: string) => void;
}) {
  return (
    <ul data-part="grouped" className="flex flex-col gap-2 pb-2">
      {results.map(({ entity, snippets }) => (
        <li key={entity.id} data-part="result">
          <ResultRecord
            variant="card"
            entity={entity}
            snippets={snippets}
            query={query}
            selected={selectedId === entity.id}
            onSelect={handlers.onSelect}
            selectable
            facts={facts}
            relevance={relevanceOf(entity)}
          >
            <ResultEvidence
              entity={entity}
              snippets={snippets}
              query={query}
              owners={owners}
              showAll={!!showAll[entity.id]}
              onToggleShowAll={() => onToggleShowAll(entity.id)}
              handlers={handlers}
            />
          </ResultRecord>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ *
 * 2 — Tree: record → matched field → its snippets, two collapsible
 *     levels, so a long result set can be scanned as an index.
 * ------------------------------------------------------------------ */

function TreeBody({
  results,
  query,
  selectedId,
  facts,
  owners,
  handlers,
  twoUp,
  relevanceOf,
}: {
  results: Result[];
  query: string;
  selectedId: string | null;
  facts: boolean;
  owners: Map<string, PassageOwner>;
  handlers: EvidenceHandlers;
  relevanceOf: (e: Entity) => RelevanceBreakdown;
  /** Lay each branch's leaves in two columns — see `excerptBudget`. */
  twoUp: boolean;
}) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  return (
    <ul data-part="tree" className="flex flex-col gap-1.5 pb-2">
      {results.map(({ entity, snippets }) => {
        const { own, props, shared, commonAlso } = splitShared(entity, snippets, owners);
        const runs = labelRuns(props);
        const bare = props.length === 0 && snippets.fullText.length === 0 && shared.length === 0;
        return (
          <li key={entity.id} data-part="result">
            <ResultRecord
              variant="card"
              entity={entity}
              snippets={snippets}
              query={query}
              selected={selectedId === entity.id}
              onSelect={handlers.onSelect}
              selectable
              facts={facts}
              expanded={!closed[entity.id]}
              onToggle={() => setClosed((m) => ({ ...m, [entity.id]: !m[entity.id] }))}
            >
              <div className="flex flex-col pb-1.5">
                {bare && (
                  <p data-part="title-only" className="px-4 pb-1 text-xs text-ink-tertiary">
                    Matched in the title — nothing else.
                  </p>
                )}
                {runs.map((run) => (
                  <TreeBranch
                    key={run.lines[0].group.fieldKey}
                    twoUp={twoUp}
                    label={run.field}
                    count={run.lines.length}
                    icon={<Tag size={11} className="text-ink-muted" />}
                  >
                    {run.lines.map((l) => (
                      <li key={`${l.group.fieldKey}|${l.text}`}>
                        <SnippetLine
                          entityId={entity.id}
                          text={l.text}
                          query={query}
                          note={refsNote(l.refs)}
                          onActivate={() => handlers.onFocusProperty(entity.id, l.group.fieldKey)}
                        />
                      </li>
                    ))}
                  </TreeBranch>
                ))}
                {snippets.fullText.length > 0 && (
                  <TreeBranch
                    twoUp={twoUp}
                    label={snippets.borrowedFrom ? "Borrowed document" : "Document"}
                    count={snippets.fullTextTotal}
                    icon={<FileText size={11} className="text-ink-muted" />}
                    note={
                      snippets.fullTextTotal > snippets.fullText.length
                        ? `${snippets.fullText.length} of ${snippets.fullTextTotal.toLocaleString()} shown`
                        : undefined
                    }
                    // On the always-mounted branch header, so nothing below moves
                    // when the document is borrowed.
                    trailing={<BorrowedDocLine from={snippets.borrowedFrom} />}
                  >
                    {own.map(({ snippet, also }) => (
                      <li key={`${snippet.page ?? snippet.text}`}>
                        <SnippetLine
                          entityId={entity.id}
                          snippet={snippet}
                          query={query}
                          onJump={handlers.onSelectSnippet}
                          trailing={also.length > 0 ? <AlsoUnder entities={also} onOpenEntity={handlers.onSelect} /> : null}
                        />
                      </li>
                    ))}
                    {commonAlso && (
                      <li className="col-span-full px-2 py-0.5 text-meta text-ink-tertiary">
                        <AlsoUnder entities={commonAlso} onOpenEntity={handlers.onSelect} />
                      </li>
                    )}
                  </TreeBranch>
                )}
                {shared.length > 0 && (
                  <div className="px-3">
                    <SharedLines entity={entity} shared={shared} handlers={handlers} />
                  </div>
                )}
                {/* Shows only the terms that matched nothing; the branches
                    already name the fields that matched. Multi-term queries only. */}
                <MatchedTerms relevance={relevanceOf(entity)} query={query} missedOnly className="px-4 py-1" />
              </div>
            </ResultRecord>
          </li>
        );
      })}
    </ul>
  );
}

/** One collapsible field branch, indented under the record with a guide rail
 *  like the relationships tree. */
function TreeBranch({
  twoUp = false,
  label,
  count,
  icon,
  note,
  trailing,
  children,
}: {
  /** Lay the branch's children out in two columns — see the body. */
  twoUp?: boolean;
  label: string;
  count: number;
  icon: ReactNode;
  note?: string;
  /** Rendered after the note; the Document branch uses it for the borrowed
   *  document's name. */
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div data-component="TreeBranch" data-state={open ? "open" : "closed"} className="px-3 py-1">
      <button
        type="button"
        data-part="toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 max-w-full rounded-md px-1 py-0.5 hover:bg-warm
          transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
          focus-visible:ring-ink/20"
      >
        <ChevronDown
          size={12}
          aria-hidden
          className={`text-ink-muted transition-transform ${open ? "" : "-rotate-90"}`}
        />
        {icon}
        <SectionLabel as="span">{label}</SectionLabel>
        <span data-part="count" className="text-meta tabular-nums text-ink-tertiary">{count.toLocaleString()}</span>
        {note && <span data-part="note" className="text-meta text-ink-tertiary">· {note}</span>}
        {trailing}
      </button>
      {open && (
        /* Two columns past 64rem, since leaves are short lines. `grid`, not
           CSS `columns`: columns flow top-to-bottom and would put leaf 2
           halfway down the pane. */
        <ul
          data-part="leaves"
          className={`mt-0.5 ms-2 ps-2 ${
            // Only with two or more leaves; a single leaf would sit at half
            // width beside an empty column.
            twoUp && Children.count(children) > 1
              ? "grid grid-cols-2 gap-x-6 items-start"
              : "flex flex-col"
          }`}
          style={{ borderInlineStart: "1px solid var(--border-soft)" }}
        >
          {children}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 3 — Passages: one row per record on a single sheet, its passages
 *     under it ranked by `compareEvidence`, folding past three. Records
 *     are ordered by their best passage.
 * ------------------------------------------------------------------ */

function PassagesBody({
  results,
  query,
  selectedId,
  handlers,
}: {
  results: Result[];
  query: string;
  selectedId: string | null;
  handlers: EvidenceHandlers;
}) {
  const { ordered, owners, notShown, titleOnly } = useMemo(() => {
    // A record's rank is its best passage's; the stable sort keeps relevance
    // order on ties. Title-only results have no passage and go last.
    const best = (r: Result) => {
      const all = [...properties(r.snippets), ...r.snippets.fullText];
      return all.reduce<{ groupsMet: number; hits: number } | null>(
        (b, c) => (!b || compareEvidence(c, b) < 0 ? c : b),
        null,
      );
    };
    const ranked = results.map((r) => ({ r, b: best(r) }));
    ranked.sort((x, y) => (!x.b ? 1 : !y.b ? -1 : compareEvidence(x.b, y.b)));
    const ordered = ranked.map((x) => x.r);
    // Pages counted but not excerpted, per document rather than per record:
    // several records can read one document.
    const byDoc = new Map<string, { total: number; shown: number }>();
    let titleOnly = 0;
    for (const { entity, snippets } of ordered) {
      if (!properties(snippets).length && !snippets.fullText.length) titleOnly++;
      if (!snippets.fullText.length) continue;
      const key = snippets.docKey ?? entity.id;
      const d = byDoc.get(key) ?? { total: 0, shown: 0 };
      d.total = Math.max(d.total, snippets.fullTextTotal);
      d.shown = Math.max(d.shown, snippets.fullText.length);
      byDoc.set(key, d);
    }
    let notShown = 0;
    for (const { total, shown } of byDoc.values()) notShown += Math.max(0, total - shown);
    return { ordered, owners: passageOwners(ordered), notShown, titleOnly };
  }, [results]);

  return (
    <div data-part="passages" className="pb-2">
      {/* One paper sheet with hairline-separated rows rather than a card per
          record: a passage list reads down one column. */}
      <ul className="rounded-md border border-border/60 bg-paper overflow-hidden divide-y divide-border/50">
        {ordered.map(({ entity, snippets }) => (
          <li key={entity.id} data-part="result">
            <ResultRecord
              variant="row"
              entity={entity}
              snippets={snippets}
              query={query}
              selected={selectedId === entity.id}
              onSelect={handlers.onSelect}
              selectable
            >
              <RankedEvidence entity={entity} snippets={snippets} query={query} owners={owners} handlers={handlers} />
            </ResultRecord>
          </li>
        ))}
      </ul>
      {(notShown > 0 || titleOnly > 0) && (
        <p data-part="note" className="pt-3 text-center text-meta text-ink-tertiary">
          {notShown > 0 && (
            <>
              {notShown.toLocaleString()} further matching {notShown === 1 ? "page" : "pages"}{" "}
              counted but not excerpted — open a record to read them all.
            </>
          )}
          {notShown > 0 && titleOnly > 0 && <br />}
          {titleOnly > 0 && (
            <>
              {titleOnly.toLocaleString()} {titleOnly === 1 ? "result" : "results"} matched on the
              title alone and {titleOnly === 1 ? "carries" : "carry"} no passage.
            </>
          )}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 4 — Spine: results on a proportional time axis, each with its
 *     strongest passage.
 * ------------------------------------------------------------------ */

/** Two lines: facts, then passage. Must stay within `TimeSpine`'s
 *  `GAP_H + rowHeight ≤ MAX_GAP` invariant, or silences stop eliding. */
const SPINE_ROW_H = 44;

function SpineBody({
  results,
  query,
  selectedId,
  onSelect,
  onSelectSnippet,
  domain,
  undatedTotal,
}: {
  results: Result[];
  query: string;
  selectedId: string | null;
  onSelect: SelectHandler;
  onSelectSnippet: (id: string, page: number) => void;
  /** Every dated result's extent: the axis keeps the whole set's shape while
   *  the rows are one page. */
  domain?: { min: number; max: number; count: number };
  /** Results across every page with no date, for the note under the axis. */
  undatedTotal: number;
}) {
  const { dated, owners } = useMemo(() => {
    const dated = results
      .filter((r) => entityTime(r.entity) !== null)
      .map((r) => ({ key: r.entity.id, t: entityTime(r.entity)!, item: r }));
    // The axis reads in time order, so the earliest record keeps a shared
    // passage and the later ones point back to it.
    const byTime = [...dated].sort((a, b) => a.t - b.t).map((d) => d.item);
    return { dated, owners: passageOwners(byTime) };
  }, [results]);
  const undated = undatedTotal;

  if (!dated.length) {
    return (
      <p data-part="empty" className="pt-6 text-center text-xs text-ink-tertiary">
        {domain
          ? "None of the results on this page carries a date."
          : "None of these results carries a date, so there is no axis to place them on."}
      </p>
    );
  }

  return (
    <div data-part="spine" className="pb-2">
      {/* All geometry is `TimeSpine`'s; this passes only a row height.
          `TimeSpine` derives its scale from that height, so raising
          `SPINE_ROW_H` stretches the axis and can break eliding. */}
      <TimeSpine
        rows={dated}
        domain={domain}
        rowHeight={SPINE_ROW_H}
        dotColor={({ entity }) => getEntityType(entity.typeId)?.color ?? "#6B7280"}
        dotActive={({ entity }) => selectedId === entity.id}
        renderRow={({ entity, snippets }, { t }) => {
          const selected = selectedId === entity.id;
          const color = getEntityType(entity.typeId)?.color ?? "#6B7280";
          // One passage per result: the strongest by `compareEvidence`, page
          // or property. A page an earlier record shows reads as a pointer.
          const best = bestPassage(entity, snippets, owners);
          return (
            <button
              type="button"
              data-part="spine-row"
              aria-pressed={selected}
              onClick={(e) =>
                // A selection gesture selects the record; otherwise the row
                // jumps to its best passage.
                selectionIntent(e)
                  ? onSelect(entity.id, e)
                  : best?.page != null
                    ? onSelectSnippet(entity.id, best.page)
                    : onSelect(entity.id)
              }
              onMouseDown={holdTextSelection}
              style={{ height: SPINE_ROW_H }}
              className={`w-full flex flex-col justify-center px-2 rounded-md text-start
                transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
                focus-visible:ring-inset focus-visible:ring-ink/20 ${
                  selected ? "bg-parchment" : "hover:bg-warm"
                }`}
            >
              {/* Line 1: facts. Line 2: the passage at full row width, so it
                  isn't cut to a few words. */}
              <span className="flex items-center gap-2 min-w-0 h-4">
                <span aria-hidden className="shrink-0 w-1.5 h-1.5 rounded-[2px]" style={{ backgroundColor: color }} />
                {/* A record timed to the hour or the second (`span.hour`,
                    `span.seconds`) prints its time: on Vegas every row is the
                    same day. A day-only date keeps the day. */}
                <SpineDate t={t} withTime={!!(entity.span?.seconds || entity.span?.hour)} />
                <span className="min-w-0 max-w-[18rem] truncate text-xs font-medium text-ink">
                  <HighlightedText text={entity.title} query={query} fieldKey="title" />
                </span>
                <CountBadge {...evidenceBadge(snippets)} />
                <span className="flex-1" />
                {/* Where the passage is: a page (and its count), or the field.
                    `<bdi>` keeps "p.5 · 2×" in order under RTL. Fixed width,
                    so rows line up whether or not they carry a borrowed document. */}
                {best && (
                  <span className="hidden md:flex shrink-0 w-[14rem] items-center gap-1.5 overflow-hidden text-meta text-ink-tertiary">
                    <bdi dir="ltr" className="shrink-0">
                      {best.label}
                    </bdi>
                    {best.isDocument && <BorrowedDocLine from={snippets.borrowedFrom} className="min-w-0" fade />}
                  </span>
                )}
              </span>
              {best && (
                <span className="block min-w-0 truncate ps-3.5 text-xs text-ink-secondary leading-4">
                  {best.sameAs ? (
                    <span data-part="same-passage" className="text-ink-tertiary">
                      ↳ Same passage as {best.sameAs.title}
                    </span>
                  ) : (
                    <HighlightedText text={best.text} query={query} />
                  )}
                </span>
              )}
            </button>
          );
        }}
      />
      {undated > 0 && (
        <p data-part="note" className="pt-3 text-center text-meta text-ink-tertiary">
          {undated.toLocaleString()} matching {undated === 1 ? "result carries" : "results carry"} no
          date and {undated === 1 ? "is" : "are"} not plotted.
        </p>
      )}
    </div>
  );
}

/** Best-ranked page or property by `compareEvidence` (a page wins a tie).
 *  Never the title, which the row already prints. The label names the page,
 *  or the field; "Document" only where there is no page to name. A page an
 *  earlier record shows comes back with `sameAs`. */
function bestPassage(
  entity: Entity,
  s: EntitySnippets,
  owners: Map<string, PassageOwner>,
): { text: string; page: number | null; label: string; isDocument: boolean; sameAs: Entity | null } | null {
  const top = s.fullText.reduce<FullTextSnippet | null>(
    (best, cur) => (!best || compareEvidence(cur, best) < 0 ? cur : best),
    null,
  );
  const prop = properties(s).reduce<MetadataSnippet | null>(
    (best, cur) => (!best || compareEvidence(cur, best) < 0 ? cur : best),
    null,
  );
  if (top && (!prop || compareEvidence(prop, top) >= 0)) {
    const parts = top.page !== null ? [`p.${top.page}`] : [s.borrowedFrom ? "Borrowed document" : "Document"];
    if (top.hits > 1) parts.push(`${top.hits}×`);
    const owner = owners.get(passageKey(s, top, entity.id))?.owner;
    return {
      text: top.text,
      page: top.page,
      label: parts.join(" · "),
      isDocument: true,
      sameAs: owner && owner.id !== entity.id ? owner : null,
    };
  }
  // `isDocument` gates the borrowed-document attribution: a property hit came
  // from the record itself, however its document was resolved.
  if (prop?.texts[0]) {
    const owner = prop.refId ? owners.get(`ref|${prop.refId}`)?.owner : undefined;
    return {
      text: prop.texts[0],
      page: null,
      label: prop.field,
      isDocument: false,
      sameAs: owner && owner.id !== entity.id ? owner : null,
    };
  }
  return null;
}
