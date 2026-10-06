// Adapts CEJIL templates / thesauri / relation types / languages into the
// prototype's Settings shapes, so the Settings pages show the real CEJIL config
// when the data source is CEJIL. Ids are Mongo _ids (never collide with mock
// ids), so editor lookups can merge both maps without a source flag.
import type {
  SettingsThesaurus,
  ThesaurusValue,
  SettingsLanguage,
  SettingsMenuLink,
  SettingsPage,
} from "../settings";
import { cejilTemplates } from "./templates";
import { cejilThesauri } from "./thesauri";
import { cejilEntityCountByTemplate, cejilStats } from "./aggregates";
import { cejilSettings } from "./settings";
import { cejilMenu } from "./menu";
import { cejilPages } from "./pages";
import { cejilTypeById } from "./typesAdapter";

// entity count per template (es docs) — baked into aggregates.ts by the
// importer, so Settings never loads the corpus.
const entityCountByTpl = cejilEntityCountByTemplate;

export const cejilSettingsThesauri: SettingsThesaurus[] = cejilThesauri.map((d) => ({
  id: d._id,
  name: d.name,
  // Groups count as items alongside their children (the editor counts the same way).
  itemCount: (d.values || []).reduce((n, v) => n + 1 + (v.values?.length ?? 0), 0),
}));

/** CEJIL thesaurus values in the prototype's nested shape. Nesting survives the
 *  adapt: a dump value carrying `values` stays a group (one level, as Uwazi). */
export const cejilThesaurusValues: Record<string, ThesaurusValue[]> = Object.fromEntries(
  cejilThesauri.map((d) => [
    d._id,
    (d.values || []).map((v) => ({
      id: v.id,
      label: v.label,
      ...(v.values ? { values: v.values.map((c) => ({ id: c.id, label: c.label })) } : {}),
    })),
  ]),
);

export const cejilSettingsLanguages: SettingsLanguage[] = cejilSettings.languages.map((l) => ({
  key: l.key,
  label: l.label,
  localizedLabel: l.label,
  ltr: l.key !== "ar",
  default: l.default,
  translationsCount: 100,
}));

export const cejilSettingsMenu: SettingsMenuLink[] = cejilMenu.map((m) => ({
  id: m.id,
  title: m.title,
  url: m.url,
  type: m.type,
}));

export const cejilSettingsPages: SettingsPage[] = cejilPages.map((p) => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  published: p.published,
}));

export const cejilCollection = {
  name: cejilSettings.siteName,
  defaultView: cejilSettings.defaultLibraryView,
  dateFormat: cejilSettings.dateFormat,
};

// --- Filters page: the real summa.cejil.org library filter config ----------
// `cejilSettings.filters` is the curated sidebar config (top-level templates +
// the expandable "Documentos" group). Mapped onto the Filters page's grouped
// row model: a node with `items` becomes a FilterGroup, its children become
// rows assigned to it; bare nodes are ungrouped. All are active (configured).
const cejilFilterGroupIndex = cejilSettings.filters
  .map((n, i) => ({ node: n, gid: `cejil-grp-${i}` }))
  .filter((x) => x.node.items);

export const cejilFilterGroups = cejilFilterGroupIndex.map((x) => ({
  id: x.gid,
  name: x.node.name,
}));

export const cejilFilterRows = cejilSettings.filters.flatMap((n, i) => {
  if (!n.items) return [{ templateId: n.id!, active: true, groupId: "" }];
  const gid = `cejil-grp-${i}`;
  return n.items.map((c) => ({ templateId: c.id!, active: true, groupId: gid }));
});

/** name / colour / entity-count for every CEJIL template, by id — drives the
 *  Filters page row rendering when the source is CEJIL. */
export const cejilFilterMeta: Record<string, { name: string; color: string; count: number }> =
  Object.fromEntries(
    cejilTemplates.map((t) => [
      t._id,
      { name: t.name.trim(), color: cejilTypeById.get(t._id)?.color ?? "#6B7280", count: entityCountByTpl[t._id] ?? 0 },
    ]),
  );

// --- Dashboard: source-aware headline stats --------------------------------
export const cejilDashboardStats = {
  entities: cejilStats.entities,
  connections: cejilStats.relationships,
  templates: cejilStats.templates,
  languages: cejilStats.languages,
};
