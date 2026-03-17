import { useMemo, useState, useCallback } from "react";
import { useAtom } from "jotai";
import { referencesAtom, toastsAtom } from "../../atoms/references";
import { viewModeAtom, searchQueryAtom, sortOrderAtom, expandAllSignalAtom, collapseAllSignalAtom } from "../../atoms/filters";
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
import { Link2 } from "lucide-react";

const drawerTabs = [
  { id: "metadata", label: "Metadata" },
  { id: "toc", label: "ToC" },
  { id: "references", label: "References", count: 9 },
  { id: "relationships", label: "Relationships", count: 14 },
  { id: "search", label: "Search" },
];

export function ReferencePanel() {
  const [references, setReferences] = useAtom(referencesAtom);
  const [viewMode] = useAtom(viewModeAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [sortOrder] = useAtom(sortOrderAtom);
  const [, setToasts] = useAtom(toastsAtom);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState("references");
  const [, setExpandSignal] = useAtom(expandAllSignalAtom);
  const [, setCollapseSignal] = useAtom(collapseAllSignalAtom);

  // Filter and sort references
  const filtered = useMemo(() => {
    let result = references;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((ref) => {
        const entity = getEntity(ref.targetEntityId);
        return (
          ref.sourceSelection.text.toLowerCase().includes(q) ||
          entity?.title.toLowerCase().includes(q) ||
          ref.relationType.toLowerCase().includes(q)
        );
      });
    }
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      const nameA = getEntity(a.targetEntityId)?.title ?? "";
      const nameB = getEntity(b.targetEntityId)?.title ?? "";
      return nameA.localeCompare(nameB) * dir;
    });
  }, [references, searchQuery, sortOrder]);

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
    <div className="flex flex-col h-full">
      {/* Drawer tabs */}
      <DrawerTabs
        tabs={drawerTabs}
        activeId={activeDrawerTab}
        onChange={setActiveDrawerTab}
      />

      {/* Search + filter row */}
      <SearchBar />

      {/* Sort/filter toggles + collapse/expand */}
      <FiltersRow
        onExpandAll={() => setExpandSignal((s) => s + 1)}
        onCollapseAll={() => setCollapseSignal((s) => s + 1)}
      />

      {/* Reference list */}
      <div className="flex-1 overflow-auto pt-1 pb-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Link2 size={32} className="text-ink-muted/40 mb-3" />
            <p className="text-sm text-ink-muted">No references found</p>
            <p className="text-xs text-ink-muted mt-1">
              Select text in the document to create one
            </p>
          </div>
        ) : viewMode === "all" ? (
          filtered.map((ref) => (
            <RefRow key={ref.id} reference={ref} onDelete={handleDelete} />
          ))
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

      {/* Drawer action bar */}
      <DrawerActionBar />

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
