import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";
import { useAtom, useSetAtom } from "jotai";
import { entityPickerOpenAtom, textSelectionAtom } from "../atoms/selection";
import { referencesAtom, toastsAtom } from "../atoms/references";
import { entities, entityTypes, getEntityType, Entity } from "../data/entities";
import { RelationType, relationTypes } from "../data/references";
import { EntityPill } from "../components/shared/EntityPill";

export function EntityPickerModal() {
  const [open, setOpen] = useAtom(entityPickerOpenAtom);
  const [selection, setSelection] = useAtom(textSelectionAtom);
  const setReferences = useSetAtom(referencesAtom);
  const setToasts = useSetAtom(toastsAtom);
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<RelationType>("relates_to");
  const [step, setStep] = useState<"entity" | "relation">("entity");

  const filtered = useMemo(() => {
    if (!search) return entities;
    const q = search.toLowerCase();
    return entities.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        getEntityType(e.typeId)?.name.toLowerCase().includes(q)
    );
  }, [search]);

  // Group by entity type
  const grouped = useMemo(() => {
    const groups = new Map<string, Entity[]>();
    filtered.forEach((e) => {
      const group = groups.get(e.typeId) ?? [];
      group.push(e);
      groups.set(e.typeId, group);
    });
    return groups;
  }, [filtered]);

  const handleCreate = () => {
    if (!selectedEntity || !selection) return;

    const newRef = {
      id: `ref-${Date.now()}`,
      sourceEntityId: "e3", // current document
      targetEntityId: selectedEntity.id,
      relationType: selectedRelation,
      sourceSelection: {
        text: selection.text,
        page: selection.page,
        top: selection.rect.top,
        left: selection.rect.left,
        width: selection.rect.width,
        height: selection.rect.height,
      },
      createdAt: new Date().toISOString().split("T")[0],
    };

    setReferences((prev) => [...prev, newRef]);
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        message: `Reference to "${selectedEntity.title}" created`,
        type: "success" as const,
      },
    ]);

    // Reset
    setOpen(false);
    setSelection(null);
    setSelectedEntity(null);
    setStep("entity");
    setSearch("");
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedEntity(null);
    setStep("entity");
    setSearch("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" role="dialog" aria-modal="true" aria-label="Select entity">
      <div className="bg-paper rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-ink">
              {step === "entity" ? "Select Target Entity" : "Choose Relation Type"}
            </h3>
            {selection && (
              <p className="text-xs text-ink-muted mt-0.5 truncate max-w-[350px]">
                From: "{selection.text.slice(0, 60)}
                {selection.text.length > 60 ? "..." : ""}"
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-parchment transition-colors"
          >
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        {step === "entity" ? (
          <>
            {/* Search */}
            <div className="px-5 py-3 border-b border-border/50">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search entities..."
                  className="w-full pl-8 pr-4 py-2 text-sm bg-warm border border-border rounded-md
                    placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Entity list */}
            <div className="flex-1 overflow-auto px-5 py-3 space-y-4">
              {Array.from(grouped.entries()).map(([typeId, ents]) => {
                const type = getEntityType(typeId);
                return (
                  <div key={typeId}>
                    <h4 className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-2">
                      {type?.name}
                    </h4>
                    <div className="space-y-1">
                      {ents.map((entity) => (
                        <button
                          key={entity.id}
                          onClick={() => {
                            setSelectedEntity(entity);
                            setStep("relation");
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md
                            text-left hover:bg-warm transition-colors ${
                              selectedEntity?.id === entity.id
                                ? "bg-warm ring-1 ring-carbon/20"
                                : ""
                            }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: type?.color }}
                          />
                          <span className="text-sm text-ink">{entity.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-ink-muted text-center py-8">
                  No entities match "{search}"
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Relation type picker */}
            <div className="px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-ink-muted">Target:</span>
                <EntityPill
                  typeId={selectedEntity?.typeId ?? ""}
                  label={selectedEntity?.title}
                  size="md"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto px-5 py-3 space-y-1">
              {relationTypes.map((rel) => (
                <button
                  key={rel.id}
                  onClick={() => setSelectedRelation(rel.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left
                    transition-colors ${
                      selectedRelation === rel.id
                        ? "bg-carbon-tint ring-1 ring-carbon/30"
                        : "hover:bg-warm"
                    }`}
                >
                  <span className="text-sm text-ink">{rel.label}</span>
                </button>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-border flex justify-between">
              <button
                onClick={() => setStep("entity")}
                className="px-4 py-2 text-sm font-medium rounded-md border border-border
                  text-ink-secondary hover:bg-parchment transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 text-sm font-medium rounded-md bg-ink text-white
                  hover:bg-ink/90 transition-colors"
              >
                Create Reference
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
