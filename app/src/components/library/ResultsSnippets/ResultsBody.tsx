import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { Entity } from "../../../data/entities";
import type { Language } from "../../../atoms/language";
import type { DataSource } from "../../../utils/libraryFacets";
import { buildSnippetsFor } from "../../../utils/librarySnippets";
import { useAtom } from "jotai";
import { matchTypeFiltersAtom, type MatchTypeFilters } from "../../../atoms/library";
import { ListInfoRow } from "../../shared/ListInfoRow";
import { ToggleChip } from "../../shared/ToggleChip";
import { CollapseControls } from "../../relationships/FiltersRow";
import { EntityResultCard } from "./EntityResultCard";

type MatchType = keyof MatchTypeFilters;
const MATCH_TYPES: { key: MatchType; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "properties", label: "Properties" },
  { key: "document", label: "Document" },
];

/** How many entity cards to render before "Show more" (the drawer is narrow and
 *  the CEJIL corpus is thousands of entities — mirror the left pane's paging). */
const RESULTS_STEP = 40;

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
  onClearSearch: () => void;
  /** How many query matches the active facets are excluding (0 = none hidden). */
  hiddenByFilters: number;
  /** Widen the facets (keeping the query) to reveal the hidden matches. */
  onClearFilters: () => void;
  /** How many matches each chip represents (counted with the chips widened). */
  matchTypeCounts: Record<MatchType, number>;
  /** Matches before the chips narrow them — the "of M" in the header count. */
  totalMatches: number;
}

/** The Results-tab evidence view: per matched entity, WHERE the term hit — which
 *  metadata field, which document page — with the term highlighted. Composed
 *  from shared primitives (§11): `ListInfoRow` header, `RelationshipGroupedCard`
 *  per entity, and the full-text page spine. The left pane already lists the
 *  entity set; this shows the snippets the grid can't. Blank-state order: error →
 *  loading → no-search → no-results → list. */
export function ResultsBody({
  query,
  entities,
  source,
  language,
  cejilLoading,
  cejilError,
  onRetry,
  onFocusProperty,
  onSelectSnippet,
  onClearSearch,
  hiddenByFilters,
  onClearFilters,
  matchTypeCounts,
  totalMatches,
}: Props) {
  const [visible, setVisible] = useState(RESULTS_STEP);
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

  // `entities` is the already-filtered set. The left-pane filter and
  // `buildSnippetsFor` scan the SAME metadata fields, so every filtered entity is
  // guaranteed ≥1 metadata snippet — the match count is just `entities.length`,
  // and we only compute snippets for the visible slice, not the whole (thousands-
  // strong CEJIL) set.
  const capped = useMemo(
    () =>
      entities
        .slice(0, visible)
        .map((e) => ({ entity: e, snippets: buildSnippetsFor(e, trimmed, language, source) }))
        .filter((x) => x.snippets.count > 0),
    [entities, visible, trimmed, language, source],
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
              }),
            }
          : x,
      ),
    [capped, showAllMap, trimmed, language, source],
  );

  useEffect(() => {
    setVisible(RESULTS_STEP);
    setExpandedMap({});
    setShowAllMap({});
  }, [entities, trimmed, language, source]);

  const isExpanded = (id: string) => expandedMap[id] ?? true;
  const expandedCount = rendered.filter((x) => isExpanded(x.entity.id)).length;
  const setAllExpanded = (val: boolean) =>
    setExpandedMap(Object.fromEntries(rendered.map((x) => [x.entity.id, val])));

  // error → loading (CEJIL corpus is the only real async path in mock mode).
  if (source === "cejil" && cejilLoading) {
    return (
      <Shell>
        <Centered>
          {cejilError ? (
            <>
              <span className="text-sm text-ink-muted">Couldn’t load the CEJIL collection.</span>
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment
                  hover:text-ink rounded-md transition-colors cursor-pointer"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <span className="w-5 h-5 rounded-full border-2 border-border border-t-carbon animate-spin" />
              <span className="text-sm text-ink-muted">Loading the full CEJIL collection…</span>
            </>
          )}
        </Centered>
      </Shell>
    );
  }

  // no-search — the tab was opened without a query.
  if (!trimmed) {
    return (
      <Shell>
        <Centered>
          <Search size={20} className="text-ink-muted" aria-hidden="true" />
          <span className="text-sm text-ink-tertiary">Search to see where terms match</span>
          <span className="text-xs text-ink-muted">Results show the passages behind each hit.</span>
        </Centered>
      </Shell>
    );
  }

  // no-results — query set, nothing matched AT ALL. (Chips hiding everything is
  // a different state: the header + chips still render so they can be re-enabled.)
  if (totalMatches === 0) {
    return (
      <Shell>
        <Centered>
          {/* Whole phrase is English; `dir="ltr"` keeps it from reordering in an
              RTL drawer (isolating only the digit wasn't enough). */}
          <span dir="ltr" className="text-sm text-ink-tertiary">
            No matches for{" "}
            <span className="font-medium text-ink-secondary">“{trimmed}”</span>
          </span>
          <button
            type="button"
            onClick={onClearSearch}
            className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment
              hover:text-ink rounded-md transition-colors cursor-pointer"
          >
            Clear search
          </button>
        </Centered>
      </Shell>
    );
  }

  // When the chips narrow the set, say so: "1 of 16 results".
  const narrowed = entities.length !== totalMatches;
  const countLabel = (
    <span dir="ltr">
      {narrowed
        ? `${entities.length.toLocaleString()} of ${totalMatches.toLocaleString()}`
        : entities.length.toLocaleString()}{" "}
      {totalMatches === 1 ? "result" : "results"} for{" "}
      <span className="font-medium text-ink">“{trimmed}”</span>
    </span>
  );

  return (
    <Shell>
      <div className="shrink-0" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        {/* Count, match-type chips and the collapse controls on ONE row —
            leadingSlot + count + rightSlot, the shared list-header shape. The
            chips used to sit in a strip of their own below, which is height this
            row was already paying for. */}
        <ListInfoRow
          count={countLabel}
          activeFilterCount={0}
          showFilterChips={false}
          // Ahead of the count for the same reason as the main view: the chips
          // are stable-width and clickable, the count rewrites itself to
          // "N of M" the moment one is toggled. Trailing chips would slide.
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
            appears and vanishes as facets are ticked — exactly while the user is
            reading the list below — so mounting it late shoved every card down.
            The height is reserved; only the contents toggle. */}
        <div
          aria-hidden={hiddenByFilters === 0}
          className={`px-3 pb-2 text-[11px] text-ink-tertiary ${
            hiddenByFilters === 0 ? "invisible" : ""
          }`}
        >
          {hiddenByFilters.toLocaleString()} more{" "}
          {hiddenByFilters === 1 ? "match" : "matches"} hidden by filters
          <span className="mx-1 text-ink-muted">·</span>
          <button
            type="button"
            onClick={onClearFilters}
            tabIndex={hiddenByFilters === 0 ? -1 : undefined}
            className="font-medium text-carbon hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Block flow (space-y), NOT flex-col: the grouped cards are
          `overflow-hidden`, so in a flex column that overflows they'd shrink to
          their header height and clip their own content. Block flow keeps each
          card at its natural height and lets this container scroll. */}
      <div className="flex-1 overflow-auto px-3 py-3 space-y-2">
        {entities.length === 0 && (
          <p className="px-1 pt-2 text-xs text-ink-tertiary">
            No results for the selected match types.
          </p>
        )}
        {rendered.map(({ entity, snippets }) => (
          <EntityResultCard
            key={entity.id}
            entity={entity}
            snippets={snippets}
            query={trimmed}
            expanded={isExpanded(entity.id)}
            onToggle={() =>
              setExpandedMap((m) => ({ ...m, [entity.id]: !(m[entity.id] ?? true) }))
            }
            onFocusProperty={onFocusProperty}
            onSelectSnippet={onSelectSnippet}
            showAllFullText={showAllMap[entity.id] ?? false}
            onToggleFullText={() =>
              setShowAllMap((m) => ({ ...m, [entity.id]: !m[entity.id] }))
            }
          />
        ))}
        {visible < entities.length && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setVisible((n) => n + RESULTS_STEP)}
              className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm
                hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
            >
              Show more ({(entities.length - visible).toLocaleString()})
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="flex flex-col h-full min-h-0 bg-warm">{children}</div>;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
      {children}
    </div>
  );
}
