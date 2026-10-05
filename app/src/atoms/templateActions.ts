import { atom } from "jotai";
import type { Corpus } from "../data/entityChanges";
import type { TemplateDef } from "../data/templates/types";
import { templateStore, templatesAtom } from "./templates";
import { filterSettings } from "./settingsSingletons";
import { cejilReadyAtom, dataSourceAtom, libraryEntitiesAtom, travesiaReadyAtom } from "./dataSource";
import { cejilEntityCountByTemplate } from "../data/cejil/aggregates";
import { DEFAULT_LIBRARY_SORT, libraryInheritedFiltersAtom, librarySortAtom, libraryTypeFiltersAtom } from "./library";
import { libraryInheritedDefs } from "../utils/libraryFacets";
import { templatesMirror } from "../data/templates/mirror";

/** Settings › Templates' writes (step M8). Each is one store action, so a
 *  bulk delete is all or nothing (Uwazi sends one request per template and
 *  keeps the ones that went through). They also keep the stores that point
 *  at templates in step: the Filters list, and the Library's facet and sort
 *  state, which must not hold a filter the templates no longer offer. */

/** The Library's facet selections and sort, after a template change: a
 *  selection on a property facet that is gone, a type filter on a deleted
 *  template, and a sort on a property that no longer sorts are dropped. Only
 *  the collection the Library shows holds them. */
const reconcileLibraryAtom = atom(null, (get, set, corpus: Corpus) => {
  if (get(dataSourceAtom) !== corpus) return;
  const facets = new Set(libraryInheritedDefs(corpus, "EN").map((d) => d.propId));
  set(libraryInheritedFiltersAtom, (prev) => {
    const kept = Object.entries(prev).filter(([k]) => facets.has(k));
    return kept.length === Object.keys(prev).length ? prev : Object.fromEntries(kept);
  });
  const ids = new Set(templatesMirror(corpus).map((t) => t.id));
  set(libraryTypeFiltersAtom, (prev) => {
    const kept = Object.entries(prev).filter(([k]) => ids.has(k));
    return kept.length === Object.keys(prev).length ? prev : Object.fromEntries(kept);
  });
  const sort = get(librarySortAtom);
  if (sort.startsWith("prop:")) {
    const name = sort.slice(5);
    const sorts = templatesMirror(corpus).some((t) => t.properties.some((p) => p.name === name && p.prioritySorting));
    if (!sorts) set(librarySortAtom, DEFAULT_LIBRARY_SORT);
  }
});

/** Create (`isNew`) or replace a template. Returns its id. A new template is
 *  listed in Filters, shown, as an empty `settings.filters` lists every
 *  template in Uwazi. */
export const saveTemplateAtom = atom(
  null,
  (get, set, { corpus, template, isNew }: { corpus: Corpus; template: TemplateDef; isNew: boolean }): string => {
    const { id: draftId, ...fields } = template;
    let id = draftId;
    if (isNew) {
      id = set(templateStore.createAtom, { value: { ...fields, isDefault: false }, corpus });
      const filters = get(filterSettings.valueOfAtom(corpus));
      set(filterSettings.saveAtom, {
        corpus,
        value: { ...filters, rows: [...filters.rows, { templateId: id, active: true, groupId: "" }] },
      });
    } else set(templateStore.patchAtom, { id, patch: fields, corpus });
    set(reconcileLibraryAtom, corpus);
    return id;
  },
);

/** What deleting templates also changes: the relationship properties in
 *  other templates that target them (Uwazi removes those), and their Filters
 *  entries. */
export interface TemplateDeleteCascade {
  /** "Template › Property" for each relationship property removed. */
  properties: { templateName: string; label: string }[];
  /** Names of the deleted templates that have a Filters entry. */
  filters: string[];
}

export function templateDeleteCascade(
  templates: TemplateDef[],
  filterRows: { templateId: string }[],
  ids: string[],
): TemplateDeleteCascade {
  const gone = new Set(ids);
  const properties = templates
    .filter((t) => !gone.has(t.id))
    .flatMap((t) =>
      t.properties
        .filter((p) => p.type === "relationship" && !!p.content && gone.has(p.content))
        .map((p) => ({ templateName: t.name, label: p.label })),
    );
  const names = new Map(templates.map((t) => [t.id, t.name]));
  const filters = filterRows.filter((r) => gone.has(r.templateId)).map((r) => names.get(r.templateId) ?? r.templateId);
  return { properties, filters };
}

/** Delete templates, all in one step: their Filters entries go, and other
 *  templates lose the relationship properties that target them. The caller
 *  has already refused the default template and templates in use. */
export const deleteTemplatesAtom = atom(null, (get, set, { corpus, ids }: { corpus: Corpus; ids: string[] }) => {
  const gone = new Set(ids);
  for (const t of get(templatesAtom(corpus))) {
    if (gone.has(t.id)) continue;
    const kept = t.properties.filter((p) => !(p.type === "relationship" && !!p.content && gone.has(p.content)));
    if (kept.length !== t.properties.length) set(templateStore.patchAtom, { id: t.id, patch: { properties: kept }, corpus });
  }
  for (const id of ids) set(templateStore.deleteAtom, { id, corpus });
  const filters = get(filterSettings.valueOfAtom(corpus));
  const rows = filters.rows.filter((r) => !gone.has(r.templateId));
  if (rows.length !== filters.rows.length) set(filterSettings.saveAtom, { corpus, value: { ...filters, rows } });
  set(reconcileLibraryAtom, corpus);
});

/** Make one template the default: exactly one holds the flag at any time. */
export const setDefaultTemplateAtom = atom(null, (get, set, { corpus, id }: { corpus: Corpus; id: string }) => {
  for (const t of get(templatesAtom(corpus)))
    if (t.isDefault !== (t.id === id)) set(templateStore.patchAtom, { id: t.id, patch: { isDefault: t.id === id }, corpus });
});

/** Entities per template for the collection shown, and whether the count is
 *  known. CEJIL's and Travesía's records load lazily (CEJIL's are 26 MB): until
 *  they are in, CEJIL shows its import's counts, Travesía none, and `known` is
 *  false, so no delete or impact line may treat a template as unused. */
export const templateEntityCountsAtom = atom((get) => {
  const corpus = get(dataSourceAtom);
  const loaded =
    corpus === "cejil" ? get(cejilReadyAtom) : corpus === "travesia" ? get(travesiaReadyAtom) : true;
  if (!loaded)
    return {
      known: false,
      count: (id: string): number | null => (corpus === "cejil" ? (cejilEntityCountByTemplate[id] ?? 0) : null),
    };
  const counts = new Map<string, number>();
  for (const e of get(libraryEntitiesAtom)) counts.set(e.typeId, (counts.get(e.typeId) ?? 0) + 1);
  return { known: true, count: (id: string): number | null => counts.get(id) ?? 0 };
});
