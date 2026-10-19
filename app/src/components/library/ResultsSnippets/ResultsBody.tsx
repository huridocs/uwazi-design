import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Entity } from "../../../data/entities";
import type { Language } from "../../../atoms/language";
import type { DataSource } from "../../../utils/libraryFacets";
import { buildSnippetsFor, contextWordsFor } from "../../../utils/librarySnippets";
import { useAtom, useAtomValue } from "jotai";
import {
  librarySearchMatchAtom,
  librarySearchScopeAtom,
  matchTypeFiltersAtom,
  type LibraryPageSize,
  type MatchTypeFilters,
} from "../../../atoms/library";
import { breakpointAtom } from "../../../atoms/viewport";
import { LibraryPageEnd } from "../LibraryPagination";
import { ListInfoRow } from "../../shared/ListInfoRow";
import { ToggleChip } from "../../shared/ToggleChip";
import { CollapseControls } from "../../relationships/CollapseControls";
import {
  CorpusLoadState,
  HiddenByFilters,
  NoSearchState,
  ResultEvidence,
  ResultRecord,
  ZeroResults,
  passageOwners,
  type EvidenceHandlers,
  type SelectHandler,
} from "./ResultRecord";
import { useSettledWidth } from "../../../hooks/useSettledWidth";
import type { ZeroResultSuggestion } from "../../../utils/zeroResultSuggestions";

const NO_SUGGESTIONS: readonly ZeroResultSuggestion[] = [];
import type { RelevanceBreakdown } from "../../../utils/relevance";

type MatchType = keyof MatchTypeFilters;
const MATCH_TYPES: { key: MatchType; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "properties", label: "Properties" },
  { key: "document", label: "Document" },
];

/** What a snippet's text column loses to its surroundings inside the lane:
 *  the pane gutter both sides (24), the card's border and padding (26) and the
 *  line's own padding (16). */
const PASSAGE_INSET = 66;

interface Props {
  query: string;
  /** The already-filtered, query-ranked entity set (the left-pane list). */
  entities: Entity[];
  source: DataSource;
  language: Language;
  cejilLoading: boolean;
  cejilError: boolean;
  onRetry: () => void;
  onFocusProperty: (id: string, fieldKey: string) => void;
  onSelectSnippet: (id: string, page: number) => void;
  /** Open a record (its head, or the record a "same passage" line names). */
  onSelect: SelectHandler;
  /** The record open in the preview. */
  selectedId: string | null;
  onClearSearch: () => void;
  /** How many query matches the active facets are excluding (0 = none hidden). */
  hiddenByFilters: number;
  /** Widen the facets (keeping the query) to reveal the hidden matches. */
  onClearFilters: () => void;
  /** How many matches each chip represents (counted with the chips widened). */
  matchTypeCounts: Record<MatchType, number>;
  /** Matches before the chips narrow them — the "of M" in the header count. */
  totalMatches: number;
  /** LibraryView's per-query breakdown cache. Its identity changes only with the
   *  query (it is memoised there), so it doesn't defeat this component's memo. */
  relevanceOf: (e: Entity) => RelevanceBreakdown;
  /** The page shown, on the Library's page state: the same records the main
   *  pane's page holds where it pages, and a pager of its own at the end. */
  page: number;
  pageSize: LibraryPageSize;
  onPage: (page: number) => void;
  pageLabel: string;
  /** With no result, the switches that would bring results back. */
  zeroSuggestions?: readonly ZeroResultSuggestion[];
}

/** The Results-tab evidence view: per matched record, WHERE the term hit (which
 *  field, which page) with the term marked. The drawer, the rail panel and the
 *  phone sheet all draw it. One `ResultRecord` card per record, the shape every
 *  results surface shares, with `ResultEvidence` under it; a page another
 *  record already shows reads "↳ Same passage as …". The left pane already
 *  lists the records; this shows the snippets the grid can't. Blank-state
 *  order: error → loading → no-search → no-results → list.
 *
 *  MEMOISED. Every render of this rebuilds `buildSnippetsFor` for its whole
 *  visible page — a windowing pass per entity — and LibraryView re-renders on
 *  every keystroke whether or not the deferred query moved. Without the memo (and
 *  the stable callbacks at the call site) that was ~40 entities re-snippeted per
 *  character typed, for a list showing the SAME query's results. */
export const ResultsBody = memo(function ResultsBody({
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
  matchTypeCounts,
  totalMatches,
  relevanceOf,
  page,
  pageSize,
  onPage,
  pageLabel,
  zeroSuggestions = NO_SUGGESTIONS,
}: Props) {
  const compact = useAtomValue(breakpointAtom) === "mobile";
  const pageStart = (page - 1) * pageSize;
  const pageEntities = useMemo(() => entities.slice(pageStart, pageStart + pageSize), [entities, pageStart, pageSize]);
  const pageCount = Math.max(1, Math.ceil(entities.length / pageSize));
  // The chips are FILTER state (they narrow the left pane too — see
  // `matchTypeFiltersAtom`), so `entities` already reflects them.
  const [activeTypes, setActiveTypes] = useAtom(matchTypeFiltersAtom);
  // Per-entity expand state (absent = expanded). Owned here so Collapse/Expand
  // all can drive every card; each card is standalone (off the relationships
  // globals), so this never bleeds across surfaces.
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  // Per-entity "show every page-snippet". Kept here, next to `expandedMap`, for
  // the same reason: the card is standalone, so nothing about its expansion may
  // ride the relationships panel's expand/collapse atoms.
  const [showAllMap, setShowAllMap] = useState<Record<string, boolean>>({});
  const trimmed = query.trim();
  // The search's scope and match mode narrow the passages as they narrow the set.
  const scope = useAtomValue(librarySearchScopeAtom);
  const match = useAtomValue(librarySearchMatchAtom);
  /* The lane's width sets how much context each excerpt carries: about three
     lines of the passage column. Held while the drawer divider is dragged and
     applied once on release (`useSettledWidth`), so a drag doesn't re-snippet
     and re-wrap every card under the reader. */
  const [laneRef, laneW] = useSettledWidth();
  const ctx = contextWordsFor(laneW ? laneW - PASSAGE_INSET : 0, 3);

  // `entities` is the already-filtered set. The left-pane filter and
  // `buildSnippetsFor` scan the SAME metadata fields, so every filtered entity is
  // guaranteed ≥1 metadata snippet — the match count is just `entities.length`,
  // and we only compute snippets for the visible slice, not the whole (thousands-
  // strong CEJIL) set.
  // Nothing is built until the lane is measured: the measure lands in the same
  // commit, before paint, and building at the floor budget first paid for a
  // second full pass the moment it did.
  const measured = laneW > 0;
  const capped = useMemo(
    () =>
      (measured ? pageEntities : [])
        .map((e) => ({
          entity: e,
          snippets: buildSnippetsFor(e, trimmed, language, source, { contextWords: ctx, scope, match }),
        }))
        .filter((x) => x.snippets.count > 0),
    [measured, pageEntities, trimmed, language, source, ctx, scope, match],
  );

  // Only the cards the user actually expanded are rebuilt uncapped — the excerpt
  // WINDOWING is the cost, so paying it for every card would tax the common case
  // to serve the rare one. The honest total (`fullTextTotal`) comes back either
  // way, which is what the capped cards need to offer "5 of N". Kept as its own
  // memo so toggling one card doesn't re-derive the other thirty-nine.
  const rendered = useMemo(
    () =>
      capped.map((x) =>
        showAllMap[x.entity.id]
          ? {
              entity: x.entity,
              snippets: buildSnippetsFor(x.entity, trimmed, language, source, {
                maxFullText: Infinity,
                contextWords: ctx,
                scope,
                match,
              }),
            }
          : x,
      ),
    [capped, showAllMap, trimmed, language, source, ctx, scope, match],
  );

  // Who shows each passage first, in the order the cards are drawn.
  const owners = useMemo(() => passageOwners(rendered), [rendered]);
  const handlers = useMemo<EvidenceHandlers>(
    () => ({ onFocusProperty, onSelectSnippet, onSelect }),
    [onFocusProperty, onSelectSnippet, onSelect],
  );

  // A new page starts at the top of the lane, its cards open.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const setLane = useCallback(
    (el: HTMLDivElement | null) => {
      scrollRef.current = el;
      laneRef(el);
    },
    [laneRef],
  );
  useEffect(() => {
    setExpandedMap({});
    setShowAllMap({});
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pageEntities, trimmed, language, source]);

  const isExpanded = (id: string) => expandedMap[id] ?? true;
  const expandedCount = rendered.filter((x) => isExpanded(x.entity.id)).length;
  const setAllExpanded = (val: boolean) =>
    setExpandedMap(Object.fromEntries(rendered.map((x) => [x.entity.id, val])));

  // error → loading (CEJIL corpus is the only real async path in mock mode).
  if (source === "cejil" && cejilLoading) {
    return (
      <Shell>
        <CorpusLoadState error={cejilError} onRetry={onRetry} />
      </Shell>
    );
  }

  // no-search — the tab was opened without a query.
  if (!trimmed) {
    return (
      <Shell>
        <NoSearchState hint="Results show the passages behind each hit." />
      </Shell>
    );
  }

  // no-results — query set, nothing matched AT ALL. (Chips hiding everything is
  // a different state: the header + chips still render so they can be re-enabled.)
  if (totalMatches === 0) {
    return (
      <Shell>
        <ZeroResults query={trimmed} scope={scope} suggestions={zeroSuggestions} onClearSearch={onClearSearch} />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Hosted by the Library drawer (a gutter host): the header's rule spans the
          panel (`bleed`), and nothing in it carries side padding of its own. */}
      <header data-part="header" className="bleed shrink-0" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        {/* Match-type chips and the collapse controls on ONE row — the shared
            list-header shape. NO count and no search chip here: this drawer sits
            beside the toolbar masthead that already prints "N results for
            [chip]", and on a phone the Results sheet's section label carries the
            number — a second copy in the panel was the duplication this row
            used to be. */}
        <ListInfoRow
          count={null}
          activeFilterCount={0}
          showFilterChips={false}
          leadingSlot={
            <span className="flex items-center gap-1">
              {MATCH_TYPES.map(({ key, label }) => (
                <ToggleChip
                  key={key}
                  label={label}
                  count={matchTypeCounts[key]}
                  active={activeTypes[key]}
                  onToggle={() => setActiveTypes((t) => ({ ...t, [key]: !t[key] }))}
                />
              ))}
            </span>
          }
          rightSlot={
            <CollapseControls
              expandedCount={expandedCount}
              totalCount={rendered.length}
              onExpandAll={() => setAllExpanded(true)}
              onCollapseAll={() => setAllExpanded(false)}
            />
          }
        />

        {/* Always mounted, contents hidden when nothing is excluded: this line
            appears and vanishes as facets are ticked, while the list below is
            being read, so mounting it late shoved every card down. */}
        <HiddenByFilters count={hiddenByFilters} onClear={onClearFilters} />
      </header>

      {/* Block flow (space-y), NOT flex-col: the grouped cards are
          `overflow-hidden`, so in a flex column that overflows they'd shrink to
          their header height and clip their own content. Block flow keeps each
          card at its natural height and lets this container scroll. */}
      <div
        ref={setLane}
        data-part="results"
        className="bleed flex-1 overflow-auto py-3 space-y-2"
      >
        {entities.length === 0 && (
          <p data-part="empty" className="pt-2 text-xs text-ink-tertiary">
            No results for the selected match types.
          </p>
        )}
        {/* The list, and only the list: the empty line and the pager sit
            beside it in the lane, since neither is a result. */}
        <ul data-part="list" className="space-y-2">
        {rendered.map(({ entity, snippets }) => (
          <li key={entity.id} data-part="result">
            <ResultRecord
              variant="card"
              entity={entity}
              snippets={snippets}
              query={trimmed}
              relevance={relevanceOf(entity)}
              selected={selectedId === entity.id}
              onSelect={onSelect}
              // The same selected look as the view's records: in select mode a
              // click here picks the record.
              selectable
              expanded={isExpanded(entity.id)}
              onToggle={() => setExpandedMap((m) => ({ ...m, [entity.id]: !(m[entity.id] ?? true) }))}
            >
              <ResultEvidence
                entity={entity}
                snippets={snippets}
                query={trimmed}
                owners={owners}
                showAll={showAllMap[entity.id] ?? false}
                onToggleShowAll={() => setShowAllMap((m) => ({ ...m, [entity.id]: !m[entity.id] }))}
                handlers={handlers}
              />
            </ResultRecord>
          </li>
        ))}
        </ul>
        {pageCount > 1 && (
          <LibraryPageEnd
            total={entities.length}
            page={page}
            pageSize={pageSize}
            onPage={onPage}
            compact={compact}
            label={pageLabel}
          />
        )}
      </div>
    </Shell>
  );
});

function Shell({ children }: { children: ReactNode }) {
  // `data-tap-guard`: a swipe through the results never opens one (useTapGuard).
  return <div data-component="ResultsBody" data-tap-guard className="flex flex-col h-full min-h-0 bg-warm">{children}</div>;
}
