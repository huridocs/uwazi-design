import { useAtomValue, useSetAtom } from "jotai";
import { languageAtom } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { overlayEntityIdAtom } from "../../atoms/references";
import { EntityPill } from "../shared/EntityPill";
import { resolveRelationshipField } from "../../utils/inheritance";
import type { RelationshipMetadataField } from "../../data/metadata";
import type { GridItem } from "./MetadataFieldsGrid";

/** The entities a link-only connection points at, as pills. */
function ConnectionPills({ field }: { field: RelationshipMetadataField }) {
  const lang = useAtomValue(languageAtom);
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  const resolved = resolveRelationshipField(field, lang, getProp);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {resolved.values.map((v) => (
        <button
          key={v.entityId}
          onClick={() => setOverlay(v.entityId)}
          className="min-w-0 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
          title="Preview source entity"
        >
          <EntityPill typeId={v.entityTypeId} label={v.entityTitle} />
        </button>
      ))}
      {field.totalConnected != null && field.totalConnected > resolved.values.length && (
        <span className="text-[11px] text-ink-tertiary">
          +{field.totalConnected - resolved.values.length} more
        </span>
      )}
    </div>
  );
}

/** A link-only connection as a grid item, so it sits in the record with every
 *  other property instead of getting a bordered card to itself.
 *
 *  It used to be a full MetadataCard per field: a title, a caption reading "via
 *  Mecanismo · linked" under a heading that already said Mecanismo, and one pill.
 *  An entity whose whole content was two dates and four links rendered as four
 *  near-empty boxes. A connection that inherits nothing is just a property whose
 *  value happens to be an entity — so it's a cell, and the pill is the value.
 *
 *  Connections that DO inherit keep their card: they carry a table (entities ×
 *  inherited columns), provenance trails and rollups, which is real content. */
export function connectionItem(field: RelationshipMetadataField): GridItem {
  return {
    id: field.id,
    label: field.label,
    // Several pills wrap; give them the room rather than a squeezed third.
    long: (field.connectedEntityIds?.length ?? 0) > 2,
    content: <ConnectionPills field={field} />,
  };
}
