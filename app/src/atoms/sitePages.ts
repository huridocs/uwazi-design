import { atom } from "jotai";
import type { CodeDoc, CodeLocales } from "../data/sitePages";
import { emptyLocale } from "../data/sitePages";
import { seedPages, type SettingsPage } from "../data/settings";
import { cejilSettingsPages } from "../data/cejil/settingsAdapt";
import { createSettingsCollection, hasId, registerSettingsReset } from "./settingsCollection";

/** Each page's code documents for the session, seeded on first open from the
 *  page's starter (see `PagesPage`). Mock only.
 *  @deprecated Superseded by `pagesStore`; kept until Pages reads the store. */
export const codeDocsAtom = atom<Record<string, CodeDoc>>({});
registerSettingsReset((set) => set(codeDocsAtom, {}));

/** One published release: a copy of every language's draft at Publish time,
 *  with the message typed in the Publish dialog. Restore copies it back. */
export interface PageRelease {
  id: string;
  message: string;
  /** epoch ms */
  at: number;
  locales: CodeLocales;
}

/** Settings › Pages: one record per page, holding its per-language draft, the
 *  published copy and its releases. The Pages list, the editor, the Uploads
 *  usage check and the Dashboard read this store, never a copy. The list's
 *  title is the default language's draft title. */
export interface SitePage {
  id: string;
  /** The URL's readable part (`/page/<id>/<slug>`), derived from the title
   *  at save. */
  slug: string;
  doc: CodeDoc;
  releases: PageRelease[];
}

const isPage = (r: unknown): boolean => {
  if (!hasId(r)) return false;
  const p = r as Partial<SitePage>;
  return typeof p.slug === "string" && !!p.doc && typeof p.doc === "object" && !!p.doc.draft && Array.isArray(p.releases);
};

const SEED_BODY: Record<string, { en: string; es: string }> = {
  about: {
    en: "<h1>About this collection</h1>\n<p>Case files, judgments and the people behind them, gathered by the Inter-American human rights system.</p>",
    es: "<h1>Acerca de esta colección</h1>\n<p>Expedientes, sentencias y las personas detrás de ellos, reunidos por el sistema interamericano de derechos humanos.</p>",
  },
  methodology: {
    en: "<h1>Methodology</h1>\n<p>How records are selected, described and linked.</p>",
    es: "<h1>Metodología</h1>\n<p>Cómo se seleccionan, describen y vinculan los registros.</p>",
  },
  partners: {
    en: "<h1>Partners</h1>\n<p>The organisations that contribute records.</p>",
    es: "<h1>Socios</h1>\n<p>Las organizaciones que aportan registros.</p>",
  },
  contact: {
    en: "<h1>Contact</h1>\n<p>Write to the collection's editors.</p>",
    es: "<h1>Contacto</h1>\n<p>Escriba a los editores de la colección.</p>",
  },
};
const ES_TITLE: Record<string, string> = {
  about: "Acerca de esta colección",
  methodology: "Metodología",
  partners: "Socios",
  contact: "Contacto",
};

export const slugify = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "page";

function seedPage(p: SettingsPage): SitePage {
  const body = SEED_BODY[p.slug];
  const draft: CodeLocales = {
    en: { ...emptyLocale(), title: p.title, html: body?.en ?? `<h1>${p.title}</h1>` },
    es: { ...emptyLocale(), title: ES_TITLE[p.slug] ?? p.title, html: body?.es ?? "" },
    fr: emptyLocale(),
    ar: emptyLocale(),
  };
  return {
    id: p.id,
    slug: slugify(p.title),
    doc: { draft, published: p.published ? draft : null },
    releases: p.published ? [{ id: `${p.id}-r1`, message: "Initial release", at: Date.UTC(2026, 5, 1, 9), locales: draft }] : [],
  };
}

export const pagesStore = createSettingsCollection<SitePage>({
  name: "pages",
  idPrefix: "p",
  seedOf: (scope) => (scope === "cejil" ? cejilSettingsPages : seedPages).map(seedPage),
  corpusScoped: true,
  isRecord: isPage,
});

export const sitePagesAtom = pagesStore.listAtom;

/** The page's title in the list: the English draft's, or "Untitled page". */
export const pageTitle = (p: SitePage) => p.doc.draft.en?.title?.trim() || "Untitled page";
