import { useMemo, useState, useLayoutEffect, useRef, useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Link2,
  Link as LinkIcon,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  FileText,
} from "lucide-react";
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
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
  zoomAtom,
  activeFilterCountAtom,
  expandAllSignalAtom,
  collapseAllSignalAtom,
  expandedGroupCountAtom,
  totalGroupCountAtom,
  type Zoom,
} from "../../atoms/filters";
import { currentPageAtom } from "../../atoms/selection";
import { getEntity, getEntityType } from "../../data/entities";
import {
  Direction,
  Reference,
  relationTypes,
  RelationType,
} from "../../data/references";
import { buildMatcher } from "../../utils/searchQuery";
import { EntityPill } from "../shared/EntityPill";
import { FadeTruncate } from "../shared/FadeTruncate";
import { ListInfoRow } from "../shared/ListInfoRow";
import { ListCardRow } from "../shared/ListCardRow";
import { CollapseControls } from "./FiltersRow";

interface GroupedTarget {
  targetEntityId: string;
  direction: Direction;
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
  const [relTypeFilters] = useAtom(relTypeFiltersAtom);
  const [entityTypeFilters] = useAtom(entityTypeFiltersAtom);
  const [zoom] = useAtom(zoomAtom);
  const [activeFilterCount] = useAtom(activeFilterCountAtom);
  const [overlayEntityId, setOverlayEntityId] = useAtom(overlayEntityIdAtom);
  const setActiveDrawerTab = useSetAtom(activeDrawerTabAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const [activeRefId, setActiveRefId] = useAtom(activeRefIdAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const expandSignal = useAtomValue(expandAllSignalAtom);
  const collapseSignal = useAtomValue(collapseAllSignalAtom);
  const setExpandedGroupCount = useSetAtom(expandedGroupCountAtom);
  const setTotalGroupCount = useSetAtom(totalGroupCountAtom);
  const [collapsed, setCollapsed] = useState<Set<RelationType>>(new Set());

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
    // Group key includes direction so an outgoing + incoming pair to the same
    // target appears as two distinct target cards (matches deriveRelationships).
    const byType = new Map<RelationType, Map<string, Reference[]>>();
    for (const ref of filtered) {
      let byTargetDir = byType.get(ref.relationType);
      if (!byTargetDir) {
        byTargetDir = new Map();
        byType.set(ref.relationType, byTargetDir);
      }
      const direction: Direction = ref.direction ?? "outgoing";
      const key = `${ref.targetEntityId}::${direction}`;
      const list = byTargetDir.get(key) ?? [];
      list.push(ref);
      byTargetDir.set(key, list);
    }

    const dir = sortOrder === "desc" ? -1 : 1;
    const result: TypeGroup[] = [];
    for (const [relationType, byTargetDir] of byType.entries()) {
      const targets: GroupedTarget[] = [];
      for (const [key, refs] of byTargetDir.entries()) {
        const [targetEntityId, directionRaw] = key.split("::");
        const direction = (directionRaw as Direction) ?? "outgoing";
        const sorted = [...refs].sort(
          (a, b) =>
            a.sourceSelection.page - b.sourceSelection.page ||
            a.sourceSelection.top - b.sourceSelection.top,
        );
        targets.push({ targetEntityId, direction, refs: sorted });
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

  useEffect(() => {
    setTotalGroupCount(groups.length);
    setExpandedGroupCount(groups.length - collapsed.size);
  }, [groups.length, collapsed, setTotalGroupCount, setExpandedGroupCount]);

  useEffect(() => {
    if (expandSignal > 0) setCollapsed(new Set());
  }, [expandSignal]);

  useEffect(() => {
    setActiveRefId(null);
    setOverlayEntityId(null);
  }, [relTypeFilters, entityTypeFilters, setActiveRefId, setOverlayEntityId]);

  useEffect(() => {
    if (collapseSignal > 0) setCollapsed(new Set(groups.map((g) => g.relationType)));
  }, [collapseSignal, groups]);

  const toggleGroup = (relationType: RelationType) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(relationType)) next.delete(relationType);
      else next.add(relationType);
      return next;
    });
  };

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
            onCollapseAll={() =>
              setCollapsed(new Set(groups.map((g) => g.relationType)))
            }
            onExpandAll={() => setCollapsed(new Set())}
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
        ) : (
          <div className="py-3 space-y-2">
            {groups.map((g) => (
              <GroupBlock
                key={g.relationType}
                group={g}
                zoom={zoom}
                isCollapsed={collapsed.has(g.relationType)}
                onToggle={() => toggleGroup(g.relationType)}
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
  zoom: Zoom;
  isCollapsed: boolean;
  onToggle: () => void;
  selectedEntityId: string | null;
  selectedRefId: string | null;
  onTargetClick: (entityId: string) => void;
  onMarkerClick: (ref: Reference) => void;
}

function GroupBlock({
  group,
  zoom,
  isCollapsed,
  onToggle,
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
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        className={`sticky top-0 z-10 mx-3 px-3 ${headerPadY} rounded-md ${headerText} font-medium text-ink-secondary flex items-center gap-2 w-[calc(100%-1.5rem)] text-left cursor-pointer bg-vellum hover:brightness-95 transition-all`}
      >
        <ChevronRight
          size={12}
          className={`text-ink-tertiary transition-transform ${isCollapsed ? "" : "rotate-90"}`}
        />
        <LinkIcon size={11} className="text-ink-tertiary" />
        <span className="truncate">{group.label}</span>
        <span className="ml-auto text-ink-tertiary tabular-nums shrink-0">
          {group.targets.length}
          {group.targets.length !== group.totalRefs && <> · {group.totalRefs}</>}
        </span>
      </button>

      {isCollapsed ? null : zoom === "overview" ? (
        <div className="relative mt-1.5 mx-3 px-3">
          <div className="flex flex-wrap gap-1.5">
            {group.targets.map((t) => (
              <TargetCardOverview
                key={`${t.targetEntityId}-${t.direction}`}
                targetEntityId={t.targetEntityId}
                direction={t.direction}
                refs={t.refs}
                selected={selectedEntityId === t.targetEntityId}
                hovered={hoveredId === `${t.targetEntityId}-${t.direction}`}
                onHover={(entering) =>
                  setHoveredId(
                    entering ? `${t.targetEntityId}-${t.direction}` : null,
                  )
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
                key={`${t.targetEntityId}-${t.direction}`}
                targetEntityId={t.targetEntityId}
                direction={t.direction}
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
                key={`${t.targetEntityId}-${t.direction}`}
                targetEntityId={t.targetEntityId}
                direction={t.direction}
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
  direction: Direction;
  refs: Reference[];
  selected: boolean;
  onTargetClick: (entityId: string) => void;
}

function DirectionBadge({ direction }: { direction: Direction }) {
  const Icon = direction === "incoming" ? ArrowLeft : ArrowRight;
  const title = direction === "incoming" ? "Incoming" : "Outgoing";
  return (
    <span
      aria-label={title}
      title={title}
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-[2px] bg-vellum text-ink-tertiary shrink-0"
    >
      <Icon size={10} strokeWidth={2.5} />
    </span>
  );
}

interface TargetDetailProps extends TargetProps {
  selectedRefId: string | null;
  onMarkerClick: (ref: Reference) => void;
}

function TargetCardDetail({
  targetEntityId,
  direction,
  refs,
  selected,
  selectedRefId,
  onTargetClick,
  onMarkerClick,
}: TargetDetailProps) {
  const entity = getEntity(targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const firstRef = refs[0];

  // Relationships exist between entities, not pages. Show entity-level info
  // only; the evidence-count action jumps to the underlying references where
  // page/text-selection details live.
  const activeInRefs =
    selectedRefId !== null && refs.some((r) => r.id === selectedRefId);
  return (
    <ListCardRow selected={selected} onClick={() => onTargetClick(targetEntityId)}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-ink-tertiary">{type?.name ?? ""}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkerClick(refs[0]);
            }}
            aria-label={`Open ${refs.length} evidence references`}
            title="View evidence in References"
            className={`flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium tabular-nums transition-colors cursor-pointer ${
              activeInRefs
                ? "bg-ink text-paper"
                : "bg-warm text-ink-tertiary hover:bg-parchment hover:text-ink-secondary"
            }`}
          >
            <FileText size={10} />
            {refs.length}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1 text-[10px] text-ink-tertiary">
        <DirectionBadge direction={direction} />
        <span className="capitalize">
          {direction === "incoming" ? "incoming" : "outgoing"}
        </span>
      </div>
    </ListCardRow>
  );
}

function TargetCardCompact({
  targetEntityId,
  direction,
  refs,
  selected,
  onTargetClick,
}: TargetProps) {
  const entity = getEntity(targetEntityId);

  return (
    <ListCardRow
      as="button"
      selected={selected}
      onClick={() => onTargetClick(targetEntityId)}
      ariaLabel={`Open ${entity?.title ?? "entity"}`}
      className="!py-2"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <DirectionBadge direction={direction} />
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
      </div>
      <span className="shrink-0 text-[11px] text-ink-tertiary tabular-nums">
        {refs.length}
      </span>
    </ListCardRow>
  );
}

interface TargetOverviewProps extends TargetProps {
  hovered: boolean;
  onHover: (entering: boolean) => void;
}

function TargetCardOverview({
  targetEntityId,
  direction,
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
          className="absolute z-20 bottom-full left-1/2 mb-1.5 px-2 py-1 rounded whitespace-nowrap text-[11px] shadow-md pointer-events-none bg-ink text-paper"
          style={{
            transform: `translateX(calc(-50% + ${shiftX}px))`,
          }}
        >
          <span className="font-medium">{entity?.title ?? "Unknown"}</span>
          <span className="opacity-70 ml-1.5">
            {type?.name ?? "Unknown"} · {refs.length} ·{" "}
            {direction === "incoming" ? "in" : "out"}
          </span>
        </span>
      )}
    </span>
  );
}
