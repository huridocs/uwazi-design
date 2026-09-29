/* Pages (the public website) — the model behind direction A, the code editor in
 * Settings › Pages (dev/results/pages-editor/README.md). Direction B, the
 * structured builder, is a separate tool at `sites/`; the site types and block
 * list here are what A's "New page" starters are built from.
 *
 *  A · Code editor: per language, HTML / CSS / JS — Uwazi's model today
 *      (`Page.locales[lang].draft.{content, css, script}`), plus a PUBLISHED copy
 *      so saving stops meaning "live".
 *  B · Page builder: a site TYPE (eight of them) laid out as ordered blocks with
 *      per-language text, a theme, and a matching entity-page layout. Blocks
 *      COMPILE to A's HTML (`compileBlocks`), which is what makes "Open in code
 *      editor" a real escape hatch rather than a second format.
 *
 * Mock only: nothing here is persisted beyond the session. */

export type SiteLang = "en" | "es" | "fr" | "ar";
export const SITE_LANGS: { key: SiteLang; label: string }[] = [
  { key: "en", label: "English" },
  { key: "es", label: "Español" },
  { key: "fr", label: "Français" },
  { key: "ar", label: "العربية" },
];
export const isRtl = (l: SiteLang) => l === "ar";

/** Text in every language. A missing language is "", never absent. */
export type L10n = Record<SiteLang, string>;
export const l10n = (en: string, es = "", fr = "", ar = ""): L10n => ({ en, es, fr, ar });

/* ── A · code documents ─────────────────────────────────────────────────── */

export interface CodeLocale {
  title: string;
  html: string;
  css: string;
  js: string;
}
export type CodeLocales = Record<SiteLang, CodeLocale>;
export interface CodeDoc {
  draft: CodeLocales;
  /** What the public site serves. null = never published. */
  published: CodeLocales | null;
}
export const emptyLocale = (): CodeLocale => ({ title: "", html: "", css: "", js: "" });

/* ── B · blocks ─────────────────────────────────────────────────────────── */

export type Facet = "template" | "country" | "decade" | "status";
export type Sort = "recent" | "cited" | "title";
export type CtaKind = "link" | "form" | "signup" | "donate";

/** Every block type. The ones marked `entity` belong on an entity page; they
 *  read the entity the page shows. */
export type Block =
  | { id: string; hidden?: boolean; type: "hero"; title: L10n; subtitle: L10n; ctaLabel: L10n; ctaKind: CtaKind | "none"; ctaHref: string }
  | { id: string; hidden?: boolean; type: "text"; heading: L10n; body: L10n }
  | { id: string; hidden?: boolean; type: "quote"; text: L10n; cite: L10n }
  | { id: string; hidden?: boolean; type: "search"; placeholder: L10n }
  | { id: string; hidden?: boolean; type: "filters"; facets: Facet[] }
  | { id: string; hidden?: boolean; type: "stats"; items: { template: string; status: string; label: L10n }[] }
  | { id: string; hidden?: boolean; type: "statusBar"; heading: L10n; template: string }
  | { id: string; hidden?: boolean; type: "entityList"; heading: L10n; template: string; country: string; status: string; sort: Sort; limit: number; layout: "cards" | "list" | "table" }
  | { id: string; hidden?: boolean; type: "map"; heading: L10n; template: string }
  | { id: string; hidden?: boolean; type: "chart"; heading: L10n; kind: "bar" | "pie" | "list"; by: "template" | "country" | "status" }
  | { id: string; hidden?: boolean; type: "timeline"; heading: L10n; template: string }
  | { id: string; hidden?: boolean; type: "index"; heading: L10n; template: string; by: "title" | "country" }
  | { id: string; hidden?: boolean; type: "collections"; heading: L10n; by: "template" | "country" }
  | { id: string; hidden?: boolean; type: "featured"; heading: L10n; entityIds: string[]; lead: boolean }
  | { id: string; hidden?: boolean; type: "imageGrid"; heading: L10n; template: string; limit: number }
  | { id: string; hidden?: boolean; type: "cta"; heading: L10n; body: L10n; label: L10n; kind: CtaKind; href: string }
  | { id: string; hidden?: boolean; type: "contact"; heading: L10n; body: L10n; email: string }
  | { id: string; hidden?: boolean; type: "share"; heading: L10n }
  | { id: string; hidden?: boolean; type: "entityHeader" }
  | { id: string; hidden?: boolean; type: "entityFields"; heading: L10n }
  | { id: string; hidden?: boolean; type: "entityDocument"; heading: L10n }
  | { id: string; hidden?: boolean; type: "connections"; heading: L10n; mode: "related" | "citations" }
  | { id: string; hidden?: boolean; type: "entityHistory"; heading: L10n }
  | { id: string; hidden?: boolean; type: "download"; label: L10n }
  | { id: string; hidden?: boolean; type: "citation"; heading: L10n };
export type BlockType = Block["type"];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

export const BLOCK_META: Record<BlockType, { label: string; hint: string; entity?: boolean }> = {
  hero: { label: "Hero", hint: "Title, introduction, an optional button" },
  text: { label: "Text", hint: "A heading and paragraphs; “- ” starts a list line, @[id] names an entity" },
  quote: { label: "Pull quote", hint: "A quotation, set large" },
  search: { label: "Search box", hint: "Searches the collection" },
  filters: { label: "Filters", hint: "Facets with counts, above a list or a grid" },
  stats: { label: "Counters", hint: "Live counts of entities" },
  statusBar: { label: "Status summary", hint: "How many are in each status, as one bar" },
  entityList: { label: "Entity list", hint: "Entities of a template: latest, most cited, A–Z" },
  map: { label: "Map", hint: "Entities with a location" },
  chart: { label: "Chart", hint: "Counts by template, country or status" },
  timeline: { label: "Over time", hint: "Dated entities per year" },
  index: { label: "A–Z index", hint: "A directory with a count per entry" },
  collections: { label: "Collections", hint: "Tiles per template or country, with counts" },
  featured: { label: "Featured entities", hint: "Entities you pick" },
  imageGrid: { label: "Image grid", hint: "Entities with a picture, in a masonry grid" },
  cta: { label: "Call to action", hint: "The ask, and one button" },
  contact: { label: "Contact", hint: "A message and a contact form" },
  share: { label: "Share", hint: "Share and sign-up links" },
  entityHeader: { label: "Entity title", hint: "Title, template and dates", entity: true },
  entityFields: { label: "Entity data", hint: "The entity's properties", entity: true },
  entityDocument: { label: "Document", hint: "The entity's text with its table of contents", entity: true },
  connections: { label: "Connections", hint: "Related entities, or cites / cited by", entity: true },
  entityHistory: { label: "History", hint: "The entity's dated events", entity: true },
  download: { label: "Download", hint: "The entity's document as a file", entity: true },
  citation: { label: "Citation", hint: "How to cite it, with a copy button", entity: true },
};

let blockSeq = 0;
export const newBlockId = () => `b${++blockSeq}-${Date.now().toString(36)}`;
type Draft<T extends BlockType> = Omit<BlockOf<T>, "id">;
const mk = <T extends BlockType>(b: Draft<T>) => ({ ...b, id: newBlockId() }) as unknown as BlockOf<T>;

/** A fresh block of a type, with starter text; `main` is the collection's main
 *  template (Court case in the Sample, Causa in CEJIL). */
export function newBlock(type: BlockType, main: string): Block {
  const h = (en: string, es: string) => l10n(en, es);
  switch (type) {
    case "hero": return mk<"hero">({ type, title: h("A new section", "Una nueva sección"), subtitle: h("Say what this page is for.", "Diga para qué sirve esta página."), ctaLabel: h("", ""), ctaKind: "none", ctaHref: "" });
    case "text": return mk<"text">({ type, heading: h("Heading", "Título"), body: h("Write a paragraph here.", "Escriba un párrafo aquí.") });
    case "quote": return mk<"quote">({ type, text: h("A sentence worth setting large.", "Una frase que merece destacarse."), cite: h("Source", "Fuente") });
    case "search": return mk<"search">({ type, placeholder: h("Search the collection", "Buscar en la colección") });
    case "filters": return mk<"filters">({ type, facets: ["template", "country"] });
    case "stats": return mk<"stats">({ type, items: [{ template: main, status: "", label: h("cases", "casos") }] });
    case "statusBar": return mk<"statusBar">({ type, heading: h("Where things stand", "Situación"), template: main });
    case "entityList": return mk<"entityList">({ type, heading: h("Latest", "Recientes"), template: main, country: "", status: "", sort: "recent", limit: 6, layout: "cards" });
    case "map": return mk<"map">({ type, heading: h("Where", "Dónde"), template: "" });
    case "chart": return mk<"chart">({ type, heading: h("By type", "Por tipo"), kind: "bar", by: "template" });
    case "timeline": return mk<"timeline">({ type, heading: h("Over time", "En el tiempo"), template: main });
    case "index": return mk<"index">({ type, heading: h("A–Z", "A–Z"), template: main, by: "title" });
    case "collections": return mk<"collections">({ type, heading: h("Collections", "Colecciones"), by: "template" });
    case "featured": return mk<"featured">({ type, heading: h("Featured", "Destacados"), entityIds: [], lead: false });
    case "imageGrid": return mk<"imageGrid">({ type, heading: h("Images", "Imágenes"), template: "", limit: 18 });
    case "cta": return mk<"cta">({ type, heading: h("Act now", "Actúe ahora"), body: h("One sentence on what you ask for.", "Una frase sobre lo que pide."), label: h("Sign the petition", "Firme la petición"), kind: "link", href: "https://example.org/petition" });
    case "contact": return mk<"contact">({ type, heading: h("Contact", "Contacto"), body: h("Write to the team.", "Escriba al equipo."), email: "info@example.org" });
    case "share": return mk<"share">({ type, heading: h("Share this page", "Comparta esta página") });
    case "entityHeader": return mk<"entityHeader">({ type });
    case "entityFields": return mk<"entityFields">({ type, heading: h("Details", "Detalles") });
    case "entityDocument": return mk<"entityDocument">({ type, heading: h("Text", "Texto") });
    case "connections": return mk<"connections">({ type, heading: h("Related", "Relacionados"), mode: "related" });
    case "entityHistory": return mk<"entityHistory">({ type, heading: h("History", "Historia") });
    case "download": return mk<"download">({ type, label: h("Download the document", "Descargar el documento") });
    case "citation": return mk<"citation">({ type, heading: h("Cite this", "Cómo citar") });
  }
}

export interface SiteTheme {
  accent: string;
  headingFont: "serif" | "sans";
  /** Shown in the public header; "" = the collection name's initials. */
  logoText: string;
}

export interface BlockDoc {
  templateId: SiteTemplateId;
  title: L10n;
  home: Block[];
  entity: Block[];
  theme: SiteTheme;
}
export interface BlockDocState {
  draft: BlockDoc;
  published: BlockDoc | null;
}

/* ── Site types ─────────────────────────────────────────────────────────── */

export type SiteTemplateId = "research" | "legal" | "index" | "editorial" | "numbers" | "images" | "monitoring" | "campaign";

export interface SiteTemplateMeta {
  id: SiteTemplateId;
  label: string;
  description: string;
  entityPage: string;
  theme: SiteTheme;
  /** What the collection needs for this type to show real content. */
  needs?: string;
}

export const SITE_TEMPLATES: SiteTemplateMeta[] = [
  { id: "legal", label: "Legal", description: "Case law and judgments: search first, filters, latest, most cited.", entityPage: "Parties, court, dates, holding, text with contents, cites / cited by, copy citation", theme: { accent: "#1F3A5F", headingFont: "serif", logoText: "" } },
  { id: "research", label: "Research", description: "A report and study archive: a lead study, topics, latest, search.", entityPage: "Abstract, authors, download, related, cite", theme: { accent: "#7A4E2D", headingFont: "serif", logoText: "" } },
  { id: "numbers", label: "Numbers", description: "The collection counted: counters, over time, a map, a filterable table, methodology.", entityPage: "Data, history, related", theme: { accent: "#0F766E", headingFont: "sans", logoText: "" } },
  { id: "images", label: "Images", description: "A picture archive: masonry grid, collections, filters by date and place.", entityPage: "The image, caption, provenance, rights", theme: { accent: "#1A1A1A", headingFont: "sans", logoText: "" }, needs: "Entities with pictures (the Artworks collection has them)." },
  { id: "index", label: "Index", description: "An A–Z directory, with a count for every entry.", entityPage: "Data and connections", theme: { accent: "#4B5563", headingFont: "sans", logoText: "" } },
  { id: "editorial", label: "Editorial", description: "Long-form stories with entities named inline, pull quotes, a timeline and sources.", entityPage: "The story, its sources", theme: { accent: "#9F1239", headingFont: "serif", logoText: "" } },
  { id: "monitoring", label: "Monitoring", description: "Obligations and their implementation status: a status summary, filters, a tracked list.", entityPage: "The obligation, its status history, the responsible actor, evidence", theme: { accent: "#B45309", headingFont: "sans", logoText: "" }, needs: "A status on each tracked entity. CEJIL's cases carry Active / Closed; a real tracker needs implemented / partial / pending / not implemented, and a dated history of status changes." },
  { id: "campaign", label: "Campaign", description: "One focused page with an ask: a button, key numbers, featured cases, what we ask for, share.", entityPage: "The case story, with the ask repeated", theme: { accent: "#B91C1C", headingFont: "sans", logoText: "" } },
];
export const templateMeta = (id: SiteTemplateId) => SITE_TEMPLATES.find((t) => t.id === id)!;

/** What a template needs from the collection to seed real content. */
export interface SeedData {
  main: string;
  /** The main template's entities, most connected first. */
  topMain: string[];
  /** Entities with a picture. */
  withImages: string[];
  /** Two entities to name inline in a story. */
  mentions: [string, string] | null;
}

/** A site type's home page and entity-page layout, seeded from the collection. */
export function templateDoc(id: SiteTemplateId, s: SeedData): BlockDoc {
  const { main, topMain } = s;
  const B = newBlock;
  const set = <T extends Block>(b: T, patch: Partial<T>): Block => ({ ...b, ...patch });
  const h = (en: string, es: string, fr = "", ar = "") => l10n(en, es, fr, ar);
  const meta = templateMeta(id);
  let home: Block[] = [];
  let entity: Block[] = [];
  let title = h("Home", "Inicio");
  switch (id) {
    case "legal":
      title = h("Case law", "Jurisprudencia", "Jurisprudence", "السوابق القضائية");
      home = [
        set(B("hero", main), { title: h("Inter-American case law", "Jurisprudencia interamericana", "Jurisprudence interaméricaine", "السوابق القضائية للنظام الأمريكي"), subtitle: h("Every case, judgment and order, searchable by court, country and date.", "Cada caso, sentencia y resolución, por tribunal, país y fecha.") }),
        set(B("search", main), { placeholder: h("Search judgments, parties, articles…", "Buscar sentencias, partes, artículos…") }),
        set(B("filters", main), { facets: ["template", "country", "decade", "status"] }),
        set(B("entityList", main), { heading: h("Latest cases", "Casos recientes"), sort: "recent", limit: 6, layout: "list" }),
        set(B("entityList", main), { heading: h("Most cited", "Más citados"), sort: "cited", limit: 5, layout: "list" }),
      ];
      entity = [B("entityHeader", main), set(B("entityFields", main), { heading: h("Parties and court", "Partes y tribunal") }), set(B("entityDocument", main), { heading: h("Judgment", "Sentencia") }), set(B("connections", main), { heading: h("Cites and cited by", "Cita y es citado por"), mode: "citations" }), B("citation", main)];
      break;
    case "research":
      title = h("Research", "Investigación");
      home = [
        set(B("featured", main), { heading: h("Lead study", "Estudio principal"), entityIds: topMain.slice(0, 1), lead: true }),
        set(B("collections", main), { heading: h("Topics", "Temas"), by: "template" }),
        set(B("entityList", main), { heading: h("Latest", "Recientes"), sort: "recent", limit: 6, layout: "cards" }),
        set(B("search", main), { placeholder: h("Search reports and studies", "Buscar informes y estudios") }),
      ];
      entity = [B("entityHeader", main), set(B("entityFields", main), { heading: h("Abstract and authors", "Resumen y autores") }), B("download", main), B("connections", main), B("citation", main)];
      break;
    case "numbers":
      title = h("In numbers", "En cifras");
      home = [
        set(B("hero", main), { title: h("The collection in numbers", "La colección en cifras"), subtitle: h("Counted live from the records, not from a spreadsheet.", "Contado en vivo desde los registros.") }),
        set(B("stats", main), { items: [{ template: main, status: "", label: h("cases", "casos") }, { template: "", status: "", label: h("records", "registros") }, { template: main, status: "Activo", label: h("still open", "aún abiertos") }] }),
        set(B("timeline", main), { heading: h("Cases per year", "Casos por año") }),
        set(B("map", main), { heading: h("Where", "Dónde"), template: "" }),
        set(B("filters", main), { facets: ["country", "decade"] }),
        set(B("entityList", main), { heading: h("All cases", "Todos los casos"), layout: "table", limit: 10, sort: "recent" }),
        set(B("text", main), { heading: h("Methodology", "Metodología"), body: h("Counts come from the published records at the moment the page is read. A record with no date is counted but not placed on the timeline.", "Las cifras salen de los registros publicados en el momento de leer la página.") }),
      ];
      entity = [B("entityHeader", main), B("entityFields", main), B("entityHistory", main), B("connections", main)];
      break;
    case "images":
      title = h("Gallery", "Galería");
      home = [
        set(B("hero", main), { title: h("The picture archive", "El archivo de imágenes"), subtitle: h("Browse by collection, date and place.", "Explore por colección, fecha y lugar.") }),
        set(B("filters", main), { facets: ["decade", "country", "template"] }),
        set(B("imageGrid", main), { heading: h("All images", "Todas las imágenes") }),
        set(B("collections", main), { heading: h("Collections", "Colecciones"), by: "template" }),
      ];
      entity = [B("entityHeader", main), set(B("entityFields", main), { heading: h("Caption, provenance, rights", "Leyenda, procedencia, derechos") }), B("connections", main)];
      break;
    case "index":
      title = h("Index", "Índice");
      home = [
        set(B("hero", main), { title: h("Directory", "Directorio"), subtitle: h("Every entry, with how many records name it.", "Cada entrada, con cuántos registros la nombran.") }),
        set(B("index", main), { heading: h("Cases A–Z", "Casos A–Z"), by: "title" }),
        set(B("collections", main), { heading: h("By country", "Por país"), by: "country" }),
      ];
      entity = [B("entityHeader", main), B("entityFields", main), B("connections", main)];
      break;
    case "editorial": {
      title = h("Stories", "Historias");
      const [m1, m2] = s.mentions ?? ["", ""];
      home = [
        set(B("hero", main), { title: h("Twenty years in the courtroom", "Veinte años en la sala"), subtitle: h("How the cases in this archive moved, told through the records.", "Cómo avanzaron los casos, contado con los registros.") }),
        set(B("text", main), { heading: h("", ""), body: h(`It began with a complaint. ${m1 ? `@[${m1}]` : "One case"} took years to reach a judgment, and ${m2 ? `@[${m2}]` : "another"} followed the same road.\n\nThe records show every step.`, `Empezó con una denuncia. ${m1 ? `@[${m1}]` : "Un caso"} tardó años en llegar a una sentencia.`) }),
        set(B("quote", main), { text: h("The State has a legal duty to take reasonable steps to prevent human rights violations.", "El Estado está en el deber jurídico de prevenir, razonablemente, las violaciones de los derechos humanos."), cite: h("Inter-American Court, 1988", "Corte Interamericana, 1988") }),
        set(B("timeline", main), { heading: h("The cases over time", "Los casos en el tiempo") }),
        set(B("featured", main), { heading: h("Sources", "Fuentes"), entityIds: topMain.slice(0, 4) }),
      ];
      entity = [B("entityHeader", main), B("entityDocument", main), set(B("connections", main), { heading: h("Sources", "Fuentes") })];
      break;
    }
    case "monitoring":
      title = h("Compliance tracker", "Seguimiento de cumplimiento");
      home = [
        set(B("hero", main), { title: h("Are the judgments being implemented?", "¿Se cumplen las sentencias?"), subtitle: h("Each case and where its compliance stands.", "Cada caso y el estado de su cumplimiento.") }),
        set(B("statusBar", main), { heading: h("Where things stand", "Situación") }),
        set(B("stats", main), { items: [{ template: main, status: "Activo", label: h("under supervision", "en supervisión") }, { template: main, status: "Cerrado", label: h("closed", "cerrados") }] }),
        set(B("filters", main), { facets: ["country", "status", "decade"] }),
        set(B("entityList", main), { heading: h("Tracked cases", "Casos en seguimiento"), layout: "table", limit: 10, sort: "recent" }),
      ];
      entity = [B("entityHeader", main), set(B("entityFields", main), { heading: h("Status and responsible actor", "Estado y responsable") }), set(B("entityHistory", main), { heading: h("Status history", "Historial") }), set(B("connections", main), { heading: h("Evidence", "Evidencia") })];
      break;
    case "campaign":
      title = h("Justice now", "Justicia ya");
      home = [
        set(B("hero", main), { title: h("Justice for the disappeared", "Justicia para los desaparecidos"), subtitle: h("The Court has ruled. We ask the State to comply.", "La Corte ya decidió. Pedimos al Estado que cumpla."), ctaLabel: h("Sign the petition", "Firme la petición"), ctaKind: "link", ctaHref: "https://example.org/petition" }),
        set(B("stats", main), { items: [{ template: main, status: "", label: h("cases", "casos") }, { template: main, status: "Activo", label: h("still waiting", "aún esperando") }] }),
        set(B("featured", main), { heading: h("Their stories", "Sus historias"), entityIds: topMain.slice(0, 4) }),
        set(B("text", main), { heading: h("What we are asking", "Lo que pedimos"), body: h("- Comply with every judgment in full\n- Search for the disappeared\n- Report progress in public, every year", "- Cumplir cada sentencia\n- Buscar a las personas desaparecidas\n- Informar en público cada año") }),
        B("share", main),
        set(B("cta", main), { heading: h("Stay informed", "Manténgase informado"), body: h("One email when something changes.", "Un correo cuando algo cambie."), label: h("Sign up", "Suscribirse"), kind: "signup" }),
      ];
      entity = [B("entityHeader", main), B("entityDocument", main), set(B("cta", main), { heading: h("Act on this case", "Actúe por este caso") })];
      break;
  }
  return { templateId: id, title, home, entity, theme: meta.theme };
}

/** The existing text pages (About, Methodology…) — a plain arrangement, not a
 *  site type. */
export function textPageDoc(titleEn: string, main: string): BlockDoc {
  const t = l10n(titleEn, titleEn);
  return {
    templateId: "research",
    title: t,
    home: [
      { ...(newBlock("hero", main) as BlockOf<"hero">), title: t, subtitle: l10n("Who keeps this collection, what is in it, and how to use it.", "Quién mantiene esta colección, qué contiene y cómo usarla.") },
      { ...(newBlock("text", main) as BlockOf<"text">), heading: l10n("What you'll find", "Qué encontrará"), body: l10n("Judgments, orders and admissibility decisions of the Inter-American system.\n\nEach record is connected to the courts, states and people it names.", "Sentencias, resoluciones y decisiones de admisibilidad.\n\nCada registro está conectado con los tribunales, Estados y personas que menciona.") },
      { ...(newBlock("chart", main) as BlockOf<"chart">), heading: l10n("What the collection holds", "Qué contiene la colección"), kind: "list" },
      newBlock("contact", main),
    ],
    entity: [],
    theme: { accent: "#1A1A1A", headingFont: "serif", logoText: "" },
  };
}

/* ── Compile: blocks → Uwazi page HTML (A's format) ─────────────────────── */

/** Components the builder needs that Uwazi does not have yet. Everything else
 *  it emits is an existing component. The README lists these as build cost. */
export const PROPOSED_COMPONENTS = ["Filters", "StatusBar", "Timeline", "Index", "Collections", "ImageGrid", "Share", "EntityProperties", "EntityDocument", "Connections", "Download", "Citation"] as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const query = (p: Record<string, string>) =>
  Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(";");

/** Prose → HTML: blank lines split paragraphs, "- " lines make a list, and
 *  `@[id]` becomes an inline EntityInfo. */
function prose(src: string, titleOf: (id: string) => string): string {
  const inline = (s: string) => esc(s).replace(/@\[([\w-]+)\]/g, (_m, id: string) => `<EntityInfo entity="${id}" tag="a" classname="u-mention">${esc(titleOf(id))}</EntityInfo>`);
  return src
    .split(/\n\s*\n/)
    .map((p) => {
      const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length && lines.every((l) => l.startsWith("- "))) return `  <ul>\n${lines.map((l) => `    <li>${inline(l.slice(2))}</li>`).join("\n")}\n  </ul>`;
      return lines.length ? `  <p>${inline(lines.join(" "))}</p>` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function ctaHtml(kind: CtaKind, label: string, href: string, email = "info@example.org"): string {
  if (kind === "link") return `{link}(${href || "#"}, ${label})`;
  if (kind === "form") return `<PublicForm template="petition" button="${esc(label)}" />`;
  if (kind === "donate") return `<PayPalDonateLink paypalid="DONATE_ID" currency="USD">${esc(label)}</PayPalDonateLink>`;
  return `<ContactForm email="${esc(email)}" button="${esc(label)}" />`;
}

/** One language of a block list as page HTML, in the components' own syntax.
 *  An empty field in this language falls back to English, the way a page copied
 *  from another language starts. */
export function compileBlocks(
  blocks: Block[],
  lang: SiteLang,
  titleOf: (id: string) => string,
  /** Only components Uwazi has today — what A's starters use. A block that needs
   *  a proposed component falls back to the nearest existing one, or is left
   *  out when there is none (filters, share, the entity-page blocks). */
  { existingOnly = false }: { existingOnly?: boolean } = {},
): string {
  const t = (x: L10n) => x[lang] || x.en;
  const h2 = (x: L10n) => (t(x) ? `  <h2>${esc(t(x))}</h2>\n` : "");
  const out: string[] = [];
  for (const b of blocks) {
    if (b.hidden) continue;
    if (existingOnly) {
      const fallback = existingFallback(b, t, h2);
      if (fallback !== undefined) {
        if (fallback) out.push(fallback);
        continue;
      }
    }
    switch (b.type) {
      case "hero":
        out.push(`<section class="u-hero">\n  <h1>${esc(t(b.title))}</h1>\n  <p>${esc(t(b.subtitle))}</p>${b.ctaKind !== "none" && t(b.ctaLabel) ? `\n  ${ctaHtml(b.ctaKind, t(b.ctaLabel), b.ctaHref)}` : ""}\n</section>`);
        break;
      case "text":
        out.push(`<section class="u-text">\n${h2(b.heading)}${prose(t(b.body), titleOf)}\n</section>`);
        break;
      case "quote":
        out.push(`<blockquote class="u-quote">\n  <p>${esc(t(b.text))}</p>\n  <cite>${esc(t(b.cite))}</cite>\n</blockquote>`);
        break;
      case "search":
        out.push(`<SearchBox placeholder="${esc(t(b.placeholder))}" />`);
        break;
      case "filters":
        out.push(`<Filters facets="${b.facets.join(",")}" />`);
        break;
      case "stats":
        out.push(`<section class="u-stats">\n${b.items.map((i) => `  <div class="u-stat"><Counter query="${query({ template: i.template, status: i.status })}" /><span>${esc(t(i.label))}</span></div>`).join("\n")}\n</section>`);
        break;
      case "statusBar":
        out.push(`<section>\n${h2(b.heading)}  <StatusBar query="${query({ template: b.template })}" />\n</section>`);
        break;
      case "entityList":
        if (b.layout === "table") {
          out.push(`<section class="u-list">\n${h2(b.heading)}  <Table query="${query({ template: b.template, country: b.country, status: b.status })}" sort="${b.sort}" limit="${b.limit}" columns="title,country,date,status" />\n</section>`);
        } else {
          out.push(`<section class="u-list">\n${h2(b.heading)}  <Repeat query="${query({ template: b.template, country: b.country, status: b.status })}" sort="${b.sort}" limit="${b.limit}" class="u-${b.layout}">\n    <EntityInfo entity="{id}" tag="a" classname="u-card"><Value path="title" /><small><Value path="meta" /></small></EntityInfo>\n  </Repeat>\n</section>`);
        }
        break;
      case "map":
        out.push(`<section>\n${h2(b.heading)}  <Map query="${query({ template: b.template })}" />\n</section>`);
        break;
      case "chart": {
        const tag = b.kind === "bar" ? "BarChart" : b.kind === "pie" ? "PieChart" : "ListChart";
        out.push(`<section>\n${h2(b.heading)}  <${tag} property="${b.by}" />\n</section>`);
        break;
      }
      case "timeline":
        out.push(`<section>\n${h2(b.heading)}  <Timeline query="${query({ template: b.template })}" />\n</section>`);
        break;
      case "index":
        out.push(`<section>\n${h2(b.heading)}  <Index query="${query({ template: b.template })}" by="${b.by}" />\n</section>`);
        break;
      case "collections":
        out.push(`<section>\n${h2(b.heading)}  <Collections by="${b.by}" />\n</section>`);
        break;
      case "featured":
        out.push(`<section class="u-featured">\n${h2(b.heading)}  <div class="${b.lead ? "u-lead" : "u-cards"}">\n${b.entityIds.map((id) => `    <EntityInfo entity="${id}" tag="a" classname="u-card">${esc(titleOf(id))}</EntityInfo>`).join("\n")}\n  </div>\n</section>`);
        break;
      case "imageGrid":
        out.push(`<section>\n${h2(b.heading)}  <ImageGrid query="${query({ template: b.template })}" limit="${b.limit}" />\n</section>`);
        break;
      case "cta":
        out.push(`<section class="u-cta">\n${h2(b.heading)}  <p>${esc(t(b.body))}</p>\n  ${ctaHtml(b.kind, t(b.label), b.href)}\n</section>`);
        break;
      case "contact":
        out.push(`<section class="u-contact">\n${h2(b.heading)}${prose(t(b.body), titleOf)}\n  <ContactForm email="${esc(b.email)}" />\n</section>`);
        break;
      case "share":
        out.push(`<section>\n${h2(b.heading)}  <Share />\n</section>`);
        break;
      case "entityHeader":
        out.push(`<header class="u-entity-head">\n  <small><EntityData value-of="template" /></small>\n  <h1><EntityData value-of="title" /></h1>\n  <p><EntityData value-of="date" /></p>\n</header>`);
        break;
      case "entityFields":
        out.push(`<section>\n${h2(b.heading)}  <EntityProperties />\n</section>`);
        break;
      case "entityDocument":
        out.push(`<section>\n${h2(b.heading)}  <EntityDocument toc="true" />\n</section>`);
        break;
      case "connections":
        out.push(`<section>\n${h2(b.heading)}  <Connections mode="${b.mode}" />\n</section>`);
        break;
      case "entityHistory":
        out.push(`<section>\n${h2(b.heading)}  <Timeline of="entity" />\n</section>`);
        break;
      case "download":
        out.push(`<Download label="${esc(t(b.label))}" />`);
        break;
      case "citation":
        out.push(`<section>\n${h2(b.heading)}  <Citation />\n</section>`);
        break;
    }
  }
  return out.join("\n\n");
}

/** A proposed-component block in existing components: a string, "" to leave
 *  it out, or undefined for a block that compiles to existing ones already. */
function existingFallback(b: Block, t: (x: L10n) => string, h2: (x: L10n) => string): string | undefined {
  const q = (p: Record<string, string>) => query(p);
  switch (b.type) {
    case "filters":
    case "share":
    case "entityHeader":
    case "entityFields":
    case "entityDocument":
    case "connections":
    case "entityHistory":
    case "download":
    case "citation":
      return "";
    case "statusBar":
      return `<section>\n${h2(b.heading)}  <PieChart property="status" query="${q({ template: b.template })}" />\n</section>`;
    case "timeline":
      return `<section>\n${h2(b.heading)}  <BarChart property="decade" query="${q({ template: b.template })}" />\n</section>`;
    case "collections":
      return `<section>\n${h2(b.heading)}  <ListChart property="${b.by}" />\n</section>`;
    case "index":
      return `<section class="u-list">\n${h2(b.heading)}  <Repeat query="${q({ template: b.template })}" sort="title" limit="40" class="u-list">\n    <EntityInfo entity="{id}" tag="a" classname="u-card"><Value path="title" /><small><Value path="meta" /></small></EntityInfo>\n  </Repeat>\n</section>`;
    case "imageGrid":
      return `<section>\n${h2(b.heading)}  <Repeat query="${q({ template: b.template })}" limit="${b.limit}" class="u-cards">\n    <EntityInfo entity="{id}" tag="a" classname="u-card"><Value path="title" /></EntityInfo>\n  </Repeat>\n</section>`;
    case "entityList":
      if (b.layout !== "table") return undefined;
      return `<section class="u-list">\n${h2(b.heading)}  <Repeat query="${q({ template: b.template, country: b.country, status: b.status })}" sort="${b.sort}" limit="${b.limit}" class="u-list">\n    <EntityInfo entity="{id}" tag="a" classname="u-card"><Value path="title" /><small><Value path="meta" /></small></EntityInfo>\n  </Repeat>\n</section>`;
    default:
      void t;
      return undefined;
  }
}

/** The theme as the CSS a code page carries. */
export function compileTheme(theme: SiteTheme): string {
  return `:root {\n  --accent: ${theme.accent};\n  --heading-font: ${theme.headingFont === "serif" ? "Georgia, 'Times New Roman', serif" : "Inter, system-ui, sans-serif"};\n}\n`;
}

/* ── The component palette (A) ──────────────────────────────────────────── */

/** `jsx` = an HTML-like tag, parsed by html-to-react; `ext` = the older markdown
 *  extension `{name}(options)`, parsed by Uwazi's `customComponentMatcher`. Both
 *  coexist in one page today and nothing in the editor says which a component
 *  takes — the palette does. The mapping follows the research note
 *  (dev/results/uwazi-pages-research.md §1); it has to be checked against
 *  docs.uwazi.io before this ships. */
export type ComponentSyntax = "jsx" | "ext";
export interface PaletteEntry {
  name: string;
  group: "Entity data" | "Lists and counts" | "Search and forms" | "Charts and maps" | "Media and links";
  syntax: ComponentSyntax;
  snippet: string;
  hint: string;
  entityPage?: boolean;
}

export const PALETTE: PaletteEntry[] = [
  { name: "EntityData", group: "Entity data", syntax: "jsx", entityPage: true, snippet: `<EntityData value-of="title" />`, hint: "A property of the entity this page shows" },
  { name: "EntityInfo", group: "Entity data", syntax: "jsx", snippet: `<EntityInfo entity="ENTITY_ID" tag="a" classname="u-card">Link text</EntityInfo>`, hint: "Opens an entity's panel" },
  { name: "Value", group: "Entity data", syntax: "jsx", snippet: `<Value path="title" />`, hint: "A value inside Repeat" },
  { name: "Repeat", group: "Lists and counts", syntax: "jsx", snippet: `<Repeat query="template:TEMPLATE" limit="6" class="u-cards">\n  <EntityInfo entity="{id}" tag="a" classname="u-card"><Value path="title" /></EntityInfo>\n</Repeat>`, hint: "One copy of its content per entity found" },
  { name: "Counter", group: "Lists and counts", syntax: "jsx", snippet: `<Counter query="template:TEMPLATE" />`, hint: "How many entities match" },
  { name: "SearchBox", group: "Search and forms", syntax: "jsx", snippet: `<SearchBox placeholder="Search the collection" />`, hint: "Opens the Library with the query" },
  { name: "ContactForm", group: "Search and forms", syntax: "jsx", snippet: `<ContactForm email="info@example.org" />`, hint: "Sends a message to an address" },
  { name: "PublicForm", group: "Search and forms", syntax: "jsx", snippet: `<PublicForm template="TEMPLATE" />`, hint: "Lets visitors submit an entity" },
  { name: "PayPalDonateLink", group: "Search and forms", syntax: "jsx", snippet: `<PayPalDonateLink paypalid="DONATE_ID" currency="USD">Donate</PayPalDonateLink>`, hint: "A donation button" },
  { name: "Map", group: "Charts and maps", syntax: "jsx", snippet: `<Map query="template:TEMPLATE" />`, hint: "Entities with a location" },
  { name: "BarChart", group: "Charts and maps", syntax: "jsx", snippet: `<BarChart property="template" />`, hint: "Counts by a property, as bars" },
  { name: "PieChart", group: "Charts and maps", syntax: "jsx", snippet: `<PieChart property="country" />`, hint: "Counts by a property, as a pie" },
  { name: "ListChart", group: "Charts and maps", syntax: "jsx", snippet: `<ListChart property="template" />`, hint: "Counts by a property, as a list" },
  { name: "MarkdownMedia", group: "Media and links", syntax: "ext", snippet: `{media}(https://www.youtube.com/watch?v=VIDEO_ID)`, hint: "An embedded video" },
  { name: "MarkdownLink", group: "Media and links", syntax: "ext", snippet: `{link}(/library, Browse the library)`, hint: "A link styled as a button" },
];
