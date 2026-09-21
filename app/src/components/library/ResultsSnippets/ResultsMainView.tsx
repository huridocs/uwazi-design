import { Children, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Search, ChevronDown, FileText, Tag } from "lucide-react";
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
  type BorrowedDoc,
  type EntitySnippets,
  type FullTextSnippet,
  type MetadataSnippet,
} from "../../../utils/librarySnippets";
import {
  matchTypeFiltersAtom,
  libraryResultsLayoutAtom,
  resultsActivePageAtom,
  type MatchTypeFilters,
  type ResultsLayout,
} from "../../../atoms/library";
import { entityTime } from "../../../utils/timeline";
import { RelationshipGroupedCard } from "../../relationships/RelationshipGroupedCard";
import { SectionLabel } from "../../shared/SectionLabel";
import { TimeSpine, SpineDate } from "../TimeSpine";
import { HighlightedText } from "../../shared/HighlightedText";
import { EntityTypeChip } from "../../shared/EntityTypeChip";
import { ListInfoRow } from "../../shared/ListInfoRow";
import { BorrowedDocLine } from "../BorrowedDocLine";
import { Hint } from "../../shared/Hint";
import { PageTag } from "../../shared/PageTag";
import { AlsoUnder } from "./AlsoUnder";
import { EntitySelectBox, FOCUS_RING_ON_SELECT, holdTextSelection, useDrawnIds, useSelectionOrder } from "../EntitySelectBox";
import { useSettledWidth } from "../../../hooks/useSettledWidth";
import { ToggleChip } from "../../shared/ToggleChip";
import { CountBadge } from "../../shared/CountBadge";
import { MatchedTerms } from "../MatchedTerms";
import type { RelevanceBreakdown } from "../../../utils/relevance";

/** The Results view in the MAIN pane — the drawer's evidence list given the
 *  width it always wanted.
 *
 *  Same data path as the Results tab (`buildSnippetsFor` → marked excerpts), four
 *  readings of it (`libraryResultsLayoutAtom`, picked in the Display menu the way
 *  the timeline picks its own):
 *
 *    grouped   one wide card per entity — properties BESIDE passages, not stacked
 *    tree      entity → field → snippets, collapsible at both levels
 *    passages  every passage as one flat ranked list, the entity secondary
 *    spine     each entity's strongest passage at its exact date on a time axis
 *
 *  Honesty rules this surface inherits (PATTERNS §4.2): a page tag and a
 *  jump-to-page appear ONLY where the corpus really is page-mapped; a snippet
 *  whose page is `null` is a passive excerpt. Counts are `fullTextTotal` (every
 *  matched page), never the number of excerpts built — and where this view caps
 *  what it renders, it says so rather than passing the cap off as the whole set.
 *
 *  Layout stability: the header strip (chips, cap note) is mounted at all times
 *  with only its CONTENTS toggling, so ticking a match-type chip can't shove
 *  the results out from under the pointer. The COUNT is not here at all — the
 *  toolbar masthead is the one place this surface's number lives. */

type MatchType = keyof MatchTypeFilters;
const MATCH_TYPES: { key: MatchType; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "properties", label: "Properties" },
  { key: "document", label: "Document" },
];

/** Entities rendered per page. Lower than the drawer's 40 — each card here is
 *  far bigger — and every layout pays the same windowing cost per entity. */
const STEP = 24;
/** Passages view excerpts more per entity (it IS the passage list) but still a
 *  bounded number; the surplus is reported, never silently dropped. */
const PASSAGES_PER_ENTITY = 8;

/** Container width at which a tree field's snippets go two-up — the point where
 *  one column of short leaf lines stops filling the pane. */
const TWO_COL_TREE = 1024; // 64rem
/** …and where a passage can afford a third line of context. */
const THREE_LINE_PASSAGE = 896; // 56rem

/** The excerpt budget each layout gets: the column the prose is set in, and how
 *  many lines of it the layout can afford.
 *
 *  The column is the one the row actually has. Passages used to be capped at a
 *  74ch/96ch measure with the context sized to that cap, so on a wide pane every
 *  excerpt stopped two thirds of the way across and carried a dozen words a
 *  side. Now the text runs to the row's edge and the context is sized to that
 *  width, so a wider pane shows more of the sentence around the hit.
 *
 *  Passage and attribution are still one block (no meta column beside the
 *  quote): a stretched `1fr_15rem` split parked the attribution a hand's width
 *  from the sentence it names. */
function excerptBudget(layout: ResultsLayout, w: number): { ctx: number; twoCol: boolean } {
  if (!w) return { ctx: contextWordsFor(0), twoCol: false };
  if (layout === "passages") {
    // The row's own padding (`px-3`).
    return { ctx: contextWordsFor(w - 24, w >= THREE_LINE_PASSAGE ? 3 : 2), twoCol: false };
  }
  if (layout === "tree") {
    const twoCol = w >= TWO_COL_TREE;
    const col = (w - 56) / (twoCol ? 2 : 1) - (twoCol ? 24 : 0);
    return { ctx: contextWordsFor(col, 2), twoCol };
  }
  if (layout === "grouped") {
    // Properties and Document stack, each the card's full inner width: the
    // card's padding and border (34) and the passage row's own padding (16).
    const col = w - 34 - 16;
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
  onSelect: (id: string, e?: React.MouseEvent) => void;
  selectedId: string | null;
  onClearSearch: () => void;
  hiddenByFilters: number;
  onClearFilters: () => void;
  matchTypeCounts: Record<MatchType, number>;
  totalMatches: number;
  /** The relevance breakdown LibraryView already computes once per entity per
   *  query. Read for attribution only (`MatchedTerms`); never printed as a score. */
  relevanceOf: (e: Entity) => RelevanceBreakdown;
}

/** What a document hit is called: the entity's own document, or one it reads
 *  from a connected entity. The source is named by `BorrowedDocLine` beside it. */
const documentLabel = (borrowed: BorrowedDoc | null) => (borrowed ? "Borrowed document" : "Document");

interface Result {
  entity: Entity;
  snippets: EntitySnippets;
}

/** Every layout here prints the entity's title, marked. So the title's own
 *  snippet is dropped from the bodies: restating the words directly under the
 *  heading that already highlights them is noise, and at this width it's a
 *  paragraph of it. (The count badge still counts the title hit — the badge
 *  reports matches, not rows.) A result that matched ONLY on its title therefore
 *  has no body, and says so in one line rather than showing an empty card. */
const properties = (s: EntitySnippets): MetadataSnippet[] =>
  s.metadata.filter((m) => m.fieldKey !== "title");

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
  matchTypeCounts,
  totalMatches,
  relevanceOf,
}: Props) {
  const layout = useAtomValue(libraryResultsLayoutAtom);
  // A Shift range runs in the ranked order these results are drawn in.
  const rankedIds = useMemo(() => entities.map((e) => e.id), [entities]);
  useSelectionOrder(rankedIds);
  const [activeTypes, setActiveTypes] = useAtom(matchTypeFiltersAtom);
  const [visible, setVisible] = useState(STEP);
  // The page this view draws, for "select all loaded".
  const drawnIds = useMemo(() => rankedIds.slice(0, visible), [rankedIds, visible]);
  useDrawnIds(drawnIds);
  /* THE PANE'S OWN WIDTH, quantised to 64px and held while the drawer divider
     is dragged (`useSettledWidth`). It feeds a memo that re-snippets the
     visible page, so following a drag rebuilt and re-wrapped every excerpt at
     each 64px step; the width now changes once, on release. */
  const [bodyRef, paneW] = useSettledWidth();
  // Per-entity "show every page-snippet", owned here so the capped `results`
  // memo stays cheap and only the expanded cards pay for the extra windowing.
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const trimmed = query.trim();

  useEffect(() => {
    setVisible(STEP);
    setShowAll({});
  }, [entities, trimmed, language, source, layout]);

  const budget = excerptBudget(layout, paneW);

  // Nothing is built until the pane is measured — see ResultsBody.
  const measured = paneW > 0;
  const cappedResults = useMemo<Result[]>(
    () =>
      (measured ? entities : [])
        .slice(0, visible)
        .map((e) => ({
          entity: e,
          snippets: buildSnippetsFor(e, trimmed, language, source, {
            maxFullText: layout === "passages" ? PASSAGES_PER_ENTITY : MAX_FULLTEXT,
            contextWords: budget.ctx,
          }),
        }))
        .filter((r) => r.snippets.count > 0),
    [measured, entities, visible, trimmed, language, source, layout, budget.ctx],
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
              }),
            }
          : r,
      ),
    [cappedResults, showAll, trimmed, language, source, budget.ctx],
  );

  if (source === "cejil" && cejilLoading) {
    return (
      <Centered>
        {cejilError ? (
          <>
            <span role="alert" className="text-sm text-ink-muted">Couldn’t load the CEJIL collection.</span>
            <WarmButton onClick={onRetry}>Retry</WarmButton>
          </>
        ) : (
          <>
            <span aria-hidden className="w-5 h-5 rounded-full border-2 border-border border-t-carbon animate-spin" />
            <span role="status" className="text-sm text-ink-muted">Loading the full CEJIL collection…</span>
          </>
        )}
      </Centered>
    );
  }

  // The switcher keeps this segment whether or not a query exists (removing it
  // would shift every control beside it), so the view owns the no-query state.
  if (!trimmed) {
    return (
      <Centered>
        <Search size={22} className="text-ink-muted" aria-hidden="true" />
        <span className="text-sm text-ink-tertiary">Search to see where terms match</span>
        <span className="text-xs text-ink-muted">
          Results show the passages behind each hit — the field, the page, the sentence.
        </span>
      </Centered>
    );
  }

  if (totalMatches === 0) {
    return (
      <Centered>
        <span dir="ltr" className="text-sm text-ink-tertiary">
          No matches for <span className="font-medium text-ink-secondary">“{trimmed}”</span>
        </span>
        <WarmButton onClick={onClearSearch}>Clear search</WarmButton>
      </Centered>
    );
  }

  const capped = entities.length > results.length + (entities.length - visible);

  return (
    <div data-component="ResultsMainView" data-layout={layout} className="flex flex-col h-full min-h-0">
      {/* Header strip — always mounted; only its contents change. Match-type
          chips and the cap note ride the shared list-header shape so this
          surface and the drawer's Results tab read as one component at two
          widths. NO count here: "N results for [chip]" lives in the toolbar
          masthead — the one place this surface's number is printed — and a
          second copy a line below it was the scatter this row used to be. */}
      <header data-part="header" className="shrink-0">
        <ListInfoRow
          count={null}
          activeFilterCount={0}
          showFilterChips={false}
          // The chips' widths never change (`matchTypeCounts` comes from
          // `matchTypeBase`, which the toggles don't narrow), so this row keeps
          // a fixed height with fixed contents — toggling a chip rewrites the
          // masthead's number, not anything on this line.
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
          // Always mounted, contents hidden when nothing is excluded — this note
          // appears and vanishes as facets are ticked, exactly while the results
          // below are being read. It rides the chip row rather than a line of
          // its own: an invisible reserved line under the chips doubled the gap
          // above the first result.
          rightSlot={
            <span
              data-part="hidden-by-filters"
              aria-hidden={hiddenByFilters === 0}
              className={hiddenByFilters === 0 ? "invisible" : ""}
            >
              {hiddenByFilters.toLocaleString()} more {hiddenByFilters === 1 ? "match" : "matches"}{" "}
              hidden by filters
              <span className="mx-1 text-ink-muted">·</span>
              <button
                type="button"
                onClick={onClearFilters}
                tabIndex={hiddenByFilters === 0 ? -1 : undefined}
                className="font-medium text-carbon hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </span>
          }
        />
      </header>

      {/* Hosted by the Library main pane (a gutter host): the card lane is a
          `bleed` scroll lane, so its scrollbar sits at the pane edge. */}
      <div ref={bodyRef} data-part="results" className="@container bleed flex-1 min-h-0 overflow-auto">
        {entities.length === 0 ? (
          <p data-part="empty" className="pt-6 text-center text-xs text-ink-tertiary">
            No results for the selected match types.
          </p>
        ) : layout === "grouped" ? (
          <GroupedBody
            results={results}
            query={trimmed}
            selectedId={selectedId}
            onSelect={onSelect}
            onFocusProperty={onFocusProperty}
            onSelectSnippet={onSelectSnippet}
            showAll={showAll}
            relevanceOf={relevanceOf}
            onToggleShowAll={(id) =>
              setShowAll((m2) => ({ ...m2, [id]: !m2[id] }))
            }
          />
        ) : layout === "tree" ? (
          <TreeBody
            results={results}
            query={trimmed}
            relevanceOf={relevanceOf}
            onFocusProperty={onFocusProperty}
            onSelectSnippet={onSelectSnippet}
            twoUp={budget.twoCol}
          />
        ) : layout === "passages" ? (
          <PassagesBody
            results={results}
            query={trimmed}
            onSelect={onSelect}
            onFocusProperty={onFocusProperty}
            onSelectSnippet={onSelectSnippet}
          />
        ) : (
          <SpineBody
            results={results}
            query={trimmed}
            selectedId={selectedId}
            onSelect={onSelect}
            onSelectSnippet={onSelectSnippet}
          />
        )}

        {visible < entities.length && (
          <div data-part="show-more" className="flex justify-center py-4">
            <WarmButton onClick={() => setVisible((n) => n + STEP)}>
              Show more — {(entities.length - visible).toLocaleString()} remaining
            </WarmButton>
          </div>
        )}
        {capped && visible >= entities.length && (
          <p data-part="end" className="py-4 text-center text-meta text-ink-muted">
            Showing every result for this query.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 1 — GROUPED: one wide card per entity. The drawer stacks properties
 *     above passages because it has 24rem; here they sit side by side,
 *     which is the whole reason to promote this view out of the drawer.
 * ------------------------------------------------------------------ */

function GroupedBody({
  results,
  query,
  selectedId,
  onSelect,
  onFocusProperty,
  onSelectSnippet,
  showAll,
  onToggleShowAll,
  relevanceOf,
}: {
  results: Result[];
  query: string;
  relevanceOf: (e: Entity) => RelevanceBreakdown;
  selectedId: string | null;
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onFocusProperty: (id: string, fieldKey: string) => void;
  onSelectSnippet: (id: string, page: number) => void;
  /** Entities currently showing every page-snippet rather than the capped few. */
  showAll: Record<string, boolean>;
  onToggleShowAll: (id: string) => void;
}) {
  return (
    <ul data-part="grouped" className="flex flex-col gap-2.5 pb-2">
      {results.map(({ entity, snippets }) => {
        const type = getEntityType(entity.typeId);
        const selected = selectedId === entity.id;
        const props = properties(snippets);
        const hasMeta = props.length > 0;
        const hasText = snippets.fullText.length > 0;
        const expanded = !!showAll[entity.id];
        return (
          // The card IS the list item, as EntityCard's is.
          <li
            key={entity.id}
            data-part="result"
            data-state={selected ? "selected" : undefined}
            className={`group relative rounded-md border transition-colors ${
              selected ? "bg-parchment border-border" : "bg-paper border-border/60"
            } has-[[data-part=select]_input:checked]:bg-parchment has-[[data-part=select]_input:checked]:border-border ${FOCUS_RING_ON_SELECT}`}
          >
            {/* The visually hidden selection checkbox (see EntitySelectBox). A
                passage row is evidence, not an entity, so only the entity's
                card carries one. */}
            <EntitySelectBox id={entity.id} title={entity.title} />
            <header
              data-part="result-header"
              className={`px-4 py-2.5 ${hasMeta || hasText ? "border-b border-border/40" : ""}`}
            >
              <div className="flex items-center gap-2">
              <EntityTypeChip typeId={entity.typeId} />
              {/* The heading is a flex box so the button inside it keeps
                  shrinking and truncating exactly as it did as a direct child. */}
              <h2 data-part="title" className="flex min-w-0">
              <button
                type="button"
                onClick={(e) => onSelect(entity.id, e)}
                onMouseDown={holdTextSelection}
                aria-pressed={selected}
                className="min-w-0 text-start text-sm font-semibold text-ink truncate hover:underline
                  cursor-pointer focus-visible:outline-none focus-visible:ring-1
                  focus-visible:ring-carbon/40 rounded-sm"
              >
                <HighlightedText text={entity.title} query={query} />
              </button>
              </h2>
              <CountBadge {...evidenceBadge(snippets)} />
              <span data-part="facts" className="ms-auto shrink-0 flex items-center gap-2 text-meta text-ink-tertiary">
                {type && <span>{type.name}</span>}
                {entity.country && (
                  <>
                    <Dot />
                    <span>{entity.country}</span>
                  </>
                )}
                {entity.createdAt && (
                  <>
                    <Dot />
                    <span className="tabular-nums">
                      {new Date(entity.createdAt).getUTCFullYear()}
                    </span>
                  </>
                )}
              </span>
              </div>
              {/* Multi-term queries only (renders nothing for one term), and
                  constant for the life of the query, so it never appears under a
                  card the reader is looking at. */}
              <MatchedTerms relevance={relevanceOf(entity)} query={query} className="mt-1" />
            </header>

            {/* Properties, then Document, one above the other at the card's
                full width, at every pane width. Side by side, the properties
                column left the passages two thirds of the card and a short
                property list beside a long column of prose. Neither section
                means a header-only card, which is the honest shape of a
                title-only match. */}
            {(hasMeta || hasText) && (
              <div className="flex flex-col gap-stack px-4 py-3">
                {hasMeta && (
                  <section data-part="properties">
                    <SectionLabel icon={<Tag size={11} />}>Properties</SectionLabel>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {props.map((group) => (
                        <li key={group.fieldKey}>
                        <PropertyRow
                          group={group}
                          query={query}
                          onClick={() => onFocusProperty(entity.id, group.fieldKey)}
                        />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {hasText && (
                  <section data-part="document">
                    <SectionLabel icon={<FileText size={11} />}>
                      {documentLabel(snippets.borrowedFrom)}
                      <PageCount shown={snippets.fullText.length} total={snippets.fullTextTotal} />
                      {/* Rides the section label rather than taking a line of
                          its own — the label is mounted whether or not the
                          document is borrowed, so the passages under it never
                          move (CLAUDE.md). Trailing the page count, not pushed
                          to the far edge: across a card that can be a metre wide
                          an `ms-auto` attribution parks nowhere near the thing
                          it attributes. */}
                      <BorrowedDocLine from={snippets.borrowedFrom} className="min-w-0" />
                    </SectionLabel>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {snippets.fullText.map((s, i) => (
                        <li key={i}>
                        <PassageRow
                          snippet={s}
                          query={query}
                          entityId={entity.id}
                          onSelectSnippet={onSelectSnippet}
                        />
                        </li>
                      ))}
                    </ul>
                    {/* The card already PRINTS the honest total beside the
                        section label; without this it stated a number it gave
                        you no way to reach. Same contract as the drawer's
                        card: stays mounted once expanded (`shown === total`
                        then), so the control can't vanish under the click. */}
                    {(snippets.fullTextTotal > snippets.fullText.length ||
                      expanded) && (
                      <button
                        type="button"
                        data-part="show-all"
                        onClick={() => onToggleShowAll(entity.id)}
                        aria-expanded={expanded}
                        className="mt-1 self-start px-1 text-meta font-medium text-carbon
                          hover:underline cursor-pointer focus-visible:outline-none
                          focus-visible:ring-1 focus-visible:ring-carbon/40 rounded-sm"
                      >
                        {expanded
                          ? "Show fewer"
                          : `Show all ${snippets.fullTextTotal.toLocaleString()}`}
                      </button>
                    )}
                  </section>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ *
 * 2 — TREE: entity → matched field → its snippets. Two collapsible
 *     levels, so a thousand results can be read as an index first and
 *     opened where it looks promising.
 * ------------------------------------------------------------------ */

function TreeBody({
  results,
  query,
  onFocusProperty,
  onSelectSnippet,
  twoUp,
  relevanceOf,
}: {
  results: Result[];
  query: string;
  relevanceOf: (e: Entity) => RelevanceBreakdown;
  onFocusProperty: (id: string, fieldKey: string) => void;
  onSelectSnippet: (id: string, page: number) => void;
  /** Lay each branch's leaves in two columns — see `excerptBudget`. */
  twoUp: boolean;
}) {
  return (
    <ul data-part="tree" className="flex flex-col gap-1.5 pb-2">
      {results.map(({ entity, snippets }) => {
        const color = getEntityType(entity.typeId)?.color ?? "#6B7280";
        const props = properties(snippets);
        const bare = props.length === 0 && snippets.fullText.length === 0;
        return (
          // The shared grouped-card shell in `standalone` mode — off the
          // relationships panel's expand/collapse globals entirely.
          <li key={entity.id} data-part="result">
          <RelationshipGroupedCard
            title={entity.title}
            highlight={query}
            color={color}
            count={evidenceBadge(snippets).count}
            countUnit={evidenceBadge(snippets).unit}
            standalone
            defaultExpanded
          >
            <div className="flex flex-col">
              {bare && (
                <p data-part="title-only" className="px-4 py-2 text-xs text-ink-muted">
                  Matched in the title — nothing else.
                </p>
              )}
              {props.map((group) => (
                <TreeBranch
                  key={group.fieldKey}
                  twoUp={twoUp}
                  label={group.field}
                  count={group.texts.length}
                  icon={<Tag size={11} className="text-ink-muted" />}
                >
                  {group.texts.map((t, i) => (
                    <li key={i}>
                    <button
                      type="button"
                      data-part="leaf"
                      onClick={() => onFocusProperty(entity.id, group.fieldKey)}
                      className="w-full text-start rounded-md px-2 py-1 text-sm text-ink leading-relaxed
                        hover:bg-warm transition-colors cursor-pointer focus-visible:outline-none
                        focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
                    >
                      <HighlightedText text={t} query={query} />
                    </button>
                    </li>
                  ))}
                </TreeBranch>
              ))}
              {snippets.fullText.length > 0 && (
                <TreeBranch
                  twoUp={twoUp}
                  label={documentLabel(snippets.borrowedFrom)}
                  count={snippets.fullTextTotal}
                  icon={<FileText size={11} className="text-ink-muted" />}
                  note={
                    snippets.fullTextTotal > snippets.fullText.length
                      ? `${snippets.fullText.length} of ${snippets.fullTextTotal.toLocaleString()} shown`
                      : undefined
                  }
                  // On the branch header, not above the passages: the header is
                  // there whether or not the document is borrowed, so nothing
                  // below it moves.
                  trailing={<BorrowedDocLine from={snippets.borrowedFrom} />}
                >
                  {snippets.fullText.map((s, i) => (
                    <li key={i}>
                    <PassageRow
                      snippet={s}
                      query={query}
                      entityId={entity.id}
                      onSelectSnippet={onSelectSnippet}
                    />
                    </li>
                  ))}
                </TreeBranch>
              )}
              {/* The branches above already name the fields that matched; the
                  terms that matched nothing are the one thing they can't show.
                  Multi-term queries only. */}
              <MatchedTerms relevance={relevanceOf(entity)} query={query} missedOnly className="px-4 py-1.5" />
            </div>
          </RelationshipGroupedCard>
          </li>
        );
      })}
    </ul>
  );
}

/** One collapsible field branch. Indented under the entity with a quiet guide
 *  rail, mirroring the relationships tree. */
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
  /** Rides the header row after the note — where the Document branch names the
   *  connected document its passages were quoted from. */
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div data-component="TreeBranch" data-state={open ? "open" : "closed"} className="px-3 py-1.5">
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
        <span data-part="count" className="text-meta tabular-nums text-ink-muted">{count.toLocaleString()}</span>
        {note && <span data-part="note" className="text-meta text-ink-muted">· {note}</span>}
        {trailing}
      </button>
      {open && (
        /* TWO-UP past 64rem, and only here. A tree's leaves are short lines —
           a field's snippets, a page's excerpt — so one column of them down a
           wide pane is mostly rule and margin. Two columns is the hierarchy's
           own way to spend width: the branch still owns its children, they are
           still under its rule, there are just two of them across. `grid`, not
           `columns`, because CSS columns flow top-to-bottom and would put leaf 2
           halfway down the pane. */
        <ul
          data-part="leaves"
          className={`mt-1 ms-2 ps-3 ${
            // …and only when there are two to put across. A single leaf in a
            // two-column grid is a half-width leaf beside nothing, which is the
            // emptiness this change exists to remove, moved one level in.
            twoUp && Children.count(children) > 1
              ? "grid grid-cols-2 gap-x-6 gap-y-0.5 items-start"
              : "flex flex-col gap-0.5"
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
 * 3 — PASSAGES: every matching passage as one flat list, ranked by how
 *     many times the term occurs on that page. The entity becomes the
 *     secondary line — this is the view for reading the corpus, not for
 *     counting entities.
 * ------------------------------------------------------------------ */

interface FlatPassage {
  entity: Entity;
  /** Document page hit, or a matched metadata field — one row shape for both. */
  page: number | null;
  hits: number;
  /** AND groups the passage satisfies — with `hits`, its rank (`compareEvidence`). */
  groupsMet: number;
  field: string | null;
  fieldKey: string | null;
  text: string;
  /** For document rows: the connected document the passage was quoted from. The
   *  flattening loses the entity's snippets, and this list is exactly where the
   *  same judgment shows up under a dozen different case names. */
  from: BorrowedDoc | null;
  /** Other results whose document has this same passage on the same page. The
   *  row is listed once, under `entity`; these are counted in its attribution. */
  also: Entity[];
  /** The row's identity, stable while the fold changes which result heads it
   *  (a "Show more" can bring in the document's owner) — so a selection made
   *  on the row doesn't go dark when its head swaps. */
  key: string;
}

function PassagesBody({
  results,
  query,
  onSelect,
  onFocusProperty,
  onSelectSnippet,
}: {
  results: Result[];
  query: string;
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onFocusProperty: (id: string, fieldKey: string) => void;
  onSelectSnippet: (id: string, page: number) => void;
}) {
  // Same signal the grouped/tree passage rows read, so a page opened from any
  // layout — or from a `MatchOrigin` popover — stays lit in this one
  // (`handleSnippetSelect` writes it).
  const activePage = useAtomValue(resultsActivePageAtom);
  // …but that atom can only name a row the corpus gives a PAGE. A passage with
  // no page (Sample full text, every property hit) is identified by its content
  // alone, so the row the user actually opened is remembered here. Falling back
  // to `selectedId` instead would light every row of that entity at once — a
  // band of "selected" scattered down a ranked list, which is not what selected
  // means anywhere else in the app.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { rows, notShown, titleOnly } = useMemo(() => {
    const rows: FlatPassage[] = [];
    let notShown = 0;
    let titleOnly = 0;
    const byPassage = new Map<string, FlatPassage>();
    // Per DOCUMENT, not per result: the note counts matched pages the list
    // doesn't excerpt, and twelve results reading one judgment fold into that
    // judgment's rows — summing per result counted its pages twelve times.
    const byDoc = new Map<string, { total: number; shown: number }>();
    for (const { entity, snippets } of results) {
      const props = properties(snippets);
      // A title-only result has no passage to list here — counted and reported
      // at the foot, never silently dropped from a list that claims to hold
      // "every passage".
      if (props.length === 0 && snippets.fullText.length === 0) titleOnly++;
      for (const m of props) {
        for (const t of m.texts) {
          rows.push({
            entity,
            page: null,
            hits: m.hits,
            groupsMet: m.groupsMet,
            field: m.field,
            fieldKey: m.fieldKey,
            text: t,
            from: null,
            also: [],
            key: `${entity.id}|${m.fieldKey}|${t}`,
          });
        }
      }
      for (const s of snippets.fullText) {
        // One passage is one row, however many results read it. A Causa with
        // no PDF of its own quotes a connected document, and the corpus's
        // documents share six stand-in files, so the same page used to be
        // listed once per result — five identical rows in a list that ranks
        // passages. Keyed on `docKey` (the text a document resolves to), not
        // on the document entity: the repeats come from DIFFERENT document
        // entities serving the same file. A page-less corpus keys on the text.
        const docId = snippets.docKey ?? entity.id;
        const key = `${docId}|${s.page ?? s.text}`;
        let doc = byDoc.get(docId);
        if (!doc) {
          doc = { total: 0, shown: 0 };
          byDoc.set(docId, doc);
        }
        doc.total = Math.max(doc.total, snippets.fullTextTotal);
        const seen = byPassage.get(key);
        if (seen) {
          // A result reading its OWN document heads the row; otherwise the
          // best-ranked result that quotes the passage does.
          if (!snippets.borrowedFrom && seen.from) {
            seen.also.unshift(seen.entity);
            seen.entity = entity;
            seen.from = null;
          } else {
            seen.also.push(entity);
          }
          continue;
        }
        const row: FlatPassage = {
          entity,
          page: s.page,
          hits: s.hits,
          groupsMet: s.groupsMet,
          field: null,
          fieldKey: null,
          text: s.text,
          from: snippets.borrowedFrom,
          also: [],
          key,
        };
        byPassage.set(key, row);
        rows.push(row);
        doc.shown++;
      }
    }
    // Pages counted but not excerpted — said out loud rather than dropped.
    for (const { total, shown } of byDoc.values()) notShown += Math.max(0, total - shown);
    // Best passages first, by the SAME rank that chose each entity's pages
    // (`compareEvidence`: AND groups met, then occurrences) — raw hits let a
    // page that misses the AND outrank one that meets it. The sort is stable,
    // so ties keep the relevance order the entities arrived in.
    rows.sort(compareEvidence);
    return { rows, notShown, titleOnly };
  }, [results]);

  return (
    <div data-part="passages" className="pb-2">
      {/* ONE paper sheet of hairline-separated rows, not a stack of bordered
          boxes. A card per passage is a box the passage never fills: the excerpt
          is a sentence, so at pane width every card was mostly empty and the
          list read as 120 half-filled containers. The sheet turns that leftover
          into the margin of a page, which is what it actually is. */}
      <ul className="rounded-md border border-border/60 bg-paper overflow-hidden">
        {rows.map((row, i) => {
          const color = getEntityType(row.entity.typeId)?.color ?? "#6B7280";
          const isDoc = row.field === null;
          // Keyed by CONTENT, not by index: "Show more" splices new rows into a
          // list ranked by hit density, so an index would quietly slide the lit
          // state onto whatever passage inherited the slot.
          const rowKey = row.key;
          const selected =
            activeKey === rowKey ||
            (row.page !== null &&
              activePage?.page === row.page &&
              (activePage.entityId === row.entity.id ||
                row.also.some((e) => e.id === activePage.entityId)));
          // What the row did before it lost its click: a page jump where the
          // page is real, the entity's document where it isn't, the field for
          // a property row.
          const goTo = () => {
            setActiveKey(rowKey);
            if (isDoc && row.page !== null) onSelectSnippet(row.entity.id, row.page);
            else if (isDoc) onSelect(row.entity.id);
            else onFocusProperty(row.entity.id, row.fieldKey!);
          };
          // The count rides the row's NAME: the "N matches" text beside the
          // page tag is passive, so its hover hint is out of a keyboard's reach
          // and a tab stop just to read a number would be one too many.
          const matchCount = row.hits > 1 ? `, ${row.hits} matches` : "";
          const primaryName =
            (!isDoc
              ? `Go to ${row.field} in ${row.entity.title}`
              : row.page !== null
                ? `Go to page ${row.page} in ${row.entity.title}`
                : `Open the document of ${row.entity.title}`) + matchCount;
          return (
            // A CLICKABLE row (CLAUDE.md a11y patterns): clicking the passage
            // goes to it. The keyboard and screen-reader path is a stretched
            // invisible primary-action button, first child; the content sits
            // above it in a `relative` wrapper so the footer's controls stay
            // clickable, and the item keeps a plain `onClick` for the mouse.
            // Footer controls stop propagation, so nothing fires twice.
            <li
              key={`${row.entity.id}-${i}`}
              data-part="passage"
              data-state={selected ? "selected" : undefined}
              onClick={goTo}
              className={`relative cursor-pointer border-b border-border/50 last:border-b-0 px-3 py-2.5 text-sm transition-colors ${
                selected ? "bg-parchment" : "hover:bg-warm"
              }`}
            >
              <button
                type="button"
                data-part="primary-action"
                aria-pressed={selected}
                aria-label={primaryName}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo();
                }}
                className="absolute inset-0 w-full cursor-pointer focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/30"
              />
              {/* Passage and attribution are ONE block that runs to the row's
                  edge. They used to sit in a stretched `1fr_15rem` grid: the
                  meta stayed pinned to the far edge, a hand's width from the
                  sentence it names. The attribution now sits under the quote. */}
              <div className="relative">
              <p data-part="excerpt" className="leading-relaxed text-ink">
                <HighlightedText text={row.text} query={query} />
              </p>
              {/* The attribution, under the quote it belongs to — and every
                  part of it a way in: the entity, the evidence, the page, the
                  other results that read the same passage. One line at one
                  height (`min-h-5` holds the page tag's box on rows without
                  one), so no row grows when it carries more. */}
              <div data-part="attribution" className="mt-1 flex items-center gap-1.5 min-w-0 min-h-5 text-meta">
                <Hint text={`Open ${row.entity.title}`} describe={false}>
                  {(hint) => (
                    <button
                      {...hint}
                      type="button"
                      data-part="entity"
                      aria-label={`Open ${row.entity.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveKey(rowKey);
                        onSelect(row.entity.id);
                      }}
                      className={`${FOOTER_TARGET} min-w-0 flex items-center gap-1.5 text-ink-secondary`}
                    >
                      <span
                        aria-hidden
                        className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">
                        <HighlightedText text={row.entity.title} query={query} />
                      </span>
                    </button>
                  )}
                </Hint>
                <span className="shrink-0 text-ink-muted" aria-hidden="true">
                  ·
                </span>
                {/* `<bdi dir="ltr">` keeps the ASSEMBLED "Document · p.15 ·
                    2 matches" in order under RTL without flipping the line's
                    alignment. A field name is the field's OWN translation
                    ("الصك المصدر"), so it takes `auto` and reads in its own
                    direction — forcing ltr on it is how a translated label
                    ends up mis-ordered. */}
                <bdi dir={isDoc ? "ltr" : "auto"} className="shrink-0 flex items-center gap-1">
                  {/* Plain text: going to the evidence is the row's own action
                      (the primary button above), so a second button here would
                      be the same control announced twice. */}
                  <span data-part="source" className="uppercase tracking-wide text-ink-tertiary">
                    {isDoc ? documentLabel(row.from) : row.field}
                  </span>
                  {/* No invented page numbers: the tag exists only where the
                      corpus is genuinely page-mapped. */}
                  {isDoc && row.page !== null && (
                    <>
                    <Sep />
                    <Hint text={`Go to page ${row.page}`} describe={false}>
                      {(hint) => (
                        <span {...hint} className="inline-flex">
                          <PageTag
                            page={row.page!}
                            onClick={() => {
                              setActiveKey(rowKey);
                              onSelectSnippet(row.entity.id, row.page!);
                            }}
                          />
                        </span>
                      )}
                    </Hint>
                    </>
                  )}
                  {/* A count, not a control — so it is spelled out rather than
                      left as "4×" for a screen reader to guess at. */}
                  {row.hits > 1 && (
                    <>
                    <Sep />
                    <Hint
                      text={`${row.hits} matches ${row.page !== null ? "on this page" : "in this passage"}`}
                    >
                      {(hint) => (
                        <span {...hint} data-part="hits" className="tabular-nums text-ink-tertiary">
                          {row.hits} matches
                        </span>
                      )}
                    </Hint>
                    </>
                  )}
                </bdi>
                {/* The attribution line is mounted for every row, so naming the
                    source document here costs no height and moves nothing. It
                    is what turns a run of identical passages under a dozen
                    case names into a dozen cases citing one judgment. */}
                <BorrowedDocLine from={row.from} className="min-w-0" />
                {/* The results folded into this row, in the same `↳` idiom.
                    Rides the mounted attribution line, so it moves nothing. */}
                {row.also.length > 0 && <AlsoUnder entities={row.also} onOpenEntity={onSelect} />}
              </div>
              </div>
            </li>
          );
        })}
      </ul>
      {(notShown > 0 || titleOnly > 0) && (
        <p data-part="note" className="pt-3 text-center text-meta text-ink-muted">
          {notShown > 0 && (
            <>
              {notShown.toLocaleString()} further matching {notShown === 1 ? "page" : "pages"}{" "}
              counted but not excerpted — open an entity to read them all.
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

/** A control on a passage row's attribution line: text-sized, no box of its own,
 *  underline on hover, a ring on focus. */
const FOOTER_TARGET = `rounded-sm hover:underline cursor-pointer focus-visible:outline-none
  focus-visible:ring-1 focus-visible:ring-carbon/40`;

/* ------------------------------------------------------------------ *
 * 4 — SPINE: the results on a proportional time axis, each carrying its
 *     strongest passage. Answers "when does this term happen?", which
 *     neither the card list nor the passage list can.
 * ------------------------------------------------------------------ */

/** The Results spine's row: a line of facts and a line of passage. Within
 *  `TimeSpine`'s `GAP_H + rowHeight ≤ MAX_GAP` invariant (its own notes name 44
 *  as the denser height that still leaves slack), so breaks and elisions lay
 *  out as they do at the default. */
const SPINE_ROW_H = 44;

function SpineBody({
  results,
  query,
  selectedId,
  onSelect,
  onSelectSnippet,
}: {
  results: Result[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onSelectSnippet: (id: string, page: number) => void;
}) {
  const dated = useMemo(
    () =>
      results
        .filter((r) => entityTime(r.entity) !== null)
        .map((r) => ({ key: r.entity.id, t: entityTime(r.entity)!, item: r })),
    [results],
  );
  const undated = results.length - dated.length;

  if (!dated.length) {
    return (
      <p data-part="empty" className="pt-6 text-center text-xs text-ink-tertiary">
        None of these results carries a date, so there is no axis to place them on.
      </p>
    );
  }

  return (
    <div data-part="spine" className="pb-2">
      {/* The SAME spine the Timeline view draws. The geometry — axis inset,
          adaptive scale, year marks, elided silences, leader lines, date gutter
          — is all `TimeSpine`'s; this passes only a row height.

          That height is a budget, not a styling knob: `TimeSpine` derives its
          scale from it, so a 104px row once stretched the axis 4.7× and, being
          taller than `MAX_GAP` (88), stopped any silence from eliding. The row is
          two lines at `SPINE_ROW_H` (44) — the facts, then the passage across
          the row — inside the invariant `TimeSpine` documents. */}
      <TimeSpine
        rows={dated}
        rowHeight={SPINE_ROW_H}
        dotColor={({ entity }) => getEntityType(entity.typeId)?.color ?? "#6B7280"}
        dotActive={({ entity }) => selectedId === entity.id}
        renderRow={({ entity, snippets }, { t }) => {
          const selected = selectedId === entity.id;
          const color = getEntityType(entity.typeId)?.color ?? "#6B7280";
          // The strongest passage by `compareEvidence`, page or property. One
          // passage per result — the spine is a chronology, not a second
          // results list.
          const best = bestPassage(snippets);
          return (
            <button
              type="button"
              data-part="spine-row"
              aria-pressed={selected}
              onClick={() =>
                best?.page != null ? onSelectSnippet(entity.id, best.page) : onSelect(entity.id)
              }
              style={{ height: SPINE_ROW_H }}
              className={`w-full flex flex-col justify-center px-2 rounded-md text-start
                transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
                focus-visible:ring-inset focus-visible:ring-ink/20 ${
                  selected ? "bg-parchment" : "hover:bg-warm"
                }`}
            >
              {/* Line 1: the facts. Line 2: the passage, at the row's full
                  width — squeezed onto the facts' line it was a few words cut
                  mid-sentence. */}
              <span className="flex items-center gap-2 min-w-0 h-4">
              <span
                aria-hidden
                className="shrink-0 w-1.5 h-1.5 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
              <SpineDate t={t} />
              {/* Title first and bounded, so a long case name can't eat the whole
                  line — the passage is the reason to be in this layout. */}
              <span className="shrink-0 max-w-[18rem] truncate text-xs font-medium text-ink">
                <HighlightedText text={entity.title} query={query} />
              </span>
              <CountBadge {...evidenceBadge(snippets)} />
              <span className="flex-1" />
              {/* The trailing slot the timeline spends on a type name — spent
                  here on where the passage came from: the page tag, and the
                  connected document it was quoted from. `<bdi>` keeps "Document ·
                  p.5" in order under RTL without flipping the box's alignment.
                  A FIXED width, not `max-w`: this is the reserved space for the
                  attribution, so a borrowed document appearing on one row can't
                  pull that row's passage shorter than its neighbours'. */}
              {best && (
                <span className="hidden md:flex shrink-0 w-[14rem] items-center gap-1.5 overflow-hidden text-meta text-ink-muted">
                  <bdi dir="ltr" className="shrink-0">
                    {best.label}
                  </bdi>
                  {/* Start-aligned and fading at the slot's end: justified to
                      the end of an overflow-hidden box, a long title was cut
                      at its START, which is the part that names it. */}
                  {best.isDocument && (
                    <BorrowedDocLine from={snippets.borrowedFrom} className="min-w-0" fade />
                  )}
                </span>
              )}
              </span>
              {best && (
                <span className="block min-w-0 truncate ps-3.5 text-xs text-ink-secondary leading-4">
                  <HighlightedText text={best.text} query={query} />
                </span>
              )}
            </button>
          );
        }}
      />
      {undated > 0 && (
        <p data-part="note" className="pt-3 text-center text-meta text-ink-muted">
          {undated.toLocaleString()} matching {undated === 1 ? "result carries" : "results carry"} no
          date and {undated === 1 ? "is" : "are"} not plotted.
        </p>
      )}
    </div>
  );
}

/** The passage that best represents a result: the best-ranked of its pages
 *  and its properties by `compareEvidence` — the same rank every other surface
 *  orders evidence by — a page winning a tie. Never the title: the row already
 *  prints it, marked. Its label never claims a page the data can't back. */
function bestPassage(
  s: EntitySnippets,
): { text: string; page: number | null; label: string; isDocument: boolean } | null {
  const top = s.fullText.reduce<FullTextSnippet | null>(
    (best, cur) => (!best || compareEvidence(cur, best) < 0 ? cur : best),
    null,
  );
  const prop = properties(s).reduce<MetadataSnippet | null>(
    (best, cur) => (!best || compareEvidence(cur, best) < 0 ? cur : best),
    null,
  );
  if (top && (!prop || compareEvidence(prop, top) >= 0)) {
    const parts = [documentLabel(s.borrowedFrom)];
    if (top.page !== null) parts.push(`p.${top.page}`);
    if (top.hits > 1) parts.push(`${top.hits}×`);
    return { text: top.text, page: top.page, label: parts.join(" · "), isDocument: true };
  }
  // `isDocument` gates the borrowed-document attribution: a property hit came
  // from the entity itself, however its document was resolved.
  if (prop?.texts[0]) return { text: prop.texts[0], page: null, label: prop.field, isDocument: false };
  return null;
}

/* ------------------------------------------------------------------ *
 * Shared bits
 * ------------------------------------------------------------------ */

/** One matched-property row — opens the entity's Metadata tab on that field. */
function PropertyRow({
  group,
  query,
  onClick,
}: {
  group: MetadataSnippet;
  query: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-component="PropertyRow"
      onClick={onClick}
      // Flat, not tinted. The drawer tints these because a 24rem column needs the
      // separation; across a full-width card a filled block reads as a stranded
      // slab, and the card's own border is already doing that work.
      className="w-full text-start rounded-md px-2 py-1.5 hover:bg-warm
        transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
        focus-visible:ring-inset focus-visible:ring-ink/20"
    >
      <SectionLabel as="span">{group.field}</SectionLabel>
      {group.texts.map((t, i) => (
        <span key={i} data-part="excerpt" className="block text-sm text-ink leading-relaxed">
          <HighlightedText text={t} query={query} />
        </span>
      ))}
    </button>
  );
}

/** One document passage. Clickable — and page-tagged — only where the page is
 *  real; otherwise a passive excerpt (PATTERNS §4.2). */
function PassageRow({
  snippet,
  query,
  entityId,
  onSelectSnippet,
}: {
  snippet: FullTextSnippet;
  query: string;
  entityId: string;
  onSelectSnippet: (id: string, page: number) => void;
}) {
  const active = useAtomValue(resultsActivePageAtom);
  const tag = [
    snippet.page !== null ? `p.${snippet.page}` : null,
    snippet.hits > 1 ? `${snippet.hits}×` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  // The tag trails the passage's last word instead of right-aligning on its own
  // line: `text-end` in a card that can be a metre wide parked "p.15" a hand's
  // width from the sentence it annotates, next to whichever passage happened to
  // end nearest. Inline, it is a citation — it costs no line of its own, so a
  // page-less passage sits at exactly the same height as a tagged one. The
  // body runs to the row's edge, like the passages layout. `bdi dir="ltr"` holds "p.15 · 2×" in order under RTL
  // without forcing the passage's own direction.
  const body = (
    // A block <span>, not <p>: this body is also the content of a <button>,
    // where a paragraph isn't phrasing content.
    <span className="block text-sm text-ink leading-relaxed">
      <HighlightedText text={snippet.text} query={query} />
      {tag && (
        <bdi
          dir="ltr"
          className="ms-1.5 whitespace-nowrap text-meta font-semibold text-ink-tertiary tabular-nums"
        >
          {tag}
        </bdi>
      )}
    </span>
  );

  if (snippet.page === null) {
    return <div data-component="PassageRow" className="rounded-md px-2 py-1.5">{body}</div>;
  }
  const page = snippet.page;
  const isActive = active?.entityId === entityId && active.page === page;
  return (
    <button
      type="button"
      data-component="PassageRow"
      aria-pressed={isActive}
      aria-label={`Page ${page}, ${snippet.hits} ${snippet.hits === 1 ? "match" : "matches"}`}
      onClick={() => onSelectSnippet(entityId, page)}
      className={`w-full text-start rounded-md px-2 py-1.5 transition-colors cursor-pointer
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset
        focus-visible:ring-ink/20 ${isActive ? "bg-parchment" : "hover:bg-warm"}`}
    >
      {body}
    </button>
  );
}

/** "3 of 41 pages" — `total` is every matched page, so a capped card never
 *  passes its cap off as the whole document. */
function PageCount({ shown, total }: { shown: number; total: number }) {
  return (
    <span dir="ltr" data-part="page-count" className="ms-1.5 font-normal normal-case tracking-normal text-ink-muted">
      <span className="tabular-nums">
        {shown < total ? `${shown} of ${total.toLocaleString()}` : total.toLocaleString()}
      </span>{" "}
      {total === 1 ? "page" : "pages"}
    </span>
  );
}

/** The "·" between the parts of a passage row's attribution. */
function Sep() {
  return (
    <span aria-hidden className="text-ink-muted">
      ·
    </span>
  );
}

function Dot() {
  return <span aria-hidden className="text-ink-muted">·</span>;
}

function WarmButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment
        hover:text-ink rounded-md transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div data-component="ResultsMainView" data-part="blank" className="flex-1 h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
      {children}
    </div>
  );
}
