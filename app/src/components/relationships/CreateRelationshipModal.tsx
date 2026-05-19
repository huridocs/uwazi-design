import { useState, useMemo } from "react";
import { X, Search, Plus } from "lucide-react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { entityPickerOpenAtom, textSelectionAtom } from "../../atoms/selection";
import { referencesAtom, toastsAtom } from "../../atoms/references";
import { entitiesAtom, entityTypesAtom } from "../../atoms/entities";
import { getEntityType, Entity, entities as seedEntities } from "../../data/entities";
import { RelationType, relationTypes } from "../../data/references";
import { EntityPill } from "../shared/EntityPill";
import { t } from "../../utils/i18n";

type Step = "entity" | "new-entity" | "relation";

/** Three-step create-relationship flow: pick (or create) the target entity,
 *  then pick the relation type. The new-entity path pre-fills the title with
 *  the source selection text so the user keeps that context — Uwazi calls
 *  this "copy property from this entity"; we scope it to title only since
 *  the prototype's Entity model has no description field. */
export function CreateRelationshipModal() {
  const [open, setOpen] = useAtom(entityPickerOpenAtom);
  const [selection, setSelection] = useAtom(textSelectionAtom);
  const [entities, setEntities] = useAtom(entitiesAtom);
  const entityTypes = useAtomValue(entityTypesAtom);
  const setReferences = useSetAtom(referencesAtom);
  const setToasts = useSetAtom(toastsAtom);
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<RelationType>("relates_to");
  const [step, setStep] = useState<Step>("entity");

  // New-entity form state
  const [newEntityTitle, setNewEntityTitle] = useState("");
  const [newEntityTypeId, setNewEntityTypeId] = useState(entityTypes[0]?.id ?? "person");

  const filtered = useMemo(() => {
    if (!search) return entities;
    const q = search.toLowerCase();
    return entities.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        getEntityType(e.typeId)?.name.toLowerCase().includes(q),
    );
  }, [search, entities]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Entity[]>();
    filtered.forEach((e) => {
      const group = groups.get(e.typeId) ?? [];
      group.push(e);
      groups.set(e.typeId, group);
    });
    return groups;
  }, [filtered]);

  const reset = () => {
    setSelectedEntity(null);
    setStep("entity");
    setSearch("");
    setNewEntityTitle("");
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleStartNewEntity = () => {
    // Copy the selection text into the title field as a starting point.
    setNewEntityTitle(selection?.text.trim() ?? "");
    setStep("new-entity");
  };

  const handleConfirmNewEntity = () => {
    if (!newEntityTitle.trim()) return;
    const newEntity: Entity = {
      id: `e-new-${Date.now()}`,
      title: newEntityTitle.trim(),
      typeId: newEntityTypeId,
    };
    // Mirror into the seed array so getEntity() resolves the new id everywhere
    // (RelationshipRow, EntityOverlay, RefMinimap, etc. all read through it).
    seedEntities.push(newEntity);
    setEntities((prev) => [...prev, newEntity]);
    setSelectedEntity(newEntity);
    setStep("relation");
  };

  const handleCreate = () => {
    if (!selectedEntity || !selection) return;

    const newRef = {
      id: `ref-${Date.now()}`,
      sourceEntityId: "e3",
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
        message: t(
          "System",
          "Relationship created",
          `Relationship to "${selectedEntity.title}" created`,
        ),
        type: "success" as const,
      },
    ]);

    setOpen(false);
    setSelection(null);
    reset();
  };

  if (!open) return null;

  const headerTitle =
    step === "new-entity"
      ? t("System", "New entity")
      : step === "relation"
        ? t("System", "Choose relation type")
        : t("System", "Select target entity");

  return (
    <div
      className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-4 bg-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("System", "Create relationship")}
    >
      <div className="bg-paper shadow-xl w-full md:max-w-lg md:rounded-lg md:max-h-[80vh] h-full md:h-auto flex flex-col md:animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-ink">{headerTitle}</h3>
            {selection && (
              <p className="text-xs text-ink-muted mt-0.5 truncate max-w-[350px]">
                {t("System", "From:")} "{selection.text.slice(0, 60)}
                {selection.text.length > 60 ? "..." : ""}"
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-parchment transition-colors"
            aria-label={t("System", "Close")}
          >
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        {step === "entity" && (
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
                  placeholder={t("System", "Search entities...")}
                  className="w-full pl-8 pr-8 py-2 text-sm bg-warm border border-border rounded-md
                    placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-parchment text-ink-muted hover:text-ink cursor-pointer transition-colors"
                    aria-label={t("System", "Clear search")}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Entity list */}
            <div className="flex-1 overflow-auto px-5 py-3 space-y-4">
              {/* Create-new affordance pinned at the top */}
              <button
                onClick={handleStartNewEntity}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left
                  border border-dashed border-border hover:bg-warm hover:border-ink/30 transition-colors cursor-pointer"
              >
                <Plus size={14} className="text-ink-muted shrink-0" />
                <span className="text-sm text-ink-secondary">
                  {t("System", "Create new entity from selection")}
                </span>
              </button>

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
                            className="w-2 h-2 rounded-[2px] shrink-0"
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
                  {t("System", "No entities match")} "{search}"
                </p>
              )}
            </div>
          </>
        )}

        {step === "new-entity" && (
          <>
            <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                  {t("System", "Title")}
                </label>
                <input
                  type="text"
                  value={newEntityTitle}
                  onChange={(e) => setNewEntityTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-warm border border-border rounded-md
                    focus:outline-none focus:ring-2 focus:ring-carbon/20"
                  autoFocus
                />
                <p className="text-[11px] text-ink-tertiary mt-1">
                  {t("System", "Pre-filled from your selection. Edit as needed.")}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                  {t("System", "Entity type")}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {entityTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setNewEntityTypeId(type.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors cursor-pointer ${
                        newEntityTypeId === type.id
                          ? "bg-warm ring-1 ring-carbon/30"
                          : "hover:bg-warm"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-[2px] shrink-0"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-ink-secondary">{type.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex justify-between">
              <button
                onClick={() => setStep("entity")}
                className="px-3 py-1.5 text-xs font-medium rounded-md text-ink-secondary bg-warm hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
              >
                {t("System", "Back")}
              </button>
              <button
                onClick={handleConfirmNewEntity}
                disabled={!newEntityTitle.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-ink text-parchment
                  hover:bg-ink/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("System", "Create entity")}
              </button>
            </div>
          </>
        )}

        {step === "relation" && (
          <>
            <div className="px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-ink-muted">{t("System", "Target:")}</span>
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
                    transition-colors cursor-pointer ${
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
                className="px-3 py-1.5 text-xs font-medium rounded-md text-ink-secondary bg-warm hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
              >
                {t("System", "Back")}
              </button>
              <button
                onClick={handleCreate}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-ink text-parchment
                  hover:bg-ink/90 transition-colors cursor-pointer"
              >
                {t("System", "Create relationship")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
