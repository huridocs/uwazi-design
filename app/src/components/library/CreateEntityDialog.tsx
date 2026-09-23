import { useMemo, useState } from "react";
import type { EntityType } from "../../data/entities";
import { Modal } from "../shared/Modal";
import { ModalList, ModalListRow, ModalSearchRow, ModalStatus, ModalTypeDot } from "../shared/ModalParts";

/** Create entity, step one: which template. The new entity then opens in the
 *  Library drawer on its edit form (`startDraftAtom`), because a template is
 *  the one thing the form can't ask for — it decides which fields there are.
 *
 *  Lists the ACTIVE corpus's templates, in their own order, with a search box
 *  for the corpora that have many (CEJIL has nineteen). The shared `Modal`
 *  (portalled: the Library pane is `overflow-hidden`). */
export function CreateEntityDialog({
  types,
  defaultTypeId,
  onChoose,
  onClose,
}: {
  types: EntityType[];
  /** The corpus's default template, listed first and tagged. */
  defaultTypeId?: string;
  onChoose: (typeId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q ? types.filter((t) => t.name.toLowerCase().includes(q)) : types;
    const def = matching.find((t) => t.id === defaultTypeId);
    return def ? [def, ...matching.filter((t) => t !== def)] : matching;
  }, [types, query, defaultTypeId]);

  return (
    <Modal
      component="CreateEntityDialog"
      // The picker tier: the width and fixed height Copy From and Change
      // template use, so a template list doesn't read as a lesser dialog.
      size="md"
      height="md:h-[min(34rem,100%)]"
      onClose={onClose}
      title="Create entity"
      titleId="create-entity-title"
      subtitle="choose a template"
      flush
    >
      <ModalSearchRow
        value={query}
        onChange={setQuery}
        placeholder="Search templates"
        ariaLabel="Search templates"
        autoFocus
      />
      <ModalList>
        {shown.length === 0 && <ModalStatus as="li">No template matches that name.</ModalStatus>}
        {shown.map((t) => (
          <ModalListRow
            key={t.id}
            onClick={() => onChoose(t.id)}
            leading={<ModalTypeDot color={t.color} />}
            title={t.name}
            meta={t.id === defaultTypeId ? "Default" : undefined}
          />
        ))}
      </ModalList>
    </Modal>
  );
}
