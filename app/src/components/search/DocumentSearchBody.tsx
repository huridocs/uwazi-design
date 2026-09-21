import { useMemo, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Search, X } from "lucide-react";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { activeDrawerTabAtom, docSearchQueryAtom } from "../../atoms/references";
import { languageAtom } from "../../atoms/language";
import { dataSourceAtom } from "../../atoms/dataSource";
import { scrollToPageAtom } from "../../atoms/selection";
import { resultsActivePageAtom, requestMetadataFocusAtom } from "../../atoms/library";
import { getEntity } from "../../data/entities";
import { buildSnippetsFor } from "../../utils/librarySnippets";
import { parseSearchQuery } from "../../utils/queryTokens";
import { HighlightedText } from "../shared/HighlightedText";
import { SectionLabel } from "../shared/SectionLabel";
import { BorrowedDocLine } from "../library/BorrowedDocLine";
import { PageSpine } from "./PageSpine";

function Centered({ children }: { children: ReactNode }) {
  return (
    <div data-part="empty" className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
      {children}
    </div>
  );
}

/** The entity-view drawer's Search tab: full-text search WITHIN this entity's
 *  document, mirroring Uwazi V2's SearchResultsPanel / SearchSnippetList (see
 *  handoff/DATA-SEAMS.md §8).
 *
 *  No new engine — this is the Library's Results machinery pointed at one
 *  entity: `buildSnippetsFor` for the same per-page snippets, `HighlightedText`
 *  for the same marks, and the same `PageSpine` rows ("p.N · N×"). Clicking a
 *  page hit scrolls the viewer and records `resultsActivePageAtom`, so the row
 *  stays lit exactly as it does in the Library. Property hits group above the
 *  document hits and deep-focus the Metadata tab, reusing
 *  `requestMetadataFocusAtom`. */
export function DocumentSearchBody() {
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const language = useAtomValue(languageAtom);
  const source = useAtomValue(dataSourceAtom);
  const setScrollToPage = useSetAtom(scrollToPageAtom);
  const setActivePage = useSetAtom(resultsActivePageAtom);
  const setFocusField = useSetAtom(requestMetadataFocusAtom);
  const setDrawerTab = useSetAtom(activeDrawerTabAtom);

  const [query, setQuery] = useAtom(docSearchQueryAtom);
  const trimmed = query.trim();
  const entity = getEntity(focusedId);

  const snippets = useMemo(
    // `perPassage`: the results here are passages, so the query's AND / OR / NOT
    // is judged per field and per page — see `buildSnippetsFor`. `order: "page"`:
    // this tab reads through one document, so its hits stay in reading order.
    () =>
      entity && trimmed
        ? buildSnippetsFor(entity, trimmed, language, source, { perPassage: true, order: "page" })
        : null,
    [entity, trimmed, language, source],
  );

  // Jump the viewer to the page and light the row (the Library's jump pattern).
  const jumpToPage = (_id: string, page: number) => {
    setScrollToPage(page);
    setActivePage({ entityId: focusedId, page });
  };

  // A property hit takes you to the value: the Metadata tab, flashed on that
  // field (matched by key, so it survives translation).
  const focusProperty = (fieldKey: string) => {
    setFocusField({ entityId: focusedId, fieldKey });
    setDrawerTab("metadata");
  };

  // Only `NOT` terms: there is nothing to find a passage BY, and listing every
  // page that lacks a word is not a search result. Say so instead of "No matches".
  const onlyExcludes = (() => {
    const { groups, exclude } = parseSearchQuery(trimmed);
    return groups.length === 0 && exclude.length > 0;
  })();

  const hasMeta = !!snippets?.metadata.length;
  const hasFullText = !!snippets?.fullText.length;

  return (
    <div data-component="DocumentSearchBody" className="flex-1 min-h-0 flex flex-col">
      {/* Search input — the tab's own query, independent of the Library's. */}
      <div
        role="search"
        data-part="search"
        className="bleed shrink-0 py-2"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <div
          className="flex items-center gap-1.5 h-8 px-2 bg-warm border border-border rounded-md
            focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-all"
        >
          <Search size={14} className="text-ink-muted shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this document"
            aria-label="Search this document"
            className="flex-1 min-w-0 bg-transparent text-xs font-medium placeholder:text-ink-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              data-part="clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="shrink-0 p-0.5 rounded-full hover:bg-parchment text-ink-muted hover:text-ink
                cursor-pointer transition-colors"
            >
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!trimmed ? (
        <Centered>
          <Search size={20} className="text-ink-muted" aria-hidden="true" />
          <span className="text-sm text-ink-tertiary">Search this document</span>
          <span className="text-xs text-ink-muted">
            Matches show the passage and the page they’re on.
          </span>
        </Centered>
      ) : !snippets || snippets.count === 0 ? (
        <Centered>
          {/* The phrase is English; `dir="ltr"` keeps it from reordering in RTL. */}
          {onlyExcludes ? (
            <span className="text-sm text-ink-tertiary">
              {"Add a term to find. NOT\u00a0only leaves passages out."}
            </span>
          ) : (
            <span dir="ltr" className="text-sm text-ink-tertiary">
              No matches for{" "}
              <span className="font-medium text-ink-secondary">“{trimmed}”</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment
              hover:text-ink rounded-md transition-colors cursor-pointer"
          >
            Clear search
          </button>
        </Centered>
      ) : (
        <div data-part="results" className="bleed flex-1 overflow-auto py-3 flex flex-col gap-3">
          <span dir="ltr" data-part="summary" className="text-meta text-ink-tertiary">
            {snippets.count.toLocaleString()} {snippets.count === 1 ? "match" : "matches"} for{" "}
            <span className="font-medium text-ink">“{trimmed}”</span>
          </span>

          {hasMeta && (
            <section data-part="properties" className="flex flex-col gap-1.5">
              <SectionLabel>Properties</SectionLabel>
              <ul className="flex flex-col gap-1.5">
                {snippets.metadata.map((group) => (
                  <li key={group.fieldKey} data-part="property">
                    <button
                      type="button"
                      onClick={() => focusProperty(group.fieldKey)}
                      className="w-full text-start rounded-md px-2 py-1.5 bg-warm/50 hover:bg-parchment
                        transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
                        focus-visible:ring-inset focus-visible:ring-ink/20"
                    >
                      {/* Inside a button: a span, never a heading. */}
                      <SectionLabel as="span">{group.field}</SectionLabel>
                      {group.texts.map((text, i) => (
                        <span key={i} className="block text-sm text-ink leading-relaxed">
                          <HighlightedText text={text} query={trimmed} />
                        </span>
                      ))}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasFullText && (
            <section data-part="document" className="flex flex-col gap-1.5">
              {/* An entity with no PDF of its own reads a connected one's, so
                  these passages can come from another case's judgment — and
                  this tab was the one surface that never said so, while the
                  Document tab and the Library results both did. Rides the
                  label, which is mounted either way, so nothing moves when it
                  appears; and it draws NOTHING for an entity's own document,
                  because `borrowedFrom` is null there. Same call as
                  `EntityResultCard`. */}
              <SectionLabel>
                Document
                <BorrowedDocLine from={snippets.borrowedFrom} className="min-w-0" />
              </SectionLabel>
              <PageSpine
                entityId={focusedId}
                fullText={snippets.fullText}
                query={trimmed}
                onSelect={jumpToPage}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
