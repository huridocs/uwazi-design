/* A's starters: a site type's home page, compiled to the page HTML Uwazi takes
 * today. Only existing components — a proposed one would preview as if it were
 * real, and Uwazi would show it as an error once saved. */
import {
  SITE_LANGS,
  compileBlocks,
  compileTheme,
  emptyLocale,
  type BlockDoc,
  type CodeDoc,
  type CodeLocales,
  type SiteLang,
} from "../../../../data/sitePages";
import type { SiteEntity } from "../../../../utils/sitePageRender";

export function codeDocFrom(
  doc: BlockDoc,
  entities: SiteEntity[],
  { langs = SITE_LANGS.map((l) => l.key), published = false }: { langs?: SiteLang[]; published?: boolean } = {},
): CodeDoc {
  const byId = new Map(entities.map((e) => [e.id, e.title]));
  const titleOf = (id: string) => byId.get(id) ?? id;
  const css = compileTheme(doc.theme);
  const draft = Object.fromEntries(
    SITE_LANGS.map(({ key }) => [
      key,
      langs.includes(key)
        ? {
            title: doc.title[key] || doc.title.en,
            html: compileBlocks(doc.home, key, titleOf, { existingOnly: true }),
            css,
            js: "",
          }
        : emptyLocale(),
    ]),
  ) as CodeLocales;
  return { draft, published: published ? draft : null };
}

/** The collection's most connected entities of its main template. */
export function seedDataFrom(entities: SiteEntity[], main: string) {
  const topMain = entities
    .filter((e) => e.typeId === main)
    .sort((a, b) => (b.links ?? 0) - (a.links ?? 0))
    .slice(0, 6)
    .map((e) => e.id);
  return {
    main,
    topMain,
    withImages: [],
    mentions: topMain.length >= 2 ? ([topMain[0], topMain[1]] as [string, string]) : null,
  };
}
