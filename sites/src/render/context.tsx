import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { DataSource, Template } from "../data/types";
import type { L10n, Lang, Page, SiteConfig } from "../model/config";
import { tr } from "../model/config";

/** Where the reader is: a page slug, or an entity, plus search state. */
export interface Route {
  lang: Lang;
  /** "" = home. */
  slug: string;
  entity?: string;
  q?: string;
  filters?: Record<string, string[]>;
}

export interface SiteCtx {
  config: SiteConfig;
  ds: DataSource;
  lang: Lang;
  route: Route;
  page: Page;
  templates: Map<string, Template>;
  navigate: (r: Partial<Route>) => void;
  t: (x: L10n | undefined) => string;
  /** Inside the builder's frame: blocks are selectable. */
  preview: boolean;
  selected?: string;
  onSelect?: (blockId: string) => void;
}

const Ctx = createContext<SiteCtx | null>(null);
export const SiteProvider = Ctx.Provider;
export function useSite() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSite outside a site");
  return c;
}

/* ── Routes in the URL hash: #/es/cases?q=…&country=Chile ──────────────── */

export function parseHash(hash: string, fallbackLang: Lang, langs: Lang[]): Route {
  const [path, qs = ""] = hash.replace(/^#\/?/, "").split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const lang = langs.includes(parts[0]) ? parts.shift()! : fallbackLang;
  const params = new URLSearchParams(qs);
  const filters: Record<string, string[]> = {};
  for (const [k, v] of params) if (k !== "q") (filters[k] ??= []).push(v);
  if (parts[0] === "entity" && parts[1]) return { lang, slug: "entity", entity: parts[1] };
  return { lang, slug: parts[0] ?? "", q: params.get("q") ?? undefined, filters };
}

export function routeHref(r: Route): string {
  const path = r.entity ? `entity/${encodeURIComponent(r.entity)}` : r.slug;
  const params = new URLSearchParams();
  if (r.q) params.set("q", r.q);
  for (const [k, vs] of Object.entries(r.filters ?? {})) for (const v of vs) params.append(k, v);
  const qs = params.toString();
  return `#/${r.lang}/${path}${qs ? `?${qs}` : ""}`;
}

/* ── Data: one small async hook, cached by key across blocks ───────────── */

const cache = new Map<string, Promise<unknown>>();
export function clearQueryCache() {
  cache.clear();
}

export interface QueryState<T> {
  data?: T;
  loading: boolean;
  error?: Error;
}

export function useQuery<T>(key: string, run: (ds: DataSource) => Promise<T>): QueryState<T> {
  const { ds } = useSite();
  const [state, setState] = useState<QueryState<T>>({ loading: true });
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    let alive = true;
    const k = `${ds.kind}:${key}`;
    let p = cache.get(k) as Promise<T> | undefined;
    if (!p) {
      p = runRef.current(ds);
      cache.set(k, p);
      p.catch(() => cache.delete(k));
    }
    setState((s) => (s.data === undefined ? { loading: true } : { ...s, loading: true }));
    p.then(
      (data) => alive && setState({ data, loading: false }),
      (error: Error) => alive && setState({ loading: false, error }),
    );
    return () => {
      alive = false;
    };
  }, [ds, key]);
  return state;
}

export const t = (c: SiteConfig, lang: Lang) => (x: L10n | undefined) => tr(x, lang, c.defaultLanguage);
