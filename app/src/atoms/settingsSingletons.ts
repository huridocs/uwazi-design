import { atom } from "jotai";
import type { Corpus } from "../data/entityChanges";
import { seedFilterConfig, templatePropertiesByTemplate } from "../data/settings";
import {
  cejilCollection,
  cejilFilterGroups,
  cejilFilterRows,
  cejilPropertyFilterRows,
} from "../data/cejil/settingsAdapt";
import { createSettingsSingleton } from "./settingsCollection";

/** The settings domains that are one value per corpus: Collection, Global
 *  CSS & JS and Filters. Each page edits a draft of its value and saves it
 *  here; readers outside Settings read the value, never the seed. */

const isString = (v: unknown) => typeof v === "string";
const arrayOf = (check: (x: Record<string, unknown>) => boolean) => (v: unknown) =>
  Array.isArray(v) && v.every((x) => !!x && typeof x === "object" && check(x as Record<string, unknown>));

/* ── Collection ─────────────────────────────────────────────────────────── */

export type DefaultLibraryView = "cards" | "table" | "map";
const VIEWS: DefaultLibraryView[] = ["cards", "table", "map"];

export interface CollectionSettings extends Record<string, unknown> {
  name: string;
  landing: string;
  defaultView: DefaultLibraryView;
  privateInstance: boolean;
  cookiePolicy: boolean;
  publicSharing: boolean;
}

export const collectionSettings = createSettingsSingleton<CollectionSettings>({
  name: "collection",
  seedOf: (corpus: Corpus) => ({
    name: corpus === "cejil" ? cejilCollection.name : "Inter-American Human Rights Archive",
    landing: "/library",
    defaultView: corpus === "cejil" && VIEWS.includes(cejilCollection.defaultView as DefaultLibraryView)
      ? (cejilCollection.defaultView as DefaultLibraryView)
      : "cards",
    privateInstance: false,
    cookiePolicy: true,
    publicSharing: true,
  }),
  isField: { defaultView: (v) => VIEWS.includes(v as DefaultLibraryView) },
});

/* ── Global CSS & JS ────────────────────────────────────────────────────── */

const SAMPLE_CSS = `/* Global CSS — applied across the public collection */
.home-banner {
  background: var(--bg-parchment);
}`;

const SAMPLE_JS = `// Global JS — runs on every public page
console.log('Collection loaded');`;

export interface CustomisationSettings extends Record<string, unknown> {
  css: string;
  js: string;
}

export const customisationSettings = createSettingsSingleton<CustomisationSettings>({
  name: "customisation",
  seedOf: () => ({ css: SAMPLE_CSS, js: SAMPLE_JS }),
});

/* ── Filters ────────────────────────────────────────────────────────────── */

export interface FilterGroup {
  id: string;
  name: string;
}
export interface FilterRow {
  templateId: string;
  active: boolean;
  /** "" = ungrouped */
  groupId: string;
}
/** A filterable property. Properties are never grouped: groups exist to nest
 *  entity types (CEJIL's "Documentos"). */
export interface PropertyFilterRow {
  propertyId: string;
  active: boolean;
}
export interface FilterSettings extends Record<string, unknown> {
  groups: FilterGroup[];
  rows: FilterRow[];
  propertyRows: PropertyFilterRow[];
}

/** The Sample's filterable properties: one per label across its templates.
 *  They are not backed by a thesaurus, so they have no value count. */
export const sampleFilterProperties = Object.values(templatePropertiesByTemplate)
  .flat()
  .filter((p) => p.filterable)
  .filter((p, i, all) => all.findIndex((q) => q.label === p.label) === i);

export const filterSettings = createSettingsSingleton<FilterSettings>({
  name: "filters",
  seedOf: (corpus: Corpus) =>
    corpus === "cejil"
      ? { groups: cejilFilterGroups, rows: cejilFilterRows, propertyRows: cejilPropertyFilterRows }
      : {
          groups: [],
          rows: seedFilterConfig.map((f) => ({ templateId: f.templateId, active: f.active, groupId: "" })),
          propertyRows: sampleFilterProperties.map((p) => ({ propertyId: p.id, active: true })),
        },
  isField: {
    groups: arrayOf((g) => isString(g.id) && isString(g.name)),
    rows: arrayOf((r) => isString(r.templateId) && typeof r.active === "boolean" && isString(r.groupId)),
    propertyRows: arrayOf((r) => isString(r.propertyId) && typeof r.active === "boolean"),
  },
});

/** What the Library's Template facet shows, from the saved Filters: active
 *  templates only, in the saved order, nested in their groups. A group sits
 *  where its first member does; an empty group is not shown. */
export type TemplateFacetNode =
  | { kind: "template"; id: string }
  | { kind: "group"; id: string; name: string; ids: string[] };

export const libraryTemplateFacetsAtom = atom<TemplateFacetNode[]>((get) => {
  const { groups, rows } = get(filterSettings.valueAtom);
  const names = new Map(groups.map((g) => [g.id, g.name]));
  const out: TemplateFacetNode[] = [];
  const placed = new Map<string, { kind: "group"; id: string; name: string; ids: string[] }>();
  for (const r of rows) {
    if (!r.active) continue;
    if (!r.groupId || !names.has(r.groupId)) {
      out.push({ kind: "template", id: r.templateId });
      continue;
    }
    let g = placed.get(r.groupId);
    if (!g) {
      g = { kind: "group", id: r.groupId, name: names.get(r.groupId) || "Untitled group", ids: [] };
      placed.set(r.groupId, g);
      out.push(g);
    }
    g.ids.push(r.templateId);
  }
  return out;
});
