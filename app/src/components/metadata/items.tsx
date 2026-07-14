import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { languageAtom } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { overlayEntityIdAtom } from "../../atoms/references";
import { EntityPill } from "../shared/EntityPill";
import { resolveRelationshipField } from "../../utils/inheritance";
import type { MetadataField, RelationshipMetadataField } from "../../data/metadata";

/** One row of an entity's record: a label and whatever renders as its value.
 *
 *  Scalar properties and link-only connections are BOTH this — a connection that
 *  inherits nothing is just a property whose value happens to be an entity. Making
 *  them one type is what lets the drawer and the main view render one record
 *  instead of a table plus a stack of near-empty cards. */
export interface MetadataItem {
  id: string;
  label: string;
  content: ReactNode;
  /** A paragraph: it gets its own titled card, not a value cell. */
  long: boolean;
}

export function isLongField(f: MetadataField): boolean {
  return f.type === "multiline" || (f.value?.length ?? 0) > 100;
}

export function fieldItem(f: MetadataField): MetadataItem {
  const long = isLongField(f);
  return {
    id: f.id,
    label: f.label,
    long,
    content:
      f.type === "country" ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="leading-none">{f.flag}</span>
          <span className="font-medium">{f.value}</span>
        </span>
      ) : f.type === "link" ? (
        <span className="inline-flex items-center gap-1">
          <span className="font-medium underline">{f.value}</span>
          <ExternalLink size={10} className="text-ink-muted shrink-0" />
        </span>
      ) : long ? (
        <p className="text-sm text-ink leading-relaxed">{f.value}</p>
      ) : (
        <span className="font-medium leading-snug">{f.value}</span>
      ),
  };
}

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

/** A link-only connection as a record row.
 *
 *  It used to be a whole bordered card: a title, a caption reading "via Mecanismo
 *  · linked" under a heading already saying Mecanismo, and one pill. An entity
 *  with two dates and four links rendered as four near-empty boxes.
 *
 *  Connections that DO inherit keep their card — they carry a table (entities ×
 *  inherited columns), provenance trails and rollups, which is real content. */
export function connectionItem(field: RelationshipMetadataField): MetadataItem {
  return {
    id: field.id,
    label: field.label,
    long: false,
    content: <ConnectionPills field={field} />,
  };
}
