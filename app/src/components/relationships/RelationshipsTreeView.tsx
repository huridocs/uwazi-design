import { useEffect, useMemo, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import {
  scopedReferencesAtom,
  overlayEntityIdAtom,
  activeRefIdAtom,
  expandGroupForRefAtom,
} from "../../atoms/references";
import {
  searchQueryAtom,
  activeClusterRefIdsAtom,
  sortOrderAtom,
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
  activeFilterCountAtom,
  groupByAtom,
  subGroupByAtom,
} from "../../atoms/filters";
import { getEntity } from "../../data/entities";
import { Reference } from "../../data/references";
import { buildMatcher } from "../../utils/searchQuery";
import { Hub, Relationship, deriveHubs, deriveRelationships } from "../../utils/relationships";
import {
  getGroupColor,
  getGroupLabel,
  groupRefs,
} from "../../utils/connectionGrouping";
import { ListInfoRow } from "../shared/ListInfoRow";
import { RelationshipRow } from "./RelationshipRow";
import { TreeBranch, TreeNode } from "./TreeBranch";
import { CollapseControls } from "./FiltersRow";
import {
  expandAllSignalAtom,
  collapseAllSignalAtom,
} from "../../atoms/filters";

/** Tree view of the merged Relationships panel. Same grouping pipeline as the
 *  list view, but the leaves are aggregate `RelationshipRow kind="aggregate"`
 *  cards with inline-expand into their underlying refs. */
export function RelationshipsTreeView() {
  const [references] = useAtom(scopedReferencesAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [sortOrder] = useAtom(sortOrderAtom);
  const [activeClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [relTypeFilters] = useAtom(relTypeFiltersAtom);
  const [entityTypeFilters] = useAtom(entityTypeFiltersAtom);
  const [activeFilterCount] = useAtom(activeFilterCountAtom);
  const [groupBy] = useAtom(groupByAtom);
  const [subGroupBy] = useAtom(subGroupByAtom);
  const [, setOverlayEntityId] = useAtom(overlayEntityIdAtom);
  const [, setActiveRefId] = useAtom(activeRefIdAtom);
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
      // Raw seed order — no sort applied.
      return result;
    }
    if (sortOrder === "appearance") {
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

  const entityCount = new Set(filtered.map((r) => r.targetEntityId)).size;
  const aggregateCount = useMemo(
    () => deriveRelationships(filtered).length + deriveHubs(filtered).length,
    [filtered],
  );

  useEffect(() => {
    setActiveRefId(null);
    setOverlayEntityId(null);
  }, [relTypeFilters, entityTypeFilters, setActiveRefId, setOverlayEntityId]);

  const showCollapse = groupBy !== "none";

  return (
    <div className="flex flex-col flex-1 min-h-0">
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

      <div className="flex-1 overflow-auto bg-warm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Link2 size={36} className="text-ink-tertiary/40 mb-3" />
            <p className="text-sm text-ink-tertiary">No relationships found</p>
            <p className="text-xs text-ink-tertiary mt-1">
              References between entities appear here
            </p>
          </div>
        ) : groupBy === "none" ? (
          <div className="px-3 py-3">
            {renderAggregates(filtered)}
          </div>
        ) : (
          <div className="px-3 py-3">
            {groupRefs(filtered, groupBy).map(([key, refs]) => (
              <TreeBranch
                key={`p:${key}`}
                title={getGroupLabel(key, groupBy)}
                color={getGroupColor(key, groupBy)}
                count={deriveRelationships(refs).length + deriveHubs(refs).length}
                refIdsToWatch={refs.map((r) => r.id)}
                defaultExpanded
              >
                {subGroupBy === "none"
                  ? renderAggregates(refs, {
                      hidePill: groupBy === "target-entity",
                      hideRelLabel: groupBy === "relation-type",
                      hideTypePill: groupBy === "target-template",
                    })
                  : groupRefs(refs, subGroupBy).map(([subKey, subRefs]) => (
                      <TreeBranch
                        key={`s:${key}::${subKey}`}
                        title={getGroupLabel(subKey, subGroupBy)}
                        color={getGroupColor(subKey, subGroupBy)}
                        count={deriveRelationships(subRefs).length + deriveHubs(subRefs).length}
                        refIdsToWatch={subRefs.map((r) => r.id)}
                        defaultExpanded
                      >
                        {renderAggregates(subRefs, {
                          hidePill:
                            subGroupBy === "target-entity" ||
                            groupBy === "target-entity",
                          hideRelLabel:
                            subGroupBy === "relation-type" ||
                            groupBy === "relation-type",
                          hideTypePill:
                            subGroupBy === "target-template" ||
                            groupBy === "target-template",
                        })}
                      </TreeBranch>
                    ))}
              </TreeBranch>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Render a bucket of refs as a flat list of tree-nodes: hubs first (multi-
 *  party relationships read as a peer of aggregates), then aggregates. Each
 *  child wraps in its own connector slot via TreeNode upstream.
 *
 *  `hidePill` is forwarded to the aggregate row when the enclosing group is
 *  keyed on the target entity — the pill would just repeat the group title.
 *  Hubs never carry a single target entity, so hidePill doesn't apply. */
/** Max aggregate nodes mounted per group before a "switch to List" note. */
const TREE_CAP = 80;

function renderAggregates(
  refs: Reference[],
  opts: {
    hidePill?: boolean;
    hideRelLabel?: boolean;
    hideTypePill?: boolean;
  } = {},
) {
  const hubs = deriveHubs(refs);
  const allRels = deriveRelationships(refs);
  // A node carries its backing refs, which we resolve by id. Cap the rendered
  // aggregates (top by evidence) so a País with hundreds of connections neither
  // mounts hundreds of rows nor pays the O(n²) ref-matching.
  const cap = Math.max(0, TREE_CAP - hubs.length);
  const rels =
    allRels.length > cap
      ? [...allRels].sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, cap)
      : allRels;
  const hidden = allRels.length - rels.length;
  // Resolve backing refs via a single id→ref index instead of a per-node scan.
  const byId = new Map(refs.map((r) => [r.id, r]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((r): r is Reference => !!r);
  return [
    ...hubs.map((hub) => (
      <HubNode key={`hub:${hub.id}`} hub={hub} refs={pick(hub.refIds)} hideRelLabel={opts.hideRelLabel} />
    )),
    ...rels.map((rel) => (
      <AggregateNode
        key={rel.id}
        rel={rel}
        refs={pick(rel.refIds)}
        hidePill={opts.hidePill}
        hideRelLabel={opts.hideRelLabel}
        hideTypePill={opts.hideTypePill}
      />
    )),
    ...(hidden > 0
      ? [
          <div key="more" className="px-3 py-2 text-xs text-ink-tertiary bg-warm/40 text-center">
            + {hidden.toLocaleString()} more — switch to List view to see all
          </div>,
        ]
      : []),
  ];
}

function HubNode({
  hub,
  refs,
  hideRelLabel,
}: {
  hub: Hub;
  refs: Reference[];
  hideRelLabel?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expandForRef, setExpandForRef] = useAtom(expandGroupForRefAtom);

  useEffect(() => {
    if (!expandForRef) return;
    if (hub.refIds.includes(expandForRef)) {
      if (!expanded) setExpanded(true);
      setExpandForRef(null);
    }
  }, [expandForRef]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <RelationshipRow
        kind="hub"
        hub={hub}
        expanded={expanded}
        onToggleExpand={() => setExpanded((e) => !e)}
        hideRelLabel={hideRelLabel}
      />
      {expanded && (
        <div className="ml-[14px]">
          {refs
            .filter((ref) => !!ref.sourceSelection)
            .map((ref) => (
              <TreeNode key={ref.id}>
                <RelationshipRow kind="reference" reference={ref} nested />
              </TreeNode>
            ))}
        </div>
      )}
    </div>
  );
}

function AggregateNode({
  rel,
  refs,
  hidePill,
  hideRelLabel,
  hideTypePill,
}: {
  rel: Relationship;
  refs: Reference[];
  hidePill?: boolean;
  hideRelLabel?: boolean;
  hideTypePill?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expandForRef, setExpandForRef] = useAtom(expandGroupForRefAtom);

  // Minimap dot click sets expandGroupForRef to the ref id. The chain of
  // TreeBranches above us auto-expand; we (the leaf containing the actual
  // ref) auto-expand too, then clear the signal.
  useEffect(() => {
    if (!expandForRef) return;
    if (rel.refIds.includes(expandForRef)) {
      if (!expanded) setExpanded(true);
      setExpandForRef(null);
    }
  }, [expandForRef]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <RelationshipRow
        kind="aggregate"
        rel={rel}
        expanded={expanded}
        onToggleExpand={() => setExpanded((e) => !e)}
        hidePill={hidePill}
        hideRelLabel={hideRelLabel}
        hideTypePill={hideTypePill}
      />
      {expanded && (
        <div className="ml-[14px]">
          {refs
            .filter((ref) => !!ref.sourceSelection)
            .map((ref) => (
              <TreeNode key={ref.id}>
                <RelationshipRow kind="reference" reference={ref} nested />
              </TreeNode>
            ))}
        </div>
      )}
    </div>
  );
}

