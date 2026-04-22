import { useMemo, useState, useCallback } from "react";
import { useAtom } from "jotai";
import { referencesAtom, toastsAtom, activeDrawerTabAtom } from "../../atoms/references";
import {
  viewModeAtom,
  searchQueryAtom,
  sortOrderAtom,
  expandAllSignalAtom,
  collapseAllSignalAtom,
  activeClusterRefIdsAtom,
} from "../../atoms/filters";
import { getEntity, getEntityType } from "../../data/entities";
import { currentDocument } from "../../data/document";
import { Reference, relationTypes } from "../../data/references";
import { DrawerTabs } from "../layout/DrawerTabs";
import { SearchBar } from "./SearchBar";
import { FiltersRow } from "./FiltersRow";
import { GroupedCard } from "./GroupedCard";
import { DensityCard } from "./DensityCard";
import { RefRow } from "./RefRow";
import { DrawerActionBar } from "./DrawerActionBar";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { MetadataDrawerContent } from "./MetadataDrawerContent";
import { TocDrawerContent } from "./TocDrawerContent";
import { Link2, X } from "lucide-react";
import { EntityOverlay } from "./EntityOverlay";
import { buildMatcher } from "../../utils/searchQuery";
import { deriveRelationships } from "../../utils/relationships";
import { RelationshipPanel } from "./RelationshipPanel";

function FilterChip({
  count,
  total,
  pages,
  onClear,
}: {
  count: number;
  total: number;
  pages: number[];
  onClear: () => void;
}) {
  const pageLabel =
    pages.length === 0
      ? ""
      : pages.length === 1
        ? `Page ${pages[0]}`
        : pages.length <= 3
          ? `Pages ${pages.join(", ")}`
          : `Pages ${pages[0]}–${pages[pages.length - 1]}`;
  return (
    <div className="px-3 pt-2 pb-1 shrink-0">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-warm">
        <div className="flex items-center gap-1.5 min-w-0 text-[11px]">
          {pageLabel && (
            <span className="font-semibold text-ink-secondary tabular-nums shrink-0">
              {pageLabel}
            </span>
          )}
          <span className="text-ink-tertiary tabular-nums">
            {pageLabel && "·"} Showing {count} of {total}
          </span>
        </div>
        <button
          onClick={onClear}
          className="shrink-0 flex items-center justify-center rounded-sm text-ink-tertiary hover:text-ink transition-colors"
          aria-label="Clear selection"
          style={{ width: 16, height: 16 }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

const baseDrawerTabs = [
  { id: "metadata", label: "Metadata" },
  { id: "toc", label: "ToC" },
  { id: "references", label: "References" },
  { id: "relationships", label: "Relationships" },
  { id: "search", label: "Search" },
];

export function ReferencePanel() {
  const [references, setReferences] = useAtom(referencesAtom);
  const [viewMode] = useAtom(viewModeAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [sortOrder] = useAtom(sortOrderAtom);
  const [, setToasts] = useAtom(toastsAtom);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useAtom(activeDrawerTabAtom);
  const [, setExpandSignal] = useAtom(expandAllSignalAtom);
  const [, setCollapseSignal] = useAtom(collapseAllSignalAtom);

  const [activeClusterRefIds, setActiveClusterRefIds] = useAtom(activeClusterRefIdsAtom);

  // Filter and sort references
  const filtered = useMemo(() => {
    let result = references;
    // Filter by active cluster from track
    if (activeClusterRefIds) {
      result = result.filter((ref) => activeClusterRefIds.includes(ref.id));
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
      // Default: order by appearance in document (page, then top position)
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
  }, [references, searchQuery, sortOrder, activeClusterRefIds]);

  const handleDelete = useCallback((id: string) => {
    setDeleteTarget(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    setReferences((prev) => prev.filter((r) => r.id !== deleteTarget));
    setDeleteTarget(null);
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        message: "Reference deleted",
        type: "success" as const,
      },
    ]);
  }, [deleteTarget, setReferences, setToasts]);

  // Group by entity type (sorted)
  const groupedByEntityType = useMemo(() => {
    const groups = new Map<string, Reference[]>();
    filtered.forEach((ref) => {
      const entity = getEntity(ref.targetEntityId);
      const typeId = entity?.typeId ?? "unknown";
      const group = groups.get(typeId) ?? [];
      group.push(ref);
      groups.set(typeId, group);
    });
    if (sortOrder === "none") return groups;
    const dir = sortOrder === "asc" ? 1 : -1;
    return new Map(
      [...groups.entries()].sort(([a], [b]) => {
        const nameA = getEntityType(a)?.name ?? a;
        const nameB = getEntityType(b)?.name ?? b;
        return nameA.localeCompare(nameB) * dir;
      })
    );
  }, [filtered, sortOrder]);

  // Group by relation type (sorted)
  const groupedByRelType = useMemo(() => {
    const groups = new Map<string, Reference[]>();
    filtered.forEach((ref) => {
      const group = groups.get(ref.relationType) ?? [];
      group.push(ref);
      groups.set(ref.relationType, group);
    });
    if (sortOrder === "none") return groups;
    const dir = sortOrder === "asc" ? 1 : -1;
    return new Map(
      [...groups.entries()].sort(([a], [b]) => {
        const labelA = relationTypes.find((r) => r.id === a)?.label ?? a;
        const labelB = relationTypes.find((r) => r.id === b)?.label ?? b;
        return labelA.localeCompare(labelB) * dir;
      })
    );
  }, [filtered, sortOrder]);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Entity overlay */}
      <EntityOverlay />

      {/* Drawer tabs */}
      <DrawerTabs
        tabs={baseDrawerTabs.map((t) => {
          if (t.id === "references") return { ...t, count: references.length };
          if (t.id === "relationships") return { ...t, count: deriveRelationships(references).length };
          return t;
        })}
        activeId={activeDrawerTab}
        onChange={setActiveDrawerTab}
      />

      {/* Metadata tab content */}
      {activeDrawerTab === "metadata" && <MetadataDrawerContent />}

      {/* References tab content */}
      {activeDrawerTab === "references" && (
        <>
          <SearchBar />
          <FiltersRow
            onExpandAll={() => setExpandSignal((s) => s + 1)}
            onCollapseAll={() => setCollapseSignal((s) => s + 1)}
          />
        </>
      )}

      {activeDrawerTab === "references" && activeClusterRefIds && (
        <FilterChip
          count={filtered.length}
          total={references.length}
          pages={Array.from(new Set(filtered.map((r) => r.sourceSelection.page))).sort((a, b) => a - b)}
          onClear={() => setActiveClusterRefIds(null)}
        />
      )}

      {activeDrawerTab === "references" && (
      <div className="flex-1 overflow-auto pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Link2 size={32} className="text-ink-muted/40 mb-3" />
            <p className="text-sm text-ink-muted">No references found</p>
            <p className="text-xs text-ink-muted mt-1">
              Select text in the document to create one
            </p>
          </div>
        ) : viewMode === "all" ? (
          <div className="px-3 space-y-1.5">
          {filtered.map((ref) => (
            <RefRow key={ref.id} reference={ref} onDelete={handleDelete} />
          ))}
          </div>
        ) : viewMode === "by-entity-type" ? (
          <div className="px-3 space-y-1.5">
          {Array.from(groupedByEntityType.entries()).map(([typeId, refs]) => {
            const type = getEntityType(typeId);
            return (
              <GroupedCard
                key={typeId}
                title={type?.name ?? typeId}
                color={type?.color}
                references={refs}
                onDeleteRef={handleDelete}
              />
            );
          })}
          </div>
        ) : viewMode === "by-relation-type" ? (
          <div className="px-3 space-y-1.5">
          {Array.from(groupedByRelType.entries()).map(([relType, refs]) => {
            const label =
              relationTypes.find((r) => r.id === relType)?.label ?? relType;
            return (
              <GroupedCard
                key={relType}
                title={label}
                references={refs}
                onDeleteRef={handleDelete}
              />
            );
          })}
          </div>
        ) : viewMode === "density" ? (
          <DensityCard
            references={filtered}
            totalPages={currentDocument.pages}
          />
        ) : null}
      </div>
      )}

      {/* ToC tab content */}
      {activeDrawerTab === "toc" && <TocDrawerContent />}

      {/* Relationships tab content */}
      {activeDrawerTab === "relationships" && <RelationshipPanel />}

      {/* Other tabs placeholder */}
      {!["metadata", "references", "toc", "relationships"].includes(activeDrawerTab) && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-ink-muted capitalize">{activeDrawerTab} content</p>
        </div>
      )}

      {/* Drawer action bar — contextual per tab */}
      <DrawerActionBar activeTab={activeDrawerTab} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Reference"
        message="Are you sure you want to delete this reference? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
