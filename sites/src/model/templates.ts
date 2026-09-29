/* The eight site types. Each turns a collection into a finished site — every
 * page filled with the collection's own records — so a new site looks done
 * before anything is edited. */
import type { CollectionInfo, DataSource, Template, Thesaurus } from "../data/types";
import type { Block, L10n, Page, SiteConfig, TemplateId } from "./config";
import { newId } from "./config";
import { makeBlock } from "./blocks";

export interface SiteTypeMeta {
  id: TemplateId;
  label: string;
  description: string;
  accent: string;
  fonts: SiteConfig["theme"]["fonts"];
  /** What the type needs from a collection to look right; `fits` checks it. */
  needs: string;
  fits: (p: CollectionProfile) => boolean;
}

export const SITE_TYPES: SiteTypeMeta[] = [
  { id: "legal", label: "Legal", description: "Case law: search first, filters by court, country, date and right; the latest and the most cited.", accent: "#1E3A5F", fonts: "classic", needs: "Records with dates and countries.", fits: (p) => p.dated > 0.5 },
  { id: "research", label: "Research", description: "A study archive: a lead study, topics, the latest, and search.", accent: "#7C4A1E", fonts: "editorial", needs: "Any collection.", fits: () => true },
  { id: "numbers", label: "Numbers", description: "The collection counted: key numbers, change over time, a map and a table.", accent: "#0F766E", fonts: "modern", needs: "Dated or located records.", fits: (p) => p.dated > 0.3 || p.located > 0.3 },
  { id: "images", label: "Images", description: "A picture archive: a masonry grid, collections, and a viewer with caption and rights.", accent: "#1A1A1A", fonts: "humanist", needs: "Records with pictures.", fits: (p) => !!p.imageTemplate },
  { id: "index", label: "Index", description: "An A–Z directory, with a count for every entry.", accent: "#334155", fonts: "modern", needs: "Any collection.", fits: () => true },
  { id: "editorial", label: "Editorial", description: "Long-form stories that name records inline, with pull quotes and a timeline.", accent: "#9F1239", fonts: "editorial", needs: "Dated records help the timeline.", fits: () => true },
  { id: "monitoring", label: "Monitoring", description: "Obligations and where they stand: status overview, filters, a table, and each record's status history.", accent: "#B45309", fonts: "modern", needs: "Records with a status, ideally dated.", fits: (p) => !!p.statusTemplate },
  { id: "campaign", label: "Campaign", description: "One focused ask: a button, key numbers, featured cases and what you're asking for.", accent: "#B91C1C", fonts: "humanist", needs: "Any collection.", fits: () => true },
];
export const siteType = (id: TemplateId) => SITE_TYPES.find((t) => t.id === id)!;

/** What the templates need to know about a collection, read once through its
 *  DataSource. */
export interface CollectionProfile {
  info: CollectionInfo;
  templates: Template[];
  thesauri: Thesaurus[];
  counts: Map<string, number>;
  /** The template a site is about: the most records × the richest record. */
  main: string;
  /** A template whose records carry a status (Monitoring). */
  statusTemplate?: string;
  /** A template whose records carry pictures (Images). */
  imageTemplate?: string;
  /** Share of the main template's records with a date / a place. */
  dated: number;
  located: number;
  /** Main-template records, most connected first. */
  top: string[];
  /** A property of the main template worth browsing by (many values, not too many). */
  topicKey?: string;
  /** Properties with values on the main template. */
  valueKeys: string[];
}

export async function profile(ds: DataSource): Promise<CollectionProfile> {
  const [info, templates, thesauri, byTemplate] = await Promise.all([ds.info(), ds.templates(), ds.thesauri(), ds.aggregate({ by: "template" })]);
  const counts = new Map(byTemplate.map((b) => [b.key, b.count]));
  const score = (t: Template) => (counts.get(t.id) ?? 0) * (1 + t.properties.length);
  const main = [...templates].sort((a, b) => score(b) - score(a))[0]?.id ?? templates[0]?.id;

  const [statusBuckets, withImage, sample, top] = await Promise.all([
    ds.aggregate({ by: "template", filters: {} }).then(async (ts) => {
      const withStatus = await Promise.all(ts.map(async (t) => ({ t: t.key, n: (await ds.aggregate({ by: "status", template: t.key })).reduce((s, b) => s + b.count, 0) })));
      return withStatus.sort((a, b) => b.n - a.n)[0];
    }),
    ds.aggregate({ by: "template", filters: {} }).then(async (ts) => {
      const n = await Promise.all(ts.map(async (t) => ({ t: t.key, n: (await ds.search({ template: t.key, withImage: true, limit: 1 })).total })));
      return n.sort((a, b) => b.n - a.n)[0];
    }),
    ds.search({ template: main, limit: 400 }),
    ds.search({ template: main, sort: "connected", limit: 8 }),
  ]);
  // Prefer a template whose status has a dated history (a monitoring record);
  // otherwise the template with the most statuses.
  let statusTemplate = statusBuckets && statusBuckets.n >= 5 ? statusBuckets.t : undefined;
  const hist = await Promise.all(templates.map(async (t) => ({ t: t.id, h: (await ds.search({ template: t.id, limit: 50 })).rows.filter((e) => e.history?.length).length })));
  const withHistory = hist.sort((a, b) => b.h - a.h)[0];
  if (withHistory && withHistory.h >= 5) statusTemplate = withHistory.t;

  const rows = sample.rows;
  const mainT = templates.find((t) => t.id === main);
  const valueKeys = (mainT?.properties ?? []).filter((p) => p.type === "select" || p.type === "multiselect").map((p) => p.name);
  const topicKey = valueKeys
    .map((k) => ({ k, n: thesauri.find((t) => t.id === k)?.values.length ?? 0 }))
    .filter((x) => x.n >= 3 && x.n <= 80)
    .sort((a, b) => b.n - a.n)[0]?.k;

  return {
    info,
    templates,
    thesauri,
    counts,
    main,
    statusTemplate,
    imageTemplate: withImage && withImage.n > 5 ? withImage.t : undefined,
    dated: rows.length ? rows.filter((e) => e.date).length / rows.length : 0,
    located: rows.length ? rows.filter((e) => e.geo).length / rows.length : 0,
    top: top.rows.map((e) => e.id),
    topicKey,
    valueKeys,
  };
}

/* ── Building a site ──────────────────────────────────────────────────── */

const L = (en: string, es: string): L10n => ({ en, es });

function page(kind: Page["kind"], title: L10n, slug: string, blocks: Block[], template?: string): Page {
  return { id: newId("p"), kind, title, slug, blocks, template };
}

export function buildSite(type: TemplateId, p: CollectionProfile): SiteConfig {
  const meta = siteType(type);
  const main = p.main;
  const B = makeBlock;
  const name: L10n = { en: p.info.name, es: p.info.name };
  const desc: L10n = { en: p.info.description };
  const topicKey = p.topicKey ?? "country";
  const listNoun: Record<TemplateId, L10n> = {
    legal: L("Cases", "Casos"),
    research: L("Studies", "Estudios"),
    numbers: L("Data", "Datos"),
    images: L("Works", "Obras"),
    index: L("Directory", "Directorio"),
    editorial: L("Archive", "Archivo"),
    monitoring: L("Tracker", "Seguimiento"),
    campaign: L("Cases", "Casos"),
  };
  const subject = type === "monitoring" && p.statusTemplate ? p.statusTemplate : type === "images" && p.imageTemplate ? p.imageTemplate : main;
  const top = p.top;

  let home: Block[] = [];
  let entity: Block[] = [];
  let listKeys = ["country", "year"];
  switch (type) {
    case "legal":
      listKeys = ["country", "status", "year", ...(p.topicKey ? [p.topicKey] : [])];
      home = [
        B("hero", main, { title: name, subtitle: L("Every case, judgment and order — searchable by court, country and date.", "Cada caso, sentencia y resolución, por tribunal, país y fecha.") }),
        B("search", main, { placeholder: L("Search cases, parties, articles…", "Buscar casos, partes, artículos…") }),
        B("facets", main, { title: L("Browse by", "Explorar por"), keys: ["country", "status", ...(p.topicKey ? [p.topicKey] : [])] }),
        B("entityList", main, { title: L("Latest cases", "Casos recientes"), sort: "recent", limit: 6, layout: "list" }),
        B("entityList", main, { title: L("Most cited", "Más citados"), sort: "connected", limit: 6, layout: "list" }),
      ];
      entity = [
        B("entityHeader"),
        B("entityFields", undefined, { title: L("Case details", "Datos del caso") }),
        B("entitySummary", undefined, { title: L("Holding", "Resumen") }),
        B("entityConnections", undefined, { title: L("Documents and decisions", "Documentos y decisiones"), mode: "cites" }),
        B("entityConnections", undefined, { title: L("Cited by", "Citado por"), mode: "citedBy", limit: 8 }),
        B("entityCitation"),
      ];
      break;
    case "research":
      home = [
        B("hero", main, { title: name, subtitle: { ...desc } }),
        B("featured", main, { title: L("Lead study", "Estudio principal"), ids: top.slice(0, 3), lead: true }),
        B("topics", main, { title: L("Topics", "Temas"), key: topicKey, limit: 12 }),
        B("entityList", main, { title: L("Latest", "Lo más reciente"), sort: "recent", limit: 6, layout: "cards" }),
        B("search", main, { placeholder: L("Search the archive", "Buscar en el archivo") }),
      ];
      entity = [
        B("entityHeader"),
        B("entitySummary", undefined, { title: L("Abstract", "Resumen") }),
        B("entityFields", undefined, { title: L("Details", "Detalles") }),
        B("entityDownload"),
        B("entityConnections", undefined, { title: L("Related", "Relacionados") }),
        B("entityCitation"),
      ];
      break;
    case "numbers":
      home = [
        B("hero", main, { title: name, subtitle: L("The collection, counted.", "La colección, en cifras.") }),
        B("stats", main, {
          title: L("", ""),
          items: [
            { id: newId("s"), label: L("Records", "Registros") },
            { id: newId("s"), label: L(p.templates.find((t) => t.id === main)?.name ?? "Main", p.templates.find((t) => t.id === main)?.name ?? "Principal"), template: main },
            ...(p.statusTemplate ? [{ id: newId("s"), label: L("With a status", "Con estado"), template: p.statusTemplate }] : []),
          ],
        }),
        B("chart", main, { title: L("Over time", "En el tiempo"), by: "year", kind: "columns" }),
        B("map", main, { title: L("Where", "Dónde") }),
        B("chart", main, { title: L("By country", "Por país"), by: "country", kind: "bars" }),
        B("table", main, { title: L("The records", "Los registros"), keys: ["country", "year", ...(p.statusTemplate === main ? ["status"] : [])], limit: 10 }),
        B("text", main, { title: L("Methodology", "Metodología"), body: L("These numbers are counted live from the collection. A record counts once, under its own date and country.", "Estas cifras se cuentan en vivo desde la colección. Cada registro cuenta una vez, en su fecha y país.") }),
      ];
      entity = [B("entityHeader"), B("entityFields"), B("entityConnections")];
      break;
    case "images":
      listKeys = [p.valueKeys[0] ?? "country", "year"].filter(Boolean);
      home = [
        B("hero", subject, { title: name, subtitle: { ...desc } }),
        B("gallery", subject, { title: L("", ""), limit: 24, layout: "masonry" }),
        B("collections", subject, { title: L("Collections", "Colecciones"), key: firstTextKey(p, subject) ?? "country" }),
      ];
      entity = [B("entityHeader", undefined, { showImage: true }), B("entityFields", undefined, { title: L("Caption and rights", "Pie y derechos") }), B("entityConnections", undefined, { title: L("More from this collection", "Más de esta colección") })];
      break;
    case "index":
      home = [
        B("hero", main, { title: name, subtitle: L("Everything in the collection, from A to Z.", "Todo en la colección, de la A a la Z.") }),
        B("search", main, { placeholder: L("Find an entry", "Buscar una entrada") }),
        B("index", main, { title: L("A–Z", "A–Z"), key: "title" }),
        B("index", main, { title: L("By country", "Por país"), key: "country" }),
      ];
      entity = [B("entityHeader"), B("entityFields"), B("entityConnections")];
      break;
    case "editorial": {
      const [a, b] = top;
      const mention = (id?: string) => (id ? `@[${id}]` : "the first case");
      home = [
        B("hero", main, { title: L("What the record shows", "Lo que muestra el registro"), subtitle: L("A reading of the collection, one case at a time.", "Una lectura de la colección, caso por caso.") }),
        B("text", main, {
          title: L("", ""),
          body: L(
            `The collection holds ${p.info.total.toLocaleString("en-US")} records. Two of them anchor this story: ${mention(a)} and ${mention(b)}.\n\nBoth are connected to more records than any other, and both run across years rather than days.`,
            `La colección reúne ${p.info.total.toLocaleString("es")} registros. Dos de ellos sostienen esta historia: ${mention(a)} y ${mention(b)}.\n\nAmbos están conectados con más registros que ningún otro.`,
          ),
        }),
        B("quote", main, { text: L("A record is only as useful as what it is connected to.", "Un registro vale por lo que conecta."), attribution: L("From the archive's notes", "De las notas del archivo") }),
        B("timeline", main, { title: L("On the record", "En el registro"), limit: 14 }),
        B("featured", main, { title: L("Sources", "Fuentes"), ids: top.slice(0, 4), lead: false }),
        B("share", main),
      ];
      entity = [B("entityHeader"), B("entitySummary"), B("entityFields"), B("entityConnections")];
      break;
    }
    case "monitoring": {
      const s = subject;
      listKeys = ["status", "country", "year"];
      home = [
        B("hero", s, { title: name, subtitle: L("Every obligation, and where it stands.", "Cada obligación y en qué estado está.") }),
        B("statusBar", s, { title: L("Where things stand", "Estado actual"), key: "status" }),
        B("facets", s, { title: L("Filter by", "Filtrar por"), keys: ["status", "country", "year"] }),
        B("table", s, { title: L("Latest changes", "Últimos cambios"), keys: ["status", "country", "date"], limit: 12 }),
      ];
      entity = [
        B("entityHeader"),
        B("entityHistory"),
        B("entityFields", undefined, { title: L("Details", "Detalles") }),
        B("entitySummary", undefined, { title: L("Evidence", "Evidencia") }),
        B("entityConnections", undefined, { title: L("Responsible and related", "Responsables y relacionados") }),
      ];
      break;
    }
    case "campaign":
      home = [
        B("hero", main, {
          title: L("Justice can't wait", "La justicia no puede esperar"),
          subtitle: L("These cases have waited years for an answer. Add your name.", "Estos casos llevan años esperando una respuesta. Sume su nombre."),
          ctaKind: "link",
          ctaLabel: L("Sign the petition", "Firme la petición"),
          ctaHref: "https://example.org/petition",
        }),
        B("stats", main, { title: L("", ""), items: [{ id: newId("s"), label: L("Cases", "Casos"), template: main }, { id: newId("s"), label: L("Records in the archive", "Registros en el archivo") }] }),
        B("featured", main, { title: L("Their stories", "Sus historias"), ids: top.slice(0, 4), lead: false }),
        B("asks", main, { title: L("What we're asking", "Lo que pedimos"), items: [L("Comply with every judgment in full.", "Cumplir cada sentencia en su totalidad."), L("Publish progress every six months.", "Publicar avances cada seis meses."), L("Meet the families.", "Reunirse con las familias.")] }),
        B("cta", main, { title: L("Stay informed", "Manténgase informado"), body: L("One email when something changes. Nothing else.", "Un correo cuando algo cambie. Nada más."), label: L("Sign up", "Suscribirse"), kind: "signup" }),
        B("share", main),
      ];
      entity = [
        B("entityHeader"),
        B("entitySummary", undefined, { title: L("Their story", "Su historia") }),
        B("cta", main, { title: L("Add your name", "Sume su nombre"), body: L("", ""), label: L("Sign the petition", "Firme la petición"), href: "https://example.org/petition", kind: "link" }),
        B("entityFields"),
        B("share", main),
      ];
      break;
  }

  const list = page("list", listNoun[type], slugOf(listNoun[type].en!), [makeBlock("results", subject, { keys: listKeys })], subject);
  const about = page("about", L("About", "Acerca de"), "about", [
    makeBlock("hero", main, { title: L("About this site", "Acerca de este sitio"), subtitle: { ...desc } }),
    makeBlock("text", main, {
      title: L("What's here", "Qué hay aquí"),
      body: L(
        `${p.info.total.toLocaleString("en-US")} records from the ${p.info.name} collection, published with Uwazi.\n\n- Every record links to the records it names.\n- Numbers and lists are counted live from the collection.`,
        `${p.info.total.toLocaleString("es")} registros de la colección ${p.info.name}, publicados con Uwazi.\n\n- Cada registro enlaza con los registros que menciona.\n- Las cifras y listas se cuentan en vivo desde la colección.`,
      ),
    }),
    makeBlock("contact", main, { title: L("Contact", "Contacto"), body: L("Questions about the collection, or a correction? Write to us.", "¿Preguntas o una corrección? Escríbanos.") }),
  ]);
  const homePage = page("home", L("Home", "Inicio"), "", home);
  const entityPage = page("entity", L("Record", "Registro"), "entity", entity, subject);

  return {
    version: 1,
    collection: p.info.id as SiteConfig["collection"],
    template: type,
    languages: p.info.languages,
    defaultLanguage: p.info.languages[0],
    name,
    tagline: desc,
    theme: { accent: meta.accent, fonts: meta.fonts, mode: "light" },
    menu: [
      { id: newId("m"), label: L("Home", "Inicio"), page: homePage.id },
      { id: newId("m"), label: listNoun[type], page: list.id },
      { id: newId("m"), label: L("About", "Acerca de"), page: about.id },
    ],
    footer: {
      text: L(`© ${new Date().getFullYear()} ${p.info.name}`, `© ${new Date().getFullYear()} ${p.info.name}`),
      links: [{ id: newId("m"), label: L("Contact", "Contacto"), page: about.id }],
      poweredBy: true,
    },
    seo: { title: name, description: desc },
    pages: [homePage, list, entityPage, about],
    advanced: { enabled: false, css: "", js: "" },
  };
}

function slugOf(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Images: the first text property that repeats across records (a genre) makes
 *  better collections than a country the artworks don't carry. */
function firstTextKey(p: CollectionProfile, template: string) {
  const t = p.templates.find((x) => x.id === template);
  return t?.properties.find((x) => /genre|g[eé]nero|series|type|tipo/i.test(x.label))?.name ?? p.valueKeys[0];
}
