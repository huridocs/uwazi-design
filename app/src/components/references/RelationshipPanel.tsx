import { useMemo } from "react";
import { useAtom } from "jotai";
import { Link2, X } from "lucide-react";
import { referencesAtom } from "../../atoms/references";
import {
  viewModeAtom,
  searchQueryAtom,
  sortOrderAtom,
  expandAllSignalAtom,
  collapseAllSignalAtom,
  activeClusterRefIdsAtom,
} from "../../atoms/filters";
import { getEntity, getEntityType } from "../../data/entities";
import { relationTypes } from "../../data/references";
import { deriveRelationships, Relationship } from "../../utils/relationships";
import { buildMatcher } from "../../utils/searchQuery";
import { SearchBar } from "./SearchBar";
import { FiltersRow } from "./FiltersRow";
import { RelationshipRow } from "./RelationshipRow";
import { RelationshipGroupedCard } from "./RelationshipGroupedCard";

export function RelationshipPanel() {
  const [references] = useAtom(referencesAtom);
  const [viewMode] = useAtom(viewModeAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [sortOrder] = useAtom(sortOrderAtom);
  const [activeClusterRefIds, setActiveClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [, setExpandSignal] = useAtom(expandAllSignalAtom);
  const [, setCollapseSignal] = useAtom(collapseAllSignalAtom);

  const allRelationships = useMemo(() => deriveRelationships(references), [references]);

  const filtered = useMemo(() => {
    let result = allRelationships;

    if (activeClusterRefIds) {
      const cluster = new Set(activeClusterRefIds);
      result = result.filter((rel) => rel.refIds.some((id) => cluster.has(id)));
    }

    const matcher = buildMatcher(searchQuery);
    if (matcher) {
      result = result.filter((rel) => {
        const entity = getEntity(rel.targetEntityId);
        const haystack = `${entity?.title ?? ""} ${rel.relationType}`;
        return matcher(haystack);
      });
    }

    if (sortOrder === "none") {
      return [...result].sort((a, b) => {
        if (a.firstPage !== b.firstPage) return a.firstPage - b.firstPage;
        const aName = getEntity(a.targetEntityId)?.title ?? "";
        const bName = getEntity(b.targetEntityId)?.title ?? "";
        return aName.localeCompare(bName);
      });
    }
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      const aName = getEntity(a.targetEntityId)?.title ?? "";
      const bName = getEntity(b.targetEntityId)?.title ?? "";
      return aName.localeCompare(bName) * dir;
    });
  }, [allRelationships, searchQuery, sortOrder, activeClusterRefIds]);

  const groupedByEntityType = useMemo(() => {
    const groups = new Map<string, Relationship[]>();
    filtered.forEach((rel) => {
      const entity = getEntity(rel.targetEntityId);
      const typeId = entity?.typeId ?? "unknown";
      const list = groups.get(typeId) ?? [];
      list.push(rel);
      groups.set(typeId, list);
    });
    if (sortOrder === "none") return groups;
    const dir = sortOrder === "asc" ? 1 : -1;
    return new Map(
      [...groups.entries()].sort(([a], [b]) => {
        const nameA = getEntityType(a)?.name ?? a;
        const nameB = getEntityType(b)?.name ?? b;
        return nameA.localeCompare(nameB) * dir;
      }),
    );
  }, [filtered, sortOrder]);

  const groupedByRelType = useMemo(() => {
    const groups = new Map<string, Relationship[]>();
    filtered.forEach((rel) => {
      const list = groups.get(rel.relationType) ?? [];
      list.push(rel);
      groups.set(rel.relationType, list);
    });
    if (sortOrder === "none") return groups;
    const dir = sortOrder === "asc" ? 1 : -1;
    return new Map(
      [...groups.entries()].sort(([a], [b]) => {
        const labelA = relationTypes.find((r) => r.id === a)?.label ?? a;
        const labelB = relationTypes.find((r) => r.id === b)?.label ?? b;
        return labelA.localeCompare(labelB) * dir;
      }),
    );
  }, [filtered, sortOrder]);

  const hasFilter = activeClusterRefIds !== null;

  return (
    <>
      <SearchBar />
      <FiltersRow
        modes={["all", "by-entity-type", "by-relation-type"]}
        onExpandAll={() => setExpandSignal((s) => s + 1)}
        onCollapseAll={() => setCollapseSignal((s) => s + 1)}
      />

      {hasFilter && (
        <div className="px-3 pt-2 pb-1 shrink-0">
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-warm">
            <div className="flex items-center gap-1.5 min-w-0 text-[11px]">
              <span className="font-semibold text-ink-secondary tabular-nums shrink-0">
                From selection
              </span>
              <span className="text-ink-tertiary tabular-nums">
                · Showing {filtered.length} of {allRelationships.length}
              </span>
            </div>
            <button
              onClick={() => setActiveClusterRefIds(null)}
              aria-label="Clear selection"
              className="shrink-0 flex items-center justify-center rounded-sm text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
              style={{ width: 16, height: 16 }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Link2 size={32} className="text-ink-muted/40 mb-3" />
            <p className="text-sm text-ink-muted">No relationships yet</p>
            <p className="text-xs text-ink-muted mt-1">
              References between entities will appear here
            </p>
          </div>
        ) : viewMode === "all" || viewMode === "density" ? (
          <div className="px-3 space-y-1.5">
            <div className="border border-border/60 rounded-md overflow-hidden bg-paper">
              {filtered.map((rel) => (
                <RelationshipRow key={rel.id} relationship={rel} />
              ))}
            </div>
          </div>
        ) : viewMode === "by-entity-type" ? (
          <div className="px-3 space-y-1.5">
            {Array.from(groupedByEntityType.entries()).map(([typeId, rels]) => {
              const type = getEntityType(typeId);
              return (
                <RelationshipGroupedCard
                  key={typeId}
                  title={type?.name ?? typeId}
                  color={type?.color}
                  relationships={rels}
                />
              );
            })}
          </div>
        ) : viewMode === "by-relation-type" ? (
          <div className="px-3 space-y-1.5">
            {Array.from(groupedByRelType.entries()).map(([relType, rels]) => {
              const label =
                relationTypes.find((r) => r.id === relType)?.label ?? relType;
              return (
                <RelationshipGroupedCard
                  key={relType}
                  title={label}
                  relationships={rels}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}
