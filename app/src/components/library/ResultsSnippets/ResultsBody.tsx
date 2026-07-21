import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { Entity } from "../../../data/entities";
import type { Language } from "../../../atoms/language";
import type { DataSource } from "../../../utils/libraryFacets";
import { buildSnippetsFor } from "../../../utils/librarySnippets";
import { EntitySnippetCard } from "./EntitySnippetCard";
import { SearchTipsDisclosure } from "./SearchTipsDisclosure";

/** The last full-text snippet the user jumped to. Lifted to LibraryView (this
 *  body unmounts while its entity's preview is showing), so on RETURN to the
 *  Results list that snippet stays lit — the affordance the spec wanted, which
 *  the original `selectedId === e.id && currentPage` derivation could never
 *  reach (jumping swaps the drawer away from the list; closing clears the id). */
export interface JumpedSnippet {
  entityId: string;
  page: number;
}

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
  onSelectEntity: (id: string) => void;
  onSelectSnippet: (id: string, page: number) => void;
  onClearSearch: () => void;
  /** The last-jumped snippet, so it stays lit on return to the list. */
  lastJumped: JumpedSnippet | null;
}

/** The Results-tab evidence view: per matched entity, WHERE the term hit — which
 *  metadata field, which document page — with the term highlighted. The left
 *  pane already lists the entity set; this shows the snippets the grid can't.
 *  Blank-state order: error → loading → no-search → no-results → list. */
export function ResultsBody({
  query,
  entities,
  source,
  language,
  cejilLoading,
  cejilError,
  onRetry,
  onSelectEntity,
  onSelectSnippet,
  onClearSearch,
  lastJumped,
}: Props) {
  const [visible, setVisible] = useState(RESULTS_STEP);
  const trimmed = query.trim();

  // `entities` is the already-filtered set. The left-pane filter and
  // `buildSnippetsFor` scan the SAME metadata fields (title/country/fields/
  // descriptors), so every filtered entity is guaranteed ≥1 metadata snippet —
  // the match count is just `entities.length`, and we only compute snippets for
  // the visible slice instead of the whole (thousands-strong CEJIL) set.
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

  useEffect(() => setVisible(RESULTS_STEP), [entities, trimmed, language, source]);

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
          <span className="text-sm text-ink-tertiary">
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

  return (
    <Shell>
      <div
        className="shrink-0 flex items-start justify-between gap-3 px-3 py-2"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <span className="pt-1 text-xs text-ink-secondary">
          {/* <bdi> isolates the leading count so an RTL (Arabic) drawer doesn't
              reorder it to the end of the phrase. */}
          <bdi>{entities.length.toLocaleString()}</bdi>{" "}
          {entities.length === 1 ? "result" : "results"} for{" "}
          <span className="font-medium text-ink">“{trimmed}”</span>
        </span>
        <SearchTipsDisclosure />
      </div>

      <div className="flex-1 overflow-auto flex flex-col gap-3 px-3 py-3">
        {rendered.map(({ entity, snippets }) => (
          <EntitySnippetCard
            key={entity.id}
            entity={entity}
            snippets={snippets}
            query={trimmed}
            onSelectEntity={onSelectEntity}
            onSelectSnippet={onSelectSnippet}
            activePage={lastJumped?.entityId === entity.id ? lastJumped.page : null}
          />
        ))}
        {visible < entities.length && (
          <button
            type="button"
            onClick={() => setVisible((n) => n + RESULTS_STEP)}
            className="mt-1 self-center px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm
              hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
          >
            Show more ({(entities.length - visible).toLocaleString()})
          </button>
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
