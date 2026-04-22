import { useMemo } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Link2, X, Link as LinkIcon, Quote, ChevronRight } from "lucide-react";
import { referencesAtom, overlayEntityIdAtom, activeDrawerTabAtom, scrollToHighlightAtom, activeRefIdAtom } from "../../atoms/references";
import { searchQueryAtom, activeClusterRefIdsAtom, sortOrderAtom, relationshipTypeFiltersAtom, relationshipEntityTypeFiltersAtom } from "../../atoms/filters";
import { currentPageAtom } from "../../atoms/selection";
import { getEntity, getEntityType } from "../../data/entities";
import { Reference, relationTypes, RelationType } from "../../data/references";
import { currentDocument } from "../../data/document";
import { buildMatcher } from "../../utils/searchQuery";
import { EntityPill } from "../shared/EntityPill";
import { SearchBar } from "./SearchBar";

interface GroupedTarget {
  targetEntityId: string;
  refs: Reference[];
}

interface TypeGroup {
  relationType: RelationType;
  label: string;
  targets: GroupedTarget[];
  totalRefs: number;
}

export function RelationshipsTreeView() {
  const [references] = useAtom(referencesAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [sortOrder] = useAtom(sortOrderAtom);
  const [activeClusterRefIds, setActiveClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [relTypeFilters] = useAtom(relationshipTypeFiltersAtom);
  const [entityTypeFilters] = useAtom(relationshipEntityTypeFiltersAtom);
  const setOverlayEntityId = useSetAtom(overlayEntityIdAtom);
  const setActiveDrawerTab = useSetAtom(activeDrawerTabAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const setActiveRefId = useSetAtom(activeRefIdAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);

  const filtered = useMemo(() => {
    let result = references;

    if (activeClusterRefIds) {
      const cluster = new Set(activeClusterRefIds);
      result = result.filter((r) => cluster.has(r.id));
    }

    const activeRelTypes = Object.entries(relTypeFilters).filter(([, v]) => v).map(([k]) => k);
    if (activeRelTypes.length > 0) {
      const set = new Set(activeRelTypes);
      result = result.filter((r) => set.has(r.relationType));
    }

    const activeEntityTypes = Object.entries(entityTypeFilters).filter(([, v]) => v).map(([k]) => k);
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

    return result;
  }, [references, searchQuery, activeClusterRefIds, relTypeFilters, entityTypeFilters]);

  const groups = useMemo<TypeGroup[]>(() => {
    const byType = new Map<RelationType, Map<string, Reference[]>>();
    for (const ref of filtered) {
      let byTarget = byType.get(ref.relationType);
      if (!byTarget) {
        byTarget = new Map();
        byType.set(ref.relationType, byTarget);
      }
      const list = byTarget.get(ref.targetEntityId) ?? [];
      list.push(ref);
      byTarget.set(ref.targetEntityId, list);
    }

    const dir = sortOrder === "desc" ? -1 : 1;
    const result: TypeGroup[] = [];
    for (const [relationType, byTarget] of byType.entries()) {
      const targets: GroupedTarget[] = [];
      for (const [targetEntityId, refs] of byTarget.entries()) {
        const sorted = [...refs].sort(
          (a, b) => a.sourceSelection.page - b.sourceSelection.page ||
                    a.sourceSelection.top - b.sourceSelection.top
        );
        targets.push({ targetEntityId, refs: sorted });
      }
      if (sortOrder !== "none") {
        targets.sort((a, b) => {
          const aName = getEntity(a.targetEntityId)?.title ?? "";
          const bName = getEntity(b.targetEntityId)?.title ?? "";
          return aName.localeCompare(bName) * dir;
        });
      }
      result.push({
        relationType,
        label: relationTypes.find((r) => r.id === relationType)?.label ?? relationType,
        targets,
        totalRefs: targets.reduce((sum, t) => sum + t.refs.length, 0),
      });
    }
    result.sort((a, b) => a.label.localeCompare(b.label));
    return result;
  }, [filtered, sortOrder]);

  const entityCount = new Set(filtered.map((r) => r.targetEntityId)).size;

  const jumpToReference = (ref: Reference) => {
    setActiveRefId(ref.id);
    setCurrentPage(ref.sourceSelection.page);
    setScrollToHighlight(ref.id);
    setActiveDrawerTab("references");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="pt-2" />
      <SearchBar />

      <div className="px-4 pb-3 flex items-center gap-3 text-[11px] text-ink-tertiary">
        <span>
          <span className="font-semibold text-ink-secondary tabular-nums">{filtered.length}</span>{" "}
          relationships,{" "}
          <span className="font-semibold text-ink-secondary tabular-nums">{entityCount}</span>{" "}
          entities
        </span>
        {activeClusterRefIds && (
          <button
            onClick={() => setActiveClusterRefIds(null)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-warm text-ink-tertiary hover:text-ink transition-colors"
            aria-label="Clear selection"
          >
            <span>Filtered</span>
            <X size={10} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-warm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Link2 size={36} className="text-ink-tertiary/40 mb-3" />
            <p className="text-sm text-ink-tertiary">No relationships found</p>
            <p className="text-xs text-ink-tertiary mt-1">
              References between entities appear here
            </p>
          </div>
        ) : (
          <div className="px-4 md:px-6 py-6">
            {/* Narrow: stacked — source card then groups, no rail */}
            <div className="md:hidden space-y-5">
              <SourceCard />
              <div className="space-y-5">
                {groups.map((g) => (
                  <GroupBlock
                    key={g.relationType}
                    group={g}
                    onTargetClick={setOverlayEntityId}
                    onMarkerClick={jumpToReference}
                    hideRailConnector
                  />
                ))}
              </div>
            </div>

            {/* Wide: 3-column tree with sticky source + connector rail */}
            <div className="hidden md:grid gap-0" style={{ gridTemplateColumns: "minmax(240px, 320px) 56px minmax(0, 1fr)" }}>
              <div className="col-start-1 row-start-1 sticky top-2 self-start">
                <SourceCard />
              </div>
              <div className="col-start-3 row-start-1 space-y-6 min-w-0">
                {groups.map((g) => (
                  <GroupBlock
                    key={g.relationType}
                    group={g}
                    onTargetClick={setOverlayEntityId}
                    onMarkerClick={jumpToReference}
                  />
                ))}
              </div>
              <div className="col-start-2 row-start-1 relative">
                <ConnectorRail count={groups.length} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SourceCard() {
  const type = getEntityType(currentDocument.entityTypeId);
  return (
    <div className="bg-paper border border-border rounded-md p-3 shadow-sm">
      <div className="text-[13px] font-medium text-ink leading-snug mb-2 line-clamp-3">
        {currentDocument.title}
      </div>
      <EntityPill typeId={currentDocument.entityTypeId} label={type?.name} />
    </div>
  );
}

function ConnectorRail({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 16,
          bottom: 16,
          width: 1,
          backgroundColor: "var(--border-primary)",
        }}
      />
    </div>
  );
}

interface GroupBlockProps {
  group: TypeGroup;
  onTargetClick: (entityId: string) => void;
  onMarkerClick: (ref: Reference) => void;
  hideRailConnector?: boolean;
}

function GroupBlock({ group, onTargetClick, onMarkerClick, hideRailConnector }: GroupBlockProps) {
  return (
    <div className="relative">
      {/* Group header bar — sticky to the scroll container top */}
      <div
        className="sticky top-0 z-10 px-3 py-1.5 rounded-md text-xs font-medium text-ink-secondary flex items-center gap-2"
        style={{ backgroundColor: "var(--bg-vellum, #eeeae0)" }}
      >
        {!hideRailConnector && (
          <>
            <span
              className="absolute top-1/2 -translate-y-1/2"
              style={{
                right: "100%",
                width: 28,
                height: 1,
                backgroundColor: "var(--border-primary)",
              }}
            />
            <span
              className="absolute top-1/2 -translate-y-1/2 rounded-full"
              style={{
                right: "calc(100% + 28px - 4px)",
                width: 8, height: 8,
                backgroundColor: "var(--border-primary)",
              }}
            />
          </>
        )}
        <LinkIcon size={11} className="text-ink-tertiary" />
        <span>{group.label}</span>
        <span className="ml-auto text-ink-tertiary tabular-nums">
          {group.targets.length}
          {group.targets.length !== group.totalRefs && <> · {group.totalRefs} refs</>}
        </span>
      </div>

      {/* Targets */}
      <div className="mt-2 space-y-1.5">
        {group.targets.map((t) => (
          <TargetCard
            key={t.targetEntityId}
            targetEntityId={t.targetEntityId}
            refs={t.refs}
            onTargetClick={onTargetClick}
            onMarkerClick={onMarkerClick}
          />
        ))}
      </div>
    </div>
  );
}

interface TargetCardProps {
  targetEntityId: string;
  refs: Reference[];
  onTargetClick: (entityId: string) => void;
  onMarkerClick: (ref: Reference) => void;
}

function TargetCard({ targetEntityId, refs, onTargetClick, onMarkerClick }: TargetCardProps) {
  const entity = getEntity(targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTargetClick(targetEntityId)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTargetClick(targetEntityId); } }}
      className="bg-paper border border-border rounded-md p-3 shadow-sm hover:border-border-dark transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-[13px] font-medium text-ink leading-snug flex-1 min-w-0 line-clamp-2">
          {entity?.title ?? "Unknown entity"}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onTargetClick(targetEntityId); }}
          className="shrink-0 flex items-center gap-1 px-2 py-1 border border-border rounded text-[11px] font-medium text-ink-secondary hover:bg-warm transition-colors"
          aria-label="Preview target entity"
        >
          <ChevronRight size={10} />
          View
        </button>
      </div>
      <EntityPill typeId={entity?.typeId ?? ""} label={type?.name} />

      {/* Evidence markers — one dashed chip per underlying ref */}
      {refs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {refs.map((ref) => (
            <button
              key={ref.id}
              onClick={(e) => { e.stopPropagation(); onMarkerClick(ref); }}
              title={ref.sourceSelection.text.slice(0, 120)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-dashed text-[11px] text-ink-tertiary tabular-nums hover:text-ink hover:border-border-dark transition-colors"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <Quote size={9} />
              p. {ref.sourceSelection.page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
