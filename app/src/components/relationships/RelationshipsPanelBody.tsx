import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { scopedReferencesAtom } from "../../atoms/references";
import {
  viewAtom,
  groupByAtom,
  subGroupByAtom,
  searchQueryAtom,
  sortOrderAtom,
  activeClusterRefIdsAtom,
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
  expandAllSignalAtom,
  collapseAllSignalAtom,
  activeFilterCountAtom,
} from "../../atoms/filters";
import { getEntity } from "../../data/entities";
import { Reference } from "../../data/references";
import { buildMatcher } from "../../utils/searchQuery";
import { deriveHubs, deriveRelationships } from "../../utils/relationships";
import {
  getGroupColor,
  getGroupLabel,
  groupRefs,
} from "../../utils/connectionGrouping";
import { ListInfoRow } from "../shared/ListInfoRow";
import { CollapseControls } from "./FiltersRow";
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
  const [references] = useAtom(scopedReferencesAtom);
  const [view] = useAtom(viewAtom);
  const [groupBy] = useAtom(groupByAtom);
  const [subGroupBy] = useAtom(subGroupByAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [sortOrder] = useAtom(sortOrderAtom);
  const [activeClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [relTypeFilters] = useAtom(relTypeFiltersAtom);
  const [entityTypeFilters] = useAtom(entityTypeFiltersAtom);
  const [activeFilterCount] = useAtom(activeFilterCountAtom);
  const setExpandSignal = useSetAtom(expandAllSignalAtom);
  const setCollapseSignal = useSetAtom(collapseAllSignalAtom);

  const filtered = useMemo<Reference[]>(() => {
    let result = references;
    if (activeClusterRefIds) {
      const cluster = new Set(activeClusterRefIds);
      result = result.filter((r) => cluster.has(r.id));
    }
    const activeRelTypes = Object.entries(relTypeFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeRelTypes.length > 0) {
      const set = new Set(activeRelTypes);
      result = result.filter((r) => set.has(r.relationType));
    }
    const activeEntityTypes = Object.entries(entityTypeFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeEntityTypes.length > 0) {
      const set = new Set(activeEntityTypes);
      result = result.filter((r) => {
        const entity = getEntity(r.targetEntityId);
        return entity ? set.has(entity.typeId) : false;
      });
    }
    const matcher = buildMatcher(searchQuery);
    if (matcher) {
      result = result.filter((ref) => {
        const entity = getEntity(ref.targetEntityId);
        const haystack = `${ref.sourceSelection?.text ?? ""} ${entity?.title ?? ""} ${ref.relationType}`;
        return matcher(haystack);
      });
    }
    if (sortOrder === "none") {
      // Raw seed/insertion order — no sort applied. Lets the user see refs
      // exactly as the data layer hands them over.
      return result;
    }
    if (sortOrder === "appearance") {
      // Entity-level refs (no sourceSelection) sort to the top: they're not
      // tied to a passage, so they read as "header" relationships about the
      // entity overall. Anchored refs follow in page-then-top order.
      return [...result].sort((a, b) => {
        const pageA = a.sourceSelection?.page ?? -1;
        const pageB = b.sourceSelection?.page ?? -1;
        if (pageA !== pageB) return pageA - pageB;
        const topA = a.sourceSelection?.top ?? 0;
        const topB = b.sourceSelection?.top ?? 0;
        return topA - topB;
      });
    }
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      const nameA = getEntity(a.targetEntityId)?.title ?? "";
      const nameB = getEntity(b.targetEntityId)?.title ?? "";
      return nameA.localeCompare(nameB) * dir;
    });
  }, [
    references,
    searchQuery,
    sortOrder,
    activeClusterRefIds,
    relTypeFilters,
    entityTypeFilters,
  ]);

  // Well-connected entities (e.g. a País) can have thousands of references —
  // cap the flat list render and reveal more on demand so it never paints them all.
  const [listLimit, setListLimit] = useState(LIST_CAP);
  useEffect(() => setListLimit(LIST_CAP), [filtered]);

  const entityCount = new Set(filtered.map((r) => r.targetEntityId)).size;
  const aggregateCount = useMemo(
    () => deriveRelationships(filtered).length + deriveHubs(filtered).length,
    [filtered],
  );
  const showCollapse = view === "list" && groupBy !== "none";

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

  return (
    <>
      <ListInfoRow
        count={
          <>
            <span className="font-semibold text-ink-secondary tabular-nums">
              {aggregateCount}
            </span>{" "}
            relationships,{" "}
            <span className="font-semibold text-ink-secondary tabular-nums">
              {entityCount}
            </span>{" "}
            entities,{" "}
            <span className="font-semibold text-ink-secondary tabular-nums">
              {filtered.length}
            </span>{" "}
            references
          </>
        }
        activeFilterCount={activeFilterCount}
        showFilterChips={false}
        rightSlot={
          <CollapseControls
            disabled={!showCollapse}
            onExpandAll={() => setExpandSignal((s) => s + 1)}
            onCollapseAll={() => setCollapseSignal((s) => s + 1)}
          />
        }
      />
      <div className={`flex-1 overflow-auto pb-8 relative ${scrollBgClass ?? ""}`}>
        {body}
      </div>
    </>
  );
}
