/* The public site: header, the current page's blocks, footer. Runs on its own
 * (site.html) and inside the builder's preview frame. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Menu as MenuIcon, X } from "lucide-react";
import type { DataSource, Entity, Template } from "../data/types";
import type { Block, MenuItem, Page, SiteConfig } from "../model/config";
import { LANG_NAMES, entityPage, isRtl, pageBySlug, tr } from "../model/config";
import { BLOCKS } from "../model/blocks";
import { shownIn } from "../model/style";
import { BlockStyleProvider, wrapperProps } from "./blockStyle";
import { SiteProvider, routeHref, useQuery, useSite, type Route, type SiteCtx } from "./context";
import { themeVars } from "./theme";
import { ui } from "./ui";
import { Picture, Asks, Contact, CtaBand, Hero, Quote, Share, Text } from "./blocks/content";
import { Chart, Collections, EntityList, Facets, Featured, Gallery, IndexBlock, MapBlock, Results, Search, Stats, StatusBar, Table, Timeline, Topics } from "./blocks/collection";
import { EntityCitation, EntityConnections, EntityCtx, EntityDownload, EntityFields, EntityHeader, EntityHistory, EntitySummary } from "./blocks/entity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RENDER: Record<string, (props: { p: any; page: Page }) => ReactNode> = {
  hero: Hero,
  text: Text,
  quote: Quote,
  asks: Asks,
  cta: CtaBand,
  share: Share,
  contact: Contact,
  search: Search,
  facets: Facets,
  stats: Stats,
  statusBar: StatusBar,
  entityList: EntityList,
  featured: Featured,
  topics: Topics,
  map: MapBlock,
  chart: Chart,
  timeline: Timeline,
  index: IndexBlock,
  gallery: Gallery,
  collections: Collections,
  table: Table,
  results: ({ p, page }) => <ResultsWithTitle p={p} page={page} />,
  entityHeader: EntityHeader,
  entityFields: EntityFields,
  entitySummary: EntitySummary,
  entityHistory: EntityHistory,
  entityConnections: EntityConnections,
  entityDownload: EntityDownload,
  entityCitation: EntityCitation,
};

function ResultsWithTitle({ p, page }: { p: Parameters<typeof Results>[0]["p"]; page: Page }) {
  const { t } = useSite();
  return <Results p={p} title={t(page.title)} />;
}

/** Header and footer in the builder: outlined while Whole site › Menu or
 * Footer is open, so the edit and its result are on screen together. */
function useRegion(id: "__header" | "__footer") {
  const { preview, selected } = useSite();
  if (!preview) return {};
  return { "data-block-id": id, "data-region-on": selected === id ? "" : undefined };
}

function BlockView({ block, page }: { block: Block; page: Page }) {
  const { preview, selected, onSelect, lang } = useSite();
  const R = RENDER[block.type];
  const st = block.style;
  const langOff = !shownIn(st, lang);
  if ((block.hidden || langOff) && !preview) return null;
  const w = wrapperProps(st, preview);
  const inner = R ? <R p={block.props} page={page} /> : null;
  const body = (
    <BlockStyleProvider value={st}>
      {st?.bg === "image" && st.bgImage ? (
        <>
          <Picture image={st.bgImage} className="absolute inset-0 w-full h-full -z-10" />
          <div aria-hidden className={`absolute inset-0 -z-10 ${st.overlay === "strong" ? "bg-black/65" : "bg-black/40"}`} />
        </>
      ) : null}
      {inner}
    </BlockStyleProvider>
  );
  if (!preview)
    return (
      <div data-block={block.type} {...w}>
        {body}
      </div>
    );
  // In the builder: every block is a target. Clicking outside a link selects
  // it in the editor; hidden blocks, and blocks hidden in this language, show
  // faded so they can still be found.
  const on = selected === block.id;
  const faded = block.hidden || langOff;
  const note = block.hidden ? " · hidden" : langOff ? ` · not in ${lang.toUpperCase()}` : "";
  return (
    <div
      data-block-id={block.id}
      data-block={block.type}
      {...w}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("a,button,input,label,select,textarea")) return;
        onSelect?.(block.id);
      }}
      className={`relative ${w.className} ${faded ? "opacity-35" : ""} ${on ? "outline-2 -outline-offset-2 outline-[var(--accent-blue)]" : "hover:outline-1 hover:-outline-offset-1 hover:outline-[color-mix(in_srgb,var(--accent-blue)_55%,transparent)]"}`}
    >
      {on || faded ? (
        <span className="absolute top-1 end-1 z-20 rounded-md bg-[var(--accent-blue)] px-1.5 py-0.5 text-[0.6875rem] font-medium text-white pointer-events-none">
          {BLOCKS[block.type].label}
          {note}
        </span>
      ) : null}
      {body}
    </div>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { config, t, lang, route, navigate } = useSite();
  const home = pageBySlug(config, "");
  const pageOf = (m: MenuItem) => config.pages.find((p) => p.id === m.page);
  const region = useRegion("__header");
  return (
    <header {...region} className="border-b border-border bg-paper sticky top-0 z-30 data-[region-on]:outline-2 data-[region-on]:-outline-offset-2 data-[region-on]:outline-[var(--accent-blue)]">
      <div className="mx-auto max-w-[80rem] px-5 h-16 flex items-center gap-6">
        <a
          href={routeHref({ lang, slug: "" })}
          onClick={(e) => {
            e.preventDefault();
            navigate({ slug: home?.slug ?? "", entity: undefined, q: undefined, filters: {} });
          }}
          className="flex items-center gap-2.5 min-w-0 me-auto"
        >
          {config.theme.logo ? (
            <Picture image={config.theme.logo} className="h-8 w-auto max-w-[10rem] object-contain" />
          ) : (
            <span aria-hidden className="w-7 h-7 rounded-md bg-accent grid place-items-center text-on-accent text-sm font-semibold shrink-0">
              {t(config.name).trim().charAt(0)}
            </span>
          )}
          <span className="font-heading text-lg text-ink truncate">{t(config.name)}</span>
        </a>
        <nav aria-label="Main" className="hidden md:flex items-center gap-1">
          {config.menu.map((m) => {
            const p = pageOf(m);
            const active = p ? !route.entity && route.slug === p.slug : false;
            return (
              <a
                key={m.id}
                href={p ? routeHref({ lang, slug: p.slug }) : m.url}
                aria-current={active ? "page" : undefined}
                onClick={(e) => {
                  if (!p) return;
                  e.preventDefault();
                  navigate({ slug: p.slug, entity: undefined, q: undefined, filters: {} });
                }}
                className={`h-9 px-3 inline-flex items-center rounded-md text-sm ${active ? "bg-vellum text-ink" : "text-ink-secondary hover:text-ink hover:bg-warm"}`}
              >
                {t(m.label)}
              </a>
            );
          })}
        </nav>
        {config.languages.length > 1 ? (
          <label className="hidden sm:flex relative items-center">
            <span className="sr-only">{ui("language", lang)}</span>
            <ChevronDown size={14} aria-hidden className="pointer-events-none absolute end-2.5 text-ink-tertiary" />
            <select value={lang} onChange={(e) => navigate({ lang: e.target.value })} className="h-9 appearance-none rounded-md border border-border-soft bg-paper ps-3 pe-8 text-sm text-ink">
              {config.languages.map((l) => (
                <option key={l} value={l}>
                  {LANG_NAMES[l]?.native ?? l}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" className="md:hidden w-10 h-10 grid place-items-center rounded-md text-ink hover:bg-warm" aria-label={ui("menu", lang)} onClick={onMenu}>
          <MenuIcon size={20} />
        </button>
      </div>
    </header>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { config, t, lang, navigate } = useSite();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("a,button")?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={ui("menu", lang)} className="fixed inset-0 z-50 bg-paper flex flex-col">
      <div className="h-16 px-5 flex items-center justify-between border-b border-border">
        <span className="font-heading text-lg text-ink">{t(config.name)}</span>
        <button type="button" onClick={onClose} className="w-10 h-10 grid place-items-center rounded-md hover:bg-warm" aria-label={ui("close", lang)}>
          <X size={20} />
        </button>
      </div>
      <nav className="flex flex-col p-3">
        {config.menu.map((m) => {
          const p = config.pages.find((x) => x.id === m.page);
          return (
            <a
              key={m.id}
              href={p ? routeHref({ lang, slug: p.slug }) : m.url}
              onClick={(e) => {
                if (!p) return;
                e.preventDefault();
                onClose();
                navigate({ slug: p.slug, entity: undefined, q: undefined, filters: {} });
              }}
              className="h-12 px-3 flex items-center rounded-md text-lg text-ink hover:bg-warm"
            >
              {t(m.label)}
            </a>
          );
        })}
      </nav>
      {config.languages.length > 1 ? (
        <div className="mt-auto p-5 flex flex-wrap gap-2 border-t border-border">
          {config.languages.map((l) => (
            <button key={l} type="button" onClick={() => navigate({ lang: l })} aria-pressed={l === lang} className={`h-9 px-3 rounded-md text-sm ${l === lang ? "bg-vellum text-ink" : "text-ink-secondary"}`}>
              {LANG_NAMES[l]?.native ?? l}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Footer() {
  const { config, t, lang, navigate } = useSite();
  const region = useRegion("__footer");
  return (
    <footer {...region} className="mt-12 border-t border-border bg-warm data-[region-on]:outline-2 data-[region-on]:-outline-offset-2 data-[region-on]:outline-[var(--accent-blue)]">
      <div className="mx-auto max-w-[80rem] px-5 py-10 flex flex-col sm:flex-row gap-6 sm:items-end">
        <div className="flex flex-col gap-2 me-auto">
          <span className="font-heading text-lg text-ink">{t(config.name)}</span>
          {t(config.footer.text) ? <p className="text-sm text-ink-tertiary">{t(config.footer.text)}</p> : null}
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {config.footer.links.map((m) => {
            const p = config.pages.find((x) => x.id === m.page);
            return (
              <a
                key={m.id}
                href={p ? routeHref({ lang, slug: p.slug }) : m.url}
                onClick={(e) => {
                  if (!p) return;
                  e.preventDefault();
                  navigate({ slug: p.slug, entity: undefined, q: undefined, filters: {} });
                }}
                className="text-ink-secondary hover:text-ink underline-offset-2 hover:underline"
              >
                {t(m.label)}
              </a>
            );
          })}
          {config.footer.poweredBy ? <span className="text-ink-muted">{ui("poweredBy", lang)}</span> : null}
        </nav>
      </div>
    </footer>
  );
}

/** An entity page needs its record: the route's, or in the builder, a sample. */
function EntityPageBody({ page, id }: { page: Page; id?: string }) {
  const { lang } = useSite();
  const q = useQuery(`entity-page:${id ?? `sample:${page.template}`}`, async (ds): Promise<Entity | null> => {
    if (id) return ds.entity(id);
    // The builder shows the richest record, so every block has something to show.
    const r = await ds.search({ template: page.template, sort: "connected", limit: 40 });
    const score = (e: Entity) => (e.history?.length ? 4 : 0) + (e.summary ? 2 : 0) + (e.image ? 2 : 0) + Math.min(3, e.metadata.length / 3);
    return [...r.rows].sort((a, b) => score(b) - score(a))[0] ?? null;
  });
  if (q.error) return <Notice text={ui("error", lang)} />;
  if (q.loading && !q.data) return <Skeleton />;
  if (!q.data) return <Notice text={ui("entityMissing", lang)} />;
  return (
    <EntityCtx.Provider value={q.data}>
      {page.blocks.map((b) => (
        <BlockView key={b.id} block={b} page={page} />
      ))}
    </EntityCtx.Provider>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="mx-auto max-w-[68rem] px-5 py-24">
      <p className="font-heading text-2xl text-ink">{text}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" className="mx-auto max-w-[68rem] px-5 py-14 flex flex-col gap-4">
      <div className="h-4 w-40 rounded bg-vellum animate-pulse" />
      <div className="h-10 w-3/4 rounded bg-vellum animate-pulse" />
      <div className="h-4 w-1/2 rounded bg-vellum animate-pulse" />
    </div>
  );
}

export interface SiteProps {
  config: SiteConfig;
  ds: DataSource;
  route: Route;
  onNavigate: (r: Route) => void;
  preview?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
}

export function Site({ config, ds, route, onNavigate, preview = false, selected, onSelect }: SiteProps) {
  const [menu, setMenu] = useState(false);
  const tq = useTemplatesOnce(ds);
  const lang = config.languages.includes(route.lang) ? route.lang : config.defaultLanguage;
  const page: Page | undefined = route.entity || route.slug === "entity" ? entityPage(config) : pageBySlug(config, route.slug);
  const t = (x: Parameters<SiteCtx["t"]>[0]) => tr(x, lang, config.defaultLanguage);
  const ctx: SiteCtx | null = page
    ? {
        config,
        ds,
        lang,
        route: { ...route, lang },
        page,
        templates: tq,
        navigate: (r) => onNavigate({ ...route, lang, ...r }),
        t,
        preview,
        selected,
        onSelect,
      }
    : null;

  // Document-level settings the page can't set from inside the tree.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = isRtl(lang) ? "rtl" : "ltr";
    const dark = config.theme.mode === "dark" || (config.theme.mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", dark);
    const title = page?.seo?.title ? t(page.seo.title) : page && page.kind !== "home" ? `${t(page.title)} · ${t(config.name)}` : t(config.seo.title) || t(config.name);
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", t(page?.seo?.description) || t(config.seo.description));
  });

  const vars = useMemo(() => themeVars(config.theme), [config.theme]);

  // Custom JavaScript (Whole site › Advanced): once per page view, after the
  // page has rendered. A throw is caught so the page still shows; the preview
  // says what went wrong. In the builder the code changes as it is typed, so
  // it runs after a pause, on a freshly mounted page: a script that edits the
  // DOM would otherwise stack its edits on the previous run's.
  const [scriptError, setScriptError] = useState<string>();
  const typed = config.advanced.enabled ? config.advanced.js.trim() : "";
  const [js, setJs] = useState(typed);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (typed === js) return;
    if (!preview) return setJs(typed);
    const t = setTimeout(() => {
      setJs(typed);
      setRun((n) => n + 1);
    }, 800);
    return () => clearTimeout(t);
  }, [typed, js, preview]);
  useEffect(() => {
    setScriptError(undefined);
    if (!js) return;
    const t = setTimeout(() => {
      try {
        new Function(js)();
      } catch (e) {
        setScriptError((e as Error).message);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [js, run, route.slug, route.entity, lang]);
  const custom = config.advanced.enabled ? config.advanced.css : "";

  return (
    <div className="site min-h-screen flex flex-col bg-paper text-ink font-body" style={vars as React.CSSProperties}>
      {custom ? <style>{custom}</style> : null}
      {preview && scriptError ? (
        <p role="alert" className="sticky top-0 z-40 bg-seal-tint text-ink text-sm px-5 py-2">
          Custom JavaScript stopped with an error: {scriptError}
        </p>
      ) : null}
      {!ctx ? (
        <Notice text={ui("notFound", lang)} />
      ) : (
        <SiteProvider value={ctx} key={run}>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:bg-paper focus:px-3 focus:py-2 focus:rounded-md">
            Skip to content
          </a>
          <Header onMenu={() => setMenu(true)} />
          {menu ? <MobileMenu onClose={() => setMenu(false)} /> : null}
          <main id="main" className="flex-1" key={`${page!.id}:${route.entity ?? ""}`}>
            {page!.kind === "entity" ? (
              <EntityPageBody page={page!} id={route.entity} />
            ) : (
              page!.blocks.map((b) => <BlockView key={b.id} block={b} page={page!} />)
            )}
          </main>
          <Footer />
        </SiteProvider>
      )}
    </div>
  );
}

/** Templates are needed by every block (names, colours); load them once. */
function useTemplatesOnce(ds: DataSource) {
  const [map, setMap] = useState<Map<string, Template>>(new Map());
  useEffect(() => {
    let alive = true;
    ds.templates().then((ts) => alive && setMap(new Map(ts.map((t) => [t.id, t]))), () => {});
    return () => {
      alive = false;
    };
  }, [ds]);
  return map;
}
