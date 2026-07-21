import { useMemo, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Search, X } from "lucide-react";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { activeDrawerTabAtom, docSearchQueryAtom } from "../../atoms/references";
import { languageAtom } from "../../atoms/language";
import { dataSourceAtom } from "../../atoms/dataSource";
import { scrollToPageAtom } from "../../atoms/selection";
import { resultsActivePageAtom, focusMetadataFieldAtom } from "../../atoms/library";
import { getEntity } from "../../data/entities";
import { buildSnippetsFor } from "../../utils/librarySnippets";
import { HighlightedText } from "../shared/HighlightedText";
import { PageSpine } from "./PageSpine";

/** A quiet section label — the same two-section structure the Library Results
 *  cards use (Properties above Document), echoing Uwazi's SnippetList. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
      {children}
    </span>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
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
 *  `focusMetadataFieldAtom`. */
export function DocumentSearchBody() {
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const language = useAtomValue(languageAtom);
  const source = useAtomValue(dataSourceAtom);
  const setScrollToPage = useSetAtom(scrollToPageAtom);
  const setActivePage = useSetAtom(resultsActivePageAtom);
  const setFocusField = useSetAtom(focusMetadataFieldAtom);
  const setDrawerTab = useSetAtom(activeDrawerTabAtom);

  const [query, setQuery] = useAtom(docSearchQueryAtom);
  const trimmed = query.trim();
  const entity = getEntity(focusedId);

  const snippets = useMemo(
    () => (entity && trimmed ? buildSnippetsFor(entity, trimmed, language, source) : null),
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

  const hasMeta = !!snippets?.metadata.length;
  const hasFullText = !!snippets?.fullText.length;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Search input — the tab's own query, independent of the Library's. */}
      <div
        className="shrink-0 px-3 py-2"
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
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="shrink-0 p-0.5 rounded-full hover:bg-parchment text-ink-muted hover:text-ink
                cursor-pointer transition-colors"
            >
              <X size={12} />
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
          <span dir="ltr" className="text-sm text-ink-tertiary">
            No matches for{" "}
            <span className="font-medium text-ink-secondary">“{trimmed}”</span>
          </span>
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
        <div className="flex-1 overflow-auto px-3 py-3 flex flex-col gap-3">
          <span dir="ltr" className="px-1 text-[11px] text-ink-tertiary">
            {snippets.count.toLocaleString()} {snippets.count === 1 ? "match" : "matches"} for{" "}
            <span className="font-medium text-ink">“{trimmed}”</span>
          </span>

          {hasMeta && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Properties</SectionLabel>
              {snippets.metadata.map((group) => (
                <button
                  key={group.fieldKey}
                  type="button"
                  onClick={() => focusProperty(group.fieldKey)}
                  className="w-full text-start rounded-md px-2 py-1.5 bg-warm/50 hover:bg-parchment
                    transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
                    focus-visible:ring-inset focus-visible:ring-ink/20"
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                    {group.field}
                  </span>
                  {group.texts.map((text, i) => (
                    <span key={i} className="block text-sm text-ink leading-relaxed">
                      <HighlightedText text={text} query={trimmed} />
                    </span>
                  ))}
                </button>
              ))}
            </div>
          )}

          {hasFullText && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Document</SectionLabel>
              <PageSpine
                entityId={focusedId}
                fullText={snippets.fullText}
                query={trimmed}
                onSelect={jumpToPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
