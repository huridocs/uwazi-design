import type { ReactNode } from "react";
import type { Entity } from "../../../data/entities";
import { getEntityType } from "../../../data/entities";
import type { EntitySnippets } from "../../../utils/librarySnippets";
import { RelationshipGroupedCard } from "../../relationships/RelationshipGroupedCard";
import { HighlightedText } from "../../shared/HighlightedText";
import { PageSpine } from "../../search/PageSpine";

interface Props {
  entity: Entity;
  snippets: EntitySnippets;
  query: string;
  /** Controlled expansion — ResultsBody owns the per-entity map so Collapse/
   *  Expand all can drive every card at once. */
  expanded: boolean;
  onToggle: () => void;
  /** Clicking a Properties hit — open the entity preview on its Metadata tab and
   *  flash the field (by key). */
  onFocusProperty: (id: string, fieldKey: string) => void;
  /** Clicking a Document hit — select + jump the doc to that page. */
  onSelectSnippet: (id: string, page: number) => void;
}

/** A quiet section label echoing Uwazi's SnippetList structure (metadata field
 *  headers vs "Document contents"). */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
      {children}
    </span>
  );
}

/** One matched entity, composed from the shared grouped-card shell
 *  (`RelationshipGroupedCard`). Inside, snippets are grouped under two sections:
 *  "Properties" (metadata field hits — each row opens the entity's Metadata tab
 *  focused on that field) and "Document" (the full-text page spine — each row
 *  jumps the doc to that page). */
export function EntityResultCard({
  entity,
  snippets,
  query,
  expanded,
  onToggle,
  onFocusProperty,
  onSelectSnippet,
}: Props) {
  const color = getEntityType(entity.typeId)?.color ?? "#6B7280";
  const hasMeta = snippets.metadata.length > 0;
  const hasFullText = snippets.fullText.length > 0;

  return (
    // `standalone` keeps this card off the relationships-panel expand/collapse
    // globals; ResultsBody owns the expand state so Collapse/Expand-all can drive
    // every card without touching (or being touched by) the other surface.
    <RelationshipGroupedCard
      title={entity.title}
      color={color}
      count={snippets.count}
      standalone
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-3 p-2">
        {hasMeta && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Properties</SectionLabel>
            {snippets.metadata.map((group) => (
              <button
                key={group.fieldKey}
                type="button"
                onClick={() => onFocusProperty(entity.id, group.fieldKey)}
                className="w-full text-start rounded-md px-2 py-1.5 bg-warm/50 hover:bg-parchment
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
            ))}
          </div>
        )}

        {hasFullText && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Document</SectionLabel>
            <PageSpine
              entityId={entity.id}
              fullText={snippets.fullText}
              query={query}
              onSelect={onSelectSnippet}
            />
          </div>
        )}
      </div>
    </RelationshipGroupedCard>
  );
}
