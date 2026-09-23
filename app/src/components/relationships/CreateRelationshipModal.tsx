import { useId, useState, useMemo } from "react";
import { X, Search, Plus } from "lucide-react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { entityPickerOpenAtom, textSelectionAtom } from "../../atoms/selection";
import {
  scopedReferencesAtom,
  relationTypesAtom,
  toastsAtom,
} from "../../atoms/references";
import { entitiesAtom, entityTypesAtom } from "../../atoms/entities";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { getEntityType, Entity, entities as seedEntities } from "../../data/entities";
import { RelationType } from "../../data/references";
import { EntityPill } from "../shared/EntityPill";
import { t } from "../../utils/i18n";
import { BAR_GHOST } from "../shared/warmButton";
import { Modal, MODAL_BUTTON, MODAL_COMMIT } from "../shared/Modal";

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
  const relationTypes = useAtomValue(relationTypesAtom);
  const setReferences = useSetAtom(scopedReferencesAtom);
  const setToasts = useSetAtom(toastsAtom);
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<RelationType>("relates_to");
  const [step, setStep] = useState<Step>("entity");

  // New-entity form state
  const [newEntityTitle, setNewEntityTitle] = useState("");
  const titleId = useId();
  const typeLabelId = useId();
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
    if (!selectedEntity) return;

    // When opened from the action bar there's no text selection — create an
    // entity-level reference (no sourceSelection). When opened from a text
    // selection, anchor to it.
    const newRef = {
      id: `ref-${Date.now()}`,
      // The FOCAL entity, not the corpus's original author. `e3` was hardcoded
      // here, so a relationship created from any other entity was stored as one
      // of e3's — half-hidden today because `scopedReferencesAtom` writes new
      // rows verbatim and reconciles by id, and the reader flips perspective
      // anyway; it stops being hidden the moment the store is edge-shaped.
      sourceEntityId: focusedId,
      targetEntityId: selectedEntity.id,
      relationType: selectedRelation,
      ...(selection
        ? {
            sourceSelection: {
              text: selection.text,
              page: selection.page,
              top: selection.rect.top,
              left: selection.rect.left,
              width: selection.rect.width,
              height: selection.rect.height,
            },
          }
        : {}),
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

  // Back, then the step's commit. The entity step commits by picking a row,
  // so it has no footer.
  const back = (
    <button
      type="button"
      data-part="back"
      data-gutter-align="box"
      onClick={() => setStep("entity")}
      className={`me-auto ${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}
    >
      {t("System", "Back")}
    </button>
  );
  const footer =
    step === "new-entity" ? (
      <>
        {back}
        <button
          type="button"
          data-part="confirm"
          onClick={handleConfirmNewEntity}
          disabled={!newEntityTitle.trim()}
          className={`${MODAL_COMMIT} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {t("System", "Create entity")}
        </button>
      </>
    ) : step === "relation" ? (
      <>
        {back}
        <button type="button" data-part="confirm" onClick={handleCreate} className={MODAL_COMMIT}>
          {t("System", "Create relationship")}
        </button>
      </>
    ) : undefined;

  return (
    <Modal
      component="CreateRelationshipModal"
      size="md"
      maxHeight="md:max-h-[80vh]"
      portal={false}
      dismissOnScrim={false}
      scrimProps={{ "data-step": step }}
      onClose={handleClose}
      title={headerTitle}
      subtitle={
        selection ? (
          <>
            {t("System", "From:")} "{selection.text.slice(0, 60)}
            {selection.text.length > 60 ? "..." : ""}"
          </>
        ) : undefined
      }
      closeLabel={t("System", "Close")}
      flush
      footer={footer}
    >
    {step === "entity" && (
      <>
        {/* Search */}
        <div data-part="search" role="search" className="bleed shrink-0 py-3 border-b border-border/50">
          <div className="relative">
            <Search
              size={14}
              aria-hidden
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("System", "Search entities...")}
              aria-label={t("System", "Search entities")}
              className="w-full pl-8 pr-8 py-2 text-sm bg-warm border border-border rounded-md
                placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20"
              autoFocus
            />
            {search && (
              <button
                type="button"
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
        <div data-part="entities" className="bleed flex-1 overflow-auto py-3 space-y-4">
          {/* Create-new affordance pinned at the top */}
          <button
            type="button"
            data-part="create-entity"
            data-gutter-align="box"
            onClick={handleStartNewEntity}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left
              border border-dashed border-border hover:bg-warm hover:border-ink/30 transition-colors cursor-pointer"
          >
            <Plus size={14} aria-hidden className="text-ink-muted shrink-0" />
            <span className="text-sm text-ink-secondary">
              {t("System", "Create new entity from selection")}
            </span>
          </button>

          {Array.from(grouped.entries()).map(([typeId, ents]) => {
            const type = getEntityType(typeId);
            return (
              <section key={typeId} data-part="entity-group">
                <h4 className="text-meta font-medium text-ink-muted uppercase tracking-wider mb-2">
                  {type?.name}
                </h4>
                <ul className="space-y-1">
                  {ents.map((entity) => (
                    <li key={entity.id}>
                      <button
                        type="button"
                        data-part="entity"
                        data-gutter-align="box"
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
                          aria-hidden
                          className="w-2 h-2 rounded-[2px] shrink-0"
                          style={{ backgroundColor: type?.color }}
                        />
                        <span className="text-sm text-ink">{entity.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {filtered.length === 0 && (
            <p data-part="empty" className="text-sm text-ink-muted text-center py-8">
              {t("System", "No entities match")} "{search}"
            </p>
          )}
        </div>
      </>
    )}

    {step === "new-entity" && (
      <>
        <div data-part="new-entity" className="bleed flex-1 overflow-auto py-4 space-y-4">
          <div>
            <label
              htmlFor={titleId}
              className="block text-xs font-medium text-ink-secondary mb-1.5"
            >
              {t("System", "Title")}
            </label>
            <input
              id={titleId}
              type="text"
              value={newEntityTitle}
              onChange={(e) => setNewEntityTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-warm border border-border rounded-md
                focus:outline-none focus:ring-2 focus:ring-carbon/20"
              autoFocus
            />
            <p className="text-meta text-ink-tertiary mt-1">
              {t("System", "Pre-filled from your selection. Edit as needed.")}
            </p>
          </div>

          <div role="group" aria-labelledby={typeLabelId}>
            <span
              id={typeLabelId}
              className="block text-xs font-medium text-ink-secondary mb-1.5"
            >
              {t("System", "Entity type")}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {entityTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  data-part="entity-type"
                  onClick={() => setNewEntityTypeId(type.id)}
                  aria-pressed={newEntityTypeId === type.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors cursor-pointer ${
                    newEntityTypeId === type.id
                      ? "bg-warm ring-1 ring-carbon/30"
                      : "hover:bg-warm"
                  }`}
                >
                  <span
                    aria-hidden
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-ink-secondary">{type.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    )}

    {step === "relation" && (
      <>
        <div className="bleed shrink-0 py-4 border-b border-border/50">
          <div data-part="target" className="flex items-center gap-2 mb-3">
            <span className="text-xs text-ink-muted">{t("System", "Target:")}</span>
            <EntityPill
              typeId={selectedEntity?.typeId ?? ""}
              label={selectedEntity?.title}
              size="md"
            />
          </div>
        </div>
        <ul data-part="relation-types" className="bleed flex-1 overflow-auto py-3 space-y-1">
          {relationTypes.map((rel) => (
            <li key={rel.id}>
              <button
                type="button"
                data-part="relation-type"
                data-gutter-align="box"
                onClick={() => setSelectedRelation(rel.id)}
                aria-pressed={selectedRelation === rel.id}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left
                  transition-colors cursor-pointer ${
                    selectedRelation === rel.id
                      ? "bg-carbon-tint ring-1 ring-carbon/30"
                      : "hover:bg-warm"
                  }`}
              >
                <span className="text-sm text-ink">{rel.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </>
    )}
    </Modal>
  );
}
