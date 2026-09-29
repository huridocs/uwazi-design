/* Blocks that read the collection through the DataSource. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search as SearchIcon, X } from "lucide-react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import type { Bucket, Entity, GroupBy } from "../../data/types";
import type { BlockProps } from "../../model/config";
import { isRtl, listPage } from "../../model/config";
import { useQuery, useSite } from "../context";
import { EntityCard, EntityLink, EntityRow, EntityTable, keyLabel, Loadable, PageLink, Section, statusTone, TypeDot, fmtDate, useMetaLine } from "../parts";
import { ui } from "../ui";

const key = (o: unknown) => JSON.stringify(o);
const groupBy = (by: string): GroupBy => (["year", "decade", "country", "status", "template"].includes(by) ? (by as GroupBy) : { property: by });
const nf = (lang: string) => new Intl.NumberFormat(lang === "ar" ? "ar" : lang);

function useListSlug(template?: string) {
  const { config } = useSite();
  return listPage(config, template)?.slug ?? "";
}

export function SearchBox({ p, initial = "", onSubmit }: { p: BlockProps["search"]; initial?: string; onSubmit?: (q: string) => void }) {
  const { t, lang, navigate } = useSite();
  const slug = useListSlug(p.template);
  const [q, setQ] = useState(initial);
  useEffect(() => setQ(initial), [initial]);
  return (
    <form
      role="search"
      className="flex gap-2 w-full max-w-[44rem]"
      onSubmit={(e) => {
        e.preventDefault();
        if (onSubmit) onSubmit(q.trim());
        else navigate({ slug, q: q.trim() || undefined, entity: undefined, filters: {} });
      }}
    >
      <label className="relative flex-1">
        <span className="sr-only">{ui("search", lang)}</span>
        <SearchIcon size={18} aria-hidden className="absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(p.placeholder)}
          className="w-full h-12 ps-11 pe-3 rounded-md border border-border-soft bg-paper text-ink text-base placeholder:text-ink-muted focus:outline-2 focus:outline-accent"
        />
      </label>
      <button type="submit" className="h-12 px-5 rounded-md bg-accent text-on-accent font-medium cursor-pointer hover:brightness-110">
        {ui("search", lang)}
      </button>
    </form>
  );
}

export function Search({ p }: { p: BlockProps["search"] }) {
  return (
    <Section>
      <SearchBox p={p} />
    </Section>
  );
}

function Chips({ template, k, limit = 10 }: { template?: string; k: string; limit?: number }) {
  const { lang, t: _t } = useSite();
  void _t;
  const slug = useListSlug(template);
  const q = useQuery(`agg:${key({ template, k })}`, (ds) => ds.aggregate({ by: groupBy(k), template }));
  return (
    <Loadable q={q} rows={1} empty={(d) => !d.length}>
      {(d) => (
        <ul className="flex flex-wrap gap-2">
          {(k === "year" ? d.slice(-limit).reverse() : d.slice(0, limit)).map((b) => (
            <li key={b.key}>
              <PageLink slug={slug} filters={{ [k]: [b.key] }} className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-border-soft bg-paper text-sm text-ink hover:bg-warm hover:border-ink/30">
                {k === "status" ? <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: statusTone(b.label).dot }} /> : null}
                {b.label}
                <span className="text-xs text-ink-tertiary tabular-nums">{nf(lang).format(b.count)}</span>
              </PageLink>
            </li>
          ))}
        </ul>
      )}
    </Loadable>
  );
}

export function Facets({ p }: { p: BlockProps["facets"] }) {
  const { t, lang, templates } = useSite();
  return (
    <Section title={t(p.title)}>
      <div className="flex flex-col gap-5">
        {p.keys.map((k) => (
          <div key={k} className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">{keyLabel(k, lang, templates.values())}</h3>
            <Chips template={p.template} k={k} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function StatValue({ it }: { it: BlockProps["stats"]["items"][number] }) {
  const { lang } = useSite();
  const filters = it.filter ? { [it.filter.key]: [it.filter.value] } : undefined;
  const q = useQuery(`count:${key({ t: it.template, filters })}`, (ds) => ds.search({ template: it.template, filters, limit: 0 }).then((r) => r.total));
  return (
    <span className="font-heading text-4xl sm:text-5xl leading-none text-ink tabular-nums">
      {q.data === undefined ? <span className="inline-block w-16 h-10 rounded bg-vellum animate-pulse align-middle" /> : nf(lang).format(q.data)}
    </span>
  );
}

export function Stats({ p }: { p: BlockProps["stats"] }) {
  const { t } = useSite();
  return (
    <Section title={t(p.title)}>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 border-y border-border py-8">
        {p.items.map((it) => (
          <div key={it.id} className="flex flex-col-reverse gap-2">
            <dt className="text-sm text-ink-tertiary">{t(it.label)}</dt>
            <dd>
              <StatValue it={it} />
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function StatusBar({ p }: { p: BlockProps["statusBar"] }) {
  const { t, lang } = useSite();
  const slug = useListSlug(p.template);
  const q = useQuery(`agg:${key({ template: p.template, k: p.key })}`, (ds) => ds.aggregate({ by: groupBy(p.key), template: p.template }));
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={2} empty={(d) => !d.length}>
        {(d) => {
          const total = d.reduce((s, b) => s + b.count, 0);
          return (
            <div className="flex flex-col gap-4">
              <div role="img" aria-label={d.map((b) => `${b.label}: ${b.count}`).join(", ")} className="flex h-4 w-full overflow-hidden rounded-full bg-vellum">
                {d.map((b) => (
                  <span key={b.key} style={{ width: `${(b.count / total) * 100}%`, background: statusTone(b.label).dot }} className="h-full first:rounded-s-full last:rounded-e-full border-e-2 border-paper last:border-e-0" />
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-8 gap-y-3">
                {d.map((b) => (
                  <li key={b.key}>
                    <PageLink slug={slug} filters={{ [p.key]: [b.key] }} className="group flex items-baseline gap-2">
                      <span aria-hidden className="w-2.5 h-2.5 rounded-full translate-y-[-1px]" style={{ background: statusTone(b.label).dot }} />
                      <span className="font-heading text-2xl text-ink tabular-nums">{nf(lang).format(b.count)}</span>
                      <span className="text-sm text-ink-secondary group-hover:underline underline-offset-2">{b.label}</span>
                      <span className="text-xs text-ink-muted tabular-nums">{Math.round((b.count / total) * 100)}%</span>
                    </PageLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        }}
      </Loadable>
    </Section>
  );
}

function ListBody({ rows, layout, keys }: { rows: Entity[]; layout: "cards" | "list" | "table"; keys?: string[] }) {
  if (layout === "table") return <EntityTable rows={rows} keys={keys ?? ["country", "year"]} />;
  if (layout === "list")
    return (
      <ul className="border-t border-border">
        {rows.map((e) => (
          <EntityRow key={e.id} e={e} />
        ))}
      </ul>
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((e) => (
        <EntityCard key={e.id} e={e} />
      ))}
    </div>
  );
}

export function EntityList({ p }: { p: BlockProps["entityList"] }) {
  const { t, lang } = useSite();
  const slug = useListSlug(p.template);
  const filters = p.filterKey && p.filterValue ? { [p.filterKey]: [p.filterValue] } : undefined;
  const q = useQuery(`search:${key({ t: p.template, s: p.sort, l: p.limit, filters })}`, (ds) => ds.search({ template: p.template, sort: p.sort, limit: p.limit, filters }));
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={Math.min(p.limit, 4)} empty={(d) => !d.rows.length}>
        {(d) => (
          <>
            <ListBody rows={d.rows} layout={p.layout} />
            {d.total > d.rows.length && slug !== undefined ? (
              <PageLink slug={slug} filters={filters} className="inline-flex items-center gap-1 mt-5 text-sm font-medium text-accent-text hover:underline underline-offset-2">
                {ui("viewAll", lang)} · {nf(lang).format(d.total)}
                <ChevronRight size={14} aria-hidden className="rtl:rotate-180" />
              </PageLink>
            ) : null}
          </>
        )}
      </Loadable>
    </Section>
  );
}

export function Featured({ p }: { p: BlockProps["featured"] }) {
  const { t } = useSite();
  const q = useQuery(`ids:${p.ids.join(",")}`, (ds) => ds.entities(p.ids));
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={3} empty={(d) => !d.length}>
        {(d) => (
          <div className={`grid gap-4 sm:grid-cols-2 ${p.lead ? "lg:grid-cols-4" : "lg:grid-cols-4"}`}>
            {d.map((e, i) => (
              <EntityCard key={e.id} e={e} lead={p.lead && i === 0} />
            ))}
          </div>
        )}
      </Loadable>
    </Section>
  );
}

export function Topics({ p }: { p: BlockProps["topics"] }) {
  const { t, lang } = useSite();
  const slug = useListSlug(p.template);
  const q = useQuery(`agg:${key({ template: p.template, k: p.key })}`, (ds) => ds.aggregate({ by: groupBy(p.key), template: p.template }));
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={3} empty={(d) => !d.length}>
        {(d) => (
          <ul className="grid gap-px bg-border border border-border rounded-lg overflow-hidden grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {d.slice(0, p.limit).map((b) => (
              <li key={b.key} className="bg-paper">
                <PageLink slug={slug} filters={{ [p.key]: [b.key] }} className="group flex flex-col gap-1 p-4 h-full hover:bg-warm">
                  <span className="text-ink group-hover:text-accent-text font-medium text-pretty">{b.label}</span>
                  <span className="text-xs text-ink-tertiary tabular-nums">{nf(lang).format(b.count)}</span>
                </PageLink>
              </li>
            ))}
          </ul>
        )}
      </Loadable>
    </Section>
  );
}

/* ── Map ─────────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAND = feature(land110 as any, (land110 as any).objects.land) as unknown as GeoJSON.FeatureCollection;

export function MapBlock({ p }: { p: BlockProps["map"] }) {
  const { t, lang } = useSite();
  const q = useQuery(`geo:${p.template}`, (ds) => ds.search({ template: p.template, withGeo: true, limit: 5000 }));
  const W = 960;
  const H = 480;
  const { land, dots, total } = useMemo(() => {
    const rows = q.data?.rows ?? [];
    const pts = rows.filter((e) => e.geo);
    const proj = geoEqualEarth();
    if (pts.length) {
      const lngs = pts.map((e) => e.geo!.lng);
      const lats = pts.map((e) => e.geo!.lat);
      const pad = 12;
      const box: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPoint",
          coordinates: [
            [Math.max(-180, Math.min(...lngs) - pad), Math.max(-85, Math.min(...lats) - pad)],
            [Math.min(180, Math.max(...lngs) + pad), Math.min(85, Math.max(...lats) + pad)],
          ],
        },
      };
      proj.fitExtent([[16, 16], [W - 16, H - 16]], box);
    } else proj.fitSize([W, H], LAND);
    const path = geoPath(proj);
    const groups = new Map<string, { x: number; y: number; n: number; label: string }>();
    for (const e of pts) {
      const xy = proj([e.geo!.lng, e.geo!.lat]);
      if (!xy) continue;
      const k = `${Math.round(xy[0] / 14)},${Math.round(xy[1] / 14)}`;
      const g = groups.get(k) ?? { x: xy[0], y: xy[1], n: 0, label: e.country ?? "" };
      g.n++;
      groups.set(k, g);
    }
    return { land: path(LAND) ?? "", dots: [...groups.values()].sort((a, b) => b.n - a.n), total: pts.length };
  }, [q.data]);
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={4} empty={(d) => !d.rows.length}>
        {() => (
          <figure className="rounded-lg bg-vellum overflow-hidden">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${nf(lang).format(total)} ${ui("located", lang)}`} className="block w-full h-auto">
              <path d={land} fill="var(--bg-surface)" stroke="var(--border-soft)" strokeWidth={0.75} />
              {dots.map((d, i) => (
                <g key={i}>
                  <circle cx={d.x} cy={d.y} r={Math.min(28, 4 + Math.sqrt(d.n) * 2.2)} fill="var(--site-accent)" fillOpacity={0.28} stroke="var(--site-accent)" strokeWidth={1.25}>
                    <title>{`${d.label}: ${d.n}`}</title>
                  </circle>
                  {d.n > 1 && i < 14 ? (
                    <text x={d.x} y={d.y} dy="0.35em" textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--text-primary)">
                      {d.n}
                    </text>
                  ) : null}
                </g>
              ))}
            </svg>
            <figcaption className="px-4 py-2.5 text-xs text-ink-tertiary border-t border-border">
              {nf(lang).format(total)} {ui("located", lang)}
            </figcaption>
          </figure>
        )}
      </Loadable>
    </Section>
  );
}

/* ── Charts ──────────────────────────────────────────────────────────── */

function fillYears(d: Bucket[]): Bucket[] {
  const years = d.map((b) => Number(b.key)).filter((n) => !Number.isNaN(n));
  if (years.length < 2) return d;
  const byKey = new Map(d.map((b) => [b.key, b]));
  const out: Bucket[] = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y++) out.push(byKey.get(String(y)) ?? { key: String(y), label: String(y), count: 0 });
  return out;
}

export function Chart({ p }: { p: BlockProps["chart"] }) {
  const { t, lang } = useSite();
  const slug = useListSlug(p.template);
  const q = useQuery(`agg:${key({ template: p.template, k: p.by })}`, (ds) => ds.aggregate({ by: groupBy(p.by), template: p.template }));
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={4} empty={(d) => !d.length}>
        {(raw) => {
          const d = p.by === "year" ? fillYears(raw) : raw.slice(0, p.kind === "bars" ? 12 : 40);
          const max = Math.max(...d.map((b) => b.count), 1);
          if (p.kind === "bars")
            return (
              <ul className="flex flex-col gap-2 max-w-[48rem]">
                {d.map((b) => (
                  <li key={b.key}>
                    <PageLink slug={slug} filters={{ [p.by]: [b.key] }} className="group grid grid-cols-[minmax(6rem,12rem)_1fr_auto] items-center gap-3 text-sm">
                      <span className="truncate text-ink-secondary group-hover:text-ink">{b.label}</span>
                      <span className="h-5 rounded-sm bg-vellum overflow-hidden">
                        <span className="block h-full bg-accent rounded-sm" style={{ width: `${(b.count / max) * 100}%` }} />
                      </span>
                      <span className="tabular-nums text-ink w-12 text-end">{nf(lang).format(b.count)}</span>
                    </PageLink>
                  </li>
                ))}
              </ul>
            );
          const every = Math.max(1, Math.ceil(d.length / 10));
          return (
            <figure>
              <div role="img" aria-label={d.filter((b) => b.count).map((b) => `${b.label}: ${b.count}`).join(", ")} className="flex items-end gap-[2px] h-48 border-b border-border-soft">
                {d.map((b) => (
                  <span key={b.key} title={`${b.label}: ${b.count}`} className="flex-1 min-w-[3px] bg-accent rounded-t-[2px] hover:brightness-125" style={{ height: `${(b.count / max) * 100}%`, opacity: b.count ? 1 : 0 }} />
                ))}
              </div>
              <div aria-hidden className="flex gap-[2px] mt-1.5 text-[0.6875rem] text-ink-tertiary tabular-nums">
                {d.map((b, i) => (
                  <span key={b.key} className="flex-1 min-w-[3px] text-center overflow-visible whitespace-nowrap">
                    {i % every === 0 ? b.label : ""}
                  </span>
                ))}
              </div>
            </figure>
          );
        }}
      </Loadable>
    </Section>
  );
}

export function Timeline({ p }: { p: BlockProps["timeline"] }) {
  const { t, lang } = useSite();
  const q = useQuery(`search:${key({ t: p.template, s: "recent", l: p.limit, timeline: 1 })}`, (ds) => ds.search({ template: p.template, sort: "recent", limit: p.limit }));
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={3} empty={(d) => !d.rows.filter((e) => e.date).length}>
        {(d) => {
          const rows = d.rows.filter((e) => e.date).sort((a, b) => a.date! - b.date!);
          return (
            <ol className="flex gap-4 overflow-x-auto pb-3 -mx-5 px-5 snap-x">
              {rows.map((e) => (
                <li key={e.id} className="snap-start shrink-0 w-56 flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-xs text-ink-tertiary tabular-nums">
                    <span aria-hidden className="w-2 h-2 rounded-full bg-accent" />
                    {fmtDate(e.date!, lang)}
                  </span>
                  <span aria-hidden className="h-px bg-border-soft -mt-[0.8125rem] ms-3 -me-4" />
                  <EntityLink id={e.id} className="text-sm text-ink hover:text-accent-text hover:underline underline-offset-2 text-pretty line-clamp-3 pt-1">
                    {e.title}
                  </EntityLink>
                </li>
              ))}
            </ol>
          );
        }}
      </Loadable>
    </Section>
  );
}

export function IndexBlock({ p }: { p: BlockProps["index"] }) {
  const { t, lang } = useSite();
  const slug = useListSlug(p.template);
  const byTitle = p.key === "title";
  const q = useQuery(`index:${key({ t: p.template, k: p.key })}`, async (ds) =>
    byTitle
      ? (await ds.search({ template: p.template, sort: "title", limit: 2000 })).rows.map((e) => ({ key: e.id, label: e.title, count: e.links.length }))
      : await ds.aggregate({ by: groupBy(p.key), template: p.template }),
  );
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={5} empty={(d) => !d.length}>
        {(d) => {
          const letters = new Map<string, Bucket[]>();
          for (const b of [...d].sort((a, b2) => a.label.localeCompare(b2.label, lang))) {
            const l = b.label.normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase();
            const k = /[A-Z]/.test(l) ? l : "#";
            letters.set(k, [...(letters.get(k) ?? []), b]);
          }
          const id = (l: string) => `idx-${p.key}-${l}`;
          return (
            <div className="flex flex-col gap-6">
              <nav aria-label="A–Z" className="flex flex-wrap gap-1 sticky top-0 bg-paper/95 backdrop-blur py-2 z-10">
                {[...letters.keys()].map((l) => (
                  <a key={l} href={`#${id(l)}`} onClick={(e) => { e.preventDefault(); document.getElementById(id(l))?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="w-8 h-8 grid place-items-center rounded-md text-sm font-medium text-ink hover:bg-warm">
                    {l}
                  </a>
                ))}
              </nav>
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-8">
                {[...letters.entries()].map(([l, items]) => (
                  <section key={l} id={id(l)} className="break-inside-avoid mb-6 scroll-mt-14">
                    <h3 className="font-heading text-2xl text-accent-text mb-2">{l}</h3>
                    <ul className="flex flex-col">
                      {items.slice(0, 40).map((b) => (
                        <li key={b.key} className="flex items-baseline gap-2 py-1 border-b border-border/70 text-sm">
                          {byTitle ? (
                            <EntityLink id={b.key} className="text-ink hover:text-accent-text hover:underline underline-offset-2 min-w-0">
                              {b.label}
                            </EntityLink>
                          ) : (
                            <PageLink slug={slug} filters={{ [p.key]: [b.key] }} className="text-ink hover:text-accent-text hover:underline underline-offset-2 min-w-0">
                              {b.label}
                            </PageLink>
                          )}
                          <span className="ms-auto text-xs text-ink-muted tabular-nums">{nf(lang).format(b.count)}</span>
                        </li>
                      ))}
                      {items.length > 40 ? <li className="py-1 text-xs text-ink-tertiary">+{items.length - 40} {ui("more", lang)}</li> : null}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          );
        }}
      </Loadable>
    </Section>
  );
}

/* ── Pictures ────────────────────────────────────────────────────────── */

export function Lightbox({ rows, index, onClose, onMove }: { rows: Entity[]; index: number; onClose: () => void; onMove: (i: number) => void }) {
  const { lang } = useSite();
  const meta = useMetaLine();
  const e = rows[index];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
      // The arrow that points at "next" is the one on the reading side.
      const fwd = isRtl(lang) ? "ArrowLeft" : "ArrowRight";
      const back = isRtl(lang) ? "ArrowRight" : "ArrowLeft";
      if (ev.key === fwd) onMove((index + 1) % rows.length);
      if (ev.key === back) onMove((index - 1 + rows.length) % rows.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [index, rows.length, onClose, onMove, lang]);
  if (!e?.image) return null;
  const btn = "w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer";
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={e.title} className="fixed inset-0 z-50 bg-black/90 flex flex-col outline-none" onClick={onClose}>
      <div className="flex justify-end p-3">
        <button type="button" className={btn} aria-label={ui("close", lang)} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center gap-3 px-3" onClick={(ev) => ev.stopPropagation()}>
        <button type="button" className={btn} aria-label={ui("previous", lang)} onClick={() => onMove((index - 1 + rows.length) % rows.length)}>
          <ChevronLeft size={20} className="rtl:rotate-180" />
        </button>
        <img src={e.image.url} alt={e.image.alt} className="flex-1 min-w-0 max-h-full object-contain" />
        <button type="button" className={btn} aria-label={ui("next", lang)} onClick={() => onMove((index + 1) % rows.length)}>
          <ChevronRight size={20} className="rtl:rotate-180" />
        </button>
      </div>
      <div className="px-5 py-4 text-white/90 text-sm flex flex-wrap items-baseline gap-x-4 gap-y-1" onClick={(ev) => ev.stopPropagation()}>
        <EntityLink id={e.id} className="font-heading text-lg text-white hover:underline underline-offset-2">
          {e.title}
        </EntityLink>
        <span className="text-white/70">{meta(e)}</span>
        <span className="ms-auto text-white/60 tabular-nums">
          {index + 1} / {rows.length}
        </span>
      </div>
    </div>
  );
}

export function Gallery({ p }: { p: BlockProps["gallery"] }) {
  const { t } = useSite();
  const [open, setOpen] = useState<number | null>(null);
  const q = useQuery(`gallery:${key({ t: p.template, l: p.limit })}`, (ds) => ds.search({ template: p.template, withImage: true, limit: p.limit, sort: "title" }));
  return (
    <Section title={t(p.title)} wide>
      <Loadable q={q} rows={4} empty={(d) => !d.rows.length}>
        {(d) => (
          <>
            <ul className={p.layout === "masonry" ? "columns-2 sm:columns-3 lg:columns-4 gap-3" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"}>
              {d.rows.map((e, i) => (
                <li key={e.id} className={p.layout === "masonry" ? "mb-3 break-inside-avoid" : ""}>
                  <button type="button" onClick={() => setOpen(i)} className="group block w-full text-start cursor-zoom-in rounded-md overflow-hidden bg-vellum focus-visible:outline-2 focus-visible:outline-accent">
                    <img
                      src={e.image!.url}
                      alt={e.image!.alt}
                      loading="lazy"
                      width={e.image!.width}
                      height={e.image!.height}
                      className={`w-full block group-hover:opacity-90 transition-opacity ${p.layout === "grid" ? "aspect-square object-cover" : "h-auto"}`}
                    />
                  </button>
                </li>
              ))}
            </ul>
            {open !== null ? <Lightbox rows={d.rows} index={open} onClose={() => setOpen(null)} onMove={setOpen} /> : null}
          </>
        )}
      </Loadable>
    </Section>
  );
}

export function Collections({ p }: { p: BlockProps["collections"] }) {
  const { t, lang } = useSite();
  const slug = useListSlug(p.template);
  const q = useQuery(`collections:${key({ t: p.template, k: p.key })}`, async (ds) => {
    const buckets = (await ds.aggregate({ by: groupBy(p.key), template: p.template })).slice(0, 8);
    return Promise.all(buckets.map(async (b) => ({ b, cover: (await ds.search({ template: p.template, withImage: true, filters: { [p.key]: [b.key] }, limit: 1, sort: "title" })).rows[0] })));
  });
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={3} empty={(d) => !d.length}>
        {(d) => (
          <ul className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {d.map(({ b, cover }) => (
              <li key={b.key}>
                <PageLink slug={slug} filters={{ [p.key]: [b.key] }} className="group flex flex-col gap-2">
                  <span className="block aspect-[4/3] rounded-md overflow-hidden bg-vellum">
                    {cover?.image ? <img src={cover.image.url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" /> : null}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-heading text-lg text-ink group-hover:text-accent-text">{b.label}</span>
                    <span className="text-xs text-ink-tertiary tabular-nums">{nf(lang).format(b.count)}</span>
                  </span>
                </PageLink>
              </li>
            ))}
          </ul>
        )}
      </Loadable>
    </Section>
  );
}

export function Table({ p }: { p: BlockProps["table"] }) {
  const { t, lang } = useSite();
  const slug = useListSlug(p.template);
  const q = useQuery(`search:${key({ t: p.template, l: p.limit, table: 1 })}`, (ds) => ds.search({ template: p.template, sort: "recent", limit: p.limit }));
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={5} empty={(d) => !d.rows.length}>
        {(d) => (
          <>
            <EntityTable rows={d.rows} keys={p.keys} />
            {d.total > d.rows.length ? (
              <PageLink slug={slug} className="inline-flex items-center gap-1 mt-5 text-sm font-medium text-accent-text hover:underline underline-offset-2">
                {ui("viewAll", lang)} · {nf(lang).format(d.total)}
                <ChevronRight size={14} aria-hidden className="rtl:rotate-180" />
              </PageLink>
            ) : null}
          </>
        )}
      </Loadable>
    </Section>
  );
}

/* ── The results page ────────────────────────────────────────────────── */

const PAGE = 20;

export function Results({ p, title }: { p: BlockProps["results"]; title: string }) {
  const { lang, route, navigate, templates } = useSite();
  const [offset, setOffset] = useState(0);
  const filters = route.filters ?? {};
  const active = Object.entries(filters).flatMap(([k, vs]) => vs.map((v) => ({ k, v })));
  useEffect(() => setOffset(0), [route.q, key(filters)]);
  const q = useQuery(`search:${key({ t: p.template, q: route.q, filters, offset })}`, (ds) =>
    ds.search({ template: p.template, text: route.q, filters, sort: route.q ? "connected" : "recent", limit: PAGE, offset }),
  );
  const set = (k: string, v: string, on: boolean) => {
    const cur = filters[k] ?? [];
    const next = { ...filters, [k]: on ? [...cur, v] : cur.filter((x) => x !== v) };
    navigate({ filters: next });
  };
  const tpls = [...templates.values()];
  return (
    <Section title={title}>
      <div className="flex flex-col gap-6">
        <SearchBox p={{ placeholder: {}, template: p.template }} initial={route.q ?? ""} onSubmit={(text) => navigate({ q: text || undefined })} />
        <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
          <aside aria-label={ui("filters", lang)} className="flex flex-col gap-6">
            {p.keys.map((k) => (
              <FilterGroup key={k} k={k} label={keyLabel(k, lang, tpls)} template={p.template} text={route.q} filters={filters} onToggle={set} />
            ))}
          </aside>
          <div className="min-w-0 flex flex-col gap-4">
            {/* Always mounted: the count line toggles its contents, not its box. */}
            <div className="flex flex-wrap items-center gap-2 min-h-8" aria-live="polite">
              <span className="text-sm text-ink-secondary tabular-nums">{q.data ? `${nf(lang).format(q.data.total)} ${ui("results", lang)}` : ui("loading", lang)}</span>
              {active.map(({ k, v }) => (
                <button key={`${k}:${v}`} type="button" onClick={() => set(k, v, false)} className="inline-flex items-center gap-1 h-7 ps-2.5 pe-1.5 rounded-full bg-vellum text-xs text-ink hover:bg-warm cursor-pointer" aria-label={`${v} ×`}>
                  {v} <X size={12} aria-hidden />
                </button>
              ))}
              {active.length || route.q ? (
                <button type="button" onClick={() => navigate({ filters: {}, q: undefined })} className="text-xs text-ink-tertiary hover:text-ink underline underline-offset-2 cursor-pointer">
                  {ui("clear", lang)}
                </button>
              ) : null}
            </div>
            <Loadable q={q} rows={6}>
              {(d) =>
                d.rows.length ? (
                  <>
                    <ListBody rows={d.rows} layout={p.layout} keys={p.keys} />
                    {d.total > PAGE ? (
                      <nav className="flex items-center gap-3 text-sm">
                        <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} className="h-9 px-3 rounded-md border border-border-soft disabled:opacity-40 cursor-pointer disabled:cursor-default">
                          {ui("previous", lang)}
                        </button>
                        <span className="text-ink-tertiary tabular-nums">
                          {offset + 1}–{Math.min(offset + PAGE, d.total)} / {nf(lang).format(d.total)}
                        </span>
                        <button type="button" disabled={offset + PAGE >= d.total} onClick={() => setOffset(offset + PAGE)} className="h-9 px-3 rounded-md border border-border-soft disabled:opacity-40 cursor-pointer disabled:cursor-default">
                          {ui("next", lang)}
                        </button>
                      </nav>
                    ) : null}
                  </>
                ) : (
                  <p className="text-ink-secondary py-8">{ui("noResults", lang)}</p>
                )
              }
            </Loadable>
          </div>
        </div>
      </div>
    </Section>
  );
}

function FilterGroup({ k, label, template, text, filters, onToggle }: { k: string; label: string; template?: string; text?: string; filters: Record<string, string[]>; onToggle: (k: string, v: string, on: boolean) => void }) {
  const { lang } = useSite();
  const [more, setMore] = useState(false);
  const others = Object.fromEntries(Object.entries(filters).filter(([x]) => x !== k));
  const q = useQuery(`agg:${key({ template, k, text, others })}`, (ds) => ds.aggregate({ by: groupBy(k), template, text, filters: others }));
  const chosen = filters[k] ?? [];
  return (
    <fieldset className="flex flex-col gap-1.5 min-w-0">
      <legend className="text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">{label}</legend>
      <Loadable q={q} rows={3} empty={(d) => !d.length}>
        {(d) => {
          const list = k === "year" || k === "decade" ? [...d].reverse() : d;
          const shown = more ? list : list.slice(0, 8);
          return (
            <>
              {shown.map((b) => (
                <label key={b.key} className="flex items-center gap-2 text-sm text-ink cursor-pointer min-h-7">
                  <input type="checkbox" checked={chosen.includes(b.key)} onChange={(e) => onToggle(k, b.key, e.target.checked)} className="accent-[var(--site-accent)] w-4 h-4" />
                  <span className="truncate flex-1">{b.label}</span>
                  <span className="text-xs text-ink-muted tabular-nums">{nf(lang).format(b.count)}</span>
                </label>
              ))}
              {list.length > 8 ? (
                <button type="button" onClick={() => setMore((m) => !m)} className="self-start text-xs text-ink-tertiary hover:text-ink underline underline-offset-2 cursor-pointer">
                  {more ? "−" : `+${list.length - 8} ${ui("more", lang)}`}
                </button>
              ) : null}
            </>
          );
        }}
      </Loadable>
    </fieldset>
  );
}

export { TypeDot };
