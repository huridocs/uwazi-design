import type { Language } from "../atoms/language";
import { getEntity } from "../data/entities";
import { getEntityProp } from "../data/entityMetadata";
import { relationTypes, type RelationType } from "../data/references";
import type { RelationshipMetadataField } from "../data/metadata";

const relationLabelById = new Map(relationTypes.map((r) => [r.id, r.label]));
/** Human label for a relation type id (falls back to the raw id). */
export function relationLabel(type: RelationType): string {
  return relationLabelById.get(type) ?? type;
}

/** One connected entity + the value it contributes to a relationship field. */
export interface InheritedValue {
  entityId: string;
  entityTitle: string;
  entityTypeId: string;
  /** The inherited native value, or undefined when the source has none. */
  inheritedValue?: string;
  /** Provenance: the inherited property's display label. */
  sourcePropLabel?: string;
}

export interface ResolvedRelationshipField {
  field: RelationshipMetadataField;
  relationLabel: string;
  values: InheritedValue[];
}

/** Resolve a single relationship field → its connected entities + inherited values. */
export function resolveRelationshipField(
  field: RelationshipMetadataField,
  lang: Language,
): ResolvedRelationshipField {
  const values: InheritedValue[] = field.connectedEntityIds.map((id) => {
    const entity = getEntity(id);
    return {
      entityId: id,
      entityTitle: entity?.title ?? "Unknown entity",
      entityTypeId: entity?.typeId ?? field.targetTypeId,
      inheritedValue: field.inheritProperty ? getEntityProp(id, field.inheritProperty, lang) : undefined,
      sourcePropLabel: field.inheritLabel,
    };
  });
  return { field, relationLabel: relationLabel(field.relationType), values };
}

/* ── Multi-inheritance grouping ── */

export interface ConnectionColumn {
  fieldId: string;
  label: string;
  inheritProperty?: string;
}
export interface ConnectionRow {
  entityId: string;
  entityTitle: string;
  entityTypeId: string;
  cells: { fieldId: string; value?: string }[];
}
/** Several relationship fields sharing one connection (same relation + target),
 *  presented as a single table: one row per connected entity, one column per
 *  inherited property. */
export interface ConnectionGroup {
  connectionKey: string;
  /** The connection's display name — the primary field's label. */
  label: string;
  relationType: RelationType;
  relationLabel: string;
  targetTypeId: string;
  columns: ConnectionColumn[];
  fields: RelationshipMetadataField[];
  rows: ConnectionRow[];
}

export interface GroupedConnections {
  /** Shared connections (≥2 sibling fields) → grouped tables. */
  groups: ConnectionGroup[];
  /** Standalone relationship fields → their own cards. */
  singles: RelationshipMetadataField[];
}

/** Partition relationship fields: those sharing a `connectionKey` collapse into
 *  one `ConnectionGroup`; everything else is a standalone field. */
export function groupConnections(
  relFields: RelationshipMetadataField[],
  lang: Language,
): GroupedConnections {
  const byKey = new Map<string, RelationshipMetadataField[]>();
  const singles: RelationshipMetadataField[] = [];

  for (const f of relFields) {
    if (!f.connectionKey) {
      singles.push(f);
      continue;
    }
    const arr = byKey.get(f.connectionKey) ?? [];
    arr.push(f);
    byKey.set(f.connectionKey, arr);
  }

  const groups: ConnectionGroup[] = [];
  for (const [key, fields] of byKey) {
    if (fields.length < 2) {
      // A lone keyed field behaves like a standalone field.
      singles.push(...fields);
      continue;
    }
    const primary = fields[0];

    // Union of connected entity ids, preserving first-seen order.
    const ids: string[] = [];
    for (const f of fields) for (const id of f.connectedEntityIds) if (!ids.includes(id)) ids.push(id);

    const columns: ConnectionColumn[] = fields
      .filter((f) => f.inheritProperty)
      .map((f) => ({ fieldId: f.id, label: f.inheritLabel ?? f.label, inheritProperty: f.inheritProperty }));

    const rows: ConnectionRow[] = ids.map((id) => {
      const entity = getEntity(id);
      return {
        entityId: id,
        entityTitle: entity?.title ?? "Unknown entity",
        entityTypeId: entity?.typeId ?? primary.targetTypeId,
        cells: columns.map((c) => ({
          fieldId: c.fieldId,
          value: c.inheritProperty ? getEntityProp(id, c.inheritProperty, lang) : undefined,
        })),
      };
    });

    groups.push({
      connectionKey: key,
      label: primary.label,
      relationType: primary.relationType,
      relationLabel: relationLabel(primary.relationType),
      targetTypeId: primary.targetTypeId,
      columns,
      fields,
      rows,
    });
  }

  return { groups, singles };
}
