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
  resultsCurrentPageAtom,
  type MatchTypeFilters,
  type ResultsLayout,
} from "../../../atoms/library";
import { entityTime } from "../../../utils/timeline";
import { RelationshipGroupedCard } from "../../relationships/RelationshipGroupedCard";
import { SectionLabel } from "../../shared/SectionLabel";
import { TimeSpine, SpineDate } from "../TimeSpine";
import { HighlightedText } from "../../shared/HighlightedText";
import { EntityTypeTag } from "../../shared/EntityTypeTag";
import { ListInfoRow } from "../../shared/ListInfoRow";
import { BorrowedDocLine } from "../BorrowedDocLine";
import { Hint } from "../../shared/Hint";
import { PageTag } from "../../shared/PageTag";
import { AlsoUnder } from "./AlsoUnder";
import {
  EntitySelectBox,
  FOCUS_RING_ON_SELECT,
  SELECTED_LOOK,
  PREVIEWED_RING,
  holdTextSelection,
  selectionIntent,
  useDrawnIds,
  useSelectionOrder,
} from "../EntitySelectBox";
import { useSettledWidth } from "../../../hooks/useSettledWidth";
import { ToggleChip } from "../../shared/ToggleChip";
import { CountBadge } from "../../shared/CountBadge";
import { MatchedTerms } from "../MatchedTerms";
import type { RelevanceBreakdown } from "../../../utils/relevance";

/** The Results view in the main pane. Same data path as the drawer's Results tab
 *  (`buildSnippetsFor`); `libraryResultsLayoutAtom` picks one of four layouts:
 *  grouped (card per entity), tree (entity → field → snippets), passages (flat
 *  ranked list) and spine (best passage on a time axis).
 *
 *  Page tags and page jumps appear only where the corpus is page-mapped (PATTERNS
 *  §4.2). Counts use `fullTextTotal`, and any render cap is stated. The header
 *  strip stays mounted so toggling a chip can't shift the results; the count
 *  lives in the toolbar masthead only. */

type MatchType = keyof MatchTypeFilters;
const MATCH_TYPES: { key: MatchType; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "properties", label: "Properties" },
  { key: "document", label: "Document" },
];

/** Entities rendered per page. Lower than the drawer's 40 because each card here
 *  is bigger, and every layout pays the same windowing cost per entity. */
const STEP = 24;
/** Passages view excerpts more per entity (it IS the passage list) but still a
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

/** Metadata snippets minus the title, which every layout already prints marked.
 *  The count badge still counts the title hit. A title-only match therefore has
 *  no body and says so in one line. */
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
  /* Pane width, quantised to 64px and held while the drawer divider is dragged
     (`useSettledWidth`). It feeds the re-snippeting memo below, so it must only
     change on release, not at every step of a drag. */
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
            <span role="alert" className="text-sm text-ink-tertiary">Couldn’t load the CEJIL collection.</span>
            <WarmButton onClick={onRetry}>Retry</WarmButton>
          </>
        ) : (
          <>
            <span aria-hidden className="w-5 h-5 rounded-full border-2 border-border border-t-carbon animate-spin" />
            <span role="status" className="text-sm text-ink-tertiary">Loading the full CEJIL collection…</span>
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
        <span className="text-xs text-ink-tertiary">
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
      {/* Always mounted; only its contents change. No count here: the toolbar
          masthead is the one place this surface prints its number. */}
      <header data-part="header" className="shrink-0">
        <ListInfoRow
          count={null}
          activeFilterCount={0}
          showFilterChips={false}
          // `matchTypeCounts` comes from `matchTypeBase`, which the toggles
          // don't narrow, so toggling a chip never changes this row's width.
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
          // Always mounted and hidden when nothing is excluded, so ticking facets
          // doesn't shift the results. On the chip row, not its own line, to
          // keep the gap above the first result at one step.
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
          <p data-part="end" className="py-4 text-center text-meta text-ink-tertiary">
            Showing every result for this query.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 1 — Grouped: one wide card per entity, properties then passages.
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
              selected ? `bg-parchment border-border ${PREVIEWED_RING}` : "bg-paper border-border/60"
            } ${SELECTED_LOOK} ${FOCUS_RING_ON_SELECT}`}
          >
            {/* Only the entity card carries a selection box; passage rows are
                evidence, not entities. */}
            <EntitySelectBox id={entity.id} title={entity.title} />
            <header
              data-part="result-header"
              className={`px-4 py-2.5 ${hasMeta || hasText ? "border-b border-border/40" : ""}`}
            >
              <div className="flex items-center gap-2">
              <EntityTypeTag variant="swatch" typeId={entity.typeId} />
              {/* Flex so the button inside can shrink and truncate. */}
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
              {/* Renders only for multi-term queries and is constant for the
                  life of a query, so it never shifts a card being read. */}
              <MatchedTerms relevance={relevanceOf(entity)} query={query} className="mt-1" />
            </header>

            {/* Properties above Document, both full width: side by side, the
                passages lost a third of the card. A title-only match renders
                the header alone. */}
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
                      {/* In the always-mounted label, so the passages don't move
                          when a document is borrowed. After the page count, not
                          `ms-auto`, so it stays next to what it attributes. */}
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
                    {/* Lets the user reach the total printed in the label. Stays
                        mounted once expanded (`shown === total` then), so the
                        control doesn't vanish under the click. */}
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
                          ? "Show less"
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
 * 2 — Tree: entity → matched field → its snippets, two collapsible
 *     levels, so a long result set can be scanned as an index.
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
          // `standalone`: ignores the relationships panel's expand/collapse
          // atoms.
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
                <p data-part="title-only" className="px-4 py-2 text-xs text-ink-tertiary">
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
                      className="w-full text-start rounded-md px-2 py-1 text-sm text-ink leading-relaxed wrap-anywhere
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
                  // On the always-mounted branch header, so nothing below moves
                  // when the document is borrowed.
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
              {/* Shows only the terms that matched nothing; the branches
                  already name the fields that matched. Multi-term queries only. */}
              <MatchedTerms relevance={relevanceOf(entity)} query={query} missedOnly className="px-4 py-1.5" />
            </div>
          </RelationshipGroupedCard>
          </li>
        );
      })}
    </ul>
  );
}

/** One collapsible field branch, indented under the entity with a guide rail
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
          className={`mt-1 ms-2 ps-3 ${
            // Only with two or more leaves; a single leaf would sit at half
            // width beside an empty column.
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
 * 3 — Passages: every matching passage in one flat list, ranked by
 *     `compareEvidence`, with the entity as the secondary line.
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
  /** Document rows: the connected document the passage was quoted from, kept
   *  on the row because flattening drops the entity's snippets. */
  from: BorrowedDoc | null;
  /** Other results whose document has this same passage on the same page. The
   *  row is listed once, under `entity`; these are counted in its attribution. */
  also: Entity[];
  /** Stable row identity. "Show more" can change which result heads the row,
   *  and the selection must survive that. */
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
  // Shared with the grouped/tree rows and `MatchOrigin`, so a page opened from
  // any of them stays selected here (`handleSnippetSelect` writes it).
  const activePage = useAtomValue(resultsCurrentPageAtom);
  // That atom only covers rows with a page. Page-less rows (Sample full text,
  // property hits) are tracked here by key; falling back to `selectedId` would
  // select every row of that entity at once.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { rows, notShown, titleOnly } = useMemo(() => {
    const rows: FlatPassage[] = [];
    let notShown = 0;
    let titleOnly = 0;
    const byPassage = new Map<string, FlatPassage>();
    // Per document, not per result: several results can read one document, and
    // summing per result would count its unexcerpted pages once per result.
    const byDoc = new Map<string, { total: number; shown: number }>();
    for (const { entity, snippets } of results) {
      const props = properties(snippets);
      // A title-only result has no passage; it is counted and reported in the
      // foot note rather than dropped.
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
        // One row per passage, however many results read it. Keyed on `docKey`
        // (the text a document resolves to), not the document entity, because
        // different document entities can serve the same file. A page-less
        // corpus keys on the text.
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
          // A result reading its own document heads the row; otherwise the
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
    // Pages counted but not excerpted, reported in the foot note.
    for (const { total, shown } of byDoc.values()) notShown += Math.max(0, total - shown);
    // Same rank that chose each entity's pages (`compareEvidence`: AND groups
    // met, then occurrences); raw hits would let a page that misses the AND
    // outrank one that meets it. Stable sort keeps relevance order on ties.
    rows.sort(compareEvidence);
    return { rows, notShown, titleOnly };
  }, [results]);

  return (
    <div data-part="passages" className="pb-2">
      {/* One paper sheet with hairline-separated rows rather than a card per
          passage: a one-sentence excerpt leaves a full-width card mostly empty. */}
      <ul className="rounded-md border border-border/60 bg-paper overflow-hidden">
        {rows.map((row, i) => {
          const color = getEntityType(row.entity.typeId)?.color ?? "#6B7280";
          const isDoc = row.field === null;
          // Keyed by content, not index: "Show more" splices new rows into the
          // ranked list, and an index would move the selection to another row.
          const rowKey = row.key;
          const selected =
            activeKey === rowKey ||
            (row.page !== null &&
              activePage?.page === row.page &&
              (activePage.entityId === row.entity.id ||
                row.also.some((e) => e.id === activePage.entityId)));
          // Page jump where there is a page, the entity's document where there
          // isn't, the field for a property row.
          const goTo = () => {
            setActiveKey(rowKey);
            if (isDoc && row.page !== null) onSelectSnippet(row.entity.id, row.page);
            else if (isDoc) onSelect(row.entity.id);
            else onFocusProperty(row.entity.id, row.fieldKey!);
          };
          // The match count goes in the accessible name: the visible "N matches"
          // is passive text whose hint keyboard users can't reach.
          const matchCount = row.hits > 1 ? `, ${row.hits} matches` : "";
          const primaryName =
            (!isDoc
              ? `Go to ${row.field} in ${row.entity.title}`
              : row.page !== null
                ? `Go to page ${row.page} in ${row.entity.title}`
                : `Open the document of ${row.entity.title}`) + matchCount;
          return (
            // Clickable row (CLAUDE.md a11y patterns): stretched primary-action
            // button first, content above it in a `relative` wrapper, plain
            // `onClick` on the item for the mouse. Footer controls stop
            // propagation, so nothing fires twice.
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
              {/* Passage and attribution form one block, attribution under the
                  quote, so it stays next to the sentence it names. */}
              <div className="relative">
              <p data-part="excerpt" className="leading-relaxed text-ink wrap-anywhere">
                <HighlightedText text={row.text} query={query} />
              </p>
              {/* One line at a fixed height (`min-h-5` holds the page tag's box
                  on rows without one), so rows don't grow when they carry more. */}
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
                        // Cmd/Ctrl or Shift adds the passage's entity to the
                        // selection (the handler reads the modifiers).
                        if (!selectionIntent(e)) setActiveKey(rowKey);
                        onSelect(row.entity.id, e);
                      }}
                      onMouseDown={holdTextSelection}
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
                {/* `ltr` keeps "Document · p.15 · 2 matches" in order under RTL.
                    A field name is translated, so it takes `auto`; forcing ltr
                    on it mis-orders an RTL label. */}
                <bdi dir={isDoc ? "ltr" : "auto"} className="shrink-0 flex items-center gap-1">
                  {/* Plain text: the primary button already goes to the
                      evidence, and a second button would announce it twice. */}
                  <span data-part="source" className="uppercase tracking-wide text-ink-tertiary">
                    {isDoc ? documentLabel(row.from) : row.field}
                  </span>
                  {/* Only where the corpus is page-mapped. */}
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
                  {/* Spelled out rather than "4×" so screen readers read it
                      as a count. */}
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
                {/* On the always-mounted attribution line, so it adds no height. */}
                <BorrowedDocLine from={row.from} className="min-w-0" />
                {/* Other results folded into this row, same `↳` idiom. */}
                {row.also.length > 0 && <AlsoUnder entities={row.also} onOpenEntity={onSelect} />}
              </div>
              </div>
            </li>
          );
        })}
      </ul>
      {(notShown > 0 || titleOnly > 0) && (
        <p data-part="note" className="pt-3 text-center text-meta text-ink-tertiary">
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
      {/* All geometry is `TimeSpine`'s; this passes only a row height.
          `TimeSpine` derives its scale from that height, so raising
          `SPINE_ROW_H` stretches the axis and can break eliding. */}
      <TimeSpine
        rows={dated}
        rowHeight={SPINE_ROW_H}
        dotColor={({ entity }) => getEntityType(entity.typeId)?.color ?? "#6B7280"}
        dotActive={({ entity }) => selectedId === entity.id}
        renderRow={({ entity, snippets }, { t }) => {
          const selected = selectedId === entity.id;
          const color = getEntityType(entity.typeId)?.color ?? "#6B7280";
          // One passage per result: the strongest by `compareEvidence`, page
          // or property.
          const best = bestPassage(snippets);
          return (
            <button
              type="button"
              data-part="spine-row"
              aria-pressed={selected}
              onClick={(e) =>
                // A selection gesture selects the entity; otherwise the row
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
              <span
                aria-hidden
                className="shrink-0 w-1.5 h-1.5 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
              <SpineDate t={t} />
              {/* Bounded so a long title can't take the whole line. */}
              <span className="shrink-0 max-w-[18rem] truncate text-xs font-medium text-ink">
                <HighlightedText text={entity.title} query={query} />
              </span>
              <CountBadge {...evidenceBadge(snippets)} />
              <span className="flex-1" />
              {/* Passage source: page tag and borrowed document. `<bdi>` keeps
                  "Document · p.5" in order under RTL. Fixed width, not `max-w`,
                  so rows line up whether or not they carry a borrowed document. */}
              {best && (
                <span className="hidden md:flex shrink-0 w-[14rem] items-center gap-1.5 overflow-hidden text-meta text-ink-tertiary">
                  <bdi dir="ltr" className="shrink-0">
                    {best.label}
                  </bdi>
                  {/* Start-aligned with a fade: end-aligned in an overflow-hidden
                      box, a long title would be cut at its start. */}
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
        <p data-part="note" className="pt-3 text-center text-meta text-ink-tertiary">
          {undated.toLocaleString()} matching {undated === 1 ? "result carries" : "results carry"} no
          date and {undated === 1 ? "is" : "are"} not plotted.
        </p>
      )}
    </div>
  );
}

/** Best-ranked page or property by `compareEvidence` (a page wins a tie).
 *  Never the title, which the row already prints. The label names a page only
 *  when the snippet has one. */
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
      // Not tinted, unlike the drawer: the card's border already separates it,
      // and a filled full-width block looks heavy.
      className="w-full text-start rounded-md px-2 py-1.5 hover:bg-warm
        transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
        focus-visible:ring-inset focus-visible:ring-ink/20"
    >
      <SectionLabel as="span">{group.field}</SectionLabel>
      {group.texts.map((t, i) => (
        <span key={i} data-part="excerpt" className="block text-sm text-ink leading-relaxed wrap-anywhere">
          <HighlightedText text={t} query={query} />
        </span>
      ))}
    </button>
  );
}

/** One document passage. Clickable and page-tagged only where the snippet has
 *  a page; otherwise a passive excerpt (PATTERNS §4.2). */
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
  const active = useAtomValue(resultsCurrentPageAtom);
  const tag = [
    snippet.page !== null ? `p.${snippet.page}` : null,
    snippet.hits > 1 ? `${snippet.hits}×` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  // The tag trails the last word inline rather than end-aligning, so it stays
  // next to its passage and takes no extra line. `bdi dir="ltr"` keeps
  // "p.15 · 2×" in order under RTL without forcing the passage's direction.
  const body = (
    // A block <span>, not <p>: this body is also the content of a <button>,
    // where a paragraph isn't phrasing content.
    // `wrap-anywhere`: extracted text carries unbreakable runs (a table of
    // contents' dot leaders, a URL) wider than a narrow pane's line.
    <span className="block text-sm text-ink leading-relaxed wrap-anywhere">
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

/** "3 of 41 pages". `total` is every matched page, so a capped card still
 *  shows the full count. */
function PageCount({ shown, total }: { shown: number; total: number }) {
  return (
    <span dir="ltr" data-part="page-count" className="ms-1.5 font-normal normal-case tracking-normal text-ink-tertiary">
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
