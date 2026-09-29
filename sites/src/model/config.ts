/* A site is ONE JSON document: this file's `SiteConfig`. The builder edits it,
 * the renderer draws it, Export to Uwazi compiles it. Nothing about a site
 * lives anywhere else. */
import type { CollectionId, Sort } from "../data/types";
import type { BlockStyle } from "./style";

export type Lang = string;
/** Per-language text. A missing key means "not translated yet"; readers fall
 *  back to the default language and the builder marks the gap. */
export type L10n = Partial<Record<Lang, string>>;

export const LANG_NAMES: Record<string, { name: string; native: string; rtl?: boolean }> = {
  en: { name: "English", native: "English" },
  es: { name: "Spanish", native: "Español" },
  fr: { name: "French", native: "Français" },
  ar: { name: "Arabic", native: "العربية", rtl: true },
  pt: { name: "Portuguese", native: "Português" },
};
export const isRtl = (l: Lang) => !!LANG_NAMES[l]?.rtl;

export interface ImageRef {
  /** A data: URL from an upload, or a path under the site's public folder. */
  src: string;
  alt: L10n;
  /** Focal point, 0–1 from the top-left. Crops keep it in frame. */
  focal: { x: number; y: number };
  width?: number;
  height?: number;
}

export type TemplateId = "research" | "legal" | "index" | "editorial" | "numbers" | "images" | "monitoring" | "campaign";
export type FontPair = "editorial" | "modern" | "classic" | "humanist";
export type ThemeMode = "light" | "dark" | "auto";

export interface Theme {
  accent: string;
  fonts: FontPair;
  mode: ThemeMode;
  logo?: ImageRef;
}

export interface MenuItem {
  id: string;
  label: L10n;
  /** A page of this site, or an external URL. */
  page?: string;
  url?: string;
}

export type PageKind = "home" | "list" | "entity" | "about" | "custom";

export interface Seo {
  title: L10n;
  description: L10n;
  image?: ImageRef;
}

export interface Page {
  id: string;
  kind: PageKind;
  title: L10n;
  /** Path segment; "" for home. Entity pages live at entity/:id. */
  slug: string;
  /** list / entity pages: which template they show. */
  template?: string;
  blocks: Block[];
  seo?: Seo;
}

/* ── Blocks ──────────────────────────────────────────────────────────── */

export type CtaKind = "link" | "form" | "signup" | "donate";
export type Layout = "cards" | "list" | "table";

export interface StatItem {
  id: string;
  label: L10n;
  template?: string;
  filter?: { key: string; value: string };
}

/** Every block's props, by type. A block's `props` is always one of these —
 *  the builder's forms are generated from `BLOCKS` (blocks.ts) against them. */
export interface BlockProps {
  hero: { title: L10n; subtitle: L10n; image?: ImageRef; ctaLabel: L10n; ctaHref: string; ctaKind: CtaKind | "none" };
  search: { placeholder: L10n; template?: string };
  facets: { title: L10n; template?: string; keys: string[] };
  stats: { title: L10n; items: StatItem[] };
  statusBar: { title: L10n; template?: string; key: string };
  entityList: { title: L10n; template?: string; sort: Sort; limit: number; layout: Layout; filterKey?: string; filterValue?: string };
  featured: { title: L10n; ids: string[]; lead: boolean };
  topics: { title: L10n; template?: string; key: string; limit: number };
  map: { title: L10n; template?: string };
  chart: { title: L10n; template?: string; by: "year" | "decade" | "country" | "template" | "status" | string; kind: "columns" | "bars" };
  timeline: { title: L10n; template?: string; limit: number };
  index: { title: L10n; template?: string; key: "title" | string };
  gallery: { title: L10n; template?: string; limit: number; layout: "masonry" | "grid" };
  collections: { title: L10n; template?: string; key: string };
  table: { title: L10n; template?: string; keys: string[]; limit: number };
  text: { title: L10n; body: L10n };
  quote: { text: L10n; attribution: L10n };
  asks: { title: L10n; items: L10n[] };
  cta: { title: L10n; body: L10n; label: L10n; href: string; kind: CtaKind };
  share: { title: L10n };
  contact: { title: L10n; body: L10n; email: string };
  results: { template?: string; keys: string[]; layout: Layout };
  entityHeader: { showImage: boolean };
  entityFields: { title: L10n; keys: string[] };
  entitySummary: { title: L10n };
  entityHistory: { title: L10n };
  entityConnections: { title: L10n; mode: "all" | "cites" | "citedBy"; limit: number };
  entityDownload: { title: L10n };
  entityCitation: { title: L10n };
}

export type BlockType = keyof BlockProps;

export interface Block<T extends BlockType = BlockType> {
  id: string;
  type: T;
  hidden?: boolean;
  props: BlockProps[T];
  /** Style steps (model/style.ts); absent = the block's defaults. */
  style?: BlockStyle;
}

export interface SiteConfig {
  version: 1;
  collection: CollectionId;
  template: TemplateId;
  languages: Lang[];
  defaultLanguage: Lang;
  name: L10n;
  tagline: L10n;
  theme: Theme;
  menu: MenuItem[];
  footer: { text: L10n; links: MenuItem[]; poweredBy: boolean };
  seo: Seo;
  pages: Page[];
  /** Raw code, off by default and behind "Advanced". The only place a site
   *  takes CSS or JS. */
  advanced: { enabled: boolean; css: string; js: string };
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

let seq = 0;
export const newId = (p = "b") => `${p}${Date.now().toString(36)}${(++seq).toString(36)}`;

/** Text in `lang`; else the default language; else whatever language has it,
 *  so a reader never meets an empty heading. */
export const tr = (x: L10n | undefined, lang: Lang, fallback: Lang): string =>
  (x?.[lang] ?? "").trim() || (x?.[fallback] ?? "").trim() || Object.values(x ?? {}).find((v) => (v ?? "").trim())?.trim() || "";

/** Is this text missing in `lang`, while present in the default language? */
export const missing = (x: L10n | undefined, lang: Lang, fallback: Lang) => !!(x?.[fallback] ?? "").trim() && !(x?.[lang] ?? "").trim();

export const pageBySlug = (c: SiteConfig, slug: string) => c.pages.find((p) => p.slug === slug && p.kind !== "entity");
export const entityPage = (c: SiteConfig, template?: string) =>
  c.pages.find((p) => p.kind === "entity" && (!template || !p.template || p.template === template)) ??
  c.pages.find((p) => p.kind === "entity");
export const listPage = (c: SiteConfig, template?: string) =>
  c.pages.find((p) => p.kind === "list" && (!template || p.template === template)) ?? c.pages.find((p) => p.kind === "list");
