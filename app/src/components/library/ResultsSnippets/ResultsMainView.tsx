import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Search, ChevronDown, FileText, Tag } from "lucide-react";
import type { Entity } from "../../../data/entities";
import { getEntityType } from "../../../data/entities";
import type { Language } from "../../../atoms/language";
import type { DataSource } from "../../../utils/libraryFacets";
import {
  buildSnippetsFor,
  MAX_FULLTEXT,
  type EntitySnippets,
  type FullTextSnippet,
  type MetadataSnippet,
} from "../../../utils/librarySnippets";
import {
  matchTypeFiltersAtom,
  libraryResultsLayoutAtom,
  resultsActivePageAtom,
  type MatchTypeFilters,
} from "../../../atoms/library";
import { entityTime } from "../../../utils/timeline";
import { RelationshipGroupedCard } from "../../relationships/RelationshipGroupedCard";
import { TimeSpine, SpineDate } from "../TimeSpine";
import { HighlightedText } from "../../shared/HighlightedText";
import { EntityTypeChip } from "../../shared/EntityTypeChip";
import { ListInfoRow } from "../../shared/ListInfoRow";
import { ToggleChip } from "../../shared/ToggleChip";
import { CountBadge } from "../../shared/CountBadge";

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
 *  Layout stability: the header strip (count, chips, cap note) is mounted at all
 *  times with only its CONTENTS toggling, so ticking a match-type chip can't
 *  shove the results out from under the pointer. */

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
  onSelect: (id: string) => void;
  selectedId: string | null;
  onClearSearch: () => void;
  hiddenByFilters: number;
  onClearFilters: () => void;
  matchTypeCounts: Record<MatchType, number>;
  totalMatches: number;
}

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
}: Props) {
  const layout = useAtomValue(libraryResultsLayoutAtom);
  const [activeTypes, setActiveTypes] = useAtom(matchTypeFiltersAtom);
  const [visible, setVisible] = useState(STEP);
  const trimmed = query.trim();

  useEffect(() => setVisible(STEP), [entities, trimmed, language, source, layout]);

  const results = useMemo<Result[]>(
    () =>
      entities
        .slice(0, visible)
        .map((e) => ({
          entity: e,
          snippets: buildSnippetsFor(e, trimmed, language, source, {
            maxFullText: layout === "passages" ? PASSAGES_PER_ENTITY : MAX_FULLTEXT,
          }),
        }))
        .filter((r) => r.snippets.count > 0),
    [entities, visible, trimmed, language, source, layout],
  );

  if (source === "cejil" && cejilLoading) {
    return (
      <Centered>
        {cejilError ? (
          <>
            <span className="text-sm text-ink-muted">Couldn’t load the CEJIL collection.</span>
            <WarmButton onClick={onRetry}>Retry</WarmButton>
          </>
        ) : (
          <>
            <span className="w-5 h-5 rounded-full border-2 border-border border-t-carbon animate-spin" />
            <span className="text-sm text-ink-muted">Loading the full CEJIL collection…</span>
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

  const narrowed = entities.length !== totalMatches;
  const capped = entities.length > results.length + (entities.length - visible);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header strip — always mounted; only its contents change. Count,
          match-type chips and the cap note ride the shared list-header shape
          (count + inlineSlot + rightSlot) so this surface and the drawer's
          Results tab read as one component at two widths. */}
      <div className="shrink-0">
        <ListInfoRow
          count={
            <span dir="ltr" className="text-xs text-ink-secondary">
              <span className="font-semibold text-ink tabular-nums">
                {narrowed
                  ? `${entities.length.toLocaleString()} of ${totalMatches.toLocaleString()}`
                  : entities.length.toLocaleString()}
              </span>{" "}
              {totalMatches === 1 ? "result" : "results"} for{" "}
              <span className="font-medium text-ink">“{trimmed}”</span>
            </span>
          }
          activeFilterCount={0}
          showFilterChips={false}
          // Chips lead, total trails. The chips are the thing being clicked and
          // their widths never change (`matchTypeCounts` comes from
          // `matchTypeBase`, which the toggles don't narrow); the total is the
          // thing that reflows, rewriting "3,996" as "1,626 of 3,996". Put the
          // total first and every chip shifts right under the pointer on the
          // click that changed it.
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
        />
        {/* Always mounted, contents hidden when nothing is excluded — this line
            appears and vanishes as facets are ticked, exactly while the results
            below are being read. */}
        <p
          aria-hidden={hiddenByFilters === 0}
          className={`px-3 pb-2 text-[11px] text-ink-tertiary ${
            hiddenByFilters === 0 ? "invisible" : ""
          }`}
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
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-3">
        {entities.length === 0 ? (
          <p className="pt-6 text-center text-xs text-ink-tertiary">
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
          />
        ) : layout === "tree" ? (
          <TreeBody
            results={results}
            query={trimmed}
            onFocusProperty={onFocusProperty}
            onSelectSnippet={onSelectSnippet}
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
          <div className="flex justify-center py-4">
            <WarmButton onClick={() => setVisible((n) => n + STEP)}>
              Show more — {(entities.length - visible).toLocaleString()} remaining
            </WarmButton>
          </div>
        )}
        {capped && visible >= entities.length && (
          <p className="py-4 text-center text-[11px] text-ink-muted">
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
}: {
  results: Result[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFocusProperty: (id: string, fieldKey: string) => void;
  onSelectSnippet: (id: string, page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 pb-2">
      {results.map(({ entity, snippets }) => {
        const type = getEntityType(entity.typeId);
        const selected = selectedId === entity.id;
        const props = properties(snippets);
        const hasMeta = props.length > 0;
        const hasText = snippets.fullText.length > 0;
        return (
          <article
            key={entity.id}
            className={`relative rounded-md border transition-colors ${
              selected ? "bg-parchment border-border" : "bg-paper border-border/60"
            }`}
          >
            <header
              className={`flex items-center gap-2 px-4 py-2.5 ${
                hasMeta || hasText ? "border-b border-border/40" : ""
              }`}
            >
              <EntityTypeChip typeId={entity.typeId} />
              <button
                type="button"
                onClick={() => onSelect(entity.id)}
                aria-pressed={selected}
                className="min-w-0 text-start text-sm font-semibold text-ink truncate hover:underline
                  cursor-pointer focus-visible:outline-none focus-visible:ring-1
                  focus-visible:ring-carbon/40 rounded-sm"
              >
                <HighlightedText text={entity.title} query={query} />
              </button>
              <CountBadge count={snippets.count} />
              <span className="ms-auto shrink-0 flex items-center gap-2 text-[11px] text-ink-tertiary">
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
            </header>

            {/* Two columns from `lg` up when there ARE two — properties read as a
                short list and take a third, the passages are prose and take the
                rest. One section alone spans the card (capped to a readable
                measure rather than stretched); neither means a header-only card,
                which is the honest shape of a title-only match. */}
            {(hasMeta || hasText) && (
              <div
                className={`grid gap-x-6 gap-y-3 px-4 py-3 ${
                  hasMeta && hasText ? "lg:grid-cols-[minmax(14rem,1fr)_2fr]" : ""
                }`}
              >
                {hasMeta && (
                  <section className={hasText ? "" : "max-w-[70ch]"}>
                    <SectionLabel icon={<Tag size={11} />}>Properties</SectionLabel>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {props.map((group) => (
                        <PropertyRow
                          key={group.fieldKey}
                          group={group}
                          query={query}
                          onClick={() => onFocusProperty(entity.id, group.fieldKey)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {hasText && (
                  <section className={hasMeta ? "" : "max-w-[80ch]"}>
                    <SectionLabel icon={<FileText size={11} />}>
                      Document
                      <PageCount shown={snippets.fullText.length} total={snippets.fullTextTotal} />
                    </SectionLabel>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {snippets.fullText.map((s, i) => (
                        <PassageRow
                          key={i}
                          snippet={s}
                          query={query}
                          entityId={entity.id}
                          onSelectSnippet={onSelectSnippet}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
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
}: {
  results: Result[];
  query: string;
  onFocusProperty: (id: string, fieldKey: string) => void;
  onSelectSnippet: (id: string, page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 pb-2">
      {results.map(({ entity, snippets }) => {
        const color = getEntityType(entity.typeId)?.color ?? "#6B7280";
        const props = properties(snippets);
        const bare = props.length === 0 && snippets.fullText.length === 0;
        return (
          // The shared grouped-card shell in `standalone` mode — off the
          // relationships panel's expand/collapse globals entirely.
          <RelationshipGroupedCard
            key={entity.id}
            title={entity.title}
            highlight={query}
            color={color}
            count={snippets.count}
            standalone
            defaultExpanded
          >
            <div className="flex flex-col">
              {bare && (
                <p className="px-4 py-2 text-xs text-ink-muted">
                  Matched in the title — nothing else.
                </p>
              )}
              {props.map((group) => (
                <TreeBranch
                  key={group.fieldKey}
                  label={group.field}
                  count={group.texts.length}
                  icon={<Tag size={11} className="text-ink-muted" />}
                >
                  {group.texts.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onFocusProperty(entity.id, group.fieldKey)}
                      className="w-full text-start rounded-md px-2 py-1 text-sm text-ink leading-relaxed
                        hover:bg-warm transition-colors cursor-pointer focus-visible:outline-none
                        focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
                    >
                      <HighlightedText text={t} query={query} />
                    </button>
                  ))}
                </TreeBranch>
              ))}
              {snippets.fullText.length > 0 && (
                <TreeBranch
                  label="Document"
                  count={snippets.fullTextTotal}
                  icon={<FileText size={11} className="text-ink-muted" />}
                  note={
                    snippets.fullTextTotal > snippets.fullText.length
                      ? `${snippets.fullText.length} of ${snippets.fullTextTotal.toLocaleString()} shown`
                      : undefined
                  }
                >
                  {snippets.fullText.map((s, i) => (
                    <PassageRow
                      key={i}
                      snippet={s}
                      query={query}
                      entityId={entity.id}
                      onSelectSnippet={onSelectSnippet}
                    />
                  ))}
                </TreeBranch>
              )}
            </div>
          </RelationshipGroupedCard>
        );
      })}
    </div>
  );
}

/** One collapsible field branch. Indented under the entity with a quiet guide
 *  rail, mirroring the relationships tree. */
function TreeBranch({
  label,
  count,
  icon,
  note,
  children,
}: {
  label: string;
  count: number;
  icon: ReactNode;
  note?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="px-3 py-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-warm transition-colors
          cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink/20"
      >
        <ChevronDown
          size={12}
          className={`text-ink-muted transition-transform ${open ? "" : "-rotate-90"}`}
        />
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
          {label}
        </span>
        <span className="text-[10px] tabular-nums text-ink-muted">{count.toLocaleString()}</span>
        {note && <span className="text-[10px] text-ink-muted">· {note}</span>}
      </button>
      {open && (
        <div
          className="mt-1 ms-2 ps-3 flex flex-col gap-0.5"
          style={{ borderInlineStart: "1px solid var(--border-soft)" }}
        >
          {children}
        </div>
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
  field: string | null;
  fieldKey: string | null;
  text: string;
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
  onSelect: (id: string) => void;
  onFocusProperty: (id: string, fieldKey: string) => void;
  onSelectSnippet: (id: string, page: number) => void;
}) {
  const { rows, notShown, titleOnly } = useMemo(() => {
    const rows: FlatPassage[] = [];
    let notShown = 0;
    let titleOnly = 0;
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
            hits: 1,
            field: m.field,
            fieldKey: m.fieldKey,
            text: t,
          });
        }
      }
      for (const s of snippets.fullText) {
        rows.push({ entity, page: s.page, hits: s.hits, field: null, fieldKey: null, text: s.text });
      }
      // Pages counted but not excerpted — said out loud rather than dropped.
      notShown += Math.max(0, snippets.fullTextTotal - snippets.fullText.length);
    }
    // Densest passages first; ties keep the relevance order the entities arrived in.
    rows.sort((a, b) => b.hits - a.hits);
    return { rows, notShown, titleOnly };
  }, [results]);

  return (
    <div className="pb-2">
      <div className="flex flex-col gap-1">
        {rows.map((row, i) => {
          const color = getEntityType(row.entity.typeId)?.color ?? "#6B7280";
          const isDoc = row.field === null;
          return (
            <article
              key={`${row.entity.id}-${i}`}
              className="group grid gap-x-5 rounded-md px-3 py-2.5 bg-paper border border-border/50
                hover:border-border transition-colors lg:grid-cols-[1fr_15rem]"
            >
              <button
                type="button"
                onClick={() =>
                  isDoc && row.page !== null
                    ? onSelectSnippet(row.entity.id, row.page)
                    : isDoc
                      ? onSelect(row.entity.id)
                      : onFocusProperty(row.entity.id, row.fieldKey!)
                }
                className="min-w-0 text-start cursor-pointer focus-visible:outline-none
                  focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20 rounded-sm"
              >
                {/* The passage is the row. Wider measure than the drawer allowed,
                    capped at a readable line length rather than the pane width. */}
                <p className="max-w-[62ch] text-sm leading-relaxed text-ink">
                  <HighlightedText text={row.text} query={query} />
                </p>
              </button>
              <div className="mt-1.5 lg:mt-0 flex items-start gap-2 lg:justify-end">
                <span className="flex flex-col items-start lg:items-end gap-0.5 min-w-0">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-ink-secondary truncate">
                      <HighlightedText text={row.entity.title} query={query} />
                    </span>
                  </span>
                  <span dir="ltr" className="text-[10px] uppercase tracking-wide text-ink-tertiary">
                    {isDoc ? (
                      <>
                        Document
                        {/* No invented page numbers: the tag exists only where
                            the corpus is genuinely page-mapped. */}
                        {row.page !== null && (
                          <>
                            <span className="mx-1 text-ink-muted">·</span>
                            <span className="tabular-nums">p.{row.page}</span>
                          </>
                        )}
                        {row.hits > 1 && (
                          <>
                            <span className="mx-1 text-ink-muted">·</span>
                            <span className="tabular-nums">{row.hits}×</span>
                          </>
                        )}
                      </>
                    ) : (
                      row.field
                    )}
                  </span>
                </span>
              </div>
            </article>
          );
        })}
      </div>
      {(notShown > 0 || titleOnly > 0) && (
        <p className="pt-3 text-center text-[11px] text-ink-muted">
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

/* ------------------------------------------------------------------ *
 * 4 — SPINE: the results on a proportional time axis, each carrying its
 *     strongest passage. Answers "when does this term happen?", which
 *     neither the card list nor the passage list can.
 * ------------------------------------------------------------------ */

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
  onSelect: (id: string) => void;
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
      <p className="pt-6 text-center text-xs text-ink-tertiary">
        None of these results carries a date, so there is no axis to place them on.
      </p>
    );
  }

  return (
    <div className="pb-2">
      {/* The SAME spine the Timeline view draws, at the SAME row height. The
          geometry — axis inset, adaptive scale, year marks, elided silences,
          leader lines, date gutter — is all `TimeSpine`'s; this passes no
          `rowHeight` at all, so it inherits `EVENT_H` and the two chronologies
          are literally the same axis with different words on it.

          A taller row was a mistake, not a feature: `TimeSpine` derives its scale
          from `rowHeight`, so a 104px row stretched the axis 4.7× — and once rows
          are taller than `MAX_GAP` (88), no silence can ever be long enough to
          elide, which is what turned a chronology into a column of whitespace.
          One event, one line. The passage rides the line as a continuation, not
          as a block underneath it. */}
      <TimeSpine
        rows={dated}
        dotColor={({ entity }) => getEntityType(entity.typeId)?.color ?? "#6B7280"}
        dotActive={({ entity }) => selectedId === entity.id}
        renderRow={({ entity, snippets }, { t }) => {
          const selected = selectedId === entity.id;
          const color = getEntityType(entity.typeId)?.color ?? "#6B7280";
          // The strongest passage: the densest page, else the first matched
          // property. One passage per result — the spine is a chronology, not a
          // second results list.
          const best = bestPassage(snippets);
          return (
            <button
              type="button"
              aria-pressed={selected}
              onClick={() =>
                best?.page != null ? onSelectSnippet(entity.id, best.page) : onSelect(entity.id)
              }
              className={`w-full flex items-center gap-2 h-[22px] px-2 rounded-md text-start
                transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
                focus-visible:ring-inset focus-visible:ring-ink/20 ${
                  selected ? "bg-parchment" : "hover:bg-warm"
                }`}
            >
              <span
                className="shrink-0 w-1.5 h-1.5 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
              <SpineDate t={t} />
              {/* Title first and bounded, so a long case name can't eat the whole
                  line — the passage is the reason to be in this layout. */}
              <span className="shrink-0 max-w-[18rem] truncate text-xs font-medium text-ink">
                <HighlightedText text={entity.title} query={query} />
              </span>
              <CountBadge count={snippets.count} />
              {best && (
                <span className="flex-1 min-w-0 truncate text-xs text-ink-secondary">
                  <HighlightedText text={best.text} query={query} />
                </span>
              )}
              {/* The trailing slot the timeline spends on a type name — spent
                  here on where the passage came from. `<bdi>` keeps "Document ·
                  p.5" in order under RTL without flipping the box's alignment. */}
              {best && (
                <span className="shrink-0 max-w-[10rem] truncate text-[10px] text-ink-muted hidden md:block">
                  <bdi dir="ltr">{best.label}</bdi>
                </span>
              )}
            </button>
          );
        }}
      />
      {undated > 0 && (
        <p className="pt-3 text-center text-[11px] text-ink-muted">
          {undated.toLocaleString()} matching {undated === 1 ? "result carries" : "results carry"} no
          date and {undated === 1 ? "is" : "are"} not plotted.
        </p>
      )}
    </div>
  );
}

/** The passage that best represents a result: the densest document page, else
 *  the first matched property. Its label never claims a page the data can't back. */
function bestPassage(
  s: EntitySnippets,
): { text: string; page: number | null; label: string } | null {
  const top = s.fullText.reduce<FullTextSnippet | null>(
    (best, cur) => (!best || cur.hits > best.hits ? cur : best),
    null,
  );
  if (top) {
    const parts = ["Document"];
    if (top.page !== null) parts.push(`p.${top.page}`);
    if (top.hits > 1) parts.push(`${top.hits}×`);
    return { text: top.text, page: top.page, label: parts.join(" · ") };
  }
  // Never the title: the row above already prints it, marked.
  const m = properties(s)[0];
  if (m?.texts[0]) return { text: m.texts[0], page: null, label: m.field };
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
      onClick={onClick}
      // Flat, not tinted. The drawer tints these because a 24rem column needs the
      // separation; across a full-width card a filled block reads as a stranded
      // slab, and the card's own border is already doing that work.
      className="w-full text-start rounded-md px-2 py-1.5 hover:bg-warm
        transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
        focus-visible:ring-inset focus-visible:ring-ink/20"
    >
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
        {group.field}
      </span>
      {group.texts.map((t, i) => (
        <span key={i} className="block text-sm text-ink leading-relaxed">
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
  const body = (
    <>
      <p className="text-sm text-ink leading-relaxed">
        <HighlightedText text={snippet.text} query={query} />
      </p>
      {(snippet.page !== null || snippet.hits > 1) && (
        <span
          dir="ltr"
          className="mt-0.5 block text-end text-[11px] font-semibold text-ink-tertiary tabular-nums"
        >
          {snippet.page !== null && `p.${snippet.page}`}
          {snippet.page !== null && snippet.hits > 1 && " · "}
          {snippet.hits > 1 && `${snippet.hits}×`}
        </span>
      )}
    </>
  );

  if (snippet.page === null) {
    return <div className="rounded-md px-2 py-1.5">{body}</div>;
  }
  const page = snippet.page;
  const isActive = active?.entityId === entityId && active.page === page;
  return (
    <button
      type="button"
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
    <span dir="ltr" className="ms-1.5 font-normal normal-case tracking-normal text-ink-muted">
      <span className="tabular-nums">
        {shown < total ? `${shown} of ${total.toLocaleString()}` : total.toLocaleString()}
      </span>{" "}
      {total === 1 ? "page" : "pages"}
    </span>
  );
}

function SectionLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
      <span className="text-ink-muted">{icon}</span>
      {children}
    </span>
  );
}

function Dot() {
  return <span className="text-ink-muted">·</span>;
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
    <div className="flex-1 h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
      {children}
    </div>
  );
}
