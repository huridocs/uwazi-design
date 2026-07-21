import { ChevronRight } from "lucide-react";
import type { Entity } from "../../../data/entities";
import type { EntitySnippets } from "../../../utils/librarySnippets";
import { EntityPill } from "../../shared/EntityPill";
import { HighlightedText } from "../../shared/HighlightedText";

interface Props {
  entity: Entity;
  snippets: EntitySnippets;
  query: string;
  /** Selecting the entity — swaps the drawer to its preview. */
  onSelectEntity: (id: string) => void;
  /** Selecting a full-text snippet — select + jump the doc to `page`. */
  onSelectSnippet: (id: string, page: number) => void;
  /** The page of this entity's last-jumped snippet (lit on return), or null. */
  activePage: number | null;
}

/** One matched entity: a select-header, its metadata group cards, then (if the
 *  doc had hits) a soft divider and the clickable full-text snippet buttons. The
 *  header and the snippet buttons are SIBLINGS — no nested controls — so neither
 *  needs the stretched-primary-action-button pattern (PATTERNS.md §1.1). */
export function EntitySnippetCard({
  entity,
  snippets,
  query,
  onSelectEntity,
  onSelectSnippet,
  activePage,
}: Props) {
  const hasMeta = snippets.metadata.length > 0;
  const hasFullText = snippets.fullText.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onSelectEntity(entity.id)}
        className="w-full flex items-center gap-2 text-left rounded-md px-1 py-1 cursor-pointer
          hover:bg-parchment/60 focus-visible:outline-none focus-visible:ring-1
          focus-visible:ring-inset focus-visible:ring-ink/20"
      >
        <EntityPill typeId={entity.typeId} />
        <span className="flex-1 min-w-0 font-semibold text-ink truncate">{entity.title}</span>
        <span className="shrink-0 text-xs font-semibold text-ink-tertiary bg-warm px-1.5 rounded-md tabular-nums">
          {snippets.count}
        </span>
        <ChevronRight size={14} className="shrink-0 text-ink-tertiary" aria-hidden="true" />
      </button>

      {hasMeta && (
        <div className="flex flex-col gap-2">
          {snippets.metadata.map((group) => (
            <div key={group.field} className="rounded-md border border-border/40 bg-paper p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
                {group.field}
              </div>
              {group.texts.map((t, i) => (
                <div key={i} className="mt-1 text-sm text-ink leading-relaxed">
                  <HighlightedText text={t} query={query} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {hasMeta && hasFullText && <hr className="border-border/40" />}

      {hasFullText && (
        <div className="flex flex-col gap-2">
          {snippets.fullText.map((snippet, i) => {
            const isActive = activePage === snippet.page;
            return (
              <button
                key={i}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelectSnippet(entity.id, snippet.page)}
                className={`w-full text-left rounded-md border p-3 transition-colors cursor-pointer
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20 ${
                    isActive
                      ? "bg-parchment border-border"
                      : "bg-paper border-border/40 hover:bg-warm"
                  }`}
              >
                <p className="text-sm text-ink leading-relaxed">
                  <HighlightedText text={snippet.text} query={query} />
                </p>
                <span
                  dir="ltr"
                  className="mt-2 block text-right text-xs font-semibold text-ink-tertiary tabular-nums"
                >
                  p.{snippet.page}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
