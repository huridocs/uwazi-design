/* Changing a site's type after it was created. The new type's site is built
 * on the same collection, then everything the person changed is carried over:
 * a text, block, page title, menu or theme that still matches what the old
 * type generated is taken from the new type instead; anything edited stays.
 * Languages, name, logo, footer, search and sharing, custom code and pages the
 * person added always stay. Blocks the new type has no place for are returned
 * in `removed`, so the builder can say so before anything changes. */
import type { Block, Page, SiteConfig, TemplateId } from "./config";
import { tr } from "./config";
import { BLOCKS } from "./blocks";
import { buildSite, type CollectionProfile } from "./templates";

export interface Removed {
  page: string;
  block: string;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function switchSiteType(current: SiteConfig, type: TemplateId, p: CollectionProfile): { config: SiteConfig; removed: Removed[] } {
  const next = buildSite(type, p);
  const was = buildSite(current.template, p);
  const t = (x: Page["title"]) => tr(x, current.defaultLanguage, current.defaultLanguage);
  const removed: Removed[] = [];
  const used = new Set<string>();

  const pages: Page[] = next.pages.map((np) => {
    const op = current.pages.find((q) => q.kind === np.kind && q.kind !== "custom" && !used.has(q.id));
    if (!op) return np;
    used.add(op.id);
    const gen = was.pages.find((q) => q.kind === np.kind);
    // A block still as the old type made it counts as not edited.
    const pristine = (b: Block) => !!gen?.blocks.some((g) => g.type === b.type && same(g.props, b.props) && !b.hidden);
    const pool = [...op.blocks];
    const blocks = np.blocks.map((nb) => {
      const i = pool.findIndex((b) => b.type === nb.type);
      if (i < 0) return nb;
      const [b] = pool.splice(i, 1);
      return pristine(b) ? { ...nb, id: b.id } : b;
    });
    for (const b of pool) removed.push({ page: t(op.title), block: BLOCKS[b.type].label });
    const titled = gen && same(gen.title, op.title);
    return { ...np, id: op.id, slug: op.slug, title: titled ? np.title : op.title, seo: op.seo, blocks };
  });
  // Pages the person added, or a second page of a kind, stay as they are.
  pages.push(...current.pages.filter((q) => !used.has(q.id)));

  // The menu: regenerated if untouched, else kept (its pages all still exist).
  const idFor = new Map(next.pages.map((np, i) => [np.id, pages[i].id]));
  const menuPristine = same(
    current.menu.map((m) => [m.label, current.pages.find((q) => q.id === m.page)?.kind ?? m.url]),
    was.menu.map((m) => [m.label, was.pages.find((q) => q.id === m.page)?.kind ?? m.url]),
  );
  const menu = menuPristine ? next.menu.map((m) => ({ ...m, page: m.page ? idFor.get(m.page) : undefined })) : current.menu;

  const themePristine = current.theme.accent === was.theme.accent && current.theme.fonts === was.theme.fonts;
  const theme = themePristine ? { ...current.theme, accent: next.theme.accent, fonts: next.theme.fonts } : current.theme;

  return {
    config: { ...current, template: type, theme, menu, pages },
    removed,
  };
}
