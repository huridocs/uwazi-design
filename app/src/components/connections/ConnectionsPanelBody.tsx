import { useMemo, type ReactNode } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { referencesAtom } from "../../atoms/references";
import {
  viewAtom,
  groupByAtom,
  searchQueryAtom,
  sortOrderAtom,
  activeClusterRefIdsAtom,
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
  expandAllSignalAtom,
  collapseAllSignalAtom,
  activeFilterCountAtom,
} from "../../atoms/filters";
import { getEntity, getEntityType } from "../../data/entities";
import { Reference, relationTypes } from "../../data/references";
import { buildMatcher } from "../../utils/searchQuery";
import { ListInfoRow } from "../shared/ListInfoRow";
import { CollapseControls } from "../references/FiltersRow";
import { RelationshipsTreeView } from "../references/RelationshipsTreeView";
import { RelationshipsGraphView } from "../references/RelationshipsGraphView";
import { ConnectionRow } from "./ConnectionRow";
import { ConnectionGroupedCard } from "./ConnectionGroupedCard";

interface Props {
  /** Optional delete handler for ref-kind rows. When omitted, the trash
   *  affordance hides (drawer-side panel is read-only, main view supplies it). */
  onDelete?: (id: string) => void;
  /** Background shade behind the scroll area. Main view uses bg-warm to match
   *  the document column; the drawer leaves it transparent. */
  scrollBgClass?: string;
}

/** Body of the merged Relationships panel — the part below the toolbar. Used
 *  by both the main `Relationships` tab and the document-tab drawer. */
export function ConnectionsPanelBody({ onDelete, scrollBgClass }: Props) {
  const [references] = useAtom(referencesAtom);
  const [view] = useAtom(viewAtom);
  const [groupBy] = useAtom(groupByAtom);
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
        const haystack = `${ref.sourceSelection.text} ${entity?.title ?? ""} ${ref.relationType}`;
        return matcher(haystack);
      });
    }
    if (sortOrder === "none") {
      return [...result].sort((a, b) => {
        const pageDiff = a.sourceSelection.page - b.sourceSelection.page;
        if (pageDiff !== 0) return pageDiff;
        return a.sourceSelection.top - b.sourceSelection.top;
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

  const groupedByEntityType = useMemo(() => {
    const groups = new Map<string, Reference[]>();
    filtered.forEach((ref) => {
      const entity = getEntity(ref.targetEntityId);
      const typeId = entity?.typeId ?? "unknown";
      const list = groups.get(typeId) ?? [];
      list.push(ref);
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
    const groups = new Map<string, Reference[]>();
    filtered.forEach((ref) => {
      const list = groups.get(ref.relationType) ?? [];
      list.push(ref);
      groups.set(ref.relationType, list);
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

  const entityCount = new Set(filtered.map((r) => r.targetEntityId)).size;
  const showCollapse = view === "list" && groupBy !== "none";

  // Tree + graph manage their own info row + filter pipeline (they group by
  // relation type → target → refs internally and add the direction split).
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

  const body: ReactNode =
    filtered.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Link2 size={36} className="text-ink-tertiary/40 mb-3" />
        <p className="text-sm text-ink-tertiary">No relationships found</p>
        <p className="text-xs text-ink-tertiary mt-1">
          Select text in the document to create one
        </p>
      </div>
    ) : groupBy === "none" ? (
      <div className="px-3 py-3">
        <div className="border border-border/60 rounded-md overflow-hidden bg-paper">
          {filtered.map((ref) => (
            <ConnectionRow
              key={ref.id}
              kind="reference"
              reference={ref}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    ) : groupBy === "entity-type" ? (
      <div className="px-3 py-3 space-y-1.5">
        {Array.from(groupedByEntityType.entries()).map(([typeId, refs]) => {
          const type = getEntityType(typeId);
          return (
            <ConnectionGroupedCard
              key={typeId}
              title={type?.name ?? typeId}
              color={type?.color}
              count={refs.length}
              refIdsToWatch={refs.map((r) => r.id)}
            >
              {refs.map((ref) => (
                <ConnectionRow
                  key={ref.id}
                  kind="reference"
                  reference={ref}
                  onDelete={onDelete}
                />
              ))}
            </ConnectionGroupedCard>
          );
        })}
      </div>
    ) : (
      <div className="px-3 py-3 space-y-1.5">
        {Array.from(groupedByRelType.entries()).map(([relType, refs]) => {
          const label =
            relationTypes.find((r) => r.id === relType)?.label ?? relType;
          return (
            <ConnectionGroupedCard
              key={relType}
              title={label}
              count={refs.length}
              refIdsToWatch={refs.map((r) => r.id)}
            >
              {refs.map((ref) => (
                <ConnectionRow
                  key={ref.id}
                  kind="reference"
                  reference={ref}
                  onDelete={onDelete}
                />
              ))}
            </ConnectionGroupedCard>
          );
        })}
      </div>
    );

  return (
    <>
      <ListInfoRow
        count={
          <>
            <span className="font-semibold text-ink-secondary tabular-nums">
              {filtered.length}
            </span>{" "}
            relationships,{" "}
            <span className="font-semibold text-ink-secondary tabular-nums">
              {entityCount}
            </span>{" "}
            entities
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
