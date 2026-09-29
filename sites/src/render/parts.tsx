/* Shared pieces the blocks are built from. */
import type { ReactNode } from "react";
import type { Entity } from "../data/types";
import { valuesOf } from "../data/mock";
import { entityPage } from "../model/config";
import { routeHref, useSite, type QueryState } from "./context";
import { ui, type UiKey } from "./ui";

export function Section({ title, children, className = "", wide = false }: { title?: string; children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <section className={`mx-auto w-full ${wide ? "max-w-[80rem]" : "max-w-[68rem]"} px-5 py-8 sm:py-10 ${className}`}>
      {title ? <h2 className="font-heading text-2xl sm:text-[1.75rem] leading-tight text-ink mb-5 text-balance">{title}</h2> : null}
      {children}
    </section>
  );
}

export function EntityLink({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  const { route, navigate } = useSite();
  const href = routeHref({ lang: route.lang, slug: "entity", entity: id });
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate({ slug: "entity", entity: id, q: undefined, filters: {} });
      }}
    >
      {children}
    </a>
  );
}

export function PageLink({ slug, filters, q, children, className = "" }: { slug: string; filters?: Record<string, string[]>; q?: string; children: ReactNode; className?: string }) {
  const { route, navigate } = useSite();
  return (
    <a
      href={routeHref({ lang: route.lang, slug, filters, q })}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate({ slug, entity: undefined, filters: filters ?? {}, q });
      }}
    >
      {children}
    </a>
  );
}

export function TypeDot({ template, className = "" }: { template: string; className?: string }) {
  const { templates } = useSite();
  return <span aria-hidden className={`inline-block w-2 h-2 rounded-[2px] shrink-0 ${className}`} style={{ background: templates.get(template)?.color ?? "var(--text-muted)" }} />;
}

export const year = (e: Entity) => (e.date ? new Date(e.date).getUTCFullYear() : undefined);
export const fmtDate = (ms: number, lang: string) => new Date(ms).toLocaleDateString(lang === "ar" ? "ar" : lang, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

/** The one-line summary under a record's title: type · country · year · status. */
export function useMetaLine() {
  const { templates } = useSite();
  return (e: Entity) => [templates.get(e.template)?.name, e.country, year(e), e.status].filter(Boolean).join(" · ");
}

export function EntityCard({ e, lead = false }: { e: Entity; lead?: boolean }) {
  const meta = useMetaLine();
  return (
    <EntityLink
      id={e.id}
      className={`group flex flex-col gap-2 rounded-lg border border-border bg-paper hover:border-border-soft hover:shadow-[var(--shadow-md)] transition-shadow overflow-hidden ${lead ? "sm:col-span-2 sm:row-span-2" : ""}`}
    >
      {e.image ? (
        <img src={e.image.url} alt={e.image.alt} loading="lazy" className={`w-full object-cover bg-vellum ${lead ? "h-72" : "h-40"}`} />
      ) : null}
      <span className={`flex flex-col gap-1.5 ${lead ? "p-6" : "p-4"}`}>
        <span className="flex items-center gap-1.5 text-xs text-ink-tertiary">
          <TypeDot template={e.template} />
          <span className="truncate">{meta(e)}</span>
        </span>
        <span className={`font-heading text-ink group-hover:text-accent-text text-pretty ${lead ? "text-2xl sm:text-3xl leading-tight" : "text-lg leading-snug"}`}>{e.title}</span>
        {lead && e.summary ? <span className="text-sm text-ink-secondary line-clamp-4 mt-1">{e.summary}</span> : null}
      </span>
    </EntityLink>
  );
}

export function EntityRow({ e }: { e: Entity }) {
  const meta = useMetaLine();
  return (
    <li className="border-b border-border">
      <EntityLink id={e.id} className="group flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
        <span className="flex items-baseline gap-2 min-w-0 flex-1 basis-[18rem]">
          <TypeDot template={e.template} className="translate-y-[-1px]" />
          <span className="text-ink group-hover:text-accent-text group-hover:underline underline-offset-2 text-pretty">{e.title}</span>
        </span>
        <span className="text-xs text-ink-tertiary ms-auto">{meta(e)}</span>
      </EntityLink>
    </li>
  );
}

export function keyLabel(key: string, lang: string, templates: Iterable<{ properties: { name: string; label: string }[] }>) {
  if (["country", "status", "year", "decade", "template", "date", "title"].includes(key)) return ui(key as UiKey, lang);
  for (const t of templates) {
    const p = t.properties.find((x) => x.name === key);
    if (p) return p.label;
  }
  return key;
}

export function EntityTable({ rows, keys }: { rows: Entity[]; keys: string[] }) {
  const { lang, templates } = useSite();
  const tpls = [...templates.values()];
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm border-collapse min-w-[36rem]">
        <thead>
          <tr className="text-start text-xs text-ink-tertiary border-b border-border-soft">
            <th scope="col" className="text-start font-medium py-2 pe-4">{ui("title", lang)}</th>
            {keys.map((k) => (
              <th key={k} scope="col" className="text-start font-medium py-2 pe-4 whitespace-nowrap">
                {keyLabel(k, lang, tpls)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-border align-top">
              <td className="py-2.5 pe-4">
                <EntityLink id={e.id} className="inline-flex items-baseline gap-2 text-ink hover:text-accent-text hover:underline underline-offset-2">
                  <TypeDot template={e.template} className="translate-y-[-1px]" />
                  {e.title}
                </EntityLink>
              </td>
              {keys.map((k) => (
                <td key={k} className="py-2.5 pe-4 text-ink-secondary">
                  {k === "status" && e.status ? <StatusChip value={e.status} /> : valuesOf(e, k).join(", ") || <span className="text-ink-muted">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Status colours: semantic tokens by meaning, not by position. */
export function statusTone(v: string): { dot: string; bg: string } {
  const s = v.toLowerCase();
  if (/(activ|pend|request|solicit|open|progress|curso)/.test(s)) return { dot: "var(--warning)", bg: "var(--warning-light)" };
  if (/(grant|otorg|compli|cumpl|decid|resuel)/.test(s)) return { dot: "var(--accent-blue)", bg: "var(--accent-blue-tint)" };
  if (/(clos|cerr|lift|levant|done|final)/.test(s)) return { dot: "var(--success)", bg: "var(--success-light)" };
  if (/(reject|rechaz|fail|incumpl)/.test(s)) return { dot: "var(--accent-seal)", bg: "var(--accent-seal-tint)" };
  return { dot: "var(--text-muted)", bg: "var(--bg-muted)" };
}

export function StatusChip({ value }: { value: string }) {
  const tone = statusTone(value);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium text-ink w-fit whitespace-nowrap" style={{ background: tone.bg }}>
      <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
      {value}
    </span>
  );
}

/** Loading, error and empty, the same way in every block. A skeleton keeps
 *  the block's height, so the page doesn't jump when data lands. */
export function Loadable<T>({ q, rows = 3, empty, children }: { q: QueryState<T>; rows?: number; empty?: (d: T) => boolean; children: (d: T) => ReactNode }) {
  const { lang } = useSite();
  if (q.error)
    return (
      <p role="alert" className="text-sm text-ink-secondary rounded-md bg-vellum px-4 py-3">
        {ui("error", lang)} <span className="text-ink-muted">({q.error.message})</span>
      </p>
    );
  if (q.data === undefined)
    return (
      <div aria-busy="true" aria-label={ui("loading", lang)} className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-5 rounded bg-vellum animate-pulse" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    );
  if (empty?.(q.data)) return <p className="text-sm text-ink-tertiary">{ui("empty", lang)}</p>;
  return <>{children(q.data)}</>;
}

export function useEntityHref() {
  const { config } = useSite();
  return (template: string) => entityPage(config, template);
}
