import { useMemo, useState, useLayoutEffect, useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Link2, Link as LinkIcon } from "lucide-react";
import {
  referencesAtom,
  overlayEntityIdAtom,
  activeDrawerTabAtom,
  scrollToHighlightAtom,
  activeRefIdAtom,
} from "../../atoms/references";
import {
  searchQueryAtom,
  activeClusterRefIdsAtom,
  sortOrderAtom,
  relationshipTypeFiltersAtom,
  relationshipEntityTypeFiltersAtom,
  relationshipsZoomAtom,
  relationshipsActiveFilterCountAtom,
  type RelationshipsZoom,
} from "../../atoms/filters";
import { currentPageAtom } from "../../atoms/selection";
import { getEntity, getEntityType } from "../../data/entities";
import { Reference, relationTypes, RelationType } from "../../data/references";
import { buildMatcher } from "../../utils/searchQuery";
import { EntityPill } from "../shared/EntityPill";
import { FadeTruncate } from "../shared/FadeTruncate";
import { ActiveFilterChips } from "./ActiveFilterChips";

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
  const [activeClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [relTypeFilters] = useAtom(relationshipTypeFiltersAtom);
  const [entityTypeFilters] = useAtom(relationshipEntityTypeFiltersAtom);
  const [zoom] = useAtom(relationshipsZoomAtom);
  const [activeFilterCount] = useAtom(relationshipsActiveFilterCountAtom);
  const [overlayEntityId, setOverlayEntityId] = useAtom(overlayEntityIdAtom);
  const setActiveDrawerTab = useSetAtom(activeDrawerTabAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const [activeRefId, setActiveRefId] = useAtom(activeRefIdAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);

  const filtered = useMemo(() => {
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
          (a, b) =>
            a.sourceSelection.page - b.sourceSelection.page ||
            a.sourceSelection.top - b.sourceSelection.top,
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
    if (activeRefId === ref.id) {
      setActiveRefId(null);
      return;
    }
    setActiveRefId(ref.id);
    setCurrentPage(ref.sourceSelection.page);
    setScrollToHighlight(ref.id);
    setActiveDrawerTab("references");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="px-3 pt-3 pb-2 flex items-center gap-2 flex-wrap text-[11px] text-ink-tertiary shrink-0"
      >
        <span className="shrink-0">
          <span className="font-semibold text-ink-secondary tabular-nums">
            {filtered.length}
          </span>{" "}
          relationships,{" "}
          <span className="font-semibold text-ink-secondary tabular-nums">
            {entityCount}
          </span>{" "}
          entities
        </span>
        {activeFilterCount > 0 && (
          <>
            <span className="shrink-0 font-medium text-ink-secondary">Filters:</span>
            <ActiveFilterChips />
          </>
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
          <div
            className={`py-4 ${
              zoom === "detail" ? "space-y-5" : zoom === "compact" ? "space-y-3" : "space-y-2.5"
            }`}
          >
            {groups.map((g) => (
              <GroupBlock
                key={g.relationType}
                group={g}
                zoom={zoom}
                selectedEntityId={overlayEntityId}
                selectedRefId={activeRefId}
                onTargetClick={setOverlayEntityId}
                onMarkerClick={jumpToReference}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface GroupBlockProps {
  group: TypeGroup;
  zoom: RelationshipsZoom;
  selectedEntityId: string | null;
  selectedRefId: string | null;
  onTargetClick: (entityId: string) => void;
  onMarkerClick: (ref: Reference) => void;
}

function GroupBlock({
  group,
  zoom,
  selectedEntityId,
  selectedRefId,
  onTargetClick,
  onMarkerClick,
}: GroupBlockProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const headerPadY = zoom === "detail" ? "py-1.5" : "py-1";
  const headerText = zoom === "overview" ? "text-[11px]" : "text-xs";
  return (
    <div>
      <div
        className={`sticky top-0 z-10 mx-3 px-3 ${headerPadY} rounded-md ${headerText} font-medium text-ink-secondary flex items-center gap-2`}
        style={{
          backgroundColor: "var(--bg-vellum, #eeeae0)",
        }}
      >
        <LinkIcon size={11} className="text-ink-tertiary" />
        <span className="truncate">{group.label}</span>
        <span className="ml-auto text-ink-tertiary tabular-nums shrink-0">
          {group.targets.length}
          {group.targets.length !== group.totalRefs && <> · {group.totalRefs}</>}
        </span>
      </div>

      {zoom === "overview" ? (
        <div className="relative mt-1.5 mx-3">
          <div className="flex flex-wrap gap-1.5">
            {group.targets.map((t) => (
              <TargetCardOverview
                key={t.targetEntityId}
                targetEntityId={t.targetEntityId}
                refs={t.refs}
                selected={selectedEntityId === t.targetEntityId}
                hovered={hoveredId === t.targetEntityId}
                onHover={(entering) =>
                  setHoveredId(entering ? t.targetEntityId : null)
                }
                onTargetClick={onTargetClick}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2 mx-3 border border-border/60 rounded-md overflow-hidden bg-paper">
          {group.targets.map((t) =>
            zoom === "compact" ? (
              <TargetCardCompact
                key={t.targetEntityId}
                targetEntityId={t.targetEntityId}
                refs={t.refs}
                selected={
                  selectedEntityId === t.targetEntityId ||
                  (selectedRefId !== null &&
                    t.refs.some((r) => r.id === selectedRefId))
                }
                onTargetClick={onTargetClick}
              />
            ) : (
              <TargetCardDetail
                key={t.targetEntityId}
                targetEntityId={t.targetEntityId}
                refs={t.refs}
                selected={
                  selectedEntityId === t.targetEntityId ||
                  (selectedRefId !== null &&
                    t.refs.some((r) => r.id === selectedRefId))
                }
                selectedRefId={selectedRefId}
                onTargetClick={onTargetClick}
                onMarkerClick={onMarkerClick}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

interface TargetProps {
  targetEntityId: string;
  refs: Reference[];
  selected: boolean;
  onTargetClick: (entityId: string) => void;
}

interface TargetDetailProps extends TargetProps {
  selectedRefId: string | null;
  onMarkerClick: (ref: Reference) => void;
}

function TargetCardDetail({
  targetEntityId,
  refs,
  selected,
  selectedRefId,
  onTargetClick,
  onMarkerClick,
}: TargetDetailProps) {
  const entity = getEntity(targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const firstRef = refs[0];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onTargetClick(targetEntityId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTargetClick(targetEntityId);
        }
      }}
      className={`px-3 py-2.5 border-b border-border/50 last:border-b-0 cursor-pointer transition-colors ${
        selected ? "bg-parchment" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        {refs.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1 shrink-0">
            {refs.map((ref) => {
              const active = selectedRefId === ref.id;
              return (
                <span
                  key={ref.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkerClick(ref);
                  }}
                  aria-pressed={active}
                  title={ref.sourceSelection.text.slice(0, 120)}
                  className={`inline-flex items-center px-1.5 py-0.5 text-xs font-mono rounded tabular-nums transition-colors cursor-pointer ${
                    active
                      ? "bg-ink text-paper"
                      : "bg-vellum text-ink-secondary hover:bg-border hover:text-ink"
                  }`}
                >
                  p.{ref.sourceSelection.page}
                </span>
              );
            })}
          </div>
        )}
      </div>
      {firstRef && (
        <FadeTruncate
          text={firstRef.sourceSelection.text}
          maxLines={2}
          className="text-xs text-ink-secondary leading-relaxed"
          fadeTo={selected ? "var(--bg-primary)" : undefined}
        />
      )}
      <div className="flex items-center justify-between mt-1 text-[10px] text-ink-tertiary">
        <span>{type?.name ?? ""}</span>
        <span className="tabular-nums">
          {refs.length === 1 ? "1 mention" : `${refs.length} mentions`}
        </span>
      </div>
    </div>
  );
}

function TargetCardCompact({
  targetEntityId,
  refs,
  selected,
  onTargetClick,
}: TargetProps) {
  const entity = getEntity(targetEntityId);

  return (
    <button
      onClick={() => onTargetClick(targetEntityId)}
      aria-pressed={selected}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50 last:border-b-0 transition-colors cursor-pointer text-left ${
        selected ? "bg-parchment" : ""
      }`}
      aria-label={`Open ${entity?.title ?? "entity"}`}
    >
      <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
      <span className="shrink-0 text-[11px] text-ink-tertiary tabular-nums">
        {refs.length}
      </span>
    </button>
  );
}

interface TargetOverviewProps extends TargetProps {
  hovered: boolean;
  onHover: (entering: boolean) => void;
}

function TargetCardOverview({
  targetEntityId,
  refs,
  selected,
  hovered,
  onHover,
  onTargetClick,
}: TargetOverviewProps) {
  const entity = getEntity(targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [shiftX, setShiftX] = useState(0);

  useLayoutEffect(() => {
    if (!hovered) {
      setShiftX(0);
      return;
    }
    const el = tooltipRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let shift = 0;
    if (rect.left < margin) shift = margin - rect.left;
    else if (rect.right > window.innerWidth - margin)
      shift = window.innerWidth - margin - rect.right;
    setShiftX(shift);
  }, [hovered]);

  return (
    <span className="relative inline-flex">
      <button
        onClick={() => onTargetClick(targetEntityId)}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
        aria-pressed={selected}
        aria-label={`${entity?.title ?? "Unknown"} with ${refs.length} evidence items`}
        className={`shrink-0 rounded-full transition-shadow cursor-pointer ${
          selected ? "ring-2 ring-ink/30" : "hover:ring-2 hover:ring-ink/20"
        }`}
        style={{
          backgroundColor: type?.color ?? "var(--border-primary)",
          width: 10,
          height: 10,
        }}
      />
      {hovered && (
        <span
          ref={tooltipRef}
          role="tooltip"
          className="absolute z-20 bottom-full left-1/2 mb-1.5 px-2 py-1 rounded whitespace-nowrap text-[11px] shadow-md pointer-events-none"
          style={{
            backgroundColor: "var(--ink, #1c1712)",
            color: "var(--paper, #fff)",
            transform: `translateX(calc(-50% + ${shiftX}px))`,
          }}
        >
          <span className="font-medium">{entity?.title ?? "Unknown"}</span>
          <span className="opacity-70 ml-1.5">
            {type?.name ?? "Unknown"} · {refs.length}
          </span>
        </span>
      )}
    </span>
  );
}
