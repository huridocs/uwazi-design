import { useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import { getEntity } from "../../data/entities";
import { formatRecordDate } from "../../utils/dates";

/** The line that closes a record: when it was created, and when it was last
 *  edited if it ever was.
 *
 *  NOT a card and NOT a field. It says nothing about the entity's subject — it
 *  is provenance about the RECORD — so giving it a bordered card and an
 *  uppercase head would file it among the entity's own properties, which is
 *  where a reader would then look for it and be wrong. A quiet full-width line
 *  under everything is what it is.
 *
 *  It is also deliberately OUTSIDE the masonry rather than a `MasonryItem`. As a
 *  grid child it would be packed into a column like any other card and end up
 *  beside the last field instead of after the record; as a sibling of the grid
 *  it can only ever be last, which is the one thing this line has to be.
 *
 *  "Edited" appears only when there IS an edit date and it differs from the
 *  created one. A record created and never touched says so by saying less; a
 *  record whose two dates are the same day was not edited, it was made. */
export function RecordFooter({ entityId }: { entityId: string }) {
  const language = useAtomValue(languageAtom);
  const entity = getEntity(entityId);
  const created = entity?.createdAt;
  if (!created) return null;
  const edited =
    entity?.updatedAt && entity.updatedAt !== created ? entity.updatedAt : undefined;

  return (
    <p className="text-meta text-ink-tertiary pt-1">
      Created {formatRecordDate(created, language)}
      {edited && (
        <>
          {" · "}
          Edited {formatRecordDate(edited, language)}
        </>
      )}
    </p>
  );
}
