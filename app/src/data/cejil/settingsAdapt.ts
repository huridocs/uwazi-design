// Adapts CEJIL templates / thesauri / relation types / languages into the
// prototype's Settings shapes, so the Settings pages show the real CEJIL config
// when the data source is CEJIL. Ids are Mongo _ids (never collide with mock
// ids), so editor lookups can merge both maps without a source flag.
import type {
  SettingsTemplate,
  TemplateProperty,
  PropertyType,
  SettingsThesaurus,
  SettingsRelationType,
  SettingsLanguage,
} from "../settings";
import { cejilTemplates } from "./templates";
import { cejilThesauri } from "./thesauri";
import { cejilRelationTypes } from "./relationTypes";
import { cejilEntities } from "./entities";
import { cejilRelationships } from "./relationships";
import { cejilSettings } from "./settings";
import { cejilTypeById } from "./typesAdapter";

function ptype(t: string): PropertyType {
  switch (t) {
    case "relationship": return "relationship";
    case "date":
    case "datasection":
    case "multidate":
    case "daterange": return "date";
    case "select":
    case "multiselect": return "select";
    case "markdown": return "markdown";
    case "numeric": return "numeric";
    case "geolocation": return "geolocation";
    case "image": return "image";
    default: return "text";
  }
}

// entity count per template (es docs) + relationship usage per relation type
const entityCountByTpl: Record<string, number> = {};
for (const e of cejilEntities) if (e.language === "es") entityCountByTpl[e.template] = (entityCountByTpl[e.template] ?? 0) + 1;
const usageByType: Record<string, number> = {};
for (const r of cejilRelationships) if (r.type) usageByType[r.type] = (usageByType[r.type] ?? 0) + 1;

export const cejilSettingsTemplates: SettingsTemplate[] = cejilTemplates.map((t) => ({
  id: t._id,
  name: t.name.trim(),
  color: cejilTypeById.get(t._id)?.color ?? "#6B7280",
  propertyCount: (t.properties || []).length,
  entityCount: entityCountByTpl[t._id] ?? 0,
  isDefault: !!t.default,
}));

export const cejilTemplateProperties: Record<string, TemplateProperty[]> = Object.fromEntries(
  cejilTemplates.map((t) => [
    t._id,
    [...(t.commonProperties || []), ...(t.properties || [])].map((p) => ({
      id: `${t._id}-${p.name}`,
      label: p.label,
      type: ptype(p.type),
      required: false,
      filterable: false,
    })),
  ]),
);

export const cejilSettingsThesauri: SettingsThesaurus[] = cejilThesauri.map((d) => ({
  id: d._id,
  name: d.name,
  itemCount: (d.values || []).length,
}));

export const cejilThesaurusItems: Record<string, string[]> = Object.fromEntries(
  cejilThesauri.map((d) => [d._id, (d.values || []).map((v) => v.label)]),
);

export const cejilSettingsRelationTypes: SettingsRelationType[] = cejilRelationTypes.map((r) => ({
  id: r._id,
  name: r.name,
  usageCount: usageByType[r._id] ?? 0,
}));

export const cejilSettingsLanguages: SettingsLanguage[] = cejilSettings.languages.map((l) => ({
  key: l.key,
  label: l.label,
  localizedLabel: l.label,
  ltr: l.key !== "ar",
  default: l.default,
  translationsCount: 100,
}));

export const cejilCollection = {
  name: cejilSettings.siteName,
  defaultView: cejilSettings.defaultLibraryView,
  dateFormat: cejilSettings.dateFormat,
};
