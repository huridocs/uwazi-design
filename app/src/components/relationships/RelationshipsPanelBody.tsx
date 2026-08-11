import { useEffect, useState, type ReactNode } from "react";
import { useAtom } from "jotai";
import { Link2 } from "lucide-react";
import {
  viewAtom,
  groupByAtom,
  subGroupByAtom,
  searchQueryAtom,
} from "../../atoms/filters";
import { useFilteredReferences } from "./useFilteredReferences";
import {
  getGroupColor,
  getGroupLabel,
  groupRefs,
} from "../../utils/connectionGrouping";
import { RelationshipsTreeView } from "./RelationshipsTreeView";
import { RelationshipsGraphView } from "./RelationshipsGraphView";
import { RelationshipRow } from "./RelationshipRow";
import { RelationshipGroupedCard } from "./RelationshipGroupedCard";

interface Props {
  onDelete?: (id: string) => void;
  scrollBgClass?: string;
}

/** How many flat reference rows to render before "Show more". */
const LIST_CAP = 100;

/** Body of the merged Relationships panel — toolbar lives above. */
export function RelationshipsPanelBody({ onDelete, scrollBgClass }: Props) {
  const [view] = useAtom(viewAtom);
  const [groupBy] = useAtom(groupByAtom);
  const [subGroupBy] = useAtom(subGroupByAtom);
  // Marked on the group headers — where a relation-type match shows once the
  // rows beneath stop repeating that label.
  const [query] = useAtom(searchQueryAtom);

  // The one shared pipeline (cluster → facets → search → sort) — List, Tree,
  // and Graph all filter through it. See useFilteredReferences.
  const filtered = useFilteredReferences();

  // Well-connected entities (e.g. a País) can have thousands of references —
  // cap the flat list render and reveal more on demand so it never paints them all.
  const [listLimit, setListLimit] = useState(LIST_CAP);
  useEffect(() => setListLimit(LIST_CAP), [filtered]);

  if (view === "tree") {
    return <RelationshipsTreeView />;
  }
  if (view === "graph") {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <RelationshipsGraphView />
      </div>
    );
  }

  let body: ReactNode;
  if (filtered.length === 0) {
    body = (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Link2 size={36} className="text-ink-tertiary/40 mb-3" />
        <p className="text-sm text-ink-tertiary">No relationships found</p>
        <p className="text-xs text-ink-tertiary mt-1">
          Select text in the document to create one
        </p>
      </div>
    );
  } else if (groupBy === "none") {
    body = (
      <div className="px-3 py-3">
        <div className="border border-border/60 rounded-md overflow-hidden bg-paper">
          {filtered.slice(0, listLimit).map((ref) => (
            <RelationshipRow
              key={ref.id}
              kind="reference"
              reference={ref}
              onDelete={onDelete}
            />
          ))}
        </div>
        {filtered.length > listLimit && (
          <div className="flex justify-center pt-3">
            <button
              onClick={() => setListLimit((n) => n + LIST_CAP)}
              className="px-4 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
            >
              Show more — {(filtered.length - listLimit).toLocaleString()} more references
            </button>
          </div>
        )}
      </div>
    );
  } else {
    const primaryGroups = groupRefs(filtered, groupBy);
    body = (
      <div className="px-3 py-3 space-y-1.5">
        {primaryGroups.map(([key, refs]) => (
          <RelationshipGroupedCard
            key={`p:${key}`}
            title={getGroupLabel(key, groupBy)}
            highlight={query}
            color={getGroupColor(key, groupBy)}
            count={refs.length}
            refIdsToWatch={refs.map((r) => r.id)}
          >
            {subGroupBy === "none"
              ? refs.map((ref) => (
                  <RelationshipRow
                    key={ref.id}
                    kind="reference"
                    reference={ref}
                    onDelete={onDelete}
                  />
                ))
              : (
                <div className="px-2 py-2 space-y-1.5 bg-warm/30">
                  {groupRefs(refs, subGroupBy).map(([subKey, subRefs]) => (
                    <RelationshipGroupedCard
                      key={`s:${key}::${subKey}`}
                      title={getGroupLabel(subKey, subGroupBy)}
                      highlight={query}
                      color={getGroupColor(subKey, subGroupBy)}
                      count={subRefs.length}
                      refIdsToWatch={subRefs.map((r) => r.id)}
                    >
                      {subRefs.map((ref) => (
                        <RelationshipRow
                          key={ref.id}
                          kind="reference"
                          reference={ref}
                          onDelete={onDelete}
                        />
                      ))}
                    </RelationshipGroupedCard>
                  ))}
                </div>
              )}
          </RelationshipGroupedCard>
        ))}
      </div>
    );
  }

  // No info row. Once the count moved to the tab strip its only remaining job
  // was hosting the collapse pair, and that has moved to the footer action bar —
  // which is mounted in every view, so the controls no longer come and go with
  // the body. What is left is the list itself, starting directly under the
  // toolbar: an empty reserved row would have been holding space for nothing.
  return (
    <div className={`flex-1 overflow-auto pb-8 relative ${scrollBgClass ?? ""}`}>
      {body}
    </div>
  );
}
