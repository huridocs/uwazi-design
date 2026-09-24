// The Travesía record in depth: every template property the entity holds, in
// template order, as the record and the edit form read it. The corpus is
// Spanish-only (as CEJIL's labels are), so the four reading languages share one
// field list rather than dressing a monolingual record as a translated one.
import type { Language } from "../../atoms/language";
import type { AnyMetadataField, MetadataField, RelationshipMetadataField } from "../metadata";
import type { EntityProfile } from "../entityProfiles";
import type { Reference } from "../references";
import { registerEntityPropReader } from "../entityMetadata";
import { formatPlace } from "../../utils/geoFormat";
import { travesiaRelTypeName, travesiaTemplateById } from "./schema";
import { travesiaEntity, travesiaRelsByEntity } from "./load";
import { displayValues, fmtDay, latLngOf, portraitOf } from "./adapt";
import type { TravesiaEntity, TravesiaProperty } from "./types";

export { isTravesiaEntity } from "./load";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** A property's scalar field, or nothing when the entity holds no value. */
function scalarField(p: TravesiaProperty, e: TravesiaEntity): MetadataField | undefined {
  const vals = e.metadata[p.name];
  if (!vals?.length) return undefined;
  const base = { id: p.name, label: p.label };
  switch (p.type) {
    case "select":
    case "multiselect": {
      const labels = vals.map((v) => v.label ?? "").filter(Boolean);
      if (!labels.length) return undefined;
      return {
        ...base,
        type: p.type,
        ...(p.content ? { thesaurus: p.content } : {}),
        value: labels.join(", "),
        valueIds: vals.map((v) => String(v.value)),
        ...(p.type === "multiselect" ? { values: labels } : {}),
      };
    }
    case "date": {
      const value = fmtDay(vals[0].value);
      return value ? { ...base, type: "date", value } : undefined;
    }
    case "daterange":
    case "multidaterange": {
      const value = displayValues(p, vals).join(" · ");
      return value ? { ...base, type: "text", value, ...(p.type === "multidaterange" ? { list: true } : {}) } : undefined;
    }
    case "markdown": {
      const value = displayValues(p, vals).join("\n\n");
      return value ? { ...base, type: "multiline", value } : undefined;
    }
    case "link": {
      const value = (vals[0].value as { url?: string } | undefined)?.url;
      return value ? { ...base, type: "link", value } : undefined;
    }
    case "geolocation": {
      const c = latLngOf(vals[0].value);
      const name = (vals[0].value as { label?: string } | undefined)?.label;
      return c ? { ...base, type: "text", value: formatPlace(c, name) } : undefined;
    }
    case "image":
      return undefined; // the record's image card (`profile.image`)
    default: {
      const value = displayValues(p, vals).join(", ");
      return value ? { ...base, type: "text", value } : undefined;
    }
  }
}

/** A relationship property as the record's connection field. The properties
 *  that ride ONE connection — the link and the values it inherits ("PMRS /
 *  Nombre", "PMRS / NURMAH", "PMRS / Género"…) — share a `connectionKey`, so the
 *  record draws them as one table: the connected entities once, a column per
 *  inherited value. Read-only, as CEJIL's are: the connections are the
 *  corpus's, and inherited values are derived. */
function relationshipField(p: TravesiaProperty, e: TravesiaEntity): RelationshipMetadataField | undefined {
  const ids = (e.metadata[p.name] ?? []).map((v) => String(v.value));
  if (!ids.length) return undefined;
  const target = p.content ? travesiaTemplateById.get(p.content) : undefined;
  const source = p.inherit && target?.properties.find((x) => x._id === p.inherit!.property);
  return {
    id: p.name,
    label: p.label,
    type: "relationship",
    relationType: travesiaRelTypeName.get(p.relationType ?? "") ?? "",
    targetTypeId: p.content ?? "",
    connectedEntityIds: ids,
    connectionKey: `${p.relationType}:${p.content}`,
    ...(source ? { inheritProperty: source.name, inheritLabel: p.label } : {}),
    ...(target ? { entityLabel: target.name } : {}),
    readOnly: true,
  };
}

export function buildTravesiaProfile(id: string): EntityProfile {
  const e = travesiaEntity(id)!;
  const tpl = travesiaTemplateById.get(e.template)!;
  const fields: AnyMetadataField[] = [];
  for (const p of tpl.properties) {
    const f = p.type === "relationship" ? relationshipField(p, e) : scalarField(p, e);
    if (f) fields.push(f);
  }
  const image = portraitOf(e);
  // The portrait as the entity's one file, as the artworks corpus does with its
  // paintings: the record draws a single picture through the Files tab, not as
  // a card of its own. Not a document — `hasDocument` stays false.
  const groupId = `g-trv-${id}`;
  return {
    id,
    typeId: e.template,
    hasDocument: false,
    ...(image ? { image, images: [image] } : {}),
    metadata: LANGS.reduce((acc, l) => ((acc[l] = fields), acc), {} as Record<Language, AnyMetadataField[]>),
    documentGroups: image ? [{ id: groupId, title: image.alt, isPrimary: true, order: 0 }] : [],
    files: image
      ? [
          {
            id: `f-trv-${id}`,
            groupId,
            name: image.filename ?? `${id}.svg`,
            language: "ES",
            type: "image",
            size: `${Math.max(1, Math.round(image.url.length / 1024))} KB`,
            // Taken at intake: the record's own creation day.
            modified: new Date(e.creationDate).toISOString().slice(0, 10),
            url: image.url,
          },
        ]
      : [],
    relationships: { kind: "references" },
  };
}

/** An inherited column's value: one native property of a Travesía entity, as
 *  display text. Registered with `getEntityProp`, which the inheritance
 *  resolver reads — the same property, the same words, the record shows. */
registerEntityPropReader((entityId, propName) => {
  const e = travesiaEntity(entityId);
  if (!e) return undefined;
  const p = travesiaTemplateById.get(e.template)?.properties.find((x) => x.name === propName);
  if (!p) return undefined;
  const values = displayValues(p, e.metadata[p.name]);
  return values.length ? values.join(", ") : undefined;
});

/** This entity's connections — both directions — as the Relationships tab's
 *  references. Read-only. */
export function travesiaReferencesFor(id: string): Reference[] {
  return (travesiaRelsByEntity().get(id) ?? []).map((r, i) => {
    const outgoing = r.from === id;
    return {
      id: `trv-${i}-${r.from}-${r.to}-${r.relationType}`,
      sourceEntityId: id,
      targetEntityId: outgoing ? r.to : r.from,
      relationType: r.typeName || "related",
      direction: outgoing ? ("outgoing" as const) : ("incoming" as const),
      createdAt: "",
    };
  });
}

/** A template's fields, empty and in template order — Create entity's form.
 *  Relationship, image and geolocation properties have no scalar editor here
 *  (as in CEJIL's `cejilBlankFields`). */
export function travesiaBlankFields(templateId: string): MetadataField[] {
  const out: MetadataField[] = [];
  for (const p of travesiaTemplateById.get(templateId)?.properties ?? []) {
    if (p.type === "relationship" || p.type === "image" || p.type === "geolocation") continue;
    const base = { id: p.name, label: p.label, value: "" };
    if ((p.type === "select" || p.type === "multiselect") && p.content) {
      out.push({ ...base, type: p.type, thesaurus: p.content, ...(p.type === "multiselect" ? { values: [] } : {}) });
    } else if (p.type === "date") {
      out.push({ ...base, type: "date" });
    } else if (p.type === "markdown") {
      out.push({ ...base, type: "multiline" });
    } else if (p.type === "link") {
      out.push({ ...base, type: "link" });
    } else {
      out.push({ ...base, type: "text", ...(p.type === "multidaterange" ? { list: true } : {}) });
    }
  }
  return out;
}
