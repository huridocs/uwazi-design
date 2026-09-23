import { Fragment, useId, useState, useMemo } from "react";
import { Plus } from "lucide-react";
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
import {
  MODAL_INPUT,
  ModalField,
  ModalList,
  ModalListRow,
  ModalSearchRow,
  ModalSectionLabel,
  ModalStatus,
  ModalTypeDot,
} from "../shared/ModalParts";

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
        <ModalSearchRow
          value={search}
          onChange={setSearch}
          placeholder={t("System", "Search entities...")}
          ariaLabel={t("System", "Search entities")}
          clearLabel={t("System", "Clear search")}
          autoFocus
        />

        <ModalList data-part="entities">
          {/* Create-new affordance pinned at the top */}
          <ModalListRow
            part="create-entity"
            onClick={handleStartNewEntity}
            leading={<Plus size={13} aria-hidden className="text-ink-muted shrink-0" />}
            title={t("System", "Create new entity from selection")}
            titleClassName="text-ink-secondary"
          />

          {Array.from(grouped.entries()).map(([typeId, ents]) => {
            const type = getEntityType(typeId);
            return (
              <Fragment key={typeId}>
                <ModalSectionLabel as="h4" row>
                  {type?.name}
                </ModalSectionLabel>
                {ents.map((entity) => (
                  <ModalListRow
                    key={entity.id}
                    part="entity"
                    onClick={() => {
                      setSelectedEntity(entity);
                      setStep("relation");
                    }}
                    selected={selectedEntity?.id === entity.id}
                    leading={<ModalTypeDot color={type?.color} />}
                    title={entity.title}
                  />
                ))}
              </Fragment>
            );
          })}
          {filtered.length === 0 && (
            <ModalStatus as="li">
              {t("System", "No entities match")} "{search}"
            </ModalStatus>
          )}
        </ModalList>
      </>
    )}

    {step === "new-entity" && (
      <>
        <div data-part="new-entity" className="bleed shrink-0 py-4">
          <ModalField
            label={t("System", "Title")}
            htmlFor={titleId}
            hint={t("System", "Pre-filled from your selection. Edit as needed.")}
          >
            <input
              id={titleId}
              type="text"
              value={newEntityTitle}
              onChange={(e) => setNewEntityTitle(e.target.value)}
              className={MODAL_INPUT}
              autoFocus
            />
          </ModalField>
        </div>
        <div role="group" aria-labelledby={typeLabelId} className="bleed-flush flex-1 min-h-0 flex flex-col">
          <div className="bleed pb-1">
            <ModalSectionLabel as="span" id={typeLabelId}>
              {t("System", "Entity type")}
            </ModalSectionLabel>
          </div>
          <ModalList atEdge>
            {entityTypes.map((type) => (
              <ModalListRow
                key={type.id}
                part="entity-type"
                onClick={() => setNewEntityTypeId(type.id)}
                pressed={newEntityTypeId === type.id}
                selected={newEntityTypeId === type.id}
                leading={<ModalTypeDot color={type.color} />}
                title={type.name}
              />
            ))}
          </ModalList>
        </div>
      </>
    )}

    {step === "relation" && (
      <>
        <div data-part="target" className="bleed shrink-0 flex items-center gap-2 py-2 border-b border-border">
          <span className="text-xs text-ink-muted">{t("System", "Target:")}</span>
          <EntityPill
            typeId={selectedEntity?.typeId ?? ""}
            label={selectedEntity?.title}
            size="md"
          />
        </div>
        <ModalList data-part="relation-types">
          {relationTypes.map((rel) => (
            <ModalListRow
              key={rel.id}
              part="relation-type"
              onClick={() => setSelectedRelation(rel.id)}
              pressed={selectedRelation === rel.id}
              selected={selectedRelation === rel.id}
              title={rel.label}
            />
          ))}
        </ModalList>
      </>
    )}
    </Modal>
  );
}
