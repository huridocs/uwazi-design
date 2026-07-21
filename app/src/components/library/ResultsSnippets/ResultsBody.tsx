import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { Entity } from "../../../data/entities";
import type { Language } from "../../../atoms/language";
import type { DataSource } from "../../../utils/libraryFacets";
import { buildSnippetsFor } from "../../../utils/librarySnippets";
import { ListInfoRow } from "../../shared/ListInfoRow";
import { CollapseControls } from "../../relationships/FiltersRow";
import { EntityResultCard } from "./EntityResultCard";

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
}: Props) {
  const [visible, setVisible] = useState(RESULTS_STEP);
  // Per-entity expand state (absent = expanded). Owned here so Collapse/Expand
  // all can drive every card; each card is standalone (off the relationships
  // globals), so this never bleeds across surfaces.
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const trimmed = query.trim();

  // `entities` is the already-filtered set. The left-pane filter and
  // `buildSnippetsFor` scan the SAME metadata fields, so every filtered entity is
  // guaranteed ≥1 metadata snippet — the match count is just `entities.length`,
  // and we only compute snippets for the visible slice, not the whole (thousands-
  // strong CEJIL) set.
  const rendered = useMemo(
    () =>
      trimmed
        ? entities
            .slice(0, visible)
            .map((e) => ({ entity: e, snippets: buildSnippetsFor(e, trimmed, language, source) }))
            .filter((x) => x.snippets.count > 0)
        : [],
    [entities, trimmed, language, source, visible],
  );

  useEffect(() => {
    setVisible(RESULTS_STEP);
    setExpandedMap({});
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

  // no-results — query set, nothing matched.
  if (entities.length === 0) {
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

  const countLabel = (
    <span dir="ltr">
      {entities.length.toLocaleString()} {entities.length === 1 ? "result" : "results"} for{" "}
      <span className="font-medium text-ink">“{trimmed}”</span>
    </span>
  );

  return (
    <Shell>
      <div className="shrink-0" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <ListInfoRow
          count={countLabel}
          activeFilterCount={0}
          showFilterChips={false}
          rightSlot={
            <CollapseControls
              expandedCount={expandedCount}
              totalCount={rendered.length}
              onExpandAll={() => setAllExpanded(true)}
              onCollapseAll={() => setAllExpanded(false)}
            />
          }
        />
      </div>

      {/* Block flow (space-y), NOT flex-col: the grouped cards are
          `overflow-hidden`, so in a flex column that overflows they'd shrink to
          their header height and clip their own content. Block flow keeps each
          card at its natural height and lets this container scroll. */}
      <div className="flex-1 overflow-auto px-3 py-3 space-y-2">
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
