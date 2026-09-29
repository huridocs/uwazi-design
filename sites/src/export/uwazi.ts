/* Export to Uwazi: a built site as code a person pastes into today's Uwazi.
 *
 *   Settings › Customization › Custom CSS   ← `globalCss`: the theme as custom properties
 *   Settings › Pages › (page) › HTML tab    ← `html` for that page and language
 *                                 CSS tab    ← `css`: the page's styles, scoped to it
 *                                 JS tab     ← `js`: empty unless the site's own code asks
 *
 * Data blocks compile to Uwazi's own components, so they stay live in Uwazi:
 * a list is a <Repeat>, a map a <Map>, a count a <Counter>. A block with no
 * Uwazi equivalent is degraded — to the nearest component, or to static HTML —
 * and named in `warnings`. Output is deterministic: the same site gives the same
 * text, byte for byte.
 *
 * The component names come from Uwazi's registry
 * (app/react/Markdown/components/index.js, see dev/results/uwazi-pages-research.md
 * §1). Attribute names follow the prototype's palette and must be checked
 * against docs.uwazi.io before anyone relies on them. */
import type { Template } from "../data/types";
import type { Block, BlockProps, L10n, Lang, Page, SiteConfig } from "../model/config";
import { tr } from "../model/config";
import { BLOCKS } from "../model/blocks";
import { GAP_REM, PAD_REM, SHAPE_RATIO, WIDTH_REM, isStyled, shownIn, type BlockStyle } from "../model/style";
import { FONT_PAIRS, onAccent } from "../render/theme";

/** Components Uwazi renders from page HTML today (tag syntax). */
export const UWAZI_TAGS = [
  "EntityData",
  "EntityInfo",
  "EntitySection",
  "EntityLink",
  "Repeat",
  "Value",
  "Counter",
  "Map",
  "SearchBox",
  "ItemList",
  "PublicForm",
  "ContactForm",
  "PayPalDonateLink",
  "BarChart",
  "FreeBarChart",
  "PieChart",
  "ListChart",
  "GaugeChart",
  "Dataviz",
  "Slideshow",
] as const;
/** The older markdown-extension syntax, `{name}(options)`. */
export const UWAZI_EXTENSIONS = ["link", "media", "youtube", "vimeo"] as const;
/** Uwazi's own matcher for that syntax (markdownToReact.jsx:14). */
export const CUSTOM_COMPONENT_MATCHER = /{\w+}\(.+\)\(.+\)|{\w+}\(.+\)/;

export interface Warning {
  page: string;
  block: string;
  message: string;
}

export interface PageExport {
  pageId: string;
  title: string;
  /** What to type in Uwazi's page title field, per language. */
  titles: Record<Lang, string>;
  /** Uwazi's "entity view" toggle: a page that shows one entity. */
  entityView: boolean;
  html: Record<Lang, string>;
  css: string;
  js: string;
  /** Why the JS tab isn't empty, when it isn't. */
  jsReason?: string;
}

export interface SiteExport {
  globalCss: string;
  pages: PageExport[];
  warnings: Warning[];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const indent = (s: string, n = 2) =>
  s
    .split("\n")
    .map((l) => (l ? " ".repeat(n) + l : l))
    .join("\n");
const query = (p: Record<string, string | undefined>) =>
  Object.entries(p)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

export const scopeOf = (p: Page) => `s-page-${p.kind === "home" ? "home" : p.kind === "entity" ? "entity" : p.slug || p.id}`;

/** Site text → HTML. Mentions become EntityInfo, so they stay links in Uwazi. */
function prose(src: string, titleOf: (id: string) => string): string {
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/@\[([\w-]+)\]/g, (_m, id: string) => `<EntityInfo entity="${id}" tag="a" classname="s-mention">${esc(titleOf(id))}</EntityInfo>`);
  return src
    .split(/\n\s*\n/)
    .map((para) => {
      const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return "";
      if (lines.every((l) => /^[-*] /.test(l))) return `<ul>\n${lines.map((l) => `  <li>${inline(l.slice(2))}</li>`).join("\n")}\n</ul>`;
      return `<p>${inline(lines.join(" "))}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

function section(cls: string, heading: string, body: string) {
  return `<section class="${cls}">\n${heading ? `  <h2>${esc(heading)}</h2>\n` : ""}${indent(body)}\n</section>`;
}

const card = (inner: string) => `<EntityInfo entity="{id}" tag="a" classname="s-card">${inner}</EntityInfo>`;
const repeat = (q: string, sort: string, limit: number, cls: string, inner: string) =>
  `<Repeat query="${q}" sort="${sort}" limit="${limit}" class="${cls}">\n  ${inner}\n</Repeat>`;

type Ctx = {
  lang: Lang;
  config: SiteConfig;
  page: Page;
  t: (x: L10n | undefined) => string;
  titleOf: (id: string) => string;
  warn: (block: Block, message: string) => void;
  /** The property holding the record's summary (CEJIL: resumen). */
  summaryKey: string;
  /** The record page's template, when known: its properties are what
   *  "Properties" exports when none are picked. */
  entityTemplate?: Template;
};

function cta(kind: string, label: string, href: string, b: Block, c: Ctx): string {
  if (!label) return "";
  if (kind === "link") return `<a class="s-button" href="${esc(href || "#")}">${esc(label)}</a>`;
  if (kind === "donate") {
    c.warn(b, "Uses PayPalDonateLink: put your PayPal id where it says DONATE_ID.");
    return `<PayPalDonateLink paypalid="DONATE_ID" currency="USD">${esc(label)}</PayPalDonateLink>`;
  }
  if (kind === "form") return `<ContactForm button="${esc(label)}" />`;
  c.warn(b, "No Uwazi component; exported as a link. Point it at your mailing-list form.");
  return `<a class="s-button" href="${esc(href || "#")}">${esc(label)}</a>`;
}

function compileBlock(b: Block, c: Ctx): string {
  const { t } = c;
  const p = b.props as BlockProps[keyof BlockProps];
  switch (b.type) {
    case "hero": {
      const x = p as BlockProps["hero"];
      if (x.image) c.warn(b, "The hero picture is not exported: upload it to Uwazi and add an <img> with its URL.");
      const button = x.ctaKind !== "none" ? cta(x.ctaKind, t(x.ctaLabel), x.ctaHref, b, c) : "";
      return `<section class="s-hero">\n  <h1>${esc(t(x.title))}</h1>${t(x.subtitle) ? `\n  <p>${esc(t(x.subtitle))}</p>` : ""}${button ? `\n  ${button}` : ""}\n</section>`;
    }
    case "text": {
      const x = p as BlockProps["text"];
      return section("s-text", t(x.title), prose(t(x.body), c.titleOf));
    }
    case "quote": {
      const x = p as BlockProps["quote"];
      return `<figure class="s-quote">\n  <blockquote>${esc(t(x.text))}</blockquote>${t(x.attribution) ? `\n  <figcaption>${esc(t(x.attribution))}</figcaption>` : ""}\n</figure>`;
    }
    case "asks": {
      const x = p as BlockProps["asks"];
      return section("s-asks", t(x.title), `<ol>\n${x.items.map((i) => `  <li>${esc(t(i))}</li>`).filter((l) => l !== "  <li></li>").join("\n")}\n</ol>`);
    }
    case "cta": {
      const x = p as BlockProps["cta"];
      return section("s-cta", t(x.title), [t(x.body) ? `<p>${esc(t(x.body))}</p>` : "", cta(x.kind, t(x.label), x.href, b, c)].filter(Boolean).join("\n"));
    }
    case "share": {
      const x = p as BlockProps["share"];
      c.warn(b, "Exported as plain links to the site's home; Uwazi has no share component.");
      return section("s-share", t(x.title), `<p>\n  <a class="s-button" href="https://wa.me/?text=/">WhatsApp</a>\n  <a class="s-button" href="mailto:?body=/">Email</a>\n</p>`);
    }
    case "contact": {
      const x = p as BlockProps["contact"];
      return section("s-contact", t(x.title), [t(x.body) ? prose(t(x.body), c.titleOf) : "", `<ContactForm />`].filter(Boolean).join("\n"));
    }
    case "search": {
      const x = p as BlockProps["search"];
      return `<section class="s-search">\n  <SearchBox placeholder="${esc(t(x.placeholder))}" />\n</section>`;
    }
    case "facets": {
      const x = p as BlockProps["facets"];
      c.warn(b, "Exported as one ListChart per filter (value + count, linked to the Library).");
      return section("s-facets", t(x.title), x.keys.map((k) => `<ListChart property="${k}"${x.template ? ` context="${x.template}"` : ""} />`).join("\n"));
    }
    case "stats": {
      const x = p as BlockProps["stats"];
      return section(
        "s-stats",
        t(x.title),
        `<dl>\n${x.items.map((i) => `  <div>\n    <dt>${esc(t(i.label))}</dt>\n    <dd><Counter query="${query({ template: i.template, ...(i.filter ? { [i.filter.key]: i.filter.value } : {}) })}" /></dd>\n  </div>`).join("\n")}\n</dl>`,
      );
    }
    case "statusBar": {
      const x = p as BlockProps["statusBar"];
      c.warn(b, "Exported as a PieChart: Uwazi has no stacked status bar.");
      return section("s-status", t(x.title), `<PieChart property="${x.key}"${x.template ? ` context="${x.template}"` : ""} />`);
    }
    case "entityList": {
      const x = p as BlockProps["entityList"];
      const q = query({ template: x.template, ...(x.filterKey && x.filterValue ? { [x.filterKey]: x.filterValue } : {}) });
      if (x.layout === "table") c.warn(b, "Table layout is exported as a list: Repeat has no columns.");
      return section("s-list", t(x.title), repeat(q, x.sort, x.limit, x.layout === "cards" ? "s-cards" : "s-rows", card(`<Value path="title" />`)));
    }
    case "featured": {
      const x = p as BlockProps["featured"];
      return section("s-featured", t(x.title), `<div class="${x.lead ? "s-cards s-lead" : "s-cards"}">\n${x.ids.map((id) => `  <EntityInfo entity="${id}" tag="a" classname="s-card">${esc(c.titleOf(id))}</EntityInfo>`).join("\n")}\n</div>`);
    }
    case "topics": {
      const x = p as BlockProps["topics"];
      return section("s-topics", t(x.title), `<ListChart property="${x.key}"${x.template ? ` context="${x.template}"` : ""} />`);
    }
    case "map": {
      const x = p as BlockProps["map"];
      return section("s-map", t(x.title), `<Map query="${query({ template: x.template })}" />`);
    }
    case "chart": {
      const x = p as BlockProps["chart"];
      if (x.by === "year" || x.by === "decade") c.warn(b, `Counting by ${x.by} needs a date property in Uwazi's BarChart; check the property name after pasting.`);
      return section("s-chart", t(x.title), `<BarChart property="${x.by}"${x.template ? ` context="${x.template}"` : ""}${x.kind === "bars" ? ` layout="horizontal"` : ""} />`);
    }
    case "timeline": {
      const x = p as BlockProps["timeline"];
      c.warn(b, "No Uwazi component; exported as a list of the latest dated records.");
      return section("s-timeline", t(x.title), repeat(query({ template: x.template }), "recent", x.limit, "s-rows", card(`<Value path="title" />`)));
    }
    case "index": {
      const x = p as BlockProps["index"];
      if (x.key === "title") {
        c.warn(b, "Exported as one alphabetical list, without letter headings.");
        return section("s-index", t(x.title), repeat(query({ template: x.template }), "title", 200, "s-rows", card(`<Value path="title" />`)));
      }
      return section("s-index", t(x.title), `<ListChart property="${x.key}"${x.template ? ` context="${x.template}"` : ""} />`);
    }
    case "gallery": {
      const x = p as BlockProps["gallery"];
      c.warn(b, "Exported as cards with titles; showing each picture needs its image property in <Value>.");
      return section("s-gallery", t(x.title), repeat(query({ template: x.template }), "title", x.limit, "s-cards", card(`<Value path="title" />`)));
    }
    case "collections": {
      const x = p as BlockProps["collections"];
      c.warn(b, "Exported as a ListChart, without cover pictures.");
      return section("s-collections", t(x.title), `<ListChart property="${x.key}"${x.template ? ` context="${x.template}"` : ""} />`);
    }
    case "table": {
      const x = p as BlockProps["table"];
      c.warn(b, "Exported as a list: Repeat has no columns.");
      return section("s-table", t(x.title), repeat(query({ template: x.template }), "recent", x.limit, "s-rows", card(`<Value path="title" />`)));
    }
    case "results": {
      c.warn(b, "Uwazi's Library is the results page. Exported as a search box that opens it.");
      return `<section class="s-search">\n  <SearchBox />\n</section>`;
    }
    case "entityHeader":
      return `<header class="s-entity-head">\n  <p><EntityData value-of="template" /></p>\n  <h1><EntityData value-of="title" /></h1>\n</header>`;
    case "entityFields": {
      const x = p as BlockProps["entityFields"];
      const keys = x.keys.length ? x.keys : (c.entityTemplate?.properties ?? []).map((q) => q.name).filter((k) => k !== c.summaryKey);
      if (!keys.length) {
        c.warn(b, "The template isn't known, so the export lists the creation date only. Pick properties to export them.");
        keys.push("creationDate");
      }
      return section("s-fields", t(x.title), `<dl>\n${keys.map((k) => `  <dt><EntityData label-of="${k}" /></dt>\n  <dd><EntityData value-of="${k}" /></dd>`).join("\n")}\n</dl>`);
    }
    case "entitySummary": {
      const x = p as BlockProps["entitySummary"];
      return section("s-summary", t(x.title), `<EntityData value-of="${c.summaryKey}" />`);
    }
    case "entityHistory":
      c.warn(b, "No Uwazi equivalent; left out.");
      return "";
    case "entityConnections":
      c.warn(b, "No page component in Uwazi; left out, and the entity's own view lists them.");
      return "";
    case "entityDownload":
      c.warn(b, "Left out: Uwazi's entity view already offers the document.");
      return "";
    case "entityCitation": {
      const x = p as BlockProps["entityCitation"];
      c.warn(b, "Exported as static text built from the title; there is no copy button.");
      return section("s-cite", t(x.title), `<p><EntityData value-of="title" />. ${esc(t(c.config.name))}.</p>`);
    }
  }
  return "";
}

/** The page's styles, every selector under its own class, so pasting one page's
 *  CSS can never restyle another page or Uwazi itself. */
/** A styled block's rules, scoped to the page and to the block's own class
 *  (`s-b<index>`). Steps come from model/style.ts, so the export and the
 *  builder use one scale. What CSS on a page cannot do is warned. */
function blockStyleCss(scope: string, i: number, s: BlockStyle, warn: (m: string) => void): string {
  const sel = `.${scope} .s-b${i}`;
  const out: string[] = [];
  const rule = (x: string, body: string) => out.push(`${x} {\n  ${body.split("; ").join(";\n  ")};\n}`);
  const decl: string[] = [];
  if (s.pad) decl.push(`padding-block: ${PAD_REM[s.pad][1]}rem`);
  if (s.width && s.width !== "wide") {
    const w = WIDTH_REM[s.width];
    decl.push(w ? `max-width: ${w}rem; margin-inline: auto` : "max-width: none");
    if (!w) warn("Full width stays inside the page's own width in Uwazi.");
  }
  if (s.bg === "warm" || s.bg === "vellum" || s.bg === "tint")
    decl.push(`background: ${s.bg === "tint" ? "var(--s-tint)" : s.bg === "warm" ? "rgba(0, 0, 0, 0.03)" : "rgba(0, 0, 0, 0.06)"}; padding-inline: 1.5rem; border-radius: 10px`);
  if (s.bg === "image") warn("The background picture is not exported: upload it to Uwazi and set it as this block's background in the page CSS.");
  if (s.align === "center") decl.push("text-align: center");
  if (decl.length) rule(sel, decl.join("; "));
  if (s.heading) rule(`${sel} h1, ${sel} h2`, `font-size: ${s.heading > 0 ? "2.25rem" : "1.375rem"}`);
  if (s.gap) rule(`${sel} .s-cards, ${sel} ol, ${sel} dl, ${sel} ul`, `gap: ${GAP_REM[s.gap]}rem`);
  if (s.shape) rule(`${sel} img`, `aspect-ratio: ${SHAPE_RATIO[s.shape]}; object-fit: cover; width: 100%; height: auto`);
  if (s.cols) out.push(`@media (min-width: 40rem) {\n  ${sel} .s-cards, ${sel} ol, ${sel} dl, ${sel} ul {\n    grid-template-columns: repeat(${s.cols}, minmax(0, 1fr));\n  }\n}`);
  if (s.devices?.length) {
    const q: Record<string, string> = { phone: "(max-width: 39.99rem)", tablet: "(min-width: 40rem) and (max-width: 63.99rem)", desktop: "(min-width: 64rem)" };
    for (const d of ["phone", "tablet", "desktop"] as const)
      if (!s.devices.includes(d)) out.push(`@media ${q[d]} {\n  ${sel} {\n    display: none;\n  }\n}`);
  }
  return out.length ? `${out.join("\n\n")}\n` : "";
}

/** Give a compiled block its style class, and its eyebrow line. */
function withStyle(html: string, i: number, eyebrow: string): string {
  let h = html.replace('class="', `class="s-b${i} `);
  if (eyebrow) h = h.replace(/^(<[^>]+>)/, `$1\n  <p class="s-eyebrow">${esc(eyebrow)}</p>`);
  return h;
}

function pageCss(scope: string): string {
  const rules: [string, string][] = [
    ["", "max-width: 68rem; margin: 0 auto; padding: 0 1.25rem; font-family: var(--s-body); color: inherit;"],
    ["h1, h2", "font-family: var(--s-heading); line-height: 1.15; text-wrap: balance;"],
    ["h1", "font-size: 2.75rem; margin: 0 0 0.75rem;"],
    ["h2", "font-size: 1.75rem; margin: 0 0 1.25rem;"],
    [".s-eyebrow", "font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: var(--s-accent); margin: 0 0 0.5rem;"],
    ["section, figure, header", "margin: 0; padding: var(--s-space) 0;"],
    [".s-hero", "padding: calc(var(--s-space) * 1.5) 0 var(--s-space); border-bottom: 1px solid var(--s-rule);"],
    [".s-hero p", "font-size: 1.25rem; max-width: 42rem; opacity: 0.85;"],
    [".s-hero::after", "content: ''; display: block; width: 4rem; height: 3px; margin-top: 2rem; background: var(--s-accent);"],
    [".s-button", "display: inline-flex; align-items: center; height: 2.75rem; padding: 0 1.25rem; border-radius: 6px; background: var(--s-accent); color: var(--s-on-accent); font-weight: 500; text-decoration: none; margin-inline-end: 0.5rem;"],
    [".s-text p, .s-text li", "font-size: 1.0625rem; line-height: 1.65; max-width: 42rem;"],
    [".s-quote blockquote", "font-family: var(--s-heading); font-size: 1.75rem; line-height: 1.3; margin: 0;"],
    [".s-quote figcaption", "margin-top: 1rem; opacity: 0.7;"],
    [".s-asks ol", "display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); padding: 0; list-style-position: inside;"],
    [".s-asks li", "padding: 1.25rem; border-radius: 8px; background: var(--s-tint);"],
    [".s-cta", "padding: 2.5rem; border-radius: 10px; background: var(--s-tint);"],
    [".s-stats dl", "display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 2rem; margin: 0; padding: 2rem 0; border-block: 1px solid var(--s-rule);"],
    [".s-stats div", "display: flex; flex-direction: column-reverse; gap: 0.5rem;"],
    [".s-stats dd", "margin: 0; font-family: var(--s-heading); font-size: 3rem; line-height: 1;"],
    [".s-cards", "display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));"],
    [".s-card", "display: block; padding: 1rem; border: 1px solid var(--s-rule); border-radius: 8px; color: inherit; text-decoration: none; font-family: var(--s-heading); font-size: 1.125rem;"],
    [".s-card:hover", "border-color: var(--s-accent);"],
    [".s-rows .s-card", "border: 0; border-bottom: 1px solid var(--s-rule); border-radius: 0; padding: 0.75rem 0; font-family: var(--s-body); font-size: 1rem;"],
    [".s-mention", "color: var(--s-accent); text-decoration: underline;"],
    [".s-fields dl", "display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 1.25rem 2rem;"],
    [".s-fields dt", "font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.7;"],
    [".s-fields dd", "margin: 0.25rem 0 0;"],
  ];
  return rules.map(([sel, body]) => `${sel ? sel.split(", ").map((s) => `.${scope} ${s}`).join(",\n") : `.${scope}`} {\n  ${body.split("; ").map((d) => d.replace(/;$/, "")).join(";\n  ")};\n}`).join("\n\n") + "\n";
}

/** The theme as custom properties — the only thing that goes in Uwazi's global CSS. */
function themeCss(c: SiteConfig): string {
  const f = FONT_PAIRS[c.theme.fonts];
  return `/* ${tr(c.name, c.defaultLanguage, c.defaultLanguage)} — site theme, exported from the site builder. */\n:root {\n  --s-accent: ${c.theme.accent};\n  --s-on-accent: ${onAccent(c.theme.accent)};\n  --s-heading: ${f.heading};\n  --s-body: ${f.body};\n  --s-space: 2.5rem;\n  --s-rule: rgba(0, 0, 0, 0.1);\n  --s-tint: color-mix(in srgb, ${c.theme.accent} 8%, transparent);\n}\n`;
}

export interface ExportOptions {
  /** Titles for records named by id (featured, mentions). */
  titleOf?: (id: string) => string;
  /** The collection's templates: the record page exports its template's properties. */
  templates?: Template[];
}

export function exportSite(config: SiteConfig, { titleOf = (id) => id, templates = [] }: ExportOptions = {}): SiteExport {
  const warnings: Warning[] = [];
  const seen = new Set<string>();
  const pages = config.pages.map((page): PageExport => {
    const scope = scopeOf(page);
    const pageTitle = tr(page.title, "en", config.defaultLanguage);
    const entityTemplate = templates.find((x) => x.id === page.template);
    const summaryKey = entityTemplate?.properties.find((q) => /^(resumen|summary|description|abstract)$/i.test(q.name))?.name ?? "summary";
    const html: Record<Lang, string> = {};
    const titles: Record<Lang, string> = {};
    for (const lang of config.languages) {
      const ctx: Ctx = {
        lang,
        config,
        page,
        t: (x) => tr(x, lang, config.defaultLanguage),
        titleOf,
        summaryKey,
        entityTemplate,
        // Warnings are about kinds of block, not languages or copies: two
        // Connections blocks on one page give one line.
        warn: (b, message) => {
          const k = `${page.id}:${b.type}:${message}`;
          if (seen.has(k) || lang !== config.defaultLanguage) return;
          seen.add(k);
          warnings.push({ page: pageTitle, block: BLOCKS[b.type].label, message });
        },
      };
      // A block shown only in some languages is left out of the others'
      // HTML: Uwazi keeps one HTML per language, so this maps exactly.
      const body = page.blocks
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => !b.hidden && shownIn(b.style, lang))
        .map(({ b, i }) => {
          const html = compileBlock(b, ctx);
          return html && isStyled(b.style) ? withStyle(html, i, b.style!.eyebrow ? ctx.t(b.style!.eyebrow) : "") : html;
        })
        .filter(Boolean)
        .join("\n\n");
      html[lang] = `<div class="${scope}">\n${indent(body)}\n</div>\n`;
      titles[lang] = tr(page.title, lang, config.defaultLanguage);
    }
    const custom = config.advanced.enabled && config.advanced.js.trim();
    return {
      pageId: page.id,
      title: pageTitle,
      titles,
      entityView: page.kind === "entity",
      html,
      css:
        pageCss(scope) +
        page.blocks
          .map((b, i) =>
            !b.hidden && isStyled(b.style)
              ? blockStyleCss(scope, i, b.style!, (m) => {
                  const k = `${page.id}:${b.id}:${m}`;
                  if (!seen.has(k)) {
                    seen.add(k);
                    warnings.push({ page: pageTitle, block: BLOCKS[b.type].label, message: m });
                  }
                })
              : "",
          )
          .filter(Boolean)
          .map((x) => `\n${x}`)
          .join("") +
        (config.advanced.enabled && config.advanced.css.trim() ? `\n/* Custom CSS from Advanced — not scoped; check it before pasting. */\n${config.advanced.css.trim()}\n` : ""),
      js: custom ? `${config.advanced.js.trim()}\n` : "",
      jsReason: custom ? "The site's own code from Whole site › Advanced. No block needs JavaScript." : undefined,
    };
  });
  const t = (x: Parameters<typeof tr>[0]) => tr(x, config.defaultLanguage, config.defaultLanguage);
  const target = (m: SiteConfig["menu"][number]) => {
    const p = config.pages.find((q) => q.id === m.page);
    return p ? `the “${t(p.title)}” page` : m.url ?? "";
  };
  const links = (ms: SiteConfig["menu"]) => ms.map((m) => `${t(m.label)} → ${target(m)}`).join("; ");
  if (config.menu.length) warnings.push({ page: "Whole site", block: "Menu", message: `Not code: add each item in Settings › Menu, in this order: ${links(config.menu)}.` });
  if (t(config.footer.text) || config.footer.links.length)
    warnings.push({ page: "Whole site", block: "Footer", message: "Uwazi's footer is fixed. Put the footer text and links at the end of each page's HTML, or leave them out." });
  if (t(config.seo.description) || config.seo.image)
    warnings.push({ page: "Whole site", block: "Search and sharing", message: "Uwazi sets the page title itself; the description and share picture are not exported." });
  if (config.theme.logo) warnings.push({ page: "Whole site", block: "Logo", message: "The logo is not exported: upload it in Settings › Collection." });
  return { globalCss: themeCss(config), pages, warnings };
}

/** Where each piece goes, as a checklist a person can follow top to bottom. */
export function checklist(config: SiteConfig, x: SiteExport, pageIds: string[], langs: Lang[]): string {
  const out: string[] = [];
  out.push(`1. Settings › Customization › Custom CSS — paste at the end:\n\n${x.globalCss}`);
  let n = 2;
  for (const p of x.pages.filter((q) => pageIds.includes(q.pageId))) {
    out.push(`${n++}. Settings › Pages › Add page — "${p.title}"${p.entityView ? " (turn on Entity view)" : ""}`);
    for (const l of langs) {
      out.push(`   Language ${l.toUpperCase()} — Title: ${p.titles[l]}\n   HTML tab:\n\n${p.html[l]}`);
    }
    out.push(`   CSS tab (same for every language):\n\n${p.css}`);
    out.push(p.js ? `   JavaScript tab:\n\n${p.js}` : "   JavaScript tab: leave empty.");
  }
  void config;
  return out.join("\n\n");
}
