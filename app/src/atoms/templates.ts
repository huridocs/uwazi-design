import { atom, getDefaultStore } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Corpus } from "../data/entityOverlay";
import type { EntityType } from "../data/entities";
import type { TemplateDef } from "../data/templates/types";
import { registerTemplateReader, TEMPLATE_SEEDS, templateMirror, templatesMirror } from "../data/templates/mirror";
import { createSettingsCollection, hasId } from "./settingsCollection";

/** Templates: one store per corpus, the schema an entity's form, record,
 *  cards, columns and filters render (template-schema-spec.md §3). Seed plus
 *  the session's overlay, as every settings store (`createSettingsCollection`).
 *  A save replaces the whole template, as Uwazi's editor saves a whole
 *  template; there is no partial patch.
 *
 *  Settings › Templates writes it (step M8) through `templateStore`; the
 *  actions that also touch other stores (filters, the Library's type
 *  filters) are in `atoms/templateActions.ts`. The type lists
 *  (`entityTypesAtom`, `libraryTypesAtom`, `corpusTypes`) are projections of
 *  it. */


const isTemplate = (r: unknown): boolean => {
  if (!hasId(r)) return false;
  const t = r as Partial<TemplateDef>;
  return (
    typeof t.name === "string" &&
    typeof t.color === "string" &&
    Array.isArray(t.properties) &&
    Array.isArray(t.commonProperties) &&
    [...t.properties, ...t.commonProperties].every(
      (p) => !!p && typeof p.id === "string" && typeof p.name === "string" && typeof p.type === "string",
    )
  );
};

const templates = createSettingsCollection<TemplateDef>({
  name: "templates",
  idPrefix: "tpl",
  seedOf: (scope) => TEMPLATE_SEEDS[scope as Corpus]?.() ?? [],
  corpusScoped: true,
  isRecord: isTemplate,
});

/** The store's write atoms (create, patch, delete, restore), for
 *  `atoms/templateActions.ts`. */
export const templateStore = templates;

/** A corpus's templates, seed plus the session's changes. */
export const templatesAtom = templates.listOfAtom as (corpus: Corpus) => ReturnType<typeof templates.listOfAtom>;

/** One template, by corpus and id: `${corpus}|${id}`. */
export const templateAtom = atomFamily((key: string) =>
  atom((get) => {
    const [corpus, id] = key.split("|") as [Corpus, string];
    return get(templatesAtom(corpus)).find((t) => t.id === id);
  }),
);

/** A corpus's templates as the type list (`{id, name, color}`) the Library,
 *  pills and pickers read. Cached per list, so a reader keyed on identity
 *  (facets, filter memos) sees a new array only when the templates change. */
const typesCache = new WeakMap<TemplateDef[], EntityType[]>();
const projectTypes = (list: TemplateDef[]): EntityType[] => {
  let out = typesCache.get(list);
  if (!out) {
    out = list.map((t) => ({ id: t.id, name: t.name, color: t.color }));
    typesCache.set(list, out);
  }
  return out;
};
export const templateTypesAtom = atomFamily((corpus: Corpus) =>
  atom<EntityType[]>((get) => projectTypes(get(templatesAtom(corpus)))),
);

/* ── The mirror ───────────────────────────────────────────────────────────
   Code outside React (profiles, `templateFields`, the projection) reads
   templates through these, from the app's one store: the same value the atoms
   hold, kept in step by the store's one write path. */

registerTemplateReader((corpus) => getDefaultStore().get(templatesAtom(corpus)));
export { templatesMirror, templateMirror };

/** A corpus's type list, outside React. */
export const templateTypesMirror = (corpus: Corpus): EntityType[] => getDefaultStore().get(templateTypesAtom(corpus));
